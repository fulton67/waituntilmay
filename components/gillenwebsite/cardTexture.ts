// Card geometry and the canvas painter for each card face, ported from the prototype's cardShape()/paintCard().
// Type follows the bible: one weight (R2, 400 only) and capitals typed into the strings, not transformed (R7).
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";

export const CW = 0.46, CH = 0.3, TAB_W = 0.075, TAB_H = 0.032, R0 = 0.072, T = 0.0016;

export function cardShape(tabSlot: number) {
  const s = new THREE.Shape(), r = 0.012, x0 = -CW / 2, x1 = CW / 2, y0 = 0, y1 = CH;
  const tx0 = x0 + 0.02 + tabSlot * ((CW - 0.04 - TAB_W) / 5), tx1 = tx0 + TAB_W;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(tx1 + 0.006, y1); s.quadraticCurveTo(tx1, y1, tx1, y1 + 0.006); s.lineTo(tx1, y1 + TAB_H - 0.006); s.quadraticCurveTo(tx1, y1 + TAB_H, tx1 - 0.006, y1 + TAB_H);
  s.lineTo(tx0 + 0.006, y1 + TAB_H); s.quadraticCurveTo(tx0, y1 + TAB_H, tx0, y1 + TAB_H - 0.006); s.lineTo(tx0, y1 + 0.006); s.quadraticCurveTo(tx0, y1, tx0 - 0.006, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  for (const cx of [-0.075, 0.075]) {
    const h = new THREE.Path(), w = 0.012, hh = 0.03, cy = 0.006;
    h.moveTo(cx - w / 2, cy); h.lineTo(cx + w / 2, cy); h.lineTo(cx + w / 2, cy + hh - w / 2); h.absarc(cx, cy + hh - w / 2, w / 2, 0, Math.PI, false); h.lineTo(cx - w / 2, cy);
    s.holes.push(h);
  }
  return { s, tx0, tx1 };
}

export const shapes = [...Array(6)].map((_, i) => cardShape(i));

export function wrap(x: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" "), lines: string[] = [];
  let l = "";
  for (const w of words) {
    const t = l ? l + " " + w : w;
    if (x.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t;
  }
  if (l) lines.push(l);
  return lines;
}

export function hue(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// tinted square with the release title, used wherever a release has no artwork
export function paintPlaceholder(x: CanvasRenderingContext2D, r: Release, cx: number, cy: number, cs: number, mono: string) {
  const h = hue(r.artist + r.release), k = cs / 350;
  x.fillStyle = `hsl(${h} 12% 86%)`; x.fillRect(cx, cy, cs, cs);
  x.fillStyle = `hsl(${h} 18% 34%)`; x.font = `400 ${30 * k}px ${mono}`;
  wrap(x, r.release.toUpperCase(), cs - 48 * k).slice(0, 5).forEach((l, j) => x.fillText(l, cx + 24 * k, cy + 52 * k + j * 36 * k));
  x.font = `400 ${20 * k}px ${mono}`; x.fillText("NO ARTWORK ON FILE", cx + 24 * k, cy + cs - 24 * k);
}

// The card face is drawn in the prototype's 1024-wide units (7170f0b) and painted at TEX_W = 2048. The canvas holds
// only what is not type: the paper, the tab, the ruled lines, the red head rule and the cover's outline. It is the
// same on every card, so one texture serves all of them. The strip above the head is the tab colour from edge to
// edge, since only the tab's own shape reaches up there. Type is SDF text (Rolodex.tsx) placed by cardText(); the
// cover is its own plane at COVER.
export const TEX_W = 2048, TEX_H = Math.round((TEX_W * (CH + TAB_H)) / CW);
const U1 = 1024, K1 = U1 / CW, TOP1 = TAB_H * K1, H1 = (U1 * (CH + TAB_H)) / CW;
// 1024-unit canvas coordinates (y down from the top edge) to metres on the card face (y up from the bottom edge)
export const mx = (px: number) => px / K1 - CW / 2;
export const my = (py: number) => CH + TAB_H - py / K1;
export const COVER = { x: 40, y: TOP1 + 52, s: 350 };

export function paintFace(x: CanvasRenderingContext2D) {
  const k = TEX_W / U1;
  x.setTransform(k, 0, 0, k, 0, 0);
  x.fillStyle = "#f6f2e8"; x.fillRect(0, 0, U1, H1);
  x.fillStyle = "#e8dcbc"; x.fillRect(0, 0, U1, TOP1);
  // ruled lines and the red head rule
  x.strokeStyle = "#b4c4dc"; x.lineWidth = 1.5;
  for (let y = TOP1 + 170; y < H1 - 40; y += 46) { x.beginPath(); x.moveTo(420, y); x.lineTo(U1, y); x.stroke(); }
  x.strokeStyle = "#b8362b"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, TOP1 + 24); x.lineTo(U1, TOP1 + 24); x.stroke();
  // the cover's outline, half of it showing round the cover plane
  x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 1; x.strokeRect(COVER.x + 0.5, COVER.y + 0.5, COVER.s - 1, COVER.s - 1);
  x.setTransform(1, 0, 0, 1, 0, 0);
}

// One block of type on a card: its lines, the first line's baseline at (x, y) in metres, size and line step in metres.
export type TextBlock = { key: string; text: string; x: number; y: number; size: number; step: number; color: string; italic?: boolean; anchorX?: "left" | "center"; anchorY?: "top-baseline" | "middle" };

// The prototype's layout (paintCard in 7170f0b), line for line: the artist in capitals (2 lines at most), the release in
// italics (2), the role in red capitals (2), then as many tracks as fit and "+ n more", the card number and the year on
// the tab. Lines are broken with the face's own metrics through `measure` (a 2D context set to the card face).
export function cardText(r: Release, i: number, slot: number, measure: CanvasRenderingContext2D, mono: string): TextBlock[] {
  const tx = 430, tw = U1 - tx - 40, out: TextBlock[] = [];
  const fit = (font: string, text: string, n: number) => { measure.font = font; return wrap(measure, text, tw).slice(0, n); };
  const block = (key: string, lines: string[], px: number, step: number, y: number, color: string, italic = false) =>
    { if (lines.length) out.push({ key, text: lines.join("\n"), x: mx(tx), y: my(y), size: px / K1, step: step / px, color, italic }); };
  const al = fit(`400 44px ${mono}`, r.artist.toUpperCase(), 2);
  block("artist", al, 44, 46, TOP1 + 96, "#1d1b18");
  let y = TOP1 + 96 + al.length * 46 + 4;
  const rl = fit(`italic 400 30px ${mono}`, r.release, 2);
  block("release", rl, 30, 34, y, "#1f2a44", true);
  y += rl.length * 34 + 10;
  const ol = fit(`400 22px ${mono}`, r.role.toUpperCase(), 2);
  block("role", ol, 22, 26, y, "#b8362b");
  y += 60;
  const tracks = r.tracks.map((t) => t.title), room = Math.max(0, Math.floor((H1 - 40 - y) / 34));
  const show = tracks.length > room ? tracks.slice(0, room - 1) : tracks;
  const tl = show.map((t, j) => `${String(j + 1).padStart(2, "0")}  ${t}`);
  if (tracks.length > show.length) tl.push(`+ ${tracks.length - show.length} more`);
  block("tracks", tl, 25, 34, y, "#2b2620");
  block("no", [`No. ${String(i + 1).padStart(2, "0")}`], 20, 20, H1 - 34, "#2b2620");
  const sh = shapes[slot];
  out.push({ key: "year", text: String(r.year), x: sh.tx0 + TAB_W / 2, y: my(TOP1 / 2 + 2), size: 36 / K1, step: 1, color: "#2b2620", anchorX: "center", anchorY: "middle" });
  return out;
}

// the release's cover as a canvas, when it has none on file
export function placeholderCanvas(r: Release, mono: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  paintPlaceholder(c.getContext("2d")!, r, 0, 0, 1024, mono);
  return c;
}
