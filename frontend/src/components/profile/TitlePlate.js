// The five title plate systems — one per title SOURCE.
//
// The governing rule: a tier or source must be identifiable in silhouette,
// colour stripped out. Source picks the FORM (chamfered steel, royal frame,
// flame outline, clock dial, flat issued tag); rarity picks the INTENSITY only
// (glow radius, sheen, halo, and — for the two data-driven sources — which
// stage of the glyph family burns). Two independent axes: same rarity +
// different source must differ in shape; same source + different rarity must
// differ in light.
//
// Every plate is scaled by a single `--tp-s` multiplier so all five land at the
// same height at a given size (~26 / ~31 / ~42px for sm / md / lg). That is the
// fix for the equipped-title proportions bug: the equipped slot renders at md
// (~31px) so it sits level with the rank/streak/standing pills below it, while
// the title collection grid keeps the lg showcase form.

import { Sigil, FlameGlyph, HourglassGlyph } from './Sigil';
import { FLAME_STAGE_FOR_RARITY } from '../../data/streakFlames';
import { RARITY_RING_FILL, DIAL_CIRCUMFERENCE, dialSweepSeconds } from '../../data/hourglassStages';

// Per-source scale, tuned so every plate lands at the same height per size.
// Natural (scale-1) heights differ a lot by source — a flat starter tag is
// 23px, a royal Phase frame is 52px — which is exactly why a single global
// scale would not work.
// Values are measured, not guessed: at md every plate lands at 31±1px, which
// is the height of the rank/streak/standing pills it sits beside.
const SCALE = {
  starter: { sm: 1.03, md: 1.23, lg: 1.70 },
  delta:   { sm: 0.80, md: 0.95, lg: 1.30 },
  phase:   { sm: 0.45, md: 0.54, lg: 0.78 },
  streak:  { sm: 0.34, md: 0.41, lg: 0.55 },
  hours:   { sm: 0.32, md: 0.385, lg: 0.53 },
};

// The streak/hours name sits BESIDE its plate rather than inside it, so it is
// sized by badge size, not by plate scale.
const NAME_PX = { sm: 10, md: 11.5, lg: 14 };

const px = (n, s) => Math.max(1, Math.round(n * s));

export default function TitlePlate({ name, source = 'starter', tier = 'common', spec, size = 'md', showTier = false }) {
  const s = (SCALE[source] || SCALE.starter)[size] ?? 1;
  const vars = {
    '--tp-s': s,
    '--tp-a': spec?.a || '#8A93A6',
    '--tp-b': spec?.b || '#B8C0D0',
    '--tp-glow': spec?.glow ?? 0.3,
    '--tp-name': `${NAME_PX[size] ?? 11.5}px`,
  };
  const Plate = PLATE[source] || PLATE.starter;

  return (
    <span className={`tp tp--${source} tp--${size}`} style={vars} data-testid="title-plate" data-source={source} data-tier={tier}>
      <Plate name={name} tier={tier} s={s} showTier={showTier} />
      {showTier && source !== 'delta' && <span className="tp-stamp">{tier}</span>}
    </span>
  );
}

/* ── Starter — issued, muted, no glow. A tag, not a trophy. ───────────────── */
function StarterPlate({ name, s }) {
  return (
    <span className="tp-starter">
      <Sigil name={name} size={px(13, s)} stroke={1.7} />
      <span className="tp-name">{name}</span>
    </span>
  );
}

/* ── Delta — machined steel plate, chamfered top-left / bottom-right. ─────── */
function DeltaPlate({ name, tier, s, showTier }) {
  return (
    <span className="tp-delta-o">
      <span className="tp-delta">
        <span className="tp-delta-well"><Sigil name={name} size={px(16, s)} stroke={1.8} /></span>
        <span className="tp-name">{name}</span>
        {showTier && <span className="tp-tag">{tier}</span>}
      </span>
    </span>
  );
}

/* ── Phase — royal frame with filleted corners. Solid gold, no hue cycling. ─ */
function PhasePlate({ name, s }) {
  return (
    <span className="tp-phase">
      <span className="tp-phase-in">
        <span className="tp-wing">&#9670;</span>
        <span className="tp-phase-well"><Sigil name={name} size={px(18, s)} stroke={1.8} /></span>
        <span className="tp-phase-name">{name}</span>
        <span className="tp-wing">&#9670;</span>
      </span>
      <i className="tp-fil tl" /><i className="tp-fil tr" /><i className="tp-fil bl" /><i className="tp-fil br" />
    </span>
  );
}

/* ── Streak — flame silhouette, never a rectangle. The plate itself gains a
      lick per rarity tier, and the glyph inside steps up the flame family.
      Motion is organic and continuous — fire that hasn't gone out. ────────── */
function StreakPlate({ name, tier, s }) {
  const stage = FLAME_STAGE_FOR_RARITY[tier] || 'ember';
  return (
    <span className="tp-streak">
      <span className={`streak-plate streak-plate-${tier}`}>
        <FlameGlyph stage={stage} size={px(32, s)} stroke={1.9} className="streak-flame-alive" />
      </span>
      <span className="tp-src-name tp-streak-name">{name}</span>
    </span>
  );
}

/* ── Hours — filling clock dial. Ring fill is literal to rarity; the sweep is
      mechanical, slow and inevitable. Time passing, not an event happening. ─ */
function HoursPlate({ name, tier, s }) {
  const fill = RARITY_RING_FILL[tier] ?? RARITY_RING_FILL.common;
  return (
    <span className="tp-hours">
      <span className="clock-plate">
        <svg className="dial" viewBox="0 0 76 76" aria-hidden="true" focusable="false">
          <circle cx="38" cy="38" r="33" fill="none" stroke="var(--tp-a)" strokeOpacity="0.16" strokeWidth="3" />
          <circle
            cx="38" cy="38" r="33" fill="none" stroke="var(--tp-a)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(DIAL_CIRCUMFERENCE * fill).toFixed(1)} 999`}
            className="hours-sweep"
            style={{ '--sweep-duration': `${dialSweepSeconds(tier)}s` }}
          />
        </svg>
        <HourglassGlyph tier={tier} size={px(30, s)} stroke={1.7} className="clock-glyph" />
      </span>
      <span className="tp-src-name tp-hours-name">{name}</span>
    </span>
  );
}

const PLATE = {
  starter: StarterPlate,
  delta: DeltaPlate,
  phase: PhasePlate,
  streak: StreakPlate,
  hours: HoursPlate,
};

export const TITLE_PLATE_SOURCES = Object.keys(PLATE);
