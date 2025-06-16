# src/api/utils/pagination.py

from fastapi import Query
from typing import Generic, TypeVar, List, Dict, Any, Optional
from pydantic import BaseModel, Field

T = TypeVar('T')

class PaginationParams:
    """Query parameters for pagination"""
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        page_size: int = Query(50, ge=1, le=100, description="Items per page")
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size

class PagedResponse(BaseModel, Generic[T]):
    """Generic paged response"""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int
    
    @classmethod
    def create(cls, items: List[T], total: int, params: PaginationParams) -> "PagedResponse[T]":
        """Create a paged response from items and pagination parameters"""
        # Calculate total pages
        pages = (total + params.page_size - 1) // params.page_size if total > 0 else 0
        
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            pages=pages
        )