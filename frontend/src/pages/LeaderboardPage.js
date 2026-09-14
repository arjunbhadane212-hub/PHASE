import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import TierEmblem from '../components/TierEmblem';
import ProfilePopout, { useProfilePopout } from '../components/profile/ProfilePopout';
import { tierInfo } from '../data/leaderboardTiers';

const PROMO_FLOOR = 150; // mirrors game_config.lb_period_xp_floor
// v2 zone colors: promotion = lime (advance), demotion = destructive red.
const ZONE = { promotion: '#DBF67F', promotionInk: '#2A3B0B', demotion: '#B91C1C' };

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
  const popout = useProfilePopout();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <p className="text-lg font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] mb-1">The League is a Game Mode feature</p>
          <p className="text-sm text-[color:var(--gm-muted)]">Switch to Game Mode to compete in weekly leagues.</p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center pt-24 px-6"><p className="text-[color:var(--gm-muted)]">{error}</p></div>
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
          <p className="text-lg font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] mb-1">Your league starts soon</p>
          <p className="text-sm text-[color:var(--gm-muted)] max-w-xs mx-auto">
            Complete a few habits and you'll be placed in a {tier.key} group with others. Keep earning XP to climb.
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
    const belowFloor = r.zone === 'promotion' && r.period_xp < PROMO_FLOOR;
    const clickable = !!r.username;
    return (
      <motion.button
        layout
        type="button"
        disabled={!clickable}
        onClick={() => clickable && popout.open(r.username)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors bg-[color:var(--gm-card)] ${r.is_me ? 'ring-1 ring-[#95DEE6]' : ''}`}
        style={{
          boxShadow: r.is_me ? 'var(--gm-shadow-cyan)' : 'var(--gm-shadow-card)',
          cursor: clickable ? 'pointer' : 'default',
        }}
        data-testid={`leaderboard-row-${r.rank}`}
      >
        <span className="w-6 text-center font-['JetBrains_Mono'] text-sm font-bold text-[color:var(--gm-muted)] tabular-nums">{r.rank}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-['Archivo'] font-black text-white flex-shrink-0"
          style={{ backgroundColor: r.main_color || 'var(--gm-badge)' }}>
          {initials(r.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-['General_Sans'] font-bold text-[color:var(--gm-ink)] truncate">{r.display_name || 'Phase user'}</p>
            {r.is_me && (
              <span className="text-[9px] font-['JetBrains_Mono'] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#95DEE6', color: '#183A3F' }}>YOU</span>
            )}
          </div>
          {belowFloor && (
            <p className="text-[10px] text-[color:var(--gm-muted)] mt-0.5">needs {PROMO_FLOOR - r.period_xp} more XP to promote</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[15px] font-['JetBrains_Mono'] font-bold text-[color:var(--gm-ink)] tabular-nums">
            {Number(r.period_xp).toLocaleString()}
          </span>
          <span className="text-[10px] text-[color:var(--gm-muted)] font-semibold">XP</span>
          {clickable && <ChevronRight className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />}
        </div>
      </motion.button>
    );
  };

  const ZonePill = ({ kind, label }) => {
    const style = kind === 'promotion'
      ? { background: ZONE.promotion, color: ZONE.promotionInk }
      : kind === 'demotion'
      ? { background: ZONE.demotion, color: '#fff' }
      : { background: 'var(--gm-badge)', color: 'var(--gm-muted)' };
    const Icon = kind === 'promotion' ? ChevronUp : kind === 'demotion' ? ChevronDown : null;
    return (
      <div className="flex items-center mt-5 mb-2 px-1">
        <span className="inline-flex items-center gap-1 font-['JetBrains_Mono'] text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full" style={style}>
          {Icon && <Icon className="w-3 h-3" strokeWidth={2.5} />}{label}
        </span>
      </div>
    );
  };

  return (
    <Shell>
      <ProfilePopout {...popout.props} />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)]" data-testid="leaderboard-hero">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% -20%, ${tier.a}55, transparent 62%)`, opacity: 0.6 }} />
        <div className="relative text-center px-4 pt-6 pb-5">
          <div className="mx-auto mb-1" style={{ width: 112 }}>
            <TierEmblem tier={data.tier} size={112} />
          </div>
          <h1 className="text-2xl font-['Archivo'] font-extrabold" style={{ color: tier.a }}>{tier.key} League</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]">
              Group <span className="font-['JetBrains_Mono'] text-[color:var(--gm-ink)] font-bold tabular-nums">{data.group_index + 1}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]">
              <Users className="w-3 h-3" /> <span className="font-['JetBrains_Mono'] text-[color:var(--gm-ink)] font-bold tabular-nums">{data.member_count}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)]">
              <Clock className="w-3 h-3" /> resets in <span className="font-['JetBrains_Mono'] text-[color:var(--gm-ink)] font-bold tabular-nums">{countdown}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Standings */}
      <div className="mt-2">
        {promo.length > 0 && <ZonePill kind="promotion" label={`Promotion · top ${data.promote_count}`} />}
        <div className="flex flex-col gap-1.5">{promo.map(r => <Row key={r.rank} r={r} />)}</div>

        {hold.length > 0 && <ZonePill kind="holding" label="Holding" />}
        <div className="flex flex-col gap-1.5">{hold.map(r => <Row key={r.rank} r={r} />)}</div>

        {demo.length > 0 && <ZonePill kind="demotion" label={`Demotion · bottom ${data.demote_count}`} />}
        <div className="flex flex-col gap-1.5">{demo.map(r => <Row key={r.rank} r={r} />)}</div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen pb-28 md:pb-10 bg-[color:var(--gm-bg)]" data-testid="leaderboard-page">
      <div className="max-w-xl mx-auto px-4 pt-5">{children}</div>
    </div>
  );
}
