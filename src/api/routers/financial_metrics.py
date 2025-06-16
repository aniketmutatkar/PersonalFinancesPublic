# src/api/routers/financial_metrics.py

from fastapi import APIRouter, Depends
from typing import Dict

from src.api.dependencies import get_financial_metrics_service
from src.services.financial_metrics_service import FinancialMetricsService

router = APIRouter()

@router.get("/runway")
async def get_financial_runway(
    metrics_service: FinancialMetricsService = Depends(get_financial_metrics_service)
) -> Dict:
    """Get financial runway metrics (months of expenses covered by liquid assets)"""
    return metrics_service.calculate_financial_runway()

@router.get("/net-worth")
async def get_net_worth(
    metrics_service: FinancialMetricsService = Depends(get_financial_metrics_service)
) -> Dict:
    """Get net worth breakdown (liquid + investment assets)"""
    return metrics_service.calculate_net_worth()

@router.get("/overview")
async def get_financial_metrics_overview(
    metrics_service: FinancialMetricsService = Depends(get_financial_metrics_service)
) -> Dict:
    """Get comprehensive financial metrics overview"""
    runway = metrics_service.calculate_financial_runway()
    net_worth = metrics_service.calculate_net_worth()
    
    return {
        "runway": runway,
        "net_worth": net_worth,
        "summary": {
            "total_net_worth": net_worth["total_net_worth"],
            "liquid_assets": net_worth["liquid_assets"],
            "runway_months": runway["runway_months"],
            "runway_status": runway["runway_status"],
            "liquidity_status": net_worth["liquidity_status"]
        }
    }