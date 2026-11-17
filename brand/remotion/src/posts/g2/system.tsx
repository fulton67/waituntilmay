import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, Img, useCurrentFrame } from "remotion";
import { useExoFonts } from "../../exo6/look";
import { curve, D24 } from "../../library/motion";
import { photo } from "../kit";

// posts/g2/system.tsx: Grid 2, "the clinical index" (brand/POSTS.md, Grid 2).
// Naim 2026-11-17: grid 1 was too close to his current feed, too little information, too few minor details, spacing, cheap.
// Direction: Dr. Ostad's own colours (brand/EXISTING.md: navy #152235, ivory #f5f2eb, sand #d6c3a0, silver product grey #bcb8b7)
// in the language of the are.na board, pushed further: four-corner meta framing a full-bleed picture (22772082, 30248124), data
// sheets of key / value rows with tabular figures (36747221 OODS "7", 44760710 spec sheet, 33635746 line-up, 16463981 candle), and
// hairline annotation ON the subject (17962306 concentric labelled rings, 30940781 stems with rotated labels, 31815447 edge rulers,
// 23958815 form-field overlay, 9606895 routine timeline). Big tight grotesk (NHG Display), mono for data, a serif italic only as an
// accent (47311638). No glass chips, no rounded tiles, no bright blue: those read as UI and as "cheap".

export const W = 1080, H = 1350;
export const m = 48; // outer margin (board posters sit at 3-5 % W)
export const NAVY = "#152235", IVORY = "#f5f2eb", SAND = "#d6c3a0", SILVER = "#bcb8b7";
export const NAVY60 = "rgba(21,34,53,.62)", IVORY60 = "rgba(245,242,235,.66)", NAVY14 = "rgba(21,34,53,.16)", IVORY22 = "rgba(245,242,235,.28)";
export const DISPLAY = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';
export const TEXT = '"neue-haas-grotesk-text", "Inter", Arial, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, monospace';
export const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';

const PLEX = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=block";
/** NHG + Cormorant (kit vzz0hgt) and IBM Plex Mono; holds the frame until every face is really loaded */
export const useG2Fonts = () => {
  useExoFonts();
  const [h] = useState(() => delayRender("IBM Plex Mono", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    let l = document.querySelector<HTMLLinkElement>(`link[href="${PLEX}"]`);
    if (!l) { l = document.createElement("link"); l.rel = "stylesheet"; l.href = PLEX; document.head.appendChild(l); }
    const sheet = new Promise<void>((res) => { if (l!.sheet) return res(); l!.addEventListener("load", () => res()); l!.addEventListener("error", () => res()); });
    sheet.then(() => Promise.all(["400 20px 'IBM Plex Mono'", "500 20px 'IBM Plex Mono'"].map((f) => document.fonts.load(f))))
      .then((r) => (r.every((x) => x.length) ? continueRender(h) : cancelRender(new Error("IBM Plex Mono did not load"))))
      .catch((e) => cancelRender(e));
  }, [h]);
};

export const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const p = (f: number, s: number, d: number, c: (x: number) => number = curve.arrive) => (d <= 0 ? (f >= s ? 1 : 0) : c(cl((f - s) / d)));

// ------------------------------------------------------------------------------------------------ type
export const mono = (px = 15, color = NAVY, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: MONO, fontWeight: 400, fontSize: px, lineHeight: 1.35, letterSpacing: "0.02em", textTransform: "uppercase", color, fontVariantNumeric: "tabular-nums", ...extra,
});
export const disp = (px: number, color = NAVY, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: DISPLAY, fontWeight: 500, fontSize: px, lineHeight: 0.92, letterSpacing: "-0.035em", color, ...extra,
});
export const body = (px = 24, color = NAVY, w = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: TEXT, fontWeight: w, fontSize: px, lineHeight: 1.28, letterSpacing: "-0.003em", color, ...extra,
});
export const ital = (px: number, color = NAVY, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: px, lineHeight: 1, letterSpacing: "-0.01em", color, ...extra,
});

