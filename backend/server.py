from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Body
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI()

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth")
habits_router = APIRouter(prefix="/habits")
users_router = APIRouter(prefix="/users")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v):
        if not v.replace(' ', '').isalpha():
            raise ValueError('Name must contain only letters')
        return v.strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OnboardingData(BaseModel):
    main_goal: Optional[str] = None
    download_reason: Optional[str] = None
    download_reason_other: Optional[str] = None
    consistency_level: Optional[str] = None
    accountability_style: Optional[str] = None
    app_mode: Optional[str] = None

class HabitCreate(BaseModel):
    habit_name: str
    description: Optional[str] = ""
    time_of_day: str  # morning, afternoon, night
    difficulty: str  # easy, medium, hard
    repeat_schedule: str = "daily"  # daily, weekdays, weekends
    custom_days: Optional[List[str]] = None
    session_duration: Optional[int] = 15  # minutes for Focus Mode timer

class HabitUpdate(BaseModel):
    habit_name: Optional[str] = None
    description: Optional[str] = None
    time_of_day: Optional[str] = None
    difficulty: Optional[str] = None
    repeat_schedule: Optional[str] = None
    custom_days: Optional[List[str]] = None
    session_duration: Optional[int] = None

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class NotificationSettings(BaseModel):
    push_enabled: bool = True
    reminders_enabled: bool = True
    roast_enabled: bool = True

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_xp_for_difficulty(difficulty: str) -> int:
    return {"easy": 10, "medium": 25, "hard": 50}.get(difficulty, 10)

def get_level_info(xp: int) -> dict:
    levels = [
        {"level": 1, "name": "Rookie", "min_xp": 0, "max_xp": 100},
        {"level": 2, "name": "Apprentice", "min_xp": 101, "max_xp": 250},
        {"level": 3, "name": "Contender", "min_xp": 251, "max_xp": 500},
        {"level": 4, "name": "Achiever", "min_xp": 501, "max_xp": 900},
        {"level": 5, "name": "Warrior", "min_xp": 901, "max_xp": 1400},
        {"level": 6, "name": "Champion", "min_xp": 1401, "max_xp": 2100},
        {"level": 7, "name": "Elite", "min_xp": 2101, "max_xp": 3000},
        {"level": 8, "name": "Master", "min_xp": 3001, "max_xp": 4200},
        {"level": 9, "name": "Legend", "min_xp": 4201, "max_xp": 6000},
        {"level": 10, "name": "Apex", "min_xp": 6001, "max_xp": 999999},
    ]
    for level in levels:
        if level["min_xp"] <= xp <= level["max_xp"]:
            return level
    return levels[-1]

# Level rewards - gems, streak revives, badges
LEVEL_REWARDS = {
    1: {"gems": 0, "streak_revives": 0, "badge": None, "xp_bonus": 50, "description": "+50 XP Bonus", "rarity": "common"},
    2: {"gems": 0, "streak_revives": 0, "badge": None, "xp_bonus": 100, "description": "+100 XP Bonus", "rarity": "common"},
    3: {"gems": 0, "streak_revives": 0, "badge": None, "xp_boost_24h": 1.5, "description": "x1.5 XP Boost (24h)", "rarity": "rare"},
    4: {"gems": 50, "streak_revives": 0, "badge": None, "description": "50 Gems", "rarity": "common"},
    5: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_color": "#E94560", "color_name": "Crimson", "description": "Rare Color: Crimson", "rarity": "rare"},
    6: {"gems": 0, "streak_revives": 0, "badge": None, "xp_boost_48h": 2, "description": "x2 XP Boost (48h)", "rarity": "rare"},
    7: {"gems": 150, "streak_revives": 0, "badge": None, "description": "150 Gems", "rarity": "common"},
    8: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_color": "#7B2FBE", "color_name": "Void Purple", "description": "Legendary Color: Void Purple", "rarity": "legendary"},
    9: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_shield": True, "description": "Streak Shield (1-use)", "rarity": "rare"},
    10: {"gems": 0, "streak_revives": 0, "badge": "apex_predator", "unlock_banner": "banner_aurora_reward", "description": "Legendary Animated Banner: Aurora", "rarity": "legendary"},
    12: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_color": "#00D4AA", "color_name": "Teal Elite", "description": "Rare Color: Teal Elite", "rarity": "rare"},
    15: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_animation": "anim_golden_aura", "description": "Legendary Icon Frame (Gold Ring)", "rarity": "legendary"},
    20: {"gems": 0, "streak_revives": 0, "badge": None, "unlock_color": "#F5A623", "color_name": "Obsidian Gold", "unlock_animation": "anim_supernova", "description": "Legendary Color: Obsidian Gold + Confetti Effect", "rarity": "legendary"},
}

# Roast messages for different scenarios
ROAST_MESSAGES = {
    "missed_habit": [
        "Your future self just raised an eyebrow.",
        "Hmm... one slipped through today.",
        "Not every day is perfect. Tomorrow's a reset.",
        "The grind paused. The grind waits.",
        "Small slip. Big picture's still intact.",
    ],
    "streak_broken": [
        "Streak reset. Fresh start energy.",
        "The counter hit zero. Comeback loading...",
        "Gone but not forgotten. Time to rebuild.",
        "Clean slate. What you do next matters more.",
    ],
    "behind_schedule": [
        "Day's half gone — still time to make it count.",
        "Running behind. Nothing a quick session can't fix.",
        "The clock's ticking. Your habits aren't going anywhere.",
    ],
    "level_taunt": [
        "Level {level}. Room to grow. Always.",
        "Not bad. But you've got more in you.",
        "Steady climb. Keep the momentum.",
    ],
    "comeback": [
        "Welcome back. Let's pick up where we left off.",
        "The return arc begins now.",
        "Back in action. Habits are waiting.",
    ]
}

import random
import string

def generate_username(first_name: str) -> str:
    """Generate a unique username like Admin4283"""
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"{first_name}{suffix}"

# Color palettes
MAIN_COLORS = {
    "#E11D48": {"name": "Vibrant Rose", "rarity": "legendary", "price": 600},
    "#BE123C": {"name": "Deep Crimson", "rarity": "legendary", "price": 600},
    "#F97316": {"name": "Orange", "rarity": "rare", "price": 300},
    "#F59E0B": {"name": "Amber", "rarity": "rare", "price": 300},
    "#3B82F6": {"name": "Vibrant Blue", "rarity": "common", "price": 150},
    "#06B6D4": {"name": "Cyan", "rarity": "rare", "price": 300},
    "#14B8A6": {"name": "Teal", "rarity": "common", "price": 150},
    "#10B981": {"name": "Emerald", "rarity": "common", "price": 150},
    "#059669": {"name": "Green", "rarity": "rare", "price": 300},
    "#65A30D": {"name": "Lime", "rarity": "rare", "price": 300},
}

BANNER_COLORS = {
    "#EA580C": {"name": "Deep Orange", "rarity": "rare", "price": 300},
    "#8B5CF6": {"name": "Vibe Purple", "rarity": "legendary", "price": 600},
    "#7C3AED": {"name": "Deep Violet", "rarity": "legendary", "price": 600},
    "#9333EA": {"name": "Rich Purple", "rarity": "legendary", "price": 600},
    "#D946EF": {"name": "Magenta", "rarity": "legendary", "price": 600},
    "#F43F5E": {"name": "Vibrant Rose", "rarity": "legendary", "price": 600},
    "#0EA5E9": {"name": "Sky Blue", "rarity": "rare", "price": 300},
    "#6366F1": {"name": "Indigo", "rarity": "rare", "price": 300},
    "#64748B": {"name": "Vibe Slate", "rarity": "common", "price": 150},
    "#B45309": {"name": "Vibe Amber", "rarity": "rare", "price": 300},
}

# Shop rarity system
SHOP_POWER_UPS = {
    "xp_boost_2x": {"name": "2x XP Boost", "description": "Next 3 habits award 2x XP", "price": 80, "rarity": "common", "field": "xp_boost_uses", "max": 3, "icon": "zap"},
    "streak_shield": {"name": "Streak Shield", "description": "Protects your streak for up to 2 missed days", "price": 200, "rarity": "rare", "field": "streak_shields", "max": 4, "icon": "shield"},
    "xp_boost_3x": {"name": "3x XP Boost", "description": "Next 3 habits award 3x XP", "price": 300, "rarity": "legendary", "field": "xp_triple_boost_uses", "max": 3, "icon": "zap"},
    "xp_boost_4x": {"name": "4x XP Boost", "description": "Next 3 habits award 4x XP", "price": 500, "rarity": "legendary", "field": "xp_quad_boost_uses", "max": 3, "icon": "zap"},
    "xp_boost_5x": {"name": "5x XP Boost", "description": "Next 3 habits award 5x XP. Shop exclusive!", "price": 800, "rarity": "legendary", "field": "xp_penta_boost_uses", "max": 2, "icon": "zap"},
    "xp_boost_6x": {"name": "6x XP Boost", "description": "Next 3 habits award 6x XP. Ultra rare!", "price": 1200, "rarity": "legendary", "field": "xp_hexa_boost_uses", "max": 1, "icon": "zap"},
}

# Streak Titles - earned by maintaining streaks
STREAK_TITLES = [
    {"days": 10, "title": "Rookie", "rarity": "common"},
    {"days": 25, "title": "Contender", "rarity": "common"},
    {"days": 50, "title": "Cooking", "rarity": "rare"},
    {"days": 75, "title": "Burning", "rarity": "rare"},
    {"days": 100, "title": "Locked", "rarity": "rare"},
    {"days": 150, "title": "Aflame", "rarity": "epic"},
    {"days": 200, "title": "Agony", "rarity": "epic"},
    {"days": 250, "title": "Blaze", "rarity": "epic"},
    {"days": 300, "title": "Interlocked", "rarity": "legendary"},
    {"days": 350, "title": "Incinerate", "rarity": "legendary"},
    {"days": 400, "title": "Infernal", "rarity": "legendary"},
    {"days": 450, "title": "Ethereal", "rarity": "mythic"},
    {"days": 500, "title": "Unreal", "rarity": "mythic"},
    {"days": 1000, "title": "The Sovereign Overlord", "rarity": "mythic"},
]

# Time Titles - earned by total hours tracked
TIME_TITLES = [
    {"hours": 25, "title": "Timekeeper", "rarity": "common"},
    {"hours": 50, "title": "Chronos", "rarity": "common"},
    {"hours": 100, "title": "Temporal Drift", "rarity": "rare"},
    {"hours": 200, "title": "Timeless", "rarity": "rare"},
    {"hours": 350, "title": "Era Weaver", "rarity": "epic"},
    {"hours": 500, "title": "Void Walker", "rarity": "epic"},
    {"hours": 750, "title": "Lord of Time", "rarity": "legendary"},
    {"hours": 900, "title": "Chrono-Archon", "rarity": "legendary"},
    {"hours": 1000, "title": "Eternity's Edge", "rarity": "mythic"},
]

