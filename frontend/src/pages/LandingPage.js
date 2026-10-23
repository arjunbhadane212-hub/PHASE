import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useReducedMotion, animate } from 'framer-motion';
import { Menu, X, ArrowRight, Check, Minus, Gamepad2, Eye, Dumbbell, Brain, Target, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PhaseWordmark from '../components/brand/PhaseMark';
import {
  HeroDemo, LoopPhone, PhoneFrame, GameModeScreen, FocusTimerScreen, FocusListScreen,
  LootBox, BOXES, ProfilePreview, RoastDemo, MiniLevel, MiniLeague, eyebrow,
} from '../components/landing/Demos';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

// Phase landing page — v2 system (Archivo / General Sans / JetBrains Mono,
// flat --gm-* surfaces, cyan = action, lime = success).
//
// The page tells one story, in order: what Phase is → proof it works → why
// habits usually fail → how Phase works → what you can build with it → why
// it's fun → who keeps you honest → how you want to play → price → FAQ.
// Self-improvement leads; the game layer is the "why it's fun" chapter.

// ⚠️ PLACEHOLDER IMPACT NUMBERS — replace with real figures before launch.
// (Live database on 2026-10-22: 11 users, 53 habits completed, ~27 focus hours.)
const IMPACT = [
  { value: 12000, format: (n) => `${Math.round(n / 1000)}K+`, label: 'people building better routines' },
  { value: 1.8, format: (n) => `${n.toFixed(1)}M`, label: 'habits checked off' },
  { value: 240, format: (n) => `${Math.round(n)}K`, label: 'hours of focused work' },
];

const NAV = [
  ['loop', 'How it works'],
  ['areas', 'What you can build'],
  ['modes', 'Modes'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: [0.2, 0.7, 0.2, 1] },
};

function Eyebrow({ children, className = '' }) {
  return <span className={`${eyebrow} text-[11px] text-[var(--gm-muted)] ${className}`}>{children}</span>;
}

function H2({ children, className = '' }) {
  return (
    <h2 className={`font-['Archivo'] font-black text-[var(--gm-ink)] text-[40px] sm:text-[56px] lg:text-[64px] leading-[0.92] tracking-[-0.025em] ${className}`}>
      {children}
    </h2>
  );
}

function CTA({ children, to = '/signup', dark = false, className = '', testId }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full text-[15px] font-bold transition hover:opacity-90 active:scale-[0.98] ${
        dark ? 'bg-[#183A3F] text-[#95DEE6]' : 'bg-[#95DEE6] text-[#183A3F] shadow-[var(--gm-shadow-cyan)]'
      } ${className}`}
      data-testid={testId}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--gm-bg)] text-[var(--gm-ink)] overflow-x-clip">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        data-testid="landing-navbar"
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          scrolled || menuOpen ? 'bg-[var(--gm-bg)] border-b border-[var(--gm-track)]' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 lg:h-[72px] flex items-center justify-between">
          <PhaseWordmark size={28} testId="logo" />

          <div className="hidden lg:flex items-center gap-1">
            {NAV.map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id)}
                className="px-3.5 py-2 rounded-full text-sm font-bold text-[var(--gm-muted)] hover:text-[var(--gm-ink)] hover:bg-[var(--gm-card)] transition-colors"
                data-testid={`nav-${id}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <CTA to="/dashboard" className="!h-11 !px-5 !text-sm" testId="nav-dashboard-btn">Open Phase <ArrowRight className="w-4 h-4" /></CTA>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 rounded-full text-sm font-bold text-[var(--gm-ink)] hover:bg-[var(--gm-card)] transition-colors" data-testid="nav-login-btn">
                  Log in
                </Link>
                <CTA className="!h-11 !px-5 !text-sm" testId="nav-signup-btn">Start free</CTA>
              </>
            )}
          </div>

          <button
            className="lg:hidden w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-[var(--gm-ink)]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            data-testid="mobile-menu-btn"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
              data-testid="mobile-menu"
            >
              <div className="px-5 pb-6 pt-2 space-y-1">
                {NAV.map(([id, label]) => (
                  <button key={id} onClick={() => go(id)} className="block w-full text-left py-3 font-['Archivo'] font-black text-2xl text-[var(--gm-ink)]">
                    {label}
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-4">
                  {isAuthenticated ? (
                    <CTA to="/dashboard" className="col-span-2">Open Phase</CTA>
                  ) : (
                    <>
                      <Link to="/login" className="h-[52px] rounded-full bg-[var(--gm-card)] flex items-center justify-center text-[15px] font-bold text-[var(--gm-ink)]">Log in</Link>
                      <CTA>Start free</CTA>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-24" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className={`${eyebrow} text-[11px] inline-flex items-center gap-2 rounded-full bg-[var(--gm-card)] px-3 py-1.5 text-[var(--gm-muted)]`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DBF67F]" /> The habit tracker for a better life
              </span>
              <h1
                className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[60px] sm:text-[88px] xl:text-[104px] leading-[0.86] tracking-[-0.035em] mt-6"
                data-testid="hero-title"
              >
                Discipline,<br />made{' '}
                <span className="inline-block bg-[#95DEE6] text-[#183A3F] px-3 sm:px-4 rounded-[18px] sm:rounded-[24px] -rotate-2 mt-2">fun.</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-[var(--gm-muted)] mt-7 max-w-[540px] leading-relaxed" data-testid="hero-subtitle">
                Phase helps you build the habits that change your life: training, sleep, reading, focus. Then it makes showing up every day feel like progress you can actually see.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <CTA testId="hero-cta-btn">Start building, free <ArrowRight className="w-4 h-4" /></CTA>
              <button
                onClick={() => go('loop')}
                className="h-[52px] px-7 rounded-full bg-[var(--gm-card)] text-[15px] font-bold text-[var(--gm-ink)] hover:bg-[var(--gm-badge)] transition-colors"
              >
                See how it works
              </button>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2"
            >
              {['Free forever', 'No ads', 'Set up in a minute'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-bold text-[var(--gm-muted)]">
                  <Check className="w-4 h-4 text-[#DBF67F]" strokeWidth={3} /> {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex justify-center"
          >
            <HeroDemo />
          </motion.div>
        </div>
      </section>

      {/* ── 2. Impact ───────────────────────────────────────────────────── */}
      <Impact />

      {/* ── 3. Why habits fail ──────────────────────────────────────────── */}
      <WhyPhase />

      {/* ── 4. How it works ─────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── 5. What you can build ───────────────────────────────────────── */}
      <LifeAreas />

      {/* ── 6. Why it's fun ─────────────────────────────────────────────── */}
      <section id="fun" className="py-24 lg:py-32" data-testid="fun-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div {...reveal} className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <Eyebrow>Why you'll stick with it</Eyebrow>
              <H2 className="mt-4">The work is real. The feeling is fun.</H2>
            </div>
            <p className="text-lg font-medium text-[var(--gm-muted)] lg:pb-2">
              Changing your life is hard. Phase adds just enough play to make tomorrow easier than today: a little reward, a little progress, a little competition.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            <FunCard
              title="Level up as you grow"
              body="Every habit adds XP. Watch yourself climb from Rookie to Eternal as your routine gets stronger."
            >
              <MiniLevel />
            </FunCard>
            <FunCard
              title="Rewards for showing up"
              body="Habits earn gems for boxes, titles and more. Earned only by doing the work, never sold."
              bare
            >
              <LootBox box={BOXES[2]} />
            </FunCard>
            <FunCard
              title="A little friendly pressure"
              body="An optional weekly league with people at your level. Nothing motivates like someone just ahead."
            >
              <MiniLeague />
            </FunCard>
          </div>
        </div>
      </section>

      {/* ── 7. Accountability ───────────────────────────────────────────── */}
      <section className="pb-24 lg:pb-32" data-testid="accountability-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div {...reveal} className="max-w-3xl mb-12">
            <Eyebrow>Accountability</Eyebrow>
            <H2 className="mt-4">You won't be doing it alone.</H2>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-4">
            <motion.div {...reveal}><RoastDemo /></motion.div>
            <motion.div {...reveal} className="rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-6 sm:p-8 flex flex-col">
              <Eyebrow>Your profile</Eyebrow>
              <h3 className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[28px] sm:text-[34px] leading-[0.95] tracking-[-0.02em] mt-2">Proof you can share.</h3>
              <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-3">
                Your streak, your progress and your best run, on one link. Send it to the friend who's keeping you honest. Always free.
              </p>
              <div className="mt-6 flex-1 flex items-center justify-center">
                <ProfilePreview />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 8. Modes ────────────────────────────────────────────────────── */}
      <Modes />

      {/* ── 9. Pricing ──────────────────────────────────────────────────── */}
      <Pricing />

      {/* ── 10. FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 lg:py-32" data-testid="faq-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16">
          <motion.div {...reveal}>
            <Eyebrow>FAQ</Eyebrow>
            <H2 className="mt-4">Questions, answered.</H2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2.5">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-2xl bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] px-5 border-0"
                data-testid={`faq-item-${i}`}
              >
                <AccordionTrigger className="text-left text-base font-bold hover:no-underline py-5 text-[var(--gm-ink)]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] font-medium text-[var(--gm-muted)] pb-5 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-6">
        <motion.div {...reveal} className="max-w-7xl mx-auto rounded-[32px] bg-[#95DEE6] px-6 sm:px-12 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end">
            <div>
              <span className={`${eyebrow} text-[11px] text-[#3E6C71]`}>Day 1</span>
              <h2 className="font-['Archivo'] font-black text-[#183A3F] text-[52px] sm:text-[84px] lg:text-[104px] leading-[0.86] tracking-[-0.035em] mt-4">
                Your better<br />routine starts today.
              </h2>
              <p className="text-lg font-medium text-[#3E6C71] mt-6 max-w-md">
                Pick one habit. Check it off. That's day one. Phase helps with every day after.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <CTA dark testId="final-cta-btn">Start free <ArrowRight className="w-4 h-4" /></CTA>
              {!isAuthenticated && (
                <Link to="/login" className="text-center text-sm font-bold text-[#183A3F] underline underline-offset-4">
                  I already have an account
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="px-5 sm:px-8 py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 md:items-center justify-between">
          <div>
            <PhaseWordmark size={26} />
            <p className="text-sm font-medium text-[var(--gm-muted)] mt-3">Move with us. Discipline in your pocket.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[var(--gm-muted)]">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className="hover:text-[var(--gm-ink)]">{label}</button>
            ))}
            <Link to="/login" className="hover:text-[var(--gm-ink)]">Log in</Link>
            <Link to="/signup" className="hover:text-[var(--gm-ink)]">Sign up</Link>
          </div>
        </div>
        <div className={`max-w-7xl mx-auto mt-10 pt-6 border-t border-[var(--gm-track)] ${eyebrow} text-[10px] text-[var(--gm-muted)]`}>
          © {new Date().getFullYear()} Phase
        </div>
      </footer>
    </div>
  );
}

/* ── Impact: big, unmissable numbers ───────────────────────────────────── */

function CountUp({ value, format }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView || reduce) return undefined;
    const c = animate(0, value, { duration: 1.6, ease: [0.2, 0.7, 0.2, 1], onUpdate: setN });
    return () => c.stop();
  }, [inView, reduce, value]);
  return <span ref={ref}>{format(n)}</span>;
}

function Impact() {
  return (
    <section className="py-20 lg:py-28 landing-band" data-testid="impact-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="max-w-2xl">
          <Eyebrow>The proof</Eyebrow>
          <H2 className="mt-4">Real people. Better days.</H2>
        </motion.div>
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {IMPACT.map((s, i) => (
            <motion.div
              key={s.label}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.08 }}
              className={`rounded-[28px] p-7 sm:p-9 ${i === 0 ? 'bg-[#DBF67F]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)]'}`}
            >
              <div
                className={`font-['Archivo'] font-black text-[72px] sm:text-[96px] xl:text-[112px] leading-[0.85] tracking-[-0.04em] tabular-nums ${i === 0 ? 'text-[#2A3B0B]' : 'text-[var(--gm-ink)]'}`}
                data-testid={`impact-${i}`}
              >
                <CountUp value={s.value} format={s.format} />
              </div>
              <div className={`text-lg sm:text-xl font-bold mt-5 ${i === 0 ? 'text-[#2A3B0B]' : 'text-[var(--gm-muted)]'}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>
        <motion.div {...reveal} className="mt-4 rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-7 sm:p-9 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
          <div className="font-['Archivo'] font-black text-[72px] sm:text-[96px] leading-[0.85] tracking-[-0.04em]">66 days</div>
          <p className="text-lg sm:text-xl font-medium text-[var(--gm-muted)] max-w-xl">
            The average time it takes for a new habit to feel automatic, according to research from University College London. Phase is built to carry you through all 66.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Why habits fail ───────────────────────────────────────────────────── */

const COMPARE = [
  ['Motivation runs out by week two.', 'Small wins you can see, every single day.'],
  ['One bad day and you give up.', 'Streak Shields forgive a slip, so you keep going.'],
  ["No idea if you're actually improving.", 'Charts that show your consistency climbing.'],
  ["Nobody knows you're even trying.", 'Friends and a profile that keep you accountable.'],
  ['It feels like a chore.', 'It feels like leveling up your actual life.'],
];

function WhyPhase() {
  return (
    <section className="py-24 lg:py-32" data-testid="why-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <Eyebrow>Why Phase</Eyebrow>
          <H2 className="mt-4">Motivation fades. Systems don't.</H2>
          <p className="text-lg font-medium text-[var(--gm-muted)] mt-6 max-w-xl">
            Most people don't quit because they're lazy. They quit because nothing makes tomorrow easier than today. Phase is built to change that.
          </p>
        </motion.div>

        <div className="mt-14 rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[var(--gm-track)]">
            <div className={`${eyebrow} text-[10px] sm:text-[11px] text-[var(--gm-muted)] px-5 sm:px-8 py-4`}>Doing it alone</div>
            <div className={`${eyebrow} text-[10px] sm:text-[11px] text-[#183A3F] bg-[#95DEE6] px-5 sm:px-8 py-4`}>With Phase</div>
          </div>
          {COMPARE.map(([old, phase], i) => (
            <motion.div
              key={old}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: i * 0.06 }}
              className="grid grid-cols-2 border-b last:border-b-0 border-[var(--gm-track)]"
            >
              <div className="px-5 sm:px-8 py-5 flex items-start gap-3">
                <Minus className="w-4 h-4 mt-1 text-[var(--gm-muted)] flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium text-[var(--gm-muted)]">{old}</span>
              </div>
              <div className="px-5 sm:px-8 py-5 flex items-start gap-3">
                <span className="w-5 h-5 mt-0.5 rounded-full bg-[#DBF67F] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#2A3B0B]" strokeWidth={3} />
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--gm-ink)]">{phase}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works: sticky phone, scroll-driven steps ───────────────────── */

const STEPS = [
  {
    k: 'Plan',
    title: 'Choose what matters.',
    body: 'Pick the habits you want in your life and put them where they fit: morning, afternoon or night. Start small. Phase grows with you.',
  },
  {
    k: 'Do',
    title: 'Check it off. Feel it.',
    body: 'Every habit counts the second you finish it. Small wins, stacked day after day, are how real change happens.',
  },
  {
    k: 'Repeat',
    title: 'Build the streak.',
    body: 'Show up again tomorrow, and the day after. Miss one and a Streak Shield can catch you, because one bad day shouldn’t undo a good month.',
  },
  {
    k: 'Grow',
    title: 'Watch yourself change.',
    body: "Your consistency, your hours of focus, your longest streak. Proof that you're becoming the person you said you'd be.",
  },
];

function Step({ i, step, active, innerRef }) {
  return (
    <div ref={innerRef} className="lg:min-h-[70vh] flex items-center">
      <div className={`transition-opacity duration-300 ${active ? 'lg:opacity-100' : 'lg:opacity-30'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-full flex items-center justify-center font-['Archivo'] font-black text-sm ${active ? 'bg-[#95DEE6] text-[#183A3F]' : 'bg-[var(--gm-card)] text-[var(--gm-muted)]'}`}>
            {i + 1}
          </span>
          <Eyebrow>{step.k}</Eyebrow>
        </div>
        <h3 className="font-['Archivo'] font-black text-[36px] sm:text-[48px] leading-[0.95] tracking-[-0.02em] mt-5">{step.title}</h3>
        <p className="text-lg font-medium text-[var(--gm-muted)] mt-4 max-w-md leading-relaxed">{step.body}</p>
        {/* Mobile: each step carries its own phone */}
        <div className="lg:hidden mt-10 flex justify-center">
          <LoopPhone step={i} />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  // The active step is whichever one sits closest to the middle of the
  // viewport, so scrolling either direction always swaps the phone screen.
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActive(best);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section id="loop" className="py-24 lg:py-32 landing-band" data-testid="loop-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <Eyebrow>How it works</Eyebrow>
          <H2 className="mt-4">Four steps. Every day.</H2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 mt-10 lg:mt-0">
          <div className="space-y-24 lg:space-y-0">
            {STEPS.map((s, i) => (
              <Step key={s.k} i={i} step={s} active={active === i} innerRef={(el) => { refs.current[i] = el; }} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-24 flex flex-col items-center phone-fit">
              <LoopPhone step={active} />
              <div className="flex gap-1.5 mt-6">
                {STEPS.map((s, i) => (
                  <span key={s.k} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-8 bg-[#95DEE6]' : 'w-1.5 bg-[var(--gm-track)]'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── What you can build ────────────────────────────────────────────────── */

const AREAS = [
  { icon: Dumbbell, name: 'Body', line: 'Feel stronger, sleep better.', habits: ['Morning run', '8 hours of sleep', 'Drink 2L of water', 'Stretch for 10 minutes'] },
  { icon: Brain, name: 'Mind', line: 'Calmer, clearer, kinder to yourself.', habits: ['Meditate 10 minutes', 'Journal before bed', 'Read 10 pages', 'No social media till noon'] },
  { icon: Target, name: 'Focus', line: 'Do the work that matters.', habits: ['2 hours of deep work', 'Study session', 'Practice a language', 'Practice an instrument'] },
  { icon: Sun, name: 'Life', line: 'The small things that add up.', habits: ['Wake up at 6:30', 'Make your bed', 'Plan tomorrow', 'Call someone you love'] },
];

function AreaCard({ area, index }) {
  const Icon = area.icon;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [done, setDone] = useState([false, false, false, false]);

  // When the card scrolls in, the first habits tick themselves off; the rest
  // are left for the visitor to tap.
  useEffect(() => {
    if (!inView) return undefined;
    const timers = [0, 1].map((i) => setTimeout(() => {
      setDone((d) => d.map((v, j) => (j === i ? true : v)));
    }, 500 + index * 150 + i * 450));
    return () => timers.forEach(clearTimeout);
  }, [inView, index]);

  const count = done.filter(Boolean).length;
  return (
    <motion.div
      ref={ref}
      {...reveal}
      transition={{ ...reveal.transition, delay: index * 0.06 }}
      className="rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-6 flex flex-col"
    >
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl bg-[#95DEE6] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#183A3F]" />
        </div>
        <span className={`${eyebrow} text-[10px] text-[var(--gm-muted)]`}>{count}/4 today</span>
      </div>
      <div className="font-['Archivo'] font-black text-[30px] leading-none mt-5">{area.name}</div>
      <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-2">{area.line}</p>
      <div className="mt-5 space-y-2">
        {area.habits.map((h, i) => (
          <button
            key={h}
            onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${done[i] ? 'bg-[#DBF67F]' : 'bg-[var(--gm-bg)] hover:bg-[var(--gm-badge)]'}`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${done[i] ? 'bg-[#2A3B0B]' : 'border-2 border-[var(--gm-checkbox)]'}`}>
              {done[i] && <Check className="w-3 h-3 text-[#DBF67F]" strokeWidth={3} />}
            </span>
            <span className={`text-sm font-bold ${done[i] ? 'text-[#2A3B0B]' : 'text-[var(--gm-ink)]'}`}>{h}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function LifeAreas() {
  return (
    <section id="areas" className="py-24 lg:py-32" data-testid="areas-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="grid lg:grid-cols-2 gap-6 items-end mb-12">
          <div>
            <Eyebrow>What you can build</Eyebrow>
            <H2 className="mt-4">Whatever you're working on.</H2>
          </div>
          <p className="text-lg font-medium text-[var(--gm-muted)] lg:pb-2">
            Your body, your mind, your work, your everyday. Track any habit you want, as many as you want, free.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AREAS.map((a, i) => <AreaCard key={a.name} area={a} index={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ── Why it's fun ──────────────────────────────────────────────────────── */

function FunCard({ title, body, children, bare = false }) {
  return (
    <motion.div {...reveal} className="rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-6 flex flex-col">
      <div className={bare ? '[&>button]:!bg-[var(--gm-bg)] [&>button]:!shadow-none [&>button]:w-full [&>button]:!rounded-2xl' : ''}>{children}</div>
      <h3 className="font-['Archivo'] font-black text-[24px] leading-[1] tracking-[-0.01em] mt-6">{title}</h3>
      <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-2">{body}</p>
    </motion.div>
  );
}

/* ── Modes ─────────────────────────────────────────────────────────────── */

const MODE_COPY = {
  game: {
    icon: Gamepad2,
    title: 'Game Mode',
    line: 'Make it a game.',
    points: [
      'XP, levels and rewards for every habit',
      'An optional weekly league',
      'Tough-love reminders when you slack',
      'Streaks, titles and a profile to share',
    ],
  },
  focus: {
    icon: Eye,
    title: 'Focus Mode',
    line: 'Keep it calm.',
    points: [
      'Tap Begin and a full-screen timer takes over',
      'Sessions from 5 to 60 minutes',
      'Leave early and the habit fails',
      'No XP, no league, nothing to distract you',
    ],
  },
};

function Modes() {
  const [mode, setMode] = useState('game');
  const [focusView, setFocusView] = useState('list');
  useEffect(() => {
    if (mode !== 'focus') return undefined;
    setFocusView('list');
    const t = setTimeout(() => setFocusView('timer'), 2200);
    return () => clearTimeout(t);
  }, [mode]);
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;

  return (
    <section id="modes" className="py-24 lg:py-32 landing-band" data-testid="modes-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <motion.div {...reveal}>
            <Eyebrow>Two ways to use Phase</Eyebrow>
            <H2 className="mt-4">Make it a game. Or keep it calm.</H2>
            <p className="text-lg font-medium text-[var(--gm-muted)] mt-6 max-w-lg">
              Same habits, same streak, two very different feels. Pick one when you join and switch whenever you want.
            </p>
          </motion.div>

          <div className="mt-9 inline-flex rounded-full bg-[var(--gm-card)] p-1.5 shadow-[var(--gm-shadow-card)]" role="tablist">
            {['game', 'focus'].map((k) => {
              const I = MODE_COPY[k].icon;
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={mode === k}
                  onClick={() => setMode(k)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${mode === k ? 'bg-[#95DEE6] text-[#183A3F]' : 'text-[var(--gm-muted)] hover:text-[var(--gm-ink)]'}`}
                  data-testid={`mode-tab-${k}`}
                >
                  <I className="w-4 h-4" /> {MODE_COPY[k].title}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="mt-8"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                <span className="font-['Archivo'] font-black text-2xl">{copy.line}</span>
              </div>
              <ul className="mt-6 grid sm:grid-cols-2 gap-2.5">
                {copy.points.map((p) => (
                  <li key={p} className="rounded-2xl bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-4 text-[15px] font-bold leading-snug">
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center">
          <PhoneFrame>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode === 'game' ? 'game' : focusView}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                {mode === 'game' ? <GameModeScreen /> : focusView === 'list' ? <FocusListScreen /> : <FocusTimerScreen />}
              </motion.div>
            </AnimatePresence>
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────────────────────── */

const FREE = [
  'Unlimited habits, every time slot',
  'Full Focus Mode',
  'Streaks, progress and levels 1–5',
  'Your shareable profile',
  'Reminders that talk back',
  'Earn gems from day one',
];
const PRO = [
  'Everything in Free',
  'Detailed analytics and heatmap',
  'Streak Shields',
  'All 15 levels, up to Eternal',
  'Full weekly league standings',
  'Rewards, boxes and the full shop',
  'Equip titles and banners',
  'Profile effects',
];

function Pricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="pricing" className="py-24 lg:py-32" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <H2 className="mt-4">Free to start. Pro when you're ready.</H2>
          </div>
          <div className="inline-flex self-start lg:self-auto rounded-full bg-[var(--gm-card)] p-1.5 shadow-[var(--gm-shadow-card)]">
            {[[false, 'Monthly'], [true, 'Yearly']].map(([v, l]) => (
              <button
                key={l}
                onClick={() => setAnnual(v)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${annual === v ? 'bg-[#95DEE6] text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}
                data-testid={`pricing-${l.toLowerCase()}`}
              >
                {l}{v && <span className="ml-1.5 text-[11px] opacity-80">−40%</span>}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          <motion.div {...reveal} className="rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-7 sm:p-9 flex flex-col" data-testid="pricing-free">
            <span className="font-['Archivo'] font-black text-2xl">Free</span>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-['Archivo'] font-black text-[64px] leading-[0.85] tracking-[-0.03em]">$0</span>
              <span className={`${eyebrow} text-[11px] text-[var(--gm-muted)] pb-1.5`}>forever</span>
            </div>
            <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-4">Everything you need to build the habit and stick with it.</p>
            <ul className="mt-7 space-y-3 flex-1">
              {FREE.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px] font-bold">
                  <Check className="w-4 h-4 text-[var(--gm-muted)]" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" className="mt-9 h-[52px] rounded-full bg-[var(--gm-badge)] flex items-center justify-center text-[15px] font-bold hover:opacity-90">
              Start free
            </Link>
          </motion.div>

          <motion.div {...reveal} className="rounded-[28px] bg-[#95DEE6] p-7 sm:p-9 flex flex-col text-[#183A3F]" data-testid="pricing-pro">
            <div className="flex items-center justify-between">
              <span className="font-['Archivo'] font-black text-2xl">Phase Pro</span>
              {annual && <span className={`${eyebrow} text-[10px] rounded-full bg-[#183A3F] text-[#95DEE6] px-2.5 py-1`}>Save 40%</span>}
            </div>
            <div className="mt-6 flex items-end gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={annual ? 'y' : 'm'}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  className="font-['Archivo'] font-black text-[64px] leading-[0.85] tracking-[-0.03em]"
                >
                  {annual ? '$4.17' : '$6.99'}
                </motion.span>
              </AnimatePresence>
              <span className={`${eyebrow} text-[11px] text-[#3E6C71] pb-1.5`}>/ month</span>
            </div>
            <p className="text-[15px] font-medium text-[#3E6C71] mt-4">
              {annual ? '$49.99 billed once a year.' : 'Billed monthly. Cancel any time.'} Deeper insight into your progress, plus every reward.
            </p>
            <ul className="mt-7 grid sm:grid-cols-2 gap-x-4 gap-y-3 flex-1">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] font-bold">
                  <span className="w-5 h-5 mt-0.5 rounded-full bg-[#183A3F] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#95DEE6]" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" className="mt-9 h-[52px] rounded-full bg-[#183A3F] text-[#95DEE6] flex items-center justify-center gap-2 text-[15px] font-bold hover:opacity-90">
              Start free, upgrade in the app <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        <motion.div {...reveal} className="mt-6 grid sm:grid-cols-3 gap-3">
          {[['No ads', 'Not now, not ever.'], ['Nothing to buy your way past', 'Gems are only earned by doing the work.'], ['Your progress is yours', 'Pro adds insight, never an unfair edge.']].map(([t, s]) => (
            <div key={t} className="rounded-2xl bg-[var(--gm-card)] p-5">
              <div className="font-['Archivo'] font-black text-lg">{t}</div>
              <div className="text-sm font-medium text-[var(--gm-muted)] mt-1">{s}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'What kind of habits can I track?',
    a: 'Anything you want to do more consistently: workouts, sleep, water, reading, meditation, study, deep work, waking up early. Put each one in the morning, afternoon or night, and set how hard it is.',
  },
  {
    q: 'Is Phase actually free?',
    a: 'Yes. Unlimited habits, Focus Mode, streaks, your progress and your profile are free forever, with no ads. Phase Pro ($6.99 a month, or $49.99 a year) adds detailed analytics, Streak Shields and the full set of rewards.',
  },
  {
    q: 'What happens if I miss a day?',
    a: "Your streak resets to zero, unless you have a Streak Shield, which absorbs the miss automatically. Either way, your progress and everything you've earned stays.",
  },
  {
    q: "What's the difference between Game Mode and Focus Mode?",
    a: 'Game Mode adds levels, rewards, a weekly league and tough-love reminders to keep things fun. Focus Mode strips all of that away: each habit gets a Begin button that starts a full-screen timer, and leaving early counts as a miss.',
  },
  {
    q: 'Can I switch modes later?',
    a: 'Any time, from Settings. Your habits and your streak come with you.',
  },
  {
    q: 'Do I need to download anything?',
    a: 'No. Phase runs in your browser on your phone or your computer. Sign up and you can check off your first habit in under a minute.',
  },
  {
    q: 'Who can see my profile?',
    a: 'Your profile shows your streak, level and stats so you can share it with friends. The habits themselves stay on your own dashboard.',
  },
];
