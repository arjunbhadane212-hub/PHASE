import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { fireRoast } from './RoastNotification';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

// One line is chosen at random when a session mounts and held for the whole
// session (see the useState(() => ...) below — random-once, not per-tick).
const ACTIVE_LINES = [
  "You're in it. Nothing else needs you right now.",
  "This is the work. Everything else can wait.",
  "Stay here. The focus is the whole point.",
  "One block, one thing. This is how it gets built.",
  "Nothing outside this timer needs you.",
  "You showed up. Now just stay.",
  "Deep work is rare — and you're doing it.",
  "The distractions will still be there. Let them wait.",
];

const COMPLETE_LINES = [
  "That's a real block of deep work. Most people never protect their time like that.",
  "You gave something your full attention. That's rarer than it sounds.",
  "Time you'll never wonder where it went.",
  "This is how the big things get done — one block at a time.",
  "You chose focus over everything else pulling at you. That counts.",
  "Another block behind you. This is what momentum looks like.",
  "Most people can't sit with one thing this long. You just did.",
  "Come back and do it again tomorrow.",
];

export default function FocusSession({ habit, duration, onComplete, onAbandon }) {
  const totalSeconds = duration * 60;
  const startTimeRef = useRef(Date.now());
  // Wall-clock derived state — never tick-based, immune to tab/app
  // backgrounding throttling. We recompute from (now - start) every interval.
  const [now, setNow] = useState(() => Date.now());
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  // Random-once: pick a motivational line index when the session mounts and
  // keep it for the whole session (lazy initializer, so it does not re-roll
  // on every tick re-render). Same index drives the active + completion lines.
  const [lineIndex] = useState(() => Math.floor(Math.random() * ACTIVE_LINES.length));
  // Guards for the tab-switch penalty (see the visibility effect below).
  const penalizedRef = useRef(false);
  const showModalRef = useRef(false);
  useEffect(() => { showModalRef.current = showAbandonModal; }, [showAbandonModal]);

  const habitId = habit.habit_id ?? habit.id;

  const elapsed = Math.min(totalSeconds, Math.floor((now - startTimeRef.current) / 1000));
  const secondsLeft = Math.max(0, totalSeconds - elapsed);
  const completed = elapsed >= totalSeconds;

  // Single tick loop. setInterval is throttled when backgrounded but our state
  // is derived from Date.now() so resuming always shows the correct value.
  useEffect(() => {
    if (completed) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [completed]);

  // Page Visibility API (recompute): when the tab returns to the foreground,
  // force an immediate recompute so the wall-clock timer catches up. This is
  // separate from the penalty handler below and only refreshes the display.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener('pageshow', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('pageshow', onVis);
    };
  }, []);

  // Tab-switch / focus-loss penalty (section 5d). Leaving the tab while the
  // timer runs is treated as WORSE than a deliberate abandon: the timer stops,
  // the habit fails, and a larger gem penalty applies — automatically, with no
  // confirmation modal (the point is that walking away gets punished).
  useEffect(() => {
    // Tunable: brief flickers (an OS notification stealing focus for an instant,
    // a quick accidental alt-tab) shouldn't cost gems. Mirrors game_config
    // focus_tab_switch_grace_seconds on the server.
    const TAB_SWITCH_GRACE_MS = 3000;
    let graceTimer = null;
    const clearGrace = () => { if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; } };
    // True once the wall-clock timer has already reached zero.
    const naturallyDone = () => Date.now() - startTimeRef.current >= totalSeconds * 1000;

    const penalize = async () => {
      graceTimer = null;
      if (penalizedRef.current) return;   // already penalized, or a manual abandon is running
      if (showModalRef.current) return;   // resolving via the manual confirm modal instead
      if (!document.hidden) return;       // returned during the grace window
      if (naturallyDone()) return;        // session already finished — don't punish success
      penalizedRef.current = true;
      try {
        const { data: pen } = await supabase.rpc('abandon_focus_session', {
          p_habit_id: habitId, p_reason: 'tab_switch',
        });
        const { data } = await supabase.rpc('check_roast', { p_event: 'tab_switch' });
        if (data?.roast) setTimeout(() => fireRoast(data.roast), 300);
        toast(`You left the tab — session ended · -${pen?.penalty ?? 45} gems`);
      } catch { /* ignore */ }
      onAbandon();
    };

    const onHiddenChange = () => {
      if (document.hidden) {
        if (penalizedRef.current || showModalRef.current || naturallyDone()) return;
        clearGrace();
        graceTimer = setTimeout(penalize, TAB_SWITCH_GRACE_MS);
      } else {
        clearGrace();
      }
    };

    document.addEventListener('visibilitychange', onHiddenChange);
    return () => {
      clearGrace();
      document.removeEventListener('visibilitychange', onHiddenChange);
    };
  }, [habitId, totalSeconds, onAbandon]);

  // Update page title with timer
  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — ${habit.habit_name}`;
    return () => { document.title = 'Phase'; };
  }, [secondsLeft, habit.habit_name]);

  // Session complete: the completion screen now persists until the user taps
  // "Back to Phase" (which calls onComplete). No auto-advance — a finished
  // deep-work block deserves to be seen, not flashed past.

  const handleAbandon = useCallback(async () => {
    setAbandoning(true);
    // Block the tab-switch handler from also firing if the tab loses focus
    // while this confirmed-abandon flow is resolving.
    penalizedRef.current = true;
    let penalty = 30;
    try {
      // Confirmed abandonment penalty (now live, per section 5c): deduct gems,
      // fail the habit, consume a Streak Shield if active (else break streak).
      const { data: pen } = await supabase.rpc('abandon_focus_session', {
        p_habit_id: habitId, p_reason: 'abandon',
      });
      if (pen?.penalty != null) penalty = pen.penalty;
      // Roast within 5s — copy/timing already tuned, left as-is.
      const { data } = await supabase.rpc('check_roast', { p_event: 'abandon' });
      if (data?.roast) {
        setTimeout(() => fireRoast(data.roast), 500);
      }
    } catch { /* ignore */ }
    toast(`Session abandoned · -${penalty} gems`);
    onAbandon();
  }, [habitId, onAbandon]);

  // Build timer display string. Supports H:MM:SS for hour-long sessions.
  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  const timerStr = hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const charCount = timerStr.length;

  const progress = secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 120;
  const strokeOffset = circumference * (1 - progress);

  // Completion screen — persists until the user taps "Back to Phase".
  if (completed) {
    // Stats are wired only from data this component actually holds: `duration`
    // (the session length) and the `habit` prop's real columns — xp_value (the
    // XP this habit awards, set at creation) and current_streak (the per-habit
    // streak already shown on the Home card). Any missing field is dropped
    // rather than faked, so the row never shows an invented number.
    const stats = [{ value: duration, label: 'Minutes' }];
    if (habit.xp_value != null) stats.push({ value: `+${habit.xp_value}`, label: 'XP' });
    if (habit.current_streak != null) stats.push({ value: habit.current_streak, label: 'Streak' });

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: '#DBF67F' }}
        data-testid="session-complete"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-6"
          style={{ background: '#2A3B0B' }}
        >
          <Check className="w-[30px] h-[30px] text-[#DBF67F]" strokeWidth={3} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[26px] text-[#0F1210] text-center"
          style={{ fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, letterSpacing: '-0.01em' }}
        >
          {duration} minutes, done.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-center mt-3 max-w-[280px]"
          style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 500, color: 'rgba(15,18,16,0.75)' }}
        >
          {COMPLETE_LINES[lineIndex]}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-start justify-center mt-8"
          style={{ gap: '28px' }}
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span
                className="text-[22px] text-[#0F1210] leading-none"
                style={{ fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif", fontWeight: 900 }}
              >
                {s.value}
              </span>
              <span
                className="text-[9px] uppercase mt-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', color: 'rgba(15,18,16,0.65)' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={onComplete}
          className="mt-10 rounded-[14px] bg-[#0F1210] text-[#DBF67F]"
          style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 700, padding: '15px 28px' }}
          data-testid="back-to-phase-btn"
        >
          Back to Phase
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#4ECDDE' }}
      data-testid="focus-session"
    >
      {/* Big, thick ring — dominates the screen. Nothing above it: the session
          screen is deliberately stripped so nothing pulls you away. */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 180 }}
        className="relative z-10 flex flex-col items-center justify-center"
        style={{
          // Circle diameter — responsive; it should nearly fill the screen.
          width: 'min(80vmin, 640px)',
          height: 'min(80vmin, 640px)',
          // CSS vars consumed by inline font-size calc below
          '--circle-size': 'min(80vmin, 640px)',
          '--digit-chars': charCount,
        }}
        data-testid="session-timer-container"
      >
        {/* Progress ring (absolute, fills container) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 280 280"
          style={{
            transform: 'rotate(-90deg)',
            filter: 'drop-shadow(0 10px 30px rgba(15,18,16,0.18))',
          }}
        >
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="15" />
          <circle
            cx="140" cy="140" r="120" fill="none"
            stroke="#0F1210"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        {/* Timer text — flex centered inside circle, font-size scales with char count.
            Width capped to 78% of circle diameter; 0.55 is approx glyph-width ratio
            for the Archivo tabular-nums character set. */}
        <span
          className="font-black text-[#0F1210] leading-none select-none"
          style={{
            fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            // Text width budget = 78% of circle diameter (circle = 240/280 of container).
            // Each glyph ≈ 0.55 × fontSize for Archivo tabular-nums.
            // → fontSize = (0.78 * 240/280 * D) / (chars * 0.55) = D * 0.668 / (chars * 0.55)
            fontSize: `calc(var(--circle-size) * 0.668 / (var(--digit-chars) * 0.55))`,
            maxWidth: 'calc(var(--circle-size) * 0.668)',
            // Subtle white top-edge highlight for depth on the cyan ground.
            textShadow: '0 1px 0 rgba(255,255,255,0.3)',
            willChange: 'transform',
          }}
          data-testid="session-timer"
        >
          {timerStr}
        </span>
        <span
          className="uppercase"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#183A3F',
            marginTop: '10px',
          }}
        >
          Remaining
        </span>
      </motion.div>

      {/* Rotating motivational line — chosen once per session (random-once). */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-8 max-w-[300px]"
        style={{ fontFamily: "'General Sans', sans-serif", fontSize: '15px', fontWeight: 600, color: '#183A3F' }}
        data-testid="session-motivation"
      >
        {ACTIVE_LINES[lineIndex]}
      </motion.p>

      {/* Honest footnote — a web app can't silence calls/texts, so it doesn't claim to. */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="uppercase text-center absolute bottom-6 px-6"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.05em', color: 'rgba(24,58,63,0.55)' }}
      >
        Stay on this screen · Phase will let you know when time's up
      </motion.p>

      {/* Abandon button — the single subtle exit (no pause; the app has no pause capability) */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setShowAbandonModal(true)}
        className="text-xs text-[#0F1210]/45 hover:text-[#0F1210]/75 transition-colors z-10 mt-6"
        data-testid="abandon-session-btn"
      >
        Abandon Session
      </motion.button>

      {/* Abandon confirmation modal */}
      <AnimatePresence>
        {showAbandonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl text-center bg-[var(--gm-card)] border border-[var(--gm-track)]"
              data-testid="abandon-modal"
            >
              <p className="text-base font-bold text-[var(--gm-ink)] mb-2">Abandon this session?</p>
              <p className="text-sm text-[var(--gm-muted)] mb-6">This ends your session early.</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="w-full py-3 rounded-xl font-bold text-[#183A3F] text-sm bg-[#95DEE6]"
                  data-testid="keep-going-btn"
                >
                  Keep Going
                </button>
                <button
                  onClick={handleAbandon}
                  disabled={abandoning}
                  className="w-full py-2.5 text-sm text-[var(--gm-muted)] hover:text-[var(--gm-ink)] transition-colors"
                  data-testid="confirm-abandon-btn"
                >
                  {abandoning ? 'Abandoning...' : 'Abandon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Persistent bar shown when session is active but user navigates away
export function FocusSessionBar({ habitName, secondsLeft }) {
  if (!habitName || secondsLeft == null) return null;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-8 flex items-center px-4 text-xs"
      style={{ background: '#4ECDDE', borderLeft: '3px solid #0F1210' }}
      data-testid="focus-session-bar"
    >
      <span className="text-[#183A3F]">Focus Session in progress —</span>
      <span className="text-[#0F1210] font-medium ml-1.5">{habitName}</span>
      <span className="text-[#0F1210] font-bold ml-auto">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
