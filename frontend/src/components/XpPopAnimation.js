import { useState, useEffect, useCallback } from 'react';

export default function XpPopAnimation({ xpEvents }) {
  // xpEvents: array of { id, amount, boost }
  const [pops, setPops] = useState([]);

  useEffect(() => {
    if (xpEvents.length === 0) return;
    const latest = xpEvents[xpEvents.length - 1];
    setPops(prev => [...prev, { ...latest, createdAt: Date.now() }]);
    
    const timer = setTimeout(() => {
      setPops(prev => prev.filter(p => p.id !== latest.id));
    }, 1600);
    
    return () => clearTimeout(timer);
  }, [xpEvents]);

  if (pops.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center" data-testid="xp-pop-container">
      {pops.map((pop, i) => (
        <div
          key={pop.id}
          className="absolute animate-xp-pop"
          style={{ top: `calc(40% - ${i * 30}px)` }}
        >
          <span className={`text-2xl sm:text-3xl font-black font-['Satoshi'] tracking-tight ${
            pop.boost
              ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
              : 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]'
          }`}>
            +{pop.amount} XP
            {pop.boost && <span className="text-base ml-1 text-amber-300">2x</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
