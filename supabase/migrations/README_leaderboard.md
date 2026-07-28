# Weekly Leaderboard — migrations applied to Supabase

These migrations were applied **directly to the Supabase project**
(`dnfcrpthpinilibvqwtf`) rather than through the CLI, so the authoritative SQL
lives in the database. To materialise them as local files:

```bash
supabase db pull
```

Applied, in order:

| Version | Name | What it does |
|---|---|---|
| 20260725050540 | `leaderboard_m1_additive_schema` | `xp_events` (append-only ledger + immutability trigger), `leaderboard_periods` / `_groups` / `_memberships`, `abuse_signals`, `leaderboard_tier_config` (10 tiers seeded), leaderboard columns on `users`, XP/floor/threshold keys in `game_config`, RLS default-deny on all new tables |
| 20260725050751 | `leaderboard_m1_harden_forbid_mutation_searchpath` | pins `search_path` on `forbid_mutation()` |
| 20260726035516 | `leaderboard_m2_tier_col_and_award_hook` | adds `users.leaderboard_tier` (the league ladder — **not** `users.rank`, which is the XP-level Rookie→Apex ladder); extends the existing `complete_habit()` RPC to append `xp_events` idempotently and bump `period_xp` |
| 20260726231823 | `leaderboard_m2b_game_mode_only` | gates the `period_xp` bump on `app_mode = 'game'` — Focus Mode earns no league XP |
| 20260726234319 | `leaderboard_m3_guards_and_eligibility` | `refresh_leaderboard_eligibility()` (email-verified + ≥24h old + not banned); velocity + daily-ceiling guards that log to `abuse_signals`, set `shadow_flagged` and suppress the counter **without** breaking the completion |
| 20260726234823 | `leaderboard_m4_period_start_grouping` | `period_start()` — deterministic grouping (seeded by `period_id`), balanced group sizes, sparse-tier merge, idempotent |
| 20260726235937 | `leaderboard_m5_period_close` | `period_close()` — ranking, 150-XP promotion floor, promote/demote, `active → closing → closed` |
| 20260727000039 | `leaderboard_m5_period_close_fix_cast` | fixes a `bigint`/`int` cast in the group-size helper |
| 20260727000827 | `leaderboard_m6_m7_read_apis` | `get_leaderboard()` (caller's group + zones) and league fields added to `get_public_profile()` |
| 20260727015116 | `leaderboard_m8_is_pro_and_period_result` | `users.is_pro` (Pro gate) and `get_period_result()` for the end-of-period modal |
| 20260728215418 | `leaderboard_m9_enable_cron_weekly_reset` | enables `pg_cron`; schedules `leaderboard_weekly_reset` at `0 0 * * 1` (Mon 00:00 UTC) running `period_close(); period_start();` |
| 20260728215555 | `leaderboard_m10_hardening_close_write_holes` | **breaking hardening**: unique `(user_id, habit_id, completed_date)` on `habit_completions`, revokes client INSERT/UPDATE/DELETE there, and adds the `protect_user_columns()` trigger blocking direct client writes to server-managed columns (xp, gems, streaks, boosts, unlocks, `leaderboard_*`, `is_pro`) |

## Invariants worth preserving

- The client **never** sends an XP amount. `complete_habit()` derives XP from
  `habits.difficulty` server-side and applies the boost multiplier from
  `users.active_boost_multiplier` (game mode only).
- `xp_events` is append-only; updates and deletes raise.
- Only `complete_habit()` may change `period_xp` — anything else will drift the
  counter away from the ledger.
- Write habit completions and economy changes through their RPCs. After the
  hardening migration, direct table writes are rejected by design.
- Focus Mode is excluded from the league at the award path *and* the grouping
  job. Keep both in sync if that rule ever changes.
