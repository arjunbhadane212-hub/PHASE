"""Backend tests for new Decoration profile-items feature (iteration 10)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://habit-rpg-21.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@habitrpg.com"
ADMIN_PASS = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# --- Shop profile-items endpoint ---
class TestShopProfileItems:
    def test_returns_decorations_array(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/shop/profile-items", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ("icons", "animations", "banners", "decorations"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["decorations"], list)

    def test_50_decorations_at_3000_gems(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/shop/profile-items", headers=admin_headers, timeout=15)
        decos = r.json()["decorations"]
        assert len(decos) == 50, f"expected 50 decorations, got {len(decos)}"
        for d in decos:
            assert d["price"] == 3000, f"{d['key']} price={d['price']}"
            assert "key" in d and "name" in d and "css" in d
            assert d["css"].startswith("deco-")
            assert "owned" in d

    def test_known_keys_present(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/shop/profile-items", headers=admin_headers, timeout=15)
        keys = {d["key"] for d in r.json()["decorations"]}
        for expected in ("deco_flame_ring", "deco_frost_ring", "deco_supernova_burst", "deco_galaxy_spiral"):
            assert expected in keys, f"missing {expected}"


# --- Buy endpoint ---
class TestBuyDecoration:
    def test_buy_invalid_key_returns_404(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/shop/buy-profile-item", headers=admin_headers,
                          json={"type": "decoration", "key": "deco_does_not_exist"}, timeout=15)
        assert r.status_code == 404

    def test_buy_with_insufficient_gems_returns_400(self, admin_headers):
        # Admin has ~52 gems per context, decoration costs 3000
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        gems = me.get("gems", 0)
        # If admin not already owning the item and gems < 3000 -> 400 not enough gems
        if "deco_flame_ring" in me.get("unlocked_decorations", []):
            pytest.skip("Already owns deco_flame_ring; cannot test insufficient-gems path here")
        if gems >= 3000:
            pytest.skip(f"Admin has {gems} gems (>=3000); cannot test insufficient-gems path")
        r = requests.post(f"{BASE_URL}/api/shop/buy-profile-item", headers=admin_headers,
                          json={"type": "decoration", "key": "deco_flame_ring"}, timeout=15)
        assert r.status_code == 400
        assert "gems" in r.text.lower() or "enough" in r.text.lower()

    def test_invalid_type_returns_400(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/shop/buy-profile-item", headers=admin_headers,
                          json={"type": "garbage", "key": "x"}, timeout=15)
        assert r.status_code == 400


# --- Equip endpoint ---
class TestEquipDecoration:
    def test_equip_unowned_decoration_returns_400(self, admin_headers):
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        target = "deco_flame_ring"
        if target in me.get("unlocked_decorations", []):
            pytest.skip("Already owns the decoration; cannot test 'not owned' path")
        r = requests.put(f"{BASE_URL}/api/profile/me/equip", headers=admin_headers,
                         json={"type": "decoration", "key": target}, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "not owned" in r.text.lower() or "decoration" in r.text.lower()

    def test_equip_null_decoration_succeeds(self, admin_headers):
        # Unequipping (key=null) should always work
        r = requests.put(f"{BASE_URL}/api/profile/me/equip", headers=admin_headers,
                         json={"type": "decoration", "key": None}, timeout=15)
        assert r.status_code == 200, f"got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("key") is None
        # Verify persisted via /auth/me
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        assert me.get("equipped_decoration") in (None, "")

    def test_equip_owned_decoration_persists(self, admin_headers):
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        owned = me.get("unlocked_decorations") or []
        if not owned:
            pytest.skip("Admin owns no decoration; skipping happy-path persist test")
        key = owned[0]
        r = requests.put(f"{BASE_URL}/api/profile/me/equip", headers=admin_headers,
                         json={"type": "decoration", "key": key}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("key") == key
        me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        assert me2.get("equipped_decoration") == key


# --- Public profile / regression ---
class TestPublicProfileExposesDecoration:
    def test_public_profile_includes_equipped_decoration(self, admin_headers):
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15).json()
        username = me.get("username")
        assert username, "admin missing username"
        r = requests.get(f"{BASE_URL}/api/profile/{username}", timeout=15)
        assert r.status_code == 200, f"public profile failed: {r.status_code} {r.text}"
        data = r.json()
        # Field MUST be present in response (value can be None or a dict)
        assert "equipped_decoration" in data, "public profile missing equipped_decoration field"
        if data["equipped_decoration"] is not None:
            assert "css" in data["equipped_decoration"]
            assert data["equipped_decoration"]["css"].startswith("deco-")


# --- Regression: existing tabs still work ---
class TestRegressionExistingShopTabs:
    def test_icons_animations_banners_present(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/shop/profile-items", headers=admin_headers, timeout=15)
        d = r.json()
        assert len(d["icons"]) > 0
        assert len(d["animations"]) > 0
        assert len(d["banners"]) > 0

    def test_login_focus_user_still_works(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "test@habitrpg.com", "password": "Test123!"}, timeout=15)
        assert r.status_code == 200
        assert (r.json().get("token") or r.json().get("access_token"))
