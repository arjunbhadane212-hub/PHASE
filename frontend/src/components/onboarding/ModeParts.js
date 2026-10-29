import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Gem, Gamepad2, Eye, Play } from 'lucide-react';
import { eyebrow } from './data';

// Mode picker card + its two live previews, and the post-onboarding splash.

export function ModeCard({ mode, selected, onClick }) {
  const Icon = mode.icon;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-[22px] p-3 transition-colors ${
        selected ? 'bg-[#95DEE6] shadow-[var(--gm-shadow-hero)]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] hover:bg-[var(--gm-badge)]'
      }`}
      aria-pressed={selected}
      data-testid={`onboarding-mode-${mode.id}`}
    >
      <div className="rounded-2xl bg-[#0B0D0F] h-[150px] overflow-hidden relative">
        {mode.id === 'game' ? <GamePreview /> : <FocusPreview />}
      </div>
      <div className="p-2 pt-4">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`} />
          <h3 className={`font-['Archivo'] font-black text-xl tracking-[-0.01em] ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>{mode.label}</h3>
        </div>
        <p className={`text-sm font-bold mt-1 ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>{mode.tagline}</p>
        <ul className="mt-3 space-y-1.5">
          {mode.points.map((p) => (
            <li key={p} className={`flex items-center gap-2 text-[13px] font-medium ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-[#183A3F]' : 'bg-[var(--gm-muted)]'}`} />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

// A habit row that checks itself and pays out: the Game Mode loop in 2 seconds.
function GamePreview() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const [gems, setGems] = useState(240);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => {
      setDone((d) => {
        if (!d) setGems((g) => g + 10);
        return !d;
      });
    }, 1600);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="absolute inset-0 p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className={`${eyebrow} text-[#9BA09C]`}>Morning</span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#95DEE6] text-[#183A3F] text-xs font-black font-['Archivo'] tabular-nums">
          <Gem className="w-3 h-3" /> {gems}
        </span>
      </div>
      <div className="relative">
        <motion.div
          className="flex items-center gap-3 rounded-[14px] p-3"
          animate={{ backgroundColor: done ? '#DBF67F' : '#1F2123' }}
          transition={{ duration: 0.25 }}
        >
          <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center ${done ? 'bg-[#2A3B0B]' : 'border-2 border-[#52525B]'}`}>
            {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </div>
          <span className={`flex-1 text-[13px] font-bold ${done ? 'text-[#0F1210]' : 'text-[#F4F5F2]'}`}>Morning run</span>
          <span className={`font-['JetBrains_Mono'] text-[11px] font-bold ${done ? 'text-[#2A3B0B]' : 'text-[#9BA09C]'}`}>+25 XP</span>
        </motion.div>
        <AnimatePresence>
          {done && (
            <motion.span
              key="pop"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -30 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute right-3 top-0 font-['Archivo'] font-black text-[#DBF67F] text-lg"
            >
              +25 XP
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// The Focus takeover: a draining ring and a countdown, nothing else.
function FocusPreview() {
  const reduce = useReducedMotion();
  const [sec, setSec] = useState(15 * 60);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setSec((s) => (s <= 0 ? 15 * 60 : s - 7)), 100);
    return () => clearInterval(t);
  }, [reduce]);
  const pct = sec / (15 * 60);
  const r = 46;
  const c = 2 * Math.PI * r;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5">
      <div className="relative w-[110px] h-[110px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#1F2123" strokeWidth="7" />
          <circle cx="55" cy="55" r={r} fill="none" stroke="#95DEE6" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-['Archivo'] font-black text-[#F4F5F2] text-[22px] tabular-nums">
          {mm}:{ss}
        </div>
      </div>
      <div>
        <span className={`${eyebrow} text-[#9BA09C]`}>In session</span>
        <p className="text-[13px] font-bold text-[#F4F5F2] mt-1">Deep work</p>
        <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F2123] text-[#9BA09C] text-[11px] font-bold">
          <Play className="w-2.5 h-2.5 fill-current" /> 15 min
        </span>
      </div>
    </div>
  );
}

export function Splash({ mode, name }) {
  if (mode === 'game') {
    return (
      <div className="min-h-screen bg-[#DBF67F] flex items-center justify-center overflow-hidden px-6" data-testid="onboarding-splash">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.6 }}
            className="w-20 h-20 rounded-[22px] bg-[#2A3B0B] flex items-center justify-center mx-auto mb-7"
          >
            <Gamepad2 className="w-10 h-10 text-[#DBF67F]" />
          </motion.div>
          <motion.h1
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="font-['Archivo'] font-black text-[#2A3B0B] text-[48px] sm:text-[72px] leading-[0.9] tracking-[-0.02em]"
          >
            {name ? `Game on, ${name}.` : 'Game on.'}
          </motion.h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-['JetBrains_Mono'] font-bold uppercase text-xs tracking-[0.08em] text-[#2A3B0B]/70 mt-4"
          >
            Rookie · Level 1 · Day 1
          </motion.p>
        </div>
      </div>
    );
  }
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center px-6" data-testid="onboarding-splash">
      <div className="text-center">
        <div className="relative w-[130px] h-[130px] mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={r} fill="none" stroke="#1F2123" strokeWidth="8" />
            <motion.circle
              cx="65" cy="65" r={r} fill="none" stroke="#95DEE6" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
            />
          </svg>
          <Eye className="absolute inset-0 m-auto w-10 h-10 text-[#F4F5F2]" />
        </div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-['Archivo'] font-black text-[#F4F5F2] text-[40px] sm:text-[56px] leading-[0.92] tracking-[-0.02em]"
        >
          Let's get to work.
        </motion.h1>
      </div>
    </div>
  );
}
