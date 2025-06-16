"""
Database setup and session management for the Finance Tracker application.
Updated to include portfolio tracking tables.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Date, Boolean, DateTime, Table, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Database setup
DB_NAME = 'demo_data.db'
DB_URL = f'sqlite:///{DB_NAME}'
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db_session():
    """Create and return a new database session"""
    session = SessionLocal()
    try:
        return session
    except:
        session.close()
        raise


class TransactionModel(Base):
    """SQLAlchemy model for Transaction table with proper DATE column"""
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)  # Now using proper DATE column
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    source = Column(String, nullable=False)
    month = Column(String, nullable=False)  # Month in YYYY-MM format
    transaction_hash = Column(String, unique=True, nullable=False)
    
    def __repr__(self):
        return f"<Transaction(date='{self.date}', amount={self.amount}, category='{self.category}')>"


class InvestmentAccountModel(Base):
    """SQLAlchemy model for Investment Accounts"""
    __tablename__ = 'investment_accounts'
    
    id = Column(Integer, primary_key=True)
    account_name = Column(String, unique=True, nullable=False)
    institution = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # 'brokerage', 'roth_ira', '401k', 'cash'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<InvestmentAccount(name='{self.account_name}', institution='{self.institution}')>"


class PortfolioBalanceModel(Base):
    """SQLAlchemy model for Portfolio Balances"""
    __tablename__ = 'portfolio_balances'
    
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=False)  # References investment_accounts.id
    balance_date = Column(Date, nullable=False)
    balance_amount = Column(Float, nullable=False)
    data_source = Column(String, nullable=False, default='demo_generated')  # 'csv_import', 'manual', 'pdf_statement'
    confidence_score = Column(Float, default=1.0)  # For OCR results (0.0-1.0)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<PortfolioBalance(account_id={self.account_id}, date='{self.balance_date}', amount={self.balance_amount})>"


class BankBalanceModel(Base):
    """SQLAlchemy model for Bank Account Balances"""
    __tablename__ = 'bank_balances'
    
    id = Column(Integer, primary_key=True)
    account_name = Column(String, nullable=False)  # 'Wells Fargo Checking', 'Wells Fargo Savings'
    account_number = Column(String)  # '3207122866', '3218415499'
    statement_month = Column(String, nullable=False)  # '2025-05' (YYYY-MM format)
    beginning_balance = Column(Float, nullable=False)  # 22782.90
    ending_balance = Column(Float, nullable=False)     # 25736.30
    deposits_additions = Column(Float)                  # 8747.54
    withdrawals_subtractions = Column(Float)           # 5794.14
    statement_date = Column(Date, nullable=False)      # 2025-05-31
    data_source = Column(String, default='pdf_statement')  # 'pdf_statement', 'excel_import'
    confidence_score = Column(Float, default=1.0)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<BankBalance(account='{self.account_name}', date='{self.statement_date}', balance={self.ending_balance})>"


class StatementUploadModel(Base):
    """Enhanced SQLAlchemy model for Statement Uploads with page detection"""
    __tablename__ = 'statement_uploads'
    
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=True)  # Made nullable for unmatched statements
    statement_date = Column(Date, nullable=True)  # Made nullable for failed extractions
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Full PDF path
    
    relevant_page_number = Column(Integer, default=1)  # Which page has the data
    page_pdf_path = Column(String)  # Path to extracted single page PDF
    total_pages = Column(Integer, default=1)  # Total pages in original PDF
    
    # OCR and extraction fields
    raw_extracted_text = Column(String)
    extracted_balance = Column(Float)
    confidence_score = Column(Float, default=0.0)
    
    # Review workflow fields
    requires_review = Column(Boolean, default=False)
    reviewed_by_user = Column(Boolean, default=False)
    
    processing_status = Column(String, default='pending')  # 'pending', 'processed', 'failed', 'saved'
    processing_error = Column(String)  # Store any processing errors
    
    # Timestamps
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    processed_timestamp = Column(DateTime)
    
    def __repr__(self):
        return f"<StatementUpload(id={self.id}, filename='{self.original_filename}', status='{self.processing_status}')>"


# Legacy aliases for compatibility
Transaction = TransactionModel
InvestmentAccount = InvestmentAccountModel
PortfolioBalance = PortfolioBalanceModel
BankBalance = BankBalanceModel
StatementUpload = StatementUploadModel
MonthlyMassageSummary = None  # Will be defined below


def create_monthly_summary_table(categories):
    """Create the monthly_summary table with dynamic columns based on categories"""
    metadata = MetaData()
    
    # Prepare columns list
    columns = [
        Column('id', Integer, primary_key=True),
        Column('month', String),
        Column('year', Integer),
        Column('month_year', String, unique=True),
    ]
    
    # Add category columns
    for category in categories:
        columns.append(Column(category, Float, default=0))
    
    # Add calculated columns
    columns.append(Column('investment_total', Float, default=0))
    columns.append(Column('total', Float, default=0))
    columns.append(Column('total_minus_invest', Float, default=0))
    
    # Create table definition
    monthly_summary = Table('monthly_summary', metadata, *columns)
    
    # Create the table if it doesn't exist
    metadata.create_all(bind=engine)
    
    return monthly_summary


def seed_investment_accounts():
    """Seed the investment accounts table with the 7 core accounts"""
    accounts_data = [
        {
            'account_name': 'Wealthfront Investment',
            'institution': 'Wealthfront', 
            'account_type': 'brokerage'
        },
        {
            'account_name': 'Schwab Brokerage',
            'institution': 'Schwab',
            'account_type': 'brokerage'
        },
        {
            'account_name': 'Acorns',
            'institution': 'Acorns',
            'account_type': 'brokerage'
        },
        {
            'account_name': 'Robinhood',
            'institution': 'Robinhood', 
            'account_type': 'brokerage'
        },
        {
            'account_name': '401(k) Plan',
            'institution': 'ADP',
            'account_type': '401k'
        },
        {
            'account_name': 'Roth IRA',
            'institution': 'Schwab',
            'account_type': 'roth_ira'
        },
        {
            'account_name': 'Wealthfront Cash',
            'institution': 'Wealthfront',
            'account_type': 'cash'
        }
    ]
    
    session = get_db_session()
    try:
        # Check if accounts already exist
        existing_count = session.query(InvestmentAccountModel).count()
        if existing_count > 0:
            print(f"Investment accounts already seeded ({existing_count} accounts found)")
            return
        
        # Insert accounts
        for account_data in accounts_data:
            account = InvestmentAccountModel(**account_data)
            session.add(account)
        
        session.commit()
        print(f"Successfully seeded {len(accounts_data)} investment accounts")
        
        # Print the seeded accounts for verification
        accounts = session.query(InvestmentAccountModel).all()
        for account in accounts:
            print(f"  - {account.account_name} ({account.institution}, {account.account_type})")
            
    except Exception as e:
        session.rollback()
        print(f"Error seeding investment accounts: {str(e)}")
        raise
    finally:
        session.close()


def add_portfolio_constraints():
    """Add database constraints for portfolio tables"""
    session = get_db_session()
    try:
        # Add unique constraint for portfolio_balances (account_id, balance_date)
        session.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_balances_unique 
        ON portfolio_balances(account_id, balance_date)
        """))
        
        # Add index for faster queries
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_portfolio_balances_date 
        ON portfolio_balances(balance_date)
        """))
        
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_portfolio_balances_account 
        ON portfolio_balances(account_id)
        """))
        
        session.commit()
        print("Added portfolio database constraints and indexes")
        
    except Exception as e:
        session.rollback()
        print(f"Warning: Could not add constraints: {str(e)}")
    finally:
        session.close()


