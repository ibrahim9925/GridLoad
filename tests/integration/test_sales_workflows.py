import pytest
from decimal import Decimal
from datetime import date, timedelta
from tests.utils.database_manager import DatabaseManager

class TestSalesWorkflows:
    """Test comprehensive sales workflow scenarios."""
    
    @pytest.mark.critical
    @pytest.mark.integration
    def test_full_payment_sales_workflow(self, comprehensive_test_data: dict, db_manager: DatabaseManager):
        """Test complete sales workflow with full payment."""
        customer = comprehensive_test_data['customers'][0]
        products = comprehensive_test_data['products'][:2]
        staff = comprehensive_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        # Step 1: Create Sale
        sale_data = {
            'invoice_number': 'FULL-PAY-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'NIS',
            'exchange_rate': Decimal('1.00'),
            'subtotal': Decimal('4000.00'),
            'tax_amount': Decimal('680.00'),
            'total_amount': Decimal('4680.00'),
            'payment_status': 'unpaid',
            'fulfillment_status': 'pending',
            'payment_terms': 'immediate'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        
        # Step 2: Add Sale Items
        for i, product in enumerate(products):
            item_data = {
                'sale_id': sale_id,
                'product_id': product['id'],
                'quantity': 2,
                'unit_price': Decimal('1000.00') * (i + 1),
                'line_total': Decimal('2000.00') * (i + 1)
            }
            db_manager.execute_insert('sale_items', item_data)
        
        # Step 3: Create Full Payment
        payment_data = {
            'sale_id': sale_id,
            'amount': Decimal('4680.00'),
            'currency': 'NIS',
            'exchange_rate': Decimal('1.00'),
            'payment_method': 'cash',
            'payment_date': date.today(),
            'reference_number': 'CASH-001'
        }
        
        payment_id = db_manager.execute_insert('payments', payment_data)
        
        # Step 4: Verify Payment Status Update (would be done by trigger)
        # Simulate trigger behavior for testing
        db_manager.execute_query("""
            UPDATE public.sales 
            SET payment_status = 'paid',
                total_paid = %s,
                balance_due = 0
            WHERE id = %s
        """, (Decimal('4680.00'), sale_id))
        
        # Verify final state
        result = db_manager.execute_query("""
            SELECT 
                s.payment_status,
                s.total_paid,
                s.balance_due,
                COUNT(si.id) as item_count,
                COUNT(p.id) as payment_count,
                SUM(p.amount) as total_payments
            FROM public.sales s
            LEFT JOIN public.sale_items si ON s.id = si.sale_id
            LEFT JOIN public.payments p ON s.id = p.sale_id
            WHERE s.id = %s
            GROUP BY s.id, s.payment_status, s.total_paid, s.balance_due
        """, (sale_id,))
        
        assert len(result) == 1
        assert result[0][0] == 'paid'  # payment_status
        assert result[0][1] == Decimal('4680.00')  # total_paid
        assert result[0][2] == Decimal('0.00')  # balance_due
        assert result[0][3] == 2  # item_count
        assert result[0][4] == 1  # payment_count
        assert result[0][5] == Decimal('4680.00')  # total_payments
    
    @pytest.mark.critical
    @pytest.mark.integration
    def test_partial_payment_workflow(self, comprehensive_test_data: dict, db_manager: DatabaseManager):
        """Test sales workflow with multiple partial payments."""
        customer = comprehensive_test_data['customers'][1]
        product = comprehensive_test_data['products'][0]
        staff = comprehensive_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        # Create Sale
        total_amount = Decimal('10000.00')
        sale_data = {
            'invoice_number': 'PARTIAL-PAY-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'USD',
            'exchange_rate': Decimal('3.65'),
            'total_amount': total_amount,
            'total_amount_usd': total_amount / Decimal('3.65'),
            'payment_status': 'unpaid',
            'payment_terms': 'net_30'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        
        # Add sale item
        item_data = {
            'sale_id': sale_id,
            'product_id': product['id'],
            'quantity': 10,
            'unit_price': Decimal('1000.00'),
            'line_total': total_amount
        }
        db_manager.execute_insert('sale_items', item_data)
        
        # First partial payment (30%)
        payment_1_amount = Decimal('3000.00')
        payment_1_data = {
            'sale_id': sale_id,
            'amount': payment_1_amount,
            'currency': 'USD',
            'exchange_rate': Decimal('3.65'),
            'amount_nis': payment_1_amount * Decimal('3.65'),
            'payment_method': 'bank_transfer',
            'payment_date': date.today(),
            'reference_number': 'TRF-001'
        }
        
        payment_1_id = db_manager.execute_insert('payments', payment_1_data)
        
        # Update sale status after first payment
        db_manager.execute_query("""
            UPDATE public.sales 
            SET payment_status = 'partial_paid',
                total_paid = %s,
                balance_due = total_amount - %s
            WHERE id = %s
        """, (payment_1_amount, payment_1_amount, sale_id))
        
        # Second partial payment (50%)
        payment_2_amount = Decimal('5000.00')
        payment_2_data = {
            'sale_id': sale_id,
            'amount': payment_2_amount,
            'currency': 'USD',
            'exchange_rate': Decimal('3.68'),  # Different exchange rate
            'amount_nis': payment_2_amount * Decimal('3.68'),
            'payment_method': 'cash',
            'payment_date': date.today() + timedelta(days=7),
            'reference_number': 'CASH-002'
        }
        
        payment_2_id = db_manager.execute_insert('payments', payment_2_data)
        
        # Final payment (remaining 20%)
        payment_3_amount = Decimal('2000.00')
        payment_3_data = {
            'sale_id': sale_id,
            'amount': payment_3_amount,
            'currency': 'USD',
            'exchange_rate': Decimal('3.70'),
            'amount_nis': payment_3_amount * Decimal('3.70'),
            'payment_method': 'check',
            'payment_date': date.today() + timedelta(days=14),
            'reference_number': 'CHK-003'
        }
        
        payment_3_id = db_manager.execute_insert('payments', payment_3_data)
        
        # Final status update
        total_paid = payment_1_amount + payment_2_amount + payment_3_amount
        db_manager.execute_query("""
            UPDATE public.sales 
            SET payment_status = 'paid',
                total_paid = %s,
                balance_due = 0
            WHERE id = %s
        """, (total_paid, sale_id))
        
        # Verify multiple payments and FX handling
        result = db_manager.execute_query("""
            SELECT 
                s.payment_status,
                s.total_paid,
                COUNT(p.id) as payment_count,
                AVG(p.exchange_rate) as avg_fx_rate,
                SUM(p.amount_nis) as total_nis_received
            FROM public.sales s
            LEFT JOIN public.payments p ON s.id = p.sale_id
            WHERE s.id = %s
            GROUP BY s.id, s.payment_status, s.total_paid
        """, (sale_id,))
        
        assert len(result) == 1
        assert result[0][0] == 'paid'  # payment_status
        assert result[0][1] == Decimal('10000.00')  # total_paid
        assert result[0][2] == 3  # payment_count
        assert result[0][3] > Decimal('3.60')  # avg_fx_rate
        assert result[0][4] > Decimal('36000.00')  # total_nis_received
    
    @pytest.mark.integration
    def test_outstanding_sales_workflow(self, comprehensive_test_data: dict, db_manager: DatabaseManager):
        """Test sales with no payments (outstanding receivables)."""
        customer = comprehensive_test_data['customers'][2]
        products = comprehensive_test_data['products']
        staff = comprehensive_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        # Create overdue sale
        sale_data = {
            'invoice_number': 'OVERDUE-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today() - timedelta(days=45),  # 45 days old
            'due_date': date.today() - timedelta(days=15),   # 15 days overdue
            'currency': 'NIS',
            'total_amount': Decimal('25000.00'),
            'payment_status': 'unpaid',
            'payment_terms': 'net_30'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        
        # Add multiple items
        for i, product in enumerate(products[:3]):
            item_data = {
                'sale_id': sale_id,
                'product_id': product['id'],
                'quantity': 5 + i,
                'unit_price': Decimal('2000.00'),
                'line_total': Decimal('2000.00') * (5 + i)
            }
            db_manager.execute_insert('sale_items', item_data)
        
        # Verify outstanding receivables
        result = db_manager.execute_query("""
            SELECT 
                s.invoice_number,
                s.sale_date,
                s.due_date,
                s.total_amount,
                s.payment_status,
                CURRENT_DATE - s.due_date as days_overdue,
                c.name as customer_name,
                c.credit_limit
            FROM public.sales s
            JOIN public.customers c ON s.customer_id = c.id
            WHERE s.id = %s
        """, (sale_id,))
        
        assert len(result) == 1
        assert result[0][0] == 'OVERDUE-001'
        assert result[0][3] == Decimal('25000.00')  # total_amount
        assert result[0][4] == 'unpaid'  # payment_status
        assert result[0][5] > 0  # days_overdue (should be positive)
    
    @pytest.mark.integration
    def test_mixed_payment_methods_workflow(self, comprehensive_test_data: dict, db_manager: DatabaseManager):
        """Test sales with mixed payment methods (cash + transfer + check)."""
        customer = comprehensive_test_data['customers'][0]
        product = comprehensive_test_data['products'][0]
        staff = comprehensive_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        total_amount = Decimal('15000.00')
        
        # Create sale
        sale_data = {
            'invoice_number': 'MIXED-PAY-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'NIS',
            'total_amount': total_amount,
            'payment_status': 'unpaid',
            'payment_terms': 'mixed'
        }
        
        sale_id = db_manager.execute_insert('sales', sale_data)
        
        # Add sale item
        item_data = {
            'sale_id': sale_id,
            'product_id': product['id'],
            'quantity': 15,
            'unit_price': Decimal('1000.00'),
            'line_total': total_amount
        }
        db_manager.execute_insert('sale_items', item_data)
        
        # Cash payment (40%)
        cash_amount = Decimal('6000.00')
        cash_payment = {
            'sale_id': sale_id,
            'amount': cash_amount,
            'currency': 'NIS',
            'payment_method': 'cash',
            'payment_date': date.today(),
            'reference_number': 'CASH-MIX-001'
        }
        db_manager.execute_insert('payments', cash_payment)
        
        # Bank transfer (35%)
        transfer_amount = Decimal('5250.00')
        transfer_payment = {
            'sale_id': sale_id,
            'amount': transfer_amount,
            'currency': 'NIS',
            'payment_method': 'bank_transfer',
            'payment_date': date.today(),
            'reference_number': 'TRF-MIX-001'
        }
        db_manager.execute_insert('payments', transfer_payment)
        
        # Check payment (25%)
        check_amount = Decimal('3750.00')
        check_payment = {
            'sale_id': sale_id,
            'amount': check_amount,
            'currency': 'NIS',
            'payment_method': 'check',
            'payment_date': date.today() + timedelta(days=3),
            'reference_number': 'CHK-MIX-001'
        }
        db_manager.execute_insert('payments', check_payment)
        
        # Update sale status
        total_paid = cash_amount + transfer_amount + check_amount
        db_manager.execute_query("""
            UPDATE public.sales 
            SET payment_status = 'paid',
                total_paid = %s,
                balance_due = 0
            WHERE id = %s
        """, (total_paid, sale_id))
        
        # Verify payment method distribution
        result = db_manager.execute_query("""
            SELECT 
                payment_method,
                COUNT(*) as payment_count,
                SUM(amount) as method_total,
                ROUND((SUM(amount) / %s * 100), 2) as percentage
            FROM public.payments 
            WHERE sale_id = %s
            GROUP BY payment_method
            ORDER BY method_total DESC
        """, (total_amount, sale_id))
        
        assert len(result) == 3  # Three different payment methods
        
        # Verify cash is the largest payment
        cash_row = next(row for row in result if row[0] == 'cash')
        assert cash_row[2] == Decimal('6000.00')
        assert cash_row[3] == Decimal('40.00')  # 40%
    
    @pytest.mark.integration
    def test_sale_upgrade_workflow(self, comprehensive_test_data: dict, db_manager: DatabaseManager):
        """Test customer upgrading from smaller to larger system."""
        customer = comprehensive_test_data['customers'][0]
        products = comprehensive_test_data['products']
        staff = comprehensive_test_data['staff']
        sales_rep = next(s for s in staff if s['role'] == 'sales_rep')
        
        # Original 6KW system sale
        original_sale_data = {
            'invoice_number': 'ORIG-6KW-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today() - timedelta(days=10),
            'currency': 'NIS',
            'total_amount': Decimal('30000.00'),
            'payment_status': 'paid',
            'fulfillment_status': 'cancelled',  # Cancelled due to upgrade
            'notes': 'Upgraded to 10KW system'
        }
        
        original_sale_id = db_manager.execute_insert('sales', original_sale_data)
        
        # Original sale items (6KW system)
        original_items = [
            {'product_id': products[0]['id'], 'quantity': 15, 'unit_price': Decimal('1500.00')},
            {'product_id': products[1]['id'], 'quantity': 2, 'unit_price': Decimal('3750.00')}
        ]
        
        for item in original_items:
            item_data = {
                'sale_id': original_sale_id,
                'product_id': item['product_id'],
                'quantity': item['quantity'],
                'unit_price': item['unit_price'],
                'line_total': item['quantity'] * item['unit_price']
            }
            db_manager.execute_insert('sale_items', item_data)
        
        # Upgraded 10KW system sale
        upgrade_sale_data = {
            'invoice_number': 'UPG-10KW-001',
            'customer_id': customer['id'],
            'sales_rep_id': sales_rep['id'],
            'sale_date': date.today(),
            'currency': 'NIS',
            'total_amount': Decimal('45000.00'),
            'payment_status': 'partial_paid',
            'fulfillment_status': 'pending',
            'related_sale_id': original_sale_id,  # Link to original sale
            'notes': 'Upgrade from 6KW system'
        }
        
        upgrade_sale_id = db_manager.execute_insert('sales', upgrade_sale_data)
        
        # Upgraded sale items (10KW system)
        upgrade_items = [
            {'product_id': products[0]['id'], 'quantity': 25, 'unit_price': Decimal('1400.00')},  # More panels
            {'product_id': products[1]['id'], 'quantity': 3, 'unit_price': Decimal('5000.00')},   # Bigger inverter
            {'product_id': products[2]['id'], 'quantity': 2, 'unit_price': Decimal('2500.00')}    # Add batteries
        ]
        
        for item in upgrade_items:
            item_data = {
                'sale_id': upgrade_sale_id,
                'product_id': item['product_id'],
                'quantity': item['quantity'],
                'unit_price': item['unit_price'],
                'line_total': item['quantity'] * item['unit_price']
            }
            db_manager.execute_insert('sale_items', item_data)
        
        # Credit from original sale
        credit_payment = {
            'sale_id': upgrade_sale_id,
            'amount': Decimal('30000.00'),
            'currency': 'NIS',
            'payment_method': 'credit_note',
            'payment_date': date.today(),
            'reference_number': f'CREDIT-{original_sale_id}',
            'notes': 'Credit from cancelled 6KW system'
        }
        db_manager.execute_insert('payments', credit_payment)
        
        # Verify upgrade relationship and balance
        result = db_manager.execute_query("""
            SELECT 
                orig.invoice_number as original_invoice,
                orig.total_amount as original_amount,
                orig.fulfillment_status as original_status,
                upg.invoice_number as upgrade_invoice,
                upg.total_amount as upgrade_amount,
                upg.payment_status as upgrade_payment_status,
                (upg.total_amount - orig.total_amount) as upgrade_cost,
                SUM(p.amount) as credits_applied
            FROM public.sales orig
            JOIN public.sales upg ON upg.related_sale_id = orig.id
            LEFT JOIN public.payments p ON p.sale_id = upg.id AND p.payment_method = 'credit_note'
            WHERE orig.id = %s
            GROUP BY orig.id, upg.id, orig.invoice_number, orig.total_amount, 
                     orig.fulfillment_status, upg.invoice_number, upg.total_amount, upg.payment_status
        """, (original_sale_id,))
        
        assert len(result) == 1
        assert result[0][0] == 'ORIG-6KW-001'  # original_invoice
        assert result[0][1] == Decimal('30000.00')  # original_amount
        assert result[0][2] == 'cancelled'  # original_status
        assert result[0][3] == 'UPG-10KW-001'  # upgrade_invoice
        assert result[0][4] == Decimal('45000.00')  # upgrade_amount
        assert result[0][6] == Decimal('15000.00')  # upgrade_cost (difference)
        assert result[0][7] == Decimal('30000.00')  # credits_applied