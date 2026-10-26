import type { ReactNode } from "react";
import { Close } from "./icons";

/** A window over the meadow, with a tab-like title bar; clicking outside it closes it. */
export function Panel({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <section className="panel" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="panel-bar">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="panel-title">{title}</span>
          <button className="panel-close" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <Close />
          </button>
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}
