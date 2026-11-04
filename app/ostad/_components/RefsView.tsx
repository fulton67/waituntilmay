"use client";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import css from "../ostad.module.css";
import type { VisRef, RefProc, RefType, MotionRef, Mention } from "../_lib/types";

const TYPE_LABEL: Record<RefType, string> = {
  "cross-section": "cross-section",
  MOA: "mechanism",
  "injection-map": "injection map",
  "surgical-steps": "surgical steps",
  "3D-anatomy": "3D anatomy",
  device: "device",
  flowchart: "flowchart",
  other: "other",
};
const TYPE_ORDER: RefType[] = ["cross-section", "MOA", "injection-map", "surgical-steps", "3D-anatomy", "device", "flowchart", "other"];
const CAT_ORDER = ["neurotoxin", "filler", "biostimulator", "regenerative", "laser", "RF/energy", "surgical", "body", "skin-cancer", "medical-derm", "skincare", "wellness"];
// default sort: labelled cross-sections and mechanisms first (spec), then the other types in order
const rank = (r: VisRef) => (r.lab ? 0 : 10) + (r.t === "cross-section" || r.t === "MOA" ? 0 : 1 + TYPE_ORDER.indexOf(r.t));

type F = "t" | "k" | "lab";
type View = "img" | "motion" | "his";
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const val = (r: VisRef, f: F) => (f === "lab" ? (r.lab ? "labelled" : "unlabelled") : r[f]);

