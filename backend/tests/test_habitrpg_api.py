"""
HabitRPG API Tests - Iteration 3
Tests for authentication, habits, progress, game mode features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@habitrpg.com"
ADMIN_PASSWORD = "Admin123!"
TEST_EMAIL = "test@habitrpg.com"
TEST_PASSWORD = "Test123!"


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API health check passed: {data['message']}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_admin_game_mode(self):
        """Test login with admin (Game Mode) credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["app_mode"] == "game"
        assert data["user"]["onboarding_completed"] == True
        print(f"✓ Admin login successful - Game Mode user")
        return session
    
    def test_login_test_user_focus_mode(self):
        """Test login with test user (Focus Mode) credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["app_mode"] == "focus"
        assert data["user"]["onboarding_completed"] == True
        print(f"✓ Test user login successful - Focus Mode user")
        return session
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        session = requests.Session()
        # Login first
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        # Get current user
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "current_xp" in data
        assert "current_level" in data
        print(f"✓ Get current user successful - Level {data['current_level']}, XP {data['current_xp']}")
    
    def test_logout(self):
        """Test logout functionality"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response = session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        # Verify logged out
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Logout successful")
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "Test",
            "last_name": "User",
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["onboarding_completed"] == False
        assert data["user"]["gems"] == 50  # Starting gems
        assert data["user"]["streak_revives"] == 1  # Starting revive
        print(f"✓ Registration successful - new user created with 50 gems and 1 streak revive")


