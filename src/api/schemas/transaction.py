# src/api/schemas/transaction.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date as DateType
from decimal import Decimal

# Base Transaction model with common fields
class TransactionBase(BaseModel):
    date: DateType
    description: str
    amount: Decimal
    category: str
    source: str

# Model for creating a new transaction manually
class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    """Model for updating an existing transaction"""
    date: Optional[DateType] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    source: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2023-06-15",
                "description": "WHOLE FOODS MARKET - CORRECTED",
                "amount": 92.50,
                "category": "Food",
                "source": "chase"
            }
        }

# Model for transaction responses
class TransactionResponse(TransactionBase):
    id: Optional[int] = None
    transaction_hash: str
    month_str: str
    
    class Config:
        from_attributes = True  # Allows conversion from ORM models
        json_schema_extra = {
            "example": {
                "id": 1,
                "date": "2023-06-15",
                "description": "WHOLE FOODS MARKET",
                "amount": 87.42,
                "category": "Groceries",
                "source": "chase",
                "transaction_hash": "5f8c3a9d2e7b1c6a4d3e8f2a1c5b9d7e",
                "month_str": "2023-06"
            }
        }

# List response for pagination
class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int = Field(..., description="Total number of transactions matching the query")
    
    class Config:
        json_schema_extra = {
            "example": {
                "transactions": [
                    {
                        "id": 1,
                        "date": "2023-06-15",
                        "description": "WHOLE FOODS MARKET",
                        "amount": 87.42,
                        "category": "Groceries",
                        "source": "chase",
                        "transaction_hash": "5f8c3a9d2e7b1c6a4d3e8f2a1c5b9d7e",
                        "month_str": "2023-06"
                    }
                ],
                "total": 1
            }
        }

class TransactionUpdateResponse(BaseModel):
    """Response after updating a transaction"""
    updated_transaction: TransactionResponse
    monthly_summaries_affected: List[str] = Field(default_factory=list, description="List of month_year values that were recalculated")
    
    class Config:
        json_schema_extra = {
            "example": {
                "updated_transaction": {
                    "id": 1,
                    "date": "2023-06-15",
                    "description": "WHOLE FOODS MARKET - CORRECTED",
                    "amount": 92.50,
                    "category": "Food",
                    "source": "chase",
                    "transaction_hash": "new_hash_value",
                    "month_str": "2023-06"
                },
                "monthly_summaries_affected": ["June 2023"]
            }
        }

# File upload response
class FileUploadResponse(BaseModel):
    message: str
    transactions_count: int
    categories: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "File processed successfully",
                "transactions_count": 42,
                "categories": ["Groceries", "Dining", "Travel"]
            }
        }

class BulkFileUploadResponse(BaseModel):
    """Response for bulk file upload"""
    files_processed: int
    total_transactions: int
    transactions_by_file: Dict[str, int]
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "files_processed": 3,
                "total_transactions": 150,
                "transactions_by_file": {
                    "chase_june.csv": 50,
                    "wells_june.csv": 60,
                    "citi_june.csv": 40
                },
                "message": "Files processed successfully"
            }
        }