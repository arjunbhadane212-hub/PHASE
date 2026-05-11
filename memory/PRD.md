# HabitRPG - Product Requirements Document

## Original Problem Statement
Build a full-stack gamified life improvement web app (HabitRPG style). Turn real daily habits into XP, levels, and streaks. Features: Marketing Landing Page, Auth, Onboarding, Core App with tabs. Two modes: Focus Mode (clean, minimal) and Game Mode (gamified with animations, gems, shop, rewards).

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI + Lucide Icons + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (motor async)
- Auth: JWT Bearer tokens (localStorage + Axios interceptors)
- Fonts: Satoshi / General Sans
- Sound: Web Audio API (non-continuous, one-shot)

## What's Been Implemented

### Phase 1 - Foundation
1-9. Landing Page, JWT Auth, Onboarding, Dashboard, Habit System, Level System, Progress Page, Settings, Dual UI Modes

### Phase 2 - Game Economy
10-12. Gems System, Level-up bonus, GameContext

### Phase 3 - Design & UX Overhaul
13-23. Glassmorphism, SVG Icons, Streak Card, XP Pop, Shop, Auth Persistence, Animations

### Phase 4 - Discipline-Mode Overhaul V4
24-33. CSS Dual-Mode Tokens, Dynamic User Colors, PWA Detection, Focus Mode Stripping, Nav Restructure, Sound Engine, Discord-Style Profile, Shop RPG Redesign

### Phase 5 - Progress + Appearance + Dark Overhaul
34-38. Progress Section (standalone tab), Light Mode Toggle, Deep Dark Background, Monthly Progress API, Gems Tracking

### Phase 6 - Titles, Profile Customization & Shop Expansion (2026-04-21)
39. Milder Roasts - All roast messages toned down to be vague/encouraging instead of harsh
40. Sound Fix - Removed continuous/annoying sounds, kept only short one-shot: habitComplete, levelUp, purchase
41. Mobile Shop - Full responsive grid (2-col mobile, 3-col desktop), scrollable tab pills
42. Progress cleanup - Removed all-time stats from Progress (stays in Settings only)
43. Streak Titles (13 tiers) - Rookie(10d) through The Sovereign Overlord(1000d) with Brawl Stars shiny effects
44. Time Titles (9 tiers) - Timekeeper(25h) through Eternity's Edge(1000h)
45. Title rarity CSS - common(gray), rare(blue glow), epic(purple glow), legendary(gold shine), mythic(rainbow gradient shift)
46. Shop Icons - 9 purchasable profile icons (Flame Emblem, Star Core, Diamond Soul, Crown Royal, Thunder Strike, Shadow Skull, Dragon Eye, Phoenix Rise, Void Emblem)
47. Shop Animations - 30 purchasable CSS animations (Pulse, Glow, Neon Ring, Aurora, Fire Ring, Shadow Flame, Supernova, Divine Light, etc.)
48. Shop Banners - 8 exclusive gradient banners (Midnight, Sunset Blaze, Northern Lights, Galaxy, Void Walker, etc.)
49. x5 & x6 XP Boosts - Shop exclusive, ultra-rare boosts
50. Profile Customization Section - In Settings, equip titles/icons/animations/banners
51. Customizable Public Profile - Shows equipped title with rarity shimmer, equipped icon as avatar, equipped animation on avatar, equipped gradient banner
52. Profile Items API - GET /api/shop/profile-items, POST /api/shop/buy-profile-item, GET /api/profile/me/titles, PUT /api/profile/me/equip

## Database Schema
- Users: + total_hours_tracked, equipped_title, equipped_icon, equipped_animation, equipped_banner, unlocked_titles, unlocked_icons, unlocked_animations, unlocked_banners, xp_penta_boost_uses, xp_hexa_boost_uses

## Key API Endpoints (New)
- GET /api/shop/profile-items - List all purchasable icons/animations/banners
- POST /api/shop/buy-profile-item - Buy icon/animation/banner
- GET /api/profile/me/titles - Get earned + equipped titles
- PUT /api/profile/me/equip - Equip title/icon/animation/banner
- GET /api/progress/monthly - 30-day progress data

### Phase 7 — Leaderboard, Admin & Profiles (2026-04-28)
53. Leaderboard screen (`LeaderboardPage.js`) with tier colors + rank animations
54. Admin Dashboard (`AdminPage.js`) — Overview / Users / Shop tabs (secret: habitrpg-admin-2026)
55. 30 Premium Battle Scenes (Dragon vs Samurai etc., 7000 gems tier)
56. Full-width Discord-style profile banners with animations

### Phase 8 — Focus Mode Session & Roast System (2026-02-XX)
57. Roast Notification System — `/api/roasts/check` (polled every 5 min), `/api/session/abandon`, Settings toggle `roast_enabled`, daily cap of 2 roasts/user
58. Full-screen Focus Session Timer (`FocusSession.js`) — replaces Focus Mode checkbox with "Begin" button per habit
59. Abandon penalty: −30 gems (clamped to min(30, gems)), consumes streak shield if available, fires roast toast via `phase-roast` CustomEvent
60. `shield_consumed` flag returned by `/api/session/abandon`; frontend shows context-aware toast ("Streak shield consumed" vs "−N gems" vs "Session abandoned")
61. Backend tests: `/app/backend/tests/test_roast_session_v11.py` 11/11 PASSED; frontend Playwright verified full Begin → Timer → Abandon → Roast flow

## Next Action Items
- P1: Native Push Notifications / Live Activities (PWA Web Push for web/Android; iOS limitations)
- P1: Achievement badges system
- P1: Weekly challenges
- P2: Refactor server.py (2300+ lines) into modular route files (/routes/auth.py, /routes/shop.py, /routes/session.py)
- Track total_hours_tracked properly (currently 0 for all users)

## Future/Backlog
- Google OAuth / Apple OAuth
- Friends / social
- Native shell wrapper (Capacitor) for full iOS/Android notifications
