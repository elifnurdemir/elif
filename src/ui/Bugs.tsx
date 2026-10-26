import type { Ref } from "react";
import { BUGS, SEVERITY, UI, bugId, fill, type Lang } from "../content";

const bug = (i: number) => BUGS[i % BUGS.length];

/** A glass jar in the corner that fills with the light of every bug caught. */
export function Jar({ ref, count, lang, onOpen, onEnter }: { ref: Ref<HTMLButtonElement>; count: number; lang: Lang; onOpen: () => void; onEnter: () => void }) {
  return (
    <button ref={ref} className={`jar${count ? " has" : ""}`} onClick={onOpen} onPointerEnter={onEnter} aria-label={fill(UI.jar[lang], { n: count })}>
      <svg viewBox="0 0 48 60" aria-hidden>
        <rect x="13" y="3" width="22" height="7" rx="2" className="lid" />
        <path d="M14 10 h20 v4 q8 3 8 12 v24 q0 7 -7 7 h-22 q-7 0 -7 -7 v-24 q0 -9 8 -12z" className="glass" />
        {Array.from({ length: Math.min(count, 14) }, (_, i) => (
          <circle key={i} cx={13 + ((i * 29) % 22)} cy={50 - ((i * 17) % 22) - Math.floor(i / 7) * 4} r="2" className="spark" style={{ animationDelay: `${(i * 0.37) % 2}s` }} />
        ))}
      </svg>
      <span className="jar-count">{count}</span>
    </button>
  );
}

export type ToastNote = { kind: "bug"; index: number } | { kind: "fixed"; n: number };

/** The latest catch, briefly, as a logged ticket; or the jar emptied. */
export function Toast({ note, lang }: { note: ToastNote; lang: Lang }) {
  if (note.kind === "fixed")
    return (
      <div className="toast" role="status">
        <span className="toast-pass">{fill(UI.regression[lang], { n: note.n })}</span>
        <div className="toast-title">{UI.released[lang]}</div>
      </div>
    );
  const b = bug(note.index);
  return (
    <div className="toast" role="status">
      <span className="toast-id">{bugId(note.index)}</span> {UI.logged[lang]} · <span className={`sev sev-${b.severity}`}>{SEVERITY[b.severity][lang]}</span>
      <div className="toast-title">{b.title[lang]}</div>
    </div>
  );
}

/** Every caught bug, newest first, like a board of tickets; the first `fixed` of them are closed. */
export function BugBoard({ count, fixed, lang, onFixAll }: { count: number; fixed: number; lang: Lang; onFixAll: () => void }) {
  if (!count) return <p className="empty">{UI.jarEmpty[lang]}</p>;
  return (
    <>
      <ul className="board">
        {Array.from({ length: count }, (_, k) => count - 1 - k).map((i) => {
          const b = bug(i);
          const done = i < fixed;
          return (
            <li key={i} className={done ? "done" : undefined}>
              <span className="ticket-id">{bugId(i)}</span>
              <span className="ticket-title">{b.title[lang]}</span>
              <span className={`sev sev-${b.severity}`}>{SEVERITY[b.severity][lang]}</span>
              <span className="status">{done ? UI.fixedStatus[lang] : UI.open[lang]}</span>
            </li>
          );
        })}
      </ul>
      {count > fixed && (
        <button className="fix-all" onClick={onFixAll}>
          ✓ {UI.fixAll[lang]} <span>({count - fixed})</span>
        </button>
      )}
    </>
  );
}