// ------------------------------------------------------------------------------------------------ motion wrappers (MOTION.md tokens)
/** fade + rise on `arrive`; `y` is the rise in px */
export const In: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; y?: number }> = ({ at, children, style, y = 14 }) => {
  const f = useCurrentFrame();
  const q = p(f, at, D24.arrive);
  return <div style={{ position: "absolute", opacity: q, transform: `translateY(${(1 - q) * y}px)`, ...style }}>{children}</div>;
};
/** a line of type revealed left -> right on `sweep` (the row wipe, 14 f) */
export const Wipe: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; d?: number }> = ({ at, children, style, d = D24.rowWipe }) => {
  const f = useCurrentFrame();
  const q = p(f, at, d, curve.sweep);
  return <div style={{ position: "absolute", clipPath: `inset(-20% ${(1 - q) * 100}% -20% 0)`, ...style }}>{children}</div>;
};

// ------------------------------------------------------------------------------------------------ the detail layer
/** four-corner meta: the frame every post shares (22772082, 30248124, 47483045) */
export const Corners: React.FC<{ tl?: React.ReactNode; tr?: React.ReactNode; bl?: React.ReactNode; br?: React.ReactNode; color?: string; at?: number; inset?: number }> = ({
  tl, tr, bl, br, color = NAVY, at = 0, inset = m,
}) => {
  const f = useCurrentFrame();
  const q = p(f, at, D24.arrive);
  const s = mono(15, color, { position: "absolute", opacity: q, maxWidth: 460 });
  return (
    <>
      {tl ? <div style={{ ...s, left: inset, top: inset - 6 }}>{tl}</div> : null}
      {tr ? <div style={{ ...s, right: inset, top: inset - 6, textAlign: "right" }}>{tr}</div> : null}
      {bl ? <div style={{ ...s, left: inset, bottom: inset - 6 }}>{bl}</div> : null}
      {br ? <div style={{ ...s, right: inset, bottom: inset - 6, textAlign: "right" }}>{br}</div> : null}
    </>
  );
};

/** a hairline that draws on `sweep` */
export const Rule: React.FC<{ at: number; x: number; y: number; w: number; color?: string; vertical?: boolean; t?: number }> = ({ at, x, y, w, color = NAVY14, vertical, t = 1 }) => {
  const f = useCurrentFrame();
  const q = p(f, at, D24.rowWipe, curve.sweep);
  return <div style={{ position: "absolute", left: x, top: y, width: vertical ? t : w * q, height: vertical ? w * q : t, background: color }} />;
};

/** key / value data row with a hairline under it (44760710, 36747221). Value is tabular. */
export const Row: React.FC<{ at: number; x: number; y: number; w: number; k: React.ReactNode; v: React.ReactNode; color?: string; line?: string; vSize?: number; kw?: number }> = ({
  at, x, y, w, k, v, color = NAVY, line = NAVY14, vSize = 24, kw = 0.42,
}) => {
  const f = useCurrentFrame();
  const q = p(f, at, D24.arrive);
  const r = p(f, at, D24.rowWipe, curve.sweep);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      <div style={{ display: "flex", alignItems: "baseline", opacity: q, paddingBottom: 12 }}>
        <div style={{ ...mono(14, color === NAVY ? NAVY60 : IVORY60), width: w * kw, flexShrink: 0 }}>{k}</div>
        <div style={{ ...body(vSize, color, 400), fontVariantNumeric: "tabular-nums" }}>{v}</div>
      </div>
      <div style={{ height: 1, width: w * r, background: line }} />
    </div>
  );
};

