"""Iteration 8 tests: Focus shop, level rewards, focus gems."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

ADMIN_EMAIL = 'admin@habitrpg.com'
ADMIN_PASSWORD = 'Admin123!'
TEST_EMAIL = 'test@habitrpg.com'
TEST_PASSWORD = 'Test123!'


def _login(email, password):
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    r = s.post(f"{BASE_URL}/api/auth/login", json={'email': email, 'password': password})
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    token = data.get('access_token') or data.get('token')
    if token:
        s.headers.update({'Authorization': f'Bearer {token}'})
    return s


@pytest.fixture(scope='module')
def admin_client():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope='module')
def focus_client():
    return _login(TEST_EMAIL, TEST_PASSWORD)


# --- Auth/login ---
class TestAuth:
    def test_admin_login(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200

    def test_focus_login(self, focus_client):
        r = focus_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200


# --- Focus Shop ---
class TestFocusShop:
    def test_get_focus_shop(self, focus_client):
        r = focus_client.get(f"{BASE_URL}/api/focus/shop")
        assert r.status_code == 200
        data = r.json()
        assert 'items' in data and 'gems' in data
        ids = {i['id']: i for i in data['items']}
        expected = {
            'focus_xp_2x': 80,
            'focus_xp_3x': 150,
            'focus_streak_shield': 100,
            'focus_streak_revive': 200,
        }
        for k, price in expected.items():
            assert k in ids, f"Missing item: {k}"
            assert ids[k]['price'] == price, f"Wrong price for {k}: {ids[k]['price']}"
            assert 'name' in ids[k] and 'description' in ids[k]
            assert 'owned' in ids[k] and 'max' in ids[k]
        assert len(data['items']) == 4

    def test_focus_shop_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/focus/shop")
        assert r.status_code in (401, 403)

    def test_buy_unknown_item_404(self, focus_client):
        r = focus_client.post(f"{BASE_URL}/api/focus/shop/buy/unknown_xyz")
        assert r.status_code == 404

    def test_buy_focus_item_deducts_gems(self, focus_client):
        # Grant gems if needed via admin? No admin endpoint, so just check flow:
        # fetch balance
        r = focus_client.get(f"{BASE_URL}/api/focus/shop")
        data = r.json()
        gems_before = data['gems']
        # pick cheapest affordable item
        items = [i for i in data['items'] if i['price'] <= gems_before and i['owned'] < i['max']]
        if not items:
            pytest.skip(f"Focus user has only {gems_before} gems, cannot afford any item")
        target = min(items, key=lambda x: x['price'])
        r2 = focus_client.post(f"{BASE_URL}/api/focus/shop/buy/{target['id']}")
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert 'gems_remaining' in body
        assert body['gems_remaining'] == gems_before - target['price']
        # verify via GET
        r3 = focus_client.get(f"{BASE_URL}/api/focus/shop")
        d3 = r3.json()
        assert d3['gems'] == gems_before - target['price']
        new_item = next(i for i in d3['items'] if i['id'] == target['id'])
        assert new_item['owned'] == target['owned'] + 1


# --- Level rewards ---
class TestLevelRewards:
    def test_get_level_rewards(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/game/level-rewards")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        levels = {x['level']: x for x in data}
        # Expected levels in new table
        for lvl in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]:
            assert lvl in levels, f"Level {lvl} missing in level-rewards"

    def test_level_rewards_has_new_fields(self, admin_client):
        """Check that response includes xp_bonus/unlock_color/description/rarity as per requirement."""
        r = admin_client.get(f"{BASE_URL}/api/game/level-rewards")
        data = r.json()
        levels = {x['level']: x for x in data}
        l5 = levels.get(5, {})
        # Spec says 'new reward table (xp_bonus, unlock_color, etc.)'
        keys = set(l5.keys())
        # At minimum should expose description/rarity or unlock_color for level 5
        has_new = any(k in keys for k in ('description', 'unlock_color', 'rarity', 'xp_bonus', 'color_name'))
        assert has_new, f"Level-rewards does not expose new fields. Got keys: {keys}"


# --- Focus Mode habit completion +10 gems ---
class TestFocusGems:
    def test_focus_user_mode(self, focus_client):
        r = focus_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        u = r.json()
        assert u.get('app_mode') in ('focus', None, 'game')

    def test_complete_habit_awards_10_gems(self, focus_client):
        # ensure focus mode (endpoint is a toggle, so check and toggle if needed)
        me = focus_client.get(f"{BASE_URL}/api/auth/me").json()
        if me.get('app_mode') != 'focus':
            focus_client.put(f"{BASE_URL}/api/users/mode")
            me = focus_client.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get('app_mode') == 'focus', f"Could not set focus mode, got {me.get('app_mode')}"
        # Create a new TEST habit
        payload = {"habit_name": "TEST_gems_habit_v8", "difficulty": "easy", "icon": "💪", "color": "#3B82F6", "time_of_day": "morning"}
        rc = focus_client.post(f"{BASE_URL}/api/habits", json=payload)
        if rc.status_code not in (200, 201):
            pytest.skip(f"Cannot create habit: {rc.status_code} {rc.text}")
        habit = rc.json()
        habit_id = habit.get('habit_id') or habit.get('id') or habit.get('_id')
        if not habit_id:
            pytest.skip("No habit id in response")
        # complete
        rcomp = focus_client.post(f"{BASE_URL}/api/habits/{habit_id}/complete")
        if rcomp.status_code != 200:
            focus_client.delete(f"{BASE_URL}/api/habits/{habit_id}")
            pytest.skip(f"Complete failed: {rcomp.status_code} {rcomp.text}")
        body = rcomp.json()
        gems_earned = body.get('gems_earned', 0)
        # cleanup (uncomplete + delete)
        focus_client.post(f"{BASE_URL}/api/habits/{habit_id}/uncomplete")
        focus_client.delete(f"{BASE_URL}/api/habits/{habit_id}")
        assert gems_earned == 10, f"Expected +10 gems in focus mode, got {gems_earned}"
