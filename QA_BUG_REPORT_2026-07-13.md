# Phase App — Full QA Pass, July 13 2026

Read `CLAUDE.md` before touching any of this — every bug below is written against the rules and locked decisions in that file. Two fresh Supabase accounts were created and driven through the entire app (signup → onboarding → habits → shop → loot boxes → profile → settings → Focus Mode timer → abandonment flow), plus a direct audit of the Supabase database, RLS policies, and API logs. Findings are grouped by severity. File paths aren't included since this was black-box testing from the deployed Vercel build (`phaseofficial-pmn02cszt-...vercel.app`) — you'll need to grep the codebase for the relevant components.

---

## P0 — Crashes that black-screen the whole app

These throw an uncaught exception with no error boundary, so the entire React tree unmounts and the user sees a dead black screen. Both are the same failure family as the "dashboard black-screen crash from malformed habits response" fix already in git history — a `.map()`/`.find()` call on something that isn't an array, no error boundary anywhere in the tree.

1. **Settings page (`/dashboard/settings`) crashes on every load, 100% reproducible.**
   Console: `TypeError: Cannot read properties of undefined (reading 'map')`.
   Confirmed root cause candidate: the account's `first_name`, `last_name`, and `username` columns are `null` in `public.users` (never written during signup, see P1 below). Settings likely maps over a derived list that depends on one of these being present. Reproduced on two separate fresh accounts.
   **Impact:** users cannot change settings, cannot log out (no other logout affordance was found), cannot toggle notifications, cannot change password. This is a dead end in the app.

2. **Level page (`/dashboard/level`) crashes on every load, 100% reproducible.**
   Console: `TypeError: n.find is not a function`. Different call site than the Settings crash but the same category of bug — something expected to be an array (or to have `.find`) is not.
   **Impact:** Rank/Level screen (spec'd with the Rank Color Ladder, badges, etc.) is completely unreachable.

3. **Ranks nav item routes to `/dashboard/leaderboard` but renders nothing new — stale Home content stays on screen while the sidebar shows Ranks as active.**
   Not a crash, but a broken route. Given `CLAUDE.md` explicitly says leaderboards are an "Update 2" feature that should not ship in v1, consider whether "Ranks" should even be in the nav yet, or whether this is an accidentally-early stub.

**Recommended fix approach:** add a top-level error boundary around the dashboard router so one broken screen doesn't kill the whole app, *and* fix the underlying null/undefined array bugs. Do both — the error boundary is a safety net, not a substitute for the real fix.

---

## P0 — Public profile is broken (confirmed; this is already flagged as the #1 launch blocker in CLAUDE.md)

Clicking "Profile" opens a slide-out drawer, not the dedicated shareable profile screen described in the spec ("Layout Spec (Redesign)" section). Specific gaps against spec:

- No avatar rendered (empty grey circle instead of the 96px ring+glow avatar)
- No name text next to the "@" — username is blank
- No Streak Hero Widget (full-width flame card with day-count and tiered glow) — instead there's a plain 4-box grid: XP / Streak / Best / Done
- "Best" stat uses a **purple** shield icon (contamination, see below)
- Stat grid doesn't match spec's "Total XP, Longest Streak, Habits Done" — there's an extra "Done" metric not described anywhere
- **Data integrity bug:** the drawer showed "Banners (6)" as unlocked, but `select unlocked_banners from users where email=...` returns `[]` (empty) for that exact account. The UI is showing a hardcoded/fake count that has nothing to do with the user's actual unlocked items. Same is likely true for Titles/Animations/Profile Effects counts — worth auditing all four.

This needs to be treated as a rebuild against the CLAUDE.md layout spec, not a patch — the current drawer doesn't share the DNA of what's spec'd (it's not full-width, has no streak hero, no rank ring, no shareability).

---

## P1 — Data not saving (confirmed via direct Supabase query)

1. **Onboarding survey answers never reach the database.** All 5 onboarding questions (main goal, download reason, consistency level, "what helps you get back on track" / accountability style) are collected in the UI but `main_goal`, `download_reason`, `consistency_level`, and `accountability_style` are `null` on every single user row checked, including ones that just completed onboarding seconds earlier. No error in the API logs — the write is just never attempted. This likely feeds directly into the Settings crash and the empty profile, since downstream code may assume these are populated.

