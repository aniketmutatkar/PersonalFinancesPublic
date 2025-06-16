# src/api/routers/statistics.py

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Optional, Any
from decimal import Decimal
import statistics
from datetime import datetime

from src.api.dependencies import (
    get_monthly_summary_repository, 
    get_transaction_repository,
    get_config_manager,
    get_financial_metrics_service
)
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.repositories.transaction_repository import TransactionRepository
from src.config.config_manager import ConfigManager
from src.services.financial_metrics_service import FinancialMetricsService  # NEW

router = APIRouter()

@router.get("/overview")
async def get_comprehensive_financial_overview(
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    config_manager: ConfigManager = Depends(get_config_manager),
    financial_metrics_service: FinancialMetricsService = Depends(get_financial_metrics_service)  # NEW
):
    """
    Get comprehensive financial overview with actionable insights + financial health metrics
    """
    try:
        # Get all monthly summaries
        summaries = monthly_summary_repo.find_all()
        
        if not summaries:
            return {
                "error": "No monthly summary data available",
                "data_available": False
            }
        
        # Investment and expense categories
        investment_categories = ['Acorns', 'Wealthfront', 'Robinhood', 'Schwab']
        exclude_categories = ['Pay', 'Payment'] + investment_categories
        
        # Basic data range info
        date_range = {
            "start_month": f"{summaries[-1].month} {summaries[-1].year}",
            "end_month": f"{summaries[0].month} {summaries[0].year}",
            "total_months": len(summaries)
        }
        
        # Calculate core financial metrics
        total_income = sum(abs(float(s.category_totals.get('Pay', 0))) for s in summaries)
        total_spending = sum(float(s.total_minus_invest) for s in summaries)
        total_investments = sum(
            sum(abs(float(s.category_totals.get(cat, 0))) for cat in investment_categories)
            for s in summaries
        )
        
        # Financial growth (net worth change)
        financial_growth = total_income - total_spending
        monthly_financial_growth = financial_growth / len(summaries) if summaries else 0
        
        # Calculate cash flow (income - all spending including investments)
        monthly_income = total_income / len(summaries)
        monthly_spending = total_spending / len(summaries)
        monthly_investments = total_investments / len(summaries)
        monthly_cash_flow = monthly_income - monthly_spending
        
        # Calculate investment rate (investments as % of total savings)
        investment_rate = (monthly_investments / monthly_income * 100) if monthly_income > 0 else 0
        
        # Savings rate calculation
        overall_savings_rate = ((total_income - total_spending) / total_income * 100) if total_income > 0 else 0
        
        # Top expense categories analysis
        category_totals = {}
        for summary in summaries:
            for category, amount in summary.category_totals.items():
                if category not in exclude_categories:
                    if category not in category_totals:
                        category_totals[category] = 0
                    category_totals[category] += float(amount)
        
        # Get top 5 categories by total spending
        top_categories = sorted(
            [(cat, total) for cat, total in category_totals.items()],
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Calculate spending patterns
        spending_patterns = await _analyze_spending_patterns(summaries, investment_categories)
        
        # Budget adherence calculation
        budget_adherence = await _calculate_budget_adherence(
            summaries, config_manager, monthly_summary_repo
        )
        
        # Alert flags
        alert_flags = await _generate_alert_flags(summaries, category_totals, config_manager)
        
        # Year-over-year analysis
        yearly_analysis = _calculate_yearly_trends(summaries, investment_categories)
        
        # Spending extremes
        spending_amounts = [float(s.total_minus_invest) for s in summaries]
        highest_month = max(summaries, key=lambda s: float(s.total_minus_invest))
        lowest_month = min(summaries, key=lambda s: float(s.total_minus_invest))
        
        runway_metrics = financial_metrics_service.calculate_financial_runway()
        net_worth_metrics = financial_metrics_service.calculate_net_worth()
        
        financial_stability = _assess_financial_stability(
            runway_metrics, net_worth_metrics, overall_savings_rate, monthly_cash_flow
        )
        
        return {
            "data_available": True,
            "date_range": date_range,
            
            # Core metrics (existing)
            "financial_summary": {
                "total_income": round(total_income, 2),
                "total_spending": round(total_spending, 2),
                "total_investments": round(total_investments, 2),
                "financial_growth": round(financial_growth, 2),
                "monthly_financial_growth": round(monthly_financial_growth, 2),
                "overall_savings_rate": round(overall_savings_rate, 1)
            },
            
            "cash_flow_analysis": {
                "monthly_income": round(monthly_income, 2),
                "monthly_spending": round(monthly_spending, 2),  # Expenses only, no investments
                "monthly_investments": round(monthly_investments, 2),
                "monthly_cash_flow": round(monthly_cash_flow, 2),  # Income - expenses (positive should be normal)
                "investment_rate": round(investment_rate, 1)  # Now shows % of income invested
            },
            
            # Spending intelligence (existing)
            "spending_intelligence": {
                "top_categories": [
                    {"category": cat, "total_amount": round(total, 2), "monthly_average": round(total / len(summaries), 2)}
                    for cat, total in top_categories
                ],
                "spending_patterns": spending_patterns,
                "discretionary_ratio": spending_patterns.get("discretionary_ratio", 0),
                "fixed_expenses": spending_patterns.get("fixed_expenses", 0)
            },
            
            # Budget and warnings (existing)
            "budget_health": {
                "adherence_score": budget_adherence.get("score", 0),
                "categories_on_track": budget_adherence.get("on_track", 0),
                "total_categories": budget_adherence.get("total", 0),
                "alert_flags": alert_flags
            },
            
            "financial_health": {
                "runway": runway_metrics,
                "net_worth": net_worth_metrics,
                "stability_assessment": financial_stability,
                "key_insights": _generate_financial_insights(
                    runway_metrics, net_worth_metrics, spending_patterns, overall_savings_rate
                )
            },
            
            # Year-over-year trends (existing)
            "yearly_trends": yearly_analysis,
            
            # Spending extremes (existing)
            "spending_extremes": {
                "highest_month": {
                    "month_year": highest_month.month_year,
                    "amount": float(highest_month.total_minus_invest)
                },
                "lowest_month": {
                    "month_year": lowest_month.month_year,
                    "amount": float(lowest_month.total_minus_invest)
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating comprehensive overview: {str(e)}")


def _assess_financial_stability(runway_metrics, net_worth_metrics, savings_rate, monthly_cash_flow):
    """Assess overall financial stability based on multiple metrics"""
    
    runway_months = runway_metrics.get("runway_months", 0)
    liquidity_ratio = net_worth_metrics.get("liquidity_ratio", 0)
    
    # Score each component (0-100)
    runway_score = min(100, runway_months * 20)  # 5+ months = 100
    liquidity_score = min(100, liquidity_ratio * 500)  # 20%+ = 100
    savings_score = min(100, savings_rate * 5)  # 20%+ = 100
    cash_flow_score = 100 if monthly_cash_flow > 0 else max(0, 50 + monthly_cash_flow / 1000)
    
    # Weighted average
    overall_score = (runway_score * 0.3 + liquidity_score * 0.2 + 
                    savings_score * 0.3 + cash_flow_score * 0.2)
    
    if overall_score >= 80:
        status = "Excellent"
    elif overall_score >= 65:
        status = "Good"
    elif overall_score >= 50:
        status = "Fair"
    else:
        status = "Needs Attention"
    
    return {
        "overall_score": round(overall_score, 1),
        "status": status,
        "component_scores": {
            "runway": round(runway_score, 1),
            "liquidity": round(liquidity_score, 1),
            "savings": round(savings_score, 1),
            "cash_flow": round(cash_flow_score, 1)
        }
    }


def _generate_financial_insights(runway_metrics, net_worth_metrics, spending_patterns, savings_rate):
    """Generate actionable financial insights"""
    
    insights = []
    
    runway_months = runway_metrics.get("runway_months", 0)
    liquidity_ratio = net_worth_metrics.get("liquidity_ratio", 0)
    discretionary_ratio = spending_patterns.get("discretionary_ratio", 0)
    
    # Runway insights
    if runway_months < 3:
        insights.append({
            "type": "warning",
            "category": "emergency_fund",
            "message": f"Emergency fund covers only {runway_months:.1f} months. Target: 3-6 months.",
            "action": "Increase liquid savings"
        })
    elif runway_months > 12:
        insights.append({
            "type": "opportunity",
            "category": "investment",
            "message": f"High liquid reserves ({runway_months:.1f} months). Consider investing excess.",
            "action": "Optimize cash allocation"
        })
    
    # Liquidity insights
    if liquidity_ratio < 0.10:
        insights.append({
            "type": "warning",
            "category": "liquidity",
            "message": f"Low liquidity ratio ({liquidity_ratio:.1%}). Target: 10-20%.",
            "action": "Build emergency fund"
        })
    
    # Spending insights
    if discretionary_ratio > 40:
        insights.append({
            "type": "opportunity",
            "category": "spending",
            "message": f"High discretionary spending ({discretionary_ratio:.0f}%). Opportunity to optimize.",
            "action": "Review variable expenses"
        })
    
    # Savings rate insights
    if savings_rate < 10:
        insights.append({
            "type": "warning",
            "category": "savings",
            "message": f"Low savings rate ({savings_rate:.1f}%). Target: 15-20%.",
            "action": "Increase income or reduce expenses"
        })
    
    return insights[:3]  # Limit to top 3 insights


async def _analyze_spending_patterns(summaries, investment_categories):
    """Analyze spending patterns and calculate discretionary vs fixed expenses"""
    
    # Define typically fixed categories
    fixed_categories = ['Rent', 'Insurance', 'Utilities']
    
    # Calculate averages
    fixed_total = 0
    discretionary_total = 0
    
    for summary in summaries:
        for category, amount in summary.category_totals.items():
            if category in ['Pay', 'Payment'] + investment_categories:
                continue
                
            amount_val = float(amount)
            if category in fixed_categories:
                fixed_total += amount_val
            else:
                discretionary_total += amount_val
    
    monthly_fixed = fixed_total / len(summaries)
    monthly_discretionary = discretionary_total / len(summaries)
    total_monthly = monthly_fixed + monthly_discretionary
    
    # Calculate 3-month trend (simplified - using recent vs older averages)
    recent_months = summaries[:3] if len(summaries) >= 6 else summaries[:len(summaries)//2]
    older_months = summaries[3:6] if len(summaries) >= 6 else summaries[len(summaries)//2:]
    
    recent_avg = sum(float(s.total_minus_invest) for s in recent_months) / len(recent_months) if recent_months else 0
    older_avg = sum(float(s.total_minus_invest) for s in older_months) / len(older_months) if older_months else recent_avg
    
    trend_percentage = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
    
    return {
        "fixed_expenses": round(monthly_fixed, 2),
        "discretionary_expenses": round(monthly_discretionary, 2),
        "discretionary_ratio": round((monthly_discretionary / total_monthly * 100), 1) if total_monthly > 0 else 0,
        "three_month_trend": round(trend_percentage, 1)
    }


async def _calculate_budget_adherence(summaries, config_manager, monthly_summary_repo):
    """Calculate budget adherence score"""
    try:
        budgets = config_manager.get_budgets()
        
        if not budgets:
            return {"score": 0, "on_track": 0, "total": 0}
        
        # Use most recent month for adherence calculation
        if summaries:
            recent_summary = summaries[0]
            on_track = 0
            total_categories = len(budgets)
            
            for category, budget_amount in budgets.items():
                actual_amount = float(recent_summary.category_totals.get(category, 0))
                if actual_amount <= budget_amount:
                    on_track += 1
            
            score = (on_track / total_categories * 100) if total_categories > 0 else 0
            return {"score": round(score, 1), "on_track": on_track, "total": total_categories}
        
        return {"score": 0, "on_track": 0, "total": len(budgets)}
        
    except Exception:
        return {"score": 0, "on_track": 0, "total": 0}


async def _generate_alert_flags(summaries, category_totals, config_manager):
    """Generate alert flags for concerning spending patterns"""
    flags = []
    
    try:
        budgets = config_manager.get_budgets()
        
        # Check budget overruns
        if budgets and summaries:
            recent_summary = summaries[0]
            for category, budget_amount in budgets.items():
                actual_amount = float(recent_summary.category_totals.get(category, 0))
                if actual_amount > budget_amount * 1.2:  # 20% over budget
                    flags.append({
                        "type": "budget_overrun",
                        "message": f"{category}: ${actual_amount:.0f} vs ${budget_amount:.0f} budget",
                        "severity": "warning"
                    })
        
        # Check for unusually high spending months
        if len(summaries) >= 3:
            recent_spending = [float(s.total_minus_invest) for s in summaries[:3]]
            avg_spending = sum(float(s.total_minus_invest) for s in summaries) / len(summaries)
            
            if all(spending > avg_spending * 1.1 for spending in recent_spending):
                flags.append({
                    "type": "spending_pattern",
                    "message": "3 months above spending target",
                    "severity": "warning"
                })
        
    except Exception:
        # If there's any error, return empty flags
        pass
    
    return flags[:3]  # Limit to 3 most important flags


def _calculate_yearly_trends(summaries, investment_categories):
    """Calculate year-over-year trends"""
    yearly_data = {}
    
    for summary in summaries:
        year = summary.year
        if year not in yearly_data:
            yearly_data[year] = {
                "income": 0,
                "spending": 0,
                "investments": 0,
                "months": 0
            }
        
        yearly_data[year]["income"] += abs(float(summary.category_totals.get('Pay', 0)))
        yearly_data[year]["spending"] += float(summary.total_minus_invest)
        yearly_data[year]["investments"] += sum(
            abs(float(summary.category_totals.get(cat, 0))) 
            for cat in investment_categories
        )
        yearly_data[year]["months"] += 1
    
    # Calculate monthly averages
    for year_data in yearly_data.values():
        if year_data["months"] > 0:
            year_data["monthly_income"] = year_data["income"] / year_data["months"]
            year_data["monthly_spending"] = year_data["spending"] / year_data["months"]
            year_data["monthly_investments"] = year_data["investments"] / year_data["months"]
    
    return yearly_data

@router.get("/year-comparison")
async def get_year_comparison(
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get spending data organized by year for comparison charts
    """
    try:
        summaries = monthly_summary_repo.find_all()
        
        if not summaries:
            return {"error": "No data available", "years": {}, "available_years": [], "comparison_ready": False}
        
        investment_categories = ['Acorns', 'Wealthfront', 'Robinhood', 'Schwab']
        exclude_categories = ['Pay', 'Payment'] + investment_categories
        
        # Group by year
        years = {}
        for summary in summaries:
            year = summary.year
            if year not in years:
                years[year] = {
                    "months": [],
                    "total_spending": 0,
                    "total_income": 0,
                    "total_investments": 0,
                    "categories": {},  # ADDED: Category breakdown for CategoryEvolution
                    "months_count": 0  # ADDED: Count for proper averaging
                }
            
            # Calculate spending (exclude investments and income)
            monthly_spending = sum(
                float(amount) for category, amount in summary.category_totals.items()
                if category not in exclude_categories
            )
            
            # Calculate income
            monthly_income = abs(float(summary.category_totals.get('Pay', 0)))
            
            # Calculate investments
            monthly_investments = sum(
                abs(float(summary.category_totals.get(cat, 0))) for cat in investment_categories
            )
            
            # Add to months array
            years[year]["months"].append({
                "month": summary.month,
                "spending": round(monthly_spending, 2),
                "income": round(monthly_income, 2)
            })
            
            # Update totals
            years[year]["total_spending"] += monthly_spending
            years[year]["total_income"] += monthly_income
            years[year]["total_investments"] += monthly_investments
            years[year]["months_count"] += 1
            
            for category, amount in summary.category_totals.items():
                if category not in exclude_categories:
                    if category not in years[year]["categories"]:
                        years[year]["categories"][category] = 0
                    years[year]["categories"][category] += float(amount)
        
        # Calculate averages with the field names the frontend expects
        for year_data in years.values():
            month_count = year_data["months_count"]
            if month_count > 0:
                # Frontend expects these specific field names:
                year_data["avg_monthly_spending"] = round(year_data["total_spending"] / month_count, 2)
                year_data["avg_monthly_income"] = round(year_data["total_income"] / month_count, 2)
                year_data["avg_monthly_investments"] = round(year_data["total_investments"] / month_count, 2)
                
                # ALSO add the alternative field names the frontend components expect:
                year_data["average_monthly_spending"] = year_data["avg_monthly_spending"]
                year_data["average_monthly_income"] = year_data["avg_monthly_income"] 
                year_data["average_monthly_investments"] = year_data["avg_monthly_investments"]
                
                # Add months count for CategoryEvolution component
                year_data["months"] = month_count
        
        return {
            "years": years,
            "available_years": sorted(list(years.keys())),
            "comparison_ready": len(years) > 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating year comparison: {str(e)}")

@router.get("/patterns")
async def get_spending_patterns(
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Get detailed spending pattern analysis
    """
    try:
        summaries = monthly_summary_repo.find_all()
        
        if not summaries:
            return {"error": "No data available", "patterns": {}}
        
        investment_categories = ['Acorns', 'Wealthfront', 'Robinhood', 'Schwab']
        exclude_categories = ['Pay', 'Payment'] + investment_categories
        
        # Calculate month-over-month changes
        monthly_changes = []
        for i in range(len(summaries) - 1):
            current = float(summaries[i].total_minus_invest)
            previous = float(summaries[i + 1].total_minus_invest)
            change = ((current - previous) / previous * 100) if previous != 0 else 0
            
            monthly_changes.append({
                "month": summaries[i].month_year,
                "spending": round(current, 2),
                "change_percent": round(change, 1)
            })
        
        # Calculate seasonal patterns (by month)
        seasonal_data = {}
        for summary in summaries:
            month_name = summary.month
            if month_name not in seasonal_data:
                seasonal_data[month_name] = []
            seasonal_data[month_name].append(float(summary.total_minus_invest))
        
        # Calculate seasonal averages
        seasonal_averages = {}
        for month, amounts in seasonal_data.items():
            seasonal_averages[month] = {
                "average_spending": round(sum(amounts) / len(amounts), 2),
                "data_points": len(amounts),
                "highest": round(max(amounts), 2),
                "lowest": round(min(amounts), 2)
            }
        
        return {
            "monthly_changes": monthly_changes[:12],  # Last 12 months
            "seasonal_patterns": seasonal_averages,
            "volatility": {
                "std_deviation": round(statistics.stdev([float(s.total_minus_invest) for s in summaries]), 2) if len(summaries) > 1 else 0,
                "coefficient_of_variation": round(
                    (statistics.stdev([float(s.total_minus_invest) for s in summaries]) / 
                     statistics.mean([float(s.total_minus_invest) for s in summaries]) * 100), 2
                ) if len(summaries) > 1 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing spending patterns: {str(e)}")