import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import TierEmblem from './TierEmblem';
import { LEADERBOARD_TIERS } from '../data/leaderboardTiers';

// Duolingo-style league progression strip. Shows the full 10-tier ladder:
//   past tiers   → earned (dimmed, check badge)
//   current tier → large, haloed, "YOUR LEAGUE"
//   next tier    → previewed in full colour, "NEXT" — the carrot
//   beyond next  → locked silhouettes you have to climb to reveal
//
// Horizontally scrollable; on mount it centres the player's current tier.
export default function LeagueLadder({ current = 1 }) {
  const trackRef = useRef(null);
  const currentRef = useRef(null);

  useEffect(() => {
    const node = currentRef.current;
    const track = trackRef.current;
    if (!node || !track) return;
    // Centre the current tier without yanking the whole page.
    const left = node.offsetLeft - track.clientWidth / 2 + node.clientWidth / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, [current]);

  return (
    <div
      className="rounded-3xl overflow-hidden bg-[color:var(--gm-card)]"
      style={{ boxShadow: 'var(--gm-shadow-card)' }}
      data-testid="league-ladder"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-[15px] font-['Archivo'] font-extrabold text-[color:var(--gm-ink)]">League Ladder</h2>
        <span className="font-['JetBrains_Mono'] text-[10px] font-bold tracking-[0.12em] uppercase text-[color:var(--gm-muted)]">
          Tier {Math.min(current, 10)} / 10
        </span>
      </div>

      <div
        ref={trackRef}
        className="flex items-stretch overflow-x-auto px-5 pb-4 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {LEADERBOARD_TIERS.map((t, i) => {
          const isPast = t.n < current;
          const isCurrent = t.n === current;
          const isNext = t.n === current + 1;
          const locked = t.n > current + 1;
          const size = isCurrent ? 82 : isNext ? 58 : 50;

          const cap = isCurrent ? 'Your League' : isNext ? 'Next' : '';
          const capColor = isCurrent ? t.a : 'var(--gm-muted)';
          const name = locked ? '???' : t.key;
          const nameColor = locked ? 'var(--gm-muted)' : isPast ? 'var(--gm-ink)' : t.a;
          const nodeOpacity = isPast ? 0.72 : 1;

          // Connector between nodes: lit up to & including the current tier.
          const connectorLit = t.n <= current;
          const connector = i > 0 && (
            <div
              className="self-center mt-9 rounded-full"
              style={{
                flex: '0 0 24px', height: 3,
                background: connectorLit ? LEADERBOARD_TIERS[i - 1].a : 'var(--gm-badge)',
                opacity: connectorLit ? 0.7 : 0.45,
              }}
            />
          );

          return (
            <div key={t.n} className="flex items-stretch">
              {connector}
              <div
                ref={isCurrent ? currentRef : null}
                className="relative flex flex-col items-center flex-shrink-0 px-1.5"
                style={{ opacity: nodeOpacity, width: isCurrent ? 104 : 76 }}
                data-testid={`ladder-node-${t.n}`}
              >
                <div className="h-3 mb-1.5 font-['JetBrains_Mono'] text-[8.5px] font-bold tracking-[0.14em] uppercase" style={{ color: capColor }}>
                  {cap}
                </div>

                <div
                  className="rounded-full flex items-center justify-center"
                  style={isCurrent ? {
                    padding: 6,
                    background: `radial-gradient(circle, ${t.a}30, transparent 70%)`,
                    boxShadow: `0 0 0 2px ${t.a}, 0 0 22px ${t.a}80`,
                  } : { padding: 4 }}
                >
                  <TierEmblem tier={t.n} size={size} glow={!locked && !isPast} locked={locked} />
                </div>

                {isPast && (
                  <span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{ top: 16, right: 12, width: 17, height: 17, background: t.a }}
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={3.5} style={{ color: '#0b0d10' }} />
                  </span>
                )}

                <div className="mt-2 text-[11px] font-['Archivo'] font-extrabold leading-tight text-center" style={{ color: nameColor }}>
                  {name}
                </div>
                <div className="font-['JetBrains_Mono'] text-[8.5px] text-[color:var(--gm-muted)] tracking-[0.06em]">
                  {locked ? 'Locked' : `Tier ${t.n}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
