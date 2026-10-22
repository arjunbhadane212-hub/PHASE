import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Dumbbell, BookOpen, Brain, Scale, Rocket, Gamepad2, Target, Lock, BarChart3, Bell, Trophy, MessageSquare, Flame, Sparkles, Eye, ArrowLeft, ArrowRight, Check, Gem, Play } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { PhaseMark } from '../components/brand/PhaseMark';

// Option ids are persisted to `users` — change labels freely, never the ids.
const questions = [
  {
    id: 'main_goal',
    prompt: "What are you here to fix?",
    options: [
      { id: 'active', icon: Dumbbell, label: 'Get more active', desc: 'Move your body, every day' },
      { id: 'learn', icon: BookOpen, label: 'Learn & grow', desc: 'Read, study, pick up skills' },
      { id: 'mental', icon: Brain, label: 'Build mental discipline', desc: 'Focus more, procrastinate less' },
      { id: 'balance', icon: Scale, label: 'Balance my life', desc: 'Work, rest and goals, evenly' },
      { id: 'levelup', icon: Rocket, label: 'Level up everything', desc: 'All of the above, at once' },
    ]
  },
  {
    id: 'download_reason',
    prompt: "Why Phase, why now?",
    options: [
      { id: 'fun', icon: Gamepad2, label: 'Make it fun', desc: 'Self-improvement that feels like a game' },
      { id: 'workout', icon: Dumbbell, label: 'Train more', desc: 'Stay on top of fitness goals' },
      { id: 'discipline', icon: Lock, label: 'Hold myself accountable', desc: 'Real habits, no excuses' },
      { id: 'track', icon: BarChart3, label: 'See my progress', desc: "Proof of how far I've come" },
      { id: 'other', icon: MessageSquare, label: 'Something else', desc: 'Tell us in a line' },
    ],
    hasOther: true
  },
  {
    id: 'consistency_level',
    prompt: "Be honest. How consistent are you right now?",
    options: [
      { id: 'fire', icon: Flame, label: "I'm on fire", desc: 'Strong habits, want to push them' },
      { id: 'better', icon: BarChart3, label: 'Getting better', desc: 'Improving, need more structure' },
      { id: 'hitormiss', icon: Target, label: 'Hit or miss', desc: 'Great days, then I fall off' },
      { id: 'starting', icon: Sparkles, label: 'Just starting', desc: 'Staying consistent is hard' },
      { id: 'chaos', icon: Brain, label: 'Total chaos', desc: 'Starting from zero' },
    ]
  },
  {
    id: 'accountability_style',
    prompt: "When you slip, what gets you back?",
    options: [
      { id: 'progress', icon: BarChart3, label: 'Seeing my progress', desc: 'Charts, numbers, streaks' },
      { id: 'competition', icon: Trophy, label: 'Competition', desc: 'Someone ahead of me' },
      { id: 'reminders', icon: Bell, label: 'A nudge', desc: 'Just remind me' },
      { id: 'rewards', icon: Gem, label: 'Rewards', desc: 'Give me something to earn' },
      { id: 'callout', icon: MessageSquare, label: 'Getting called out', desc: 'Roast me a little' },
    ]
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
  const [otherText, setOtherText] = useState('');
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
      download_reason: answers.download_reason ?? null,
      download_reason_other:
        answers.download_reason === 'other' ? (otherText.trim() || null) : null,
      consistency_level: answers.consistency_level ?? null,
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
    if (question.hasOther && optionId === 'other') return; // wait for text
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
                    className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3 mb-7"
                    data-testid="onboarding-question"
                  >
                    {question.prompt}
                  </h2>

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

                  {question.hasOther && answers[question.id] === 'other' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                      <textarea
                        placeholder="Tell us why..."
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value.slice(0, 150))}
                        rows={3}
                        autoFocus
                        className="phase-input w-full rounded-2xl bg-[var(--gm-card)] p-4 text-[15px] font-medium text-[var(--gm-ink)] placeholder:text-[var(--gm-muted)] placeholder:opacity-60 outline-none border-2 border-transparent focus:border-[#95DEE6] resize-none"
                        data-testid="onboarding-other-input"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <span className={`${eyebrow} text-[var(--gm-muted)]`}>{otherText.length}/150</span>
                        <button
                          onClick={() => otherText.trim() && setCurrentStep((s) => s + 1)}
                          disabled={!otherText.trim()}
                          className="h-11 px-5 rounded-full bg-[#95DEE6] text-[#183A3F] text-sm font-bold shadow-[var(--gm-shadow-cyan)] disabled:opacity-40 flex items-center gap-2"
                          data-testid="onboarding-other-submit"
                        >
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
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
