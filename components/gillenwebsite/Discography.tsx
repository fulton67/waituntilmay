"use client";
// /gillenwebsite/discography: the role pills, then every release as one line of the index (the old About page's list,
// SOURCES #20): number, artist — release, year and role; one size, no wrapping, a cut title ends in an ellipsis.
// Desktop: hovering a row underlines it and expands its cover in place over its neighbours (expand.ts); a click opens
// the record view (VinylView.tsx) from the cover. Phones: the original About page's index, restored from git
// (AboutIndex.tsx): normal page scroll, the title nearest the middle underlined, its cover the small square in the
// corner. A tap opens the record view.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rolesOf, caps, no3 } from "./shared";
import { usePanel } from "./Chrome";
import { makeExpander } from "./expand";
import Cover from "./Cover";
import AboutIndex from "./AboutIndex";
import css from "./site.module.css";

// the role pills, each with what it matches in a release's roles (its own and its tracks')
const ROLES: { label: string; test: (role: string) => boolean }[] = [
  { label: "PRODUCER", test: (x) => x === "Producer" || x === "Executive Producer" },
  { label: "WRITER", test: (x) => x === "Writer" },
  { label: "ENGINEER", test: (x) => x === "Engineer" },
  { label: "MIXER", test: (x) => x === "Mixer" },
  { label: "CO-PRODUCER", test: (x) => x === "Co-Producer" || x === "Additional Production" },
  { label: "ASSISTANT", test: (x) => /assistant/i.test(x) },
];
const matches = (r: Release, pill: string) => !pill || rolesOf(r).some(ROLES.find((p) => p.label === pill)!.test);
const phone = () => innerWidth < 720;
const SMALL = "(max-width: 719.98px)";
const subscribeSmall = (f: () => void) => { const m = matchMedia(SMALL); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };

