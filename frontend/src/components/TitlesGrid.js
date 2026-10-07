// The shop's Titles tab.
//
// Shows the WHOLE catalogue, not just what is for sale. Three acquisition
// routes coexist and hiding two of them would make the tab look like a store
// with holes in it:
//
//   shop    buyable with gems, right here
//   streak  earned at a day breakpoint
//   hours   earned at an hours breakpoint
//   box     pulled from a loot box
//
// Earned and box titles render as locked cards that say exactly how to get
// them. You cannot buy past the streak ladder (the server also refuses: those
// rows are box_only, and purchase_shop_item rejects box_only items), but you
// can see the whole ladder and what you are working toward -- which is what
// makes a title worth chasing.

import { useMemo, useState } from 'react';
import { Gem, Check, Lock } from 'lucide-react';
import TitlePlate from './profile/TitlePlate';

const CARD = 'rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]';
const MONO = "font-['JetBrains_Mono'] uppercase tracking-[0.08em]";

const TIER_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

// How a locked title is obtained, in the fewest words that are still exact.
function unlockLabel(item) {
  const d = item.metadata?.days;
  const h = item.metadata?.hours;
  if (item.source_system === 'streak' && d) return `${d}-day streak`;
  if (item.source_system === 'hours' && h) return `${h} hours tracked`;
  if (item.source_system === 'box') return `${(item.box_tier || 'loot').toUpperCase()} box`;
  return 'Locked';
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'shop', label: 'Buyable' },
  { id: 'owned', label: 'Owned' },
  { id: 'locked', label: 'Locked' },
];

export default function TitlesGrid({ titles, gems, buying, onBuy, equippedKey, onEquip, equipping }) {
  const [filter, setFilter] = useState('all');

  const shown = useMemo(() => {
    const rows = (titles || []).filter((t) => {
      if (filter === 'shop') return t.buyable && !t.owned;
      if (filter === 'owned') return t.owned;
      if (filter === 'locked') return !t.owned && !t.buyable;
      return true;
    });
    // Owned first (they are yours), then buyable, then locked; rarity desc
    // inside each group so the best thing in a group leads it.
    const group = (t) => (t.owned ? 0 : t.buyable ? 1 : 2);
    return rows.sort((a, b) =>
      group(a) - group(b) ||
      TIER_ORDER.indexOf(b.rarity_tier) - TIER_ORDER.indexOf(a.rarity_tier) ||
      a.name.localeCompare(b.name));
  }, [titles, filter]);

  const ownedCount = (titles || []).filter((t) => t.owned).length;

  return (
    <div data-testid="titles-grid">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.id ? 'bg-[#95DEE6] text-[#183A3F]' : 'bg-[color:var(--gm-card)] text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
              }`} data-testid={`titles-filter-${f.id}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className={`${MONO} text-[10px] text-[color:var(--gm-muted)] whitespace-nowrap`} data-testid="titles-owned-count">
          {ownedCount}/{(titles || []).length}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className={`${CARD} py-12 text-center`}>
          <p className="text-sm text-[color:var(--gm-muted)]">Nothing here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {shown.map((t) => (
            <TitleCard key={t.key} t={t} gems={gems} buying={buying} onBuy={onBuy}
              equipped={equippedKey === t.key} onEquip={onEquip} equipping={equipping} />
          ))}
        </div>
      )}
    </div>
  );
}

function TitleCard({ t, gems, buying, onBuy, equipped, onEquip, equipping }) {
  const busy = buying === t.id || equipping === `title-${t.key}`;
  const afford = gems >= (t.price || 0);

  return (
    <div className={`${CARD} p-3 flex items-center gap-3`} data-testid={`title-card-${t.key}`}>
      <div className="min-w-0 flex-1">
        <TitlePlate titleKey={t.key} name={t.name} tier={t.rarity_tier} size="md" />
        <p className={`${MONO} text-[9px] text-[color:var(--gm-muted)] mt-1.5`}>
          {t.rarity_tier}{!t.buyable && ` · ${unlockLabel(t)}`}
        </p>
      </div>

      {t.owned ? (
        <button
          onClick={() => !equipped && onEquip?.(t)}
          disabled={equipped || busy}
          className={`flex-none inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs font-bold transition-colors ${
            equipped ? 'bg-[#DBF67F] text-[#2A3B0B]' : 'bg-[#95DEE6] text-[#183A3F] hover:brightness-95 disabled:opacity-50'
          }`}
          data-testid={`title-equip-${t.key}`}
        >
          {equipped ? (<><Check className="w-3.5 h-3.5" strokeWidth={2.6} /> Equipped</>) : busy ? '…' : 'Equip'}
        </button>
      ) : t.buyable ? (
        <button
          onClick={() => onBuy(t.id)}
          disabled={busy || !afford}
          className="flex-none inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#95DEE6] text-[#183A3F] text-xs font-bold hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          data-testid={`title-buy-${t.key}`}
          title={afford ? `Buy ${t.name}` : `Need ${(t.price - gems).toLocaleString()} more gems`}
        >
          <Gem className="w-3.5 h-3.5" strokeWidth={2.4} />
          {busy ? '…' : t.price.toLocaleString()}
        </button>
      ) : (
        <span
          className="flex-none inline-flex items-center gap-1 px-3 h-8 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] text-xs font-bold"
          data-testid={`title-locked-${t.key}`}
        >
          <Lock className="w-3.5 h-3.5" strokeWidth={2.4} />
        </span>
      )}
    </div>
  );
}
