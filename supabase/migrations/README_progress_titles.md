# Progress titles — streak & hours (applied 2026-08-16)

Makes streak/hours titles a live system instead of a frontend placeholder.
All five migrations are APPLIED to project `dnfcrpthpinilibvqwtf`.

| version | name |
|---|---|
| 20260816030429 | `title_rarity_tier_and_source_system` |
| 20260816030448 | `seed_streak_and_hours_titles` |
| 20260816030538 | `sync_progress_titles` |
| 20260816030623 | `complete_habit_awards_progress_titles` |
| 20260816030702 | `get_public_profile_exposes_rarity_tier_and_source` |

## The two axes

`shop_items` now carries two independent columns:

- **`source_system`** — `box` | `streak` | `hours`. Picks the plate FORM.
- **`rarity_tier`** — `common` → `mythic`. Picks the plate GLOW only.

`rarity_style` (`starter`/`delta`/`phase`) survives unchanged as the box
SUB-form, and is only meaningful when `source_system = 'box'`.

Rarity is assigned by a different rule per source, on purpose:

- **Box titles** are *probability-rare* — you either pulled it or you didn't.
  Flat map: `delta` → Rare, `phase` → Mythic, regardless of drop %.
- **Streak/hours titles** are *effort-rare* — assigned by breakpoint position.

Distribution is a pyramid, not an even split. **Do not rebalance:**

- streak **5/3/3/2/1** — cheap and plentiful early, rare and far apart late.
- hours **3/2/1/2/1** — thinner at Epic. Hours is a quieter, less publicly
  flexed metric than a day-streak, so the ladder pushes toward the two big
  late payoffs instead of loitering mid-ladder.

## Permanence

Titles are permanent once earned, matching the box-title rule. A broken streak
does **not** revoke `Aflame`; it only means no *new* higher title unlocks until
the streak climbs back past that breakpoint. This is why `sync_progress_titles`
compares against `greatest(current_streak, longest_streak_ever)` — the
high-water mark is what was actually achieved, and achievement does not decay.

`sync_progress_titles(uuid)` is idempotent: safe to call on every stat change.
Re-crossing a breakpoint cannot duplicate a title
(`unique (user_id, shop_item_id)` + `on conflict do nothing`).

Awarded rows land in `user_inventory` with `acquired_via = 'progress'` (new
value; the CHECK constraint was widened from purchase/loot_box/seed).

## Call sites

- `complete_habit` calls it right after the streak columns update, and returns
  `newly_unlocked` so the frontend can toast the title in the same response.
- **Hours: not wired — no source exists.** See below.

## OPEN ITEM — hours titles cannot unlock yet

There is **no source of truth for "hours spent on Phase"** in this database:

- no `focus_sessions` table, and no start/end timestamps anywhere;
- `habit_completions` records only `completed_at` — an instant, not a duration;
- `habits.session_duration` is the *planned* length of a Focus habit, not time
  actually served.

Deriving hours from either of those would be a fabricated proxy metric, so
`sync_progress_titles` leaves `v_hours` NULL and the hours branch awards
nothing. The 9 hours titles are seeded and render correctly — they simply
cannot be earned until a real duration source lands.

**To switch on** (single, contained change):

1. Create `focus_sessions(user_id, started_at, ended_at, status)`.
2. In `sync_progress_titles`, replace the `v_hours` declaration with the SELECT
   written out in the comment block there.
3. Call `sync_progress_titles(user_id)` wherever a session is marked completed,
   and surface `newly_unlocked` in that RPC's response the way `complete_habit`
   does.

No other line in the function, and nothing downstream, needs to change.

## Also retired here

`backend/server.py` held a second, contradictory ladder (`STREAK_TITLES` /
`TIME_TITLES` / `get_earned_titles`) on the dead Mongo/FastAPI backend — it had
Cooking as rare and Aflame as epic, where the confirmed pyramid makes them
common and rare. It is gone; `get_earned_titles` is now an empty stub. No
frontend surface read it.
