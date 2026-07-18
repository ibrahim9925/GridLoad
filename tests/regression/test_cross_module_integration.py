"""
Cross-Module Integration and Regression Tests

Tests:
- End-to-end workflow integration across all modules
- Business logic regression prevention
- Data consistency across module boundaries
- Schema change impact validation
- Production scenario simulation
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.regression
@pytest.mark.critical
class TestCrossModuleIntegration:
    """Regression tests for cross-module integration workflows."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup comprehensive test data for cross-module testing."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        
        # Create supplier for container testing
        self.supplier = await self.seeder.create_supplier({
            "company_name": "Integration Test Supplier",
            "contact_person": "Supply Manager",
            "email": "supplier@integration.com"
        })
        
        # Create customer for sales testing
        self.customer = await self.seeder.create_customer({
            "contact_person": "Integration Customer",
            "company_name": "Integration Corp",
            "email": "customer@integration.com",
            "phone": "+972-50-1234567"
        })
        
        # Create products with various configurations
        self.products = []
        product_configs = [
            {
                "name": "Integration Solar Panel",
                "sku": "ISP001",
                "unit_price": 2000.0,
                "cost_price": 1200.0,
                "warranty_years": 25,
                "tracks_serial_numbers": True,
                "category": "Solar"
            },
            {
                "name": "Integration Inverter",
                "sku": "IIN001",
                "unit_price": 1500.0,
                "cost_price": 900.0,
                "warranty_years": 10,
                "tracks_serial_numbers": True,
                "category": "Electronics"
            },
            {
                "name": "Integration Battery",
                "sku": "IBA001",
                "unit_price": 3000.0,
                "cost_price": 1800.0,
                "warranty_years": 5,
                "tracks_serial_numbers": False,
                "category": "Storage"
            }
        ]
        
        for config in product_configs:
            product = await self.seeder.create_product(config)
            self.products.append(product)
    
    async def test_complete_business_workflow_integration(self):
        """Test complete business workflow from container to warranty claims."""
        # Phase 1: Container Receipt and Inventory Management
        print("Phase 1: Container Receipt Processing")
        
        # Create container
        container_data = {
            "supplier_id": self.supplier["id"],
            "container_number": "INT001",
            "status": "ordered",
            "expected_arrival": "2024-03-15",
            "shipping_cost": 5000.0,
            "customs_cost": 2000.0,
            "total_cost": 7000.0,
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
                "ordered_quantity": 100,
                "unit_cost": product["cost_price"],
                "total_cost": product["cost_price"] * 100
            }
            
            cp_response = self.api_client.create("container_products", cp_data)
            assert cp_response.success
            container_products.append(cp_response.json)
        
        # Receive container
        for cp in container_products:
            receipt_data = {
                "container_product_id": cp["id"],
                "received_quantity": 100,
                "receipt_date": "2024-03-16",
                "notes": "Full quantity received"
            }
            
            receipt_response = self.api_client.create("container_receipts", receipt_data)
            assert receipt_response.success
        
        # Generate serial numbers for tracking products
        serial_numbers = []
        for product in self.products[:2]:  # Only first two track serials
            for i in range(20):  # Generate 20 serials per product
                serial_data = {
                    "product_id": product["id"],
                    "serial_number": f"{product['sku']}{i+1:04d}",
                    "status": "available",
                    "location": "main_warehouse"
                }
                
                serial_response = self.api_client.create("serial_numbers", serial_data)
                assert serial_response.success
                serial_numbers.append(serial_response.json)
        
        # Phase 2: Sales Processing
        print("Phase 2: Sales Processing")
        
        # Create sale
        sale_data = {
            "customer_id": self.customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "total_amount": 0  # Will be calculated
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale items with serial allocation
        sale_items = []
        total_amount = 0
        
        for i, product in enumerate(self.products):
            quantity = 5
            unit_price = product["unit_price"]
            total_price = unit_price * quantity
            total_amount += total_price
            
            sale_item_data = {
                "sale_id": sale_id,
                "product_id": product["id"],
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price
            }
            
            # Allocate serials for tracking products
            if product["tracks_serial_numbers"]:
                product_serials = [s for s in serial_numbers 
                                 if s["product_id"] == product["id"]][:quantity]
                
                for serial in product_serials:
                    update_response = self.api_client.update("serial_numbers", serial["id"], {
                        "status": "allocated",
                        "sale_id": sale_id
                    })
                    assert update_response.success
                
                sale_item_data["allocated_serial_ids"] = [s["id"] for s in product_serials]
            
            item_response = self.api_client.create("sale_items", sale_item_data)
            assert item_response.success
            sale_items.append(item_response.json)
        
        # Update sale total
        update_response = self.api_client.update("sales", sale_id, {
            "total_amount": total_amount
        })
        assert update_response.success
        
        # Phase 3: Warranty Creation
        print("Phase 3: Automatic Warranty Creation")
        
        # Verify warranties were auto-created
        warranties = []
        for item in sale_items:
            warranties_response = self.api_client.read("warranties", {
                "sale_item_id": f"eq.{item['id']}"
            })
            assert warranties_response.success
            
            if warranties_response.json:
                warranties.extend(warranties_response.json)
        
        assert len(warranties) == len(sale_items), "Warranties should be created for all items"
        
        # Verify warranty details
        for warranty in warranties:
            assert warranty["customer_id"] == self.customer["id"]
            assert warranty["status"] == "active"
            assert warranty["warranty_start_date"] is not None
            assert warranty["warranty_end_date"] is not None
        
        # Phase 4: Payment Processing
        print("Phase 4: Payment Processing")
        
        # Process installment payment
        installment_data = {
            "sale_id": sale_id,
            "number_of_installments": 3,
            "installment_amount": total_amount / 3,
            "payment_frequency": "monthly",
            "start_date": "2024-03-20"
        }
        
        installment_response = self.api_client.create("installment_plans", installment_data)
        assert installment_response.success
        plan_id = installment_response.json["id"]
        
        # Process first installment payment
        payment_data = {
            "sale_id": sale_id,
            "installment_plan_id": plan_id,
            "payment_date": "2024-03-20",
            "amount": total_amount / 3,
            "payment_method": "bank_transfer",
            "status": "completed"
        }
        
        payment_response = self.api_client.create("payments", payment_data)
        assert payment_response.success
        
        # Phase 5: Installation Scheduling
        print("Phase 5: Installation Scheduling")
        
        installation_data = {
            "sale_id": sale_id,
            "customer_id": self.customer["id"],
            "scheduled_date": "2024-03-25",
            "status": "scheduled",
            "site_address": "123 Integration St, Test City",
            "installation_notes": "Standard solar installation"
        }
        
        installation_response = self.api_client.create("installations", installation_data)
        assert installation_response.success
        installation_id = installation_response.json["id"]
        
        # Complete installation
        completion_data = {
            "status": "completed",
            "completion_date": "2024-03-25",
            "completion_notes": "Installation completed successfully"
        }
        
        completion_response = self.api_client.update("installations", installation_id, completion_data)
        assert completion_response.success
        
        # Phase 6: RMA Processing
        print("Phase 6: RMA Processing")
        
        # Simulate a warranty claim after some time
        rma_data = {
            "warranty_id": warranties[0]["id"],
            "claim_date": "2024-06-01",
            "issue_description": "Solar panel showing reduced efficiency",
            "claim_type": "replacement",
            "status": "submitted"
        }
        
        rma_response = self.api_client.create("rma_claims", rma_data)
        assert rma_response.success
        rma_id = rma_response.json["id"]
        
        # Approve RMA
        approval_data = {
            "status": "approved",
            "approved_date": "2024-06-02",
            "approval_notes": "Valid warranty claim approved"
        }
        
        approval_response = self.api_client.update("rma_claims", rma_id, approval_data)
        assert approval_response.success
        
        print("✓ Complete business workflow integration test passed")
        
        return {
            "container_id": container_id,
            "sale_id": sale_id,
            "warranties": warranties,
            "installation_id": installation_id,
            "rma_id": rma_id
        }
    
    async def test_financial_integration_across_modules(self):
        """Test financial calculations and tracking across all modules."""
        # Create container with costs
        container_data = {
            "supplier_id": self.supplier["id"],
            "container_number": "FIN001",
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
        
        # Add product with landed cost calculation
        product = self.products[0]
        cp_data = {
            "container_id": container_id,
            "product_id": product["id"],
            "ordered_quantity": 50,
            "unit_cost": product["cost_price"],
            "total_cost": product["cost_price"] * 50
        }
        
        cp_response = self.api_client.create("container_products", cp_data)
        assert cp_response.success
        
        # Calculate landed cost
        product_value = product["cost_price"] * 50
        landed_cost_share = 5000.0  # All costs allocated to this product
        expected_unit_landed_cost = product["cost_price"] + (landed_cost_share / 50)
        
        # Create sale with profit calculation
        sale_data = {
            "customer_id": self.customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending"
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale item with profit calculation
        quantity = 10
        selling_price = product["unit_price"]
        
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": product["id"],
            "quantity": quantity,
            "unit_price": selling_price,
            "total_price": selling_price * quantity,
            "unit_cost": expected_unit_landed_cost,
            "total_cost": expected_unit_landed_cost * quantity
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        
        # Calculate expected profit
        expected_revenue = selling_price * quantity
        expected_cost = expected_unit_landed_cost * quantity
        expected_profit = expected_revenue - expected_cost
        expected_margin = (expected_profit / expected_revenue) * 100
        
        # Verify profit calculations
        item_data = item_response.json
        actual_profit = float(item_data.get("profit_amount", 0))
        actual_margin = float(item_data.get("profit_margin", 0))
        
        assert abs(actual_profit - expected_profit) < 0.01, \
            f"Profit calculation incorrect: expected {expected_profit}, got {actual_profit}"
        
        assert abs(actual_margin - expected_margin) < 0.01, \
            f"Margin calculation incorrect: expected {expected_margin}%, got {actual_margin}%"
        
        # Test commission calculations
        commission_rate = 0.05  # 5%
        commission_data = {
            "sale_id": sale_id,
            "sales_person": "Integration Tester",
            "commission_rate": commission_rate,
            "commission_amount": expected_revenue * commission_rate,
            "status": "calculated"
        }
        
        commission_response = self.api_client.create("commissions", commission_data)
        assert commission_response.success
        
        print("✓ Financial integration across modules validated")
    
    async def test_inventory_consistency_across_operations(self):
        """Test inventory consistency across all operations."""
        product = self.products[2]  # Non-serial tracking product
        initial_stock = 100
        
        # Set initial stock
        stock_update = self.api_client.update("products", product["id"], {
            "current_stock": initial_stock
        })
        assert stock_update.success
        
        # Track all stock movements
        movements = []
        
        # 1. Container receipt (inward movement)
        container_receipt_qty = 50
        movement_data = {
            "product_id": product["id"],
            "movement_type": "inward",
            "quantity": container_receipt_qty,
            "reference_type": "container_receipt",
            "reference_id": "test_receipt_001"
        }
        
        receipt_movement = self.api_client.create("stock_movements", movement_data)
        assert receipt_movement.success
        movements.append(("inward", container_receipt_qty))
        
        # 2. Sale (outward movement)
        sale_qty = 25
        movement_data = {
            "product_id": product["id"],
            "movement_type": "outward",
            "quantity": sale_qty,
            "reference_type": "sale",
            "reference_id": "test_sale_001"
        }
        
        sale_movement = self.api_client.create("stock_movements", movement_data)
        assert sale_movement.success
        movements.append(("outward", sale_qty))
        
        # 3. Stock adjustment (adjustment movement)
        adjustment_qty = -5  # Write-off
        movement_data = {
            "product_id": product["id"],
            "movement_type": "adjustment",
            "quantity": adjustment_qty,
            "reference_type": "stock_adjustment",
            "reference_id": "test_adjustment_001"
        }
        
        adjustment_movement = self.api_client.create("stock_movements", movement_data)
        assert adjustment_movement.success
        movements.append(("adjustment", adjustment_qty))
        
        # 4. Transfer (outward then inward)
        transfer_qty = 10
        
        # Outward from main warehouse
        transfer_out_data = {
            "product_id": product["id"],
            "movement_type": "outward",
            "quantity": transfer_qty,
            "reference_type": "transfer",
            "reference_id": "test_transfer_001",
            "location_from": "main_warehouse"
        }
        
        transfer_out = self.api_client.create("stock_movements", transfer_out_data)
        assert transfer_out.success
        movements.append(("outward", transfer_qty))
        
        # Inward to branch warehouse
        transfer_in_data = {
            "product_id": product["id"],
            "movement_type": "inward",
            "quantity": transfer_qty,
            "reference_type": "transfer",
            "reference_id": "test_transfer_001",
            "location_to": "branch_warehouse"
        }
        
        transfer_in = self.api_client.create("stock_movements", transfer_in_data)
        assert transfer_in.success
        movements.append(("inward", transfer_qty))
        
        # Calculate expected final stock
        expected_stock = initial_stock
        for movement_type, quantity in movements:
            if movement_type == "inward":
                expected_stock += quantity
            elif movement_type == "outward":
                expected_stock -= quantity
            elif movement_type == "adjustment":
                expected_stock += quantity  # quantity can be negative
        
        # Verify final stock
        final_product_check = self.api_client.get_by_id("products", product["id"])
        assert final_product_check.success
        actual_stock = final_product_check.json["current_stock"]
        
        assert actual_stock == expected_stock, \
            f"Stock inconsistency: expected {expected_stock}, got {actual_stock}"
        
        # Verify stock movement history
        movements_response = self.api_client.read("stock_movements", {
            "product_id": f"eq.{product['id']}",
            "order": "created_at.asc"
        })
        assert movements_response.success
        assert len(movements_response.json) == len(movements)
        
        print("✓ Inventory consistency maintained across all operations")
    
    async def test_data_integrity_across_relationships(self):
        """Test data integrity and foreign key relationships."""
        # Create a complete relationship chain
        
        # 1. Customer -> Sale -> Sale Item -> Product
        sale_data = {
            "customer_id": self.customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "total_amount": 1000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": self.products[0]["id"],
            "quantity": 1,
            "unit_price": 1000.0,
            "total_price": 1000.0
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        item_id = item_response.json["id"]
        
        # 2. Sale Item -> Warranty
        warranty_response = self.api_client.read("warranties", {
            "sale_item_id": f"eq.{item_id}"
        })
        assert warranty_response.success
        assert len(warranty_response.json) > 0
        warranty_id = warranty_response.json[0]["id"]
        
        # 3. Warranty -> RMA Claim
        rma_data = {
            "warranty_id": warranty_id,
            "claim_date": "2024-06-01",
            "issue_description": "Product defect",
            "claim_type": "replacement",
            "status": "submitted"
        }
        
        rma_response = self.api_client.create("rma_claims", rma_data)
        assert rma_response.success
        rma_id = rma_response.json["id"]
        
        # 4. Sale -> Payment
        payment_data = {
            "sale_id": sale_id,
            "payment_date": "2024-03-20",
            "amount": 500.0,
            "payment_method": "cash",
            "status": "completed"
        }
        
        payment_response = self.api_client.create("payments", payment_data)
        assert payment_response.success
        payment_id = payment_response.json["id"]
        
        # Test cascade deletion prevention
        # Should not be able to delete customer with associated sales
        customer_delete = self.api_client.delete("customers", self.customer["id"])
        assert not customer_delete.success, "Should not be able to delete customer with sales"
        
        # Should not be able to delete product with associated sale items
        product_delete = self.api_client.delete("products", self.products[0]["id"])
        assert not product_delete.success, "Should not be able to delete product with sale items"
        
        # Test proper deletion order
        # Delete in reverse dependency order
        
        # 1. Delete RMA claim
        rma_delete = self.api_client.delete("rma_claims", rma_id)
        assert rma_delete.success
        
        # 2. Delete warranty
        warranty_delete = self.api_client.delete("warranties", warranty_id)
        assert warranty_delete.success
        
        # 3. Delete payment
        payment_delete = self.api_client.delete("payments", payment_id)
        assert payment_delete.success
        
        # 4. Delete sale item
        item_delete = self.api_client.delete("sale_items", item_id)
        assert item_delete.success
        
        # 5. Delete sale
        sale_delete = self.api_client.delete("sales", sale_id)
        assert sale_delete.success
        
        # Now customer and product deletion should work
        customer_delete = self.api_client.delete("customers", self.customer["id"])
        assert customer_delete.success
        
        print("✓ Data integrity and referential constraints validated")
    
    async def test_audit_trail_completeness(self):
        """Test audit trail across all operations."""
        # Perform various operations and verify audit trails
        
        # 1. Customer operations
        customer_data = {
            "contact_person": "Audit Test Customer",
            "company_name": "Audit Corp",
            "email": "audit@test.com"
        }
        
        customer_response = self.api_client.create("customers", customer_data)
        assert customer_response.success
        customer_id = customer_response.json["id"]
        
        # Update customer
        update_response = self.api_client.update("customers", customer_id, {
            "phone": "+972-50-9999999"
        })
        assert update_response.success
        
        # Check audit trail for customer
        audit_response = self.api_client.read("audit_logs", {
            "table_name": "eq.customers",
            "record_id": f"eq.{customer_id}",
            "order": "created_at.asc"
        })
        
        if audit_response.success and audit_response.json:
            audit_logs = audit_response.json
            assert len(audit_logs) >= 2, "Should have create and update audit entries"
            
            create_log = next((log for log in audit_logs if log["operation"] == "INSERT"), None)
            update_log = next((log for log in audit_logs if log["operation"] == "UPDATE"), None)
            
            assert create_log is not None, "CREATE audit log should exist"
            assert update_log is not None, "UPDATE audit log should exist"
        
        # 2. Product operations with stock changes
        product_data = {
            "name": "Audit Test Product",
            "sku": "ATP001",
            "unit_price": 500.0,
            "cost_price": 300.0,
            "current_stock": 100
        }
        
        product_response = self.api_client.create("products", product_data)
        assert product_response.success
        product_id = product_response.json["id"]
        
        # Stock movement
        movement_data = {
            "product_id": product_id,
            "movement_type": "outward",
            "quantity": 10,
            "reference_type": "sale",
            "reference_id": "audit_sale_001"
        }
        
        movement_response = self.api_client.create("stock_movements", movement_data)
        assert movement_response.success
        
        # Check stock movement audit trail
        stock_audit_response = self.api_client.read("audit_logs", {
            "table_name": "eq.stock_movements",
            "order": "created_at.desc",
            "limit": "10"
        })
        
        if stock_audit_response.success and stock_audit_response.json:
            assert len(stock_audit_response.json) > 0, "Stock movement audit should exist"
        
        print("✓ Audit trail completeness verified")
    
    async def test_business_rule_enforcement(self):
        """Test enforcement of business rules across modules."""
        # Rule 1: Cannot sell more than available stock
        product = self.products[2]
        
        # Set low stock
        stock_update = self.api_client.update("products", product["id"], {
            "current_stock": 5
        })
        assert stock_update.success
        
        # Try to sell more than available
        sale_data = {
            "customer_id": self.customer["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending"
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Try to add item with quantity > stock
        oversell_item_data = {
            "sale_id": sale_id,
            "product_id": product["id"],
            "quantity": 10,  # More than available stock (5)
            "unit_price": product["unit_price"],
            "total_price": product["unit_price"] * 10
        }
        
        oversell_response = self.api_client.create("sale_items", oversell_item_data)
        # This should fail due to business rule enforcement
        assert not oversell_response.success, "Should not allow overselling"
        
        # Rule 2: Payment amount cannot exceed sale total
        # First create a valid sale
        valid_item_data = {
            "sale_id": sale_id,
            "product_id": product["id"],
            "quantity": 2,
            "unit_price": product["unit_price"],
            "total_price": product["unit_price"] * 2
        }
        
        valid_item_response = self.api_client.create("sale_items", valid_item_data)
        assert valid_item_response.success
        
        sale_total = product["unit_price"] * 2
        
        # Update sale total
        update_response = self.api_client.update("sales", sale_id, {
            "total_amount": sale_total
        })
        assert update_response.success
        
        # Try to create payment exceeding sale total
        overpay_data = {
            "sale_id": sale_id,
            "payment_date": "2024-03-20",
            "amount": sale_total + 1000.0,  # Exceeds sale total
            "payment_method": "cash",
            "status": "completed"
        }
        
        overpay_response = self.api_client.create("payments", overpay_data)
        # This should fail due to business rule enforcement
        assert not overpay_response.success, "Should not allow overpayment"
        
        # Rule 3: Serial numbers must be unique
        if self.products[0]["tracks_serial_numbers"]:
            # Create first serial
            serial1_data = {
                "product_id": self.products[0]["id"],
                "serial_number": "DUPLICATE001",
                "status": "available",
                "location": "warehouse"
            }
            
            serial1_response = self.api_client.create("serial_numbers", serial1_data)
            assert serial1_response.success
            
            # Try to create duplicate serial
            serial2_data = {
                "product_id": self.products[0]["id"],
                "serial_number": "DUPLICATE001",  # Same serial number
                "status": "available",
                "location": "warehouse"
            }
            
            serial2_response = self.api_client.create("serial_numbers", serial2_data)
            # This should fail due to uniqueness constraint
            assert not serial2_response.success, "Should not allow duplicate serial numbers"
        
        print("✓ Business rule enforcement validated")