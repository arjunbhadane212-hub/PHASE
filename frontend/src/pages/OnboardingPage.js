import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2 } from '../components/icons';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { PhaseMark } from '../components/brand/PhaseMark';
import { PAYWALL_ENABLED, startCheckout } from '../lib/billing';
import { QUESTIONS, MODES, HABITS, XP, GEMS, SLOT_LABEL, eyebrow, optionFor } from '../components/onboarding/data';
import PlanPanel from '../components/onboarding/PlanPanel';
import Paywall from '../components/onboarding/Paywall';
import { ModeCard, Splash } from '../components/onboarding/ModeParts';

// Onboarding, in order:
//   intro -> 4 questions -> mode -> first habits -> your plan + Pro offer
// Everything the visitor chose is written once, at the very end (users row +
// their starter habits), whichever button they press on the last screen. That
// keeps "Back" free of side effects and means no half-finished state in the DB.

const MODE_STEP = QUESTIONS.length;      // 4
const HABIT_STEP = MODE_STEP + 1;        // 5
const PAY_STEP = HABIT_STEP + 1;         // 6

const PrimaryBtn = ({ children, className = '', ...p }) => (
  <button
    {...p}
    className={`w-full h-[54px] rounded-full bg-[#95DEE6] text-[#183A3F] text-[15px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  // -1 = intro, 0..3 = questions, 4 = mode, 5 = habits, 6 = plan + Pro offer
  const [currentStep, setCurrentStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [selectedMode, setSelectedMode] = useState(null);
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const savingRef = useRef(false);
  const advanceRef = useRef(null);

  const hasPaywall = PAYWALL_ENABLED && !user?.is_pro;
  const total = hasPaywall ? PAY_STEP + 1 : PAY_STEP;
  const question = QUESTIONS[currentStep];
  const isMode = currentStep === MODE_STEP;
  const isHabits = currentStep === HABIT_STEP;
  const isPay = currentStep === PAY_STEP;

  const goalKey = answers.main_goal;
  const habitList = HABITS[goalKey] || [];
  const chosenHabits = habitList.filter((h) => picked.includes(h.name));

  // Pre-select the first three starter habits whenever the goal changes.
  useEffect(() => {
    if (goalKey) setPicked((HABITS[goalKey] || []).slice(0, 3).map((h) => h.name));
  }, [goalKey]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  const go = (step) => {
    clearTimeout(advanceRef.current);
    setCurrentStep(step);
  };

  const handleSelect = (option) => {
    setAnswers((a) => ({ ...a, [question.id]: option.id }));
    // Options that carry a "fix" show it for a beat before moving on.
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => setCurrentStep((s) => s + 1), option.fix ? 1100 : 320);
  };

  const togglePick = (name) => {
    setPicked((p) => {
      if (p.includes(name)) return p.filter((n) => n !== name);
      if (p.length >= 5) {
        toast.message('Five is plenty to start. Swap one out instead.');
        return p;
      }
      return [...p, name];
    });
  };

  // Writes the profile answers + starter habits, then either hands off to
  // Stripe Checkout (planId set) or plays the splash and enters the app.
  const finish = async (planId) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    const payload = {
      app_mode: selectedMode,
      onboarding_completed: true,
      main_goal: answers.main_goal ?? null,
      consistency_level: answers.consistency_level ?? null,
      main_outcome: answers.main_outcome ?? null,
      accountability_style: answers.accountability_style ?? null,
    };
    try {
      const { error } = await supabase.from('users').update(payload).eq('id', user.id);
      if (error) throw error;
      if (chosenHabits.length > 0) {
        const { error: hErr } = await supabase.from('habits').insert(
          chosenHabits.map((h) => ({
            user_id: user.id,
            habit_name: h.name,
            description: null,
            time_of_day: h.slot,
            difficulty: h.difficulty,
            xp_value: XP[h.difficulty],
            gem_value: GEMS[h.difficulty],
            repeat_schedule: 'daily',
            session_duration: h.mins,
          })),
        );
        if (hErr) throw hErr;
      }
    } catch (e) {
      console.error('Failed to save onboarding', e);
      toast.error('Could not save your plan. Please try again.');
      savingRef.current = false;
      setSaving(false);
      return;
    }

    if (planId) {
      try {
        const r = await startCheckout(planId);
        if (r.redirected) return; // the browser is leaving for Stripe
      } catch (e) {
        if (e.code === 'payments_not_configured') {
          toast.message("Payments aren't switched on yet, so you're starting on Free.");
        } else {
          toast.error("Couldn't open checkout. You can upgrade any time in Settings.");
        }
      }
    }

    setSaving(false);
    setShowSplash(true);
    setTimeout(() => {
      updateUser(payload);
      navigate('/dashboard', { replace: true });
    }, 1900);
  };

  if (showSplash) return <Splash mode={selectedMode} name={user?.first_name} />;

  const maxW = isPay ? 'max-w-5xl' : isMode ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="min-h-screen bg-[var(--gm-bg)] flex" data-testid="onboarding-page">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: back, segmented progress, step count */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-7">
          <div className={`${isPay ? 'max-w-5xl' : 'max-w-xl'} mx-auto flex items-center gap-4`}>
            {currentStep >= 0 ? (
              <button
                onClick={() => go(currentStep - 1)}
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
              {Array.from({ length: total }).map((_, i) => (
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
              {currentStep >= 0 ? `${currentStep + 1}/${total}` : ''}
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
          <div className={`w-full ${maxW}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {currentStep === -1 && <Intro name={user?.first_name} onStart={() => go(0)} />}

                {question && (
                  <>
                    <span className={`${eyebrow} text-[var(--gm-muted)]`}>Question {currentStep + 1} of {QUESTIONS.length}</span>
                    <h2
                      className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3"
                      data-testid="onboarding-question"
                    >
                      {question.prompt}
                    </h2>
                    <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-3 mb-7">{question.sub}</p>
                    <div className="space-y-2.5">
                      {question.options.map((option) => (
                        <OptionRow
                          key={option.id}
                          option={option}
                          selected={answers[question.id] === option.id}
                          onClick={() => handleSelect(option)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {isMode && (
                  <>
                    <span className={`${eyebrow} text-[var(--gm-muted)]`}>How you play</span>
                    <h2
                      className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3 mb-2"
                      data-testid="onboarding-question"
                    >
                      Pick your style.
                    </h2>
                    <p className="text-[15px] font-medium text-[var(--gm-muted)] mb-7">Same habits and streak either way. Switch any time in Settings.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {MODES.map((m) => (
                        <ModeCard key={m.id} mode={m} selected={selectedMode === m.id} onClick={() => setSelectedMode(m.id)} />
                      ))}
                    </div>
                    <PrimaryBtn onClick={() => go(HABIT_STEP)} disabled={!selectedMode} className="mt-6" data-testid="onboarding-start-btn">
                      {selectedMode ? 'Continue' : 'Pick a mode'}
                      {selectedMode && <ArrowRight className="w-4 h-4" />}
                    </PrimaryBtn>
                  </>
                )}

                {isHabits && (
                  <>
                    <span className={`${eyebrow} text-[var(--gm-muted)]`}>Your first habits</span>
                    <h2
                      className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[30px] sm:text-[38px] leading-[0.98] tracking-[-0.02em] mt-3"
                      data-testid="onboarding-question"
                    >
                      Start with these.
                    </h2>
                    <p className="text-[15px] font-medium text-[var(--gm-muted)] mt-3 mb-6">
                      Picked for "{optionFor('main_goal', goalKey)?.label?.toLowerCase()}". Tap to swap. Three is plenty to start.
                    </p>
                    <div className="space-y-2">
                      {habitList.map((h) => (
                        <HabitPick key={h.name} habit={h} mode={selectedMode} selected={picked.includes(h.name)} onClick={() => togglePick(h.name)} />
                      ))}
                    </div>
                    <p className={`${eyebrow} text-[var(--gm-muted)] mt-4 text-center`}>
                      {picked.length} picked · you can add or change habits any time
                    </p>
                    <PrimaryBtn
                      onClick={() => (hasPaywall ? go(PAY_STEP) : finish(null))}
                      disabled={picked.length === 0 || saving}
                      className="mt-4"
                      data-testid="onboarding-habits-continue"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{hasPaywall ? 'See my plan' : 'Start Phase'} <ArrowRight className="w-4 h-4" /></>}
                    </PrimaryBtn>
                  </>
                )}

                {isPay && (
                  <Paywall
                    name={user?.first_name}
                    answers={answers}
                    mode={selectedMode}
                    habits={chosenHabits}
                    saving={saving}
                    onPro={(planId) => finish(planId)}
                    onFree={() => finish(null)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Live plan: fills in as they answer. Desktop only, and out of the way
          on the offer screen where the plan is read back in full. */}
      {!isPay && (
        <aside className="hidden xl:block w-[420px] flex-shrink-0 p-4 sticky top-0 h-screen">
          <PlanPanel answers={answers} mode={selectedMode} habitCount={currentStep >= HABIT_STEP ? chosenHabits.length : 0} />
        </aside>
      )}
    </div>
  );
}

function Intro({ name, onStart }) {
  return (
    <div>
      <span className={`${eyebrow} text-[var(--gm-muted)]`}>Welcome to Phase</span>
      <h1 className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[44px] sm:text-[60px] leading-[0.9] tracking-[-0.02em] mt-3">
        {name ? <>Hey {name}.<br /></> : null}Let's build your plan.
      </h1>
      <p className="text-base sm:text-lg font-medium text-[var(--gm-muted)] mt-5 max-w-md">
        Answer four questions and we'll set up your first habits, your mode and a plan for getting past the point where you usually quit. About a minute.
      </p>
      <div className="mt-8 space-y-2.5 max-w-md">
        {[
          ['1', 'Four honest questions', 'So Phase knows what actually stops you'],
          ['2', 'Habits picked for you', 'Ready the moment you land in the app'],
          ['3', 'A plan you can keep', 'Free to start. No card needed.'],
        ].map(([n, t, s]) => (
          <div key={n} className="flex items-center gap-4 rounded-2xl bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-4">
            <span className="w-9 h-9 rounded-full bg-[#95DEE6] text-[#183A3F] font-['Archivo'] font-black text-sm flex items-center justify-center flex-shrink-0">{n}</span>
            <div>
              <div className="text-[15px] font-bold text-[var(--gm-ink)]">{t}</div>
              <div className="text-[13px] font-medium text-[var(--gm-muted)]">{s}</div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onStart}
        className="mt-8 h-[54px] px-8 rounded-full bg-[#95DEE6] text-[#183A3F] text-[15px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 transition flex items-center gap-2"
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
        {/* Once chosen, a row that has a "fix" tells them what Phase does about it. */}
        <p className={`text-[13px] font-medium ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>
          {selected && option.fix ? <><span className="font-bold">Phase's answer:</span> {option.fix}</> : option.desc}
        </p>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#183A3F]' : 'border-2 border-[var(--gm-checkbox)]'}`}>
        {selected && <Check className="w-3.5 h-3.5 text-[#95DEE6]" strokeWidth={3} />}
      </div>
    </motion.button>
  );
}

function HabitPick({ habit, mode, selected, onClick }) {
  const meta = mode === 'focus' ? `${habit.mins} min` : `+${XP[habit.difficulty]} XP`;
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-colors ${
        selected ? 'bg-[#95DEE6] shadow-[var(--gm-shadow-hero)]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] hover:bg-[var(--gm-badge)]'
      }`}
      aria-pressed={selected}
      data-testid={`onboarding-habit-${habit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    >
      <span className={`w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#183A3F]' : 'border-2 border-[var(--gm-checkbox)]'}`}>
        {selected && <Check className="w-4 h-4 text-[#95DEE6]" strokeWidth={3} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-bold truncate ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>{habit.name}</p>
        <p className={`${eyebrow} text-[10px] mt-0.5 ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>{SLOT_LABEL[habit.slot]}</p>
      </div>
      <span className={`font-['JetBrains_Mono'] text-[11px] font-bold flex-shrink-0 ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-muted)]'}`}>{meta}</span>
    </motion.button>
  );
}
