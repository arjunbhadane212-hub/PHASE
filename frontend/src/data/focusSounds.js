// Focus Mode Session Sounds — ambient audio synthesized in the browser with the
// Web Audio API, so there are no audio assets to ship or license. Keyed by
// shop_items.key (category 'focus_sound'); frontend owns the sound, DB owns
// commerce (same split as focusAuras.js).

export const FOCUS_SOUNDS = {
  focus_sound_brown_noise: { key: 'focus_sound_brown_noise', name: 'Brown Noise', blurb: 'Deep, even rumble that masks everything', kind: 'brown' },
  focus_sound_rain:        { key: 'focus_sound_rain',        name: 'Rain',        blurb: 'Steady rainfall with slow swells',     kind: 'rain' },
  focus_sound_deep_space:  { key: 'focus_sound_deep_space',  name: 'Deep Space',  blurb: 'A low, slowly drifting drone',         kind: 'space' },
  focus_sound_cafe:        { key: 'focus_sound_cafe',        name: 'Cafe Hum',    blurb: 'Distant murmur and a warm room tone',  kind: 'cafe' },
};

export const SOUND_ORDER = [
  'focus_sound_brown_noise',
  'focus_sound_rain',
  'focus_sound_deep_space',
  'focus_sound_cafe',
];

export const getSound = (key) => FOCUS_SOUNDS[key] || null;

const FADE_IN_S = 2.5;
const FADE_OUT_S = 0.8;

function noiseBuffer(ctx, type, seconds = 8) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = white;
    }
  }
  return buf;
}

function loopSource(ctx, buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function lfo(ctx, freq, depth, target) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  g.gain.value = depth;
  osc.connect(g).connect(target);
  osc.start();
  return osc;
}

// Each builder wires its nodes into `out` and returns the sources to stop.
const BUILDERS = {
  brown(ctx, out) {
    const src = loopSource(ctx, noiseBuffer(ctx, 'brown'));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    src.connect(lp).connect(out);
    src.start();
    return [src];
  },
  rain(ctx, out) {
    const src = loopSource(ctx, noiseBuffer(ctx, 'white'));
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const swell = ctx.createGain(); swell.gain.value = 0.7;
    src.connect(hp).connect(lp).connect(swell).connect(out);
    src.start();
    const l = lfo(ctx, 0.11, 0.18, swell.gain);
    // A soft low body so it reads as rain on a roof rather than hiss.
    const body = loopSource(ctx, noiseBuffer(ctx, 'brown'));
    const bodyG = ctx.createGain(); bodyG.gain.value = 0.35;
    body.connect(bodyG).connect(out);
    body.start();
    return [src, l, body];
  },
  space(ctx, out) {
    const nodes = [];
    [55, 55.35, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.05 : 0.16;
      o.connect(g).connect(out);
      o.start();
      nodes.push(o);
    });
    const air = loopSource(ctx, noiseBuffer(ctx, 'brown'));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const airG = ctx.createGain(); airG.gain.value = 0.5;
    air.connect(lp).connect(airG).connect(out);
    air.start();
    nodes.push(air, lfo(ctx, 0.05, 120, lp.frequency));
    return nodes;
  },
  cafe(ctx, out) {
    const src = loopSource(ctx, noiseBuffer(ctx, 'white'));
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.55;
    src.connect(bp).connect(g).connect(out);
    src.start();
    const l1 = lfo(ctx, 0.23, 0.2, g.gain);
    const l2 = lfo(ctx, 0.07, 260, bp.frequency);
    const room = loopSource(ctx, noiseBuffer(ctx, 'brown'));
    const rg = ctx.createGain(); rg.gain.value = 0.5;
    room.connect(rg).connect(out);
    room.start();
    return [src, l1, l2, room];
  },
};

// Returns { start, stop, setMuted } or null for an unknown sound. start() must
// run from (or soon after) a user gesture or the browser keeps the context
// suspended; it also retries on the next pointer press.
export function createSoundEngine(soundKey, { volume = 0.5 } = {}) {
  const def = getSound(soundKey);
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!def || !Ctx) return null;

  let ctx = null;
  let master = null;
  let nodes = [];
  let stopped = false;
  let muted = false;

  const resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };

  return {
    start() {
      if (ctx || stopped) return;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      nodes = BUILDERS[def.kind](ctx, master);
      resume();
      master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, FADE_IN_S / 3);
      window.addEventListener('pointerdown', resume);
    },
    setMuted(next) {
      muted = next;
      if (ctx && master) master.gain.setTargetAtTime(next ? 0 : volume, ctx.currentTime, 0.15);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      window.removeEventListener('pointerdown', resume);
      if (!ctx) return;
      const c = ctx;
      master.gain.setTargetAtTime(0, c.currentTime, FADE_OUT_S / 3);
      setTimeout(() => {
        nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
        c.close().catch(() => {});
      }, FADE_OUT_S * 1000 + 200);
    },
  };
}
