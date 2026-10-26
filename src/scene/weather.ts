/*
 * Where the visitor is and what the sky is doing there: the browser's location (or Kocaeli when it isn't given), the
 * current weather from Open-Meteo, and the sun's place in the sky worked out from the clock.
 */

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type Weather = {
  kind: WeatherKind;
  /** 0 … 1 */
  cloud: number;
  /** km/h */
  wind: number;
  /** how hard it rains or snows, 0 … 1 */
  precip: number;
  /** °C, when known */
  temp: number | null;
};

export const WEATHER_KINDS: WeatherKind[] = ["clear", "partly", "cloudy", "fog", "drizzle", "rain", "snow", "storm"];

/** typical weather of each kind, for picking one by hand */
export const PRESETS: Record<WeatherKind, Weather> = {
  clear: { kind: "clear", cloud: 0.05, wind: 8, precip: 0, temp: null },
  partly: { kind: "partly", cloud: 0.4, wind: 12, precip: 0, temp: null },
  cloudy: { kind: "cloudy", cloud: 0.9, wind: 15, precip: 0, temp: null },
  fog: { kind: "fog", cloud: 0.6, wind: 3, precip: 0, temp: null },
  drizzle: { kind: "drizzle", cloud: 0.85, wind: 10, precip: 0.35, temp: null },
  rain: { kind: "rain", cloud: 0.95, wind: 20, precip: 0.75, temp: null },
  snow: { kind: "snow", cloud: 0.85, wind: 8, precip: 0.6, temp: null },
  storm: { kind: "storm", cloud: 1, wind: 40, precip: 1, temp: null },
};

export const HOME = { lat: 40.7654, lon: 29.9408, name: "Kocaeli" };

/** WMO weather code (as Open-Meteo gives it) → our kind and how heavy */
function fromCode(code: number): { kind: WeatherKind; precip: number } {
  if (code <= 1) return { kind: "clear", precip: 0 };
  if (code === 2) return { kind: "partly", precip: 0 };
  if (code === 3) return { kind: "cloudy", precip: 0 };
  if (code === 45 || code === 48) return { kind: "fog", precip: 0 };
  if (code >= 51 && code <= 57) return { kind: "drizzle", precip: 0.35 };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { kind: "rain", precip: code === 65 || code === 82 ? 1 : code === 63 || code === 81 ? 0.75 : 0.5 };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", precip: code === 75 || code === 86 ? 1 : 0.6 };
  if (code >= 95) return { kind: "storm", precip: 1 };
  return { kind: "partly", precip: 0 };
}

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const { current } = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number; cloud_cover: number; wind_speed_10m: number };
  };
  const { kind, precip } = fromCode(current.weather_code);
  return {
    kind,
    precip,
    cloud: Math.max(current.cloud_cover / 100, PRESETS[kind].cloud * 0.6),
    wind: current.wind_speed_10m,
    temp: Math.round(current.temperature_2m),
  };
}

/** the browser's location, or null if it isn't given within a few seconds */
export function locate(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

/** the town at a place, for the label */
export async function placeName(lat: number, lon: number, lang: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`);
    const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    return d.city || d.locality || d.principalSubdivision || null;
  } catch {
    return null;
  }
}

/**
 * The sun's altitude above the horizon and its hour angle (0 at local noon, negative in the morning), in degrees, after
 * NOAA's approximate solar position equations.
 */
export function sunPosition(date: Date, lat: number, lon: number) {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start) / 864e5);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (day + (hour - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const solarMinutes = hour * 60 + eqtime + 4 * lon;
  const hourAngle = ((((solarMinutes / 4 - 180) % 360) + 540) % 360) - 180;
  const cosZenith = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle * rad);
  const altitude = 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
  return { altitude, hourAngle };
}
