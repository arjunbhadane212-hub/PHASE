import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Eye, EyeOff, Flame, Dumbbell, Brain, Target, Sun, Shield } from 'lucide-react';
import PhaseWordmark from '../brand/PhaseMark';

// Shared v2 shell for Log in / Sign up. Calm by design: one column of form on
// the page background, and on desktop a single solid cyan panel with a small,
// slow piece of the app moving inside it. The panel content rotates — each
// page load picks one of five variants, so returning visitors see a different
// slice of what Phase does.

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

/* ── Shared panel helpers ───────────────────────────────────────────────── */

// Every panel uses the same cyan-on-dark palette so they feel like one family,
// not five different cards. Panel = one hero line + one animating artefact.
const INK = '#183A3F';
const INK_DEEP = '#09181C';
const CYAN = '#95DEE6';
const CYAN_SOFT = '#C7F0F5';
const CYAN_MID = '#3E6C71';
const CYAN_DIM = '#76B5BC';
const CYAN_DEEP = '#2C5A60';
const LIME = '#DBF67F';
const LIME_INK = '#2A3B0B';

function PanelFrame({ eyebrowText, title, sub, children }) {
  return (
    <>
      <span className={`${eyebrow} text-[${CYAN_MID}]`} style={{ color: CYAN_MID }}>
        {eyebrowText}
      </span>
      <div>
        <div
          className="font-['Archivo'] font-black text-[56px] xl:text-[76px] leading-[0.88] tracking-[-0.02em]"
          style={{ color: INK }}
        >
          {title}
        </div>
        <div className="mt-8 max-w-[440px]">{children}</div>
      </div>
      {sub && (
        <p className="text-[15px] font-medium max-w-[380px]" style={{ color: CYAN_MID }}>
          {sub}
        </p>
      )}
    </>
  );
}

function useTick(ms, enabled = true) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce || !enabled) return undefined;
    const t = setInterval(() => setN((v) => v + 1), ms);
    return () => clearInterval(t);
  }, [reduce, enabled, ms]);
  return reduce ? 999 : n;
}

/* ── Login panel variants ────────────────────────────────────────────────── */

