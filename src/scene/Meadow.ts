/*
 * The meadow, at the visitor's hour and in their weather: a sky that runs from night through dusk to midday, the sun
 * and moon where they really are, stars and now and then a shooting star, clouds drifting with the wind, rain, snow,
 * fog and lightning, two hills with trees, and grass that sways in the wind and bends away from the pointer.
 *
 * Among the grass fly the bugs: fireflies by night, ladybugs by day. The pointer is a bug net; the bugs shy away from
 * it a little. A click swings it, and the bugs its hoop sweeps over end up in its bag, crawling about. Bring the net to
 * the jar and they drop in, and new ones rise out of the grass to take their place. Everything shifts a little
 * with the pointer, the near things more than the far ones.
 */

import { css, mix, palette, smooth, type Palette, type RGB } from "./sky";
import { PRESETS, type Weather } from "./weather";

const TAU = Math.PI * 2;

/** the sun's altitude and hour angle (degrees), and the weather */
export type Env = { sunAlt: number; hourAngle: number; weather: Weather };

type Blade = { x: number; h: number; w: number; lean: number; bend: number };
type Layer = { blades: Blade[]; depth: number; colors: ["back1" | "mid1" | "front1", "back2" | "mid2" | "front2"]; tallest: number };
type HillShape = { base: number; amp: number; p: number[]; trees: { x: number; y: number; s: number; round: boolean }[] };
type Fly = {
  x: number;
  y: number;
  /** 0.45 (far, small, dim, slow) to 1.25 (near, big, bright, fast) */
  z: number;
  dir: number;
  speed: number;
  phase: number;
  rate: number;
  /** 0 → 1 while a new bug rises out of the grass; it can be caught once mostly there */
  fade: number;
  /** a burst of speed that wears off, for bugs let out of the jar */
  kick: number;
  /** caught: in the net's bag (at a place in the bag), then dropping from the bag (on screen) into the jar, 0 → 1 */
  caught: null | { stage: "net"; dx: number; dy: number } | { stage: "jar"; x: number; y: number; t: number };
};
type Star = { x: number; y: number; r: number; phase: number };
type Meteor = { x: number; y: number; vx: number; vy: number; t: number };
type Cloud = { x: number; y: number; s: number; sprite: number; speed: number };
type Drop = { x: number; y: number; v: number; len: number; r: number; phase: number };

export type MeadowOptions = {
  /** the mouth of the jar, in viewport pixels */
  jar: () => { x: number; y: number } | null;
  /** the net was swung */
  onSwing: () => void;
  /** a bug ended up in the net */
  onGrab: () => void;
  /** how many bugs are in the net now */
  onNet: (count: number) => void;
  /** a bug has landed in the jar */
  onCatch: () => void;
  /** lightning struck (in a storm) */
  onLightning: () => void;
};

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const WHITE: RGB = [255, 255, 255];
/** how close to the middle of the net's hoop a bug has to be to be swept into it, in pixels */
const HOOP = 26;
/** where the end of the net's handle is, from the middle of its hoop: the net swings about it */
const GRIP = { x: 55, y: 66 };
/** how long a swing takes, in seconds */
const SWING = 0.45;

/** how far each thing drifts with the pointer: the sky barely, the front grass most */
const DEPTH = { stars: 0.05, sky: 0.08, clouds: 0.12, far: 0.22, near: 0.38 };

/** the same random numbers every time for the same seed, so a cloud keeps its shape when it is recoloured */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A firefly's light, drawn once and stamped for every bug. */
function glowSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255, 255, 214, 1)");
  grad.addColorStop(0.14, "rgba(222, 245, 120, 0.9)");
  grad.addColorStop(0.42, "rgba(190, 230, 70, 0.14)");
  grad.addColorStop(1, "rgba(190, 230, 70, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/**
 * An overcast sky: an even grey deck, a little darker overhead, with broad soft patches of lighter and heavier cloud
 * lying flat, smaller towards the horizon, where the deck thins out.
 */
function cloudDeck(w: number, h: number, light: RGB, shade: RGB) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w / 2);
  c.height = Math.ceil(h / 2);
  const g = c.getContext("2d")!;
  g.scale(0.5, 0.5);
  const rand = seeded(7);
  const horizon = h * 0.66;
  const blob = (x: number, y: number, rx: number, ry: number, color: RGB, alpha: number) => {
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, css(color, alpha));
    grad.addColorStop(0.6, css(color, alpha * 0.8));
    grad.addColorStop(1, css(color, 0));
    g.fillStyle = grad;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
  };
  const wash = g.createLinearGradient(0, 0, 0, horizon);
  wash.addColorStop(0, css(mix(shade, light, 0.25), 0.7));
  wash.addColorStop(1, css(mix(shade, light, 0.7), 0.4));
  g.fillStyle = wash;
  g.fillRect(0, 0, w, horizon);
  for (let i = 0; i < 160; i++) {
    const y = rand() ** 1.4 * horizon;
    const near = 1 - y / horizon;
    const rx = (60 + rand() * 220) * (0.35 + near * 0.9);
    blob(rand() * w, y, rx, rx * (0.18 + near * 0.14), rand() < 0.5 ? shade : light, 0.12 + rand() * 0.16);
  }
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, 0, horizon + 20);
  fade.addColorStop(0, "rgba(0, 0, 0, 1)");
  fade.addColorStop(0.75, "rgba(0, 0, 0, 0.8)");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
  return c;
}

