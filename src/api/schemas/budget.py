# src/api/schemas/budget.py

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from decimal import Decimal

class BudgetItem(BaseModel):
    category: str
    budget_amount: Decimal
    actual_amount: Decimal
    variance: Decimal
    is_over_budget: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "Groceries",
                "budget_amount": 400.00,
                "actual_amount": 465.87,
                "variance": -65.87,
                "is_over_budget": True
            }
        }

class BudgetAnalysisResponse(BaseModel):
    month_year: str
    budget_items: List[BudgetItem]
    total_budget: Decimal
    total_actual: Decimal
    total_variance: Decimal
    
    class Config:
        json_schema_extra = {
            "example": {
                "month_year": "January 2023",
                "budget_items": [
                    {
                        "category": "Groceries",
                        "budget_amount": 400.00,
                        "actual_amount": 465.87,
                        "variance": -65.87,
                        "is_over_budget": True
                    },
                    {
                        "category": "Dining",
                        "budget_amount": 300.00,
                        "actual_amount": 285.50,
                        "variance": 14.50,
                        "is_over_budget": False
                    }
                ],
                "total_budget": 700.00,
                "total_actual": 751.37,
                "total_variance": -51.37
            }
        }

class YearlyBudgetResponse(BaseModel):
    year: int
    months: List[str]
    categories: List[str]
    budget_data: Dict[str, Dict[str, BudgetItem]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "year": 2023,
                "months": ["January", "February", "March"],
                "categories": ["Groceries", "Dining"],
                "budget_data": {
                    "January": {
                        "Groceries": {
                            "category": "Groceries",
                            "budget_amount": 400.00,
                            "actual_amount": 465.87,
                            "variance": -65.87,
                            "is_over_budget": True
                        },
                        "Dining": {
                            "category": "Dining",
                            "budget_amount": 300.00,
                            "actual_amount": 285.50,
                            "variance": 14.50,
                            "is_over_budget": False
                        }
                    }
                }
            }
        }