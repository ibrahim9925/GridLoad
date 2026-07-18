import pytest
from decimal import Decimal
from datetime import date, timedelta
from tests.utils.database_manager import DatabaseManager
from tests.fixtures.test_data_seeder import TestDataSeeder

class TestCRUDOperations:
    """Test basic CRUD operations for all core entities."""
    
    @pytest.mark.unit
    def test_products_crud(self, db_manager: DatabaseManager, db_snapshot):
        """Test Products CRUD operations."""
        # CREATE
        product_data = {
            'sku': 'TEST-PROD-001',
            'name': 'Test Solar Panel',
            'category': 'solar_panel',
            'brand': 'Test Brand',
            'model': 'TP-400W',
            'cost_price': Decimal('300.00'),
            'selling_price': Decimal('450.00'),
            'current_stock': 100,
            'warranty_months': 25,
            'is_active': True
        }
        
        product_id = db_manager.execute_insert('products', product_data)
        assert product_id is not None
        
        # READ
        result = db_manager.execute_query(
            "SELECT * FROM public.products WHERE id = %s", 
            (product_id,)
        )
        assert len(result) == 1
        assert result[0][1] == 'TEST-PROD-001'  # SKU column
        
        # UPDATE
        db_manager.execute_query(
            "UPDATE public.products SET selling_price = %s WHERE id = %s",
            (Decimal('500.00'), product_id)
        )
        
        result = db_manager.execute_query(
            "SELECT selling_price FROM public.products WHERE id = %s",
            (product_id,)
        )
        assert result[0][0] == Decimal('500.00')
        
        # DELETE
        db_manager.execute_query(
            "DELETE FROM public.products WHERE id = %s",
            (product_id,)
        )
        
        result = db_manager.execute_query(
            "SELECT * FROM public.products WHERE id = %s",
            (product_id,)
        )
        assert len(result) == 0
    
    @pytest.mark.unit
    def test_customers_crud(self, db_manager: DatabaseManager, db_snapshot):
        """Test Customers CRUD operations."""
        # CREATE
        customer_data = {
            'name': 'John Doe',
            'email': 'john.doe@test.com',
            'phone': '+972-50-123-4567',
            'address': '123 Test Street, Tel Aviv',
            'city': 'Tel Aviv',
            'country': 'Israel',
            'credit_limit': Decimal('50000.00'),
            'payment_terms': 'net_30',
            'is_active': True
        }
        
        customer_id = db_manager.execute_insert('customers', customer_data)
        assert customer_id is not None
        
        # READ
        result = db_manager.execute_query(
            "SELECT name, email FROM public.customers WHERE id = %s",
            (customer_id,)
        )
        assert result[0][0] == 'John Doe'
        assert result[0][1] == 'john.doe@test.com'
        
        # UPDATE
        db_manager.execute_query(
            "UPDATE public.customers SET credit_limit = %s WHERE id = %s",
            (Decimal('75000.00'), customer_id)
        )
        
        # Verify update
        result = db_manager.execute_query(
            "SELECT credit_limit FROM public.customers WHERE id = %s",
            (customer_id,)
        )
        assert result[0][0] == Decimal('75000.00')
    
    @pytest.mark.unit
    def test_suppliers_crud(self, db_manager: DatabaseManager, db_snapshot):
        """Test Suppliers CRUD operations."""
        # CREATE
        supplier_data = {
            'name': 'Test Supplier Ltd',
            'contact_person': 'Jane Smith',
            'email': 'jane@testsupplier.com',
            'phone': '+86-138-0013-8000',
            'address': 'Shanghai, China',
            'payment_terms': 'net_45',
            'lead_time_days': 21,
            'min_order_amount': Decimal('5000.00'),
            'quality_rating': Decimal('4.8'),
            'delivery_rating': Decimal('4.5'),
            'is_active': True
        }
        
        supplier_id = db_manager.execute_insert('suppliers', supplier_data)
        assert supplier_id is not None
        
        # Verify creation
        result = db_manager.execute_query(
            "SELECT name, lead_time_days, quality_rating FROM public.suppliers WHERE id = %s",
            (supplier_id,)
        )
        assert result[0][0] == 'Test Supplier Ltd'
        assert result[0][1] == 21
        assert result[0][2] == Decimal('4.8')
    
    @pytest.mark.integration
    def test_sales_with_items_crud(self, basic_test_data: dict, db_manager: DatabaseManager):
        """Test Sales with Sale Items CRUD operations."""
        customer = basic_test_data['customers'][0]
        products = basic_test_data['products']
        staff = basic_test_data['staff']
        
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        # CREATE SALE
        sale_data = {
            'invoice_number': 'TEST-INV-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'NIS',
            'exchange_rate': Decimal('1.00'),
            'subtotal': Decimal('1000.00'),
            'tax_amount': Decimal('170.00'),
            'total_amount': Decimal('1170.00'),
            'payment_status': 'unpaid',
            'fulfillment_status': 'pending',
            'payment_terms': 'net_30'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        assert sale_id is not None
        
        # CREATE SALE ITEMS
        item_1_data = {
            'sale_id': sale_id,
            'product_id': products[0]['id'],
            'quantity': 2,
            'unit_price': Decimal('400.00'),
            'line_total': Decimal('800.00')
        }
        
        item_2_data = {
            'sale_id': sale_id,
            'product_id': products[1]['id'],
            'quantity': 1,
            'unit_price': Decimal('200.00'),
            'line_total': Decimal('200.00')
        }
        
        item_1_id = db_manager.execute_insert('sale_items', item_1_data)
        item_2_id = db_manager.execute_insert('sale_items', item_2_data)
        
        assert item_1_id is not None
        assert item_2_id is not None
        
        # VERIFY RELATIONSHIPS
        result = db_manager.execute_query("""
            SELECT s.invoice_number, s.total_amount, 
                   COUNT(si.id) as item_count,
                   SUM(si.line_total) as items_total
            FROM public.sales s
            LEFT JOIN public.sale_items si ON s.id = si.sale_id
            WHERE s.id = %s
            GROUP BY s.id, s.invoice_number, s.total_amount
        """, (sale_id,))
        
        assert len(result) == 1
        assert result[0][0] == 'TEST-INV-001'  # invoice_number
        assert result[0][1] == Decimal('1170.00')  # total_amount
        assert result[0][2] == 2  # item_count
        assert result[0][3] == Decimal('1000.00')  # items_total (subtotal)
    
    @pytest.mark.unit
    def test_currency_rates_crud(self, db_manager: DatabaseManager, db_snapshot):
        """Test Currency Rates CRUD operations."""
        # CREATE
        rate_data = {
            'from_currency': 'USD',
            'to_currency': 'NIS',
            'rate': Decimal('3.65'),
            'date': date.today()
        }
        
        rate_id = db_manager.execute_insert('currency_rates', rate_data)
        assert rate_id is not None
        
        # READ
        result = db_manager.execute_query(
            "SELECT from_currency, to_currency, rate FROM public.currency_rates WHERE id = %s",
            (rate_id,)
        )
        assert result[0][0] == 'USD'
        assert result[0][1] == 'NIS'
        assert result[0][2] == Decimal('3.65')
        
        # UPDATE
        new_rate = Decimal('3.70')
        db_manager.execute_query(
            "UPDATE public.currency_rates SET rate = %s WHERE id = %s",
            (new_rate, rate_id)
        )
        
        result = db_manager.execute_query(
            "SELECT rate FROM public.currency_rates WHERE id = %s",
            (rate_id,)
        )
        assert result[0][0] == new_rate
    
    @pytest.mark.integration
    def test_payments_crud(self, basic_test_data: dict, db_manager: DatabaseManager):
        """Test Payments CRUD operations."""
        # First create a sale to link payment to
        customer = basic_test_data['customers'][0]
        staff = basic_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        sale_data = {
            'invoice_number': 'TEST-PAY-INV-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'NIS',
            'total_amount': Decimal('5000.00'),
            'payment_status': 'unpaid'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        
        # CREATE PAYMENT
        payment_data = {
            'sale_id': sale_id,
            'amount': Decimal('2500.00'),
            'currency': 'NIS',
            'exchange_rate': Decimal('1.00'),
            'payment_method': 'cash',
            'payment_date': date.today(),
            'reference_number': 'PAY-TEST-001'
        }
        
        payment_id = db_manager.execute_insert('payments', payment_data)
        assert payment_id is not None
        
        # VERIFY PAYMENT-SALE RELATIONSHIP
        result = db_manager.execute_query("""
            SELECT p.amount, p.currency, s.total_amount, s.invoice_number
            FROM public.payments p
            JOIN public.sales s ON p.sale_id = s.id
            WHERE p.id = %s
        """, (payment_id,))
        
        assert len(result) == 1
        assert result[0][0] == Decimal('2500.00')  # payment amount
        assert result[0][1] == 'NIS'  # payment currency
        assert result[0][2] == Decimal('5000.00')  # sale total
        assert result[0][3] == 'TEST-PAY-INV-001'  # invoice number
    
    @pytest.mark.integration
    def test_foreign_key_constraints(self, basic_test_data: dict, db_manager: DatabaseManager):
        """Test that foreign key constraints are properly enforced."""
        customer = basic_test_data['customers'][0]
        
        # Try to create sale with non-existent customer - should fail
        invalid_sale_data = {
            'invoice_number': 'INVALID-001',
            'customer_id': '00000000-0000-0000-0000-000000000000',
            'sale_date': date.today(),
            'total_amount': Decimal('1000.00')
        }
        
        with pytest.raises(Exception):  # Should raise foreign key constraint error
            db_manager.execute_insert('sales', invalid_sale_data)
        
        # Valid sale should work
        valid_sale_data = {
            'invoice_number': 'VALID-001',
            'customer_id': customer['id'],
            'sale_date': date.today(),
            'total_amount': Decimal('1000.00'),
            'payment_status': 'unpaid'
        }
        
        sale_id = db_manager.execute_insert('sales', valid_sale_data)
        assert sale_id is not None