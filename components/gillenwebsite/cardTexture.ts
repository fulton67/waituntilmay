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

export const TEX_W = 1024, TEX_H = Math.round((1024 * (CH + TAB_H)) / CW), K = TEX_W / CW, TOP = TAB_H * K;

export function paintCard(x: CanvasRenderingContext2D, r: Release, i: number, slot: number, img: HTMLImageElement | null, mono: string) {
  const sh = shapes[slot], W = TEX_W, H = TEX_H;
  x.fillStyle = "#f6f2e8"; x.fillRect(0, 0, W, H);
  // tab: year
  x.fillStyle = "#e8dcbc"; x.fillRect((sh.tx0 + CW / 2) * K, 0, TAB_W * K, TOP + 4);
  x.fillStyle = "#2b2620"; x.font = `400 36px ${mono}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(String(r.year), (sh.tx0 + TAB_W / 2 + CW / 2) * K, TOP / 2 + 2);
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  // ruled lines and the red head rule
  x.strokeStyle = "#b4c4dc"; x.lineWidth = 1.5;
  for (let y = TOP + 170; y < H - 40; y += 46) { x.beginPath(); x.moveTo(420, y); x.lineTo(W, y); x.stroke(); }
  x.strokeStyle = "#b8362b"; x.lineWidth = 3; x.beginPath(); x.moveTo(0, TOP + 24); x.lineTo(W, TOP + 24); x.stroke();
  // cover
  const cx = 40, cy = TOP + 52, cs = 350;
  if (img) x.drawImage(img, cx, cy, cs, cs);
  else paintPlaceholder(x, r, cx, cy, cs, mono);
  x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 1; x.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);
  // text column
  const tx = 430, tw = W - tx - 40;
  x.fillStyle = "#1d1b18"; x.font = `400 44px ${mono}`;
  const al = wrap(x, r.artist.toUpperCase(), tw).slice(0, 2);
  al.forEach((l, j) => x.fillText(l, tx, TOP + 96 + j * 46));
  let y = TOP + 96 + al.length * 46 + 4;
  x.font = `italic 400 30px ${mono}`; x.fillStyle = "#1f2a44";
  const rl = wrap(x, r.release, tw).slice(0, 2);
  rl.forEach((l, j) => x.fillText(l, tx, y + j * 34));
  y += rl.length * 34 + 10;
  x.font = `400 22px ${mono}`; x.fillStyle = "#b8362b";
  wrap(x, r.role.toUpperCase(), tw).slice(0, 2).forEach((l, j) => x.fillText(l, tx, y + j * 26));
  y += 60;
  x.font = `400 25px ${mono}`; x.fillStyle = "#2b2620";
  const tracks = r.tracks.map((t) => t.title), room = Math.max(0, Math.floor((H - 40 - y) / 34));
  const show = tracks.length > room ? tracks.slice(0, room - 1) : tracks;
  show.forEach((t, j) => x.fillText(`${String(j + 1).padStart(2, "0")}  ${t}`, tx, y + j * 34));
  if (tracks.length > show.length) x.fillText(`+ ${tracks.length - show.length} more`, tx, y + show.length * 34);
  // card number, lower left
  x.font = `400 20px ${mono}`; x.fillStyle = "#2b2620"; x.fillText(`No. ${String(i + 1).padStart(2, "0")}`, 40, H - 34);
}

export function blankTexture(slot: number) {
  const c = document.createElement("canvas"), W = 512, H = Math.round((512 * (CH + TAB_H)) / CW);
  c.width = W; c.height = H;
  const x = c.getContext("2d")!, k = W / CW, top = TAB_H * k, sh = shapes[slot];
  x.fillStyle = "#f2ecdf"; x.fillRect(0, 0, W, H); x.fillStyle = "#e6dcc2"; x.fillRect((sh.tx0 + CW / 2) * k, 0, TAB_W * k, top + 2);
  x.strokeStyle = "#b8362b"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, top + 12); x.lineTo(W, top + 12); x.stroke();
  x.strokeStyle = "#bfcce0"; x.lineWidth = 1;
  for (let y = top + 40; y < H - 20; y += 23) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// covers are same-origin files in /public/covers; loaded once and shared by cards, panel and caption
const coverCache = new Map<string, Promise<HTMLImageElement | null>>();
export function loadCover(src: string) {
  if (!src) return Promise.resolve(null);
  let p = coverCache.get(src);
  if (!p) {
    p = new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
    coverCache.set(src, p);
  }
  return p;
}
