// GelPair (Oct14ReelV6c, 2026-11-19): Evolus' own lab clips of the two gels, side by side, synced, same size, in rounded glass windows
// on one card: Evolysse Form left (a bead that stands and holds under the tweezers), Evolysse Smooth right (flatter, spreads).
// The literal picture of his "It's not as thick" (two gels, two jobs). Played as 24 fps JPG sequences (GIF -> mp4 frame-blended to 24 fps
// -> 1.5-9.5 s at 1.655x, brand/remotion/public/objects/evolus/gel/), so the HDR build reads them as graphics (sRGB, the "over" pass),
// not as HLG card clips. Freeze guard: the clip unmounts at its last frame, never holds it. Credit: "Images: Evolus, Inc."
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { card } from "../components/Ro";
import { caps, disp, INK, life, MUTED, vis } from "../jan08/look";

export type GelSide = { seq: string; n: number; label: string; note?: string }; // seq: "objects/evolus/gel/form_" (+ 0001.jpg)
export const GelPair: React.FC<{
  s: number; out: number; x: number; y: number; w: number; eyebrow: string; title: string; left: GelSide; right: GelSide;
  credit: string; gap?: number; pad?: number; crop?: [number, number]; cropX?: [number, number]; // crop = source rows shown (of 450, drops the dark band); cropX = columns (of 800, the bead)
}> = ({ s, out, x, y, w, eyebrow, title, left, right, credit, gap = 20, pad = 28, crop = [20, 400], cropX = [0, 800] }) => {
  const f = useCurrentFrame();
  if (!vis(f, s, out)) return null;
  const ww = (w - 2 * pad - gap) / 2, k = ww / (cropX[1] - cropX[0]), wh = (crop[1] - crop[0]) * k;
  const head = 128, h = head + wh + 86;
  const win = (g: GelSide, i: number) => {
    const fr = f - s; // the two clips share one clock: synced
    const live = fr >= 0 && fr < g.n;
    return <div key={i} style={{ position: "absolute", left: pad + i * (ww + gap), top: head, width: ww }}>
      <div style={{ position: "relative", width: ww, height: wh, borderRadius: 18, overflow: "hidden", background: "#d9d9dc",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), 0 10px 30px rgba(8,12,22,.18)" }}>
        {live && <Img src={staticFile(`${g.seq}${String(fr + 1).padStart(4, "0")}.jpg`)}
          style={{ position: "absolute", left: -cropX[0] * k, top: -crop[0] * k, width: 800 * k, height: 450 * k, maxWidth: "none" }} />}
      </div>
      <div style={{ marginTop: 14, ...disp(34, INK), fontWeight: 600 }}>{g.label}</div>
      {g.note && <div style={{ marginTop: 4, ...caps(20, MUTED) }}>{g.note}</div>}
    </div>;
  };
  return (
    <div style={{ ...card(24), left: x, top: y, width: w, height: h + 30, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: pad, top: 28, ...caps(24, MUTED) }}>{eyebrow}</div>
      <div style={{ position: "absolute", left: pad, top: 62, width: w - 2 * pad, ...disp(44, INK) }}>{title}</div>
      {win(left, 0)}{win(right, 1)}
      <div style={{ position: "absolute", right: pad, bottom: 16, ...caps(16, MUTED) }}>{credit}</div>
    </div>
  );
};