/** The size each cloud is drawn at, before its scale. */
const CW = 520;
const CH = 260;

/**
 * A cumulus cloud: a flat base, heaped puffs climbing to a dome in the middle, lit from above so the underside stays
 * in shade.
 */
function cloudSprite(seed: number, light: RGB, shade: RGB) {
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = CH;
  const g = c.getContext("2d")!;
  const rand = seeded(seed);
  const base = CH * 0.8;
  const width = CW * (0.55 + rand() * 0.35);
  const left = (CW - width) / 2;
  const puffs = Array.from({ length: 55 + Math.floor(rand() * 25) }, () => {
    const t = rand();
    const dome = Math.sin(Math.PI * t);
    const r = 8 + rand() * 12 + dome * (12 + rand() * 26);
    return { x: left + t * width, y: base - r * 0.7 - rand() * dome * CH * 0.3, r };
  });
  /* the whole cloud in shade first, then the light falling on the top of each puff */
  for (const [color, lift, size] of [
    [shade, 0, 0.94],
    [light, 0.24, 1],
  ] as const)
    for (const p of puffs) {
      const x = p.x - p.r * lift * 0.4;
      const y = p.y - p.r * lift;
      const r = p.r * size;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, css(color, 0.9));
      grad.addColorStop(0.55, css(color, 0.75));
      grad.addColorStop(0.85, css(color, 0.25));
      grad.addColorStop(1, css(color, 0));
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  /* cut the base flat, with a soft edge */
  g.globalCompositeOperation = "destination-out";
  const flat = g.createLinearGradient(0, base - 8, 0, base + 10);
  flat.addColorStop(0, "rgba(0, 0, 0, 0)");
  flat.addColorStop(1, "rgba(0, 0, 0, 1)");
  g.fillStyle = flat;
  g.fillRect(0, base - 8, CW, CH - base + 8);
  return c;
}

function hillShape(w: number, base: number, amp: number, clusters: number, treeSize: number): HillShape {
  const shape: HillShape = { base, amp, p: Array.from({ length: 3 }, () => Math.random() * TAU), trees: [] };
  for (let k = 0; k < clusters; k++) {
    let x = Math.random() * w;
    const n = 3 + Math.floor(Math.random() * 9);
    for (let i = 0; i < n; i++) {
      x += 4 + Math.random() * 9;
      shape.trees.push({ x, y: ridge(shape, x) + 2, s: treeSize * (0.5 + Math.random() * 0.7), round: Math.random() < 0.3 });
    }
  }
  return shape;
}

function ridge(s: HillShape, x: number) {
  return s.base + s.amp * (Math.sin(x * 0.0021 + s.p[0]) * 0.6 + Math.sin(x * 0.0057 + s.p[1]) * 0.3 + Math.sin(x * 0.017 + s.p[2]) * 0.1);
}

/** A hill with its trees and a lit edge, in today's colours, drawn into its own canvas. */
function renderHill(s: HillShape, w: number, h: number, dpr: number, fill: string, rim: string) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, ridge(s, x));
  g.lineTo(w, h);
  g.fillStyle = fill;
  g.fill();
  g.beginPath();
  for (let x = 0; x <= w; x += 6) g.lineTo(x, ridge(s, x));
  g.strokeStyle = rim;
  g.lineWidth = 1.2;
  g.stroke();

  g.fillStyle = fill;
  for (const { x, y, s: size, round } of s.trees) {
    if (round) {
      g.beginPath();
      g.arc(x, y - size * 0.55, size * 0.32, 0, TAU);
      g.fill();
      g.fillRect(x - 0.9, y - size * 0.3, 1.8, size * 0.3);
      continue;
    }
    /* a pine: stacked triangles */
    for (let tier = 0; tier < 3; tier++) {
      const ty = y - size * (0.3 + tier * 0.28);
      const tw = size * (0.32 - tier * 0.07);
      g.beginPath();
      g.moveTo(x - tw, ty + size * 0.3);
      g.lineTo(x, ty - size * 0.25);
      g.lineTo(x + tw, ty + size * 0.3);
      g.fill();
    }
    g.fillRect(x - 0.8, y - size * 0.3, 1.6, size * 0.3);
  }
  return c;
}

