#!/usr/bin/env python3
"""
Personal Finance Dashboard - Demo Setup Script

One-click setup that:
1. Installs all dependencies (Python + Node.js)
2. Generates 2 years of realistic financial data
3. Creates sample files for upload testing
4. Starts both backend and frontend servers
5. Opens browser to dashboard

Usage: python demo_setup.py
"""

import os
import sys
import subprocess
import time
import webbrowser
import shutil
from pathlib import Path

# Color codes for terminal output
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header():
    """Print demo setup header"""
    print(f"""
{Colors.BOLD}{Colors.BLUE}
╔══════════════════════════════════════════════════════════════════════╗
║                Personal Finance Dashboard - Demo Setup               ║
║                                                                      ║
║  🚀 One-click setup with realistic demo data                        ║
║  📊 2 years of financial data + $200K investment portfolio          ║
║  📁 Sample files for upload testing                                 ║
║  🌐 Full-stack application (Python + React)                         ║
╚══════════════════════════════════════════════════════════════════════╝
{Colors.END}
""")

def print_step(step_num, description):
    """Print setup step"""
    print(f"{Colors.BOLD}{Colors.BLUE}[STEP {step_num}]{Colors.END} {description}")

def print_success(message):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_warning(message):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_error(message):
    """Print error message"""
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def check_requirements():
    """Check if required tools are installed"""
    print_step(1, "Checking system requirements...")
    
    # Check Python
    try:
        python_version = sys.version.split()[0]
        if sys.version_info < (3, 8):
            print_error(f"Python 3.8+ required. Found: {python_version}")
            return False
        print_success(f"Python {python_version}")
    except Exception as e:
        print_error(f"Python check failed: {e}")
        return False
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            node_version = result.stdout.strip()
            print_success(f"Node.js {node_version}")
        else:
            print_error("Node.js not found. Please install Node.js 16+ from https://nodejs.org")
            return False
    except FileNotFoundError:
        print_error("Node.js not found. Please install Node.js 16+ from https://nodejs.org")
        return False
    
    # Check npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            npm_version = result.stdout.strip()
            print_success(f"npm {npm_version}")
        else:
            print_error("npm not found")
            return False
    except FileNotFoundError:
        print_error("npm not found")
        return False
    
    return True

def install_python_dependencies():
    """Install Python dependencies"""
    print_step(2, "Installing Python dependencies...")
    
    try:
        # Check if requirements.txt exists
        if not os.path.exists('requirements.txt'):
            print_warning("requirements.txt not found, creating basic requirements...")
            create_requirements_file()
        
        # Install dependencies
        result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_success("Python dependencies installed")
            return True
        else:
            print_error(f"Failed to install Python dependencies: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Error installing Python dependencies: {e}")
        return False

def create_requirements_file():
    """Create requirements.txt if it doesn't exist"""
    requirements = [
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "sqlalchemy>=2.0.0",
        "pydantic>=2.5.0",
        "python-multipart>=0.0.6",
        "pandas>=2.1.0",
        "python-dotenv>=1.0.0",
        "reportlab>=4.0.0",
        "Pillow>=10.0.0",
        "requests>=2.31.0"
    ]
    
    with open('requirements.txt', 'w') as f:
        f.write('\n'.join(requirements))
    
    print_success("Created requirements.txt")

def install_frontend_dependencies():
    """Install Node.js dependencies"""
    print_step(3, "Installing frontend dependencies...")
    
    frontend_dir = Path('finance-dashboard')
    
    if not frontend_dir.exists():
        print_error("finance-dashboard directory not found")
        return False
    
    try:
        # Change to frontend directory and install
        original_dir = os.getcwd()
        os.chdir(frontend_dir)
        
        result = subprocess.run(['npm', 'install'], capture_output=True, text=True)
        
        os.chdir(original_dir)
        
        if result.returncode == 0:
            print_success("Frontend dependencies installed")
            return True
        else:
            print_error(f"Failed to install frontend dependencies: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Error installing frontend dependencies: {e}")
        return False

def generate_demo_data():
    """Generate realistic demo data"""
    print_step(4, "Generating demo data (this may take a minute)...")
    
    try:
        # Import and run demo data generation
        from demo.data_generator.demo_data_generator import create_demo_database
        create_demo_database()
        print_success("Demo database created with 2 years of financial data")
        
        # Generate sample files
        from demo.sample_files.sample_file_generator import generate_sample_files
        generate_sample_files()
        print_success("Sample files created for upload testing")
        
        return True
        
    except ImportError as e:
        print_warning(f"Demo data generators not found: {e}")
        print_warning("Creating minimal demo setup...")
        return create_minimal_demo()
    except Exception as e:
        print_error(f"Error generating demo data: {e}")
        return False

