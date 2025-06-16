#!/usr/bin/env python3
"""
One-Click Demo Setup Script for Personal Finance Dashboard

This script:
1. Checks and installs dependencies
2. Sets up environment configuration
3. Generates realistic demo data
4. Starts both backend and frontend servers
5. Opens browser to the dashboard

Usage: python demo_setup.py
"""

import os
import sys
import subprocess
import shutil
import time
import webbrowser
from pathlib import Path
import threading


class DemoSetup:
    """One-click setup for Personal Finance Dashboard demo"""
    
    def __init__(self):
        self.root_dir = Path.cwd()
        self.backend_port = 8000
        self.frontend_port = 3000
        self.processes = []
    
    def run_setup(self):
        """Main setup workflow"""
        print("🚀 Personal Finance Dashboard - Demo Setup")
        print("=" * 50)
        
        try:
            # Step 1: Environment setup
            self.setup_environment()
            
            # Step 2: Install dependencies
            self.install_dependencies()
            
            # Step 3: Generate demo data
            self.generate_demo_data()
            
            # Step 4: Start servers
            self.start_servers()
            
            # Step 5: Open browser
            self.open_browser()
            
            # Step 6: Keep running
            self.wait_for_exit()
            
        except KeyboardInterrupt:
            print("\n⛔ Setup interrupted by user")
            self.cleanup()
        except Exception as e:
            print(f"\n❌ Setup failed: {str(e)}")
            self.cleanup()
            sys.exit(1)
    
    def setup_environment(self):
        """Set up environment configuration"""
        print("🔧 Setting up environment...")
        
        # Copy environment template
        env_example = self.root_dir / ".env.example"
        env_file = self.root_dir / ".env"
        
        if env_example.exists() and not env_file.exists():
            shutil.copy(env_example, env_file)
            print("✅ Created .env from template")
        elif env_file.exists():
            print("✅ .env file already exists")
        else:
            # Create basic .env if template doesn't exist
            with open(env_file, 'w') as f:
                f.write(f"""# Demo Environment Configuration
DEMO_MODE=true
REACT_APP_API_BASE_URL=http://localhost:{self.backend_port}/api
DATABASE_URL=sqlite:///demo_data.db

# Network Configuration
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT={self.backend_port}
REACT_APP_FRONTEND_PORT={self.frontend_port}

API_CORS_FRONTEND_HOST=localhost
API_CORS_FRONTEND_PORT={self.frontend_port}
API_CORS_MOBILE_HOST=localhost
""")
            print("✅ Created basic .env file")
        
        # Copy demo config
        demo_config = self.root_dir / "config.demo.yaml"
        config_file = self.root_dir / "config.yaml"
        
        if demo_config.exists() and not config_file.exists():
            shutil.copy(demo_config, config_file)
            print("✅ Created config.yaml from demo template")
        elif config_file.exists():
            print("✅ config.yaml already exists")
        else:
            print("⚠️  Warning: No config.demo.yaml found - demo may not work properly")
    
    def install_dependencies(self):
        """Install Python and Node.js dependencies"""
        print("📦 Installing dependencies...")
        
        # Check Python version
        python_version = sys.version_info
        if python_version < (3, 8):
            raise Exception(f"Python 3.8+ required, found {python_version.major}.{python_version.minor}")
        
        print(f"✅ Python {python_version.major}.{python_version.minor} detected")
        
        # Install Python dependencies
        requirements_file = self.root_dir / "requirements.txt"
        if requirements_file.exists():
            print("📥 Installing Python packages...")
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ Failed to install Python packages: {result.stderr}")
                raise Exception("Python dependency installation failed")
            
            print("✅ Python packages installed")
        else:
            print("⚠️  No requirements.txt found - creating basic one...")
            # Create minimal requirements for demo
            with open(requirements_file, 'w') as f:
                f.write("""fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
pandas==2.1.4
pyyaml==6.0.1
python-dateutil==2.8.2
""")
            
            # Install the packages
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], check=True)
            print("✅ Basic Python packages installed")
        
        # Install Node.js dependencies
        frontend_dir = self.root_dir / "finance-dashboard"
        if frontend_dir.exists():
            package_json = frontend_dir / "package.json"
            if package_json.exists():
                print("📥 Installing Node.js packages...")
                
                # Check if npm is available
                try:
                    subprocess.run(["npm", "--version"], capture_output=True, check=True)
                except (subprocess.CalledProcessError, FileNotFoundError):
                    raise Exception("npm not found - please install Node.js")
                
                # Install packages
                result = subprocess.run(
                    ["npm", "install"], 
                    cwd=frontend_dir, 
                    capture_output=True, 
                    text=True
                )
                
                if result.returncode != 0:
                    print(f"❌ Failed to install Node.js packages: {result.stderr}")
                    raise Exception("Node.js dependency installation failed")
                
                print("✅ Node.js packages installed")
            else:
                print("⚠️  No package.json found in finance-dashboard/")
        else:
            print("⚠️  No finance-dashboard/ directory found")
    
    def generate_demo_data(self):
        """Generate demo database and sample data"""
        print("🎲 Generating demo data...")
        
        # Check if demo data already exists
        demo_db = self.root_dir / "demo_data.db"
        if demo_db.exists():
            response = input("Demo database exists. Regenerate? (y/N): ").strip().lower()
            if response != 'y':
                print("✅ Using existing demo data")
                return
            else:
                demo_db.unlink()  # Delete existing database
        
        # Import and run demo data generator
        try:
            # Add current directory to Python path
            sys.path.insert(0, str(self.root_dir))
            
            # Import the generator
            from demo.data_generator.demo_data_generator import generate_demo_data
            
            # Generate the data
            print("🏗️  Generating 1,500 transactions and portfolio data...")
            generate_demo_data()
            
            print("✅ Demo data generated successfully")
            
        except ImportError as e:
            print(f"❌ Could not import demo data generator: {e}")
            print("⚠️  Demo may not work without proper data")
        except Exception as e:
            print(f"❌ Failed to generate demo data: {e}")
            raise
    
    def start_servers(self):
        """Start both backend and frontend servers"""
        print("🌐 Starting servers...")
        
        # Start backend server
        backend_script = self.root_dir / "run_api.py"
        if backend_script.exists():
            print(f"🔧 Starting backend server on port {self.backend_port}...")
            
            backend_process = subprocess.Popen([
                sys.executable, str(backend_script)
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            self.processes.append(('Backend', backend_process))
            
            # Wait a moment for backend to start
            time.sleep(3)
            
            if backend_process.poll() is None:
                print(f"✅ Backend server started (PID: {backend_process.pid})")
            else:
                stdout, stderr = backend_process.communicate()
                print(f"❌ Backend server failed to start: {stderr}")
                raise Exception("Backend server startup failed")
        else:
            print("⚠️  No run_api.py found - trying alternative startup...")
            # Try alternative: python -m uvicorn main:app
            try:
                backend_process = subprocess.Popen([
                    sys.executable, "-m", "uvicorn", "src.api.main:app", 
                    "--host", "0.0.0.0", "--port", str(self.backend_port), "--reload"
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                
                self.processes.append(('Backend', backend_process))
                time.sleep(3)
                
                if backend_process.poll() is None:
                    print(f"✅ Backend server started via uvicorn (PID: {backend_process.pid})")
                else:
                    raise Exception("Alternative backend startup failed")
            except Exception as e:
                print(f"❌ Could not start backend server: {e}")
                print("⚠️  You may need to start the backend manually")
        
        # Start frontend server
        frontend_dir = self.root_dir / "finance-dashboard"
        if frontend_dir.exists() and (frontend_dir / "package.json").exists():
            print(f"⚛️  Starting frontend server on port {self.frontend_port}...")
            
            # Set environment variables for frontend
            env = os.environ.copy()
            env['PORT'] = str(self.frontend_port)
            env['REACT_APP_API_BASE_URL'] = f"http://localhost:{self.backend_port}/api"
            
            frontend_process = subprocess.Popen([
                "npm", "start"
            ], cwd=frontend_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
              text=True, env=env)
            
            self.processes.append(('Frontend', frontend_process))
            
            # Wait for frontend to start (takes longer)
            print("⏳ Waiting for frontend to compile...")
            time.sleep(15)
            
            if frontend_process.poll() is None:
                print(f"✅ Frontend server started (PID: {frontend_process.pid})")
            else:
                stdout, stderr = frontend_process.communicate()
                print(f"❌ Frontend server failed to start: {stderr}")
                print("⚠️  You may need to start the frontend manually with 'npm start'")
        else:
            print("⚠️  No frontend directory found - skipping frontend startup")
        
        print(f"""
🎉 Servers are starting up!

📡 Backend API: http://localhost:{self.backend_port}
📚 API Docs: http://localhost:{self.backend_port}/docs
⚛️  Frontend: http://localhost:{self.frontend_port}

⏳ Please wait ~30 seconds for full startup...
""")
    
    def open_browser(self):
        """Open browser to the demo dashboard"""
        print("🌐 Opening browser...")
        
        # Wait a bit more for servers to be fully ready
        time.sleep(10)
        
        dashboard_url = f"http://localhost:{self.frontend_port}"
        
        try:
            webbrowser.open(dashboard_url)
            print(f"✅ Opened browser to {dashboard_url}")
        except Exception as e:
            print(f"⚠️  Could not open browser automatically: {e}")
            print(f"📱 Please manually open: {dashboard_url}")
        
        print(f"""
🎯 Demo is ready! Here's what you can explore:

📊 Dashboard Overview: View your $200K demo portfolio
💳 Transactions: Browse 1,500+ categorized transactions  
📈 Portfolio Analytics: Track investment performance
🏦 Bank Accounts: Wells Fargo checking/savings balances
📋 Budget Analysis: See spending vs. budget comparisons
📤 File Upload: Test CSV/PDF statement uploads

🔧 Technical URLs:
   • Frontend: http://localhost:{self.frontend_port}
   • Backend API: http://localhost:{self.backend_port}
   • API Documentation: http://localhost:{self.backend_port}/docs
   
⚡ Press Ctrl+C to stop all servers
""")
    
    def wait_for_exit(self):
        """Wait for user to exit and keep servers running"""
        try:
            print("🔄 Demo is running... Press Ctrl+C to stop")
            
            # Monitor processes
            while True:
                # Check if any process has died
                for name, process in self.processes:
                    if process.poll() is not None:
                        print(f"⚠️  {name} server stopped unexpectedly")
                
                time.sleep(5)
                
        except KeyboardInterrupt:
            print("\n🛑 Shutting down demo...")
            self.cleanup()
    
    def cleanup(self):
        """Clean up processes and resources"""
        print("🧹 Cleaning up...")
        
        for name, process in self.processes:
            if process.poll() is None:  # Process is still running
                print(f"🔌 Stopping {name} server...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                    print(f"✅ {name} server stopped")
                except subprocess.TimeoutExpired:
                    print(f"⚡ Force killing {name} server...")
                    process.kill()
                    process.wait()
        
        print("✅ Cleanup complete")
    
    def check_ports(self):
        """Check if required ports are available"""
        import socket
        
        def is_port_in_use(port):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                return s.connect_ex(('localhost', port)) == 0
        
        if is_port_in_use(self.backend_port):
            print(f"⚠️  Port {self.backend_port} is already in use")
            return False
        
        if is_port_in_use(self.frontend_port):
            print(f"⚠️  Port {self.frontend_port} is already in use")
            return False
        
        return True
    
    def print_system_info(self):
        """Print system information for debugging"""
        print("🔍 System Information:")
        print(f"   Python: {sys.version}")
        print(f"   Platform: {sys.platform}")
        print(f"   Working Directory: {self.root_dir}")
        
        # Check for required files
        required_files = [
            "config.demo.yaml",
            "requirements.txt", 
            "demo/data_generator/demo_data_generator.py",
            "finance-dashboard/package.json"
        ]
        
        print("📁 Required Files:")
        for file_path in required_files:
            file = self.root_dir / file_path
            status = "✅" if file.exists() else "❌"
            print(f"   {status} {file_path}")


def main():
    """Main entry point for demo setup"""
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║               Personal Finance Dashboard Demo                ║
║                                                              ║
║  🚀 One-click setup for a complete financial analytics demo ║
║  📊 $200K portfolio • 1,500 transactions • 2 years of data  ║
║  ⚡ FastAPI + React + SQLite + Real-time dashboard          ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # Initialize setup
    setup = DemoSetup()
    
    # Print system info for debugging
    setup.print_system_info()
    
    # Check ports
    if not setup.check_ports():
        print("❌ Required ports are in use. Please stop other services or change ports.")
        sys.exit(1)
    
    # Ask for confirmation
    response = input("\n🤔 Ready to set up the demo? This will:\n"
                    "   • Install Python and Node.js dependencies\n"
                    "   • Generate 1,500+ demo transactions\n"
                    "   • Start backend and frontend servers\n"
                    "   • Open browser to dashboard\n\n"
                    "Continue? (Y/n): ").strip().lower()
    
    if response in ['', 'y', 'yes']:
        setup.run_setup()
    else:
        print("❌ Setup cancelled")
        sys.exit(0)


if __name__ == "__main__":
    main()