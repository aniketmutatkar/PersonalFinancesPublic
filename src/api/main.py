# src/api/main.py
"""
FastAPI main application
SECURITY UPDATE STEP 4: Removed hardcoded IP addresses for secure deployment
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

from src.api.utils.error_handling import APIError, api_error_handler
from src.api.routers import exports

# Load environment variables
load_dotenv()
env = os.getenv("ENVIRONMENT", "development")

# Create FastAPI application with enhanced metadata
app = FastAPI(
    title="Finance Tracker API",
    description="""
    # Finance Tracker API
    
    This API provides access to financial transaction data, monthly summaries, categories, and budget analysis.
    
    ## Main Features
    
    * **Transactions**: View, filter, and upload financial transactions
    * **Monthly Summaries**: Get aggregated financial data by month
    * **Categories**: Manage transaction categories and view category-specific data
    * **Budgets**: Compare budget vs. actual spending
    * **Statistics**: Get financial insights and patterns
    
    ## Authentication
    
    Authentication is not yet implemented. All endpoints are currently open.
    
    ## Frontend Integration
    
    This API is designed to be consumed by a React frontend. CORS is configured for secure development and production deployment.
    """,
    version="1.0.0",
    docs_url=None  # We'll customize the docs URL
)

if env == "production":
    # Production CORS settings - use relative URLs
    origins = [
        "https://your-production-domain.com",  # Update with your actual domain
        "https://www.your-production-domain.com"
    ]
else:
    # Development CORS settings - localhost-based for security
    origins = [
        "http://localhost:3000",          # React dev server
        "http://127.0.0.1:3000",         # Alternative localhost
        "http://localhost:3001",         # Alternative port
        "http://127.0.0.1:3001",         # Alternative port
        # For mobile development, use ngrok instead
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(APIError, api_error_handler)

# Custom Swagger UI with additional info
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="/favicon.ico",
    )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "environment": env}

# Import routers
from src.api.routers import transactions, monthly_summary, categories, budgets, statistics, portfolio, financial_metrics

# Include routers
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(monthly_summary.router, prefix="/api/monthly-summary", tags=["monthly-summary"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])
app.include_router(statistics.router, prefix="/api/statistics", tags=["statistics"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(financial_metrics.router, prefix="/api/financial-metrics", tags=["financial-metrics"])

# Startup event
@app.on_event("startup")
async def startup_event():
    """Perform startup tasks"""
    print(f"Finance Tracker API starting up... (Environment: {env})")