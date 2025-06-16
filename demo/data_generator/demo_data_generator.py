#!/usr/bin/env python3
"""
Create demo_data.db that mimics your EXACT production database structure
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from database import init_database, engine, get_db_session
from src.config.config_manager import ConfigManager
import random
from datetime import datetime, date, timedelta
from decimal import Decimal

def create_demo_database():
    """Create demo database with EXACT same structure as production"""
    
    print("🎯 Creating demo database with production structure...")
    
    # Remove existing demo database
    if os.path.exists("demo_data.db"):
        os.remove("demo_data.db")
        print("Removed existing demo_data.db")
    
    # Update the database configuration to point to demo database
    import database
    database.DB_NAME = 'demo_data.db'
    database.DB_URL = 'sqlite:///demo_data.db'
    database.engine = database.create_engine(database.DB_URL)
    database.SessionLocal = database.sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
    
    try:
        # Load config to get categories
        config_manager = ConfigManager()
        categories = config_manager.get_categories()
        
        # Initialize database with EXACT same structure
        init_database(categories.keys())
        
        print("✅ Database structure created successfully")
        
        # Verify the monthly_summary table was created
        session = get_db_session()
        try:
            result = session.execute(database.text("SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_summary'"))
            if result.fetchone():
                print("✅ monthly_summary table exists")
            else:
                print("❌ monthly_summary table missing")
                # Create it manually
                from database import create_monthly_summary_table
                create_monthly_summary_table(categories.keys())
                print("✅ Created monthly_summary table manually")
        finally:
            session.close()
        
        # Generate demo data
        generate_demo_data(categories)
        
        print("✅ Demo database created: demo_data.db")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise


def generate_demo_data(categories):
    """Generate realistic demo data"""
    print("📊 Generating demo data...")
    
    # Get a fresh session with the correct database
    session = get_db_session()
    
    try:
        # Generate transactions
        transactions = generate_transactions(categories)
        
        # Save transactions
        from database import TransactionModel
        for trans_data in transactions:
            transaction = TransactionModel(**trans_data)
            session.add(transaction)
        
        session.commit()
        print(f"✅ Generated {len(transactions)} transactions")
        
        # Generate portfolio data
        generate_portfolio_data(session)
        
        # Generate bank balances
        generate_bank_balances(session)
        
        # Skip monthly summaries for now - table creation issue
        generate_monthly_summaries(session, categories)
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error generating demo data: {e}")
        raise
    finally:
        session.close()


def generate_transactions(categories):
    """Generate realistic transactions using your categories"""
    transactions = []
    
    # Date range: 2 years
    start_date = date(2023, 1, 1)
    end_date = date(2025, 6, 1)
    
    # Income transactions (biweekly salary)
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() == 4:  # Friday
            transactions.append({
                'date': current_date,
                'description': 'PAYROLL DEPOSIT - DEMO COMPANY',
                'amount': 6000.0,
                'category': 'Income',
                'source': 'Wells Fargo Checking',
                'month': current_date.strftime('%Y-%m'),
                'transaction_hash': f"income_{current_date.isoformat()}_{random.randint(1000,9999)}"
            })
            current_date += timedelta(days=14)
        else:
            current_date += timedelta(days=1)
    
    # Monthly rent
    current_date = start_date.replace(day=1)
    while current_date <= end_date:
        transactions.append({
            'date': current_date,
            'description': 'RENT PAYMENT - DEMO APARTMENTS',
            'amount': -2400.0,
            'category': 'Rent',
            'source': 'Wells Fargo Checking',
            'month': current_date.strftime('%Y-%m'),
            'transaction_hash': f"rent_{current_date.isoformat()}_{random.randint(1000,9999)}"
        })
        
        # Next month
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    # Food transactions
    current_date = start_date
    food_places = ['WHOLE FOODS', 'CHIPOTLE', 'STARBUCKS', 'SAFEWAY', 'TRADER JOES']
    while current_date <= end_date:
        if random.random() < 0.6:  # 60% chance daily
            place = random.choice(food_places)
            amount = -random.uniform(15, 120)
            transactions.append({
                'date': current_date,
                'description': f'{place} PURCHASE',
                'amount': round(amount, 2),
                'category': 'Food',
                'source': 'Wells Fargo Checking',
                'month': current_date.strftime('%Y-%m'),
                'transaction_hash': f"food_{current_date.isoformat()}_{place}_{random.randint(1000,9999)}"
            })
        current_date += timedelta(days=1)
    
    # Investment transactions
    current_date = start_date.replace(day=1)
    investments = [
        ('WEALTHFRONT', -800, 1),
        ('SCHWAB', -400, 5),
        ('ROBINHOOD', -200, 15)
    ]
    
    for inv_name, amount, day in investments:
        temp_date = current_date.replace(day=day)
        while temp_date <= end_date:
            transactions.append({
                'date': temp_date,
                'description': f'TRANSFER TO {inv_name}',
                'amount': amount,
                'category': 'Investment',
                'source': 'Wells Fargo Checking',
                'month': temp_date.strftime('%Y-%m'),
                'transaction_hash': f"invest_{inv_name}_{temp_date.isoformat()}_{random.randint(1000,9999)}"
            })
            
            # Next month
            if temp_date.month == 12:
                temp_date = temp_date.replace(year=temp_date.year + 1, month=1)
            else:
                temp_date = temp_date.replace(month=temp_date.month + 1)
    
    # Weekly Acorns
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() == 0:  # Monday
            transactions.append({
                'date': current_date,
                'description': 'ACORNS ROUNDUP',
                'amount': -25.0,
                'category': 'Investment',
                'source': 'Wells Fargo Checking',
                'month': current_date.strftime('%Y-%m'),
                'transaction_hash': f"acorns_{current_date.isoformat()}_{random.randint(1000,9999)}"
            })
        current_date += timedelta(days=1)
    
    # Random other transactions
    other_categories = [
        ('Transportation', ['SHELL', 'UBER', 'LYFT'], -30, -100),
        ('Shopping', ['AMAZON', 'TARGET', 'WALMART'], -20, -200),
        ('Entertainment', ['NETFLIX', 'SPOTIFY', 'AMC'], -10, -80),
        ('Utilities', ['PG&E', 'COMCAST', 'VERIZON'], -50, -150),
        ('Healthcare', ['MEDICAL GROUP', 'PHARMACY'], -40, -300)
    ]
    
    current_date = start_date
    while current_date <= end_date:
        for cat_name, vendors, min_amt, max_amt in other_categories:
            if random.random() < 0.15:  # 15% chance daily
                vendor = random.choice(vendors)
                amount = round(random.uniform(min_amt, max_amt), 2)
                transactions.append({
                    'date': current_date,
                    'description': f'{vendor} PURCHASE',
                    'amount': amount,
                    'category': cat_name,
                    'source': 'Wells Fargo Checking',
                    'month': current_date.strftime('%Y-%m'),
                    'transaction_hash': f"{cat_name.lower()}_{current_date.isoformat()}_{vendor}_{random.randint(1000,9999)}"
                })
        current_date += timedelta(days=1)
    
    return transactions


def generate_portfolio_data(session):
    """Generate portfolio balance data"""
    print("📈 Generating portfolio data...")
    
    from database import PortfolioBalanceModel, InvestmentAccountModel
    
    # Get investment accounts
    accounts = session.query(InvestmentAccountModel).all()
    
    # Portfolio allocations
    allocations = {
        'Wealthfront Investment': 0.375,
        'Schwab Brokerage': 0.225,
        'Robinhood': 0.10,
        'Acorns': 0.075,
        '401(k) Plan': 0.175,
        'Roth IRA': 0.04,
        'Wealthfront Cash': 0.01
    }
    
    # Generate monthly balances for 2 years
    current_date = date(2023, 1, 1)
    total_portfolio = 150000.0  # Starting value
    
    while current_date <= date(2026, 6, 1):
        # Grow portfolio with market gains + contributions
        months_elapsed = (current_date.year - 2023) * 12 + (current_date.month - 1)
        monthly_contribution = 1425  # Monthly investments
        market_growth = 1 + (0.085 / 12)  # 8.5% annual return
        
        total_portfolio = (150000 + monthly_contribution * months_elapsed) * (market_growth ** months_elapsed)
        
        # Add some volatility
        volatility = random.uniform(0.95, 1.05)
        total_portfolio *= volatility
        
        for account in accounts:
            if account.account_name in allocations:
                account_balance = total_portfolio * allocations[account.account_name]
                
                balance = PortfolioBalanceModel(
                    account_id=account.id,
                    balance_date=current_date,
                    balance_amount=round(account_balance, 2),
                    data_source='manual'
                )
                session.add(balance)
        
        # Next month
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    session.commit()
    print(f"✅ Generated portfolio data (final value: ${total_portfolio:,.2f})")


def generate_bank_balances(session):
    """Generate bank balance data"""
    print("🏦 Generating bank balances...")
    
    from database import BankBalanceModel
    
    accounts = [
        ('Wells Fargo Checking', 15000),
        ('Wells Fargo Savings', 25000)
    ]
    
    current_date = date(2023, 1, 1)
    
    for account_name, base_balance in accounts:
        temp_date = current_date
        previous_balance = base_balance
        
        while temp_date <= date(2025, 6, 1):
            if 'Checking' in account_name:
                deposits = random.uniform(6000, 8000)
                withdrawals = random.uniform(5800, 7800)
            else:
                deposits = random.uniform(500, 1500)
                withdrawals = random.uniform(0, 300)
            
            ending_balance = previous_balance + deposits - withdrawals
            ending_balance = max(ending_balance * random.uniform(0.95, 1.05), 1000)
            
            balance = BankBalanceModel(
                account_name=account_name,
                statement_month=temp_date.strftime('%Y-%m'),
                beginning_balance=round(previous_balance, 2),
                ending_balance=round(ending_balance, 2),
                deposits_additions=round(deposits, 2),
                withdrawals_subtractions=round(withdrawals, 2),
                statement_date=temp_date
            )
            session.add(balance)
            
            previous_balance = ending_balance
            
            # Next month
            if temp_date.month == 12:
                temp_date = temp_date.replace(year=temp_date.year + 1, month=1)
            else:
                temp_date = temp_date.replace(month=temp_date.month + 1)
    
    session.commit()
    print("✅ Generated bank balance data")


def generate_monthly_summaries(session, categories):
    """Generate monthly summary data"""
    print("📊 Generating monthly summaries...")
    
    # This uses your existing monthly summary table structure
    from sqlalchemy import text
    
    # Get all transactions by month
    result = session.execute(text("""
        SELECT month, category, SUM(ABS(amount)) as total
        FROM transactions 
        GROUP BY month, category
        ORDER BY month
    """))
    
    monthly_data = {}
    for row in result:
        month = row[0]
        category = row[1]
        total = row[2]
        
        if month not in monthly_data:
            monthly_data[month] = {}
        
        monthly_data[month][category] = total
    
    # Insert into monthly_summary table
    for month, data in monthly_data.items():
        year = int(month.split('-')[0])
        month_name = month.split('-')[1]
        
        # Build values dict for SQLAlchemy
        values_dict = {
            'month': month_name,
            'year': year,
            'month_year': month
        }
        
        total = 0
        investment_total = 0
        
        for category_name in categories.keys():
            col_name = category_name.replace(' ', '_').replace('-', '_')
            amount = data.get(category_name, 0)
            values_dict[col_name] = amount
            
            if category_name != 'Income':
                total += amount
                if category_name == 'Investment':
                    investment_total += amount
        
        values_dict['investment_total'] = investment_total
        values_dict['total'] = total
        values_dict['total_minus_invest'] = total - investment_total
        
        # Create SQL with named parameters
        columns = list(values_dict.keys())
        placeholders = ', '.join([f':{col}' for col in columns])
        sql = f"INSERT OR REPLACE INTO monthly_summary ({', '.join(columns)}) VALUES ({placeholders})"
        
        session.execute(text(sql), values_dict)
    
    session.commit()
    print("✅ Generated monthly summary data")


if __name__ == "__main__":
    create_demo_database()