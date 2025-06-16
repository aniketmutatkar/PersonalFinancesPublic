# Demo Sample Files

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
