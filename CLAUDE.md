# CLAUDE.md — Phase App
> Read this file at the start of every session, every time. This is the single source of truth for the Phase codebase. Do not make assumptions about brand, design, or logic that conflict with anything written here.

---

## What Phase Is

Phase is a gamified habit-tracking app. The entire product is built around one thesis: **discipline as a public social identity**. Phase is the first app that makes discipline something users flex publicly — not just track privately.

**Tagline:** "Move with us — Discipline in your pocket."
**One-line pitch:** Duolingo meets life RPG.

Every feature decision filters through this lens. If a feature doesn't reinforce discipline as a social identity, it doesn't ship.

---

## Tech Stack

- **Frontend:** React (CRACO / Create React App — Emergent.sh generated)
- **Styling:** Tailwind CSS
- **Platform:** Web app (mobile-responsive)
- **Repo:** GitHub (connected via GitHub CLI)
- **Deployment target:** Vercel
- **Landing page stack (separate):** React / TypeScript / Tailwind / shadcn/ui / Framer Motion

---

## Color System — CRITICAL, READ FIRST

**Blue is the ONLY brand color. This is a hard, locked rule.**

Purple appears in the current codebase in several places. This is a bug inherited from the original Figma/Emergent template — NOT an intentional design choice. Every instance of purple must be replaced with the blue system below. Do not add purple. Do not preserve purple. If you see purple in any component, flag it and replace it.

### Core Hex Values
```
Background:       #0A0E14  (near-black — not navy-grey, not #0F172A)
Card fill:        #11161F
Card border:      #1E2530
Primary blue:     #3B82F6
Blue glow:        #60A5FA
Muted text:       #6B7280
White text:       #FFFFFF
Destructive red:  #B91C1C  (delete/abandon actions ONLY — dark muted red)
```

