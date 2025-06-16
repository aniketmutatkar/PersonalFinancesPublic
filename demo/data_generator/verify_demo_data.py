#!/usr/bin/env python3
"""
Quick verification script for demo data
"""

import sqlite3
from datetime import datetime

def verify_demo_data():
    """Verify the generated demo data looks correct"""
    
    conn = sqlite3.connect("demo_data.db")
    cursor = conn.cursor()
    
    print("🔍 Demo Data Verification")
    print("=" * 40)
    
    # Check transactions
    cursor.execute("SELECT COUNT(*) FROM transactions")
    transaction_count = cursor.fetchone()[0]
    print(f"💳 Transactions: {transaction_count:,}")
    
    # Check transaction categories
    cursor.execute("SELECT category, COUNT(*) FROM transactions GROUP BY category ORDER BY COUNT(*) DESC")
    categories = cursor.fetchall()
    print(f"\n📊 Transaction Categories:")
    for category, count in categories[:10]:  # Top 10
        print(f"   {category}: {count}")
    
    # Check portfolio accounts
    cursor.execute("SELECT account_name, COUNT(*) FROM portfolio_balances GROUP BY account_name")
    portfolio_accounts = cursor.fetchall()
    print(f"\n📈 Portfolio Accounts:")
    for account, count in portfolio_accounts:
        print(f"   {account}: {count} monthly records")
    
    # Check latest portfolio values
    cursor.execute("""
        SELECT account_name, balance_amount 
        FROM portfolio_balances 
        WHERE balance_date = (SELECT MAX(balance_date) FROM portfolio_balances)
        ORDER BY balance_amount DESC
    """)
    latest_balances = cursor.fetchall()
    total_portfolio = sum(balance for _, balance in latest_balances)
    
    print(f"\n💰 Latest Portfolio Values (Total: ${total_portfolio:,.2f}):")
    for account, balance in latest_balances:
        percentage = (balance / total_portfolio) * 100
        print(f"   {account}: ${balance:,.2f} ({percentage:.1f}%)")
    
    # Check monthly summaries
    cursor.execute("SELECT COUNT(*) FROM monthly_summaries")
    summary_count = cursor.fetchone()[0]
    print(f"\n📅 Monthly Summaries: {summary_count}")
    
    # Check sample transactions
    cursor.execute("""
        SELECT date, description, amount, category 
        FROM transactions 
        ORDER BY date DESC 
        LIMIT 5
    """)
    recent_transactions = cursor.fetchall()
    print(f"\n📝 Recent Transactions:")
    for date, desc, amount, category in recent_transactions:
        print(f"   {date}: {desc[:40]:<40} ${amount:>8.2f} ({category})")
    
    # Check income vs expenses
    cursor.execute("""
        SELECT 
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses
        FROM transactions
    """)
    income, expenses = cursor.fetchone()
    print(f"\n💹 Financial Summary (2 years):")
    print(f"   Total Income: ${income:,.2f}")
    print(f"   Total Expenses: ${expenses:,.2f}")
    print(f"   Net Savings: ${income - expenses:,.2f}")
    
    conn.close()
    
    print("\n✅ Demo data verification complete!")
    print("🚀 Ready to start the application servers!")

if __name__ == "__main__":
    verify_demo_data()