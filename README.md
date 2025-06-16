# Personal Finance Dashboard Demo 📊

> A full-stack financial analytics platform with transaction categorization, investment tracking, and comprehensive reporting.

## 🚀 Quick Demo (30 seconds)

```bash
git clone https://github.com/yourusername/PersonalFinancesPublic
cd PersonalFinancesPublic
python demo_setup.py
```

Visit http://localhost:3000 to see the dashboard with 2 years of realistic demo data!

## ✨ Features

- **Transaction Management**: Import & categorize 1,500+ demo transactions
- **Investment Tracking**: $200K portfolio across 7 investment accounts
- **Bank Integration**: Wells Fargo checking/savings account monitoring
- **Budget Analysis**: Real-time budget vs. actual spending comparison
- **Portfolio Analytics**: Investment growth tracking and performance metrics
- **Statement Upload**: OCR-powered PDF statement processing
- **Monthly Reports**: Comprehensive financial summaries
- **Duplicate Detection**: Smart transaction deduplication

## 🎥 Demo Data Overview

This repository includes realistic demo data for testing:

- **$200,000 investment portfolio** across 7 accounts (Wealthfront, Schwab, etc.)
- **1,500 transactions** over 24 months showing realistic spending patterns
- **Monthly expenses** averaging $4,200 with proper categorization
- **Investment growth** with realistic market volatility
- **Sample bank statements** for upload testing (PDF & CSV)

All data is synthetic and generated for demonstration purposes only.

## 🛠 Tech Stack

**Backend:** Python 3.12, FastAPI, SQLAlchemy, SQLite  
**Frontend:** React, TypeScript, TanStack Query, Tailwind CSS  
**Data Processing:** Pandas, PDF parsing, OCR  
**Database:** SQLite with comprehensive financial schema

## 📊 Dashboard Features

### Transaction Analytics
- Automatic categorization with 15+ spending categories
- Monthly and yearly trend analysis
- Budget vs. actual comparison with alerts
- Smart duplicate detection and handling

### Investment Portfolio
- Multi-account portfolio tracking (Wealthfront, Schwab, Acorns, Robinhood, 401k, Roth IRA)
- Growth attribution analysis (market vs. deposits)
- Historical performance with monthly snapshots
- Institution-level breakdowns

### Bank Account Management
- Wells Fargo checking and savings account integration
- Monthly balance tracking with OCR statement processing
- Deposit and withdrawal pattern analysis
- Account balance trend visualization

## 🚀 One-Click Setup

The demo includes a one-command setup that:

1. ✅ Installs all Python and Node.js dependencies
2. ✅ Generates 2 years of realistic financial data
3. ✅ Creates demo database with proper schema
4. ✅ Sets up environment configuration
5. ✅ Starts both backend API and frontend servers

```bash
python demo_setup.py
# Backend: http://localhost:8000 (API docs at /docs)
# Frontend: http://localhost:3000 (Main dashboard)
```

## 📁 Repository Structure

```
PersonalFinancesPublic/
├── src/                    # Backend Python code
│   ├── api/               # FastAPI routes and schemas
│   ├── models/            # Database models
│   ├── services/          # Business logic
│   └── repositories/      # Data access layer
├── finance-dashboard/     # React frontend
│   ├── src/components/    # UI components
│   ├── src/services/      # API integration
│   └── src/types/         # TypeScript definitions
├── demo/                  # Demo data generation
│   ├── data_generator/    # Realistic data generators
│   └── sample_files/      # Sample PDFs and CSVs
├── demo_setup.py         # One-click setup script
├── config.demo.yaml      # Demo configuration
└── requirements.txt      # Python dependencies
```

## 🔧 Development

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Backend setup
pip install -r requirements.txt
python -c "from demo.data_generator.demo_seeder import generate_demo_data; generate_demo_data()"
python run_api.py

# Frontend setup (separate terminal)
cd finance-dashboard
npm install
npm start
```

### Adding Custom Data

To modify the demo data:

```python
# Edit demo/data_generator/demo_data_generator.py
class DemoDataGenerator:
    def customize_spending_patterns(self):
        # Modify transaction patterns
        # Adjust portfolio allocation
        # Change account balances
```

## 📈 Sample Transactions

The demo includes realistic transaction patterns:

- **Housing**: Monthly rent payments ($2,400)
- **Food**: Groceries and restaurant spending ($800/month avg)
- **Investment**: Regular transfers to Wealthfront, Schwab ($1,500/month)
- **Transportation**: Gas, parking, rideshare
- **Entertainment**: Streaming, events, hobbies
- **Healthcare**: Insurance, medical expenses
- **Utilities**: Phone, internet, electricity

## 💼 Professional Features

### API Documentation
- **Auto-generated docs**: Visit http://localhost:8000/docs
- **OpenAPI schema**: Full REST API specification
- **Type safety**: Pydantic models with validation

### Code Quality
- **TypeScript**: Full type coverage on frontend
- **SQLAlchemy**: Robust database modeling
- **Error handling**: Comprehensive error management
- **Testing ready**: Structured for unit/integration tests

## 🎯 Use Cases

Perfect for demonstrating:
- **Full-stack development** skills
- **Financial domain** knowledge
- **Data processing** capabilities
- **UI/UX design** for complex applications
- **Database design** for financial systems

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

This is a demo repository showcasing a personal finance system. For questions about implementation or suggestions, please open an issue.

---

**Ready to explore personal finance analytics?** Run `python demo_setup.py` and start discovering insights in your demo financial data! 🚀