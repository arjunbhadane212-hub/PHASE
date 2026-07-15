# Phase App — Full Fix + Build Prompt (July 14 2026)

Read `CLAUDE.md` first. This prompt also draws on the Notion "📱 PHASE — Master Knowledge Base" (specifically pages 02 Locked Decisions, 03 Active Bugs, 05 Economy System, 06 Titles & Rarity System, 07 Public Profile Spec) — that workspace is the canonical source of truth for product decisions and should be treated as more current than CLAUDE.md wherever the two disagree, **except** the Rank Color Ladder, where Arjun has confirmed CLAUDE.md's version (teal/cyan/indigo/violet/Elite-red/Champion-purple/Apex-gold) is the one to build against, not Notion's all-blue table.

This is a big prompt covering a full QA pass plus new feature specs. Per CLAUDE.md's own session-discipline rule ("always work on one scoped task per session"), don't try to do all of this in one sitting — but read the whole thing first so you understand how the pieces depend on each other, then work top to bottom.

---

## Why this order matters

Sections 1 and 2 below are foundational — almost everything in sections 3-6 either crashes or can't be tested until first_name/username/onboarding data actually saves and until there's a real shop/loot-box catalog in the database. Fix data persistence first, then the crashes it's causing, then rebuild profile/shop on top of solid data, then layer in the new mechanics (tab-switch penalty, streak logic, working boosts).

---

## 1. Data persistence bugs (fix first — everything downstream depends on this)

**Confirmed via direct Supabase query, reproduced on multiple accounts:**

- Signup collects First Name / Last Name but `first_name`/`last_name` are `null` on every account tested. Fix wherever the profile row gets provisioned (likely `handle_new_user()`, a SECURITY DEFINER trigger) so it actually copies these from the signup payload.
- `username` is also never set — check where/if the signup flow is supposed to generate or collect one.
- All 5 onboarding survey answers (`main_goal`, `download_reason`, `consistency_level`, `accountability_style`) are `null` on every account, including ones that just completed onboarding seconds earlier. The write is never attempted (no error in API logs) — find the onboarding submit handler and make it actually persist these.
- **User-reported today, needs investigation:** habit completions from a previous day show as "unsaved" in the UI even though the gem/XP counters visibly went up. This suggests the optimistic UI update (incrementing gems/XP client-side) is decoupled from the actual write — the write may be failing silently or the read-back query may be using the wrong date. Check `complete_habit` RPC and whatever query re-fetches completion state on page load.
- **User-reported today:** habits cannot be unchecked once completed. There's no "uncomplete" path in the UI at all right now — confirm whether this is intentional (habits are meant to be one-way once completed today) or whether an uncheck affordance is missing and needs to be built. If intentional, at minimum surface why the checkbox doesn't respond when clicked again (currently it just silently does nothing, which reads as broken).

---

## 2. Crashes (P0, both 100% reproducible)

1. **Settings (`/dashboard/settings`) crashes on every load** — `TypeError: Cannot read properties of undefined (reading 'map')`. Almost certainly downstream of the null first_name/username/onboarding fields above — something on this page maps over a list derived from one of those fields. This is currently a dead end: no other logout affordance was found anywhere in the app, so users who hit this crash cannot log out, change password, or toggle notifications.
2. **Level (`/dashboard/level`) crashes on every load** — `TypeError: n.find is not a function`. Different call site, same category of bug (assumed array, got undefined/non-array).
3. **User-reported today: Level screen "goes blank sometimes or levels do not even load"** — consistent with the crash above being intermittent-feeling depending on what data state triggers it. Fix the root cause in #2 and re-test.
4. Add a dashboard-level React error boundary regardless — this is a safety net so one broken screen doesn't black-screen the entire app (this has now happened on two separate screens; it will happen again on a third eventually without a boundary).
5. **Ranks nav item routes to `/dashboard/leaderboard`** but renders nothing — stale content stays on screen. Per CLAUDE.md and Notion Roadmap, leaderboards are an "Update 2" feature not meant to ship in v1 — consider whether this nav item should be hidden entirely until that's actually built, rather than left as a broken stub.

---

## 3. Public Profile — full rebuild (confirmed #1 launch blocker in both CLAUDE.md and Notion)

