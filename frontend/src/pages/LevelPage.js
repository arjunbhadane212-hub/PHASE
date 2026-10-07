import { useAuth } from '../contexts/AuthContext';
import {
  Target, Star, Swords, Shield, Flame, Trophy, Crown, Zap, Award, Gem,
  Rocket, Sparkles, Orbit, Atom, Sun, Lock, Check, ChevronsUp,
} from 'lucide-react';
import { RANKS, rankInfo, levelForXp, MAX_LEVEL, PRESTIGE_LEVEL } from '../data/levels';

// 2px-outline icon per rank. Prestige tiers (11-15) escalate toward cosmic.
const LEVEL_ICONS = {
  1: Target, 2: Star, 3: Swords, 4: Shield, 5: Flame,
  6: Trophy, 7: Crown, 8: Zap, 9: Award, 10: Gem,
  11: Rocket, 12: Sparkles, 13: Orbit, 14: Atom, 15: Sun,
};

// Completed / current semantics shared with the rest of the v2 system.
const LIME = '#DBF67F', LIME_INK = '#2A3B0B';

// Convert #RRGGBB → "r,g,b" so we can build rgba() glows at arbitrary alpha.
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)].join(',');
};

// Rank emblem: outline icon on a rank-tinted disc, with optional orbiting aura
// and sparkle motes for the "this is a big deal" hero / prestige treatment.
function Emblem({ level, color, size = 'hero', fx = false }) {
  const Icon = LEVEL_ICONS[level] || Star;
  const c = rgb(color);
  const hero = size === 'hero';
  const dim = hero ? 'w-24 h-24' : 'w-11 h-11';
  const iconDim = hero ? 'w-11 h-11' : 'w-5 h-5';
  return (
    <div className={`relative ${dim} flex-shrink-0 grid place-items-center`}>
      {fx && (
        <>
          {/* slow conic halo — not a linear gradient, so it respects the ban */}
          <span className="lv-spin absolute inset-[-6px] rounded-full"
            style={{ background: `conic-gradient(from 0deg, rgba(${c},0) 0deg, rgba(${c},0.55) 120deg, rgba(${c},0) 240deg)`, filter: 'blur(5px)', opacity: 0.9 }} />
          {/* orbiting mote */}
          <span className="lv-orbit absolute inset-0">
            <span className="absolute left-1/2 -top-1 w-1.5 h-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px 2px rgba(${c},0.9)` }} />
          </span>
        </>
      )}
      {/* radial core glow */}
      <span className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle at 50% 50%, rgba(${c},0.45), rgba(${c},0) 70%)` }} />
      {/* disc */}
      <span className="relative grid place-items-center rounded-full"
        style={{
          width: '82%', height: '82%',
          background: `radial-gradient(circle at 50% 35%, rgba(${c},0.30), rgba(${c},0.10))`,
          border: `1.5px solid rgba(${c},0.55)`,
          boxShadow: `inset 0 1px 10px rgba(${c},0.35), 0 6px 20px -6px rgba(${c},0.6)`,
        }}>
        <Icon className={iconDim} strokeWidth={2} style={{ color, filter: `drop-shadow(0 0 6px rgba(${c},0.8))` }} />
      </span>
    </div>
  );
}

export default function LevelPage() {
  const { user } = useAuth();

  const currentXP = user?.current_xp || 0;
  const totalXP = user?.total_xp_all_time ?? currentXP;
  const currentLevel = user?.rank || levelForXp(currentXP);
  const info = rankInfo(currentLevel);
  const accent = info.color;
  const accentRgb = rgb(accent);
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const isPrestigeNow = currentLevel >= PRESTIGE_LEVEL;

  const nextInfo = isMaxLevel ? info : rankInfo(currentLevel + 1);
  const nextThreshold = isMaxLevel ? info.max_xp : nextInfo.min_xp;
  const xpProgress = isMaxLevel ? 100 : Math.min(Math.max(((currentXP - info.min_xp) / (nextThreshold - info.min_xp)) * 100, 0), 100);
  const xpRemaining = Math.max(0, nextThreshold - currentXP);

  const unlockedCount = currentLevel; // ranks reached, out of MAX_LEVEL

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 animate-slide-up" data-testid="level-page">
      <style>{`
        @keyframes lv-spin { to { transform: rotate(360deg); } }
        @keyframes lv-orbit { to { transform: rotate(360deg); } }
        @keyframes lv-aura { 0%,100%{ transform:scale(1); opacity:.6 } 50%{ transform:scale(1.14); opacity:1 } }
        @keyframes lv-sweep { 0%{ transform:translateX(-120%) } 100%{ transform:translateX(320%) } }
        @keyframes lv-float { 0%,100%{ transform:translateY(0); opacity:.5 } 50%{ transform:translateY(-10px); opacity:1 } }
        @keyframes lv-rise { from{ opacity:0; transform:translateY(14px) } to{ opacity:1; transform:translateY(0) } }
        @keyframes lv-ring { 0%{ box-shadow:0 0 0 0 rgba(${accentRgb},0.55) } 70%,100%{ box-shadow:0 0 0 12px rgba(${accentRgb},0) } }
        @keyframes lv-shine { 0%{ background-position:-180% 0 } 100%{ background-position:280% 0 } }
        .lv-spin { animation: lv-spin 9s linear infinite; }
        .lv-orbit { animation: lv-orbit 5.5s linear infinite; }
        .lv-aura { animation: lv-aura 3.4s ease-in-out infinite; }
        .lv-sweep { animation: lv-sweep 2.6s ease-in-out infinite; }
        .lv-float { animation: lv-float 4s ease-in-out infinite; }
        .lv-ring { animation: lv-ring 2.2s ease-out infinite; }
        .lv-rise { animation: lv-rise .5s cubic-bezier(.22,1,.36,1) both; }
        .lv-shimmer-text {
          background: linear-gradient(90deg, currentColor 0%, #fff 20%, currentColor 40%, currentColor 100%);
          background-size: 220% 100%; -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color: transparent; animation: lv-shine 3.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .lv-spin,.lv-orbit,.lv-aura,.lv-sweep,.lv-float,.lv-ring,.lv-shimmer-text { animation: none !important; }
        }
      `}</style>

      {/* ── HERO: current rank showcase ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 mb-4"
        style={{
          background: 'var(--gm-card)',
          border: `1px solid rgba(${accentRgb},0.35)`,
          boxShadow: `0 20px 50px -24px rgba(${accentRgb},0.65)`,
        }}
        data-testid="current-level-card">
        {/* ambient rank glow + floating motes */}
        <span className="lv-aura absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(${accentRgb},0.38), rgba(${accentRgb},0) 70%)` }} />
        <span className="lv-float absolute top-6 right-16 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: accent, animationDelay: '.6s' }} />
        <span className="lv-float absolute top-16 right-8 w-1 h-1 rounded-full pointer-events-none" style={{ background: accent, animationDelay: '1.4s' }} />

        <div className="relative flex items-center gap-5">
          <Emblem level={currentLevel} color={accent} size="hero" fx />
          <div className="min-w-0">
            <p className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gm-muted)] mb-1 flex items-center gap-1.5">
              {isPrestigeNow && <ChevronsUp className="w-3 h-3" style={{ color: accent }} />}
              {isPrestigeNow ? 'Prestige Rank' : 'Current Rank'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-['JetBrains_Mono'] text-[13px] font-bold tracking-[0.1em]" style={{ color: accent }}>LVL</span>
              <h2 className="text-5xl font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-none tracking-[-0.03em]" data-testid="current-level-display">
                {currentLevel}
              </h2>
            </div>
            <p className={`font-['Archivo'] font-black text-xl mt-1.5 leading-none ${isPrestigeNow ? 'lv-shimmer-text' : ''}`}
              style={{ color: accent }}>
              {info.name}
            </p>
            <p className="font-['General_Sans'] text-[13px] text-[color:var(--gm-muted)] mt-2 leading-snug max-w-xs">
              {info.tagline}
            </p>
          </div>
        </div>

        {/* XP meter */}
        <div className="relative mt-6" data-testid="level-xp-progress">
          <div className="flex justify-between items-end font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.06em] mb-2">
            <span className="text-[color:var(--gm-ink)]">{currentXP.toLocaleString()} XP</span>
            <span className="text-[color:var(--gm-muted)]">{isMaxLevel ? 'MAX' : `${nextThreshold.toLocaleString()} XP`}</span>
          </div>
          <div className="relative h-3.5 rounded-full overflow-hidden" style={{ background: 'var(--gm-track)' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${xpProgress}%`, background: accent, boxShadow: `0 0 14px rgba(${accentRgb},0.75)` }}>
              <span className="lv-sweep absolute top-0 bottom-0 w-1/3"
                style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)' }} />
            </div>
          </div>
          <p className="font-['General_Sans'] text-sm text-[color:var(--gm-muted)] mt-2.5">
            {isMaxLevel ? (
              <span className="font-semibold" style={{ color: accent }}>You've reached Eternal — the final form. Legend.</span>
            ) : (
              <>
                <span className="font-bold text-[color:var(--gm-ink)]">{xpRemaining.toLocaleString()} XP</span>
                {' '}until <span className="font-semibold" style={{ color: nextInfo.color }}>{nextInfo.name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── STAT STRIP ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Total XP', value: totalXP.toLocaleString() },
          { label: 'Ranks Unlocked', value: `${unlockedCount}/${MAX_LEVEL}` },
          { label: 'Tier', value: isPrestigeNow ? 'Prestige' : 'Standard' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--gm-card)' }}>
            <p className="font-['Archivo'] font-black text-lg text-[color:var(--gm-ink)] leading-none truncate">{s.value}</p>
            <p className="font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── ROADMAP ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />
        <h2 className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--gm-muted)]">The Climb</h2>
      </div>

      <div className="relative">
        {RANKS.map((level, idx) => {
          const isCurrent = level.level === currentLevel;
          const isCompleted = level.level < currentLevel;
          const isLocked = level.level > currentLevel;
          const isPrestige = level.level >= PRESTIGE_LEVEL;
          // Suspense: prestige names stay hidden until you're one step away.
          const revealed = !isPrestige || level.level <= currentLevel + 1;
          const c = rgb(level.color);
          const Icon = LEVEL_ICONS[level.level] || Star;
          const prevCompletedOrCurrent = level.level <= currentLevel; // connector fill above this node
          const firstPrestige = level.level === PRESTIGE_LEVEL;

          return (
            <div key={level.level}>
              {/* Divider announcing the endgame tiers */}
              {firstPrestige && (
                <div className="flex items-center gap-3 my-5">
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, var(--gm-track) 100%)' }} />
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--gm-muted)] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Beyond Apex
                  </span>
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--gm-track) 0%, rgba(255,255,255,0) 100%)' }} />
                </div>
              )}

              <div className="lv-rise flex items-stretch gap-3.5 mb-3" style={{ animationDelay: `${Math.min(idx, 10) * 45}ms` }}
                data-testid={`level-roadmap-${level.level}`}>
                {/* Node + connecting rail */}
                <div className="relative flex flex-col items-center w-10 flex-shrink-0">
                  {idx !== 0 && (
                    <span className="absolute -top-3 h-3 w-[2px]"
                      style={{ background: prevCompletedOrCurrent ? level.color : 'var(--gm-track)' }} />
                  )}
                  <div className={`relative w-10 h-10 rounded-xl grid place-items-center ${isCurrent ? 'lv-ring' : ''}`}
                    style={
                      isCompleted ? { background: level.color, boxShadow: `0 0 16px -2px rgba(${c},0.7)` }
                      : isCurrent ? { background: `rgba(${c},0.18)`, border: `1.5px solid ${level.color}` }
                      : { background: 'var(--gm-badge)', border: '1px solid var(--gm-track)' }
                    }>
                    {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} style={{ color: level.level >= 8 ? '#fff' : LIME_INK }} />
                      : isCurrent ? <Icon className="w-5 h-5" strokeWidth={2} style={{ color: level.color }} />
                      : <Lock className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />}
                  </div>
                  {idx !== RANKS.length - 1 && (
                    <span className="flex-1 w-[2px] mt-0"
                      style={{ background: isCompleted ? level.color : 'var(--gm-track)' }} />
                  )}
                </div>

                {/* Rank card */}
                <div className="flex-1 rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: 'var(--gm-card)',
                    border: isCurrent ? `1px solid rgba(${c},0.5)` : '1px solid transparent',
                    boxShadow: isCurrent ? `0 12px 30px -16px rgba(${c},0.8)` : 'none',
                    opacity: isLocked && !revealed ? 0.82 : 1,
                  }}>
                  {/* prestige cards get a faint rank-colored wash behind content */}
                  {isPrestige && (
                    <span className="absolute -right-6 -top-6 w-28 h-28 rounded-full pointer-events-none"
                      style={{ background: `radial-gradient(circle, rgba(${c},${isLocked ? 0.1 : 0.22}), rgba(${c},0) 70%)` }} />
                  )}
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-['JetBrains_Mono'] text-[10px] font-bold tracking-[0.08em]"
                          style={{ color: isLocked ? 'var(--gm-muted)' : level.color }}>
                          LVL {level.level}
                        </span>
                        <h3 className={`font-['Archivo'] font-black text-[15px] leading-none ${isLocked ? 'text-[color:var(--gm-muted)]' : 'text-[color:var(--gm-ink)]'}`}>
                          {revealed ? level.name : '? ? ? ?'}
                        </h3>
                        {isCurrent && (
                          <span className="font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full"
                            style={{ background: level.color, color: level.level >= 8 ? '#fff' : '#09181C' }}>
                            You
                          </span>
                        )}
                        {isPrestige && !isLocked && (
                          <span className="font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full"
                            style={{ background: `rgba(${c},0.18)`, color: level.color }}>
                            Prestige
                          </span>
                        )}
                      </div>
                      <p className="font-['General_Sans'] text-[12px] mt-1.5 leading-snug text-[color:var(--gm-muted)]">
                        {revealed ? level.tagline : 'Locked beyond Apex — keep climbing to reveal.'}
                      </p>
                      <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.04em] text-[color:var(--gm-muted)] mt-2 opacity-80">
                        {level.min_xp.toLocaleString()} — {level.max_xp === 999999 ? 'MAX' : level.max_xp.toLocaleString()} XP
                      </p>
                    </div>
                    {/* trailing emblem */}
                    {revealed ? (
                      <Emblem level={level.level} color={level.color} size="sm" fx={isCurrent || (isPrestige && !isLocked)} />
                    ) : (
                      <div className="w-11 h-11 flex-shrink-0 grid place-items-center rounded-full"
                        style={{ background: 'var(--gm-badge)', border: '1px dashed var(--gm-track)' }}>
                        <Lock className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
