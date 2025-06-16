"""
Sample File Generator for Personal Finance Dashboard Demo

Generates realistic sample files for testing upload functionality:
- CSV files with demo transactions (including duplicates)
- PDF bank statements (OCR-compatible)
- Wells Fargo statement format
- Wealthfront investment statement format

These files demonstrate the upload, OCR, and duplicate detection features.
"""

import csv
import os
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
import random
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors


class SampleFileGenerator:
    """Generates sample files for demo upload testing"""
    
    def __init__(self, output_dir: str = "demo/sample_files"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Sample transaction data for files
        self.sample_transactions = [
            ("2024-11-15", "WHOLE FOODS MARKET", -89.47, "Food"),
            ("2024-11-14", "SHELL GAS STATION", -52.30, "Transportation"),
            ("2024-11-13", "STARBUCKS", -6.85, "Food"),
            ("2024-11-12", "TRANSFER TO WEALTHFRONT", -800.00, "Investment"),
            ("2024-11-11", "AMAZON.COM PURCHASE", -134.56, "Shopping"),
            ("2024-11-10", "CHIPOTLE MEXICAN GRILL", -12.45, "Food"),
            ("2024-11-09", "PG&E ELECTRIC BILL", -89.23, "Utilities"),
            ("2024-11-08", "PAYROLL DEPOSIT", 3000.00, "Income"),
            ("2024-11-07", "UBER RIDESHARE", -18.75, "Transportation"),
            ("2024-11-06", "TARGET PURCHASE", -67.89, "Shopping"),
        ]
        
        print(f"📁 Sample files will be created in: {self.output_dir}")
    
    def generate_all_sample_files(self):
        """Generate all types of sample files"""
        print("📄 Generating sample files for demo...")
        
        # Generate CSV files
        self.generate_csv_files()
        
        # Generate PDF statements
        self.generate_pdf_statements()
        
        # Create a README for the sample files
        self.create_sample_files_readme()
        
        print("✅ All sample files generated!")
    
    def generate_csv_files(self):
        """Generate CSV files in different bank formats"""
        print("📊 Creating CSV transaction files...")
        
        # Wells Fargo format CSV
        self.create_wells_fargo_csv()
        
        # Generic bank format CSV
        self.create_generic_bank_csv()
        
        # CSV with duplicates (for testing duplicate detection)
        self.create_duplicate_test_csv()
        
        print("✅ CSV files created")
    
    def create_wells_fargo_csv(self):
        """Create Wells Fargo format CSV file"""
        filename = self.output_dir / "wells_fargo_demo_transactions.csv"
        
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            
            # Wells Fargo header format
            writer.writerow([
                "Date", "Description", "Amount", "Account"
            ])
            
            # Add transactions
            for trans_date, description, amount, category in self.sample_transactions:
                writer.writerow([
                    trans_date,
                    description,
                    f"{amount:.2f}",
                    "Wells Fargo Checking"
                ])
            
            # Add a few more varied transactions
            additional_transactions = [
                ("2024-11-05", "RENT PAYMENT - DEMO APARTMENTS", -2400.00),
                ("2024-11-04", "COSTCO WHOLESALE", -156.78),
                ("2024-11-03", "NETFLIX SUBSCRIPTION", -17.99),
                ("2024-11-02", "ACORNS INVESTMENT", -25.00),
                ("2024-11-01", "VERIZON WIRELESS", -89.99),
            ]
            
            for trans_date, description, amount in additional_transactions:
                writer.writerow([
                    trans_date,
                    description,
                    f"{amount:.2f}",
                    "Wells Fargo Checking"
                ])
        
        print(f"   📄 {filename.name}")
    
    def create_generic_bank_csv(self):
        """Create generic bank format CSV"""
        filename = self.output_dir / "demo_bank_export.csv"
        
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            
            # Generic header format
            writer.writerow([
                "Transaction Date", "Description", "Debit", "Credit", "Balance"
            ])
            
            running_balance = 15000.00
            
            for trans_date, description, amount, category in self.sample_transactions[-8:]:  # Last 8 transactions
                running_balance += amount
                
                if amount < 0:
                    debit = f"{abs(amount):.2f}"
                    credit = ""
                else:
                    debit = ""
                    credit = f"{amount:.2f}"
                
                writer.writerow([
                    trans_date,
                    description,
                    debit,
                    credit,
                    f"{running_balance:.2f}"
                ])
        
        print(f"   📄 {filename.name}")
    
    def create_duplicate_test_csv(self):
        """Create CSV with intentional duplicates for testing"""
        filename = self.output_dir / "duplicate_test_transactions.csv"
        
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            
            writer.writerow(["Date", "Description", "Amount", "Source"])
            
            # Include some transactions that should be duplicates
            duplicate_transactions = [
                ("2024-11-15", "WHOLE FOODS MARKET", -89.47, "Wells Fargo"),  # Exact duplicate
                ("2024-11-14", "SHELL GAS STATION", -52.30, "Wells Fargo"),   # Exact duplicate
                ("2024-11-13", "STARBUCKS COFFEE", -6.85, "Wells Fargo"),     # Slight variation
                ("2024-11-20", "NEW UNIQUE TRANSACTION", -45.67, "Wells Fargo"),  # New transaction
                ("2024-11-19", "ANOTHER NEW PURCHASE", -78.90, "Wells Fargo"),    # New transaction
            ]
            
            for trans_date, description, amount, source in duplicate_transactions:
                writer.writerow([trans_date, description, f"{amount:.2f}", source])
        
        print(f"   📄 {filename.name} (includes duplicates for testing)")
    
    def generate_pdf_statements(self):
        """Generate PDF bank statements"""
        print("📋 Creating PDF statement files...")
        
        # Wells Fargo bank statement
        self.create_wells_fargo_pdf()
        
        # Wealthfront investment statement  
        self.create_wealthfront_pdf()
        
        print("✅ PDF statements created")
    
    def create_wells_fargo_pdf(self):
        """Create Wells Fargo bank statement PDF"""
        filename = self.output_dir / "wells_fargo_demo_statement.pdf"
        
        doc = SimpleDocTemplate(str(filename), pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title and header
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("WELLS FARGO BANK, N.A.", title_style))
        story.append(Paragraph("DEMO STATEMENT - NOT FOR REAL USE", styles['Heading2']))
        story.append(Spacer(1, 20))
        
        # Account information
        account_info = [
            ["Account Name:", "DEMO USER CHECKING"],
            ["Account Number:", "****1234"],
            ["Statement Period:", "November 1, 2024 - November 30, 2024"],
            ["Statement Date:", "November 30, 2024"]
        ]
        
        account_table = Table(account_info, colWidths=[2*inch, 3*inch])
        account_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(account_table)
        story.append(Spacer(1, 20))
        
        # Balance summary
        story.append(Paragraph("Account Summary", styles['Heading3']))
        
        balance_data = [
            ["Beginning Balance (November 1)", "$14,567.89"],
            ["Total Deposits and Credits", "$6,000.00"],
            ["Total Withdrawals and Debits", "$4,235.67"],
            ["Ending Balance (November 30)", "$16,332.22"]
        ]
        
        balance_table = Table(balance_data, colWidths=[3*inch, 2*inch])
        balance_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        
        story.append(balance_table)
        story.append(Spacer(1, 20))
        
        # Transaction details
        story.append(Paragraph("Transaction Details", styles['Heading3']))
        
        transaction_data = [["Date", "Description", "Amount"]]
        
        for trans_date, description, amount, _ in self.sample_transactions:
            transaction_data.append([
                trans_date,
                description,
                f"${amount:.2f}"
            ])
        
        trans_table = Table(transaction_data, colWidths=[1.5*inch, 3*inch, 1.5*inch])
        trans_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.white]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(trans_table)
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph("DEMO STATEMENT - Generated for testing purposes only", styles['Normal']))
        
        doc.build(story)
        print(f"   📋 {filename.name}")
    
    def create_wealthfront_pdf(self):
        """Create Wealthfront investment statement PDF"""
        filename = self.output_dir / "wealthfront_demo_statement.pdf"
        
        doc = SimpleDocTemplate(str(filename), pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            textColor=colors.darkgreen
        )
        
        story.append(Paragraph("Wealthfront Brokerage LLC", title_style))
        story.append(Paragraph("DEMO INVESTMENT STATEMENT", styles['Heading2']))
        story.append(Spacer(1, 20))
        
        # Account information
        account_info = [
            ["Account Type:", "Individual Investment Account"],
            ["Account Number:", "****5678"],
            ["Statement Period:", "October 1, 2024 - October 31, 2024"],
            ["Statement Date:", "October 31, 2024"]
        ]
        
        account_table = Table(account_info, colWidths=[2*inch, 3*inch])
        account_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(account_table)
        story.append(Spacer(1, 20))
        
        # Account value summary
        story.append(Paragraph("Account Value", styles['Heading3']))
        
        value_data = [
            ["Beginning Account Value (October 1)", "$72,456.78"],
            ["Net Deposits", "$800.00"],
            ["Market Change", "$1,243.22"],
            ["Ending Account Value (October 31)", "$74,500.00"]
        ]
        
        value_table = Table(value_data, colWidths=[3*inch, 2*inch])
        value_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        
        story.append(value_table)
        story.append(Spacer(1, 20))
        
        # Activity summary
        story.append(Paragraph("Account Activity", styles['Heading3']))
        
        activity_data = [
            ["Date", "Description", "Amount"],
            ["2024-10-01", "Monthly Investment Transfer", "+$800.00"],
            ["2024-10-15", "Dividend Reinvestment", "+$23.45"],
            ["2024-10-31", "Monthly Market Appreciation", "+$1,219.77"]
        ]
        
        activity_table = Table(activity_data, colWidths=[1.5*inch, 3*inch, 1.5*inch])
        activity_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.green),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.lightgreen, colors.white]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(activity_table)
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph("DEMO STATEMENT - Generated for testing purposes only", styles['Normal']))
        story.append(Paragraph("This statement demonstrates OCR capability with Wealthfront format", styles['Normal']))
        
        doc.build(story)
        print(f"   📋 {filename.name}")
    
    def create_sample_files_readme(self):
        """Create README explaining the sample files"""
        readme_content = """# Demo Sample Files

This directory contains sample files for testing the Personal Finance Dashboard upload functionality.

## 📄 CSV Files

### wells_fargo_demo_transactions.csv
- Format: Wells Fargo export format
- Contains: 15 sample transactions
- Purpose: Test standard CSV import functionality

### demo_bank_export.csv  
- Format: Generic bank CSV format
- Contains: 8 recent transactions with running balances
- Purpose: Test alternative CSV parsing

### duplicate_test_transactions.csv
- Format: Standard CSV with intentional duplicates
- Contains: 5 transactions, 2 of which are duplicates
- Purpose: Test duplicate detection system

## 📋 PDF Files

### wells_fargo_demo_statement.pdf
- Format: Wells Fargo bank statement
- Contains: Monthly statement with account summary and transactions
- Purpose: Test OCR parsing of bank statements

### wealthfront_demo_statement.pdf
- Format: Wealthfront investment statement  
- Contains: Investment account summary and activity
- Purpose: Test OCR parsing of investment statements

## 🧪 Testing Instructions

1. **Upload CSV files** through the dashboard upload interface
2. **Review categorization** - some transactions may need manual categorization
3. **Check duplicate detection** - duplicate_test_transactions.csv should show duplicate warnings
4. **Upload PDF files** - test the OCR parsing functionality
5. **Verify data integration** - ensure uploaded data appears in dashboard

## ⚠️ Important Notes

- All data is synthetic and for demonstration only
- Files are marked as "DEMO" to avoid confusion with real financial data
- OCR parsing may vary based on PDF quality and format
- Some transactions may require manual category assignment

## 🔄 Regenerating Files

To regenerate these sample files, run:
```python
from demo.sample_files.sample_file_generator import SampleFileGenerator
generator = SampleFileGenerator()
generator.generate_all_sample_files()
```

---
*Generated for Personal Finance Dashboard Demo*
"""
        
        readme_file = self.output_dir / "README.md"
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        
        print(f"   📖 {readme_file.name}")


def generate_sample_files():
    """Main function to generate all sample files"""
    print("📁 Generating sample files for demo...")
    
    generator = SampleFileGenerator()
    generator.generate_all_sample_files()
    
    print(f"""
✅ Sample files generated in demo/sample_files/

📄 CSV Files (3):
   • wells_fargo_demo_transactions.csv
   • demo_bank_export.csv  
   • duplicate_test_transactions.csv

📋 PDF Files (2):
   • wells_fargo_demo_statement.pdf
   • wealthfront_demo_statement.pdf

🎯 Use these files to test:
   • CSV transaction import
   • PDF OCR parsing
   • Duplicate detection
   • Manual categorization
""")


if __name__ == "__main__":
    generate_sample_files()