Current state is a slide-out drawer, not a dedicated shareable screen, and several of its numbers are fake (see below). Rebuild against this exact spec from Notion's Public Profile page:

**Header:** Avatar, 96px circle, 4px ring colored by rank tier with matching glow. Name (bold white, 24px) + username (muted grey, 14px) underneath. Two badge pills side by side: Rank badge (solid fill per rank color + glow) and Streak badge (solid fill/glow per streak tier).

**Streak Hero Widget** — separate full-width card, NOT folded into the stat grid: large flame icon + massive streak number + "DAY STREAK" label. Glow tiers: 0 days = dead grey no glow; 1-6 days = orange; 7-29 days = amber; 30-99 days = gold with pulse animation; 100+ days = white-hot core + gold glow, animated loop (the "screenshot it" tier).

**Secondary stat grid** (smaller, quieter): Total XP, Longest Streak, Habits Done — blue iconography only, no purple/green/yellow. (Current drawer has an extra unexplained "Done" stat and a purple shield icon on "Best" — both need to go; stick to exactly these three stats.)

**Footer:** "Member since [date]" — small, muted, low visual priority.

**Data integrity bug to fix as part of this rebuild:** the current drawer shows "Banners (6)" unlocked for an account where `select unlocked_banners from users` returns an empty array in the actual database. This count is hardcoded or computed from the wrong source — same is likely true for Titles/Animations/Profile Effects counts. Every unlock count shown anywhere in the app must come from the real `unlocked_*` columns, not a placeholder.

