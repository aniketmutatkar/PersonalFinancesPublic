# src/api/routers/monthly_summary.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Literal
from decimal import Decimal

from src.api.dependencies import get_monthly_summary_repository, get_reporting_service
from src.api.schemas.monthly_summary import MonthlySummaryResponse, MonthlySummaryListResponse
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.services.reporting_service import ReportingService

router = APIRouter()

@router.get("/", response_model=MonthlySummaryListResponse)
async def get_monthly_summaries(
    year: Optional[int] = None,
    sort_direction: Literal["asc", "desc"] = Query(
        default="desc", 
        description="Sort direction: 'asc' for oldest first (chronological), 'desc' for newest first"
    ),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get all monthly summaries with optional year filter and sort direction.
    
    Args:
        year: Optional year filter
        sort_direction: 'asc' for oldest first (good for charts), 'desc' for newest first (good for lists)
    
    Returns:
        List of monthly summaries in the requested order
    """
    try:
        if year:
            # Get summaries for specific year with sort direction
            summaries = monthly_summary_repo.find_by_year(year, sort_direction)
        else:
            # Get all summaries with sort direction
            summaries = monthly_summary_repo.find_all(sort_direction)
        
        if not summaries:
            return MonthlySummaryListResponse(summaries=[], total=0)
        
        # Convert domain models to response models
        summary_responses = []
        for summary in summaries:
            summary_response = MonthlySummaryResponse(
                id=summary.id,
                month=summary.month,
                year=summary.year,
                month_year=summary.month_year,
                category_totals={k: v for k, v in summary.category_totals.items()},
                investment_total=summary.investment_total,
                total=summary.total,
                total_minus_invest=summary.total_minus_invest
            )
            summary_responses.append(summary_response)
        
        return MonthlySummaryListResponse(
            summaries=summary_responses,
            total=len(summary_responses)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{month_year}", response_model=MonthlySummaryResponse)
async def get_monthly_summary(
    month_year: str,
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get a specific monthly summary by month_year identifier.
    
    Args:
        month_year: Month year in format 'January 2023'
    
    Returns:
        The requested monthly summary
    """
    try:
        summary = monthly_summary_repo.find_by_month_year(month_year)
        
        if not summary:
            raise HTTPException(
                status_code=404, 
                detail=f"Monthly summary not found for {month_year}"
            )
        
        return MonthlySummaryResponse(
            id=summary.id,
            month=summary.month,
            year=summary.year,
            month_year=summary.month_year,
            category_totals={k: v for k, v in summary.category_totals.items()},
            investment_total=summary.investment_total,
            total=summary.total,
            total_minus_invest=summary.total_minus_invest
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))