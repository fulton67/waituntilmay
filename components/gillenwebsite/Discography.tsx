"use client";
// /gillenwebsite/discography: the plain, complete list. All 36 releases in discography.json order, newest first.
// Hovering a row (desktop) expands its cover in place over its neighbours (expand.ts). On phones the row nearest the
// middle of the screen grows within itself to hold its cover as a square ~40% of the screen wide. A tap on a row opens the release in the record view (VinylView.tsx), from the row's cover. Same
// document throughout: no route change, only the hash is replaced.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rolesOf, caps, no3 } from "./shared";
import { usePanel } from "./Chrome";
import { makeExpander } from "./expand";

// phones: the active row's height change (site.module.css .discoItem[data-active])
const ROW_MS = 200;
import Cover from "./Cover";
import css from "./site.module.css";

// SOURCES #23, viscosesyllabus.com S6 (1c85fe7d1ee0de53.js:23): the order is kept in the alphabetOrdering cookie
const COOKIE = "alphabetOrdering";
const readCookie = (n: string) => document.cookie.split("; ").find((c) => c.startsWith(n + "="))?.split("=")[1];
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export default function Discography({ releases }: { releases: Release[] }) {
  const order = useSyncExternalStore(subscribe, () => (readCookie(COOKIE) === "alphabetical" ? "alphabetical" : "default"), () => "default");
  const setOrder = (o: string) => {
    document.cookie = `${COOKIE}=${o}; path=/gillenwebsite; max-age=31536000; samesite=lax`;
    listeners.forEach((f) => f());
  };
  // SOURCES #24, eilidhduffy.com S14 (7d62584e56caa947.js:2): two selects, and an empty choice shows everything
  const [role, setRole] = useState("");
  const [artist, setArtist] = useState("");
  const roles = useMemo(() => [...new Set(releases.flatMap(rolesOf))].sort(), [releases]);
  const artists = useMemo(() => [...new Set(releases.map((r) => r.artist))].sort((a, b) => a.localeCompare(b)), [releases]);
  const rows = useMemo(() => {
    const all = releases.map((r, i) => ({ r, i }));
    // S6 re-orders in place with localeCompare on the title
    return order === "alphabetical" ? [...all].sort((a, b) => a.r.release.localeCompare(b.r.release)) : all;
  }, [releases, order]);
  const shown = rows.filter(({ r }) => (!role || rolesOf(r).includes(role)) && (!artist || r.artist === artist)).length;

  // a tap on a row opens the record view (VinylView.tsx), the closed sleeve starting on the row's cover
  const { open } = usePanel();
  const list = useRef<HTMLOListElement>(null);
  // ---- covers expanding in place ----
  const exp = useRef<ReturnType<typeof makeExpander> | null>(null);
  const hovered = useRef<string | null>(null);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const log: { id: string; dir: string; ms: number }[] = [];
    const e = (exp.current = makeExpander(el, releases, (x) => log.push(x)));
    // phones: the row nearest the middle of the screen is the active one. It changes only once the page rests
    // (scrollend, or 80 ms with no scroll), never while a finger is down, so the open cover does not jump under it
    let active: string | null = null, idle = 0, touching = false;
    const phone = () => innerWidth < 720;
    const pick = () => {
      if (!phone() || touching) return;
      let best: HTMLElement | null = null, bd = Infinity;
      for (const li of el.querySelectorAll<HTMLElement>("li[data-id]")) {
        if (li.style.display === "none") continue;
        const r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
        if (d < bd) { bd = d; best = li; }
      }
      const id = best?.dataset.id ?? null;
      if (id === active) return;
      // phones: the cover grows inside its own row (data-active, site.module.css), the row taller to fit; the rows
      // above it change height, so the page is scrolled along with them for the length of the change
      el.querySelector(`li[data-active]`)?.removeAttribute("data-active");
      active = id;
      if (!best) return;
      best.setAttribute("data-active", "");
      // its middle is held where it was, so it stays the row nearest the middle of the screen as it grows
      const mid = (r: DOMRect) => r.top + r.height / 2, y0 = mid(best.getBoundingClientRect()), t0 = performance.now();
      const hold = () => {
        const dy = mid(best!.getBoundingClientRect()) - y0;
        if (Math.abs(dy) > 0.5) scrollBy(0, dy);
        if (performance.now() - t0 < ROW_MS + 80) requestAnimationFrame(hold);
      };
      requestAnimationFrame(hold);
    };
    const onScroll = () => { clearTimeout(idle); idle = window.setTimeout(pick, 80); };
    const onDown = () => { touching = true; clearTimeout(idle); };
    const onUp = () => { touching = false; onScroll(); };
    const onResize = () => { e.reset(); el.querySelector("li[data-active]")?.removeAttribute("data-active"); active = null; hovered.current = null; pick(); };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("scrollend", pick);
    addEventListener("touchstart", onDown, { passive: true });
    addEventListener("touchend", onUp, { passive: true });
    addEventListener("touchcancel", onUp, { passive: true });
    addEventListener("resize", onResize);
    // the first active row once the covers have laid out
    const first = window.setTimeout(pick, 300);
    // measurement hook (scripts/gillenwebsite/expand.mjs)
    (window as unknown as { __disco: unknown }).__disco = { open: () => (phone() ? el.querySelectorAll("li[data-active]").length : e.open()), log: () => log, active: () => active };
    return () => {
      clearTimeout(idle); clearTimeout(first);
      removeEventListener("scroll", onScroll); removeEventListener("scrollend", pick);
      removeEventListener("touchstart", onDown); removeEventListener("touchend", onUp); removeEventListener("touchcancel", onUp);
      removeEventListener("resize", onResize);
      e.destroy(); exp.current = null;
    };
  }, [releases]);
  // the list changes order or filter: the open covers' places are stale
  useEffect(() => { exp.current?.reset(); hovered.current = null; window.dispatchEvent(new Event("scroll")); }, [order, role, artist]);
  // desktop: the hovered row
  const enter = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || innerWidth < 720) return;
    const id = e.currentTarget.dataset.id!;
    if (hovered.current && hovered.current !== id) exp.current?.shrink(hovered.current, true);
    hovered.current = id;
    exp.current?.grow(e.currentTarget);
  };
  const leave = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse" || innerWidth < 720) return;
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
    <section className={css.disco} data-src="22">
      {/* SOURCES #22 brian-eno.net: the list takes 66.66%, the right 33.33% holds the controls */}
      <ol ref={list} className={css.discoList} id="titleList" data-src="22 23">
        {rows.map(({ r, i }) => {
          const hide = (role && !rolesOf(r).includes(role)) || (artist && r.artist !== artist);
          return (
            <li key={r.id} data-id={r.id} className={css.discoItem} onPointerEnter={enter} onPointerLeave={leave} data-target={r.release} data-role={rolesOf(r).join("|")} data-artist={r.artist} style={hide ? { display: "none" } : undefined}>
              <a
                href={`#${r.id}`}
                className={css.discoRow}
                data-src="22 12"
                onClick={(e) => { e.preventDefault(); open(i, exp.current?.layerOf(r.id) ?? e.currentTarget.querySelector<HTMLElement>("[data-clip]")); }}
              >
                {/* the text column: 6fr 4.5fr 1fr, title | collaborators and role | year */}
                <span className={css.leftColumn}>
                  <span className={css.discoTitle}><span className={css.discoTitleText}>{r.release}</span></span>
                  <span className={css.discoWho}>{caps(r.artist)} · {caps(r.role)}</span>
                  <span className={css.discoYear}>{r.year}</span>
                </span>
                {/* the cover as a 20 px slice through its middle, half the list column (a third of the screen on desktop,
                    half on phones); expanded, a layer over the list grows out of it (expand.ts) */}
                <span className={css.slice}>
                  <span className={css.sliceClip} data-clip>
                    {r.cover ? <Cover r={r} className={css.sliceImg} sizes="(min-width: 720px) calc(33.33vw - 8px), calc(50vw - 8px)" /> : <span className={css.sliceBlank} />}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      <aside className={css.discoSide} data-src="10">
        <p className={css.label}>DISCOGRAPHY, {releases[releases.length - 1].year}–{releases[0].year}</p>
        <p className={css.label}>{no3(shown)} OF {no3(releases.length)}</p>
        {/* SOURCES #23 the order toggle; SOURCES #32 dauanjacari.com's filter pills (/blog, inline style) */}
        <div className={css.pills} data-src="23 32">
          <button type="button" data-src="23 32" aria-pressed={order === "default"} className={css.pill} onClick={() => setOrder("default")}>YEAR</button>
          <button type="button" data-src="23 32" aria-pressed={order === "alphabetical"} className={css.pill} onClick={() => setOrder("alphabetical")}>A–Z</button>
        </div>
        <div className={css.selects} data-src="24 32">
          {/* the role filter: one pill per role, as dauanjacari.com's category radios (SOURCES #32) */}
          <div>
            <span className={css.label} id="role-label">ROLE</span>
            <div className={css.pills} role="radiogroup" aria-labelledby="role-label" data-src="32">
              {["", ...roles].map((x) => (
                <button key={x || "all"} type="button" role="radio" aria-checked={role === x} className={css.pill} onClick={() => setRole(x)}>{x ? caps(x) : "ALL"}</button>
              ))}
            </div>
          </div>
          <label>
            <span className={css.label}>ARTIST</span>
            <select id="subcategory-select" className={css.select} data-src="24" value={artist} onChange={(e) => setArtist(e.target.value)}>
              <option value="">All</option>
              {artists.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
      </aside>

    </section>
  );
}
