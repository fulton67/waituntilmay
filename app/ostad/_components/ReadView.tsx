"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import css from "../ostad.module.css";
import type { Ad, Block, Theme, Video } from "../_lib/types";
import Card from "./Card";
import { Blocks } from "./Md";
import Strip from "./Strip";
import VideoPanel from "./VideoPanel";
import { ScopeToggle, useScope } from "./Scope";

type Section = { head?: Block; body: Block[] };

// REPORT2.md, parsed at build time. A "### Theme {#slug}" heading becomes a theme section:
// its paragraphs, then four example cards. "<!-- figure -->" places the page's one figure.
export default function ReadView({ blocks, themes, videos, ads }: { blocks: Block[]; themes: Theme[]; videos: Video[]; ads: Ad[] }) {
  const { all } = useScope();
  const [open, setOpen] = useState<Video | null>(null);
  const byId = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);
  const theme = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t])), [themes]);
  const scoped = useMemo(() => (all ? videos : videos.filter((v) => v.mk)), [all, videos]);
  const makeable = videos.filter((v) => v.mk).length;

  const sections: Section[] = [];
  let cur: Section = { body: [] };
  for (const b of blocks) {
    if (b.t === "h2" || b.t === "h3") {
      sections.push(cur);
      cur = { head: b, body: [] };
    } else cur.body.push(b);
  }
  sections.push(cur);

  const examples = (slug: string) =>
    (theme[slug]?.examples ?? [])
      .map((id) => byId[id])
      .filter((v) => v && (all || v.mk))
      .slice(0, 4);

  return (
    <>
      <div className={css.bar}>
        <span className={`${css.count} ${css.mono}`} data-testid="count" data-count={scoped.length}>
          Showing {scoped.length} of {videos.length}
        </span>
        <ScopeToggle makeable={makeable} total={videos.length} />
      </div>
      <article className={css.read}>
        {sections.map((s, i) => {
          const slug = s.head?.theme;
          return (
            <section key={i} className={slug ? css.themeSec : undefined} id={slug}>
              {s.head && (
                <Blocks
                  blocks={[
                    {
                      ...s.head,
                      s: slug ? `${s.head.s}  [→](/ostad/themes/${slug})` : s.head.s,
                    },
                  ]}
                />
              )}
              {s.body.map((b, j) =>
                b.t === "fig" ? (
                  <Strip key={j} videos={scoped} themes={themes} />
                ) : (
                  <Blocks key={j} blocks={[b]} />
                ),
              )}
              {slug && (
                <div className={css.row4}>
                  {examples(slug).map((v) => (
                    <Card key={v.id} v={v} onOpen={setOpen} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <details className={css.drawer} style={{ marginTop: 30 }}>
          <summary>[active Meta ads in the niche: {ads.length}]</summary>
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>advertiser</th>
                  <th>headline / body</th>
                  <th>running since</th>
                  <th>search</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((a, i) => (
                  <tr key={i}>
                    <td>{a.page_url ? <a href={a.page_url} target="_blank" rel="noreferrer">{a.advertiser}</a> : a.advertiser}</td>
                    <td>
                      {a.headline && <div>{a.headline}</div>}
                      <div className={css.mid}>{a.body.slice(0, 220)}</div>
                    </td>
                    <td className={css.n}>{a.start ?? "—"}{a.days ? ` · ${a.days}d` : ""}</td>
                    <td>{a.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className={css.mid} style={{ marginTop: 20 }}>
          Every video: <Link href="/ostad/watch">watch →</Link>
        </p>
      </article>
      {open && <VideoPanel v={open} themeName={theme[open.th]?.name} onClose={() => setOpen(null)} />}
    </>
  );
}
