import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Brackets, Flow, Mark, Pin, Ring, type Pt } from "../devices/Markup";
import { useElza } from "../Fonts";

// The markup devices (v2, glass + hairline) on a timeline. `footage` false = transparent (alpha) render; true = over the rosacea-laser
// clip from 18 s in. `track` = YuNet face landmarks per frame for that window (public/rosacea-laser/face_track.json, loaded by Root's
// calculateMetadata), so the rings and pins follow his face; without it the devices use a fixed face at the frame's usual place.
export const MARKUP_DEMO_SECONDS = 9;
export type FaceTrack = { cols: string[]; rows: number[][] } | null;

const FALLBACK = [313, 518, 385, 614, 420, 750, 614, 755, 517, 870, 422, 958, 595, 964];

export const MarkupDemo: React.FC<{ footage?: boolean; track?: FaceTrack }> = ({ footage = false, track = null }) => {
  useElza();
  const row = (f: number) => (track ? track.rows[Math.min(track.rows.length - 1, Math.max(0, f))] : FALLBACK);
  const face = (f: number) => {
    const [x, y, w, h, rex, rey, lex, ley, nx, ny, rmx, rmy] = row(f);
    const d = lex - rex;
    return { x, y, w, h, d, rex, rey, lex, ley, nx, ny, rmx, rmy };
  };
  const cheek = (f: number): Pt => { const k = face(f); return { x: k.rex - 0.1 * k.d, y: (k.rey + k.rmy) / 2 + 0.1 * k.d }; };
  const ala = (f: number): Pt => { const k = face(f); return { x: k.nx + 0.2 * k.d, y: k.ny + 0.02 * k.d }; };
  const brow = (f: number): Pt => { const k = face(f); return { x: (k.rex + k.lex) / 2, y: (k.rey + k.ley) / 2 - 0.05 * k.d }; };
  const beside = (f: number): Pt => { const k = face(f); return { x: k.x + k.w + 30, y: k.ny - 0.2 * k.d }; };
  const d0 = face(0).d;
  return (
    <AbsoluteFill style={{ background: footage ? "#000" : "transparent" }}>
      {footage && <OffthreadVideo src={staticFile("rosacea-laser/footage.mp4")} startFrom={18 * 30} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      {/* 0.3-2.6 s: ring around the redness on his cheek, labelled */}
      <Ring c={cheek} rx={0.42 * d0} ry={0.34 * d0} rot={-12} at={0.3} dur={2.3} label="Redness" side="left" />
      {/* 2.8-4.8 s: pin on the side of the nose (the vessels), and a dotted arc over the brow (where it spreads) */}
      <Pin p={ala} at={2.8} dur={2.0} label="Blood vessels" side="right" len={110} rise={-50} />
      <Flow c={brow} rad={0.8 * d0} a0={215} a1={325} at={3.3} dur={1.5} />
      {/* 5.0-6.6 s: not this; 6.8-8.8 s: this, with the face framed */}
      <Mark p={beside} kind="no" at={5.0} dur={1.6} label="Creams" />
      <Mark p={beside} kind="yes" at={6.8} dur={2.0} label="Laser" />
      <Brackets box={(f) => { const k = face(f); return { x: k.x + 0.04 * k.w, y: k.y + 0.12 * k.h, w: 0.92 * k.w, h: 0.86 * k.h }; }} at={6.8} dur={2.0} />
    </AbsoluteFill>
  );
};
