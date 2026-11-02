"use client";
import css from "../ostad.module.css";
import { times, type Theme, type Video } from "../_lib/types";

// One claim: which themes over-perform. One row per theme on a shared log axis of "× the creator's usual";
// each mark is one video, the tick is the theme's median, the dashed line is 1× (the creator's usual).
// Rows instead of 18 colours on one line: 18 hues can't be told apart, names beside the rows can.
const W = 900;
const LEFT = 330; // fits the longest theme name at 12px
const RIGHT = 54;
const ROW = 22;

const med = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

export default function Strip({ videos, themes, onPick }: { videos: Video[]; themes: Theme[]; onPick?: (slug: string) => void }) {
  const rows = themes
    .map((t) => {
      const xs = videos.filter((v) => v.th === t.slug && v.src !== "own").map((v) => Math.max(v.x, 0.01));
      return { t, xs, m: med(xs) };
    })
    .filter((r) => r.xs.length)
    .sort((a, b) => b.m - a.m);
  const lo = 0.05;
  const hi = 1000;
  const X = (x: number) => Math.round((LEFT + ((Math.log10(Math.min(Math.max(x, lo), hi)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (W - LEFT - RIGHT)) * 10) / 10;
  const H = rows.length * ROW + 36;
  const ticks = [0.1, 1, 10, 100, 1000];
  return (
    <figure className={css.figure} data-testid="strip">
      <svg className={css.chart} style={{ maxWidth: W }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each theme's videos by how far above the creator's usual they performed">
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 1 ? css.one : css.axis} x1={X(t)} x2={X(t)} y1={4} y2={H - 22} />
            <text x={X(t)} y={H - 8} textAnchor="middle">
              {t === 1 ? "1× = usual" : `${t}×`}
            </text>
          </g>
        ))}
        {rows.map(({ t, xs, m }, i) => {
          const y = 14 + i * ROW;
          return (
            <g key={t.slug} className={onPick ? css.rowLink : undefined} onClick={() => onPick?.(t.slug)}>
              <text x={LEFT - 10} y={y + 4} textAnchor="end" className={css.rowName}>
                {t.name}
              </text>
              {xs.map((x, j) => (
                <circle key={j} className={css.dot} cx={X(x)} cy={y + ((j * 7) % 9) - 4} r={2}>
                  <title>{times(x)}</title>
                </circle>
              ))}
              <line className={css.medTick} x1={X(m)} x2={X(m)} y1={y - 8} y2={y + 8} />
              <text x={W - RIGHT + 6} y={y + 4} className={css.medLabel}>
                {times(m).replace(" usual", "")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={css.caption}>
        Each dot is one video. The black tick is the theme&apos;s median. Further right means it beat the creator&apos;s usual by more. The dashed line is 1×, a normal day for
        that creator. Rows are sorted by median. The dots follow [show everything]: by default only the videos Dr. Ostad could make.
      </figcaption>
    </figure>
  );
}
