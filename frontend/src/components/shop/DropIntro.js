// The restock moment. Plays once per drop (first shop visit after 00:00 UTC):
//   letterbox in → "DROP #012" slams → the rarity tally ticks in, worst to
//   best → (Mondays) the Sanctum bar wipes across → shutters lift onto the shop.
// ~2.6s, tap anywhere to skip. Flat film language only (boxopen/fx.js): hard
// cuts, wipes, shutters, hit-stop — no glow. Timers, not rAF, drive the
// sequence so it still advances in a throttled tab.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Letterbox, Shutters, useShake } from '../boxopen/fx';
import { soundEngine } from '../../utils/SoundEngine';
import { RARITY, RARITY_ORDER, rarityOf } from './shopModel';
import { MONO, usePrefersCalm } from './ShopPieces';

export default function DropIntro({ dropNumber, tiers = {}, count = 0, vaultItem = null, vaultIsNew = false, onDone }) {
  const calm = usePrefersCalm();
  const { controls, shake } = useShake(calm);
  const [step, setStep] = useState(0); // 0 bars · 1 number · 2+ tally · 9 vault · 10 exit
  const done = useRef(false);
  const tally = RARITY_ORDER.filter((t) => tiers[t]);
  const finish = useRef(onDone);
  finish.current = onDone;

  const exit = () => {
    if (done.current) return;
    done.current = true;
    setStep(10);
    soundEngine.slide(0.3);
    setTimeout(() => finish.current?.(), calm ? 0 : 420);
  };

  useEffect(() => {
    const T = [];
    const at = (ms, fn) => T.push(setTimeout(fn, calm ? 0 : ms));
    at(120, () => { setStep(1); soundEngine.boxOpen(); shake(9); });
    tally.forEach((t, i) => at(720 + i * 230, () => {
      setStep(2 + i);
      if (t === 'common') soundEngine.boxTap(i); else soundEngine.reveal(t === 'legendary' ? 'legendary' : 'rare');
    }));
    const afterTally = 720 + tally.length * 230 + 260;
    if (vaultIsNew && vaultItem) {
      at(afterTally, () => { setStep(9); soundEngine.reveal('mythic'); shake(6); });
      at(afterTally + 1150, exit);
    } else {
      at(afterTally + 500, exit);
    }
    return () => T.forEach(clearTimeout);
    // one-shot sequence on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const num = dropNumber != null ? `#${String(dropNumber).padStart(3, '0')}` : 'NEW';

  return (
    <motion.div className="fixed inset-0 z-[120] overflow-hidden select-none" onClick={exit} role="dialog" aria-label={`Drop ${num}`}
      data-testid="drop-intro">
      <motion.div className="absolute inset-0 bg-[color:var(--gm-bg)]" animate={{ opacity: step >= 10 ? 0 : 1 }} transition={{ duration: 0.2, delay: 0.25 }} />
      <Letterbox show={step >= 0 && step < 10} />
      <motion.div animate={controls} className="absolute inset-0 flex flex-col items-center justify-center px-6">
        {step >= 1 && step < 10 && (
          <>
            <motion.p className={`${MONO} text-[13px] font-bold text-[color:var(--gm-muted)]`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              The shop restocked · Drop
            </motion.p>
            <motion.h1 className="font-display font-black text-[color:var(--gm-ink)] tracking-[-0.03em] leading-[0.85] mt-2"
              style={{ fontSize: 'clamp(84px, 26vw, 168px)' }}
              initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}>
              {num}
            </motion.h1>
            <motion.p className="font-sans font-bold text-[color:var(--gm-ink)] mt-3 text-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              {count} new items. Gone in 24 hours.
            </motion.p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-5 min-h-[30px]">
              {tally.map((t, i) => step >= 2 + i && (
                <motion.span key={t} className={`${MONO} text-[13px] font-black px-2.5 py-1.5 rounded-lg`}
                  style={{ background: t === 'common' ? 'var(--gm-card)' : RARITY[t].bg, color: t === 'common' ? 'var(--gm-ink)' : RARITY[t].ink }}
                  initial={{ y: 14, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
                  {tiers[t]} {RARITY[t].label}
                </motion.span>
              ))}
            </div>
          </>
        )}
      </motion.div>
      {/* Monday: the Sanctum opens — one ink bar wipes across */}
      {step === 9 && vaultItem && (
        <motion.div className="absolute left-0 right-0 bottom-[22%] h-16 flex items-center justify-between px-6 origin-left"
          style={{ background: rarityOf('mythic').bg }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.26, ease: [0.7, 0, 0.3, 1] }}>
          <span className={`${MONO} text-[13px] font-black text-[color:var(--gm-bg)]`}>The Sanctum is open</span>
          <span className="font-display font-black text-xl text-[color:var(--gm-bg)] truncate ml-3">{vaultItem.name}</span>
        </motion.div>
      )}
      {step >= 10 && <Shutters color="var(--gm-bg)" n={7} closed={false} ms={0.32} z={130} />}
      <p className={`${MONO} absolute bottom-6 inset-x-0 text-center text-[11px] text-[color:var(--gm-muted)] opacity-60`}>Tap to skip</p>
    </motion.div>
  );
}