/** an edge ruler: minor ticks every `step`, major every 5, numbered (31815447) */
export const Ruler: React.FC<{ at: number; x: number; y: number; len: number; step?: number; vertical?: boolean; color?: string; label?: (i: number) => string; side?: 1 | -1 }> = ({
  at, x, y, len, step = 12, vertical = true, color = NAVY, label, side = 1,
}) => {
  const f = useCurrentFrame();
  const q = p(f, at, D24.trace, curve.sweep);
  const n = Math.floor(len / step);
  const shown = Math.floor(n * q);
  return (
    <>
      {Array.from({ length: shown + 1 }, (_, i) => {
        const major = i % 5 === 0, L = major ? 18 : 9;
        const pos = i * step;
        const st: React.CSSProperties = vertical
          ? { left: side === 1 ? x : x - L, top: y + pos, width: L, height: 1 }
          : { left: x + pos, top: side === 1 ? y : y - L, width: 1, height: L };
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", background: color, opacity: major ? 0.9 : 0.5, ...st }} />
            {major && label ? (
              <div style={{ position: "absolute", ...mono(11, color), opacity: 0.8,
                ...(vertical ? { left: side === 1 ? x + 24 : x - 24 - 60, top: y + pos - 8, width: 60, textAlign: side === 1 ? "left" : "right" } : { left: x + pos - 30, top: side === 1 ? y + 22 : y - 38, width: 60, textAlign: "center" }) }}>
                {label(i / 5)}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

/** a hairline leader with an open chevron head, drawn tail -> tip on `sweep`; the label sits at the tail (17962306, 22036380) */
export const Leader: React.FC<{ at: number; pts: { x: number; y: number }[]; color?: string; label?: React.ReactNode; labelStyle?: React.CSSProperties; d?: number }> = ({
  at, pts, color = NAVY, label, labelStyle, d = 12,
}) => {
  const f = useCurrentFrame();
  const q = p(f, at, d, curve.sweep);
  if (q <= 0) return null;
  const segs = pts.slice(1).map((b, i) => Math.hypot(b.x - pts[i].x, b.y - pts[i].y));
  const total = segs.reduce((a, b) => a + b, 0);
  const dpath = pts.map((pt, i) => `${i ? "L" : "M"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  const A = pts[pts.length - 2], B = pts[pts.length - 1];
  const ang = Math.atan2(B.y - A.y, B.x - A.x), hl = 11, sp = 0.5;
  const head = `M${(B.x - hl * Math.cos(ang - sp)).toFixed(1)} ${(B.y - hl * Math.sin(ang - sp)).toFixed(1)} L${B.x.toFixed(1)} ${B.y.toFixed(1)} L${(B.x - hl * Math.cos(ang + sp)).toFixed(1)} ${(B.y - hl * Math.sin(ang + sp)).toFixed(1)}`;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={dpath} fill="none" stroke={color} strokeWidth={1.4} strokeDasharray={total} strokeDashoffset={total * (1 - q)} />
        <path data-arrowhead d={head} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={q >= 0.98 ? 1 : 0} />
      </svg>
      {label ? <div style={{ position: "absolute", opacity: p(f, at, D24.arrive), ...labelStyle }}>{label}</div> : null}
    </>
  );
};

/** a photo covering a box, ungraded; `pt` maps image-normalised coords to frame px */
export const cover = (iw: number, ih: number, b: { x: number; y: number; w: number; h: number }, fx = 0.5, fy = 0.5, zoom = 1) => {
  const s = Math.max(b.w / iw, b.h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const ox = b.x + (b.w - dw) * fx, oy = b.y + (b.h - dh) * fy;
  return { dw, dh, ox, oy, pt: (nx: number, ny: number) => ({ x: ox + nx * dw, y: oy + ny * dh }) };
};
/** plate, then picture (`plate` 18 + 18 f); a very slow push (0.6 % over the post) keeps the still alive in motion */
export const Pic: React.FC<{ id: string; iw: number; ih: number; box: { x: number; y: number; w: number; h: number }; fx?: number; fy?: number; zoom?: number; at?: number; plate?: string }> = ({
  id, iw, ih, box, fx = 0.5, fy = 0.5, zoom = 1, at = 0, plate = SILVER,
}) => {
  const f = useCurrentFrame();
  const c = cover(iw, ih, box, fx, fy, zoom);
  const a = p(f, at, D24.plate, curve.plate), b = p(f, at + D24.plate, D24.plate, curve.plate);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, overflow: "hidden", background: plate, opacity: a }}>
      <Img src={photo(id)} style={{ position: "absolute", left: c.ox - box.x, top: c.oy - box.y, width: c.dw, height: c.dh, opacity: b }} />
    </div>
  );
};

/** figure caption under / on a picture: "Fig. 1 — what it is — date" (47311638, 2527310) */
export const Fig: React.FC<{ at: number; x: number; y: number; n: string; text: string; date?: string; color?: string; w?: number }> = ({ at, x, y, n, text, date, color = NAVY, w = 520 }) => (
  <In at={at} style={{ left: x, top: y, width: w, ...mono(13, color) }}>
    <span style={{ opacity: 0.6 }}>Fig. {n}</span>&nbsp;&nbsp;{text}{date ? <span style={{ opacity: 0.6 }}>&nbsp;&nbsp;{date}</span> : null}
  </In>
);
