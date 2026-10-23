import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Check, Gem, Shield, Play, Flame, Bell } from 'lucide-react';
import { RANKS } from '../../data/levels';
import PhaseBoxArt from '../PhaseBoxArt';
import TitlePlate from '../profile/TitlePlate';
import { PhaseMark } from '../brand/PhaseMark';

// Landing-page demos. Every screen here is a faithful, simplified replica of
// a real Phase screen (Home, Create Habit, Streak card, Level, Focus timer,
// Shop boxes, League, Profile), drawn in the app's own v2 tokens. Inside the
// phone the colours are pinned to the DARK app theme so the product always
// looks like the product, whatever theme the visitor is in.

export const C = {
  bg: '#06080F', card: '#1F2123', badge: '#2E3235', check: '#52525B',
  ink: '#F4F5F2', muted: '#9BA09C',
  cyan: '#95DEE6', cyanInk: '#183A3F', cyanMid: '#3E6C71', cyanSoft: '#76B5BC', cyanPip: '#83C6CD',
  lime: '#DBF67F', limeInk: '#2A3B0B', red: '#B91C1C',
};

export const eyebrow = "font-['JetBrains_Mono'] font-bold uppercase tracking-[0.08em]";

// A counter that advances every `ms` while the element is on screen.
// Stops entirely for reduced-motion visitors and off-screen demos.
export function useTicker(ref, ms, enabled = true) {
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.3 });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce || !inView || !enabled) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [reduce, inView, enabled, ms]);
  return tick;
}

/* ── Phone frame ─────────────────────────────────────────────────────────── */

export function PhoneFrame({ children, className = '' }) {
  return (
    <div
      className={`relative w-[300px] sm:w-[320px] rounded-[46px] p-[10px] ${className}`}
      style={{ background: '#0B0D0F', boxShadow: '0 0 0 1px #2E3235, 0 40px 80px -30px rgba(0,0,0,0.7)' }}
    >
      <div className="relative rounded-[37px] overflow-hidden" style={{ background: C.bg, aspectRatio: '9 / 19' }}>
        <div className="absolute top-0 inset-x-0 h-11 flex items-center justify-between px-7 z-20">
          <span className="font-['JetBrains_Mono'] text-[11px] font-bold" style={{ color: C.ink }}>9:41</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[88px] h-[24px] rounded-full bg-black" />
          <span className="flex gap-[3px] items-end">
            {[5, 7, 9, 11].map((h) => <span key={h} className="w-[3px] rounded-sm" style={{ height: h, background: C.ink }} />)}
          </span>
        </div>
        <div className="absolute inset-0 pt-11">{children}</div>
      </div>
    </div>
  );
}

/* ── Shared app atoms ────────────────────────────────────────────────────── */

function HabitRow({ name, xp, done, onClick, pop, sub }) {
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 rounded-[16px] p-3 text-left"
        animate={{ backgroundColor: done ? C.lime : C.card }}
        transition={{ duration: 0.25 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="w-[28px] h-[28px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          animate={{ backgroundColor: done ? C.limeInk : 'rgba(0,0,0,0)', borderColor: done ? C.limeInk : C.check }}
          style={{ borderWidth: 2, borderStyle: 'solid' }}
        >
          {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: done ? '#0F1210' : C.ink }}>{name}</div>
          {sub && <div className="text-[10px] font-medium" style={{ color: done ? 'rgba(15,18,16,0.6)' : C.muted }}>{sub}</div>}
        </div>
        <span className="font-['JetBrains_Mono'] text-[10px] font-bold" style={{ color: done ? C.limeInk : C.muted }}>+{xp} XP</span>
      </motion.button>
      <AnimatePresence>
        {pop && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -26, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute right-2 top-0 font-['Archivo'] font-black text-[18px]"
            style={{ color: C.lime }}
          >
            +{xp} XP
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function GemPill({ gems }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: C.cyan, color: C.cyanInk }}>
      <Gem className="w-3 h-3" />
      <span className="font-['Archivo'] font-black text-[12px] tabular-nums">{gems.toLocaleString()}</span>
    </span>
  );
}

