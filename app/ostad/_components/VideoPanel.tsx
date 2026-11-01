"use client";
import css from "../ostad.module.css";
import { fmt, pct, type Video } from "../_lib/types";

export default function VideoPanel({ v, onClose }: { v: Video; onClose: () => void }) {
  const rows: [string, string][] = [
    ["platform", v.p],
    ["source", v.src],
    ["creator", `@${v.h}${v.fol ? ` · ${fmt(v.fol)} followers` : ""}`],
    ["posted", `${v.d ?? "—"}${v.days ? ` · ${v.days} days live` : ""}`],
    ["duration", v.dur ? `${Math.round(v.dur)}s` : "—"],
    ["views", v.v.toLocaleString()],
    ["likes", v.l.toLocaleString()],
    ["comments", v.c.toLocaleString()],
    ["shares", v.s.toLocaleString()],
    ["saves", v.sv.toLocaleString()],
    ["engagement", pct(v.er)],
    ["views / day", fmt(v.vpd)],
    ["outlier", `${v.os.toFixed(2)}×`],
    ["winning", v.win ? "yes" : "no"],
    ["genre", v.g || "—"],
    ["format", v.f || "—"],
    ["hook type", v.ht || "—"],
    ["topics", v.tags?.join(", ") || "—"],
    ["for ostad", v.rel ? "yes" : "no"],
    ["found via", v.q || "—"],
  ];
  return (
    <aside className={css.panel} role="dialog" aria-label="video detail" data-testid="panel">
      <div className={css.close}>
        <a href={v.url} target="_blank" rel="noreferrer">
          open on {v.p} ↗
        </a>
        <button onClick={onClose}>[close]</button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={css.panelThumb} src={`/ostad/thumbs/${v.id}.jpg`} alt="" />
      {v.title && (
        <>
          <h3>Title</h3>
          <p>{v.title}</p>
        </>
      )}
      {v.why && (
        <>
          <h3>Why it works</h3>
          <p>{v.why}</p>
        </>
      )}
      {v.hook && (
        <>
          <h3>Spoken hook (first 12 words)</h3>
          <p>{v.hook}</p>
        </>
      )}
      <h3>Metrics</h3>
      <dl className={css.kv}>
        {rows.map(([k, val]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
      <h3>Caption</h3>
      <p>{v.cap || "—"}</p>
      {v.tr && (
        <>
          <h3>Transcript</h3>
          <p>{v.tr}</p>
        </>
      )}
      <h3>Score note</h3>
      <p className={css.mid}>{v.notes}</p>
    </aside>
  );
}
