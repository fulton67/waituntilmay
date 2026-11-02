"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import css from "../ostad.module.css";
import { fmt, PLAT, times, type Video } from "../_lib/types";

function Transcript({ v }: { v: Video }) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!v.tw) return;
    fetch(`/ostad/tr/${v.id}.txt`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((s) => live && setT(s));
    return () => {
      live = false;
    };
  }, [v.id, v.tw]);
  if (!v.tw)
    return <p className={css.mid}>{v.ts === "no_speech" ? "No speech: music or text on screen only." : "No transcript: the audio couldn't be fetched."}</p>;
  if (t == null) return <p className={css.mid}>loading…</p>;
  const ol = v.ol && t.startsWith(v.ol.replace(/…$/, "")) ? v.ol.replace(/…$/, "") : null;
  return (
    <p className={css.transcript} data-testid="transcript">
      {ol ? (
        <>
          <mark className={css.mark}>{ol}</mark>
          {t.slice(ol.length)}
        </>
      ) : (
        t
      )}
    </p>
  );
}

export default function VideoPanel({ v, themeName, onClose }: { v: Video; themeName?: string; onClose: () => void }) {
  const metrics: [string, string][] = [
    ["× the creator's usual", times(v.x)],
    ["views", v.v.toLocaleString()],
    ["views/day", fmt(v.vpd)],
    ["saves+comments per 1k views", v.sc.toFixed(1)],
    ["likes", v.l.toLocaleString()],
    ["comments", v.c.toLocaleString()],
    ["shares", v.s.toLocaleString()],
    ["saves", v.sv.toLocaleString()],
    ["followers", fmt(v.fol)],
    ["posted", v.d ?? "—"],
    ["length", v.dur ? `${Math.round(v.dur)}s` : "—"],
    ["genre", v.g],
    ["format", v.f],
    ["hook", v.ht],
    ["found via", v.src],
  ];
  const tall = v.p !== "youtube" || v.dur == null || v.dur <= 70;
  return (
    <aside className={css.panel} role="dialog" aria-label="video detail" data-testid="panel">
      <div className={css.close}>
        <a href={v.url} target="_blank" rel="noreferrer">
          @{v.h} on {PLAT[v.p]} ↗
        </a>
        <button onClick={onClose}>[close]</button>
      </div>
      {v.emb ? (
        <iframe
          className={tall ? css.embedTall : css.embedWide}
          src={v.emb}
          title={`${PLAT[v.p]} video by @${v.h}`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          loading="lazy"
          data-testid="embed"
        />
      ) : (
        <a href={v.url} target="_blank" rel="noreferrer" className={css.linkout} data-testid="linkout">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/ostad/thumbs/${v.id}.jpg`} alt="" />
          <span>watch on {PLAT[v.p]} ↗</span>
        </a>
      )}
      <dl className={css.kv} style={{ marginTop: 10 }}>
        <dt>about</dt>
        <dd className={css.plain}>{v.subj}</dd>
        <dt>claim</dt>
        <dd className={css.plain}>{v.claim}</dd>
        <dt>tone</dt>
        <dd className={css.plain}>{v.tone.join(", ")}</dd>
        <dt>speaker</dt>
        <dd className={css.plain}>{v.spk}</dd>
        {themeName && (
          <>
            <dt>theme</dt>
            <dd className={css.plain}>
              <Link href={`/ostad/themes/${v.th}`}>{themeName} →</Link>
            </dd>
          </>
        )}
        <dt>for Ostad</dt>
        <dd className={css.plain}>{v.mk ? "makeable" : "not his to make"}{v.mkn ? `: ${v.mkn}` : ""}</dd>
        <dt>audience</dt>
        <dd className={css.plain}>{v.ar ?? <span className={css.mid}>no comments scraped</span>}</dd>
        <dt>× usual</dt>
        <dd>{times(v.x)} · {fmt(v.v)} views</dd>
      </dl>
      <h3>Transcript</h3>
      <Transcript v={v} />
      {v.cap && (
        <>
          <h3>Caption</h3>
          <p>{v.cap}</p>
        </>
      )}
      <details className={css.drawer}>
        <summary>[metrics]</summary>
        <dl className={css.kv}>
          {metrics.map(([k, val]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
      </details>
    </aside>
  );
}
