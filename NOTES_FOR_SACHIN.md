# NOTES_FOR_SACHIN — deferred / out-of-scope items (Supabase migration)

Running list of things flagged during the migration that are intentionally NOT
being done inline. Nothing here is actioned without explicit approval.

## REQUIRED before we call the migration "done"
- [ ] **Run a REAL build + deploy of the `finish-supabase-migration` branch.**
      All Step 1 / Step 2 verification so far has been eyeball-only — there is no
      local Node/yarn on this machine, so nothing has actually been compiled. A
      real `react-scripts build` (and a Vercel deploy) must run to catch anything
      the manual review missed (unused vars/imports under CI warnings-as-errors,
      type/JSX slips, runtime wiring, etc.).

## Known data issue — `effect` category metadata (to resolve in Step 2d)
- The 4 premium `effect` items (Flame Ring, Frost Ring, Galaxy Spiral,
  Lightning Arc, 3000g) carry `metadata.css` like `"fx-flame-ring"`, but those
  classes DO NOT exist in `index.css`. The real classes are `.deco-flame-ring`,
  `.deco-frost-ring`, `.deco-galaxy-spiral`, `.deco-lightning-arc`.
- The 12 `fx_*` effect items carry no css at all (hex_value / one gradient only).
- Decision (Sachin): map in the FRONTEND to the real existing classes; do NOT
  edit `shop_items` DB metadata to fix. To be implemented in Step 2d.

## Deferred visual polish
- Boost icons (Step 2b) reuse existing `public/shop-icons/` PNGs; `streak_revive`
  was assigned `hourglass_xp.png` (no old-catalog icon existed). Revisit if a
  dedicated revive icon is ever added.
