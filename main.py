"""
Main application entry point for the Finance Tracker.
"""

import os

from database import init_database
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.monthly_summary_repository import MonthlySummaryRepository
from src.services.import_service import ImportService
from src.services.reporting_service import ReportingService
from src.config.config_manager import ConfigManager
from src.utils.utilities import setup_logging


class FinanceTracker:
    """Main application class for the Finance Tracker"""
    
    def __init__(self):
        """Initialize the application"""
        # Set up logging
        setup_logging()
        
        # Create config manager
        self.config_manager = ConfigManager()
        
        # Ensure directories exist
        self.config_manager.ensure_directories()
        
        # Get categories
        self.categories = self.config_manager.get_categories()
        
        # Initialize database
        init_database(self.categories.keys())
        
        # Create repositories
        self.transaction_repository = TransactionRepository()
        self.monthly_summary_repository = MonthlySummaryRepository()
        
        # Create services
        self.import_service = ImportService(
            self.transaction_repository,
            self.monthly_summary_repository,
            self.config_manager
        )
        
        self.reporting_service = ReportingService(
            self.transaction_repository,
            self.monthly_summary_repository
        )
    
    def run(self):
        """Run the main application workflow"""
        print("Finance Tracker")
        print("=" * 40)
        
        # Import historical data from Excel (one-time)
        self.import_service.import_historical_data()
        
        # Process raw files
        combined_df = self.import_service.process_raw_directory()
        
        if combined_df is not None:
            print(f"Processed {len(combined_df)} transactions.")
        
        # Generate monthly summary report
        summary_df = self.reporting_service.generate_monthly_summary_report()
        
        if summary_df is not None:
            export_path = os.path.join(self.config_manager.transformed_dir, 'monthly_summary.csv')
            self.reporting_service.export_to_csv(summary_df, export_path)


def main():
    """Main function to run the finance tracker"""
    try:
        app = FinanceTracker()
        app.run()
        print("\nFinance tracking complete!")
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()