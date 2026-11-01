"use client";
import { useState } from "react";
import css from "../ostad.module.css";
import SortTable, { type Col } from "./SortTable";
import { fmt, pct, type Analysis, type Row } from "../_lib/types";

const cols = (label: string): Col<Row>[] => [
  { key: "key", label, get: (r) => r.key },
  { key: "n", label: "videos", num: true, get: (r) => r.n },
  { key: "medViews", label: "median views", num: true, get: (r) => r.medViews, show: (r) => fmt(r.medViews) },
  { key: "medOutlier", label: "median outlier", num: true, get: (r) => r.medOutlier, show: (r) => r.medOutlier.toFixed(2) + "×" },
  { key: "medEr", label: "median engagement", num: true, get: (r) => r.medEr, show: (r) => pct(r.medEr) },
  { key: "winShare", label: "share winning", num: true, get: (r) => r.winShare, show: (r) => pct(r.winShare) },
];

function Bars({ rows, refVal }: { rows: Row[]; refVal: number }) {
  const sorted = [...rows].filter((r) => r.n >= 5).sort((a, b) => b.medOutlier - a.medOutlier);
  const max = Math.max(...sorted.map((r) => r.medOutlier), refVal) || 1;
  return (
    <div className={css.bars} role="img" aria-label="median outlier score by group">
      {sorted.map((r) => (
        <div key={r.key} style={{ display: "contents" }}>
          <span className={css.clip}>{r.key}</span>
          <span className={css.barTrack}>
            <span className={css.barFill} style={{ width: `${(r.medOutlier / max) * 100}%` }} />
            <span className={css.barRef} style={{ left: `${(refVal / max) * 100}%` }} />
          </span>
          <span className={css.mono}>
            {r.medOutlier.toFixed(2)}× <span className={css.mid}>n{r.n}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GenresView({ a }: { a: Analysis }) {
  const [plat, setPlat] = useState("all");
  const ref = a.medians.all.outlier;
  const genreRows = plat === "all" ? a.tables.genre : a.byPlatform.genre[plat] ?? [];
  const blocks: [string, string, Row[]][] = [
    ["01", "Genre", genreRows],
    ["02", "Format", a.tables.format],
    ["03", "Hook type", a.tables.hook],
  ];
  return (
    <>
      <div className={css.bar}>
        <span className={css.mid}>genre table for</span>
        {["all", "tiktok", "instagram", "youtube"].map((p) => (
          <button key={p} className={plat === p ? css.on : css.off} onClick={() => setPlat(p)} aria-pressed={plat === p}>
            [{p}]
          </button>
        ))}
        <span className={`${css.count} ${css.mono}`}>
          niche median: {fmt(a.medians.all.views)} views · {ref.toFixed(2)}× · {pct(a.medians.all.er)}
        </span>
      </div>
      {blocks.map(([n, label, rows]) => (
        <section key={label}>
          <div className={css.section}>
            <span className={css.idx}>{n}</span>
            <h2>{label}</h2>
            <span className={css.mid}>bars: median outlier score, groups with 5+ videos</span>
          </div>
          <Bars rows={rows} refVal={ref} />
          <SortTable rows={rows} cols={cols(label.toLowerCase())} initial="medOutlier" testid={`table-${label}`} />
        </section>
      ))}
    </>
  );
}
