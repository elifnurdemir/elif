/*
 * The meadow's sound, made in the browser with no audio files: wind in the grass (as strong as the real wind), crickets
 * around the listener at night and birds by day, rain, thunder after lightning, a soft rising note when a bug is
 * caught and a glassy chime when it lands in the jar. Browsers only allow sound after the visitor's first click or
 * key, so it starts then.
 */

/** what the meadow sounds like now: how much day, rain and snow (0 … 1) and the wind in km/h */
export type SoundEnv = { day: number; rain: number; snow: number; wind: number };

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  private muted: boolean;
  private env: SoundEnv = { day: 0, rain: 0, snow: 0, wind: 8 };
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private brown: AudioBuffer | null = null;

  constructor(muted: boolean) {
    this.muted = muted;
    document.addEventListener("visibilitychange", this.visibility);
  }

  /** call from a user gesture */
  start() {
    if (this.ctx) return void this.ctx.resume();
    const ctx = (this.ctx = new AudioContext());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.brown = this.noise(ctx, true);
    this.wind(ctx, master);
    this.rain(ctx, master);
    this.applyEnv();
    this.timer = window.setInterval(() => {
      this.crickets();
      this.birds();
    }, 250);
    master.gain.setValueAtTime(0, ctx.currentTime);
    if (!this.muted) master.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const g = this.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(muted ? 0 : 1, this.ctx.currentTime + (muted ? 0.3 : 1.2));
  }

  setEnv(env: SoundEnv) {
    this.env = env;
    this.applyEnv();
  }

  private applyEnv() {
    const { ctx, windGain, rainGain, env } = this;
    if (!ctx || !windGain || !rainGain) return;
    const t = ctx.currentTime;
    windGain.gain.setTargetAtTime(0.08 + Math.min(1.4, env.wind / 30) * 0.16, t, 1.5);
    rainGain.gain.setTargetAtTime(env.rain * 0.16, t, 1.5);
  }

  /** thunder, a moment after the lightning: a low rumble that rolls away */
  thunder() {
    const { ctx, master, brown } = this;
    if (!ctx || !master || !brown || this.muted) return;
    const t = ctx.currentTime + 0.4 + Math.random() * 1.8;
    const src = ctx.createBufferSource();
    src.buffer = brown;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.7, t + 0.25);
    for (let i = 1; i < 5; i++) g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.5, t + 0.25 + i * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    src.connect(filter).connect(g).connect(master);
    src.start(t, Math.random() * 2);
    src.stop(t + 5.2);
  }

  dispose() {
    clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.visibility);
    void this.ctx?.close();
  }

  /** the net swung through the air: a short rush of noise, rising and falling */
  swish() {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(ctx, false);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(500, t);
    band.frequency.exponentialRampToValueAtTime(2400, t + 0.16);
    band.frequency.exponentialRampToValueAtTime(700, t + 0.38);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.42);
  }

  /** a bug caught in the net: a soft note sliding up */
  grab() {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  /** a bug in the jar: a small glass chime */
  land() {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = ctx.currentTime;
    const base = [1318.5, 1567.98, 1760, 1975.53][Math.floor(Math.random() * 4)];
    for (const [ratio, vol, delay] of [
      [1, 0.07, 0],
      [2.76, 0.025, 0],
      [1.5, 0.04, 0.07],
    ]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = base * ratio;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol, t + delay + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.4);
      osc.connect(g).connect(master);
      osc.start(t + delay);
      osc.stop(t + delay + 1.5);
    }
  }

  /** bugs let out of the jar: a quick rising run of soft notes */
  release() {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = ctx.currentTime;
    [784, 987.77, 1174.66, 1567.98, 1975.53].forEach((freq, i) => {
      const s = t + i * 0.07;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.045, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.9);
      osc.connect(g).connect(master);
      osc.start(s);
      osc.stop(s + 1);
    });
  }

  private visibility = () => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume());
  };

  /** brown noise through a low-pass filter, swelling and falling in slow gusts */
  /** four seconds of noise to loop: brown (deep, for wind and thunder) or white (for rain) */
  private noise(ctx: AudioContext, brown: boolean) {
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = brown ? last * 3.5 : white * 0.5;
      }
    }
    return buffer;
  }

  private wind(ctx: AudioContext, out: AudioNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.brown;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = (this.windGain = ctx.createGain());
    gain.gain.value = 0.16;
    /* gusts: a slow wave on the volume and on the filter */
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.07;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.09;
    gust.connect(gustDepth).connect(gain.gain);
    const sway = ctx.createOscillator();
    sway.frequency.value = 0.11;
    const swayDepth = ctx.createGain();
    swayDepth.gain.value = 180;
    sway.connect(swayDepth).connect(filter.frequency);
    noise.connect(filter).connect(gain).connect(out);
    noise.start();
    gust.start();
    sway.start();
  }

  /** white noise, filtered to the hiss of rain on grass */
  private rain(ctx: AudioContext, out: AudioNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise(ctx, false);
    noise.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 700;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 5200;
    const gain = (this.rainGain = ctx.createGain());
    gain.gain.value = 0;
    noise.connect(high).connect(low).connect(gain).connect(out);
    noise.start();
  }

  /** by day, now and then a bird somewhere: a short run of quick whistled notes */
  private birds() {
    const { ctx, master, env } = this;
    const loud = env.day * (1 - Math.max(env.rain, env.snow * 0.7));
    if (!ctx || !master || ctx.state !== "running" || loud < 0.05 || Math.random() > 0.1) return;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(master);
    const base = 2300 + Math.random() * 1400;
    const notes = 2 + Math.floor(Math.random() * 5);
    let t = ctx.currentTime + Math.random() * 0.2;
    for (let i = 0; i < notes; i++) {
      const len = 0.07 + Math.random() * 0.08;
      const f = base * (0.85 + Math.random() * 0.4);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * 0.4), t + len * 0.4);
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, t + len);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022 * loud, t + 0.012);
      g.gain.linearRampToValueAtTime(0, t + len);
      osc.connect(g).connect(pan);
      osc.start(t);
      osc.stop(t + len + 0.02);
      t += len + 0.03 + Math.random() * 0.08;
    }
  }

  /* three crickets around the listener, each with its own pitch, rhythm and place */
  private cricketVoices = Array.from({ length: 3 }, (_, i) => ({
    pan: [-0.7, 0.15, 0.8][i],
    pitch: 4100 + Math.random() * 900,
    every: 0.7 + Math.random() * 0.6,
    vol: 0.012 + Math.random() * 0.012,
    next: 0,
    restUntil: 0,
  }));

  /** schedule the chirps due in the next half second */
  private crickets() {
    const { ctx, master } = this;
    if (!ctx || !master || ctx.state !== "running") return;
    const now = ctx.currentTime;
    for (const v of this.cricketVoices) {
      if (v.next < now) v.next = now + Math.random() * v.every;
      while (v.next < now + 0.5) {
        const t = v.next;
        v.next += v.every * (0.9 + Math.random() * 0.2);
        /* now and then a cricket falls quiet for a while */
        if (t < v.restUntil) continue;
        if (Math.random() < 0.04) v.restUntil = t + 3 + Math.random() * 6;
        const quiet = (1 - this.env.day) * (1 - Math.max(this.env.rain, this.env.snow));
        if (quiet > 0.05) this.chirp(ctx, master, t, v.pitch, v.vol * quiet, v.pan);
      }
    }
  }

  /** one chirp: three or four quick pulses of a high tone */
  private chirp(ctx: AudioContext, out: AudioNode, t: number, pitch: number, vol: number, pan: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    osc.frequency.value = pitch;
    p.pan.value = pan;
    g.gain.setValueAtTime(0, t);
    const pulses = 3 + Math.round(Math.random());
    for (let i = 0; i < pulses; i++) {
      const s = t + i * 0.042;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.006);
      g.gain.linearRampToValueAtTime(0, s + 0.024);
    }
    osc.connect(g).connect(p).connect(out);
    osc.start(t);
    osc.stop(t + pulses * 0.042 + 0.05);
  }
}
