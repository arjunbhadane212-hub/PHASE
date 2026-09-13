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
    }, 1300);
    
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
          <span className={`text-2xl sm:text-3xl font-black font-['Archivo',sans-serif] tracking-tight ${
            pop.boost
              ? 'text-[#DBF67F] drop-shadow-[0_0_14px_rgba(219,246,127,0.55)]'
              : 'text-[#95DEE6] drop-shadow-[0_0_14px_rgba(149,222,230,0.55)]'
          }`}>
            +{pop.amount} XP
            {pop.boost && <span className="text-base ml-1 text-[#DBF67F]">2x</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
