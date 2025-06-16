# run_api.py

import os
import uvicorn
import logging
import argparse
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logger = logging.getLogger("finance-tracker-api")

def run_api(host: str, port: int, reload: bool, env: str):
    """Run the Finance Tracker API server"""
    logger.info(f"Starting Finance Tracker API in {env} mode")
    logger.info(f"Server running at http://{host}:{port}")
    
    if reload:
        logger.info("Hot reloading is enabled")
    
    # Set environment variable for the API
    os.environ["ENVIRONMENT"] = env
    
    # Run the API server
    uvicorn.run(
        "src.api.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Finance Tracker API Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    parser.add_argument("--reload", action="store_true", help="Enable hot reloading")
    parser.add_argument("--env", type=str, default="development", choices=["development", "production"], help="Environment to run in")
    
    args = parser.parse_args()
    
    # Override with environment variables if present
    host = os.getenv("API_HOST", args.host)
    port = int(os.getenv("API_PORT", args.port))
    reload = os.getenv("API_RELOAD", "").lower() in ("true", "1", "t") if "API_RELOAD" in os.environ else args.reload
    env = os.getenv("ENVIRONMENT", args.env)
    
    run_api(host, port, reload, env)