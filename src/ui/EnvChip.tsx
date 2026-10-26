import { useEffect, useRef, useState } from "react";
import { TIMES, UI, WEATHER, type Lang, type TimePick } from "../content";
import { WEATHER_KINDS, type Weather, type WeatherKind } from "../scene/weather";
import { WeatherIcon } from "./icons";

type Props = {
  lang: Lang;
  day: boolean;
  clock: string;
  place: string;
  weather: Weather;
  time: TimePick;
  pick: WeatherKind | "live";
  onTime: (t: TimePick) => void;
  onPick: (w: WeatherKind | "live") => void;
};

/** The hour, place and weather the meadow shows, and a test environment to try the others. */
export function EnvChip({ lang, day, clock, place, weather, time, pick, onTime, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div className="env" ref={root}>
      {open && (
        <div className="env-pop" role="dialog" aria-label={UI.env[lang]}>
          <p className="env-title">{UI.env[lang]}</p>
          <p className="env-note">{UI.envNote[lang]}</p>
          <p className="env-label">{UI.envTime[lang]}</p>
          <div className="env-options">
            {(Object.keys(TIMES) as TimePick[]).map((t) => (
              <button key={t} aria-pressed={time === t} onClick={() => onTime(t)}>
                {TIMES[t][lang]}
              </button>
            ))}
          </div>
          <p className="env-label">{UI.envWeather[lang]}</p>
          <div className="env-options">
            {(["live", ...WEATHER_KINDS] as const).map((w) => (
              <button key={w} aria-pressed={pick === w} onClick={() => onPick(w)}>
                {w === "live" ? TIMES.live[lang] : WEATHER[w][lang]}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="env-chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <WeatherIcon kind={weather.kind} day={day} />
        <span className="env-time">{time === "live" ? clock : TIMES[time][lang]}</span>
        <span className="env-place">{place}</span>
        {weather.temp !== null && pick === "live" && <span className="env-temp">{weather.temp}°</span>}
        <span className="env-kind">{WEATHER[weather.kind][lang]}</span>
      </button>
    </div>
  );
}
