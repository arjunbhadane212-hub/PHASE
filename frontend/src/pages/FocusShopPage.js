import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Gem, Flame, Shield, Clock, Check, Loader2, Play, Square, Volume2, VolumeX, ArrowLeft, Lock } from '../components/icons';
import BackButton from '../components/BackButton';
import { Palette } from '@phosphor-icons/react/dist/csr/Palette';
import { Waveform } from '@phosphor-icons/react/dist/csr/Waveform';
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning';
import { FirstAidKit } from '@phosphor-icons/react/dist/csr/FirstAidKit';
import { supabase } from '../lib/supabaseClient';
import { AURA_ORDER, getAura, hexA, GRACE_TIERS } from '../data/focusAuras';
import { SOUND_ORDER, getSound, createSoundEngine } from '../data/focusSounds';
import { EASE, SPRING, fadeUp, staggerParent } from '../lib/motion';

// UI v3 — Focus shop rebuilt as the ONE place for everything Focus Mode owns:
//   · "Your setup" — the timer screen + session sound you'll see next session,
//     equipped right here (it used to be buried in Settings).
//   · Browse tiles that open shelves (same zoom-in pattern as the Game shop):
//     Timer screens, Sounds, Upgrades (grace), Essentials (revive + shield).
const PREVIEW_MS = 4500;
const TONE = {
  sky:  { bg: '#9DD3F7', ink: '#0B2E45' },
  pink: { bg: '#F6B3CE', ink: '#4B1530' },
  sun:  { bg: '#FFD25E', ink: '#4A3500' },
  lime: { bg: '#D4F36B', ink: '#2B3A06' },
};
const SHELVES = {
  screens:    { label: 'Timer screens', blurb: 'The full-screen look of every session.', Icon: Palette, t: TONE.sky },
  sounds:     { label: 'Sounds', blurb: 'Quiet ambience that plays while you focus.', Icon: Waveform, t: TONE.pink },
  upgrades:   { label: 'Upgrades', blurb: 'More grace before leaving the tab fails a session.', Icon: Lightning, t: TONE.sun },
  essentials: { label: 'Essentials', blurb: 'Protect and restore your streak.', Icon: FirstAidKit, t: TONE.lime },
};
const ORDER = ['home', 'screens', 'sounds', 'upgrades', 'essentials'];
const CARD = 'rounded-[24px] bg-[color:var(--gm-card)]';

function Price({ value, gems, busy, onClick, label, testId, dark }) {
  const ok = (gems ?? 0) >= value;
  return (
    <motion.button type="button" whileTap={ok ? { scale: 0.95 } : undefined} onClick={onClick} disabled={busy || !ok}
      className={`h-10 px-4 rounded-full font-bold text-[15px] flex items-center gap-1.5 flex-none ${ok
        ? (dark ? 'bg-[#141416] text-white' : 'bg-[color:var(--gm-ink)] text-[color:var(--gm-bg)]')
        : 'bg-[color:var(--gm-badge)] text-[color:var(--gm-muted)] cursor-not-allowed'}`}
      data-testid={testId}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gem className="w-4 h-4" /> {label || value}</>}
    </motion.button>
  );
}

// A tiny "timer screen" mock — reads instantly as what you're buying.
function ScreenMock({ aura, size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className={`relative w-full overflow-hidden flex flex-col items-center justify-center ${big ? 'rounded-[22px] h-44' : 'rounded-[18px] h-28'}`}
      style={{ background: aura.bg, boxShadow: `inset 0 0 0 1px ${hexA(aura.ink, 0.12)}` }}>
      {aura.style === 'glow' && (
        <span className="absolute rounded-full" style={{ width: big ? 120 : 76, height: big ? 120 : 76, boxShadow: `inset 0 0 0 ${big ? 5 : 3}px ${hexA(aura.accent, 0.75)}` }} />
      )}
      <span className="relative font-display tabular-nums" style={{ color: aura.ink, fontSize: big ? 46 : 28, lineHeight: 1 }}>25:00</span>
      <span className="relative text-[12px] font-bold mt-1" style={{ color: aura.muted }}>Deep work</span>
    </div>
  );
}