# Shop profile icons (purchasable)
SHOP_ICONS = {
    "icon_flame": {"name": "Flame Emblem", "rarity": "common", "price": 100, "emoji": "flame"},
    "icon_star": {"name": "Star Core", "rarity": "common", "price": 100, "emoji": "star"},
    "icon_diamond": {"name": "Diamond Soul", "rarity": "rare", "price": 250, "emoji": "diamond"},
    "icon_crown": {"name": "Crown Royal", "rarity": "rare", "price": 250, "emoji": "crown"},
    "icon_lightning": {"name": "Thunder Strike", "rarity": "rare", "price": 300, "emoji": "lightning"},
    "icon_skull": {"name": "Shadow Skull", "rarity": "legendary", "price": 500, "emoji": "skull"},
    "icon_dragon": {"name": "Dragon Eye", "rarity": "legendary", "price": 600, "emoji": "dragon"},
    "icon_phoenix": {"name": "Phoenix Rise", "rarity": "legendary", "price": 700, "emoji": "phoenix"},
    "icon_void": {"name": "Void Emblem", "rarity": "mythic", "price": 1000, "emoji": "void"},
}

# Shop profile animations (purchasable, 30 animations)
SHOP_ANIMATIONS = {
    "anim_pulse": {"name": "Pulse", "rarity": "common", "price": 150, "css": "profile-anim-pulse"},
    "anim_glow": {"name": "Glow", "rarity": "common", "price": 150, "css": "profile-anim-glow"},
    "anim_breathe": {"name": "Breathe", "rarity": "common", "price": 150, "css": "profile-anim-breathe"},
    "anim_float": {"name": "Float", "rarity": "common", "price": 150, "css": "profile-anim-float"},
    "anim_shimmer": {"name": "Shimmer", "rarity": "common", "price": 200, "css": "profile-anim-shimmer"},
    "anim_sparkle": {"name": "Sparkle", "rarity": "common", "price": 200, "css": "profile-anim-sparkle"},
    "anim_rotate_slow": {"name": "Orbit", "rarity": "common", "price": 200, "css": "profile-anim-orbit"},
    "anim_wave": {"name": "Wave", "rarity": "common", "price": 200, "css": "profile-anim-wave"},
    "anim_bounce": {"name": "Bounce", "rarity": "common", "price": 200, "css": "profile-anim-bounce"},
    "anim_fade_pulse": {"name": "Fade Pulse", "rarity": "common", "price": 200, "css": "profile-anim-fadepulse"},
    "anim_neon": {"name": "Neon Ring", "rarity": "rare", "price": 350, "css": "profile-anim-neon"},
    "anim_aurora": {"name": "Aurora", "rarity": "rare", "price": 350, "css": "profile-anim-aurora"},
    "anim_fire_ring": {"name": "Fire Ring", "rarity": "rare", "price": 400, "css": "profile-anim-firering"},
    "anim_ice_ring": {"name": "Ice Ring", "rarity": "rare", "price": 400, "css": "profile-anim-icering"},
    "anim_electric": {"name": "Electric", "rarity": "rare", "price": 400, "css": "profile-anim-electric"},
    "anim_rainbow": {"name": "Rainbow", "rarity": "rare", "price": 450, "css": "profile-anim-rainbow"},
    "anim_galaxy": {"name": "Galaxy Spin", "rarity": "rare", "price": 450, "css": "profile-anim-galaxy"},
    "anim_ripple": {"name": "Ripple", "rarity": "rare", "price": 400, "css": "profile-anim-ripple"},
    "anim_vortex": {"name": "Vortex", "rarity": "rare", "price": 450, "css": "profile-anim-vortex"},
    "anim_matrix": {"name": "Matrix Rain", "rarity": "rare", "price": 400, "css": "profile-anim-matrix"},
    "anim_plasma": {"name": "Plasma", "rarity": "legendary", "price": 700, "css": "profile-anim-plasma"},
    "anim_shadow_flame": {"name": "Shadow Flame", "rarity": "legendary", "price": 700, "css": "profile-anim-shadowflame"},
    "anim_lightning_storm": {"name": "Lightning Storm", "rarity": "legendary", "price": 800, "css": "profile-anim-lightning"},
    "anim_cosmic": {"name": "Cosmic", "rarity": "legendary", "price": 800, "css": "profile-anim-cosmic"},
    "anim_golden_aura": {"name": "Golden Aura", "rarity": "legendary", "price": 900, "css": "profile-anim-goldenaura"},
    "anim_void_pulse": {"name": "Void Pulse", "rarity": "legendary", "price": 900, "css": "profile-anim-voidpulse"},
    "anim_supernova": {"name": "Supernova", "rarity": "mythic", "price": 1200, "css": "profile-anim-supernova"},
    "anim_ethereal": {"name": "Ethereal Glow", "rarity": "mythic", "price": 1200, "css": "profile-anim-ethereal"},
    "anim_inferno": {"name": "Inferno", "rarity": "mythic", "price": 1500, "css": "profile-anim-inferno"},
    "anim_divine": {"name": "Divine Light", "rarity": "mythic", "price": 2000, "css": "profile-anim-divine"},
}

# Shop exclusive banners
SHOP_BANNERS = {
    "banner_midnight": {"name": "Midnight", "rarity": "rare", "price": 300, "gradient": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)"},
    "banner_sunset": {"name": "Sunset Blaze", "rarity": "rare", "price": 300, "gradient": "linear-gradient(135deg, #f12711, #f5af19)"},
    "banner_ocean": {"name": "Deep Ocean", "rarity": "rare", "price": 300, "gradient": "linear-gradient(135deg, #2193b0, #6dd5ed)"},
    "banner_forest": {"name": "Enchanted Forest", "rarity": "rare", "price": 350, "gradient": "linear-gradient(135deg, #0f9b0f, #000000)"},
    "banner_aurora_b": {"name": "Northern Lights", "rarity": "legendary", "price": 600, "gradient": "linear-gradient(135deg, #43cea2, #185a9d)"},
    "banner_crimson": {"name": "Crimson Tide", "rarity": "legendary", "price": 600, "gradient": "linear-gradient(135deg, #CB356B, #BD3F32)"},
    "banner_galaxy": {"name": "Galaxy", "rarity": "legendary", "price": 800, "gradient": "linear-gradient(135deg, #0f0c29, #6a0dad, #ff6ec7)"},
    "banner_void": {"name": "Void Walker", "rarity": "mythic", "price": 1500, "gradient": "linear-gradient(135deg, #000000, #1a0033, #000000)"},
}

# Avatar Decorations — Discord-style animated picture frames (3000 gems each)
SHOP_DECORATIONS = {
    "deco_flame_ring": {"name": "Flame Ring", "css": "deco-flame-ring", "price": 3000},
    "deco_frost_ring": {"name": "Frost Ring", "css": "deco-frost-ring", "price": 3000},
    "deco_lightning_arc": {"name": "Lightning Arc", "css": "deco-lightning-arc", "price": 3000},
    "deco_galaxy_spiral": {"name": "Galaxy Spiral", "css": "deco-galaxy-spiral", "price": 3000},
    "deco_void_portal": {"name": "Void Portal", "css": "deco-void-portal", "price": 3000},
    "deco_golden_wreath": {"name": "Golden Wreath", "css": "deco-golden-wreath", "price": 3000},
    "deco_neon_pulse": {"name": "Neon Pulse", "css": "deco-neon-pulse", "price": 3000},
    "deco_sakura_petals": {"name": "Sakura Petals", "css": "deco-sakura-petals", "price": 3000},
    "deco_electric_storm": {"name": "Electric Storm", "css": "deco-electric-storm", "price": 3000},
    "deco_shadow_tendrils": {"name": "Shadow Tendrils", "css": "deco-shadow-tendrils", "price": 3000},
    "deco_aurora_wave": {"name": "Aurora Wave", "css": "deco-aurora-wave", "price": 3000},
    "deco_crimson_blaze": {"name": "Crimson Blaze", "css": "deco-crimson-blaze", "price": 3000},
    "deco_emerald_glow": {"name": "Emerald Glow", "css": "deco-emerald-glow", "price": 3000},
    "deco_royal_crest": {"name": "Royal Crest", "css": "deco-royal-crest", "price": 3000},
    "deco_plasma_orbit": {"name": "Plasma Orbit", "css": "deco-plasma-orbit", "price": 3000},
    "deco_cyber_grid": {"name": "Cyber Grid", "css": "deco-cyber-grid", "price": 3000},
    "deco_diamond_dust": {"name": "Diamond Dust", "css": "deco-diamond-dust", "price": 3000},
    "deco_phoenix_wings": {"name": "Phoenix Wings", "css": "deco-phoenix-wings", "price": 3000},
    "deco_dragon_breath": {"name": "Dragon Breath", "css": "deco-dragon-breath", "price": 3000},
    "deco_spirit_chains": {"name": "Spirit Chains", "css": "deco-spirit-chains", "price": 3000},
    "deco_nebula_ring": {"name": "Nebula Ring", "css": "deco-nebula-ring", "price": 3000},
    "deco_solar_flare": {"name": "Solar Flare", "css": "deco-solar-flare", "price": 3000},
    "deco_lunar_halo": {"name": "Lunar Halo", "css": "deco-lunar-halo", "price": 3000},
    "deco_toxic_mist": {"name": "Toxic Mist", "css": "deco-toxic-mist", "price": 3000},
    "deco_blood_moon": {"name": "Blood Moon", "css": "deco-blood-moon", "price": 3000},
    "deco_star_burst": {"name": "Star Burst", "css": "deco-star-burst", "price": 3000},
    "deco_mystic_runes": {"name": "Mystic Runes", "css": "deco-mystic-runes", "price": 3000},
    "deco_aqua_surge": {"name": "Aqua Surge", "css": "deco-aqua-surge", "price": 3000},
    "deco_dark_matter": {"name": "Dark Matter", "css": "deco-dark-matter", "price": 3000},
    "deco_prism_shift": {"name": "Prism Shift", "css": "deco-prism-shift", "price": 3000},
    "deco_inferno_core": {"name": "Inferno Core", "css": "deco-inferno-core", "price": 3000},
    "deco_arctic_wind": {"name": "Arctic Wind", "css": "deco-arctic-wind", "price": 3000},
    "deco_thunder_clap": {"name": "Thunder Clap", "css": "deco-thunder-clap", "price": 3000},
    "deco_crystal_cage": {"name": "Crystal Cage", "css": "deco-crystal-cage", "price": 3000},
    "deco_warp_drive": {"name": "Warp Drive", "css": "deco-warp-drive", "price": 3000},
    "deco_ethereal_mist": {"name": "Ethereal Mist", "css": "deco-ethereal-mist", "price": 3000},
    "deco_magma_flow": {"name": "Magma Flow", "css": "deco-magma-flow", "price": 3000},
    "deco_glitch_matrix": {"name": "Glitch Matrix", "css": "deco-glitch-matrix", "price": 3000},
    "deco_heaven_ascent": {"name": "Heaven Ascent", "css": "deco-heaven-ascent", "price": 3000},
    "deco_demon_aura": {"name": "Demon Aura", "css": "deco-demon-aura", "price": 3000},
    "deco_radiant_sun": {"name": "Radiant Sun", "css": "deco-radiant-sun", "price": 3000},
    "deco_twilight_veil": {"name": "Twilight Veil", "css": "deco-twilight-veil", "price": 3000},
    "deco_cosmic_dust": {"name": "Cosmic Dust", "css": "deco-cosmic-dust", "price": 3000},
    "deco_serpent_coil": {"name": "Serpent Coil", "css": "deco-serpent-coil", "price": 3000},
    "deco_phantom_ring": {"name": "Phantom Ring", "css": "deco-phantom-ring", "price": 3000},
    "deco_chrono_rift": {"name": "Chrono Rift", "css": "deco-chrono-rift", "price": 3000},
    "deco_volcanic_ash": {"name": "Volcanic Ash", "css": "deco-volcanic-ash", "price": 3000},
    "deco_divine_wings": {"name": "Divine Wings", "css": "deco-divine-wings", "price": 3000},
    "deco_obsidian_edge": {"name": "Obsidian Edge", "css": "deco-obsidian-edge", "price": 3000},
    "deco_supernova_burst": {"name": "Supernova Burst", "css": "deco-supernova-burst", "price": 3000},
}

