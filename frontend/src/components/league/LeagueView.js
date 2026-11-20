import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ChevronRight, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Check, Lock } from '../icons';
import TierEmblem from '../TierEmblem';
import { EASE, fadeUp, staggerParent, reveal } from '../../lib/motion';
import { tierInfo, LEADERBOARD_TIERS } from '../../data/leaderboardTiers';

// Promotion XP floor — mirrors game_config.lb_period_xp_floor. You can hold a
// promotion slot but you don't actually advance until you clear this.
export const PROMO_FLOOR = 150;

// Zone colours (v2): promotion = lime (advance), demotion = destructive red.
const LIME = '#D4F36B';
const LIME_INK = '#2B3A06';
const RED = '#B91C1C';
const CYAN = '#D4F36B';
const CYAN_INK = '#2B3A06';

// Metallic medal tones for the top three ranks.
const MEDALS = { 1: '#FFCF4D', 2: '#C7CBD6', 3: '#C9793F' };

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

// Work out exactly what this player needs to do — the single most engaging
// thing on the page. Returns a flat, bold status band (no glow).
function buildStatus({ me, rows, data, tier, nextTier, prevTier, countdown }) {
  if (!me) return null;
  const n = (x) => Number(x || 0);

  if (me.zone === 'promotion') {
    const short = PROMO_FLOOR - n(me.period_xp);
    if (short > 0) {
      return {
        tone: 'lime',
        Icon: ChevronUp,
        kicker: 'Promotion slot',
        title: `${short.toLocaleString()} XP to lock it in`,
        sub: `You're in a promoting spot but need ${PROMO_FLOOR} XP minimum to actually advance.`,
      };
    }
    return {
      tone: 'lime',
      Icon: ArrowUp,
      kicker: 'Promoting',
      title: nextTier ? `Climbing to ${nextTier.key}` : 'Defending the summit',
      sub: nextTier
        ? `Hold your spot and you move up a league. Resets in ${countdown}.`
        : `You're at the top of the ladder — defend your rank. Resets in ${countdown}.`,
    };
  }

  if (me.zone === 'demotion') {
    const lowestSafe = rows.find(r => r.rank === data.member_count - data.demote_count);
    const need = lowestSafe ? n(lowestSafe.period_xp) - n(me.period_xp) + 1 : null;
    return {
      tone: 'red',
      Icon: ArrowDown,
      kicker: 'Drop zone',
      title: need && need > 0 ? `${need.toLocaleString()} XP to safety` : 'On the edge',
      sub: prevTier
        ? `You'll fall to ${prevTier.key} if you stay here. Earn XP to climb out before reset.`
        : `Earn XP to climb out of the drop zone before reset.`,
    };
  }

  if (!data.promote_count) {
    return {
      tone: 'cyan',
      Icon: Users,
      kicker: 'Waiting for rivals',
      title: 'Your group is still filling up',
      sub: `Keep earning XP — promotion opens once more players join. Resets in ${countdown}.`,
    };
  }

  // Holding — show the carrot: distance into the promotion zone.
  const lastPromo = rows.find(r => r.rank === data.promote_count);
  const need = lastPromo ? n(lastPromo.period_xp) - n(me.period_xp) + 1 : null;
  return {
    tone: 'cyan',
    Icon: ChevronUp,
    kicker: 'Holding',
    title: need && need > 0 ? `${need.toLocaleString()} XP to the promotion zone` : 'Push for promotion',
    sub: nextTier
      ? `Break into the top ${data.promote_count} to climb toward ${nextTier.key}.`
      : `Break into the top ${data.promote_count} to defend the summit.`,
  };
}

function StatusBand({ status }) {
  if (!status) return null;
  const { tone, Icon, kicker, title, sub } = status;
  const styles = {
    lime: { bg: LIME, ink: LIME_INK, subInk: 'rgba(42,59,11,0.72)', badge: 'rgba(42,59,11,0.14)' },
    red: { bg: RED, ink: '#fff', subInk: 'rgba(255,255,255,0.82)', badge: 'rgba(255,255,255,0.18)' },
    cyan: { bg: 'var(--gm-card)', ink: 'var(--gm-ink)', subInk: 'var(--gm-muted)', badge: 'var(--gm-badge)' },
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl px-4 py-3.5 flex items-center gap-3.5"
      style={{ background: styles.bg, boxShadow: 'var(--gm-shadow-card)', outline: styles.ring ? `1.5px solid ${styles.ring}` : 'none', outlineOffset: -1.5 }}
      data-testid="league-status"
    >
      <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 44, height: 44, background: styles.badge }}>
        <Icon className="w-6 h-6" strokeWidth={2.75} style={{ color: styles.ink }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-label text-[13px]" style={{ color: styles.subInk }}>{kicker}</p>
        <p className="font-display font-extrabold text-[20px] leading-tight mt-0.5" style={{ color: styles.ink }}>{title}</p>
        <p className="text-[14px] leading-snug mt-0.5" style={{ color: styles.subInk }}>{sub}</p>
      </div>
    </motion.div>
  );
}

