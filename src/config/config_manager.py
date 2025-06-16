"""
Configuration management for the Finance Tracker application.
"""

import os
import yaml
from decimal import Decimal
from typing import Dict, Any, List, Optional

from src.models.models import Category


class ConfigManager:
    """Manager for application configuration"""
    
    def __init__(self, config_file: str = 'config.yaml'):
        """
        Initialize the configuration manager.
        
        Args:
            config_file: Path to the YAML configuration file
        """
        self.config_file = config_file
        self.raw_dir = 'raw'
        self.transformed_dir = 'transformed'
        self.exports_dir = 'exports'
        
        # Load from config file
        self._config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """
        Load configuration from YAML file.
        
        Returns:
            Dictionary containing configuration
        """
        if not os.path.exists(self.config_file):
            raise ValueError(f"Configuration file not found: {self.config_file}")
        
        with open(self.config_file, 'r') as file:
            return yaml.safe_load(file)
    
    def ensure_directories(self) -> None:
        """Ensure all required directories exist"""
        for directory in [self.raw_dir, self.transformed_dir, self.exports_dir]:
            os.makedirs(directory, exist_ok=True)
    
    def get_categories(self) -> Dict[str, Category]:
        """
        Get all categories with their keywords and budgets.
        
        Returns:
            Dictionary mapping category names to Category objects
        """
        categories = {}
        
        if 'categories' in self._config:
            for name, keywords in self._config['categories'].items():
                # Get budget if available
                budget = None
                if 'budgets' in self._config and name in self._config['budgets']:
                    budget = Decimal(str(self._config['budgets'][name]))
                
                # Create category
                categories[name] = Category(
                    name=name,
                    keywords=keywords if keywords else [],
                    budget=budget
                )
        
        return categories
    
    def get_category_mapping(self) -> Dict[str, str]:
        """
        Get category mappings for normalization.
        
        Returns:
            Dictionary mapping source categories to normalized categories
        """
        return self._config.get('category_mapping', {})
    
    def get_budgets(self) -> Dict[str, Decimal]:
        """
        Get budget values for categories.
        
        Returns:
            Dictionary mapping category names to budget amounts
        """
        budgets = {}
        
        if 'budgets' in self._config:
            for category, amount in self._config['budgets'].items():
                budgets[category] = Decimal(str(amount))
        
        return budgets