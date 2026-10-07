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

const rgbArr = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const rgb = (hex) => rgbArr(hex).join(',');
// Ink that stays legible on a solid rank-color fill (dark ink on light tiles).
const inkOn = (hex) => {
  const [r, g, b] = rgbArr(hex).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.52 ? '#14171A' : '#FFFFFF';
};

// Flat rank emblem — no glow. `solid` = filled rank tile (ink icon); otherwise a
// tonal tile (rank color at low alpha + hairline). This mirrors the title-system
// restraint ladder (solid surface is the premium gesture, withheld, never a glow).
function Emblem({ level, color, size = 'hero', solid = false }) {
  const Icon = LEVEL_ICONS[level] || Star;
  const c = rgb(color);
  const hero = size === 'hero';
  const box = hero ? 'w-20 h-20 rounded-[20px]' : 'w-11 h-11 rounded-xl';
  const ic = hero ? 'w-9 h-9' : 'w-5 h-5';
  return (
    <div className={`${box} flex-shrink-0 grid place-items-center`}
      style={solid
        ? { background: color }
        : { background: `rgba(${c},0.14)`, border: `1px solid rgba(${c},0.30)` }}>
      <Icon className={ic} strokeWidth={2} style={{ color: solid ? inkOn(color) : color }} />
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
  const unlockedCount = currentLevel;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 animate-slide-up" data-testid="level-page">
      <style>{`
        @keyframes lv-sweep { 0%{ transform:translateX(-120%) } 100%{ transform:translateX(320%) } }
        @keyframes lv-rise { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:translateY(0) } }
        .lv-sweep { animation: lv-sweep 2.6s ease-in-out infinite; }
        .lv-rise { animation: lv-rise .45s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce){ .lv-sweep,.lv-rise{ animation:none !important } }
      `}</style>

      {/* ── HERO: current rank ───────────────────────────────────────────── */}
      <div className="rounded-3xl p-6 mb-4"
        style={{ background: 'var(--gm-card)', border: '1px solid var(--gm-track)', boxShadow: 'var(--gm-shadow-card)' }}
        data-testid="current-level-card">
        <div className="flex items-center gap-5">
          <Emblem level={currentLevel} color={accent} size="hero" solid />
          <div className="min-w-0">
            <p className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gm-muted)] mb-1.5 flex items-center gap-1.5">
              {isPrestigeNow && <ChevronsUp className="w-3 h-3" strokeWidth={2.5} style={{ color: accent }} />}
              {isPrestigeNow ? 'Prestige Rank' : 'Current Rank'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-['JetBrains_Mono'] text-[12px] font-bold tracking-[0.1em] text-[color:var(--gm-muted)]">LVL</span>
              <h2 className="text-5xl font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-none tracking-[-0.03em]" data-testid="current-level-display">
                {currentLevel}
              </h2>
            </div>
            <p className="font-['Archivo'] font-black text-xl mt-1.5 leading-none" style={{ color: accent }}>
              {info.name}
            </p>
            <p className="font-['General_Sans'] text-[13px] text-[color:var(--gm-muted)] mt-2 leading-snug max-w-xs">
              {info.tagline}
            </p>
          </div>
        </div>

        {/* XP meter (approved) */}
        <div className="mt-6" data-testid="level-xp-progress">
          <div className="flex justify-between items-end font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.06em] mb-2">
            <span className="text-[color:var(--gm-ink)]">{currentXP.toLocaleString()} XP</span>
            <span className="text-[color:var(--gm-muted)]">{isMaxLevel ? 'MAX' : `${nextThreshold.toLocaleString()} XP`}</span>
          </div>
          <div className="relative h-3.5 rounded-full overflow-hidden" style={{ background: 'var(--gm-track)' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${xpProgress}%`, background: accent, boxShadow: `0 0 14px rgba(${accentRgb},0.65)` }}>
              <span className="lv-sweep absolute top-0 bottom-0 w-1/3"
                style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)' }} />
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

      <div>
        {RANKS.map((level, idx) => {
          const isCurrent = level.level === currentLevel;
          const isCompleted = level.level < currentLevel;
          const isLocked = level.level > currentLevel;
          const isPrestige = level.level >= PRESTIGE_LEVEL;
          const revealed = !isPrestige || level.level <= currentLevel + 1;
          const c = rgb(level.color);
          const Icon = LEVEL_ICONS[level.level] || Star;
          const railAbove = level.level <= currentLevel;
          const firstPrestige = level.level === PRESTIGE_LEVEL;

          return (
            <div key={level.level}>
              {firstPrestige && (
                <div className="flex items-center gap-3 my-5">
                  <span className="h-px flex-1" style={{ background: 'var(--gm-track)' }} />
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--gm-muted)]">
                    Beyond Apex
                  </span>
                  <span className="h-px flex-1" style={{ background: 'var(--gm-track)' }} />
                </div>
              )}

              <div className="lv-rise flex items-stretch gap-3.5 mb-3" style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
                data-testid={`level-roadmap-${level.level}`}>
                {/* Node + rail */}
                <div className="relative flex flex-col items-center w-10 flex-shrink-0">
                  {idx !== 0 && (
                    <span className="absolute -top-3 h-3 w-[2px]"
                      style={{ background: railAbove ? level.color : 'var(--gm-track)' }} />
                  )}
                  <div className="relative w-10 h-10 rounded-xl grid place-items-center"
                    style={
                      isCompleted ? { background: level.color }
                      : isCurrent ? { background: `rgba(${c},0.14)`, border: `1.5px solid ${level.color}` }
                      : { background: 'var(--gm-badge)', border: '1px solid var(--gm-track)' }
                    }>
                    {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} style={{ color: inkOn(level.color) }} />
                      : isCurrent ? <Icon className="w-5 h-5" strokeWidth={2} style={{ color: level.color }} />
                      : <Lock className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />}
                  </div>
                  {idx !== RANKS.length - 1 && (
                    <span className="flex-1 w-[2px]"
                      style={{ background: isCompleted ? level.color : 'var(--gm-track)' }} />
                  )}
                </div>

                {/* Rank card */}
                <div className="flex-1 rounded-2xl p-4 relative"
                  style={{
                    background: 'var(--gm-card)',
                    border: isCurrent ? `1px solid rgba(${c},0.45)` : '1px solid transparent',
                    opacity: isLocked && !revealed ? 0.86 : 1,
                  }}>
                  <div className="flex items-center justify-between gap-3">
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
                            style={{ background: level.color, color: inkOn(level.color) }}>
                            You
                          </span>
                        )}
                        {isPrestige && !isLocked && (
                          <span className="font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full"
                            style={{ background: `rgba(${c},0.14)`, color: level.color }}>
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
                    {revealed ? (
                      <Emblem level={level.level} color={level.color} size="sm" solid={isCurrent} />
                    ) : (
                      <div className="w-11 h-11 flex-shrink-0 grid place-items-center rounded-xl"
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
