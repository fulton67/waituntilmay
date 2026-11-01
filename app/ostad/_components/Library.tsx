"use client";
import { useEffect, useMemo, useState } from "react";
import css from "../ostad.module.css";
import { fmt, pct, PLAT, type Video } from "../_lib/types";
import VideoPanel from "./VideoPanel";

type SortKey = "os" | "v" | "er" | "vpd" | "d";
const SORTS: [SortKey, string][] = [["os", "outlier"], ["v", "views"], ["er", "engagement"], ["vpd", "views/day"], ["d", "date"]];
const ALL = "all";

function uniq(vs: Video[], k: keyof Video) {
  const m = new Map<string, number>();
  vs.forEach((v) => {
    const x = String(v[k] ?? "");
    if (x) m.set(x, (m.get(x) ?? 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default function Library({ videos, initialWinning = true, own = false }: { videos: Video[]; initialWinning?: boolean; own?: boolean }) {
  // default view = the pitch view: winners that map to something Ostad offers. Both toggles are one click away.
  const [plat, setPlat] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [format, setFormat] = useState(ALL);
  const [hook, setHook] = useState(ALL);
  const [src, setSrc] = useState(ALL);
  const [rel, setRel] = useState(own ? ALL : "true");
  const [winning, setWinning] = useState(initialWinning);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("os");
  const [open, setOpen] = useState<Video | null>(null);
  const [limit, setLimit] = useState(120);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = videos.filter(
      (v) =>
        (plat === ALL || v.p === plat) &&
        (genre === ALL || v.g === genre) &&
        (format === ALL || v.f === format) &&
        (hook === ALL || v.ht === hook) &&
        (src === ALL || v.src === src) &&
        (rel === ALL || String(v.rel) === rel) &&
        (!winning || v.win) &&
        (!needle || (v.cap + " " + v.title + " " + v.h + " " + v.hook).toLowerCase().includes(needle)),
    );
    const key = (v: Video) => (sort === "d" ? (v.d ? Date.parse(v.d) : 0) : (v[sort] as number));
    return out.sort((a, b) => key(b) - key(a));
  }, [videos, plat, genre, format, hook, src, rel, winning, q, sort]);

  useEffect(() => setLimit(120), [shown]);
  // measurement hook for scripts/verify: the full library must render every row with all filters off
  useEffect(() => {
    (window as unknown as { __ostad?: object }).__ostad = { rows: videos.length, shown: shown.length };
  }, [videos.length, shown.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sel = (label: string, val: string, set: (s: string) => void, opts: [string, number][]) => (
    <label className={css.ctl}>
      <span className={css.mid}>{label}</span>
      <select value={val} onChange={(e) => set(e.target.value)} aria-label={label}>
        <option value={ALL}>all</option>
        {opts.map(([o, n]) => (
          <option key={o} value={o}>
            {o} ({n})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className={css.bar}>
        {!own && sel("platform", plat, setPlat, uniq(videos, "p"))}
        {sel("genre", genre, setGenre, uniq(videos, "g"))}
        {sel("format", format, setFormat, uniq(videos, "f"))}
        {sel("hook", hook, setHook, uniq(videos, "ht"))}
        {!own && sel("source", src, setSrc, uniq(videos, "src"))}
        {!own && sel("relevant", rel, setRel, uniq(videos, "rel"))}
        {!own && (
          <button className={winning ? css.on : css.off} onClick={() => setWinning(!winning)} aria-pressed={winning}>
            [{winning ? "×" : " "} winning only]
          </button>
        )}
        <span className={css.ctl}>
          <span className={css.mid}>sort</span>
          {SORTS.map(([k, label]) => (
            <button key={k} className={sort === k ? css.on : css.off} onClick={() => setSort(k)} aria-pressed={sort === k}>
              {label}
            </button>
          ))}
        </span>
        <input type="search" placeholder="search captions, titles, creators" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className={`${css.count} ${css.mono}`} data-testid="count" data-count={shown.length} data-rows={videos.length}>
          {shown.length} / {videos.length}
        </span>
      </div>

      <div className={css.grid} data-testid="grid">
        {shown.slice(0, limit).map((v, i) => (
          <button key={v.id} className={css.card} data-card onClick={() => setOpen(v)}>
            <div className={css.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/ostad/thumbs/${v.id}.jpg`} alt="" loading="lazy" decoding="async" />
              <span className={css.badge}>{PLAT[v.p]}</span>
              {v.win && <span className={css.winmark}>WIN</span>}
            </div>
            <div className={css.meta}>
              <div className={css.row}>
                <span className={css.idx}>{String(i + 1).padStart(3, "0")}</span>
                <span className={css.clip}>@{v.h}</span>
              </div>
              <div className={`${css.row} ${css.mono}`}>
                <span>{fmt(v.v)} views</span>
                <span>{v.os.toFixed(1)}×</span>
              </div>
              <div className={`${css.row} ${css.mid}`}>
                <span className={css.clip}>{v.g || "unclassified"}</span>
                <span className={css.mono}>{pct(v.er)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {shown.length > limit && (
        <p style={{ padding: "16px 0" }}>
          <button onClick={() => setLimit(shown.length)} data-testid="more">
            [show all {shown.length} →]
          </button>
        </p>
      )}
      {open && <VideoPanel v={open} onClose={() => setOpen(null)} />}
    </>
  );
}
