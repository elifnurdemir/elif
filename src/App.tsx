import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILE, UI, fill, type Lang, type TimePick } from "./content";
import { Meadow } from "./scene/Meadow";
import { mix, palette, smooth } from "./scene/sky";
import { Ambience } from "./scene/sound";
import { HOME, PRESETS, WEATHER_KINDS, fetchWeather, locate, placeName, sunPosition, type Weather, type WeatherKind } from "./scene/weather";
import { BugBoard, Jar, Toast, type ToastNote } from "./ui/Bugs";
import { EnvChip } from "./ui/EnvChip";
import { Panel } from "./ui/Panel";
import { Sections } from "./ui/Sections";

/** the sun for each hour picked by hand */
const SUN: Record<Exclude<TimePick, "live">, { altitude: number; hourAngle: number }> = {
  dawn: { altitude: 1.5, hourAngle: -95 },
  noon: { altitude: 55, hourAngle: 8 },
  sunset: { altitude: 1, hourAngle: 95 },
  night: { altitude: -40, hourAngle: 175 },
};

/* ?time=noon&weather=rain picks them from the address, for trying them out */
const query = new URLSearchParams(location.search);
const queryTime = query.get("time") as TimePick | null;
const queryWeather = query.get("weather") as WeatherKind | null;

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* only a convenience */
  }
}

