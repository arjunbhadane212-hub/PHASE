class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  getContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playTone(freq, startTime, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) { /* silent */ }
  }

  // Short, satisfying click-pop for habit completion
  habitComplete() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playTone(800, now, 0.06, 'sine', 0.12);
    this.playTone(1200, now + 0.05, 0.08, 'sine', 0.1);
  }

  // Gentle ascending chime for level up
  levelUp() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playTone(523, now, 0.15, 'sine', 0.1);
    this.playTone(659, now + 0.12, 0.15, 'sine', 0.1);
    this.playTone(784, now + 0.24, 0.15, 'sine', 0.1);
    this.playTone(1047, now + 0.4, 0.25, 'sine', 0.12);
  }

  // Soft bell for purchase
  purchase() {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playTone(1047, now, 0.1, 'sine', 0.08);
    this.playTone(784, now + 0.08, 0.15, 'sine', 0.06);
  }

  // Low rising pitch during box buildup (placeholder — final SFX user-provided)
  boxRise() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.7);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      // Low-pass filter to take the edge off
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.7);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch { /* silent */ }
  }

  // Sharp transient when the box cracks
  boxCrack() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      // Noise burst
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.value = 1.2;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      // Add a sub-thump
      this.playTone(80, now, 0.15, 'sine', 0.18);
    } catch { /* silent */ }
  }

  // Bright triadic shimmer specifically for Ultra-Rare reveals
  urFlourish() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(1568, now, 0.22, 'triangle', 0.1);
      this.playTone(2093, now + 0.08, 0.25, 'triangle', 0.08);
      this.playTone(2637, now + 0.18, 0.3, 'sine', 0.07);
    } catch { /* silent */ }
  }

  // ---- Box-opening sound design (flat, synthesised; no samples) -------------

  // Impact: sub thump + short noise crack. power 0.5..1.5
  boxHit(power = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, now);
      o.frequency.exponentialRampToValueAtTime(38, now + 0.22);
      g.gain.setValueAtTime(0.32 * power, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.32);
      const len = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1800;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.14 * power, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      src.connect(f); f.connect(ng); ng.connect(ctx.destination);
      src.start(now);
    } catch { /* silent */ }
  }

  // Air whoosh for wipes / shutters
  whoosh(dur = 0.32) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(500, now);
      f.frequency.exponentialRampToValueAtTime(3600, now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.13, now + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(now);
    } catch { /* silent */ }
  }

  // Tension riser into a legendary / mythic hit
  riser(dur = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, now);
      o.frequency.exponentialRampToValueAtTime(880, now + dur);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(300, now);
      f.frequency.exponentialRampToValueAtTime(5000, now + dur);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.04);
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + dur + 0.06);
    } catch { /* silent */ }
  }

  // Two low thumps, like a heartbeat — the mythic cold open
  heartbeat() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;
    this.playTone(58, now, 0.2, 'sine', 0.3);
    this.playTone(52, now + 0.28, 0.26, 'sine', 0.34);
  }

  // The reveal hit. legendary = bright major chord; mythic = sub drop + wide stack
  stinger(tier) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.boxHit(tier === 'mythic' ? 1.5 : 1.15);
      if (tier === 'mythic') {
        this.playTone(41, now, 1.6, 'sine', 0.3);
        [262, 392, 523, 784, 1047].forEach((fq, i) => this.playTone(fq, now + 0.02 + i * 0.015, 1.5, 'triangle', 0.06));
      } else {
        [523, 659, 784, 1047].forEach((fq, i) => this.playTone(fq, now + 0.01 + i * 0.012, 0.9, 'triangle', 0.07));
        this.playTone(65, now, 0.7, 'sine', 0.22);
      }
    } catch { /* silent */ }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundEngine = new SoundEngine();
