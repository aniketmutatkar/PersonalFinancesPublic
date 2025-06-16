# src/services/financial_metrics_service.py

from typing import Dict, Optional
from decimal import Decimal
from datetime import date

from src.repositories.bank_balance_repository import BankBalanceRepository
from src.repositories.portfolio_repository import PortfolioRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository


class FinancialMetricsService:
    """Service for calculating advanced financial metrics like runway, net worth, etc."""
    
    def __init__(
        self,
        bank_repo: BankBalanceRepository,
        portfolio_repo: PortfolioRepository,
        monthly_summary_repo: MonthlySummaryRepository
    ):
        self.bank_repo = bank_repo
        self.portfolio_repo = portfolio_repo
        self.monthly_summary_repo = monthly_summary_repo
    
    def calculate_financial_runway(self) -> Dict:
        """Calculate how many months you can survive with current liquid assets"""
        
        # Get latest bank balances (liquid assets)
        checking_balance = self.bank_repo.get_latest_balance("Wells Fargo Checking")
        savings_balance = self.bank_repo.get_latest_balance("Wells Fargo Savings")
        
        # Get Wealthfront Cash (also liquid)
        wealthfront_cash_account = self.portfolio_repo.get_account_by_name("Wealthfront Cash")
        wealthfront_cash_balance = Decimal('0')
        
        if wealthfront_cash_account:
            latest_balances = self.portfolio_repo.get_latest_balances()
            if wealthfront_cash_account.id in latest_balances:
                wealthfront_cash_balance = latest_balances[wealthfront_cash_account.id].balance_amount
        
        # Calculate total liquid assets
        total_liquid = Decimal('0')
        if checking_balance:
            total_liquid += checking_balance.ending_balance
        if savings_balance:
            total_liquid += savings_balance.ending_balance
        total_liquid += wealthfront_cash_balance
        
        # Estimate monthly expenses (average spending from recent months)
        # Use find_all() and get the most recent summaries
        all_summaries = self.monthly_summary_repo.find_all()
        if all_summaries and len(all_summaries) >= 6:
            # find_all() returns summaries ordered by year DESC, month DESC
            recent_summaries = all_summaries[:6]  # Get the 6 most recent
            monthly_expenses = sum(s.total_minus_invest for s in recent_summaries) / len(recent_summaries)
        elif all_summaries:
            # If we have less than 6 months, use what we have
            monthly_expenses = sum(s.total_minus_invest for s in all_summaries) / len(all_summaries)
        else:
            monthly_expenses = Decimal('5000')  # Default estimate
        
        # Calculate runway
        runway_months = total_liquid / monthly_expenses if monthly_expenses > 0 else 0
        
        return {
            "total_liquid_assets": float(total_liquid),
            "checking_balance": float(checking_balance.ending_balance) if checking_balance else 0,
            "savings_balance": float(savings_balance.ending_balance) if savings_balance else 0,
            "wealthfront_cash": float(wealthfront_cash_balance),
            "monthly_expenses": float(monthly_expenses),
            "runway_months": float(runway_months),
            "runway_status": self._get_runway_status(float(runway_months))
        }
    
    def calculate_net_worth(self) -> Dict:
        """Calculate total net worth (liquid + investments)"""
        
        # Get liquid assets
        runway_data = self.calculate_financial_runway()
        liquid_assets = runway_data["total_liquid_assets"]
        
        # Get investment assets (exclude Wealthfront Cash since it's liquid)
        wealthfront_cash_account = self.portfolio_repo.get_account_by_name("Wealthfront Cash")
        wealthfront_cash_id = wealthfront_cash_account.id if wealthfront_cash_account else None
        
        latest_balances = self.portfolio_repo.get_latest_balances()
        investment_assets = sum(
            float(balance.balance_amount) 
            for account_id, balance in latest_balances.items()
            if account_id != wealthfront_cash_id
        )
        
        total_net_worth = liquid_assets + investment_assets
        liquidity_ratio = liquid_assets / total_net_worth if total_net_worth > 0 else 0
        
        return {
            "total_net_worth": total_net_worth,
            "liquid_assets": liquid_assets,
            "investment_assets": investment_assets,
            "liquidity_ratio": liquidity_ratio,
            "liquidity_status": self._get_liquidity_status(liquidity_ratio)
        }
    
    def _get_runway_status(self, runway_months: float) -> str:
        """Get runway status based on months of coverage"""
        if runway_months >= 12:
            return "Excellent"
        elif runway_months >= 6:
            return "Good"
        elif runway_months >= 3:
            return "Fair"
        else:
            return "Needs Attention"
    
    def _get_liquidity_status(self, liquidity_ratio: float) -> str:
        """Get liquidity status based on liquid vs total assets"""
        if liquidity_ratio >= 0.3:
            return "High Liquidity"
        elif liquidity_ratio >= 0.15:
            return "Good Liquidity"
        elif liquidity_ratio >= 0.05:
            return "Low Liquidity"
        else:
            return "Very Low Liquidity"