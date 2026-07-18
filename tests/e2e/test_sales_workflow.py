"""
End-to-End Sales Workflow UI Tests using Playwright

Tests:
- Complete sales process from product selection to payment
- User interface workflows and interactions
- Multi-browser compatibility testing
- Form validation and error handling
- Real-world user scenarios and edge cases
"""

import pytest
import asyncio
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from typing import Dict, Any, List
from tests.utils.test_config import TestConfig


@pytest.mark.e2e
@pytest.mark.slow
class TestSalesWorkflowE2E:
    """End-to-end UI tests for sales workflows using Playwright."""

    @pytest.fixture(scope="class")
    async def browser_setup(self):
        """Setup browser for E2E testing."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080}
        )
        
        yield
        
        await self.context.close()
        await self.browser.close()
        await self.playwright.stop()
    
    @pytest.fixture
    async def page(self, browser_setup) -> Page:
        """Create a new page for each test."""
        page = await self.context.new_page()
        yield page
        await page.close()
    
    async def login_as_admin(self, page: Page):
        """Helper method to login as admin user."""
        # Navigate to login page
        await page.goto("http://localhost:5173/login")
        
        # Wait for login form
        await page.wait_for_selector('[data-testid="login-form"]', timeout=10000)
        
        # Fill login credentials (adjust based on your app's test credentials)
        await page.fill('[data-testid="email-input"]', "admin@test.com")
        await page.fill('[data-testid="password-input"]', "admin123")
        
        # Click login button
        await page.click('[data-testid="login-button"]')
        
        # Wait for dashboard to load
        await page.wait_for_selector('[data-testid="admin-dashboard"]', timeout=15000)
        
        # Verify successful login
        assert await page.is_visible('[data-testid="admin-dashboard"]')
    
    async def navigate_to_sales(self, page: Page):
        """Helper method to navigate to sales section."""
        # Click on Sales navigation
        await page.click('[data-testid="nav-sales"]')
        
        # Wait for sales page to load
        await page.wait_for_selector('[data-testid="sales-page"]', timeout=10000)
        
        # Verify we're on the sales page
        assert await page.is_visible('[data-testid="sales-page"]')
    
    @pytest.mark.asyncio
    async def test_complete_sales_workflow(self, page: Page):
        """Test complete sales workflow from start to finish."""
        # Login as admin
        await self.login_as_admin(page)
        
        # Navigate to sales
        await self.navigate_to_sales(page)
        
        # Click "New Sale" button
        await page.click('[data-testid="new-sale-button"]')
        
        # Wait for sales dialog to open
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Step 1: Select Customer
        await page.click('[data-testid="customer-select"]')
        await page.wait_for_selector('[data-testid="customer-option"]', timeout=5000)
        
        # Select first customer from dropdown
        customer_options = await page.query_selector_all('[data-testid="customer-option"]')
        if customer_options:
            await customer_options[0].click()
        else:
            # Create new customer if none exist
            await page.click('[data-testid="new-customer-button"]')
            await page.fill('[data-testid="customer-name-input"]', "Test E2E Customer")
            await page.fill('[data-testid="customer-email-input"]', "e2e@test.com")
            await page.click('[data-testid="save-customer-button"]')
        
        # Step 2: Add Products
        await page.click('[data-testid="add-product-button"]')
        
        # Select product
        await page.click('[data-testid="product-select"]')
        await page.wait_for_selector('[data-testid="product-option"]', timeout=5000)
        
        product_options = await page.query_selector_all('[data-testid="product-option"]')
        if product_options:
            await product_options[0].click()
        
        # Set quantity
        await page.fill('[data-testid="quantity-input"]', "2")
        
        # Verify unit price is populated
        unit_price_value = await page.input_value('[data-testid="unit-price-input"]')
        assert unit_price_value != "", "Unit price should be auto-populated"
        
        # Add product to sale
        await page.click('[data-testid="add-product-to-sale-button"]')
        
        # Verify product appears in sale items
        await page.wait_for_selector('[data-testid="sale-item-row"]', timeout=5000)
        sale_items = await page.query_selector_all('[data-testid="sale-item-row"]')
        assert len(sale_items) >= 1, "Sale item should be added"
        
        # Step 3: Configure Payment Terms
        await page.click('[data-testid="payment-terms-section"]')
        
        # Select payment method
        await page.click('[data-testid="payment-method-select"]')
        await page.click('[data-testid="payment-method-cash"]')
        
        # Verify total amount is calculated
        total_amount = await page.text_content('[data-testid="total-amount"]')
        assert total_amount != "0", "Total amount should be calculated"
        
        # Step 4: Save Sale
        await page.click('[data-testid="save-sale-button"]')
        
        # Wait for success message
        await page.wait_for_selector('[data-testid="success-toast"]', timeout=10000)
        
        # Verify sale appears in sales list
        await page.wait_for_selector('[data-testid="sales-table"]', timeout=5000)
        await page.wait_for_selector('[data-testid="sale-row"]', timeout=5000)
        
        # Get the newly created sale
        sale_rows = await page.query_selector_all('[data-testid="sale-row"]')
        assert len(sale_rows) >= 1, "New sale should appear in the list"
    
    @pytest.mark.asyncio
    async def test_sales_form_validation(self, page: Page):
        """Test form validation in sales creation."""
        await self.login_as_admin(page)
        await self.navigate_to_sales(page)
        
        # Open new sale dialog
        await page.click('[data-testid="new-sale-button"]')
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Try to save without required fields
        await page.click('[data-testid="save-sale-button"]')
        
        # Verify validation errors appear
        await page.wait_for_selector('[data-testid="validation-error"]', timeout=3000)
        
        error_messages = await page.query_selector_all('[data-testid="validation-error"]')
        assert len(error_messages) > 0, "Validation errors should be displayed"
        
        # Check specific error messages
        customer_error = await page.is_visible('[data-testid="customer-required-error"]')
        assert customer_error, "Customer required error should be shown"
        
        # Test invalid quantity input
        await page.click('[data-testid="add-product-button"]')
        await page.fill('[data-testid="quantity-input"]', "-1")
        
        quantity_error = await page.is_visible('[data-testid="quantity-invalid-error"]')
        assert quantity_error, "Invalid quantity error should be shown"
        
        # Test invalid price input
        await page.fill('[data-testid="unit-price-input"]', "invalid")
        
        price_error = await page.is_visible('[data-testid="price-invalid-error"]')
        assert price_error, "Invalid price error should be shown"
    
    @pytest.mark.asyncio
    async def test_serial_number_allocation_ui(self, page: Page):
        """Test serial number allocation in UI workflow."""
        await self.login_as_admin(page)
        await self.navigate_to_sales(page)
        
        # Create new sale
        await page.click('[data-testid="new-sale-button"]')
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Select customer
        await page.click('[data-testid="customer-select"]')
        await page.wait_for_selector('[data-testid="customer-option"]', timeout=5000)
        customer_options = await page.query_selector_all('[data-testid="customer-option"]')
        if customer_options:
            await customer_options[0].click()
        
        # Add product that tracks serial numbers
        await page.click('[data-testid="add-product-button"]')
        await page.click('[data-testid="product-select"]')
        
        # Look for product with serial tracking
        await page.fill('[data-testid="product-search"]', "serial")
        await page.wait_for_timeout(1000)  # Allow search to process
        
        serial_products = await page.query_selector_all('[data-testid="product-option-serial"]')
        if serial_products:
            await serial_products[0].click()
            
            # Set quantity
            await page.fill('[data-testid="quantity-input"]', "1")
            
            # Serial allocation button should appear
            await page.wait_for_selector('[data-testid="allocate-serials-button"]', timeout=5000)
            await page.click('[data-testid="allocate-serials-button"]')
            
            # Serial selection dialog should open
            await page.wait_for_selector('[data-testid="serial-selection-dialog"]', timeout=5000)
            
            # Select available serial numbers
            serial_checkboxes = await page.query_selector_all('[data-testid="serial-checkbox"]')
            if serial_checkboxes:
                await serial_checkboxes[0].click()
            
            # Confirm serial selection
            await page.click('[data-testid="confirm-serial-selection"]')
            
            # Verify serial is allocated
            allocated_serials = await page.query_selector_all('[data-testid="allocated-serial"]')
            assert len(allocated_serials) >= 1, "Serial number should be allocated"
    
    @pytest.mark.asyncio
    async def test_payment_processing_workflow(self, page: Page):
        """Test payment processing workflow in UI."""
        await self.login_as_admin(page)
        await self.navigate_to_sales(page)
        
        # Create a sale first (abbreviated version)
        await page.click('[data-testid="new-sale-button"]')
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Quick sale creation
        await page.click('[data-testid="customer-select"]')
        customer_options = await page.query_selector_all('[data-testid="customer-option"]')
        if customer_options:
            await customer_options[0].click()
        
        await page.click('[data-testid="add-product-button"]')
        await page.click('[data-testid="product-select"]')
        product_options = await page.query_selector_all('[data-testid="product-option"]')
        if product_options:
            await product_options[0].click()
        
        await page.fill('[data-testid="quantity-input"]', "1")
        await page.click('[data-testid="add-product-to-sale-button"]')
        await page.click('[data-testid="save-sale-button"]')
        
        # Wait for sale to be created
        await page.wait_for_selector('[data-testid="success-toast"]', timeout=10000)
        
        # Navigate to the created sale
        await page.click('[data-testid="sale-row"]:first-child')
        await page.wait_for_selector('[data-testid="sale-details"]', timeout=5000)
        
        # Process payment
        await page.click('[data-testid="add-payment-button"]')
        await page.wait_for_selector('[data-testid="payment-dialog"]', timeout=5000)
        
        # Enter payment details
        total_amount = await page.text_content('[data-testid="sale-total-amount"]')
        await page.fill('[data-testid="payment-amount-input"]', total_amount.replace('$', '').replace(',', ''))
        
        # Select payment method
        await page.click('[data-testid="payment-method-select"]')
        await page.click('[data-testid="payment-method-cash"]')
        
        # Set payment date
        await page.fill('[data-testid="payment-date-input"]', "2024-03-20")
        
        # Save payment
        await page.click('[data-testid="save-payment-button"]')
        
        # Verify payment success
        await page.wait_for_selector('[data-testid="payment-success-toast"]', timeout=10000)
        
        # Verify payment appears in payment list
        await page.wait_for_selector('[data-testid="payment-row"]', timeout=5000)
        payment_rows = await page.query_selector_all('[data-testid="payment-row"]')
        assert len(payment_rows) >= 1, "Payment should appear in the list"
        
        # Verify sale status updated
        sale_status = await page.text_content('[data-testid="sale-payment-status"]')
        assert sale_status in ["Paid", "Partial"], "Sale payment status should be updated"
    
    @pytest.mark.asyncio
    async def test_installment_payment_workflow(self, page: Page):
        """Test installment payment setup and processing."""
        await self.login_as_admin(page)
        await self.navigate_to_sales(page)
        
        # Create sale with installment plan
        await page.click('[data-testid="new-sale-button"]')
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Quick sale setup
        await page.click('[data-testid="customer-select"]')
        customer_options = await page.query_selector_all('[data-testid="customer-option"]')
        if customer_options:
            await customer_options[0].click()
        
        await page.click('[data-testid="add-product-button"]')
        await page.click('[data-testid="product-select"]')
        product_options = await page.query_selector_all('[data-testid="product-option"]')
        if product_options:
            await product_options[0].click()
        
        await page.fill('[data-testid="quantity-input"]', "5")  # Higher value for installments
        await page.click('[data-testid="add-product-to-sale-button"]')
        
        # Configure installment payment
        await page.click('[data-testid="payment-terms-installment"]')
        await page.wait_for_selector('[data-testid="installment-config"]', timeout=5000)
        
        # Set installment details
        await page.fill('[data-testid="installment-count"]', "3")
        await page.click('[data-testid="installment-frequency-monthly"]')
        
        # Verify installment calculation
        await page.wait_for_selector('[data-testid="installment-amount"]', timeout=3000)
        installment_amount = await page.text_content('[data-testid="installment-amount"]')
        assert installment_amount != "0", "Installment amount should be calculated"
        
        # Save sale with installments
        await page.click('[data-testid="save-sale-button"]')
        await page.wait_for_selector('[data-testid="success-toast"]', timeout=10000)
        
        # Navigate to installments section
        await page.click('[data-testid="nav-installments"]')
        await page.wait_for_selector('[data-testid="installments-page"]', timeout=5000)
        
        # Verify installment plan appears
        await page.wait_for_selector('[data-testid="installment-plan-row"]', timeout=5000)
        installment_plans = await page.query_selector_all('[data-testid="installment-plan-row"]')
        assert len(installment_plans) >= 1, "Installment plan should be created"
    
    @pytest.mark.asyncio
    async def test_multi_browser_compatibility(self):
        """Test sales workflow across different browsers."""
        browsers = [
            self.playwright.chromium,
            self.playwright.firefox,
            self.playwright.webkit
        ]
        
        for browser_type in browsers:
            browser = await browser_type.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080}
            )
            page = await context.new_page()
            
            try:
                # Test basic sales workflow
                await self.login_as_admin(page)
                await self.navigate_to_sales(page)
                
                # Verify sales page loads correctly
                assert await page.is_visible('[data-testid="sales-page"]')
                
                # Test new sale dialog opens
                await page.click('[data-testid="new-sale-button"]')
                await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
                
                # Verify dialog elements are present
                assert await page.is_visible('[data-testid="customer-select"]')
                assert await page.is_visible('[data-testid="add-product-button"]')
                assert await page.is_visible('[data-testid="save-sale-button"]')
                
                print(f"✓ Sales workflow compatible with {browser_type.name}")
                
            except Exception as e:
                print(f"✗ Sales workflow failed on {browser_type.name}: {str(e)}")
                raise
            
            finally:
                await page.close()
                await context.close()
                await browser.close()
    
    @pytest.mark.asyncio
    async def test_responsive_design(self, page: Page):
        """Test sales workflow on different screen sizes."""
        screen_sizes = [
            {"width": 1920, "height": 1080, "name": "Desktop"},
            {"width": 1024, "height": 768, "name": "Tablet"},
            {"width": 375, "height": 667, "name": "Mobile"}
        ]
        
        for size in screen_sizes:
            await page.set_viewport_size({
                "width": size["width"],
                "height": size["height"]
            })
            
            await self.login_as_admin(page)
            await self.navigate_to_sales(page)
            
            # Test navigation visibility
            if size["width"] >= 1024:
                # Desktop/Tablet - full navigation should be visible
                assert await page.is_visible('[data-testid="nav-sales"]')
            else:
                # Mobile - hamburger menu should be present
                assert await page.is_visible('[data-testid="mobile-menu-toggle"]')
            
            # Test sales table responsiveness
            assert await page.is_visible('[data-testid="sales-table"]')
            
            # Test new sale button accessibility
            assert await page.is_visible('[data-testid="new-sale-button"]')
            
            print(f"✓ Sales interface responsive on {size['name']} ({size['width']}x{size['height']})")
    
    @pytest.mark.asyncio
    async def test_error_handling_ui(self, page: Page):
        """Test error handling and recovery in UI workflows."""
        await self.login_as_admin(page)
        await self.navigate_to_sales(page)
        
        # Test network error simulation
        await page.route("**/api/sales", lambda route: route.abort())
        
        # Try to create sale (should fail)
        await page.click('[data-testid="new-sale-button"]')
        await page.wait_for_selector('[data-testid="sales-dialog"]', timeout=5000)
        
        # Fill form and try to save
        await page.click('[data-testid="customer-select"]')
        customer_options = await page.query_selector_all('[data-testid="customer-option"]')
        if customer_options:
            await customer_options[0].click()
        
        await page.click('[data-testid="save-sale-button"]')
        
        # Verify error message appears
        await page.wait_for_selector('[data-testid="error-toast"]', timeout=10000)
        error_message = await page.text_content('[data-testid="error-toast"]')
        assert "error" in error_message.lower(), "Error message should be displayed"
        
        # Test retry functionality
        await page.unroute("**/api/sales")  # Remove network block
        
        # Try saving again
        await page.click('[data-testid="save-sale-button"]')
        
        # Should succeed now
        await page.wait_for_selector('[data-testid="success-toast"]', timeout=10000)
        
        print("✓ Error handling and recovery working correctly")