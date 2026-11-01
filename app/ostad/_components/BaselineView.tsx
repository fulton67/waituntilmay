"use client";
import css from "../ostad.module.css";
import Library from "./Library";
import { fmt, type Own, type Video } from "../_lib/types";

// One row per platform on a log scale: each dot is one of his posts; the black tick is his median, the blue dashed line the niche median.
function GapChart({ own }: { own: Own }) {
  const plats = ["tiktok", "instagram", "youtube"].filter((p) => own.baseline[p]?.videos_with_views);
  const W = 760, rowH = 64, left = 90, right = 20, H = plats.length * rowH + 30;
  const all = own.posts.filter((p) => p.v).map((p) => p.v as number).concat(plats.map((p) => own.niche[p]?.median_views ?? 1));
  const lo = Math.max(1, Math.min(...all)), hi = Math.max(...all);
  // rounded so the server and the browser agree on every coordinate (Math.log10 differs in the last digit)
  const lg = (x: number) => Math.round((left + ((Math.log10(Math.max(x, 1)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1)) * (W - left - right)) * 10) / 10;
  const ticks = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) ticks.push(10 ** e);
  return (
    <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ostad views per post versus niche median">
      {ticks.map((t) =>
        lg(t) >= left && lg(t) <= W - right ? (
          <g key={t}>
            <line className={css.axis} x1={lg(t)} x2={lg(t)} y1={6} y2={H - 20} />
            <text x={lg(t)} y={H - 6} textAnchor="middle">{fmt(t)}</text>
          </g>
        ) : null,
      )}
      {plats.map((p, i) => {
        const y = 26 + i * rowH;
        const nm = own.niche[p]?.median_views ?? 0;
        const om = own.baseline[p]?.median_views ?? 0;
        return (
          <g key={p}>
            <text x={0} y={y + 4}>{p}</text>
            {own.posts.filter((x) => x.p === p && x.v).map((x) => (
              <circle key={x.id} className={css.dotO} cx={lg(x.v as number)} cy={y + ((x.id.charCodeAt(4) % 7) - 3) * 2} r={2} opacity={0.5} />
            ))}
            <line className={css.ostad} x1={lg(om)} x2={lg(om)} y1={y - 12} y2={y + 12} strokeWidth={2} />
            <text x={lg(om) - 4} y={y - 16} textAnchor="end">ostad {fmt(om)}</text>
            <line className={css.niche} x1={lg(nm)} x2={lg(nm)} y1={y - 12} y2={y + 12} strokeWidth={1.5} />
            <text x={lg(nm) + 4} y={y - 16} textAnchor="start" style={{ fill: "var(--link)" }}>niche {fmt(nm)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BaselineView({ own, videos }: { own: Own; videos: Video[] }) {
  const b = own.baseline;
  return (
    <>
      <p className={css.lede}>
        His own posts, scraped from @drarielostad on Instagram and TikTok and his YouTube channel. Each dot is one post with a view count; the black tick is his
        median, the dashed blue line the niche median for that platform.
      </p>
      <table className={css.table} style={{ maxWidth: 760, marginBottom: 10 }}>
        <thead>
          <tr>
            <th>platform</th>
            <th>posts scraped</th>
            <th>with view counts</th>
            <th>his median views</th>
            <th>niche median views</th>
            <th>gap</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(b).map(([p, x]) => {
            const n = own.niche[p]?.median_views ?? null;
            return (
              <tr key={p}>
                <td>{p}</td>
                <td className={css.n}>{x.posts}</td>
                <td className={css.n}>{x.videos_with_views}</td>
                <td className={css.n}>{fmt(x.median_views)}</td>
                <td className={css.n}>{fmt(n)}</td>
                <td className={css.n}>{x.median_views && n ? `${(n / x.median_views).toFixed(0)}× below` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <GapChart own={own} />
      <div className={css.section}>
        <span className={css.idx}>02</span>
        <h2>His videos</h2>
        <span className={css.mid}>same grid as the library; outlier here is against his own median</span>
      </div>
      <Library videos={videos} initialWinning={false} own />
    </>
  );
}
