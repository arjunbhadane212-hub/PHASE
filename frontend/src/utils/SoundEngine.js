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

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundEngine = new SoundEngine();
