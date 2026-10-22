import { Link } from 'react-router-dom';

// The Phase mark: a crescent on a cyan tile — a literal "phase". Flat v2
// surface + dark ink, no gradient, no glow (memory feedback-no-neon-glow).
export function PhaseMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#95DEE6" />
      <circle cx="16" cy="16" r="9" fill="#183A3F" />
      <circle cx="20.5" cy="13" r="8" fill="#95DEE6" />
    </svg>
  );
}

export default function PhaseWordmark({ size = 28, to = '/', testId }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" data-testid={testId}>
      <PhaseMark size={size} />
      <span
        className="font-['Archivo'] font-black text-[var(--gm-ink)] uppercase"
        style={{ fontSize: Math.round(size * 0.7), letterSpacing: '-0.01em' }}
      >
        Phase
      </span>
    </Link>
  );
}
