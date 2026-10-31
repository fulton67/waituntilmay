"use client";
// /gillenwebsite/discography: the plain, complete list. All 36 releases in discography.json order, newest first.
// A tap on a row expands its cover in place: the slice itself grows to the top of the screen (the left side, full
// height, on desktop) with the release's info sliding up under it, and closing runs the same transform back into
// the row. Same document throughout: no route change, only the hash is replaced.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { coverAt, rolesOf, caps, no3, pad2 } from "./shared";
import css from "./site.module.css";

// SOURCES #23, viscosesyllabus.com S6 (1c85fe7d1ee0de53.js:23): the order is kept in the alphabetOrdering cookie
const COOKIE = "alphabetOrdering";
const readCookie = (n: string) => document.cookie.split("; ").find((c) => c.startsWith(n + "="))?.split("=")[1];
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export const EXPAND_MS = 240, INFO_DELAY_MS = 60, CLOSE_MS = 200, INFO_OUT_MS = 160;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Box = { x: number; y: number; w: number; h: number };
// Keyframes for the slice's clip box (translate + scale from its row rect `from` to `to`) and for the image inside
// it, which is counter-scaled vertically (scaleY = sx / sy) so the cover never stretches: the crop opens from the
// slice's middle strip to the whole square. Sampled with the easing baked in, so both run on the compositor.
function keyframes(row: Box, from: Box, to: Box, n = 24) {
  const clip: Keyframe[] = [], img: Keyframe[] = [];
  for (let k = 0; k <= n; k++) {
    const e = easeOut(k / n);
    const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e;
    const sx = (from.w + (to.w - from.w) * e) / row.w, sy = (from.h + (to.h - from.h) * e) / row.h;
    clip.push({ transform: `translate(${x - row.x}px, ${y - row.y}px) scale(${sx}, ${sy})` });
    img.push({ transform: `scaleY(${sx / sy})` });
  }
  return { clip, img };
}
// where the cover lands: the full width at the top on phones; the left side, full height, on desktop
const target = (): Box => {
  if (innerWidth < 720) return { x: 0, y: 0, w: innerWidth, h: innerWidth };
  const s = Math.min(innerHeight, innerWidth - 360); // full height, leaving at least 360 px for the info
  return { x: 0, y: 0, w: s, h: s };
};

