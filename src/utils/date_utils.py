"""
Date utility functions for the Finance Tracker application.
"""

from datetime import datetime
from typing import Dict


def parse_month_period(month_period: str) -> Dict[str, str]:
    """
    Parse a month period string into its components.
    
    Args:
        month_period: Month period string (e.g., "2023-01" or "January 2023")
        
    Returns:
        Dictionary with keys:
            - year: Year as integer
            - month_num: Month number (1-12)
            - month_name: Month name (e.g., "January")
            - month_year: Combined month and year (e.g., "January 2023")
            
    Raises:
        ValueError: If the month period string cannot be parsed
    """
    try:
        # Try parsing as YYYY-MM
        if '-' in month_period:
            date_parts = month_period.split('-')
            if len(date_parts) == 2:
                year = int(date_parts[0])
                month_num = int(date_parts[1])
                month_date = datetime(year, month_num, 1)
                month_name = month_date.strftime('%B')
                month_year = month_date.strftime('%B %Y')
                return {
                    'year': year,
                    'month_num': month_num,
                    'month_name': month_name,
                    'month_year': month_year
                }
                
        # Try an alternative format (e.g., "January 2023")
        try:
            import pandas as pd
            month_date = pd.to_datetime(month_period)
        except ImportError:
            # If pandas is not available, use datetime.strptime
            # This assumes a specific format like "January 2023"
            month_date = datetime.strptime(month_period, "%B %Y")
            
        return {
            'year': month_date.year,
            'month_num': month_date.month,
            'month_name': month_date.strftime('%B'),
            'month_year': month_date.strftime('%B %Y')
        }
    except Exception as e:
        raise ValueError(f"Could not parse month period: {month_period}") from e