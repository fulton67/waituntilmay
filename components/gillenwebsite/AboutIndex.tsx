"use client";
// /gillenwebsite/about: the About text, then every release title in one long list. The cover of the title under
// the pointer, or of the title passing the middle of the viewport, shows beside the list.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { usePanel } from "./Chrome";
import { coverAt, no3, caps } from "./shared";
import css from "./site.module.css";

// Every entry sits on one line at any width. A line wider than the column has its artist — title (and comma) set
// to the one font-size that fits it, never under FLOOR px; past the floor the title ends in an ellipsis and its
// year and role stay. The number, year and role keep their superscript size. Measured before the list is shown.
// Some roles run to 380 px of capitals, so the title always keeps TITLE_MIN of the line (or its whole width, if less)
// at the floor; only then does the role itself end in an ellipsis.
const FLOOR = 13, TITLE_MIN = 0.4, SLACK = 1;
// is the title's text wider than its box (the box clips it), to the fraction of a pixel
const clips = (t: HTMLElement) => { const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect().width > t.getBoundingClientRect().width + 0.01; };
const outer = (e: HTMLElement) => { const c = getComputedStyle(e); return e.getBoundingClientRect().width + parseFloat(c.marginLeft) + parseFloat(c.marginRight); };
function fitLines(list: HTMLElement) {
  const rows = [...list.querySelectorAll<HTMLAnchorElement>("a[data-entry]")];
  // read every line at the base size with nothing shrinking, then write, then check what still clips
  list.setAttribute("data-measuring", "");
  rows.forEach((a) => { a.style.removeProperty("--fit"); a.style.removeProperty("--role-max"); });
  const base = rows.length ? parseFloat(getComputedStyle(rows[0]).fontSize) : 0;
  const m = rows.map((a) => {
    const scaled = [...a.querySelectorAll<HTMLElement>("[data-scale]")].reduce((w, e) => w + e.getBoundingClientRect().width, 0);
    // fractional widths: a line over by a fraction of a pixel still gets an ellipsis
    const natural = [...a.children].reduce((w, e) => w + outer(e as HTMLElement), 0);
    return { a, col: a.clientWidth - SLACK, natural, scaled };
  });
  list.removeAttribute("data-measuring");
  for (const { a, col, natural, scaled } of m) {
    if (natural <= col) { a.removeAttribute("data-fit"); continue; }
    // the scaled part's width is proportional to its font-size; the rest of the line stays as it is
    const f = Math.max(FLOOR, Math.floor(((base * (col - (natural - scaled))) / scaled) * 10) / 10);
    a.style.setProperty("--fit", `${f}px`);
    a.setAttribute("data-fit", String(f));
  }
  // rounding can leave a line a fraction over: step those down 0.2 px at a time, to the floor
  for (let pass = 0; pass < 10; pass++) {
    const over = rows.filter((a) => clips(a.querySelector<HTMLElement>("[data-title]")!) && Number(a.dataset.fit ?? base) > FLOOR);
    if (!over.length) break;
    over.forEach((a) => { const f = Math.max(FLOOR, +(Number(a.dataset.fit ?? base) - 0.2).toFixed(1)); a.style.setProperty("--fit", `${f}px`); a.setAttribute("data-fit", String(f)); });
  }
  // at the floor and still too wide: the title is ellipsised, down to TITLE_MIN of the line, then the role is
  const clipped = rows.filter((a) => clips(a.querySelector<HTMLElement>("[data-title]")!));
  const roleCuts = clipped.map((a) => {
    const t = a.querySelector<HTMLElement>("[data-title]")!, role = a.querySelector<HTMLElement>("[data-role]")!;
    const want = Math.min(t.scrollWidth, a.clientWidth * TITLE_MIN);
    if (want <= t.clientWidth + 0.5) return null;
    // the role gets what the line has left once the title has its share and the rest their own widths
    const rest = [...a.children].filter((e) => e !== t && e !== role).reduce((w, e) => w + outer(e as HTMLElement), 0);
    const ml = parseFloat(getComputedStyle(role).marginLeft);
    return { a, max: Math.max(0, a.clientWidth - SLACK - want - rest - ml) };
  });
  roleCuts.forEach((c) => c && c.a.style.setProperty("--role-max", `${Math.floor(c.max)}px`));
  // whatever is cut shows whole on hover; the panel shows everything too
  rows.forEach((a) => {
    const t = a.querySelector<HTMLElement>("[data-title]")!, role = a.querySelector<HTMLElement>("[data-role]")!;
    const cut = clips(t), roleCut = clips(role);
    a.toggleAttribute("data-ellipsis", cut);
    a.toggleAttribute("data-role-ellipsis", roleCut);
    if (cut || roleCut) a.title = `${t.textContent}, ${a.querySelector("[data-year]")!.textContent} ${role.textContent}`;
    else a.removeAttribute("title");
  });
}

export default function AboutIndex({ releases, about }: { releases: Release[]; about: { text: string } }) {
  const { open } = usePanel();
  const [active, setActive] = useState(0);
  const [aboutIn, setAboutIn] = useState(false);
  const hovering = useRef(false);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);
  const coverRef = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // fit before the first paint, again once the fonts are in, then show the list; refit on resize and font loads
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const fit = () => fitLines(el);
    fit();
    let shown = false;
    const show = () => { if (shown) return; shown = true; fit(); el.setAttribute("data-fitted", ""); };
    document.fonts.ready.then(show);
    const late = setTimeout(show, 1500);
    document.fonts.addEventListener("loadingdone", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => { clearTimeout(late); document.fonts.removeEventListener("loadingdone", fit); ro.disconnect(); };
  }, []);

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
    // from the end of the row (after the year and role) to the cover's top left
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
      <div ref={list} className={css.index} data-src="20">
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
            <span className={css.indexTitle} data-title data-scale>{r.artist} — {r.release}</span>
            <span className={css.indexComma} data-scale>,</span>
            <span className={css.indexMeta} data-year>{r.year}</span>
            <span className={`${css.indexMeta} ${css.indexRole}`} data-role>{caps(r.role)}</span>
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
