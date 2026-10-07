// The moment a title is won.
//
// Deliberately NOT a generic "Achievement unlocked!" notification: it renders
// the exact chip the title will live in permanently -- same glyph, same accent,
// same rarity treatment -- so the first time a player sees "Aflame" it already
// looks like the thing that will sit on their profile. A generic toast followed
// by a different-looking badge later reads as two separate rewards; this reads
// as one.
//
// Fed by the `newly_unlocked` array that sync_progress_titles() returns through
// the complete_habit RPC. One toast per title, staggered -- crossing several
// breakpoints at once should feel like a run of wins, not one collapsed summary.

import { toast } from 'sonner';
import TitlePlate from './TitlePlate';
import { normalizeRarity } from '../../data/profileIdentity';

const SOURCE_LINE = {
  streak: (n) => `${n}-day streak`,
  hours: (n) => `${n} hours tracked`,
};

export function TitleUnlockCard({ title }) {
  const tier = normalizeRarity(title.rarity_tier) || 'common';
  const line = SOURCE_LINE[title.source_system]?.(title.threshold);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]"
      data-testid="toast-title-unlock"
      data-title-key={title.key}
    >
      <TitlePlate titleKey={title.key} name={title.name} tier={tier} size="md" />
      <div className="min-w-0">
        <p className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--gm-ink)]">
          Title unlocked
        </p>
        {line && <p className="text-[11px] text-[color:var(--gm-muted)] truncate">{line}</p>}
      </div>
    </div>
  );
}

// Fires one toast per newly earned title. Safe to call with undefined/[] -- the
// common case is that nothing was unlocked, and that must cost nothing.
export function showTitleUnlocks(newlyUnlocked) {
  if (!Array.isArray(newlyUnlocked) || newlyUnlocked.length === 0) return;
  newlyUnlocked.forEach((title, i) => {
    if (!title?.name || !title?.key) return;
    setTimeout(() => {
      toast.custom(() => <TitleUnlockCard title={title} />, { duration: 4200 });
    }, i * 900);
  });
}

export default TitleUnlockCard;
