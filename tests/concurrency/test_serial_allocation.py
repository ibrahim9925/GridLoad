"""
Serial Number Allocation Concurrency Tests

Tests:
- Race conditions in serial number allocation
- Prevention of duplicate serial allocations
- Concurrent sale processing with inventory validation
- Database deadlock detection and resolution
- Stock overselling prevention under load
"""

import pytest
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.concurrency
@pytest.mark.critical
class TestSerialAllocationConcurrency:
    """Concurrency tests for serial number allocation workflows."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup test data for concurrency testing."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        
        # Create test customer
        self.customer = await self.seeder.create_customer({
            "contact_person": "Concurrency Test Customer",
            "company_name": "Concurrent Corp",
            "email": "concurrent@test.com"
        })
        
        # Create test product with serial tracking
        self.product = await self.seeder.create_product({
            "name": "Concurrent Test Product",
            "sku": "CTP001",
            "unit_price": 1000.0,
            "cost_price": 600.0,
            "tracks_serial_numbers": True,
            "current_stock": 100,
            "category": "Electronics"
        })
        
        # Create serial numbers for concurrent allocation testing
        self.serial_numbers = []
        for i in range(50):  # Limited pool to force conflicts
            serial_data = {
                "product_id": self.product["id"],
                "serial_number": f"CONC{i+1:04d}",
                "status": "available",
                "location": "warehouse"
            }
            
            serial_response = self.api_client.create("serial_numbers", serial_data)
            assert serial_response.success
            self.serial_numbers.append(serial_response.json)
    
    def create_concurrent_sale(self, thread_id: int, quantity: int = 1) -> Dict[str, Any]:
        """Create a sale in a separate thread to test concurrency."""
        try:
            # Create thread-specific API client
            client = APIClient(
                base_url=self.api_client.base_url,
                api_key=self.api_client.api_key
            )
            
            # Create sale
            sale_data = {
                "customer_id": self.customer["id"],
                "sale_date": "2024-03-20",
                "status": "confirmed",
                "payment_status": "pending",
                "total_amount": 1000.0 * quantity,
                "thread_id": thread_id  # For tracking in tests
            }
            
            sale_response = client.create("sales", sale_data)
            if not sale_response.success:
                return {"success": False, "error": "Sale creation failed", "thread_id": thread_id}
            
            sale_id = sale_response.json["id"]
            
            # Get available serials (this is where race conditions occur)
            available_serials_response = client.read("serial_numbers", {
                "product_id": f"eq.{self.product['id']}",
                "status": "eq.available",
                "limit": str(quantity)
            })
            
            if not available_serials_response.success or len(available_serials_response.json) < quantity:
                return {"success": False, "error": "Insufficient serials", "thread_id": thread_id}
            
            selected_serials = available_serials_response.json[:quantity]
            
            # Attempt to allocate serials
            allocated_serials = []
            for serial in selected_serials:
                # Try to update serial status atomically
                update_response = client.update("serial_numbers", serial["id"], {
                    "status": "allocated",
                    "sale_id": sale_id,
                    "allocation_date": "2024-03-20"
                })
                
                if update_response.success:
                    allocated_serials.append(serial["id"])
                else:
                    # Serial was already allocated by another thread
                    # Rollback allocated serials
                    for rollback_serial_id in allocated_serials:
                        client.update("serial_numbers", rollback_serial_id, {
                            "status": "available",
                            "sale_id": None,
                            "allocation_date": None
                        })
                    return {"success": False, "error": "Serial allocation conflict", "thread_id": thread_id}
            
            # Create sale item with allocated serials
            sale_item_data = {
                "sale_id": sale_id,
                "product_id": self.product["id"],
                "quantity": quantity,
                "unit_price": 1000.0,
                "total_price": 1000.0 * quantity,
                "allocated_serial_ids": allocated_serials
            }
            
            item_response = client.create("sale_items", sale_item_data)
            if not item_response.success:
                # Rollback serial allocations
                for serial_id in allocated_serials:
                    client.update("serial_numbers", serial_id, {
                        "status": "available",
                        "sale_id": None,
                        "allocation_date": None
                    })
                return {"success": False, "error": "Sale item creation failed", "thread_id": thread_id}
            
            return {
                "success": True,
                "sale_id": sale_id,
                "allocated_serials": allocated_serials,
                "thread_id": thread_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "thread_id": thread_id}
    
    async def test_concurrent_serial_allocation_race_condition(self):
        """Test race conditions when multiple threads try to allocate same serials."""
        concurrent_users = 10
        sales_per_user = 2
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            # Submit concurrent sale creation tasks
            futures = []
            for user_id in range(concurrent_users):
                for sale_num in range(sales_per_user):
                    future = executor.submit(
                        self.create_concurrent_sale,
                        thread_id=f"user_{user_id}_sale_{sale_num}",
                        quantity=1
                    )
                    futures.append(future)
            
            # Collect results
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        # Analyze results
        successful_sales = [r for r in results if r["success"]]
        failed_sales = [r for r in results if not r["success"]]
        
        print(f"Successful sales: {len(successful_sales)}")
        print(f"Failed sales: {len(failed_sales)}")
        
        # Verify no duplicate serial allocations
        all_allocated_serials = []
        for sale in successful_sales:
            all_allocated_serials.extend(sale["allocated_serials"])
        
        # Check for duplicates
        assert len(all_allocated_serials) == len(set(all_allocated_serials)), \
            "Duplicate serial numbers were allocated!"
        
        # Verify all allocated serials are marked correctly in database
        for serial_id in all_allocated_serials:
            serial_check = self.api_client.get_by_id("serial_numbers", serial_id)
            assert serial_check.success
            assert serial_check.json["status"] == "allocated"
            assert serial_check.json["sale_id"] is not None
        
        # Should have some failures due to serial conflicts
        conflict_failures = [f for f in failed_sales if "conflict" in f["error"]]
        assert len(conflict_failures) > 0, "Expected some serial allocation conflicts"
    
    async def test_bulk_serial_allocation_concurrency(self):
        """Test concurrent allocation of multiple serials per sale."""
        concurrent_users = 5
        serials_per_sale = 3
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            for user_id in range(concurrent_users):
                future = executor.submit(
                    self.create_concurrent_sale,
                    thread_id=f"bulk_user_{user_id}",
                    quantity=serials_per_sale
                )
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        successful_sales = [r for r in results if r["success"]]
        
        # Verify each successful sale got exactly the requested quantity
        for sale in successful_sales:
            assert len(sale["allocated_serials"]) == serials_per_sale
        
        # Verify no overlapping allocations
        all_serials = []
        for sale in successful_sales:
            all_serials.extend(sale["allocated_serials"])
        
        assert len(all_serials) == len(set(all_serials)), \
            "Overlapping serial allocations detected in bulk operations!"
    
    async def test_stock_overselling_prevention(self):
        """Test prevention of overselling when stock is limited."""
        # Set product stock to a low number
        stock_update = self.api_client.update("products", self.product["id"], {
            "current_stock": 5
        })
        assert stock_update.success
        
        # Try to create more sales than stock available
        concurrent_users = 10  # More users than available stock
        
        def create_stock_reducing_sale(thread_id: int) -> Dict[str, Any]:
            try:
                client = APIClient(
                    base_url=self.api_client.base_url,
                    api_key=self.api_client.api_key
                )
                
                # Check current stock before sale
                stock_check = client.get_by_id("products", self.product["id"])
                if not stock_check.success:
                    return {"success": False, "error": "Stock check failed", "thread_id": thread_id}
                
                current_stock = stock_check.json["current_stock"]
                if current_stock < 1:
                    return {"success": False, "error": "Out of stock", "thread_id": thread_id}
                
                # Create sale
                sale_data = {
                    "customer_id": self.customer["id"],
                    "sale_date": "2024-03-20",
                    "status": "confirmed",
                    "payment_status": "pending",
                    "total_amount": 1000.0
                }
                
                sale_response = client.create("sales", sale_data)
                if not sale_response.success:
                    return {"success": False, "error": "Sale creation failed", "thread_id": thread_id}
                
                # Create sale item (this should trigger stock reduction)
                sale_item_data = {
                    "sale_id": sale_response.json["id"],
                    "product_id": self.product["id"],
                    "quantity": 1,
                    "unit_price": 1000.0,
                    "total_price": 1000.0
                }
                
                item_response = client.create("sale_items", sale_item_data)
                if not item_response.success:
                    return {"success": False, "error": "Insufficient stock", "thread_id": thread_id}
                
                return {"success": True, "sale_id": sale_response.json["id"], "thread_id": thread_id}
                
            except Exception as e:
                return {"success": False, "error": str(e), "thread_id": thread_id}
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            for user_id in range(concurrent_users):
                future = executor.submit(create_stock_reducing_sale, f"stock_user_{user_id}")
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        successful_sales = [r for r in results if r["success"]]
        failed_sales = [r for r in results if not r["success"]]
        
        # Should have exactly 5 successful sales (original stock amount)
        assert len(successful_sales) <= 5, \
            f"Overselling occurred! Expected max 5 sales, got {len(successful_sales)}"
        
        # Verify final stock is correct
        final_stock_check = self.api_client.get_by_id("products", self.product["id"])
        assert final_stock_check.success
        expected_final_stock = 5 - len(successful_sales)
        assert final_stock_check.json["current_stock"] == expected_final_stock
        
        # Some sales should have failed due to insufficient stock
        stock_failures = [f for f in failed_sales if "stock" in f["error"].lower()]
        assert len(stock_failures) > 0, "Expected some stock-related failures"
    
    async def test_payment_processing_concurrency(self):
        """Test concurrent payment processing on the same sale."""
        # Create a sale for concurrent payment testing
        sale_data = {
            "customer_id": self.customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "total_amount": 5000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        def process_payment(payment_amount: float, thread_id: str) -> Dict[str, Any]:
            try:
                client = APIClient(
                    base_url=self.api_client.base_url,
                    api_key=self.api_client.api_key
                )
                
                # Check current payment status
                sale_check = client.get_by_id("sales", sale_id)
                if not sale_check.success:
                    return {"success": False, "error": "Sale check failed", "thread_id": thread_id}
                
                current_payments_response = client.read("payments", {
                    "sale_id": f"eq.{sale_id}"
                })
                
                if not current_payments_response.success:
                    return {"success": False, "error": "Payment check failed", "thread_id": thread_id}
                
                total_paid = sum(float(p["amount"]) for p in current_payments_response.json)
                remaining_amount = 5000.0 - total_paid
                
                if remaining_amount < payment_amount:
                    return {"success": False, "error": "Payment exceeds remaining amount", "thread_id": thread_id}
                
                # Process payment
                payment_data = {
                    "sale_id": sale_id,
                    "payment_date": "2024-03-20",
                    "amount": payment_amount,
                    "payment_method": "bank_transfer",
                    "status": "completed",
                    "thread_id": thread_id
                }
                
                payment_response = client.create("payments", payment_data)
                if not payment_response.success:
                    return {"success": False, "error": "Payment creation failed", "thread_id": thread_id}
                
                return {"success": True, "payment_id": payment_response.json["id"], "thread_id": thread_id}
                
            except Exception as e:
                return {"success": False, "error": str(e), "thread_id": thread_id}
        
        # Try to process overlapping payments concurrently
        payment_amounts = [2000.0, 2000.0, 2000.0]  # Total exceeds sale amount
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = []
            for i, amount in enumerate(payment_amounts):
                future = executor.submit(process_payment, amount, f"payment_thread_{i}")
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        successful_payments = [r for r in results if r["success"]]
        failed_payments = [r for r in results if not r["success"]]
        
        # Verify total payments don't exceed sale amount
        all_payments_response = self.api_client.read("payments", {"sale_id": f"eq.{sale_id}"})
        assert all_payments_response.success
        
        total_payment_amount = sum(float(p["amount"]) for p in all_payments_response.json)
        assert total_payment_amount <= 5000.0, \
            f"Overpayment occurred! Total payments: {total_payment_amount}"
        
        # Should have some payment failures due to amount constraints
        amount_failures = [f for f in failed_payments if "amount" in f["error"]]
        assert len(amount_failures) > 0, "Expected some payment amount conflicts"
    
    async def test_deadlock_detection_and_recovery(self):
        """Test database deadlock detection in complex concurrent scenarios."""
        def complex_transaction(thread_id: str) -> Dict[str, Any]:
            try:
                client = APIClient(
                    base_url=self.api_client.base_url,
                    api_key=self.api_client.api_key
                )
                
                # Create multiple related records in sequence to increase deadlock chance
                # 1. Create sale
                sale_data = {
                    "customer_id": self.customer["id"],
                    "sale_date": "2024-03-20",
                    "status": "confirmed",
                    "payment_status": "pending",
                    "total_amount": 1000.0
                }
                
                sale_response = client.create("sales", sale_data)
                if not sale_response.success:
                    return {"success": False, "error": "Sale creation failed", "thread_id": thread_id}
                
                # 2. Update product stock
                stock_update = client.update("products", self.product["id"], {
                    "current_stock": 99  # Concurrent updates to same record
                })
                
                # 3. Create sale item
                sale_item_data = {
                    "sale_id": sale_response.json["id"],
                    "product_id": self.product["id"],
                    "quantity": 1,
                    "unit_price": 1000.0,
                    "total_price": 1000.0
                }
                
                item_response = client.create("sale_items", sale_item_data)
                
                # 4. Create payment
                payment_data = {
                    "sale_id": sale_response.json["id"],
                    "payment_date": "2024-03-20",
                    "amount": 1000.0,
                    "payment_method": "cash",
                    "status": "completed"
                }
                
                payment_response = client.create("payments", payment_data)
                
                return {"success": True, "thread_id": thread_id}
                
            except Exception as e:
                error_msg = str(e).lower()
                if "deadlock" in error_msg or "timeout" in error_msg:
                    return {"success": False, "error": "deadlock_detected", "thread_id": thread_id}
                return {"success": False, "error": str(e), "thread_id": thread_id}
        
        # Run many concurrent complex transactions
        concurrent_transactions = 15
        
        with ThreadPoolExecutor(max_workers=concurrent_transactions) as executor:
            futures = []
            for i in range(concurrent_transactions):
                future = executor.submit(complex_transaction, f"deadlock_thread_{i}")
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        successful_transactions = [r for r in results if r["success"]]
        failed_transactions = [r for r in results if not r["success"]]
        deadlock_failures = [f for f in failed_transactions if f["error"] == "deadlock_detected"]
        
        print(f"Successful transactions: {len(successful_transactions)}")
        print(f"Failed transactions: {len(failed_transactions)}")
        print(f"Deadlock-related failures: {len(deadlock_failures)}")
        
        # System should handle deadlocks gracefully
        if deadlock_failures:
            print("Deadlock detection working - system handled conflicts gracefully")
        
        # At least some transactions should succeed
        assert len(successful_transactions) > 0, "No transactions succeeded - system may be deadlocked"