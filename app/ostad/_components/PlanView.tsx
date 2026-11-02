"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import css from "../ostad.module.css";
import { PLAT, times, type Plan, type Slot, type Theme, type Video } from "../_lib/types";

function SlotDetail({ s, refs, theme, onClose }: { s: Slot; refs: Map<string, Video>; theme?: Theme; onClose: () => void }) {
  return (
    <aside className={css.panel} role="dialog" aria-label="slot detail" data-testid="slot">
      <div className={css.close}>
        <span className={css.idx}>
          {typeof s.n === "number" ? `SLOT ${String(s.n).padStart(2, "0")} · ${s.dow} ${s.day}` : `BACKUP ${s.n}`}
        </span>
        <button onClick={onClose}>[close]</button>
      </div>
      <p className={css.bigLine} data-testid="opening">“{s.open}”</p>
      <p className={css.mid}>{s.title}</p>
      <h3>The claim</h3>
      <p>{s.claim}</p>
      <h3>Shape</h3>
      <ol className={css.beats}>
        <li><span className={css.mid}>open</span> {s.beats.open}</li>
        <li><span className={css.mid}>middle</span> {s.beats.middle}</li>
        <li><span className={css.mid}>close</span> {s.beats.close}</li>
      </ol>
      <dl className={css.kv}>
        <dt>tone</dt>
        <dd className={css.plain}>{s.tone.join(", ")}</dd>
        <dt>theme</dt>
        <dd className={css.plain}>{theme ? <Link href={`/ostad/themes/${theme.slug}`}>{theme.name} →</Link> : s.theme}</dd>
        <dt>sells</dt>
        <dd className={css.plain}>{s.service}</dd>
        <dt>shoot with</dt>
        <dd className={css.plain}>{s.batch}</dd>
      </dl>
      <h3>Why it&apos;s his, not a copy</h3>
      <p>{s.why}</p>
      <h3>Built from</h3>
      <div className={css.refs}>
        {s.refs.map((r) => {
          const v = refs.get(r.id);
          return (
            <a key={r.id} href={v?.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/ostad/thumbs/${r.id}.jpg`} alt="" loading="lazy" />
              <div className={css.mono}>{v ? `${PLAT[v.p]} @${v.h} · ${times(v.x)}` : r.id}</div>
              {r.ol && <div>“{r.ol}”</div>}
            </a>
          );
        })}
      </div>
    </aside>
  );
}

function Day({ s, on, pick, tname }: { s: Slot; on: boolean; pick: (s: Slot) => void; tname: Record<string, string> }) {
  return (
    <button className={css.day} aria-pressed={on} onClick={() => pick(s)} data-slot={s.n}>
      <span className={`${css.mono} ${css.mid}`}>
        {s.dow ? `${s.dow} ${s.day?.slice(5)} · ` : ""}
        {typeof s.n === "number" ? String(s.n).padStart(2, "0") : s.n}
      </span>
      <span className={css.dayTitle}>“{s.open}”</span>
      <span className={css.mid}>{tname[s.theme] ?? s.theme}</span>
      <span className={css.chips}>{s.tone.join(" · ")}</span>
    </button>
  );
}

export default function PlanView({ plan, refs, themes }: { plan: Plan; refs: Video[]; themes: Theme[] }) {
  const [open, setOpen] = useState<Slot | null>(null);
  const [view, setView] = useState<"cal" | "batch">("cal");
  const refMap = useMemo(() => new Map(refs.map((v) => [v.id, v])), [refs]);
  const tname = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t.name])), [themes]);
  const tmap = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t])), [themes]);
  const bySlot = useMemo(() => new Map([...plan.slots, ...plan.backups].map((s) => [String(s.n), s])), [plan]);
  const weeks: Slot[][] = [];
  plan.slots.forEach((s, i) => ((weeks[Math.floor(i / 5)] ??= []).push(s)));
  return (
    <>
      <div className={css.bar}>
        <span className={css.ctl}>
          <button className={view === "cal" ? css.on : css.off} onClick={() => setView("cal")} aria-pressed={view === "cal"}>
            [calendar]
          </button>
          <button className={view === "batch" ? css.on : css.off} onClick={() => setView("batch")} aria-pressed={view === "batch"} data-testid="batches">
            [shoot batches]
          </button>
        </span>
        <span className={`${css.count} ${css.mono}`}>
          {plan.slots.length} posts · {plan.backups.length} backups · {plan.backlog.length} in the backlog
        </span>
      </div>
      <p className={css.lede} style={{ marginTop: 12 }}>
        Four weeks from Monday 9 November. Each day is one video, shown by the first thing he says. Open a day for the claim, the three beats, the tone and the videos it&apos;s
        built from.
      </p>
      {view === "cal" ? (
        <>
          {weeks.map((w, i) => (
            <div key={i} className={css.week}>
              <span className={css.mono}>WEEK {i + 1}</span>
              {w.map((s) => (
                <Day key={s.n} s={s} on={open?.n === s.n} pick={setOpen} tname={tname} />
              ))}
            </div>
          ))}
          <h2 className={css.h2}>Backups</h2>
          <div className={css.week} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {plan.backups.map((s) => (
              <Day key={s.n} s={s} on={open?.n === s.n} pick={setOpen} tname={tname} />
            ))}
          </div>
          <h2 className={css.h2}>Backlog, ranked</h2>
          <ol className={css.list}>
            {plan.backlog.map((b) => (
              <li key={b.title}>
                {b.title} <span className={css.mid}>· {tname[b.theme] ?? b.theme}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        plan.batches.map((b) => (
          <section key={b.key} className={css.batch}>
            <h2 className={css.h2}>{b.name}</h2>
            <p className={css.p}>{b.note}</p>
            <div className={css.week} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {b.slots.map((n) => {
                const s = bySlot.get(String(n));
                return s ? <Day key={String(n)} s={s} on={open?.n === s.n} pick={setOpen} tname={tname} /> : null;
              })}
            </div>
          </section>
        ))
      )}
      {open && <SlotDetail s={open} refs={refMap} theme={tmap[open.theme]} onClose={() => setOpen(null)} />}
    </>
  );
}
