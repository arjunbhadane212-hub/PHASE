import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Check, Minus, Gamepad2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PhaseWordmark from '../components/brand/PhaseMark';
import {
  HeroDemo, LoopPhone, PhoneFrame, GameModeScreen, FocusTimerScreen, FocusListScreen,
  RankLadder, LootBoxes, TitleMarquee, ProfilePreview, RoastDemo, LeagueDemo, eyebrow,
} from '../components/landing/Demos';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

// Phase landing page — v2 system (Archivo / General Sans / JetBrains Mono,
// flat --gm-* surfaces, cyan = action, lime = success). Every visual on this
// page is a working miniature of a real Phase screen, not an illustration.

const NAV = [
  ['loop', 'How it works'],
  ['modes', 'Modes'],
  ['rewards', 'Rewards'],
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-28" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className={`${eyebrow} text-[11px] inline-flex items-center gap-2 rounded-full bg-[var(--gm-card)] px-3 py-1.5 text-[var(--gm-muted)]`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DBF67F]" /> The habit tracker that keeps score
              </span>
              <h1
                className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[56px] sm:text-[80px] xl:text-[96px] leading-[0.86] tracking-[-0.035em] mt-6"
                data-testid="hero-title"
              >
                Discipline<br />you can{' '}
                <span className="inline-block bg-[#95DEE6] text-[#183A3F] px-3 sm:px-4 rounded-[18px] sm:rounded-[24px] -rotate-2 mt-2">flex.</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-[var(--gm-muted)] mt-7 max-w-[540px] leading-relaxed" data-testid="hero-subtitle">
                Phase turns every habit you finish into XP, gems and a streak that's on the line every single day. Climb 15 ranks, unlock titles money can't buy, and put it all on a profile built to be shared.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <CTA testId="hero-cta-btn">Start your streak, free <ArrowRight className="w-4 h-4" /></CTA>
              <button
                onClick={() => go('loop')}
                className="h-[52px] px-7 rounded-full bg-[var(--gm-card)] text-[15px] font-bold text-[var(--gm-ink)] hover:bg-[var(--gm-badge)] transition-colors"
              >
                See how it works
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 grid grid-cols-3 max-w-[480px] divide-x divide-[var(--gm-track)]"
            >
              {[['15', 'Ranks to climb'], ['50+', 'Titles to earn'], ['$0', 'To start']].map(([n, l]) => (
                <div key={l} className="px-4 first:pl-0">
                  <div className="font-['Archivo'] font-black text-[30px] sm:text-[36px] leading-none">{n}</div>
                  <div className={`${eyebrow} text-[10px] text-[var(--gm-muted)] mt-2`}>{l}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex flex-col items-center"
          >
            <HeroDemo />
            <p className={`${eyebrow} text-[10px] text-[var(--gm-muted)] mt-5`}>Live demo · tap a habit</p>
          </motion.div>
        </div>
      </section>

      {/* ── Why Phase ───────────────────────────────────────────────────── */}
      <WhyPhase />

      {/* ── How it works ────────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── Modes ───────────────────────────────────────────────────────── */}
      <Modes />

      {/* ── Ranks ───────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" data-testid="ranks-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div {...reveal} className="max-w-3xl mb-12">
            <Eyebrow>The ladder</Eyebrow>
            <H2 className="mt-4">15 ranks. Most people stall at Adept.</H2>
            <p className="text-lg font-medium text-[var(--gm-muted)] mt-6 max-w-xl">
              Every XP point moves you up. Ten ranks from Rookie to Apex, then five prestige ranks for the few who keep going. Drag to see where showing up takes you.
            </p>
          </motion.div>
          <motion.div {...reveal}>
            <RankLadder />
          </motion.div>
        </div>
      </section>

      {/* ── Rewards ─────────────────────────────────────────────────────── */}
      <section id="rewards" className="py-24 lg:py-32 landing-band" data-testid="rewards-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div {...reveal} className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <Eyebrow>Gems, boxes, titles</Eyebrow>
              <H2 className="mt-4">Earn it. Then wear it.</H2>
            </div>
            <p className="text-lg font-medium text-[var(--gm-muted)] lg:pb-2">
              Every habit drops gems. Spend them in the shop or on loot boxes. Gems are only ever earned, never sold, so nobody can buy their way past you.
            </p>
          </motion.div>

          <motion.div {...reveal}>
            <LootBoxes />
          </motion.div>

          <motion.div {...reveal} className="mt-20">
            <div className="flex items-end justify-between gap-6 mb-6">
              <div>
                <h3 className="font-['Archivo'] font-black text-[28px] sm:text-[34px] leading-[0.95] tracking-[-0.02em]">Titles that say what you did.</h3>
                <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-2 max-w-xl">
                  Some you buy. Some only drop from boxes. The best ones are earned: hold a 1,000-day streak or log 1,000 focus hours. Once you have one, it's yours for good.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        <TitleMarquee />
      </section>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" data-testid="profile-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div {...reveal}>
            <Eyebrow>Your public profile</Eyebrow>
            <H2 className="mt-4">Proof, not promises.</H2>
            <p className="text-lg font-medium text-[var(--gm-muted)] mt-6 max-w-lg">
              Anyone can say they're consistent. Your Phase profile shows it: your rank, your streak, your title, every habit you've closed. One link. Always free.
            </p>
            <ul className="mt-8 space-y-3">
              {['Shareable link and screenshot-ready card', 'Equip the title you earned', 'Free forever, on every plan'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px] font-bold">
                  <span className="w-6 h-6 rounded-full bg-[#DBF67F] flex items-center justify-center"><Check className="w-3.5 h-3.5 text-[#2A3B0B]" strokeWidth={3} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...reveal} className="flex justify-center lg:justify-end">
            <motion.div whileHover={{ rotate: 0, y: -4 }} initial={{ rotate: 2 }} className="w-full max-w-[400px]">
              <ProfilePreview />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Roasts + League ─────────────────────────────────────────────── */}
      <section className="pb-24 lg:pb-32" data-testid="accountability-section">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div {...reveal} className="max-w-3xl mb-12">
            <Eyebrow>Accountability</Eyebrow>
            <H2 className="mt-4">It notices when you don't show up.</H2>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-4">
            <motion.div {...reveal}><RoastDemo /></motion.div>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}><LeagueDemo /></motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <Pricing />

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
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
        <motion.div {...reveal} className="max-w-7xl mx-auto rounded-[32px] bg-[#95DEE6] px-6 sm:px-12 py-16 sm:py-24 relative overflow-hidden">
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-10 items-end">
            <div>
              <span className={`${eyebrow} text-[11px] text-[#3E6C71]`}>Day 1</span>
              <h2 className="font-['Archivo'] font-black text-[#183A3F] text-[56px] sm:text-[88px] lg:text-[112px] leading-[0.85] tracking-[-0.035em] mt-4">
                Your streak<br />starts today.
              </h2>
              <p className="text-lg font-medium text-[#3E6C71] mt-6 max-w-md">
                Make an account, add one habit, check it off. That's day one. Phase handles the rest.
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

/* ── Why Phase ─────────────────────────────────────────────────────────── */

const COMPARE = [
  ['You tick a box.', 'Every habit pays out XP and gems.'],
  ['Miss a day, lose everything, quit.', 'Shields save a bad day. Revives bring a streak back.'],
  ['Progress nobody ever sees.', 'A public profile made to be screenshotted.'],
  ['The same polite reminder.', 'Roasts that call you out.'],
  ['Nothing left to chase by week two.', '15 ranks, a weekly league, 50+ titles.'],
];

function WhyPhase() {
  return (
    <section className="py-24 lg:py-32 landing-band" data-testid="why-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <Eyebrow>Why Phase</Eyebrow>
          <H2 className="mt-4">You've quit habit apps before. That's not on you.</H2>
          <p className="text-lg font-medium text-[var(--gm-muted)] mt-6 max-w-xl">
            Most trackers are a checklist with a calendar. Nothing is at stake, nothing is earned, and nobody sees it. Phase is built around the opposite.
          </p>
        </motion.div>

        <div className="mt-14 rounded-[28px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[var(--gm-track)]">
            <div className={`${eyebrow} text-[10px] sm:text-[11px] text-[var(--gm-muted)] px-5 sm:px-8 py-4`}>Every other tracker</div>
            <div className={`${eyebrow} text-[10px] sm:text-[11px] text-[#183A3F] bg-[#95DEE6] px-5 sm:px-8 py-4`}>Phase</div>
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
    title: 'Build your day.',
    body: 'Add habits to Morning, Afternoon or Night. Set the difficulty, and the reward scales with it: Easy +10 XP, Medium +25, Hard +50.',
  },
  {
    k: 'Do',
    title: 'Check it off. Get paid.',
    body: 'XP and gems land the second you finish. No waiting for the end of the week to feel like it counted.',
  },
  {
    k: 'Keep',
    title: 'Keep the streak alive.',
    body: 'Show up every day and the number climbs. Miss one and it resets, unless a Streak Shield takes the hit for you.',
  },
  {
    k: 'Climb',
    title: 'Rank up. Flex it.',
    body: 'Your XP moves you up the ladder from Rookie to Eternal, and unlocks titles along the way. Everything shows on your profile.',
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
    <section id="loop" className="py-24 lg:py-32" data-testid="loop-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="max-w-3xl">
          <Eyebrow>How it works</Eyebrow>
          <H2 className="mt-4">Four moves. Every day.</H2>
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

/* ── Modes ─────────────────────────────────────────────────────────────── */

const MODE_COPY = {
  game: {
    icon: Gamepad2,
    title: 'Game Mode',
    line: 'Level up your life. Make it loud.',
    points: [
      'XP, gems and 15 ranks for every habit',
      'Weekly league against people at your level',
      'Loot boxes, a shop and 50+ titles',
      'Trash-talk roasts when you slack',
    ],
  },
  focus: {
    icon: Eye,
    title: 'Focus Mode',
    line: 'Less noise. Pure progress.',
    points: [
      'Tap Begin and a full-screen timer takes over',
      'Sessions from 5 to 60 minutes',
      'Quit early: the habit fails and costs 30 gems',
      'No XP, no leaderboard, nothing to distract you',
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
            <Eyebrow>Two modes</Eyebrow>
            <H2 className="mt-4">Play it loud. Or lock in.</H2>
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
  'XP, streaks and ranks 1–5',
  'Public profile, always',
  'Roast notifications',
  'Earn gems from day one',
];
const PRO = [
  'Everything in Free',
  'All 15 ranks, up to Eternal',
  'Loot boxes and the full shop',
  'Streak Shields',
  'Equip titles and banners',
  'Full league standings',
  'Detailed analytics and heatmap',
  'Profile effects',
];

function Pricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="pricing" className="py-24 lg:py-32 landing-band" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div {...reveal} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <Eyebrow>Pricing</Eyebrow>
            <H2 className="mt-4">Free to start. Pro to go all the way.</H2>
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
            <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-4">Everything you need to build the habit and prove it.</p>
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
              {annual ? '$49.99 billed once a year.' : 'Billed monthly. Cancel any time.'} Status, not stats: Pro never makes anyone stronger.
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
          {[['No ads', 'Not now, not ever.'], ['No gem packs', 'Gems are earned. Full stop.'], ['No pay-to-win', 'Pro is cosmetic and social.']].map(([t, s]) => (
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
    q: 'Is Phase actually free?',
    a: "Yes. Unlimited habits, Focus Mode, XP, streaks, ranks 1 to 5 and your public profile are free forever, with no ads. Phase Pro ($6.99 a month, or $49.99 a year) unlocks the rest of the ladder, loot boxes, the shop and the full league.",
  },
  {
    q: "What's the difference between Game Mode and Focus Mode?",
    a: 'Game Mode is the full RPG: XP, ranks, gems, loot boxes, a weekly league and loud roasts. Focus Mode strips all of that away. Each habit gets a Begin button that starts a full-screen timer, and leaving early fails the habit and costs you 30 gems.',
  },
  {
    q: 'Can I switch modes later?',
    a: 'Any time, from Settings. Your habits and your streak come with you.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'Your streak resets to zero. A Streak Shield, if you have one, absorbs the miss automatically and your streak survives. Titles you already earned are permanent and never taken away.',
  },
  {
    q: 'How do I earn XP and gems?',
    a: 'By completing habits. Easy habits are worth 10 XP and 5 gems, Medium 25 XP and 10 gems, Hard 50 XP and 20 gems.',
  },
  {
    q: 'Can I buy gems?',
    a: "No. Gems are only earned by doing your habits, and that will never change. It's the only way to keep the leaderboard and the titles honest.",
  },
  {
    q: 'Do I need to download anything?',
    a: 'No. Phase runs in your browser on your phone or your computer. Sign up and you can start your first habit in under a minute.',
  },
  {
    q: 'Who can see my profile?',
    a: 'Your public profile shows your rank, streak, equipped title and stats, so you can share it. The habits themselves stay on your own dashboard.',
  },
];
