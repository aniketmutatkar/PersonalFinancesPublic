# src/api/dependencies.py

from fastapi import Depends
from typing import Generator

from src.repositories.transaction_repository import TransactionRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.repositories.portfolio_repository import PortfolioRepository
from src.services.import_service import ImportService
from src.services.reporting_service import ReportingService
from src.services.portfolio_service import PortfolioService
from src.config.config_manager import ConfigManager
from src.repositories.bank_balance_repository import BankBalanceRepository
from src.services.financial_metrics_service import FinancialMetricsService
from database import get_db_session

# Database session dependency
def get_db():
    """
    Get a database session and ensure it's closed after the request.
    This provides a request-scoped database session.
    """
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()

# Repository dependencies
def get_config_manager():
    """Get the configuration manager"""
    return ConfigManager()

def get_transaction_repository():
    """Get the transaction repository"""
    return TransactionRepository()

def get_monthly_summary_repository():
    """Get the monthly summary repository"""
    return MonthlySummaryRepository()

def get_portfolio_repository():
    """Get the portfolio repository"""
    return PortfolioRepository()

def get_bank_balance_repository() -> BankBalanceRepository:
    """Get bank balance repository instance"""
    return BankBalanceRepository()

def get_financial_metrics_service(
    bank_repo: BankBalanceRepository = Depends(get_bank_balance_repository),
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
) -> FinancialMetricsService:
    """Get financial metrics service with its dependencies"""
    return FinancialMetricsService(bank_repo, portfolio_repo, monthly_summary_repo)

# Service dependencies
def get_import_service(
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository),
    config: ConfigManager = Depends(get_config_manager)
):
    """Get the import service with its dependencies"""
    return ImportService(transaction_repo, monthly_summary_repo, config)

def get_reporting_service(
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """Get the reporting service with its dependencies"""
    return ReportingService(transaction_repo, monthly_summary_repo)

def get_portfolio_service(
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)
):
    """Get the portfolio service with its dependencies"""
    return PortfolioService(portfolio_repo, transaction_repo)