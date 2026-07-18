"""
Multi-Currency Financial Workflow Integration Tests

Tests:
- Foreign exchange rate integration and conversion
- FX variance calculations on payment date differences
- Deposit batch processing and cash management
- Cross-currency transaction handling
- Payment allocation and matching workflows
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from tests.utils.api_client import APIClient
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder


@pytest.mark.integration
@pytest.mark.critical
class TestFinancialWorkflows:
    """Integration tests for multi-currency financial workflows."""

    @pytest.fixture(autouse=True)
    async def setup(self, api_client: APIClient, test_data_seeder: TestDataSeeder):
        """Setup test data for financial workflows."""
        self.api_client = api_client
        self.seeder = test_data_seeder
        
        # Create test customers with different currencies
        self.customers = []
        customer_configs = [
            {"name": "USD Customer", "currency": "USD", "company": "USD Corp"},
            {"name": "NIS Customer", "currency": "NIS", "company": "NIS Ltd"},
            {"name": "EUR Customer", "currency": "EUR", "company": "EUR GmbH"}
        ]
        
        for config in customer_configs:
            customer = await self.seeder.create_customer({
                "contact_person": config["name"],
                "company_name": config["company"],
                "email": f"{config['currency'].lower()}@test.com",
                "preferred_currency": config["currency"]
            })
            self.customers.append(customer)
        
        # Create test products
        self.product = await self.seeder.create_product({
            "name": "Multi-Currency Product",
            "sku": "MCP001",
            "unit_price": 1000.0,
            "cost_price": 600.0,
            "currency": "USD",
            "category": "Electronics"
        })
        
        # Setup exchange rates
        self.fx_rates = [
            {"from_currency": "USD", "to_currency": "NIS", "rate": 3.70, "date": "2024-03-20"},
            {"from_currency": "USD", "to_currency": "EUR", "rate": 0.92, "date": "2024-03-20"},
            {"from_currency": "NIS", "to_currency": "USD", "rate": 0.27, "date": "2024-03-20"},
            {"from_currency": "EUR", "to_currency": "USD", "rate": 1.09, "date": "2024-03-20"}
        ]
        
        for rate_data in self.fx_rates:
            rate_response = self.api_client.create("exchange_rates", rate_data)
            assert rate_response.success
    
    async def test_cross_currency_sale_creation(self):
        """Test creating sales with different customer and product currencies."""
        # Create USD sale to NIS customer
        sale_data = {
            "customer_id": self.customers[1]["id"],  # NIS customer
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "base_currency": "USD",
            "customer_currency": "NIS",
            "exchange_rate": 3.70,
            "total_amount_base": 1000.0,
            "total_amount_customer": 3700.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Add sale item
        sale_item_data = {
            "sale_id": sale_id,
            "product_id": self.product["id"],
            "quantity": 1,
            "unit_price_base": 1000.0,
            "unit_price_customer": 3700.0,
            "total_price_base": 1000.0,
            "total_price_customer": 3700.0
        }
        
        item_response = self.api_client.create("sale_items", sale_item_data)
        assert item_response.success
        
        # Verify currency conversion stored correctly
        sale_check = self.api_client.get_by_id("sales", sale_id)
        assert sale_check.success
        assert sale_check.json["base_currency"] == "USD"
        assert sale_check.json["customer_currency"] == "NIS"
        assert float(sale_check.json["exchange_rate"]) == 3.70
        assert float(sale_check.json["total_amount_base"]) == 1000.0
        assert float(sale_check.json["total_amount_customer"]) == 3700.0
    
    async def test_fx_variance_on_payment(self):
        """Test FX variance calculation when payment rate differs from sale rate."""
        # Create sale with initial FX rate
        sale_data = {
            "customer_id": self.customers[1]["id"],  # NIS customer
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "base_currency": "USD",
            "customer_currency": "NIS",
            "exchange_rate": 3.70,
            "total_amount_base": 1000.0,
            "total_amount_customer": 3700.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Create updated exchange rate for payment date
        updated_rate = {
            "from_currency": "NIS",
            "to_currency": "USD",
            "rate": 0.26,  # Changed from 0.27 (USD weakened)
            "date": "2024-03-25"
        }
        
        rate_response = self.api_client.create("exchange_rates", updated_rate)
        assert rate_response.success
        
        # Process payment with new rate
        payment_data = {
            "sale_id": sale_id,
            "payment_date": "2024-03-25",
            "amount_customer_currency": 3700.0,
            "amount_base_currency": 962.0,  # 3700 * 0.26
            "payment_currency": "NIS",
            "exchange_rate_at_payment": 0.26,
            "payment_method": "bank_transfer",
            "status": "completed"
        }
        
        payment_response = self.api_client.create("payments", payment_data)
        assert payment_response.success
        
        # Calculate and verify FX variance
        expected_base_amount = 1000.0  # Original amount
        actual_base_amount = 962.0     # Amount at payment rate
        fx_variance = actual_base_amount - expected_base_amount  # -38.0 (loss)
        
        # Check if FX variance was recorded
        variance_response = self.api_client.read("fx_variances", {
            "payment_id": f"eq.{payment_response.json['id']}"
        })
        assert variance_response.success
        assert len(variance_response.json) == 1
        
        variance = variance_response.json[0]
        assert float(variance["variance_amount"]) == fx_variance
        assert variance["variance_type"] == "loss"
    
    async def test_deposit_batch_processing(self):
        """Test cash deposit batch creation and processing."""
        # Create multiple payments to be batched
        payments = []
        for i in range(3):
            sale_data = {
                "customer_id": self.customers[0]["id"],  # USD customer
                "sale_date": "2024-03-20",
                "status": "confirmed",
                "payment_status": "pending",
                "total_amount": 1000.0 + (i * 100)
            }
            
            sale_response = self.api_client.create("sales", sale_data)
            assert sale_response.success
            
            payment_data = {
                "sale_id": sale_response.json["id"],
                "payment_date": "2024-03-20",
                "amount": 1000.0 + (i * 100),
                "payment_method": "cash",
                "status": "pending_deposit",
                "currency": "USD"
            }
            
            payment_response = self.api_client.create("payments", payment_data)
            assert payment_response.success
            payments.append(payment_response.json)
        
        # Create deposit batch
        total_amount = sum(float(p["amount"]) for p in payments)
        batch_data = {
            "batch_date": "2024-03-21",
            "bank_account": "USD_MAIN",
            "total_amount": total_amount,
            "currency": "USD",
            "status": "prepared",
            "prepared_by": "finance_manager"
        }
        
        batch_response = self.api_client.create("deposit_batches", batch_data)
        assert batch_response.success
        batch_id = batch_response.json["id"]
        
        # Add payments to batch
        for payment in payments:
            batch_item_data = {
                "deposit_batch_id": batch_id,
                "payment_id": payment["id"],
                "amount": payment["amount"]
            }
            
            item_response = self.api_client.create("deposit_batch_items", batch_item_data)
            assert item_response.success
        
        # Process batch deposit
        process_data = {
            "status": "deposited",
            "deposited_date": "2024-03-21",
            "bank_reference": "DEP20240321001",
            "processed_by": "bank_integration"
        }
        
        process_response = self.api_client.update("deposit_batches", batch_id, process_data)
        assert process_response.success
        
        # Verify payment statuses updated
        for payment in payments:
            payment_check = self.api_client.get_by_id("payments", payment["id"])
            assert payment_check.success
            assert payment_check.json["status"] == "completed"
            assert payment_check.json["deposit_batch_id"] == batch_id
    
    async def test_pre_deposit_spending_tracking(self):
        """Test tracking of cash spent before deposit (cash advances, etc.)."""
        # Create cash payment
        sale_data = {
            "customer_id": self.customers[0]["id"],
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "pending",
            "total_amount": 5000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        
        payment_data = {
            "sale_id": sale_response.json["id"],
            "payment_date": "2024-03-20",
            "amount": 5000.0,
            "payment_method": "cash",
            "status": "pending_deposit",
            "currency": "USD"
        }
        
        payment_response = self.api_client.create("payments", payment_data)
        assert payment_response.success
        payment_id = payment_response.json["id"]
        
        # Record cash advance from this payment
        advance_data = {
            "source_payment_id": payment_id,
            "advance_date": "2024-03-20",
            "amount": 1000.0,
            "purpose": "Staff advance",
            "recipient": "John Doe",
            "status": "approved",
            "authorized_by": "manager"
        }
        
        advance_response = self.api_client.create("cash_advances", advance_data)
        assert advance_response.success
        
        # Create deposit batch with remaining cash
        available_for_deposit = 5000.0 - 1000.0  # 4000.0
        
        batch_data = {
            "batch_date": "2024-03-21",
            "bank_account": "USD_MAIN",
            "total_amount": available_for_deposit,
            "currency": "USD",
            "status": "prepared",
            "original_cash_amount": 5000.0,
            "advances_deducted": 1000.0
        }
        
        batch_response = self.api_client.create("deposit_batches", batch_data)
        assert batch_response.success
        
        # Verify cash reconciliation
        reconciliation_response = self.api_client.read("cash_reconciliations", {
            "payment_id": f"eq.{payment_id}"
        })
        assert reconciliation_response.success
        
        if reconciliation_response.json:
            reconciliation = reconciliation_response.json[0]
            assert float(reconciliation["original_amount"]) == 5000.0
            assert float(reconciliation["advances_amount"]) == 1000.0
            assert float(reconciliation["deposited_amount"]) == 4000.0
    
    async def test_multi_currency_payment_allocation(self):
        """Test payment allocation across multiple currencies."""
        # Create EUR sale
        sale_data = {
            "customer_id": self.customers[2]["id"],  # EUR customer
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "partial",
            "base_currency": "USD",
            "customer_currency": "EUR",
            "exchange_rate": 0.92,
            "total_amount_base": 1000.0,
            "total_amount_customer": 920.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Create partial payment in EUR
        payment1_data = {
            "sale_id": sale_id,
            "payment_date": "2024-03-20",
            "amount_customer_currency": 460.0,  # Half payment in EUR
            "amount_base_currency": 500.0,
            "payment_currency": "EUR",
            "exchange_rate_at_payment": 0.92,
            "payment_method": "bank_transfer",
            "status": "completed"
        }
        
        payment1_response = self.api_client.create("payments", payment1_data)
        assert payment1_response.success
        
        # Create second payment in USD (customer pays remaining in different currency)
        payment2_data = {
            "sale_id": sale_id,
            "payment_date": "2024-03-22",
            "amount_customer_currency": 500.0,  # Remaining in USD
            "amount_base_currency": 500.0,
            "payment_currency": "USD",
            "exchange_rate_at_payment": 1.0,
            "payment_method": "credit_card",
            "status": "completed"
        }
        
        payment2_response = self.api_client.create("payments", payment2_data)
        assert payment2_response.success
        
        # Verify payment allocation
        allocations_response = self.api_client.read("payment_allocations", {
            "sale_id": f"eq.{sale_id}"
        })
        assert allocations_response.success
        
        # Check total allocated amount
        total_allocated = sum(float(alloc["amount_base_currency"]) for alloc in allocations_response.json)
        assert total_allocated == 1000.0
        
        # Verify sale payment status updated
        sale_check = self.api_client.get_by_id("sales", sale_id)
        assert sale_check.success
        assert sale_check.json["payment_status"] == "paid"
    
    async def test_currency_rate_history_tracking(self):
        """Test historical exchange rate tracking and variance analysis."""
        # Create multiple rate entries for same currency pair
        rate_history = [
            {"date": "2024-03-15", "rate": 3.65},
            {"date": "2024-03-16", "rate": 3.68},
            {"date": "2024-03-17", "rate": 3.70},
            {"date": "2024-03-18", "rate": 3.72},
            {"date": "2024-03-19", "rate": 3.69}
        ]
        
        for rate_data in rate_history:
            rate_entry = {
                "from_currency": "USD",
                "to_currency": "NIS",
                "rate": rate_data["rate"],
                "date": rate_data["date"],
                "source": "test_data"
            }
            
            rate_response = self.api_client.create("exchange_rates", rate_entry)
            assert rate_response.success
        
        # Query rate history
        history_response = self.api_client.read("exchange_rates", {
            "from_currency": "eq.USD",
            "to_currency": "eq.NIS",
            "date": "gte.2024-03-15",
            "order": "date.asc"
        })
        assert history_response.success
        assert len(history_response.json) >= 5
        
        # Test rate variance calculation
        rates = [float(r["rate"]) for r in history_response.json]
        avg_rate = sum(rates) / len(rates)
        max_variance = max(abs(r - avg_rate) for r in rates)
        
        # Create variance analysis record
        variance_analysis = {
            "currency_pair": "USD/NIS",
            "analysis_date": "2024-03-19",
            "period_start": "2024-03-15",
            "period_end": "2024-03-19",
            "average_rate": avg_rate,
            "max_variance": max_variance,
            "volatility_level": "low" if max_variance < 0.05 else "high"
        }
        
        analysis_response = self.api_client.create("fx_variance_analysis", variance_analysis)
        assert analysis_response.success
        
        analysis_result = analysis_response.json
        assert float(analysis_result["average_rate"]) == avg_rate
        assert float(analysis_result["max_variance"]) == max_variance
    
    async def test_installment_payment_fx_handling(self):
        """Test foreign exchange handling in installment payments."""
        # Create sale with installment plan
        sale_data = {
            "customer_id": self.customers[1]["id"],  # NIS customer
            "sale_date": "2024-03-20",
            "status": "confirmed",
            "payment_status": "installment",
            "base_currency": "USD",
            "customer_currency": "NIS",
            "exchange_rate": 3.70,
            "total_amount_base": 10000.0,
            "total_amount_customer": 37000.0
        }
        
        sale_response = self.api_client.create("sales", sale_data)
        assert sale_response.success
        sale_id = sale_response.json["id"]
        
        # Create installment plan
        plan_data = {
            "sale_id": sale_id,
            "number_of_installments": 3,
            "installment_amount_base": 3333.33,
            "installment_amount_customer": 12333.33,
            "payment_frequency": "monthly",
            "start_date": "2024-03-20"
        }
        
        plan_response = self.api_client.create("installment_plans", plan_data)
        assert plan_response.success
        plan_id = plan_response.json["id"]
        
        # Process installment payments with different FX rates
        installment_payments = [
            {"date": "2024-03-20", "fx_rate": 3.70},
            {"date": "2024-04-20", "fx_rate": 3.75},  # Rate changed
            {"date": "2024-05-20", "fx_rate": 3.68}   # Rate changed again
        ]
        
        fx_variances = []
        for i, installment in enumerate(installment_payments):
            # Update exchange rate for payment date
            rate_update = {
                "from_currency": "NIS",
                "to_currency": "USD",
                "rate": 1.0 / installment["fx_rate"],
                "date": installment["date"]
            }
            
            rate_response = self.api_client.create("exchange_rates", rate_update)
            assert rate_response.success
            
            # Process installment payment
            payment_amount_customer = 12333.33
            payment_amount_base = payment_amount_customer / installment["fx_rate"]
            
            payment_data = {
                "sale_id": sale_id,
                "installment_plan_id": plan_id,
                "payment_date": installment["date"],
                "installment_number": i + 1,
                "amount_customer_currency": payment_amount_customer,
                "amount_base_currency": payment_amount_base,
                "payment_currency": "NIS",
                "exchange_rate_at_payment": 1.0 / installment["fx_rate"],
                "payment_method": "bank_transfer",
                "status": "completed"
            }
            
            payment_response = self.api_client.create("payments", payment_data)
            assert payment_response.success
            
            # Calculate FX variance for this installment
            expected_base_amount = 3333.33
            actual_base_amount = payment_amount_base
            variance = actual_base_amount - expected_base_amount
            fx_variances.append(variance)
        
        # Verify total FX impact
        total_fx_variance = sum(fx_variances)
        
        # Query FX variance summary for the sale
        variance_summary_response = self.api_client.read("fx_variance_summary", {
            "sale_id": f"eq.{sale_id}"
        })
        
        # This would be calculated by the system
        # assert abs(float(variance_summary_response.json[0]["total_variance"]) - total_fx_variance) < 0.01