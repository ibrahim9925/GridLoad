import pytest
import os
import asyncio
from typing import Generator, Dict, Any
from dotenv import load_dotenv
from tests.utils.database_manager import DatabaseManager
from tests.utils.test_config import TestConfig
from tests.fixtures.test_data_seeder import TestDataSeeder

# Load environment variables
load_dotenv()

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_config() -> TestConfig:
    """Provide test configuration."""
    return TestConfig()

@pytest.fixture(scope="session")
def db_manager(test_config: TestConfig) -> Generator[DatabaseManager, None, None]:
    """Provide database manager for the test session."""
    manager = DatabaseManager(test_config)
    manager.connect()
    yield manager
    manager.disconnect()

@pytest.fixture(scope="function")
def db_snapshot(db_manager: DatabaseManager) -> Generator[None, None, None]:
    """Create database snapshot before test and restore after."""
    snapshot_name = f"test_snapshot_{pytest.current_test_id}"
    db_manager.create_snapshot(snapshot_name)
    yield
    db_manager.restore_snapshot(snapshot_name)
    db_manager.delete_snapshot(snapshot_name)

@pytest.fixture(scope="function")
def test_data_seeder(db_manager: DatabaseManager) -> TestDataSeeder:
    """Provide test data seeder."""
    return TestDataSeeder(db_manager)

@pytest.fixture(scope="function")
def basic_test_data(test_data_seeder: TestDataSeeder, db_snapshot) -> Dict[str, Any]:
    """Seed basic test data for tests."""
    return test_data_seeder.seed_basic_data()

@pytest.fixture(scope="function")
def comprehensive_test_data(test_data_seeder: TestDataSeeder, db_snapshot) -> Dict[str, Any]:
    """Seed comprehensive test data for complex tests."""
    return test_data_seeder.seed_comprehensive_data()

# Pytest hooks
def pytest_configure(config):
    """Configure pytest with custom settings."""
    # Create reports directory
    os.makedirs("tests/reports", exist_ok=True)
    
    # Set current test ID for snapshots
    pytest.current_test_id = None

def pytest_runtest_setup(item):
    """Setup before each test."""
    pytest.current_test_id = item.nodeid.replace("::", "_").replace("/", "_")

@pytest.fixture
def api_client(test_config: TestConfig):
    """Provide API client for testing."""
    from tests.utils.api_client import APIClient
    return APIClient(test_config.supabase_url, test_config.supabase_anon_key)