function StreakMini({ streak, pips, shield }) {
  return (
    <div className="rounded-[18px] p-4" style={{ background: C.cyan }}>
      <div className="flex items-center justify-between">
        <span className={`${eyebrow} text-[9px]`} style={{ color: C.cyanSoft }}>Day streak · This week</span>
        {shield > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: C.cyanInk, color: C.cyan }}>
            <Shield className="w-3 h-3" /><span className="text-[10px] font-bold">{shield}</span>
          </span>
        )}
      </div>
      <motion.div
        key={streak}
        initial={{ y: 10, opacity: 0.2 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-['Archivo'] font-black text-[40px] leading-[0.88] tracking-[-0.02em] mt-1.5 tabular-nums"
        style={{ color: C.cyanInk }}
      >
        {streak}
      </motion.div>
      <div className="text-[12px] font-bold mt-0.5" style={{ color: C.cyanMid }}>Days Strong</div>
      <div className="flex gap-1 mt-3">
        {pips.map((p, i) => (
          <motion.div key={i} className="flex-1 h-1.5 rounded-full" animate={{ backgroundColor: p ? C.cyanInk : C.cyanPip }} />
        ))}
      </div>
    </div>
  );
}

/* ── Cinematic cursor ────────────────────────────────────────────────────── */

// A plain macOS-style arrow. It lives INSIDE the zooming camera layer, so it
// scales with the screen exactly like the cursor in a product ad does.
export function Cursor({ x, y, press, show }) {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-30"
      initial={false}
      animate={{ x, y, opacity: show ? 1 : 0 }}
      transition={{ x: { duration: 0.85, ease: [0.45, 0, 0.2, 1] }, y: { duration: 0.85, ease: [0.3, 0, 0.25, 1] }, opacity: { duration: 0.3 } }}
    >
      <AnimatePresence>
        {press && (
          <motion.span
            key="ring"
            initial={{ scale: 0.2, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute -left-4 -top-4 w-8 h-8 rounded-full"
            style={{ border: '2px solid rgba(244,245,242,0.85)' }}
          />
        )}
      </AnimatePresence>
      <motion.svg
        width="22" height="22" viewBox="0 0 24 24"
        animate={{ scale: press ? 0.82 : 1 }}
        transition={{ duration: 0.12 }}
        style={{ transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}
      >
        <path d="M3 2 L3 19 L7.6 14.8 L10.6 21.4 L13.5 20.1 L10.6 13.6 L16.8 13.6 Z" fill="#fff" stroke="#0B0D0F" strokeWidth="1.4" strokeLinejoin="round" />
      </motion.svg>
    </motion.div>
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Offset of `el` inside `root` in unscaled layout pixels (offsetTop/Left are
// layout values, so the camera's transform never skews the measurement).
function offsetWithin(el, root) {
  let x = 0; let y = 0; let n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

// Camera transform that centres a content point at zoom `s`, clamped so the
// screen edge never shows.
function focusOn(root, fx, fy, s) {
  const W = root.offsetWidth; const H = root.offsetHeight;
  const x = Math.min(0, Math.max(W - W * s, W / 2 - fx * s));
  const y = Math.min(0, Math.max(H - H * s, H / 2 - fy * s));
  return { x, y, s };
}

const CAM_EASE = { duration: 0.95, ease: [0.65, 0, 0.35, 1] };

/* ── Hero: the home screen, filmed like a product ad ─────────────────────── */

const HERO_HABITS = [
  { name: 'Drink water first thing', xp: 10, gems: 5, sub: 'Morning · Easy' },
  { name: 'Morning run', xp: 50, gems: 20, sub: 'Morning · Hard' },
  { name: 'Read 10 pages', xp: 25, gems: 10, sub: 'Afternoon · Medium' },
  { name: 'Phone off by 11', xp: 25, gems: 10, sub: 'Night · Medium' },
];

export function HeroDemo() {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const layerRef = useRef(null);
  const rowRefs = useRef([]);
  const streakRef = useRef(null);
  const inView = useInView(wrapRef, { amount: 0.4 });

  const [done, setDone] = useState([false, false, false, false]);
  const [pop, setPop] = useState(-1);
  const [bumped, setBumped] = useState(false);
  const [cam, setCam] = useState({ x: 0, y: 0, s: 1 });
  const [cur, setCur] = useState({ x: 230, y: 640, press: false, show: false });

  useEffect(() => {
    if (reduce || !inView) return undefined;
    let alive = true;
    const step = async (ms) => { await sleep(ms); if (!alive) throw new Error('stop'); };

    const run = async () => {
      const root = layerRef.current;
      if (!root) return;
      const H = root.offsetHeight; const W = root.offsetWidth;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        setDone([false, false, false, false]); setPop(-1); setBumped(false);
        setCam({ x: 0, y: 0, s: 1 });
        setCur({ x: W * 0.78, y: H + 30, press: false, show: true });
        await step(900);

        for (let i = 0; i < HERO_HABITS.length; i++) {
          const r = offsetWithin(rowRefs.current[i], root);
          const tx = r.x + 26; const ty = r.y + r.h / 2;
          setCam(focusOn(root, W * 0.4, ty, 1.42));
          // A little overshoot-and-settle reads as a human hand, not a tween.
          setCur((c) => ({ ...c, x: tx + 6, y: ty + 4 }));
          await step(i === 0 ? 1100 : 850);
          setCur((c) => ({ ...c, x: tx, y: ty }));
          await step(180);
          setCur((c) => ({ ...c, press: true }));
          setDone((d) => d.map((v, j) => (j === i ? true : v)));
          setPop(i);
          await step(160);
          setCur((c) => ({ ...c, press: false }));
          await step(i === HERO_HABITS.length - 1 ? 700 : 520);
        }

        // Pull focus to the streak and let the number roll over.
        const s = offsetWithin(streakRef.current, root);
        setCam(focusOn(root, s.x + s.w / 2, s.y + s.h / 2, 1.45));
        setCur((c) => ({ ...c, x: s.x + s.w * 0.72, y: s.y + s.h * 0.62 }));
        await step(1000);
        setBumped(true);
        await step(1700);

        // Wide shot: the whole finished day.
        setCam({ x: 0, y: 0, s: 1 });
        setCur((c) => ({ ...c, x: W + 30, y: H * 0.7, show: false }));
        await step(2600);
      }
    };
    run().catch(() => {});
    return () => { alive = false; };
  }, [reduce, inView]);

  const shown = reduce ? [true, true, true, true] : done;
  const xp = HERO_HABITS.reduce((s, h, i) => s + (shown[i] ? h.xp : 0), 0);
  const gems = 1240 + HERO_HABITS.reduce((s, h, i) => s + (shown[i] ? h.gems : 0), 0);
  const finished = reduce || bumped;
  const streak = finished ? 13 : 12;
  const pips = [true, true, true, true, finished, false, false];

  return (
    <div ref={wrapRef}>
      <PhoneFrame>
        <motion.div
          ref={layerRef}
          className="absolute inset-0"
          style={{ transformOrigin: '0 0' }}
          animate={{ x: cam.x, y: cam.y, scale: cam.s }}
          transition={CAM_EASE}
        >
          <div className="h-full flex flex-col px-4 pb-4 gap-3 overflow-hidden">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <PhaseMark size={22} />
                <div>
                  <div className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>Friday</div>
                  <div className="font-['Archivo'] font-black text-[17px] leading-none" style={{ color: C.ink }}>Today</div>
                </div>
              </div>
              <GemPill gems={gems} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[[xp, 'XP today'], ['LV.4', 'Adept rank'], [`${finished ? 5 : 4}/7`, 'This week']].map(([n, l]) => (
                <div key={l} className="rounded-[14px] p-2.5" style={{ background: C.card }}>
                  <div className="font-['Archivo'] font-black text-[20px] leading-none tabular-nums" style={{ color: C.ink }}>{n}</div>
                  <div className={`${eyebrow} text-[8px] mt-1.5`} style={{ color: C.muted }}>{l}</div>
                </div>
              ))}
            </div>

            <div ref={streakRef}>
              <StreakMini streak={streak} pips={pips} shield={1} />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="font-['Archivo'] font-black text-[15px]" style={{ color: C.ink }}>Habits</span>
              <span className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>{shown.filter(Boolean).length}/4 done</span>
            </div>
            <div className="space-y-2">
              {HERO_HABITS.map((h, i) => (
                <div key={h.name} ref={(el) => { rowRefs.current[i] = el; }}>
                  <HabitRow {...h} done={shown[i]} pop={pop === i && shown[i]} />
                </div>
              ))}
            </div>

            <AnimatePresence>
              {finished && (
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  className="mt-auto rounded-[14px] px-3 py-2.5 flex items-center gap-2"
                  style={{ background: C.limeInk }}
                >
                  <Flame className="w-4 h-4" style={{ color: C.lime }} />
                  <span className="text-[12px] font-bold" style={{ color: C.lime }}>Day complete. 13 days strong.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Cursor {...cur} />
        </motion.div>
      </PhoneFrame>
    </div>
  );
}


/* ── How it works: four screens, one per step ───────────────────────────── */

function Pill({ on, children }) {
  return (
    <motion.span
      className="flex-1 text-center rounded-full py-2 text-[11px] font-bold"
      animate={{ backgroundColor: on ? C.cyan : C.bg, color: on ? C.cyanInk : C.muted }}
      style={{ boxShadow: on ? 'none' : `inset 0 0 0 1px ${C.badge}` }}
    >
      {children}
    </motion.span>
  );
}

function CreateHabitScreen() {
  const ref = useRef(null);
  const tick = useTicker(ref, 130);
  const name = 'Meditate 10 min';
  const t = tick % 60;
  const typed = name.slice(0, Math.min(name.length, t));
  const slot = t > 20 ? 0 : -1;
  const diff = t > 28 ? 1 : -1;
  const pressed = t > 38;
  return (
    <div ref={ref} className="h-full flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative rounded-t-[26px] p-5 space-y-4" style={{ background: C.card }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: C.badge }} />
        <div className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>New habit</div>
        <div>
          <div className={`${eyebrow} text-[9px] mb-1.5`} style={{ color: C.muted }}>Name</div>
          <div className="rounded-[12px] px-3 py-2.5 text-[13px] font-bold" style={{ background: C.bg, color: C.ink, boxShadow: `inset 0 0 0 2px ${typed ? C.cyan : C.badge}` }}>
            {typed}<span className="inline-block w-[2px] h-[14px] align-middle ml-0.5 animate-pulse" style={{ background: C.cyan }} />
          </div>
        </div>
        <div>
          <div className={`${eyebrow} text-[9px] mb-1.5`} style={{ color: C.muted }}>Time</div>
          <div className="flex gap-1.5">
            {['Morning', 'Afternoon', 'Night'].map((s, i) => <Pill key={s} on={slot === i}>{s}</Pill>)}
          </div>
        </div>
        <div>
          <div className={`${eyebrow} text-[9px] mb-1.5`} style={{ color: C.muted }}>Difficulty</div>
          <div className="flex gap-1.5">
            {[['Easy', '+10'], ['Medium', '+25'], ['Hard', '+50']].map(([d, x], i) => (
              <Pill key={d} on={diff === i}>
                <span className="block">{d}</span>
                <span className="block font-['JetBrains_Mono'] text-[9px] opacity-80">{x} XP</span>
              </Pill>
            ))}
          </div>
        </div>
        <motion.div
          className="rounded-full py-3 text-center text-[13px] font-bold"
          animate={{ scale: pressed ? [1, 0.96, 1] : 1, opacity: diff >= 0 ? 1 : 0.4 }}
          style={{ background: C.cyan, color: C.cyanInk }}
        >
          {pressed ? 'Added to Morning' : 'Create habit'}
        </motion.div>
      </div>
    </div>
  );
}

function CompleteScreen() {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const rootRef = useRef(null);
  const rowRefs = useRef([]);
  const inView = useInView(wrapRef, { amount: 0.4 });
  const list = [
    { name: 'Meditate 10 min', xp: 25 },
    { name: 'Gym: push day', xp: 50 },
    { name: 'Journal', xp: 10 },
  ];
  const [done, setDone] = useState([false, false, false]);
  const [pop, setPop] = useState(-1);
  const [cam, setCam] = useState({ x: 0, y: 0, s: 1 });
  const [cur, setCur] = useState({ x: 200, y: 600, press: false, show: false });

  useEffect(() => {
    if (reduce || !inView) return undefined;
    let alive = true;
    const step = async (ms) => { await sleep(ms); if (!alive) throw new Error('stop'); };
    const run = async () => {
      const root = rootRef.current;
      if (!root) return;
      const W = root.offsetWidth; const H = root.offsetHeight;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        setDone([false, false, false]); setPop(-1); setCam({ x: 0, y: 0, s: 1 });
        setCur({ x: W * 0.7, y: H + 30, press: false, show: true });
        await step(700);
        for (let i = 0; i < list.length; i++) {
          const r = offsetWithin(rowRefs.current[i], root);
          const ty = r.y + r.h / 2;
          setCam(focusOn(root, W * 0.4, ty, 1.32));
          setCur((c) => ({ ...c, x: r.x + 26, y: ty }));
          await step(950);
          setCur((c) => ({ ...c, press: true }));
          setDone((d) => d.map((v, j) => (j === i ? true : v)));
          setPop(i);
          await step(160);
          setCur((c) => ({ ...c, press: false }));
          await step(450);
        }
        setCam({ x: 0, y: 0, s: 1 });
        setCur((c) => ({ ...c, x: W + 30, show: false }));
        await step(2200);
      }
    };
    run().catch(() => {});
    return () => { alive = false; };
  }, [reduce, inView]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = reduce ? [true, true, true] : done;
  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <motion.div
        ref={rootRef}
        className="absolute inset-0 px-4 pt-3"
        style={{ transformOrigin: '0 0' }}
        animate={{ x: cam.x, y: cam.y, scale: cam.s }}
        transition={CAM_EASE}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>Morning</span>
            <span className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>{shown.filter(Boolean).length}/3 done</span>
          </div>
          {list.map((h, i) => (
            <div key={h.name} ref={(el) => { rowRefs.current[i] = el; }}>
              <HabitRow {...h} done={shown[i]} pop={pop === i && shown[i]} />
            </div>
          ))}
          <div className="rounded-[14px] p-3 flex items-center justify-between" style={{ background: C.card }}>
            <span className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>Earned this morning</span>
            <span className="font-['Archivo'] font-black text-[15px] tabular-nums" style={{ color: C.lime }}>
              +{list.reduce((s, h, i) => s + (shown[i] ? h.xp : 0), 0)} XP
            </span>
          </div>
        </div>
        <Cursor {...cur} />
      </motion.div>
    </div>
  );
}

// Step 4: what the habits add up to — consistency climbing week over week.
function ProgressScreen() {
  const ref = useRef(null);
  const tick = useTicker(ref, 140);
  const t = Math.min(tick % 60, 30) / 30; // grow for ~4s, hold, repeat
  const weeks = [38, 52, 61, 70, 78, 86, 92];
  const pct = Math.round(weeks[weeks.length - 1] * t);
  return (
    <div ref={ref} className="h-full px-4 pt-3 space-y-3">
      <span className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>Progress</span>
      <div className="rounded-[18px] p-4" style={{ background: C.card }}>
        <div className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>Consistency · last 7 weeks</div>
        <div className="font-['Archivo'] font-black text-[44px] leading-[0.9] tracking-[-0.02em] mt-2 tabular-nums" style={{ color: C.ink }}>{pct}%</div>
        <div className="text-[12px] font-medium mt-1" style={{ color: C.muted }}>Up from 38% when you started</div>
        <div className="mt-4 h-[110px] flex items-end gap-1.5">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 rounded-[6px]" style={{
              height: `${w * t}%`,
              background: i === weeks.length - 1 ? C.lime : C.badge,
              transition: 'height 140ms linear',
            }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['142', 'Habits done'], ['31h', 'Focused']].map(([n, l]) => (
          <div key={l} className="rounded-[14px] p-3" style={{ background: C.card }}>
            <div className="font-['Archivo'] font-black text-[22px] leading-none" style={{ color: C.ink }}>{n}</div>
            <div className={`${eyebrow} text-[8px] mt-1.5`} style={{ color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[14px] p-3 flex items-center justify-between" style={{ background: C.cyan }}>
        <span className="text-[12px] font-bold" style={{ color: C.cyanInk }}>Rank up: Expert</span>
        <span className={`${eyebrow} text-[9px]`} style={{ color: C.cyanMid }}>LV.6</span>
      </div>
    </div>
  );
}

function StreakScreen() {
  const ref = useRef(null);
  const tick = useTicker(ref, 900);
  const step = tick % 10;
  // Days 1–4 fill, day 5 is missed and the shield takes the hit, 6–7 fill.
  const pips = [0, 1, 2, 3, 4, 5, 6].map((i) => step > i);
  const shieldUsed = step >= 5;
  const streak = 20 + Math.min(step, 7);
  return (
    <div ref={ref} className="h-full px-4 pt-3 space-y-3">
      <span className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>Your streak</span>
      <StreakMini streak={streak} pips={pips} shield={shieldUsed ? 0 : 1} />
      <AnimatePresence mode="wait">
        {step === 5 || step === 6 ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[14px] p-3 flex items-center gap-3"
            style={{ background: C.card }}
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: C.cyan }}>
              <Shield className="w-4 h-4" style={{ color: C.cyanInk }} />
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: C.ink }}>Shield used</div>
              <div className="text-[11px] font-medium" style={{ color: C.muted }}>You missed Friday. Streak saved.</div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-7 gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="rounded-[10px] py-2 text-center" style={{ background: pips[i] ? C.lime : C.card }}>
                <div className={`${eyebrow} text-[9px]`} style={{ color: pips[i] ? C.limeInk : C.muted }}>{d}</div>
                <div className="mt-1 mx-auto w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: pips[i] ? C.limeInk : C.badge }}>
                  {pips[i] && <Check className="w-2.5 h-2.5" style={{ color: C.lime }} strokeWidth={3} />}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="rounded-[14px] p-3" style={{ background: C.card }}>
        <div className={`${eyebrow} text-[9px]`} style={{ color: C.muted }}>Next streak title</div>
        <div className="mt-2 flex items-center justify-between">
          <TitlePlate titleKey="streak_contender" name="Contender" tier="common" size="sm" />
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold" style={{ color: C.muted }}>{streak >= 25 ? 'Unlocked' : 'at 25 days'}</span>
        </div>
      </div>
    </div>
  );
}

const LOOP_SCREENS = [CreateHabitScreen, CompleteScreen, StreakScreen, ProgressScreen];

export function LoopPhone({ step }) {
  const Screen = LOOP_SCREENS[step] || CreateHabitScreen;
  return (
    <PhoneFrame>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
    </PhoneFrame>
  );
}

/* ── Modes ───────────────────────────────────────────────────────────────── */

export function FocusTimerScreen() {
  const ref = useRef(null);
  const tick = useTicker(ref, 100);
  const total = 25 * 60;
  const sec = total - ((tick * 9) % total);
  const r = 92;
  const c = 2 * Math.PI * r;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <div ref={ref} className="h-full flex flex-col items-center justify-between px-6 pt-6 pb-8" style={{ background: '#000' }}>
      <div className="text-center">
        <div className={`${eyebrow} text-[10px]`} style={{ color: C.muted }}>Focus session</div>
        <div className="text-[15px] font-bold mt-1.5" style={{ color: C.ink }}>Deep work: thesis draft</div>
      </div>
      <div className="relative w-[210px] h-[210px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 210 210">
          <circle cx="105" cy="105" r={r} fill="none" stroke={C.card} strokeWidth="10" />
          <circle cx="105" cy="105" r={r} fill="none" stroke={C.cyan} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - sec / total)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-['Archivo'] font-black text-[46px] leading-none tabular-nums tracking-[-0.02em]" style={{ color: C.ink }}>{mm}:{ss}</span>
          <span className={`${eyebrow} text-[9px] mt-2`} style={{ color: C.muted }}>of 25:00</span>
        </div>
      </div>
      <div className="w-full space-y-2">
        <div className="rounded-[14px] p-3 text-center" style={{ background: C.card }}>
          <span className="text-[11px] font-medium" style={{ color: C.muted }}>Leave early: habit fails, −30 gems, shield used</span>
        </div>
        <div className="text-center text-[12px] font-bold" style={{ color: '#E56B6B' }}>End session</div>
      </div>
    </div>
  );
}

export function FocusListScreen() {
  const list = [
    { name: 'Deep work: thesis draft', mins: 25 },
    { name: 'Spanish practice', mins: 15 },
    { name: 'Stretch', mins: 10 },
  ];
  return (
    <div className="h-full px-4 pt-3 space-y-2.5">
      <span className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>Today</span>
      {list.map((h, i) => (
        <div key={h.name} className="flex items-center gap-3 rounded-[16px] p-3" style={{ background: C.card }}>
          <motion.span
            className="flex items-center gap-1.5 rounded-full py-2 px-3 text-[11px] font-bold"
            style={{ background: C.cyan, color: C.cyanInk }}
            animate={i === 0 ? { scale: [1, 0.94, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Begin
          </motion.span>
          <span className="flex-1 text-[13px] font-bold truncate" style={{ color: C.ink }}>{h.name}</span>
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold" style={{ color: C.muted }}>{h.mins}m</span>
        </div>
      ))}
    </div>
  );
}

export function GameModeScreen() {
  const ref = useRef(null);
  const tick = useTicker(ref, 1100);
  const step = tick % 4;
  const list = [
    { name: 'Morning run', xp: 50 },
    { name: 'Read 10 pages', xp: 25 },
  ];
  return (
    <div ref={ref} className="h-full px-4 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-['Archivo'] font-black text-[19px]" style={{ color: C.ink }}>Today</span>
        <GemPill gems={1240 + (step > 0 ? 20 : 0) + (step > 1 ? 10 : 0)} />
      </div>
      <StreakMini streak={34} pips={[true, true, true, step > 1, false, false, false]} shield={2} />
      {list.map((h, i) => (
        <HabitRow key={h.name} {...h} done={step > i && step < 3} pop={step === i + 1} />
      ))}
    </div>
  );
}

/* ── Loot boxes ──────────────────────────────────────────────────────────── */

export const BOXES = [
  { id: 'starter', name: 'Starter', odds: 'Common drops', desc: 'Small XP boosts and everyday cosmetics.',
    pool: [['boost', '1.5x XP boost'], ['boost', '2x XP boost'], ['boost', 'Profile animation']] },
  { id: 'delta', name: 'Delta', odds: 'Rare drops', desc: 'Box-exclusive titles. Not sold in the shop.',
    pool: [['title_vandal', 'Vandal', 'rare'], ['title_phantom', 'Phantom', 'rare'], ['title_savage', 'Savage', 'rare']] },
  { id: 'phase', name: 'Phase', odds: 'Very rare', desc: 'Box-only legends. The pull people screenshot.',
    pool: [['title_god_complex', 'God-Complex', 'mythic'], ['title_anti_hero', 'Anti-Hero', 'mythic'], ['title_anomaly', 'Anomaly', 'mythic'], ['title_executioner', 'Executioner', 'mythic'], ['title_cataclysm', 'Cataclysm', 'mythic'], ['title_enforcer', 'Enforcer', 'mythic']] },
];

export function LootBox({ box }) {
  const [state, setState] = useState('idle'); // idle | opening | open
  const [pull, setPull] = useState(box.pool[0]);
  const open = () => {
    if (state === 'opening') return;
    if (state === 'open') { setState('idle'); return; }
    setPull(box.pool[Math.floor(Math.random() * box.pool.length)]);
    setState('opening');
    setTimeout(() => setState('open'), 650);
  };
  const lid = state === 'idle' ? 0 : state === 'opening' ? 0.5 : 1.9;
  return (
    <button
      onClick={open}
      className="group text-left rounded-[24px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-5 flex flex-col"
      data-testid={`loot-${box.id}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-['Archivo'] font-black text-xl text-[var(--gm-ink)] uppercase">{box.name}</span>
        <span className={`${eyebrow} text-[10px] text-[var(--gm-muted)]`}>{box.odds}</span>
      </div>
      <div className="relative h-[170px] flex items-center justify-center my-3">
        <motion.div
          animate={state === 'opening' ? { rotate: [0, -6, 6, -4, 4, 0] } : { y: [0, -5, 0] }}
          transition={state === 'opening' ? { duration: 0.6 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[130px] h-[130px]"
        >
          <PhaseBoxArt tier={box.id} className="w-full h-full" lidLift={lid} lidSpin={state === 'open' ? -24 : 0} />
        </motion.div>
        <AnimatePresence>
          {state === 'open' && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: -50, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="absolute"
            >
              {pull[0] === 'boost' ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 bg-[var(--gm-bg)] text-[var(--gm-ink)] font-['Archivo'] font-extrabold uppercase text-[13px] tracking-[0.04em]">
                  <Gem className="w-3.5 h-3.5 text-[#95DEE6]" /> {pull[1]}
                </span>
              ) : (
                <TitlePlate titleKey={pull[0]} name={pull[1]} tier={pull[2]} size="lg" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-sm font-medium text-[var(--gm-muted)]">{box.desc}</p>
      <span className={`mt-4 self-start rounded-full px-4 py-2 text-sm font-bold transition ${
        state === 'open' ? 'bg-[var(--gm-badge)] text-[var(--gm-ink)]' : 'bg-[#95DEE6] text-[#183A3F]'
      }`}>
        {state === 'open' ? 'Close' : state === 'opening' ? 'Opening…' : 'Tap to open'}
      </span>
    </button>
  );
}

/* ── Public profile card ─────────────────────────────────────────────────── */

export function ProfilePreview() {
  return (
    <div className="rounded-[28px] p-5 sm:p-6 w-full max-w-[400px]" style={{ background: C.bg, boxShadow: '0 0 0 1px #2E3235, 0 30px 60px -30px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-['Archivo'] font-black text-xl" style={{ background: C.card, color: C.ink, boxShadow: `0 0 0 3px ${C.cyan}` }}>MR</div>
        <div className="min-w-0">
          <div className="font-['Archivo'] font-black text-xl" style={{ color: C.ink }}>Maya Reyes</div>
          <div className="text-sm font-medium" style={{ color: C.muted }}>@mayareyes</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TitlePlate titleKey="title_paragon" name="Eternalflame" tier="legendary" />
        <span className={`${eyebrow} text-[10px] px-2.5 py-1.5 rounded-lg`} style={{ background: C.card, color: C.ink }}>LV.9 Champion</span>
      </div>
      <div className="mt-4 rounded-[20px] p-5" style={{ background: C.cyan }}>
        <div className={`${eyebrow} text-[10px]`} style={{ color: C.cyanSoft }}>Day streak</div>
        <div className="font-['Archivo'] font-black text-[52px] leading-[0.88] tracking-[-0.02em] mt-2" style={{ color: C.cyanInk }}>212</div>
        <div className="text-sm font-bold mt-1" style={{ color: C.cyanMid }}>Days Strong</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['5,140', 'Total XP'], ['212', 'Best streak'], ['1,388', 'Habits']].map(([n, l]) => (
          <div key={l} className="rounded-[14px] p-3" style={{ background: C.card }}>
            <div className="font-['Archivo'] font-black text-lg leading-none" style={{ color: C.ink }}>{n}</div>
            <div className={`${eyebrow} text-[8px] mt-1.5`} style={{ color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-['JetBrains_Mono'] text-[11px] font-bold" style={{ color: C.muted }}>phase.app/@mayareyes</span>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: C.cyan, color: C.cyanInk }}>Share</span>
      </div>
    </div>
  );
}

/* ── Roasts ──────────────────────────────────────────────────────────────── */

const ROASTS = {
  game: [
    { t: 'now', m: "13-day streak and you're about to lose it to a nap? Bold." },
    { t: '2h ago', m: 'Jordan just passed you in the league. Again.' },
    { t: 'yesterday', m: '0 habits by 9pm. Your Rookie era called, it wants you back.' },
  ],
  focus: [
    { t: 'now', m: 'You stopped at 9 minutes. That happens. Try again tonight.' },
    { t: '3h ago', m: "Your 25-minute session is still waiting for you." },
    { t: 'yesterday', m: 'No sessions yesterday. One today is enough to restart.' },
  ],
};

export function RoastDemo() {
  const [tone, setTone] = useState('game');
  const ref = useRef(null);
  const tick = useTicker(ref, 2200);
  const shown = (tick % 4);
  const list = ROASTS[tone];
  return (
    <div ref={ref} className="rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-6 sm:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className={`${eyebrow} text-[11px] text-[var(--gm-muted)]`}>Reminders that talk back</span>
          <h3 className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[28px] sm:text-[34px] leading-[0.95] tracking-[-0.02em] mt-2">A nudge when you need it.</h3>
        </div>
      </div>
      <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-3">
        Slip up and Phase notices. Choose tough love or a gentle word. Two a day at most, and you can switch them off any time.
      </p>
      <div className="mt-5 inline-flex self-start rounded-full bg-[var(--gm-bg)] p-1">
        {['game', 'focus'].map((k) => (
          <button
            key={k}
            onClick={() => setTone(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${tone === k ? 'bg-[#95DEE6] text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}
          >
            {k === 'game' ? 'Tough love' : 'Gentle'}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-2.5 flex-1">
        <AnimatePresence initial={false}>
          {list.slice(0, Math.max(1, shown)).map((n) => (
            <motion.div
              key={tone + n.m}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-2xl p-3.5 bg-[var(--gm-bg)]"
            >
              <PhaseMark size={30} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--gm-ink)]">Phase</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[var(--gm-muted)]">{n.t}</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--gm-muted)] mt-0.5">{n.m}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center gap-2 text-[var(--gm-muted)]">
        <Bell className="w-4 h-4" />
        <span className={`${eyebrow} text-[10px]`}>Max 2 a day · never the same one twice</span>
      </div>
    </div>
  );
}

/* ── Compact "fun part" cards ────────────────────────────────────────────── */

// XP bar filling and the rank name rolling over: Rookie → Novice → …
export function MiniLevel() {
  const ref = useRef(null);
  const tick = useTicker(ref, 90);
  const per = 40; // ticks per rank
  const idx = Math.floor(tick / per) % 6;
  const t = (tick % per) / per;
  const rank = RANKS[idx];
  return (
    <div ref={ref} className="rounded-2xl bg-[var(--gm-bg)] p-5">
      <div className="flex items-center justify-between">
        <span className={`${eyebrow} text-[10px] text-[var(--gm-muted)]`}>Level {rank.level}</span>
        <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[var(--gm-muted)] tabular-nums">
          {Math.round(rank.min_xp + (rank.max_xp - rank.min_xp) * t).toLocaleString()} XP
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={rank.name}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          className="font-['Archivo'] font-black uppercase text-[var(--gm-ink)] text-[34px] leading-none tracking-[-0.02em] mt-3"
        >
          {rank.name}
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 h-2.5 rounded-full bg-[var(--gm-track)] overflow-hidden">
        <div className="h-full rounded-full bg-[#95DEE6]" style={{ width: `${t * 100}%`, transition: 'width 90ms linear' }} />
      </div>
    </div>
  );
}

const LEAGUE_BASE = [
  { name: 'Jordan', xp: 1180 },
  { name: 'Priya', xp: 1095 },
  { name: 'You', xp: 940, you: true },
  { name: 'Leo', xp: 905 },
];

export function MiniLeague() {
  const ref = useRef(null);
  const tick = useTicker(ref, 1500);
  const gain = [0, 190, 290, 0][tick % 4];
  const rows = LEAGUE_BASE
    .map((r) => ({ ...r, xp: r.you ? r.xp + gain : r.xp }))
    .sort((a, b) => b.xp - a.xp);
  return (
    <div ref={ref} className="rounded-2xl bg-[var(--gm-bg)] p-3 space-y-1.5">
      {rows.map((r, i) => (
        <motion.div
          layout
          key={r.name}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.you ? 'bg-[#95DEE6]' : 'bg-[var(--gm-card)]'}`}
        >
          <span className={`font-['Archivo'] font-black w-4 text-sm ${r.you ? 'text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}>{i + 1}</span>
          <span className={`flex-1 text-sm font-bold ${r.you ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>{r.name}</span>
          <span className={`font-['JetBrains_Mono'] text-[11px] font-bold tabular-nums ${r.you ? 'text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}>{r.xp.toLocaleString()}</span>
        </motion.div>
      ))}
    </div>
  );
}