**New feature requests from Notion (in scope, not yet built):**
- Custom avatar upload (replace default flame icon)
- Image moderation on upload (approach TBD — AI vision vs keyword/hash filter, flag as open decision if you don't want to make that call unilaterally)
- Report-user button

---

## 4. Shop, loot boxes, and equipping — build the real catalog + make it Discord-style

This is the single biggest chunk of work here. Two things are true at once: the shop *frontend* (category tabs, Starter/Delta/Phase tier cards, color scheme) is already close to spec, but the *backend catalog* is almost entirely missing, and today's screenshots show a much richer intended catalog than what currently exists.

### 4a. Database: build the missing tables

Currently `public.shop_items` has exactly 4 rows (the Effects category only — Flame Ring, Frost Ring, Lightning Arc, Galaxy Spiral, 3,000 gems each, matches spec). There is no table at all for loot boxes, titles, banners, colors, or boosts. Build these out. Use today's screenshots as the reference for what a populated catalog should look like — they show real examples across every category:

- **Boosts:** x2 XP Boost, x3 XP Boost, x5 XP Boost (legendary), Streak Shield, Streak Revive — with owned-count tracking (e.g. "1/3 owned") and gem prices (80, 150, 300, 100, 200 gems seen in screenshots)
- **Colors:** two sub-groups — "Main" colors (Cyan, Green, Lime, Sky Blue, Vibrant Blue, Orange, Amber — 300-600 gems) and "Banner" colors (Deep Orange, Indigo, Vibe Amber, Deep Violet, Rich Purple, Magenta, Vibrant Rose — 300-600 gems). **Important:** several of these named colors (Deep Violet, Rich Purple, Vibe Purple, Magenta) are themselves purple hexes — that's fine here since these are literally purple-colored *cosmetic items* a user chooses to equip, which is different from purple appearing in app-chrome/UI elements. Don't strip purple from the actual color catalog, only from UI chrome (buttons, rings, icons, backgrounds).
- **Anims (profile effects/animations):** tiered Mythic/Legendary rarity shown in screenshots — Supernova, Ethereal Glow, Inferno, Divine Light (Mythic, 1200-2000 gems), Plasma, Shadow Flame, Lightning Storm, Cosmic, Golden Aura (Legendary, 700-800 gems)
- **Banners:** Void Walker (Mythic, 1500), Northern Lights, Crimson Tide, Galaxy (Legendary, 600-800), Midnight, Sunset Blaze, Deep Ocean, Enchanted Forest (Rare, 300-350)
- **Effects (profile rings/glows):** Void Pulse (Legendary, 900), Neon Ring, Aurora, Fire Ring, Ice Ring, Electric, Rainbow, Galaxy Spin, Ripple, Vortex, Matrix Rain (Rare, 350-450), Pulse (Common, 150)
- **Titles:** per Notion's Economy System page — Delta box titles: Enforcer, Vandal, Phantom, Savage. Phase box titles: God-Complex, Anti-Hero, Anomaly, Executioner, Cataclysm. These are described in Notion as "strong as-is, don't touch much" — use them as the title catalog.

Rarity-tier labels ("Common," "Rare," "Legendary," "Mythic") on individual *shop items* within a category are fine and match what's shown in the screenshots — that's different from the loot-box-tier naming. What must never come back is **"Common/Rare/Ultra-rare" or "Common/Rare/Legendary with 80/15/5 weights" as the naming for the loot box tiers themselves** — those are explicitly dead per Notion's Locked Decisions. The loot box tiers stay **Starter / Delta / Phase**. If you're populating a "View Drop Rates" screen for a box (as currently exists and shown working with 3D cube icons in the screenshots), the item-level rarity tags on what's inside the box (Common/Rare/Legendary/Mythic) are fine — just don't rename the boxes themselves.

**Reward direction rule (locked, from both docs):** lower-tier items may appear as the floor reward in a higher-tier box; higher-tier exclusive items never drop into lower-tier boxes.

### 4b. Frontend: wire the shop UI to real data

- Every category tab (Boosts, Colors, Anims, Banners, Effects, Titles) must render its actual item grid — right now most tabs show only a description card with nothing underneath.
- Purchasing must actually work end-to-end: clicking a shop item should deduct gems via a real RPC (similar pattern to `complete_habit`), insert into whatever `unlocked_*` tracking exists, and reflect immediately in the owned-count / "Owned" label shown in the screenshots.
- **User-reported bug:** currently nothing can be purchased from the shop, and gems earned from completing habits don't appear reflected in the shop's gem counter. Debug whether the shop reads `users.gems` correctly and whether there's a stale-cache/refetch issue after a purchase or habit completion.
- Loot box opening flow: the "Tap to Open" cube animation already exists and looks good (per screenshot) — wire it to actually roll against the real drop table you build in 4a, deduct the box's gem cost, and grant the rolled item(s) to the user's unlocked inventory.

### 4c. Equip flow — copy Discord's public profile pattern

Per Arjun's explicit direction: copy Discord's approach to profile customization. Concretely, that means:

- The Settings/Profile drawer's "Customize Profile" section (Titles / Animations / Banners / Profile Effects, each with expand arrows — this part of the current UI is actually good and close to right) should, when expanded, show every unlocked item in that category with an "Equip" button next to each one (visible in the Banners screenshot — Circuit, Grid, Void Fracture, Pulse each have their own blue "Equip" button).
- Equipping one item in a category should visually swap it in on the actual Public Profile immediately — banner changes the profile banner, color changes the accent/name color, title changes the text shown next to the username, effect changes the ring/glow around the avatar. This is the core "flex" mechanic — it needs to be visibly true on the public profile, not just toggle a flag with no visible effect.
- Only one item per category can be equipped at a time (standard pattern, matches Discord).
- This depends on 4a/4b existing first — there's currently very little to equip because the catalog barely exists.

---

## 5. Focus Mode: streak, penalties, and the new tab-switch mechanic

### 5a. Streak logic (new spec, decided this session)
Streak should work like Duolingo: **completing any single habit within the rolling 24-hour window advances the streak by 1**, in both Game Mode and Focus Mode. It does not require every scheduled habit that day to be done — that's a separate, harder achievement (full-day completion), which should stay as its own bonus (the existing `full_day_completion` flag / +10 gem bonus already in the shop's "How to Earn Gems" card can continue to reward that separately). Missing a full 24-hour window with zero habits completed breaks the streak, unless a Streak Shield is active (see below).

### 5b. Streak Shield and Streak Revive — make them actually work
Per Notion's Locked Decisions, Focus Mode's only shop-adjacent purchase should be a Streak Shield button (500 gems) directly on the home screen — not inside a shop screen. Today's screenshot shows a Streak Shield item in the Game Mode shop too (100 gems, "protects streak for 1 missed day") — reconcile these: Focus Mode gets the home-screen button per the locked spec, Game Mode can keep it in the shop.
- **Streak Shield:** when owned/active, if a user misses a full day (zero habits completed in the 24h window), the shield consumes itself instead of breaking the streak. Currently shown as purchasable but confirmed non-functional — wire it to actually check-and-consume at the point where streak-breaking logic runs (likely a daily cron/edge function or a check-on-login).
- **Streak Revive:** should restore a broken streak (shown at 200 gems in the screenshot) — confirm the exact rule with Arjun if unclear (e.g., does it restore to the exact previous count, or reset with a discount?), but at minimum make the purchase actually write a streak value back to the user's row instead of doing nothing.

