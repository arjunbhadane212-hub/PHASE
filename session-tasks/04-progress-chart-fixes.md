# Session Task: Progress Screen Chart Bugs

Source: `DEV_PROMPT_2026-07-14_full-fix-and-build.md`, section 7. Read `CLAUDE.md` first.

---

## Bugs to fix

1. **Weekly chart view:** bars render clustered together at the right edge of the chart, under/near the "Mon" label, instead of spreading proportionally across all seven days of the week. Confirmed the underlying stat cards above the chart (gems earned, XP earned, tasks done) show correct numbers — this is purely a chart rendering/layout bug, not a data bug. Check the chart's x-axis category mapping — likely each day's data point isn't being assigned the correct x-position/category key.

2. **Daily chart view:** renders a completely empty panel — no bars, no axis labels, nothing. Confirm whether the daily view is even querying/passing data to the chart component, or whether it's a rendering issue similar to the weekly view.

3. **Monthly chart view:** axis labels render (dates were visible) but no bars appear at all. User has also independently confirmed today that "the monthly progress bar does not even show the months" — check whether the axis label bug and the missing-bars bug share a root cause (e.g., a broken date-range query for the monthly aggregation that returns labels/scaffolding but no actual data rows).

## Suggested approach

Since all three views likely share the same underlying chart component with different data-fetching logic per tab (Daily/Weekly/Monthly), start by comparing:
- What each view actually queries from `daily_logs` (date range, grouping)
- Whether the chart library receives a correctly shaped dataset (check for off-by-one date boundaries, timezone mismatches similar to what may exist in habit completions, or empty arrays being passed where populated arrays are expected)
- Whether the x-axis category/label generation is decoupled from the actual data points, which would explain why Monthly can show axis labels without any bars

## Verification

After fixing, test with an account that has at least a few days of `daily_logs` history across more than one calendar week, so you can confirm the Weekly view spreads bars correctly across real different days (not just one day of data clustered), and the Monthly view shows both real month labels and real bars.

---

## Scope note

This is a small, self-contained bug fix isolated to the Progress screen's chart rendering. No dependency on other pending sessions (purple sweep, streak/penalties, shop/profile rebuild) — safe to run fully in parallel with all of them.
