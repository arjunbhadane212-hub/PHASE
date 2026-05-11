import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { fireRoast } from './RoastNotification';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function FocusSession({ habit, duration, onComplete, onAbandon }) {
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const totalSeconds = duration * 60;
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Countdown
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Update page title with timer
  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — ${habit.habit_name}`;
    return () => { document.title = 'Phase'; };
  }, [secondsLeft, habit.habit_name]);

  // Session complete
  useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [completed, onComplete]);

  const handleAbandon = useCallback(async () => {
    setAbandoning(true);
    clearInterval(intervalRef.current);
    const minsElapsed = Math.floor((Date.now() - startTimeRef.current) / 60000);
    try {
      const { data } = await axios.post(`${API}/session/abandon`, { mins_elapsed: minsElapsed });
      if (data.roast) {
        setTimeout(() => fireRoast(data.roast), 500);
      }
      if (data.gems_deducted > 0) {
        toast.error(`-${data.gems_deducted} gems`);
      } else if (data.shield_consumed) {
        toast(`Streak shield consumed`);
      } else {
        toast(`Session abandoned`);
      }
    } catch { /* ignore */ }
    onAbandon();
  }, [onAbandon]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 120;
  const strokeOffset = circumference * (1 - progress);

  // Completion screen
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: '#000' }}
        data-testid="session-complete"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at center, #1B6AE4, transparent 70%)' }}
        />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-white/80 font-medium z-10"
        >
          Session complete. Well done.
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      data-testid="focus-session"
    >
      {/* Subtle pulsing blue glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="focus-glow-pulse" />
      </div>

      {/* Habit name */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-white/50 font-medium mb-2 z-10"
        data-testid="session-habit-name"
      >
        {habit.habit_name}
      </motion.p>

      {/* Focus Session label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-3 py-1 rounded-full mb-8 z-10"
        style={{ background: 'rgba(27,106,228,0.15)', border: '1px solid rgba(27,106,228,0.25)' }}
      >
        <span className="text-[10px] text-[#4D8EF0] uppercase tracking-[0.2em] font-bold">Focus Session</span>
      </motion.div>

      {/* Timer display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        className="relative z-10 mb-8"
      >
        {/* Progress ring */}
        <svg className="absolute -inset-8" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(27,106,228,0.08)" strokeWidth="3" />
          <circle
            cx="140" cy="140" r="120" fill="none"
            stroke="#1B6AE4"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px rgba(27,106,228,0.5))' }}
          />
        </svg>

        {/* Timer numbers */}
        <div className="flex items-baseline justify-center" data-testid="session-timer">
          <span className="text-[min(35vh,180px)] font-black text-white leading-none tracking-tight"
            style={{ fontFamily: "'Satoshi', 'SF Pro Display', sans-serif", textShadow: '0 0 40px rgba(27,106,228,0.4)' }}>
            {String(mins).padStart(2, '0')}
          </span>
          <span className="text-[min(30vh,150px)] font-black mx-1 leading-none focus-colon"
            style={{ color: '#1B6AE4', textShadow: '0 0 20px rgba(27,106,228,0.6)' }}>
            :
          </span>
          <span className="text-[min(35vh,180px)] font-black text-white leading-none tracking-tight"
            style={{ fontFamily: "'Satoshi', 'SF Pro Display', sans-serif", textShadow: '0 0 40px rgba(27,106,228,0.4)' }}>
            {String(secs).padStart(2, '0')}
          </span>
        </div>
      </motion.div>

      {/* Abandon button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setShowAbandonModal(true)}
        className="text-xs text-white/40 hover:text-white/70 transition-colors z-10 mt-auto mb-12"
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
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl text-center"
              style={{ background: '#0C1220', border: '1px solid #1A2438' }}
              data-testid="abandon-modal"
            >
              <p className="text-base font-bold text-white mb-2">Abandon this session?</p>
              <p className="text-sm text-zinc-500 mb-6">Your consistency score will drop. -30 gems.</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowAbandonModal(false)}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm"
                  style={{ background: '#1B6AE4' }}
                  data-testid="keep-going-btn"
                >
                  Keep Going
                </button>
                <button
                  onClick={handleAbandon}
                  disabled={abandoning}
                  className="w-full py-2.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
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
      style={{ background: '#0a0e1a', borderBottom: '1px solid #1A2438', borderLeft: '3px solid #1B6AE4' }}
      data-testid="focus-session-bar"
    >
      <span className="text-white/50">Focus Session in progress —</span>
      <span className="text-white font-medium ml-1.5">{habitName}</span>
      <span className="text-[#4D8EF0] font-bold ml-auto">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