# Premium Battle Scene Decorations — 7000 gems each (illustrated battle images)
SHOP_BATTLE_EFFECTS = {
    "battle_dragon_samurai": {"name": "Dragon vs Samurai", "image": "/effects/battle_dragon_samurai.png", "price": 7000},
    "battle_phoenix_knight": {"name": "Phoenix vs Knight", "image": "/effects/battle_phoenix_knight.png", "price": 7000},
    "battle_kraken_ship": {"name": "Kraken Attack", "image": "/effects/battle_kraken_ship.png", "price": 7000},
    "battle_wolf_demon": {"name": "Wolf vs Demon", "image": "/effects/battle_wolf_demon.png", "price": 7000},
    "battle_titan_army": {"name": "Titan vs Army", "image": "/effects/battle_titan_army.png", "price": 7000},
    "battle_angel_dragon": {"name": "Angel vs Dragon", "image": "/effects/battle_angel_dragon.png", "price": 7000},
    "battle_ninja_oni": {"name": "Ninja vs Oni", "image": "/effects/battle_ninja_oni.png", "price": 7000},
    "battle_mech_kaiju": {"name": "Mech vs Kaiju", "image": "/effects/battle_mech_kaiju.png", "price": 7000},
    "battle_wizard_lich": {"name": "Wizard vs Lich", "image": "/effects/battle_wizard_lich.png", "price": 7000},
    "battle_viking_serpent": {"name": "Viking vs Serpent", "image": "/effects/battle_viking_serpent.png", "price": 7000},
    "battle_ronin_spirits": {"name": "Ronin vs Spirits", "image": "/effects/battle_ronin_spirits.png", "price": 7000},
    "battle_gladiator_lion": {"name": "Gladiator vs Lion", "image": "/effects/battle_gladiator_lion.png", "price": 7000},
    "battle_cyborg_beast": {"name": "Cyborg vs Beast", "image": "/effects/battle_cyborg_beast.png", "price": 7000},
    "battle_sorcerer_golem": {"name": "Sorcerer vs Golem", "image": "/effects/battle_sorcerer_golem.png", "price": 7000},
    "battle_pirate_leviathan": {"name": "Pirate vs Leviathan", "image": "/effects/battle_pirate_leviathan.png", "price": 7000},
    "battle_assassin_shadow": {"name": "Assassin vs Shadow", "image": "/effects/battle_assassin_shadow.png", "price": 7000},
    "battle_paladin_undead": {"name": "Paladin vs Undead", "image": "/effects/battle_paladin_undead.png", "price": 7000},
    "battle_huntress_wyvern": {"name": "Huntress vs Wyvern", "image": "/effects/battle_huntress_wyvern.png", "price": 7000},
    "battle_monk_demons": {"name": "Monk vs Demons", "image": "/effects/battle_monk_demons.png", "price": 7000},
    "battle_spartan_minotaur": {"name": "Spartan vs Minotaur", "image": "/effects/battle_spartan_minotaur.png", "price": 7000},
    "battle_frost_giant": {"name": "Frost Giant Battle", "image": "/effects/battle_frost_giant.png", "price": 7000},
    "battle_shinobi_dragon": {"name": "Shinobi vs Dragon", "image": "/effects/battle_shinobi_dragon.png", "price": 7000},
    "battle_warlock_hydra": {"name": "Warlock vs Hydra", "image": "/effects/battle_warlock_hydra.png", "price": 7000},
    "battle_valkyrie_fenrir": {"name": "Valkyrie vs Fenrir", "image": "/effects/battle_valkyrie_fenrir.png", "price": 7000},
    "battle_bounty_alien": {"name": "Bounty Hunter vs Alien", "image": "/effects/battle_bounty_alien.png", "price": 7000},
    "battle_druid_treant": {"name": "Druid vs Treant", "image": "/effects/battle_druid_treant.png", "price": 7000},
    "battle_pharaoh_anubis": {"name": "Pharaoh vs Anubis", "image": "/effects/battle_pharaoh_anubis.png", "price": 7000},
    "battle_samurai_yokai": {"name": "Samurai vs Yokai", "image": "/effects/battle_samurai_yokai.png", "price": 7000},
    "battle_knight_chimera": {"name": "Knight vs Chimera", "image": "/effects/battle_knight_chimera.png", "price": 7000},
    "battle_cosmic_gods": {"name": "Cosmic Gods Clash", "image": "/effects/battle_cosmic_gods.png", "price": 7000},
}

def get_earned_titles(user_doc):
    """Compute all titles a user has earned based on streaks and time."""
    longest = user_doc.get("longest_streak_ever", 0)
    hours = user_doc.get("total_hours_tracked", 0)
    earned = []
    for t in STREAK_TITLES:
        if longest >= t["days"]:
            earned.append({"title": t["title"], "type": "streak", "rarity": t["rarity"], "requirement": f"{t['days']}d streak"})
    for t in TIME_TITLES:
        if hours >= t["hours"]:
            earned.append({"title": t["title"], "type": "time", "rarity": t["rarity"], "requirement": f"{t['hours']}h tracked"})
    return earned

async def check_and_update_streak(user_id: str, user_doc: dict) -> dict:
    """Timestamp-based streak logic. Call when ALL today's habits are complete."""
    now = datetime.now(timezone.utc)
    last_ts = user_doc.get("last_completion_timestamp")
    current_streak = user_doc.get("current_streak", 0)
    shield_used = False

    if last_ts is None:
        new_streak = 1
    else:
        if isinstance(last_ts, str):
            last_ts = datetime.fromisoformat(last_ts)
        hours_diff = (now - last_ts).total_seconds() / 3600

        if hours_diff > 48:
            shields = user_doc.get("streak_shields", 0)
            if shields > 0:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$inc": {"streak_shields": -1}}
                )
                new_streak = current_streak + 1
                shield_used = True
                await db.notifications.insert_one({
                    "notification_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "type": "streak_shield_used",
                    "message": "Streak Shield used. Your streak is protected!",
                    "read": False,
                    "created_at": now.isoformat()
                })
            else:
                new_streak = 1
        elif hours_diff >= 24:
            new_streak = current_streak + 1
        else:
            return {"streak": current_streak, "changed": False, "shield_used": False}

    longest = max(user_doc.get("longest_streak_ever", 0), new_streak)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "current_streak": new_streak,
            "longest_streak_ever": longest,
            "last_completion_timestamp": now.isoformat()
        }}
    )
    return {"streak": new_streak, "changed": True, "shield_used": shield_used}

async def check_streak_decay(user_id: str, user_doc: dict):
    """Check if streak should be reset due to inactivity (called on login/page load)."""
    last_ts = user_doc.get("last_completion_timestamp")
    if not last_ts:
        return
    if isinstance(last_ts, str):
        last_ts = datetime.fromisoformat(last_ts)
    now = datetime.now(timezone.utc)
    hours_diff = (now - last_ts).total_seconds() / 3600
    current_streak = user_doc.get("current_streak", 0)

    if hours_diff > 48 and current_streak > 0:
        shields = user_doc.get("streak_shields", 0)
        if shields > 0:
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"streak_shields": -1}}
            )
            await db.notifications.insert_one({
                "notification_id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "streak_shield_used",
                "message": "Streak Shield used. Your streak is protected!",
                "read": False,
                "created_at": now.isoformat()
            })
        else:
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"current_streak": 0}}
            )

