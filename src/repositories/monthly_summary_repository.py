"""
Monthly summary repository for database operations related to monthly summaries.
"""

from typing import List, Dict, Set, Tuple, Optional, Literal
from decimal import Decimal
import pandas as pd
from datetime import datetime
from sqlalchemy import text

from src.models.models import MonthlySummary, Category
from database import get_db_session
from src.utils.date_utils import parse_month_period

SortDirection = Literal["asc", "desc"]

class MonthlySummaryRepository:
    """Repository for monthly summary database operations"""
    
    def save(self, summary: MonthlySummary) -> MonthlySummary:
        """
        Save a monthly summary to the database.
        
        Args:
            summary: The monthly summary to save
            
        Returns:
            The saved monthly summary with ID
        """
        session = get_db_session()
        
        try:
            # Check if the monthly summary already exists
            check_query = text("SELECT id FROM monthly_summary WHERE month_year = :month_year")
            existing = session.execute(check_query, {"month_year": summary.month_year}).fetchone()
            
            # Prepare data for update/insert
            update_data = {
                'month': summary.month,
                'year': summary.year,
                'month_year': summary.month_year,
                'investment_total': float(summary.investment_total),
                'total': float(summary.total),
                'total_minus_invest': float(summary.total_minus_invest)
            }
            
            # Add category totals
            for category, amount in summary.category_totals.items():
                update_data[category] = float(amount)
            
            if existing:
                # UPDATE existing record
                existing_id = existing[0]
                
                # Build SET clause for UPDATE
                set_clauses = []
                for key, value in update_data.items():
                    if key != 'month_year':  # Don't update the primary key
                        set_clauses.append(f'"{key}" = :{key}')
                
                update_query = text(f"""
                UPDATE monthly_summary
                SET {', '.join(set_clauses)}
                WHERE id = :id
                """)
                
                # Add id to params
                update_data['id'] = existing_id
                
                session.execute(update_query, update_data)
                summary.id = existing_id
            else:
                # INSERT new record
                cols = ', '.join([f'"{k}"' for k in update_data.keys()])
                params = ', '.join([f':{k}' for k in update_data.keys()])
                
                insert_query = text(f"""
                INSERT INTO monthly_summary ({cols})
                VALUES ({params})
                """)
                
                result = session.execute(insert_query, update_data)
                
                # Get the ID of the inserted record
                if hasattr(result, 'lastrowid'):
                    summary.id = result.lastrowid
            
            session.commit()
            return summary
        finally:
            session.close()
    
    def find_by_month_year(self, month_year: str) -> Optional[MonthlySummary]:
        """
        Find a monthly summary by its month_year identifier.
        
        Args:
            month_year: String in format 'Month YYYY' (e.g., 'January 2023')
            
        Returns:
            The found monthly summary or None if not found
        """
        session = get_db_session()
        
        try:
            query = text("SELECT * FROM monthly_summary WHERE month_year = :month_year")
            result = session.execute(query, {"month_year": month_year}).fetchone()
            
            if not result:
                return None
            
            # Convert to domain entity
            return self._map_to_domain_entity(result)
        finally:
            session.close()
    
    def find_by_year(self, year: int, sort_direction: SortDirection = "desc") -> List[MonthlySummary]:
        """
        Find all monthly summaries for a specific year.
        
        Args:
            year: The year to find summaries for
            sort_direction: 'asc' for oldest first, 'desc' for newest first
            
        Returns:
            List of monthly summaries for that year
        """
        session = get_db_session()
        
        try:
            # Build the ORDER BY clause based on sort direction
            if sort_direction == "asc":
                order_clause = """
                ORDER BY CASE month
                    WHEN 'January' THEN 1
                    WHEN 'February' THEN 2
                    WHEN 'March' THEN 3
                    WHEN 'April' THEN 4
                    WHEN 'May' THEN 5
                    WHEN 'June' THEN 6
                    WHEN 'July' THEN 7
                    WHEN 'August' THEN 8
                    WHEN 'September' THEN 9
                    WHEN 'October' THEN 10
                    WHEN 'November' THEN 11
                    WHEN 'December' THEN 12
                 END ASC
                """
            else:  # desc
                order_clause = """
                ORDER BY CASE month
                    WHEN 'January' THEN 1
                    WHEN 'February' THEN 2
                    WHEN 'March' THEN 3
                    WHEN 'April' THEN 4
                    WHEN 'May' THEN 5
                    WHEN 'June' THEN 6
                    WHEN 'July' THEN 7
                    WHEN 'August' THEN 8
                    WHEN 'September' THEN 9
                    WHEN 'October' THEN 10
                    WHEN 'November' THEN 11
                    WHEN 'December' THEN 12
                 END DESC
                """
            
            query = text(f"""
            SELECT * FROM monthly_summary 
            WHERE year = :year
            {order_clause}
            """)
            
            results = session.execute(query, {"year": year}).fetchall()
            
            # Convert to domain entities
            return [self._map_to_domain_entity(row) for row in results]
        finally:
            session.close()
    
    def find_all(self, sort_direction: SortDirection = "desc") -> List[MonthlySummary]:
        """
        Find all monthly summaries.
        
        Args:
            sort_direction: 'asc' for oldest first, 'desc' for newest first
            
        Returns:
            List of all monthly summaries sorted by date
        """
        session = get_db_session()
        
        try:
            # Build the ORDER BY clause based on sort direction
            if sort_direction == "asc":
                order_clause = """
                ORDER BY year ASC, 
                         CASE month
                            WHEN 'January' THEN 1
                            WHEN 'February' THEN 2
                            WHEN 'March' THEN 3
                            WHEN 'April' THEN 4
                            WHEN 'May' THEN 5
                            WHEN 'June' THEN 6
                            WHEN 'July' THEN 7
                            WHEN 'August' THEN 8
                            WHEN 'September' THEN 9
                            WHEN 'October' THEN 10
                            WHEN 'November' THEN 11
                            WHEN 'December' THEN 12
                         END ASC
                """
            else:  # desc (default - newest first)
                order_clause = """
                ORDER BY year DESC, 
                         CASE month
                            WHEN 'January' THEN 1
                            WHEN 'February' THEN 2
                            WHEN 'March' THEN 3
                            WHEN 'April' THEN 4
                            WHEN 'May' THEN 5
                            WHEN 'June' THEN 6
                            WHEN 'July' THEN 7
                            WHEN 'August' THEN 8
                            WHEN 'September' THEN 9
                            WHEN 'October' THEN 10
                            WHEN 'November' THEN 11
                            WHEN 'December' THEN 12
                         END DESC
                """
            
            query = text(f"""
            SELECT * FROM monthly_summary
            {order_clause}
            """)
            
            results = session.execute(query).fetchall()
            
            # Convert to domain entities
            return [self._map_to_domain_entity(row) for row in results]
        finally:
            session.close()
    
    def _map_to_domain_entity(self, row) -> MonthlySummary:
        """
        Map a database row to a domain entity.
        
        Args:
            row: Database row result
            
        Returns:
            Mapped MonthlySummary domain entity
        """
        # Extract category totals (all columns except the standard ones)
        standard_columns = {'id', 'month', 'year', 'month_year', 'investment_total', 'total', 'total_minus_invest'}
        category_totals = {}
        
        for key in row._mapping.keys():
            if key not in standard_columns and row._mapping[key] is not None:
                category_totals[key] = Decimal(str(row._mapping[key]))
        
        return MonthlySummary(
            id=row.id,
            month=row.month,
            year=row.year,
            month_year=row.month_year,
            category_totals=category_totals,
            investment_total=Decimal(str(row.investment_total)) if row.investment_total else Decimal('0'),
            total=Decimal(str(row.total)) if row.total else Decimal('0'),
            total_minus_invest=Decimal(str(row.total_minus_invest)) if row.total_minus_invest else Decimal('0')
        )
    
    def update_from_transactions(self, affected_months: Dict[str, Set[str]], 
                                categories: Dict[str, Category]) -> Tuple[int, int]:
        """
        Update monthly summaries based on new transaction data.
        
        Args:
            affected_months: Dictionary mapping months to sets of affected categories
            categories: Dictionary mapping category names to Category objects
            
        Returns:
            Tuple containing:
                - Number of new monthly summaries created
                - Number of existing monthly summaries updated
        """
        if not affected_months:
            print("No months or categories to update - skipping monthly summary update")
            return 0, 0
        
        session = get_db_session()
        
        try:
            months_processed = 0
            months_updated = 0
            
            # Process each affected month
            for month_period, affected_categories in affected_months.items():
                try:
                    # Parse the month period
                    month_info = parse_month_period(month_period)
                    year = month_info['year']
                    month_name = month_info['month_name']
                    month_year = month_info['month_year']
                except Exception as e:
                    print(f"Skipping invalid month format: {month_period}, Error: {str(e)}")
                    continue
                
                print(f"Affected categories: {sorted(affected_categories)}")
                
                # Get current monthly summary record if it exists
                current_summary = self.find_by_month_year(month_year)
                
                # Prepare new or updated summary
                if current_summary:
                    summary = current_summary
                    print(f"Found existing record for {month_year}")
                else:
                    summary = MonthlySummary(
                        month=month_name,
                        year=year,
                        month_year=month_year,
                        category_totals={}
                    )
                    print(f"Creating new record for {month_year}")
                
                # For each affected category, get new totals from transactions table
                for category in sorted(affected_categories):
                    query = text("""
                    SELECT SUM(amount) as total
                    FROM transactions
                    WHERE month = :month AND category = :category
                    GROUP BY category
                    """)
                    
                    result = session.execute(query, {"month": month_period, "category": category}).fetchone()
                    if result and result[0] is not None:
                        category_total = result[0]
                        
                        # Ensure Pay and Payment are positive in the monthly summary
                        if category in ['Pay', 'Payment']:
                            category_total = abs(category_total)
                        
                        # Round to 2 decimal places
                        category_total = round(category_total, 2)
                        summary.category_totals[category] = Decimal(str(category_total))
                        print(f"  Updated {category}: ${category_total:.2f}")
                
                # Calculate totals
                summary.calculate_totals(categories)
                
                print(f"Summary values for {month_year}:")
                print(f"  Total: ${float(summary.total):.2f}")
                print(f"  Investment Total: ${float(summary.investment_total):.2f}")
                print(f"  Total Minus Investment: ${float(summary.total_minus_invest):.2f}")
                
                # Save to database
                self.save(summary)
                
                if current_summary:
                    months_updated += 1
                else:
                    months_processed += 1
            
            if months_processed > 0 or months_updated > 0:
                print(f"\nProcessing complete:")
                print(f"- Added {months_processed} new months")
                print(f"- Updated {months_updated} existing months")
            else:
                print("\nNo changes made to monthly_summary.")
                
            return months_processed, months_updated
        finally:
            session.close()