export class Meadow {
  private readonly canvas: HTMLCanvasElement;
  private readonly opts: MeadowOptions;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly glow = glowSprite();
  private readonly slow = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private target = 0;
  private env: Env = { sunAlt: -30, hourAngle: 180, weather: PRESETS.clear };
  private pal: Palette = palette(-30, PRESETS.clear);
  private layers: Layer[] = [];
  private hillShapes: HillShape[] = [];
  private hills: HTMLCanvasElement[] = [];
  private cloudSprites: HTMLCanvasElement[] = [];
  private deck: HTMLCanvasElement | null = null;
  private clouds: Cloud[] = [];
  private drops: Drop[] = [];
  private flies: Fly[] = [];
  private stars: Star[] = [];
  private meteor: Meteor | null = null;
  private nextMeteor = 5 + Math.random() * 6;
  private flash = 0;
  private bolt: number[] | null = null;
  private nextFlash = 3 + Math.random() * 4;
  private pointer = { x: 0, y: 0, on: false };
  /** the bug net: where it was last swung (for touch, where it shows for a moment), how far through the swing (1 → 0),
   *  and whether a bug is inside its hoop */
  private net = { x: 0, y: 0, swing: 0, touch: 0, byTouch: false, hover: false };
  private inNet = 0;
  /** off while the visitor reads the sections below the meadow */
  private active = true;
  /** the pointer's place from the middle of the screen (-0.5 … 0.5), eased, for parallax */
  private par = { x: 0, y: 0 };
  private sky: CanvasGradient | null = null;
  private mist: CanvasGradient | null = null;
  private raf = 0;
  private last = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, opts: MeadowOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerleave", this.leave);
    canvas.addEventListener("pointerdown", this.down);
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerleave", this.leave);
    this.canvas.removeEventListener("pointerdown", this.down);
  }

  /** a new hour or new weather: recolour everything and change what falls from the sky */
  setEnv(env: Env) {
    this.env = env;
    this.pal = palette(env.sunAlt, env.weather);
    this.paint();
  }

  /** the net is put away while the page is scrolled down to the sections */
  setActive(active: boolean) {
    this.active = active;
    if (!active) this.emptyNet();
    this.canvas.style.cursor = active && this.pointer.on ? "none" : "";
  }

  /** tip whatever is in the net into the jar */
  emptyNet() {
    for (const f of this.flies)
      if (f.caught?.stage === "net") f.caught = { stage: "jar", ...this.netPoint(f.caught.dx, f.caught.dy), t: 0 };
    this.setInNet();
  }

  private setInNet() {
    const n = this.flies.filter((f) => f.caught?.stage === "net").length;
    if (n !== this.inNet) this.opts.onNet((this.inNet = n));
  }

  /** where the net is: at the pointer (or where it was tapped), turned by the swing about the end of its handle */
  private netPose() {
    const { net, pointer } = this;
    const p = 1 - net.swing;
    return {
      x: pointer.on ? pointer.x : net.x,
      y: pointer.on ? pointer.y : net.y,
      /* out and up, then back down through the rest and a little past it */
      angle: net.swing > 0 ? 0.95 * Math.sin(TAU * p) * (1 - p * 0.6) : 0,
    };
  }

  /** a point in the net (from the middle of its hoop) on screen */
  private netPoint(lx: number, ly: number) {
    const { x, y, angle } = this.netPose();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ax = lx - GRIP.x;
    const ay = ly - GRIP.y;
    return { x: x + GRIP.x + ax * c - ay * s, y: y + GRIP.y + ax * s + ay * c };
  }

  /** let `n` bugs out of the jar, back into the meadow */
  release(n: number) {
    const jar = this.opts.jar();
    if (!jar) return;
    for (let i = 0; i < n; i++) {
      const f = this.spawn(false);
      f.x = jar.x + (Math.random() - 0.5) * 12;
      f.y = jar.y + (Math.random() - 0.5) * 12;
      f.z = 0.8 + Math.random() * 0.4;
      f.dir = -Math.PI * 0.75 + (Math.random() - 0.5) * 1.2;
      f.kick = 1 + Math.random() * 0.8;
      this.flies.push(f);
    }
  }

  private offset(depth: number) {
    return { x: -this.par.x * 44 * depth, y: -this.par.y * 14 * depth };
  }

  private resize = () => {
    const dpr = (this.dpr = Math.min(devicePixelRatio || 1, 2));
    const w = (this.w = innerWidth);
    const h = (this.h = innerHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* the hills are wider and taller than the screen so the parallax never shows an edge */
    this.hillShapes = [hillShape(w + 120, h * 0.69, h * 0.045, Math.ceil(w / 180), 26), hillShape(w + 120, h * 0.79, h * 0.035, Math.ceil(w / 360), 44)];

    /* three rows of grass, the far one tallest, the near one in front of the bugs */
    const scale = Math.min(h, 1000);
    const layer = (gap: number, lo: number, hi: number, colors: Layer["colors"], depth: number): Layer => {
      const blades: Blade[] = [];
      for (let x = -50; x < w + 50; x += gap * (0.6 + Math.random() * 0.8))
        blades.push({ x, h: scale * (lo + Math.random() * (hi - lo)), w: 1.2 + Math.random() * 2.2, lean: (Math.random() - 0.5) * 0.5, bend: 0 });
      return { blades, colors, depth, tallest: Math.max(...blades.map((b) => b.h)) };
    };
    this.layers = [layer(4.5, 0.13, 0.3, ["back1", "back2"], 0.55), layer(5.5, 0.08, 0.21, ["mid1", "mid2"], 0.75), layer(7.5, 0.04, 0.13, ["front1", "front2"], 1)];

    this.stars = Array.from({ length: Math.round((w * h) / 5200) }, () => ({
      x: Math.random() * (w + 20) - 10,
      y: Math.random() * h * 0.68,
      r: 0.3 + Math.random() ** 3 * 1.2,
      phase: Math.random() * TAU,
    }));

    this.target = Math.max(18, Math.min(50, Math.round((w * h) / 32000)));
    this.flies = this.flies.filter((f) => f.x < w && f.y < h).slice(0, this.target);
    while (this.flies.length < this.target) this.flies.push(this.spawn(false));
    this.paint();
  };

  /** everything that depends on the palette or the weather, made again */
  private paint() {
    const { w, h, dpr, pal, ctx } = this;
    const { weather } = this.env;
    if (!w) return;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, css(pal.skyTop));
    sky.addColorStop(0.5, css(pal.skyMid));
    sky.addColorStop(0.72, css(pal.skyLow));
    sky.addColorStop(1, css(mix(pal.skyLow, pal.hillNear, 0.5)));
    this.sky = sky;
    const mist = ctx.createLinearGradient(0, h * 0.62, 0, h);
    mist.addColorStop(0, css(pal.mist, 0));
    mist.addColorStop(0.3, css(pal.mist, pal.mistAlpha));
    mist.addColorStop(1, css(pal.mist, pal.mistAlpha * 0.3));
    this.mist = mist;

    const rim = (c: RGB, a: number) => css(mix(c, WHITE, 0.4), a);
    this.hills = [
      renderHill(this.hillShapes[0], w + 120, h + 30, dpr, css(pal.hillFar), rim(pal.hillFar, 0.25)),
      renderHill(this.hillShapes[1], w + 120, h + 30, dpr, css(pal.hillNear), rim(pal.hillNear, 0.15)),
    ];

    this.cloudSprites = [11, 23, 37, 41, 59].map((seed) => cloudSprite(seed, pal.cloud, pal.cloudShade));
    this.deck = weather.cloud > 0.7 ? cloudDeck(w, h, pal.cloud, pal.cloudShade) : null;
    /* separate cumulus only in a broken sky; an overcast one is the deck alone */
    const clouds = this.deck ? 0 : Math.round(weather.cloud * 10);
    this.clouds = this.clouds.slice(0, clouds);
    while (this.clouds.length < clouds)
      this.clouds.push({
        x: Math.random() * (w + 400) - 300,
        y: h * (-0.06 + Math.random() * 0.34),
        s: (0.55 + Math.random() * 0.7) * Math.max(0.6, Math.min(1.3, w / 1400)) * (weather.cloud > 0.8 ? 1.4 : 1),
        sprite: Math.floor(Math.random() * this.cloudSprites.length),
        speed: 4 + Math.random() * 8,
      });

    const area = (w * h) / (1440 * 900);
    const drops = Math.round(weather.precip * (weather.kind === "snow" ? 260 : 420) * area);
    this.drops = this.drops.slice(0, drops);
    while (this.drops.length < drops) this.drops.push(this.drop(true));
  }

  private drop(anywhere: boolean): Drop {
    const snow = this.env.weather.kind === "snow";
    return {
      x: Math.random() * (this.w + 200) - 100,
      y: anywhere ? Math.random() * this.h : -20 - Math.random() * 60,
      v: snow ? 30 + Math.random() * 45 : (900 + Math.random() * 400) * (this.env.weather.kind === "drizzle" ? 0.6 : 1),
      len: 10 + Math.random() * 12,
      r: 1 + Math.random() * 1.8,
      phase: Math.random() * TAU,
    };
  }

  /** the band of sky a bug keeps to: the far ones low over the hills, the near ones anywhere in the grass */
  private bounds(z: number) {
    return z < 0.75 ? { top: this.h * 0.6, bottom: this.h * 0.86 } : { top: this.h * 0.44, bottom: this.h - 24 };
  }

  private spawn(rising: boolean): Fly {
    const z = 0.45 + Math.random() ** 0.8 * 0.8;
    const { top, bottom } = this.bounds(z);
    return {
      x: 20 + Math.random() * (this.w - 40),
      y: rising ? this.h + 8 : top + Math.random() * (bottom - top),
      z,
      dir: rising ? -Math.PI / 2 : Math.random() * TAU,
      speed: (14 + Math.random() * 26) * z,
      phase: Math.random() * TAU,
      rate: 0.8 + Math.random() * 1.6,
      fade: rising ? 0 : 1,
      kick: 0,
      caught: null,
    };
  }

  /** where a bug is on screen, after the parallax */
  private screen(f: Fly) {
    const o = this.offset(f.z * 0.8);
    return { x: f.x + o.x, y: f.y + o.y };
  }

  /** a firefly's light: long dim stretches and short bright blinks */
  private brightness(f: Fly) {
    if (f.caught) return 1;
    return (0.16 + 0.84 * Math.max(0, Math.sin(this.time * f.rate + f.phase)) ** 6) * f.fade;
  }

  /** where the sun or moon stands on screen for an hour angle and altitude: east on the left, west on the right */
  private place(hourAngle: number, alt: number) {
    const ha = ((((hourAngle + 180) % 360) + 360) % 360) - 180;
    const horizon = this.h * 0.66;
    return { x: this.w * Math.max(0.06, Math.min(0.94, 0.5 + ha / 250)), y: horizon - (Math.min(alt, 62) / 62) * (horizon - this.h * 0.1) };
  }

  private nearest(x: number, y: number, radius: number) {
    let best: Fly | null = null;
    let bestD = radius;
    for (const f of this.flies) {
      if (f.caught || f.fade < 0.5) continue;
      const s = this.screen(f);
      /* the small far ones are a little easier to hit than they look */
      const d = Math.hypot(s.x - x, s.y - y) / Math.max(0.8, f.z);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  private move = (e: PointerEvent) => {
    const touch = e.pointerType === "touch";
    this.pointer = { x: e.clientX, y: e.clientY, on: !touch };
    this.net.hover = !!this.nearest(e.clientX, e.clientY, HOOP + 6);
    /* the net takes the place of the cursor over the meadow */
    this.canvas.style.cursor = this.active && !touch ? "none" : "";
  };

  private leave = () => {
    this.pointer.on = false;
  };

  /** a swing of the net; on a touch screen it shows where it was tapped, and empties itself into the jar after */
  private down = (e: PointerEvent) => {
    if (!this.active || this.net.swing > 0.3) return;
    const touch = e.pointerType === "touch";
    Object.assign(this.net, { x: e.clientX, y: e.clientY, swing: 1, touch: touch ? 1.6 : 0, byTouch: touch });
    this.opts.onSwing();
  };

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000 || 0, 0.05);
    this.last = now;
    this.time += dt * (this.slow ? 0.35 : 1);
    this.update(dt);
    this.draw();
  };

  private update(dt: number) {
    const { w, h, pointer, par } = this;
    const { weather } = this.env;
    const ease = Math.min(1, dt * 3);
    if (pointer.on && !this.slow) {
      par.x += (pointer.x / w - 0.5 - par.x) * ease;
      par.y += (pointer.y / h - 0.5 - par.y) * ease;
    }

    for (const layer of this.layers) {
      const ox = this.offset(layer.depth).x;
      for (const b of layer.blades) {
        let target = 0;
        const dx = b.x + ox - pointer.x;
        if (pointer.on && Math.abs(dx) < 120 && pointer.y > h - b.h - 40) target = Math.sign(dx) * (1 - Math.abs(dx) / 120);
        b.bend += (target - b.bend) * Math.min(1, dt * 5);
      }
    }

    /* the hoop sweeps up whatever it passes over */
    const { net } = this;
    if (net.swing > 0) {
      const hoop = this.netPoint(0, 0);
      for (const f of this.flies) {
        if (f.caught || f.fade < 0.5) continue;
        const s = this.screen(f);
        if (Math.hypot(s.x - hoop.x, s.y - hoop.y) > HOOP * (net.touch ? 1.3 : 1) * Math.max(0.8, f.z)) continue;
        f.caught = { stage: "net", dx: (Math.random() - 0.5) * 16, dy: 22 + Math.random() * 18 };
        this.opts.onGrab();
      }
      this.setInNet();
    }
    net.swing = Math.max(0, net.swing - dt / SWING);
    net.touch = Math.max(0, net.touch - dt);
    /* the net held over the jar empties into it; on a touch screen it empties by itself once the swing is done */
    const jar = this.opts.jar();
    if (this.inNet && !net.swing && ((pointer.on && jar && Math.hypot(pointer.x - jar.x, pointer.y - jar.y) < 90) || (net.byTouch && net.touch < 0.9)))
      this.emptyNet();

    let landed = 0;
    for (const f of this.flies) {
      if (f.caught) {
        if (f.caught.stage === "jar") f.caught.t += dt / 0.6;
        continue;
      }
      f.fade = Math.min(1, f.fade + dt * 0.4);
      f.kick = Math.max(0, f.kick - dt);
      f.dir += (Math.random() - 0.5) * 4 * dt;
      /* strayed out of its band: turn back towards the middle of it */
      const { top, bottom } = this.bounds(f.z);
      if (f.y < top || f.y > bottom || f.x < 24 || f.x > w - 24) {
        const want = Math.atan2((top + bottom) / 2 - f.y, w / 2 - f.x);
        const diff = ((want - f.dir + Math.PI * 3) % TAU) - Math.PI;
        f.dir += Math.max(-2 * dt, Math.min(2 * dt, diff));
      }
      /* bugs hide from whoever is looking for them */
      const s = this.screen(f);
      const dx = s.x - pointer.x;
      const dy = s.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (pointer.on && this.active && d < 90 && d > 0) {
        const k = (1 - d / 90) * 40 * dt;
        f.x += (dx / d) * k;
        f.y += (dy / d) * k;
      }
      const speed = f.speed * (this.slow ? 0.4 : 1) * (1 + f.kick * 3);
      f.x += Math.cos(f.dir) * speed * dt;
      f.y += Math.sin(f.dir) * speed * 0.7 * dt;
    }
    this.flies = this.flies.filter((f) => {
      if (f.caught?.stage !== "jar" || f.caught.t < 1) return true;
      landed++;
      return false;
    });
    for (let i = 0; i < landed; i++) {
      if (this.flies.length < this.target) this.flies.push(this.spawn(true));
      this.opts.onCatch();
    }


    /* clouds drift with the wind, and come round again */
    const drift = (0.4 + weather.wind / 20) * (this.slow ? 0.3 : 1);
    for (const c of this.clouds) {
      c.x += c.speed * drift * dt;
      if (c.x > w + 60) c.x = -CW * c.s - 60;
    }

    const snow = weather.kind === "snow";
    const slant = weather.wind / 70;
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.x += snow ? (Math.sin(this.time * 1.3 + d.phase) * 18 + weather.wind) * dt : d.v * slant * dt;
      if (d.y > h + 20) Object.assign(d, this.drop(false));
    }

    if (this.meteor) {
      this.meteor.t += dt / 0.9;
      if (this.meteor.t >= 1) {
        this.meteor = null;
        this.nextMeteor = this.time + 9 + Math.random() * 14;
      }
    } else if (!this.slow && this.time > this.nextMeteor && this.pal.stars > 0.6 && weather.cloud < 0.5) {
      const angle = (Math.random() < 0.5 ? 0.2 : Math.PI - 0.2) + (Math.random() - 0.5) * 0.3;
      const speed = 650 + Math.random() * 300;
      this.meteor = { x: w * (0.15 + Math.random() * 0.7), y: h * (0.04 + Math.random() * 0.25), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, t: 0 };
    }

    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (weather.kind === "storm" && this.time > this.nextFlash) {
      this.nextFlash = this.time + 5 + Math.random() * 10;
      this.flash = 1;
      const pts = [w * (0.1 + Math.random() * 0.8), 0];
      while (pts[pts.length - 1] < h * 0.55) pts.push(pts[pts.length - 2] + (Math.random() - 0.5) * 60, pts[pts.length - 1] + 20 + Math.random() * 30);
      this.bolt = pts;
      this.opts.onLightning();
    }
  }

  private draw() {
    const { ctx, w, h, time, pal } = this;
    const { weather, sunAlt, hourAngle } = this.env;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = this.sky!;
    ctx.fillRect(0, 0, w, h);

    /* stars, and now and then one falling */
    const starAlpha = pal.stars * (1 - weather.cloud * 0.85);
    if (starAlpha > 0.01) {
      const so = this.offset(DEPTH.stars);
      ctx.fillStyle = "#dbeafe";
      for (const s of this.stars) {
        ctx.globalAlpha = starAlpha * (0.2 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.3 + s.phase)));
        ctx.fillRect(s.x + so.x, s.y + so.y, s.r * 2, s.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    if (this.meteor) {
      const m = this.meteor;
      const hx = m.x + m.vx * m.t * 0.9;
      const hy = m.y + m.vy * m.t * 0.9;
      const len = 0.16;
      const trail = ctx.createLinearGradient(hx - m.vx * len, hy - m.vy * len, hx, hy);
      trail.addColorStop(0, "rgba(230, 240, 255, 0)");
      trail.addColorStop(1, "rgba(230, 240, 255, 0.9)");
      ctx.globalAlpha = Math.sin(Math.PI * m.t);
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - m.vx * len, hy - m.vy * len);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const o = this.offset(DEPTH.sky);
    /* the sun and moon shine through broken cloud, and are hidden only behind heavy cloud */
    const clear = Math.max(0, Math.min(1, 1 - (weather.cloud - 0.5) * 2.2));

    /* the sunrise or sunset glow along the horizon */
    if (pal.dusk > 0.02) {
      const sun = this.place(hourAngle, 0);
      const gx = Math.max(0, Math.min(w, sun.x));
      const gy = h * 0.66;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(1, 0.4);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.6);
      glow.addColorStop(0, `rgba(255, 160, 95, ${0.5 * pal.dusk})`);
      glow.addColorStop(1, "rgba(255, 160, 95, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(-w * 0.6, -w * 0.6, w * 1.2, w * 1.2);
      ctx.restore();
    }

    /* the sun, warmer and bigger near the horizon */
    if (sunAlt > -4) {
      const p = this.place(hourAngle, sunAlt);
      const x = p.x + o.x;
      const y = p.y + o.y;
      const warm = 1 - smooth(0, 25, sunAlt);
      const core = mix([255, 250, 232], [255, 176, 96], warm);
      const a = Math.min(1, (sunAlt + 4) / 4) * clear;
      const r = 110 + warm * 110;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
      halo.addColorStop(0, css(core, 0.32 * a));
      halo.addColorStop(0.22, css(core, 0.1 * a));
      halo.addColorStop(1, css(core, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = css(mix(core, WHITE, 0.6));
      ctx.beginPath();
      ctx.arc(x, y, 16 + warm * 5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* the moon, roughly across the sky from the sun */
    if (sunAlt < -2) {
      const p = this.place(hourAngle + 240, Math.max(8, -sunAlt * 0.9));
      const x = p.x + o.x;
      const y = p.y + o.y;
      const a = Math.min(1, (-sunAlt - 2) / 6) * clear;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, 110);
      halo.addColorStop(0, `rgba(220, 232, 240, ${0.08 * a})`);
      halo.addColorStop(1, "rgba(220, 232, 240, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(x - 110, y - 110, 220, 220);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#e9ece6";
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, TAU);
      ctx.fill();
      /* the dark seas on its face */
      ctx.fillStyle = "rgba(150, 160, 160, 0.35)";
      ctx.beginPath();
      for (const [mx, my, mr] of [
        [-4, -4, 4.5],
        [3, -6, 3],
        [4, 3, 3.5],
        [-2, 6, 2.2],
      ]) {
        ctx.moveTo(x + mx + mr, y + my);
        ctx.arc(x + mx, y + my, mr, 0, TAU);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* clouds: under an overcast sky, a deck of them first */
    const co = this.offset(DEPTH.clouds);
    if (this.deck) {
      ctx.globalAlpha = Math.min(1, (weather.cloud - 0.7) / 0.2);
      ctx.drawImage(this.deck, co.x - 20, co.y - 10, w + 40, h + 20);
    }
    ctx.globalAlpha = 0.85 + weather.cloud * 0.15;
    for (const c of this.clouds) ctx.drawImage(this.cloudSprites[c.sprite], c.x + co.x, c.y + co.y, CW * c.s, CH * c.s);
    ctx.globalAlpha = 1;

    /* the hills, mist settling between them */
    const fo = this.offset(DEPTH.far);
    ctx.drawImage(this.hills[0], -60 + fo.x, fo.y, w + 120, h + 30);
    ctx.fillStyle = this.mist!;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    const no = this.offset(DEPTH.near);
    ctx.drawImage(this.hills[1], -60 + no.x, no.y, w + 120, h + 30);
    if (weather.kind === "fog") {
      ctx.fillStyle = css(pal.skyLow, 0.45);
      ctx.fillRect(0, 0, w, h);
    }

    this.drawFlies((f) => f.z < 0.75);
    this.drawGrass(this.layers[0]);
    this.drawGrass(this.layers[1]);
    this.drawFlies((f) => f.z >= 0.75);
    this.drawGrass(this.layers[2]);
    if (weather.kind === "fog") {
      ctx.fillStyle = css(pal.skyLow, 0.15);
      ctx.fillRect(0, 0, w, h);
    }

    this.drawFlies(null);
    this.drawPrecip();
    this.drawNet();

    if (this.flash > 0) {
      const f = this.flash * (0.6 + 0.4 * Math.sin(this.flash * 40));
      if (this.bolt && this.flash > 0.5) {
        ctx.strokeStyle = `rgba(235, 240, 255, ${f})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.bolt.length; i += 2) ctx.lineTo(this.bolt[i], this.bolt[i + 1]);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(225, 232, 255, ${0.35 * f})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** a bug net: a hoop with a mesh bag, on a wooden handle, with whatever it has caught crawling about in the bag */
  private drawNet() {
    const { ctx, net, pointer, pal, time } = this;
    const show = pointer.on ? 1 : Math.min(1, net.touch);
    if (!this.active || show < 0.01) return;
    const { x, y, angle } = this.netPose();
    const day = pal.day > 0.5;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.translate(x + GRIP.x, y + GRIP.y);
    ctx.rotate(angle);
    ctx.translate(-GRIP.x, -GRIP.y);

    ctx.strokeStyle = "#7a4f2a";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(19, 7);
    ctx.lineTo(GRIP.x, GRIP.y);
    ctx.stroke();

    /* the bag trails behind the swing */
    const sway = -Math.sin(angle) * 14;
    const bag = () => {
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.bezierCurveTo(-26, 30, -8 + sway, 48, sway, 52);
      ctx.bezierCurveTo(8 + sway, 48, 26, 30, 24, 0);
    };
    bag();
    ctx.fillStyle = day ? "rgba(255, 255, 255, 0.22)" : "rgba(226, 240, 230, 0.1)";
    ctx.fill();

    /* what's been caught, crawling about inside */
    for (const f of this.flies) {
      if (f.caught?.stage !== "net") continue;
      const bx = f.caught.dx * (1 - f.caught.dy / 70) + sway * (f.caught.dy / 52) + Math.sin(time * 3 + f.phase) * 2;
      const by = f.caught.dy + Math.cos(time * 2.3 + f.phase) * 1.5;
      if (pal.day < 0.95) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = show * (0.3 + this.brightness({ ...f, caught: null })) * (1 - pal.day * 0.95);
        ctx.drawImage(this.glow, bx - 8, by - 8, 16, 16);
        ctx.globalCompositeOperation = "source-over";
      }
      if (pal.day > 0.05) {
        ctx.globalAlpha = show;
        this.ladybug(bx, by, 3, time * 1.5 + f.phase * 3, f.phase, pal.day);
      }
    }
    ctx.globalAlpha = show;

    /* the mesh over them */
    ctx.strokeStyle = day ? "rgba(255, 255, 255, 0.55)" : "rgba(226, 240, 230, 0.4)";
    ctx.lineWidth = 0.8;
    bag();
    ctx.stroke();
    ctx.beginPath();
    for (const t of [-12, 0, 12]) {
      ctx.moveTo(t, 4);
      ctx.quadraticCurveTo(t * 0.8 + sway * 0.6, 36, sway, 52);
    }
    for (const [ry, rx] of [
      [18, 22],
      [34, 15],
    ]) {
      ctx.moveTo(rx + sway * (ry / 52), ry);
      ctx.ellipse(sway * (ry / 52), ry, rx, 4, 0, 0, Math.PI);
    }
    ctx.stroke();

    /* the hoop, its rim turning green with a bug inside it */
    ctx.strokeStyle = net.hover && !net.swing ? (day ? "#15803d" : "#bef264") : day ? "#f1f5f9" : "#dfe7e2";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 9, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  private drawPrecip() {
    const { ctx, pal } = this;
    const { weather } = this.env;
    if (!this.drops.length) return;
    if (weather.kind === "snow") {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + pal.day * 0.3})`;
      ctx.beginPath();
      for (const d of this.drops) {
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, TAU);
      }
      ctx.fill();
      return;
    }
    const slant = weather.wind / 70;
    ctx.strokeStyle = css(mix(pal.skyLow, WHITE, 0.55), 0.22 + pal.day * 0.15);
    ctx.lineWidth = weather.kind === "drizzle" ? 0.8 : 1;
    ctx.beginPath();
    for (const d of this.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * slant, d.y - d.len);
    }
    ctx.stroke();
  }

  /** four tones per row of grass, each darker at the root and catching the light towards the tip */
  private drawGrass(layer: Layer) {
    const { ctx, h, time, pal } = this;
    const o = this.offset(layer.depth);
    const gust = Math.max(0.3, Math.min(1.6, this.env.weather.wind / 25));
    const [a, b] = [pal[layer.colors[0]], pal[layer.colors[1]]];
    const tones: RGB[] = [a, b, mix(a, [0, 0, 0], 0.18), mix(b, [255, 240, 200], 0.08)];
    const light = 0.1 + pal.day * 0.08;
    for (let g = 0; g < tones.length; g++) {
      ctx.beginPath();
      for (let i = g; i < layer.blades.length; i += tones.length) {
        const bl = layer.blades[i];
        const x = bl.x + o.x;
        const wind = Math.sin(time * 0.9 * (0.7 + gust * 0.4) + bl.x * 0.0045) * 0.55 + Math.sin(time * 2.1 + bl.x * 0.013) * 0.2;
        const off = (bl.lean + wind * 0.7 * (0.5 + gust * 0.6) + bl.bend * 1.4) * bl.h * 0.32;
        const tipY = h - bl.h + Math.abs(off) * 0.3 + o.y;
        const midY = h - bl.h * 0.5 + o.y;
        ctx.moveTo(x - bl.w, h + 2);
        ctx.quadraticCurveTo(x + off * 0.3 - bl.w * 0.4, midY, x + off, tipY);
        ctx.quadraticCurveTo(x + off * 0.3 + bl.w * 0.4, midY, x + bl.w, h + 2);
      }
      const shade = ctx.createLinearGradient(0, h, 0, h - layer.tallest + o.y);
      shade.addColorStop(0, css(mix(tones[g], [0, 0, 0], 0.35)));
      shade.addColorStop(1, css(mix(tones[g], [255, 250, 220], light)));
      ctx.fillStyle = shade;
      ctx.fill();
    }
  }

  /** the free bugs that `which` picks, or with null the ones dropping from the net into the jar */
  private drawFlies(which: ((f: Fly) => boolean) | null) {
    const { ctx } = this;
    const day = this.pal.day;
    const jar = which ? null : this.opts.jar();
    for (const f of this.flies) {
      if (which ? f.caught || !which(f) : f.caught?.stage !== "jar") continue;
      let { x, y } = this.screen(f);
      let size = f.z;
      let dir = f.dir;
      if (f.caught?.stage === "jar") {
        /* tipped out of the bag: a short hop over the rim and down into the jar */
        const to = jar ?? { x: f.caught.x, y: f.caught.y };
        const p = easeInOut(Math.min(1, f.caught.t));
        const cx = (f.caught.x + to.x) / 2;
        const cy = Math.min(f.caught.y, to.y) - 50;
        x = (1 - p) ** 2 * f.caught.x + 2 * (1 - p) * p * cx + p * p * to.x;
        y = (1 - p) ** 2 * f.caught.y + 2 * (1 - p) * p * cy + p * p * to.y;
        dir = Math.atan2(2 * (1 - p) * (cy - f.caught.y) + 2 * p * (to.y - cy), 2 * (1 - p) * (cx - f.caught.x) + 2 * p * (to.x - cx));
        size = 0.9 - p * 0.3;
      }
      const b = this.brightness(f);
      /* by night, the firefly's light */
      if (day < 0.95) {
        ctx.globalCompositeOperation = "lighter";
        const r = 12 * size * (0.6 + b * 0.5);
        ctx.globalAlpha = Math.min(1, (0.15 + b) * (0.5 + 0.5 * Math.min(1, f.z))) * (1 - day * 0.95);
        ctx.drawImage(this.glow, x - r, y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      /* by day, a ladybug */
      if (day > 0.05) this.ladybug(x, y, 3.4 * size, dir, f.phase, day * f.fade);
    }
    ctx.globalAlpha = 1;
  }

  private ladybug(x: number, y: number, s: number, dir: number, phase: number, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir);
    ctx.globalAlpha = alpha * (0.25 + 0.15 * Math.sin(this.time * 70 + phase));
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 1.05, s * 1.1, s * 0.45, -0.3, 0, TAU);
    ctx.ellipse(-s * 0.2, s * 1.05, s * 1.1, s * 0.45, 0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.arc(s * 0.95, 0, s * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.1, s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    for (const [dx, dy] of [
      [-0.35, -0.45],
      [-0.35, 0.45],
      [0.3, -0.5],
      [0.3, 0.5],
    ]) {
      ctx.moveTo(s * dx + s * 0.2, s * dy);
      ctx.arc(s * dx, s * dy, s * 0.2, 0, TAU);
    }
    ctx.fill();
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = Math.max(0.6, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.lineTo(s * 0.55, 0);
    ctx.stroke();
    ctx.restore();
  }
}
