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

## Color System v2 — CRITICAL, READ FIRST (supersedes all earlier color rules in this file and in design_guidelines.json)

Phase's UI is being rebuilt screen-by-screen from a new design reference ("Phase Game Mode Guide"). This section is the current and only source of truth for color and type. Ignore any earlier text in this file, or in design_guidelines.json, that says blue is the only brand color or that purple must always be removed on sight — that rule is retired as of this update.

### Core Hex Values (v2)
```
Background (page):        #0E1012
Card fill (default):      #1F2123   — flat solid fill. NO backdrop-blur, NO translucent
                                       glass, NO glass-card class on new/touched components.
Streak hero card fill:    #77D6E4   — solid cyan, home streak hero widget ONLY
Streak hero card text:    #09181C   — near-black, ONLY on top of the cyan hero card
Success / completed:      #D0F662   — lime-green solid fill for completed/success states
                                       (e.g. a checked-off habit row). REPLACES blue here.
Progress indicator blue:  #3B82F6 (base) / #60A5FA (highlight)
                                     — reserved for progress rings and progress bars ONLY.
                                       Do not use this blue for general accents anymore.
Purple accent (restored): #A59BCC   — outlined pill buttons and secondary chip accents
                                       (e.g. an "Add" pill, a filter chip). Intentional,
                                       NOT the old "bug purple" — do not convert to blue.
Text — primary:           #F4F5F2
Text — muted:             #9BA09C
Destructive red:          #B91C1C   (unchanged — delete/abandon actions only)
```

### What changed from the old rule, explicitly
- Purple is allowed again, scoped to pill-button outlines/text and small secondary chip accents. Do not "fix" it back to blue.
- Lime-green (#D0F662) is the new success/completed signal color. Blue is now reserved for progress rings/bars specifically, not general accents.
- Cards are flat solid fills (#1F2123 by default), not glassmorphic. As you touch a component in a screen task, remove its backdrop-blur/glass treatment. Do not add glass-card to anything new.
- The cyan hero card (#77D6E4 fill + #09181C text) is a new, specific pattern for hero/streak widgets — not a general card style.

### Unchanged
The 10-rank color ladder (Rookie through Apex, defined in `frontend/src/data/levels.js`), Elite rank red (#EF4444) vs. destructive red (#B91C1C) distinction, and the league/leaderboard tier palette exception are all UNCHANGED by this update. Do not touch those.

### Typography v2 (supersedes Satoshi as the display font)
```
Archivo       — Display: numbers, headlines, section titles, the brand mark.
                Weights 800–900 ONLY. Never body copy, never metadata.
General Sans  — UI text: habit names, button labels, row titles.
                Weight 700 for emphasis, weight 500 for plain body copy.
JetBrains Mono — Data & labels: timestamps, XP counters, eyebrow/section labels.
                Always uppercase + letter-spacing when used as a label.
```
Exact type scale:
- Hero number (e.g. a big streak count): 44–52px, weight 900, Archivo, line-height 0.88, letter-spacing -0.02em
- Section title (e.g. "Today"): 19–20px, weight 800, Archivo, letter-spacing -0.01em
- Row/list title (e.g. a habit name): 13–14px, weight 700, General Sans
- Eyebrow/label (e.g. "DAY STREAK"): 10–11px, weight 700, JetBrains Mono, uppercase, letter-spacing 0.08em

Satoshi is retired as the display font. Anywhere you touch code that uses `font-['Satoshi']`, replace it with the Archivo treatment above. Do not go hunting for other Satoshi usages outside the files a given task names.

### Rollout status — IMPORTANT
This is being rolled out ONE SCREEN AT A TIME. Only the screen(s) named in the current task should change. Every other screen still uses the OLD v1 palette (purple #8B5CF6, Satoshi, glassmorphism) until its own turn comes later in this project — that is expected and correct, not a bug or inconsistency to fix. Never repaint a screen that wasn't explicitly named in the current task, even if it looks inconsistent next to a screen you just finished.

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
- **OVERRIDE (Sachin, Step 6): Focus Mode keeps a shop screen, REVIVE-ONLY (Streak Revive via purchase_shop_item). XP doublers remain banned in Focus. This intentionally overrides the 'No shop in Focus' locked rule — do not revert.**
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

**Status exception — Weekly League (leaderboard) is BUILT** (Arjun-approved, July 2026). Backend + UI are live: `get_leaderboard()` / `get_period_result()` RPCs, `pg_cron` weekly reset (Mon 00:00 UTC), League nav item in Game Mode. See `supabase/migrations/README_leaderboard.md`. Notes:
- It is **Game Mode only** — Focus Mode earns no league XP and is never grouped.
- It uses its **own** 10-tier ladder (Bronze→Prime) in `users.leaderboard_tier`, separate from the XP-level ladder in `users.rank`. Tier 9 "Apex" here is a name collision with rank 10 "Apex" — unrelated systems.
- Tier badges use a **per-tier saturated palette** (incl. purples/pinks) from the leaderboard design spec. This is a deliberate, approved exception to the no-purple rule, scoped to league tier emblems only — the rest of the app stays blue.
- Standings are Pro-gated (`users.is_pro`); free users see the blurred upsell.

---

## Title System (BUILT — Aug 2026)

There is exactly **one** title system, and it lives in Supabase. Two independent
axes drive every title badge — never collapse them into one:

- **`shop_items.source_system`** (`box` / `streak` / `hours`) → the plate **FORM**.
  For box titles the form is refined by `rarity_style` (`starter`/`delta`/`phase`).
- **`shop_items.rarity_tier`** (`common` → `mythic`) → the plate **GLOW ONLY**.

Rarity is assigned by a different rule per source, deliberately:
box titles are *probability-rare* (`delta`→Rare, `phase`→Mythic, flat); streak
and hours titles are *effort-rare*, by breakpoint position. The distributions
are pyramids — streak **5/3/3/2/1**, hours **3/2/1/2/1**. **Do not rebalance
either into an even split.**

Awarding is live and automatic: `sync_progress_titles(uuid)` runs inside
`complete_habit` and returns `newly_unlocked`, which fires a title-unlock toast
rendering the real plate. **Titles are permanent** — a broken streak never
revokes one; it only stops new higher titles from unlocking.

Not Pro-gated, on the public profile or on equipping (Sachin's Aug 2026 call).
This overrides the "Title and banner equipping" line under Locked Behind Pro.

⚠️ **Open item — hours titles cannot be earned yet.** No source of truth for
"hours spent on Phase" exists: no `focus_sessions` table, no start/end
timestamps, and `habits.session_duration` is *planned* length, not time served.
The 9 hours titles are seeded and render, but never unlock. Do not paper over
this with a proxy metric (habit counts are not durations). Full detail +
the one-step switch-on: `supabase/migrations/README_progress_titles.md`.

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
