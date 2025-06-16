# src/api/routers/transactions.py

import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from typing import List, Optional, Dict
from datetime import date, datetime, timedelta
import pandas as pd
import uuid
import time

from src.api.dependencies import (
    get_transaction_repository, 
    get_import_service, 
    get_reporting_service,
    get_monthly_summary_repository
)
from src.api.schemas.transaction import (
    TransactionResponse, 
    TransactionCreate,
    TransactionUpdate,        # NEW
    TransactionUpdateResponse, # NEW
    FileUploadResponse,
    BulkFileUploadResponse
)
from src.api.schemas.upload import (
    TransactionPreview, 
    FilePreviewResponse, 
    CategoryUpdate, 
    UploadConfirmation,
    ProcessedTransaction,
    EnhancedUploadSummaryResponse
)

from src.api.utils.pagination import PaginationParams, PagedResponse
from src.api.utils.error_handling import APIError
from src.api.utils.response import ApiResponse
from src.services.import_service import ImportService
from src.services.reporting_service import ReportingService
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.models.models import Transaction
from decimal import Decimal

router = APIRouter()
upload_sessions: Dict[str, dict] = {}

@router.get("")
async def get_transactions(
   categories: Optional[List[str]] = Query(default=None, description="Filter by categories (OR logic)"),
   category: Optional[str] = Query(None, description="Single category filter (legacy)"),
   description: Optional[str] = Query(None, description="Search in transaction descriptions"),
   start_date: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
   end_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
   month: Optional[str] = Query(None, description="Month filter (YYYY-MM format)"),
   sort_field: Optional[str] = Query('date', description="Sort field: date, description, category, amount, source"), 
   sort_direction: Optional[str] = Query('desc', description="Sort direction: asc, desc"),
   page: int = Query(1, ge=1, description="Page number"),
   page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
   reporting_service: ReportingService = Depends(get_reporting_service)
):
   """
   Get transactions with advanced filtering and pagination
   
   **NEW FEATURES:**
   - **Multiple categories**: Use `categories` parameter for OR logic filtering
   - **Description search**: Use `description` parameter for case-insensitive search
   - **Proper pagination**: Database-level pagination for better performance
   
   **Filter Examples:**
   - Single category: `?category=Food`
   - Multiple categories: `?categories=Food&categories=Groceries&categories=Amazon`
   - Description search: `?description=whole foods`
   - Combined filters: `?categories=Food&description=restaurant&month=2024-12`
   """
   try:
       # Handle legacy single category parameter
       filter_categories = None
       if categories:
           filter_categories = categories
       elif category:
           filter_categories = [category]
       
       # Calculate pagination offset
       offset = (page - 1) * page_size
       
       print(f"Transaction API called with:")
       print(f"  categories={filter_categories}")
       print(f"  description={description}")
       print(f"  start_date={start_date}")
       print(f"  end_date={end_date}")
       print(f"  month={month}")
       print(f"  page={page}, page_size={page_size}, offset={offset}")
       
       # Get transactions using new reporting service method
       transactions_df = reporting_service.get_transactions_report(
           categories=filter_categories,
           description=description,
           start_date=start_date,
           end_date=end_date,
           month_str=month,
           sort_field=sort_field,
           sort_direction=sort_direction,
           limit=page_size,
           offset=offset
       )
       
       if transactions_df is None or transactions_df.empty:
           # Return consistent response format for empty results
           return {
               "items": [],
               "total": 0,
               "page": page,
               "page_size": page_size,
               "pages": 0,
               "total_sum": 0.0,
               "avg_amount": 0.0
           }

       # Get total count from DataFrame (included by reporting service)
       total_count = transactions_df.iloc[0]['total_count'] if 'total_count' in transactions_df.columns else len(transactions_df)

       # Convert to response models
       transactions = []
       for _, row in transactions_df.iterrows():
           # Ensure dates are properly converted to date objects
           tx_date = row['date']
           if isinstance(tx_date, str):
               tx_date = pd.to_datetime(tx_date).date()
               
           transaction = TransactionResponse(
               id=row.get('id'),
               date=tx_date,
               description=row['description'],
               amount=Decimal(str(row['amount'])),
               category=row['category'],
               source=row['source'],
               transaction_hash=row.get('transaction_hash', ''),
               month_str=row.get('month_str', tx_date.strftime('%Y-%m'))
           )
           transactions.append(transaction)

       print(f"Returning {len(transactions)} transactions (total: {total_count})")

       # Get aggregate data from the DataFrame (if available)
       total_sum = 0.0
       avg_amount = 0.0

       if 'total_sum' in transactions_df.columns:
           total_sum = float(transactions_df.iloc[0]['total_sum'])
           avg_amount = float(transactions_df.iloc[0]['avg_amount'])


       # Calculate total pages
       pages = (int(total_count) + page_size - 1) // page_size if total_count > 0 else 0

       # Return consistent response format
       response = {
            "items": transactions,
            "total": int(total_count),
            "page": int(page),
            "page_size": int(page_size),
            "pages": int(pages),
            "total_sum": float(total_sum),
            "avg_amount": float(avg_amount)
        }

       print(f"Response keys: {list(response.keys())}")
       print(f"Response total_sum type: {type(response['total_sum'])}")
       print(f"Response total_sum value: {response['total_sum']}")

       return response
       
   except Exception as e:
       print(f"Error in get_transactions: {str(e)}")
       raise APIError(status_code=500, detail=str(e))

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Create a new transaction manually - updated for proper DATE handling
    """
    try:
        # Ensure we have a proper date object
        tx_date = transaction.date
        if isinstance(tx_date, str):
            from datetime import datetime
            tx_date = datetime.fromisoformat(tx_date).date()
        
        # Create transaction hash using standardized MM/dd/yyyy format
        tx_hash = Transaction.create_hash(
            tx_date,  # Pass date object directly
            transaction.description,
            transaction.amount,
            transaction.source
        )
        
        # Create domain model
        tx = Transaction(
            date=tx_date,
            description=transaction.description,
            amount=transaction.amount,
            category=transaction.category,
            source=transaction.source,
            transaction_hash=tx_hash
        )
        
        # Save to repository
        saved_tx = transaction_repo.save(tx)
        
        # Return response
        return TransactionResponse(
            id=saved_tx.id,
            date=saved_tx.date,  # Will be serialized as YYYY-MM-DD by Pydantic
            description=saved_tx.description,
            amount=saved_tx.amount,
            category=saved_tx.category,
            source=saved_tx.source,
            transaction_hash=saved_tx.transaction_hash,
            month_str=saved_tx.month_str
        )
    except ValueError as e:
        # Handle duplicate transaction error
        if "already exists" in str(e):
            raise APIError(
                status_code=409,
                detail="Transaction already exists",
                error_code="DUPLICATE_TRANSACTION"
            )
        raise APIError(status_code=400, detail=str(e))
    except Exception as e:
        raise APIError(status_code=500, detail=str(e))

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)
):
    """
    Get a specific transaction by ID
    """
    try:
        transaction = transaction_repo.find_by_id(transaction_id)
        
        if not transaction:
            raise APIError(
                status_code=404, 
                detail=f"Transaction with ID {transaction_id} not found",
                error_code="TRANSACTION_NOT_FOUND"
            )
        
        return TransactionResponse(
            id=transaction.id,
            date=transaction.date,
            description=transaction.description,
            amount=transaction.amount,
            category=transaction.category,
            source=transaction.source,
            transaction_hash=transaction.transaction_hash,
            month_str=transaction.month_str
        )
    except APIError:
        raise
    except Exception as e:
        raise APIError(status_code=500, detail=str(e))

@router.put("/{transaction_id}", response_model=TransactionUpdateResponse)
async def update_transaction(
    transaction_id: int,
    updates: TransactionUpdate,
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository),
    import_service: ImportService = Depends(get_import_service)
):
    """
    Update an existing transaction
    """
    try:
        # Convert updates to dict, excluding None values
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        
        if not update_dict:
            raise APIError(
                status_code=400,
                detail="No valid updates provided",
                error_code="NO_UPDATES"
            )
        
        # Update the transaction
        updated_transaction, affected_months = transaction_repo.update(transaction_id, update_dict)
        
        # Recalculate monthly summaries for affected months
        monthly_summaries_affected = []
        if affected_months:
            # Create affected_data structure for monthly summary update
            affected_data = {}
            for month_str in affected_months:
                # Get all categories that might be affected in this month
                # (We could be more precise, but for safety, let's recalculate all categories for affected months)
                affected_data[month_str] = set(import_service.categories.keys())
            
            # Update monthly summaries
            monthly_summary_repo.update_from_transactions(affected_data, import_service.categories)
            
            # Convert month strings to display format for response
            for month_str in affected_months:
                try:
                    # Parse YYYY-MM format to readable format
                    month_date = pd.to_datetime(month_str + '-01')
                    month_year = month_date.strftime('%B %Y')
                    monthly_summaries_affected.append(month_year)
                except:
                    monthly_summaries_affected.append(month_str)
        
        # Return updated transaction
        return TransactionUpdateResponse(
            updated_transaction=TransactionResponse(
                id=updated_transaction.id,
                date=updated_transaction.date,
                description=updated_transaction.description,
                amount=updated_transaction.amount,
                category=updated_transaction.category,
                source=updated_transaction.source,
                transaction_hash=updated_transaction.transaction_hash,
                month_str=updated_transaction.month_str
            ),
            monthly_summaries_affected=monthly_summaries_affected
        )
        
    except ValueError as e:
        if "not found" in str(e).lower():
            raise APIError(
                status_code=404,
                detail=str(e),
                error_code="TRANSACTION_NOT_FOUND"
            )
        elif "duplicate" in str(e).lower():
            raise APIError(
                status_code=409,
                detail=str(e),
                error_code="DUPLICATE_TRANSACTION"
            )
        else:
            raise APIError(status_code=400, detail=str(e))
    except Exception as e:
        raise APIError(status_code=500, detail=str(e))

@router.post("/upload/preview", response_model=ApiResponse[FilePreviewResponse])
async def preview_upload(
    files: List[UploadFile] = File(...),
    import_service: ImportService = Depends(get_import_service),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository)  # NEW: Add this dependency
):
    """
    Preview uploaded files and identify transactions needing review
    Updated to check for duplicates during preview stage
    """
    session_id = str(uuid.uuid4())
    all_transactions = []
    all_misc_transactions = []
    files_info = {}
    
    existing_hashes = transaction_repo.get_existing_hashes()
    
    for file in files:
        # Validate and ensure we have a proper filename
        original_filename = getattr(file, 'filename', None)
        if not original_filename or not isinstance(original_filename, str):
            original_filename = f"uploaded_file_{int(time.time())}.csv"
        
        # Ensure the filename has a .csv extension for proper processing
        if not original_filename.lower().endswith('.csv'):
            original_filename += '.csv'
        
        # Create a temporary file with proper extension
        file_extension = os.path.splitext(original_filename)[1] or '.csv'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            try:
                content = await file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            except Exception as e:
                continue
        
        try:
            # Process the file with the original filename for bank detection
            df = import_service.process_bank_file(temp_file_path, original_filename=original_filename)
            
            if df is not None and not df.empty:
                # Add temporary IDs to each transaction
                transactions = []
                for _, row in df.iterrows():
                    tx_dict = row.to_dict()
                    tx_dict['temp_id'] = str(uuid.uuid4())
                    tx_dict['original_filename'] = original_filename
                    
                    tx_hash = str(tx_dict['transaction_hash'])
                    tx_dict['is_duplicate'] = tx_hash in existing_hashes
                    
                    transactions.append(tx_dict)
                
                all_transactions.extend(transactions)
                files_info[original_filename] = len(transactions)
                
                for tx in transactions:
                    if tx.get('Category') == 'Misc' and not tx.get('is_duplicate', False):  # NEW: Skip duplicates
                        try:
                            # Convert date string to date object
                            if isinstance(tx['Date'], str):
                                tx_date = pd.to_datetime(tx['Date']).date()
                            else:
                                tx_date = tx['Date']
                            
                            # Convert amount to Decimal
                            tx_amount = Decimal(str(tx['Amount']))
                            
                            # Get category suggestions
                            suggestions = _suggest_categories(str(tx['Description']), import_service)
                            
                            # Create preview object
                            preview = TransactionPreview(
                                temp_id=tx['temp_id'],
                                date=tx_date,
                                description=str(tx['Description']),
                                amount=tx_amount,
                                category=str(tx['Category']),
                                source=str(tx['source']),
                                suggested_categories=suggestions
                            )
                            all_misc_transactions.append(preview)
                            
                        except Exception:
                            # Skip transactions that can't be processed
                            continue
                            
        except Exception:
            # Skip files that can't be processed
            continue
        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    # Store session data
    upload_sessions[session_id] = {
        'transactions': all_transactions,
        'timestamp': datetime.now(),
        'files_info': files_info
    }
    
    # Clean up old sessions
    _cleanup_old_sessions()
    
    return ApiResponse.success(
        data=FilePreviewResponse(
            session_id=session_id,
            total_transactions=len(all_transactions),
            misc_transactions=all_misc_transactions,  # Now only contains non-duplicate Misc transactions
            requires_review=len(all_misc_transactions) > 0,
            files_processed=len(files_info)
        )
    )

@router.post("/upload/confirm", response_model=ApiResponse[EnhancedUploadSummaryResponse])
async def confirm_upload(
    confirmation: UploadConfirmation,
    import_service: ImportService = Depends(get_import_service),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    monthly_summary_repo: MonthlySummaryRepository = Depends(get_monthly_summary_repository)
):
    """
    Confirm and save uploaded transactions with reviewed categories
    Updated for proper DATE handling and transaction details
    """
    # Get session data
    session_data = upload_sessions.get(confirmation.session_id)
    if not session_data:
        raise APIError(
            status_code=404,
            detail="Upload session not found or expired",
            error_code="SESSION_NOT_FOUND"
        )
    
    # Apply category updates
    category_map = {cu.temp_id: cu.new_category for cu in confirmation.category_updates}
    
    transactions_to_save = []
    processed_transactions = []  # NEW: Track all processed transactions
    
    for tx_data in session_data['transactions']:
        # Track if this transaction was manually reviewed
        was_reviewed = tx_data['temp_id'] in category_map
        
        # Update category if it was reviewed
        if was_reviewed:
            tx_data['Category'] = category_map[tx_data['temp_id']]
        
        # Parse date properly
        tx_date = pd.to_datetime(tx_data['Date']).date()
        
        # Create Transaction object
        transaction = Transaction(
            date=tx_date,
            description=str(tx_data['Description']),
            amount=Decimal(str(tx_data['Amount'])),
            category=str(tx_data['Category']),
            source=str(tx_data['source']),
            transaction_hash=str(tx_data['transaction_hash']),
            month_str=tx_date.strftime('%Y-%m')
        )
        transactions_to_save.append(transaction)
        
        processed_tx = ProcessedTransaction(
            date=tx_date,
            description=str(tx_data['Description']),
            amount=Decimal(str(tx_data['Amount'])),
            category=str(tx_data['Category']),
            source=str(tx_data['source']),
            original_filename=str(tx_data.get('original_filename', 'unknown')),
            was_duplicate=False,  # Will be updated based on save results
            was_reviewed=was_reviewed
        )
        processed_transactions.append(processed_tx)
    
    # Save all transactions (now returns duplicate hashes)
    records_added, affected_data, duplicate_hashes = transaction_repo.save_many(transactions_to_save)
    
    for processed_tx, original_tx in zip(processed_transactions, transactions_to_save):
        if original_tx.transaction_hash in duplicate_hashes:
            processed_tx.was_duplicate = True
    
    # Update monthly summaries
    if affected_data:
        monthly_summary_repo.update_from_transactions(affected_data, import_service.categories)
    
    # Calculate totals
    total_transactions = len(processed_transactions)
    duplicate_count = len(duplicate_hashes)
    
    # Create enhanced response message
    if duplicate_count > 0:
        message = f"Successfully processed {total_transactions} transactions ({records_added} new, {duplicate_count} duplicates)"
    else:
        message = f"Successfully saved {records_added} new transactions"
    
    # Clean up session
    del upload_sessions[confirmation.session_id]
    
    return ApiResponse.success(
        data=EnhancedUploadSummaryResponse(
            files_processed=len(session_data['files_info']),
            total_transactions=total_transactions,
            new_transactions=records_added,
            duplicate_transactions=duplicate_count,
            transactions_by_file=session_data['files_info'],
            message=message,
            processed_transactions=processed_transactions
        )
    )

@router.post("/upload", response_model=ApiResponse[FileUploadResponse])
async def upload_file(
    file: UploadFile = File(...),
    import_service: ImportService = Depends(get_import_service)
):
    """
    Upload and process a single transaction file (legacy endpoint)
    """
    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            # Write the uploaded file content
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process the file with original filename
            df = import_service.process_bank_file(temp_file_path, original_filename=file.filename)
            
            if df is None or df.empty:
                response_data = FileUploadResponse(
                    message="No new transactions found",
                    transactions_count=0,
                    categories=[]
                )
                
                return ApiResponse.success(
                    data=response_data,
                    message="File processed but no new transactions found",
                    meta={"filename": file.filename}
                )
            
            # Return the response
            response_data = FileUploadResponse(
                message="File processed successfully",
                transactions_count=len(df),
                categories=df["Category"].unique().tolist() if "Category" in df.columns else []
            )
            
            return ApiResponse.success(
                data=response_data,
                message="File uploaded and processed successfully",
                meta={"filename": file.filename, "content_type": file.content_type}
            )
        finally:
            # Clean up the temporary file
            os.unlink(temp_file_path)
    except Exception as e:
        raise APIError(status_code=500, detail=str(e))

# Helper functions
def _suggest_categories(description: str, import_service) -> List[str]:
    """Suggest possible categories based on description"""
    suggestions = []
    description_lower = description.lower()
    
    # Check each category's keywords
    for name, category in import_service.categories.items():
        if category.keywords:
            for keyword in category.keywords:
                if keyword.lower() in description_lower:
                    suggestions.append(name)
                    break
    
    # Return top 3 suggestions, excluding Misc and Payment
    filtered_suggestions = [s for s in suggestions if s not in ['Misc', 'Payment']]
    return filtered_suggestions[:3]

def _cleanup_old_sessions():
    """Remove sessions older than 1 hour"""
    current_time = datetime.now()
    expired = [
        sid for sid, data in upload_sessions.items()
        if (current_time - data['timestamp']) > timedelta(hours=1)
    ]
    for sid in expired:
        del upload_sessions[sid]