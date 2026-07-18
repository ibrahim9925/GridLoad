-- Add CBM capacity fields to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN cbm_volume NUMERIC(10,3) DEFAULT 0,
ADD COLUMN pallet_count INTEGER DEFAULT NULL,
ADD COLUMN cbm_per_pallet NUMERIC(6,3) DEFAULT NULL;

-- Add CBM capacity field to containers table
ALTER TABLE public.containers 
ADD COLUMN cbm_capacity NUMERIC(10,3) DEFAULT CASE 
  WHEN container_type ILIKE '%20%' THEN 33.0
  WHEN container_type ILIKE '%40%' THEN 67.0
  ELSE 50.0
END;

-- Add comments for documentation
COMMENT ON COLUMN public.purchase_orders.cbm_volume IS 'Total CBM volume of the purchase order';
COMMENT ON COLUMN public.purchase_orders.pallet_count IS 'Number of pallets (optional)';
COMMENT ON COLUMN public.purchase_orders.cbm_per_pallet IS 'CBM per pallet (optional)';
COMMENT ON COLUMN public.containers.cbm_capacity IS 'CBM capacity of container (20ft=33, 40ft=67)';