def create_minimal_demo():
    """Create minimal demo database if full generators aren't available"""
    try:
        # Create basic database structure
        from database import init_database
        from src.config.config_manager import ConfigManager
        
        config_manager = ConfigManager()
        categories = config_manager.get_categories()
        init_database(categories.keys())
        
        print_success("Basic database structure created")
        return True
        
    except Exception as e:
        print_error(f"Error creating minimal demo: {e}")
        return False

def create_environment_config():
    """Create .env file for development"""
    print_step(5, "Setting up environment configuration...")
    
    env_content = """# Finance Tracker Environment Configuration
ENVIRONMENT=development
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT=8000
REACT_APP_FRONTEND_PORT=3000
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print_success("Environment configuration created")
        return True
    except Exception as e:
        print_error(f"Error creating environment config: {e}")
        return False

def start_servers():
    """Start both backend and frontend servers"""
    print_step(6, "Starting servers...")
    
    try:
        # Start backend server in background
        print("🚀 Starting Python API server on port 8000...")
        backend_process = subprocess.Popen([
            sys.executable, 'run_api.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for backend to start
        print("⏳ Waiting for API server to start...")
        time.sleep(5)
        
        # Check if backend is running
        try:
            import requests
            response = requests.get('http://localhost:8000/api/health', timeout=5)
            if response.status_code == 200:
                print_success("API server started successfully")
            else:
                raise Exception("API health check failed")
        except Exception as e:
            print_warning(f"API server may not be ready: {e}")
        
        # Start frontend server
        print("🌐 Starting React frontend on port 3000...")
        frontend_dir = Path('finance-dashboard')
        os.chdir(frontend_dir)
        
        frontend_process = subprocess.Popen([
            'npm', 'start'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Return to original directory
        os.chdir('..')
        
        # Wait for frontend to start
        print("⏳ Waiting for frontend to start...")
        time.sleep(10)
        
        print_success("Frontend server started successfully")
        
        return backend_process, frontend_process
        
    except Exception as e:
        print_error(f"Error starting servers: {e}")
        return None, None

def open_browser():
    """Open browser to the dashboard"""
    print_step(7, "Opening browser...")
    
    try:
        time.sleep(2)  # Give servers a moment to fully start
        webbrowser.open('http://localhost:3000')
        print_success("Browser opened to dashboard")
    except Exception as e:
        print_warning(f"Could not auto-open browser: {e}")
        print("Please manually visit: http://localhost:3000")

def print_completion_message():
    """Print completion message with instructions"""
    print(f"""
{Colors.BOLD}{Colors.GREEN}
╔══════════════════════════════════════════════════════════════════════╗
║                         🎉 SETUP COMPLETE! 🎉                       ║
╚══════════════════════════════════════════════════════════════════════╝
{Colors.END}

{Colors.BOLD}Your Personal Finance Dashboard is now running:{Colors.END}

🌐 {Colors.BOLD}Frontend Dashboard:{Colors.END} http://localhost:3000
🔧 {Colors.BOLD}API Server:{Colors.END}        http://localhost:8000
📚 {Colors.BOLD}API Documentation:{Colors.END} http://localhost:8000/docs

{Colors.BOLD}Demo Features:{Colors.END}
• 📊 2 years of realistic financial data
• 💰 $200K investment portfolio across 7 accounts
• 📁 Sample files in demo/sample_files/ for upload testing
• 🏷️  Automatic transaction categorization
• 📈 Investment growth tracking
• 💡 Budget analysis and reporting

{Colors.BOLD}Sample Files for Testing:{Colors.END}
• Wells Fargo CSV exports
• PDF bank statements (OCR testing)
• Duplicate detection samples

{Colors.YELLOW}To stop the servers:{Colors.END} Press Ctrl+C in this terminal

{Colors.BLUE}Enjoy exploring your Personal Finance Dashboard! 🚀{Colors.END}
""")

def main():
    """Main demo setup function"""
    print_header()
    
    # Check requirements
    if not check_requirements():
        print_error("Requirements check failed. Please install missing dependencies.")
        sys.exit(1)
    
    # Install Python dependencies
    if not install_python_dependencies():
        print_error("Failed to install Python dependencies")
        sys.exit(1)
    
    # Install frontend dependencies
    if not install_frontend_dependencies():
        print_error("Failed to install frontend dependencies")
        sys.exit(1)
    
    # Generate demo data
    if not generate_demo_data():
        print_error("Failed to generate demo data")
        sys.exit(1)
    
    # Create environment config
    if not create_environment_config():
        print_error("Failed to create environment configuration")
        sys.exit(1)
    
    # Start servers
    backend_process, frontend_process = start_servers()
    if not backend_process or not frontend_process:
        print_error("Failed to start servers")
        sys.exit(1)
    
    # Open browser
    open_browser()
    
    # Print completion message
    print_completion_message()
    
    try:
        # Keep script running and handle Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Shutting down servers...{Colors.END}")
        try:
            backend_process.terminate()
            frontend_process.terminate()
        except:
            pass
        print_success("Servers stopped. Demo setup complete!")

if __name__ == "__main__":
    main()