type Open = { i: number; clip: HTMLElement; img: HTMLElement | null; row: Box; instant: boolean };

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

  // ---- expand in place ----
  const [open, setOpen] = useState<Open | null>(null);
  const [closing, setClosing] = useState(false);
  const info = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const busy = useRef(false);
  const prime = (clip: HTMLElement | null) => {
    // promote the cover to its own layer before it moves
    if (!clip) return;
    clip.style.willChange = "transform";
    (clip.firstElementChild as HTMLElement | null)?.style.setProperty("will-change", "transform");
  };
  const expand = useCallback((i: number, li: HTMLElement | null, instant = false) => {
    if (busy.current || !li) return;
    const clip = li.querySelector<HTMLElement>("[data-clip]");
    if (!clip) return;
    prime(clip);
    const b = clip.getBoundingClientRect();
    busy.current = true;
    setClosing(false);
    setOpen({ i, clip, img: clip.firstElementChild as HTMLElement | null, row: { x: b.left, y: b.top, w: b.width, h: b.height }, instant });
    history.replaceState(history.state, "", `#${releases[i].id}`);
  }, [releases]);

  // start the expansion in the same frame React commits the open state: cover and info together, 240 ms in all
  useLayoutEffect(() => {
    if (!open || closing) return;
    const { clip, img, row, instant } = open;
    const k = keyframes(row, row, target());
    const opts = { duration: instant ? 0 : EXPAND_MS, fill: "forwards" as const };
    anims.current = [
      clip.animate(k.clip, opts),
      ...(img ? [img.animate(k.img, opts)] : []),
      ...(info.current ? [info.current.animate([{ opacity: 0, transform: "translateY(32px)" }, { opacity: 1, transform: "none" }], { duration: instant ? 0 : EXPAND_MS - INFO_DELAY_MS, delay: instant ? 0 : INFO_DELAY_MS, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)", fill: "both" })] : []),
    ];
    Promise.all(anims.current.map((a) => a.finished)).then(() => { busy.current = false; }, () => { busy.current = false; });
  }, [open, closing]);

  const close = useCallback(() => {
    if (!open || closing) return;
    anims.current.forEach((a) => a.finish());
    busy.current = true;
    setClosing(true);
    const { clip, img, row } = open;
    const k = keyframes(row, target(), row);
    const opts = { duration: CLOSE_MS, fill: "forwards" as const };
    const out = [
      clip.animate(k.clip, opts),
      ...(img ? [img.animate(k.img, opts)] : []),
      ...(info.current ? [info.current.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(32px)" }], { duration: INFO_OUT_MS, easing: "ease-in", fill: "forwards" })] : []),
    ];
    history.replaceState(history.state, "", location.pathname + location.search);
    Promise.all(out.map((a) => a.finished)).then(() => {
      [...anims.current, ...out].forEach((a) => a.cancel());
      anims.current = [];
      clip.style.willChange = "";
      img?.style.removeProperty("will-change");
      busy.current = false;
      setOpen(null);
      setClosing(false);
    });
  }, [open, closing]);

  // while open: Escape closes, a swipe down closes (phones), the page underneath does not scroll
  useEffect(() => {
    if (!open) return;
    let start: { x: number; y: number } | null = null;
    const inInfo = (t: EventTarget | null) => !!info.current && t instanceof Node && info.current.contains(t);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if ([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && !inInfo(e.target)) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => { if (!inInfo(e.target)) e.preventDefault(); };
    const onTouchMove = (e: TouchEvent) => { if (!inInfo(e.target)) e.preventDefault(); };
    const onDown = (e: PointerEvent) => { start = inInfo(e.target) && info.current!.scrollTop > 0 ? null : { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (e.pointerType !== "mouse" && dy > 60 && Math.abs(dx) < dy) close();
    };
    addEventListener("keydown", onKey);
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("touchmove", onTouchMove, { passive: false });
    addEventListener("pointerdown", onDown, true);
    addEventListener("pointerup", onUp, true);
    addEventListener("resize", close);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("pointerdown", onDown, true);
      removeEventListener("pointerup", onUp, true);
      removeEventListener("resize", close);
    };
  }, [open, close]);

  // a #<release-id> on arrival opens that release already expanded
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const i = releases.findIndex((r) => r.id === decodeURIComponent(location.hash.slice(1)));
    if (i >= 0) expand(i, list.current?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(releases[i].id)}"]`) ?? null, true);
  }, [releases, expand]);

  const r = open ? releases[open.i] : null;
  const tracks = r ? (r.tracks.length ? r.tracks : [{ title: `${r.release} (full release)`, role: r.role }]) : [];

  return (
    <section className={`${css.disco} ${open && !closing ? css.discoOpen : ""}`} data-src="22">
      {/* SOURCES #22 brian-eno.net: the list takes 66.66%, the right 33.33% holds the controls */}
      <ol ref={list} className={css.discoList} id="titleList" data-src="22 23">
        {rows.map(({ r, i }) => {
          const hide = (role && !rolesOf(r).includes(role)) || (artist && r.artist !== artist);
          const src = coverAt(r, 1080);
          return (
            <li key={r.id} data-id={r.id} className={`${css.discoItem} ${open?.i === i ? css.discoActive : ""}`} data-target={r.release} data-role={rolesOf(r).join("|")} data-artist={r.artist} style={hide ? { display: "none" } : undefined}>
              <a
                href={`#${r.id}`}
                className={css.discoRow}
                data-src="22 12"
                onPointerDown={(e) => prime(e.currentTarget.querySelector<HTMLElement>("[data-clip]"))}
                onClick={(e) => { e.preventDefault(); if (!open) expand(i, e.currentTarget.parentElement); else close(); }}
              >
                {/* the text column: 6fr 4.5fr 1fr, title | collaborators and role | year */}
                <span className={css.leftColumn}>
                  <span className={css.discoTitle}><span className={css.discoTitleText}>{r.release}</span></span>
                  <span className={css.discoWho}>{caps(r.artist)} · {caps(r.role)}</span>
                  <span className={css.discoYear}>{r.year}</span>
                </span>
                {/* the cover as a 20 px slice through its middle; the clip box is what grows when the row opens */}
                <span className={css.slice}>
                  <span className={css.sliceClip} data-clip>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 1080 copy shown as a 464 x 20 slice, and whole when expanded */}
                    {src ? <img className={css.sliceImg} src={src} alt="" width={1080} height={1080} loading="lazy" decoding="async" /> : <span className={css.sliceBlank} />}
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
        {/* SOURCES #23 a.filters (pages/000.html:135); SOURCES #25 anew-formatic.com brackets as buttons */}
        <div className={css.filterLockUp} data-src="23 25">
          <a href="#" role="button" data-src="23 25" aria-pressed={order === "default"} className={`${css.filters} ${order === "default" ? css.filtersActive : ""}`} onClick={(e) => { e.preventDefault(); setOrder("default"); }}>[YEAR]</a>
          <a href="#" role="button" data-src="23 25" aria-pressed={order === "alphabetical"} className={`${css.filters} ${order === "alphabetical" ? css.filtersActive : ""}`} onClick={(e) => { e.preventDefault(); setOrder("alphabetical"); }}>[A–Z]</a>
        </div>
        {/* SOURCES #24 eilidhduffy.com select.mobile-category-dropdown (pages/000.html:198; 16c6eebea782ae92.css:1) */}
        <div className={css.selects} data-src="24">
          <label>
            <span className={css.label}>ROLE</span>
            <select id="category-select" className={css.select} data-src="24" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All</option>
              {roles.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label>
            <span className={css.label}>ARTIST</span>
            <select id="subcategory-select" className={css.select} data-src="24" value={artist} onChange={(e) => setArtist(e.target.value)}>
              <option value="">All</option>
              {artists.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
      </aside>

      {open && r && (
        <>
          {/* a tap anywhere outside the cover and the info closes */}
          <div className={css.expShade} onClick={close} aria-hidden />
          <div ref={info} className={css.expInfo} role="dialog" aria-modal="true" aria-label={`${r.artist}, ${r.release}`} data-release={r.id} data-src="12" style={{ opacity: open.instant ? 1 : 0 }}>
            <p className={css.label} data-src="09">{no3(open.i + 1)} / {no3(releases.length)}</p>
            <h2 className={css.artistName}>{r.artist}</h2>
            {/* SOURCES #16 chantalmichelle.me: <p>Title <sup class="date">[2024]</sup></p> (pages/000.html:153) */}
            <p className={css.releaseTitle}>{r.release}<sup className={css.date} data-src="16">[{r.year}]</sup></p>
            <p className={css.role}>{caps(r.role)}</p>
            {/* SOURCES #15 wearesteve.net .message rows */}
            <div className={css.tracks} role="list" aria-label="Tracks" data-src="15">
              {tracks.map((t, k) => (
                <div key={k} className={css.message} role="listitem">
                  <div className={css.meta}>{pad2(k + 1)}</div>
                  <div className={css.desktopMeta}>:</div>
                  <div className={css.messageText}>{t.title}<span className={css.trackRole}>{caps(t.role)}</span></div>
                </div>
              ))}
            </div>
            {/* SOURCES #25 anew-formatic.com brackets as buttons */}
            <button type="button" className={css.expClose} data-src="25" onClick={close}>[CLOSE]</button>
          </div>
        </>
      )}
    </section>
  );
}
