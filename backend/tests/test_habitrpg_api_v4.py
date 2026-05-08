"""
HabitRPG API Tests - Iteration 4
Tests for: Auth, Habits, Shop, Game features, 5-tab navigation support
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


class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root: {data}")
    
    def test_levels_endpoint(self):
        """Test levels endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/levels")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10  # 10 levels
        assert data[0]["level"] == 1
        assert data[0]["name"] == "Rookie"
        assert data[9]["level"] == 10
        assert data[9]["name"] == "Apex"
        print(f"Levels: {len(data)} levels defined")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_admin_login_game_mode(self):
        """Test admin login (Game Mode user)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["app_mode"] == "game"
        assert data["user"]["onboarding_completed"] == True
        print(f"Admin login successful: {data['user']['first_name']} - Game Mode")
    
    def test_test_user_login_focus_mode(self):
        """Test user login (Focus Mode user)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["app_mode"] == "focus"
        print(f"Test user login successful: {data['user']['first_name']} - Focus Mode")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_wrong_password(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("Wrong password correctly rejected")


class TestUserRegistrationAndOnboarding:
    """User registration and onboarding tests"""
    
    def test_register_new_user(self):
        """Test new user registration with starting gems"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@habitrpg.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "Test",
            "last_name": "User",
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "access_token" in data
        assert data["user"]["gems"] == 50  # Starting gems
        assert data["user"]["streak_revives"] == 1  # Starting streak revive
        assert data["user"]["onboarding_completed"] == False
        print(f"New user registered with 50 gems and 1 streak revive")
        return data["access_token"], data["user"]
    
    def test_onboarding_flow(self):
        """Test onboarding saves correctly"""
        # Register new user
        unique_email = f"onboard_{uuid.uuid4().hex[:8]}@habitrpg.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "Onboard",
            "last_name": "Test",
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert reg_response.status_code == 200
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 1: main_goal
        r1 = requests.post(f"{BASE_URL}/api/users/onboarding", 
            json={"main_goal": "levelup"}, headers=headers)
        assert r1.status_code == 200
        assert r1.json()["main_goal"] == "levelup"
        
        # Step 2: download_reason
        r2 = requests.post(f"{BASE_URL}/api/users/onboarding", 
            json={"download_reason": "discipline"}, headers=headers)
        assert r2.status_code == 200
        
        # Step 3: consistency_level
        r3 = requests.post(f"{BASE_URL}/api/users/onboarding", 
            json={"consistency_level": "fire"}, headers=headers)
        assert r3.status_code == 200
        
        # Step 4: accountability_style
        r4 = requests.post(f"{BASE_URL}/api/users/onboarding", 
            json={"accountability_style": "progress"}, headers=headers)
        assert r4.status_code == 200
        
        # Step 5: app_mode (final step - sets onboarding_completed)
        r5 = requests.post(f"{BASE_URL}/api/users/onboarding", 
            json={"app_mode": "game"}, headers=headers)
        assert r5.status_code == 200
        assert r5.json()["onboarding_completed"] == True
        assert r5.json()["app_mode"] == "game"
        print("Onboarding flow completed successfully - 5 questions saved")


class TestAuthenticatedUser:
    """Tests requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "password_hash" not in data  # Should not expose password
        print(f"Current user: {data['first_name']} {data['last_name']}")
    
    def test_user_stats(self):
        """Test user stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/users/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_xp_all_time" in data
        assert "highest_level_reached" in data
        assert "longest_streak_ever" in data
        assert "current_streak" in data
        print(f"User stats: XP={data['total_xp_all_time']}, Level={data['highest_level_reached']}")
    
    def test_mode_switch(self):
        """Test mode switching"""
        # Get current mode
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        current_mode = me_response.json()["app_mode"]
        
        # Switch mode
        response = requests.put(f"{BASE_URL}/api/users/mode", headers=self.headers)
        assert response.status_code == 200
        new_mode = response.json()["app_mode"]
        assert new_mode != current_mode
        
        # Switch back
        response2 = requests.put(f"{BASE_URL}/api/users/mode", headers=self.headers)
        assert response2.status_code == 200
        assert response2.json()["app_mode"] == current_mode
        print(f"Mode switch: {current_mode} -> {new_mode} -> {current_mode}")


class TestHabits:
    """Habit CRUD and completion tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_habit(self):
        """Test habit creation with XP values"""
        habit_data = {
            "habit_name": f"TEST_Habit_{uuid.uuid4().hex[:6]}",
            "description": "Test habit",
            "time_of_day": "morning",
            "difficulty": "medium",
            "repeat_schedule": "daily"
        }
        response = requests.post(f"{BASE_URL}/api/habits", json=habit_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["habit_name"] == habit_data["habit_name"]
        assert data["xp_value"] == 25  # Medium = 25 XP
        assert data["difficulty"] == "medium"
        print(f"Created habit: {data['habit_name']} (+{data['xp_value']} XP)")
        return data["habit_id"]
    
    def test_get_habits(self):
        """Test getting all habits"""
        response = requests.get(f"{BASE_URL}/api/habits", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total habits: {len(data)}")
    
    def test_get_todays_habits(self):
        """Test getting today's habits"""
        response = requests.get(f"{BASE_URL}/api/habits/today", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for habit in data:
            assert "completed_today" in habit
        print(f"Today's habits: {len(data)}")
    
    def test_habit_difficulty_xp_values(self):
        """Test XP values for different difficulties"""
        difficulties = [
            ("easy", 10),
            ("medium", 25),
            ("hard", 50)
        ]
        for difficulty, expected_xp in difficulties:
            habit_data = {
                "habit_name": f"TEST_{difficulty}_{uuid.uuid4().hex[:4]}",
                "time_of_day": "morning",
                "difficulty": difficulty,
                "repeat_schedule": "daily"
            }
            response = requests.post(f"{BASE_URL}/api/habits", json=habit_data, headers=self.headers)
            assert response.status_code == 200
            assert response.json()["xp_value"] == expected_xp
            print(f"{difficulty.capitalize()} habit: +{expected_xp} XP")
    
    def test_complete_and_uncomplete_habit(self):
        """Test habit completion and uncomplete"""
        # Create a habit
        habit_data = {
            "habit_name": f"TEST_Complete_{uuid.uuid4().hex[:6]}",
            "time_of_day": "afternoon",
            "difficulty": "easy",
            "repeat_schedule": "daily"
        }
        create_response = requests.post(f"{BASE_URL}/api/habits", json=habit_data, headers=self.headers)
        habit_id = create_response.json()["habit_id"]
        
        # Complete the habit
        complete_response = requests.post(f"{BASE_URL}/api/habits/{habit_id}/complete", headers=self.headers)
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        assert "xp_earned" in complete_data
        assert "gems_earned" in complete_data
        assert complete_data["xp_earned"] == 10  # Easy = 10 XP
        print(f"Completed habit: +{complete_data['xp_earned']} XP, +{complete_data['gems_earned']} gems")
        
        # Uncomplete the habit
        uncomplete_response = requests.post(f"{BASE_URL}/api/habits/{habit_id}/uncomplete", headers=self.headers)
        assert uncomplete_response.status_code == 200
        print("Habit uncompleted successfully")
        
        # Delete the habit
        delete_response = requests.delete(f"{BASE_URL}/api/habits/{habit_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print("Habit deleted successfully")
    
    def test_gem_earning_by_difficulty(self):
        """Test gem earning: easy=5, medium=10, hard=20"""
        # Create and complete a hard habit
        habit_data = {
            "habit_name": f"TEST_GemTest_{uuid.uuid4().hex[:6]}",
            "time_of_day": "night",
            "difficulty": "hard",
            "repeat_schedule": "daily"
        }
        create_response = requests.post(f"{BASE_URL}/api/habits", json=habit_data, headers=self.headers)
        habit_id = create_response.json()["habit_id"]
        
        complete_response = requests.post(f"{BASE_URL}/api/habits/{habit_id}/complete", headers=self.headers)
        assert complete_response.status_code == 200
        gems_earned = complete_response.json()["gems_earned"]
        assert gems_earned >= 20  # Hard = 20 gems (may have bonuses)
        print(f"Hard habit completed: +{gems_earned} gems (expected >= 20)")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/habits/{habit_id}/uncomplete", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/habits/{habit_id}", headers=self.headers)


class TestShopSystem:
    """Shop system tests - Streak Shield and 2x XP Boost"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
    
    def test_get_shop_items(self):
        """Test shop items endpoint"""
        response = requests.get(f"{BASE_URL}/api/game/shop", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "user_gems" in data
        assert len(data["items"]) == 2  # Streak Shield and 2x XP Boost
        
        # Verify Streak Shield
        shield = next((i for i in data["items"] if i["id"] == "streak_shield"), None)
        assert shield is not None
        assert shield["price"] == 100
        assert shield["max"] == 4
        
        # Verify 2x XP Boost
        boost = next((i for i in data["items"] if i["id"] == "xp_boost"), None)
        assert boost is not None
        assert boost["price"] == 150
        assert boost["max"] == 3
        
        print(f"Shop items: Streak Shield (100 gems, max 4), 2x XP Boost (150 gems, max 3)")
        print(f"User gems: {data['user_gems']}")
    
    def test_buy_streak_shield(self):
        """Test buying Streak Shield"""
        # Get current gems
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        current_gems = me_response.json().get("gems", 0)
        
        if current_gems < 100:
            pytest.skip(f"Not enough gems to test purchase (have {current_gems}, need 100)")
        
        # Get current shields
        shop_response = requests.get(f"{BASE_URL}/api/game/shop", headers=self.headers)
        shield_item = next((i for i in shop_response.json()["items"] if i["id"] == "streak_shield"), None)
        
        if shield_item["owned"] >= 4:
            pytest.skip("Already at max Streak Shields")
        
        # Buy shield
        buy_response = requests.post(f"{BASE_URL}/api/game/shop/buy/streak_shield", headers=self.headers)
        assert buy_response.status_code == 200
        data = buy_response.json()
        assert data["success"] == True
        assert data["gems_remaining"] == current_gems - 100
        print(f"Bought Streak Shield: {current_gems} -> {data['gems_remaining']} gems")
    
    def test_buy_xp_boost(self):
        """Test buying 2x XP Boost"""
        # Get current gems
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        current_gems = me_response.json().get("gems", 0)
        
        if current_gems < 150:
            pytest.skip(f"Not enough gems to test purchase (have {current_gems}, need 150)")
        
        # Get current boosts
        shop_response = requests.get(f"{BASE_URL}/api/game/shop", headers=self.headers)
        boost_item = next((i for i in shop_response.json()["items"] if i["id"] == "xp_boost"), None)
        
        if boost_item["owned"] >= 3:
            pytest.skip("Already at max XP Boosts")
        
        # Buy boost
        buy_response = requests.post(f"{BASE_URL}/api/game/shop/buy/xp_boost", headers=self.headers)
        assert buy_response.status_code == 200
        data = buy_response.json()
        assert data["success"] == True
        assert data["gems_remaining"] == current_gems - 150
        print(f"Bought 2x XP Boost: {current_gems} -> {data['gems_remaining']} gems")
    
    def test_not_enough_gems(self):
        """Test purchase with insufficient gems"""
        # Create a new user with only 50 gems
        unique_email = f"poor_{uuid.uuid4().hex[:8]}@habitrpg.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "first_name": "Poor",
            "last_name": "User",
            "email": unique_email,
            "password": "TestPass123!"
        })
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to buy Streak Shield (100 gems) with only 50
        buy_response = requests.post(f"{BASE_URL}/api/game/shop/buy/streak_shield", headers=headers)
        assert buy_response.status_code == 400
        assert "Not enough gems" in buy_response.json()["detail"]
        print("Not enough gems error correctly returned")


class TestGameStatus:
    """Game status and features tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_game_status(self):
        """Test game status endpoint"""
        response = requests.get(f"{BASE_URL}/api/game/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "gems" in data
        assert "streak_revives" in data
        assert "streak_shields" in data
        assert "xp_boost_uses" in data
        assert "current_streak" in data
        assert "level" in data
        assert "level_name" in data
        print(f"Game status: Level {data['level']} ({data['level_name']}), {data['gems']} gems")
    
    def test_level_rewards(self):
        """Test level rewards endpoint"""
        response = requests.get(f"{BASE_URL}/api/game/level-rewards", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10  # 10 levels
        # Check level 5 rewards
        level5 = next((l for l in data if l["level"] == 5), None)
        assert level5 is not None
        assert level5["gems"] == 100
        assert level5["streak_revives"] == 1
        print("Level rewards verified")
    
    def test_roast_endpoint(self):
        """Test roast endpoint"""
        response = requests.get(f"{BASE_URL}/api/game/roast?category=missed_habit", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "roast" in data
        if data["roast"]:
            print(f"Roast: {data['roast']}")
        else:
            print("No roast (user not in game mode or roasts disabled)")


class TestProgress:
    """Progress tracking tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_daily_progress(self):
        """Test daily progress endpoint"""
        response = requests.get(f"{BASE_URL}/api/progress/daily", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "total_habits" in data
        assert "completed_habits" in data
        assert "morning" in data
        assert "afternoon" in data
        assert "night" in data
        assert "xp_earned_today" in data
        print(f"Daily progress: {data['completed_habits']}/{data['total_habits']} habits, +{data['xp_earned_today']} XP")
    
    def test_weekly_progress(self):
        """Test weekly progress endpoint"""
        response = requests.get(f"{BASE_URL}/api/progress/weekly", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "daily_data" in data
        assert len(data["daily_data"]) == 7  # 7 days
        assert "total_xp" in data
        assert "completion_rate" in data
        assert "full_days" in data
        print(f"Weekly progress: {data['total_xp']} XP, {data['completion_rate']}% completion")


class TestTokenPersistence:
    """Token persistence and refresh tests"""
    
    def test_bearer_token_auth(self):
        """Test Bearer token authentication"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Use token in Authorization header
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == ADMIN_EMAIL
        print("Bearer token authentication working")
    
    def test_refresh_token(self):
        """Test token refresh"""
        # Login to get tokens
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        refresh_token = login_response.json().get("refresh_token")
        
        if not refresh_token:
            pytest.skip("No refresh token returned")
        
        # Refresh the token
        headers = {"Authorization": f"Bearer {refresh_token}"}
        refresh_response = requests.post(f"{BASE_URL}/api/auth/refresh", headers=headers)
        assert refresh_response.status_code == 200
        assert "access_token" in refresh_response.json()
        print("Token refresh working")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cleanup_test_habits(self):
        """Clean up TEST_ prefixed habits"""
        response = requests.get(f"{BASE_URL}/api/habits", headers=self.headers)
        habits = response.json()
        deleted = 0
        for habit in habits:
            if habit["habit_name"].startswith("TEST_"):
                del_response = requests.delete(f"{BASE_URL}/api/habits/{habit['habit_id']}", headers=self.headers)
                if del_response.status_code == 200:
                    deleted += 1
        print(f"Cleaned up {deleted} test habits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
