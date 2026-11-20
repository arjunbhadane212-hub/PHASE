import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from './icons';

// UI v3: one-tap "go back" pill used across the app. The user shouldn't have to
// hunt for an X in a corner or walk back through the nav — this sits in the
// top-left corner of every non-root screen and modal and goes one step back.
//
//   to       — explicit destination (string). Falls back to history.
//   onClick  — explicit handler (modal close, shelf-to-home, etc.).
//   label    — visible word next to the arrow; pass "" for icon-only.
//   variant  — 'default' (chip on gm-card), 'ghost' (transparent),
//              'solid' (ink on paper, high-contrast for colored heroes),
//              'float' (fixed-top absolute positioning).
//   testId   — data-testid for the pressable element.
export default function BackButton({
  to, onClick, label = 'Back', variant = 'default', className = '', testId = 'back-btn',
}) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) return onClick();
    if (to) return navigate(to);
    // History fallback: if there's nothing behind us (opened from a shared link)
    // fall into the app root rather than hitting a blank page.
    if (typeof window !== 'undefined' && window.history.length > 1) return navigate(-1);
    navigate('/dashboard');
  };

  const base = 'inline-flex items-center gap-1.5 rounded-full font-bold font-sans transition-colors select-none';
  const sizes = label ? 'h-10 pl-3 pr-4 text-[14px]' : 'w-10 h-10 justify-center';
  const styles = {
    default: 'bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] hover:brightness-95',
    ghost:   'bg-transparent text-[color:var(--gm-ink)] hover:bg-[color:var(--gm-card)]',
    solid:   'bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)] hover:opacity-90',
  }[variant] || 'bg-[color:var(--gm-card)] text-[color:var(--gm-ink)]';

  return (
    <motion.button
      type="button"
      onClick={handle}
      whileTap={{ scale: 0.94 }}
      aria-label={label || 'Back'}
      className={`${base} ${sizes} ${styles} ${className}`}
      data-testid={testId}
    >
      <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2.5} />
      {label && <span>{label}</span>}
    </motion.button>
  );
}
