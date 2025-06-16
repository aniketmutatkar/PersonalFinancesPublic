# src/services/import_service.py

"""
Import service for processing financial data files.
"""

import os
import pandas as pd
from decimal import Decimal
from typing import Dict, Set, Optional, Tuple, List
from datetime import date

from src.models.models import Transaction, Category, MonthlySummary
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.config.config_manager import ConfigManager


class ImportService:
    """Service for importing and processing financial data"""
    
    def __init__(
        self,
        transaction_repository: TransactionRepository,
        monthly_summary_repository: MonthlySummaryRepository,
        config_manager: ConfigManager
    ):
        self.transaction_repository = transaction_repository
        self.monthly_summary_repository = monthly_summary_repository
        self.config_manager = config_manager
        self.categories = config_manager.get_categories()
        self.category_mapping = config_manager.get_category_mapping()
    
    def categorize_transaction(self, description: str, existing_category: Optional[str] = None) -> str:
        """
        Categorize a transaction based on its description.
        
        Args:
            description: Transaction description
            existing_category: Optional existing category
            
        Returns:
            Category name
        """
        description = str(description).lower()
        
        # Check if we have an existing category worth keeping
        if existing_category and pd.notna(existing_category):
            # Check if the existing category matches any in our categories
            if existing_category in self.categories:
                return existing_category
            
            # Check if there's a mapping for this category
            if existing_category in self.category_mapping:
                return self.category_mapping[existing_category]
        
        # Check against all categories
        for name, category in self.categories.items():
            if category.matches(description):
                return name
        
        # Default to Misc if no match found
        return 'Misc'
    
    def standardize_amount(self, row: Dict, account_type: str) -> Decimal:
        """
        Standardize amount values across different bank formats.
        
        Args:
            row: Dictionary containing transaction data
            account_type: Bank account type ('chase', 'wells', 'citi')
            
        Returns:
            Standardized amount as Decimal
        """
        # Get the amount value
        amount = row.get('Amount', 0)
        
        # Handle different account types
        if account_type in ['chase', 'wells']:
            base_amount = -amount  # Reverse the sign
        elif account_type == 'citi':
            # For Citi, we need to interpret Credit/Debit
            if 'Type' in row:
                # Credit = money in (negative), Debit = money out (positive)
                base_amount = -amount if row['Type'] == 'Credit' else amount
            else:
                # Default fallback without Type
                base_amount = amount
        else:
            # For other account types, assume regular convention
            base_amount = amount
        
        # Handle Pay/Payroll transactions - ensure they're always negative
        if 'Category' in row and row['Category'] in ['Pay', 'Payment']:
            return Decimal(str(-abs(base_amount)))  # Force negative
        
        # Handle Zelle transfers specifically
        if 'Description' in row and isinstance(row['Description'], str):
            description = row['Description'].lower()
            if 'zelle from' in description:
                # Money coming in - make negative
                return Decimal(str(-abs(base_amount)))
            elif 'zelle to' in description:
                # Money going out - make positive
                return Decimal(str(abs(base_amount)))
        
        # Return the base amount for regular transactions
        return Decimal(str(base_amount))
    
    def process_bank_file(self, file_path: str, original_filename: str = None) -> pd.DataFrame:
        """
        Process a bank transaction file based on its name.
        
        Args:
            file_path: Path to the bank file
            original_filename: Original filename before server processing (optional)
            
        Returns:
            DataFrame with processed transactions
        """
        # SAFETY FIX: Handle filename properly
        if original_filename and isinstance(original_filename, str) and original_filename.strip():
            filename_to_check = original_filename.lower()
        elif file_path:
            filename_to_check = os.path.basename(file_path).lower()
        else:
            raise ValueError("No valid filename provided for bank type detection")
        
        df = None
        
        # Determine bank type from filename - YOUR EXISTING LOGIC UNCHANGED
        if 'chase' in filename_to_check:
            source = 'chase'
            df = pd.read_csv(file_path)
            df = df.drop(['Post Date', 'Memo'], axis=1) if all(col in df.columns for col in ['Post Date', 'Memo']) else df
            df = df.rename(columns={'Transaction Date': 'Date'}) if 'Transaction Date' in df.columns else df
        
        elif 'citi' in filename_to_check:
            source = 'citi'
            df = pd.read_csv(file_path)
            # Process Citi specific format
            if all(col in df.columns for col in ['Debit', 'Credit']):
                df['Amount'] = df['Debit'].fillna(df['Credit'])
                df['Type'] = 'Debit'
                df.loc[df['Credit'].notnull(), 'Type'] = 'Credit'
                df = df.drop(['Debit', 'Credit', 'Status', 'Member Name'], axis=1) if all(col in df.columns for col in ['Status', 'Member Name']) else df
        
        elif 'wells' in filename_to_check or 'fargo' in filename_to_check:
            source = 'wells'
            df = pd.read_csv(file_path)
            # Handle Wells Fargo format
            if len(df.columns) >= 5 and 'Date' not in df.columns:
                header = ['Date', 'Amount', 'A', 'B', 'Description']
                df.columns = header[:len(df.columns)]
                if len(df.columns) >= 5:
                    df = df.drop(['A', 'B'], axis=1)
        
        if df is None:
            raise ValueError(f"Could not determine bank type for file: {filename_to_check}")
        
        # Add source information
        df['source'] = source
        
        # Standardize amount
        df['Amount'] = df.apply(lambda row: self.standardize_amount(row, source), axis=1)
        
        # Categorize transactions
        df['Category'] = df.apply(lambda row: self.categorize_transaction(
            row['Description'], 
            row.get('Category') if 'Category' in row else None
        ), axis=1)
        
        # Add Month column
        df['Month'] = pd.to_datetime(df['Date']).dt.to_period('M')
        
        # Add transaction hash
        df['transaction_hash'] = df.apply(lambda row: Transaction.create_hash(
            row['Date'], row['Description'], row['Amount'], row['source']
        ), axis=1)
        
        # Add month string
        df['month_str'] = df['Month'].astype(str)
        
        return df
    
    def process_raw_directory(self) -> Optional[pd.DataFrame]:
        """
        Process all files in the raw directory.
        
        Returns:
            DataFrame with all processed transactions or None if no files
        """
        raw_dir = self.config_manager.raw_dir
        
        if not os.path.exists(raw_dir):
            print(f"Directory '{raw_dir}' does not exist.")
            return None
        
        # Process each file in the raw directory
        all_dfs = []
        all_affected_data = {}  # Combined affected months and categories
        
        for filename in os.listdir(raw_dir):
            if filename.endswith(('.csv', '.CSV')):
                file_path = os.path.join(raw_dir, filename)
                
                df = self.process_bank_file(file_path)
                if df is not None:
                    # Get existing hashes from repository
                    existing_hashes = self.transaction_repository.get_existing_hashes()
                    
                    # Create a mask for new transactions only
                    new_transactions_mask = ~df['transaction_hash'].isin(existing_hashes)
                    
                    # Only run human intervention on NEW Misc transactions
                    if new_transactions_mask.any():
                        # Create a temporary dataframe with just the new transactions
                        new_df = df[new_transactions_mask].copy()
                        # Only categorize if we have new "Misc" transactions
                        if (new_df['Category'] == 'Misc').any():
                            # In the simplified version, this would be handled separately
                            # For the POC, we'll just print the misc transactions
                            print(f"Found {(new_df['Category'] == 'Misc').sum()} new Misc transactions.")
                        
                        # Update the original dataframe with the new categories
                        df.update(new_df)
                    
                    all_dfs.append(df)
                    
                    # Convert to Transaction objects
                    transactions = []
                    for _, row in df.iterrows():
                        transaction = Transaction(
                            date=pd.to_datetime(row['Date']).date(),
                            description=str(row['Description']),
                            amount=row['Amount'],
                            category=str(row['Category']),
                            source=str(row['source']),
                            transaction_hash=str(row['transaction_hash']),
                            month_str=str(row['month_str'])
                        )
                        transactions.append(transaction)
                    
                    # Save to database and track affected months/categories
                    records_added, affected_data = self.transaction_repository.save_many(transactions)
                    
                    # Merge affected data with main tracking dict
                    for month, categories in affected_data.items():
                        if month not in all_affected_data:
                            all_affected_data[month] = set()
                        all_affected_data[month].update(categories)
                    
                    print(f"Added {records_added} new transactions from {filename}")
        
        # Update monthly summary for affected months and categories
        if all_affected_data:
            print(f"Months affected by new transactions: {sorted(all_affected_data.keys())}")
            for month, categories in all_affected_data.items():
                cat_list = sorted(categories)
                print(f"  {month}: {cat_list}")
            
            self.monthly_summary_repository.update_from_transactions(all_affected_data, self.categories)
        
        # Return combined dataframe if we have any data
        if all_dfs:
            return pd.concat(all_dfs, ignore_index=True)
        
        return None
    
    def import_historical_data(self, force: bool = False) -> bool:
        """
        Import historical data from Excel file.
        
        Args:
            force: If True, import even if data already exists
            
        Returns:
            True if imported, False otherwise
        """        
        print("Checking for historical data...")
        
        # Check if we already have data in monthly_summary
        summaries = self.monthly_summary_repository.find_all()
        
        if summaries and not force:
            print("Historical data already imported.")
            return False
        
        if not os.path.exists('FinancesEdit.xlsx'):
            print("FinancesEdit.xlsx file not found.")
            return False
        
        print("Importing historical data from FinancesEdit.xlsx...")
        
        try:
            # Read the Expenses sheet
            expenses_df = pd.read_excel('FinancesEdit.xlsx', sheet_name='Expenses')
            
            # Filter out rows that don't represent actual months
            # Looking for rows where the first column has a month/year format
            valid_rows = []
            
            for idx, row in expenses_df.iterrows():
                first_col = str(row.iloc[0]).strip()
                
                # Skip rows with "Average", "Total", "Percent", etc.
                if any(keyword in first_col.lower() for keyword in ['average', 'total', 'percent', '%']):
                    continue
                    
                try:
                    # Try to parse as a date
                    date_obj = pd.to_datetime(first_col)
                    valid_rows.append(row)
                except:
                    # If it fails to parse as a date, skip this row
                    continue
            
            if not valid_rows:
                print("No valid monthly data found in Excel file.")
                return False
                
            # Convert valid rows to DataFrame
            monthly_data = pd.DataFrame(valid_rows)
            
            # Assume the first column contains the month/year
            monthly_data.rename(columns={monthly_data.columns[0]: 'Month'}, inplace=True)
            
            # Process each row
            for idx, row in monthly_data.iterrows():
                month_str = str(row['Month'])
                try:
                    date_obj = pd.to_datetime(month_str)
                    month = date_obj.strftime('%B')  # Month name
                    year = date_obj.year
                    month_year = date_obj.strftime('%B %Y')
                except:
                    print(f"Skipping row with invalid date: {month_str}")
                    continue
                
                # Create category totals
                category_totals = {}
                for category_name, category in self.categories.items():
                    try:
                        # Try to find the column with this category
                        if category_name in monthly_data.columns:
                            value = float(row[category_name]) if pd.notna(row[category_name]) else 0
                            # Round to 2 decimal places
                            value = round(value, 2)
                            category_totals[category_name] = Decimal(str(value))
                    except:
                        category_totals[category_name] = Decimal('0')
                
                # Create monthly summary object
                summary = MonthlySummary(
                    month=month,
                    year=year,
                    month_year=month_year,
                    category_totals=category_totals
                )
                
                # Calculate totals
                summary.calculate_totals(self.categories)
                
                # Save to repository
                self.monthly_summary_repository.save(summary)
            
            print(f"Imported {len(valid_rows)} months of historical data.")
            return True
            
        except Exception as e:
            print(f"Error importing historical data: {str(e)}")
            return False