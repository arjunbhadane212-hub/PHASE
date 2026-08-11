import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Lock, Users, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import TierEmblem from '../components/TierEmblem';
import ProfilePopout, { useProfilePopout } from '../components/profile/ProfilePopout';
import { tierInfo, ZONE_COLORS } from '../data/leaderboardTiers';

const PROMO_FLOOR = 150; // must mirror game_config.lb_period_xp_floor

function useCountdown(endsAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setLabel('ending soon'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    };
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, [endsAt]);
  return label;
}

function initials(name) {
  if (!name) return 'PH';
  return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'PH';
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { isGameMode } = useMode();
  const navigate = useNavigate();
  const popout = useProfilePopout();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPro = !!user?.is_pro;

  useEffect(() => {
    if (!isGameMode) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data: res, error: rpcErr } = await supabase.rpc('get_leaderboard');
        if (rpcErr) throw rpcErr;
        if (active) setData(res);
      } catch (e) {
        if (active) setError(e?.message || 'Could not load the leaderboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isGameMode]);

  const countdown = useCountdown(data?.ends_at);
  const tier = useMemo(() => tierInfo(data?.tier ?? user?.leaderboard_tier ?? 1), [data, user]);

  // Focus mode: the league is a Game Mode feature.
  if (!isGameMode) {
    return (
      <Shell>
        <div className="text-center pt-24 px-6">
          <p className="text-lg font-bold text-white mb-1">The League is a Game Mode feature</p>
          <p className="text-sm text-zinc-500">Switch to Game Mode to compete in weekly leagues.</p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center pt-24 px-6">
          <p className="text-zinc-400">{error}</p>
        </div>
      </Shell>
    );
  }

  if (!data || data.status === 'not_in_league') {
    return (
      <Shell>
        <div className="text-center pt-16 px-6" data-testid="leaderboard-empty">
          <div className="mx-auto mb-5" style={{ width: 104 }}>
            <TierEmblem tier={user?.leaderboard_tier ?? 1} size={104} />
          </div>
          <p className="text-lg font-bold text-white mb-1">Your league starts soon</p>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            You'll be placed in a {tier.key} group with 14 others at the start of the next weekly period. Keep earning XP.
          </p>
        </div>
      </Shell>
    );
  }

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const promo = rows.filter(r => r.zone === 'promotion');
  const hold = rows.filter(r => r.zone === 'holding');
  const demo = rows.filter(r => r.zone === 'demotion');

  const Row = ({ r }) => {
    const zoneColor = r.zone === 'promotion' ? ZONE_COLORS.promotion
      : r.zone === 'demotion' ? ZONE_COLORS.demotion : '#ffffff';
    const belowFloor = r.zone === 'promotion' && r.period_xp < PROMO_FLOOR;
    const clickable = !!r.username;
    return (
      <motion.button
        layout
        type="button"
        disabled={!clickable}
        onClick={() => clickable && popout.open(r.username)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors"
        style={{
          background: r.is_me
            ? 'linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03)), #1a1a24'
            : 'rgba(255,255,255,0.03)',
          border: r.is_me ? `1px solid ${tier.a}` : '1px solid rgba(255,255,255,0.06)',
          boxShadow: r.is_me ? `0 0 0 1px ${tier.a}, 0 0 22px -6px ${tier.a}` : 'none',
          cursor: clickable ? 'pointer' : 'default',
        }}
        data-testid={`leaderboard-row-${r.rank}`}
      >
        <span className="w-6 text-center text-sm font-extrabold text-zinc-500 tabular-nums">{r.rank}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
          style={{ backgroundColor: r.main_color || '#374151', boxShadow: `0 0 0 2px ${tier.a}55` }}>
          {initials(r.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white truncate">{r.display_name || 'Phase user'}</p>
            {r.is_me && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ background: tier.a, color: '#0a0a0f' }}>YOU</span>
            )}
          </div>
          {belowFloor && (
            <p className="text-[10px] text-zinc-500 mt-0.5">needs {PROMO_FLOOR - r.period_xp} more XP to promote</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[15px] font-extrabold tabular-nums" style={{ color: zoneColor }}>
            {Number(r.period_xp).toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-600 font-semibold">XP</span>
          {clickable && <ChevronRight className="w-4 h-4 text-zinc-700" strokeWidth={2} />}
        </div>
      </motion.button>
    );
  };

  const ZoneHead = ({ kind, label }) => {
    const color = kind === 'promotion' ? ZONE_COLORS.promotion : kind === 'demotion' ? ZONE_COLORS.demotion : '#4b4e59';
    return (
      <div className="flex items-center gap-2.5 mt-5 mb-2 px-1">
        <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase" style={{ color }}>{label}</span>
        <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}66, transparent)` }} />
      </div>
    );
  };

  return (
    <Shell>
      <ProfilePopout {...popout.props} />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]" style={{ background: '#14141c' }} data-testid="leaderboard-hero">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% -20%, ${tier.a}66, transparent 62%)`, opacity: 0.5 }} />
        <div className="relative text-center px-4 pt-6 pb-5">
          <div className="mx-auto mb-1" style={{ width: 112 }}>
            <TierEmblem tier={data.tier} size={112} />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: tier.a, fontFamily: "'Satoshi', sans-serif" }}>{tier.key} League</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2.5 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              Group <span className="text-white font-bold tabular-nums">{data.group_index + 1}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Users className="w-3 h-3" /> <span className="text-white font-bold tabular-nums">{data.member_count}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Clock className="w-3 h-3" /> resets in <span className="text-white font-bold tabular-nums">{countdown}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Standings (Pro-gated) */}
      <div className="relative mt-2">
        <div style={!isPro ? { filter: 'blur(5px) saturate(0.8)', opacity: 0.55, pointerEvents: 'none', userSelect: 'none' } : undefined}>
          {promo.length > 0 && <ZoneHead kind="promotion" label={`Promotion zone · top ${data.promote_count}`} />}
          <div className="flex flex-col gap-1.5">{promo.map(r => <Row key={r.rank} r={r} />)}</div>

          {hold.length > 0 && <ZoneHead kind="holding" label="Holding" />}
          <div className="flex flex-col gap-1.5">{hold.map(r => <Row key={r.rank} r={r} />)}</div>

          {demo.length > 0 && <ZoneHead kind="demotion" label={`Demotion zone · bottom ${data.demote_count}`} />}
          <div className="flex flex-col gap-1.5">{demo.map(r => <Row key={r.rank} r={r} />)}</div>
        </div>

        {!isPro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
            style={{ background: 'radial-gradient(80% 80% at 50% 40%, rgba(10,14,20,0.55), rgba(10,14,20,0.9))' }}
            data-testid="leaderboard-pro-gate">
            <Lock className="w-7 h-7 text-zinc-400" strokeWidth={2} />
            <div>
              <p className="text-base font-extrabold text-white">See where you really rank</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">Full league standings, promotions and rivals are a Phase Pro feature.</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/shop')}
              className="mt-1 px-5 py-2 rounded-xl text-sm font-extrabold text-white"
              style={{ background: '#3B82F6', boxShadow: '0 0 18px -4px #60A5FA' }}
              data-testid="leaderboard-upsell-cta"
            >
              Unlock with Pro
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen pb-28 md:pb-10" style={{ background: '#0A0E14' }} data-testid="leaderboard-page">
      <div className="max-w-xl mx-auto px-4 pt-5">{children}</div>
    </div>
  );
}