### 5c. Focus Mode abandonment penalty — now confirmed to ship, at -30 gems
Earlier QA found the -30 gem penalty on abandoning a Focus session doesn't fire (a prior commit deferred it intentionally, "Option A"). Arjun has now confirmed he wants this penalty live. Implement it: on confirmed abandonment, deduct 30 gems, fail the habit, consume a streak shield if one is active (otherwise break the streak), and fire the roast notification within 5 seconds (this part already works and has the right tone — don't touch the roast copy/timing).

### 5d. New mechanic: tab-switch / focus-loss penalty
Brand new spec, not in any existing doc. When a Focus Mode timer is running and the user switches away from the tab (browser tab-visibility change, alt-tab, minimizing, etc.), the session should be treated as **worse than a normal abandonment** — Arjun's words were "a bit more than normal abandonment." Concretely:
- Detect tab/window blur via the Page Visibility API (`document.visibilitychange`, checking `document.hidden`).
- On visibility loss during an active Focus session: stop the timer immediately (no confirmation modal needed, since this isn't a deliberate button click — the whole point is that walking away should be punished automatically), fail the habit, and apply a gem penalty **larger than the standard 30-gem abandonment penalty** — suggest 45-50 gems as a starting point, but treat the exact number as tunable/open for Arjun to adjust after seeing it in practice.
- Fire a roast notification for this case too, distinct copy from the standard abandon roast if possible (something that calls out leaving the tab specifically, still in Focus Mode's "quiet, personal, disappointed" tone — not trash-talk).
- Edge case to handle: don't fire this if the session already completed naturally (timer hit zero) before the tab changed, and don't double-penalize if the user was already in the abandonment confirmation modal when they switched tabs.

---

## 6. Purple sweep (still open from last pass, now cross-confirmed by Notion's Active Bugs page)

Notion's Active Bugs page confirms the same purple contamination independently: Level screen XP bar, Shop banner, Progress charts (also still has yellow), Create Habit modal focus ring + button, and separately calls out **the landing page code** as a location not covered in the last QA pass — check that too. Combined with what was found in the previous session's live testing (loading spinner, auth screen logo/links/buttons/hero panel, onboarding selection rings, dashboard section icons, habit checkboxes, profile drawer icons), this is a full-app sweep, not a spot-fix. Grep for purple/violet hex values and Tailwind classes across every component and swap to the CLAUDE.md blue system (`#3B82F6` primary, `#60A5FA` glow).

**Reminder from section 4a:** this sweep applies to app chrome/UI elements only — do not strip purple from actual shop item names/colors that are meant to be purple (e.g. "Rich Purple," "Vibe Purple," "Magenta" cosmetic items) or from rarity badges if "Legendary"/"Mythic" happen to use a purple-ish gold/pink in the design — those are content, not the contaminated default theme.

---

## 7. Progress screen chart bugs (still open)

- Weekly chart: bars cluster at the right edge under "Mon" instead of spreading across the week
- Daily chart view: renders a completely empty panel
- Monthly chart: renders axis labels but no bars — user confirmed today the monthly progress bar "does not even show the months," consistent with this

---

## Suggested order

1. Data persistence (section 1) — unblocks nearly everything else
2. Crashes + error boundary (section 2)
3. Shop/loot-box database catalog (section 4a) — needed before 4b/4c can be tested meaningfully
4. Shop frontend wiring + purchase flow (section 4b)
5. Equip flow, Discord-style (section 4c)
6. Public Profile rebuild (section 3) — now has real data and real equipped items to render
7. Streak logic + shield/revive + abandonment penalty (section 5a-5c)
8. Tab-switch penalty (section 5d) — newest, least specified, do after the simpler streak mechanics are solid
9. Purple sweep (section 6)
10. Progress chart fixes (section 7)

This is a lot — treat items 3-6 in particular as their own multi-session arc, not one sitting.
