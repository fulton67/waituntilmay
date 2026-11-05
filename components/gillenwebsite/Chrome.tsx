"use client";
// Everything that stays put while the three pages change: header, clock, nav, page transition,
// footer, and the record view any page can open. Each piece names its row in docs/gillenwebsite/SOURCES.md.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Release } from "@/lib/gillenwebsite/discography";
import type { From, VinylHandle } from "./VinylView";
import css from "./site.module.css";

// the record view: three.js, so loaded on the client only, as soon as the page is up
const VinylView = dynamic(() => import("./VinylView"), { ssr: false });

// open(i, from): the record view for release i, lifting off the Rolodex ("rolodex"), starting on a cover in the
// page (an element), or coming up from below (null)
type Ctx = { open: (i: number, from?: From) => void };
const PanelCtx = createContext<Ctx>({ open: () => {} });
export const usePanel = () => useContext(PanelCtx);

const BASE = "/gillenwebsite";
const PAGES = [
  { href: BASE, label: "ROLODEX" },
  { href: `${BASE}/discography`, label: "DISCOGRAPHY" },
];

// SOURCES #03, luckydaye.com's div.timer > span.date-time pair, now the viewer's own time of day and date from the
// device clock: HH:MM:SS (24-hour) and DD.MM.YYYY, written into the spans on each second's turn so React does not
// re-render.
function Timer() {
  const time = useRef<HTMLSpanElement>(null), day = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    let id = 0;
    const tick = () => {
      const d = new Date();
      if (time.current) time.current.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      if (day.current) day.current.textContent = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
      // the next tick on the next second's turn
      id = window.setTimeout(tick, 1000 - (d.getTime() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={css.timer} data-src="03">
      {/* same-width placeholders until the clock is written, so the header does not shift */}
      <span ref={time} className={css.dateTime}>00:00:00</span>
      <span ref={day} className={css.dateTime}>00.00.0000</span>
    </div>
  );
}

// SOURCES #27, felixluke.com S9 (8f0d4b7528454cc0.js:3): copy the address, say so for 2000 ms, put it back
function Email({ addr }: { addr: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={css.email}
      data-src="27"
      style={{ pointerEvents: copied ? "none" : "all" }}
      onClick={() => {
        navigator.clipboard?.writeText(addr).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "email address copied to clipboard :)" : `[COPY] ${addr}`}
    </button>
  );
}

// SOURCES #26, siteplan.lidofestival.co.uk footer (pages/000.html:953; 14473552c7557edb.css:1):
// a .5px top rule over a centimetre ruler, ten .cm ticks each holding nine .mm ticks, the 5th one tall
function Ruler() {
  return (
    <div className={css.ruler} data-src="26" aria-hidden>
      <div className={css.topLine} />
      {[...Array(10)].map((_, c) => (
        <div key={c} className={css.cm} style={{ left: `${c * 10}%` }} data-n={c}>
          {[...Array(9)].map((_, m) => <div key={m} className={css.mm} style={{ left: `${(m + 1) * 10}%` }} />)}
        </div>
      ))}
    </div>
  );
}

export default function Chrome({
  releases, about, children,
}: {
  releases: Release[];
  about: { instagram: string; contact: string };
  children: React.ReactNode;
}) {
  const N = releases.length;
  const path = usePathname();
  const router = useRouter();
  const main = useRef<HTMLElement>(null);
  const leaving = useRef(false);
  const vinyl = useRef<VinylHandle | null>(null);

  // SOURCES #05, viscosesyllabus.com S7 (1c85fe7d1ee0de53.js:23): the page goes out to translate(90vw), and
  // navigation waits for it. The new page comes in from 80vw to 0. The first load does not slide. viscosesyllabus
  // takes 1 s each way; here each leg is 240 ms, so no transition on the site runs over 250 ms.
  const go = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (href === path || leaving.current) return;
    leaving.current = true;
    const o = main.current!;
    o.style.transition = "transform 0.24s ease, opacity 0.24s ease";
    o.style.transform = "translate(90vw)";
    // navigate once the out leg has finished, after its last frame, so the route change never lengthens it
    Promise.all(o.getAnimations().map((x) => x.finished)).then(() => setTimeout(() => router.push(href), 0), () => router.push(href));
  };
  useEffect(() => {
    const o = main.current;
    if (!o || !leaving.current) return;
    leaving.current = false;
    scrollTo(0, 0);
    o.style.transition = "none";
    o.style.transform = "translate(80vw)";
    void o.offsetWidth;
    o.style.transition = "transform 0.24s ease, opacity 0.24s ease";
    o.style.transform = "translate(0)";
    // a transformed ancestor breaks position: fixed and sticky inside it, so the transform is dropped once it lands
    const done = () => { o.style.transform = ""; o.style.transition = ""; };
    const t = setTimeout(done, 290);
    return () => clearTimeout(t);
  }, [path]);

  // SOURCES #12: the record view (VinylView.tsx). Until its code has loaded, a request waits for it.
  const open = useCallback((i: number, from: From = null) => {
    if (i < 0 || i >= N) return;
    const go = () => { if (vinyl.current) vinyl.current.open(i, from); else setTimeout(go, 50); };
    go();
  }, [N]);

  return (
    <PanelCtx.Provider value={{ open }}>
      {/* SOURCES #01 onehouse.com header.site-header > nav.site-nav (pages/000.html:478) */}
      <header className={css.top} data-src="01">
        <nav className={css.siteNav} data-src="01">
          {/* SOURCES #02 onehouse.com a.site-nav_logo-wrapper with aria-current */}
          <a className={css.name} data-src="02 05" href={BASE} aria-current={path === BASE ? "page" : undefined} onClick={(e) => go(e, BASE)}>
            DYLAN NEUSTADTER
          </a>
          <Timer />
          {/* SOURCES #04 mestizaestudio.com C3 (pages/004.html:77): words split by "/", current one underlined, the rest at .5 */}
          <div className={css.words} data-src="04">
            {PAGES.map((p, k) => (
              <span key={p.href}>
                {k > 0 && <span className={css.slash}>/</span>}
                <a
                  href={p.href}
                  className={path === p.href ? css.wordOn : css.wordOff}
                  data-src="04 05"
                  aria-current={path === p.href ? "page" : undefined}
                  onClick={(e) => go(e, p.href)}
                >
                  {p.label}
                </a>
              </span>
            ))}
          </div>
        </nav>
      </header>

      <main ref={main} className={css.main} data-src="05">{children}</main>

      {/* home is one fixed stage with nothing below it, so the footer lives on the scrolling pages */}
      {path !== BASE && <footer className={css.footer} data-src="26">
        <Ruler />
        <div className={css.footRow}>
          <span>DYLAN NEUSTADTER, PRODUCER, WRITER, MIXER</span>
          {about.contact && <Email addr={about.contact} />}
          {/* SOURCES #28 viscosejournal.com M3 (pages/001.html:69): the arrow is typed into the link */}
          <a href={about.instagram} target="_blank" rel="noopener" data-src="28">INSTAGRAM →</a>
        </div>
      </footer>}

      <VinylView releases={releases} handle={vinyl} />

      {/* SOURCES #31 the credit rides in the served HTML (siteplan.lidofestival.co.uk 7ceda4973e966175.js:4530) */}
      <div hidden data-src="31" dangerouslySetInnerHTML={{ __html: "<!-- Site Development & Design; waituntilmay -->" }} />
    </PanelCtx.Provider>
  );
}
