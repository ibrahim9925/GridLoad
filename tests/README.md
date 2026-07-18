# ERP/CRM Testing Framework

Comprehensive end-to-end testing system for the solar equipment distribution ERP/CRM platform.

## Overview

This testing framework provides:

- **Database Isolation**: Snapshot/restore mechanism for test isolation
- **Multi-Currency Testing**: USD/NIS conversion validation
- **Role-Based Testing**: Permission validation for different user roles
- **API Testing**: REST endpoint validation using Supabase client
- **Performance Testing**: Load testing with concurrent users
- **E2E Testing**: Full UI workflow validation with Playwright
- **CI/CD Integration**: Automated testing on GitHub Actions

## Test Structure

```
tests/
├── conftest.py              # Pytest configuration and fixtures
├── requirements.txt         # Python dependencies
├── pytest.ini             # Pytest settings
├── utils/                  # Testing utilities
│   ├── database_manager.py # Database snapshot/restore
│   ├── test_config.py      # Test configuration
│   └── api_client.py       # Supabase API client
├── fixtures/               # Test data management
│   └── test_data_seeder.py # Test data seeding
├── integration/            # Integration tests
│   ├── test_crud_operations.py
│   └── test_sales_workflows.py
├── e2e/                   # End-to-end UI tests
├── performance/           # Performance/load tests
└── reports/              # Test reports and artifacts
```

## Test Categories

### Unit Tests (`@pytest.mark.unit`)
- Individual CRUD operations
- Data validation
- Business logic functions
- Currency conversions

### Integration Tests (`@pytest.mark.integration`)
- Cross-table workflows
- Foreign key relationships
- Multi-step business processes
- Payment and inventory workflows

### Critical Tests (`@pytest.mark.critical`)
- Essential business workflows
- Sales and payment processing
- Inventory management
- Financial operations

### Performance Tests (`@pytest.mark.performance`)
- Concurrent user simulation
- Database performance
- API response times
- Bulk operations

### E2E Tests (`@pytest.mark.e2e`)
- Complete UI workflows
- User journey testing
- Cross-browser compatibility

### Regression Tests (`@pytest.mark.regression`)
- Comprehensive test suite
- Schema change validation
- Feature regression detection

## Quick Start

### Prerequisites

```bash
# Install Python dependencies
pip install -r tests/requirements.txt

# Set up environment variables
cp .env.example .env.test
# Edit .env.test with your test database credentials
```

### Running Tests

```bash
# Run all tests
cd tests
python -m pytest

# Run specific test categories
python -m pytest -m "unit"
python -m pytest -m "integration"
python -m pytest -m "critical"

# Run specific test files
python -m pytest integration/test_sales_workflows.py
python -m pytest integration/test_crud_operations.py

# Run with coverage
python -m pytest --cov=src --cov-report=html

# Generate HTML report
python -m pytest --html=reports/report.html
```

### Test Data Management

The framework uses database snapshots for test isolation:

```python
# Tests automatically get fresh data via fixtures
def test_sales_workflow(basic_test_data, db_snapshot):
    # basic_test_data provides: customers, products, staff, etc.
    # db_snapshot ensures database is restored after test
    customer = basic_test_data['customers'][0]
    # ... test logic
```

Available test data fixtures:
- `basic_test_data`: Essential entities (customers, products, staff, bank accounts)
- `comprehensive_test_data`: Extended data (containers, sales, payments, warranties)

## Configuration

### Test Configuration (`tests/utils/test_config.py`)

```python
# Key configuration options
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"
TEST_TIMEOUT = 30  # seconds
MAX_CONCURRENT_USERS = 10
CLEANUP_TEST_DATA = True
```

### Database Connection

The framework connects directly to your Supabase PostgreSQL database:

```python
# Connection details in database_manager.py
HOST = "aws-0-us-west-1.pooler.supabase.com"
DATABASE = "postgres"
USER = "postgres.your-project-ref"
PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
PORT = 6543
```

## Key Test Scenarios

### Sales Workflows
- Full payment processing
- Partial payment handling
- Outstanding receivables
- Mixed payment methods (cash + transfer + check)
- Sale upgrades (6KW → 10KW system)

### Inventory Management
- Container receipt processing
- Serial number allocation
- Stock movement tracking
- Preventing overselling