async def generate_shop_inventory():
    """Generate shop inventory with rarity-weighted rolls."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=5)

    # Check if restock needed
    config = await db.shop_config.find_one({"_id": "global"})
    if config:
        next_restock = config.get("next_restock_timestamp")
        if isinstance(next_restock, str):
            next_restock = datetime.fromisoformat(next_restock)
        if now < next_restock:
            return  # Not time yet

    # Clear old inventory
    await db.shop_inventory.delete_many({})

    # Generate 4 power-up slots
    items_to_insert = []
    for _ in range(4):
        roll = random.randint(1, 100)
        if roll <= 80:
            rarity = "common"
        elif roll <= 95:
            rarity = "rare"
        else:
            rarity = "legendary"

        candidates = [k for k, v in SHOP_POWER_UPS.items() if v["rarity"] == rarity]
        if not candidates:
            candidates = [k for k, v in SHOP_POWER_UPS.items() if v["rarity"] == "common"]
        item_key = random.choice(candidates)
        item = SHOP_POWER_UPS[item_key]

        items_to_insert.append({
            "item_key": item_key,
            "item_name": item["name"],
            "rarity": item["rarity"],
            "gem_cost": item["price"],
            "item_type": "boost" if "boost" in item_key else "shield",
            "field": item["field"],
            "max": item["max"],
            "icon": item["icon"],
            "description": item["description"],
            "expires_at": expires.isoformat(),
            "created_at": now.isoformat()
        })

    if items_to_insert:
        await db.shop_inventory.insert_many(items_to_insert)

    await db.shop_config.update_one(
        {"_id": "global"},
        {"$set": {
            "last_restock_timestamp": now.isoformat(),
            "next_restock_timestamp": expires.isoformat()
        }},
        upsert=True
    )

def get_roast(category: str, **kwargs) -> str:
    messages = ROAST_MESSAGES.get(category, ROAST_MESSAGES["missed_habit"])
    message = random.choice(messages)
    return message.format(**kwargs)

def serialize_user(user: dict) -> dict:
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user

# ==================== AUTH ENDPOINTS ====================

@auth_router.post("/register")
async def register(user_data: UserCreate, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(user_data.password)
    now = datetime.now(timezone.utc)
    
    # Generate unique username
    username = generate_username(user_data.first_name)
    while await db.users.find_one({"username": username}):
        username = generate_username(user_data.first_name)
    
    user_doc = {
        "email": email,
        "username": username,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "password_hash": password_hash,
        "created_at": now.isoformat(),
        "onboarding_completed": False,
        "main_goal": None,
        "download_reason": None,
        "download_reason_other": None,
        "consistency_level": None,
        "accountability_style": None,
        "app_mode": None,
        "current_xp": 0,
        "current_level": 1,
        "level_name": "Rookie",
        "total_xp_all_time": 0,
        "highest_level_reached": 1,
        "longest_streak_ever": 0,
        "current_streak": 0,
        "total_habits_completed": 0,
        "gems": 50,
        "streak_revives": 1,
        "streak_shields": 0,
        "xp_boost_uses": 0,
        "xp_triple_boost_uses": 0,
        "xp_quad_boost_uses": 0,
        "xp_penta_boost_uses": 0,
        "xp_hexa_boost_uses": 0,
        "last_habit_date": None,
        "last_completion_timestamp": None,
        "badges": [],
        "inventory": [],
        "selected_main_color": "#1F2937",
        "selected_banner_color": "#1F2937",
        "unlocked_main_colors": [],
        "unlocked_banner_colors": [],
        "is_public": True,
        "total_hours_tracked": 0,
        "equipped_title": None,
        "equipped_icon": None,
        "equipped_animation": None,
        "equipped_banner": None,
        "equipped_decoration": None,
        "unlocked_titles": [],
        "unlocked_icons": [],
        "unlocked_animations": [],
        "unlocked_banners": [],
        "unlocked_decorations": [],
        "notification_settings": {
            "push_enabled": True,
            "reminders_enabled": True,
            "roast_enabled": True
        }
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    user_doc["_id"] = user_id
    user_doc.pop("password_hash")
    return {"user": user_doc, "access_token": access_token}

@auth_router.post("/login")
async def login(credentials: UserLogin, request: Request, response: Response):
    email = credentials.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("locked_until")
        if lockout_time:
            if isinstance(lockout_time, str):
                lockout_time = datetime.fromisoformat(lockout_time)
            if datetime.now(timezone.utc) < lockout_time:
                raise HTTPException(status_code=429, detail="Too many attempts. Please wait 15 minutes.")
            else:
                await db.login_attempts.delete_one({"identifier": identifier})
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="No account found with that email")
    
    if not verify_password(credentials.password, user["password_hash"]):
        # Increment failed attempts
        now = datetime.now(timezone.utc)
        if attempt:
            new_count = attempt.get("count", 0) + 1
            update = {"$set": {"count": new_count}}
            if new_count >= 5:
                update["$set"]["locked_until"] = (now + timedelta(minutes=15)).isoformat()
            await db.login_attempts.update_one({"identifier": identifier}, update)
        else:
            await db.login_attempts.insert_one({
                "identifier": identifier,
                "count": 1,
                "created_at": now.isoformat()
            })
        raise HTTPException(status_code=401, detail="Incorrect email or password. Please try again.")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {"user": serialize_user(user), "access_token": access_token, "refresh_token": refresh_token}

@auth_router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Check streak decay on every auth check
    await check_streak_decay(user["_id"], user)
    # Re-fetch user after potential streak update
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    # Accept refresh token from cookie OR Bearer header
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=900, path="/")
        return {"access_token": access_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@auth_router.post("/forgot-password")
async def forgot_password(data: PasswordReset):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return success to prevent email enumeration
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": str(user["_id"]),
            "email": email,
            "expires_at": expires_at.isoformat(),
            "used": False
        })
        logger.info(f"Password reset link: /reset-password?token={token}")
    return {"message": "If an account exists with that email, a reset link has been sent."}

@auth_router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    token_doc = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = token_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    password_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password_hash": password_hash}}
    )
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}

# ==================== USER ENDPOINTS ====================

@users_router.post("/onboarding")
async def save_onboarding(data: OnboardingData, user: dict = Depends(get_current_user)):
    update_data = {}
    if data.main_goal:
        update_data["main_goal"] = data.main_goal
    if data.download_reason:
        update_data["download_reason"] = data.download_reason
    if data.download_reason_other:
        update_data["download_reason_other"] = data.download_reason_other
    if data.consistency_level:
        update_data["consistency_level"] = data.consistency_level
    if data.accountability_style:
        update_data["accountability_style"] = data.accountability_style
    if data.app_mode:
        update_data["app_mode"] = data.app_mode
        update_data["onboarding_completed"] = True
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return serialize_user(updated_user)

@users_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    if data.first_name:
        update_data["first_name"] = data.first_name
    if data.last_name:
        update_data["last_name"] = data.last_name
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return serialize_user(updated_user)

@users_router.post("/change-password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(data.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    password_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password_hash": password_hash}}
    )
    return {"message": "Password changed successfully"}

@users_router.put("/notification-settings")
async def update_notification_settings(data: NotificationSettings, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"notification_settings": data.model_dump()}}
    )
    return {"message": "Notification settings updated"}

@users_router.put("/mode")
async def switch_mode(user: dict = Depends(get_current_user)):
    current_mode = user.get("app_mode", "focus")
    new_mode = "game" if current_mode == "focus" else "focus"
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"app_mode": new_mode}}
    )
    return {"app_mode": new_mode}

@users_router.get("/stats")
async def get_user_stats(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    
    # Get most completed habit
    most_completed = None
    most_skipped = None
    max_completions = 0
    max_skips = 0
    
    for habit in habits:
        completions = len(habit.get("completions", []))
        if completions > max_completions:
            max_completions = completions
            most_completed = habit["habit_name"]
    
    return {
        "total_xp_all_time": user.get("total_xp_all_time", 0),
        "highest_level_reached": user.get("highest_level_reached", 1),
        "longest_streak_ever": user.get("longest_streak_ever", 0),
        "total_habits_completed": user.get("total_habits_completed", 0),
        "current_streak": user.get("current_streak", 0),
        "member_since": user.get("created_at"),
        "most_completed_habit": most_completed
    }

# ==================== HABITS ENDPOINTS ====================

@habits_router.post("")
async def create_habit(habit_data: HabitCreate, user: dict = Depends(get_current_user)):
    xp_value = get_xp_for_difficulty(habit_data.difficulty)
    now = datetime.now(timezone.utc)
    
    habit_doc = {
        "habit_id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "habit_name": habit_data.habit_name,
        "description": habit_data.description,
        "time_of_day": habit_data.time_of_day,
        "difficulty": habit_data.difficulty,
        "xp_value": xp_value,
        "repeat_schedule": habit_data.repeat_schedule,
        "custom_days": habit_data.custom_days,
        "created_at": now.isoformat(),
        "current_streak": 0,
        "longest_streak": 0,
        "session_duration": habit_data.session_duration or 15,
        "completions": []
    }
    
    await db.habits.insert_one(habit_doc)
    habit_doc.pop("_id", None)
    return habit_doc

@habits_router.get("")
async def get_habits(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    return habits

@habits_router.get("/today")
async def get_todays_habits(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    weekday = today.strftime("%A").lower()
    
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    
    todays_habits = []
    for habit in habits:
        schedule = habit.get("repeat_schedule", "daily")
        if schedule == "daily":
            include = True
        elif schedule == "weekdays":
            include = weekday not in ["saturday", "sunday"]
        elif schedule == "weekends":
            include = weekday in ["saturday", "sunday"]
        else:
            custom_days = habit.get("custom_days", [])
            include = weekday in [d.lower() for d in custom_days]
        
        if include:
            # Check if completed today
            completions = habit.get("completions", [])
            completed_today = any(c.startswith(today_str) for c in completions)
            habit["completed_today"] = completed_today
            todays_habits.append(habit)
    
    return todays_habits

@habits_router.put("/{habit_id}")
async def update_habit(habit_id: str, habit_data: HabitUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    if habit_data.habit_name:
        update_data["habit_name"] = habit_data.habit_name
    if habit_data.description is not None:
        update_data["description"] = habit_data.description
    if habit_data.time_of_day:
        update_data["time_of_day"] = habit_data.time_of_day
    if habit_data.difficulty:
        update_data["difficulty"] = habit_data.difficulty
        update_data["xp_value"] = get_xp_for_difficulty(habit_data.difficulty)
    if habit_data.repeat_schedule:
        update_data["repeat_schedule"] = habit_data.repeat_schedule
    if habit_data.custom_days is not None:
        update_data["custom_days"] = habit_data.custom_days
    
    if update_data:
        await db.habits.update_one(
            {"habit_id": habit_id, "user_id": user["_id"]},
            {"$set": update_data}
        )
    
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": user["_id"]}, {"_id": 0})
    return habit

@habits_router.delete("/{habit_id}")
async def delete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    result = await db.habits.delete_one({"habit_id": habit_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted"}

@habits_router.post("/{habit_id}/complete")
async def complete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": user["_id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()
    
    # Check if already completed today
    completions = habit.get("completions", [])
    if any(c.startswith(today_str) for c in completions):
        raise HTTPException(status_code=400, detail="Habit already completed today")
    
    # Add completion
    completions.append(now.isoformat())
    
    # Update streak
    current_streak = habit.get("current_streak", 0) + 1
    longest_streak = max(habit.get("longest_streak", 0), current_streak)
    
    await db.habits.update_one(
        {"habit_id": habit_id, "user_id": user["_id"]},
        {"$set": {
            "completions": completions,
            "current_streak": current_streak,
            "longest_streak": longest_streak
        }}
    )
    
    # Calculate XP earned
    xp_earned = habit.get("xp_value", 10)
    bonus_xp = 0
    
    # Check for time slot completion bonus
    time_of_day = habit.get("time_of_day")
    user_habits = await db.habits.find({"user_id": user["_id"], "time_of_day": time_of_day}, {"_id": 0}).to_list(100)
    all_slot_complete = all(
        any(c.startswith(today_str) for c in h.get("completions", [])) or h["habit_id"] == habit_id
        for h in user_habits
    )
    if all_slot_complete and len(user_habits) > 1:
        bonus_xp += 15
    
    # Check for full day completion bonus
    all_habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    all_day_complete = all(
        any(c.startswith(today_str) for c in h.get("completions", [])) or h["habit_id"] == habit_id
        for h in all_habits
    )
    if all_day_complete and len(all_habits) > 1:
        bonus_xp += 50
    
    # Streak bonuses
    user_doc = await db.users.find_one({"_id": ObjectId(user["_id"])})
    user_streak = user_doc.get("current_streak", 0)
    if user_streak == 2:  # About to hit 3
        bonus_xp += 20
    elif user_streak == 6:  # About to hit 7
        bonus_xp += 75
    elif user_streak == 29:  # About to hit 30
        bonus_xp += 300
    
    total_xp = xp_earned + bonus_xp
    
    # Gems earned based on difficulty
    gems_earned = 0
    if user_doc.get("app_mode") == "game":
        gem_map = {"easy": 5, "medium": 10, "hard": 20}
        gems_earned = gem_map.get(habit.get("difficulty", "easy"), 5)
        if all_day_complete:
            gems_earned += 10  # Bonus for full day
    else:
        # Focus Mode: flat +10 gems per habit
        gems_earned = 10
    
    # Check for XP boosts (4x > 3x > 2x priority)
    boost_multiplier = 1
    boost_field = None
    if user_doc.get("xp_hexa_boost_uses", 0) > 0:
        boost_multiplier = 6
        boost_field = "xp_hexa_boost_uses"
    elif user_doc.get("xp_penta_boost_uses", 0) > 0:
        boost_multiplier = 5
        boost_field = "xp_penta_boost_uses"
    elif user_doc.get("xp_quad_boost_uses", 0) > 0:
        boost_multiplier = 4
        boost_field = "xp_quad_boost_uses"
    elif user_doc.get("xp_triple_boost_uses", 0) > 0:
        boost_multiplier = 3
        boost_field = "xp_triple_boost_uses"
    elif user_doc.get("xp_boost_uses", 0) > 0:
        boost_multiplier = 2
        boost_field = "xp_boost_uses"
    
    if boost_multiplier > 1:
        total_xp = total_xp * boost_multiplier
    
    # Update user XP and level
    new_xp = user_doc.get("current_xp", 0) + total_xp
    new_total_xp = user_doc.get("total_xp_all_time", 0) + total_xp
    level_info = get_level_info(new_xp)
    
    level_up = level_info["level"] > user_doc.get("current_level", 1)
    
    # Level up rewards
    level_rewards = None
    if level_up:
        new_level = level_info["level"]
        rewards = LEVEL_REWARDS.get(new_level, {})
        gems_earned += rewards.get("gems", 0) + 50  # +50 gems on any level-up
        streak_revives_earned = rewards.get("streak_revives", 0)
        new_badge = rewards.get("badge")

        level_rewards = {
            "gems": rewards.get("gems", 0),
            "streak_revives": streak_revives_earned,
            "badge": new_badge,
            "description": rewards.get("description", ""),
            "rarity": rewards.get("rarity", "common"),
            "xp_bonus": rewards.get("xp_bonus", 0),
        }

        # Add badge if earned
        update_sets = {}
        update_incs = {"streak_revives": streak_revives_earned}
        update_pushes = {}

        if new_badge:
            update_pushes["badges"] = new_badge

        # XP bonus reward
        if rewards.get("xp_bonus"):
            update_incs["current_xp"] = rewards["xp_bonus"]
            update_incs["total_xp_all_time"] = rewards["xp_bonus"]

        # Unlock color reward
        if rewards.get("unlock_color"):
            update_pushes["unlocked_main_colors"] = rewards["unlock_color"]

        # Unlock animation reward
        if rewards.get("unlock_animation"):
            update_pushes["unlocked_animations"] = rewards["unlock_animation"]

        # Unlock banner reward
        if rewards.get("unlock_banner"):
            update_pushes["unlocked_banners"] = rewards["unlock_banner"]

        # Unlock streak shield reward
        if rewards.get("unlock_shield"):
            update_incs["streak_shields"] = 1

        update_ops = {}
        if update_incs:
            update_ops["$inc"] = update_incs
        if update_pushes:
            update_ops["$addToSet"] = update_pushes
        if update_sets:
            update_ops["$set"] = update_sets

        if update_ops:
            await db.users.update_one({"_id": ObjectId(user["_id"])}, update_ops)
    
    # Update streak based on timestamp logic (only when ALL habits complete)
    streak_result = {"streak": user_doc.get("current_streak", 0), "changed": False, "shield_used": False}
    if all_day_complete and len(all_habits) > 0:
        streak_result = await check_and_update_streak(user["_id"], user_doc)
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "current_xp": new_xp,
            "total_xp_all_time": new_total_xp,
            "current_level": level_info["level"],
            "level_name": level_info["name"],
            "highest_level_reached": max(user_doc.get("highest_level_reached", 1), level_info["level"]),
            "total_habits_completed": user_doc.get("total_habits_completed", 0) + 1,
            "last_habit_date": today_str
        },
        "$inc": {"gems": gems_earned, **(({boost_field: -1} if boost_field else {}))}}
    )
    
    # Update daily log
    log = await db.daily_logs.find_one({"user_id": user["_id"], "date": today_str})
    if log:
        await db.daily_logs.update_one(
            {"user_id": user["_id"], "date": today_str},
            {
                "$push": {"habits_completed": habit_id},
                "$inc": {"xp_earned_today": total_xp, "gems_earned_today": gems_earned},
                "$set": {"full_day_completion": all_day_complete}
            }
        )
    else:
        await db.daily_logs.insert_one({
            "log_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "date": today_str,
            "habits_completed": [habit_id],
            "xp_earned_today": total_xp,
            "gems_earned_today": gems_earned,
            "full_day_completion": all_day_complete
        })
    
    return {
        "xp_earned": xp_earned,
        "bonus_xp": bonus_xp,
        "total_xp": total_xp,
        "gems_earned": gems_earned,
        "new_xp": new_xp,
        "level": level_info["level"],
        "level_name": level_info["name"],
        "level_up": level_up,
        "level_rewards": level_rewards,
        "current_streak": streak_result["streak"],
        "streak_changed": streak_result["changed"],
        "shield_used": streak_result.get("shield_used", False),
        "boost_multiplier": boost_multiplier,
        "all_complete": all_day_complete
    }

@habits_router.post("/{habit_id}/uncomplete")
async def uncomplete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    habit = await db.habits.find_one({"habit_id": habit_id, "user_id": user["_id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    today_str = datetime.now(timezone.utc).date().isoformat()
    completions = habit.get("completions", [])
    
    # Find and remove today's completion
    new_completions = [c for c in completions if not c.startswith(today_str)]
    if len(new_completions) == len(completions):
        raise HTTPException(status_code=400, detail="Habit was not completed today")
    
    # Recalculate streak
    current_streak = max(0, habit.get("current_streak", 1) - 1)
    
    await db.habits.update_one(
        {"habit_id": habit_id, "user_id": user["_id"]},
        {"$set": {
            "completions": new_completions,
            "current_streak": current_streak
        }}
    )
    
    # Deduct XP (simplified - just base XP)
    xp_to_deduct = habit.get("xp_value", 10)
    user_doc = await db.users.find_one({"_id": ObjectId(user["_id"])})
    new_xp = max(0, user_doc.get("current_xp", 0) - xp_to_deduct)
    level_info = get_level_info(new_xp)
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "current_xp": new_xp,
            "current_level": level_info["level"],
            "level_name": level_info["name"],
            "total_habits_completed": max(0, user_doc.get("total_habits_completed", 1) - 1)
        }}
    )
    
    return {"message": "Habit uncompleted", "new_xp": new_xp}


GAME_ROASTS = [
    "Your friends are lapping you right now.",
    "Day 3 and you already quit. Tragic.",
    "Your streak died so you could scroll. Worth it?",
    "Bro seriously? You were so close.",
    "Your competition didn't skip today. You did.",
    "Ghost mode activated. Your streak is gone.",
    "You picked this app and still couldn't show up. Respect the irony.",
    "Skipped again? Your future self is cringing.",
]

FOCUS_ROASTS = [
    "You lasted {mins} minutes. You said this mattered.",
    "The timer was still running. You weren't.",
    "You picked Focus Mode for a reason. Remember it.",
    "Walked away again. The habit isn't going to build itself.",
    "No streak shield. No session complete. Just an excuse.",
    "Silence means nothing if you're not doing the work.",
    "You set this habit. You abandoned it. That's on you.",
]


@api_router.post("/session/abandon")
async def abandon_session(body: dict = Body(...), user: dict = Depends(get_current_user)):
    """Abandon a focus session — deduct 30 gems, consume shield, fire roast"""
    user_id = str(user["_id"])
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    gems = user_doc.get("gems", 0)
    mins_elapsed = body.get("mins_elapsed", 0)

    update_ops = {}
    gem_deduction = min(30, gems)
    update_ops["$inc"] = {"gems": -gem_deduction}

    # Consume streak shield if active
    shields = user_doc.get("streak_shields", 0)
    shield_consumed = False
    if shields > 0:
        update_ops["$inc"]["streak_shields"] = -1
        shield_consumed = True

    await db.users.update_one({"_id": ObjectId(user_id)}, update_ops)

    # Pick a roast
    roast = random.choice(FOCUS_ROASTS).format(mins=mins_elapsed)

    return {"message": "Session abandoned", "gems_deducted": gem_deduction, "shield_consumed": shield_consumed, "roast": roast}


@api_router.get("/roasts/check")
async def check_roasts(user: dict = Depends(get_current_user)):
    """Check if any roasts should fire for the current user"""
    user_id = str(user["_id"])
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    is_game = user_doc.get("app_mode") == "game"
    roast_enabled = user_doc.get("notification_settings", {}).get("roast_enabled", True)

    if not roast_enabled:
        return {"roasts": []}

    # Check today's roast count
    today_str = datetime.now(timezone.utc).date().isoformat()
    today_roasts = await db.notifications.count_documents({
        "user_id": user_doc["_id"],
        "type": "roast",
        "date": today_str,
    })
    if today_roasts >= 2:
        return {"roasts": []}

    roasts = []
    now = datetime.now(timezone.utc)
    hour = now.hour

    # Check streak broken
    streak = user_doc.get("current_streak", 0)
    last_roast_streak = user_doc.get("last_roast_streak_val", -1)
    if streak == 0 and last_roast_streak > 0:
        pool = GAME_ROASTS if is_game else FOCUS_ROASTS
        roasts.append(random.choice(pool).replace("{mins}", "0"))
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"last_roast_streak_val": 0}})

    # Check habits incomplete at evening
    threshold_hour = 22 if is_game else 20
    if hour >= threshold_hour and not roasts:
        habits = await db.habits.find({"user_id": user_doc["_id"]}, {"_id": 0}).to_list(100)
        log = await db.daily_logs.find_one({"user_id": user_doc["_id"], "date": today_str}, {"_id": 0})
        completed_ids = set(log.get("habits_completed", [])) if log else set()
        incomplete = [h for h in habits if h["habit_id"] not in completed_ids]
        if incomplete:
            pool = GAME_ROASTS if is_game else FOCUS_ROASTS
            roasts.append(random.choice(pool).replace("{mins}", "0"))

    # Save roast to avoid repeats
    for r in roasts:
        await db.notifications.insert_one({
            "notification_id": str(uuid.uuid4()),
            "user_id": user_doc["_id"],
            "type": "roast",
            "message": r,
            "date": today_str,
            "created_at": now.isoformat(),
        })

    # Update streak tracking
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"last_roast_streak_val": streak}})

    return {"roasts": roasts}

# ==================== PROGRESS ENDPOINTS ====================

@api_router.get("/progress/daily")
async def get_daily_progress(user: dict = Depends(get_current_user)):
    today_str = datetime.now(timezone.utc).date().isoformat()
    
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    log = await db.daily_logs.find_one({"user_id": user["_id"], "date": today_str}, {"_id": 0})
    
    completed_ids = log.get("habits_completed", []) if log else []
    
    morning = [h for h in habits if h.get("time_of_day") == "morning"]
    afternoon = [h for h in habits if h.get("time_of_day") == "afternoon"]
    night = [h for h in habits if h.get("time_of_day") == "night"]
    
    return {
        "date": today_str,
        "total_habits": len(habits),
        "completed_habits": len(completed_ids),
        "morning": {"total": len(morning), "completed": sum(1 for h in morning if h["habit_id"] in completed_ids)},
        "afternoon": {"total": len(afternoon), "completed": sum(1 for h in afternoon if h["habit_id"] in completed_ids)},
        "night": {"total": len(night), "completed": sum(1 for h in night if h["habit_id"] in completed_ids)},
        "xp_earned_today": log.get("xp_earned_today", 0) if log else 0,
        "gems_earned_today": log.get("gems_earned_today", 0) if log else 0
    }

@api_router.get("/progress/weekly")
async def get_weekly_progress(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=6)
    
    logs = await db.daily_logs.find({
        "user_id": user["_id"],
        "date": {"$gte": week_start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(7)
    
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    total_habits_per_day = len(habits)
    
    daily_data = []
    total_xp = 0
    total_gems = 0
    total_tasks = 0
    best_day = None
    best_xp = 0
    full_days = 0
    partial_days = 0
    missed_days = 0
    
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_str = day.isoformat()
        log = next((entry for entry in logs if entry["date"] == day_str), None)
        
        if log:
            xp = log.get("xp_earned_today", 0)
            gems = log.get("gems_earned_today", 0)
            completed = len(log.get("habits_completed", []))
            total_xp += xp
            total_gems += gems
            total_tasks += completed
            
            if xp > best_xp:
                best_xp = xp
                best_day = day_str
            
            if log.get("full_day_completion"):
                full_days += 1
            elif completed > 0:
                partial_days += 1
            else:
                missed_days += 1
            
            daily_data.append({
                "date": day_str,
                "day": day.strftime("%a"),
                "xp": xp,
                "gems": gems,
                "completed": completed,
                "total": total_habits_per_day,
                "status": "full" if log.get("full_day_completion") else "partial" if completed > 0 else "missed"
            })
        else:
            missed_days += 1
            daily_data.append({
                "date": day_str,
                "day": day.strftime("%a"),
                "xp": 0,
                "completed": 0,
                "total": total_habits_per_day,
                "status": "missed"
            })
    
    completion_rate = (full_days * 100 + partial_days * 50) / 7 if total_habits_per_day > 0 else 0
    
    return {
        "daily_data": daily_data,
        "total_xp": total_xp,
        "total_gems": total_gems,
        "total_tasks": total_tasks,
        "best_day": best_day,
        "best_xp": best_xp,
        "completion_rate": round(completion_rate, 1),
        "full_days": full_days,
        "partial_days": partial_days,
        "missed_days": missed_days
    }

@api_router.get("/progress/monthly")
async def get_monthly_progress(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    month_start = today - timedelta(days=29)

    logs = await db.daily_logs.find({
        "user_id": user["_id"],
        "date": {"$gte": month_start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(31)

    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    total_habits_per_day = len(habits)

    daily_data = []
    total_xp = 0
    total_gems = 0
    total_tasks = 0
    full_days = 0

    for i in range(30):
        day = month_start + timedelta(days=i)
        day_str = day.isoformat()
        log = next((entry for entry in logs if entry["date"] == day_str), None)

        if log:
            xp = log.get("xp_earned_today", 0)
            gems = log.get("gems_earned_today", 0)
            completed = len(log.get("habits_completed", []))
            total_xp += xp
            total_gems += gems
            total_tasks += completed
            if log.get("full_day_completion"):
                full_days += 1

            daily_data.append({
                "date": day_str,
                "day": day.strftime("%d"),
                "xp": xp,
                "gems": gems,
                "completed": completed,
                "total": total_habits_per_day,
                "status": "full" if log.get("full_day_completion") else "partial" if completed > 0 else "missed"
            })
        else:
            daily_data.append({
                "date": day_str,
                "day": day.strftime("%d"),
                "xp": 0,
                "gems": 0,
                "completed": 0,
                "total": total_habits_per_day,
                "status": "missed"
            })

    completion_rate = (total_tasks / (total_habits_per_day * 30) * 100) if total_habits_per_day > 0 else 0

    return {
        "daily_data": daily_data,
        "total_xp": total_xp,
        "total_gems": total_gems,
        "total_tasks": total_tasks,
        "completion_rate": round(completion_rate, 1),
        "full_days": full_days
    }

@api_router.get("/levels")
async def get_levels():
    return [
        {"level": 1, "name": "Rookie", "min_xp": 0, "max_xp": 100},
        {"level": 2, "name": "Apprentice", "min_xp": 101, "max_xp": 250},
        {"level": 3, "name": "Contender", "min_xp": 251, "max_xp": 500},
        {"level": 4, "name": "Achiever", "min_xp": 501, "max_xp": 900},
        {"level": 5, "name": "Warrior", "min_xp": 901, "max_xp": 1400},
        {"level": 6, "name": "Champion", "min_xp": 1401, "max_xp": 2100},
        {"level": 7, "name": "Elite", "min_xp": 2101, "max_xp": 3000},
        {"level": 8, "name": "Master", "min_xp": 3001, "max_xp": 4200},
        {"level": 9, "name": "Legend", "min_xp": 4201, "max_xp": 6000},
        {"level": 10, "name": "Apex", "min_xp": 6001, "max_xp": 999999},
    ]

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.post("/notifications/read/{notification_id}")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== GAME MODE ENDPOINTS ====================

@api_router.get("/game/status")
async def get_game_status(user: dict = Depends(get_current_user)):
    """Get current game status including roasts, gems, streak info"""
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    
    # Check today's progress
    log = await db.daily_logs.find_one({"user_id": user["_id"], "date": today_str}, {"_id": 0})
    habits = await db.habits.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    
    habits_completed_today = len(log.get("habits_completed", [])) if log else 0
    total_habits = len(habits)
    
    # Determine roast
    roast = None
    roast_type = None
    hour = datetime.now(timezone.utc).hour
    
    if user.get("app_mode") == "game" and user.get("notification_settings", {}).get("roast_enabled", True):
        if total_habits > 0 and habits_completed_today == 0 and hour >= 12:
            roast = get_roast("behind_schedule")
            roast_type = "behind_schedule"
        elif user.get("current_streak", 0) == 0 and user.get("longest_streak_ever", 0) > 3:
            roast = get_roast("streak_broken", streak=user.get("longest_streak_ever", 0))
            roast_type = "streak_broken"
        elif total_habits > 0 and habits_completed_today < total_habits // 2 and hour >= 18:
            roast = get_roast("missed_habit", streak=user.get("current_streak", 0))
            roast_type = "missed_habit"
    
    return {
        "gems": user.get("gems", 0),
        "streak_revives": user.get("streak_revives", 0),
        "streak_shields": user.get("streak_shields", 0),
        "xp_boost_uses": user.get("xp_boost_uses", 0),
        "xp_triple_boost_uses": user.get("xp_triple_boost_uses", 0),
        "xp_quad_boost_uses": user.get("xp_quad_boost_uses", 0),
        "xp_penta_boost_uses": user.get("xp_penta_boost_uses", 0),
        "xp_hexa_boost_uses": user.get("xp_hexa_boost_uses", 0),
        "current_streak": user.get("current_streak", 0),
        "longest_streak": user.get("longest_streak_ever", 0),
        "badges": user.get("badges", []),
        "habits_today": habits_completed_today,
        "total_habits": total_habits,
        "roast": roast,
        "roast_type": roast_type,
        "level": user.get("current_level", 1),
        "level_name": user.get("level_name", "Rookie"),
    }

@api_router.get("/game/shop")
async def get_shop_items(user: dict = Depends(get_current_user)):
    """Get shop with rarity-based inventory and restock timer"""
    # Check if restock is needed
    await generate_shop_inventory()

    # Get current inventory
    inventory = await db.shop_inventory.find({}).to_list(20)
    items = []
    for inv in inventory:
        field = inv.get("field", "")
        owned = user.get(field, 0) if field else 0
        max_cap = inv.get("max", 3)
        items.append({
            "id": inv["item_key"],
            "name": inv["item_name"],
            "description": inv.get("description", ""),
            "price": inv["gem_cost"],
            "rarity": inv["rarity"],
            "icon": inv.get("icon", "zap"),
            "owned": owned,
            "max": max_cap,
            "item_type": inv.get("item_type", "boost"),
            "can_buy": owned < max_cap and user.get("gems", 0) >= inv["gem_cost"]
        })

    # Get restock timer
    config = await db.shop_config.find_one({"_id": "global"})
    next_restock = config.get("next_restock_timestamp", "") if config else ""

    return {
        "items": items,
        "user_gems": user.get("gems", 0),
        "next_restock": next_restock
    }

@api_router.post("/game/shop/buy/{item_id}")
async def buy_shop_item(item_id: str, user: dict = Depends(get_current_user)):
    """Purchase a power-up from the shop"""
    if item_id not in SHOP_POWER_UPS:
        raise HTTPException(status_code=400, detail="Invalid item")
    
    item = SHOP_POWER_UPS[item_id]
    price = item["price"]
    field = item["field"]
    max_cap = item["max"]
    current_gems = user.get("gems", 0)
    current_owned = user.get(field, 0)
    
    if current_gems < price:
        raise HTTPException(status_code=400, detail="Not enough gems")
    if current_owned >= max_cap:
        raise HTTPException(status_code=400, detail=f"Already at max capacity ({max_cap})")
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$inc": {"gems": -price, field: 1}}
    )
    
    return {
        "success": True,
        "message": f"Purchased {item['name']}!",
        "gems_remaining": current_gems - price,
        "new_count": current_owned + 1
    }

@api_router.post("/game/shop/buy-color")
async def buy_color(request: Request, user: dict = Depends(get_current_user)):
    """Purchase a color from the shop"""
    body = await request.json()
    color_hex = body.get("color_hex")
    color_type = body.get("color_type")  # "main" or "banner"
    
    palette = MAIN_COLORS if color_type == "main" else BANNER_COLORS
    if color_hex not in palette:
        raise HTTPException(status_code=400, detail="Invalid color")
    
    color_info = palette[color_hex]
    price = color_info["price"]
    unlocked_field = f"unlocked_{color_type}_colors"
    already_owned = color_hex in user.get(unlocked_field, [])
    
    if already_owned:
        raise HTTPException(status_code=400, detail="Already owned")
    
    if user.get("gems", 0) < price:
        raise HTTPException(status_code=400, detail="Not enough gems")
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {
            "$inc": {"gems": -price},
            "$push": {unlocked_field: color_hex}
        }
    )
    
    return {
        "success": True,
        "message": f"Unlocked {color_info['name']}!",
        "gems_remaining": user.get("gems", 0) - price
    }

@api_router.get("/game/colors")
async def get_colors(user: dict = Depends(get_current_user)):
    """Get all colors with ownership status"""
    main_colors = []
    for hex_code, info in MAIN_COLORS.items():
        main_colors.append({
            "hex": hex_code,
            "name": info["name"],
            "rarity": info["rarity"],
            "price": info["price"],
            "owned": hex_code in user.get("unlocked_main_colors", []),
            "selected": user.get("selected_main_color") == hex_code
        })
    
    banner_colors = []
    for hex_code, info in BANNER_COLORS.items():
        banner_colors.append({
            "hex": hex_code,
            "name": info["name"],
            "rarity": info["rarity"],
            "price": info["price"],
            "owned": hex_code in user.get("unlocked_banner_colors", []),
            "selected": user.get("selected_banner_color") == hex_code
        })
    
    return {
        "main_colors": main_colors,
        "banner_colors": banner_colors,
        "selected_main": user.get("selected_main_color", "#1F2937"),
        "selected_banner": user.get("selected_banner_color", "#1F2937")
    }

@api_router.put("/users/colors")
async def update_colors(request: Request, user: dict = Depends(get_current_user)):
    """Update selected main or banner color"""
    body = await request.json()
    color_hex = body.get("color_hex")
    color_type = body.get("color_type")  # "main" or "banner"
    
    unlocked_field = f"unlocked_{color_type}_colors"
    selected_field = f"selected_{color_type}_color"
    
    if color_hex != "#1F2937" and color_hex not in user.get(unlocked_field, []):
        raise HTTPException(status_code=400, detail="Color not unlocked")
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {selected_field: color_hex}}
    )
    
    return {"success": True, selected_field: color_hex}

@api_router.post("/game/use-streak-revive")
async def use_streak_revive(user: dict = Depends(get_current_user)):
    """Use a streak revive to restore broken streak"""
    streak_revives = user.get("streak_revives", 0)
    
    if streak_revives <= 0:
        raise HTTPException(status_code=400, detail="No streak revives available")
    
    # Restore previous streak (up to longest - 1)
    previous_streak = min(user.get("longest_streak_ever", 1), user.get("current_streak", 0) + 1)
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {
            "$inc": {"streak_revives": -1},
            "$set": {"current_streak": previous_streak}
        }
    )
    
    return {
        "success": True,
        "message": f"Streak revived! You're back at {previous_streak} days!",
        "new_streak": previous_streak,
        "streak_revives_remaining": streak_revives - 1
    }

@api_router.get("/game/level-rewards")
async def get_level_rewards(user: dict = Depends(get_current_user)):
    """Get rewards for each level"""
    rewards = []
    current_level = user.get("current_level", 1)
    user_badges = user.get("badges", [])
    
    for level, reward in LEVEL_REWARDS.items():
        rewards.append({
            "level": level,
            "gems": reward.get("gems", 0),
            "streak_revives": reward.get("streak_revives", 0),
            "badge": reward.get("badge"),
            "xp_bonus": reward.get("xp_bonus"),
            "xp_boost_24h": reward.get("xp_boost_24h"),
            "xp_boost_48h": reward.get("xp_boost_48h"),
            "unlock_color": reward.get("unlock_color"),
            "color_name": reward.get("color_name"),
            "unlock_shield": reward.get("unlock_shield"),
            "unlock_banner": reward.get("unlock_banner"),
            "unlock_animation": reward.get("unlock_animation"),
            "description": reward.get("description"),
            "rarity": reward.get("rarity"),
            "unlocked": level <= current_level,
            "claimed": reward.get("badge") in user_badges if reward.get("badge") else True
        })
    
    return rewards

@api_router.get("/game/roast")
async def get_random_roast(category: str = "missed_habit", user: dict = Depends(get_current_user)):
    """Get a random roast message"""
    if user.get("app_mode") != "game":
        return {"roast": None}
    
    return {
        "roast": get_roast(category, streak=user.get("current_streak", 0), level=user.get("current_level", 1))
    }

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "HabitRPG API is running"}

# ==================== PUBLIC PROFILE ENDPOINT ====================

@api_router.get("/profile/{username}")
async def get_public_profile(username: str):
    """Public profile - no auth required"""
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_public", True):
        raise HTTPException(status_code=403, detail="Profile is private")
    
    earned_titles = get_earned_titles(user)
    equipped_anim_data = SHOP_ANIMATIONS.get(user.get("equipped_animation"), None)
    equipped_banner_data = SHOP_BANNERS.get(user.get("equipped_banner"), None)
    equipped_icon_data = SHOP_ICONS.get(user.get("equipped_icon"), None)
    equipped_deco_data = SHOP_DECORATIONS.get(user.get("equipped_decoration"), None) or SHOP_BATTLE_EFFECTS.get(user.get("equipped_decoration"), None)

    return {
        "username": user.get("username", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "current_level": user.get("current_level", 1),
        "level_name": user.get("level_name", "Rookie"),
        "total_xp_all_time": user.get("total_xp_all_time", 0),
        "current_streak": user.get("current_streak", 0),
        "longest_streak_ever": user.get("longest_streak_ever", 0),
        "total_habits_completed": user.get("total_habits_completed", 0),
        "total_hours_tracked": user.get("total_hours_tracked", 0),
        "member_since": user.get("created_at", ""),
        "selected_main_color": user.get("selected_main_color", "#1F2937"),
        "selected_banner_color": user.get("selected_banner_color", "#1F2937"),
        "badges": user.get("badges", []),
        "app_mode": user.get("app_mode", "focus"),
        "equipped_title": user.get("equipped_title"),
        "equipped_icon": equipped_icon_data,
        "equipped_animation": equipped_anim_data,
        "equipped_banner": equipped_banner_data,
        "equipped_decoration": equipped_deco_data,
        "earned_titles": earned_titles,
    }


@api_router.get("/profile/me/titles")
async def get_my_titles(user: dict = Depends(get_current_user)):
    """Get all earned and equipped titles for current user"""
    earned = get_earned_titles(user)
    return {
        "earned_titles": earned,
        "equipped_title": user.get("equipped_title"),
    }


@api_router.put("/profile/me/equip")
async def equip_profile_item(body: dict = Body(...), user: dict = Depends(get_current_user)):
    """Equip a profile item (title, icon, animation, banner)"""
    item_type = body.get("type")  # title, icon, animation, banner
    item_key = body.get("key")  # the key or title string
    user_id = str(user["_id"])

    if item_type == "title":
        earned = get_earned_titles(user)
        earned_names = [t["title"] for t in earned]
        if item_key and item_key not in earned_names:
            raise HTTPException(status_code=400, detail="Title not earned yet")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"equipped_title": item_key}})
    elif item_type == "icon":
        if item_key and item_key not in user.get("unlocked_icons", []):
            raise HTTPException(status_code=400, detail="Icon not owned")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"equipped_icon": item_key}})
    elif item_type == "animation":
        if item_key and item_key not in user.get("unlocked_animations", []):
            raise HTTPException(status_code=400, detail="Animation not owned")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"equipped_animation": item_key}})
    elif item_type == "banner":
        if item_key and item_key not in user.get("unlocked_banners", []):
            raise HTTPException(status_code=400, detail="Banner not owned")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"equipped_banner": item_key}})
    elif item_type == "decoration":
        if item_key and item_key not in user.get("unlocked_decorations", []):
            raise HTTPException(status_code=400, detail="Decoration not owned")
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"equipped_decoration": item_key}})
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")

    return {"message": f"{item_type} equipped", "key": item_key}


@api_router.get("/shop/profile-items")
async def get_shop_profile_items(user: dict = Depends(get_current_user)):
    """Get all purchasable profile items"""
    unlocked_icons = user.get("unlocked_icons", [])
    unlocked_anims = user.get("unlocked_animations", [])
    unlocked_banners = user.get("unlocked_banners", [])
    unlocked_decos = user.get("unlocked_decorations", [])

    icons = [{"key": k, **v, "owned": k in unlocked_icons} for k, v in SHOP_ICONS.items()]
    animations = [{"key": k, **v, "owned": k in unlocked_anims} for k, v in SHOP_ANIMATIONS.items()]
    banners = [{"key": k, **v, "owned": k in unlocked_banners} for k, v in SHOP_BANNERS.items()]
    decorations = [{"key": k, **v, "owned": k in unlocked_decos} for k, v in SHOP_DECORATIONS.items()]
    battles = [{"key": k, **v, "owned": k in unlocked_decos} for k, v in SHOP_BATTLE_EFFECTS.items()]

    return {"icons": icons, "animations": animations, "banners": banners, "decorations": decorations, "battles": battles}


@api_router.post("/shop/buy-profile-item")
async def buy_profile_item(body: dict = Body(...), user: dict = Depends(get_current_user)):
    """Buy a profile item (icon, animation, banner)"""
    item_type = body.get("type")
    item_key = body.get("key")
    user_id = str(user["_id"])
    gems = user.get("gems", 0)

    if item_type == "icon":
        catalog = SHOP_ICONS
        field = "unlocked_icons"
    elif item_type == "animation":
        catalog = SHOP_ANIMATIONS
        field = "unlocked_animations"
    elif item_type == "banner":
        catalog = SHOP_BANNERS
        field = "unlocked_banners"
    elif item_type == "decoration":
        catalog = {**SHOP_DECORATIONS, **SHOP_BATTLE_EFFECTS}
        field = "unlocked_decorations"
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")

    item = catalog.get(item_key)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_key in user.get(field, []):
        raise HTTPException(status_code=400, detail="Already owned")
    if gems < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough gems")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"gems": -item["price"]}, "$push": {field: item_key}}
    )
    return {"message": f"Purchased {item['name']}!", "gems_remaining": gems - item["price"]}


FOCUS_SHOP_ITEMS = {
    "focus_xp_2x": {"name": "x2 XP Boost", "description": "Double XP for 24 hours", "price": 80, "field": "xp_boost_uses", "max": 3},
    "focus_xp_3x": {"name": "x3 XP Boost", "description": "Triple XP for 24 hours", "price": 150, "field": "xp_triple_boost_uses", "max": 3},
    "focus_streak_shield": {"name": "Streak Shield", "description": "Protects streak for 1 missed day", "price": 100, "field": "streak_shields", "max": 4},
    "focus_streak_revive": {"name": "Streak Revive", "description": "Restores a broken streak", "price": 200, "field": "streak_revives", "max": 3},
}


@api_router.get("/focus/shop")
async def get_focus_shop(user: dict = Depends(get_current_user)):
    """Focus Mode shop - 4 items only"""
    items = []
    for key, item in FOCUS_SHOP_ITEMS.items():
        owned = user.get(item["field"], 0)
        items.append({
            "id": key,
            "name": item["name"],
            "description": item["description"],
            "price": item["price"],
            "owned": owned,
            "max": item["max"],
        })
    return {"items": items, "gems": user.get("gems", 0)}


@api_router.post("/focus/shop/buy/{item_id}")
async def buy_focus_shop_item(item_id: str, user: dict = Depends(get_current_user)):
    """Buy an item from Focus Mode shop"""
    item = FOCUS_SHOP_ITEMS.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    user_id = str(user["_id"])
    gems = user.get("gems", 0)
    owned = user.get(item["field"], 0)

    if owned >= item["max"]:
        raise HTTPException(status_code=400, detail="Already at max capacity")
    if gems < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough gems")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"gems": -item["price"], item["field"]: 1}}
    )
    return {"message": f"Purchased {item['name']}!", "gems_remaining": gems - item["price"]}

# ==================== INCLUDE ROUTERS ====================

api_router.include_router(auth_router)
api_router.include_router(habits_router)
api_router.include_router(users_router)

# ==================== ADMIN ENDPOINTS ====================
admin_router = APIRouter(prefix="/admin", tags=["admin"])
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "habitrpg-admin-2026")

async def verify_admin(request: Request):
    auth = request.headers.get("X-Admin-Secret", "")
    if auth != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

@admin_router.post("/auth")
async def admin_auth(body: dict = Body(...)):
    if body.get("secret") != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    return {"authenticated": True}

@admin_router.get("/stats")
async def admin_stats(_=Depends(verify_admin)):
    total_users = await db.users.count_documents({})
    today = datetime.now(timezone.utc).date().isoformat()
    active_today = await db.daily_logs.count_documents({"date": today})
    total_habits = await db.habits.count_documents({})
    total_completions = 0
    async for u in db.users.find({}, {"total_habits_completed": 1, "_id": 0}):
        total_completions += u.get("total_habits_completed", 0)

    top_xp = []
    async for u in db.users.find({}, {"_id": 0, "email": 1, "username": 1, "total_xp_all_time": 1, "current_level": 1}).sort("total_xp_all_time", -1).limit(10):
        top_xp.append(u)

    top_streaks = []
    async for u in db.users.find({}, {"_id": 0, "email": 1, "username": 1, "longest_streak_ever": 1, "current_streak": 1}).sort("longest_streak_ever", -1).limit(10):
        top_streaks.append(u)

    top_gems = []
    async for u in db.users.find({}, {"_id": 0, "email": 1, "username": 1, "gems": 1}).sort("gems", -1).limit(10):
        top_gems.append(u)

    return {
        "total_users": total_users,
        "active_today": active_today,
        "total_habits": total_habits,
        "total_completions": total_completions,
        "top_xp": top_xp,
        "top_streaks": top_streaks,
        "top_gems": top_gems,
    }

@admin_router.get("/users")
async def admin_list_users(q: str = "", _=Depends(verify_admin)):
    query = {}
    if q:
        query = {"$or": [
            {"email": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
            {"first_name": {"$regex": q, "$options": "i"}},
        ]}
    users = []
    async for u in db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(100):
        users.append(u)
    return {"users": users}

@admin_router.get("/users/{email}")
async def admin_get_user(email: str, _=Depends(verify_admin)):
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    habits = await db.habits.find({"user_id": email}, {"_id": 0}).to_list(100)
    return {"user": user, "habits": habits}

@admin_router.put("/users/{email}")
async def admin_update_user(email: str, body: dict = Body(...), _=Depends(verify_admin)):
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = [
        "gems", "current_xp", "current_level", "level_name", "current_streak",
        "longest_streak_ever", "total_xp_all_time", "total_habits_completed",
        "streak_shields", "streak_revives", "xp_boost_uses", "xp_triple_boost_uses",
        "xp_quad_boost_uses", "xp_penta_boost_uses", "xp_hexa_boost_uses",
        "app_mode", "is_public", "equipped_title", "equipped_icon",
        "equipped_animation", "equipped_banner", "equipped_decoration",
        "selected_main_color", "selected_banner_color",
    ]
    updates = {k: v for k, v in body.items() if k in allowed}

    # Handle array fields (grant items)
    array_fields = [
        "unlocked_main_colors", "unlocked_banner_colors", "unlocked_icons",
        "unlocked_animations", "unlocked_banners", "unlocked_decorations", "badges",
    ]
    add_to_set = {}
    for field in array_fields:
        if field in body and body[field]:
            if isinstance(body[field], list):
                add_to_set[field] = {"$each": body[field]}
            else:
                add_to_set[field] = body[field]

    update_ops = {}
    if updates:
        update_ops["$set"] = updates
    if add_to_set:
        update_ops["$addToSet"] = add_to_set

    if update_ops:
        await db.users.update_one({"email": email}, update_ops)

    return {"message": f"User {email} updated", "fields_updated": list(updates.keys()) + list(add_to_set.keys())}

@admin_router.delete("/users/{email}")
async def admin_delete_user(email: str, _=Depends(verify_admin)):
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"email": email})
    await db.habits.delete_many({"user_id": email})
    await db.daily_logs.delete_many({"user_id": user["_id"]})
    return {"message": f"User {email} deleted"}

@admin_router.get("/shop")
async def admin_shop_status(_=Depends(verify_admin)):
    config = await db.shop_config.find_one({}, {"_id": 0})
    items = await db.shop_inventory.find({}, {"_id": 0}).to_list(50)
    return {"config": config, "items": items}

@admin_router.post("/shop/restock")
async def admin_force_restock(_=Depends(verify_admin)):
    await db.shop_inventory.delete_many({})
    await db.shop_config.delete_many({})
    return {"message": "Shop cleared. Will restock on next visit."}

api_router.include_router(admin_router)
app.include_router(api_router)

# ==================== CORS ====================

frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('CORS_ORIGINS', '*'))
origins = frontend_url.split(',') if ',' in frontend_url else [frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins if origins[0] != '*' else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== STARTUP ====================

async def seed_admin():
    """Seed admin and test users on startup"""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@habitrpg.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    
    now = datetime.now(timezone.utc)
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"email": admin_email})
    if existing_admin is None:
        admin_doc = {
            "email": admin_email,
            "username": "Admin" + str(random.randint(1000, 9999)),
            "first_name": "Admin",
            "last_name": "User",
            "password_hash": hash_password(admin_password),
            "created_at": now.isoformat(),
            "onboarding_completed": True,
            "main_goal": "levelup",
            "download_reason": "discipline",
            "consistency_level": "fire",
            "accountability_style": "progress",
            "app_mode": "game",
            "current_xp": 525,
            "current_level": 4,
            "level_name": "Achiever",
            "total_xp_all_time": 525,
            "highest_level_reached": 4,
            "longest_streak_ever": 7,
            "current_streak": 3,
            "total_habits_completed": 20,
            "gems": 500,
            "streak_revives": 2,
            "streak_shields": 1,
            "xp_boost_uses": 0,
            "xp_triple_boost_uses": 0,
            "xp_quad_boost_uses": 0,
            "last_completion_timestamp": (now - timedelta(hours=20)).isoformat(),
            "badges": ["early_bird", "contender", "achiever"],
            "inventory": [],
            "selected_main_color": "#3B82F6",
            "selected_banner_color": "#8B5CF6",
            "unlocked_main_colors": ["#3B82F6"],
            "unlocked_banner_colors": ["#8B5CF6"],
            "is_public": True,
            "role": "admin",
            "notification_settings": {"push_enabled": True, "reminders_enabled": True, "roast_enabled": True}
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin user created: {admin_email}")
    else:
        # Add new fields if missing
        update_fields = {"password_hash": hash_password(admin_password)}
        for field, default in [
            ("username", "Admin" + str(random.randint(1000, 9999))),
            ("streak_shields", 1),
            ("xp_triple_boost_uses", 0),
            ("xp_quad_boost_uses", 0),
            ("last_completion_timestamp", (now - timedelta(hours=20)).isoformat()),
            ("selected_main_color", "#3B82F6"),
            ("selected_banner_color", "#8B5CF6"),
            ("unlocked_main_colors", ["#3B82F6"]),
            ("unlocked_banner_colors", ["#8B5CF6"]),
            ("is_public", True),
        ]:
            if field not in existing_admin:
                update_fields[field] = default
        
        current_xp = existing_admin.get("current_xp", 0)
        correct_level = get_level_info(current_xp)
        if existing_admin.get("current_level") != correct_level["level"]:
            update_fields["current_level"] = correct_level["level"]
            update_fields["level_name"] = correct_level["name"]
        
        await db.users.update_one({"email": admin_email}, {"$set": update_fields})
        logger.info(f"Admin user updated: {admin_email}")
    
    # Create test user
    test_email = "test@habitrpg.com"
    test_password = "Test123!"
    existing_test = await db.users.find_one({"email": test_email})
    if existing_test is None:
        test_doc = {
            "email": test_email,
            "username": "Test" + str(random.randint(1000, 9999)),
            "first_name": "Test",
            "last_name": "User",
            "password_hash": hash_password(test_password),
            "created_at": now.isoformat(),
            "onboarding_completed": True,
            "main_goal": "active",
            "download_reason": "fun",
            "consistency_level": "better",
            "accountability_style": "rewards",
            "app_mode": "focus",
            "current_xp": 150,
            "current_level": 2,
            "level_name": "Apprentice",
            "total_xp_all_time": 150,
            "highest_level_reached": 2,
            "longest_streak_ever": 5,
            "current_streak": 2,
            "total_habits_completed": 8,
            "gems": 100,
            "streak_revives": 1,
            "streak_shields": 0,
            "xp_boost_uses": 0,
            "xp_triple_boost_uses": 0,
            "xp_quad_boost_uses": 0,
            "last_completion_timestamp": (now - timedelta(hours=20)).isoformat(),
            "badges": ["early_bird"],
            "inventory": [],
            "selected_main_color": "#1F2937",
            "selected_banner_color": "#1F2937",
            "unlocked_main_colors": [],
            "unlocked_banner_colors": [],
            "is_public": True,
            "role": "user",
            "notification_settings": {"push_enabled": True, "reminders_enabled": True, "roast_enabled": False}
        }
        await db.users.insert_one(test_doc)
        logger.info(f"Test user created: {test_email}")
    else:
        update_test = {"password_hash": hash_password(test_password)}
        for field, default in [("username", "Test" + str(random.randint(1000, 9999))), ("streak_shields", 0), ("xp_triple_boost_uses", 0), ("xp_quad_boost_uses", 0), ("selected_main_color", "#1F2937"), ("selected_banner_color", "#1F2937"), ("unlocked_main_colors", []), ("unlocked_banner_colors", []), ("is_public", True), ("last_completion_timestamp", None), ("gems", 100)]:
            if field not in existing_test:
                update_test[field] = default
        await db.users.update_one({"email": test_email}, {"$set": update_test})
        logger.info(f"Test user updated: {test_email}")

    # Initialize shop config
    await db.shop_config.update_one(
        {"_id": "global"},
        {"$setOnInsert": {
            "last_restock_timestamp": now.isoformat(),
            "next_restock_timestamp": now.isoformat()
        }},
        upsert=True
    )

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True, sparse=True)
    await db.habits.create_index([("user_id", 1), ("habit_id", 1)])
    await db.daily_logs.create_index([("user_id", 1), ("date", 1)])
    await db.login_attempts.create_index("identifier")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    logger.info("Database indexes created")
    
    # Seed admin and test users
    await seed_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
