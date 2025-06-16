# src/services/duplicate_detector.py - Monthly-based duplicate detection

from typing import Dict, Optional, List
from datetime import date
from decimal import Decimal
from sqlalchemy import extract, and_
from dataclasses import dataclass

from database import get_db_session, PortfolioBalanceModel, BankBalanceModel


@dataclass
class DuplicateCheckResult:
    """Result of duplicate detection check"""
    is_duplicate: bool
    conflict_type: str
    message: str
    existing_balance: Optional[Dict] = None
    similarity_percentage: float = 0.0
    recommendation: str = ""


class MonthlyDuplicateDetector:
    """Enhanced duplicate detector that checks by month rather than exact date"""
    
    def __init__(self):
        self.similarity_threshold = 0.01  # 1% difference considered "same"
        self.warning_threshold = 0.05     # 5% difference gets warning
    
    def check_monthly_duplicates(
        self, 
        account_id: int, 
        balance_date: date, 
        balance_amount: Decimal,
        exclude_id: Optional[int] = None
    ) -> DuplicateCheckResult:
        """
        Check for duplicate balances in the same month for the same account
        
        Args:
            account_id: The investment account ID
            balance_date: Date of the new balance
            balance_amount: Amount of the new balance
            exclude_id: Optional balance ID to exclude from check (for updates)
            
        Returns:
            DuplicateCheckResult with detailed conflict information
        """
        session = get_db_session()
        
        try:
            # Build query for same account and month
            query = session.query(PortfolioBalanceModel).filter(
                and_(
                    PortfolioBalanceModel.account_id == account_id,
                    extract('year', PortfolioBalanceModel.balance_date) == balance_date.year,
                    extract('month', PortfolioBalanceModel.balance_date) == balance_date.month
                )
            )
            
            # Exclude specific ID if updating
            if exclude_id:
                query = query.filter(PortfolioBalanceModel.id != exclude_id)
            
            existing_balances = query.all()
            
            if not existing_balances:
                return DuplicateCheckResult(
                    is_duplicate=False,
                    conflict_type="none",
                    message="No conflicts detected",
                    recommendation="safe_to_save"
                )
            
            # Check each existing balance for conflicts
            for existing in existing_balances:
                conflict_result = self._analyze_conflict(
                    existing, balance_date, balance_amount
                )
                
                if conflict_result.is_duplicate:
                    return conflict_result
            
            # No conflicts found
            return DuplicateCheckResult(
                is_duplicate=False,
                conflict_type="none", 
                message="No conflicts detected",
                recommendation="safe_to_save"
            )
            
        except Exception as e:
            return DuplicateCheckResult(
                is_duplicate=False,
                conflict_type="error",
                message=f"Error checking duplicates: {str(e)}",
                recommendation="manual_review"
            )
        finally:
            session.close()
    
    def _analyze_conflict(
        self, 
        existing: PortfolioBalanceModel, 
        new_date: date, 
        new_amount: Decimal
    ) -> DuplicateCheckResult:
        """
        Analyze the type and severity of conflict with existing balance
        
        Args:
            existing: Existing balance record
            new_date: Date of new balance
            new_amount: Amount of new balance
            
        Returns:
            DuplicateCheckResult with conflict analysis
        """
        existing_amount = Decimal(str(existing.balance_amount))
        
        # Calculate similarity
        if existing_amount == 0:
            similarity = 1.0 if new_amount == 0 else 0.0
        else:
            amount_diff = abs(existing_amount - new_amount)
            similarity = 1.0 - (amount_diff / existing_amount)
        
        similarity_percentage = similarity * 100
        
        # Prepare existing balance info for response
        existing_info = {
            "id": existing.id,
            "balance_date": existing.balance_date.isoformat(),
            "balance_amount": float(existing_amount),
            "data_source": existing.data_source,
            "notes": existing.notes,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
            "confidence_score": float(existing.confidence_score) if existing.confidence_score else None
        }
        
        # Exact same date
        if existing.balance_date == new_date:
            if similarity >= (1.0 - self.similarity_threshold):
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="exact_duplicate",
                    message=f"Identical balance already exists for {new_date.strftime('%Y-%m-%d')}",
                    existing_balance=existing_info,
                    similarity_percentage=similarity_percentage,
                    recommendation="block_save"
                )
            else:
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="same_date_different_amount",
                    message=f"Different balance exists for same date. Replace ${existing_amount:,.2f} with ${new_amount:,.2f}?",
                    existing_balance=existing_info,
                    similarity_percentage=similarity_percentage,
                    recommendation="require_confirmation"
                )
        
        # Same month, different dates
        else:
            if similarity >= (1.0 - self.similarity_threshold):
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="similar_monthly_balance",
                    message=f"Very similar balance exists for {existing.balance_date.strftime('%Y-%m-%d')} in same month",
                    existing_balance=existing_info,
                    similarity_percentage=similarity_percentage,
                    recommendation="warn_user"
                )
            elif similarity >= (1.0 - self.warning_threshold):
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="monthly_update",
                    message=f"Monthly balance update: {existing.balance_date.strftime('%m/%d')} → {new_date.strftime('%m/%d')}. Replace ${existing_amount:,.2f} with ${new_amount:,.2f}?",
                    existing_balance=existing_info,
                    similarity_percentage=similarity_percentage,
                    recommendation="suggest_update"
                )
            else:
                # Large difference - might be legitimate (different account type, etc.)
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="monthly_large_difference",
                    message=f"Large difference from existing monthly balance. Previous: ${existing_amount:,.2f} ({existing.balance_date.strftime('%m/%d')}), New: ${new_amount:,.2f} ({new_date.strftime('%m/%d')})",
                    existing_balance=existing_info,
                    similarity_percentage=similarity_percentage,
                    recommendation="manual_review"
                )
    
    def check_filename_duplicates(self, filename: str) -> DuplicateCheckResult:
        """
        Check if a PDF with the same filename was already uploaded
        
        Args:
            filename: Original filename of the PDF
            
        Returns:
            DuplicateCheckResult for filename conflicts
        """
        session = get_db_session()
        
        try:
            from database import StatementUploadModel
            
            existing = session.query(StatementUploadModel).filter(
                StatementUploadModel.original_filename == filename
            ).first()
            
            if existing:
                return DuplicateCheckResult(
                    is_duplicate=True,
                    conflict_type="filename_duplicate",
                    message=f"File '{filename}' was already uploaded on {existing.upload_timestamp.strftime('%Y-%m-%d %H:%M')}",
                    existing_balance={
                        "upload_id": existing.id,
                        "upload_date": existing.upload_timestamp.isoformat(),
                        "processing_status": existing.processing_status,
                        "account_id": existing.account_id
                    },
                    recommendation="warn_user"
                )
            
            return DuplicateCheckResult(
                is_duplicate=False,
                conflict_type="none",
                message="Filename is unique",
                recommendation="safe_to_save"
            )
            
        except Exception as e:
            return DuplicateCheckResult(
                is_duplicate=False,
                conflict_type="error",
                message=f"Error checking filename: {str(e)}",
                recommendation="manual_review"
            )
        finally:
            session.close()
    def check_bank_monthly_duplicates(
        self, 
        account_name: str, 
        statement_month: str,
        ending_balance: Decimal,
        statement_date: date,
        exclude_id: Optional[int] = None
    ) -> DuplicateCheckResult:
        """
        Check for duplicate bank balances in the same month for the same account
        Uses same logic as investment duplicates but for bank accounts
        
        Args:
            account_name: The bank account name (e.g., "Wells Fargo Checking")
            statement_month: Month in YYYY-MM format
            ending_balance: Ending balance amount
            statement_date: Exact statement date
            exclude_id: Optional balance ID to exclude from check (for updates)
            
        Returns:
            DuplicateCheckResult with detailed conflict information
        """
        session = get_db_session()
        
        try:
            # Build query for same account and month
            query = session.query(BankBalanceModel).filter(
                BankBalanceModel.account_name == account_name,
                BankBalanceModel.statement_month == statement_month
            )
            
            if exclude_id:
                query = query.filter(BankBalanceModel.id != exclude_id)
            
            existing = query.first()
            
            if not existing:
                return DuplicateCheckResult(
                    is_duplicate=False,
                    conflict_type="no_conflict",
                    message="No duplicate found"
                )
            
            # Found existing record - compare details
            existing_amount = Decimal(str(existing.ending_balance))
            new_amount = ending_balance
            
            # Calculate similarity percentage
            if existing_amount == 0:
                similarity_percentage = 1.0 if new_amount == 0 else 0.0
            else:
                similarity_percentage = 1.0 - abs(float(new_amount - existing_amount)) / float(existing_amount)
            
            # Prepare existing balance info
            existing_info = {
                "id": existing.id,
                "ending_balance": float(existing_amount),
                "statement_date": existing.statement_date.isoformat(),
                "statement_month": existing.statement_month,
                "data_source": existing.data_source,
                "confidence_score": existing.confidence_score
            }
            
            # Same date - check if amounts are identical or similar
            if existing.statement_date == statement_date:
                if abs(existing_amount - new_amount) <= Decimal('0.01'):  # Identical within 1 cent
                    return DuplicateCheckResult(
                        is_duplicate=True,
                        conflict_type="identical_bank_balance",
                        message=f"Identical bank balance already exists for {statement_date.strftime('%Y-%m-%d')}",
                        existing_balance=existing_info,
                        similarity_percentage=1.0,
                        recommendation="auto_skip"
                    )
                else:
                    return DuplicateCheckResult(
                        is_duplicate=True,
                        conflict_type="same_date_different_amount",
                        message=f"Different amount for same date. Existing: ${existing_amount:,.2f}, New: ${new_amount:,.2f}",
                        existing_balance=existing_info,
                        similarity_percentage=similarity_percentage,
                        recommendation="manual_review"
                    )
            
            # Same month, different dates - analyze similarity
            else:
                if similarity_percentage >= 0.99:  # Within 1%
                    return DuplicateCheckResult(
                        is_duplicate=True,
                        conflict_type="similar_bank_balance",
                        message=f"Very similar balance exists for {existing.statement_date.strftime('%Y-%m-%d')} in same month. Replace ${existing_amount:,.2f} with ${new_amount:,.2f}?",
                        existing_balance=existing_info,
                        similarity_percentage=similarity_percentage,
                        recommendation="suggest_update"
                    )
                elif similarity_percentage >= 0.95:  # Within 5%
                    return DuplicateCheckResult(
                        is_duplicate=True,
                        conflict_type="bank_monthly_update",
                        message=f"Monthly update detected: {existing.statement_date.strftime('%m/%d')} → {statement_date.strftime('%m/%d')}. Replace ${existing_amount:,.2f} with ${new_amount:,.2f}?",
                        existing_balance=existing_info,
                        similarity_percentage=similarity_percentage,
                        recommendation="manual_review"
                    )
                else:
                    return DuplicateCheckResult(
                        is_duplicate=True,
                        conflict_type="bank_large_difference",
                        message=f"Large difference from existing monthly balance. Previous: ${existing_amount:,.2f} ({existing.statement_date.strftime('%m/%d')}), New: ${new_amount:,.2f} ({statement_date.strftime('%m/%d')})",
                        existing_balance=existing_info,
                        similarity_percentage=similarity_percentage,
                        recommendation="manual_review"
                    )
        finally:
            session.close()


