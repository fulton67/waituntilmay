"use client";
// The original About index (restored from 5d0fd85, the original About page's last commit), now the Discography page
// on phones (Discography.tsx picks it under 720 px): every release title in one long list; the title passing the
// middle of the viewport is the active one, underlined, and its cover shows in the corner. Changed from 5d0fd85 only
// where it has to be: it takes the rows the role pills leave (with each release's index) instead of all releases and
// the About text, and its CSS is its own module (about-index.module.css).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { usePanel } from "./Chrome";
import { no3, caps } from "./shared";
import Cover from "./Cover";
import css from "./about-index.module.css";

// Every title is one line at one size (26 px, 17 px on phones). A title wider than its column ends in an ellipsis,
// and on hover (or while it is the active row, on phones) it runs left once at 60 px/s and back. All CSS.

export default function AboutIndex({ rows: list }: { rows: { r: Release; i: number }[] }) {
  const releases = list.map((x) => x.r);
  const { open } = usePanel();
  const [active, setActive] = useState(0);
  const hovering = useRef(false);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);
  const coverRef = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);


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
    <section data-src="20">
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
            onClick={(e) => { e.preventDefault(); open(list[i].i); }}
          >
            <span className={css.indexNo}>{no3(list[i].i + 1)}</span>
            <span className={css.indexTitle} data-title><span className={css.indexTitleText}>{r.artist} — {r.release}</span></span>
            <span className={css.indexMeta}><span data-year>{r.year}</span> <span data-role>{caps(r.role)}</span></span>
          </a>
        ))}
      </div>

      {/* the cover beside the list: all 36 are stacked and the active one is shown by visibility, with no
          transition (shortnotice.studio thumb-mo-image-no-transition, 1b979d7b0875324e.css:1) */}
      <div ref={coverRef} className={css.indexCover} data-src="20" aria-hidden>
        {/* the 1024 file, shown at up to 400 px (min(30vw, 44vh); 34vw on phones) */}
        {releases.map((r, i) => r.cover ? <Cover key={r.id} r={r} className={css.moThumb} sizes="(min-width: 720px) min(30vw, 44vh), 34vw" fixed={1024} eager style={{ visibility: i === active ? "visible" : "hidden" }} /> : null)}
        <p className={css.indexCaption}>{`${no3(list[active].i + 1)} ${releases[active].artist}, ${releases[active].release} [${releases[active].year}]`}</p>
      </div>
      <svg ref={svg} className={css.indexLines} data-src="21" aria-hidden>
        {[0, 1, 2].map((u) => <line key={u} onAnimationEnd={(e) => { e.currentTarget.style.strokeDasharray = "none"; }} />)}
      </svg>
    </section>
  );
}
