// Buy / preview sheet. After a purchase it plays a short "YOURS" stamp — a
// solid rarity panel wipes in, the word slams, flat confetti — then offers
// Equip. Same flat language as the box opening.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../BackButton';
import { X, Check, LockIcon, Bookmark, BookmarkCheck } from '../icons';
import { Confetti } from '../boxopen/fx';
import { RarityChip, Price, ItemPreview, MONO, ClockTiles, usePrefersCalm } from './ShopPieces';
import { CATEGORY_COPY, rarityOf, fmt } from './shopModel';

export default function ItemSheet({ item, gems, busy, leavesInMs, onClose, onBuy, onEquip, onWish, justBought }) {
  const calm = usePrefersCalm();
  const [stamp, setStamp] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!justBought) return undefined;
    setStamp(true);
    const t = setTimeout(() => setStamp(false), calm ? 900 : 1500);
    return () => clearTimeout(t);
  }, [justBought, calm]);

  const r = rarityOf(item.tier);
  const price = item.dealPrice ?? item.price;
  const need = Math.max(0, price - (gems ?? 0));
  const where = item.inVault ? 'In the Sanctum this week' : item.inDrop ? 'In today\'s drop' : 'Not in the shop right now';

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={item.name}
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="relative w-full sm:max-w-md bg-[color:var(--gm-card)] rounded-t-3xl sm:rounded-3xl overflow-hidden"
        data-testid="shop-item-sheet">
        <div style={{ height: 4, background: item.tier === 'common' ? 'var(--gm-track)' : r.bg }} />
        <div className="p-5 pb-8 sm:pb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <BackButton onClick={onClose} testId="sheet-back" />
            <div className="flex items-center gap-1.5">
              {onWish && !item.owned && (
                <button type="button" onClick={() => onWish(item)} aria-pressed={item.wish}
                  className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[13px] font-bold ${item.wish ? 'bg-[#D4F36B] text-[#2B3A06]' : 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]'}`}
                  data-testid="sheet-wish">
                  {item.wish ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}{item.wish ? 'Wishlisted' : 'Wishlist'}
                </button>
              )}
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[color:var(--gm-badge)] flex items-center justify-center text-[color:var(--gm-muted)]" aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <p className={`${MONO} text-[13px] text-[color:var(--gm-muted)] mb-2`}>{CATEGORY_COPY[item.category]?.one || 'Item'} · {where}</p>
          <div className="relative rounded-2xl overflow-hidden">
            <ItemPreview item={item} height={136} ring={92} />
            <AnimatePresence>
              {stamp && (
                <motion.div className="absolute inset-0 z-10 flex items-center justify-center origin-left" style={{ background: r.bg }}
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.7, 0, 0.3, 1] }}>
                  <motion.span className="font-display font-black text-[56px] tracking-[-0.03em] leading-none" style={{ color: r.ink === 'var(--gm-muted)' ? 'var(--gm-ink)' : r.ink }}
                    initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.16, duration: 0.14 }}>
                    YOURS
                  </motion.span>
                  {!calm && <Confetti colors={['#D4F36B', '#D4F36B', '#F4F5F2']} count={22} delay={0.2} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <RarityChip tier={item.tier} />
            {item.dealPrice != null && <span className={`${MONO} text-[11px] font-bold px-1.5 py-[3px] rounded-md bg-[#D4F36B] text-[#2B3A06]`}>Daily deal · 30% off</span>}
            {item.history && <span className={`${MONO} text-[11px] font-bold px-1.5 py-[3px] rounded-md bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)]`}>{item.history.text}</span>}
          </div>
          <h3 className="font-display font-black text-[28px] text-[color:var(--gm-ink)] mt-2 tracking-[-0.02em] leading-none">{item.name}</h3>
          <p className="text-sm text-[color:var(--gm-muted)] mt-2">{CATEGORY_COPY[item.category]?.blurb}</p>

          {(item.inDrop || item.inVault) && !item.owned && leavesInMs != null && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[color:var(--gm-bg)] px-3 py-2.5">
              <span className={`${MONO} text-[12px] font-bold text-[color:var(--gm-muted)]`}>Leaves the shop in</span>
              <ClockTiles ms={leavesInMs} compactDays />
            </div>
          )}
          {item.appear && !item.inDrop && !item.inVault && (
            <p className="mt-3 text-xs text-[color:var(--gm-muted)]">
              {item.appear.vault ? `Mythic — sold only in the Sanctum, roughly once every ${item.appear.every} weeks.` : `Turns up about once every ${item.appear.every} days. Wishlist it to get flagged when it's back.`}
            </p>
          )}

          <div className="mt-5">
            {item.equipped ? (
              <div className="w-full h-12 rounded-full bg-[#D4F36B] text-[#2B3A06] font-sans font-bold flex items-center justify-center gap-2"><Check size={18} /> Equipped</div>
            ) : item.owned ? (
              <button type="button" disabled={busy} onClick={() => onEquip(item)}
                className="w-full h-12 rounded-full bg-[#D4F36B] text-[#2B3A06] font-sans font-bold disabled:opacity-50" data-testid="sheet-equip">
                {busy ? 'Equipping…' : 'Equip now'}
              </button>
            ) : !(item.inDrop || item.inVault) ? (
              <div className="w-full h-12 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] font-sans font-bold flex items-center justify-center gap-2">
                <LockIcon size={16} /> Not in stock
              </div>
            ) : need > 0 ? (
              <div className="w-full h-12 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] font-sans font-bold flex items-center justify-center gap-2" data-testid="sheet-short">
                <LockIcon size={16} /> Need {fmt(need)} more gems
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={() => onBuy(item)}
                className="w-full h-12 rounded-full bg-[#D4F36B] text-[#2B3A06] font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50" data-testid="sheet-buy">
                {busy ? 'Buying…' : <>Buy for <Price value={price} was={item.dealPrice != null ? item.price : null} ink="#2B3A06" /></>}
              </button>
            )}
            {need > 0 && !item.owned && (item.inDrop || item.inVault) && (
              <p className="text-center text-xs text-[color:var(--gm-muted)] mt-3">Complete habits and daily quests to earn gems.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
