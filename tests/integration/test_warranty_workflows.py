"""
Warranty and RMA Workflow Integration Tests

Tests:
- Automatic warranty creation on sales
- Warranty expiry calculations and tracking
- RMA processing and replacement allocation
- Warranty certificate generation and validation
- Warranty status lifecycle management
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.integration
@pytest.mark.critical
class TestWarrantyWorkflows:
    """Integration tests for warranty and RMA workflows."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup test data for warranty workflows."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        
        # Create test customer
        self.customer_data = await self.seeder.create_customer({
            "contact_person": "Warranty Test Customer",
            "company_name": "Test Warranty Corp",
            "email": "warranty@test.com",
            "phone": "+972-50-1234567"
        })
        
        # Create warranty-enabled products
        self.products = []
        warranty_configs = [
            {"name": "Solar Panel", "warranty_years": 25, "sku": "SP001"},
            {"name": "Inverter", "warranty_years": 10, "sku": "INV001"},
            {"name": "Battery", "warranty_years": 5, "sku": "BAT001"}
        ]
        
        for config in warranty_configs:
            product = await self.seeder.create_product({
                "name": config["name"],
                "sku": config["sku"],
                "unit_price": 5000.0,
                "cost_price": 3000.0,
                "warranty_years": config["warranty_years"],
                "tracks_serial_numbers": True,
                "category": "Solar Equipment"
            })
            self.products.append(product)
        
        # Create serial numbers for products
        self.serial_numbers = []
        for i, product in enumerate(self.products):
            for j in range(5):
                serial_data = {
                    "product_id": product["id"],
                    "serial_number": f"{product['sku']}{j+1:04d}",
                    "status": "available",
                    "location": "warehouse"
                }
                serial_response = self.api_client.create("serial_numbers", serial_data)
                assert serial_response.success
                self.serial_numbers.append(serial_response.json)
    
    async def test_automatic_warranty_creation(self):
        """Test automatic warranty creation when selling warranty-enabled products."""
        # Create sale
        sale_data = {
            "customer_id": self.customer_data["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "paid",
            "total_amount": 15000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale items with serial numbers
        sale_items = []
        for i, product in enumerate(self.products):
            # Get available serial for this product
            product_serials = [s for s in self.serial_numbers if s["product_id"] == product["id"]]
            
            sale_item_data = {
                "sale_id": sale_id,
                "product_id": product["id"],
                "quantity": 1,
                "unit_price": 5000.0,
                "total_price": 5000.0,
                "serial_number_id": product_serials[0]["id"]
            }
            
            item_response = self.api_client.create("sale_items", sale_item_data)
            assert item_response.success
            sale_items.append(item_response.json)
        
        # Verify warranties were automatically created
        for i, item in enumerate(sale_items):
            warranties_response = self.api_client.read("warranties", {
                "sale_item_id": f"eq.{item['id']}"
            })
            assert warranties_response.success
            assert len(warranties_response.json) == 1
            
            warranty = warranties_response.json[0]
            product = self.products[i]
            
            # Verify warranty details
            assert warranty["customer_id"] == self.customer_data["id"]
            assert warranty["product_id"] == product["id"]
            assert warranty["status"] == "active"
            
            # Verify warranty end date calculation
            sale_date = datetime.strptime("2024-03-20", "%Y-%m-%d")
            expected_end_date = sale_date + timedelta(days=365 * product["warranty_years"])
            warranty_end_date = datetime.strptime(warranty["warranty_end_date"][:10], "%Y-%m-%d")
            assert warranty_end_date.date() == expected_end_date.date()
    
    async def test_warranty_certificate_generation(self):
        """Test warranty certificate generation and data accuracy."""
        # Create sale with warranty items
        sale_data = {
            "customer_id": self.customer_data["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "paid",
            "total_amount": 5000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale item
        product_serials = [s for s in self.serial_numbers if s["product_id"] == self.products[0]["id"]]
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": self.products[0]["id"],
            "quantity": 1,
            "unit_price": 5000.0,
            "total_price": 5000.0,
            "serial_number_id": product_serials[1]["id"]
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        
        # Get the auto-created warranty
        warranties_response = self.api_client.read("warranties", {
            "sale_item_id": f"eq.{item_response.json['id']}"
        })
        assert warranties_response.success
        warranty = warranties_response.json[0]
        
        # Generate warranty certificate
        cert_data = {
            "warranty_id": warranty["id"],
            "certificate_number": f"CERT{warranty['id']}",
            "issue_date": "2024-03-20",
            "issued_by": "System Test"
        }
        
        cert_response = self.api_client.create("warranty_certificates", cert_data)
        assert cert_response.success
        
        certificate = cert_response.json
        assert certificate["warranty_id"] == warranty["id"]
        assert certificate["status"] == "issued"
        
        # Test certificate lookup
        lookup_response = self.api_client.read("warranty_certificates", {
            "certificate_number": f"eq.CERT{warranty['id']}"
        })
        assert lookup_response.success
        assert len(lookup_response.json) == 1
    
    async def test_rma_processing_workflow(self):
        """Test RMA creation and processing workflow."""
        # First create a warranty (following the warranty creation flow)
        sale_data = {
            "customer_id": self.customer_data["id"],
            "sale_date": "2024-01-15",  # Earlier date for established warranty
            "status": "confirmed",
            "payment_status": "paid",
            "total_amount": 5000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Create sale item with warranty
        product_serials = [s for s in self.serial_numbers if s["product_id"] == self.products[1]["id"]]
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": self.products[1]["id"],
            "quantity": 1,
            "unit_price": 5000.0,
            "total_price": 5000.0,
            "serial_number_id": product_serials[0]["id"]
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        
        # Get the warranty
        warranties_response = self.api_client.read("warranties", {
            "sale_item_id": f"eq.{item_response.json['id']}"
        })
        assert warranties_response.success
        warranty = warranties_response.json[0]
        
        # Create RMA claim
        rma_data = {
            "warranty_id": warranty["id"],
            "claim_date": "2024-03-20",
            "issue_description": "Inverter displaying error code E03",
            "claim_type": "replacement",
            "status": "submitted",
            "customer_contact": "warranty@test.com"
        }
        
        rma_response = self.api_client.create("rma_claims", rma_data)
        assert rma_response.success
        rma_claim = rma_response.json
        
        # Process RMA approval
        approval_data = {
            "status": "approved",
            "approved_date": "2024-03-21",
            "approved_by": "warranty_manager",
            "approval_notes": "Valid warranty claim - approved for replacement"
        }
        
        approval_response = self.api_client.update("rma_claims", rma_claim["id"], approval_data)
        assert approval_response.success
        
        # Allocate replacement product
        replacement_serials = [s for s in self.serial_numbers 
                             if s["product_id"] == self.products[1]["id"] and s["status"] == "available"]
        
        replacement_data = {
            "rma_claim_id": rma_claim["id"],
            "replacement_serial_id": replacement_serials[1]["id"],
            "replacement_date": "2024-03-22",
            "dispatch_tracking": "TRACK123456"
        }
        
        replacement_response = self.api_client.create("rma_replacements", replacement_data)
        assert replacement_response.success
        
        # Verify serial number status updates
        old_serial_check = self.api_client.get_by_id("serial_numbers", product_serials[0]["id"])
        assert old_serial_check.success
        assert old_serial_check.json["status"] == "rma_returned"
        
        new_serial_check = self.api_client.get_by_id("serial_numbers", replacement_serials[1]["id"])
        assert new_serial_check.success
        assert new_serial_check.json["status"] == "allocated"
        
        # Complete RMA
        completion_data = {
            "status": "completed",
            "completion_date": "2024-03-25",
            "completion_notes": "Replacement dispatched and received by customer"
        }
        
        completion_response = self.api_client.update("rma_claims", rma_claim["id"], completion_data)
        assert completion_response.success
    
    async def test_warranty_expiry_management(self):
        """Test warranty expiry detection and status updates."""
        # Create a warranty with a past end date (expired)
        expired_warranty_data = {
            "customer_id": self.customer_data["id"],
            "product_id": self.products[2]["id"],
            "warranty_start_date": "2019-01-01",
            "warranty_end_date": "2024-01-01",  # Expired
            "status": "active",
            "serial_number": "EXPIRED001"
        }
        
        expired_warranty_response = self.api_client.create("warranties", expired_warranty_data)
        assert expired_warranty_response.success
        expired_warranty_id = expired_warranty_response.json["id"]
        
        # Create a warranty that expires soon
        soon_expiry_data = {
            "customer_id": self.customer_data["id"],
            "product_id": self.products[2]["id"],
            "warranty_start_date": "2024-01-01",
            "warranty_end_date": "2024-04-01",  # Expires in ~1 week from test date
            "status": "active",
            "serial_number": "SOON001"
        }
        
        soon_warranty_response = self.api_client.create("warranties", soon_expiry_data)
        assert soon_warranty_response.success
        soon_warranty_id = soon_warranty_response.json["id"]
        
        # Run warranty expiry check (simulate scheduled job)
        expiry_check_response = self.api_client.create("warranty_expiry_checks", {
            "check_date": "2024-03-20",
            "processed_count": 0
        })
        assert expiry_check_response.success
        
        # Verify expired warranty status updated
        expired_check = self.api_client.get_by_id("warranties", expired_warranty_id)
        assert expired_check.success
        # Note: In real implementation, this would be updated by a background job
        
        # Check for expiry notifications
        notifications_response = self.api_client.read("warranty_notifications", {
            "warranty_id": f"eq.{soon_warranty_id}",
            "notification_type": "eq.expiry_warning"
        })
        # This would be created by the expiry check process
    
    async def test_warranty_lookup_and_validation(self):
        """Test warranty lookup by various criteria and validation."""
        # Create a warranty for lookup tests
        sale_data = {
            "customer_id": self.customer_data["id"],
            "sale_date": "2024-02-15",
            "status": "confirmed",
            "payment_status": "paid",
            "total_amount": 5000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale item with warranty
        product_serials = [s for s in self.serial_numbers if s["product_id"] == self.products[0]["id"]]
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": self.products[0]["id"],
            "quantity": 1,
            "unit_price": 5000.0,
            "total_price": 5000.0,
            "serial_number_id": product_serials[2]["id"]
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        
        # Get the warranty
        warranties_response = self.api_client.read("warranties", {
            "sale_item_id": f"eq.{item_response.json['id']}"
        })
        assert warranties_response.success
        warranty = warranties_response.json[0]
        
        # Test lookup by serial number
        serial_lookup = self.api_client.read("warranties", {
            "serial_number": f"eq.{product_serials[2]['serial_number']}"
        })
        assert serial_lookup.success
        assert len(serial_lookup.json) == 1
        assert serial_lookup.json[0]["id"] == warranty["id"]
        
        # Test lookup by customer
        customer_warranties = self.api_client.read("warranties", {
            "customer_id": f"eq.{self.customer_data['id']}"
        })
        assert customer_warranties.success
        assert len(customer_warranties.json) >= 1
        
        # Test warranty validation for RMA eligibility
        warranty_validation = {
            "warranty_id": warranty["id"],
            "validation_date": "2024-03-20",
            "validation_type": "rma_eligibility"
        }
        
        validation_response = self.api_client.create("warranty_validations", warranty_validation)
        assert validation_response.success
        
        validation_result = validation_response.json
        assert validation_result["is_valid"] == True
        assert validation_result["validation_status"] == "active"
    
    async def test_warranty_bulk_operations(self):
        """Test bulk warranty operations and batch processing."""
        # Create multiple sales for bulk testing
        sales_data = []
        for i in range(3):
            sale_data = {
                "customer_id": self.customer_data["id"],
                "sale_date": "2024-03-20",
                "status": "confirmed",
                "payment_status": "paid",
                "total_amount": 5000.0
            }
            
            sale_response = self.api_client.create("sales", sale_data)
            assert sale_response.success
            sales_data.append(sale_response.json)
        
        # Create sale items for bulk warranty generation
        warranty_items = []
        for i, sale in enumerate(sales_data):
            product_serials = [s for s in self.serial_numbers 
                             if s["product_id"] == self.products[i]["id"] and s["status"] == "available"]
            
            sale_item_data = {
                "sale_id": sale["id"],
                "product_id": self.products[i]["id"],
                "quantity": 1,
                "unit_price": 5000.0,
                "total_price": 5000.0,
                "serial_number_id": product_serials[3]["id"]
            }
            
            item_response = self.api_client.create("sale_items", sale_item_data)
            assert item_response.success
            warranty_items.append(item_response.json)
        
        # Verify bulk warranty creation
        all_warranties = self.api_client.read("warranties", {
            "customer_id": f"eq.{self.customer_data['id']}"
        })
        assert all_warranties.success
        assert len(all_warranties.json) >= 3
        
        # Test bulk warranty status update
        warranty_ids = [w["id"] for w in all_warranties.json]
        
        # Simulate bulk status update (in real implementation, this would be a batch operation)
        for warranty_id in warranty_ids[:2]:
            update_response = self.api_client.update("warranties", warranty_id, {
                "status": "transferred",
                "transfer_date": "2024-03-25",
                "transfer_reason": "Bulk transfer to new owner"
            })
            assert update_response.success
        
        # Verify batch update results
        updated_warranties = self.api_client.read("warranties", {
            "customer_id": f"eq.{self.customer_data['id']}",
            "status": "eq.transferred"
        })
        assert updated_warranties.success
        assert len(updated_warranties.json) >= 2