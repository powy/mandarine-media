#!/usr/bin/env python3
"""
Script to verify that the basic project setup is working correctly.
"""
import sys
import os
import subprocess
import requests
import time

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def check_docker_services():
    """Check if Docker services are running"""
    try:
        result = subprocess.run(['docker', 'compose', '-f', 'docker-compose.dev.yml', 'ps'], 
                              capture_output=True, text=True, cwd='..')
        print("Docker services status:")
        print(result.stdout)
        return "api" in result.stdout and "db" in result.stdout
    except Exception as e:
        print(f"Error checking Docker services: {e}")
        return False

def check_api_health():
    """Check if the API is responding"""
    max_retries = 10
    for i in range(max_retries):
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ API health check passed: {response.json()}")
                return True
        except requests.exceptions.RequestException:
            print(f"Attempt {i+1}/{max_retries}: API not ready, waiting...")
            time.sleep(3)
    
    print("❌ API health check failed")
    return False

def check_api_docs():
    """Check if API documentation is accessible"""
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API documentation accessible at http://localhost:8000/docs")
            return True
    except requests.exceptions.RequestException:
        pass
    
    print("❌ API documentation not accessible")
    return False

def test_database_connection():
    """Test basic database functionality"""
    try:
        from app.db.database import SessionLocal
        from app.models.user import User
        
        db = SessionLocal()
        # Simple query to test connection
        user_count = db.query(User).count()
        print(f"✅ Database connection successful. Users in database: {user_count}")
        db.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def main():
    print("=== KYOOL Media Platform Setup Verification ===\n")
    
    results = {
        "Docker Services": check_docker_services(),
        "API Health": check_api_health(),
        "API Documentation": check_api_docs(),
        "Database Connection": test_database_connection()
    }
    
    print(f"\n=== Setup Verification Results ===")
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print(f"\n🎉 All tests passed! The basic project setup is working correctly.")
        print(f"📚 Visit http://localhost:8000/docs for API documentation")
        print(f"🏥 Health check: http://localhost:8000/health")
    else:
        print(f"\n⚠️  Some tests failed. Please check the Docker services and database setup.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())