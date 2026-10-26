import type { WeatherKind } from "../scene/weather";

type P = { className?: string };

export const Check = ({ className }: P) => (
  <svg className={className} viewBox="0 0 16 16" aria-hidden>
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** half a circle: started, not finished */
export const Half = ({ className }: P) => (
  <svg className={className} viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
  </svg>
);

export const Close = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CLOUD = "M7 18.5h10.5a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.3A3.4 3.4 0 0 0 7 18.5z";

/** the weather now, as a small line icon */
export function WeatherIcon({ kind, day }: { kind: WeatherKind; day: boolean }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  let body;
  if (kind === "clear")
    body = day ? (
      <>
        <circle cx="12" cy="12" r="4" {...line} />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" {...line} />
      </>
    ) : (
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" {...line} />
    );
  else if (kind === "fog") body = <path d="M4 9h16M6 13h12M4 17h16" {...line} />;
  else
    body = (
      <>
        <path d={CLOUD} transform={kind === "partly" || kind === "cloudy" ? undefined : "translate(0 -3)"} {...line} />
        {kind === "drizzle" && <path d="M9 19v1M13 19v1M17 19v1" {...line} />}
        {kind === "rain" && <path d="M8.5 18.5l-1 3M12.5 18.5l-1 3M16.5 18.5l-1 3" {...line} />}
        {kind === "snow" && <path d="M9 19.5h.01M12.5 21h.01M16 19.5h.01" {...line} strokeWidth={2.4} />}
        {kind === "storm" && <path d="M12.5 16l-2 3.5h3l-2 3.5" {...line} />}
      </>
    );
  return (
    <svg className="wicon" viewBox="0 0 24 24" aria-hidden>
      {body}
    </svg>
  );
}
