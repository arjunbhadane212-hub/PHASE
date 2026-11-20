import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE } from '../../lib/motion';

// UI v3: full-screen "it worked" moment after sign-in / sign-up, so the user
// SEES the success instead of being teleported. Lime sheet wipes up, a check
// draws itself, the greeting rises in, a bar fills, then onDone() navigates.
export default function SuccessSplash({ title = "You're in", subtitle, note = 'Taking you to your habits…', duration = 2100, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[10050] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: '#D4F36B', color: '#2B3A06' }}
      initial={{ clipPath: 'circle(0% at 50% 60%)' }}
      animate={{ clipPath: 'circle(150% at 50% 60%)' }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.55, ease: EASE } }}
      transition={{ duration: 0.75, ease: EASE }}
      data-testid="auth-success"
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
        style={{ background: '#2B3A06' }}
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.35 }}
      >
        <svg viewBox="0 0 52 52" width="64" height="64" fill="none">
          <motion.path
            d="M14 27 L23 36 L39 17"
            stroke="#D4F36B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.7 }}
          />
        </svg>
      </motion.div>

      <motion.h1
        className="font-display text-[44px] leading-none mt-8"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.85 }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="text-[19px] font-semibold mt-3 opacity-80"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 1.0 }}
        >
          {subtitle}
        </motion.p>
      )}

      <motion.div className="w-48 h-2 rounded-full mt-10 overflow-hidden" style={{ background: 'rgba(43,58,6,0.15)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }}>
        <motion.div className="h-full rounded-full" style={{ background: '#2B3A06' }}
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: (duration / 1000) - 1.1, ease: 'linear', delay: 1.1 }} />
      </motion.div>
      <motion.p className="text-[14px] font-semibold mt-3 opacity-70"
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 1.15 }}>
        {note}
      </motion.p>
    </motion.div>,
    document.body,
  );
}

// Lazy entry used by AuthSplashHost: plays the splash, fades it out, then
// tells the host it's finished.
export function SplashLayer({ opts, onDone }) {
  const [show, setShow] = useState(true);
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && <SuccessSplash key="auth-splash" {...opts} onDone={() => setShow(false)} />}
    </AnimatePresence>
  );
}
