# src/scripts/load_historical_portfolio_data.py

import pandas as pd
import os
import sys
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional
import re

# Add the project root to Python path (go up from src/scripts/ to project root)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

# Import the classes we need
try:
    from src.repositories.portfolio_repository import PortfolioRepository
    from src.models.portfolio_models import PortfolioBalance, DataSource
    import database  # This is at project root level
except ImportError as e:
    print(f"Import error: {e}")
    print("Current working directory:", os.getcwd())
    print("Script location:", os.path.abspath(__file__))
    print("Project root should be:", project_root)
    print("Please run this script as:")
    print("  python3 src/scripts/load_historical_portfolio_data.py")
    sys.exit(1)


class HistoricalDataLoader:
    """One-time loader for historical portfolio data from Excel/CSV"""
    
    def __init__(self):
        self.portfolio_repo = PortfolioRepository()
        
        # Account name mapping from Excel to database names
        self.account_mapping = {
            'Wealthfront': 'Wealthfront Investment',
            'Charles Schwab': 'Schwab Brokerage', 
            'Acorns': 'Acorns',
            'Robinhood': 'Robinhood',
            '401k': '401(k) Plan',
            'Roth IRA': 'Roth IRA',
            'Wealthfront Cash Account': 'Wealthfront Cash'
        }
    
    def load_from_excel(self, file_path: str = "Investments.xlsx") -> bool:
        """
        Load historical data from Excel file
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            True if successful, False otherwise
        """
        if not os.path.exists(file_path):
            print(f"❌ Error: File '{file_path}' not found")
            return False
        
        
        try:
            # Read the Excel file
            # Try different sheet names that might contain the data
            sheet_names = ['Sheet1', 'Data', 'Investments', 'Portfolio']
            df = None
            
            for sheet_name in sheet_names:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)
                    print(f"✅ Successfully read sheet: {sheet_name}")
                    break
                except Exception:
                    continue
            
            if df is None:
                # Try reading without specifying sheet name (first sheet)
                df = pd.read_excel(file_path)
                print(f"✅ Successfully read first sheet")
            
            # Analyze the structure
            print(f"📋 Excel structure: {df.shape[0]} rows x {df.shape[1]} columns")
            print(f"📋 Columns: {list(df.columns)}")
            
            # Process the data based on the structure we saw in your screenshot
            return self._process_excel_data(df)
            
        except Exception as e:
            print(f"❌ Error reading Excel file: {str(e)}")
            return False
    
    def _process_excel_data(self, df: pd.DataFrame) -> bool:
        """
        Process the Excel data structure from your screenshot
        
        The structure appears to be:
        - First column: dates (as datetime objects)
        - Multiple account sections with columns like Beginning, Deposits, Ending, Change
        """
        try:
            print("🔍 Analyzing Excel structure...")
            
            # Get all column names
            columns = list(df.columns)
            print(f"📋 Found columns: {columns[:10]}...")  # Show first 10
            
            # Show first few rows to understand the data
            print("📋 First 5 rows of data:")
            print(df.head())
            
            # Find account sections by looking for "Ending" columns
            account_sections = self._identify_account_sections(columns)
            
            if not account_sections:
                print("❌ Could not identify account sections in Excel file")
                return False
            
            print(f"✅ Identified {len(account_sections)} account sections:")
            for account_name, col_info in account_sections.items():
                print(f"   - {account_name}: ending balance column {col_info['ending_col']}")
            
            # Extract balances from each account section
            balances_to_insert = []
            rows_processed = 0
            
            # Process each row (date)
            for idx, row in df.iterrows():
                # Get the date from the first column
                date_value = row.iloc[0]
                
                if idx < 5:  # Show first 5 rows for debugging
                    print(f"📋 Row {idx}: date='{date_value}' (type: {type(date_value)}), first few values: {list(row.iloc[:5])}")
                
                # Skip non-date rows (like headers)
                if not self._is_valid_date_row(date_value):
                    if idx < 10:  # Show why we're skipping early rows
                        print(f"   ⏭️  Skipping row {idx}: not a valid date")
                    continue
                
                rows_processed += 1
                
                # Parse the date
                try:
                    balance_date = self._parse_date(date_value)
                    print(f"   📅 Parsed date: {balance_date}")
                except Exception as e:
                    print(f"⚠️  Skipping row with invalid date: {date_value} - {str(e)}")
                    continue
                
                # Extract balance for each account
                for account_name, col_info in account_sections.items():
                    try:
                        # Get the ending balance value
                        ending_col = col_info['ending_col']
                        balance_value = row.iloc[ending_col] if ending_col < len(row) else None
                        
                        print(f"   💰 {account_name}: column {ending_col} = {balance_value} (type: {type(balance_value)})")
                        
                        # Skip if no value, zero, or dash
                        if pd.isna(balance_value) or balance_value == 0 or str(balance_value).strip() in ['-', '     -']:
                            print(f"      ⏭️  Skipping {account_name}: no value, zero, or dash")
                            continue
                        
                        # Convert to positive number (remove negative signs if any)
                        try:
                            balance_amount = abs(float(balance_value))
                            print(f"      ✅ {account_name}: ${balance_amount:,.2f}")
                        except (ValueError, TypeError):
                            print(f"      ⚠️  Skipping {account_name}: could not convert '{balance_value}' to number")
                            continue
                        
                        # Get account ID from database
                        db_account_name = self.account_mapping.get(account_name, account_name)
                        account = self.portfolio_repo.get_account_by_name(db_account_name)
                        
                        if not account:
                            print(f"⚠️  Account not found in database: {db_account_name}")
                            continue
                        
                        # Create balance entry
                        balance = PortfolioBalance(
                            account_id=account.id,
                            balance_date=balance_date,
                            balance_amount=Decimal(str(balance_amount)),
                            data_source=DataSource.CSV_IMPORT,
                            confidence_score=Decimal('1.0'),
                            notes=f"Historical import from {balance_date}"
                        )
                        
                        balances_to_insert.append(balance)
                        
                    except Exception as e:
                        print(f"⚠️  Error processing {account_name} for {date_value}: {str(e)}")
                        continue
                
                # Process all rows (remove debug limit)
                # if rows_processed >= 3:
                #     print(f"🛑 Stopping after {rows_processed} rows for debugging...")
                #     break
            
            # Show what we would insert
            if balances_to_insert:
                print(f"💾 Inserting {len(balances_to_insert)} balance records...")
                # Insert the actual data
                records_inserted = self.portfolio_repo.bulk_insert_balances(balances_to_insert)
                print(f"✅ Successfully inserted {records_inserted} balance records")
                
                # Show summary by account
                self._show_import_summary(balances_to_insert)
                
                return True
            else:
                print("❌ No valid balance data found to import")
                return False
                
        except Exception as e:
            print(f"❌ Error processing Excel data: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False
    
    def _identify_account_sections(self, columns: List[str]) -> Dict[str, Dict]:
        """
        Identify account sections in the Excel columns
        
        Based on the actual column structure we can see:
        Column 1: Wealthfront, Column 5: Charles Schwab, Column 9: Acorns, etc.
        Each account has 4 columns: Beginning, Deposits, Ending, Change
        So Ending is typically at position +2 from the account header
        """
        account_sections = {}
        
        # Based on the actual column output, map the correct positions
        section_mapping = {
            'Wealthfront': {'ending_col': 3},  # Wealthfront at col 1, ending at col 3
            'Charles Schwab': {'ending_col': 7},  # Charles Schwab at col 5, ending at col 7  
            'Acorns': {'ending_col': 11},  # Acorns at col 9, ending at col 11
            'Robinhood': {'ending_col': 15},  # Robinhood at col 13, ending at col 15
            '401k': {'ending_col': 19},  # 401K at col 17, ending at col 19
            'Roth IRA': {'ending_col': 23},  # Roth IRA at col 21, ending at col 23
            'Wealthfront Cash Account': {'ending_col': 27}  # Wealthfront Cash at col 25, ending at col 27
        }
        
        # Validate that these columns exist
        total_cols = len(columns)
        print(f"📋 Total columns available: {total_cols}")
        
        for account_name, col_info in section_mapping.items():
            if col_info['ending_col'] < total_cols:
                account_sections[account_name] = col_info
                print(f"   ✅ {account_name}: ending column {col_info['ending_col']}")
            else:
                print(f"   ❌ {account_name}: ending column {col_info['ending_col']} exceeds total columns")
        
        return account_sections
    
    def _is_valid_date_row(self, date_value) -> bool:
        """Check if a row contains a valid date"""
        if not date_value or str(date_value).lower() in ['nan', 'none', '', 'month']:
            return False
        
        # Check if it's already a datetime object (from Excel)
        if hasattr(date_value, 'date') or 'datetime' in str(type(date_value)):
            return True
        
        # Look for patterns like "Sep-20", "Oct-20", etc.
        date_pattern = r'^[A-Za-z]{3}-\d{2}$'
        return bool(re.match(date_pattern, str(date_value)))
    
    def _parse_date(self, date_input) -> date:
        """
        Parse date from Excel format (datetime object or string like "Sep-20")
        """
        try:
            # Handle datetime objects from Excel
            if hasattr(date_input, 'date'):
                return date_input.date()
            
            # Handle pandas Timestamp
            if hasattr(date_input, 'to_pydatetime'):
                return date_input.to_pydatetime().date()
            
            # Convert to string for string parsing
            date_str = str(date_input)
            
            # Handle format like "Sep-20"
            if '-' in date_str and len(date_str.split('-')) == 2:
                month_abbr, year_short = date_str.split('-')
                
                # Convert 2-digit year to 4-digit (assuming 20xx)
                if len(year_short) == 2:
                    year = 2000 + int(year_short)
                    
                    # Parse month abbreviation
                    month_mapping = {
                        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
                    }
                    
                    month = month_mapping.get(month_abbr, 1)
                    
                    # Use last day of month for consistency
                    if month == 12:
                        next_month = date(year + 1, 1, 1)
                    else:
                        next_month = date(year, month + 1, 1)
                    
                    last_day = next_month.replace(day=1) - pd.Timedelta(days=1)
                    return last_day.date()
            
            # Fallback - try direct parsing
            parsed_date = pd.to_datetime(date_input)
            return parsed_date.date()
            
        except Exception as e:
            raise ValueError(f"Could not parse date: {date_input}")
    
    def _show_import_summary(self, balances: List[PortfolioBalance]):
        """Show summary of imported data"""
        
        # Group by account
        by_account = {}
        for balance in balances:
            account_id = balance.account_id
            if account_id not in by_account:
                by_account[account_id] = []
            by_account[account_id].append(balance)
        
        # Show summary for each account
        for account_id, account_balances in by_account.items():
            account = self.portfolio_repo.get_account_by_id(account_id)
            if account:
                dates = [b.balance_date for b in account_balances]
                amounts = [float(b.balance_amount) for b in account_balances]
                
                print(f"   📈 {account.account_name}:")
                print(f"      - {len(account_balances)} balance records")
                print(f"      - Date range: {min(dates)} to {max(dates)}")
                print(f"      - Amount range: ${min(amounts):,.2f} to ${max(amounts):,.2f}")


def main():
    """Main function to run the historical data import"""
    print("🚀 Starting Historical Portfolio Data Import")
    print("=" * 50)
    print(f"Working directory: {os.getcwd()}")
    print(f"Running from: {os.path.abspath(__file__)}")
    
    # Initialize database (this will create tables and seed accounts)
    try:
        # You'll need to provide your categories list
        categories = [
            'Payment', 'Pay', 'Rent', 'Car', 'Insurance', 'Acorns', 'Wealthfront',
            'Robinhood', 'Schwab', 'Utilities', 'Gas', 'Recreation', 'Food',
            'Groceries', 'Travel', 'Shopping', 'Venmo', 'Subscriptions', 'Amazon', 'Misc'
        ]
        
        database.init_database(categories)
        print("✅ Database initialized successfully")
        
    except Exception as e:
        print(f"❌ Error initializing database: {str(e)}")
        return False
    
    # Load historical data
    loader = HistoricalDataLoader()
    
    # Load from your specific Excel file
    file_path = "Investments.xlsx"
    
    if os.path.exists(file_path):
        print(f"\n📂 Found file: {file_path}")
        success = loader.load_from_excel(file_path)
    else:
        print(f"❌ File not found: {file_path}")
        success = False
    
    if success:
        print("\n🎉 Historical data import completed successfully!")
        print("\n⚠️  IMPORTANT: This script should be run only once.")
        print("   Delete this script file after successful import.")
    else:
        print("\n❌ Historical data import failed.")
        print("   Please check the file path and format.")
    
    return success


if __name__ == "__main__":
    main()