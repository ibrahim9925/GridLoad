-- First, clean up existing duplicate stock movements
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY reference_type, reference_id, product_id, movement_type 
      ORDER BY created_at ASC
    ) as row_num
  FROM public.stock_movements 
  WHERE reference_type = 'container' AND movement_type = 'in'
)
DELETE FROM public.stock_movements 
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Correct product stock for affected products
UPDATE public.products 
SET current_stock = (
  SELECT COALESCE(SUM(CASE 
    WHEN sm.movement_type = 'in' THEN sm.quantity 
    WHEN sm.movement_type = 'out' THEN -sm.quantity 
    ELSE 0 
  END), 0)
  FROM public.stock_movements sm 
  WHERE sm.product_id = products.id
)
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM public.stock_movements 
  WHERE reference_type = 'container'
);

-- Now create the unique index
CREATE UNIQUE INDEX idx_stock_movements_unique_container_processing 
ON public.stock_movements (reference_type, reference_id, product_id, movement_type)
WHERE reference_type = 'container';

-- Create idempotent container arrival processing function
CREATE OR REPLACE FUNCTION public.process_container_arrival(
  p_container_id uuid,
  p_pricing_data jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  container_record RECORD;
  container_product RECORD;
  new_product_id uuid;
  processing_result jsonb := '{}';
  products_processed integer := 0;
  products_created integer := 0;
  stock_movements_created integer := 0;
  variances_created integer := 0;
BEGIN
  -- Check if container exists and get its current status
  SELECT * INTO container_record 
  FROM public.containers 
  WHERE id = p_container_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Container not found'
    );
  END IF;
  
  -- Check if already processed (idempotency)
  IF container_record.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Container already processed',
      'already_completed', true
    );
  END IF;
  
  -- Process each container product
  FOR container_product IN 
    SELECT cp.*, p.id as existing_product_id, p.name as existing_product_name
    FROM public.container_products cp
    LEFT JOIN public.products p ON p.name = cp.product_name AND p.is_active = true
    WHERE cp.container_id = p_container_id
  LOOP
    products_processed := products_processed + 1;
    
    -- Create or update product
    IF container_product.existing_product_id IS NOT NULL THEN
      -- Update existing product
      new_product_id := container_product.existing_product_id;
      
      -- Update product stock and cost
      UPDATE public.products 
      SET 
        current_stock = current_stock + container_product.received_quantity,
        on_hand_qty = COALESCE(on_hand_qty, 0) + container_product.received_quantity,
        last_restock_date = CURRENT_DATE,
        cost_price = container_product.unit_cost,
        updated_at = now()
      WHERE id = new_product_id;
      
      -- Update pricing if provided
      IF p_pricing_data ? container_product.id::text THEN
        UPDATE public.products 
        SET 
          min_selling_price = COALESCE((p_pricing_data->container_product.id::text->>'min_price')::numeric, min_selling_price),
          standard_selling_price = COALESCE((p_pricing_data->container_product.id::text->>'standard_price')::numeric, standard_selling_price),
          max_selling_price = COALESCE((p_pricing_data->container_product.id::text->>'max_price')::numeric, max_selling_price)
        WHERE id = new_product_id;
      END IF;
      
    ELSE
      -- Create new product
      INSERT INTO public.products (
        name, cost_price, current_stock, on_hand_qty, 
        last_restock_date, category, supplier_id, is_active,
        min_selling_price, standard_selling_price, max_selling_price,
        warranty_months, default_currency
      ) VALUES (
        container_product.product_name,
        container_product.unit_cost,
        container_product.received_quantity,
        container_product.received_quantity,
        CURRENT_DATE,
        'Imported',
        container_record.supplier_id,
        true,
        COALESCE((p_pricing_data->container_product.id::text->>'min_price')::numeric, container_product.unit_cost * 1.2),
        COALESCE((p_pricing_data->container_product.id::text->>'standard_price')::numeric, container_product.unit_cost * 1.5),
        COALESCE((p_pricing_data->container_product.id::text->>'max_price')::numeric, container_product.unit_cost * 2.0),
        12,
        'NIS'
      ) RETURNING id INTO new_product_id;
      
      products_created := products_created + 1;
      
      -- Update container product with the new product_id
      UPDATE public.container_products 
      SET product_id = new_product_id 
      WHERE id = container_product.id;
    END IF;
    
    -- Create stock movement (with conflict handling)
    BEGIN
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, unit_cost, total_cost,
        reference_type, reference_id, created_by, notes
      ) VALUES (
        new_product_id, 'in', container_product.received_quantity,
        container_product.unit_cost, container_product.total_cost,
        'container', p_container_id, auth.uid(),
        'Container arrival: ' || container_record.container_number
      );
      stock_movements_created := stock_movements_created + 1;
    EXCEPTION
      WHEN unique_violation THEN
        -- Movement already exists, skip
        NULL;
    END;
    
    -- Create variance record if quantities don't match
    IF container_product.received_quantity != container_product.quantity THEN
      INSERT INTO public.container_variances (
        container_id, container_product_id, variance_type,
        expected_quantity, actual_quantity, variance_quantity,
        variance_value, reported_by, notes
      ) VALUES (
        p_container_id, container_product.id, 'quantity',
        container_product.quantity, container_product.received_quantity,
        container_product.received_quantity - container_product.quantity,
        (container_product.received_quantity - container_product.quantity) * container_product.unit_cost,
        auth.uid(), 'Automatic variance detection during arrival'
      );
      variances_created := variances_created + 1;
    END IF;
    
    -- Create inventory valuation
    INSERT INTO public.inventory_valuations (
      product_id, quantity, unit_cost, total_value, valuation_method
    ) VALUES (
      new_product_id, container_product.received_quantity, 
      container_product.unit_cost, container_product.total_cost, 'weighted_average'
    )
    ON CONFLICT (product_id, valuation_date) 
    DO UPDATE SET
      quantity = inventory_valuations.quantity + EXCLUDED.quantity,
      total_value = inventory_valuations.total_value + EXCLUDED.total_value,
      unit_cost = (inventory_valuations.total_value + EXCLUDED.total_value) / (inventory_valuations.quantity + EXCLUDED.quantity);
  END LOOP;
  
  -- Update container status
  UPDATE public.containers 
  SET 
    status = 'completed',
    completed_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_container_id;
  
  -- Create status history
  INSERT INTO public.container_status_history (
    container_id, status, previous_status, changed_by, notes
  ) VALUES (
    p_container_id, 'completed', container_record.status, auth.uid(),
    'Container arrival processed automatically'
  );
  
  -- Generate stock alerts
  PERFORM generate_stock_alerts();
  
  -- Build result
  processing_result := jsonb_build_object(
    'success', true,
    'container_id', p_container_id,
    'products_processed', products_processed,
    'products_created', products_created,
    'stock_movements_created', stock_movements_created,
    'variances_created', variances_created,
    'processed_at', now()
  );
  
  RETURN processing_result;
END;
$$;