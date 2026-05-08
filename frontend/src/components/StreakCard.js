import { Flame, Shield } from 'lucide-react';

const STREAK_MESSAGES = [
  { min: 0, max: 0, msg: "Start your streak today" },
  { min: 1, max: 2, msg: "Good start. Don't stop." },
  { min: 3, max: 6, msg: "Building momentum." },
  { min: 7, max: 13, msg: "One week strong." },
  { min: 14, max: 29, msg: "You're locked in." },
  { min: 30, max: Infinity, msg: "Legendary consistency." },
];

function getStreakMessage(streak) {
  const entry = STREAK_MESSAGES.find(s => streak >= s.min && streak <= s.max);
  return entry?.msg || "Keep going!";
}

export default function StreakCard({ streak = 0, shieldsActive = 0, isGameMode = false }) {
  const message = getStreakMessage(streak);
  const flameColor = isGameMode 
    ? (streak >= 7 ? 'text-blue-400' : streak >= 3 ? 'text-blue-500' : 'text-zinc-500')
    : (streak >= 7 ? 'text-orange-400' : streak >= 3 ? 'text-orange-500' : 'text-zinc-500');
  
  return (
    <div
      className="glass-card p-4 sm:p-5 w-full hover-lift transition-all"
      data-testid="streak-card"
    >
      <div className="flex items-center gap-4">
        {/* Flame icon */}
        <div className="flex-shrink-0">
          <div className={`relative ${isGameMode ? 'animate-flame-glow' : ''}`}>
            <Flame
              className={`w-10 h-10 sm:w-12 sm:h-12 ${flameColor} ${isGameMode && streak > 0 ? 'animate-flame' : ''}`}
              strokeWidth={1.5}
              data-testid="streak-flame-icon"
            />
          </div>
        </div>
        
        {/* Streak number */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-['Satoshi'] text-white" data-testid="streak-count">
              {streak}
            </span>
            <span className="text-sm text-zinc-400 font-medium">Day Streak</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{message}</p>
        </div>
        
        {/* Shield badge */}
        {shieldsActive > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/15"
            data-testid="streak-shield-badge"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">{shieldsActive}</span>
          </div>
        )}
      </div>
    </div>
  );
}