def check_monthly_duplicates(account_id: int, balance_date: date, balance_amount: Decimal) -> DuplicateCheckResult:
    """
    Convenience function to check for monthly duplicates
    
    Args:
        account_id: The investment account ID
        balance_date: Date of the new balance
        balance_amount: Amount of the new balance
        
    Returns:
        DuplicateCheckResult with conflict information
    """
    detector = MonthlyDuplicateDetector()
    return detector.check_monthly_duplicates(account_id, balance_date, balance_amount)


def check_filename_duplicates(filename: str) -> DuplicateCheckResult:
    """
    Convenience function to check for filename duplicates
    
    Args:
        filename: Original filename of the PDF
        
    Returns:
        DuplicateCheckResult for filename conflicts
    """
    detector = MonthlyDuplicateDetector()
    return detector.check_filename_duplicates(filename)

def check_bank_monthly_duplicates(account_name: str, statement_month: str, ending_balance: Decimal, statement_date: date) -> DuplicateCheckResult:
    """
    Convenience function to check for bank monthly duplicates
    
    Args:
        account_name: The bank account name
        statement_month: Month in YYYY-MM format  
        ending_balance: Ending balance amount
        statement_date: Exact statement date
        
    Returns:
        DuplicateCheckResult with conflict information
    """
    detector = MonthlyDuplicateDetector()
    return detector.check_bank_monthly_duplicates(account_name, statement_month, ending_balance, statement_date)