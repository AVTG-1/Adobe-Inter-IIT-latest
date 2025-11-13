"""Base class for third-party service integration."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx


class BaseService(ABC):
    """Abstract base class for external service integrations."""
    
    def __init__(self, base_url: Optional[str] = None, timeout: int = 30):
        """Initialize service with optional base URL and timeout.
        
        Args:
            base_url: Base URL for the external service
            timeout: Request timeout in seconds
        """
        self.base_url = base_url
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout
            )
        return self._client
    
    async def close(self):
        """Close HTTP client connection."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if service is available.
        
        Returns:
            True if service is healthy, False otherwise
        """
        pass
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make HTTP request to external service.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            data: Request payload
            **kwargs: Additional httpx request parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            httpx.HTTPError: If request fails
        """
        client = await self._get_client()
        response = await client.request(
            method=method,
            url=endpoint,
            json=data,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
