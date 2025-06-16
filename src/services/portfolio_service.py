# src/services/portfolio_service.py

"""
Portfolio Service with CORRECTED transaction sign convention

TRANSACTION SIGN CONVENTION (DOCUMENTED):
- POSITIVE amounts = Money OUT (expenses, investments, transfers out)
- NEGATIVE amounts = Money IN (salary, refunds, transfers in)

Examples:
- Acorns investment: +$5.00 (money leaving checking account)
- Salary deposit: -$3,903.77 (money entering checking account)
- Groceries: +$25.50 (money leaving account)
- Refund: -$15.00 (money entering account)

This convention follows cash flow logic from the perspective of your primary accounts.
"""

from typing import List, Dict, Optional, Tuple
from datetime import date, datetime, timedelta
from decimal import Decimal
import pandas as pd

from src.models.portfolio_models import (
    PortfolioOverview, AccountPerformance, InstitutionSummary, 
    AccountTypeSummary, PortfolioTrends, InvestmentAccount,
    PortfolioBalance, AccountType, ACCOUNT_TRANSACTION_MAPPING,
    INVESTMENT_TRANSACTION_CATEGORIES
)
from src.repositories.portfolio_repository import PortfolioRepository
from src.repositories.transaction_repository import TransactionRepository


class PortfolioService:
    """Service for portfolio analysis and performance calculations"""
    
    def __init__(
        self,
        portfolio_repository: PortfolioRepository,
        transaction_repository: TransactionRepository
    ):
        self.portfolio_repo = portfolio_repository
        self.transaction_repo = transaction_repository
    
    def get_portfolio_overview(self, as_of_date: Optional[date] = None) -> PortfolioOverview:
        """
        Get complete portfolio overview with real performance metrics
        
        Args:
            as_of_date: Date to calculate portfolio as of (defaults to latest data)
            
        Returns:
            PortfolioOverview with real balance and performance data
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        # Get all accounts
        accounts = self.portfolio_repo.get_all_accounts()
        
        if not accounts:
            return self._empty_portfolio_overview(as_of_date)
        
        # Get latest balances for each account
        latest_balances = self.portfolio_repo.get_latest_balances()
        
        # Calculate performance for each account
        account_performances = []
        total_portfolio_value = Decimal('0')
        total_deposits = Decimal('0')
        total_growth = Decimal('0')
        
        for account in accounts:
            performance = self.calculate_account_performance(
                account.id, 
                start_date=date(2020, 1, 1),  # Start from earliest data
                end_date=as_of_date
            )
            
            if performance:
                account_performances.append(performance)
                total_portfolio_value += performance.end_balance
                total_deposits += performance.net_deposits
                total_growth += performance.actual_growth
        
        # Calculate overall growth percentage
        growth_percentage = (total_growth / total_deposits * 100) if total_deposits > 0 else Decimal('0')
        
        # Group by institution
        by_institution = self._group_by_institution(account_performances)
        
        # Group by account type
        by_account_type = self._group_by_account_type(account_performances, accounts)
        
        return PortfolioOverview(
            total_portfolio_value=total_portfolio_value,
            total_deposits=total_deposits,
            total_growth=total_growth,
            growth_percentage=growth_percentage,
            accounts=account_performances,
            by_institution=by_institution,
            by_account_type=by_account_type,
            as_of_date=as_of_date
        )
    
    def calculate_account_performance(
        self, 
        account_id: int, 
        start_date: date, 
        end_date: date
    ) -> Optional[AccountPerformance]:
        """
        Calculate performance metrics for a specific account
        
        Args:
            account_id: Account to analyze
            start_date: Start of analysis period
            end_date: End of analysis period
            
        Returns:
            AccountPerformance with ROI calculations
        """
        # Get account info
        account = self.portfolio_repo.get_account_by_id(account_id)
        if not account:
            return None
        
        # Get balance history for the period
        balances = self.portfolio_repo.get_balances_for_account(
            account_id, start_date, end_date
        )
        
        if len(balances) < 2:
            return None  # Need at least start and end balance
        
        # Sort by date
        balances.sort(key=lambda b: b.balance_date)
        
        start_balance = balances[0].balance_amount
        end_balance = balances[-1].balance_amount
        
        # Estimate deposits from transaction data - FIXED LOGIC
        net_deposits = self._estimate_deposits_from_transactions(
            account.account_name, start_date, end_date
        )
        
        # Calculate actual growth (end - start - deposits)
        actual_growth = end_balance - start_balance - net_deposits
        
        # Calculate growth percentage
        if net_deposits > 0:
            growth_percentage = (actual_growth / net_deposits) * 100
        else:
            # If no deposits, calculate based on starting balance
            growth_percentage = ((end_balance - start_balance) / start_balance * 100) if start_balance > 0 else Decimal('0')
        
        # Calculate annualized return
        period_days = (end_date - start_date).days
        period_years = Decimal(str(period_days / 365.25))
        
        if period_years > 0 and start_balance + net_deposits > 0:
            total_return = (end_balance / (start_balance + net_deposits)) - 1
            
            # Convert to float for the power operation, then back to Decimal
            if total_return > -1:  # Avoid negative numbers in power calculation
                annualized_return = ((1 + float(total_return)) ** (1 / float(period_years))) - 1
                annualized_return = Decimal(str(annualized_return * 100))
            else:
                annualized_return = Decimal('-100')  # Total loss
        else:
            annualized_return = Decimal('0')
        
        return AccountPerformance(
            account_id=account_id,
            account_name=account.account_name,
            institution=account.institution,
            account_type=account.account_type,
            start_balance=start_balance,
            end_balance=end_balance,
            net_deposits=net_deposits,
            actual_growth=actual_growth,
            growth_percentage=growth_percentage,
            annualized_return=annualized_return,
            period_months=int(period_days / 30.44)  # Average days per month
        )
    
    def get_portfolio_trends(self, period: str = "1y") -> PortfolioTrends:
        """
        Get portfolio trends with all accounts shown from start date (0 if no data)
        Returns monthly values in reverse chronological order (newest first)
        """
        end_date = date.today()
        
        if period == "6m":
            start_date = end_date - timedelta(days=180)
        elif period == "1y": 
            start_date = end_date - timedelta(days=365)
        elif period == "2y":
            start_date = end_date - timedelta(days=730)
        elif period == "5y":
            start_date = end_date - timedelta(days=1825)
        else:  # "all"
            start_date = date(2020, 1, 1)  # Show full timeline
        
        accounts = self.portfolio_repo.get_all_accounts()
        monthly_values = []
        current_date = start_date.replace(day=1)
        
        # Build monthly values in chronological order (oldest to newest)
        while current_date <= end_date:
            month_end = self._get_month_end(current_date)
            
            # Initialize month with ALL accounts at 0
            month_data = {
                'date': current_date.strftime('%Y-%m-%d'),
                'month': current_date.strftime('%B'),
                'year': current_date.year,
                'month_display': current_date.strftime('%b %Y'),
                'total_value': 0
            }
            
            month_total = Decimal('0')
            
            # Process EVERY account for EVERY month
            for account in accounts:
                account_key = account.account_name.lower().replace(' ', '_').replace('(', '').replace(')', '')
                
                account_balances = self.portfolio_repo.get_balances_for_account(
                    account.id, 
                    start_date=date(2020, 1, 1),  # Look from beginning of time
                    end_date=month_end
                )
                
                # If account has any balance data for this month, use the latest
                if account_balances:
                    latest_balance = max(account_balances, key=lambda b: b.balance_date)
                    balance_value = latest_balance.balance_amount
                    month_data[account_key] = float(balance_value)
                    month_total += balance_value
                else:
                    # Account doesn't exist yet or no data - set to 0
                    month_data[account_key] = 0.0
            
            month_data['total_value'] = float(month_total)
            monthly_values.append(month_data)  # Include EVERY month
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        # ✅ FIX: REVERSE the array so newest data comes first
        monthly_values.reverse()
        
        # Calculate growth attribution - FIXED LOGIC
        growth_attribution = self._calculate_growth_attribution(monthly_values, start_date, end_date)
        
        best_month = None
        worst_month = None
        if monthly_values:
            non_zero_months = [m for m in monthly_values if m['total_value'] > 0]
            if non_zero_months:
                best_data = max(non_zero_months, key=lambda m: m['total_value'])
                worst_data = min(non_zero_months, key=lambda m: m['total_value'])
                best_month = {'month': best_data['month_display'], 'amount': best_data['total_value']}
                worst_month = {'month': worst_data['month_display'], 'amount': worst_data['total_value']}
        
        return PortfolioTrends(
            monthly_values=monthly_values,
            growth_attribution=growth_attribution,
            best_month=best_month,
            worst_month=worst_month
        )
    
    def _calculate_growth_attribution(
        self, 
        monthly_values: List[Dict], 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Decimal]:
        """
        Calculate how much growth came from deposits vs market performance
        FIXED: Now correctly calculates deposits for the specific period
        """
        if not monthly_values or len(monthly_values) < 2:
            return {
                'total_growth': Decimal('0'),
                'market_growth': Decimal('0'),
                'deposit_growth': Decimal('0')
            }
        
        # Get start and end values
        start_value = Decimal(str(monthly_values[0]['total_value']))
        end_value = Decimal(str(monthly_values[-1]['total_value']))
        
        # Calculate total deposits during this SPECIFIC period - FIXED
        total_deposits = self._calculate_deposits_in_period(start_date, end_date)
        
        # Total growth = end_value - start_value
        total_growth = end_value - start_value
        
        # Deposit growth = money added to accounts during this period
        deposit_growth = total_deposits
        
        # Market growth = total growth - deposit growth
        market_growth = total_growth - deposit_growth
        
        print(f"  Period: {start_date} to {end_date}")
        print(f"  Start Value: ${start_value}")
        print(f"  End Value: ${end_value}")
        print(f"  Total Deposits in Period: ${total_deposits}")
        print(f"  Total Growth: ${total_growth}")
        print(f"  Market Growth: ${market_growth}")
        print(f"  Deposit Growth: ${deposit_growth}")
        
        return {
            'total_growth': total_growth,
            'market_growth': market_growth,
            'deposit_growth': deposit_growth
        }

    def _calculate_deposits_in_period(self, start_date: date, end_date: date) -> Decimal:
        """
        Calculate total deposits across all accounts in a specific period
        FIXED: Now uses correct sign convention (positive = money out = investments)
        """
        total_deposits = Decimal('0')
        
        print(f"🔧 Calculating deposits from {start_date} to {end_date}")
        
        # Get all investment transactions in the period
        try:
            transactions, total_count, _, _ = self.transaction_repo.find_with_filters(
                categories=INVESTMENT_TRANSACTION_CATEGORIES,
                start_date=start_date,
                end_date=end_date,
                limit=10000
            )
            
            print(f"🔧 Found {len(transactions)} investment transactions in period")
            
            for tx in transactions:
                if tx.amount > 0:  # ✅ Investment transactions are positive
                    total_deposits += tx.amount  # ✅ Already positive
                    print(f"🔧   + {tx.date}: {tx.category} ${tx.amount}")
                    
        except Exception as e:
            print(f"⚠️ Warning: Could not calculate deposits: {str(e)}")
        
        print(f"🔧 Total deposits in period: ${total_deposits}")
        return total_deposits

    def _estimate_deposits_from_transactions(
        self, 
        account_name: str, 
        start_date: date, 
        end_date: date
    ) -> Decimal:
        """
        Estimate deposits for an account from transaction data
        FIXED: Now uses correct sign convention
        
        Args:
            account_name: Name of the account
            start_date: Start of period
            end_date: End of period
            
        Returns:
            Estimated total deposits
        """
        # Get transaction categories mapped to this account
        transaction_categories = ACCOUNT_TRANSACTION_MAPPING.get(account_name, [])
        
        if not transaction_categories:
            print(f"🔧 No transaction mapping for account: {account_name}")
            return Decimal('0')  # No transaction mapping available
        
        total_deposits = Decimal('0')
        
        print(f"🔧 Estimating deposits for {account_name} from {start_date} to {end_date}")
        print(f"🔧 Mapped categories: {transaction_categories}")
        
        # Get transactions for each mapped category
        for category in transaction_categories:
            try:
                # Get transactions for this category in the date range
                transactions, _, _, _ = self.transaction_repo.find_with_filters(
                    categories=[category],
                    start_date=start_date,
                    end_date=end_date,
                    limit=10000
                )
                
                category_total = Decimal('0')
                
                for tx in transactions:
                    if tx.amount > 0:  # ✅ Investment transactions are positive
                        category_total += tx.amount  # ✅ Already positive, no abs() needed
                
                total_deposits += category_total
                print(f"🔧   {category}: ${category_total} ({len(transactions)} transactions)")
                        
            except Exception as e:
                print(f"⚠️ Warning: Could not get transactions for {category}: {str(e)}")
                continue
        
        print(f"🔧 Total estimated deposits for {account_name}: ${total_deposits}")
        return total_deposits
    
    def _group_by_institution(self, performances: List[AccountPerformance]) -> List[InstitutionSummary]:
        """Group account performances by institution"""
        institution_data = {}
        
        for perf in performances:
            inst = perf.institution
            if inst not in institution_data:
                institution_data[inst] = {
                    'total_balance': Decimal('0'),
                    'total_growth': Decimal('0'),
                    'account_names': []
                }
            
            institution_data[inst]['total_balance'] += perf.end_balance
            institution_data[inst]['total_growth'] += perf.actual_growth
            institution_data[inst]['account_names'].append(perf.account_name)
        
        summaries = []
        for inst, data in institution_data.items():
            growth_pct = (data['total_growth'] / data['total_balance'] * 100) if data['total_balance'] > 0 else Decimal('0')
            
            summaries.append(InstitutionSummary(
                institution=inst,
                total_balance=data['total_balance'],
                total_growth=data['total_growth'],
                growth_percentage=growth_pct,
                account_count=len(data['account_names']),
                account_names=data['account_names']
            ))
        
        return sorted(summaries, key=lambda s: s.total_balance, reverse=True)
    
    def _group_by_account_type(
        self, 
        performances: List[AccountPerformance], 
        accounts: List[InvestmentAccount]
    ) -> List[AccountTypeSummary]:
        """Group account performances by account type"""
        type_data = {}
        
        # Create account lookup
        account_lookup = {acc.id: acc for acc in accounts}
        
        for perf in performances:
            account = account_lookup.get(perf.account_id)
            if not account:
                continue
                
            acc_type = account.account_type
            if acc_type not in type_data:
                type_data[acc_type] = {
                    'total_balance': Decimal('0'),
                    'total_growth': Decimal('0'),
                    'account_names': []
                }
            
            type_data[acc_type]['total_balance'] += perf.end_balance
            type_data[acc_type]['total_growth'] += perf.actual_growth
            type_data[acc_type]['account_names'].append(perf.account_name)
        
        summaries = []
        for acc_type, data in type_data.items():
            growth_pct = (data['total_growth'] / data['total_balance'] * 100) if data['total_balance'] > 0 else Decimal('0')
            
            summaries.append(AccountTypeSummary(
                account_type=acc_type,
                total_balance=data['total_balance'],
                total_growth=data['total_growth'],
                growth_percentage=growth_pct,
                account_count=len(data['account_names']),
                account_names=data['account_names']
            ))
        
        return sorted(summaries, key=lambda s: s.total_balance, reverse=True)
    
    def _empty_portfolio_overview(self, as_of_date: date) -> PortfolioOverview:
        """Return empty portfolio overview when no data available"""
        return PortfolioOverview(
            total_portfolio_value=Decimal('0'),
            total_deposits=Decimal('0'),
            total_growth=Decimal('0'),
            growth_percentage=Decimal('0'),
            accounts=[],
            by_institution=[],
            by_account_type=[],
            as_of_date=as_of_date
        )
    
    def _get_month_end(self, date_input: date) -> date:
        """Get the last day of the month for a given date"""
        if date_input.month == 12:
            next_month = date_input.replace(year=date_input.year + 1, month=1, day=1)
        else:
            next_month = date_input.replace(month=date_input.month + 1, day=1)
        
        return next_month - timedelta(days=1)