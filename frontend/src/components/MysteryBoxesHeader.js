import { Gem, ChevronRight } from 'lucide-react';
import PhaseBoxArt, { tierFor } from './PhaseBoxArt';
import { tierOdds } from '../data/boxDrops';

// Static fallback (cost only) until the live box data resolves.
export const MYSTERY_BOXES = [
  { id: 'starter', label: 'STARTER', cost: 100 },
  { id: 'delta', label: 'DELTA', cost: 500 },
  { id: 'phase', label: 'PHASE', cost: 2000, legendary: true },
];

const IDENTITY = {
  starter: { name: 'Cosmetic Crate', tag: 'Everyday colours, banners & effects to kit out your profile.' },
  delta:   { name: 'Rare Vault', tag: 'Rare cosmetics — and where your first titles start dropping.' },
  phase:   { name: 'Prestige Vault', tag: 'Legendary & mythic only. Where the rarest titles are forged.' },
};

// Stacked rarity-odds bar built from the real pool.
function OddsBar({ odds, height = 8 }) {
  if (!odds?.length) return null;
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
      {odds.slice().sort((a, b) => a.order - b.order).map((o) => (
        <div key={o.tier} style={{ width: `${o.pct}%`, background: o.color }} title={`${o.label} ${o.pct.toFixed(0)}%`} />
      ))}
    </div>
  );
}

function OddsLegend({ odds }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {odds.map((o) => (
        <span key={o.tier} className="flex items-center gap-1.5">
          <span style={{ width: 7, height: 7, borderRadius: 7, background: o.color }} />
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold tabular-nums text-[color:var(--gm-muted)]">
            {o.label} {o.pct.toFixed(0)}%
          </span>
        </span>
      ))}
    </div>
  );
}

// top-tier item names, for the "chance at" line
function topPulls(box, n = 2) {
  if (!box?.pool) return [];
  const rank = { mythic: 3, legendary: 2, rare: 1, common: 0 };
  return box.pool.slice().sort((a, z) => (rank[z.tier] - rank[a.tier]) || (z.percent - a.percent)).slice(0, n).map((p) => p.name);
}

function gemPill(cost, afford) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: afford ? 'var(--gm-badge)' : 'var(--gm-badge)', opacity: afford ? 1 : 0.6 }}>
      <Gem className="w-3.5 h-3.5 text-[#95DEE6]" strokeWidth={2.4} />
      <span className="font-['JetBrains_Mono'] text-[13px] font-bold tabular-nums text-[color:var(--gm-ink)]">{cost}</span>
    </div>
  );
}

// ---------- Featured vault (Phase) — full width hero ----------
function FeaturedVault({ box, meta, gems, onOpen }) {
  const t = tierFor(box.id);
  const odds = box.pool ? tierOdds(box) : [];
  const pulls = topPulls(box, 3);
  const afford = gems >= box.cost;
  return (
    <button
      onClick={() => onOpen(box.id)}
      className="w-full text-left rounded-[24px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] border border-[#DBF67F]/40 hover:border-[#DBF67F]/70 transition-all duration-200 active:scale-[0.99] overflow-hidden"
      data-testid={`vault-${box.id}`}
    >
      {/* top accent strip */}
      <div className="h-1 w-full" style={{ background: '#DBF67F' }} />
      <div className="flex items-stretch gap-4 p-4 sm:p-5">
        <div className="flex-shrink-0 w-[92px] sm:w-[108px] flex items-center justify-center">
          <PhaseBoxArt tier={box.id} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-['JetBrains_Mono'] text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>
              {box.label} · Featured
            </span>
          </div>
          <h3 className="font-['Archivo'] font-black text-[color:var(--gm-ink)] text-lg sm:text-xl leading-tight mt-0.5">
            {meta.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-[color:var(--gm-muted)] leading-snug mt-1 pr-2">{meta.tag}</p>

          <div className="mt-2.5"><OddsBar odds={odds} /></div>
          <div className="mt-1.5"><OddsLegend odds={odds} /></div>

          {pulls.length > 0 && (
            <p className="text-[11px] text-[color:var(--gm-muted)] mt-2 truncate">
              <span className="text-[color:var(--gm-ink)] font-semibold">Chance at:</span> {pulls.join(' · ')}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.1em] text-[color:var(--gm-muted)]">
              Opens {box.dropsPerOpen} · 1 legendary+ guaranteed
            </span>
            <div className="flex items-center gap-2">
              {gemPill(box.cost, afford)}
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--gm-ink)]">
                <ChevronRight className="w-4 h-4 text-[var(--gm-bg)]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------- Standard vault (Starter / Delta) ----------
function Vault({ box, meta, gems, onOpen }) {
  const t = tierFor(box.id);
  const odds = box.pool ? tierOdds(box) : [];
  const afford = gems >= box.cost;
  const guar = box.id === 'delta' ? '1 rare+ guaranteed' : `Opens ${box.dropsPerOpen}`;
  return (
    <button
      onClick={() => onOpen(box.id)}
      className="flex flex-col rounded-[22px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] border border-transparent hover:border-[var(--gm-track)] transition-all duration-200 active:scale-[0.98] overflow-hidden"
      data-testid={`vault-${box.id}`}
    >
      <div className="relative flex items-center justify-center pt-5 pb-3 px-4" style={{ minHeight: 120 }}>
        <PhaseBoxArt tier={box.id} className="w-[78px] h-[78px]" />
      </div>
      <div className="px-4 pb-4 flex flex-col flex-1">
        <span className="font-['JetBrains_Mono'] text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>
          {box.label}
        </span>
        <h3 className="font-['Archivo'] font-black text-[color:var(--gm-ink)] text-[15px] leading-tight mt-0.5">{meta.name}</h3>

        <div className="mt-2.5"><OddsBar odds={odds} height={6} /></div>

        <div className="flex items-center justify-between mt-auto pt-3">
          {gemPill(box.cost, afford)}
          <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)] text-right leading-tight max-w-[92px]">
            {guar}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function MysteryBoxesHeader({ onOpenBox, boxes, gems = 0 }) {
  // Merge live data (odds/per-open) with the static fallback (cost/order).
  const resolve = (id) => {
    const live = boxes?.[id];
    const fb = MYSTERY_BOXES.find((b) => b.id === id) || { id, label: id.toUpperCase(), cost: 0 };
    return {
      id,
      label: (live?.label || fb.label || id).toUpperCase(),
      cost: live?.cost ?? fb.cost,
      dropsPerOpen: live?.dropsPerOpen ?? (id === 'phase' ? 3 : 2),
      pool: live?.pool,
    };
  };
  const phase = resolve('phase');
  const delta = resolve('delta');
  const starter = resolve('starter');

  return (
    <div className="w-full px-4" data-testid="mystery-boxes-header">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-['JetBrains_Mono'] text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--gm-ink)]">Vaults</span>
        <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[color:var(--gm-muted)]">· spend gems, pull cosmetics & titles</span>
      </div>

      <div className="flex flex-col gap-3">
        <FeaturedVault box={phase} meta={IDENTITY.phase} gems={gems} onOpen={onOpenBox} />
        <div className="grid grid-cols-2 gap-3">
          <Vault box={delta} meta={IDENTITY.delta} gems={gems} onOpen={onOpenBox} />
          <Vault box={starter} meta={IDENTITY.starter} gems={gems} onOpen={onOpenBox} />
        </div>
      </div>
    </div>
  );
}