2. **First/last name never saved from signup.** The signup form collects First Name and Last Name, but `first_name`/`last_name` are `null` in `public.users` for every account tested. This is also why the dashboard greeting reads "Good evening," with nothing after the comma — cosmetic symptom of the same root bug. Cross-check against `handle_new_user()` (the SECURITY DEFINER trigger function that provisions the row on signup) — it's likely not copying these fields from the auth signup payload/metadata into the profile row.

3. **Onboarding step counter is permanently one step behind the actual question shown.** Step 1 shows "Step 1 of 5" correctly, but every question after that displays "Step N of 5" while already showing question N+1's content. Confirmed identically on two separate accounts, so it's a state-update-order bug, not a fluke — likely incrementing the step counter one render after advancing the question, or vice versa. Cosmetic, but happens on literally every onboarding session.

---

## P1 — Shop / loot box economy is a frontend shell with no real backend behind it

This is the biggest surprise from this pass. The Shop UI itself (`/dashboard/shop`) is well-built and mostly on-spec — Starter/Delta/Phase naming is correct, all category tabs are present, colors are blue. But:

- **The database has no loot box table at all.** `public.shop_items` (the only shop-related table in the schema) has exactly 4 rows, all in the `Effects` category (Flame Ring, Frost Ring, Lightning Arc, Galaxy Spiral — matches spec). There is no `loot_boxes`, `titles`, `banners`, `colors`, `boosts`, or `battles` table anywhere in the `public` schema. Boosts, Colors, Anims, Banners, and Titles tabs in the shop UI have nothing behind them.
- **Even the one populated category (Effects) doesn't render its items.** Clicking the Effects tab shows only a description card ("Full-width animated banners...") with no item tiles underneath — the 4 real DB rows never get fetched/displayed.
- **Loot box drop-rate tables use the exact banned rarity system.** Clicking "View Drop Rates" on the Starter Box shows tiers labeled **"COMMON" (65.0%)** and **"RARE" (35.0%)**. CLAUDE.md explicitly and repeatedly bans this: *"Dead naming systems — do NOT reference: Common / Rare / Ultra-rare... Current names are: Starter / Delta / Phase."* That rule is about the box tiers, but the same "Common/Rare" rarity language has clearly leaked into the per-box drop table too and needs to go.
- **Loot box item names don't match spec at all.** The Starter Box's "Rare" tier lists items named Sprout, Cinder, Pace, Drift, Spark — none of these appear anywhere in CLAUDE.md. The spec calls for specific named titles per tier (Delta: Enforcer, Vandal, Phantom, Savage; Phase: God-Complex, Anti-Hero, Anomaly, Executioner, Cataclysm). Either this content needs to be replaced to match spec, or the spec needs to be updated if these are deliberate new names — but as-is they're inconsistent with the source of truth.
- **Focus Mode has its own shop route, `/dashboard/focus-shop`, which should not exist.** CLAUDE.md is unambiguous: *"Focus Mode... No XP. No levels. No leaderboards. No shop."* The only allowed Focus Mode purchase is a Streak Shield button on the home screen — not a shop screen. The sidebar shows a "Shop" nav item in Focus Mode that routes here; it should either be removed entirely or replaced with the spec'd home-screen Streak Shield button.
- **Create Habit modal shows XP rewards in Focus Mode.** ("Medium (+25 XP)" appeared in the difficulty dropdown while creating a habit on a Focus Mode account.) Per spec, Focus Mode has no XP at all — this field shouldn't be visible when `app_mode = 'focus'`.

**Bottom line for whoever picks this up:** the shop/loot box *economy* (the actual catalog of purchasable items, box contents, rarity tiers) needs to be built out in the database first — right now there's essentially nothing to buy. The frontend is ready for it (categories, tiers, drop-rate UI all exist) but has no real data source.

---

## P2 — Focus Mode abandonment penalty doesn't match spec (likely intentional, needs a decision)

CLAUDE.md says abandoning a Focus session should: fire a confirmation modal (✅ works, confirmed), then on confirm — fail the habit (✅), deduct 30 gems (❌ not applied — account gems stayed at 0), consume a streak shield if available (not tested, account had none), and fire a roast notification within 5 seconds (✅ works, and the tone is correctly "quiet, personal, disappointed" — the actual roast text was *"Session cut short. The next one counts double in spirit."*, which is a good match for spec).

