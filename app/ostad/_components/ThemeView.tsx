"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import css from "../ostad.module.css";
import { times, type Theme, type Video } from "../_lib/types";
import Card from "./Card";
import { Blocks } from "./Md";
import VideoPanel from "./VideoPanel";
import { ScopeToggle, useScope } from "./Scope";

export function ThemeIndex({ themes }: { themes: Theme[] }) {
  return (
    <ol className={css.themeList} data-testid="themes">
      {themes.map((t, i) => (
        <li key={t.slug}>
          <span className={css.idx}>{String(i + 1).padStart(2, "0")}</span>
          <div>
            <Link href={`/ostad/themes/${t.slug}`} className={css.themeName}>
              {t.name} →
            </Link>
            <p className={css.p}>{t.short}</p>
            <p className={`${css.mid} ${css.mono}`}>
              {t.n} videos · median {times(t.medX)} · {Math.round(t.winShare * 100)}% winning · {t.mkN} he could make
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ThemeView({ theme, videos, prev, next }: { theme: Theme; videos: Video[]; prev?: Theme; next?: Theme }) {
  const { all } = useScope();
  const [open, setOpen] = useState<Video | null>(null);
  const byId = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);
  const mine = useMemo(() => videos.filter((v) => v.th === theme.slug && (all || v.mk)).sort((a, b) => b.x - a.x), [videos, theme, all]);
  const ex = theme.examples.map((id) => byId[id]).filter(Boolean);
  const total = videos.filter((v) => v.th === theme.slug).length;
  return (
    <>
      <div className={css.bar}>
        <span className={`${css.count} ${css.mono}`} data-testid="count" data-count={mine.length}>
          Showing {mine.length} of {total} in this theme
        </span>
        <ScopeToggle makeable={theme.mkN} total={total} />
      </div>
      <p className={css.mid} style={{ marginTop: 12 }}>
        <Link href="/ostad/themes">← all themes</Link>
      </p>
      <h1 className={css.subject}>{theme.name}</h1>
      <p className={`${css.mono} ${css.mid}`} style={{ marginBottom: 14 }}>
        {theme.n} videos ({Math.round(theme.share * 100)}% of the corpus) · median {times(theme.medX)} · {Math.round(theme.winShare * 100)}% winning ·{" "}
        {Math.round(theme.mkShare * 100)}% he could make
      </p>
      <h2 className={css.h2}>Watch the examples</h2>
      <div className={css.row4} data-testid="examples">
        {ex.map((v) => (
          <Card key={v.id} v={v} onOpen={setOpen} />
        ))}
      </div>
      <article className={css.read}>
        <Blocks blocks={theme.blocks} />
      </article>
      <h2 className={css.h2}>What the audience says back</h2>
      <blockquote className={css.quote} data-testid="says">{theme.says}</blockquote>
      <h2 className={css.h2}>Every video in this theme</h2>
      <div className={css.grid}>
        {mine.map((v, i) => (
          <Card key={v.id} v={v} i={i} onOpen={setOpen} />
        ))}
      </div>
      <p className={css.more}>
        {prev && <Link href={`/ostad/themes/${prev.slug}`}>← {prev.name}</Link>}{" "}
        {next && <Link href={`/ostad/themes/${next.slug}`}>{next.name} →</Link>}
      </p>
      {open && <VideoPanel v={open} themeName={theme.name} onClose={() => setOpen(null)} />}
    </>
  );
}
