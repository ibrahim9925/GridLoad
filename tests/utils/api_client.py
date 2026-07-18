import requests
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

@dataclass
class APIResponse:
    """API response wrapper."""
    status_code: int
    data: Any
    headers: Dict[str, str]
    success: bool
    
    @property
    def json(self) -> Any:
        """Get JSON data."""
        return self.data

class APIClient:
    """API client for testing Supabase REST endpoints."""
    
    def __init__(self, base_url: str, api_key: str, auth_token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.auth_token = auth_token
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'apikey': api_key,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        })
        
        if auth_token:
            self.session.headers['Authorization'] = f'Bearer {auth_token}'
    
    def set_auth_token(self, token: str) -> None:
        """Set authentication token."""
        self.auth_token = token
        self.session.headers['Authorization'] = f'Bearer {token}'
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> APIResponse:
        """Make HTTP request and return wrapped response."""
        url = f"{self.base_url}/rest/v1/{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            # Parse JSON response if possible
            try:
                data = response.json()
            except (json.JSONDecodeError, ValueError):
                data = response.text
            
            return APIResponse(
                status_code=response.status_code,
                data=data,
                headers=dict(response.headers),
                success=200 <= response.status_code < 300
            )
            
        except requests.RequestException as e:
            return APIResponse(
                status_code=0,
                data=str(e),
                headers={},
                success=False
            )
    
    # CRUD Operations
    def create(self, table: str, data: Dict[str, Any]) -> APIResponse:
        """Create a new record."""
        return self._make_request('POST', table, json=data)
    
    def read(self, table: str, filters: Optional[Dict[str, Any]] = None, 
             select: str = '*', limit: Optional[int] = None) -> APIResponse:
        """Read records from table."""
        params = {'select': select}
        
        if limit:
            params['limit'] = limit
        
        if filters:
            for key, value in filters.items():
                params[f'{key}'] = f'eq.{value}'
        
        return self._make_request('GET', table, params=params)
    
    def update(self, table: str, data: Dict[str, Any], 
               filters: Dict[str, Any]) -> APIResponse:
        """Update records."""
        params = {}
        for key, value in filters.items():
            params[f'{key}'] = f'eq.{value}'
        
        return self._make_request('PATCH', table, json=data, params=params)
    
    def delete(self, table: str, filters: Dict[str, Any]) -> APIResponse:
        """Delete records."""
        params = {}
        for key, value in filters.items():
            params[f'{key}'] = f'eq.{value}'
        
        return self._make_request('DELETE', table, params=params)
    
    def get_by_id(self, table: str, record_id: str, select: str = '*') -> APIResponse:
        """Get a record by ID."""
        return self.read(table, {'id': record_id}, select=select)
    
    def count(self, table: str, filters: Optional[Dict[str, Any]] = None) -> APIResponse:
        """Get count of records."""
        params = {'select': 'count'}
        
        if filters:
            for key, value in filters.items():
                params[f'{key}'] = f'eq.{value}'
        
        return self._make_request('GET', table, params=params)
    
    # Authentication helpers
    def login(self, email: str, password: str) -> APIResponse:
        """Login user."""
        auth_url = f"{self.base_url}/auth/v1/token?grant_type=password"
        
        response = requests.post(auth_url, json={
            'email': email,
            'password': password
        }, headers={
            'apikey': self.api_key,
            'Content-Type': 'application/json'
        })
        
        if response.status_code == 200:
            auth_data = response.json()
            self.set_auth_token(auth_data['access_token'])
        
        return APIResponse(
            status_code=response.status_code,
            data=response.json() if response.status_code == 200 else response.text,
            headers=dict(response.headers),
            success=response.status_code == 200
        )
    
    # Business logic helpers
    def create_sale_with_items(self, sale_data: Dict[str, Any], 
                               items: List[Dict[str, Any]]) -> Dict[str, APIResponse]:
        """Create a sale with items in a transaction-like manner."""
        responses = {}
        
        # Create sale header
        sale_response = self.create('sales', sale_data)
        responses['sale'] = sale_response
        
        if not sale_response.success:
            return responses
        
        sale_id = sale_response.data[0]['id']
        
        # Create sale items
        item_responses = []
        for item in items:
            item['sale_id'] = sale_id
            item_response = self.create('sale_items', item)
            item_responses.append(item_response)
        
        responses['items'] = item_responses
        return responses
    
    def create_payment(self, payment_data: Dict[str, Any]) -> APIResponse:
        """Create a payment."""
        return self.create('payments', payment_data)
    
    def get_sale_with_items(self, sale_id: str) -> Dict[str, APIResponse]:
        """Get sale with its items."""
        responses = {}
        
        # Get sale
        responses['sale'] = self.get_by_id('sales', sale_id, 
            'id,invoice_number,customer_id,total_amount,payment_status,customers(*)')
        
        # Get sale items
        responses['items'] = self.read('sale_items', 
            {'sale_id': sale_id}, 
            'id,product_id,quantity,unit_price,line_total,products(*)')
        
        return responses