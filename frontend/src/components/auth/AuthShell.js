import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Eye, EyeOff } from 'lucide-react';
import PhaseWordmark from '../brand/PhaseMark';

// Shared v2 shell for Log in / Sign up. Calm by design: one column of form on
// the page background, and on desktop a single solid cyan panel with a small,
// slow piece of the app moving inside it. No photos, no gradients, no glow.

export const eyebrow =
  "font-['JetBrains_Mono'] font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.08em]";

export default function AuthShell({ children, panel }) {
  return (
    <div className="min-h-screen bg-[var(--gm-bg)] flex">
      <div className="flex-1 flex flex-col px-6 sm:px-10 py-6 sm:py-8 min-w-0">
        <PhaseWordmark size={28} testId="auth-logo" />
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
      <div className="hidden lg:block flex-1 p-4 max-w-[720px]">
        <div className="h-full rounded-[28px] bg-[#95DEE6] overflow-hidden relative flex flex-col justify-between p-10 xl:p-12">
          {panel}
        </div>
      </div>
    </div>
  );
}

export function AuthTitle({ title, sub, testId }) {
  return (
    <div className="mb-8">
      <h1
        className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[34px] sm:text-[40px] leading-[0.95] tracking-[-0.02em]"
        data-testid={testId}
      >
        {title}
      </h1>
      {sub && <p className="mt-3 text-[15px] text-[var(--gm-muted)] font-medium">{sub}</p>}
    </div>
  );
}

export function AuthField({ id, label, type = 'text', value, onChange, placeholder, error, autoComplete, autoFocus, testId, aside, children }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={`${eyebrow} text-[var(--gm-muted)]`}>{label}</label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          className={`phase-input w-full h-[52px] rounded-2xl bg-[var(--gm-card)] px-4 ${isPassword ? 'pr-12' : ''} text-[15px] font-medium text-[var(--gm-ink)] placeholder:text-[var(--gm-muted)] placeholder:opacity-60 outline-none border-2 transition-colors ${
            error ? 'phase-input-error border-[#B91C1C]' : 'border-transparent'
          }`}
          data-testid={testId}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gm-muted)] hover:text-[var(--gm-ink)]"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            data-testid={testId ? `${testId}-toggle` : undefined}
          >
            {reveal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-[#F07C7C]">{error}</p>}
      {children}
    </div>
  );
}

export function AuthError({ children, testId }) {
  if (!children) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[var(--gm-card)] p-4" data-testid={testId}>
      <span className="mt-1.5 w-2 h-2 rounded-full bg-[#B91C1C] flex-shrink-0" />
      <p className="text-sm font-medium text-[var(--gm-ink)]">{children}</p>
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`w-full h-[52px] rounded-full bg-[#95DEE6] text-[#183A3F] text-[15px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Desktop panels ─────────────────────────────────────────────────────── */

const INK = '#183A3F';

// Log in: "the chain" — a week of pips filling one by one, with the streak
// number ticking alongside. Says "you have something to come back to".
export function LoginPanel() {
  const reduce = useReducedMotion();
  const [filled, setFilled] = useState(reduce ? 6 : 0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setFilled((f) => (f >= 7 ? 0 : f + 1)), 900);
    return () => clearInterval(t);
  }, [reduce]);
  const streak = 41 + Math.min(filled, 7);

  return (
    <>
      <span className={`${eyebrow} text-[#3E6C71]`}>Welcome back</span>
      <div>
        <div className="font-['Archivo'] font-black text-[#183A3F] text-[64px] xl:text-[80px] leading-[0.88] tracking-[-0.02em]">
          Don't break<br />the chain.
        </div>
        <div className="mt-10 rounded-[22px] bg-[#183A3F] p-6 max-w-[420px]">
          <div className="flex items-end justify-between">
            <div>
              <span className={`${eyebrow} text-[#76B5BC]`}>Day streak</span>
              <div className="font-['Archivo'] font-black text-[#95DEE6] text-[52px] leading-[0.88] tracking-[-0.02em] mt-2 tabular-nums">
                {streak}
              </div>
            </div>
            <span className={`${eyebrow} text-[#76B5BC]`}>This week</span>
          </div>
          <div className="flex gap-1.5 mt-5">
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 h-2 rounded-full"
                animate={{ backgroundColor: i < filled ? '#95DEE6' : '#2C5A60' }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-[15px] font-medium text-[#3E6C71] max-w-[360px]">
        Your rank, your gems and your streak are right where you left them.
      </p>
    </>
  );
}

// Sign up: a fresh account's first day — three habits get checked off and
// the XP total climbs. Shows the reward loop before they've even joined.
const FIRST_DAY = [
  { name: 'Drink water before coffee', xp: 10 },
  { name: '20 minute workout', xp: 25 },
  { name: 'Read 10 pages', xp: 25 },
];

export function SignupPanel() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setDone((d) => (d >= 4 ? 0 : d + 1)), 1100);
    return () => clearInterval(t);
  }, [reduce]);
  const count = Math.min(done, 3);
  const xp = FIRST_DAY.slice(0, count).reduce((s, h) => s + h.xp, 0);

  return (
    <>
      <span className={`${eyebrow} text-[#3E6C71]`}>Day 1</span>
      <div>
        <div className="font-['Archivo'] font-black text-[#183A3F] text-[64px] xl:text-[80px] leading-[0.88] tracking-[-0.02em]">
          Every habit<br />pays out.
        </div>
        <div className="mt-10 space-y-2.5 max-w-[420px]">
          {FIRST_DAY.map((h, i) => {
            const isDone = i < count;
            return (
              <motion.div
                key={h.name}
                className="flex items-center gap-3 rounded-[18px] p-3.5"
                animate={{ backgroundColor: isDone ? '#DBF67F' : '#183A3F' }}
                transition={{ duration: 0.3 }}
              >
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-[#2A3B0B]' : 'border-2 border-[#3E6C71]'}`}>
                  {isDone && <Check className="w-4 h-4 text-[#DBF67F]" strokeWidth={3} />}
                </div>
                <span className={`flex-1 text-sm font-bold ${isDone ? 'text-[#2A3B0B]' : 'text-[#C7F0F5]'}`}>{h.name}</span>
                <span className={`font-['JetBrains_Mono'] text-xs font-bold ${isDone ? 'text-[#2A3B0B]' : 'text-[#76B5BC]'}`}>+{h.xp} XP</span>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-[15px] font-medium text-[#3E6C71] max-w-[300px]">
          Free forever. No ads. Your first streak starts the day you join.
        </p>
        <div className="text-right">
          <span className={`${eyebrow} text-[#3E6C71]`}>XP today</span>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={xp}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              className="font-['Archivo'] font-black text-[44px] leading-[0.88] tracking-[-0.02em] tabular-nums"
              style={{ color: INK }}
            >
              {xp}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
