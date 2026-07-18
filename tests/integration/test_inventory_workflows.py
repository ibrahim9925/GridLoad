"""
Inventory and Container Workflow Integration Tests

Tests:
- Container receipt processing and lifecycle
- Serial number management and allocation
- Stock movement validation and inventory updates
- Landed cost calculations across container products
- Partial receipt processing and status updates
"""

import pytest
import asyncio
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.integration
@pytest.mark.critical
class TestInventoryWorkflows:
    """Integration tests for inventory and container workflows."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup test data for inventory workflows."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        
        # Create test supplier
        self.supplier_data = await self.seeder.create_supplier({
            "company_name": "Test Container Supplier",
            "contact_person": "Supply Manager",
            "email": "supplier@test.com"
        })
        
        # Create test products with serial tracking
        self.products = []
        for i in range(3):
            product = await self.seeder.create_product({
                "name": f"Container Product {i+1}",
                "sku": f"CP{i+1:03d}",
                "unit_price": 1000.0 + (i * 100),
                "cost_price": 600.0 + (i * 60),
                "tracks_serial_numbers": True,
                "warranty_years": 2,
                "minimum_stock_level": 10,
                "category": "Electronics"
            })
            self.products.append(product)
    
    async def test_container_full_lifecycle(self):
        """Test complete container workflow from creation to completion."""
        # Create container
        container_data = {
            "supplier_id": self.supplier_data["id"],
            "container_number": "TCNT001",
            "status": "ordered",
            "expected_arrival": "2024-03-15",
            "shipping_cost": 5000.0,
            "customs_cost": 2000.0,
            "other_costs": 1000.0,
            "total_cost": 8000.0,
            "currency": "USD"
        }
        
        container_response = self.api_client.create("containers", container_data)
        assert container_response.success
        container_id = container_response.json["id"]
        
        # Add products to container
        container_products = []
        for i, product in enumerate(self.products):
            cp_data = {
                "container_id": container_id,
                "product_id": product["id"],
                "ordered_quantity": 50 + (i * 10),
                "unit_cost": 600.0 + (i * 60),
                "total_cost": (600.0 + (i * 60)) * (50 + (i * 10))
            }
            cp_response = self.api_client.create("container_products", cp_data)
            assert cp_response.success
            container_products.append(cp_response.json)
        
        # Update container status to delivered
        update_response = self.api_client.update("containers", container_id, {
            "status": "delivered",
            "actual_arrival": "2024-03-16"
        })
        assert update_response.success
        
        # Process partial receipt for first product
        first_cp = container_products[0]
        receipt_data = {
            "container_product_id": first_cp["id"],
            "received_quantity": 30,  # Partial receipt
            "receipt_date": "2024-03-17",
            "notes": "Partial receipt - rest coming tomorrow"
        }
        
        receipt_response = self.api_client.create("container_receipts", receipt_data)
        assert receipt_response.success
        
        # Verify container product status updated
        cp_check = self.api_client.get_by_id("container_products", first_cp["id"])
        assert cp_check.success
        assert cp_check.json["received_quantity"] == 30
        assert cp_check.json["status"] == "partially_received"
        
        # Complete the receipt
        complete_receipt_data = {
            "container_product_id": first_cp["id"],
            "received_quantity": 20,  # Remaining quantity
            "receipt_date": "2024-03-18",
            "notes": "Final receipt completed"
        }
        
        final_receipt_response = self.api_client.create("container_receipts", complete_receipt_data)
        assert final_receipt_response.success
        
        # Verify final status
        final_cp_check = self.api_client.get_by_id("container_products", first_cp["id"])
        assert final_cp_check.success
        assert final_cp_check.json["received_quantity"] == 50
        assert final_cp_check.json["status"] == "completed"
        
        # Verify inventory stock updated
        product_check = self.api_client.get_by_id("products", self.products[0]["id"])
        assert product_check.success
        assert product_check.json["current_stock"] >= 50
    
    async def test_serial_number_management(self):
        """Test serial number allocation and tracking."""
        product = self.products[0]
        
        # Generate serial numbers for the product
        serial_data = []
        for i in range(10):
            serial_data.append({
                "product_id": product["id"],
                "serial_number": f"SN{product['sku']}{i+1:04d}",
                "status": "available",
                "location": "warehouse_a"
            })
        
        # Bulk create serial numbers
        created_serials = []
        for serial in serial_data:
            response = self.api_client.create("serial_numbers", serial)
            assert response.success
            created_serials.append(response.json)
        
        # Test serial allocation on sale
        customer = await self.seeder.create_customer({
            "contact_person": "Serial Test Customer",
            "company_name": "Test Company"
        })
        
        sale_data = {
            "customer_id": customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "total_amount": 2000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Create sale item with serial allocation
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": product["id"],
            "quantity": 2,
            "unit_price": 1000.0,
            "total_price": 2000.0,
            "allocated_serials": [created_serials[0]["id"], created_serials[1]["id"]]
        }
        
        sale_item_response = self.api_client.create("sale_items", sale_item_data)
        assert sale_item_response.success
        
        # Verify serial numbers marked as allocated
        for i in range(2):
            serial_check = self.api_client.get_by_id("serial_numbers", created_serials[i]["id"])
            assert serial_check.success
            assert serial_check.json["status"] == "allocated"
            assert serial_check.json["sale_id"] == sale_id
        
        # Verify remaining serials still available
        for i in range(2, 10):
            serial_check = self.api_client.get_by_id("serial_numbers", created_serials[i]["id"])
            assert serial_check.success
            assert serial_check.json["status"] == "available"
    
    async def test_stock_movement_tracking(self):
        """Test inventory stock movements and validation."""
        product = self.products[1]
        initial_stock = product.get("current_stock", 0)
        
        # Test inward movement (container receipt)
        inward_movement = {
            "product_id": product["id"],
            "movement_type": "inward",
            "quantity": 25,
            "reference_type": "container_receipt",
            "reference_id": "test_receipt_001",
            "notes": "Container receipt movement"
        }
        
        inward_response = self.api_client.create("stock_movements", inward_movement)
        assert inward_response.success
        
        # Test outward movement (sale)
        outward_movement = {
            "product_id": product["id"],
            "movement_type": "outward",
            "quantity": 5,
            "reference_type": "sale",
            "reference_id": "test_sale_001",
            "notes": "Sale movement"
        }
        
        outward_response = self.api_client.create("stock_movements", outward_movement)
        assert outward_response.success
        
        # Test adjustment movement
        adjustment_movement = {
            "product_id": product["id"],
            "movement_type": "adjustment",
            "quantity": -2,  # Stock write-off
            "reference_type": "stock_adjustment",
            "reference_id": "test_adjustment_001",
            "notes": "Damaged goods write-off"
        }
        
        adjustment_response = self.api_client.create("stock_movements", adjustment_movement)
        assert adjustment_response.success
        
        # Verify current stock calculation
        product_check = self.api_client.get_by_id("products", product["id"])
        assert product_check.success
        expected_stock = initial_stock + 25 - 5 - 2
        assert product_check.json["current_stock"] == expected_stock
        
        # Verify stock movements history
        movements_response = self.api_client.read("stock_movements", {
            "product_id": f"eq.{product['id']}",
            "order": "created_at.desc"
        })
        assert movements_response.success
        assert len(movements_response.json) >= 3
    
    async def test_landed_cost_calculations(self):
        """Test landed cost distribution across container products."""
        # Create container with multiple products
        container_data = {
            "supplier_id": self.supplier_data["id"],
            "container_number": "TCNT002",
            "status": "delivered",
            "shipping_cost": 3000.0,
            "customs_cost": 1500.0,
            "other_costs": 500.0,
            "total_cost": 5000.0,
            "currency": "USD"
        }
        
        container_response = self.api_client.create("containers", container_data)
        assert container_response.success
        container_id = container_response.json["id"]
        
        # Add products with different values
        products_data = [
            {"product_id": self.products[0]["id"], "quantity": 100, "unit_cost": 600.0},
            {"product_id": self.products[1]["id"], "quantity": 50, "unit_cost": 800.0},
            {"product_id": self.products[2]["id"], "quantity": 25, "unit_cost": 1200.0}
        ]
        
        total_product_value = sum(p["quantity"] * p["unit_cost"] for p in products_data)
        
        for product_data in products_data:
            cp_data = {
                "container_id": container_id,
                "product_id": product_data["product_id"],
                "ordered_quantity": product_data["quantity"],
                "unit_cost": product_data["unit_cost"],
                "total_cost": product_data["quantity"] * product_data["unit_cost"]
            }
            
            cp_response = self.api_client.create("container_products", cp_data)
            assert cp_response.success
            
            # Verify landed cost calculation
            cp_data_returned = cp_response.json
            product_value = product_data["quantity"] * product_data["unit_cost"]
            expected_landed_cost_share = (product_value / total_product_value) * 5000.0
            expected_unit_landed_cost = (product_data["unit_cost"] + 
                                       (expected_landed_cost_share / product_data["quantity"]))
            
            # Allow for small rounding differences
            assert abs(cp_data_returned.get("unit_landed_cost", 0) - expected_unit_landed_cost) < 0.01
    
    async def test_low_stock_alerts(self):
        """Test low stock alert generation and management."""
        product = self.products[2]
        
        # Update product to have low stock
        low_stock_update = {
            "current_stock": 5,  # Below minimum of 10
            "minimum_stock_level": 10
        }
        
        update_response = self.api_client.update("products", product["id"], low_stock_update)
        assert update_response.success
        
        # Check if low stock alert was generated
        alerts_response = self.api_client.read("stock_alerts", {
            "product_id": f"eq.{product['id']}",
            "alert_type": "eq.low_stock",
            "status": "eq.active"
        })
        assert alerts_response.success
        assert len(alerts_response.json) > 0
        
        # Test alert resolution when stock is replenished
        restock_update = {
            "current_stock": 15  # Above minimum
        }
        
        restock_response = self.api_client.update("products", product["id"], restock_update)
        assert restock_response.success
        
        # Verify alert status updated
        updated_alerts_response = self.api_client.read("stock_alerts", {
            "product_id": f"eq.{product['id']}",
            "alert_type": "eq.low_stock",
            "status": "eq.resolved"
        })
        assert updated_alerts_response.success
        assert len(updated_alerts_response.json) > 0
    
    async def test_container_variance_tracking(self):
        """Test tracking of variances between ordered and received quantities."""
        container_data = {
            "supplier_id": self.supplier_data["id"],
            "container_number": "TCNT003",
            "status": "ordered"
        }
        
        container_response = self.api_client.create("containers", container_data)
        assert container_response.success
        container_id = container_response.json["id"]
        
        # Add product to container
        cp_data = {
            "container_id": container_id,
            "product_id": self.products[0]["id"],
            "ordered_quantity": 100,
            "unit_cost": 600.0
        }
        
        cp_response = self.api_client.create("container_products", cp_data)
        assert cp_response.success
        cp_id = cp_response.json["id"]
        
        # Receive different quantity (variance)
        receipt_data = {
            "container_product_id": cp_id,
            "received_quantity": 95,  # 5 units short
            "receipt_date": "2024-03-20",
            "variance_reason": "Damaged during shipping",
            "notes": "5 units damaged beyond repair"
        }
        
        receipt_response = self.api_client.create("container_receipts", receipt_data)
        assert receipt_response.success
        
        # Verify variance tracking
        cp_check = self.api_client.get_by_id("container_products", cp_id)
        assert cp_check.success
        assert cp_check.json["variance_quantity"] == -5
        assert cp_check.json["variance_reason"] == "Damaged during shipping"
        
        # Check if variance alert was generated
        variance_alerts = self.api_client.read("container_variances", {
            "container_product_id": f"eq.{cp_id}",
            "variance_type": "eq.shortage"
        })
        assert variance_alerts.success
        assert len(variance_alerts.json) > 0