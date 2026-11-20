/**
 * Sound for Fútbol callejero, synthesised with the Web Audio API: there are
 * no audio files to load. Browsers only allow sound after a key press or a
 * tap, so nothing plays until `unlock()` has been called from one.
 */
export class StreetAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowd: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(ctx.destination);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;

    // the murmur of the people at the fence: looped noise through a band-pass
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 650;
    band.Q.value = 0.6;
    this.crowd = ctx.createGain();
    this.crowd.gain.value = 0.05;
    source.connect(band).connect(this.crowd).connect(this.master);
    source.start();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  private burst(freq: number, q: number, duration: number, gain: number) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(g).connect(this.master);
    source.start(t, Math.random());
    source.stop(t + duration + 0.02);
  }

  private tone(from: number, to: number, duration: number, gain: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine', delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** boot on ball; `power` 0-1 */
  kick(power: number) {
    this.tone(170 + power * 60, 55, 0.12, 0.5 + power * 0.4);
    this.burst(1800, 0.8, 0.05, 0.25 + power * 0.25);
  }

  /** ball rattling the cage */
  fence() {
    this.burst(3200, 6, 0.16, 0.35);
    this.burst(900, 3, 0.1, 0.2);
  }

  trick() {
    this.tone(520, 980, 0.12, 0.18, 'triangle');
  }

  cano() {
    this.tone(660, 1320, 0.1, 0.22, 'square');
    this.tone(990, 1760, 0.14, 0.2, 'square', 0.09);
    this.cheer(0.5, 0.7);
  }

  crack() {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, f * 1.01, 0.22, 0.2, 'sawtooth', i * 0.07));
  }

  goal() {
    this.tone(1900, 1850, 0.5, 0.16, 'square');
    this.cheer(1, 2.6);
  }

  whistle() {
    this.tone(2100, 2050, 0.7, 0.16, 'square');
  }

  /** the crowd swelling for `seconds` */
  private cheer(amount: number, seconds: number) {
    if (!this.ctx || !this.crowd) return;
    const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t);
    this.crowd.gain.setTargetAtTime(0.05 + amount * 0.5, t, 0.08);
    this.crowd.gain.setTargetAtTime(0.05, t + seconds, 0.6);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
