import { ICON_NAMES } from '../components/icons/paths';
import * as Icons from '../components/icons';
import TierEmblem from '../components/TierEmblem';

// Dev-only icon sheet (/dev/icons): every Phase icon at the sizes the app uses,
// outline + solid, on the dark card and on the cyan/lime tiles.
const pascal = (n) => n.charAt(0).toUpperCase() + n.slice(1) + 'Icon';

export default function DevIconsPage() {
  return (
    <div className="min-h-screen bg-[var(--gm-bg)] text-[var(--gm-ink)] p-6">
      <h1 className="font-['Archivo'] font-black text-2xl mb-4">Phase icon set</h1>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {ICON_NAMES.map((n) => {
          const I = Icons[pascal(n)];
          return (
            <div key={n} className="rounded-2xl bg-[var(--gm-card)] p-3 flex flex-col items-center gap-2" data-icon-cell={n}>
              <div className="flex items-end gap-2">
                <I size={16} /><I size={20} /><I size={28} />
              </div>
              <div className="flex gap-2">
                <span className="w-9 h-9 rounded-xl bg-[#95DEE6] text-[#183A3F] flex items-center justify-center"><I size={20} /></span>
                <span className="w-9 h-9 rounded-xl bg-[#DBF67F] text-[#2A3B0B] flex items-center justify-center"><I size={20} variant="solid" /></span>
              </div>
              <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.08em] text-[var(--gm-muted)]">{n}</span>
            </div>
          );
        })}
      </div>
      <h2 className="font-['Archivo'] font-black text-xl mt-8 mb-3">League emblems</h2>
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
          <div key={t} className="flex flex-col items-center gap-1">
            <TierEmblem tier={t} size={72} />
            <TierEmblem tier={t} size={28} plate={false} />
          </div>
        ))}
        <TierEmblem tier={5} size={72} locked />
      </div>
    </div>
  );
}