### What "No Purple" Means in Practice
- XP bars → blue (#3B82F6), not purple
- Shop banners → blue palette, not purple
- Progress charts → blue only, no yellow, no purple
- Button focus rings → blue glow (#60A5FA), not purple
- Create Habit modal CTA button → blue, not purple
- Input focus states → blue ring, not purple

### Rank Color Ladder (Locked — Applied to Badges, Rings, Profile Elements)
```
Rank 1  — Rookie       #64748B  (slate-blue grey)
Rank 2  — Novice       #14B8A6  (teal)
Rank 3  — Apprentice   #06B6D4  (cyan)
Rank 4  — Adept        #38BDF8  (sky blue)
Rank 5  — Achiever     #3B82F6  (brand blue)
Rank 6  — Expert       #6366F1  (indigo)
Rank 7  — Master       #8B5CF6  (violet)
Rank 8  — Elite        #EF4444  (bright red — deliberate "danger zone before peak" beat)
Rank 9  — Champion     #A855F7  (purple)
Rank 10 — Apex         #FBBF24 + white shimmer (gold/amber — animated, the only rank with a special effect)
```

**Critical:** Elite's red (#EF4444, bright/saturated) must look visually distinct from destructive-action red (#B91C1C, dark/muted). Same hue family, completely different intent — never confuse them.

---

## Visual Style Direction

Phase is NOT a generic productivity SaaS app. Every interactive element must feel like it belongs to a gamified RPG.

- **Glassmorphism + glow effects** on modals, dropdowns, cards, and buttons
- Dark backgrounds with glowing accents — not flat dark-mode utility design
- Soft icy-blue ambient radial glows (not harsh gradients)
- **Diagonal linear gradients are banned** — they read as generic AI-generated UI
- Custom outline icon set, consistent 2px line weight, no emoji in UI elements
- Edge-lit borders that fade from both sides (not solid borders)

---

## App Architecture — Two Modes

### Game Mode
The default, competitive experience.
- XP system active
- 10 ranks (Rookie → Apex)
- Friends-first leaderboards (default — global leaderboard is secondary)
- Public profile with cosmetics, titles, rank badges
- Loot boxes
- Roast notifications: **loud, competitive, trash-talk tone**
- Full shop access (for Pro users)

### Focus Mode
The deep-work, distraction-free experience. Completely separate emotional tone.
- **No XP. No levels. No leaderboards. No shop.**
- Replaces habit checkbox with a "Begin" button
- Tapping "Begin" triggers a **full-screen timer takeover:**
  - Black background
  - Blue pulse glow
  - Large countdown display
  - Circular draining progress ring
  - Session duration: 5–60 minutes per habit, default 15 minutes
- Platform behavior: Live Activity (iOS), Foreground Service (Android), persistent top bar (browser)
- **Only in-Focus-Mode purchase:** Streak Shield button on home screen (500 gems) — NOT inside the timer, NOT in a shop screen
- Roast notifications: **quiet, personal, disappointed tone** (never trash-talk in Focus Mode)

### Focus Mode Abandonment Penalty
If user abandons a Focus Mode session early:
1. Confirmation modal fires first (prevents accidental taps)
2. If confirmed: habit fails + 30 gems deducted + streak shield consumed (if available) + consistency score drops visibly + roast notification fires within 5 seconds
3. No OS-level app locking (iOS restriction) — psychological guilt via persistent Live Activity is the mechanism

---

## Daily Habit System

- Habits are organized across **Morning / Afternoon / Night** slots
- Each habit is assigned a Difficulty at creation
- Difficulty determines XP + Gem reward (shown inline in the difficulty dropdown)

### Reward Values
```
Easy:    +10 XP (placeholder — NOT confirmed)   +5 gems (placeholder — NOT confirmed)
Medium:  +25 XP (CONFIRMED from live screenshot) +10 gems (CONFIRMED)
Hard:    +50 XP (placeholder — NOT confirmed)   +20 gems (placeholder — NOT confirmed)
```
⚠️ Only Medium values are confirmed. Easy and Hard are placeholders until Arjun provides real numbers.

---

## Economy System

**Core loop:** Complete habits → earn Gems → buy Loot Boxes → unlock cosmetics/titles/profile effects.

**Hard rule:** Gems are NEVER purchased with real money. The gem economy is completely separate from the subscription revenue model. Do not add any real-money gem purchase flow.

### Shop Categories
Boosts, Colors, Anims, Banners, Effects, Battles

### Profile Effects (all 3,000 gems each)
- Flame Ring
- Frost Ring
- Lightning Arc
- Galaxy Spiral

### Loot Box Tiers — Starter → Delta → Phase
```
Starter Box:  Basic cosmetics, small XP boosts, high drop probability
Delta Box:    Exclusive titles (Enforcer, Vandal, Phantom, Savage), animated badges, exclusive colors, medium drop probability
Phase Box:    Premium titles (God-Complex, Anti-Hero, Anomaly, Executioner, Cataclysm), VERY low drop probability, box-only (NOT directly purchasable with gems)
```

**Reward direction rule (locked):**
- Lower-tier items may appear as the "floor" reward inside a higher-tier box (cushions bad pulls)
- Higher-tier exclusive items NEVER appear in lower-tier boxes (protects rarity prestige)
- The Phase Box is deliberately the free marketing engine — people screenshot Phase-tier pulls and post them

**Dead naming systems — do NOT reference:**
- ~~Common / Rare / Ultra-rare~~ → DEAD
- ~~Common / Rare / Legendary with 80/15/5 weights~~ → DEAD
- Current names are: **Starter / Delta / Phase**

---

## Public Profile

The public profile is the **core flex screen and the primary organic growth driver.** Users screenshot it and post it publicly — this drives organic installs. It must always be free.

### Layout Spec (Redesign)

**Header:**
- Avatar: 96px circle, 4px ring colored by rank tier with matching glow
- Name: bold white, 24px
- Username: muted grey, 14px
- Two badge pills side by side: Rank badge (solid fill per rank color + glow) + Streak badge (solid fill/glow per streak tier)

**Streak Hero Widget (full-width card, NOT in stat grid):**
- Large flame icon + massive streak number + "DAY STREAK" label
- Glow/color tiers:
  - 0 days → dead grey, no glow
  - 1–6 days → orange
  - 7–29 days → amber
  - 30–99 days → gold, pulse animation
  - 100+ days → white-hot core + gold glow, animated loop (the "screenshot it" tier)

**Secondary Stat Grid (smaller, quieter):**
- Total XP, Longest Streak, Habits Done
- Blue iconography only — no purple, no green, no yellow

**Footer:** "Member since [date]" — small, muted, low visual priority

---

## Monetization — Free vs Pro

**Pricing:**
```
Free:           $0 forever
Phase Pro:      $6.99/month
Phase Pro Annual: $49.99/year (~$4.17/mo — primary push, "Save 40%")
```

### Free Tier Includes
- Unlimited habit creation (all time slots)
- Full Focus Mode (timer, Begin button, abandonment penalties)
- XP and streak tracking
- Ranks 1–5 (Rookie → Achiever)
- Public profile — always free, always shareable (this is the growth engine, never gate it)
- Consistency score on home screen
- Basic roast notifications (2/day max, toggleable)
- Gems earned — but shop is locked

### Locked Behind Pro
- Ranks 6–10 (Expert → Apex)
- Loot boxes and opening animation
- Full cosmetic shop
- Streak Shield purchase
- Title and banner equipping
- Detailed analytics (weekly/monthly charts, heatmap)
- Full leaderboard standings
- Profile effects

### Hard Rules — Never Violate
- No hard paywall on install
- No ads ever
- No real-money gem purchases
- No pay-to-win mechanics (Pro is cosmetic/social status only)
- No XP doublers in Focus Mode
- Public profile is always free

### Conversion Trigger Points
| Trigger | What User Sees |
|---|---|
| Rank 5 completion | "You've reached Achiever. Apex awaits — unlock Pro to keep climbing." |
| First loot box earned | Box visible but locked — "Open with Pro" |
| Leaderboard tap | Blurred list — "See where you really rank" |
| Profile effect browse | Preview animation then gate |

---

## Roast Notifications

- Max **2 per day**, toggleable in Settings
- **Never repeat consecutively** (no same roast twice in a row)
- **Game Mode tone:** loud, competitive, trash-talk
- **Focus Mode tone:** quiet, personal, disappointed
- Fire within 5 seconds of a Focus Mode abandonment

---

## Roadmap — What's Built vs What Comes Later

```
v1 Launch (current):  Habits, XP, streak, basic shop, public profile, loot boxes
Update 1:             Titles + loot items
Update 2:             Friends + leaderboards
Update 3:             Battles + challenges
Update 4:             Seasonal drops
```

**Rule:** Never ship Update 1–4 features early just because they're ready. Each update is a marketing moment. Sequencing is intentional.

---

## Active Bugs — Fix These, Don't Make Them Worse

### Critical (Blocks Launch)
- **Public profile is broken.** This is the #1 priority fix. Blocks all marketing, social proof, and launch. Fix this before anything else social-facing.

### Color Bugs (Purple Contamination — Fix on Sight)
Purple still exists in:
- Level screen XP bar → replace with #3B82F6
- Shop banner → replace with blue palette
- Progress charts (also has yellow) → full blue unification needed
- Create Habit modal: input focus ring + "Create Habit" button are both solid purple → replace with blue

### Deployment Bug
- Vercel deployment fails: SHA mismatch / lockfile conflict between package.json and package-lock.json. Root cause is CRACO/Create React App dependency desync. Fix: sync lockfile or migrate build system to Vite.

### Not a Bug (Do Not Re-flag)
- "1e+24" gem display: this was Arjun testing the admin panel (which can grant/remove gems). There is no gem economy bug. Do not flag this again.

---

## Home Screen Layout (Locked)

- **Pill badge rank style:** "🏆 Level 4 — Achiever" pill + segmented XP bar underneath
- NOT the big-number / dot-row style
- Streak Shield button visible on home screen in Focus Mode (not in a shop)

---

## Icon System

- Custom outline icon set
- Consistent **2px line weight** across all icons
- No emoji used as UI icons
- Apply consistently across all screens

---

## What Claude Code Should Never Do

1. **Add purple anywhere.** Every purple element in the codebase is a bug. Replace, never preserve.
2. **Add real-money gem purchases.** Gems are earned through habits only.
3. **Add XP or leaderboards to Focus Mode.** Focus Mode is gamification-free by design.
4. **Gate the public profile behind Pro.** It is always free — it is the growth engine.
5. **Ship Update 1–4 features** (titles, friends, leaderboards, battles, seasonal drops) unless explicitly instructed. These are not v1.
6. **Use diagonal linear gradients.** They look like generic AI-generated UI.
7. **Use emoji as UI icons.** Use the custom outline icon set.
8. **Change the loot box naming system.** Names are locked: Starter / Delta / Phase.
9. **Confuse Elite rank red (#EF4444) with destructive red (#B91C1C).** Different intent, different shade.
10. **Ask me to re-litigate locked decisions.** If it says LOCKED in this file, it is locked.

---

## Session Discipline Rules

- **Always read this file before touching any code.**
- **Always work on one scoped task per session.** Never try to build an entire system in one prompt.
- **If you are about to touch a file that contains purple,** replace the purple as part of the task — don't leave it.
- **If a bug takes more than 3 attempts to fix,** stop and report back with what you found instead of looping.
- **Commit after every completed task** so changes are never lost mid-session.
- **Do not scan the entire codebase unless explicitly asked.** Target specific files to avoid burning session tokens.

---

*Last updated: July 2026. Source of truth: Notion — 📱 PHASE Master Knowledge Base + memory from planning sessions with Claude.*
