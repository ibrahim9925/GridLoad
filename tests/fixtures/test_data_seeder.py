import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from faker import Faker
from tests.utils.database_manager import DatabaseManager

fake = Faker()

class TestDataSeeder:
    """Test data seeder for creating consistent test datasets."""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.created_data = {}
    
    def seed_basic_data(self) -> Dict[str, Any]:
        """Seed basic test data needed for most tests."""
        data = {}
        
        # Create suppliers
        data['suppliers'] = self._create_suppliers(2)
        
        # Create products
        data['products'] = self._create_products(5, data['suppliers'])
        
        # Create customers
        data['customers'] = self._create_customers(3)
        
        # Create staff
        data['staff'] = self._create_staff()
        
        # Create bank accounts
        data['bank_accounts'] = self._create_bank_accounts()
        
        # Create currency rates
        data['currency_rates'] = self._create_currency_rates()
        
        self.created_data.update(data)
        return data
    
    def seed_comprehensive_data(self) -> Dict[str, Any]:
        """Seed comprehensive test data for complex workflow tests."""
        data = self.seed_basic_data()
        
        # Create containers and shipments
        data['containers'] = self._create_containers(2, data['suppliers'])
        data['container_products'] = self._create_container_products(data['containers'], data['products'])
        
        # Create purchase orders
        data['purchase_orders'] = self._create_purchase_orders(2, data['suppliers'])
        data['po_items'] = self._create_purchase_order_items(data['purchase_orders'], data['products'])
        
        # Create product serial numbers
        data['serial_numbers'] = self._create_serial_numbers(data['products'], 20)
        
        # Create sales
        data['sales'] = self._create_sales(3, data['customers'], data['staff'])
        data['sale_items'] = self._create_sale_items(data['sales'], data['products'])
        
        # Create payments
        data['payments'] = self._create_payments(data['sales'])
        
        # Create warranties
        data['warranties'] = self._create_warranties(data['sales'], data['products'], data['customers'])
        
        self.created_data.update(data)
        return data
    
    def _create_suppliers(self, count: int) -> List[Dict[str, Any]]:
        """Create test suppliers."""
        suppliers = []
        for _ in range(count):
            supplier_data = {
                'name': fake.company(),
                'contact_person': fake.name(),
                'email': fake.email(),
                'phone': fake.phone_number(),
                'address': fake.address(),
                'payment_terms': 'net_30',
                'lead_time_days': 14,
                'min_order_amount': Decimal('1000.00'),
                'quality_rating': Decimal('4.5'),
                'delivery_rating': Decimal('4.8'),
                'is_active': True
            }
            supplier_id = self.db.execute_insert('suppliers', supplier_data)
            supplier_data['id'] = supplier_id
            suppliers.append(supplier_data)
        
        return suppliers
    
    def _create_products(self, count: int, suppliers: List[Dict]) -> List[Dict[str, Any]]:
        """Create test products."""
        products = []
        categories = ['solar_panel', 'inverter', 'battery', 'accessories']
        
        for i in range(count):
            product_data = {
                'sku': f'TEST-{i:04d}',
                'name': f'Test Product {i+1}',
                'category': fake.random_element(categories),
                'brand': fake.company(),
                'model': f'Model-{i+1}',
                'description': fake.text(100),
                'cost_price': Decimal(fake.random_int(100, 1000)),
                'selling_price': Decimal(fake.random_int(200, 1500)),
                'current_stock': fake.random_int(50, 200),
                'reserved_qty': 0,
                'on_hand_qty': fake.random_int(50, 200),
                'reorder_point': 20,
                'reorder_quantity': 50,
                'max_stock_level': 500,
                'warranty_months': fake.random_int(12, 60),
                'requires_installation': fake.boolean(chance_of_getting_true=30),
                'is_active': True
            }
            product_id = self.db.execute_insert('products', product_data)
            product_data['id'] = product_id
            products.append(product_data)
        
        return products
    
    def _create_customers(self, count: int) -> List[Dict[str, Any]]:
        """Create test customers."""
        customers = []
        for i in range(count):
            customer_data = {
                'name': fake.name(),
                'email': fake.email(),
                'phone': fake.phone_number(),
                'address': fake.address(),
                'city': fake.city(),
                'postal_code': fake.postcode(),
                'country': 'Israel',
                'credit_limit': Decimal('50000.00'),
                'payment_terms': 'net_30',
                'discount_percentage': Decimal('0.00'),
                'is_active': True
            }
            customer_id = self.db.execute_insert('customers', customer_data)
            customer_data['id'] = customer_id
            customers.append(customer_data)
        
        return customers
    
    def _create_staff(self) -> List[Dict[str, Any]]:
        """Create test staff members."""
        staff_members = []
        roles = ['admin', 'sales_rep', 'warehouse', 'accountant', 'installer']
        
        for role in roles:
            staff_data = {
                'email': f'test_{role}@gridload.com',
                'full_name': f'Test {role.replace("_", " ").title()}',
                'role': role,
                'phone': fake.phone_number(),
                'hire_date': date.today() - timedelta(days=fake.random_int(30, 365)),
                'salary': Decimal('5000.00'),
                'commission_rate': Decimal('5.00') if role == 'sales_rep' else Decimal('0.00'),
                'is_active': True
            }
            staff_id = self.db.execute_insert('staff', staff_data)
            staff_data['id'] = staff_id
            staff_members.append(staff_data)
        
        return staff_members
    
    def _create_bank_accounts(self) -> List[Dict[str, Any]]:
        """Create test bank accounts."""
        accounts = []
        currencies = ['USD', 'NIS']
        
        for currency in currencies:
            account_data = {
                'name': f'Test {currency} Account',
                'currency': currency,
                'account_number': fake.iban(),
                'bank_name': fake.company(),
                'opening_balance': Decimal('10000.00'),
                'current_balance': Decimal('10000.00'),
                'is_active': True
            }
            account_id = self.db.execute_insert('bank_accounts', account_data)
            account_data['id'] = account_id
            accounts.append(account_data)
        
        return accounts
    
    def _create_currency_rates(self) -> List[Dict[str, Any]]:
        """Create test currency rates."""
        rates = []
        
        # USD to NIS rate
        rate_data = {
            'from_currency': 'USD',
            'to_currency': 'NIS',
            'rate': Decimal('3.65'),
            'date': date.today()
        }
        rate_id = self.db.execute_insert('currency_rates', rate_data)
        rate_data['id'] = rate_id
        rates.append(rate_data)
        
        return rates
    
    def _create_containers(self, count: int, suppliers: List[Dict]) -> List[Dict[str, Any]]:
        """Create test containers."""
        containers = []
        
        for i in range(count):
            supplier = fake.random_element(suppliers)
            container_data = {
                'container_number': f'TEST-CONT-{i:03d}',
                'container_type': '40HC',
                'supplier_id': supplier['id'],
                'order_date': date.today() - timedelta(days=60),
                'expected_arrival_date': date.today() + timedelta(days=30),
                'status': 'ordered',
                'cbm_capacity': Decimal('67.7'),
                'total_cost': Decimal('0.00'),
                'port_of_departure': 'Shanghai',
                'port_of_arrival': 'Ashdod',
                'carrier': 'Test Shipping Line'
            }
            container_id = self.db.execute_insert('containers', container_data)
            container_data['id'] = container_id
            containers.append(container_data)
        
        return containers
    
    def _create_container_products(self, containers: List[Dict], products: List[Dict]) -> List[Dict[str, Any]]:
        """Create container products."""
        container_products = []
        
        for container in containers:
            # Add 2-3 products per container
            selected_products = fake.random_elements(products, length=3, unique=True)
            
            for product in selected_products:
                cp_data = {
                    'container_id': container['id'],
                    'product_id': product['id'],
                    'quantity': fake.random_int(10, 100),
                    'unit_cost': product['cost_price'],
                    'total_cost': Decimal(str(fake.random_int(10, 100))) * product['cost_price']
                }
                cp_id = self.db.execute_insert('container_products', cp_data)
                cp_data['id'] = cp_id
                container_products.append(cp_data)
        
        return container_products
    
    def _create_sales(self, count: int, customers: List[Dict], staff: List[Dict]) -> List[Dict[str, Any]]:
        """Create test sales."""
        sales = []
        sales_reps = [s for s in staff if s['role'] == 'sales_rep']
        
        for i in range(count):
            customer = fake.random_element(customers)
            sales_rep = fake.random_element(sales_reps) if sales_reps else staff[0]
            
            total_amount = Decimal(fake.random_int(5000, 50000))
            
            sale_data = {
                'invoice_number': f'INV-{i:06d}',
                'customer_id': customer['id'],
                'sales_rep_id': sales_rep['id'],
                'sale_date': date.today() - timedelta(days=fake.random_int(1, 30)),
                'currency': 'NIS',
                'exchange_rate': Decimal('1.00'),
                'subtotal': total_amount * Decimal('0.83'),  # Before tax
                'tax_amount': total_amount * Decimal('0.17'),  # 17% VAT
                'total_amount': total_amount,
                'total_amount_usd': total_amount / Decimal('3.65'),
                'payment_status': fake.random_element(['unpaid', 'partial_paid', 'paid']),
                'fulfillment_status': 'pending',
                'payment_terms': 'net_30',
                'shipping_address': customer['address']
            }
            sale_id = self.db.execute_insert('sales', sale_data)
            sale_data['id'] = sale_id
            sales.append(sale_data)
        
        return sales
    
    def _create_sale_items(self, sales: List[Dict], products: List[Dict]) -> List[Dict[str, Any]]:
        """Create sale items."""
        sale_items = []
        
        for sale in sales:
            # Add 1-3 items per sale
            selected_products = fake.random_elements(products, length=2, unique=True)
            
            for product in selected_products:
                quantity = fake.random_int(1, 5)
                unit_price = product['selling_price']
                line_total = quantity * unit_price
                
                item_data = {
                    'sale_id': sale['id'],
                    'product_id': product['id'],
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'line_total': line_total
                }
                item_id = self.db.execute_insert('sale_items', item_data)
                item_data['id'] = item_id
                sale_items.append(item_data)
        
        return sale_items
    
    def _create_serial_numbers(self, products: List[Dict], count: int) -> List[Dict[str, Any]]:
        """Create product serial numbers."""
        serials = []
        
        for i in range(count):
            product = fake.random_element(products)
            
            serial_data = {
                'product_id': product['id'],
                'serial_number': f'SN{i:08d}',
                'status': 'available',
                'received_date': date.today() - timedelta(days=fake.random_int(1, 90))
            }
            serial_id = self.db.execute_insert('product_serial_numbers', serial_data)
            serial_data['id'] = serial_id
            serials.append(serial_data)
        
        return serials
    
    def _create_purchase_orders(self, count: int, suppliers: List[Dict]) -> List[Dict[str, Any]]:
        """Create purchase orders."""
        pos = []
        
        for i in range(count):
            supplier = fake.random_element(suppliers)
            
            po_data = {
                'order_number': f'PO-{i:06d}',
                'supplier_id': supplier['id'],
                'order_date': date.today() - timedelta(days=fake.random_int(1, 60)),
                'expected_delivery_date': date.today() + timedelta(days=fake.random_int(7, 30)),
                'status': 'draft',
                'subtotal': Decimal('0.00'),
                'tax_amount': Decimal('0.00'),
                'total_amount': Decimal('0.00'),
                'created_by': self.created_data.get('staff', [{}])[0].get('id', str(uuid.uuid4()))
            }
            po_id = self.db.execute_insert('purchase_orders', po_data)
            po_data['id'] = po_id
            pos.append(po_data)
        
        return pos
    
    def _create_purchase_order_items(self, pos: List[Dict], products: List[Dict]) -> List[Dict[str, Any]]:
        """Create purchase order items."""
        po_items = []
        
        for po in pos:
            selected_products = fake.random_elements(products, length=2, unique=True)
            
            for product in selected_products:
                quantity = fake.random_int(10, 100)
                unit_cost = product['cost_price']
                line_total = quantity * unit_cost
                
                item_data = {
                    'purchase_order_id': po['id'],
                    'product_id': product['id'],
                    'quantity': quantity,
                    'unit_cost': unit_cost,
                    'line_total': line_total,
                    'received_quantity': 0
                }
                item_id = self.db.execute_insert('purchase_order_items', item_data)
                item_data['id'] = item_id
                po_items.append(item_data)
        
        return po_items
    
    def _create_payments(self, sales: List[Dict]) -> List[Dict[str, Any]]:
        """Create payments for sales."""
        payments = []
        
        for sale in sales[:2]:  # Create payments for first 2 sales
            payment_data = {
                'sale_id': sale['id'],
                'amount': sale['total_amount'] / 2,  # Partial payment
                'currency': sale['currency'],
                'exchange_rate': sale['exchange_rate'],
                'payment_method': 'cash',
                'payment_date': date.today(),
                'reference_number': f'PAY-{fake.random_int(1000, 9999)}'
            }
            payment_id = self.db.execute_insert('payments', payment_data)
            payment_data['id'] = payment_id
            payments.append(payment_data)
        
        return payments
    
    def _create_warranties(self, sales: List[Dict], products: List[Dict], customers: List[Dict]) -> List[Dict[str, Any]]:
        """Create warranties."""
        warranties = []
        
        for sale in sales:
            # Create warranty for products with warranty period
            warranty_products = [p for p in products if p['warranty_months'] > 0]
            if warranty_products:
                product = fake.random_element(warranty_products)
                customer = next(c for c in customers if c['id'] == sale['customer_id'])
                
                warranty_data = {
                    'sale_id': sale['id'],
                    'product_id': product['id'],
                    'customer_id': customer['id'],
                    'warranty_period_months': product['warranty_months'],
                    'warranty_start_date': sale['sale_date'],
                    'warranty_end_date': sale['sale_date'] + timedelta(days=product['warranty_months'] * 30),
                    'warranty_type': 'manufacturer',
                    'serial_number': f'WAR-{fake.random_int(1000, 9999)}',
                    'status': 'active'
                }
                warranty_id = self.db.execute_insert('warranties', warranty_data)
                warranty_data['id'] = warranty_id
                warranties.append(warranty_data)
        
        return warranties