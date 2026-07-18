-- Apply the missing database triggers for sales workflow automation

-- 1. Trigger to update sale payment status when payments change
DROP TRIGGER IF EXISTS trg_payments_update_sale_status ON public.payments;
CREATE TRIGGER trg_payments_update_sale_status
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_sale_payment_status();

-- 2. Trigger to update stock when sale items are created
DROP TRIGGER IF EXISTS trg_sale_items_stock_update ON public.sale_items;
CREATE TRIGGER trg_sale_items_stock_update
    AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_sale_item();

-- 3. Trigger to create order fulfillment when sales are created
DROP TRIGGER IF EXISTS trg_sales_create_fulfillment ON public.sales;
CREATE TRIGGER trg_sales_create_fulfillment
    AFTER INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.create_order_fulfillment_on_sale();

-- 4. Fix stock movement data consistency - ensure all sale-related movements use positive quantities
UPDATE public.stock_movements 
SET quantity = ABS(quantity)
WHERE reference_type = 'sale' 
AND movement_type = 'out' 
AND quantity < 0;