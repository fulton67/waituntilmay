// Jan 08 filler-fatigue reel (9:16, 24 fps): shared look and motion helpers. Kit tokens only (lint PAL): ink #1d2230, muted #6b7183,
// cream #f2efed, white, sand accent #bf8662, warm grey #c3bdbb. Markings on photos are white (Naim's reel rulings); drawings on glass are ink.
import { curve, D24 } from "../library/motion";
import { clamp } from "../brand";

export const W = 1080, H = 1920, M = 98, SAFE_T = 250, CAP_T = 1594, FPS = 24;
export const INK = "#1d2230", MUTED = "#6b7183", WHITE = "#ffffff", CREAM = "#f2efed", SAND = "#bf8662", GREY = "#c3bdbb";
export const D = D24;
export const FONT = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';

export const p = (frame: number, s: number, d: number, c: keyof typeof curve = "sweep") => (d <= 0 ? (frame >= s ? 1 : 0) : curve[c](clamp((frame - s) / d)));
export const life = (frame: number, s: number, out = Infinity, rise = 16): React.CSSProperties => {
  const i = p(frame, s, D.arrive, "arrive"), o = p(frame, out, D.exit, "exit");
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * rise + o * 7}px)` };
};
export const vis = (frame: number, s: number, out = Infinity) => frame >= s && frame < out + D.exit;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const caps = (px: number, color = MUTED): React.CSSProperties => ({ font: `500 ${px}px/1.1 ${FONT}`, letterSpacing: "0.1em", textTransform: "uppercase", color });
export const disp = (px: number, color = INK, w = 600): React.CSSProperties => ({ font: `${w} ${px}px/1.04 ${FONT}`, letterSpacing: "-0.01em", color });
export const ON_FOOTAGE = "0 2px 10px rgba(0,0,0,.45), 0 0 2px rgba(0,0,0,.3)";
export type Pt = { x: number; y: number };
