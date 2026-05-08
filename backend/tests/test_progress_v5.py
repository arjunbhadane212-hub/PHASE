"""Backend tests for V5 Progress Section & Light Mode.
Tests: login, /api/progress/daily, /api/progress/weekly, /api/progress/monthly
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://habit-rpg-21.preview.emergentagent.com').rstrip('/')
API = BASE_URL + '/api'

ADMIN = {"email": "admin@habitrpg.com", "password": "Admin123!"}
USER = {"email": "test@habitrpg.com", "password": "Test123!"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {login(ADMIN)}"}


@pytest.fixture(scope="module")
def user_headers():
    return {"Authorization": f"Bearer {login(USER)}"}


# ---- Auth ----
class TestAuth:
    def test_admin_login(self):
        login(ADMIN)

    def test_user_login(self):
        login(USER)


# ---- Progress Daily ----
class TestProgressDaily:
    def test_daily_admin(self, admin_headers):
        r = requests.get(f"{API}/progress/daily", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # gems_earned_today must exist per V5
        assert "gems_earned_today" in d, f"missing gems_earned_today: {d.keys()}"
        assert "completed_habits" in d
        assert "total_habits" in d
        assert isinstance(d["gems_earned_today"], (int, float))

    def test_daily_user(self, user_headers):
        r = requests.get(f"{API}/progress/daily", headers=user_headers, timeout=15)
        assert r.status_code == 200
        assert "gems_earned_today" in r.json()


# ---- Progress Weekly ----
class TestProgressWeekly:
    def test_weekly_admin(self, admin_headers):
        r = requests.get(f"{API}/progress/weekly", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total_gems" in d, f"missing total_gems: {d.keys()}"
        assert "total_tasks" in d, f"missing total_tasks: {d.keys()}"
        assert isinstance(d["total_gems"], (int, float))
        assert isinstance(d["total_tasks"], (int, float))

    def test_weekly_user(self, user_headers):
        r = requests.get(f"{API}/progress/weekly", headers=user_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total_gems" in d
        assert "total_tasks" in d


# ---- Progress Monthly (new in V5) ----
class TestProgressMonthly:
    def test_monthly_admin(self, admin_headers):
        r = requests.get(f"{API}/progress/monthly", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"status {r.status_code}: {r.text}"
        d = r.json()
        assert "total_gems" in d, f"missing total_gems: {d.keys()}"
        assert "total_tasks" in d, f"missing total_tasks: {d.keys()}"

    def test_monthly_user(self, user_headers):
        r = requests.get(f"{API}/progress/monthly", headers=user_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total_gems" in d
        assert "total_tasks" in d

    def test_monthly_unauth(self):
        r = requests.get(f"{API}/progress/monthly", timeout=15)
        assert r.status_code in (401, 403)
