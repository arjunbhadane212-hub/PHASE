// Preview of the box-opening sequence with FAKE pulls: no login, no gems, no RPC.
// Lets every rarity / item kind be watched on demand instead of spending 2,000
// gems and hoping for a mythic. Unlinked; reachable at /dev/box-opening.
import { useState } from 'react';
import BoxOpening from '../components/BoxOpening';

const I = (tier, category, item_key, name, extra = {}) => ({ tier, type: 'item', category, item_key, name, ...extra });

const SCENARIOS = [
  { id: 'mythic-title', label: 'Mythic title', box: 'phase', items: [
    I('legendary', 'anim', 'anim_plasma', 'Plasma'),
    I('legendary', 'banner', 'banner_meridian', 'Meridian'),
    I('mythic', 'title', 'title_god_complex', 'God-Complex'),
  ] },
  { id: 'mythic-banner', label: 'Mythic banner', box: 'phase', items: [
    I('legendary', 'effect', 'flame_ring', 'Flame Ring'),
    I('legendary', 'title', 'title_enforcer', 'Enforcer'),
    I('mythic', 'banner', 'banner_warpgate', 'Warpgate'),
  ] },
  { id: 'mythic-anim', label: 'Mythic anim', box: 'phase', items: [
    I('legendary', 'banner', 'banner_galaxy', 'Galaxy'),
    I('legendary', 'boost', 'boost_xp_5x', 'x5 XP Boost'),
    I('mythic', 'anim', 'anim_divine_light', 'Divine Light'),
  ] },
  { id: 'legendary', label: 'Legendary + rare', box: 'delta', items: [
    I('rare', 'effect', 'fx_neon_ring', 'Neon Ring'),
    I('legendary', 'title', 'title_phantom', 'Phantom'),
  ] },
  { id: 'rare', label: 'Rare + common', box: 'delta', items: [
    I('rare', 'banner', 'banner_void_fracture', 'Fracture'),
    I('rare', 'boost', 'boost_xp_3x', 'x3 XP Boost'),
  ] },
  { id: 'common', label: 'Commons', box: 'starter', items: [
    I('common', 'boost', 'streak_shield', 'Streak Shield'),
    I('common', 'banner', 'banner_circuit', 'Circuit'),
  ] },
  { id: 'dupe', label: 'Mythic duplicate', box: 'phase', items: [
    I('legendary', 'banner', 'banner_crimson_tide', 'Crimson Tide', { duplicate: true, refund: 400 }),
    I('mythic', 'title', 'title_executioner', 'Executioner', { duplicate: true, refund: 750 }),
    I('legendary', 'anim', 'anim_cosmic', 'Cosmic'),
  ] },
];

export default function DevBoxOpeningPage() {
  const [run, setRun] = useState(null);
  return (
    <div style={{ minHeight: '100vh', background: '#0E1012', color: '#F4F5F2', padding: 24, fontFamily: "'General Sans', sans-serif" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.24em', color: '#9BA09C' }}>DEV · BOX OPENING PREVIEW</div>
      <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 32, margin: '8px 0 6px' }}>Pick a pull</h1>
      <p style={{ color: '#9BA09C', fontSize: 13, marginBottom: 20 }}>Fake data only. Nothing is spent or saved.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
        {SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => setRun({ ...s, n: Date.now() })} data-testid={`dev-run-${s.id}`}
            style={{ background: '#1F2123', border: '1px solid #2E3235', color: '#F4F5F2', borderRadius: 14, padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            {s.label} <span style={{ color: '#9BA09C', fontWeight: 500 }}>· {s.box}</span>
          </button>
        ))}
      </div>
      {run && <BoxOpening key={`${run.id}-${run.n}`} boxId={run.box} rolledItems={run.items} onContinue={() => setRun(null)} />}
    </div>
  );
}
