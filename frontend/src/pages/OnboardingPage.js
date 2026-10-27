import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain, Rocket, Gamepad2, Target, Lock, BarChart3, Trophy, MessageSquare, Flame, Eye, ArrowLeft, ArrowRight, Check, Gem, Play, Heart, Sparkles, Clock, Calendar, RotateCcw, TrendingDown, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { PhaseMark } from '../components/brand/PhaseMark';

// Each question is doing a real job — not demographics. In order:
//   1. Name the pain  → Phase knows what you're really here for.
//   2. Name the pattern that keeps breaking → Phase understands why past apps failed.
//   3. Name the stakes → Phase helps you see what you'll gain.
//   4. Pick the fuel that works for YOU → Phase personalises the pressure.
// Option ids are persisted to `users` (and read by the admin dashboard), so
// keep ids short, lowercase and stable across copy changes.
const questions = [
  {
    id: 'main_goal',
    prompt: "What are you tired of putting off?",
    sub: "Pick the one that stings a little.",
    options: [
      { id: 'health',     icon: Heart,     label: 'My health',       desc: 'Training, sleep, moving my body again' },
      { id: 'focus',      icon: Target,    label: 'My focus',        desc: "Real work, done without my phone winning" },
      { id: 'mind',       icon: Brain,     label: 'My head',         desc: 'Calmer, sharper, kinder to myself' },
      { id: 'discipline', icon: Lock,      label: 'My discipline',   desc: "Proving I can finish what I start" },
      { id: 'levelup',    icon: Rocket,    label: 'Honestly, all of it', desc: "I'm done living on default" },
    ],
  },
  {
    id: 'consistency_level',
    prompt: "When has the wall usually hit you?",
    sub: "Be honest. The honest answer is where Phase starts.",
    options: [
      { id: 'fire',          icon: Flame,         label: "It doesn't",            desc: "I show up. Just want to push harder." },
      { id: 'month',         icon: Calendar,      label: 'Around a month in',     desc: 'Started hot. Life took over.' },
      { id: 'week',          icon: TrendingDown,  label: 'End of week two',       desc: "Novelty wears off, I'm out." },
      { id: 'week1',         icon: Clock,         label: 'Inside the first week', desc: "I quit before it starts hurting." },
      { id: 'never_started', icon: RotateCcw,     label: 'I never really start',  desc: "Starting is the problem." },
    ],
  },
  {
    id: 'main_outcome',
    prompt: "6 months from now, what would mean this worked?",
    sub: "What do you want to be able to say?",
    options: [
      { id: 'proof',         icon: BarChart3, label: '"I kept the streak."',    desc: '100+ days without missing' },
      { id: 'transformed',   icon: Sparkles,  label: '"I actually changed."',   desc: 'Fitter, calmer, sharper' },
      { id: 'identity',      icon: Trophy,    label: '"I\'m that person now."', desc: 'The one who shows up' },
      { id: 'finished',      icon: Rocket,    label: '"I finished what I started."', desc: 'The thing I\'ve been putting off' },
      { id: 'nothing_hard',  icon: ShieldAlert, label: '"Nothing feels hard anymore."', desc: 'This is just who I am now' },
    ],
  },
  {
    id: 'accountability_style',
    prompt: "What would make you not quit this time?",
    sub: "Phase can lean on whichever one works for you.",
    options: [
      { id: 'progress',    icon: BarChart3,     label: 'Seeing it actually work', desc: 'Numbers climbing, every week' },
      { id: 'competition', icon: Trophy,        label: 'Someone just ahead of me', desc: 'A chase keeps me moving' },
      { id: 'rewards',     icon: Gem,           label: 'Something to earn',        desc: 'Pay me in wins' },
      { id: 'stakes',      icon: ShieldAlert,   label: 'Real stakes',              desc: 'Make it hurt a little when I slip' },
      { id: 'callout',     icon: MessageSquare, label: 'Being called out',         desc: "Don't let me get away with it" },
    ],
  },
];

const MODES = [
  {
    id: 'game',
    icon: Gamepad2,
    label: 'Game Mode',
    tagline: 'Level up your life.',
    points: ['XP, gems and 15 ranks', 'Weekly league against real people', 'Loot boxes, titles, roasts'],
  },
  {
    id: 'focus',
    icon: Eye,
    label: 'Focus Mode',
    tagline: 'Less noise. Pure progress.',
    points: ['Tap Begin, a timer takes over', 'No XP, no leaderboards', 'Quit early and it costs you'],
  },
];

