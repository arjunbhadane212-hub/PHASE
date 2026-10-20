// The moment a title is won — and making sure the user actually KNOWS it.
//
// Streak/hours titles are only ever awarded during an online action (completing
// a habit or a focus session), so the user is there to see it. But a title must
// never just appear silently in the inventory: the user should be notified, see
// what it is, and know it's in their Profile to equip (Arjun's UX ask).
//
// Two surfaces, one pipeline, driven by server-side durable notifications:
//   - REAL-TIME: right after a completion that unlocked something, we drain the
//     fresh 'title' notifications and toast them (see drainTitleUnlocks).
//   - CATCH-UP: <TitleUnlockListener> drains again on app load, so a toast the
//     user blinked past — or a session that closed mid-flight — still resurfaces.
// check_title_unlocks() marks each one read as it returns it, so a title is
// toasted exactly once, never twice, even across tabs.

import { useEffect } from 'react';
import { toast } from 'sonner';
import TitlePlate from './TitlePlate';
import { normalizeRarity } from '../../data/profileIdentity';
import { supabase } from '../../lib/supabaseClient';

const SOURCE_LINE = {
  streak: (n) => `${n}-day streak reached`,
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
          Title earned
        </p>
        {line && <p className="text-[11px] text-[color:var(--gm-muted)] truncate">{line}</p>}
        {/* The key UX line: the user is told exactly where it went and that it's
            theirs to equip — so it's a reward they understand, not a mystery. */}
        <p className="text-[11px] font-semibold text-[#95DEE6] truncate">Equip it in your Profile</p>
      </div>
    </div>
  );
}

// Toasts an array of title rows ({ key, name, rarity_tier, source_system,
// threshold }). Staggered so a burst (a returning long-streak user crossing
// several breakpoints at once) reads as a run of wins, not one blur.
export function showTitleUnlocks(titles) {
  if (!Array.isArray(titles) || titles.length === 0) return;
  titles.forEach((title, i) => {
    if (!title?.name || !title?.key) return;
    setTimeout(() => {
      toast.custom(() => <TitleUnlockCard title={title} />, { duration: 5000 });
    }, i * 900);
  });
}

// Drains unread 'title' notifications (marks them read) and toasts them. Call
// after a completion whose response signalled an unlock, and on app load.
export async function drainTitleUnlocks() {
  try {
    const { data } = await supabase.rpc('check_title_unlocks');
    showTitleUnlocks(data || []);
  } catch { /* a missed toast will resurface on the next drain */ }
}

// Mount once in the authenticated app. On load it surfaces any title the user
// earned but never saw (missed toast, or a session that closed before it drew).
export function TitleUnlockListener() {
  useEffect(() => { drainTitleUnlocks(); }, []);
  return null;
}

export default TitleUnlockCard;
