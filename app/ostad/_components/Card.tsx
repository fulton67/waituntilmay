"use client";
import css from "../ostad.module.css";
import { PLAT, times, type Video } from "../_lib/types";

export default function Card({ v, theme, i, onOpen }: { v: Video; theme?: string; i?: number; onOpen: (v: Video) => void }) {
  return (
    <button className={css.card} data-card data-mk={v.mk ? "1" : "0"} onClick={() => onOpen(v)}>
      <div className={css.thumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/ostad/thumbs/${v.id}.jpg`} alt="" loading="lazy" decoding="async" />
        <span className={css.badge}>{PLAT[v.p]}</span>
        {!v.mk && <span className={css.notmk} title="Ostad couldn't make this version">not his</span>}
      </div>
      <div className={css.meta}>
        <div className={css.row}>
          {i != null && <span className={css.idx}>{String(i + 1).padStart(3, "0")}</span>}
          <span className={css.clip}>@{v.h}</span>
          <span className={css.mono}>{times(v.x)}</span>
        </div>
        <p className={css.ol}>{v.ol ? `“${v.ol}”` : <span className={css.mid}>{v.subj}</span>}</p>
        {theme && <div className={`${css.clip} ${css.mid}`}>{theme}</div>}
      </div>
    </button>
  );
}