def add_bank_balance_constraints():
    """Add database constraints for bank_balances table"""
    session = get_db_session()
    try:
        # Add unique constraint for bank_balances (account_name, statement_month)
        session.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_balances_unique 
        ON bank_balances(account_name, statement_month)
        """))
        
        # Add index for faster queries
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_bank_balances_date 
        ON bank_balances(statement_date)
        """))
        
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_bank_balances_account 
        ON bank_balances(account_name)
        """))
        
        session.commit()
        print("Added bank balance database constraints and indexes")
        
    except Exception as e:
        session.rollback()
        print(f"Warning: Could not add bank balance constraints: {str(e)}")
    finally:
        session.close()


def add_statement_uploads_enhancements():
    """Add new columns to existing statement_uploads table"""
    session = get_db_session()
    try:
        # Add new columns if they don't exist
        new_columns = [
            "ALTER TABLE statement_uploads ADD COLUMN relevant_page_number INTEGER DEFAULT 1",
            "ALTER TABLE statement_uploads ADD COLUMN page_pdf_path TEXT",
            "ALTER TABLE statement_uploads ADD COLUMN total_pages INTEGER DEFAULT 1", 
            "ALTER TABLE statement_uploads ADD COLUMN processing_status TEXT DEFAULT 'pending'",
            "ALTER TABLE statement_uploads ADD COLUMN processing_error TEXT",
            "ALTER TABLE statement_uploads ADD COLUMN processed_timestamp DATETIME"
        ]
        
        for sql in new_columns:
            try:
                session.execute(text(sql))
                session.commit()
                print(f"Added column: {sql.split('ADD COLUMN')[1].split()[0]}")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"Warning adding column: {str(e)}")
                session.rollback()
        
        print("Enhanced statement_uploads table with page detection support")
        
    except Exception as e:
        session.rollback()
        print(f"Error enhancing statement_uploads table: {str(e)}")
        raise
    finally:
        session.close()


def add_enhanced_duplicate_constraints():
    """Add enhanced constraints to prevent statement duplicates"""
    session = get_db_session()
    try:
        # Enhanced bank balance constraints - add statement date tracking
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_bank_balances_statement_date 
        ON bank_balances(account_name, statement_date)
        """))
        
        # Enhanced portfolio balance constraints - month-level uniqueness
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_portfolio_balances_month 
        ON portfolio_balances(account_id, strftime('%Y-%m', balance_date))
        """))
        
        # Statement upload filename protection
        session.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_statement_uploads_filename 
        ON statement_uploads(original_filename)
        """))
        
        # Statement upload account+month protection for processed statements
        session.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_statement_uploads_account_month 
        ON statement_uploads(account_id, strftime('%Y-%m', statement_date))
        WHERE processing_status IN ('processed', 'saved')
        """))
        
        session.commit()
        print("Added enhanced duplicate detection constraints and indexes")
        
    except Exception as e:
        session.rollback()
        print(f"Warning: Could not add enhanced constraints: {str(e)}")
    finally:
        session.close()


def init_database(categories):
    """Initialize the SQLite database with required tables"""
    print("Initializing database...")
    
    # Create all SQLAlchemy tables
    Base.metadata.create_all(bind=engine)
    
    # Create monthly_summary table with dynamic columns
    create_monthly_summary_table(categories)
    
    # Seed investment accounts
    seed_investment_accounts()
    
    # Add portfolio constraints
    add_portfolio_constraints()
    
    add_bank_balance_constraints()
    
    # Add statement uploads enhancements
    add_statement_uploads_enhancements()
    
    add_enhanced_duplicate_constraints()
    
    print("Database initialized successfully with enhanced duplicate detection.")