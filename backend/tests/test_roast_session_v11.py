"""
Iteration 11 — Roast Notification System + Focus Session Abandon backend tests.
Endpoints covered:
  POST /api/session/abandon
  GET  /api/roasts/check
  PUT  /api/users/notification-settings (toggle roast_enabled)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://habit-rpg-21.preview.emergentagent.com").rstrip("/")

FOCUS_CREDS = {"email": "test@habitrpg.com", "password": "Test123!"}
GAME_CREDS = {"email": "admin@habitrpg.com", "password": "Admin123!"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def focus_token():
    return _login(FOCUS_CREDS)


@pytest.fixture(scope="module")
def game_token():
    return _login(GAME_CREDS)


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- /api/session/abandon ----------
class TestSessionAbandon:
    def test_abandon_deducts_gems_and_returns_roast(self, focus_token):
        # snapshot gems
        me_before = requests.get(f"{BASE_URL}/api/auth/me", headers=_hdr(focus_token)).json()
        gems_before = me_before.get("gems", 0)
        shields_before = me_before.get("streak_shields", 0)

        r = requests.post(
            f"{BASE_URL}/api/session/abandon",
            json={"mins_elapsed": 7},
            headers=_hdr(focus_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "gems_deducted" in data
        assert "roast" in data
        assert isinstance(data["roast"], str) and len(data["roast"]) > 0
        expected_ded = min(30, gems_before)
        assert data["gems_deducted"] == expected_ded, f"expected {expected_ded} got {data['gems_deducted']}"

        # verify persistence via /auth/me
        me_after = requests.get(f"{BASE_URL}/api/auth/me", headers=_hdr(focus_token)).json()
        assert me_after.get("gems", 0) == gems_before - expected_ded
        if shields_before > 0:
            assert me_after.get("streak_shields", 0) == shields_before - 1
        else:
            assert me_after.get("streak_shields", 0) == 0

    def test_abandon_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/session/abandon", json={"mins_elapsed": 1}, timeout=15)
        assert r.status_code in (401, 403)


# ---------- /api/roasts/check ----------
class TestRoastsCheck:
    def test_returns_empty_when_disabled(self, focus_token):
        # Disable roasts
        r = requests.put(
            f"{BASE_URL}/api/users/notification-settings",
            json={"push_enabled": True, "reminders_enabled": True, "roast_enabled": False},
            headers=_hdr(focus_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text

        r2 = requests.get(f"{BASE_URL}/api/roasts/check", headers=_hdr(focus_token), timeout=15)
        assert r2.status_code == 200
        body = r2.json()
        assert "roasts" in body
        assert body["roasts"] == []

    def test_returns_list_when_enabled(self, focus_token):
        # Re-enable
        r = requests.put(
            f"{BASE_URL}/api/users/notification-settings",
            json={"push_enabled": True, "reminders_enabled": True, "roast_enabled": True},
            headers=_hdr(focus_token),
            timeout=15,
        )
        assert r.status_code == 200

        r2 = requests.get(f"{BASE_URL}/api/roasts/check", headers=_hdr(focus_token), timeout=15)
        assert r2.status_code == 200
        body = r2.json()
        assert "roasts" in body and isinstance(body["roasts"], list)
        # Don't assert content — depends on hour/streak.

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/roasts/check", timeout=15)
        assert r.status_code in (401, 403)


# ---------- notification-settings persistence ----------
class TestNotificationSettings:
    def test_toggle_roast_enabled_persists(self, game_token):
        # toggle off
        r1 = requests.put(
            f"{BASE_URL}/api/users/notification-settings",
            json={"push_enabled": True, "reminders_enabled": True, "roast_enabled": False},
            headers=_hdr(game_token),
            timeout=15,
        )
        assert r1.status_code == 200
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=_hdr(game_token)).json()
        assert me.get("notification_settings", {}).get("roast_enabled") is False

        # toggle on
        r2 = requests.put(
            f"{BASE_URL}/api/users/notification-settings",
            json={"push_enabled": True, "reminders_enabled": True, "roast_enabled": True},
            headers=_hdr(game_token),
            timeout=15,
        )
        assert r2.status_code == 200
        me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=_hdr(game_token)).json()
        assert me2.get("notification_settings", {}).get("roast_enabled") is True


# ---------- Regression smoke ----------
class TestRegressionSmoke:
    def test_login_focus(self):
        tok = _login(FOCUS_CREDS)
        assert isinstance(tok, str) and len(tok) > 10

    def test_login_game(self):
        tok = _login(GAME_CREDS)
        assert isinstance(tok, str) and len(tok) > 10

    def test_habits_endpoint(self, focus_token):
        r = requests.get(f"{BASE_URL}/api/habits", headers=_hdr(focus_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_shop_focus(self, focus_token):
        r = requests.get(f"{BASE_URL}/api/focus/shop", headers=_hdr(focus_token), timeout=15)
        assert r.status_code == 200

    def test_shop_game(self, game_token):
        r = requests.get(f"{BASE_URL}/api/shop/profile-items", headers=_hdr(game_token), timeout=15)
        assert r.status_code == 200
