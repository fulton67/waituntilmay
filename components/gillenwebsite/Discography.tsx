"use client";
// /gillenwebsite/discography: the role pills, then every release as one line of the index (the old About page's list,
// SOURCES #20): number, artist — release, year and role; one size, no wrapping, a cut title ends in an ellipsis.
// Desktop: hovering a row underlines it and expands its cover in place over its neighbours (expand.ts); a click opens
// the record view (VinylView.tsx) from the cover. Phones: the page scrolls as any page does, nothing here listens to
// touch or moves the page. When a scroll ends (scrollend, or 100 ms after the last scroll event where scrollend is
// missing), the row across the middle of the screen becomes the active one: underlined, its cover a square inside
// its own row. A tap opens the record view.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rolesOf, caps, no3 } from "./shared";
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
const phone = () => innerWidth < 720;

export default function Discography({ releases }: { releases: Release[] }) {
  const { open } = usePanel();
  const [pill, setPill] = useState("");
  const counts = useMemo(() => Object.fromEntries(ROLES.map((p) => [p.label, releases.filter((r) => matches(r, p.label)).length])), [releases]);
  const shown = useMemo(() => releases.map((r, i) => ({ r, i })).filter(({ r }) => matches(r, pill)), [releases, pill]);

  const list = useRef<HTMLOListElement>(null);
  const exp = useRef<ReturnType<typeof makeExpander> | null>(null);
  const hovered = useRef<string | null>(null);
  const pickRef = useRef<() => void>(() => {});
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const log: { id: string; dir: string; ms: number }[] = [];
    const e = (exp.current = makeExpander(el, releases, (x) => log.push(x)));
    // phones: the active row is the one across the middle of the screen; the one already active is kept while it
    // still covers the middle, so its own growth never hands the role to a neighbour
    let active: string | null = null;
    const pick = () => {
      if (!phone()) return;
      const mid = innerHeight / 2, rows = [...el.querySelectorAll<HTMLElement>("li[data-id]")];
      const cur = rows.find((li) => li.dataset.id === active);
      if (cur) { const r = cur.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) return; }
      let best: HTMLElement | null = null, bd = Infinity;
      for (const li of rows) {
        const r = li.getBoundingClientRect(), d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (d < bd) { bd = d; best = li; }
      }
      if (!best || best.dataset.id === active) return;
      el.querySelector("li[data-active]")?.removeAttribute("data-active");
      best.setAttribute("data-active", "");
      active = best.dataset.id!;
    };
    pickRef.current = pick;
    // scrollend where the browser has it; otherwise 100 ms after the last scroll event
    const hasEnd = "onscrollend" in window;
    let t = 0;
    const onScroll = () => { clearTimeout(t); t = window.setTimeout(pick, 100); };
    if (hasEnd) addEventListener("scrollend", pick); else addEventListener("scroll", onScroll, { passive: true });
    const first = window.setTimeout(pick, 300);
    // measurement hook (scripts/gillenwebsite/disco.mjs)
    (window as unknown as { __disco: unknown }).__disco = { open: () => (phone() ? el.querySelectorAll("li[data-active]").length : e.open()), log: () => log, active: () => active, scrollend: hasEnd };
    return () => {
      clearTimeout(t); clearTimeout(first);
      if (hasEnd) removeEventListener("scrollend", pick); else removeEventListener("scroll", onScroll);
      e.destroy(); exp.current = null;
    };
  }, [releases]);
  // the filter changes: the open covers' places are stale, and the active row may be gone
  useEffect(() => { exp.current?.reset(); hovered.current = null; pickRef.current(); }, [pill]);
  // desktop: the hovered row
  const enter = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    if (hovered.current && hovered.current !== id) exp.current?.shrink(hovered.current, true);
    hovered.current = id;
    list.current?.querySelector("li[data-active]")?.removeAttribute("data-active");
    e.currentTarget.setAttribute("data-active", "");
    exp.current?.grow(e.currentTarget);
  };
  const leave = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || phone()) return;
    const id = e.currentTarget.dataset.id!;
    // leaving a row for the next one: the next row's enter hands off; leaving the list: it shrinks at once
    const next = (e.relatedTarget as HTMLElement | null)?.closest?.("li[data-id]");
    if (hovered.current === id) hovered.current = null;
    e.currentTarget.removeAttribute("data-active");
    exp.current?.shrink(id, !!next);
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
      <ol ref={list} className={css.index} data-src="20 22">
        {shown.map(({ r, i }) => (
          <li key={r.id} data-id={r.id} className={css.indexItem} onPointerEnter={enter} onPointerLeave={leave}>
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
      </ol>
    </section>
  );
}
