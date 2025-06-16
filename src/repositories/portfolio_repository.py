# src/repositories/portfolio_repository.py
"""
Portfolio repository for database operations.
SECURITY UPDATE STEP 2: Removed raw_extracted_text handling to protect sensitive OCR data.
"""

from typing import List, Dict, Set, Tuple, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import text

from src.models.portfolio_models import (
    InvestmentAccount, PortfolioBalance, StatementUpload, 
    AccountType, DataSource
)
from database import (
    get_db_session, InvestmentAccountModel, 
    PortfolioBalanceModel, StatementUploadModel
)


class PortfolioRepository:
    """Repository for portfolio database operations"""
    
    def get_account_by_name(self, account_name: str) -> Optional[InvestmentAccount]:
        """Find an investment account by name"""
        session = get_db_session()
        
        try:
            account_model = session.query(InvestmentAccountModel).filter(
                InvestmentAccountModel.account_name == account_name
            ).first()
            
            if not account_model:
                return None
            
            return self._map_account_to_domain(account_model)
        finally:
            session.close()
    
    def get_account_by_id(self, account_id: int) -> Optional[InvestmentAccount]:
        """Find an investment account by ID"""
        session = get_db_session()
        
        try:
            account_model = session.query(InvestmentAccountModel).filter(
                InvestmentAccountModel.id == account_id
            ).first()
            
            if not account_model:
                return None
            
            return self._map_account_to_domain(account_model)
        finally:
            session.close()
    
    def get_all_accounts(self, active_only: bool = True) -> List[InvestmentAccount]:
        """Get all investment accounts"""
        session = get_db_session()
        
        try:
            query = session.query(InvestmentAccountModel)
            if active_only:
                query = query.filter(InvestmentAccountModel.is_active == True)
            
            account_models = query.all()
            
            return [self._map_account_to_domain(model) for model in account_models]
        finally:
            session.close()
    
    def get_balances_for_account(
        self, 
        account_id: int, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> List[PortfolioBalance]:
        """Get balance history for a specific account"""
        session = get_db_session()
        
        try:
            query = session.query(PortfolioBalanceModel).filter(
                PortfolioBalanceModel.account_id == account_id
            )
            
            if start_date:
                query = query.filter(PortfolioBalanceModel.balance_date >= start_date)
            if end_date:
                query = query.filter(PortfolioBalanceModel.balance_date <= end_date)
            
            balance_models = query.order_by(PortfolioBalanceModel.balance_date.asc()).all()
            
            return [self._map_balance_to_domain(model) for model in balance_models]
        finally:
            session.close()
    
    def save_balance(self, balance: PortfolioBalance) -> PortfolioBalance:
        """Save a portfolio balance entry"""
        session = get_db_session()
        
        try:
            # Convert to database model
            balance_model = PortfolioBalanceModel(
                account_id=balance.account_id,
                balance_date=balance.balance_date,
                balance_amount=float(balance.balance_amount),
                data_source=balance.data_source.value,
                confidence_score=float(balance.confidence_score),
                notes=balance.notes
            )
            
            session.add(balance_model)
            session.commit()
            
            # Update domain object with generated ID
            balance.id = balance_model.id
            balance.created_at = balance_model.created_at.date() if balance_model.created_at else None
            
            return balance
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    def get_latest_balances(self) -> Dict[int, PortfolioBalance]:
        """
        Get the latest balance for each account
        
        Returns:
            Dictionary mapping account_id to latest PortfolioBalance
        """
        session = get_db_session()
        
        try:
            # Get all accounts
            accounts = session.query(InvestmentAccountModel).filter(
                InvestmentAccountModel.is_active == True
            ).all()
            
            latest_balances = {}
            
            for account in accounts:
                # Get the most recent balance for this account
                latest_balance_model = session.query(PortfolioBalanceModel).filter(
                    PortfolioBalanceModel.account_id == account.id
                ).order_by(PortfolioBalanceModel.balance_date.desc()).first()
                
                if latest_balance_model:
                    latest_balances[account.id] = self._map_balance_to_domain(latest_balance_model)
            
            return latest_balances
        finally:
            session.close()

    def _map_account_to_domain(self, model: InvestmentAccountModel) -> InvestmentAccount:
        """Map database model to domain entity"""
        return InvestmentAccount(
            id=model.id,
            account_name=model.account_name,
            institution=model.institution,
            account_type=AccountType(model.account_type),
            is_active=model.is_active,
            created_at=model.created_at.date() if model.created_at else None
        )
    
    def _map_balance_to_domain(self, model: PortfolioBalanceModel) -> PortfolioBalance:
        """Map database model to domain entity"""
        return PortfolioBalance(
            id=model.id,
            account_id=model.account_id,
            balance_date=model.balance_date,
            balance_amount=Decimal(str(model.balance_amount)),
            data_source=DataSource(model.data_source),
            confidence_score=Decimal(str(model.confidence_score)),
            notes=model.notes,
            created_at=model.created_at.date() if model.created_at else None
        )
    
    def save_statement_upload(self, statement: StatementUpload) -> StatementUpload:
        """
        Save statement upload record to database
        SECURITY UPDATE STEP 2: No longer stores raw_extracted_text
        """
        session = get_db_session()
        
        try:
            statement_model = StatementUploadModel(
                account_id=statement.account_id,
                statement_date=statement.statement_date,
                original_filename=statement.original_filename,
                file_path=statement.file_path,
                relevant_page_number=statement.relevant_page_number,
                page_pdf_path=statement.page_pdf_path,
                total_pages=statement.total_pages,
                extracted_balance=float(statement.extracted_balance) if statement.extracted_balance else None,
                confidence_score=float(statement.confidence_score),
                requires_review=statement.requires_review,
                reviewed_by_user=statement.reviewed_by_user,
                processing_status=statement.processing_status,
                processing_error=statement.processing_error,
                processed_timestamp=statement.processed_timestamp
            )
            
            session.add(statement_model)
            session.flush()  # Get the ID
            session.commit()
            
            # Update domain object with generated ID
            statement.id = statement_model.id
            statement.upload_timestamp = statement_model.upload_timestamp.date() if statement_model.upload_timestamp else None
            
            return statement
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_statement_upload(self, statement_id: int) -> Optional[StatementUpload]:
        """
        Get statement upload by ID
        SECURITY UPDATE STEP 2: No longer retrieves raw_extracted_text
        """
        session = get_db_session()
        
        try:
            model = session.query(StatementUploadModel).filter(
                StatementUploadModel.id == statement_id
            ).first()
            
            if not model:
                return None
            
            return StatementUpload(
                id=model.id,
                account_id=model.account_id,
                statement_date=model.statement_date,
                original_filename=model.original_filename,
                file_path=model.file_path,
                relevant_page_number=model.relevant_page_number or 1,
                page_pdf_path=model.page_pdf_path,
                total_pages=model.total_pages or 1,
                extracted_balance=Decimal(str(model.extracted_balance)) if model.extracted_balance else None,
                confidence_score=Decimal(str(model.confidence_score)) if model.confidence_score else Decimal('0'),
                requires_review=model.requires_review or False,
                reviewed_by_user=model.reviewed_by_user or False,
                processing_status=model.processing_status or 'pending',
                processing_error=model.processing_error,
                upload_timestamp=model.upload_timestamp.date() if model.upload_timestamp else None,
                processed_timestamp=model.processed_timestamp.date() if model.processed_timestamp else None
            )
        finally:
            session.close()
    
    def mark_statement_reviewed(self, statement_id: int, reviewed_by_user: bool = True):
        """Mark statement as reviewed"""
        session = get_db_session()
        
        try:
            statement = session.query(StatementUploadModel).filter(
                StatementUploadModel.id == statement_id
            ).first()
            
            if statement:
                statement.reviewed_by_user = reviewed_by_user
                if reviewed_by_user:
                    statement.processing_status = 'saved'
                session.commit()
                
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()