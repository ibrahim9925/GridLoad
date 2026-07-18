import psycopg2
import logging
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from tests.utils.test_config import TestConfig

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database manager for test isolation with snapshot/restore capability."""
    
    def __init__(self, config: TestConfig):
        self.config = config
        self.connection = None
        self.snapshots: Dict[str, Dict[str, Any]] = {}
        
    def connect(self) -> None:
        """Connect to the database."""
        try:
            # Extract connection details from Supabase URL
            # For testing, we'll use direct PostgreSQL connection
            self.connection = psycopg2.connect(
                host="aws-0-us-west-1.pooler.supabase.com",
                database="postgres",
                user="postgres.npryfxvfbacxetocnihq",
                password=os.getenv("SUPABASE_DB_PASSWORD", ""),
                port=6543
            )
            self.connection.autocommit = True
            logger.info("Connected to test database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self) -> None:
        """Disconnect from database."""
        if self.connection:
            self.connection.close()
            logger.info("Disconnected from database")
    
    @contextmanager
    def cursor(self):
        """Get database cursor context manager."""
        if not self.connection:
            raise ValueError("Database not connected")
        
        cursor = self.connection.cursor()
        try:
            yield cursor
        finally:
            cursor.close()
    
    def create_snapshot(self, snapshot_name: str) -> None:
        """Create a snapshot of current database state."""
        logger.info(f"Creating snapshot: {snapshot_name}")
        
        snapshot_data = {}
        
        # List of tables to snapshot
        tables = [
            'customers', 'products', 'suppliers', 'staff',
            'sales', 'sale_items', 'payments', 'payment_schedules',
            'bank_accounts', 'bank_ledger', 'deposit_batches',
            'containers', 'container_products', 'purchase_orders', 'purchase_order_items',
            'stock_movements', 'product_serial_numbers', 'warranties', 'warranty_claims',
            'currency_rates', 'stock_alerts', 'inventory_valuations'
        ]
        
        with self.cursor() as cursor:
            for table in tables:
                try:
                    cursor.execute(f"SELECT * FROM public.{table}")
                    rows = cursor.fetchall()
                    
                    # Get column names
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' 
                        AND table_schema = 'public'
                        ORDER BY ordinal_position
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    
                    snapshot_data[table] = {
                        'columns': columns,
                        'rows': rows
                    }
                    
                except psycopg2.Error as e:
                    logger.warning(f"Could not snapshot table {table}: {e}")
                    continue
        
        self.snapshots[snapshot_name] = snapshot_data
        logger.info(f"Snapshot {snapshot_name} created with {len(snapshot_data)} tables")
    
    def restore_snapshot(self, snapshot_name: str) -> None:
        """Restore database to snapshot state."""
        if snapshot_name not in self.snapshots:
            logger.warning(f"Snapshot {snapshot_name} not found")
            return
        
        logger.info(f"Restoring snapshot: {snapshot_name}")
        snapshot_data = self.snapshots[snapshot_name]
        
        with self.cursor() as cursor:
            # Disable triggers temporarily to avoid cascading issues
            cursor.execute("SET session_replication_role = replica;")
            
            try:
                # Clear all tables first (in reverse order to handle dependencies)
                for table in reversed(list(snapshot_data.keys())):
                    try:
                        cursor.execute(f"DELETE FROM public.{table}")
                    except psycopg2.Error as e:
                        logger.warning(f"Could not clear table {table}: {e}")
                
                # Restore data
                for table, data in snapshot_data.items():
                    if not data['rows']:
                        continue
                    
                    try:
                        columns_str = ', '.join(data['columns'])
                        placeholders = ', '.join(['%s'] * len(data['columns']))
                        
                        cursor.executemany(
                            f"INSERT INTO public.{table} ({columns_str}) VALUES ({placeholders})",
                            data['rows']
                        )
                        
                    except psycopg2.Error as e:
                        logger.warning(f"Could not restore table {table}: {e}")
                        
            finally:
                # Re-enable triggers
                cursor.execute("SET session_replication_role = DEFAULT;")
        
        logger.info(f"Snapshot {snapshot_name} restored")
    
    def delete_snapshot(self, snapshot_name: str) -> None:
        """Delete a snapshot."""
        if snapshot_name in self.snapshots:
            del self.snapshots[snapshot_name]
            logger.info(f"Snapshot {snapshot_name} deleted")
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[tuple]:
        """Execute a query and return results."""
        with self.cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchall()
    
    def execute_insert(self, table: str, data: Dict[str, Any]) -> str:
        """Execute an insert and return the new record ID."""
        columns = list(data.keys())
        values = list(data.values())
        
        columns_str = ', '.join(columns)
        placeholders = ', '.join(['%s'] * len(values))
        
        query = f"""
            INSERT INTO public.{table} ({columns_str}) 
            VALUES ({placeholders}) 
            RETURNING id
        """
        
        with self.cursor() as cursor:
            cursor.execute(query, values)
            return cursor.fetchone()[0]
    
    def get_table_count(self, table: str) -> int:
        """Get row count for a table."""
        with self.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM public.{table}")
            return cursor.fetchone()[0]
    
    def verify_foreign_key(self, table: str, column: str, value: Any) -> bool:
        """Verify if a foreign key value exists."""
        with self.cursor() as cursor:
            cursor.execute(f"SELECT 1 FROM public.{table} WHERE {column} = %s", (value,))
            return cursor.fetchone() is not None