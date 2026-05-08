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

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundEngine = new SoundEngine();
