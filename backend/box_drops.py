"""
Mystery Box drop tables — mirror of /app/frontend/src/data/boxDrops.js.
Server-side roll is authoritative; client only displays animation + receives results.
Per-item percentages are EXACT and sum to 100.0% per box.
"""
from __future__ import annotations
import random
from typing import List, Dict, Any

# Shared titles between Delta and Phase pools
SHARED_TITLES = ["Overkill", "Vermin", "Relentless"]

DELTA_UNIQUE_TITLES = [
    "Enforcer", "Vandal", "Hollow", "Menace", "Phantom", "Savage",
    "Grinder", "Heavy", "Stray", "Rebel", "Drifter", "Grit", "Zero",
]

PHASE_UNIQUE_TITLES = [
    "God-Complex", "Anti-Hero", "Anomaly", "Havoc", "Despair", "Malice",
    "Wrath", "Executioner", "Nightfall", "Vengeance", "Untouchable",
    "Cataclysm", "Ruin",
]

PHASE_COLORS = ["Cobalt", "Sapphire", "Steel", "Ice"]


def _item(id_: str, name: str, type_: str, tier: str, percent: float, **extra) -> Dict[str, Any]:
    return {"id": id_, "name": name, "type": type_, "tier": tier, "percent": percent, **extra}


STARTER_POOL: List[Dict[str, Any]] = [
    # Common 65.0%
    _item("xp_2x_5",  "x2 XP Boost (5 min)",  "boost", "common", 13.0, meta={"multiplier": 2, "duration": 5}),
    _item("xp_2x_10", "x2 XP Boost (10 min)", "boost", "common", 13.0, meta={"multiplier": 2, "duration": 10}),
    _item("xp_2x_20", "x2 XP Boost (20 min)", "boost", "common", 13.0, meta={"multiplier": 2, "duration": 20}),
    _item("shield_1", "Streak Shield",        "shield", "common", 13.0),
    _item("gems_s",   "Gems (5–15)",          "gems",  "common", 13.0, meta={"min": 5, "max": 15}),
    # Rare 35.0%
    _item("title_sprout", "Sprout", "title", "rare", 5.8, source="starter"),
    _item("title_cinder", "Cinder", "title", "rare", 5.8, source="starter"),
    _item("title_pace",   "Pace",   "title", "rare", 5.8, source="starter"),
    _item("title_drift",  "Drift",  "title", "rare", 5.8, source="starter"),
    _item("title_spark",  "Spark",  "title", "rare", 5.8, source="starter"),
    _item("banner_starter", "Starter Banner", "banner", "rare", 6.0, source="starter"),
]

DELTA_POOL: List[Dict[str, Any]] = (
    [
        # Common 65.0%
        _item("xp_2x_5_d",  "x2 XP Boost (5 min)",  "boost", "common", 8.1, meta={"multiplier": 2, "duration": 5}),
        _item("xp_2x_10_d", "x2 XP Boost (10 min)", "boost", "common", 8.1, meta={"multiplier": 2, "duration": 10}),
        _item("xp_2x_20_d", "x2 XP Boost (20 min)", "boost", "common", 8.1, meta={"multiplier": 2, "duration": 20}),
        _item("xp_3x_5_d",  "x3 XP Boost (5 min)",  "boost", "common", 8.1, meta={"multiplier": 3, "duration": 5}),
        _item("xp_3x_10_d", "x3 XP Boost (10 min)", "boost", "common", 8.1, meta={"multiplier": 3, "duration": 10}),
        _item("xp_3x_20_d", "x3 XP Boost (20 min)", "boost", "common", 8.1, meta={"multiplier": 3, "duration": 20}),
        _item("shield_d",   "Streak Shield",        "shield", "common", 8.1),
        _item("gems_m",     "Gems (50–150)",        "gems",   "common", 8.3, meta={"min": 50, "max": 150}),
        # Rare — Color + Banner
        _item("color_delta",  "Delta Avatar Accent Color", "color",  "rare", 4.0, source="delta"),
        _item("banner_delta", "Delta Banner",              "banner", "rare", 4.0, source="delta"),
    ]
    # Unique Delta titles × 1.5%
    + [_item(f"title_delta_{t.lower()}", t, "title", "rare", 1.5, source="delta") for t in DELTA_UNIQUE_TITLES]
    # Shared titles × 2.5% (boosted in Delta)
    + [_item(f"title_shared_{t.lower()}_delta", t, "title", "rare", 2.5,
             source="delta", shared=True, tier_tag="DELTA") for t in SHARED_TITLES]
)

