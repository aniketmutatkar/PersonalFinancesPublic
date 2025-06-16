# src/scripts/import_historical_bank_data.py

import pandas as pd
from datetime import datetime, date
from decimal import Decimal
import calendar
import os
import sys
import pandas as pd
import decimal

# Add the project root to Python path (go up from src/scripts/ to project root)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from src.models.portfolio_models import BankBalance
from src.repositories.bank_balance_repository import BankBalanceRepository


class HistoricalBankDataImporter:
    """Import historical bank balance data from Excel file"""
    
    def __init__(self):
        self.bank_repo = BankBalanceRepository()
    
    def import_from_excel(self, excel_file_path: str) -> dict:
        """
        Import historical bank balance data from your Excel file
        
        Expected columns: Month, Beginning, Deposits, Withdrawls (note: missing 'a'), Ending
        """
        
        # Read the Excel file
        df = pd.read_excel(excel_file_path)
        print(f"📈 Found {len(df)} rows of data")
        
        # Print column names for debugging
        print(f"📋 Columns: {list(df.columns)}")
        
        # Clean the data - remove empty rows and summary rows
        df = df.dropna(subset=['Month'])  # Remove rows where Month is NaN
        df = df[df['Month'] != 'Averages']  # Remove summary rows
        
        balances_to_insert = []
        
        for index, row in df.iterrows():
            try:
                # Skip if any required fields are missing or invalid
                if pd.isna(row['Month']) or pd.isna(row['Beginning']) or pd.isna(row['Ending']):
                    print(f"⏭️  Skipping row {index}: missing required data")
                    continue
                
                # Parse the month (handle datetime format)
                month_str = str(row['Month']).strip()
                statement_month, statement_date = self._parse_month(month_str)
                
                # Parse numeric values with error handling
                try:
                    beginning_balance = Decimal(str(row['Beginning']).replace(',', '').replace('$', ''))
                    ending_balance = Decimal(str(row['Ending']).replace(',', '').replace('$', ''))
                except (ValueError, decimal.InvalidOperation) as e:
                    print(f"⏭️  Skipping row {index}: invalid numeric data - {e}")
                    continue
                
                # Handle deposits and withdrawals (note the misspelling in your Excel)
                deposits = None
                withdrawals = None
                
                # Check for 'Withdrawls' (misspelled) or 'Withdrawals' (correct)
                withdrawal_col = None
                if 'Withdrawls' in row:
                    withdrawal_col = 'Withdrawls'
                elif 'Withdrawals' in row:
                    withdrawal_col = 'Withdrawals'
                
                if not pd.isna(row['Deposits']):
                    try:
                        deposits = Decimal(str(row['Deposits']).replace(',', '').replace('$', ''))
                    except (ValueError, decimal.InvalidOperation):
                        deposits = None
                
                if withdrawal_col and not pd.isna(row[withdrawal_col]):
                    try:
                        withdrawals = Decimal(str(row[withdrawal_col]).replace(',', '').replace('$', ''))
                    except (ValueError, decimal.InvalidOperation):
                        withdrawals = None
                
                # Create bank balance entry
                bank_balance = BankBalance(
                    account_name="Wells Fargo Checking",  # Assume checking account for historical data
                    statement_month=statement_month,
                    beginning_balance=beginning_balance,
                    ending_balance=ending_balance,
                    deposits_additions=deposits,
                    withdrawals_subtractions=withdrawals,
                    statement_date=statement_date,
                    data_source='excel_import',
                    confidence_score=Decimal('1.0'),
                    notes=f"Historical data imported from Excel for {statement_month}"
                )
                
                balances_to_insert.append(bank_balance)
                print(f"✅ Processed {statement_month}: Beginning: ${beginning_balance}, Ending: ${ending_balance}")
                
            except Exception as e:
                print(f"❌ Error processing row {index} ({row['Month']}): {e}")
                continue
        
        # Bulk insert
        print(f"\n💾 Inserting {len(balances_to_insert)} bank balance records...")
        inserted_count = self.bank_repo.bulk_insert_balances(balances_to_insert)
        
        return {
            "total_rows": len(df),
            "processed": len(balances_to_insert),
            "inserted": inserted_count,
            "skipped": len(balances_to_insert) - inserted_count
        }

    def _parse_month(self, month_str: str) -> tuple[str, date]:
        """
        Parse month string in various formats into ('2020-09', date(2020, 9, 30))
        """
        try:
            # Handle datetime objects or datetime strings like '2020-09-01 00:00:00'
            if isinstance(month_str, pd.Timestamp) or '00:00:00' in str(month_str):
                # Convert to pandas timestamp if it's a string
                if isinstance(month_str, str):
                    timestamp = pd.to_datetime(month_str)
                else:
                    timestamp = month_str
                
                year = timestamp.year
                month_num = timestamp.month
                
                # Create statement month string (YYYY-MM)
                statement_month = f"{year}-{month_num:02d}"
                
                # Create statement date (last day of month)
                last_day = calendar.monthrange(year, month_num)[1]
                statement_date = date(year, month_num, last_day)
                
                return statement_month, statement_date
                
            # Handle formats like "Sep-20", "Sep-2020", etc.
            elif '-' in str(month_str):
                month_part, year_part = str(month_str).split('-')
                
                # Convert year to 4 digits if needed
                if len(year_part) == 2:
                    year = 2000 + int(year_part)
                else:
                    year = int(year_part)
                
                # Convert month name to number
                month_num = datetime.strptime(month_part, '%b').month
                
                # Create statement month string (YYYY-MM)
                statement_month = f"{year}-{month_num:02d}"
                
                # Create statement date (last day of month)
                last_day = calendar.monthrange(year, month_num)[1]
                statement_date = date(year, month_num, last_day)
                
                return statement_month, statement_date
                    
        except Exception as e:
            print(f"Error parsing month '{month_str}': {e}")
            raise
        
        raise ValueError(f"Could not parse month string: {month_str}")
    
def main():
    """Run the historical data import"""
    importer = HistoricalBankDataImporter()
    
    # Update this path to your Excel file
    excel_file_path = "Bank Statements.xlsx"
    
    try:
        results = importer.import_from_excel(excel_file_path)
        
        print(f"\n🎉 Import completed!")
        print(f"   ✅ Successfully processed: {results['processed']}")
        print(f"   💾 Inserted into database: {results['inserted']}")
        print(f"   ⏭️  Skipped (duplicates): {results['skipped']}")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")


if __name__ == "__main__":
    main()