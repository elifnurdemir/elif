import { ABOUT, CONTACT, FACTS, PROFILE, UI, WORK, type Lang } from "../content";
import { Check, Half } from "./icons";
import { Runner } from "./Runner";

const YEAR = new Date().getFullYear();

/** The page below the meadow: about (with the test run), the work, and how to get in touch. */
export function Sections({ lang, run }: { lang: Lang; run: number }) {
  const links = CONTACT.filter((c) => c.href);
  return (
    <>
      <section className="section" id="about">
        <p className="eyebrow">01 — {UI.about[lang]}</p>
        <div className="about-grid">
          <div>
            <h2>{UI.about[lang]}</h2>
            <p className="about-text">{ABOUT[lang]}</p>
            <dl className="facts">
              {FACTS.map((f) => (
                <div key={f.label.en}>
                  <dt>{f.label[lang]}</dt>
                  <dd>{f.value[lang]}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Runner lang={lang} run={run} />
        </div>
      </section>

      <section className="section" id="work">
        <p className="eyebrow">02 — {UI.work[lang]}</p>
        <h2>{UI.work[lang]}</h2>
        <p className="section-intro">{UI.workIntro[lang]}</p>
        <ol className="cases">
          {WORK.map((w, i) => (
            <li key={w.title.en} className="case">
              <div className="case-head">
                <span className="case-id">TC-{String(i + 1).padStart(2, "0")}</span>
                <span className={`badge ${w.todo ? "badge-todo" : "badge-pass"}`}>
                  {w.todo ? <Half /> : <Check />}
                  {w.todo ? UI.inProgress[lang] : UI.passed[lang]}
                </span>
              </div>
              <h3>{w.title[lang]}</h3>
              <p>{w.body[lang]}</p>
              <ul className="tags">
                {w.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {w.link && (
                <a className="case-link" href={w.link.href} target="_blank" rel="noreferrer">
                  {w.link.label} →
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="contact">
        <p className="eyebrow">03 — {UI.contact[lang]}</p>
        <div className="contact-card">
          <h2>{UI.contactTitle[lang]}</h2>
          <p className="section-intro">{UI.contactText[lang]}</p>
          {links.length > 0 && (
            <div className="contact-links">
              {links.map((c) => (
                <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <span>{c.label}</span>
                  {c.text && <small>{c.text}</small>}
                </a>
              ))}
            </div>
          )}
          {!links.length && import.meta.env.DEV && <p className="dev-note">{UI.contactMissing[lang]}</p>}
          <p className="contact-place">{PROFILE.location[lang]}</p>
        </div>
        <footer className="foot">
          © {YEAR} {PROFILE.name} · {PROFILE.title[lang]}
        </footer>
      </section>
    </>
  );
}
