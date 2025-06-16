# src/api/routers/categories.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from decimal import Decimal

from src.api.dependencies import get_config_manager, get_transaction_repository
from src.api.schemas.category import CategoryResponse, CategoryListResponse, CategoryStatistics
from src.api.schemas.transaction import TransactionListResponse, TransactionResponse
from src.config.config_manager import ConfigManager
from src.repositories.transaction_repository import TransactionRepository
from src.models.models import Transaction

router = APIRouter()

@router.get("/", response_model=CategoryListResponse)
async def get_categories(
    config_manager: ConfigManager = Depends(get_config_manager)
):
    """
    Get all available categories with their keywords and budgets
    """
    try:
        # Get categories from config manager
        categories = config_manager.get_categories()
        
        # Convert to response models
        category_responses = []
        for name, category in categories.items():
            category_response = CategoryResponse(
                name=name,
                keywords=category.keywords,
                budget=category.budget,
                is_investment=category.is_investment,
                is_income=category.is_income,
                is_payment=category.is_payment
            )
            category_responses.append(category_response)
        
        return CategoryListResponse(categories=category_responses)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{category_name}/transactions", response_model=TransactionListResponse)
async def get_transactions_by_category(
    category_name: str,
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Get all transactions for a specific category
    """
    try:
        # Get transactions for the category
        transactions = transaction_repo.find_by_category(category_name)
        
        if not transactions:
            return TransactionListResponse(transactions=[], total=0)
        
        # Convert to response models
        transaction_responses = []
        for tx in transactions:
            transaction_response = TransactionResponse(
                id=tx.id,
                date=tx.date,
                description=tx.description,
                amount=tx.amount,
                category=tx.category,
                source=tx.source,
                transaction_hash=tx.transaction_hash,
                month_str=tx.month_str
            )
            transaction_responses.append(transaction_response)
        
        return TransactionListResponse(
            transactions=transaction_responses,
            total=len(transaction_responses)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{category_name}/statistics", response_model=CategoryStatistics)
async def get_category_statistics(
    category_name: str,
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Get statistics for a specific category
    """
    try:
        # Get transactions for the category
        transactions = transaction_repo.find_by_category(category_name)
        
        if not transactions:
            raise HTTPException(status_code=404, detail=f"No transactions found for category: {category_name}")
        
        # Calculate statistics
        amounts = [tx.amount for tx in transactions]
        total = sum(amounts)
        count = len(amounts)
        average = total / count if count > 0 else Decimal('0')
        maximum = max(amounts) if amounts else Decimal('0')
        minimum = min(amounts) if amounts else Decimal('0')
        
        return CategoryStatistics(
            category=category_name,
            transaction_count=count,
            total_amount=total,
            average_amount=average,
            max_amount=maximum,
            min_amount=minimum
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))