// The Index — every item the shop can ever sell, in one sheet. Shows what you
// own, what's in stock right now, how often each piece turns up (from the
// live odds), and lets you wishlist the ones you're hunting. Earned titles
// are listed (locked) so the Titles index is complete, but are never sold.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../BackButton';
import { X, Bookmark, BookmarkCheck, LockIcon } from '../icons';
import { ItemPreview, MONO } from './ShopPieces';
import { CATEGORY_COPY, ROTATING, RARITY_ORDER, rarityOf } from './shopModel';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'In stock' },
  { id: 'missing', label: 'Missing' },
  { id: 'owned', label: 'Owned' },
  { id: 'wish', label: 'Wishlist' },
];

function earnedLabel(it) {
  if (it.source === 'streak' && it.meta?.days) return `Earned · ${it.meta.days}-day streak`;
  if (it.source === 'hours' && it.meta?.hours) return `Earned · ${it.meta.hours}h of focus`;
  if (it.source === 'box') return 'Loot box only';
  return 'Earned, never sold';
}

function Status({ it }) {
  if (it.owned) return <span className={`${MONO} text-[11px] font-bold px-1.5 py-[3px] rounded bg-[#D4F36B] text-[#2B3A06]`}>{it.equipped ? 'Equipped' : 'Owned'}</span>;
  if (it.inVault) return <span className={`${MONO} text-[11px] font-bold px-1.5 py-[3px] rounded bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)]`}>In the Sanctum</span>;
  if (it.inDrop) return <span className={`${MONO} text-[11px] font-bold px-1.5 py-[3px] rounded bg-[#D4F36B] text-[#2B3A06]`}>In stock</span>;
  if (!it.sold) return <span className={`${MONO} text-[11px] text-[color:var(--gm-muted)]`}>{earnedLabel(it)}</span>;
  if (it.appear) {
    return <span className={`${MONO} text-[11px] text-[color:var(--gm-muted)] tabular-nums`}>
      {it.appear.vault ? `Sanctum only · ~${it.appear.every}wk` : `~every ${it.appear.every}d`}
    </span>;
  }
  return null;
}

