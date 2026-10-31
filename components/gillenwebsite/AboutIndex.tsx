"use client";
// /gillenwebsite/about: the About text, then every release title in one long list. The cover of the title under
// the pointer, or of the title passing the middle of the viewport, shows beside the list.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { usePanel } from "./Chrome";
import { coverAt, no3, caps } from "./shared";
import css from "./site.module.css";

// Every title is one line at one size (26 px, 17 px on phones). A title wider than its column ends in an ellipsis,
// and on hover (or while it is the active row, on phones) it runs left once at 60 px/s and back. All CSS.

export default function AboutIndex({ releases, about }: { releases: Release[]; about: { text: string } }) {
  const { open } = usePanel();
  const [active, setActive] = useState(0);
  const [aboutIn, setAboutIn] = useState(false);
  const hovering = useRef(false);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);
  const coverRef = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  // SOURCES #19 gaeawoods.com [data-about]: fades in over opacity .3s ease (d35e915ec50e420e.css:603)
  useEffect(() => { const id = requestAnimationFrame(() => setAboutIn(true)); return () => cancelAnimationFrame(id); }, []);

  // while nothing is hovered, the title nearest the middle of the viewport is the active one
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      if (hovering.current) return;
      const mid = innerHeight / 2;
      let best = 0, bd = Infinity;
      rows.current.forEach((el, i) => {
        if (!el) return;
        const b = el.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // SOURCES #21, gunseli.xyz S4 (e9ccfd632bd8bc93.js:41 kg()): each segment's dash is set to its own length, then
  // draw-line 0.25s ease forwards, the segments 0.08 s apart. It runs from the active title to the cover.
  const place = (i: number) => {
    const el = rows.current[i], cv = coverRef.current, s = svg.current;
    if (!el || !cv || !s || getComputedStyle(cv).display === "none") return null;
    // from the end of the row (the year and role column) to the cover's top left
    const a = (el.lastElementChild ?? el).getBoundingClientRect(), c = cv.getBoundingClientRect();
    const y0 = a.top + a.height / 2, x0 = a.right + 8, xm = Math.max(x0 + 16, c.left - 24), y1 = c.top + 12;
    const pts = [[x0, y0, xm, y0], [xm, y0, xm, y1], [xm, y1, c.left, y1]];
    const lines = [...s.querySelectorAll("line")];
    lines.forEach((o, u) => {
      const [x1, ya, x2, yb] = pts[u];
      o.setAttribute("x1", String(x1)); o.setAttribute("y1", String(ya)); o.setAttribute("x2", String(x2)); o.setAttribute("y2", String(yb));
    });
    return lines;
  };
  useLayoutEffect(() => {
    const lines = place(active);
    lines?.forEach((o, u) => {
      const len = o.getTotalLength();
      o.classList.remove(css.drawing);
      o.style.strokeDasharray = String(len);
      o.style.strokeDashoffset = String(len);
      void o.getBoundingClientRect();
      o.style.animationDelay = `${u * 0.08}s`;
      o.classList.add(css.drawing); // draw-line 0.25s ease forwards
      o.style.opacity = "1";
    });
    // once drawn, the dash is dropped so the line can follow the title as the page scrolls
    const follow = () => place(active);
    addEventListener("scroll", follow, { passive: true });
    return () => removeEventListener("scroll", follow);
  }, [active]);

  return (
    <section className={css.aboutPage} data-src="20">
      {/* SOURCES #19 gaeawoods.com About overlay: pinned, rgba(255,255,255,.825), opacity .3s ease */}
      <div className={`${css.dataAbout} ${aboutIn ? css.dataAboutOpen : ""}`} data-src="19">
        <p className={css.label}>ABOUT</p>
        <p className={css.aboutText}>{about.text}</p>
        <p className={css.label}>PRODUCER · WRITER · MIXER · MULTI-INSTRUMENTALIST · INDEX OF {releases.length} RELEASES BELOW</p>
      </div>

      {/* SOURCES #20 shortnotice.studio client list: <a> items split by ",<br>" at 26px / 31.2px; here each item is
          its own line */}
      <div className={css.index} data-src="20">
        {releases.map((r, i) => (
          <a
            key={r.id}
            data-entry
            ref={(el) => { rows.current[i] = el; }}
            href={`#${r.id}`}
            className={`${css.indexRow} ${i === active ? css.indexOn : ""}`}
            data-src="20 12"
            onMouseEnter={() => { hovering.current = true; setActive(i); }}
            onMouseLeave={() => { hovering.current = false; }}
            onFocus={() => setActive(i)}
            onClick={(e) => { e.preventDefault(); open(i); }}
          >
            <span className={css.indexNo}>{no3(i + 1)}</span>
            <span className={css.indexTitle} data-title><span className={css.indexTitleText}>{r.artist} — {r.release}</span></span>
            <span className={css.indexMeta}><span data-year>{r.year}</span> <span data-role>{caps(r.role)}</span></span>
          </a>
        ))}
      </div>

      {/* the cover beside the list: all 36 are stacked and the active one is shown by visibility, with no
          transition (shortnotice.studio thumb-mo-image-no-transition, 1b979d7b0875324e.css:1) */}
      <div ref={coverRef} className={css.indexCover} data-src="20" aria-hidden>
        {releases.map((r, i) => {
          const src = coverAt(r, 1080);
          // eslint-disable-next-line @next/next/no-img-element -- 1080 copies, stacked; shown at about 400 px
          return src ? <img key={r.id} src={src} alt="" width={1080} height={1080} className={css.moThumb} style={{ visibility: i === active ? "visible" : "hidden" }} /> : null;
        })}
        <p className={css.indexCaption}>{`${no3(active + 1)} ${releases[active].artist}, ${releases[active].release} [${releases[active].year}]`}</p>
      </div>
      <svg ref={svg} className={css.indexLines} data-src="21" aria-hidden>
        {[0, 1, 2].map((u) => <line key={u} onAnimationEnd={(e) => { e.currentTarget.style.strokeDasharray = "none"; }} />)}
      </svg>
    </section>
  );
}
