# src/api/routers/exports.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import date
import io
import csv

from src.api.dependencies import get_reporting_service
from src.services.reporting_service import ReportingService

router = APIRouter()

@router.get("/export/transactions")
async def export_transactions(
    format: str = "csv",
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    month: Optional[str] = None,
    reporting_service: ReportingService = Depends(get_reporting_service)
):
    """
    Export transactions to CSV
    """
    # Get transactions
    df = reporting_service.get_transactions_report(
        category=category,
        start_date=start_date,
        end_date=end_date,
        month_str=month
    )
    
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No transactions found")
    
    # Create CSV in memory
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    # Create filename
    filename_parts = ["transactions"]
    if category:
        filename_parts.append(category.lower())
    if month:
        filename_parts.append(month)
    filename = f"{'_'.join(filename_parts)}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/monthly-summary")
async def export_monthly_summary(
    year: Optional[int] = None,
    reporting_service: ReportingService = Depends(get_reporting_service)
):
    """
    Export monthly summary to CSV
    """
    # Get monthly summary
    df = reporting_service.generate_monthly_summary_report()
    
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No monthly summary data found")
    
    # Filter by year if provided
    if year:
        df = df[df['year'] == year]
    
    # Create CSV in memory
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    # Create filename
    filename = f"monthly_summary_{year}.csv" if year else "monthly_summary_all.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/budget-analysis")
async def export_budget_analysis(
    year: int,
    reporting_service: ReportingService = Depends(get_reporting_service)
):
    """
    Export budget analysis to CSV
    """
    # This would need to be implemented in reporting_service
    # For now, return a placeholder
    raise HTTPException(status_code=501, detail="Budget analysis export not yet implemented")