// A bright full-width cutoff line — the iconic "you advance above this" marker.
function CutoffLine({ kind, label }) {
  const color = kind === 'promotion' ? LIME : RED;
  const ink = kind === 'promotion' ? LIME_INK : '#fff';
  const Icon = kind === 'promotion' ? ChevronUp : ChevronDown;
  return (
    <div className="relative flex items-center gap-2 my-2 px-1" data-testid={`cutoff-${kind}`}>
      <span className="inline-flex items-center gap-1 font-label text-[12px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: color, color: ink }}>
        <Icon className="w-3 h-3" strokeWidth={3} />{label}
      </span>
      <span className="flex-1 h-[2px] rounded-full" style={{ background: color, opacity: 0.55 }} />
    </div>
  );
}

export default function LeagueView({ data, user, onOpenProfile }) {
  const countdown = useCountdown(data?.ends_at);
  const tier = useMemo(() => tierInfo(data?.tier ?? user?.leaderboard_tier ?? 1), [data, user]);
  const nextTier = data?.tier < 10 ? LEADERBOARD_TIERS[data.tier] : null;
  const prevTier = data?.tier > 1 ? LEADERBOARD_TIERS[data.tier - 2] : null;

  const rows = useMemo(
    () => (Array.isArray(data?.rows) ? [...data.rows].sort((a, b) => a.rank - b.rank) : []),
    [data]
  );
  const me = rows.find(r => r.is_me);
  const status = useMemo(
    () => buildStatus({ me, rows, data, tier, nextTier, prevTier, countdown }),
    [me, rows, data, tier, nextTier, prevTier, countdown]
  );

  const promoteCount = data?.promote_count ?? 0;
  const demoteCount = data?.demote_count ?? 0;
  const memberCount = data?.member_count ?? rows.length;
  const firstDemoRank = memberCount - demoteCount + 1;

  const Row = ({ r }) => {
    const clickable = !!r.username;
    const medal = MEDALS[r.rank];
    const belowFloor = r.zone === 'promotion' && r.period_xp < PROMO_FLOOR;
    const edge = r.zone === 'promotion' ? LIME : r.zone === 'demotion' ? RED : null;
    return (
      <motion.button
        layout
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onOpenProfile?.(r.username)}
        className={`relative w-full flex items-center gap-3 pl-3.5 pr-3.5 py-3 rounded-[20px] text-left overflow-hidden bg-[color:var(--gm-card)] ${r.is_me ? 'ring-2 ring-[color:var(--gm-ink)]' : ''}`}
        style={{
          boxShadow: r.is_me ? 'var(--gm-shadow-cyan)' : 'var(--gm-shadow-card)',
          background: 'var(--gm-card)',
          cursor: clickable ? 'pointer' : 'default',
        }}
        data-testid={`leaderboard-row-${r.rank}`}
      >
        {edge && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: edge }} />}
        {/* Rank / medal */}
        {medal ? (
          <span className="w-7 h-7 rounded-full flex items-center justify-center font-display text-[15px] font-black flex-shrink-0 tabular-nums" style={{ background: medal, color: '#1a1205' }}>{r.rank}</span>
        ) : (
          <span className="w-7 text-center font-label text-sm font-bold text-[color:var(--gm-muted)] tabular-nums flex-shrink-0">{r.rank}</span>
        )}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-display font-black text-white flex-shrink-0"
          style={{ backgroundColor: r.main_color || 'var(--gm-badge)' }}>
          {initials(r.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[16px] font-sans font-bold text-[color:var(--gm-ink)] truncate">{r.display_name || 'Player'}</p>
            {r.is_me && (
              <span className="text-[11px] font-label font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: CYAN, color: CYAN_INK }}>YOU</span>
            )}
          </div>
          {belowFloor && (
            <p className="text-[12px] text-[color:var(--gm-muted)] mt-0.5">needs {(PROMO_FLOOR - r.period_xp).toLocaleString()} more XP to promote</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[17px] font-label font-bold text-[color:var(--gm-ink)] tabular-nums">{Number(r.period_xp).toLocaleString()}</span>
          <span className="text-[12px] text-[color:var(--gm-muted)] font-semibold">XP</span>
          {clickable && <ChevronRight className="w-4 h-4 text-[color:var(--gm-muted)]" strokeWidth={2} />}
        </div>
      </motion.button>
    );
  };

  const myRank = me?.rank;
  const myXp = Number(me?.period_xp || 0);

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-[32px] leading-none text-[color:var(--gm-ink)]">League</h1>
          <p className="text-[14px] text-[color:var(--gm-muted)] mt-1.5">Earn XP this week to climb</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[color:var(--gm-card)] text-[14px] text-[color:var(--gm-muted)] flex-none" data-testid="league-reset">
          <Clock className="w-4 h-4" /> Resets in <b className="text-[color:var(--gm-ink)] tabular-nums">{countdown}</b>
        </span>
      </div>

      {/* ALL LEAGUES — the whole ladder, top tier first, you highlighted */}
      <div className="rounded-[28px] bg-[color:var(--gm-card)] p-2" data-testid="league-table">
        <div className="flex items-center justify-between px-3 pt-2 pb-2.5">
          <h2 className="font-display text-[20px] text-[color:var(--gm-ink)]">All leagues</h2>
          <span className="text-[13px] font-semibold text-[color:var(--gm-muted)]">You're tier {tier.n} of 10</span>
        </div>
        <motion.div className="flex flex-col gap-1" variants={staggerParent(0.045, 0.1)} initial="hidden" animate="show">
          {[...LEADERBOARD_TIERS].reverse().map((t) => {
            const isMe = t.n === tier.n;
            const passed = t.n < tier.n;
            const isNext = t.n === tier.n + 1;
            const locked = t.n > tier.n;
            if (isMe) {
              return (
                <motion.div key={t.n} variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 18 } } }}
                  className="rounded-[22px] p-3.5 flex items-center gap-3.5" style={{ background: t.a, color: t.ink }} data-testid="league-row-current">
                  <span className="w-[68px] h-[68px] rounded-full flex items-center justify-center flex-none" style={{ background: 'rgba(255,255,255,0.6)' }}>
                    <TierEmblem tier={t.n} size={54} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: `${t.ink}B3` }}>You're here · Tier {t.n}</p>
                    <p className="font-display text-[26px] leading-tight">{t.key}</p>
                    {myRank && (
                      <p className="text-[14px] font-semibold mt-0.5">#{myRank} of {memberCount} · {myXp.toLocaleString()} XP this week</p>
                    )}
                  </div>
                </motion.div>
              );
            }
            return (
              <motion.div key={t.n} variants={fadeUp} className={`rounded-[18px] px-3 py-2 flex items-center gap-3 ${isNext ? 'bg-[color:var(--gm-badge)]' : ''}`} data-testid={`league-row-${t.n}`}>
                <TierEmblem tier={t.n} size={38} locked={locked && !isNext} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[16px] font-bold leading-tight ${locked && !isNext ? 'text-[color:var(--gm-muted)]' : 'text-[color:var(--gm-ink)]'}`}>{t.key}</p>
                  <p className="text-[12px] text-[color:var(--gm-muted)]">Tier {t.n}</p>
                </div>
                {passed && <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[color:var(--gm-muted)]"><Check className="w-4 h-4" /> Passed</span>}
                {isNext && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-bold" style={{ background: LIME, color: LIME_INK }}><ChevronUp className="w-4 h-4" /> Next up</span>}
                {locked && !isNext && <Lock className="w-4 h-4 text-[color:var(--gm-muted)]" />}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* What to do right now */}
      <div className="mt-3">
        <AnimatePresence mode="wait">
          <StatusBand key={status?.tone + status?.title} status={status} />
        </AnimatePresence>
      </div>

      {/* The rules in one glance */}
      <motion.div {...reveal} className="grid grid-cols-3 gap-2 mt-3" data-testid="league-rules">
        <div className="rounded-[20px] p-3" style={{ background: LIME, color: LIME_INK }}>
          <ArrowUp className="w-5 h-5" />
          <p className="font-display text-[22px] leading-none mt-2">{promoteCount ? `Top ${promoteCount}` : 'None yet'}</p>
          <p className="text-[12px] font-semibold mt-1 opacity-75">move up</p>
        </div>
        <div className="rounded-[20px] p-3 bg-[color:var(--gm-card)] text-[color:var(--gm-ink)]">
          <Users className="w-5 h-5" />
          <p className="font-display text-[22px] leading-none mt-2">{memberCount}</p>
          <p className="text-[12px] font-semibold mt-1 text-[color:var(--gm-muted)]">in your group</p>
        </div>
        <div className="rounded-[20px] p-3" style={{ background: demoteCount ? RED : 'var(--gm-card)', color: demoteCount ? '#fff' : 'var(--gm-ink)' }}>
          <ArrowDown className="w-5 h-5" />
          <p className="font-display text-[22px] leading-none mt-2">{demoteCount ? `Last ${demoteCount}` : 'None'}</p>
          <p className="text-[12px] font-semibold mt-1 opacity-75">move down</p>
        </div>
      </motion.div>

      {/* Standings */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-1 mb-2">
          <h2 className="font-display text-[22px] text-[color:var(--gm-ink)]">This week's standings</h2>
          <span className="text-[13px] font-semibold text-[color:var(--gm-muted)]">{memberCount} {memberCount === 1 ? 'player' : 'players'}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <motion.div key={r.rank} className="flex flex-col gap-1.5" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(r.rank, 10) * 0.04 }}>
              <Row r={r} />
              {promoteCount > 0 && r.rank === promoteCount && r.rank < memberCount && (
                <CutoffLine kind="promotion" label={`Above this line move up`} />
              )}
              {demoteCount > 0 && r.rank === firstDemoRank - 1 && (
                <CutoffLine kind="demotion" label={`Below this line move down`} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
