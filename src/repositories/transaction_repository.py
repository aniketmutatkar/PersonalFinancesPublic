# src/repositories/transaction_repository.py

from typing import List, Dict, Set, Tuple, Optional
from datetime import date
import pandas as pd
from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from src.models.models import Transaction
from database import get_db_session, TransactionModel


class TransactionRepository:
    """Repository for transaction database operations"""
    
    def _create_transaction_from_row(self, row):
        """
        Helper method to create Transaction domain entity from database row.
        Now handles proper DATE columns.
        """
        # Parse date from database - should be in YYYY-MM-DD format
        tx_date = row.date
        if isinstance(tx_date, str):
            # Parse ISO date string
            from datetime import datetime
            tx_date = datetime.fromisoformat(tx_date).date()
        
        return Transaction(
            id=row.id,
            date=tx_date,
            description=row.description,
            amount=Decimal(str(row.amount)),
            category=row.category,
            source=row.source,
            transaction_hash=row.transaction_hash,
            month_str=row.month
        )

    def find_with_filters(
        self,
        categories: Optional[List[str]] = None,
        description: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        month_str: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_direction: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> Tuple[List[Transaction], int, Decimal, Decimal]:  # CHANGED: Added Decimal, Decimal for total_sum, avg_amount
        """
        Find transactions with advanced filtering support.
        
        Returns:
            Tuple of (transactions, total_count, total_sum, average_amount)
        """
        session = get_db_session()
        
        try:
            # Build WHERE clauses dynamically (same as before)
            where_clauses = []
            params = {}
            
            # Category filter (OR logic)
            if categories and len(categories) > 0:
                clean_categories = [cat for cat in categories if cat and cat.strip()]
                if clean_categories:
                    placeholders = [f":category_{i}" for i in range(len(clean_categories))]
                    where_clauses.append(f"category IN ({', '.join(placeholders)})")
                    for i, category in enumerate(clean_categories):
                        params[f"category_{i}"] = category
            
            # Description search (case-insensitive)
            if description and description.strip():
                where_clauses.append("LOWER(description) LIKE LOWER(:description)")
                params["description"] = f"%{description.strip()}%"
            
            # Month filter (takes priority over date range)
            if month_str and month_str.strip():
                where_clauses.append("month = :month_str")
                params["month_str"] = month_str.strip()
            elif start_date and end_date:
                where_clauses.append("date BETWEEN :start_date AND :end_date")
                params["start_date"] = start_date.isoformat()
                params["end_date"] = end_date.isoformat()
            elif start_date:
                where_clauses.append("date >= :start_date")
                params["start_date"] = start_date.isoformat()
            elif end_date:
                where_clauses.append("date <= :end_date")
                params["end_date"] = end_date.isoformat()
            
            # Build the WHERE clause
            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            aggregate_query = text(f"""
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0) as total_sum,
                COALESCE(AVG(amount), 0) as avg_amount
            FROM transactions
            {where_sql}
            """)
            
            aggregate_result = session.execute(aggregate_query, params).fetchone()
            total_count = aggregate_result[0] if aggregate_result else 0
            total_sum = Decimal(str(aggregate_result[1])) if aggregate_result and aggregate_result[1] else Decimal('0')
            avg_amount = Decimal(str(aggregate_result[2])) if aggregate_result and aggregate_result[2] else Decimal('0')
            
            # Build sort clause
            valid_sort_fields = ['date', 'description', 'category', 'amount', 'source']
            valid_directions = ['asc', 'desc']

            if sort_field not in valid_sort_fields:
                sort_field = 'date'
            if sort_direction not in valid_directions:
                sort_direction = 'desc'

            if sort_field == 'date':
                order_clause = f"ORDER BY date {sort_direction.upper()}, id DESC"
            else:
                order_clause = f"ORDER BY {sort_field} {sort_direction.upper()}, date DESC, id DESC"

            # Main query with pagination
            main_query = text(f"""
            SELECT * FROM transactions
            {where_sql}
            {order_clause}
            LIMIT :limit OFFSET :offset
            """)
            
            # Add pagination parameters
            params["limit"] = limit
            params["offset"] = offset
            
            result = session.execute(main_query, params).fetchall()
            
            # Convert to domain entities
            transactions = []
            for row in result:
                transactions.append(self._create_transaction_from_row(row))
            
            return transactions, total_count, total_sum, avg_amount
            
        finally:
            session.close()

    def save(self, transaction: Transaction) -> Transaction:
        """
        Save a transaction to the database with proper DATE handling.
        
        Args:
            transaction: The transaction to save
            
        Returns:
            The saved transaction with ID
            
        Raises:
            ValueError: If a transaction with the same hash already exists
        """
        session = get_db_session()
        
        try:
            # Create a SQLAlchemy model from the domain entity
            transaction_model = TransactionModel(
                date=transaction.date,  # Store as ISO date string (YYYY-MM-DD)
                description=transaction.description,
                amount=float(transaction.amount),
                category=transaction.category,
                source=transaction.source,
                month=transaction.month_str,
                transaction_hash=transaction.transaction_hash
            )
            
            # Add to session and flush to get ID
            session.add(transaction_model)
            session.flush()
            
            # Update domain entity with generated ID
            transaction.id = transaction_model.id
            
            # Commit
            session.commit()
            
            return transaction
            
        except IntegrityError:
            # Unique constraint violation (duplicate hash)
            session.rollback()
            raise ValueError(f"Transaction with hash {transaction.transaction_hash} already exists")
        finally:
            session.close()
    
    def save_many(self, transactions: List[Transaction]) -> Tuple[int, Dict[str, Set[str]], List[str]]:
        """
        Save multiple transactions to the database with proper DATE handling.
        
        Args:
            transactions: List of transactions to save
            
        Returns:
            Tuple containing:
                - Number of transactions added
                - Dictionary mapping affected months to sets of affected categories  
                - List of transaction hashes that were duplicates
        """
        if not transactions:
            return 0, {}, []
        
        session = get_db_session()
        records_added = 0
        affected_data = {}
        duplicate_hashes = []  # NEW: Track duplicates
        
        try:
            # Process each transaction
            for transaction in transactions:
                # Create a SQLAlchemy model
                transaction_model = TransactionModel(
                    date=transaction.date,
                    description=transaction.description,
                    amount=float(transaction.amount),
                    category=transaction.category,
                    source=transaction.source,
                    month=transaction.month_str,
                    transaction_hash=transaction.transaction_hash
                )
                
                try:
                    # Add and commit
                    session.add(transaction_model)
                    session.commit()
                    records_added += 1
                    
                    # Update domain entity with generated ID
                    transaction.id = transaction_model.id
                    
                    # Track which month and category were affected
                    month = transaction.month_str
                    category = transaction.category
                    
                    if month not in affected_data:
                        affected_data[month] = set()
                    affected_data[month].add(category)
                    
                except IntegrityError:
                    # Skip duplicates (unique constraint violation)
                    session.rollback()
                    duplicate_hashes.append(transaction.transaction_hash)  # NEW: Track duplicate
        finally:
            session.close()
    
        return records_added, affected_data, duplicate_hashes

    def update(self, transaction_id: int, updates: Dict[str, any]) -> Tuple[Transaction, Set[str]]:
        """
        Update a transaction by ID and return affected months for summary recalculation.
        
        Args:
            transaction_id: The transaction ID to update
            updates: Dictionary of fields to update
            
        Returns:
            Tuple containing:
                - Updated transaction
                - Set of affected month strings that need summary recalculation
            
        Raises:
            ValueError: If transaction not found or validation fails
        """
        session = get_db_session()
        
        try:
            # First, get the existing transaction
            existing_tx = self.find_by_id(transaction_id)
            if not existing_tx:
                raise ValueError(f"Transaction with ID {transaction_id} not found")
            
            # Track affected months (old and potentially new)
            affected_months = set()
            affected_months.add(existing_tx.month_str)
            
            # Apply updates to create new transaction object
            updated_data = {
                'date': updates.get('date', existing_tx.date),
                'description': updates.get('description', existing_tx.description),
                'amount': updates.get('amount', existing_tx.amount),
                'category': updates.get('category', existing_tx.category),
                'source': updates.get('source', existing_tx.source),
            }
            
            # Check if date changed (affects month)
            new_date = updated_data['date']
            if isinstance(new_date, str):
                new_date = pd.to_datetime(new_date).date()
            
            new_month_str = new_date.strftime('%Y-%m')
            if new_month_str != existing_tx.month_str:
                affected_months.add(new_month_str)
            
            # Generate new hash if key fields changed
            new_hash = Transaction.create_hash(
                updated_data['date'],
                updated_data['description'], 
                updated_data['amount'],
                updated_data['source']
            )
            
            # Check for duplicate hash (excluding the current transaction)
            duplicate_check_query = text("""
            SELECT id FROM transactions 
            WHERE transaction_hash = :hash AND id != :current_id
            """)
            
            duplicate_result = session.execute(duplicate_check_query, {
                "hash": new_hash,
                "current_id": transaction_id
            }).fetchone()
            
            if duplicate_result:
                raise ValueError("Updated transaction would create a duplicate")
            
            # Update the transaction in database
            update_query = text("""
            UPDATE transactions 
            SET date = :date,
                description = :description,
                amount = :amount,
                category = :category,
                source = :source,
                month = :month_str,
                transaction_hash = :hash
            WHERE id = :id
            """)
            
            session.execute(update_query, {
                "date": new_date.isoformat(),
                "description": updated_data['description'],
                "amount": float(updated_data['amount']),
                "category": updated_data['category'],
                "source": updated_data['source'],
                "month_str": new_month_str,
                "hash": new_hash,
                "id": transaction_id
            })
            
            session.commit()
            
            # Create updated domain entity
            updated_transaction = Transaction(
                id=transaction_id,
                date=new_date,
                description=updated_data['description'],
                amount=updated_data['amount'],
                category=updated_data['category'],
                source=updated_data['source'],
                transaction_hash=new_hash,
                month_str=new_month_str
            )
            
            return updated_transaction, affected_months
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    def find_by_category(self, category: str) -> List[Transaction]:
        """Find transactions for a specific category. LEGACY METHOD."""
        transactions, _ = self.find_with_filters(categories=[category], limit=10000)
        return transactions

    def find_by_id(self, transaction_id: int) -> Optional[Transaction]:
        """
        Find a transaction by its ID.
        
        Args:
            transaction_id: The transaction ID to find
            
        Returns:
            The transaction if found, None otherwise
        """
        session = get_db_session()
        
        try:
            query = text("""
            SELECT * FROM transactions
            WHERE id = :transaction_id
            """)
            
            result = session.execute(query, {"transaction_id": transaction_id}).fetchone()
            
            if not result:
                return None
            
            return self._create_transaction_from_row(result)
        finally:
            session.close()
    def get_existing_hashes(self) -> List[str]:
        """
        Get all existing transaction hashes.
        
        Returns:
            List of transaction hash strings
        """
        session = get_db_session()
        
        try:
            # Query for all transaction hashes
            query = text("SELECT transaction_hash FROM transactions")
            result = session.execute(query).fetchall()
            
            # Extract hash values
            return [row[0] for row in result]
        finally:
            session.close()