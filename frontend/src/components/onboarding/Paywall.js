import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Lock, ArrowRight } from '../icons';
import { eyebrow, optionFor, PRO_FEATURES, MODES } from './data';
import { PLANS, SAVE_PCT, money } from '../../lib/billing';

// The last step of onboarding: read their plan back to them, then offer Pro.
//
// Rules this screen holds itself to (CLAUDE.md "Hard Rules"):
//   - never a hard paywall: "Continue with Free" is always visible and the same
//     size as the Pro button, with no guilt-trip wording;
//   - no fake scarcity, fake countdowns, fake reviews or made-up user counts;
//   - the price and the renewal terms are stated plainly before any click.

const TIMELINE = [
  { day: 'Day 1', text: 'Your first check-off. The streak starts.' },
  { day: 'Day 7', text: 'One full week of showing up.' },
  { day: 'Day 30', text: 'A real streak. Ranks and titles start to unlock.' },
  { day: 'Day 66', text: 'Automatic. Research puts the average here (UCL, 2010).' },
];

function PlanCard({ plan, selected, onSelect }) {
  const yearly = plan.id === 'yearly';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left rounded-[20px] p-4 sm:p-5 transition-colors ${
        selected ? 'bg-[#95DEE6] shadow-[var(--gm-shadow-hero)]' : 'bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] hover:bg-[var(--gm-badge)]'
      }`}
      aria-pressed={selected}
      data-testid={`onboarding-plan-${plan.id}`}
    >
      {yearly && (
        <span
          className={`${eyebrow} absolute -top-2.5 right-4 rounded-full px-2.5 py-1 text-[10px] ${selected ? 'bg-[#183A3F] text-[#95DEE6]' : 'bg-[#DBF67F] text-[#2A3B0B]'}`}
        >
          Save {SAVE_PCT}%
        </span>
      )}
      <div className="flex items-center gap-3">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#183A3F]' : 'border-2 border-[var(--gm-checkbox)]'}`}
        >
          {selected && <Check className="w-3 h-3 text-[#95DEE6]" strokeWidth={3} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-bold ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>{plan.label}</div>
          <div className={`text-[12px] font-medium mt-0.5 ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>
            {yearly ? `${money(plan.perMonth)} a month · under 14¢ a day` : 'Billed monthly'}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-['Archivo'] font-black text-[26px] leading-none tracking-[-0.02em] ${selected ? 'text-[#183A3F]' : 'text-[var(--gm-ink)]'}`}>
            {money(plan.price)}
          </div>
          <div className={`${eyebrow} text-[9px] mt-1 ${selected ? 'text-[#3E6C71]' : 'text-[var(--gm-muted)]'}`}>per {plan.cadence}</div>
        </div>
      </div>
    </button>
  );
}