// L1 — "Don't break the chain": a week of pips filling, streak counting up.
function LoginChain() {
  const reduce = useReducedMotion();
  const [filled, setFilled] = useState(reduce ? 7 : 0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setFilled((f) => (f >= 7 ? 0 : f + 1)), 900);
    return () => clearInterval(t);
  }, [reduce]);
  const streak = 41 + Math.min(filled, 7);
  return (
    <PanelFrame
      eyebrowText="Welcome back"
      title={<>Don't break<br />the chain.</>}
      sub="Your rank, your gems and your streak are right where you left them."
    >
      <div className="rounded-[22px] p-6" style={{ background: INK }}>
        <div className="flex items-end justify-between">
          <div>
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Day streak</span>
            <div
              className="font-['Archivo'] font-black text-[52px] leading-[0.88] tracking-[-0.02em] mt-2 tabular-nums"
              style={{ color: CYAN }}
            >
              {streak}
            </div>
          </div>
          <span className={eyebrow} style={{ color: CYAN_DIM }}>This week</span>
        </div>
        <div className="flex gap-1.5 mt-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-2 rounded-full"
              animate={{ backgroundColor: i < filled ? CYAN : CYAN_DEEP }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

// L2 — The streak flame, flickering, with milestone progress.
function LoginFlame() {
  const reduce = useReducedMotion();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setT((v) => v + 1), 90);
    return () => clearInterval(id);
  }, [reduce]);
  const flick = reduce ? 1 : 1 + Math.sin(t / 3) * 0.06;
  return (
    <PanelFrame
      eyebrowText="You're on fire"
      title={<>63 days<br />of showing up.</>}
      sub="Next title at 75 days: Burning. Keep going."
    >
      <div className="rounded-[22px] p-6 flex items-center gap-6" style={{ background: INK }}>
        <motion.div
          animate={{ scale: flick }}
          transition={{ duration: 0.09 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#2C5A60' }}
        >
          <Flame className="w-10 h-10" style={{ color: '#FF8A3C', fill: '#FBAF4A' }} strokeWidth={2} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className={eyebrow} style={{ color: CYAN_DIM }}>Progress to Burning</div>
          <div
            className="font-['Archivo'] font-black text-[32px] leading-none mt-2 tabular-nums"
            style={{ color: CYAN }}
          >
            63 / 75
          </div>
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: CYAN_DEEP }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '84%' }}
              transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
              style={{ background: CYAN }}
            />
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

// L3 — Consistency chart: 8 weeks climbing.
function LoginChart() {
  const reduce = useReducedMotion();
  const n = useTick(100);
  const t = reduce ? 1 : Math.min((n % 60) / 30, 1);
  const weeks = [34, 48, 55, 62, 71, 78, 85, 91];
  const cur = Math.round(weeks[weeks.length - 1] * t);
  return (
    <PanelFrame
      eyebrowText="Welcome back"
      title={<>You've been<br />getting stronger.</>}
      sub="Your weekly consistency, climbing since the day you started."
    >
      <div className="rounded-[22px] p-6" style={{ background: INK }}>
        <div className="flex items-end justify-between">
          <div>
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Consistency</span>
            <div
              className="font-['Archivo'] font-black text-[52px] leading-[0.88] tracking-[-0.02em] mt-2 tabular-nums"
              style={{ color: CYAN }}
            >
              {cur}%
            </div>
          </div>
          <div className="text-right">
            <span className={eyebrow} style={{ color: CYAN_DIM }}>8-week high</span>
            <div className="font-['JetBrains_Mono'] text-[12px] font-bold mt-2" style={{ color: LIME }}>
              +53 pts
            </div>
          </div>
        </div>
        <div className="mt-5 h-[90px] flex items-end gap-1.5">
          {weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 rounded-[6px]"
              style={{
                height: `${w * t}%`,
                background: i === weeks.length - 1 ? LIME : CYAN_DEEP,
                transition: 'height 100ms linear',
              }}
            />
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

// L4 — Rank badge: your current rank, with XP toward the next.
function LoginRank() {
  const reduce = useReducedMotion();
  const n = useTick(90);
  const t = reduce ? 0.68 : Math.min(((n % 60) / 50) * 0.7, 0.68);
  return (
    <PanelFrame
      eyebrowText="Welcome back"
      title={<>Level 6.<br />Keep climbing.</>}
      sub="One more rank and you join the Masters. 540 XP to go."
    >
      <div className="rounded-[22px] p-6" style={{ background: INK }}>
        <div className="flex items-start gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-['Archivo'] font-black text-[32px] leading-none flex-shrink-0"
            style={{ background: CYAN, color: INK_DEEP }}
          >
            06
          </div>
          <div className="flex-1 min-w-0">
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Expert rank</span>
            <div
              className="font-['Archivo'] font-black text-[26px] leading-none mt-2 uppercase tracking-[-0.01em]"
              style={{ color: CYAN }}
            >
              Expert
            </div>
            <div className="text-[12px] font-medium mt-1" style={{ color: CYAN_DIM }}>
              Consistency is now your edge.
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full overflow-hidden" style={{ background: CYAN_DEEP }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${t * 100}%` }}
            transition={{ duration: 0.1 }}
            style={{ background: CYAN }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold" style={{ color: CYAN_DIM }}>1,560 XP</span>
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold" style={{ color: CYAN_DIM }}>2,100 XP</span>
        </div>
      </div>
    </PanelFrame>
  );
}

// L5 — Focus session waiting for you.
function LoginFocus() {
  const reduce = useReducedMotion();
  const n = useTick(80);
  const total = 25 * 60;
  const sec = reduce ? total : total - ((n * 11) % total);
  const r = 48; const c = 2 * Math.PI * r;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <PanelFrame
      eyebrowText="Welcome back"
      title={<>Your focus<br />is waiting.</>}
      sub="Pick up the deep-work session you started. The timer remembers."
    >
      <div className="rounded-[22px] p-6 flex items-center gap-6" style={{ background: INK }}>
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke={CYAN_DEEP} strokeWidth="8" />
            <circle
              cx="60" cy="60" r={r} fill="none" stroke={CYAN} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={c}
              strokeDashoffset={c * (1 - sec / total)}
              style={{ transition: 'stroke-dashoffset 100ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-['Archivo'] font-black text-[24px] leading-none tabular-nums tracking-[-0.02em]"
              style={{ color: CYAN }}
            >
              {mm}:{ss}
            </span>
            <span className={`${eyebrow} mt-1.5`} style={{ color: CYAN_DIM, fontSize: 9 }}>
              Deep work
            </span>
          </div>
        </div>
        <div>
          <span className={eyebrow} style={{ color: CYAN_DIM }}>In progress</span>
          <div
            className="font-['Archivo'] font-black text-[22px] leading-tight mt-2"
            style={{ color: CYAN }}
          >
            Thesis draft
          </div>
          <div className="text-[12px] font-medium mt-2" style={{ color: CYAN_DIM }}>
            25-minute session · 2 of 4 today
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

const LOGIN_PANELS = [LoginChain, LoginFlame, LoginChart, LoginRank, LoginFocus];

/* ── Signup panel variants ───────────────────────────────────────────────── */

// S1 — "Every habit pays out": first-day checklist filling.
const FIRST_DAY = [
  { name: 'Drink water before coffee', xp: 10 },
  { name: '20 minute workout', xp: 25 },
  { name: 'Read 10 pages', xp: 25 },
];
function SignupPayout() {
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
      <span className={eyebrow} style={{ color: CYAN_MID }}>Day 1</span>
      <div>
        <div
          className="font-['Archivo'] font-black text-[56px] xl:text-[76px] leading-[0.88] tracking-[-0.02em]"
          style={{ color: INK }}
        >
          Every habit<br />pays out.
        </div>
        <div className="mt-8 space-y-2.5 max-w-[440px]">
          {FIRST_DAY.map((h, i) => {
            const isDone = i < count;
            return (
              <motion.div
                key={h.name}
                className="flex items-center gap-3 rounded-[18px] p-3.5"
                animate={{ backgroundColor: isDone ? LIME : INK }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: isDone ? LIME_INK : 'transparent', border: isDone ? 'none' : `2px solid ${CYAN_MID}` }}
                >
                  {isDone && <Check className="w-4 h-4" style={{ color: LIME }} strokeWidth={3} />}
                </div>
                <span className="flex-1 text-sm font-bold" style={{ color: isDone ? LIME_INK : CYAN_SOFT }}>{h.name}</span>
                <span className="font-['JetBrains_Mono'] text-xs font-bold" style={{ color: isDone ? LIME_INK : CYAN_DIM }}>+{h.xp} XP</span>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-[15px] font-medium max-w-[300px]" style={{ color: CYAN_MID }}>
          Free forever. No ads. Your first streak starts the day you join.
        </p>
        <div className="text-right">
          <span className={eyebrow} style={{ color: CYAN_MID }}>XP today</span>
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

// S2 — "Start small": one habit becomes a 7-day streak before your eyes.
function SignupStartSmall() {
  const reduce = useReducedMotion();
  const n = useTick(600);
  const day = reduce ? 7 : Math.min(n % 10, 7);
  return (
    <PanelFrame
      eyebrowText="One habit, one day at a time"
      title={<>Start small.<br />Build real.</>}
      sub="One habit, every day for a week. That's where real change starts."
    >
      <div className="rounded-[22px] p-6" style={{ background: INK }}>
        <div className="flex items-end justify-between">
          <div>
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Meditate 10 minutes</span>
            <div
              className="font-['Archivo'] font-black text-[52px] leading-[0.88] tracking-[-0.02em] mt-2 tabular-nums"
              style={{ color: CYAN }}
            >
              {day}
            </div>
            <div className="text-[12px] font-bold mt-1" style={{ color: CYAN_DIM }}>Days in a row</div>
          </div>
          <div className="flex gap-1 flex-col">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <motion.div
                key={i}
                className="w-6 h-6 rounded-[7px] flex items-center justify-center"
                animate={{ backgroundColor: i < day ? CYAN : CYAN_DEEP }}
                transition={{ duration: 0.3 }}
              >
                {i < day && <Check className="w-3 h-3" style={{ color: INK }} strokeWidth={3} />}
                {i >= day && (
                  <span className="font-['JetBrains_Mono'] text-[9px] font-bold" style={{ color: CYAN_DIM }}>{d}</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

// S3 — Life areas: what you can build.
const AREAS = [
  { icon: Dumbbell, name: 'Body' },
  { icon: Brain, name: 'Mind' },
  { icon: Target, name: 'Focus' },
  { icon: Sun, name: 'Life' },
];
function SignupAreas() {
  return (
    <PanelFrame
      eyebrowText="What you'll build"
      title={<>Pick an area.<br />Any area.</>}
      sub="Body, mind, focus or the small daily stuff. Track as many habits as you want, free."
    >
      <div className="grid grid-cols-2 gap-2.5">
        {AREAS.map(({ icon: Icon, name }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
            className="rounded-[18px] p-5 flex items-center gap-4"
            style={{ background: INK }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CYAN_DEEP }}>
              <Icon className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <span className="font-['Archivo'] font-black text-[22px] leading-none" style={{ color: CYAN }}>{name}</span>
          </motion.div>
        ))}
      </div>
    </PanelFrame>
  );
}

// S4 — The 66-day science card.
function SignupScience() {
  return (
    <PanelFrame
      eyebrowText="The science of habits"
      title={<>66 days to<br />change for good.</>}
      sub="University College London found a habit becomes automatic in about 66 days. Phase is built to carry you through all of them."
    >
      <div className="rounded-[22px] p-6" style={{ background: INK }}>
        <div className="flex items-end justify-between">
          <div>
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Average time to automatic</span>
            <div
              className="font-['Archivo'] font-black text-[80px] leading-[0.88] tracking-[-0.03em] mt-2 tabular-nums"
              style={{ color: CYAN }}
            >
              66
            </div>
            <div className="text-[13px] font-bold mt-1" style={{ color: CYAN_DIM }}>Days</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={eyebrow} style={{ color: CYAN_DIM }}>You, with Phase</span>
            <span className="font-['Archivo'] font-black text-[18px]" style={{ color: LIME }}>on track</span>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

// S5 — Free forever + the Pro card, side by side.
function SignupFree() {
  return (
    <PanelFrame
      eyebrowText="The deal"
      title={<>Free, and no<br />tricks.</>}
      sub="Unlimited habits, Focus Mode, streaks, your profile. All free. Pro adds extras when you want them."
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] p-5" style={{ background: INK }}>
          <span className={eyebrow} style={{ color: CYAN_DIM }}>Free</span>
          <div
            className="font-['Archivo'] font-black text-[42px] leading-[0.88] tracking-[-0.02em] mt-2"
            style={{ color: CYAN }}
          >
            $0
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: CYAN_DIM }}>Forever</div>
        </div>
        <div className="rounded-[18px] p-5" style={{ background: INK_DEEP }}>
          <div className="flex items-start justify-between">
            <span className={eyebrow} style={{ color: CYAN_DIM }}>Pro</span>
            <span className={eyebrow} style={{ color: LIME }}>−40%</span>
          </div>
          <div
            className="font-['Archivo'] font-black text-[42px] leading-[0.88] tracking-[-0.02em] mt-2"
            style={{ color: CYAN }}
          >
            $4.17
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: CYAN_DIM }}>Per month, yearly</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-[14px] p-3" style={{ background: INK }}>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
        <span className="text-[12px] font-bold" style={{ color: CYAN_SOFT }}>No ads, ever. Gems are only earned, never sold.</span>
      </div>
    </PanelFrame>
  );
}

const SIGNUP_PANELS = [SignupPayout, SignupStartSmall, SignupAreas, SignupScience, SignupFree];

/* ── Picker ─────────────────────────────────────────────────────────────── */

// A random variant per mount. useRef so React 18 strict-mode double-render
// doesn't flash a different panel on first paint.
function useRandomPanel(list) {
  const pickRef = useRef(null);
  if (pickRef.current == null) {
    pickRef.current = Math.floor(Math.random() * list.length);
  }
  return list[pickRef.current];
}

export function LoginPanel() {
  const Panel = useRandomPanel(LOGIN_PANELS);
  return <Panel />;
}

export function SignupPanel() {
  const Panel = useRandomPanel(SIGNUP_PANELS);
  return <Panel />;
}
