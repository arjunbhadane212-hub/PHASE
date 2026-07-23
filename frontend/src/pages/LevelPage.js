import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { Trophy, Star, Shield, Gem, Crown, Swords, Target, Flame, Sparkles, Lock, Check } from 'lucide-react';
import { RANKS, rankInfo, levelForXp, MAX_LEVEL } from '../data/levels';

const LEVEL_ICONS = {
  1: Target, 2: Star, 3: Swords, 4: Shield, 5: Flame,
  6: Trophy, 7: Crown, 8: Sparkles, 9: Gem, 10: Star,
};

export default function LevelPage() {
  const { user } = useAuth();
  const { isGameMode } = useMode();

  // Level is stored in users.rank (computed by complete_habit); derive from XP as
  // a fallback. All display data comes from the shared data/levels.js ladder.
  const currentXP = user?.current_xp || 0;
  const currentLevel = user?.rank || levelForXp(currentXP);
  const info = rankInfo(currentLevel);
  const accent = info.color;
  const xpInLevel = currentXP - info.min_xp;
  const xpNeeded = info.max_xp - info.min_xp;
  const xpProgress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;
  const CurrentIcon = LEVEL_ICONS[currentLevel] || Star;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 animate-slide-up" data-testid="level-page">
      {/* Current Level Card */}
      <div className={`glass-card p-6 mb-6 ${isGameMode ? 'hover-glow' : ''}`} data-testid="current-level-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${accent}1A`, border: `1px solid ${accent}40` }}>
            <CurrentIcon className="w-7 h-7" style={{ color: accent }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-['Satoshi'] text-white" data-testid="current-level-display">
              Level {currentLevel}
            </h2>
            <p className="text-zinc-400">{info.name}</p>
          </div>
        </div>

        {/* XP Progress — blue fill per CLAUDE.md (Level screen XP bar -> #3B82F6) */}
        <div data-testid="level-xp-progress">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">{currentXP} XP</span>
            <span className="text-zinc-500">{info.max_xp === 999999 ? 'MAX' : `${info.max_xp} XP`}</span>
          </div>
          <div className="h-3 bg-zinc-800/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${xpProgress}%`, backgroundColor: isGameMode ? '#3B82F6' : '#71717A' }} />
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {currentLevel >= MAX_LEVEL ? 'Max level reached!' : `${Math.max(1, xpNeeded - xpInLevel)} XP until Level ${currentLevel + 1}`}
          </p>
        </div>
      </div>

      {/* Level Roadmap */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Roadmap</h2>
      </div>

      <div className="space-y-3">
        {RANKS.map((level) => {
          const isCurrent = level.level === currentLevel;
          const isCompleted = level.level < currentLevel;
          const isLocked = level.level > currentLevel;
          const Icon = LEVEL_ICONS[level.level] || Star;
          return (
            <div key={level.level} className="flex items-center gap-3" data-testid={`level-roadmap-${level.level}`}>
              {/* Node indicator */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={
                    isCompleted ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }
                    : isCurrent ? { background: `${level.color}26`, border: `1px solid ${level.color}40` }
                    : { background: 'rgba(39,39,42,0.5)', border: '1px solid rgba(39,39,42,1)' }
                  }>
                  {isCompleted ? <Check className="w-4 h-4 text-emerald-400" />
                    : isCurrent ? <Icon className="w-4 h-4" style={{ color: level.color }} />
                    : <Lock className="w-3.5 h-3.5 text-zinc-600" />}
                </div>
              </div>

              {/* Level card */}
              <div className={`flex-1 glass-card p-4 transition-all ${isCurrent ? 'hover-glow' : ''}`}
                style={isCurrent ? { borderColor: `${level.color}33` } : undefined}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isLocked ? 'text-zinc-600' : 'text-white'}`}>
                        Level {level.level} — {level.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${level.color}26`, color: level.color }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {level.min_xp} — {level.max_xp === 999999 ? 'MAX' : level.max_xp} XP
                    </p>
                  </div>
                  <Icon className="w-6 h-6 flex-shrink-0"
                    style={{ color: isLocked ? '#3f3f46' : isCompleted ? 'rgba(16,185,129,0.5)' : `${level.color}80` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