export default function Paywall({ name, answers, mode, habits, saving, onPro, onFree }) {
  const [planId, setPlanId] = useState('yearly');
  const plan = PLANS[planId];

  const goal = optionFor('main_goal', answers.main_goal);
  const wall = optionFor('consistency_level', answers.consistency_level);
  const win = optionFor('main_outcome', answers.main_outcome);
  const fuel = optionFor('accountability_style', answers.accountability_style);
  const modeLabel = MODES.find((m) => m.id === mode)?.label;

  const leadFeature = PRO_FEATURES.find((f) => f.fuel === answers.accountability_style);
  const otherFeatures = PRO_FEATURES.filter((f) => f !== leadFeature);

  return (
    <div data-testid="onboarding-paywall">
      <span className={`${eyebrow} text-[var(--gm-muted)]`}>Your plan is ready</span>
      <h2
        className="font-['Archivo'] font-black text-[var(--gm-ink)] text-[34px] sm:text-[48px] leading-[0.94] tracking-[-0.025em] mt-3"
        data-testid="onboarding-question"
      >
        {name ? `${name}, here's how` : "Here's how"} this changes.
      </h2>

      <div className="mt-8 grid lg:grid-cols-2 gap-5 lg:gap-8 items-start">
        {/* ── Left: their plan, read back ───────────────────────────── */}
        <div className="space-y-3">
          <div className="rounded-[24px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-5 sm:p-6 space-y-4">
            {[
              ['You want to fix', goal?.label],
              ['Where it usually breaks', wall?.label, wall?.fix],
              ['6 months from now', win?.label],
            ].map(([label, value, sub]) => value && (
              <div key={label}>
                <div className={`${eyebrow} text-[var(--gm-muted)]`}>{label}</div>
                <div className="font-['Archivo'] font-black text-[20px] leading-tight mt-1 text-[var(--gm-ink)]">{value}</div>
                {sub && <div className="text-[13px] font-medium text-[var(--gm-muted)] mt-1">Phase's answer: {sub}</div>}
              </div>
            ))}
            <div>
              <div className={`${eyebrow} text-[var(--gm-muted)]`}>
                Starting with · {modeLabel}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {habits.map((h) => (
                  <span key={h.name} className="rounded-full bg-[var(--gm-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--gm-ink)]">{h.name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-5 sm:p-6">
            <div className={`${eyebrow} text-[var(--gm-muted)] mb-4`}>The road from here</div>
            <ol className="relative space-y-5">
              <span className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--gm-track)]" aria-hidden="true" />
              {TIMELINE.map((t, i) => (
                <motion.li
                  key={t.day}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.35 }}
                  className="relative flex items-start gap-4"
                >
                  <span
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${i === TIMELINE.length - 1 ? 'bg-[#DBF67F]' : 'bg-[#95DEE6]'}`}
                  >
                    <Check className={`w-4 h-4 ${i === TIMELINE.length - 1 ? 'text-[#2A3B0B]' : 'text-[#183A3F]'}`} strokeWidth={3} />
                  </span>
                  <div className="pt-0.5">
                    <div className={`${eyebrow} text-[10px] text-[var(--gm-muted)]`}>{t.day}</div>
                    <div className="text-[14px] font-bold text-[var(--gm-ink)] mt-0.5">{t.text}</div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Right: the offer ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="rounded-[24px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="font-['Archivo'] font-black text-[22px] text-[var(--gm-ink)]">Phase Pro</span>
              <span className={`${eyebrow} text-[10px] text-[var(--gm-muted)]`}>Optional</span>
            </div>

            <div className="space-y-3">
              <PlanCard plan={PLANS.yearly} selected={planId === 'yearly'} onSelect={() => setPlanId('yearly')} />
              <PlanCard plan={PLANS.monthly} selected={planId === 'monthly'} onSelect={() => setPlanId('monthly')} />
            </div>

            {leadFeature && (
              <div className="mt-4 rounded-[18px] bg-[var(--gm-bg)] p-4">
                <div className={`${eyebrow} text-[10px] text-[#95DEE6]`}>You said: {fuel?.label}</div>
                <div className="font-['Archivo'] font-black text-[18px] leading-tight text-[var(--gm-ink)] mt-1.5">{leadFeature.label}</div>
                <div className="text-[13px] font-medium text-[var(--gm-muted)] mt-1">{leadFeature.lead}</div>
              </div>
            )}

            <ul className="mt-4 space-y-2 px-1">
              {otherFeatures.map((f) => (
                <li key={f.id} className="flex items-center gap-3 text-[14px] font-bold text-[var(--gm-ink)]">
                  <span className="w-5 h-5 rounded-full bg-[#DBF67F] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#2A3B0B]" strokeWidth={3} />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onPro(planId)}
              disabled={saving}
              className="mt-5 w-full h-[56px] rounded-full bg-[#95DEE6] text-[#183A3F] text-[16px] font-bold shadow-[var(--gm-shadow-cyan)] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="onboarding-pro-btn"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Phase Pro · {money(plan.price)}/{plan.cadence} <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button
              type="button"
              onClick={onFree}
              disabled={saving}
              className="mt-2.5 w-full h-[56px] rounded-full bg-[var(--gm-bg)] text-[var(--gm-ink)] text-[15px] font-bold hover:bg-[var(--gm-badge)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="onboarding-free-btn"
            >
              Continue with Free
            </button>

            <p className="mt-4 text-center text-[12px] font-medium text-[var(--gm-muted)] leading-snug">
              Free keeps unlimited habits, Focus Mode, streaks and your public profile. Forever.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 text-[12px] font-bold text-[var(--gm-muted)]">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Secure checkout by Stripe</span>
            <span>Cancel any time</span>
            <span>No ads, ever</span>
          </div>
          <p className="text-center text-[11px] font-medium text-[var(--gm-muted)] px-4 leading-snug">
            Phase Pro renews at {money(plan.price)} every {plan.cadence} until you cancel. You can cancel in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
