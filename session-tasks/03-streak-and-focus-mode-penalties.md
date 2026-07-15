# Session Task: Streak Logic, Shield/Revive, and Focus Mode Penalties

Source: `DEV_PROMPT_2026-07-14_full-fix-and-build.md`, section 5 (all subsections). Read `CLAUDE.md` first, especially the Focus Mode and Focus Mode Abandonment Penalty sections.

---

## 1. Streak logic (new spec)

Streak should work like Duolingo: **completing any single habit within the rolling 24-hour window advances the streak by 1**, in both Game Mode and Focus Mode. It does **not** require every habit scheduled for that day to be completed — that's a separate, harder achievement.

- Missing a full 24-hour window with zero habits completed breaks the streak, unless a Streak Shield is active (see below).
- The existing `full_day_completion` flag (already present in the `daily_logs` table per prior schema review) and its associated +10 gem bonus (already shown in the shop's "How to Earn Gems" card) should continue to reward the harder "all habits done" case separately — don't remove or fold that into the streak-advance logic, keep them as two distinct rewards.
- Find wherever streak increment/break logic currently lives (likely inside the `complete_habit` RPC or a related trigger/cron) and confirm it matches "any habit = +1 streak" rather than requiring full-day completion.

## 2. Streak Shield — make it functional

Per Notion's Locked Decisions page: **Focus Mode's only shop-adjacent purchase should be a Streak Shield button (500 gems) directly on the home screen** — not inside a shop screen (Focus Mode has no shop at all, per the same locked decision). Game Mode can keep a Streak Shield as a shop item too (100 gems, "protects streak for 1 missed day," matches what's already in the Game Mode shop UI) — these are two separate purchase paths for the same underlying protection mechanic, not a conflict.

- Wire the shield so that when owned/active, if a user misses a full 24-hour window with zero habits completed, the shield consumes itself (decrements owned count by 1) instead of the streak breaking.
- This needs to run wherever streak-breaking is currently evaluated — likely a daily check (cron/edge function) or a check-on-login/check-on-load pattern. Confirm which pattern the app already uses for other day-boundary logic (e.g. daily roast notification reset) and follow the same pattern for consistency.
- Currently the shield is purchasable in the shop UI but confirmed non-functional (buying it does nothing) — this session should make the purchase actually grant a usable shield, and make the shield actually get consumed at the right moment.

## 3. Streak Revive — make it functional

Shown in the shop at 200 gems, described as "Restores a broken streak." Currently confirmed non-functional (purchase does nothing).

- At minimum, make the purchase actually write a streak value back to the user's row instead of silently succeeding with no effect.
- Decide the exact restore rule if it's ambiguous from context — e.g., does it restore to the user's most recent streak count before it broke, or reset to some baseline with a discount implied by the name? If genuinely unclear, flag back to Arjun rather than guessing, since this directly affects gem-economy value (a revive should feel worth 200 gems).

## 4. Focus Mode abandonment penalty — now confirmed to ship

Prior QA found that Focus Mode's abandonment confirmation modal already correctly shows "-30 gems" copy and fires a well-tuned roast notification within 5 seconds ("quiet, personal, disappointed" tone — don't touch this copy or timing, it already works well). But the actual -30 gem deduction was found to not fire — a prior commit deliberately deferred it ("Option A" in commit history).

**Arjun has now confirmed he wants this penalty live.** Implement it:
- On confirmed abandonment (user clicks "Abandon" after the confirmation modal): deduct 30 gems, mark the habit as failed for today, consume a Streak Shield if one is currently active (otherwise let the streak break normally), and fire the roast notification (already working, leave as-is).
- Make sure gems can't go negative — if a user has fewer than 30 gems, floor at 0 rather than erroring or going negative.

## 5. New mechanic: tab-switch / focus-loss penalty

This is a brand new mechanic, not in any existing spec doc — built from a direct request this session. When a Focus Mode timer is actively running and the user switches away from the browser tab (alt-tab, minimizing, switching to another tab, etc.), treat it as **worse than a normal deliberate abandonment**.

Implementation:
- Detect tab/window visibility loss using the Page Visibility API (`document.addEventListener('visibilitychange', ...)`, checking `document.hidden`) while a Focus session is active.
- On visibility loss: stop the timer immediately. No confirmation modal — this isn't a deliberate button click, the point is that walking away gets punished automatically without warning.
- Mark the habit as failed for today.
- Apply a gem penalty **larger than the standard 30-gem abandonment penalty** — start at 45-50 gems, but treat the exact number as a tunable constant Arjun can adjust after seeing it in practice (don't hardcode it deep in logic without an easy place to tweak it).
- Consume a Streak Shield if active (otherwise break the streak), same as normal abandonment.
- Fire a roast notification for this specific case — ideally distinct copy from the standard abandon roast, calling out leaving the tab specifically, but staying in Focus Mode's "quiet, personal, disappointed" tone (never trash-talk, per `CLAUDE.md`).

**Edge cases to handle:**
- Don't fire this if the timer had already completed naturally (hit zero) before the tab visibility changed.
- Don't double-penalize if the user was already inside the abandonment confirmation modal (from a manual "Abandon Session" click) when they switched tabs — that flow should resolve through the existing confirmation modal logic, not also trigger this new automatic penalty.
- Consider what happens on legitimate brief tab switches (e.g., a 1-2 second flicker from an OS notification) — decide whether there should be a short grace period (e.g., 3-5 seconds) before the penalty fires, to avoid punishing accidental/instant tab flickers. If you add a grace period, make the duration a tunable constant too.

---

## Scope note

This session depends only on the Focus Mode timer/session code already in place (confirmed working well in prior QA — the full-screen countdown, blue pulse ring, and confirmation modal all already match spec). It does not depend on the shop/profile rebuild or the purple sweep. Safe to run in parallel with those, but be aware section 2/3 here (Shield/Revive) touch the same shop-purchase code path that a shop-rebuild session might also be touching — coordinate if both are running at once to avoid merge conflicts on the same files.
