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

  // ===========================================================================
  // Box-opening sound design (v7 — clean & warm).
  //
  // The old set was harsh: sawtooth risers, raw white-noise cracks, a buzzy
  // "heartbeat". It is gone. Everything here is sine/triangle with soft
  // envelopes and a lowpass guard, so it reads as warm and premium, never
  // scratchy. Four calls only: boxTap, boxOpen, slide, reveal.
  // ===========================================================================

  // Warm wooden "thock" as the lid is pried. Pitch steps up with each tap.
  boxTap(step = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const base = 150 + step * 46;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, now);
      o.frequency.exponentialRampToValueAtTime(base * 0.58, now + 0.14);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.19);
      // a soft rounded click on top (triangle, quickly gone — no noise burst)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(base * 4.2, now);
      g2.gain.setValueAtTime(0.07, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      o2.connect(g2); g2.connect(ctx.destination);
      o2.start(now); o2.stop(now + 0.06);
    } catch { /* silent */ }
  }

  // The lid blows off: a warm swell, a soft airy lift, a little bell sparkle.
  boxOpen() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, now);
      o.frequency.exponentialRampToValueAtTime(200, now + 0.5);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.64);
      this.slide(0.5);
      [784, 1175].forEach((fq, i) => this.playTone(fq, now + 0.1 + i * 0.07, 0.4, 'triangle', 0.06));
    } catch { /* silent */ }
  }

  // Soft airy swell for a solid panel sliding in (gentle lowpassed air, no hiss).
  slide(dur = 0.34) {
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
      f.type = 'lowpass';
      f.frequency.setValueAtTime(420, now);
      f.frequency.exponentialRampToValueAtTime(1300, now + dur);
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.055, now + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(now);
    } catch { /* silent */ }
  }

  // Per-rarity reveal as the item lands. Warm triangle stacks + a soft sub.
  // Richness scales with tier; all smooth, none harsh.
  reveal(tier = 'common') {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const chord = (notes, vol, spread, dur, sub) => {
        notes.forEach((fq, i) => this.playTone(fq, now + i * spread, dur, 'triangle', vol));
        if (sub) this.playTone(sub, now, dur * 0.9, 'sine', 0.16);
      };
      switch (tier) {
        case 'mythic':
          chord([392, 523, 659, 784, 988, 1319], 0.055, 0.045, 1.5, 65);
          break;
        case 'legendary':
          chord([523, 659, 784, 1047], 0.07, 0.04, 1.0, 98);
          break;
        case 'rare':
          chord([523, 784], 0.08, 0.06, 0.6, 0);
          break;
        default:
          this.playTone(523, now, 0.32, 'sine', 0.07);
          this.playTone(784, now + 0.05, 0.28, 'sine', 0.05);
      }
    } catch { /* silent */ }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundEngine = new SoundEngine();