export default function FocusShopPage() {
  const { user, refreshUser } = useAuth();
  const { gems } = useGame();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('tab');
  const [view, setView] = useState(SHELVES[fromUrl] ? fromUrl : 'home');
  const [dir, setDir] = useState(0);

  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);
  const previewRef = useRef({ engine: null, timer: null });

  const fetchShop = useCallback(async () => {
    try {
      const { data: rows } = await supabase
        .from('shop_items')
        .select('id,key,name,price_gems,max_owned,category')
        .eq('is_active', true)
        .in('category', ['boost', 'focus_boost', 'focus_aura', 'focus_sound']);
      const list = rows || [];
      setItems(list);
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: inv } = await supabase.from('user_inventory').select('shop_item_id, quantity').in('shop_item_id', ids);
        const q = {};
        (inv || []).forEach((r) => { q[r.shop_item_id] = r.quantity; });
        setQty(q);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchShop(); }, [fetchShop]);

  const stopPreview = useCallback(() => {
    const p = previewRef.current;
    clearTimeout(p.timer);
    p.engine?.stop();
    previewRef.current = { engine: null, timer: null };
    setPreviewKey(null);
  }, []);
  useEffect(() => stopPreview, [stopPreview]);
  useEffect(() => { if (view !== 'sounds' && view !== 'home') stopPreview(); }, [view, stopPreview]);

  const togglePreview = (key) => {
    if (previewKey === key) { stopPreview(); return; }
    stopPreview();
    const engine = createSoundEngine(key);
    if (!engine) { toast.error('Audio is not available in this browser'); return; }
    engine.start();
    previewRef.current = { engine, timer: setTimeout(stopPreview, PREVIEW_MS) };
    setPreviewKey(key);
  };

  const go = (id) => {
    if (id === view) return;
    const a = ORDER.indexOf(view); const b = ORDER.indexOf(id);
    setDir(view === 'home' || id === 'home' ? 0 : (b > a ? 1 : -1));
    setView(id);
    setParams(id === 'home' ? {} : { tab: id }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const byKey = (k) => items.find((r) => r.key === k);
  const owned = (item) => (item ? (qty[item.id] ?? 0) : 0);

  const run = async (key, fn, ok) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await Promise.all([refreshUser(), fetchShop()]); }
    catch (e) { toast.error(e?.message || 'Something went wrong'); }
    finally { setBusy(null); }
  };
  const buy = (item, msg) => run(item.key, async () => {
    const { error } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
    if (error) throw error;
  }, msg);
  const equip = (item) => run(`eq-${item.key}`, async () => {
    if (owned(item) <= 0 && (item.price_gems ?? 0) === 0) {
      const { error: e1 } = await supabase.rpc('purchase_shop_item', { p_shop_item_id: item.id });
      if (e1) throw e1;
    }
    const { error } = await supabase.rpc('equip_item', { p_shop_item_id: item.id });
    if (error) throw error;
  }, `${getAura(item.key)?.name || getSound(item.key)?.name || item.name} equipped`);
  const soundOff = () => run('eq-off', async () => {
    const { error } = await supabase.rpc('unequip_item', { p_category: 'focus_sound' });
    if (error) throw error;
  }, 'Session sound off');
  const buyShield = () => run('shield', async () => {
    const { error } = await supabase.rpc('buy_focus_shield');
    if (error) throw error;
  }, 'Streak Shield ready — one missed day covered');

  const equippedAuraKey = user?.equipped_focus_aura || 'focus_aura_cyan_pulse';
  const equippedSoundKey = user?.equipped_focus_sound || null;
  const aura = getAura(equippedAuraKey);
  const sound = equippedSoundKey ? getSound(equippedSoundKey) : null;

  const ownsScreen = (k) => k === 'focus_aura_cyan_pulse' || owned(byKey(k)) > 0 || (byKey(k)?.price_gems ?? 1) === 0;
  const screenCount = AURA_ORDER.filter(ownsScreen).length;
  const soundCount = SOUND_ORDER.filter((k) => owned(byKey(k)) > 0).length;
  const graceItems = items.filter((r) => r.category === 'focus_boost');
  const ownedGrace = new Set(GRACE_TIERS.filter((t) => owned(graceItems.find((r) => r.key === t.key)) > 0).map((t) => t.key));
  const graceNow = [...GRACE_TIERS].reverse().find((t) => ownedGrace.has(t.key));
  const revive = byKey('streak_revive');
  const reviveOwned = owned(revive);
  const reviveMax = revive?.max_owned ?? 3;
  const shields = user?.streak_shields ?? 0;

  const shelfMeta = {
    screens: `${screenCount} of ${AURA_ORDER.length} owned`,
    sounds: `${soundCount} of ${SOUND_ORDER.length} owned`,
    upgrades: graceNow ? `${graceNow.graceMs / 1000}s grace` : '3s grace',
    essentials: `${reviveOwned} revive · ${shields} shield`,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-7 h-7 border-[3px] border-[#9DD3F7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-32 md:pb-10" data-testid="focus-shop-page">
      <div className="mb-2"><BackButton onClick={() => (view === "home" ? navigate("/dashboard") : go("home"))} label="Back" testId="focus-shop-back-home" variant="ghost" className="-ml-2" /></div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-[32px] leading-none text-[color:var(--gm-ink)]">Shop</h1>
          <p className="text-[14px] text-[color:var(--gm-muted)] mt-1.5">Make every session yours</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#9DD3F7] text-[#0B2E45]" data-testid="focus-gem-balance">
          <Gem className="w-5 h-5" />
          <span className="font-display text-[18px] tabular-nums">{(gems ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div key={view} custom={dir}
          initial={{ opacity: 0, x: dir * 30 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } }}
          exit={{ opacity: 0, x: dir * -30, transition: { duration: 0.2 } }}
          className="space-y-6">

          {view === 'home' ? (
            <>
              {/* YOUR SETUP — what the next session looks and sounds like */}
              <section className={`${CARD} p-3`} data-testid="focus-setup">
                <div className="flex items-center justify-between px-2 pt-1 pb-3">
                  <h2 className="font-display text-[20px] text-[color:var(--gm-ink)]">Your setup</h2>
                  <span className="text-[13px] font-semibold text-[color:var(--gm-muted)]">Next session</span>
                </div>
                <ScreenMock aura={aura} size="lg" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={() => go('screens')} className="rounded-[18px] p-3 text-left bg-[color:var(--gm-badge)]" data-testid="setup-screen">
                    <p className="text-[12px] font-semibold text-[color:var(--gm-muted)]">Timer screen</p>
                    <p className="text-[16px] font-bold text-[color:var(--gm-ink)] mt-0.5 truncate">{aura.name}</p>
                    <p className="text-[13px] font-bold text-[color:var(--gm-ink)] mt-2 opacity-70">Change →</p>
                  </button>
                  <button type="button" onClick={() => go('sounds')} className="rounded-[18px] p-3 text-left bg-[color:var(--gm-badge)]" data-testid="setup-sound">
                    <p className="text-[12px] font-semibold text-[color:var(--gm-muted)]">Session sound</p>
                    <p className="text-[16px] font-bold text-[color:var(--gm-ink)] mt-0.5 truncate flex items-center gap-1.5">
                      {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}{sound ? sound.name : 'Off'}
                    </p>
                    <p className="text-[13px] font-bold text-[color:var(--gm-ink)] mt-2 opacity-70">Change →</p>
                  </button>
                </div>
              </section>

              {/* BROWSE */}
              <section>
                <h2 className="font-display text-[22px] text-[color:var(--gm-ink)] mb-3 px-1">Browse</h2>
                <motion.div className="grid grid-cols-2 gap-2.5" variants={staggerParent(0.06, 0.05)} initial="hidden" animate="show">
                  {Object.entries(SHELVES).map(([id, sh]) => (
                    <motion.button key={id} type="button" layoutId={`fshelf-${id}`} variants={fadeUp} onClick={() => go(id)}
                      transition={{ duration: 0.45, ease: EASE }} whileTap={{ scale: 0.96 }}
                      className="rounded-[24px] p-4 text-left flex flex-col gap-6 min-h-[132px]" style={{ background: sh.t.bg, color: sh.t.ink }}
                      data-testid={`focus-browse-${id}`}>
                      <sh.Icon size={30} weight="fill" />
                      <span>
                        <span className="block font-display text-[20px] leading-tight">{sh.label}</span>
                        <span className="block text-[13px] font-semibold opacity-75 mt-0.5">{shelfMeta[id]}</span>
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </section>

              {/* HOW TO EARN */}
              <section className={`${CARD} p-4`}>
                <h3 className="font-display text-[18px] text-[color:var(--gm-ink)] mb-3">How to earn gems</h3>
                {[['Finish a focus session', '+5 / +10 / +20'], ['Streak milestones', '+25 to +1,000']].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between text-[15px] py-1.5">
                    <span className="text-[color:var(--gm-muted)]">{l}</span>
                    <span className="flex items-center gap-1.5 font-bold text-[color:var(--gm-ink)]"><Gem className="w-4 h-4" /> {v}</span>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <>
              {/* Shelf hero — grows out of the tile you tapped */}
              <motion.button type="button" layoutId={`fshelf-${view}`} onClick={() => go('home')} transition={{ duration: 0.45, ease: EASE }}
                className="w-full rounded-[28px] p-5 text-left flex flex-col gap-5" style={{ background: SHELVES[view].t.bg, color: SHELVES[view].t.ink }}
                data-testid="focus-shop-back">
                <span className="inline-flex items-center gap-1.5 text-[14px] font-bold opacity-75"><ArrowLeft className="w-4 h-4" /> Shop</span>
                <span className="flex items-end justify-between gap-3">
                  <span>
                    <span className="block font-display text-[30px] leading-none">{SHELVES[view].label}</span>
                    <span className="block text-[14px] font-semibold mt-2 opacity-75">{SHELVES[view].blurb}</span>
                  </span>
                  {(() => { const I = SHELVES[view].Icon; return <I size={42} weight="fill" />; })()}
                </span>
              </motion.button>

              {/* Shelf switcher */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mt-2">
                {Object.entries(SHELVES).map(([id, sh]) => (
                  <button key={id} type="button" onClick={() => go(id)}
                    className={`relative px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap bg-[color:var(--gm-card)] ${view === id ? 'text-[color:var(--gm-bg)]' : 'text-[color:var(--gm-muted)]'}`}>
                    {view === id && <motion.span layoutId="fshop-pill" className="absolute inset-0 rounded-full bg-[color:var(--gm-ink)]" transition={SPRING} />}
                    <span className="relative">{sh.label}</span>
                  </button>
                ))}
              </div>

              {view === 'screens' && (
                <motion.div className="grid grid-cols-2 gap-2.5" variants={staggerParent(0.06, 0.15)} initial="hidden" animate="show" data-testid="focus-aura-section">
                  {AURA_ORDER.map((key) => {
                    const a = getAura(key);
                    const item = byKey(key);
                    const isOwned = ownsScreen(key);
                    const isOn = key === equippedAuraKey;
                    return (
                      <motion.div key={key} variants={fadeUp} className={`${CARD} p-2.5 ${isOn ? 'ring-2 ring-[color:var(--gm-ink)]' : ''}`} data-testid={`focus-aura-card-${key}`}>
                        <ScreenMock aura={a} />
                        <div className="px-1 pt-2.5 pb-1">
                          <p className="text-[16px] font-bold text-[color:var(--gm-ink)] leading-tight">{a.name}</p>
                          <p className="text-[12px] font-semibold text-[color:var(--gm-muted)]">{a.style === 'glow' ? 'Dark with a ring' : 'Full colour'}</p>
                          <div className="mt-2.5">
                            {isOn ? (
                              <span className="h-10 px-4 rounded-full bg-[#D4F36B] text-[#2B3A06] font-bold text-[15px] inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> In use</span>
                            ) : isOwned && item ? (
                              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => equip(item)} disabled={!!busy}
                                className="h-10 px-4 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] font-bold text-[15px] inline-flex items-center gap-1.5" data-testid={`focus-equip-aura-${key}`}>
                                {busy === `eq-${key}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Use this'}
                              </motion.button>
                            ) : item ? (
                              <Price value={item.price_gems} gems={gems} busy={busy === key} onClick={() => buy(item, `${a.name} unlocked`)} testId={`focus-buy-aura-${key}`} />
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {view === 'sounds' && (
                <motion.div className="space-y-2.5" variants={staggerParent(0.06, 0.15)} initial="hidden" animate="show" data-testid="focus-sound-section">
                  <motion.div variants={fadeUp} className={`${CARD} p-3.5 flex items-center gap-3.5 ${!equippedSoundKey ? 'ring-2 ring-[color:var(--gm-ink)]' : ''}`}>
                    <span className="w-12 h-12 rounded-full bg-[color:var(--gm-badge)] flex items-center justify-center flex-none text-[color:var(--gm-ink)]"><VolumeX className="w-5 h-5" /></span>
                    <div className="flex-1"><p className="text-[16px] font-bold text-[color:var(--gm-ink)]">Silence</p><p className="text-[13px] text-[color:var(--gm-muted)]">No sound during sessions</p></div>
                    {!equippedSoundKey
                      ? <span className="h-10 px-4 rounded-full bg-[#D4F36B] text-[#2B3A06] font-bold text-[15px] inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> In use</span>
                      : <button type="button" onClick={soundOff} className="h-10 px-4 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] font-bold text-[15px]">Use this</button>}
                  </motion.div>
                  {SOUND_ORDER.map((key) => {
                    const snd = getSound(key);
                    const item = byKey(key);
                    if (!snd) return null;
                    const isOwned = owned(item) > 0;
                    const isOn = key === equippedSoundKey;
                    const playing = previewKey === key;
                    return (
                      <motion.div key={key} variants={fadeUp} className={`${CARD} p-3.5 flex items-center gap-3.5 ${isOn ? 'ring-2 ring-[color:var(--gm-ink)]' : ''}`} data-testid={`focus-sound-card-${key}`}>
                        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => togglePreview(key)}
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-none" style={{ background: TONE.pink.bg, color: TONE.pink.ink }}
                          aria-label={playing ? `Stop ${snd.name}` : `Preview ${snd.name}`} data-testid={`focus-sound-preview-${key}`}>
                          {playing ? <Square className="w-4 h-4" variant="solid" /> : <Play className="w-5 h-5" variant="solid" />}
                        </motion.button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[16px] font-bold text-[color:var(--gm-ink)]">{snd.name}</p>
                          <p className="text-[13px] text-[color:var(--gm-muted)] truncate">{playing ? 'Playing preview…' : snd.blurb}</p>
                        </div>
                        {isOn ? (
                          <span className="h-10 px-4 rounded-full bg-[#D4F36B] text-[#2B3A06] font-bold text-[15px] inline-flex items-center gap-1.5 flex-none"><Check className="w-4 h-4" /> In use</span>
                        ) : isOwned && item ? (
                          <button type="button" onClick={() => equip(item)} disabled={!!busy} className="h-10 px-4 rounded-full bg-[color:var(--gm-badge)] text-[color:var(--gm-ink)] font-bold text-[15px] flex-none">
                            {busy === `eq-${key}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Use this'}
                          </button>
                        ) : item ? (
                          <Price value={item.price_gems} gems={gems} busy={busy === key} onClick={() => buy(item, `${snd.name} unlocked`)} testId={`focus-buy-sound-${key}`} />
                        ) : null}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {view === 'upgrades' && (
                <motion.div className="space-y-2.5" variants={staggerParent(0.08, 0.15)} initial="hidden" animate="show" data-testid="focus-item-grace-extender">
                  {[{ key: 'base', name: 'Standard', graceMs: 3000 }, ...GRACE_TIERS].map((t, i, arr) => {
                    const have = t.key === 'base' || ownedGrace.has(t.key);
                    const item = graceItems.find((r) => r.key === t.key);
                    const prevHave = i === 0 || arr[i - 1].key === 'base' || ownedGrace.has(arr[i - 1].key);
                    const active = graceNow ? graceNow.key === t.key : t.key === 'base';
                    return (
                      <motion.div key={t.key} variants={fadeUp} className={`${CARD} p-4 flex items-center gap-4 ${active ? 'ring-2 ring-[color:var(--gm-ink)]' : ''}`} data-testid={`focus-grace-tier-${t.key}`}>
                        <span className="w-14 h-14 rounded-full flex flex-col items-center justify-center flex-none" style={{ background: have ? TONE.sun.bg : 'var(--gm-badge)', color: have ? TONE.sun.ink : 'var(--gm-muted)' }}>
                          <span className="font-display text-[20px] leading-none">{t.graceMs / 1000}s</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[17px] font-bold text-[color:var(--gm-ink)]">{t.name}</p>
                          <p className="text-[13px] text-[color:var(--gm-muted)]">Leave the tab up to {t.graceMs / 1000}s without failing</p>
                        </div>
                        {active ? <span className="text-[14px] font-bold text-[color:var(--gm-ink)] flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
                          : have ? <span className="text-[14px] font-bold text-[color:var(--gm-muted)]">Owned</span>
                          : !prevHave ? <span className="text-[13px] font-semibold text-[color:var(--gm-muted)] flex items-center gap-1"><Lock className="w-4 h-4" /> Next</span>
                          : item ? <Price value={item.price_gems} gems={gems} busy={busy === item.key} onClick={() => buy(item, `${t.name} unlocked`)} testId={`focus-buy-${t.key}`} /> : null}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {view === 'essentials' && (
                <motion.div className="space-y-2.5" variants={staggerParent(0.08, 0.15)} initial="hidden" animate="show">
                  {revive && (
                    <motion.div variants={fadeUp} className={`${CARD} p-4 flex items-center gap-4`} data-testid="focus-item-streak_revive">
                      <span className="w-14 h-14 rounded-full flex items-center justify-center flex-none" style={{ background: TONE.lime.bg, color: TONE.lime.ink }}><Flame className="w-7 h-7" variant="solid" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-bold text-[color:var(--gm-ink)]">Streak Revive</p>
                        <p className="text-[13px] text-[color:var(--gm-muted)]">Brings back a broken streak · {reviveOwned}/{reviveMax} owned</p>
                      </div>
                      {reviveOwned >= reviveMax ? <span className="text-[14px] font-bold text-[color:var(--gm-muted)]">Max</span>
                        : <Price value={revive.price_gems ?? 200} gems={gems} busy={busy === revive.key} onClick={() => buy(revive, 'Streak Revive purchased')} testId="focus-buy-streak_revive" />}
                    </motion.div>
                  )}
                  <motion.div variants={fadeUp} className={`${CARD} p-4 flex items-center gap-4`} data-testid="focus-shield-item">
                    <span className="w-14 h-14 rounded-full flex items-center justify-center flex-none" style={{ background: TONE.sky.bg, color: TONE.sky.ink }}><Shield className="w-7 h-7" variant="solid" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-bold text-[color:var(--gm-ink)]">Streak Shield</p>
                      <p className="text-[13px] text-[color:var(--gm-muted)]">Covers one missed day · {shields} ready</p>
                    </div>
                    <Price value={500} gems={gems} busy={busy === 'shield'} onClick={buyShield} testId="focus-buy-shield" />
                  </motion.div>
                  <motion.div variants={fadeUp} className="flex items-center gap-2 px-2 pt-1 text-[13px] text-[color:var(--gm-muted)]">
                    <Clock className="w-4 h-4" /> Shields are used automatically on a missed day.
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
