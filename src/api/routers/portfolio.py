# src/api/routers/portfolio.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from datetime import date
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, validator
from typing import Optional, Dict
from src.models.portfolio_models import PortfolioBalance, DataSource
import os
import re
import uuid
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.api.dependencies import get_portfolio_service, get_portfolio_repository, get_bank_balance_repository
from src.services.portfolio_service import PortfolioService
from src.repositories.portfolio_repository import PortfolioRepository
from src.repositories.bank_balance_repository import BankBalanceRepository  # ADD THIS IMPORT
from src.services.duplicate_detector import MonthlyDuplicateDetector, DuplicateCheckResult
from src.models.portfolio_models import StatementUpload, BankBalance, DataSource
from src.services.pdf_processor import PDFProcessor
from src.services.statement_parser import StatementParser
from database import get_db_session, StatementUploadModel

router = APIRouter()

class AccountPerformanceResponse(BaseModel):
    account_id: int
    account_name: str
    institution: str
    account_type: str
    start_balance: float
    end_balance: float
    net_deposits: float
    actual_growth: float
    growth_percentage: float
    annualized_return: float
    period_months: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": 1,
                "account_name": "401(k) Plan",
                "institution": "ADP",
                "account_type": "401k",
                "start_balance": 200.01,
                "end_balance": 15000.00,
                "net_deposits": 12000.00,
                "actual_growth": 2800.00,
                "growth_percentage": 23.33,
                "annualized_return": 8.5,
                "period_months": 48
            }
        }

class InstitutionSummaryResponse(BaseModel):
    institution: str
    total_balance: float
    total_growth: float
    growth_percentage: float
    account_count: int
    account_names: List[str]

class AccountTypeSummaryResponse(BaseModel):
    account_type: str
    total_balance: float
    total_growth: float
    growth_percentage: float
    account_count: int
    account_names: List[str]

class PortfolioOverviewResponse(BaseModel):
    total_portfolio_value: float
    total_deposits: float
    total_growth: float
    growth_percentage: float
    accounts: List[AccountPerformanceResponse]
    by_institution: List[InstitutionSummaryResponse]
    by_account_type: List[AccountTypeSummaryResponse]
    as_of_date: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_portfolio_value": 95000.00,
                "total_deposits": 80000.00,
                "total_growth": 15000.00,
                "growth_percentage": 18.75,
                "accounts": [],
                "by_institution": [],
                "by_account_type": [],
                "as_of_date": "2024-06-06"
            }
        }

class PortfolioTrendsResponse(BaseModel):
    monthly_values: List[Dict]
    growth_attribution: Dict[str, float]
    best_month: Optional[Dict]
    worst_month: Optional[Dict]
    
    class Config:
        json_schema_extra = {
            "example": {
                "monthly_values": [
                    {
                        "date": "2024-01-01",
                        "month_display": "Jan 2024",
                        "total_value": 90000.00,
                        "wealthfront_investment": 25000.00,
                        "schwab_brokerage": 30000.00
                    }
                ],
                "growth_attribution": {},
                "best_month": {
                    "month_display": "May 2024",
                    "total_value": 95000.00
                },
                "worst_month": {
                    "month_display": "Jan 2024", 
                    "total_value": 85000.00
                }
            }
        }

class AccountListResponse(BaseModel):
    accounts: List[Dict]
    total_accounts: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "accounts": [
                    {
                        "id": 1,
                        "account_name": "Wealthfront Investment",
                        "institution": "Wealthfront",
                        "account_type": "brokerage",
                        "is_active": True
                    }
                ],
                "total_accounts": 7
            }
        }

class ManualBalanceRequest(BaseModel):
    account_id: int
    balance_date: str  # YYYY-MM-DD format
    balance_amount: float
    notes: Optional[str] = None
    
    @validator('balance_amount')
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError('Balance amount cannot be negative')
        return v
    
    @validator('balance_date')
    def validate_date(cls, v):
        try:
            balance_date = datetime.strptime(v, '%Y-%m-%d').date()
            if balance_date > date.today():
                raise ValueError('Balance date cannot be in the future')
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')

class BalanceConflictResponse(BaseModel):
    has_conflict: bool
    existing_balance: Optional[Dict] = None
    conflict_type: Optional[str] = None  # "csv_import", "manual", "pdf_statement"
    message: Optional[str] = None

class ManualBalanceSuccessResponse(BaseModel):
    success: bool
    balance: Dict
    message: str

class StatementUploadResponse(BaseModel):
    statement_id: int  # NEW: Always save to statement_uploads first
    extracted_data: Dict
    confidence_score: float
    relevant_page: int  # NEW: Which page has the data
    total_pages: int    # NEW: Total pages in PDF
    requires_review: bool
    message: str
    can_quick_save: bool
    duplicate_check: Optional[Dict] = None

class StatementReviewRequest(BaseModel):
    account_id: int
    balance_date: str  # YYYY-MM-DD
    balance_amount: float
    notes: Optional[str] = None
    
class QuickSaveRequest(BaseModel):
    confirm_duplicates: bool = False  # If user wants to override duplicates