const TOTAL = questions.length + 1; // + mode picker
const eyebrow = "font-['JetBrains_Mono'] font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.08em]";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  // -1 = intro, 0..3 = questions, 4 = mode picker
  const [currentStep, setCurrentStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [showSplash, setShowSplash] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  const isModeStep = currentStep === questions.length;
  const question = questions[currentStep];

  const completeOnboarding = async (mode) => {
    // Persist every survey answer collected across the earlier steps, not just
    // the mode.
    const payload = {
      app_mode: mode,
      onboarding_completed: true,
      main_goal: answers.main_goal ?? null,
      consistency_level: answers.consistency_level ?? null,
      main_outcome: answers.main_outcome ?? null,
      accountability_style: answers.accountability_style ?? null,
    };
    try {
      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id);
      if (error) throw error;
      updateUser(payload);
    } catch (e) {
      console.error('Failed to save onboarding', e);
      toast.error('Could not save your preferences. Please try again.');
    }
  };

  const handleSelect = (optionId) => {
    setAnswers({ ...answers, [question.id]: optionId });
    setTimeout(() => setCurrentStep((s) => s + 1), 260);
  };

  const handleStart = () => {
    if (!selectedMode) return;
    setShowSplash(true);
    completeOnboarding(selectedMode);
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (showSplash) return <Splash mode={selectedMode} />;

  return (
    <div className="min-h-screen bg-[var(--gm-bg)] flex flex-col" data-testid="onboarding-page">
      {/* Top bar: back, segmented progress, step count */}
      <div className="px-5 sm:px-8 pt-5 sm:pt-7">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          {currentStep >= 0 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[var(--gm-muted)] hover:text-[var(--gm-ink)] hover:bg-[var(--gm-card)] transition"
              aria-label="Back"
              data-testid="onboarding-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <PhaseMark size={28} />
          )}
          <div className="flex-1 flex gap-1.5" data-testid="onboarding-progress">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-[var(--gm-track)] overflow-hidden">
                <motion.div
                  className="h-full bg-[#95DEE6]"
                  initial={false}
                  animate={{ width: i <= currentStep ? '100%' : '0%' }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            ))}
          </div>
          <span className={`${eyebrow} text-[var(--gm-muted)] w-10 text-right`}>
            {currentStep >= 0 ? `${currentStep + 1}/${TOTAL}` : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
        <div className={`w-full ${isModeStep ? 'max-w-3xl' : 'max-w-xl'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === -1 && (
                <Intro name={user?.first_name} onStart={() => setCurrentStep(0)} />
              )}

              {question && (
                <>
                  <span className={`${eyebrow} text-[var(--gm-muted)]`}>Question {currentStep + 1}</span>
                  <h2
                    className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3"
                    data-testid="onboarding-question"
                  >
                    {question.prompt}
                  </h2>
                  {question.sub && (
                    <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-3 mb-7">{question.sub}</p>
                  )}
                  {!question.sub && <div className="mb-7" />}

                  <div className="space-y-2.5">
                    {question.options.map((option) => (
                      <OptionRow
                        key={option.id}
                        option={option}
                        selected={answers[question.id] === option.id}
                        onClick={() => handleSelect(option.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {isModeStep && (
                <>
                  <span className={`${eyebrow} text-[var(--gm-muted)]`}>Last step</span>
                  <h2
                    className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3 mb-2"
                    data-testid="onboarding-question"
                  >
                    How do you want to play?
                  </h2>
                  <p className="text-[15px] font-medium text-[var(--gm-muted)] mb-7">You can switch any time in Settings.</p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {MODES.map((m) => (
                      <ModeCard key={m.id} mode={m} selected={selectedMode === m.id} onClick={() => setSelectedMode(m.id)} />
                    ))}
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={!selectedMode}
                    className="mt-6 w-full h-[52px] rounded-full bg-[#95DEE6] text-[#183A3F] text-[15px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    data-testid="onboarding-start-btn"
                  >
                    {selectedMode ? `Start in ${selectedMode === 'game' ? 'Game' : 'Focus'} Mode` : 'Pick a mode'}
                    {selectedMode && <ArrowRight className="w-4 h-4" />}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Intro({ name, onStart }) {
  return (
    <div>
      <span className={`${eyebrow} text-[var(--gm-muted)]`}>Welcome to Phase</span>
      <h1 className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[44px] sm:text-[60px] leading-[0.9] tracking-[-0.02em] mt-3">
        {name ? <>Hey {name}.<br /></> : null}Let's set you up.
      </h1>
      <p className="text-base sm:text-lg font-medium text-[var(--gm-muted)] mt-5 max-w-md">
        Four quick questions, then you pick how Phase plays. About thirty seconds.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-2.5 max-w-md">
        {[['4', 'Questions'], ['1', 'Mode pick'], ['0', 'Cost']].map(([n, l]) => (
          <div key={l} className="rounded-2xl bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-4">
            <div className="font-['Archivo'] font-black text-[var(--gm-ink)] text-3xl leading-none">{n}</div>
            <div className={`${eyebrow} text-[var(--gm-muted)] mt-2`}>{l}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onStart}
        className="mt-8 h-[52px] px-8 rounded-full bg-[#95DEE6] text-[#183A3F] text-[15px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 transition flex items-center gap-2"
        data-testid="onboarding-intro-start"
      >
        Let's go <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function OptionRow({ option, selected, onClick }) {
  const Icon = option.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-left transition-colors ${
        selected ? 'bg-[#95DEE6] shadow-[var(--gm-shadow-hero)]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] hover:bg-[var(--gm-badge)]'
      }`}
      data-testid={`onboarding-option-${option.id}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#183A3F] text-[#95DEE6]' : 'bg-[var(--gm-badge)] text-[var(--gm-muted)]'}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-bold ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>{option.label}</p>
        <p className={`text-[13px] font-medium ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>{option.desc}</p>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#183A3F]' : 'border-2 border-[var(--gm-checkbox)]'}`}>
        {selected && <Check className="w-3.5 h-3.5 text-[#95DEE6]" strokeWidth={3} />}
      </div>
    </motion.button>
  );
}

function ModeCard({ mode, selected, onClick }) {
  const Icon = mode.icon;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-[22px] p-3 transition-colors ${
        selected ? 'bg-[#95DEE6] shadow-[var(--gm-shadow-hero)]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] hover:bg-[var(--gm-badge)]'
      }`}
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

// A habit row that checks itself and pays out — the Game Mode loop in 2 seconds.
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

function Splash({ mode }) {
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
            Game on.
          </motion.h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-['JetBrains_Mono'] font-bold uppercase text-xs tracking-[0.08em] text-[#2A3B0B]/70 mt-4"
          >
            Rookie · Level 1 · 0 XP
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
