import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, Target, Trophy, ArrowRight } from 'lucide-react';
import { PhaseMark } from '../components/brand/PhaseMark';
import { markOnboardingSeen } from '../utils/onboardingFlag';

// The PRE-AUTH install intro — the first thing the installed app shows on its
// very first launch, before login/signup. It is NOT the post-signup survey at
// /onboarding (that one needs a logged-in user and writes to the DB). This is
// just a three-beat "what Phase is" pitch, after which we persist the
// hasSeenOnboarding flag so later launches skip straight to login/signup.
//
// v2 system: flat --gm-* surfaces, Archivo display, cyan = action, no glow.
const SLIDES = [
  {
    icon: Flame,
    accent: '#95DEE6',
    ink: '#183A3F',
    eyebrow: 'Discipline in your pocket',
    title: 'Build the streak you keep bragging about',
    sub: 'Phase turns showing up every day into a streak you can actually see — and flex.',
  },
  {
    icon: Target,
    accent: '#DBF67F',
    ink: '#2A3B0B',
    eyebrow: 'Two ways to play',
    title: 'Game Mode to compete. Focus Mode to lock in.',
    sub: 'Earn XP and climb the ranks, or drop into a distraction-free deep-work timer.',
  },
  {
    icon: Trophy,
    accent: '#95DEE6',
    ink: '#183A3F',
    eyebrow: 'Make it public',
    title: 'Your discipline, on a profile worth sharing',
    sub: 'Titles, ranks and a profile people screenshot. Consistency becomes your identity.',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.icon;

  // Finish the intro: remember it so it never shows again on this install, then
  // hand off to the login/signup screen.
  const finish = (dest) => {
    markOnboardingSeen();
    navigate(dest, { replace: true });
  };

  const next = () => (isLast ? finish('/signup') : setIndex((i) => i + 1));

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -16 },
        transition: { duration: 0.28, ease: 'easeOut' },
      };

  return (
    <div
      className="min-h-screen bg-[var(--gm-bg)] text-[var(--gm-ink)] flex flex-col px-6 py-8"
      data-testid="welcome-page"
    >
      {/* Top bar: brand + skip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PhaseMark size={28} />
          <span
            className="font-['Archivo'] font-black uppercase text-[var(--gm-ink)]"
            style={{ fontSize: 20, letterSpacing: '-0.01em' }}
          >
            Phase
          </span>
        </div>
        <button
          type="button"
          onClick={() => finish('/login')}
          className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.08em] text-[var(--gm-muted)] hover:text-[var(--gm-ink)] transition-colors"
          data-testid="welcome-skip"
        >
          Skip
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={index} {...motionProps} className="max-w-md">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
              style={{ backgroundColor: slide.accent }}
            >
              <Icon size={30} strokeWidth={2} color={slide.ink} />
            </div>
            <p className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-[0.08em] text-[var(--gm-muted)] mb-3">
              {slide.eyebrow}
            </p>
            <h1
              className="font-['Archivo'] font-black text-[var(--gm-ink)] mb-4"
              style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              {slide.title}
            </h1>
            <p className="text-[15px] leading-relaxed text-[var(--gm-muted)] font-['General_Sans']">
              {slide.sub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 24 : 8,
              backgroundColor: i === index ? '#95DEE6' : 'var(--gm-track)',
            }}
          />
        ))}
      </div>

      {/* Actions */}
      {isLast ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => finish('/signup')}
            className="w-full py-3.5 rounded-xl font-['General_Sans'] font-bold text-[15px] transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#95DEE6', color: '#183A3F' }}
            data-testid="welcome-signup"
          >
            Create your account
          </button>
          <button
            type="button"
            onClick={() => finish('/login')}
            className="w-full py-3.5 rounded-xl font-['General_Sans'] font-bold text-[15px] border border-[var(--gm-track)] text-[var(--gm-ink)] hover:bg-[var(--gm-card)] transition-colors"
            data-testid="welcome-login"
          >
            I already have an account
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={next}
          className="w-full py-3.5 rounded-xl font-['General_Sans'] font-bold text-[15px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#95DEE6', color: '#183A3F' }}
          data-testid="welcome-next"
        >
          Continue
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