### Financial Operations
- Multi-currency transactions
- FX gain/loss calculations
- Deposit batch processing
- Bank ledger reconciliation

### Warranty Management
- Automatic warranty creation
- Warranty expiry tracking
- RMA processing
- Replacement tracking

## API Testing

The framework includes a comprehensive API client:

```python
# Example API testing
def test_api_sales_creation(api_client):
    # Create sale via API
    response = api_client.create('sales', {
        'customer_id': customer_id,
        'total_amount': 5000.00,
        'currency': 'NIS'
    })
    
    assert response.success
    assert response.data[0]['total_amount'] == 5000.00
```

## Performance Testing

Load testing with concurrent users:

```python
@pytest.mark.performance
def test_concurrent_sales_creation():
    # Simulate 10 concurrent users creating sales
    # Measure response times and throughput
    # Verify data consistency
```

## CI/CD Integration

### GitHub Actions Pipeline

The framework includes a comprehensive CI/CD pipeline:

```yaml
# Runs on every push/PR
- Unit Tests (15 min)
- Integration Tests (30 min) 
- Critical Workflow Tests (20 min)
- Performance Tests (nightly)
- E2E Tests (main branch only)
- Regression Suite (nightly)
```

### Test Reports

- **JUnit XML**: For CI integration
- **HTML Reports**: Human-readable results
- **Allure Reports**: Advanced reporting (coming in Phase 4)
- **Slack Notifications**: Real-time alerts

## Database Schema Testing

The framework validates:

- **RLS Policies**: Proper access control
- **Foreign Keys**: Referential integrity
- **Triggers**: Business logic automation
- **Functions**: Stored procedure correctness
- **Constraints**: Data validation rules

## Extending the Framework

### Adding New Tests

```python
# Create new test file
# tests/integration/test_new_feature.py

import pytest

class TestNewFeature:
    
    @pytest.mark.integration
    def test_new_workflow(self, comprehensive_test_data, db_manager):
        # Your test logic here
        pass
```

### Adding Custom Fixtures

```python
# In conftest.py or separate fixture file
@pytest.fixture
def custom_test_data(db_manager):
    # Create specific test data
    return data
```

### Performance Benchmarks

```python
@pytest.mark.performance
def test_bulk_operations_performance(db_manager):
    # Measure execution time
    start_time = time.time()
    
    # Perform bulk operation
    for i in range(1000):
        # ... operation
        pass
    
    duration = time.time() - start_time
    assert duration < 30  # Must complete within 30 seconds
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `SUPABASE_DB_PASSWORD` in `.env.test`
   - Check network connectivity to Supabase

2. **Test Data Conflicts**
   - Ensure `db_snapshot` fixture is used
   - Check for hardcoded IDs in tests

3. **Permission Errors**
   - Verify RLS policies allow test operations
   - Check authentication in API tests

4. **Timeout Issues**
   - Increase `TEST_TIMEOUT` in configuration
   - Optimize slow database queries

### Debug Mode

```bash
# Run tests with verbose output
python -m pytest -v -s

# Run single test with debugging
python -m pytest -v -s integration/test_sales_workflows.py::TestSalesWorkflows::test_full_payment_sales_workflow

# Show database queries
python -m pytest --log-cli-level=DEBUG
```

## Roadmap

### Phase 1: Foundation ✅
- Pytest framework with fixtures
- Database snapshot/restore
- Basic CRUD tests
- CI/CD pipeline

### Phase 2: Core Workflows 🔄
- Sales workflow tests
- Inventory workflow tests
- Financial workflow tests
- Warranty/RMA tests

### Phase 3: Advanced Testing 📋
- Concurrency tests
- Performance/load testing
- Playwright E2E tests
- Reporting validation

### Phase 4: Production Readiness 📋
- Comprehensive regression suite
- Test data automation
- Advanced reporting (Allure)
- Monitoring integration

## Contributing

1. Follow the existing test patterns
2. Use appropriate test markers (`@pytest.mark.unit`, etc.)
3. Include both positive and negative test cases
4. Add docstrings to test methods
5. Update this README for new features

## Support

For issues and questions:
1. Check existing test logs and reports
2. Review database connection and permissions
3. Consult the troubleshooting section
4. Check CI/CD pipeline status