# src/api/schemas/category.py

from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal

class CategoryBase(BaseModel):
    name: str
    
class CategoryResponse(CategoryBase):
    keywords: List[str] = Field(default_factory=list)
    budget: Optional[Decimal] = None
    is_investment: bool
    is_income: bool
    is_payment: bool
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "name": "Groceries",
                "keywords": ["whole foods", "trader joe", "kroger", "publix"],
                "budget": 400.00,
                "is_investment": False,
                "is_income": False,
                "is_payment": False
            }
        }

class CategoryListResponse(BaseModel):
    categories: List[CategoryResponse]
    
    class Config:
        json_schema_extra = {
            "example": {
                "categories": [
                    {
                        "name": "Groceries",
                        "keywords": ["whole foods", "trader joe", "kroger", "publix"],
                        "budget": 400.00,
                        "is_investment": False,
                        "is_income": False,
                        "is_payment": False
                    },
                    {
                        "name": "Dining",
                        "keywords": ["restaurant", "cafe", "coffee"],
                        "budget": 300.00,
                        "is_investment": False,
                        "is_income": False,
                        "is_payment": False
                    }
                ]
            }
        }

class CategoryStatistics(BaseModel):
    category: str
    transaction_count: int
    total_amount: Decimal
    average_amount: Decimal
    max_amount: Decimal
    min_amount: Decimal
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "Groceries",
                "transaction_count": 15,
                "total_amount": 632.47,
                "average_amount": 42.16,
                "max_amount": 124.35,
                "min_amount": 8.99
            }
        }