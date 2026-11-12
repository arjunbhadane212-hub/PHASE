import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FlameIcon, GemIcon } from '../icons';
import { soundEngine } from '../../utils/SoundEngine';

// The "streak extended" moment — the single most important screen in a
// streak app (Duolingo's whole retention loop hangs off it). Fires on the
// FIRST completion of the day. The number ticks from yesterday's count to
// today's, the week row fills, and a milestone reward shows when one landed.
// Flat cyan field, dark ink, no glow.
const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StreakCelebration({ before = 0, after = 1, milestone = null, isGameMode = true, onDone }) {
  const [shown, setShown] = useState(before);

  useEffect(() => {
    const t = setTimeout(() => { setShown(after); try { soundEngine.levelUp(); } catch { /* muted */ } }, 550);
    return () => clearTimeout(t);
  }, [after]);

  // last 7 days ending today; filled for the run that ends today
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    return { label: DAY[d.getDay()], filled: 6 - i < after, today: i === 6 };
  });

  const headline = after === 1 ? 'Streak started' : `${after}-day streak`;
  const sub = isGameMode
    ? (after === 1 ? 'Day one is done. Come back tomorrow to make it two.' : 'Extended. Miss a day and it resets to zero.')
    : (after === 1 ? 'The first day is the hardest one. Done.' : 'Another day kept. Quietly, it adds up.');

  return (
    <motion.div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center px-8 text-center bg-[#95DEE6]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="streak-celebration">
      <motion.div initial={{ scale: 0.6, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <FlameIcon size={92} color="#183A3F" variant="solid" strokeWidth={1.6} />
      </motion.div>
      <motion.div key={shown} initial={{ scale: 1.35, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}
        className="font-['Archivo'] font-black text-[#09181C] text-[112px] leading-[0.85] tracking-[-0.04em] mt-3 tabular-nums" data-testid="streak-celebration-count">
        {shown}
      </motion.div>
      <h2 className="font-['Archivo'] font-black uppercase text-[#09181C] text-2xl tracking-[-0.01em] mt-3">{headline}</h2>
      <p className="font-['General_Sans'] font-semibold text-[#183A3F] text-base mt-2 max-w-xs">{sub}</p>

      <div className="flex gap-2 mt-7">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <motion.span initial={false} animate={{ scale: d.today && shown === after ? [1, 1.25, 1] : 1 }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: d.filled ? '#183A3F' : 'transparent', boxShadow: d.filled ? 'none' : 'inset 0 0 0 2px #5FB8C4' }}>
              {d.filled && <FlameIcon size={14} color="#95DEE6" variant="solid" />}
            </motion.span>
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#183A3F]">{d.label}</span>
          </div>
        ))}
      </div>

      {milestone?.gems > 0 && (
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
          className="mt-7 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#09181C] text-[#F4F5F2]" data-testid="streak-milestone">
          <span className="font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-[0.06em]">{milestone.days}-day milestone</span>
          <span className="inline-flex items-center gap-1 font-['Archivo'] font-black"><GemIcon size={14} color="#95DEE6" /> +{milestone.gems}</span>
        </motion.div>
      )}

      <button type="button" onClick={onDone} className="mt-10 w-full max-w-xs py-3.5 rounded-full bg-[#09181C] text-[#F4F5F2] font-['General_Sans'] font-bold text-base" data-testid="streak-celebration-continue">
        Continue
      </button>
    </motion.div>
  );
}
