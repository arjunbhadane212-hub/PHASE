import { useAuth } from '../contexts/AuthContext';
import { Trophy, Star, Shield, Gem, Crown, Swords, Target, Flame, Sparkles, Lock, Check } from 'lucide-react';
import { RANKS, rankInfo, levelForXp, MAX_LEVEL } from '../data/levels';

const LEVEL_ICONS = {
  1: Target, 2: Star, 3: Swords, 4: Shield, 5: Flame,
  6: Trophy, 7: Crown, 8: Sparkles, 9: Gem, 10: Star,
};

// Shared with the rest of the v2 system (Progress / Home): constant in both
// themes, colored surface + dark ink text.
const CYAN = '#95DEE6', CYAN_INK = '#183A3F'; // "current / active"
const LIME = '#DBF67F', LIME_INK = '#2A3B0B'; // "gains / completed"

export default function LevelPage() {
  const { user } = useAuth();

  // Level is stored in users.rank (computed by complete_habit); derive from XP as
  // a fallback. All display data comes from the shared data/levels.js ladder.
  const currentXP = user?.current_xp || 0;
  const currentLevel = user?.rank || levelForXp(currentXP);
  const info = rankInfo(currentLevel);
  const accent = info.color; // protected 10-rank ladder color = rank identity
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  // level_for_xp (server) advances at the NEXT rank's min_xp — which is this
  // rank's max_xp + 1. Target that threshold so the bar/remaining don't read
  // "full but 1 XP owed" (e.g. 250/250 saying "1 XP until…").
  const nextThreshold = isMaxLevel ? info.max_xp : rankInfo(currentLevel + 1).min_xp;
  const xpProgress = isMaxLevel ? 100 : Math.min(Math.max(((currentXP - info.min_xp) / (nextThreshold - info.min_xp)) * 100, 0), 100);
  const xpRemaining = Math.max(0, nextThreshold - currentXP);
  const CurrentIcon = LEVEL_ICONS[currentLevel] || Star;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 animate-slide-up" data-testid="level-page">
      {/* Current Level Card — the page hero; cyan ring marks "you are here" */}
      <div className="rounded-2xl bg-[color:var(--gm-card)] p-6 mb-6 ring-1 ring-[#95DEE6]" data-testid="current-level-card">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${accent}1F` }}>
            <CurrentIcon className="w-7 h-7" style={{ color: accent }} />
          </div>
          <div>
            <p className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)] mb-1">Current Level</p>
            <h2 className="text-3xl font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-none tracking-[-0.02em]" data-testid="current-level-display">
              Level {currentLevel}
            </h2>
            <p className="font-['General_Sans'] font-semibold mt-1" style={{ color: accent }}>{info.name}</p>
          </div>
        </div>

        {/* XP Progress — lime fill (your gains) on a neutral track */}
        <div data-testid="level-xp-progress">
          <div className="flex justify-between font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.06em] mb-2">
            <span className="text-[color:var(--gm-ink)]">{currentXP} XP</span>
            <span className="text-[color:var(--gm-muted)]">{isMaxLevel ? 'MAX' : `${nextThreshold} XP`}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-[color:var(--gm-track)]">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${xpProgress}%`, backgroundColor: LIME }} />
          </div>
          <p className="font-['General_Sans'] text-sm text-[color:var(--gm-muted)] mt-2">
            {isMaxLevel ? 'Max level reached!' : `${xpRemaining} XP until Level ${currentLevel + 1}`}
          </p>
        </div>
      </div>

      {/* Level Roadmap */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-[color:var(--gm-muted)]" />
        <h2 className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]">Roadmap</h2>
      </div>

      <div className="space-y-3">
        {RANKS.map((level) => {
          const isCurrent = level.level === currentLevel;
          const isCompleted = level.level < currentLevel;
          const isLocked = level.level > currentLevel;
          const Icon = LEVEL_ICONS[level.level] || Star;
          return (
            <div key={level.level} className="flex items-center gap-3" data-testid={`level-roadmap-${level.level}`}>
              {/* Node indicator — lime = completed, cyan = current, neutral = locked */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={
                    isCompleted ? { background: LIME }
                    : isCurrent ? { background: CYAN }
                    : { background: 'var(--gm-badge)' }
                  }>
                  {isCompleted ? <Check className="w-4 h-4" style={{ color: LIME_INK }} />
                    : isCurrent ? <Icon className="w-4 h-4" style={{ color: CYAN_INK }} />
                    : <Lock className="w-3.5 h-3.5 text-[color:var(--gm-muted)]" />}
                </div>
              </div>

              {/* Level card */}
              <div className={`flex-1 rounded-2xl bg-[color:var(--gm-card)] p-4 ${isCurrent ? 'ring-1 ring-[#95DEE6]' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-['General_Sans'] font-bold ${isLocked ? 'text-[color:var(--gm-muted)]' : 'text-[color:var(--gm-ink)]'}`}>
                        Level {level.level} — {level.name}
                      </h3>
                      {isCurrent && (
                        <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                          style={{ background: CYAN, color: CYAN_INK }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.04em] text-[color:var(--gm-muted)] mt-1">
                      {level.min_xp} — {level.max_xp === 999999 ? 'MAX' : level.max_xp} XP
                    </p>
                  </div>
                  <Icon className="w-6 h-6 flex-shrink-0"
                    style={{ color: isLocked ? 'var(--gm-checkbox)' : (isCompleted ? `${level.color}99` : level.color) }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
