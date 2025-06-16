# src/services/reporting_service.py

import os
from typing import Optional, Dict, List
import pandas as pd
from tabulate import tabulate
from datetime import date

from src.models.models import MonthlySummary, Transaction
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository


class ReportingService:
    """Service for generating financial reports"""
    
    def __init__(
        self,
        transaction_repository: TransactionRepository,
        monthly_summary_repository: MonthlySummaryRepository
    ):
        self.transaction_repository = transaction_repository
        self.monthly_summary_repository = monthly_summary_repository
    
    def generate_monthly_summary_report(self) -> Optional[pd.DataFrame]:
        """
        Generate and display monthly summary report.
        
        Returns:
            DataFrame with monthly summary data or None if no data
        """
        # Get all monthly summaries
        summaries = self.monthly_summary_repository.find_all()
        
        if not summaries:
            print("No monthly summary data available.")
            return None
        
        # Convert to DataFrame
        data = []
        for summary in summaries:
            row = {
                'id': summary.id,
                'month_year': summary.month_year,
                'month': summary.month,
                'year': summary.year,
                'total': float(summary.total),
                'investment_total': float(summary.investment_total),
                'total_minus_invest': float(summary.total_minus_invest)
            }
            
            # Add category totals
            for category, amount in summary.category_totals.items():
                row[category] = float(amount)
            
            data.append(row)
        
        # Create DataFrame
        summary_df = pd.DataFrame(data)
        
        # Create a display copy
        display_df = summary_df.copy()
        
        # Drop ID column for display
        if 'id' in display_df.columns:
            display_df = display_df.drop(['id'], axis=1)
        
        # Format month_year as index
        display_df.set_index('month_year', inplace=True)
        
        # Drop redundant columns
        display_df = display_df.drop(['month', 'year'], axis=1)
        
        print("\nMonthly Expense Summary:")
        print(tabulate(display_df, headers='keys', tablefmt='psql', floatfmt='.2f'))
        
        return summary_df
    
    def get_transactions_report(
        self, 
        categories: Optional[List[str]] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None,
        month_str: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_direction: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> Optional[pd.DataFrame]:
        """
        Get detailed transaction report with advanced filtering.
        Now includes aggregate statistics for all filtered transactions.
        """
        # Handle legacy single category parameter
        if category and not categories:
            categories = [category]
        
        print(f"  categories={categories}")
        print(f"  description={description}")
        print(f"  start_date={start_date}")
        print(f"  end_date={end_date}")
        print(f"  month_str={month_str}")
        print(f"  limit={limit}, offset={offset}")
        
        transactions, total_count, total_sum, avg_amount = self.transaction_repository.find_with_filters(
            categories=categories,
            description=description,
            start_date=start_date,
            end_date=end_date,
            month_str=month_str,
            sort_field=sort_field,
            sort_direction=sort_direction,
            limit=limit,
            offset=offset
        )
        
        print(f"Aggregates: total_sum={total_sum}, avg_amount={avg_amount}")
        print(f"Aggregate types: total_sum={type(total_sum)}, avg_amount={type(avg_amount)}") 
        
        if not transactions:
            print("No transactions found matching the criteria.")
            return None
        
        # Convert to DataFrame
        data = []
        for tx in transactions:
            data.append({
                'id': tx.id,
                'date': tx.date,
                'description': tx.description,
                'amount': float(tx.amount),
                'category': tx.category,
                'source': tx.source,
                'transaction_hash': tx.transaction_hash,
                'month_str': tx.month_str,
                'total_count': total_count,  # Include total count for pagination
                'total_sum': float(total_sum),    # NEW: Add aggregate total sum
                'avg_amount': float(avg_amount)   # NEW: Add aggregate average
            })
        
        transactions_df = pd.DataFrame(data)

        # Add debug logging to verify the aggregates are in the DataFrame
        if not transactions_df.empty:
            print(f"Sample row total_sum: {transactions_df.iloc[0]['total_sum']}")
        
        # Format the date column
        if 'date' in transactions_df.columns:
            transactions_df['date'] = pd.to_datetime(transactions_df['date'])
        
        # Format the amount column to 2 decimal places
        if 'amount' in transactions_df.columns:
            transactions_df['amount'] = transactions_df['amount'].round(2)
        
        if not transactions_df.empty:
            print(f"Categories found: {sorted(transactions_df['category'].unique())}")
        
        return transactions_df
    def export_to_csv(self, df: pd.DataFrame, filename: str) -> None:
        """
        Export DataFrame to CSV.
        
        Args:
            df: DataFrame to export
            filename: Output filename
        """
        if df is None:
            print(f"No data to export to {filename}")
            return
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        df.to_csv(filename, index=False)
        print(f"Exported data to {filename}")