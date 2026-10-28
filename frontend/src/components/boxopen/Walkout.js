// One walkout per pulled item. Intensity scales with rarity:
//   common     quick wipe, no ceremony
//   rare       colour slam: wipe-in, speed lines, shake, stamped label
//   legendary  blackout -> riser -> HARD-CUT impact -> hero slam -> name wipe, waits for tap
//   mythic     cold open: heartbeat -> a line splits the screen into doors -> colour reveal
//              -> white cut -> slam + confetti + letter-by-letter name, waits for tap
//
// Flat only: solid fills, hard edges, type, cuts. No glow / blur / radial / rings.
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem } from 'lucide-react';
import { soundEngine } from '../../utils/SoundEngine';
import { Hero, tierOf, kindOf, displayName, KIND_LABEL } from './Hero';
import { Marquee, SpeedLines, Shutters, Letterbox, FlashFrames, Confetti, useShake } from './fx';

const FONT_DISPLAY = "'Archivo', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const haptic = (p) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };
const BLACK = '#000000';

// timeline helper: at(ms, fn), all cleared on unmount
function useSchedule() {
  const ids = useRef([]);
  useEffect(() => { const list = ids.current; return () => list.forEach(clearTimeout); }, []);
  return useCallback((ms, fn) => { ids.current.push(setTimeout(fn, ms)); }, []);
}