@router.get("/overview", response_model=PortfolioOverviewResponse)
async def get_portfolio_overview(
    as_of_date: Optional[date] = Query(None, description="Portfolio value as of date (YYYY-MM-DD)"),
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get complete portfolio overview with real performance metrics
    
    Returns current portfolio value, growth, and performance by account, institution, and type.
    """
    try:
        overview = portfolio_service.get_portfolio_overview(as_of_date)
        
        # Convert to response format
        return PortfolioOverviewResponse(
            total_portfolio_value=float(overview.total_portfolio_value),
            total_deposits=float(overview.total_deposits),
            total_growth=float(overview.total_growth),
            growth_percentage=float(overview.growth_percentage),
            accounts=[
                AccountPerformanceResponse(
                    account_id=acc.account_id,
                    account_name=acc.account_name,
                    institution=acc.institution,
                    account_type=acc.account_type.value,
                    start_balance=float(acc.start_balance),
                    end_balance=float(acc.end_balance),
                    net_deposits=float(acc.net_deposits),
                    actual_growth=float(acc.actual_growth),
                    growth_percentage=float(acc.growth_percentage),
                    annualized_return=float(acc.annualized_return),
                    period_months=acc.period_months
                ) for acc in overview.accounts
            ],
            by_institution=[
                InstitutionSummaryResponse(
                    institution=inst.institution,
                    total_balance=float(inst.total_balance),
                    total_growth=float(inst.total_growth),
                    growth_percentage=float(inst.growth_percentage),
                    account_count=inst.account_count,
                    account_names=inst.account_names
                ) for inst in overview.by_institution
            ],
            by_account_type=[
                AccountTypeSummaryResponse(
                    account_type=acc_type.account_type.value,
                    total_balance=float(acc_type.total_balance),
                    total_growth=float(acc_type.total_growth),
                    growth_percentage=float(acc_type.growth_percentage),
                    account_count=acc_type.account_count,
                    account_names=acc_type.account_names
                ) for acc_type in overview.by_account_type
            ],
            as_of_date=overview.as_of_date.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating portfolio overview: {str(e)}")


@router.get("/performance/{account_id}", response_model=AccountPerformanceResponse)
async def get_account_performance(
    account_id: int,
    period: str = Query("1y", description="Time period: 1y, 2y, 5y, all"),
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get detailed performance metrics for a specific account
    
    Returns ROI, growth attribution, and performance over the specified period.
    """
    try:
        # Calculate date range
        end_date = date.today()
        if period == "1y":
            start_date = date(end_date.year - 1, end_date.month, end_date.day)
        elif period == "2y":
            start_date = date(end_date.year - 2, end_date.month, end_date.day)
        elif period == "5y":
            start_date = date(end_date.year - 5, end_date.month, end_date.day)
        else:  # "all"
            start_date = date(2020, 1, 1)
        
        performance = portfolio_service.calculate_account_performance(
            account_id, start_date, end_date
        )
        
        if not performance:
            raise HTTPException(
                status_code=404, 
                detail=f"No performance data found for account {account_id}"
            )
        
        return AccountPerformanceResponse(
            account_id=performance.account_id,
            account_name=performance.account_name,
            institution=performance.institution,
            account_type=performance.account_type.value,
            start_balance=float(performance.start_balance),
            end_balance=float(performance.end_balance),
            net_deposits=float(performance.net_deposits),
            actual_growth=float(performance.actual_growth),
            growth_percentage=float(performance.growth_percentage),
            annualized_return=float(performance.annualized_return),
            period_months=performance.period_months
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating account performance: {str(e)}")


@router.get("/trends", response_model=PortfolioTrendsResponse)
async def get_portfolio_trends(
    period: str = Query("1y", description="Time period: 1y, 2y, 5y, all"),
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get portfolio value trends over time
    
    Returns monthly portfolio values and growth attribution data for charting.
    """
    try:
        trends = portfolio_service.get_portfolio_trends(period)
        
        return PortfolioTrendsResponse(
            monthly_values=trends.monthly_values,
            growth_attribution={k: float(v) for k, v in trends.growth_attribution.items()},
            best_month=trends.best_month,
            worst_month=trends.worst_month
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating portfolio trends: {str(e)}")


@router.get("/accounts", response_model=AccountListResponse)
async def get_all_accounts(
    active_only: bool = Query(True, description="Return only active accounts"),
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Get list of all investment accounts
    
    Returns account details including name, institution, and type.
    """
    try:
        accounts = portfolio_repo.get_all_accounts(active_only=active_only)
        
        account_data = []
        for account in accounts:
            account_data.append({
                "id": account.id,
                "account_name": account.account_name,
                "institution": account.institution,
                "account_type": account.account_type.value,
                "is_active": account.is_active
            })
        
        return AccountListResponse(
            accounts=account_data,
            total_accounts=len(account_data)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving accounts: {str(e)}")


@router.get("/institutions")
async def get_institution_breakdown(
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get performance breakdown by institution
    
    Returns aggregated performance data grouped by financial institution.
    """
    try:
        overview = portfolio_service.get_portfolio_overview()
        
        return {
            "institutions": [
                {
                    "institution": inst.institution,
                    "total_balance": float(inst.total_balance),
                    "total_growth": float(inst.total_growth),
                    "growth_percentage": float(inst.growth_percentage),
                    "account_count": inst.account_count,
                    "account_names": inst.account_names
                } for inst in overview.by_institution
            ],
            "total_institutions": len(overview.by_institution)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating institution breakdown: {str(e)}")
    
@router.post("/balances")
async def add_manual_balance(
    balance_request: ManualBalanceRequest,
    force_override: bool = Query(False, description="Force override existing balance"),
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Add manual balance entry with duplicate detection and conflict resolution
    """
    try:
        # Convert string date to date object
        balance_date = datetime.strptime(balance_request.balance_date, '%Y-%m-%d').date()
        
        # Check if account exists
        account = portfolio_repo.get_account_by_id(balance_request.account_id)
        if not account:
            raise HTTPException(status_code=404, detail=f"Account {balance_request.account_id} not found")
        
        # Check for existing balance
        existing = portfolio_repo.check_balance_exists(balance_request.account_id, balance_date)
        
        if existing and not force_override:
            # Return conflict information for frontend to handle
            return BalanceConflictResponse(
                has_conflict=True,
                existing_balance={
                    "id": existing.id,
                    "balance_amount": float(existing.balance_amount),
                    "data_source": existing.data_source.value,
                    "notes": existing.notes,
                    "created_at": existing.created_at.isoformat() if existing.created_at else None
                },
                conflict_type=existing.data_source.value,
                message=f"Balance already exists for {account.account_name} on {balance_date}. "
                       f"Existing balance: ${existing.balance_amount:,.2f} ({existing.data_source.value})"
            )
        
        # Create new balance
        new_balance = PortfolioBalance(
            account_id=balance_request.account_id,
            balance_date=balance_date,
            balance_amount=Decimal(str(balance_request.balance_amount)),
            data_source=DataSource.MANUAL,
            notes=balance_request.notes
        )
        
        # Save balance (will update if exists due to repository logic)
        saved_balance = portfolio_repo.save_balance(new_balance)
        
        return ManualBalanceSuccessResponse(
            success=True,
            balance={
                "id": saved_balance.id,
                "account_id": saved_balance.account_id,
                "balance_date": saved_balance.balance_date.isoformat(),
                "balance_amount": float(saved_balance.balance_amount),
                "data_source": saved_balance.data_source.value,
                "notes": saved_balance.notes,
                "account_name": account.account_name
            },
            message=f"Successfully {'updated' if existing else 'added'} balance for {account.account_name}"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding manual balance: {str(e)}")
    
# Storage configuration
UPLOAD_BASE_DIR = "uploaded_statements"
SINGLE_PAGE_DIR = "single_pages"

def ensure_upload_directories():
    """Ensure upload directories exist"""
    os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_BASE_DIR, SINGLE_PAGE_DIR), exist_ok=True)
    
def match_account_intelligently(statement_data, all_accounts):
    """
    Enhanced account matching based on institution AND account type
    """
    if not statement_data.institution:
        return None, []
    
    institution = statement_data.institution.lower()
    account_type = (statement_data.account_type or "").lower()
    
    print(f"🎯 Matching account for: {institution} - {account_type}")
    
    # Define specific matching rules based on our patterns
    matching_rules = [
        # Schwab Roth - must come FIRST (more specific)
        {
            'institution': 'schwab',
            'account_type_keywords': ['roth ira', 'roth contributory ira', 'contributory ira'],
            'target_name': 'roth ira'
        },
        # Schwab Brokerage - less specific, comes after
        {
            'institution': 'schwab',
            'account_type_keywords': ['schwab one account', 'brokerage', 'investment account'],
            'target_name': 'schwab brokerage'
        },
        # Wealthfront rules
        {
            'institution': 'wealthfront',
            'account_type_keywords': ['individual investment account', 'investment'],
            'target_name': 'wealthfront investment'
        },
        {
            'institution': 'wealthfront', 
            'account_type_keywords': ['cash account', 'savings', 'cash'],
            'target_name': 'wealthfront cash'
        },
        # Other institutions (simple matching)
        {
            'institution': 'acorns',
            'account_type_keywords': [],  # Any account type
            'target_name': 'acorns'
        },
        {
            'institution': 'robinhood',
            'account_type_keywords': [],
            'target_name': 'robinhood'
        }
    ]
    
    # Try rule-based matching first
    for rule in matching_rules:
        if rule['institution'] in institution:
            # If no specific account type rules, match by institution only
            if not rule['account_type_keywords']:
                for account in all_accounts:
                    if rule['target_name'] in account.account_name.lower():
                        print(f"✅ Rule match: {account.account_name} (institution-only)")
                        return account, []
            else:
                # Check if account type matches any keywords
                for keyword in rule['account_type_keywords']:
                    if keyword in account_type:
                        for account in all_accounts:
                            if rule['target_name'] in account.account_name.lower():
                                print(f"✅ Rule match: {account.account_name} (type: {keyword})")
                                return account, []
    
    # Fallback: Try institution-only matching for exact matches
    exact_matches = []
    partial_matches = []
    
    for account in all_accounts:
        account_name_lower = account.account_name.lower()
        account_institution_lower = account.institution.lower()
        
        # Exact institution match
        if institution == account_institution_lower:
            exact_matches.append(account)
        # Partial institution match
        elif institution in account_institution_lower or account_institution_lower in institution:
            partial_matches.append(account)
    
    # Return best match
    if len(exact_matches) == 1:
        print(f"✅ Exact institution match: {exact_matches[0].account_name}")
        return exact_matches[0], []
    elif exact_matches:
        print(f"⚠️ Multiple exact matches found: {[acc.account_name for acc in exact_matches]}")
        return exact_matches[0], exact_matches[1:]  # Return first as match, rest as suggestions
    elif partial_matches:
        print(f"⚠️ Partial matches found: {[acc.account_name for acc in partial_matches]}")
        return None, partial_matches
    
    print(f"❌ No matches found for {institution}")
    return None, []

@router.post("/bank-statements/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    allow_update: bool = Form(False), 
    bank_repo: BankBalanceRepository = Depends(get_bank_balance_repository)
):
    """
    Upload Wells Fargo bank statement PDF for OCR processing
    FIXED: Now uses Wells Fargo-specific page detection to target summary page
    """
    try:
        # Validate file
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported for bank statements")
        
        ensure_upload_directories()
        
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"bank_{timestamp}_{unique_id}_{file.filename}"
        full_pdf_path = os.path.join(UPLOAD_BASE_DIR, safe_filename)
        
        # Save full PDF
        with open(full_pdf_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"📄 Saved bank statement PDF: {full_pdf_path}")
        
        pdf_processor = PDFProcessor()
        
        extracted_text, extraction_confidence, relevant_page, total_pages = pdf_processor.extract_wells_fargo_bank_statement(full_pdf_path)
        
        
        if not extracted_text or extraction_confidence < 0.2:
            return {
                "success": False,
                "message": "OCR extraction failed or very low confidence",
                "confidence_score": extraction_confidence,
                "total_pages": total_pages
            }
        
        parser = StatementParser()
        statement_data = parser.parse_statement(extracted_text)
        
        print(f"🏦 Bank parsing results: institution={statement_data.institution}, confidence={statement_data.confidence_score:.2f}")
        
        if statement_data.institution != 'wells_fargo':
            return {
                "success": False,
                "message": f"Detected institution '{statement_data.institution}' is not Wells Fargo. Only Wells Fargo bank statements are supported.",
                "detected_institution": statement_data.institution
            }
        
        if statement_data.confidence_score < 0.5:
            return {
                "success": False,
                "message": "Could not reliably extract bank statement data",
                "confidence_score": statement_data.confidence_score,
                "extraction_notes": statement_data.extraction_notes
            }
        
        deposits_amount = None
        withdrawals_amount = None
        
        # Re-extract these specific values for BankBalance model
        deposits_match = re.search(r'deposits/additions\s+\$?([\d,]+\.?\d*)', extracted_text, re.IGNORECASE)
        if deposits_match:
            deposits_amount = Decimal(deposits_match.group(1).replace(',', ''))
        
        withdrawals_match = re.search(r'withdrawals/subtractions\s*-?\s*\$?([\d,]+\.?\d*)', extracted_text, re.IGNORECASE)
        if withdrawals_match:
            withdrawals_amount = Decimal(withdrawals_match.group(1).replace(',', ''))
        
        statement_date = statement_data.statement_date or statement_data.statement_period_end

        if not all([statement_data.beginning_balance, statement_data.ending_balance, statement_date]):
            return {
                "success": False,
                "message": "Missing required balance data (beginning balance, ending balance, or statement date)",
                "extracted_data": {
                    "beginning_balance": float(statement_data.beginning_balance) if statement_data.beginning_balance else None,
                    "ending_balance": float(statement_data.ending_balance) if statement_data.ending_balance else None,
                    "statement_date": statement_date.isoformat() if statement_date else None
                }
            }

        # Create statement month in YYYY-MM format
        statement_month = statement_date.strftime("%Y-%m")

        bank_balance = BankBalance(
            account_name="Wells Fargo Checking",  # FIXED: Use consistent account name
            statement_month=statement_month,
            beginning_balance=statement_data.beginning_balance,
            ending_balance=statement_data.ending_balance,
            deposits_additions=deposits_amount,
            withdrawals_subtractions=withdrawals_amount,
            statement_date=statement_date,  # FIXED: Use the correct date
            data_source="pdf_statement",
            confidence_score=Decimal(str(statement_data.confidence_score)),
            notes=f"Auto-extracted from {file.filename}"
        )

        duplicate_detector = MonthlyDuplicateDetector()
        
        try:
            saved_balance = bank_repo.save(bank_balance, allow_update=False)
        except ValueError as e:
            # This is a duplicate detection error - handle gracefully
            if "duplicate" in str(e).lower():
                # Re-run the duplicate detector to get detailed info
                duplicate_result = duplicate_detector.check_bank_monthly_duplicates(
                    "Wells Fargo Checking",
                    statement_month,
                    Decimal(str(statement_data.ending_balance)), 
                    statement_date
                )
                
                # Return structured duplicate response for frontend
                return {
                    "success": False,
                    "duplicate_detected": True,
                    "conflict_type": duplicate_result.conflict_type,
                    "message": duplicate_result.message,
                    "recommendation": duplicate_result.recommendation,
                    "similarity_percentage": duplicate_result.similarity_percentage,
                    "existing_balance": duplicate_result.existing_balance,
                    "extracted_balance": {
                        "statement_month": statement_month,
                        "ending_balance": float(statement_data.ending_balance),
                        "statement_date": statement_date.isoformat(),
                        "data_source": "pdf_statement",
                        "confidence_score": float(statement_data.confidence_score)
                    },
                    "options": {
                        "can_skip": duplicate_result.recommendation == "auto_skip",
                        "can_update": duplicate_result.recommendation in ["suggest_update", "manual_review"],
                        "requires_review": duplicate_result.recommendation == "manual_review"
                    }
                }
            else:
                # Other ValueError (validation errors)
                raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            # Unexpected database errors
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        print(f"💾 Saved bank balance: {saved_balance.account_name} {saved_balance.statement_month}")
        
        return {
            "success": True,
            "message": "Bank statement processed successfully",
            "bank_balance": {
                "id": saved_balance.id, 
                "account_name": saved_balance.account_name,
                "statement_month": saved_balance.statement_month,
                "statement_date": saved_balance.statement_date.isoformat(),
                "beginning_balance": float(saved_balance.beginning_balance),
                "ending_balance": float(saved_balance.ending_balance),
                "deposits_additions": float(saved_balance.deposits_additions) if saved_balance.deposits_additions else None,
                "withdrawals_subtractions": float(saved_balance.withdrawals_subtractions) if saved_balance.withdrawals_subtractions else None,
            },
            "parsing_confidence": float(statement_data.confidence_score),
            "extraction_notes": [
                f"Extracted from page {relevant_page} of {total_pages}",
                f"OCR confidence: {extraction_confidence:.1%}",
                f"Data extraction confidence: {statement_data.confidence_score:.1%}"
            ]
        }
        
    except Exception as e:
        print(f"❌ Error processing bank statement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing bank statement: {str(e)}")

@router.get("/bank-balances")
async def get_bank_balances(
    bank_repo: BankBalanceRepository = Depends(get_bank_balance_repository)
):
    """Get all bank balances for visualization"""
    try:
        balances = bank_repo.get_all_balances()
        
        return {
            "success": True,
            "balances": [
                {
                    "id": balance.id,
                    "account_name": balance.account_name,
                    "statement_month": balance.statement_month,
                    "beginning_balance": float(balance.beginning_balance),
                    "ending_balance": float(balance.ending_balance),
                    "deposits_additions": float(balance.deposits_additions) if balance.deposits_additions else None,
                    "withdrawals_subtractions": float(balance.withdrawals_subtractions) if balance.withdrawals_subtractions else None,
                    "statement_date": balance.statement_date.isoformat(),
                    "data_source": balance.data_source,
                    "confidence_score": float(balance.confidence_score),
                    "created_at": balance.created_at.isoformat() if balance.created_at else None
                }
                for balance in balances
            ],
            "total_records": len(balances)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching bank balances: {str(e)}")

@router.post("/statements/upload", response_model=StatementUploadResponse)
async def upload_statement_with_page_detection(
    file: UploadFile = File(...),
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Enhanced upload with page detection and user choice workflow
    
    New Flow:
    1. Upload PDF → Save full PDF + detect best page
    2. Extract single page → Process OCR on best page
    3. Save to statement_uploads → Return options for user
    4. User chooses: Quick Save or Review
    """
    try:
        # Validate file
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        ensure_upload_directories()
        
        # Create unique filename to avoid conflicts
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"{timestamp}_{unique_id}_{file.filename}"
        full_pdf_path = os.path.join(UPLOAD_BASE_DIR, safe_filename)
        
        # Save full PDF
        with open(full_pdf_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"📄 Saved full PDF: {full_pdf_path}")
        
        # Enhanced duplicate detection - FILENAME CHECK FIRST
        duplicate_detector = MonthlyDuplicateDetector()
        
        # Layer 1: Filename check - DO THIS BEFORE OCR PROCESSING
        filename_check = duplicate_detector.check_filename_duplicates(file.filename)
        
        # If filename duplicate found, return early (don't waste time on OCR)
        if filename_check.is_duplicate and filename_check.recommendation != "auto_skip":
            # Still do minimal processing to get basic info for the user
            # But save a statement record so PDF viewer works
            
            # Create a basic statement upload record for the duplicate
            duplicate_statement = StatementUpload(
                account_id=None,  # Unknown account
                statement_date=None,  # Unknown date
                original_filename=file.filename,
                file_path=full_pdf_path,
                relevant_page_number=1,
                page_pdf_path=None,
                total_pages=1,  # We don't know yet
                extracted_balance=None,
                confidence_score=0.0,
                processing_status='duplicate',
                processing_error=f"Filename duplicate detected: {filename_check.message}"
            )
            
            try:
                # Try to save - this might fail if constraint already applied
                saved_duplicate = portfolio_repo.save_statement_upload(duplicate_statement)
                statement_id_to_return = saved_duplicate.id
            except Exception as e:
                if "UNIQUE constraint failed: statement_uploads.original_filename" in str(e):
                    # The constraint is already working - find the existing record
                    session = get_db_session()
                    try:
                        from database import StatementUploadModel
                        existing = session.query(StatementUploadModel).filter(
                            StatementUploadModel.original_filename == file.filename
                        ).first()
                        statement_id_to_return = existing.id if existing else 0
                    finally:
                        session.close()
                else:
                    statement_id_to_return = 0
            
            return StatementUploadResponse(
                statement_id=statement_id_to_return,
                extracted_data={
                    "duplicate_checks": {
                        "filename_duplicate": {
                            "is_duplicate": True,
                            "message": filename_check.message,
                            "recommendation": filename_check.recommendation
                        },
                        "monthly_duplicate": {
                            "is_duplicate": False,
                            "message": None,
                            "recommendation": None,
                            "existing_balance": None,
                            "similarity_percentage": 0.0
                        }
                    }
                },
                confidence_score=0.0,
                relevant_page=1,
                total_pages=1,
                requires_review=True,
                message=f"File '{file.filename}' was already uploaded previously",
                can_quick_save=False,
                duplicate_check=filename_check.__dict__
            )
        
        pdf_processor = PDFProcessor()
        extracted_text, extraction_confidence, relevant_page, total_pages = pdf_processor.extract_with_page_detection(full_pdf_path)

        
        if not extracted_text or extraction_confidence < 0.2:
            # Save failed processing record
            failed_upload = StatementUpload(
                original_filename=file.filename,
                file_path=full_pdf_path,
                total_pages=total_pages,
                processing_status='failed',
                processing_error="OCR extraction failed or very low confidence",
            )
            
            saved_upload = portfolio_repo.save_statement_upload(failed_upload)
            
            return StatementUploadResponse(
                statement_id=saved_upload.id,
                extracted_data={},
                confidence_score=extraction_confidence,
                relevant_page=relevant_page,
                total_pages=total_pages,
                requires_review=True,
                message="OCR extraction failed. Manual entry recommended.",
                can_quick_save=False
            )
        
        single_page_filename = f"page_{relevant_page}_{safe_filename}"
        single_page_path = os.path.join(UPLOAD_BASE_DIR, SINGLE_PAGE_DIR, single_page_filename)
        
        page_extraction_success = pdf_processor.extract_single_page_pdf(
            full_pdf_path, relevant_page, single_page_path
        )
        
        if page_extraction_success:
            print(f"📑 Extracted single page: {single_page_path}")
        else:
            print(f"⚠️ Failed to extract single page, will use full PDF for review")
            single_page_path = None
        
        statement_parser = StatementParser()
        statement_data = statement_parser.parse_statement(extracted_text)
        
        overall_confidence = (extraction_confidence + statement_data.confidence_score) / 2
        
        account = None
        account_suggestions = []

        if statement_data.institution:
            all_accounts = portfolio_repo.get_all_accounts()
            account, suggestions = match_account_intelligently(statement_data, all_accounts)
            
            # Format suggestions for frontend
            for acc in suggestions:
                account_suggestions.append({
                    "id": acc.id,
                    "name": acc.account_name,
                    "institution": acc.institution,
                    "match_reason": "institution_partial"
                })
        
        monthly_duplicate_check = None
        if (account and statement_data.ending_balance and statement_data.statement_period_end):
            monthly_duplicate_check = duplicate_detector.check_monthly_duplicates(
                account.id,
                statement_data.statement_period_end,
                statement_data.ending_balance
            )
        else:
            # Create empty result if we can't check
            monthly_duplicate_check = DuplicateCheckResult(
                is_duplicate=False,
                conflict_type="insufficient_data",
                message="Cannot check monthly duplicates - missing account or date info",
                recommendation="safe_to_save"
            )
        
        statement_upload = StatementUpload(
            account_id=account.id if account else None,
            statement_date=statement_data.statement_period_end,
            original_filename=file.filename,
            file_path=full_pdf_path,
            relevant_page_number=relevant_page,
            page_pdf_path=single_page_path,
            total_pages=total_pages,
            extracted_balance=float(statement_data.ending_balance) if statement_data.ending_balance else None,
            confidence_score=overall_confidence,
            processing_status='processed',
            processed_timestamp=datetime.now()
        )
        
        try:
            saved_upload = portfolio_repo.save_statement_upload(statement_upload)
            print(f"💾 Saved statement upload: ID {saved_upload.id}")
        except Exception as e:
            # Handle filename duplicate error gracefully
            if "UNIQUE constraint failed: statement_uploads.original_filename" in str(e):
                # This is a filename duplicate - return appropriate response
                return StatementUploadResponse(
                    statement_id=0,  # No statement saved
                    extracted_data={
                        "duplicate_checks": {
                            "filename_duplicate": {
                                "is_duplicate": True,
                                "message": f"File '{file.filename}' was already uploaded previously",
                                "recommendation": "warn_user"
                            },
                            "monthly_duplicate": {
                                "is_duplicate": False,
                                "message": None,
                                "recommendation": None,
                                "existing_balance": None,
                                "similarity_percentage": 0.0
                            }
                        }
                    },
                    confidence_score=overall_confidence,
                    relevant_page=relevant_page,
                    total_pages=total_pages,
                    requires_review=True,
                    message=f"File '{file.filename}' was already uploaded. Please use a different file or skip this upload.",
                    can_quick_save=False,
                    duplicate_check=None
                )
            else:
                # Other database errors
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        extracted_data = {
            "institution": statement_data.institution,
            "account_type": statement_data.account_type,
            "statement_period_start": statement_data.statement_period_start.isoformat() if statement_data.statement_period_start else None,
            "statement_period_end": statement_data.statement_period_end.isoformat() if statement_data.statement_period_end else None,
            "duplicate_checks": {
                "filename_duplicate": {
                    "is_duplicate": filename_check.is_duplicate,
                    "message": filename_check.message if filename_check.is_duplicate else None,
                    "recommendation": filename_check.recommendation if filename_check.is_duplicate else None
                },
                "monthly_duplicate": {
                    "is_duplicate": monthly_duplicate_check.is_duplicate if monthly_duplicate_check else False,
                    "message": monthly_duplicate_check.message if monthly_duplicate_check and monthly_duplicate_check.is_duplicate else None,
                    "recommendation": monthly_duplicate_check.recommendation if monthly_duplicate_check and monthly_duplicate_check.is_duplicate else None,
                    "existing_balance": monthly_duplicate_check.existing_balance if monthly_duplicate_check and monthly_duplicate_check.is_duplicate else None,
                    "similarity_percentage": monthly_duplicate_check.similarity_percentage if monthly_duplicate_check else 0.0
                }
            },
            "beginning_balance": float(statement_data.beginning_balance) if statement_data.beginning_balance else None,
            "ending_balance": float(statement_data.ending_balance) if statement_data.ending_balance else None,
            "matched_account": {
                "id": account.id,
                "name": account.account_name,
                "institution": account.institution
            } if account else None,
            "account_suggestions": account_suggestions,
            "extraction_notes": statement_data.extraction_notes or []
        }
        
        can_quick_save = (
            overall_confidence >= 0.6 and  # Reasonable confidence
            statement_data.ending_balance is not None and  # Has balance
            account is not None and  # Account matched
            statement_data.statement_period_end is not None  # Has date (explicit None check)
        )
        
        requires_review = (
            overall_confidence < 0.7 or 
            not account or 
            not statement_data.ending_balance or
            (filename_check.is_duplicate and filename_check.recommendation != "auto_skip") or
            (monthly_duplicate_check and monthly_duplicate_check.is_duplicate and monthly_duplicate_check.recommendation != "auto_skip")
        )
        
        # Determine message
        if can_quick_save and not requires_review:
            message = f"High confidence extraction ({overall_confidence:.1%}). Ready for quick save or review."
        elif can_quick_save:
            message = f"Good extraction ({overall_confidence:.1%}) but review recommended due to conflicts."
        else:
            message = "Manual review required due to low confidence or missing data."
        
        return StatementUploadResponse(
            statement_id=saved_upload.id,
            extracted_data=extracted_data,
            confidence_score=overall_confidence,
            relevant_page=relevant_page,
            total_pages=total_pages,
            requires_review=requires_review,
            message=message,
            can_quick_save=can_quick_save,
            duplicate_check=monthly_duplicate_check.__dict__ if monthly_duplicate_check else None
        )
        
    except Exception as e:
        # Clean up files on error
        try:
            if 'full_pdf_path' in locals() and os.path.exists(full_pdf_path):
                os.unlink(full_pdf_path)
            if 'single_page_path' in locals() and single_page_path and os.path.exists(single_page_path):
                os.unlink(single_page_path)
        except:
            pass
        
        raise HTTPException(status_code=500, detail=f"Error processing statement: {str(e)}")

@router.post("/statements/confirm")
async def confirm_statement_extraction(
    statement_data: StatementReviewRequest,
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Confirm and save statement data after user review
    """
    try:
        # Convert to balance entry (reuse manual balance logic)
        balance_date = datetime.strptime(statement_data.balance_date, '%Y-%m-%d').date()
        
        # Check if account exists
        account = portfolio_repo.get_account_by_id(statement_data.account_id)
        if not account:
            raise HTTPException(status_code=404, detail=f"Account {statement_data.account_id} not found")
        
        # Check for existing balance
        existing = portfolio_repo.check_balance_exists(statement_data.account_id, balance_date)
        
        # Create balance entry
        new_balance = PortfolioBalance(
            account_id=statement_data.account_id,
            balance_date=balance_date,
            balance_amount=Decimal(str(statement_data.balance_amount)),
            data_source=DataSource.PDF_STATEMENT,
            confidence_score=Decimal(str(statement_data.confidence_score)),
            notes=f"PDF: {statement_data.original_filename}" + (f" | {statement_data.notes}" if statement_data.notes else "")
        )
        
        # Save balance
        saved_balance = portfolio_repo.save_balance(new_balance)
        
        action = "updated" if existing else "added"
        
        return {
            "success": True,
            "balance": {
                "id": saved_balance.id,
                "account_id": saved_balance.account_id,
                "balance_date": saved_balance.balance_date.isoformat(),
                "balance_amount": float(saved_balance.balance_amount),
                "data_source": saved_balance.data_source.value,
                "confidence_score": float(saved_balance.confidence_score),
                "account_name": account.account_name
            },
            "message": f"Successfully {action} balance from PDF statement"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving statement data: {str(e)}")
    
@router.get("/statements/{statement_id}/page-pdf")
async def serve_single_page_pdf(
    statement_id: int,
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Serve the single page PDF for review interface
    """
    try:
        statement = portfolio_repo.get_statement_upload(statement_id)
        if not statement:
            raise HTTPException(status_code=404, detail="Statement not found")
        
        # Use single page PDF if available, otherwise full PDF
        pdf_path = statement.page_pdf_path if statement.page_pdf_path else statement.file_path
        
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving PDF: {str(e)}")


@router.post("/statements/{statement_id}/quick-save")
async def quick_save_statement(
    statement_id: int,
    request: QuickSaveRequest,
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Quick save statement using extracted data without review
    """
    try:
        # Get statement upload record
        statement = portfolio_repo.get_statement_upload(statement_id)
        if not statement:
            raise HTTPException(status_code=404, detail="Statement not found")
        
        if not statement.account_id or not statement.extracted_balance or not statement.statement_date:
            raise HTTPException(status_code=400, detail="Insufficient extracted data for quick save")
        
        # Check for duplicates again
        duplicate_detector = MonthlyDuplicateDetector()
        duplicate_result = duplicate_detector.check_monthly_duplicates(
            statement.account_id,
            statement.statement_date,
            Decimal(str(statement.extracted_balance))
        )
        
        # Handle duplicates based on user confirmation
        if duplicate_result.is_duplicate and not request.confirm_duplicates:
            if duplicate_result.recommendation == 'block_save':
                raise HTTPException(
                    status_code=409, 
                    detail="Duplicate balance detected. Cannot save identical balance."
                )
            else:
                # Return conflict for user confirmation
                return {
                    "success": False,
                    "requires_confirmation": True,
                    "duplicate_info": duplicate_result.__dict__,
                    "message": duplicate_result.message
                }
        
        # Create portfolio balance
        new_balance = PortfolioBalance(
            account_id=statement.account_id,
            balance_date=statement.statement_date,
            balance_amount=Decimal(str(statement.extracted_balance)),
            data_source=DataSource.PDF_STATEMENT,
            confidence_score=Decimal(str(statement.confidence_score)),
            notes=f"Quick save from PDF: {statement.original_filename}"
        )
        
        # Save balance
        saved_balance = portfolio_repo.save_balance(new_balance)
        
        # Update statement as processed
        portfolio_repo.mark_statement_processed(statement_id)
        
        return {
            "success": True,
            "balance": {
                "id": saved_balance.id,
                "account_id": saved_balance.account_id,
                "balance_date": saved_balance.balance_date.isoformat(),
                "balance_amount": float(saved_balance.balance_amount),
                "data_source": saved_balance.data_source.value,
                "confidence_score": float(saved_balance.confidence_score)
            },
            "message": "Balance saved successfully via quick save"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in quick save: {str(e)}")


@router.post("/statements/{statement_id}/review")
async def save_reviewed_statement(
    statement_id: int,
    review_data: StatementReviewRequest,
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Save statement after user review and potential edits
    """
    try:
        # Get statement upload record
        statement = portfolio_repo.get_statement_upload(statement_id)
        if not statement:
            raise HTTPException(status_code=404, detail="Statement not found")
        
        # Validate account exists
        account = portfolio_repo.get_account_by_id(review_data.account_id)
        if not account:
            raise HTTPException(status_code=404, detail=f"Account {review_data.account_id} not found")
        
        # Parse date
        balance_date = datetime.strptime(review_data.balance_date, '%Y-%m-%d').date()
        
        # Check for duplicates with the reviewed data
        duplicate_detector = MonthlyDuplicateDetector()
        duplicate_result = duplicate_detector.check_monthly_duplicates(
            review_data.account_id,
            balance_date,
            Decimal(str(review_data.balance_amount))
        )
        
        # Create balance entry
        new_balance = PortfolioBalance(
            account_id=review_data.account_id,
            balance_date=balance_date,
            balance_amount=Decimal(str(review_data.balance_amount)),
            data_source=DataSource.PDF_STATEMENT,
            confidence_score=Decimal(str(statement.confidence_score)),
            notes=f"Reviewed PDF: {statement.original_filename}" + (f" | {review_data.notes}" if review_data.notes else "")
        )
        
        # Save balance (repository handles duplicates)
        saved_balance = portfolio_repo.save_balance(new_balance)
        
        # Mark statement as reviewed and processed
        portfolio_repo.mark_statement_reviewed(statement_id, reviewed_by_user=True)
        
        return {
            "success": True,
            "balance": {
                "id": saved_balance.id,
                "account_id": saved_balance.account_id,
                "balance_date": saved_balance.balance_date.isoformat(),
                "balance_amount": float(saved_balance.balance_amount),
                "data_source": saved_balance.data_source.value,
                "confidence_score": float(saved_balance.confidence_score),
                "account_name": account.account_name
            },
            "duplicate_info": duplicate_result.__dict__ if duplicate_result and duplicate_result.is_duplicate else None,
            "message": f"Successfully saved reviewed balance for {account.account_name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving reviewed statement: {str(e)}")
    
@router.post("/statements/{statement_id}/resolve-conflict")
async def resolve_statement_conflict(
    statement_id: int,
    action: str = Form(...),  # 'proceed', 'skip', 'update'
    confirm_duplicates: bool = Form(False),
    portfolio_repo: PortfolioRepository = Depends(get_portfolio_repository)
):
    """
    Handle conflict resolution for investment statement duplicates
    """
    try:
        statement = portfolio_repo.get_statement_upload(statement_id)
        if not statement:
            raise HTTPException(status_code=404, detail="Statement not found")
        
        if action == 'skip':
            # Mark as skipped
            portfolio_repo.mark_statement_processed(statement_id, status='skipped')
            return {"success": True, "action": "skipped", "message": "Statement upload skipped"}
        
        elif action == 'proceed':
            # Save despite duplicates (if user confirmed)
            if not statement.account_id or not statement.extracted_balance or not statement.statement_date:
                raise HTTPException(status_code=400, detail="Insufficient data to proceed")
            
            # Create balance entry
            new_balance = PortfolioBalance(
                account_id=statement.account_id,
                balance_date=statement.statement_date,
                balance_amount=Decimal(str(statement.extracted_balance)),
                data_source=DataSource.PDF_STATEMENT,
                confidence_score=Decimal(str(statement.confidence_score)),
                notes=f"Saved despite duplicates: {statement.original_filename}"
            )
            
            saved_balance = portfolio_repo.save_balance(new_balance)
            portfolio_repo.mark_statement_processed(statement_id, status='saved')
            
            return {
                "success": True, 
                "action": "proceeded",
                "balance": {
                    "id": saved_balance.id,
                    "balance_amount": float(saved_balance.balance_amount),
                    "balance_date": saved_balance.balance_date.isoformat()
                }
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resolving conflict: {str(e)}")