function initialLang(): Lang {
  const saved = stored("lang");
  if (saved === "tr" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const jar = useRef<HTMLButtonElement>(null);
  const sound = useRef<Ambience>(null);
  const meadowRef = useRef<Meadow>(null);
  const [lang, setLang] = useState(initialLang);
  const [jarOpen, setJarOpen] = useState(false);
  const [caught, setCaught] = useState(0);
  /** how many of the caught bugs have been fixed and let out of the jar */
  const [fixed, setFixed] = useState(0);
  const [toast, setToast] = useState<{ note: ToastNote; id: number } | null>(null);
  const [muted, setMuted] = useState(() => stored("muted") === "1");
  /** how many bugs are in the net, waiting to be tipped into the jar */
  const [inNet, setInNet] = useState(0);
  /** bumped to run the tests again */
  const [run, setRun] = useState(0);

  const [place, setPlace] = useState<{ lat: number; lon: number; name: string | null }>(HOME);
  const [liveWeather, setLiveWeather] = useState<Weather | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [timePick, setTimePick] = useState<TimePick>(queryTime && queryTime in SUN ? queryTime : "live");
  const [weatherPick, setWeatherPick] = useState<WeatherKind | "live">(queryWeather && WEATHER_KINDS.includes(queryWeather) ? queryWeather : "live");

  const sun = timePick === "live" ? sunPosition(now, place.lat, place.lon) : SUN[timePick];
  const weather = weatherPick === "live" ? (liveWeather ?? PRESETS.clear) : PRESETS[weatherPick];
  const day = smooth(-6, 6, sun.altitude);
  /* dark words on a bright sky, light words on a dark one: a storm at noon darkens it as much as dusk does */
  const sky = palette(sun.altitude, weather);
  /* the sky behind the words, between the top of the sky and its middle */
  const [r, g, b] = mix(sky.skyTop, sky.skyMid, 0.75);
  const brightSky = (0.3 * r + 0.59 * g + 0.11 * b) / 255 > 0.48;
  /* the sun moves a little every half minute; a quarter degree is enough to repaint for */
  const sunAlt = Math.round(sun.altitude * 4) / 4;
  const hourAngle = Math.round(sun.hourAngle);
  const env = useMemo(() => ({ sunAlt, hourAngle, weather }), [sunAlt, hourAngle, weather]);

  useEffect(() => {
    const ambience = (sound.current = new Ambience(stored("muted") === "1"));
    /* browsers only let sound start from a click or a key */
    const start = () => ambience.start();
    addEventListener("pointerdown", start, { once: true });
    addEventListener("keydown", start, { once: true });
    const meadow = (meadowRef.current = new Meadow(canvas.current!, {
      jar: () => {
        const r = jar.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.45 } : null;
      },
      onSwing: () => ambience.swish(),
      onGrab: () => ambience.grab(),
      onNet: setInNet,
      onCatch: () => {
        ambience.land();
        setCaught((n) => n + 1);
      },
      onLightning: () => ambience.thunder(),
    }));

    /* how far down the page is, for the scrim over the meadow and the cues that fade */
    const scroll = () => {
      const scrolled = Math.min(1, scrollY / (innerHeight * 0.8));
      document.documentElement.style.setProperty("--scrolled", String(scrolled));
      document.documentElement.toggleAttribute("data-reading", scrolled > 0.6);
      meadowRef.current?.setActive(scrolled < 0.6);
    };
    scroll();
    addEventListener("scroll", scroll, { passive: true });
    const tick = setInterval(() => setNow(new Date()), 30000);

    return () => {
      removeEventListener("pointerdown", start);
      removeEventListener("keydown", start);
      removeEventListener("scroll", scroll);
      clearInterval(tick);
      meadow.dispose();
      ambience.dispose();
    };
  }, []);

  /* a link to a section (…/#contact): the page is only drawn now, so go there now */
  useEffect(() => {
    if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);

  /* where the visitor is: their browser's location if they give it, Kocaeli otherwise */
  useEffect(() => {
    void locate().then((p) => p && setPlace({ ...p, name: null }));
  }, []);

  useEffect(() => {
    if (place.name) return;
    let live = true;
    void placeName(place.lat, place.lon, lang).then((name) => live && name && setPlace((p) => ({ ...p, name })));
    return () => {
      live = false;
    };
  }, [place.lat, place.lon, place.name, lang]);

  useEffect(() => {
    let live = true;
    const get = () =>
      fetchWeather(place.lat, place.lon)
        .then((w) => live && setLiveWeather(w))
        .catch(() => {
          /* no weather: the sky stays clear */
        });
    void get();
    const id = setInterval(get, 15 * 60 * 1000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [place.lat, place.lon]);

  useEffect(() => {
    meadowRef.current?.setEnv(env);
    const { kind, precip, wind } = env.weather;
    sound.current?.setEnv({ day, rain: kind === "snow" ? 0 : precip, snow: kind === "snow" ? precip : 0, wind });
    document.documentElement.dataset.theme = brightSky ? "day" : "night";
  }, [env, day, brightSky]);

  useEffect(() => {
    if (caught) setToast({ note: { kind: "bug", index: caught - 1 }, id: Date.now() });
  }, [caught]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    sound.current?.setMuted(muted);
    store("muted", muted ? "1" : "0");
  }, [muted]);

  useEffect(() => {
    document.documentElement.lang = lang;
    store("lang", lang);
  }, [lang]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && setJarOpen(false);
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);

  const fixAll = () => {
    meadowRef.current?.release(caught - fixed);
    sound.current?.release();
    setToast({ note: { kind: "fixed", n: caught - fixed }, id: Date.now() });
    setFixed(caught);
    setJarOpen(false);
  };

  const runTests = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    setRun((r) => r + 1);
  };

  return (
    <>
      <canvas ref={canvas} className="meadow" aria-hidden />
      <div className="scrim" aria-hidden />

      <header className="top">
        <a className="mark" href="#top" aria-label={PROFILE.name}>
          <span className="mark-alif" aria-hidden>
            ا
          </span>
          <span className="mark-name">{PROFILE.name}</span>
        </a>
        <nav className="nav" aria-label="Menu">
          <a href="#about">{UI.about[lang]}</a>
          <a href="#work">{UI.work[lang]}</a>
          <a href="#contact">{UI.contact[lang]}</a>
        </nav>
        <div className="top-right">
          <button
            className="sound"
            aria-pressed={!muted}
            aria-label={muted ? UI.soundOn[lang] : UI.soundOff[lang]}
            title={muted ? UI.soundOn[lang] : UI.soundOff[lang]}
            onClick={() => {
              sound.current?.start();
              setMuted((m) => !m);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
              {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" className="stroke" /> : <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" className="stroke" />}
            </svg>
          </button>
          <div className="lang" role="group">
            {(["tr", "en"] as const).map((l) => (
              <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-inner">
            <span className="alif" aria-hidden />
            <h1>{PROFILE.name}</h1>
            <p className="role">
              <span lang="en">{PROFILE.title[lang]}</span> · {PROFILE.location[lang]}
            </p>
            <p className="tagline">{UI.tagline[lang]}</p>
            <p className="intro">{PROFILE.intro[lang]}</p>
            <div className="actions">
              <button className="run" onClick={runTests}>
                <span className="run-icon" aria-hidden>
                  ▶
                </span>
                {UI.run[lang]}
                <code>elif.spec.ts</code>
              </button>
              <a className="ghost" href="#contact">
                {UI.reachOut[lang]}
              </a>
            </div>
          </div>
          <a className="scroll-cue" href="#about">
            {UI.scroll[lang]}
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </a>
        </section>

        <Sections lang={lang} run={run} />
      </main>

      <EnvChip
        lang={lang}
        day={day > 0.7}
        clock={now.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
        place={place.name ?? UI.yourPlace[lang]}
        weather={weather}
        time={timePick}
        pick={weatherPick}
        onTime={setTimePick}
        onPick={setWeatherPick}
      />
      {(inNet > 0 || !caught) && <p className="catch-hint">{inNet ? UI.toJar[lang] : day > 0.5 ? UI.catchDay[lang] : UI.catchNight[lang]}</p>}
      {toast && <Toast key={toast.id} note={toast.note} lang={lang} />}
      <Jar ref={jar} count={caught - fixed} lang={lang} onOpen={() => setJarOpen(true)} onEnter={() => meadowRef.current?.emptyNet()} />

      {jarOpen && (
        <Panel title={`${UI.board[lang]} · ${fill(UI.jar[lang], { n: caught })}`} closeLabel={UI.close[lang]} onClose={() => setJarOpen(false)}>
          <BugBoard count={caught} fixed={fixed} lang={lang} onFixAll={fixAll} />
        </Panel>
      )}
    </>
  );
}
