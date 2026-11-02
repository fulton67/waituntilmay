"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import css from "../ostad.module.css";
import { times, type Care, type Theme, type Video } from "../_lib/types";
import Card from "./Card";
import VideoPanel from "./VideoPanel";
import { useScope } from "./Scope";

const KEY = "ostad.answers";

export default function CaresView({ cares, videos, themes }: { cares: Care[]; videos: Video[]; themes: Theme[] }) {
  const { all } = useScope();
  const [open, setOpen] = useState<Video | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const byId = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);
  const tname = useMemo(() => Object.fromEntries(themes.map((t) => [t.slug, t.name])), [themes]);
  useEffect(() => {
    try {
      setAnswers(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch {}
  }, []);
  const save = (k: string, s: string) => {
    const next = { ...answers, [k]: s };
    setAnswers(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  return (
    <>
      <p className={css.lede}>
        The {cares.length} questions and worries this audience keeps coming back to, ranked by how many videos touch them, weighted by how those videos did. Open one to see
        the videos that answer it. Type Ostad&apos;s answer in the box; it&apos;s saved in this browser only.
      </p>
      <ol className={css.cares} data-testid="cares">
        {cares.map((c) => {
          const vs = c.ids.map((id) => byId[id]).filter((v) => v && (all || v.mk));
          return (
            <li key={c.rank}>
              <details>
                <summary>
                  <span className={css.idx}>{String(c.rank).padStart(2, "0")}</span>
                  <span className={css.careQ}>{c.q}</span>
                  <span className={`${css.mid} ${css.mono}`}>
                    {c.n} videos · median {times(c.medX)} · usually answered by {c.who}
                  </span>
                </summary>
                <div className={css.careBody}>
                  <p className={css.p}>{c.note}</p>
                  <p className={css.p}>
                    <span className={css.mid}>Ostad today: </span>
                    {c.ostad}
                  </p>
                  <label className={css.answer}>
                    <span className={css.mid}>Ostad&apos;s answer</span>
                    <input
                      type="text"
                      value={answers[c.rank] ?? ""}
                      onChange={(e) => save(String(c.rank), e.target.value)}
                      placeholder="type during the meeting"
                      data-testid="answer"
                    />
                  </label>
                  <div className={css.row4}>
                    {vs.slice(0, 8).map((v) => (
                      <Card key={v.id} v={v} theme={tname[v.th]} onOpen={setOpen} />
                    ))}
                  </div>
                  {vs.length === 0 && <p className={css.mid}>No makeable videos answer it yet. That&apos;s the opening. <Link href="/ostad/watch">watch everything →</Link></p>}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {open && <VideoPanel v={open} themeName={tname[open.th]} onClose={() => setOpen(null)} />}
    </>
  );
}