class TestOnboarding:
    """Onboarding flow tests"""
    
    def test_onboarding_save_step(self):
        """Test saving onboarding step"""
        # Register new user
        unique_email = f"TEST_onboard_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "Onboard",
            "last_name": "Test",
            "email": unique_email,
            "password": "TestPass123!"
        })
        
        # Save first step
        response = session.post(f"{BASE_URL}/api/users/onboarding", json={
            "main_goal": "levelup"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["main_goal"] == "levelup"
        assert data["onboarding_completed"] == False
        print("✓ Onboarding step 1 saved")
        
        # Save final step with app_mode
        response = session.post(f"{BASE_URL}/api/users/onboarding", json={
            "app_mode": "game"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["app_mode"] == "game"
        assert data["onboarding_completed"] == True
        print("✓ Onboarding completed - onboarding_completed is True")


class TestHabits:
    """Habit CRUD and completion tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_create_habit(self, admin_session):
        """Test creating a habit"""
        response = admin_session.post(f"{BASE_URL}/api/habits", json={
            "habit_name": f"TEST_Habit_{uuid.uuid4().hex[:6]}",
            "description": "Test habit",
            "time_of_day": "morning",
            "difficulty": "medium",
            "repeat_schedule": "daily"
        })
        assert response.status_code == 200
        data = response.json()
        assert "habit_id" in data
        assert data["xp_value"] == 25  # Medium difficulty
        print(f"✓ Habit created with ID: {data['habit_id']}")
        return data["habit_id"]
    
    def test_get_habits(self, admin_session):
        """Test getting all habits"""
        response = admin_session.get(f"{BASE_URL}/api/habits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} habits")
    
    def test_get_todays_habits(self, admin_session):
        """Test getting today's habits"""
        response = admin_session.get(f"{BASE_URL}/api/habits/today")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} habits for today")
    
    def test_complete_habit_earns_xp_and_gems(self, admin_session):
        """Test completing a habit earns XP and gems (Game Mode)"""
        # Create a habit
        create_resp = admin_session.post(f"{BASE_URL}/api/habits", json={
            "habit_name": f"TEST_Complete_{uuid.uuid4().hex[:6]}",
            "time_of_day": "morning",
            "difficulty": "easy",
            "repeat_schedule": "daily"
        })
        habit_id = create_resp.json()["habit_id"]
        
        # Complete the habit
        response = admin_session.post(f"{BASE_URL}/api/habits/{habit_id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert "xp_earned" in data
        assert data["xp_earned"] == 10  # Easy difficulty
        assert "gems_earned" in data
        assert data["gems_earned"] >= 0  # Game mode earns gems
        print(f"✓ Habit completed - earned {data['total_xp']} XP and {data['gems_earned']} gems")
        
        # Cleanup - delete habit
        admin_session.delete(f"{BASE_URL}/api/habits/{habit_id}")
    
    def test_uncomplete_habit(self, admin_session):
        """Test uncompleting a habit"""
        # Create and complete a habit
        create_resp = admin_session.post(f"{BASE_URL}/api/habits", json={
            "habit_name": f"TEST_Uncomplete_{uuid.uuid4().hex[:6]}",
            "time_of_day": "afternoon",
            "difficulty": "medium",
            "repeat_schedule": "daily"
        })
        habit_id = create_resp.json()["habit_id"]
        admin_session.post(f"{BASE_URL}/api/habits/{habit_id}/complete")
        
        # Uncomplete
        response = admin_session.post(f"{BASE_URL}/api/habits/{habit_id}/uncomplete")
        assert response.status_code == 200
        data = response.json()
        assert "new_xp" in data
        print(f"✓ Habit uncompleted - XP adjusted to {data['new_xp']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/habits/{habit_id}")
    
    def test_delete_habit(self, admin_session):
        """Test deleting a habit"""
        # Create a habit
        create_resp = admin_session.post(f"{BASE_URL}/api/habits", json={
            "habit_name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "time_of_day": "night",
            "difficulty": "hard",
            "repeat_schedule": "daily"
        })
        habit_id = create_resp.json()["habit_id"]
        
        # Delete
        response = admin_session.delete(f"{BASE_URL}/api/habits/{habit_id}")
        assert response.status_code == 200
        print("✓ Habit deleted successfully")


class TestProgress:
    """Progress tracking tests"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_daily_progress(self, admin_session):
        """Test getting daily progress"""
        response = admin_session.get(f"{BASE_URL}/api/progress/daily")
        assert response.status_code == 200
        data = response.json()
        assert "total_habits" in data
        assert "completed_habits" in data
        assert "morning" in data
        assert "afternoon" in data
        assert "night" in data
        print(f"✓ Daily progress: {data['completed_habits']}/{data['total_habits']} habits")
    
    def test_weekly_progress(self, admin_session):
        """Test getting weekly progress"""
        response = admin_session.get(f"{BASE_URL}/api/progress/weekly")
        assert response.status_code == 200
        data = response.json()
        assert "daily_data" in data
        assert "total_xp" in data
        assert "completion_rate" in data
        assert len(data["daily_data"]) == 7
        print(f"✓ Weekly progress: {data['total_xp']} XP, {data['completion_rate']}% completion")


class TestLevels:
    """Level system tests"""
    
    def test_get_levels(self):
        """Test getting level definitions"""
        response = requests.get(f"{BASE_URL}/api/levels")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        assert data[0]["level"] == 1
        assert data[0]["name"] == "Rookie"
        assert data[9]["level"] == 10
        assert data[9]["name"] == "Apex"
        print("✓ Level definitions retrieved - 10 levels from Rookie to Apex")


class TestUserProfile:
    """User profile and settings tests"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_get_user_stats(self, admin_session):
        """Test getting user stats"""
        response = admin_session.get(f"{BASE_URL}/api/users/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_xp_all_time" in data
        assert "highest_level_reached" in data
        assert "longest_streak_ever" in data
        assert "current_streak" in data
        print(f"✓ User stats: {data['total_xp_all_time']} total XP, {data['current_streak']} day streak")
    
    def test_switch_mode(self, admin_session):
        """Test switching between Focus and Game mode"""
        # Get current mode
        me_resp = admin_session.get(f"{BASE_URL}/api/auth/me")
        current_mode = me_resp.json()["app_mode"]
        
        # Switch mode
        response = admin_session.put(f"{BASE_URL}/api/users/mode")
        assert response.status_code == 200
        data = response.json()
        expected_mode = "focus" if current_mode == "game" else "game"
        assert data["app_mode"] == expected_mode
        print(f"✓ Mode switched from {current_mode} to {expected_mode}")
        
        # Switch back
        admin_session.put(f"{BASE_URL}/api/users/mode")
    
    def test_update_notification_settings(self, admin_session):
        """Test updating notification settings"""
        response = admin_session.put(f"{BASE_URL}/api/users/notification-settings", json={
            "push_enabled": True,
            "reminders_enabled": True,
            "roast_enabled": True
        })
        assert response.status_code == 200
        print("✓ Notification settings updated")


class TestGameMode:
    """Game mode specific features"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_game_status(self, admin_session):
        """Test getting game status"""
        response = admin_session.get(f"{BASE_URL}/api/game/status")
        assert response.status_code == 200
        data = response.json()
        assert "gems" in data
        assert "streak_revives" in data
        assert "current_streak" in data
        assert "level" in data
        print(f"✓ Game status: {data['gems']} gems, {data['streak_revives']} revives, Level {data['level']}")
    
    def test_shop_items(self, admin_session):
        """Test getting shop items"""
        response = admin_session.get(f"{BASE_URL}/api/game/shop")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "user_gems" in data
        assert len(data["items"]) >= 4
        print(f"✓ Shop has {len(data['items'])} items, user has {data['user_gems']} gems")
    
    def test_level_rewards(self, admin_session):
        """Test getting level rewards"""
        response = admin_session.get(f"{BASE_URL}/api/game/level-rewards")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        # Check level 2 rewards
        level_2 = next(r for r in data if r["level"] == 2)
        assert level_2["gems"] == 25
        # Check level 5 rewards
        level_5 = next(r for r in data if r["level"] == 5)
        assert level_5["gems"] == 100
        assert level_5["streak_revives"] == 1
        print("✓ Level rewards retrieved - gems and streak revives per level")
    
    def test_roast_endpoint(self, admin_session):
        """Test roast endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/game/roast?category=missed_habit")
        assert response.status_code == 200
        data = response.json()
        assert "roast" in data
        if data["roast"]:
            print(f"✓ Roast received: {data['roast'][:50]}...")
        else:
            print("✓ Roast endpoint working (no roast for focus mode)")


class TestXPLevelConsistency:
    """Test XP and Level consistency"""
    
    def test_admin_xp_level_consistency(self):
        """Verify admin user XP matches level"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/auth/me")
        data = response.json()
        
        xp = data["current_xp"]
        level = data["current_level"]
        
        # Level 4 (Achiever) is 501-900 XP
        if level == 4:
            assert 501 <= xp <= 900, f"Level 4 should have XP 501-900, got {xp}"
        
        print(f"✓ Admin XP/Level consistent: {xp} XP = Level {level} ({data['level_name']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
