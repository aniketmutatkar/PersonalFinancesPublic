"""
Utility functions for the Finance Tracker application.
"""

import logging
from datetime import datetime
from typing import Dict
from decimal import Decimal


def setup_logging(log_file: str = "finance_tracker.log", level: int = logging.INFO) -> None:
    """
    Set up logging for the application.
    
    Args:
        log_file: Path to the log file
        level: Logging level
    """
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def format_currency(amount: Decimal) -> str:
    """
    Format a decimal amount as currency.
    
    Args:
        amount: Amount to format
        
    Returns:
        Formatted currency string (e.g., "$123.45")
    """
    return f"${float(amount):,.2f}"