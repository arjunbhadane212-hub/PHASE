import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useMode } from '../contexts/ModeContext';
import TierEmblem from '../components/TierEmblem';
import { tierInfo } from '../data/leaderboardTiers';

const SEEN_KEY = 'phase_lb_result_seen';

// Shown once, the next time the app opens after a period closes. The "seen"
// state is tracked client-side per period_id so it never re-shows.
export default function PeriodResultModal() {
  const { isGameMode } = useMode();
  const navigate = useNavigate();
  const [res, setRes] = useState(null);

  useEffect(() => {
    if (!isGameMode) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_period_result');
        if (error || !data || data.status !== 'ok') return;
        let seen = null;
        try { seen = window.localStorage.getItem(SEEN_KEY); } catch { /* ignore */ }
        if (active && String(seen) !== String(data.period_id)) setRes(data);
      } catch { /* non-fatal */ }
    })();
    return () => { active = false; };
  }, [isGameMode]);

  const dismiss = () => {
    if (res) { try { window.localStorage.setItem(SEEN_KEY, String(res.period_id)); } catch { /* ignore */ } }
    setRes(null);
  };

  if (!res) return null;

  const promoted = res.result === 'promoted';
  const demoted = res.result === 'demoted';
  const tier = tierInfo(res.current_tier);
  const headline = promoted ? 'Promoted!' : demoted ? 'Relegated' : 'You held your ground';
  const sub = promoted
    ? `You've climbed into ${res.current_tier_name}.`
    : demoted
      ? `You've dropped to ${res.current_tier_name}.`
      : `You finished in ${res.group_tier_name}.`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10000] flex items-center justify-center px-6"
        style={{ background: 'rgba(6,8,15,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={dismiss}
        data-testid="period-result-modal"
      >
        <motion.div
          className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] overflow-hidden"
          style={{ background: '#14141c' }}
          initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(110% 70% at 50% -10%, ${tier.a}55, transparent 60%)`, opacity: 0.6 }} />
          <div className="relative text-center px-6 pt-8 pb-6">
            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-zinc-500 mb-4">Weekly League · Results</p>
            <div className="mx-auto mb-3" style={{ width: 132 }}>
              <TierEmblem tier={res.current_tier} size={132} />
            </div>
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: "'Satoshi', sans-serif" }}>{headline}</h2>
            <p className="text-sm text-zinc-400 mt-1">{sub}</p>

            <div className="flex items-stretch gap-3 mt-5">
              <Stat label="Final rank" value={`#${res.final_rank ?? '-'}`} />
              <Stat label="XP earned" value={Number(res.period_xp ?? 0).toLocaleString()} />
            </div>

            <button
              onClick={() => { dismiss(); navigate('/dashboard/leaderboard'); }}
              className="mt-6 w-full py-3 rounded-2xl text-sm font-extrabold"
              style={{ background: tier.a, color: '#0a0a0f' }}
              data-testid="period-result-cta"
            >
              {promoted ? 'Enter your new league' : 'View your league'}
            </button>
            <button onClick={dismiss} className="mt-2 w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300">
              Dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] py-3">
      <p className="text-lg font-black text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{label}</p>
    </div>
  );
}
