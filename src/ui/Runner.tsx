import { useEffect, useMemo, useRef, useState } from "react";
import { SUITES, UI, fill, type Lang } from "../content";
import { Check, Half } from "./icons";

type Line = { kind: "cmd" | "info" | "suite" | "pass" | "todo" | "gap" | "sum"; text: string; ms?: number };

/** The profile, run as a Playwright test file. */
function lines(lang: Lang): Line[] {
  const tests = SUITES.flatMap((s) => s.tests);
  const todo = tests.filter((t) => t.todo).length;
  const out: Line[] = [
    { kind: "cmd", text: "npx playwright test elif.spec.ts" },
    { kind: "info", text: fill(UI.running[lang], { n: tests.length }) },
    { kind: "gap", text: "" },
  ];
  let i = 0;
  for (const suite of SUITES) {
    out.push({ kind: "suite", text: `Elif › ${suite.name[lang]}` });
    for (const t of suite.tests) out.push({ kind: t.todo ? "todo" : "pass", text: t.title[lang], ms: 9 + ((i++ * 37) % 71) });
  }
  out.push({ kind: "gap", text: "" }, { kind: "sum", text: fill(UI.summary[lang], { p: tests.length - todo, t: todo }) });
  return out;
}

/** Runs the first time it scrolls into view, and again each time `run` changes. */
export function Runner({ lang, run }: { lang: Lang; run: number }) {
  const all = useMemo(() => lines(lang), [lang]);
  const instant = useMemo(() => matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const box = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setRound((r) => r || 1);
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (run) setRound((r) => r + 1);
  }, [run]);

  useEffect(() => {
    if (!round) return;
    if (instant) return setShown(all.length);
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= all.length ? (clearInterval(id), n) : n + 1)), 110);
    return () => clearInterval(id);
  }, [round, all, instant]);

  return (
    <div className="runner-card" ref={box}>
      <header className="runner-bar">
        <span className="dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="runner-file">elif.spec.ts</span>
        <button className="replay" onClick={() => setRound((r) => r + 1)}>
          ↻ {UI.replay[lang]}
        </button>
      </header>
      <p className="demo-note">{UI.demoNote[lang]}</p>
      <pre className="runner" aria-live="polite">
        {all.slice(0, shown).map((l, i) => (
          <div key={i} className={`ln ln-${l.kind}`}>
            {l.kind === "cmd" && <span className="prompt">$ </span>}
            {l.kind === "pass" && <Check className="tick" />}
            {l.kind === "todo" && <Half className="tick" />}
            {l.text}
            {l.ms !== undefined && <span className="ms"> ({l.ms}ms)</span>}
          </div>
        ))}
        {shown < all.length && <span className="caret" />}
      </pre>
    </div>
  );
}
