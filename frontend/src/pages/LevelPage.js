import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { Trophy, Star, Shield, Gem, Heart, Crown, Swords, Target, Flame, Sparkles, Lock, Check } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const LEVEL_ICONS = {
  1: Target,
  2: Star,
  3: Swords,
  4: Shield,
  5: Flame,
  6: Trophy,
  7: Crown,
  8: Sparkles,
  9: Gem,
  10: Star,
};

export default function LevelPage() {
  const { user } = useAuth();
  const { isGameMode } = useMode();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/levels`);
      // Backend may be unconfigured (relative URL resolves to the SPA's HTML);
      // never trust the shape — a non-array would crash levels.find below.
      setLevels(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const currentLevel = user?.current_level || 1;
  const currentXP = user?.current_xp || 0;
  const currentLevelInfo = levels.find(l => l.level === currentLevel) || { min_xp: 0, max_xp: 100 };
  const xpInLevel = currentXP - currentLevelInfo.min_xp;
  const xpNeeded = currentLevelInfo.max_xp - currentLevelInfo.min_xp;
  const xpProgress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 animate-slide-up" data-testid="level-page">
      {/* Current Level Card */}
      <div className={`glass-card p-6 mb-6 ${isGameMode ? 'hover-glow' : ''}`} data-testid="current-level-card">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isGameMode ? 'bg-purple-500/10 animate-level-glow' : 'bg-zinc-800'
          }`}>
            {(() => { const Icon = LEVEL_ICONS[currentLevel] || Star; return <Icon className={`w-7 h-7 ${isGameMode ? 'text-purple-400' : 'text-zinc-300'}`} />; })()}
          </div>
          <div>
            <h2 className="text-2xl font-bold font-['Satoshi'] text-white" data-testid="current-level-display">
              Level {currentLevel}
            </h2>
            <p className="text-zinc-400">{user?.level_name || 'Rookie'}</p>
          </div>
        </div>

        {/* XP Progress */}
        <div data-testid="level-xp-progress">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">{currentXP} XP</span>
            <span className="text-zinc-500">{currentLevelInfo.max_xp === 999999 ? 'MAX' : `${currentLevelInfo.max_xp} XP`}</span>
          </div>
          <div className="h-3 bg-zinc-800/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGameMode ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-zinc-500'
              }`}
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {currentLevel >= 10 ? 'Max level reached!' : `${Math.max(1, xpNeeded - xpInLevel)} XP until Level ${currentLevel + 1}`}
          </p>
        </div>
      </div>

      {/* Level Roadmap */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Roadmap</h2>
      </div>

      <div className="space-y-3">
        {levels.map((level) => {
          const isCurrent = level.level === currentLevel;
          const isCompleted = level.level < currentLevel;
          const isLocked = level.level > currentLevel;
          const Icon = LEVEL_ICONS[level.level] || Star;

          return (
            <div
              key={level.level}
              className={`flex items-center gap-3 ${isCurrent ? '' : ''}`}
              data-testid={`level-roadmap-${level.level}`}
            >
              {/* Progress line indicator */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isCompleted
                    ? 'bg-emerald-500/15 border border-emerald-500/20'
                    : isCurrent
                      ? isGameMode
                        ? 'bg-purple-500/15 border border-purple-500/25 animate-level-glow'
                        : 'bg-zinc-700 border border-zinc-600'
                      : 'bg-zinc-800/50 border border-zinc-800'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Icon className={`w-4 h-4 ${isGameMode ? 'text-purple-400' : 'text-white'}`} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
              </div>

              {/* Level card */}
              <div className={`flex-1 glass-card p-4 ${
                isCurrent
                  ? isGameMode
                    ? 'border-purple-500/20 hover-glow'
                    : 'border-zinc-600'
                  : isCompleted
                    ? 'border-emerald-500/10'
                    : ''
              } transition-all`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isLocked ? 'text-zinc-600' : 'text-white'}`}>
                        Level {level.level} — {level.name}
                      </h3>
                      {isCurrent && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isGameMode ? 'bg-purple-500/15 text-purple-400' : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {level.min_xp} — {level.max_xp === 999999 ? 'MAX' : level.max_xp} XP
                    </p>
                    
                    {/* Game Mode Rewards */}
                    {isGameMode && (level.gems > 0 || level.revives > 0) && (
                      <div className="flex items-center gap-3 mt-2">
                        {level.gems > 0 && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            <Gem className="w-3 h-3" /> +{level.gems}
                          </span>
                        )}
                        {level.revives > 0 && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isCompleted ? 'bg-rose-500/15 text-rose-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            <Heart className="w-3 h-3" /> +{level.revives}
                          </span>
                        )}
                        {isCompleted && <span className="text-[10px] text-emerald-500 font-medium">CLAIMED</span>}
                        {isLocked && <span className="text-[10px] text-zinc-600 font-medium">LOCKED</span>}
                      </div>
                    )}
                  </div>
                  <Icon className={`w-6 h-6 flex-shrink-0 ${
                    isLocked ? 'text-zinc-700' : isCompleted ? 'text-emerald-500/50' : isGameMode ? 'text-purple-400/50' : 'text-zinc-500'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
