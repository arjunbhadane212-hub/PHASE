import { motion, AnimatePresence } from 'framer-motion';
import { eyebrow, optionFor, MODES } from './data';

// The live "Your plan" panel (desktop). It starts empty and fills in as the
// visitor answers, so every question visibly changes something. That is the
// point: a plan you watched yourself build is one you're more likely to keep.

const INK = '#183A3F';
const CYAN = '#95DEE6';
const MID = '#3E6C71';
const DIM = '#76B5BC';

function Row({ label, value, sub }) {
  const filled = !!value;
  return (
    <div className="rounded-[16px] px-4 py-3 transition-colors" style={{ background: filled ? INK : 'rgba(24,58,63,0.10)' }}>
      <div className={eyebrow} style={{ color: filled ? DIM : MID }}>{label}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value || 'empty'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="font-['Archivo'] font-black text-[18px] leading-tight mt-1"
          style={{ color: filled ? CYAN : MID, opacity: filled ? 1 : 0.5 }}
        >
          {value || 'Not chosen yet'}
        </motion.div>
      </AnimatePresence>
      {filled && sub && <div className="text-[12px] font-medium mt-1 leading-snug" style={{ color: '#C7F0F5', opacity: 0.85 }}>{sub}</div>}
    </div>
  );
}

export default function PlanPanel({ answers, mode, habitCount }) {
  const goal = optionFor('main_goal', answers.main_goal);
  const wall = optionFor('consistency_level', answers.consistency_level);
  const win = optionFor('main_outcome', answers.main_outcome);
  const fuel = optionFor('accountability_style', answers.accountability_style);
  const modeLabel = MODES.find((m) => m.id === mode)?.label;

  const done = [goal, wall, win, fuel, mode, habitCount > 0].filter(Boolean).length;

  return (
    <div className="h-full rounded-[28px] bg-[#95DEE6] p-7 flex flex-col overflow-y-auto" data-testid="plan-panel">
      <div className="flex items-center justify-between">
        <span className={eyebrow} style={{ color: MID }}>Your plan</span>
        <span className={eyebrow} style={{ color: MID }}>{done} of 6</span>
      </div>
      <div className="font-['Archivo'] font-black text-[40px] leading-[0.92] tracking-[-0.02em] mt-3 mb-5" style={{ color: INK }}>
        {done === 6 ? 'Locked in.' : 'Built around you.'}
      </div>

      <div className="space-y-2">
        <Row label="You want to fix" value={goal?.label} />
        <Row label="Where it breaks" value={wall?.label} sub={wall?.fix && `Phase's answer: ${wall.fix}`} />
        <Row label="6 months from now" value={win?.label} />
        <Row label="What keeps you going" value={fuel?.label} sub={fuel?.fix} />
        <Row label="How you play" value={modeLabel} />
        <Row label="First habits" value={habitCount > 0 ? `${habitCount} picked for you` : null} />
      </div>

      <p className="mt-auto pt-5 text-[12px] font-medium leading-snug" style={{ color: MID }}>
        University College London found a new habit takes about 66 days to feel automatic. Your plan is built to get you there.
      </p>
    </div>
  );
}