This isn't a bug so much as a **spec-vs-shipped-behavior mismatch**: a commit already in the repo history says gem/shield/consistency penalties were deliberately deferred ("Option A") and that the confirmation copy was updated to stop promising a penalty that doesn't fire. If that's still the intended state, CLAUDE.md's Focus Mode Abandonment Penalty section is now stale documentation and should be updated to say penalties are deferred, rather than describing a -30 gem penalty that will never happen. If the penalty was meant to ship, it needs to be implemented.

---

## P2 — Purple contamination (CLAUDE.md: "fix on sight," locked hex values in section "Color System")

Every instance below uses purple where the spec requires blue (`#3B82F6` primary / `#60A5FA` glow). This is more widespread than the three call-outs already listed in CLAUDE.md's "Active Bugs" section — full list from this pass:

- Loading spinner (shown between page navigations, e.g. right after clicking Sign Up)
- App logo/icon mark (purple lightning bolt in a purple rounded square) — appears on every auth screen and in the onboarding header
- Signup screen: entire right-side hero gradient panel, "Terms of Service" / "Privacy Policy" links, "I agree" checkbox when checked, "Create Account" button
- Login screen: same logo, "Forgot Password?" link, "Log In" button, right-side hero gradient panel
- Onboarding: selected-answer highlight ring/background on every question (all 5 questions tested)
- Dashboard: "Morning" (and presumably Afternoon/Night) section header icon
- Dashboard: completed-habit checkbox fill color
- Profile drawer: "Best" streak stat icon

This needs a proper sweep, not spot fixes — grep for the purple hex values (likely `#8B5CF6`, `#A855F7`, `#6D28D9`, or similar Tailwind `purple-*`/`violet-*` classes) across the whole component tree and swap to the blue system. Given how many screens are affected, this reads like a default Tailwind purple theme was never fully swapped out of the design system.

---

## P3 — Minor / cosmetic

- Weekly Progress chart bars cluster oddly at the right edge under "Mon" instead of spreading across the week's days
- Daily Progress chart view renders a completely empty panel (no bars, no axis)
- Monthly Progress chart renders axis labels but no bars
- Confirm Password field on signup intermittently loses focus/content after the first click — had to click-and-retype a second time on both test accounts. Possibly a re-render wiping the field.

---

## What's actually working well (don't break these)

- Habit creation, completion, and the `complete_habit` RPC — XP/gems/streak all update correctly and match what's shown in the UI, confirmed against the DB directly.
- Focus Mode session timer: full-screen black takeover, blue pulse glow ring, countdown, draining ring — this is one of the few screens that matches the CLAUDE.md visual spec exactly.
- Focus Mode abandonment confirmation modal and roast notification tone.
- Game Mode Shop page's tier cards (Starter/Delta/Phase), category tabs, and overall color scheme — frontend shell is solid, just needs real data behind it (see P1 above).
- Supabase project itself: `ACTIVE_HEALTHY`, no failed writes in the API logs for anything except one unrelated 401 loop on a third account's PATCH request (worth a quick look separately, but didn't affect either test account).
- Admin panel: contrary to what was assumed, `/admin` on the current Vercel deployment loads a real gated dashboard (secret-key entry) — it does **not** point at an emergent.sh URL. If there's an old bookmark/link floating around with `emergent.sh` in it, that's just a stale link; the working admin route already lives on the Vercel domain at `<your-vercel-domain>/admin`.

---

## Suggested fix order

1. Add a dashboard-level error boundary (safety net for future bugs like these).
2. Fix the Settings `.map()` crash and Level `.find()` crash — almost certainly both trace back to the same class of "assumed array, got undefined" bug, possibly both downstream of the missing first_name/username/onboarding data.
3. Fix `handle_new_user()` (or wherever signup writes the profile row) to actually persist first_name, last_name, and the 4 onboarding answer fields.
4. Rebuild the Public Profile screen against the CLAUDE.md layout spec — this is already flagged as priority #1 in CLAUDE.md, it still holds.
5. Purple sweep across all screens listed above.
6. Decide on the Focus Mode abandonment penalty (implement it or update the docs) and remove/replace the Focus Mode shop route.
7. Build out the real shop/loot box catalog in Supabase (new tables for loot boxes, titles, banners, colors, boosts; rename "Common/Rare" tiers to something that isn't the banned rarity language) — this is the biggest scope item and should probably be its own dedicated session per the "one scoped task per session" rule in CLAUDE.md.