// number that counts up (refund line)
function CountUp({ to, delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; let start;
    const id = setTimeout(() => {
      const tick = (t) => {
        if (start == null) start = t;
        const p = Math.min((t - start) / 700, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [to, delay]);
  return <>{n}</>;
}

// Per-letter masked slam
function SlamText({ text, color, delay = 0, size = 'clamp(34px, 11vw, 60px)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', overflow: 'hidden', padding: '2px 0' }}>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: '115%' }}
          animate={{ y: '0%' }}
          transition={{ delay: delay + i * 0.035, duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
          style={{ display: 'inline-block', whiteSpace: 'pre', fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

// Tier chip: solid surface + ink, stamped in
function TierChip({ T, delay = 0, calm }) {
  return (
    <motion.div
      initial={{ scale: calm ? 1 : 2.4, opacity: 0, rotate: calm ? 0 : -6 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ delay, duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }}
      style={{ background: T.color, color: T.ink, borderRadius: 999, padding: '7px 16px', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.26em' }}
    >
      {T.label}
    </motion.div>
  );
}

function OwnedLine({ item, T, delay }) {
  return item.duplicate ? (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.25 }}
      style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: T.color, display: 'flex', alignItems: 'center', gap: 6 }}>
      ALREADY OWNED &middot; +<CountUp to={item.refund || 0} delay={delay * 1000} />
      <Gem size={13} strokeWidth={2.4} />
    </motion.div>
  ) : (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.2 }}
      style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.24em', color: '#F4F5F2', opacity: 0.8 }}>
      NEW &middot; {KIND_LABEL[kindOf(item)]}
    </motion.div>
  );
}

// =============================================================================
// COMMON + RARE
// =============================================================================
function LowWalkout({ item, onDone, calm }) {
  const T = tierOf(item.tier);
  const rare = T.level === 1;
  const kind = kindOf(item);
  const at = useSchedule();
  const { controls, shake } = useShake(calm);
  const [wipe, setWipe] = useState(false);
  const [hero, setHero] = useState(false);
  const field = rare ? T.color : '#181B1E';
  const text = rare ? T.ink : '#F4F5F2';

  useEffect(() => {
    const hold = rare ? 1750 : 1050;
    soundEngine.whoosh?.(0.26);
    setWipe(true);
    at(190, () => { setHero(true); soundEngine.boxHit?.(rare ? 1 : 0.55); shake(rare ? 8 : 3); haptic(rare ? [20] : [10]); });
    at(hold, () => { setHero(false); setWipe(false); soundEngine.whoosh?.(0.2); });
    at(hold + 290, onDone);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="walkout" data-tier={item.tier}>
      {/* field */}
      <motion.div
        className="absolute inset-0"
        style={{ background: field, transformOrigin: wipe ? '0% 50%' : '100% 50%' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: wipe ? 1 : 0 }}
        transition={{ duration: 0.22, ease: [0.7, 0, 0.3, 1] }}
      />
      {rare && wipe && <Marquee text="RARE" color={alpha(T.ink, 0.1)} rows={4} />}
      {rare && hero && <SpeedLines color="rgba(255,255,255,0.8)" count={12} />}

      <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6" animate={controls} style={{ zIndex: 30 }}>
        <AnimatePresence>
          {hero && (
            <motion.div key="h" className="flex flex-col items-center gap-5"
              initial={{ scale: rare ? 1.4 : 0.9, y: rare ? 34 : 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ y: -26, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ duration: rare ? 0.2 : 0.22, ease: [0.2, 0.9, 0.2, 1] }}>
              <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.26em', color: rare ? T.ink : T.color }}>
                {KIND_LABEL[kind]}
              </div>
              <Hero item={item} />
              {kind !== 'title' && (
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 26, letterSpacing: '-0.01em', textTransform: 'uppercase', color: text, textAlign: 'center' }}>
                  {displayName(item)}
                </div>
              )}
              {item.duplicate && (
                <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  OWNED &middot; +{item.refund}<Gem size={13} strokeWidth={2.4} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* label stamp (rare) */}
      {rare && hero && (
        <motion.div
          className="absolute"
          style={{ top: '14%', right: '8%', zIndex: 40, background: T.ink, color: T.color, padding: '6px 14px', fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: '0.28em' }}
          initial={{ scale: calm ? 1 : 2.6, opacity: 0, rotate: calm ? -4 : 8 }} animate={{ scale: 1, opacity: 1, rotate: -4 }}
          transition={{ delay: 0.12, duration: 0.16, ease: [0.2, 0.9, 0.2, 1] }}
        >
          RARE
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// LEGENDARY + MYTHIC
// =============================================================================
function HighWalkout({ item, onDone, calm, index, total }) {
  const T = tierOf(item.tier);
  const mythic = T.level === 3;
  const kind = kindOf(item);
  const at = useSchedule();
  const { controls, shake } = useShake(calm);

  const [bars, setBars] = useState(false);
  const [marquee, setMarquee] = useState(false);
  const [line, setLine] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [hero, setHero] = useState(false);
  const [name, setName] = useState(false);
  const [flash, setFlash] = useState(null); // frames[]
  const [canTap, setCanTap] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [fieldColor, setFieldColor] = useState(BLACK);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    soundEngine.whoosh?.(0.3);
    setTimeout(onDone, mythic ? 520 : 460);
  }, [onDone, mythic]);

  useEffect(() => {
    setBars(true);
    if (!mythic) {
      // ---- LEGENDARY ----
      soundEngine.riser?.(0.95);
      at(250, () => setMarquee(true));
      at(1000, () => {
        soundEngine.stinger?.('legendary');
        haptic([40, 30, 90]);
        if (!calm) setFlash([{ color: T.color, ms: 70 }, { color: BLACK, ms: 50 }, { color: T.color, ms: 70 }]);
        setHero(true);
        shake(16);
      });
      at(1350, () => setName(true));
      at(2000, () => setCanTap(true));
    } else {
      // ---- MYTHIC ----
      soundEngine.heartbeat?.();
      haptic([30, 80, 40]);
      at(700, () => { setLine(true); soundEngine.riser?.(0.9); });
      at(1150, () => {
        setDoorsOpen(true); setFieldColor(T.color);
        soundEngine.stinger?.('mythic');
        haptic([60, 40, 160]);
        setHero(true);
        shake(24);
      });
      at(1360, () => {
        setFieldColor(BLACK); setMarquee(true);
        if (!calm) setFlash([{ color: '#F4F5F2', ms: 60 }]);
      });
      at(1560, () => setName(true));
      at(2500, () => setCanTap(true));
    }
    at(9500, finish); // fallback so the sequence never hangs
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => { if (canTap && !leaving) finish(); };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: BLACK }} onClick={tap} data-testid="walkout" data-tier={item.tier}>
      {/* colour field (mythic reveal sits behind the doors) */}
      <div className="absolute inset-0" style={{ background: fieldColor, zIndex: 1 }} />
      {marquee && (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <Marquee text={T.label} color={alpha(T.color, mythic ? 0.16 : 0.14)} rows={mythic ? 5 : 4} />
        </motion.div>
      )}

      {/* mythic: a single hairline, then the doors split */}
      {mythic && (
        <>
          <motion.div
            className="absolute left-1/2 top-0 bottom-0"
            style={{ width: 3, marginLeft: -1.5, background: '#F4F5F2', zIndex: 8, transformOrigin: '50% 0%' }}
            initial={{ scaleY: 0 }} animate={{ scaleY: line && !doorsOpen ? 1 : 0 }}
            transition={{ duration: line && !doorsOpen ? 0.35 : 0.05, ease: 'easeIn' }}
          />
          {['l', 'r'].map((s) => (
            <motion.div key={s} className="absolute top-0 bottom-0" style={{ [s === 'l' ? 'left' : 'right']: 0, width: '50.2%', background: BLACK, zIndex: 7 }}
              initial={{ x: 0 }} animate={{ x: doorsOpen ? (s === 'l' ? '-100%' : '100%') : 0 }}
              transition={{ duration: 0.36, ease: [0.7, 0, 0.3, 1] }} />
          ))}
        </>
      )}

      {hero && <SpeedLines color={T.color} count={mythic ? 22 : 16} />}
      {hero && mythic && <Confetti colors={[T.color, '#95DEE6', '#DBF67F', '#F4F5F2']} count={30} delay={0.05} />}

      {/* content */}
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-6" style={{ zIndex: 30, paddingTop: '12vh', paddingBottom: '12vh', gap: 18 }} animate={controls}>
        {hero && (
          <>
            <div className="flex items-center gap-3">
              <TierChip T={T} delay={0.1} calm={calm} />
            </div>
            <motion.div
              initial={{ scale: calm ? 1 : (mythic ? 1.9 : 1.6), opacity: 0 }}
              animate={{ scale: mythic ? 1.06 : 1, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
            >
              <Hero item={item} scale={mythic ? 1.5 : 1.35} />
            </motion.div>
            {name && kind !== 'title' && <SlamText text={displayName(item)} color="#F4F5F2" />}
            {name && <OwnedLine item={item} T={T} delay={0.25} />}
          </>
        )}
      </motion.div>

      {/* pull counter */}
      {total > 1 && (
        <div className="absolute" style={{ top: '13.5vh', left: 20, zIndex: 80, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.22em', color: alpha('#F4F5F2', 0.6) }}>
          PULL {index + 1}/{total}
        </div>
      )}

      {/* tap prompt: hard blink, no glow */}
      <AnimatePresence>
        {canTap && !leaving && (
          <motion.div className="absolute left-0 right-0 text-center" style={{ bottom: '13.6vh', zIndex: 80, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.3em', color: '#F4F5F2' }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0.25, 1, 1, 0.25] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.5, 0.52, 0.6, 0.98, 1] }}>
            TAP TO CONTINUE
          </motion.div>
        )}
      </AnimatePresence>

      <Letterbox show={bars && !leaving} />
      {flash && <FlashFrames key={flash[0].color + flash.length} frames={flash} onDone={() => setFlash(null)} />}
      {leaving && !mythic && <Shutters color={BLACK} n={6} closed ms={0.24} z={95} />}
      {leaving && mythic && ['l', 'r'].map((s) => (
        <motion.div key={`c${s}`} className="absolute top-0 bottom-0" style={{ [s === 'l' ? 'left' : 'right']: 0, width: '50.2%', background: BLACK, zIndex: 95 }}
          initial={{ x: s === 'l' ? '-100%' : '100%' }} animate={{ x: 0 }} transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }} />
      ))}
    </div>
  );
}

export default function Walkout(props) {
  const T = tierOf(props.item.tier);
  return T.level >= 2 ? <HighWalkout {...props} /> : <LowWalkout {...props} />;
}
