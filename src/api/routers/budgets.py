# src/api/routers/budgets.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from decimal import Decimal

from src.api.dependencies import get_config_manager, get_monthly_summary_repository
from src.api.schemas.budget import BudgetAnalysisResponse, BudgetItem, YearlyBudgetResponse
from src.config.config_manager import ConfigManager
from src.repositories.monthly_summary_repository import MonthlySummaryRepository

router = APIRouter()

@router.get("/", response_model=Dict[str, Decimal])
async def get_budgets(
    config_manager: ConfigManager = Depends(get_config_manager)
):
    """
    Get all budget values for categories
    """
    try:
        # Get budgets from config manager
        budgets = config_manager.get_budgets()
        
        # Convert to dictionary with string keys and decimal values
        budget_dict = {str(k): v for k, v in budgets.items()}
        
        return budget_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis/{month_year}", response_model=BudgetAnalysisResponse)
async def get_budget_analysis(
    month_year: str,
    config_manager: ConfigManager = Depends(get_config_manager),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get budget analysis for a specific month
    """
    try:
        # Get budgets from config manager
        budgets = config_manager.get_budgets()
        
        # Get monthly summary for the specified month
        monthly_summary = monthly_summary_repo.find_by_month_year(month_year)
        
        if not monthly_summary:
            raise HTTPException(status_code=404, detail=f"Monthly summary for {month_year} not found")
        
        # Create budget items for each category
        budget_items = []
        total_budget = Decimal('0')
        total_actual = Decimal('0')
        
        # Process each category where we have budget data
        for category, budget_amount in budgets.items():
            # Skip categories with no budget
            if budget_amount <= 0:
                continue
                
            # Get actual amount from monthly summary
            actual_amount = monthly_summary.category_totals.get(category, Decimal('0'))
            
            # Calculate variance (budget - actual)
            variance = budget_amount - actual_amount
            
            # Determine if over budget
            is_over_budget = variance < 0
            
            # Create budget item
            budget_item = BudgetItem(
                category=category,
                budget_amount=budget_amount,
                actual_amount=actual_amount,
                variance=variance,
                is_over_budget=is_over_budget
            )
            
            budget_items.append(budget_item)
            
            # Update totals
            total_budget += budget_amount
            total_actual += actual_amount
        
        # Calculate total variance
        total_variance = total_budget - total_actual
        
        # Sort budget items by variance (most over budget first)
        budget_items.sort(key=lambda x: x.variance)
        
        return BudgetAnalysisResponse(
            month_year=month_year,
            budget_items=budget_items,
            total_budget=total_budget,
            total_actual=total_actual,
            total_variance=total_variance
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/yearly-analysis/{year}", response_model=YearlyBudgetResponse)
async def get_yearly_budget_analysis(
    year: int,
    config_manager: ConfigManager = Depends(get_config_manager),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get budget analysis for an entire year
    """
    try:
        # Get budgets from config manager
        budgets = config_manager.get_budgets()
        
        # Get monthly summaries for the specified year
        monthly_summaries = monthly_summary_repo.find_by_year(year)
        
        if not monthly_summaries:
            raise HTTPException(status_code=404, detail=f"No monthly summaries found for year {year}")
        
        # Create data structure for response
        budget_data = {}
        all_categories = set()
        months = []
        
        # For each month, calculate budget analysis
        for summary in monthly_summaries:
            month = summary.month
            months.append(month)
            
            budget_data[month] = {}
            
            # Process each category where we have budget data
            for category, budget_amount in budgets.items():
                # Skip categories with no budget
                if budget_amount <= 0:
                    continue
                
                all_categories.add(category)
                
                # Get actual amount from monthly summary
                actual_amount = summary.category_totals.get(category, Decimal('0'))
                
                # Calculate variance (budget - actual)
                variance = budget_amount - actual_amount
                
                # Determine if over budget
                is_over_budget = variance < 0
                
                # Create budget item
                budget_item = BudgetItem(
                    category=category,
                    budget_amount=budget_amount,
                    actual_amount=actual_amount,
                    variance=variance,
                    is_over_budget=is_over_budget
                )
                
                budget_data[month][category] = budget_item
        
        return YearlyBudgetResponse(
            year=year,
            months=months,
            categories=sorted(list(all_categories)),
            budget_data=budget_data
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))