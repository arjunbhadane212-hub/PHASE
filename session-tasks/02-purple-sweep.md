# Session Task: Purple Sweep

Source: `DEV_PROMPT_2026-07-14_full-fix-and-build.md`, section 6. Read `CLAUDE.md` first (Color System section has the locked hex values).

Context: `CLAUDE.md`'s Color System section is explicit and locked — blue (`#3B82F6` primary, `#60A5FA` glow) is the only brand color for UI chrome. Purple was inherited from a Figma/Emergent template default and was never fully swept out. This has been independently confirmed in two places: a live QA pass through the deployed app, and the Notion "Master Knowledge Base" → "03 — Active Bugs" page, which lists it as a recurring, not-yet-closed bug.

---

## Full list of confirmed purple locations (from both sources — treat as your checklist, not exhaustive)

**From Notion's Active Bugs page:**
- Level screen XP bar
- Shop banner
- Progress charts (also still has yellow — needs full blue unification, not just purple removal)
- Create Habit modal — input focus ring AND "Create Habit" button, both solid purple
- **Landing page code** (separate codebase/repo from the main app — don't skip this, it wasn't covered in the app-only QA pass)

**From live QA testing of the deployed app:**
- Loading spinner (shown between page navigations, e.g. right after Sign Up)
- App logo/icon mark (purple lightning bolt in a purple rounded square) — appears on every auth screen and the onboarding header
- Signup screen: right-side hero gradient panel, "Terms of Service"/"Privacy Policy" links, "I agree" checkbox when checked, "Create Account" button
- Login screen: same logo, "Forgot Password?" link, "Log In" button, right-side hero gradient panel
- Onboarding: selected-answer highlight ring/background (confirmed on all 5 onboarding questions)
- Dashboard: "Morning"/"Afternoon"/"Night" section header icons
- Dashboard: completed-habit checkbox fill color
- Profile drawer: stat icon(s) — e.g. "Best" streak stat

## How to do this properly

Don't spot-fix the list above one at a time — grep the whole codebase (both the main app and the separate landing-page repo/stack mentioned in `CLAUDE.md`'s Tech Stack section) for purple/violet Tailwind classes (`purple-*`, `violet-*`, `fuchsia-*`) and raw hex values in the purple family (things like `#8B5CF6`, `#A855F7`, `#6D28D9`, `#7C3AED`, or similar). Swap every instance to the blue system. Check any shared theme/config file (e.g. `tailwind.config.js`) first — if there's a default purple accent still set as a fallback/default color token, fixing it at the config level may resolve many of the individual component instances at once.

## Important exception — do not over-apply this

If a separate session has built out the shop's cosmetic item catalog (colors/banners/effects a user can purchase and equip), some of those items are *intentionally* purple-named cosmetics — e.g. "Rich Purple," "Vibe Purple," "Deep Violet," "Magenta." Those are user-facing content the player chooses to equip, not app chrome — leave them alone. Likewise, if item rarity badges use a purple-ish color for "Legendary" or "Mythic" tiers as part of the shop's visual language, that's a design decision for shop content, not the contaminated default theme this sweep is about. This sweep is scoped to **app UI chrome**: buttons, focus rings, loading states, nav icons, checkboxes, charts, and the auth/onboarding flow — not purchasable cosmetic items or their rarity tags.

## Verification

After the sweep, do a full click-through of: landing page, signup, login, onboarding (all 5 questions), dashboard/home, Create Habit modal, Progress screen (all three chart views), Level screen, Shop, and the Profile drawer. Screenshot or confirm no purple remains in any of these except inside shop item content (if that exists yet).

---

## Scope note

This is a self-contained, mechanical task — no dependency on Notion, screenshots, or other sessions' work. Safe to run in parallel with any other pending session.
