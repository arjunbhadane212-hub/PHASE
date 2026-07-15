# Session Task: Finish §1/§2 Cleanup

Source: `DEV_PROMPT_2026-07-14_full-fix-and-build.md`, section 1 (remaining items) and section 2 item 5. Read `CLAUDE.md` first.

Context: the core of sections 1 and 2 (data persistence for first_name/username/onboarding fields, the Settings and Level crashes, and the error boundary) is already done and deployed. This session picks up the smaller leftover items from those sections.

---

## 1. Hide the Ranks nav stub

The "Ranks" nav item currently routes to `/dashboard/leaderboard`, which renders nothing — stale content from whatever page you were previously on just stays on screen while the sidebar shows Ranks as active.

Per `CLAUDE.md` and the Notion roadmap, leaderboards are an "Update 2" feature not meant to ship in v1. Hide this nav item entirely until leaderboards are actually built, rather than leaving a broken stub visible to users. Don't delete the route/component if it has scaffolding already — just don't link to it from the nav yet.

## 2. Fix the habit-completion timezone/persistence bug

**User-reported:** habit completions from a previous day show as "unsaved" in the UI even though the gem/XP counters visibly went up at the time of completion.

This suggests the optimistic UI update (incrementing gems/XP client-side immediately on click) is decoupled from the actual write, or the write succeeded but the read-back query on next load is using the wrong date/timezone boundary and failing to find yesterday's completion row.

Investigate:
- The `complete_habit` RPC — confirm it's actually writing a `habit_completions` row with the correct `completed_date`.
- Whatever query re-fetches completion state on page load — confirm it's querying with the same date/timezone logic used at write time. A common bug here is writing with server UTC date but reading with client-local date (or vice versa), so a completion made late at night in the user's timezone gets written under one date and looked up under another.
- Confirm this fix doesn't break the working `complete_habit` flow for same-day completions (verified working in prior QA pass — don't regress it).

## 3. Resolve the "cannot uncheck habits" gap

**User-reported:** habits cannot be unchecked once completed. There is currently no "uncomplete" affordance in the UI — clicking a completed habit's checkbox again does nothing.

This needs a product decision, not just a code fix:
- If habits are meant to be one-way once completed today (can't be undone), then the checkbox should at minimum give some feedback when clicked again (a toast, a disabled/locked visual state) instead of silently doing nothing, which currently reads as broken.
- If an uncheck flow is supposed to exist, build it: clicking a completed habit again should reverse the `complete_habit` effects — delete/mark the `habit_completions` row for that date, subtract the XP/gems that were awarded, and decrement the day's streak-contributing habit count. Be careful this doesn't let a user farm XP/gems by repeatedly checking/unchecking the same habit — either make uncheck only available same-day and cheap to reverse cleanly, or add a cooldown.
- If you're unsure which behavior is intended, flag it back to Arjun rather than guessing — this affects the gem economy's integrity.

---

## Scope note

This is a cleanup/finishing session — small, mostly independent fixes. It does not depend on and does not block the other pending sessions (purple sweep, streak/penalties, progress charts, shop/profile rebuild). Safe to run in parallel with those.