export default function CatalogIndex({ model, onClose, onOpenItem, onWish, initialCategory = 'title' }) {
  const [cat, setCat] = useState(initialCategory);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const rows = useMemo(() => (model.index[cat] || []).filter((it) => {
    if (filter === 'stock') return it.inDrop || it.inVault;
    if (filter === 'missing') return it.sold && !it.owned;
    if (filter === 'owned') return it.owned;
    if (filter === 'wish') return it.wish;
    return true;
  }), [model.index, cat, filter]);

  const groups = useMemo(() => {
    const sold = RARITY_ORDER.slice().reverse().map((t) => ({ tier: t, items: rows.filter((r) => r.sold && r.tier === t) })).filter((g) => g.items.length);
    const earned = rows.filter((r) => !r.sold);
    return { sold, earned };
  }, [rows]);

  const col = model.collection[cat] || { have: 0, total: 0 };
  const pct = col.total ? Math.round((col.have / col.total) * 100) : 0;

  const renderRow = (it, i) => {
    const r = rarityOf(it.tier);
    return (
      <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.025 }}
        className="flex items-center gap-3 rounded-2xl bg-[color:var(--gm-card)] p-2 pr-2.5" data-testid={`index-${it.key}`}>
        <button type="button" onClick={() => it.sold && onOpenItem(it)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`relative flex-none rounded-xl overflow-hidden ${it.category === 'banner' ? 'w-[92px]' : 'w-[64px]'}`} style={{ boxShadow: `inset 0 -3px 0 ${it.tier === 'common' ? 'var(--gm-track)' : r.bg}` }}>
            <div className={!it.owned && !it.inDrop && !it.inVault ? 'opacity-60' : ''}>
              <ItemPreview item={it} height={46} ring={30} />
            </div>
            {!it.sold && !it.owned && <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"><LockIcon size={14} /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans font-bold text-[15px] text-[color:var(--gm-ink)] truncate">{it.name}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap"><Status it={it} /></div>
          </div>
        </button>
        {it.sold && !it.owned && (
          <button type="button" onClick={() => onWish(it)} aria-pressed={it.wish} aria-label={it.wish ? `Remove ${it.name} from wishlist` : `Wishlist ${it.name}`}
            className={`w-8 h-8 flex-none rounded-lg flex items-center justify-center ${it.wish ? 'bg-[#D4F36B] text-[#2B3A06]' : 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]'}`}>
            {it.wish ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
        )}
      </motion.div>
    );
  };

  let n = 0;
  return (
    <motion.div className="fixed inset-0 z-[90] bg-[color:var(--gm-bg)] overflow-y-auto overscroll-contain" data-testid="catalog-index"
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.34, ease: [0.7, 0, 0.3, 1] }}>
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pb-24">
        <div className="sticky top-0 z-10 bg-[color:var(--gm-bg)] pt-4 pb-3">
          <BackButton onClick={onClose} variant="ghost" className="-ml-2 mb-2" testId="catalog-back" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)]`}>The Index · every item</p>
              <h2 className="font-display font-black text-[32px] text-[color:var(--gm-ink)] tracking-[-0.02em] leading-none mt-1">Collection</h2>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-[color:var(--gm-card)] flex items-center justify-center text-[color:var(--gm-muted)]" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-1.5 mt-4 overflow-x-auto no-scrollbar">
            {ROTATING.map((c) => {
              const cc = model.collection[c] || { have: 0, total: 0 };
              return (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-sans font-bold whitespace-nowrap ${cat === c ? 'bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)]' : 'bg-[color:var(--gm-card)] text-[color:var(--gm-muted)]'}`}>
                  {CATEGORY_COPY[c].title} <span className="tabular-nums opacity-70">{cc.have}/{cc.total}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                className={`${MONO} px-2.5 py-1 rounded-md text-[12px] font-bold whitespace-nowrap ${filter === f.id ? 'bg-[#D4F36B] text-[#2B3A06]' : 'text-[color:var(--gm-muted)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[color:var(--gm-card)] p-4 mb-5">
          <div className="flex items-end justify-between">
            <div>
              <p className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)]`}>{CATEGORY_COPY[cat].title} collected</p>
              <p className="font-display font-black text-[40px] leading-[0.9] tracking-[-0.02em] text-[color:var(--gm-ink)] mt-1 tabular-nums">
                {col.have}<span className="text-[color:var(--gm-muted)] text-[25px]">/{col.total}</span>
              </p>
            </div>
            <span className={`${MONO} text-[13px] font-bold text-[color:var(--gm-ink)] tabular-nums`}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[color:var(--gm-track)] mt-3 overflow-hidden">
            <motion.div className="h-full bg-[#D4F36B] rounded-full origin-left" initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ duration: 0.6, ease: 'easeOut' }} />
          </div>
          <p className="text-[13px] text-[color:var(--gm-muted)] mt-3">
            Each shop slot rolls Common {model.odds.common}% · Rare {model.odds.rare}% · Epic {model.odds.epic}% · Legendary {model.odds.legendary}%. Mythics are sold only in the weekly Sanctum.
          </p>
        </div>

        {groups.sold.length === 0 && groups.earned.length === 0 && (
          <p className="text-sm text-[color:var(--gm-muted)] text-center py-10">Nothing here yet.</p>
        )}
        {groups.sold.map((g) => (
          <section key={g.tier} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.tier === 'common' ? 'var(--gm-track)' : rarityOf(g.tier).bg }} />
              <h3 className={`${MONO} text-[13px] font-bold text-[color:var(--gm-ink)]`}>{rarityOf(g.tier).label}</h3>
              <span className={`${MONO} text-[12px] text-[color:var(--gm-muted)]`}>{g.items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {g.items.map((it) => renderRow(it, n++))}
            </div>
          </section>
        ))}
        {groups.earned.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <LockIcon size={12} className="text-[color:var(--gm-muted)]" />
              <h3 className={`${MONO} text-[13px] font-bold text-[color:var(--gm-ink)]`}>Earned — never sold</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {groups.earned.map((it) => renderRow(it, n++))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
