"use client";
// /gillenwebsite/discography: About and the discography on one page (/gillenwebsite/about redirects here). From the
// top: three timestamps (the first credit, the most recent credit, now; each in the viewer's zone with its UTC
// offset), the About text, the role pills, every index number inline with its cover, then the full list.
// Desktop: hovering a row expands its cover in place over its neighbours (expand.ts). Phones: the page scrolls as
// any page does; once it rests, the row across the middle of the screen is the active one and holds its cover as a
// 40vw square inside its own row. A click or tap opens the release in the record view (VinylView.tsx), from its
// cover. Same document throughout: no route change, only the hash is replaced.
import { useEffect, useMemo, useRef, useState } from "react";
import { creditDates, type Release } from "@/lib/gillenwebsite/discography";
import { rolesOf, caps, pad2 } from "./shared";
import { usePanel } from "./Chrome";
import { makeExpander } from "./expand";
import Cover from "./Cover";
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

// "09.11.2018 00:00:00 UTC−08:00": a date and time in the viewer's zone, and that zone's offset on that day
const stamp = (d: Date) => {
  const o = -d.getTimezoneOffset(), a = Math.abs(o);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} UTC${o < 0 ? "−" : "+"}${pad2(Math.floor(a / 60))}:${pad2(a % 60)}`;
};
// a release date, at midnight where the viewer is
const day = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

const phone = () => innerWidth < 720;

export default function Discography({ releases, about }: { releases: Release[]; about: { text: string } }) {
  const { open } = usePanel();
  const [pill, setPill] = useState("");
  const counts = useMemo(() => Object.fromEntries(ROLES.map((p) => [p.label, releases.filter((r) => matches(r, p.label)).length])), [releases]);
  const shown = useMemo(() => releases.map((r, i) => ({ r, i })).filter(({ r }) => matches(r, pill)), [releases, pill]);

  // ---- the timestamps: written once the viewer's zone is known, the third on each second's turn ----
  const stamps = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    const [a, b, c] = stamps.current;
    if (a) a.textContent = stamp(day(creditDates.first.date));
    if (b) b.textContent = stamp(day(creditDates.latest.date));
    let t = 0;
    const tick = () => { if (c) c.textContent = stamp(new Date()); t = window.setTimeout(tick, 1000 - (Date.now() % 1000)); };
    tick();
    return () => clearTimeout(t);
  }, []);

  // ---- the list ----
  const list = useRef<HTMLOListElement>(null);
  const exp = useRef<ReturnType<typeof makeExpander> | null>(null);
  const hovered = useRef<string | null>(null);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const log: { id: string; dir: string; ms: number }[] = [];
    const e = (exp.current = makeExpander(el, releases, (x) => log.push(x)));
    // phones: once the page rests (scrollend, or 80 ms with no scroll where scrollend is missing), the row across
    // the middle of the screen (else the nearest) is the active one. It grows downward from where it is: the rows
    // above it change height too, so the page is moved by the difference in the same frame, once.
    let active: string | null = null, idle = 0;
    const pick = () => {
      if (!phone()) return;
      const mid = innerHeight / 2;
      let best: HTMLElement | null = null, bd = Infinity;
      for (const li of el.querySelectorAll<HTMLElement>("li[data-id]")) {
        const r = li.getBoundingClientRect(), d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (d < bd) { bd = d; best = li; }
      }
      const id = best?.dataset.id ?? null;
      if (!best || id === active) return;
      const y0 = best.getBoundingClientRect().top;
      el.querySelector("li[data-active]")?.removeAttribute("data-active");
      best.setAttribute("data-active", "");
      active = id;
      const dy = best.getBoundingClientRect().top - y0;
      if (dy) scrollBy(0, dy);
    };
    const onScroll = () => { clearTimeout(idle); idle = window.setTimeout(pick, 80); };
    const onEnd = () => { clearTimeout(idle); pick(); };
    const onResize = () => {
      e.reset(); hovered.current = null;
      if (!phone()) { el.querySelector("li[data-active]")?.removeAttribute("data-active"); active = null; } else pick();
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("scrollend", onEnd);
    addEventListener("resize", onResize);
    const first = window.setTimeout(pick, 300);
    // measurement hook (scripts/gillenwebsite/merged.mjs)
    (window as unknown as { __disco: unknown }).__disco = { open: () => (phone() ? el.querySelectorAll("li[data-active]").length : e.open()), log: () => log, active: () => active, pick };
    return () => {
      clearTimeout(idle); clearTimeout(first);
      removeEventListener("scroll", onScroll); removeEventListener("scrollend", onEnd); removeEventListener("resize", onResize);
      e.destroy(); exp.current = null;
    };
  }, [releases]);
  // the filter changes: the open covers' places are stale, and the active row may be gone
  useEffect(() => {
    exp.current?.reset(); hovered.current = null;
    (window as unknown as { __disco?: { pick: () => void } }).__disco?.pick();
  }, [pill]);
  // desktop: the hovered row
  const enter = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    if (hovered.current && hovered.current !== id) exp.current?.shrink(hovered.current, true);
    hovered.current = id;
    exp.current?.grow(e.currentTarget);
  };
  const leave = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    // leaving a row for the next one: the next row's enter hands off; leaving the list: it shrinks at once
    const next = (e.relatedTarget as HTMLElement | null)?.closest?.("li[data-id]");
    if (hovered.current === id) hovered.current = null;
    exp.current?.shrink(id, !!next);
  };

  // a #<release-id> on arrival opens that release
  useEffect(() => {
    const i = releases.findIndex((r) => r.id === decodeURIComponent(location.hash.slice(1)));
    if (i >= 0) open(i, list.current?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(releases[i].id)}"] [data-clip]`) ?? null);
  }, [releases, open]);

  return (
    <section className={css.merged}>
      {/* the first credit, the most recent, and now */}
      <div className={css.stamps}>
        {["FIRST CREDIT", "LATEST CREDIT", "NOW"].map((l, k) => (
          <p key={l} className={css.stampLine}><span ref={(x) => { stamps.current[k] = x; }} className={css.stampText} data-stamp={k} /><span className={css.stampLabel}>{l}</span></p>
        ))}
      </div>

      {/* SOURCES #19 gaeawoods.com [data-about] text */}
      <p className={css.mergedAbout} data-src="19">{about.text}</p>

      {/* SOURCES #32 dauanjacari.com's filter pills: one role at a time, each with how many releases it holds */}
      <div className={css.pills} role="radiogroup" aria-label="Role" data-src="32">
        {["", ...ROLES.map((p) => p.label)].map((x) => (
          <button key={x || "all"} type="button" role="radio" aria-checked={pill === x} className={css.pill} data-pill={x || "ALL"} onClick={() => setPill(pill === x ? "" : x)}>
            {x || "ALL"} <span className={css.pillCount}>{x ? counts[x] : releases.length}</span>
          </button>
        ))}
      </div>

      {/* SOURCES #20 shortnotice.studio client list, "," between items: every index number with its cover */}
      <p className={css.inline} data-src="20">
        {shown.map(({ r, i }, k) => (
          <span key={r.id} className={css.inlineItem} data-inline={i + 1}>
            <a href={`#${r.id}`} onClick={(e) => { e.preventDefault(); open(i, e.currentTarget.querySelector<HTMLElement>("img")); }} aria-label={`${r.artist}, ${r.release}`}>
              {i + 1}&nbsp;{r.cover ? <Cover r={r} className={css.inlineThumb} sizes="1em" fixed={512} /> : <span className={css.inlineThumb} />}
            </a>
            {k < shown.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>

      <ol ref={list} className={css.mList} data-src="22">
        {shown.map(({ r, i }) => (
          <li key={r.id} data-id={r.id} className={css.mItem} onPointerEnter={enter} onPointerLeave={leave}>
            <a
              href={`#${r.id}`}
              className={css.mRow}
              data-src="22 12"
              onClick={(e) => { e.preventDefault(); open(i, exp.current?.layerOf(r.id) ?? e.currentTarget.querySelector<HTMLElement>("[data-clip]")); }}
            >
              <span className={css.mText}>
                <span className={css.mNo}>{i + 1}</span>
                <span className={css.mTitle}><span className={css.mTitleText}>{r.artist} — {r.release}</span></span>
                <span className={css.mYear}>{r.year}</span>
                <span className={css.mRole}>{caps(r.role)}</span>
              </span>
              {/* the cover as a slice through its middle; desktop: expanded, a layer over the list grows out of it
                  (expand.ts); phones: the active row's slice opens to the whole square */}
              <span className={css.slice}>
                <span className={css.sliceClip} data-clip>
                  {r.cover ? <Cover r={r} className={css.sliceImg} sizes="(min-width: 720px) calc(50vw - 28px), 40vw" /> : <span className={css.sliceBlank} />}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
