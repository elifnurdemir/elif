/*
 * The meadow's colours through the day: a palette for each height of the sun, from deep night through the blue hour,
 * dusk and golden hour to midday, blended between, then greyed and darkened by clouds, rain and storms.
 */

import type { Weather } from "./weather";

export type RGB = [number, number, number];

const rgb = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c: RGB, alpha = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const COLORS = ["skyTop", "skyMid", "skyLow", "hillFar", "hillNear", "back1", "back2", "mid1", "mid2", "front1", "front2", "mist", "cloud", "cloudShade"] as const;
type ColorKey = (typeof COLORS)[number];
type Key = { alt: number; stars: number; mistAlpha: number } & Record<ColorKey, string>;

export type Palette = Record<ColorKey, RGB> & {
  stars: number;
  mistAlpha: number;
  /** 0 at night … 1 in full day */
  day: number;
  /** how much of a sunset or sunrise glow there is on the horizon */
  dusk: number;
};

/** by the sun's altitude, in degrees */
const KEYS: Key[] = [
  {
    alt: -18,
    stars: 1,
    mistAlpha: 0.07,
    skyTop: "#03070f",
    skyMid: "#071320",
    skyLow: "#0e2532",
    hillFar: "#0b1e28",
    hillNear: "#07151b",
    back1: "#10302b",
    back2: "#143a32",
    mid1: "#0b2420",
    mid2: "#0e2b26",
    front1: "#04100c",
    front2: "#061612",
    mist: "#8cdcd2",
    cloud: "#1c2836",
    cloudShade: "#0c121b",
  },
  {
    alt: -8,
    stars: 0.55,
    mistAlpha: 0.08,
    skyTop: "#0b1530",
    skyMid: "#1f2f5c",
    skyLow: "#4b4f7c",
    hillFar: "#182440",
    hillNear: "#10192c",
    back1: "#1a3436",
    back2: "#1e3a3a",
    mid1: "#13292c",
    mid2: "#162f30",
    front1: "#081414",
    front2: "#0a1919",
    mist: "#9fb4e0",
    cloud: "#3a3f66",
    cloudShade: "#232744",
  },
  {
    alt: -2,
    stars: 0.15,
    mistAlpha: 0.1,
    skyTop: "#1d2a5a",
    skyMid: "#6b4f8a",
    skyLow: "#f08a5d",
    hillFar: "#3a3352",
    hillNear: "#241f36",
    back1: "#2c4038",
    back2: "#33483d",
    mid1: "#1f3029",
    mid2: "#24372f",
    front1: "#0f1915",
    front2: "#121f19",
    mist: "#f6b38a",
    cloud: "#e39a8f",
    cloudShade: "#6b4a6e",
  },
  {
    alt: 4,
    stars: 0,
    mistAlpha: 0.12,
    skyTop: "#3d6fb0",
    skyMid: "#8fb3d9",
    skyLow: "#ffc88a",
    hillFar: "#6f8a86",
    hillNear: "#3e5a46",
    back1: "#4f7a3a",
    back2: "#5a8540",
    mid1: "#3a6230",
    mid2: "#426b35",
    front1: "#24401f",
    front2: "#2a4823",
    mist: "#ffe0b0",
    cloud: "#ffe1c4",
    cloudShade: "#c99a8f",
  },
  {
    alt: 12,
    stars: 0,
    mistAlpha: 0.14,
    skyTop: "#3f7fc8",
    skyMid: "#7fb4e6",
    skyLow: "#cfe6f5",
    hillFar: "#8aa9a6",
    hillNear: "#4f7a55",
    back1: "#5f9a45",
    back2: "#6aa64c",
    mid1: "#4a8238",
    mid2: "#528c3e",
    front1: "#2f5a26",
    front2: "#36652b",
    mist: "#e6f2f5",
    cloud: "#ffffff",
    cloudShade: "#b9c8d6",
  },
  {
    alt: 30,
    stars: 0,
    mistAlpha: 0.12,
    skyTop: "#2f73c4",
    skyMid: "#6fa9e3",
    skyLow: "#c6e3f7",
    hillFar: "#86a8a8",
    hillNear: "#4c7a52",
    back1: "#64a248",
    back2: "#70ae50",
    mid1: "#4e893a",
    mid2: "#579342",
    front1: "#315e28",
    front2: "#38692d",
    mist: "#e6f2f5",
    cloud: "#ffffff",
    cloudShade: "#b4c4d4",
  },
];

/** a colour with some of its colour drained (towards its own grey) and darkened */
function dull(c: RGB, grey: number, dark: number): RGB {
  const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  return mix(c, [l, l, l], grey).map((v) => v * (1 - dark)) as RGB;
}

export function palette(alt: number, weather: Weather): Palette {
  let i = 0;
  while (i < KEYS.length - 2 && alt > KEYS[i + 1].alt) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(a.alt, b.alt, alt);
  const p = {} as Palette;
  for (const k of COLORS) p[k] = mix(rgb(a[k]), rgb(b[k]), t);
  p.stars = a.stars + (b.stars - a.stars) * t;
  p.mistAlpha = a.mistAlpha + (b.mistAlpha - a.mistAlpha) * t;
  p.day = smooth(-6, 6, alt);
  p.dusk = Math.max(0, 1 - Math.abs(alt - 1) / 9);

  /* clouds, rain and fog take the colour out of the sky; a storm also darkens it */
  /* an overcast sky is grey, not blue with clouds on it */
  const cover = weather.cloud ** 1.5;
  const grey = Math.min(0.92, cover * 0.95 + weather.precip * 0.35 + (weather.kind === "fog" ? 0.45 : 0));
  const dark = weather.kind === "storm" ? 0.35 : weather.precip * 0.15;
  for (const k of ["skyTop", "skyMid", "skyLow", "hillFar", "hillNear", "mist", "cloud", "cloudShade"] as const) p[k] = dull(p[k], grey, dark);
  for (const k of ["back1", "back2", "mid1", "mid2", "front1", "front2"] as const) p[k] = dull(p[k], grey * 0.4, dark * 0.7);
  /* snow lies on the hills and the grass */
  if (weather.kind === "snow") {
    const snow: RGB = [226, 234, 238];
    for (const k of ["hillFar", "hillNear"] as const) p[k] = mix(p[k], snow, 0.45 * (0.4 + 0.6 * p.day));
    for (const k of ["back1", "back2", "mid1", "mid2", "front1", "front2"] as const) p[k] = mix(p[k], snow, 0.28 * (0.3 + 0.7 * p.day));
  }
  if (weather.kind === "fog") {
    p.mist = p.skyLow;
    p.mistAlpha = 0.3;
  }
  p.cloud = mix(p.cloud, p.cloudShade, cover * 0.35);
  p.dusk *= 1 - grey;
  return p;
}
