"use client";
// SOURCES #12: the release display. The cover is large, with artist, release, year, role and tracks in a column
// beside it (below it on phones). Reveal and switch follow luckydaye.com's lightbox: the cover fades in over
// opacity .25s (4bda12d4093ea50f.css:1 .lightbox-enter-active), and when the release changes the old cover
// fades out over the same .25s while the new one fades in. The cover is the 2048 file, object-fit: contain.
import { useState } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { coverAt, no3, pad2, caps } from "./shared";
import { hue } from "./cardTexture";
import css from "./site.module.css";

function Art({ r, cls }: { r: Release; cls: string }) {
  const src = coverAt(r, 2048);
  // eslint-disable-next-line @next/next/no-img-element -- local 2048 JPEG shown at its natural square; no resizing service
  if (src) return <img className={cls} src={src} alt={`${r.artist}, ${r.release} cover`} width={2048} height={2048} decoding="async" />;
  const h = hue(r.artist + r.release);
  return (
    <div className={`${cls} ${css.noArt}`} style={{ background: `hsl(${h} 12% 86%)`, color: `hsl(${h} 18% 34%)` }}>
      {caps(r.release)}
      <span>NO ARTWORK ON FILE</span>
    </div>
  );
}

export default function ReleaseView({
  releases, i, mode, onPrev, onNext,
}: {
  releases: Release[];
  i: number;
  mode: "inline" | "panel";
  onPrev: () => void;
  onNext: () => void;
}) {
  const r = releases[i];
  // the outgoing cover stays on top of the stack until its .25s fade-out ends
  const [pair, setPair] = useState<{ cur: number; prev: number | null }>({ cur: i, prev: null });
  if (pair.cur !== i) setPair({ cur: i, prev: pair.cur });
  const tracks = r.tracks.length ? r.tracks : [{ title: `${r.release} (full release)`, role: r.role }];

  return (
    <article className={mode === "panel" ? css.viewPanel : css.viewInline} data-release={r.id} data-src="12">
      <div className={css.coverBox}>
        <Art key={`c${i}`} r={r} cls={`${css.cover} ${css.coverIn}`} />
        {pair.prev !== null && pair.prev !== i && (
          <span
            key={`p${pair.prev}`}
            className={css.coverOutWrap}
            onAnimationEnd={() => setPair((p) => ({ ...p, prev: null }))}
          >
            <Art r={releases[pair.prev]} cls={css.cover} />
          </span>
        )}
      </div>

      <div className={css.info} key={`i${i}`}>
        <p className={css.label} data-src="09">{no3(i + 1)} / {no3(releases.length)}</p>
        <h2 className={css.artistName}>{r.artist}</h2>
        {/* SOURCES #16 chantalmichelle.me: <p>Title <sup class="date">[2024]</sup></p> (pages/000.html:153) */}
        <p className={css.releaseTitle}>
          {r.release}<sup className={css.date} data-src="16">[{r.year}]</sup>
        </p>
        <p className={css.role}>{caps(r.role)}</p>

        {/* SOURCES #15 wearesteve.net .message rows: .meta : .message-text on a 3-column grid (20d6af20cab87f50.css:634) */}
        <div className={css.tracks} role="list" aria-label="Tracks" data-src="15">
          {tracks.map((t, k) => (
            <div key={k} className={css.message} role="listitem">
              <div className={css.meta}>{pad2(k + 1)}</div>
              <div className={css.desktopMeta}>:</div>
              <div className={css.messageText}>
                {t.title}
                <span className={css.trackRole}>{caps(t.role)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* SOURCES #14 rosalia.com div.carousel-controls > button.carousel-button "←" "→" (pages/000.html:481) */}
        <div className={css.carouselControls} data-src="14">
          <button type="button" className={css.carouselButton} aria-label="Previous release" onClick={onPrev}>←</button>
          <button type="button" className={css.carouselButton} aria-label="Next release" onClick={onNext}>→</button>
        </div>
      </div>
    </article>
  );
}
