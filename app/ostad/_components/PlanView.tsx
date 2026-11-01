"use client";
import { useMemo, useState } from "react";
import css from "../ostad.module.css";
import { fmt, PLAT, type Plan, type Slot, type Video } from "../_lib/types";

function SlotDetail({ s, refs, onClose }: { s: Slot; refs: Map<string, Video>; onClose: () => void }) {
  const kv: [string, string][] = [
    ["day", `${s.dow} ${s.day}`],
    ["pillar", s.pillar],
    ["genre", s.genre],
    ["format", s.format],
    ["hook type", s.hook_type],
    ["sells", s.service],
    ["effort", s.effort],
    ["shoot with", s.batch ?? "—"],
  ];
  return (
    <aside className={css.panel} role="dialog" aria-label="slot detail" data-testid="slot">
      <div className={css.close}>
        <span className={css.idx}>SLOT {String(s.n).padStart(2, "0")}</span>
        <button onClick={onClose}>[close]</button>
      </div>
      <p className={css.dayTitle} style={{ fontSize: 18 }}>{s.title}</p>
      <dl className={css.kv}>
        {kv.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h3>Angle</h3>
      <p>{s.angle}</p>
      <h3>Ostad&apos;s version</h3>
      <p>{s.ostad_version}</p>
      <h3>References</h3>
      <div className={css.refs}>
        {s.refs.map((r) => {
          const v = refs.get(r.id);
          return (
            <a key={r.id} href={v?.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/ostad/thumbs/${r.id}.jpg`} alt="" loading="lazy" />
              <div className={css.mono}>
                {v ? `${PLAT[v.p]} @${v.h}` : r.id}
              </div>
              <div className={css.mono}>{v ? `${fmt(v.v)} · ${v.os.toFixed(1)}×` : ""}</div>
              <div className={css.mid}>{r.why}</div>
            </a>
          );
        })}
      </div>
    </aside>
  );
}

function Card({ s, on, pick }: { s: Slot; on: boolean; pick: (s: Slot) => void }) {
  return (
    <button className={css.day} aria-pressed={on} onClick={() => pick(s)} data-slot={s.n}>
      <span className={`${css.mono} ${css.mid}`}>
        {s.dow} {s.day.slice(5)} · {String(s.n).padStart(2, "0")}
      </span>
      <span className={css.dayTitle}>{s.title}</span>
      <span className={css.chips}>
        <span>{s.genre}</span>
        <span>· {s.format}</span>
        <span>· {s.effort}</span>
      </span>
      <span className={css.mid}>{s.pillar}</span>
    </button>
  );
}

export default function PlanView({ plan, refs }: { plan: Plan; refs: Video[] }) {
  const [open, setOpen] = useState<Slot | null>(null);
  const refMap = useMemo(() => new Map(refs.map((v) => [v.id, v])), [refs]);
  const weeks: Slot[][] = [];
  plan.slots.forEach((s, i) => ((weeks[Math.floor(i / 5)] ??= []).push(s)));
  return (
    <>
      <p className={css.lede}>
        Twenty posts, Monday to Friday, plus ten backups and a ranked backlog. Ideas, titles and angles, not scripts. Click a day for the angle, Ostad&apos;s
        version and the reference videos it is built from.
      </p>
      <div className={css.section}>
        <span className={css.idx}>01</span>
        <h2>Pillars</h2>
      </div>
      <ol className={css.list}>
        {plan.pillars.map((p) => (
          <li key={p.name}>
            {p.name} <span className={css.mid}>— {p.why}</span>
          </li>
        ))}
      </ol>
      <div className={css.section}>
        <span className={css.idx}>02</span>
        <h2>Calendar</h2>
      </div>
      {weeks.map((w, i) => (
        <div key={i} className={css.week}>
          <span className={css.mono}>WEEK {i + 1}</span>
          {w.map((s) => (
            <Card key={s.n} s={s} on={open?.n === s.n} pick={setOpen} />
          ))}
        </div>
      ))}
      <div className={css.section}>
        <span className={css.idx}>03</span>
        <h2>Shoot in batches</h2>
      </div>
      <ol className={css.list}>
        {plan.batches.map((b) => (
          <li key={b.name}>
            {b.name}: slots {b.slots.join(", ")} <span className={css.mid}>— {b.note}</span>
          </li>
        ))}
      </ol>
      <div className={css.section}>
        <span className={css.idx}>04</span>
        <h2>Backups</h2>
      </div>
      <div className={css.week} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {plan.backups.map((s) => (
          <Card key={s.n} s={s} on={open?.n === s.n} pick={setOpen} />
        ))}
      </div>
      <div className={css.section}>
        <span className={css.idx}>05</span>
        <h2>Backlog, ranked</h2>
      </div>
      <ol className={css.list}>
        {plan.backlog.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      {open && <SlotDetail s={open} refs={refMap} onClose={() => setOpen(null)} />}
    </>
  );
}
