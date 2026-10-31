"use client";
// /gillenwebsite/discography: the plain, complete list. All 36 releases in discography.json order, newest first.
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { usePanel } from "./Chrome";
import { coverAt, rolesOf, caps, no3 } from "./shared";
import css from "./site.module.css";

// SOURCES #23, viscosesyllabus.com S6 (1c85fe7d1ee0de53.js:23): the order is kept in the alphabetOrdering cookie
const COOKIE = "alphabetOrdering";
const readCookie = (n: string) => document.cookie.split("; ").find((c) => c.startsWith(n + "="))?.split("=")[1];
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export default function Discography({ releases }: { releases: Release[] }) {
  const { open } = usePanel();
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

  return (
    <section className={css.disco} data-src="22">
      {/* SOURCES #22 brian-eno.net: the list takes 66.66%, the right 33.33% holds the controls */}
      <ol className={css.discoList} id="titleList" data-src="22 23">
        {rows.map(({ r, i }) => {
          const hide = (role && !rolesOf(r).includes(role)) || (artist && r.artist !== artist);
          const src = coverAt(r, 1080);
          return (
            <li key={r.id} className={css.discoItem} data-target={r.release} data-role={rolesOf(r).join("|")} data-artist={r.artist} style={hide ? { display: "none" } : undefined}>
              <a href={`#${r.id}`} className={css.discoRow} data-src="22 12" onClick={(e) => { e.preventDefault(); open(i); }}>
                {/* the text column: 6fr 4.5fr 1fr, title | collaborators and role | year */}
                <span className={css.leftColumn}>
                  <span className={css.discoTitle}>{r.release}</span>
                  <span className={css.discoWho}>{caps(r.artist)} · {caps(r.role)}</span>
                  <span className={css.discoYear}>{r.year}</span>
                </span>
                {/* the cover as a 20 px slice through its middle */}
                <span className={css.slice}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 1080 copy shown as a 464 x 20 slice */}
                  {src ? <img src={src} alt="" width={1080} height={1080} loading="lazy" decoding="async" /> : <span className={css.sliceBlank} />}
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
    </section>
  );
}
