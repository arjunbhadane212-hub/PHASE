#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class HabitRPGAPITester:
    def __init__(self, base_url="https://habit-rpg-21.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials
        self.admin_email = "admin@habitrpg.com"
        self.admin_password = "Admin123!"
        self.test_email = "test@habitrpg.com"
        self.test_password = "Test123!"
        
        # Dynamic test user for registration
        self.new_user_email = f"testuser_{int(time.time())}@habitrpg.com"
        self.new_user_password = "NewUser123!"

    def log_result(self, test_name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200
            self.log_result("API Health Check", success, 
                          f"Status: {response.status_code}", "/")
            return success
        except Exception as e:
            self.log_result("API Health Check", False, str(e), "/")
            return False

    def test_user_registration(self):
        """Test user registration"""
        try:
            payload = {
                "first_name": "Test",
                "last_name": "User",
                "email": self.new_user_email,
                "password": self.new_user_password
            }
            response = self.session.post(f"{self.base_url}/auth/register", json=payload)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "user" in data and "access_token" in data
                
            self.log_result("User Registration", success, 
                          f"Status: {response.status_code}", "/auth/register")
            return success
        except Exception as e:
            self.log_result("User Registration", False, str(e), "/auth/register")
            return False

    def test_user_login(self, email, password, test_name="User Login"):
        """Test user login"""
        try:
            payload = {"email": email, "password": password}
            response = self.session.post(f"{self.base_url}/auth/login", json=payload)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "user" in data and "access_token" in data
                
            self.log_result(test_name, success, 
                          f"Status: {response.status_code}", "/auth/login")
            return success
        except Exception as e:
            self.log_result(test_name, False, str(e), "/auth/login")
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "email" in data and "first_name" in data
                
            self.log_result("Get Current User", success, 
                          f"Status: {response.status_code}", "/auth/me")
            return success
        except Exception as e:
            self.log_result("Get Current User", False, str(e), "/auth/me")
            return False

    def test_onboarding_flow(self):
        """Test onboarding data saving"""
        try:
            # Test each onboarding step
            steps = [
                {"main_goal": "active"},
                {"download_reason": "fun"},
                {"consistency_level": "better"},
                {"accountability_style": "progress"},
                {"app_mode": "game"}
            ]
            
            all_success = True
            for i, step in enumerate(steps):
                response = self.session.post(f"{self.base_url}/users/onboarding", json=step)
                if response.status_code != 200:
                    all_success = False
                    break
                    
            self.log_result("Onboarding Flow", all_success, 
                          f"Completed {len(steps)} steps", "/users/onboarding")
            return all_success
        except Exception as e:
            self.log_result("Onboarding Flow", False, str(e), "/users/onboarding")
            return False

    def test_habit_creation(self):
        """Test creating a habit"""
        try:
            payload = {
                "habit_name": "Test Morning Workout",
                "description": "30 minute workout",
                "time_of_day": "morning",
                "difficulty": "medium",
                "repeat_schedule": "daily"
            }
            response = self.session.post(f"{self.base_url}/habits", json=payload)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "habit_id" in data and data["habit_name"] == payload["habit_name"]
                if success:
                    self.test_habit_id = data["habit_id"]
                
            self.log_result("Habit Creation", success, 
                          f"Status: {response.status_code}", "/habits")
            return success
        except Exception as e:
            self.log_result("Habit Creation", False, str(e), "/habits")
            return False

    def test_get_habits(self):
        """Test getting user habits"""
        try:
            response = self.session.get(f"{self.base_url}/habits")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = isinstance(data, list)
                
            self.log_result("Get Habits", success, 
                          f"Status: {response.status_code}", "/habits")
            return success
        except Exception as e:
            self.log_result("Get Habits", False, str(e), "/habits")
            return False

    def test_get_todays_habits(self):
        """Test getting today's habits"""
        try:
            response = self.session.get(f"{self.base_url}/habits/today")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = isinstance(data, list)
                
            self.log_result("Get Today's Habits", success, 
                          f"Status: {response.status_code}", "/habits/today")
            return success
        except Exception as e:
            self.log_result("Get Today's Habits", False, str(e), "/habits/today")
            return False

    def test_complete_habit(self):
        """Test completing a habit"""
        if not hasattr(self, 'test_habit_id'):
            self.log_result("Complete Habit", False, "No habit ID available", "/habits/{id}/complete")
            return False
            
        try:
            response = self.session.post(f"{self.base_url}/habits/{self.test_habit_id}/complete")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "xp_earned" in data and "total_xp" in data
                
            self.log_result("Complete Habit", success, 
                          f"Status: {response.status_code}", f"/habits/{self.test_habit_id}/complete")
            return success
        except Exception as e:
            self.log_result("Complete Habit", False, str(e), f"/habits/{self.test_habit_id}/complete")
            return False

    def test_daily_progress(self):
        """Test getting daily progress"""
        try:
            response = self.session.get(f"{self.base_url}/progress/daily")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "date" in data and "total_habits" in data
                
            self.log_result("Daily Progress", success, 
                          f"Status: {response.status_code}", "/progress/daily")
            return success
        except Exception as e:
            self.log_result("Daily Progress", False, str(e), "/progress/daily")
            return False

    def test_weekly_progress(self):
        """Test getting weekly progress"""
        try:
            response = self.session.get(f"{self.base_url}/progress/weekly")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "daily_data" in data and "total_xp" in data
                
            self.log_result("Weekly Progress", success, 
                          f"Status: {response.status_code}", "/progress/weekly")
            return success
        except Exception as e:
            self.log_result("Weekly Progress", False, str(e), "/progress/weekly")
            return False

    def test_get_levels(self):
        """Test getting level information"""
        try:
            response = self.session.get(f"{self.base_url}/levels")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = isinstance(data, list) and len(data) > 0
                
            self.log_result("Get Levels", success, 
                          f"Status: {response.status_code}", "/levels")
            return success
        except Exception as e:
            self.log_result("Get Levels", False, str(e), "/levels")
            return False

    def test_user_stats(self):
        """Test getting user stats"""
        try:
            response = self.session.get(f"{self.base_url}/users/stats")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "total_xp_all_time" in data and "current_streak" in data
                
            self.log_result("User Stats", success, 
                          f"Status: {response.status_code}", "/users/stats")
            return success
        except Exception as e:
            self.log_result("User Stats", False, str(e), "/users/stats")
            return False

    def test_mode_switching(self):
        """Test switching app mode"""
        try:
            response = self.session.put(f"{self.base_url}/users/mode")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = "app_mode" in data
                
            self.log_result("Mode Switching", success, 
                          f"Status: {response.status_code}", "/users/mode")
            return success
        except Exception as e:
            self.log_result("Mode Switching", False, str(e), "/users/mode")
            return False

    def test_logout(self):
        """Test user logout"""
        try:
            response = self.session.post(f"{self.base_url}/auth/logout")
            success = response.status_code == 200
            
            self.log_result("User Logout", success, 
                          f"Status: {response.status_code}", "/auth/logout")
            return success
        except Exception as e:
            self.log_result("User Logout", False, str(e), "/auth/logout")
            return False

    def test_brute_force_protection(self):
        """Test brute force protection"""
        try:
            # Try 6 failed login attempts
            failed_attempts = 0
            for i in range(6):
                payload = {"email": "test@example.com", "password": "wrongpassword"}
                response = self.session.post(f"{self.base_url}/auth/login", json=payload)
                if response.status_code == 429:  # Too many requests
                    break
                failed_attempts += 1
                time.sleep(0.1)  # Small delay between attempts
            
            # The 6th attempt should be blocked
            success = failed_attempts < 6
            self.log_result("Brute Force Protection", success, 
                          f"Blocked after {failed_attempts} attempts", "/auth/login")
            return success
        except Exception as e:
            self.log_result("Brute Force Protection", False, str(e), "/auth/login")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting HabitRPG API Tests...")
        print(f"Base URL: {self.base_url}")
        print("-" * 50)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test user registration
        self.test_user_registration()
        
        # Test login with new user
        if self.test_user_login(self.new_user_email, self.new_user_password, "New User Login"):
            # Test authenticated endpoints
            self.test_get_current_user()
            self.test_onboarding_flow()
            self.test_habit_creation()
            self.test_get_habits()
            self.test_get_todays_habits()
            self.test_complete_habit()
            self.test_daily_progress()
            self.test_weekly_progress()
            self.test_user_stats()
            self.test_mode_switching()
            self.test_logout()
        
        # Test with existing test user
        if self.test_user_login(self.test_email, self.test_password, "Test User Login"):
            self.test_get_current_user()
        
        # Test admin login
        self.test_user_login(self.admin_email, self.admin_password, "Admin Login")
        
        # Test public endpoints
        self.test_get_levels()
        
        # Test security
        self.test_brute_force_protection()
        
        # Print summary
        print("-" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = HabitRPGAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())