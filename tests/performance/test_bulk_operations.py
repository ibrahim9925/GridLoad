"""
Bulk Operations Performance Tests

Tests:
- Large dataset operations and query performance
- Bulk data imports and exports
- Memory usage during large operations
- Database connection pool management
- Response time validation under load
"""

import pytest
import asyncio
import time
import psutil
import gc
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.performance
@pytest.mark.slow
class TestBulkOperations:
    """Performance tests for bulk operations and large datasets."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup test data for performance testing."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        self.performance_metrics = {}
        
        # Create base test data
        self.customer = await self.seeder.create_customer({
            "contact_person": "Performance Test Customer",
            "company_name": "Perf Corp",
            "email": "perf@test.com"
        })
        
        self.supplier = await self.seeder.create_supplier({
            "company_name": "Performance Supplier",
            "contact_person": "Supply Manager",
            "email": "supplier@perf.com"
        })
        
        # Create product categories for bulk testing
        self.categories = ["Electronics", "Solar", "Hardware", "Software", "Accessories"]
    
    def measure_performance(self, operation_name: str):
        """Decorator to measure operation performance."""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Memory before
                process = psutil.Process()
                memory_before = process.memory_info().rss / 1024 / 1024  # MB
                
                # Time before
                start_time = time.time()
                
                # Execute operation
                result = await func(*args, **kwargs)
                
                # Time after
                end_time = time.time()
                execution_time = end_time - start_time
                
                # Memory after
                memory_after = process.memory_info().rss / 1024 / 1024  # MB
                memory_delta = memory_after - memory_before
                
                # Store metrics
                self.performance_metrics[operation_name] = {
                    "execution_time": execution_time,
                    "memory_before": memory_before,
                    "memory_after": memory_after,
                    "memory_delta": memory_delta
                }
                
                print(f"{operation_name}: {execution_time:.2f}s, Memory: +{memory_delta:.2f}MB")
                
                return result
            return wrapper
        return decorator
    
    @measure_performance("bulk_product_creation_10k")
    async def test_bulk_product_creation(self):
        """Test creating 10,000 products and measure performance."""
        batch_size = 1000
        total_products = 10000
        created_products = []
        
        for batch_start in range(0, total_products, batch_size):
            batch_products = []
            
            for i in range(batch_start, min(batch_start + batch_size, total_products)):
                product_data = {
                    "name": f"Bulk Product {i+1}",
                    "sku": f"BP{i+1:06d}",
                    "unit_price": 100.0 + (i % 1000),
                    "cost_price": 60.0 + (i % 600),
                    "category": self.categories[i % len(self.categories)],
                    "minimum_stock_level": 10,
                    "current_stock": 50 + (i % 100),
                    "tracks_serial_numbers": i % 10 == 0,  # 10% track serials
                    "warranty_years": (i % 5) + 1
                }
                
                # Create product individually (simulating API calls)
                response = self.api_client.create("products", product_data)
                if response.success:
                    created_products.append(response.json)
                    batch_products.append(response.json)
                else:
                    print(f"Failed to create product {i+1}: {response.json}")
            
            print(f"Created batch {batch_start//batch_size + 1}: {len(batch_products)} products")
            
            # Clear memory after each batch
            gc.collect()
        
        assert len(created_products) >= total_products * 0.95, \
            f"Only {len(created_products)} of {total_products} products created"
        
        # Test query performance on large dataset
        query_start = time.time()
        all_products_response = self.api_client.read("products", {
            "limit": "10000",
            "order": "created_at.desc"
        })
        query_time = time.time() - query_start
        
        assert all_products_response.success
        assert query_time < 5.0, f"Query took {query_time:.2f}s - too slow!"
        
        return created_products
    
    @measure_performance("bulk_serial_number_generation")
    async def test_bulk_serial_number_generation(self):
        """Test generating large numbers of serial numbers."""
        # Create a product for serial testing
        product_data = {
            "name": "Serial Test Product",
            "sku": "STP001",
            "unit_price": 1000.0,
            "cost_price": 600.0,
            "tracks_serial_numbers": True,
            "category": "Electronics"
        }
        
        product_response = self.api_client.create("products", product_data)
        assert product_response.success
        product_id = product_response.json["id"]
        
        # Generate 50,000 serial numbers
        serial_count = 50000
        batch_size = 5000
        created_serials = []
        
        for batch_start in range(0, serial_count, batch_size):
            batch_serials = []
            
            for i in range(batch_start, min(batch_start + batch_size, serial_count)):
                serial_data = {
                    "product_id": product_id,
                    "serial_number": f"SN{i+1:08d}",
                    "status": "available",
                    "location": f"warehouse_{(i % 10) + 1}"
                }
                
                response = self.api_client.create("serial_numbers", serial_data)
                if response.success:
                    created_serials.append(response.json)
                    batch_serials.append(response.json)
            
            print(f"Generated serial batch {batch_start//batch_size + 1}: {len(batch_serials)} serials")
            gc.collect()
        
        assert len(created_serials) >= serial_count * 0.95, \
            f"Only {len(created_serials)} of {serial_count} serials created"
        
        # Test serial number lookup performance
        lookup_start = time.time()
        serial_lookup = self.api_client.read("serial_numbers", {
            "product_id": f"eq.{product_id}",
            "status": "eq.available",
            "limit": "1000"
        })
        lookup_time = time.time() - lookup_start
        
        assert serial_lookup.success
        assert lookup_time < 2.0, f"Serial lookup took {lookup_time:.2f}s - too slow!"
        
        return created_serials
    
    @measure_performance("bulk_sales_processing")
    async def test_bulk_sales_processing(self):
        """Test processing large numbers of sales simultaneously."""
        # Create products for sales
        products = []
        for i in range(100):
            product_data = {
                "name": f"Sales Product {i+1}",
                "sku": f"SP{i+1:04d}",
                "unit_price": 500.0 + (i * 10),
                "cost_price": 300.0 + (i * 6),
                "current_stock": 1000,
                "category": "Sales Test"
            }
            
            response = self.api_client.create("products", product_data)
            if response.success:
                products.append(response.json)
        
        # Create customers for sales
        customers = []
        for i in range(50):
            customer_data = {
                "contact_person": f"Bulk Customer {i+1}",
                "company_name": f"Company {i+1}",
                "email": f"customer{i+1}@bulk.com"
            }
            
            response = self.api_client.create("customers", customer_data)
            if response.success:
                customers.append(response.json)
        
        # Process 5,000 sales
        sales_count = 5000
        created_sales = []
        
        for i in range(sales_count):
            customer = customers[i % len(customers)]
            product = products[i % len(products)]
            
            sale_data = {
                "customer_id": customer["id"],
                "sale_date": "2024-03-20",
                "status": "confirmed",
                "payment_status": "pending",
                "total_amount": product["unit_price"]
            }
            
            sale_response = self.api_client.create("sales", sale_data)
            if sale_response.success:
                sale_id = sale_response.json["id"]
                
                # Create sale item
                item_data = {
                    "sale_id": sale_id,
                    "product_id": product["id"],
                    "quantity": 1,
                    "unit_price": product["unit_price"],
                    "total_price": product["unit_price"]
                }
                
                item_response = self.api_client.create("sale_items", item_data)
                if item_response.success:
                    created_sales.append(sale_response.json)
            
            if i % 500 == 0:
                print(f"Processed {i+1} sales")
                gc.collect()
        
        assert len(created_sales) >= sales_count * 0.95, \
            f"Only {len(created_sales)} of {sales_count} sales created"
        
        # Test sales query performance
        query_start = time.time()
        sales_query = self.api_client.read("sales", {
            "status": "eq.confirmed",
            "limit": "5000",
            "order": "created_at.desc"
        })
        query_time = time.time() - query_start
        
        assert sales_query.success
        assert query_time < 3.0, f"Sales query took {query_time:.2f}s - too slow!"
        
        return created_sales
    
    @measure_performance("complex_reporting_queries")
    async def test_complex_reporting_query_performance(self):
        """Test performance of complex reporting queries on large datasets."""
        # Test 1: Sales summary by customer
        start_time = time.time()
        customer_sales_response = self.api_client.read("sales", {
            "select": "customer_id,total_amount,payment_status",
            "limit": "10000"
        })
        customer_query_time = time.time() - start_time
        
        assert customer_sales_response.success
        assert customer_query_time < 2.0, \
            f"Customer sales query took {customer_query_time:.2f}s - too slow!"
        
        # Test 2: Product inventory summary
        start_time = time.time()
        inventory_response = self.api_client.read("products", {
            "select": "id,name,current_stock,minimum_stock_level,category",
            "current_stock": "lt.minimum_stock_level",
            "limit": "1000"
        })
        inventory_query_time = time.time() - start_time
        
        assert inventory_response.success
        assert inventory_query_time < 1.5, \
            f"Inventory query took {inventory_query_time:.2f}s - too slow!"
        
        # Test 3: Serial number tracking across sales
        start_time = time.time()
        serial_tracking_response = self.api_client.read("serial_numbers", {
            "select": "serial_number,status,product_id,sale_id",
            "status": "eq.allocated",
            "limit": "5000"
        })
        serial_query_time = time.time() - start_time
        
        assert serial_tracking_response.success
        assert serial_query_time < 2.0, \
            f"Serial tracking query took {serial_query_time:.2f}s - too slow!"
        
        return {
            "customer_query_time": customer_query_time,
            "inventory_query_time": inventory_query_time,
            "serial_query_time": serial_query_time
        }
    
    @measure_performance("memory_stress_test")
    async def test_memory_usage_under_load(self):
        """Test memory usage patterns during intensive operations."""
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Create large amounts of data in memory
        large_datasets = []
        
        for iteration in range(10):
            # Query large dataset
            large_query_response = self.api_client.read("products", {
                "limit": "5000",
                "order": "created_at.desc"
            })
            
            if large_query_response.success:
                large_datasets.append(large_query_response.json)
            
            current_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            memory_increase = current_memory - initial_memory
            
            print(f"Iteration {iteration+1}: Memory usage +{memory_increase:.2f}MB")
            
            # Memory should not grow indefinitely
            assert memory_increase < 500, \
                f"Memory usage increased by {memory_increase:.2f}MB - possible memory leak!"
            
            # Force garbage collection
            if iteration % 3 == 0:
                gc.collect()
        
        # Final memory check
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        total_memory_increase = final_memory - initial_memory
        
        print(f"Total memory increase: {total_memory_increase:.2f}MB")
        
        # Memory increase should be reasonable
        assert total_memory_increase < 300, \
            f"Total memory increase of {total_memory_increase:.2f}MB is too high!"
        
        return {
            "initial_memory": initial_memory,
            "final_memory": final_memory,
            "memory_increase": total_memory_increase
        }
    
    @measure_performance("concurrent_read_performance")
    async def test_concurrent_read_performance(self):
        """Test read performance under concurrent load."""
        import threading
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def perform_read_operations(thread_id: int) -> Dict[str, Any]:
            """Perform multiple read operations in a thread."""
            try:
                client = APIClient(
                    base_url=self.api_client.base_url,
                    api_key=self.api_client.api_key
                )
                
                operations_performed = 0
                start_time = time.time()
                
                # Perform various read operations
                for i in range(50):  # 50 operations per thread
                    # Random read operations
                    if i % 5 == 0:
                        response = client.read("products", {"limit": "100"})
                    elif i % 5 == 1:
                        response = client.read("customers", {"limit": "50"})
                    elif i % 5 == 2:
                        response = client.read("sales", {"limit": "100"})
                    elif i % 5 == 3:
                        response = client.read("serial_numbers", {"limit": "200"})
                    else:
                        response = client.read("payments", {"limit": "100"})
                    
                    if response.success:
                        operations_performed += 1
                
                end_time = time.time()
                total_time = end_time - start_time
                
                return {
                    "thread_id": thread_id,
                    "operations_performed": operations_performed,
                    "total_time": total_time,
                    "ops_per_second": operations_performed / total_time if total_time > 0 else 0
                }
                
            except Exception as e:
                return {
                    "thread_id": thread_id,
                    "error": str(e),
                    "operations_performed": 0,
                    "total_time": 0,
                    "ops_per_second": 0
                }
        
        # Run concurrent read operations
        concurrent_threads = 20
        
        with ThreadPoolExecutor(max_workers=concurrent_threads) as executor:
            futures = []
            for thread_id in range(concurrent_threads):
                future = executor.submit(perform_read_operations, thread_id)
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        # Analyze performance
        successful_threads = [r for r in results if r["operations_performed"] > 0]
        total_operations = sum(r["operations_performed"] for r in successful_threads)
        average_ops_per_second = sum(r["ops_per_second"] for r in successful_threads) / len(successful_threads)
        
        print(f"Concurrent read test results:")
        print(f"  Successful threads: {len(successful_threads)}/{concurrent_threads}")
        print(f"  Total operations: {total_operations}")
        print(f"  Average ops/second per thread: {average_ops_per_second:.2f}")
        
        # Performance expectations
        assert len(successful_threads) >= concurrent_threads * 0.9, \
            "Too many threads failed during concurrent read test"
        
        assert average_ops_per_second >= 10, \
            f"Average operations per second ({average_ops_per_second:.2f}) too low"
        
        return {
            "successful_threads": len(successful_threads),
            "total_operations": total_operations,
            "average_ops_per_second": average_ops_per_second
        }
    
    def teardown_method(self):
        """Print performance summary after each test."""
        if self.performance_metrics:
            print("\n=== Performance Summary ===")
            for operation, metrics in self.performance_metrics.items():
                print(f"{operation}:")
                print(f"  Execution time: {metrics['execution_time']:.2f}s")
                print(f"  Memory delta: {metrics['memory_delta']:.2f}MB")
                print(f"  Memory efficiency: {metrics['memory_delta']/metrics['execution_time']:.2f}MB/s")