export default function RefsView({
  refs,
  procs,
  motion,
  mentions,
}: {
  refs: VisRef[];
  procs: RefProc[];
  motion: MotionRef[];
  mentions: Record<string, Mention[]>;
}) {
  const [view, setView] = useState<View>("img");
  const [mOpen, setMOpen] = useState<MotionRef | null>(null);
  const [start, setStart] = useState(0);
  const [sel, setSel] = useState<string>("");
  const [pick, setPick] = useState<Partial<Record<F, string>>>({});
  const [open, setOpen] = useState<VisRef | null>(null);
  const [full, setFull] = useState(true);

  // the selected procedure lives in the hash so a link can point at one
  useEffect(() => {
    const read = () => setSel(decodeURIComponent(location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const choose = (id: string) => {
    history.replaceState(null, "", id ? `#${id}` : location.pathname);
    setSel(id);
    setPick({});
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMOpen(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setFull(true), [open]);

  const byCat = useMemo(() => {
    const m = new Map<string, RefProc[]>();
    for (const c of CAT_ORDER) m.set(c, []);
    procs.forEach((p) => m.get(p.cat)?.push(p));
    return [...m.entries()].filter(([, ps]) => ps.length);
  }, [procs]);
  const proc = procs.find((p) => p.id === sel);
  const scoped = useMemo(() => (sel ? refs.filter((r) => r.p === sel) : refs), [refs, sel]);
  const match = (r: VisRef, skip?: F) => (["t", "k", "lab"] as F[]).every((f) => f === skip || !pick[f] || val(r, f) === pick[f]);
  const shown = useMemo(
    () => scoped.filter((r) => match(r)).sort((a, b) => rank(a) - rank(b) || a.p.localeCompare(b.p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, pick],
  );
  const counts = useMemo(() => {
    const c: Record<F, Map<string, number>> = { t: new Map(), k: new Map(), lab: new Map() };
    (["t", "k", "lab"] as F[]).forEach((f) => scoped.forEach((r) => match(r, f) && c[f].set(val(r, f), (c[f].get(val(r, f)) ?? 0) + 1)));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, pick]);
  const keysOf = (f: F) =>
    f === "t" ? TYPE_ORDER.filter((t) => counts.t.has(t)) : [...counts[f].keys()].sort((a, b) => (counts[f].get(b) ?? 0) - (counts[f].get(a) ?? 0));
  const label = (f: F, x: string) => (f === "t" ? TYPE_LABEL[x as RefType] : x);
  const pname = useMemo(() => Object.fromEntries(procs.map((p) => [p.id, p.name])), [procs]);
  const mScoped = useMemo(() => (sel ? motion.filter((m) => m.p === sel) : motion), [motion, sel]);
  const his = sel ? (mentions[sel] ?? []) : [];
  const openMotion = (m: MotionRef) => {
    setStart(m.best);
    setMOpen(m);
  };

  return (
    <div className={css.refsWrap}>
      <aside className={css.refsSide} aria-label="procedures">
        <button className={sel ? css.off : css.on} onClick={() => choose("")}>
          All procedures <span className={css.mono}>{refs.length}</span>
        </button>
        {byCat.map(([cat, ps]) => (
          <div key={cat} className={css.refsCat}>
            <div className={css.mid}>
              {cat.toUpperCase()} <span className={css.mono}>{ps.reduce((s, p) => s + p.n, 0)}</span>
            </div>
            {ps.map((p) => (
              <button key={p.id} className={p.id === sel ? css.on : css.off} onClick={() => choose(p.id)} data-proc={p.id}>
                {p.name} <span className={css.mono}>{p.n}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <section>
        <div className={css.refsHead}>
          <span>
            <span data-testid="refs-shown">{shown.length}</span> shown of <span data-testid="refs-total">{refs.length}</span> images ·{" "}
            {procs.length} procedures · <Link href="/ostad/refs/sources">[SOURCES →]</Link>
          </span>
          {proc && (
            <p className={css.lede}>
              <span className={css.on}>{proc.name}.</span> {proc.what}{" "}
              {proc.site && (
                <a href={proc.site} target="_blank" rel="noreferrer">
                  [his page ↗]
                </a>
              )}
            </p>
          )}
        </div>
        <div className={css.viewRow} role="tablist" aria-label="view">
          {(
            [
              ["img", "IMAGES", scoped.length],
              ["motion", "MOTION", mScoped.length],
              ["his", "HIS VIDEOS", sel ? his.length : null],
            ] as [View, string, number | null][]
          ).map(([v, l, n]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? css.on : css.off} onClick={() => setView(v)} data-view={v}>
              [{l}
              {n !== null && <span className={css.mono}> {n}</span>}]
            </button>
          ))}
        </div>
        {view === "img" && (
          <>
          <div className={css.chipRows}>
            {(["t", "k", "lab"] as F[]).map((f) => (
              <div key={f} className={css.chipRow}>
                <span className={css.chipLabel}>{f === "t" ? "type" : f === "k" ? "source" : "labels"}</span>
                {keysOf(f).map((x) => (
                  <button
                    key={x}
                    className={pick[f] === x ? css.chipOn : css.chip}
                    onClick={() => setPick((p) => ({ ...p, [f]: p[f] === x ? undefined : x }))}
                  >
                    {label(f, x)} <span className={css.mono}>{counts[f].get(x) ?? 0}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className={css.masonry} data-testid="refs-grid">
            {shown.map((r) => (
              <button key={r.id} className={css.refCard} onClick={() => setOpen(r)} data-ref={r.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.f} alt={r.cap} width={r.pw} height={r.ph} loading="lazy" decoding="async" />
                <span className={css.refTag}>
                  {TYPE_LABEL[r.t]}
                  {r.lab ? "" : " · no labels"}
                  {!sel && <span className={css.mid}> · {pname[r.p]}</span>}
                </span>
              </button>
            ))}
          </div>
          </>
        )}
        {view === "motion" && (
          <>
            {mScoped.length === 0 && (
              <p className={css.mid} style={{ paddingTop: 12 }}>
                No animation found for this procedure: the search turned up only talking heads, filmed treatments or off-topic videos.
              </p>
            )}
            <div className={css.motionGrid} data-testid="motion-grid">
              {mScoped.map((m) => (
                <button key={m.id} className={css.motionCard} onClick={() => openMotion(m)} data-motion={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${m.id}/mqdefault.jpg`} alt={m.t} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  <span className={css.refTag}>
                    {m.st} · {mmss(m.dur)} · {m.ch}
                    {!sel && <span className={css.mid}> · {pname[m.p]}</span>}
                  </span>
                  <span className={css.refTag}>{m.what}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {view === "his" &&
          (sel ? (
            his.length ? (
              <ul className={css.mentions} data-testid="mentions">
                {his.map((v) => (
                  <li key={v.id}>
                    <a href={v.u} target="_blank" rel="noreferrer">
                      {v.t || "(untitled)"} ↗
                    </a>{" "}
                    <span className={css.mid}>
                      {v.pl} · {v.d}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={css.mid} style={{ paddingTop: 12 }}>
                He has no video that mentions this one.
              </p>
            )
          ) : (
            <p className={css.mid} style={{ paddingTop: 12 }}>
              Pick a procedure on the left to see which of his videos mention it.
            </p>
          ))}
      </section>
      {open && (
        <div className={css.lightbox} role="dialog" aria-label={open.cap} onClick={() => setOpen(null)}>
          <div className={css.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <div className={css.lightboxBar}>
              <span className={css.mid}>
                {pname[open.p]} · {TYPE_LABEL[open.t]} · {open.lab ? "labelled" : "no labels"}
              </span>
              <button onClick={() => setOpen(null)}>[CLOSE ×]</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={css.lightboxImg}
              src={full ? open.u : open.f}
              alt={open.cap}
              referrerPolicy="no-referrer"
              onError={() => setFull(false)}
            />
            {!full && <p className={css.mid}>The original would not load here (the site blocks embedding); this is the 600 px copy.</p>}
            <p className={css.p}>{open.cap}</p>
            <dl className={css.kv}>
              <dt>source</dt>
              <dd>
                <a href={open.pg} target="_blank" rel="noreferrer">
                  {open.src} ↗
                </a>
              </dd>
              <dt>image</dt>
              <dd>
                <a href={open.u} target="_blank" rel="noreferrer">
                  original {open.w && open.h ? `${open.w}×${open.h}` : ""} ↗
                </a>
              </dd>
              <dt>licence</dt>
              <dd>{open.lic}</dd>
              <dt>kind</dt>
              <dd>{open.k}</dd>
              <dt>style</dt>
              <dd>{open.sn}</dd>
            </dl>
          </div>
        </div>
      )}
      {mOpen && (
        <div className={css.lightbox} role="dialog" aria-label={mOpen.t} onClick={() => setMOpen(null)}>
          <div className={css.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <div className={css.lightboxBar}>
              <span className={css.mid}>
                {pname[mOpen.p]} · {mOpen.st} · {mmss(mOpen.dur)}
              </span>
              <button onClick={() => setMOpen(null)}>[CLOSE ×]</button>
            </div>
            <div className={css.player}>
              <iframe
                key={start}
                src={`https://www.youtube-nocookie.com/embed/${mOpen.id}?start=${start}&autoplay=1&rel=0`}
                title={mOpen.t}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className={css.p}>
              <span className={css.on}>{mOpen.t}</span> <span className={css.mid}>· {mOpen.ch}{mOpen.yr ? ` · ${mOpen.yr}` : ""}</span>
            </p>
            <p className={css.p}>{mOpen.what}</p>
            <div className={css.beats} data-testid="beats">
              {mOpen.b.map(([s, w]) => (
                <Fragment key={s}>
                  <button className={s === start ? css.beatOn : undefined} onClick={() => setStart(s)}>
                    {mmss(s)}
                  </button>
                  <span>{w}</span>
                </Fragment>
              ))}
            </div>
            <dl className={css.kv}>
              <dt>energy / product</dt>
              <dd>{mOpen.fx || "—"}</dd>
              <dt>camera</dt>
              <dd>{mOpen.cam.join(", ") || "—"}</dd>
              <dt>take from it</dt>
              <dd>{mOpen.reuse}</dd>
              <dt>video</dt>
              <dd>
                <a href={`https://www.youtube.com/watch?v=${mOpen.id}&t=${start}s`} target="_blank" rel="noreferrer">
                  youtube ↗
                </a>
              </dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
