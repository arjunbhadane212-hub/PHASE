# NOTES_FOR_SACHIN — deferred / out-of-scope items (Supabase migration)

Running list of things flagged during the migration that are intentionally NOT
being done inline. Nothing here is actioned without explicit approval.

## REQUIRED before real (multi-user) launch — security / economy
- [ ] **Add a server-side concurrency guard to `purchase_shop_item` (Step 3).**
      It currently does read-then-check (`select gems` / `select quantity`) with
      NO row lock, so two truly-concurrent calls can both pass the gems/max checks
      and **double-charge gems / exceed `max_owned`**. Fix: `SELECT ... FOR UPDATE`
      on the `users` row (and re-check gems + quantity) inside the RPC. The client
      button-disable (`isBuying`) covers the normal fast double-click but NOT true
      concurrency (multi-tab / programmatic). **Category: pre-launch, security/economy.**
- [ ] **`open_loot_box` almost certainly has the same gap** — verify and apply the
      same `SELECT ... FOR UPDATE` + re-check pattern before launch. (Confirm when
      Step 5 wires loot boxes.) **Category: pre-launch, security/economy.**

## REQUIRED before we call the migration "done"
- [ ] **Run a REAL build + deploy of each step's branch state.** There is no local
      Node/yarn on this machine, so per-step verification is eyeball-only. (Step 2
      DID build green on a Vercel preview — keep doing the same for Steps 3–8 before
      final merge, to catch CI warnings-as-errors / runtime wiring the review misses.)

## Known data issue — `effect` category metadata (RESOLVED in frontend, Step 2d)
- The 4 premium `effect` items (Flame Ring, Frost Ring, Galaxy Spiral, Lightning
  Arc) carry `metadata.css` like `"fx-flame-ring"`, which does NOT exist as a
  class (real classes are `.deco-*`). The 12 `fx_*` items carry no css at all.
- RESOLVED IN FRONTEND (Step 2d): `data/shopEffects.js` maps all 16 keys to real
  existing classes; the wrong DB metadata is simply ignored (never read). If any
  future code reads `shop_items.metadata.css` directly, the DB values must be
  corrected there first.

## Future features (not migration blockers)
- **Profile Icons — build later.** There is no `icon` category in `shop_items`
  and `equip_item`/`unequip_item` reject it, so the Settings "Icons" section is
  dormant (rendered inert in Step 4b — makes zero calls). To ship it: add an
  `icon` category to `shop_items`, seed icon items, extend `equip_item` /
  `unequip_item` to accept `icon` (mirror `users.equipped_icon`), and re-enable
  the Settings Icons block. `users.equipped_icon` / `unlocked_icons` columns are
  left intact for this. **Category: future feature, not a migration blocker.**

## Deferred visual polish
- Boost icons (Step 2b) reuse existing `public/shop-icons/` PNGs; `streak_revive`
  was assigned `hourglass_xp.png` (no old-catalog icon existed). Revisit if a
  dedicated revive icon is ever added.
- **Rebuild anim/effect item previews on MyProfilePage + Shop** — old backend
  synthesized `css_class`/`image_url`; new `shop_items` has none. Future visual
  polish, not a migration blocker. (Step 4c state: `effect` previews DO resolve
  via `data/shopEffects.js` → real `.deco-*`/`.profile-anim-*` classes; **`anim`
  items have no css anywhere**, so animation entries render as plain labeled pills
  and the avatar animation is inert. Wiring/equip works fully regardless.)
- **Banner art ↔ shop key mismatch (MyProfilePage, Step 4c).** The banner SVG set
  in `components/banners/PhaseBanners.js` uses keys `starter_/delta_/phase_*` (6 +
  default), but `shop_items` banners use `banner_*` (12) — disjoint namespaces, so
  equipped/owned banners can't resolve art by key. Step 4c added a by-key map
  (`BANNER_KEY_TO_ART` in MyProfilePage) covering the 4 that have art
  (`banner_circuit/grid/pulse/void_fracture`); the other 8 show a neutral name
  placeholder. To finish: add real banner SVGs keyed to the 12 shop keys (or a
  shared key→art map), then drop the placeholder. Equip/unequip already works for
  all 12. **Category: future visual polish, not a migration blocker.**
