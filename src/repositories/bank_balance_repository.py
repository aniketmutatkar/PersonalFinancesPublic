# src/repositories/bank_balance_repository.py
"""
Bank balance repository for database operations.
SECURITY UPDATE: Removed account_number handling to protect sensitive data.
"""

from typing import List, Optional
from datetime import date
from decimal import Decimal

from src.models.portfolio_models import BankBalance
from database import get_db_session, BankBalanceModel


class BankBalanceRepository:
    """Repository for bank balance database operations"""
    
    def save(self, bank_balance: BankBalance) -> BankBalance:
        """Save or update a bank balance entry"""
        session = get_db_session()
        
        try:
            # Check if balance already exists for this account and month
            existing = session.query(BankBalanceModel).filter(
                BankBalanceModel.account_name == bank_balance.account_name,
                BankBalanceModel.statement_month == bank_balance.statement_month
            ).first()
            
            if existing:
                # Update existing balance
                existing.beginning_balance = float(bank_balance.beginning_balance)
                existing.ending_balance = float(bank_balance.ending_balance)
                existing.deposits_additions = float(bank_balance.deposits_additions) if bank_balance.deposits_additions else None
                existing.withdrawals_subtractions = float(bank_balance.withdrawals_subtractions) if bank_balance.withdrawals_subtractions else None
                existing.statement_date = bank_balance.statement_date
                existing.data_source = bank_balance.data_source
                existing.confidence_score = float(bank_balance.confidence_score)
                existing.notes = bank_balance.notes
                
                session.commit()
                bank_balance.id = existing.id
            else:
                # Insert new balance
                balance_model = BankBalanceModel(
                    account_name=bank_balance.account_name,
                    statement_month=bank_balance.statement_month,
                    beginning_balance=float(bank_balance.beginning_balance),
                    ending_balance=float(bank_balance.ending_balance),
                    deposits_additions=float(bank_balance.deposits_additions) if bank_balance.deposits_additions else None,
                    withdrawals_subtractions=float(bank_balance.withdrawals_subtractions) if bank_balance.withdrawals_subtractions else None,
                    statement_date=bank_balance.statement_date,
                    data_source=bank_balance.data_source,
                    confidence_score=float(bank_balance.confidence_score),
                    notes=bank_balance.notes
                )
                
                session.add(balance_model)
                session.commit()
                bank_balance.id = balance_model.id
                
            return bank_balance
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_all_balances(self) -> List[BankBalance]:
        """Get all bank balances ordered by date"""
        session = get_db_session()
        
        try:
            balance_models = session.query(BankBalanceModel).order_by(
                BankBalanceModel.statement_date.desc()
            ).all()
            
            return [self._map_to_domain(model) for model in balance_models]
        finally:
            session.close()
    
    def get_latest_balance(self, account_name: str) -> Optional[BankBalance]:
        """Get the most recent balance for a specific account"""
        session = get_db_session()
        
        try:
            balance_model = session.query(BankBalanceModel).filter(
                BankBalanceModel.account_name == account_name
            ).order_by(BankBalanceModel.statement_date.desc()).first()
            
            return self._map_to_domain(balance_model) if balance_model else None
        finally:
            session.close()
    
    def bulk_insert_balances(self, balances: List[BankBalance]) -> int:
        """Bulk insert bank balances, skipping duplicates"""
        if not balances:
            return 0
        
        session = get_db_session()
        records_inserted = 0
        
        try:
            for balance in balances:
                try:
                    # Check if balance already exists
                    existing = session.query(BankBalanceModel).filter(
                        BankBalanceModel.account_name == balance.account_name,
                        BankBalanceModel.statement_month == balance.statement_month
                    ).first()
                    
                    if existing:
                        continue  # Skip duplicate
                    
                    # Insert new balance
                    balance_model = BankBalanceModel(
                        account_name=balance.account_name,
                        statement_month=balance.statement_month,
                        beginning_balance=float(balance.beginning_balance),
                        ending_balance=float(balance.ending_balance),
                        deposits_additions=float(balance.deposits_additions) if balance.deposits_additions else None,
                        withdrawals_subtractions=float(balance.withdrawals_subtractions) if balance.withdrawals_subtractions else None,
                        statement_date=balance.statement_date,
                        data_source=balance.data_source,
                        confidence_score=float(balance.confidence_score),
                        notes=balance.notes
                    )
                    
                    session.add(balance_model)
                    records_inserted += 1
                    
                except Exception as e:
                    print(f"Error inserting balance for {balance.account_name}: {e}")
                    continue
            
            session.commit()
            return records_inserted
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def _map_to_domain(self, model: BankBalanceModel) -> BankBalance:
        """Map database model to domain entity"""
        return BankBalance(
            id=model.id,
            account_name=model.account_name,
            statement_month=model.statement_month,
            beginning_balance=Decimal(str(model.beginning_balance)),
            ending_balance=Decimal(str(model.ending_balance)),
            deposits_additions=Decimal(str(model.deposits_additions)) if model.deposits_additions else None,
            withdrawals_subtractions=Decimal(str(model.withdrawals_subtractions)) if model.withdrawals_subtractions else None,
            statement_date=model.statement_date,
            data_source=model.data_source,
            confidence_score=Decimal(str(model.confidence_score)),
            notes=model.notes,
            created_at=model.created_at.date() if model.created_at else None
        )