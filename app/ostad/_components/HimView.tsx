"use client";
import { useMemo, useState } from "react";
import css from "../ostad.module.css";
import { fmt, PLAT, type Him, type Mix, type Theme, type Video } from "../_lib/types";
import Card from "./Card";
import VideoPanel from "./VideoPanel";

const med = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

// Figure 1. One claim: his videos reach a small fraction of what makeable niche videos reach.
// Views, not "× usual": his "× usual" is measured against his own median, so it would sit at 1 by construction.
function ViewsStrip({ his, niche }: { his: Video[]; niche: Video[] }) {
  const W = 760, LEFT = 150, RIGHT = 70, ROW = 46, H = 2 * ROW + 40;
  const lo = 10, hi = 1e8;
  const X = (x: number) => Math.round((LEFT + ((Math.log10(Math.min(Math.max(x, lo), hi)) - 1) / 7) * (W - LEFT - RIGHT)) * 10) / 10;
  const rows = [
    { name: "Ostad's videos", vs: his, cls: css.dotHis },
    { name: "makeable niche", vs: niche, cls: css.dot },
  ];
  const ticks = [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
  return (
    <figure className={css.figure} data-testid="him-strip">
      <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ostad's views per video against the makeable niche">
        {ticks.map((t) => (
          <g key={t}>
            <line className={css.axis} x1={X(t)} x2={X(t)} y1={4} y2={H - 22} />
            <text x={X(t)} y={H - 8} textAnchor="middle">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = 26 + i * ROW;
          const m = med(r.vs.map((v) => v.v));
          return (
            <g key={r.name}>
              <text x={LEFT - 10} y={y + 4} textAnchor="end" className={css.rowName}>{r.name}</text>
              {r.vs.map((v, j) => (
                <circle key={v.id} className={r.cls} cx={X(v.v)} cy={y + ((j * 7) % 15) - 7} r={2.2}>
                  <title>{`${fmt(v.v)} views · @${v.h} · ${PLAT[v.p]}`}</title>
                </circle>
              ))}
              <line className={css.medTick} x1={X(m)} x2={X(m)} y1={y - 13} y2={y + 13} />
              <text x={X(m)} y={y - 17} textAnchor="middle" className={css.medLabel}>median {fmt(m)}</text>
              <text x={W - RIGHT + 8} y={y + 4} className={css.medLabel}>{r.vs.length} videos</text>
            </g>
          );
        })}
      </svg>
      <figcaption className={css.caption}>Views per video on a log scale. Each dot is one video, and the tick is the median. Both rows cover TikTok, Instagram and YouTube.</figcaption>
    </figure>
  );
}

// Figure 2. One claim: what he makes is not what wins. Two stacked bars on the same 0–100% scale.
function MixBars({ mix, hisN, winN }: { mix: Mix; hisN: number; winN: number }) {
  const W = 760, LEFT = 150, RIGHT = 10, BAR = 26;
  const span = W - LEFT - RIGHT;
  const rows: [string, "his" | "win", number][] = [
    ["Ostad's videos", "his", hisN],
    ["winning, makeable", "win", winN],
  ];
  const H = 2 * (BAR + 34) + 20;
  return (
    <figure className={css.figure} data-testid="him-mix">
      <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Genre mix of Ostad's videos against winning makeable videos">
        {rows.map(([name, k, n], i) => {
          const y = 10 + i * (BAR + 34);
          let x = LEFT;
          return (
            <g key={k}>
              <text x={LEFT - 10} y={y + BAR / 2 + 4} textAnchor="end" className={css.rowName}>{name}</text>
              <text x={LEFT - 10} y={y + BAR / 2 + 16} textAnchor="end">n = {n}</text>
              {mix.map((m, j) => {
                const w = m[k] * span;
                const x0 = x;
                x += w;
                return (
                  <g key={m.key}>
                    <rect x={x0 + 1} y={y} width={Math.max(w - 2, 0)} height={BAR} style={{ fill: `var(--s${j + 1})` }}>
                      <title>{`${m.key}: ${Math.round(m[k] * 100)}%`}</title>
                    </rect>
                    {w > 46 && (
                      <text x={x0 + 5} y={y + BAR + 12} className={css.segLabel}>
                        {Math.round(m[k] * 100)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <ul className={css.legend}>
        {mix.map((m, j) => (
          <li key={m.key}>
            <span className={css.swatch} style={{ background: `var(--s${j + 1})` }} />
            {m.key} <span className={`${css.mid} ${css.mono}`}>{Math.round(m.his * 100)}% vs {Math.round(m.win * 100)}%</span>
          </li>
        ))}
      </ul>
      <figcaption className={css.caption}>Share of videos by genre: his own above, the winning videos he could make below. Same scale; each bar adds up to 100%.</figcaption>
    </figure>
  );
}

export default function HimView({ videos, him, themes }: { videos: Video[]; him: Him; themes: Theme[] }) {
  const [open, setOpen] = useState<Video | null>(null);
  const tname = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t.name])), [themes]);
  const his = useMemo(() => videos.filter((v) => v.src === "own"), [videos]);
  const niche = useMemo(() => videos.filter((v) => v.src !== "own" && v.mk), [videos]);
  const tone = him.tone.slice(0, 3);
  return (
    <>
      <p className={css.lede} style={{ marginTop: 12 }}>
        Dr. Ostad&apos;s own {his.length} videos on TikTok, Instagram and YouTube, set against the {niche.length} niche videos he could plausibly make himself.
      </p>
      <h2 className={css.h2}>1 · His videos reach a fraction of the niche</h2>
      <ViewsStrip his={his} niche={niche} />
      <h2 className={css.h2}>2 · He makes different videos from the ones that win</h2>
      <MixBars mix={him.genre} hisN={him.hisN} winN={him.winN} />
      <p className={css.p}>
        Tone tells the same story:{" "}
        {tone.map((t, i) => (
          <span key={t.key}>
            {i ? "; " : ""}
            {t.key} is {Math.round(t.his * 100)}% of his videos against {Math.round(t.win * 100)}% of the winners
          </span>
        ))}
        .
      </p>
      <h2 className={css.h2}>His videos, best first</h2>
      <div className={css.grid}>
        {[...his].sort((a, b) => b.v - a.v).map((v, i) => (
          <Card key={v.id} v={v} i={i} theme={tname[v.th]} onOpen={setOpen} />
        ))}
      </div>
      {open && <VideoPanel v={open} themeName={tname[open.th]} onClose={() => setOpen(null)} />}
    </>
  );
}