export default function Discography({ releases }: { releases: Release[] }) {
  const { open } = usePanel();
  const [pill, setPill] = useState("");
  const counts = useMemo(() => Object.fromEntries(ROLES.map((p) => [p.label, releases.filter((r) => matches(r, p.label)).length])), [releases]);
  const shown = useMemo(() => releases.map((r, i) => ({ r, i })).filter(({ r }) => matches(r, pill)), [releases, pill]);

  // phones (under 720 px): the original About index's list and scroll, restored (AboutIndex.tsx); desktop: this list
  const small = useSyncExternalStore(subscribeSmall, () => matchMedia(SMALL).matches, () => false);
  const list = useRef<HTMLOListElement>(null);
  const exp = useRef<ReturnType<typeof makeExpander> | null>(null);
  const hovered = useRef<string | null>(null);
  // ---- the arrow marker (SOURCES #21, restored from the original About index, 5d0fd85 AboutIndex.tsx): three segments
  // from the active row to its cover, drawn with gunseli.xyz's draw-line 0.25s ease, 0.08 s apart. On desktop the
  // active row is the hovered one and its cover is the one expanding over the list (expand.ts) ----
  const svg = useRef<SVGSVGElement>(null);
  const marked = useRef<HTMLElement | null>(null);
  const place = (li: HTMLElement) => {
    const s = svg.current, id = li.dataset.id!, c = exp.current?.boxOf(id);
    if (!s || !c) return null;
    // from the end of the row's title to the cover's top left
    const a = (li.querySelector("[data-title] > span") ?? li).getBoundingClientRect();
    const y0 = a.top + a.height / 2, x0 = a.right + 8, xm = Math.max(x0 + 16, c.left - 24), y1 = c.top + 12;
    const pts = [[x0, y0, xm, y0], [xm, y0, xm, y1], [xm, y1, c.left, y1]];
    const lines = [...s.querySelectorAll("line")];
    lines.forEach((o, u) => {
      const [x1, ya, x2, yb] = pts[u];
      o.setAttribute("x1", String(x1)); o.setAttribute("y1", String(ya)); o.setAttribute("x2", String(x2)); o.setAttribute("y2", String(yb));
    });
    return lines;
  };
  const mark = (li: HTMLElement | null) => {
    marked.current = li;
    const lines = li ? place(li) : null;
    if (!lines) { svg.current?.querySelectorAll("line").forEach((o) => { o.classList.remove(css.drawing); o.style.opacity = "0"; }); return; }
    lines.forEach((o, u) => {
      const len = o.getTotalLength();
      o.classList.remove(css.drawing);
      o.style.strokeDasharray = String(len);
      o.style.strokeDashoffset = String(len);
      void o.getBoundingClientRect();
      o.style.animationDelay = `${u * 0.08}s`;
      o.classList.add(css.drawing); // draw-line 0.25s ease forwards
      o.style.opacity = "1";
    });
  };
  // once drawn, the dash is dropped (onAnimationEnd) so the line can follow the row as the page scrolls
  useEffect(() => {
    const follow = () => { if (marked.current) place(marked.current); };
    addEventListener("scroll", follow, { passive: true });
    return () => removeEventListener("scroll", follow);
  });
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const log: { id: string; dir: string; ms: number }[] = [];
    const e = (exp.current = makeExpander(el, releases, (x) => log.push(x)));
    // measurement hook (scripts/gillenwebsite/disco.mjs); phones use the About index's own (AboutIndex.tsx)
    (window as unknown as { __disco: unknown }).__disco = { open: () => e.open(), log: () => log, phone: false };
    return () => { e.destroy(); exp.current = null; };
  }, [releases, small]);
  // the filter changes: the open covers' places are stale
  useEffect(() => { exp.current?.reset(); hovered.current = null; mark(null); }, [pill]);
  // desktop: the hovered row
  const enter = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    if (hovered.current && hovered.current !== id) exp.current?.shrink(hovered.current, true);
    hovered.current = id;
    list.current?.querySelector("li[data-active]")?.removeAttribute("data-active");
    e.currentTarget.setAttribute("data-active", "");
    exp.current?.grow(e.currentTarget);
    mark(e.currentTarget);
  };
  const leave = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    // leaving a row for the next one: the next row's enter hands off; leaving the list: it shrinks at once
    const next = (e.relatedTarget as HTMLElement | null)?.closest?.("li[data-id]");
    if (hovered.current === id) hovered.current = null;
    e.currentTarget.removeAttribute("data-active");
    exp.current?.shrink(id, !!next);
    if (!next) mark(null);
  };

  // a #<release-id> on arrival opens that release
  useEffect(() => {
    const i = releases.findIndex((r) => r.id === decodeURIComponent(location.hash.slice(1)));
    if (i >= 0) open(i, list.current?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(releases[i].id)}"] [data-clip]`) ?? null);
  }, [releases, open]);

  return (
    <section className={css.disco} data-src="20">
      {/* SOURCES #32 dauanjacari.com's filter pills: one role at a time, each with how many releases it holds */}
      <div className={css.pills} role="radiogroup" aria-label="Role" data-src="32">
        {["", ...ROLES.map((p) => p.label)].map((x) => (
          <button key={x || "all"} type="button" role="radio" aria-checked={pill === x} className={css.pill} data-pill={x || "ALL"} onClick={() => setPill(pill === x ? "" : x)}>
            {x || "ALL"} <span className={css.pillCount}>{x ? counts[x] : releases.length}</span>
          </button>
        ))}
      </div>

      {/* SOURCES #20 shortnotice.studio client list, one item a line at 26px / 31.2px (17px / 22px on phones) */}
      {small ? <AboutIndex key={pill} rows={shown} /> : <ol ref={list} className={css.index} data-src="20 22">
        {shown.map(({ r, i }) => (
          <li key={r.id} id={`row-${r.id}`} data-id={r.id} className={css.indexItem} onPointerEnter={enter} onPointerLeave={leave}>
            <a
              href={`#${r.id}`}
              className={css.indexRow}
              data-entry
              data-src="20 12"
              onClick={(e) => { e.preventDefault(); open(i, exp.current?.layerOf(r.id) ?? e.currentTarget.querySelector<HTMLElement>("[data-clip]")); }}
            >
              <span className={css.indexNo}>{no3(i + 1)}</span>
              <span className={css.indexTitle} data-title><span className={css.indexTitleText}>{r.artist} — {r.release}</span></span>
              <span className={css.indexMeta}><span data-year>{r.year}</span> <span data-role>{caps(r.role)}</span></span>
              {/* the cover as a slice through its middle; desktop: hovered, a layer over the list grows out of it
                  (expand.ts); phones: the active row shows it whole, a square in the row */}
              <span className={css.slice}>
                <span className={css.sliceClip} data-clip>
                  {r.cover ? <Cover r={r} className={css.sliceImg} sizes="(min-width: 720px) 18vw, 40vw" /> : <span className={css.sliceBlank} />}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>}

      {/* desktop only: the arrow marker, and the footer index (SOURCES #20c): every index number with its cover, the
          items running on with "," between them; each links to its row */}
      {!small && <svg ref={svg} className={css.indexLines} data-marker data-src="21" aria-hidden>
        {[0, 1, 2].map((u) => <line key={u} onAnimationEnd={(e) => { e.currentTarget.style.strokeDasharray = "none"; }} />)}
      </svg>}
      {!small && (
        <p className={css.footIndex} data-src="20" aria-label="Index">
          {shown.map(({ r, i }, k) => (
            <span key={r.id} className={css.footItem} data-footer-index={i + 1}>
              <a href={`#row-${r.id}`} aria-label={`${i + 1}, ${r.artist}, ${r.release}`} onClick={(e) => {
                e.preventDefault();
                const li = document.getElementById(`row-${r.id}`);
                li?.scrollIntoView({ block: "center" });
                list.current?.querySelector("li[data-active]")?.removeAttribute("data-active");
                li?.setAttribute("data-active", "");
              }}>
                {i + 1}&nbsp;{r.cover ? <Cover r={r} className={css.footThumb} sizes="1em" fixed={512} /> : <span className={css.footThumb} />}
              </a>
              {k < shown.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
