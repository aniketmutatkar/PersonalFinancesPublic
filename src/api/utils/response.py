# src/api/utils/response.py

from typing import Generic, TypeVar, Dict, Any, Optional
from pydantic import BaseModel, Field

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    data: T
    meta: Dict[str, Any] = Field(default_factory=dict)
    message: Optional[str] = None
    
    @classmethod
    def success(cls, data: T, message: Optional[str] = None, meta: Optional[Dict[str, Any]] = None) -> "ApiResponse[T]":
        """Create a success response"""
        return cls(
            data=data,
            message=message,
            meta=meta or {}
        )