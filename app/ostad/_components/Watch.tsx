"use client";
import { useEffect, useMemo, useState } from "react";
import css from "../ostad.module.css";
import { PLAT, type Theme, type Video } from "../_lib/types";
import Card from "./Card";
import VideoPanel from "./VideoPanel";
import { ScopeToggle, useScope } from "./Scope";

type SortKey = "x" | "v" | "sc" | "d";
const SORTS: [SortKey, string][] = [
  ["x", "most above their usual"],
  ["v", "most views"],
  ["sc", "most saved/commented"],
  ["d", "newest"],
];
const PAGE = 50;
type Group = "p" | "th" | "spk" | "tone" | "src";
const GROUPS: [Group, string][] = [
  ["th", "theme"],
  ["p", "platform"],
  ["spk", "speaker"],
  ["tone", "tone"],
  ["src", "source"],
];
const SRC: Record<string, string> = { search: "search", benchmark: "benchmark creators", own: "Ostad's own" };

const values = (v: Video, g: Group): string[] => (g === "tone" ? v.tone : [String(v[g])]);

export default function Watch({ videos, themes }: { videos: Video[]; themes: Theme[] }) {
  const { all } = useScope();
  const [pick, setPick] = useState<Partial<Record<Group, string>>>({});
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("x");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Video | null>(null);
  const tname = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t.name])), [themes]);
  const makeable = useMemo(() => videos.filter((v) => v.mk).length, [videos]);
  const scoped = useMemo(() => (all ? videos : videos.filter((v) => v.mk)), [all, videos]);

  const match = (v: Video, skip?: Group) => {
    for (const [g] of GROUPS) {
      if (g === skip || !pick[g]) continue;
      if (!values(v, g).includes(pick[g]!)) return false;
    }
    const n = q.trim().toLowerCase();
    return !n || `${v.ol} ${v.subj} ${v.claim} ${v.cap} ${v.title} ${v.h}`.toLowerCase().includes(n);
  };

  const shown = useMemo(() => {
    const out = scoped.filter((v) => match(v));
    const key = (v: Video) => (sort === "d" ? (v.d ? Date.parse(v.d) : 0) : v[sort]);
    return out.sort((a, b) => key(b) - key(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, pick, q, sort]);

  // chip counts: how many rows each value would show, given the other filters
  const counts = useMemo(() => {
    const c: Record<string, Map<string, number>> = {};
    for (const [g] of GROUPS) {
      const m = new Map<string, number>();
      scoped.forEach((v) => match(v, g) && values(v, g).forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)));
      c[g] = m;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, pick, q]);

  useEffect(() => setLimit(PAGE), [shown]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = (g: Group, x: string) => (g === "th" ? tname[x] ?? x : g === "p" ? PLAT[x] : g === "src" ? SRC[x] ?? x : x);
  const active = GROUPS.filter(([g]) => pick[g]);

  return (
    <>
      <div className={css.bar} data-testid="bar">
        <span className={`${css.count} ${css.mono}`} data-testid="count" data-count={shown.length} data-total={videos.length} data-makeable={makeable}>
          Showing {shown.length} of {videos.length}
        </span>
        <ScopeToggle makeable={makeable} total={videos.length} />
        <span className={css.ctl}>
          <span className={css.mid}>sort</span>
          {SORTS.map(([k, l]) => (
            <button key={k} className={sort === k ? css.on : css.off} onClick={() => setSort(k)} aria-pressed={sort === k}>
              {l}
            </button>
          ))}
        </span>
        <input type="search" placeholder="search opening lines, claims, captions" value={q} onChange={(e) => setQ(e.target.value)} />
        {active.length > 0 && (
          <span className={css.ctl}>
            {active.map(([g, gl]) => (
              <button key={g} className={css.chipOn} onClick={() => setPick({ ...pick, [g]: undefined })} data-testid="active-chip">
                {gl}: {label(g, pick[g]!)} ×
              </button>
            ))}
            <button className={css.off} onClick={() => setPick({})}>clear</button>
          </span>
        )}
      </div>
      <div className={css.chipRows}>
        {GROUPS.map(([g, gl]) => (
          <div key={g} className={css.chipRow}>
            <span className={css.chipLabel}>{gl}</span>
            {[...counts[g].entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([x, n]) => (
                <button
                  key={x}
                  className={pick[g] === x ? css.chipOn : css.chip}
                  aria-pressed={pick[g] === x}
                  data-chip={g}
                  onClick={() => setPick({ ...pick, [g]: pick[g] === x ? undefined : x })}
                >
                  {label(g, x)} <span className={css.mono}>{n}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
      <div className={css.grid} data-testid="grid">
        {shown.slice(0, limit).map((v, i) => (
          <Card key={v.id} v={v} i={i} theme={tname[v.th]} onOpen={setOpen} />
        ))}
      </div>
      <p className={css.more}>
        <span className={css.mono}>
          {Math.min(limit, shown.length)} of {shown.length} on screen
        </span>
        {shown.length > limit && (
          <>
            {" "}
            <button onClick={() => setLimit(limit + PAGE)} data-testid="more">[next {Math.min(PAGE, shown.length - limit)} →]</button>{" "}
            <button onClick={() => setLimit(shown.length)} data-testid="all">[all {shown.length}]</button>
          </>
        )}
      </p>
      {open && <VideoPanel v={open} themeName={tname[open.th]} onClose={() => setOpen(null)} />}
    </>
  );
}
