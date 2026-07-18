import os
from typing import Optional
from pydantic import BaseSettings, Field

class TestConfig(BaseSettings):
    """Test configuration management."""
    
    # Supabase Configuration
    supabase_url: str = Field(
        default="https://npryfxvfbacxetocnihq.supabase.co",
        description="Supabase project URL"
    )
    supabase_anon_key: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcnlmeHZmYmFjeGV0b2NuaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzYwMzQsImV4cCI6MjA2MjcxMjAzNH0.HC6A0KAMyn8KOx0ku-cz3GV5mUGL5hLsTchxvnLcUsM",
        description="Supabase anonymous key"
    )
    
    # Database Configuration
    database_url: Optional[str] = Field(
        default=None,
        description="Direct database URL for testing"
    )
    
    # Test Configuration
    test_database_name: str = Field(
        default="test_db",
        description="Test database name"
    )
    
    # Performance Testing
    test_timeout: int = Field(
        default=30,
        description="Default test timeout in seconds"
    )
    
    # Concurrency Testing
    max_concurrent_users: int = Field(
        default=10,
        description="Maximum concurrent users for load testing"
    )
    
    # Test Data
    cleanup_test_data: bool = Field(
        default=True,
        description="Whether to cleanup test data after tests"
    )
    
    # Reporting
    enable_allure_reports: bool = Field(
        default=True,
        description="Enable Allure reporting"
    )
    
    slack_webhook_url: Optional[str] = Field(
        default=None,
        description="Slack webhook URL for notifications"
    )
    
    class Config:
        env_file = ".env.test"
        env_file_encoding = "utf-8"