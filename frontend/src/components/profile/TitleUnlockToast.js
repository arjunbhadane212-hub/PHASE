// The moment a title is won.
//
// This is deliberately NOT a generic "Achievement unlocked!" notification. It
// renders the exact <TitlePlate> the title will live in permanently — same
// form, same glow, same glyph stage — so the first time a player sees "Aflame"
// it already looks like the thing that will sit on their public profile. A
// generic toast followed by a different-looking badge later reads as two
// separate rewards; this reads as one.
//
// Fed by the `newly_unlocked` array that sync_progress_titles() returns through
// the complete_habit RPC. One toast per title, staggered — crossing several
// breakpoints at once (a first sync on a long-standing account) should feel
// like a run of wins, not one collapsed summary.

import { toast } from 'sonner';
import TitlePlate from './TitlePlate';
import { titleStyle, normalizeRarity, resolveTitleSource, RARITY_GLOW } from '../../data/profileIdentity';

const SOURCE_LINE = {
  streak: n => `${n}-day streak`,
  hours:  n => `${n} hours tracked`,
};

export function TitleUnlockCard({ title }) {
  const source = resolveTitleSource(title.source_system, title.rarity_style, title.rarity);
  const tier = normalizeRarity(title.rarity_tier) || 'common';
  const spec = { ...titleStyle(source), ...(RARITY_GLOW[tier] || {}) };
  const line = SOURCE_LINE[title.source_system]?.(title.threshold);

  return (
    <div
      className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08]"
      style={{ boxShadow: `0 0 ${18 + (spec.glow ?? 0) * 26}px ${spec.a}2e` }}
      data-testid="toast-title-unlock"
      data-title-key={title.key}
    >
      <TitlePlate name={title.name} source={source} tier={tier} spec={spec} size="md" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: spec.a }}>
          Title unlocked
        </p>
        {line && <p className="text-[11px] text-white/45 truncate">{line}</p>}
      </div>
    </div>
  );
}

// Fires one toast per newly earned title. Safe to call with undefined/[] — the
// common case is that nothing was unlocked, and that must cost nothing.
export function showTitleUnlocks(newlyUnlocked) {
  if (!Array.isArray(newlyUnlocked) || newlyUnlocked.length === 0) return;
  newlyUnlocked.forEach((title, i) => {
    if (!title?.name) return;
    setTimeout(() => {
      toast.custom(() => <TitleUnlockCard title={title} />, { duration: 4200 });
    }, i * 900);
  });
}

export default TitleUnlockCard;