PHASE_POOL: List[Dict[str, Any]] = (
    [
        # Common 56.0%
        _item("shield_p",   "Streak Shield",        "shield", "common", 7.0),
        _item("xp_3x_5_p",  "x3 XP Boost (5 min)",  "boost",  "common", 7.0, meta={"multiplier": 3, "duration": 5}),
        _item("xp_3x_10_p", "x3 XP Boost (10 min)", "boost",  "common", 7.0, meta={"multiplier": 3, "duration": 10}),
        _item("xp_3x_20_p", "x3 XP Boost (20 min)", "boost",  "common", 7.0, meta={"multiplier": 3, "duration": 20}),
        _item("xp_4x_5_p",  "x4 XP Boost (5 min)",  "boost",  "common", 7.0, meta={"multiplier": 4, "duration": 5}),
        _item("xp_4x_10_p", "x4 XP Boost (10 min)", "boost",  "common", 7.0, meta={"multiplier": 4, "duration": 10}),
        _item("xp_4x_20_p", "x4 XP Boost (20 min)", "boost",  "common", 7.0, meta={"multiplier": 4, "duration": 20}),
        _item("gems_l",     "Gems (150–400)",       "gems",   "common", 7.0, meta={"min": 150, "max": 400}),
    ]
    # Rare 31.5% — 4 colors × 6 + banner × 7.5
    + [_item(f"color_phase_{c.lower()}", f"{c} Avatar Color", "color", "rare", 6.0, source="phase") for c in PHASE_COLORS]
    + [_item("banner_phase", "Phase Banner", "banner", "rare", 7.5, source="phase")]
    # UR 12.5%
    + [
        _item("anim_profile", "Profile Animation Unlock", "animation", "ultra", 1.5, source="phase"),
        _item("anim_logo",    "Logo Animation Unlock",    "logo_anim", "ultra", 1.5, source="phase"),
        _item("ui_accent",    "Accent UI Color Unlock",   "ui_color",  "ultra", 1.5, source="phase"),
    ]
    + [_item(f"title_phase_{t.lower().replace('-', '_')}", t, "title", "ultra", 0.5, source="phase")
       for t in PHASE_UNIQUE_TITLES]
    + [_item(f"title_shared_{t.lower()}_phase", t, "title", "ultra", 0.5,
             source="phase", shared=True, tier_tag="PHASE") for t in SHARED_TITLES]
)

BOXES: Dict[str, Dict[str, Any]] = {
    "starter": {"id": "starter", "name": "Starter Box", "label": "STARTER", "cost": 100, "drops_per_open": 2, "pool": STARTER_POOL},
    "delta":   {"id": "delta",   "name": "Delta Box",   "label": "DELTA",   "cost": 500, "drops_per_open": 2, "pool": DELTA_POOL},
    "phase":   {"id": "phase",   "name": "Phase Box",   "label": "PHASE",   "cost": 2000, "drops_per_open": 3, "pool": PHASE_POOL},
}

# Sanity check (boots-time)
for _b in BOXES.values():
    _s = round(sum(i["percent"] for i in _b["pool"]), 4)
    assert abs(_s - 100.0) < 0.001, f"{_b['id']} pool sums to {_s}, expected 100"


def roll_one(pool: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Weighted random pick. percents sum to 100."""
    r = random.uniform(0.0, 100.0)
    cum = 0.0
    for item in pool:
        cum += item["percent"]
        if r < cum:
            return item
    return pool[-1]  # fp safety


def roll_box(box_id: str) -> List[Dict[str, Any]]:
    box = BOXES[box_id]
    items = [roll_one(box["pool"]) for _ in range(box["drops_per_open"])]
    # Resolve gem ranges into concrete amounts at roll time
    resolved = []
    for it in items:
        copy = dict(it)
        if copy["type"] == "gems" and "meta" in copy:
            mn, mx = copy["meta"]["min"], copy["meta"]["max"]
            copy["amount"] = random.randint(mn, mx)
        resolved.append(copy)
    return resolved
