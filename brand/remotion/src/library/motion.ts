import { Easing } from "remotion";
import { clamp } from "../brand";

// The motion tokens of research/ostad/style/MOTION.md section 2. Every curve is a cubic-bezier from a measured source (cited there);
// durations are frames at 24 fps (OstadYT) and are scaled to the composition's fps with `f()`.
export const curve = {
  arrive: Easing.bezier(0.22, 1, 0.36, 1), // newapology nap-page-enter, 600 ms
  settle: Easing.bezier(0.25, 0.1, 0.25, 1), // YT life(): the 963 fadeUp, 2 s (kept)
  sweep: Easing.bezier(0.6, 0, 0.25, 1), // Evident highlighter / wipe / bar, peak at 43 % (measured 44-45 %)
  swap: Easing.bezier(0.16, 1, 0.3, 1), // softunion rolling label, outExpo 650 ms
  plate: Easing.bezier(0.15, 0, 0.25, 1), // march2004 house curve, plate then picture, 750 + 750 ms
  morph: Easing.bezier(0.66, 0, 0.25, 1), // newapology View Transition, 1100 ms
  exit: Easing.bezier(0.4, 0, 1, 1), // newapology index-out; 300 ms (Ro / RULES.md)
  blank: Easing.bezier(0.76, 0, 0.24, 1), // softunion page crossfade, inOutQuart 450 ms
  count: (x: number) => x, // linear counter, ends 2 f after its bar (Evident Moment B)
};
export type Token = keyof typeof curve;

// durations in frames at 24 fps
export const D24 = {
  arrive: 14, settle: 48, highlighter: 16, rowWipe: 14, bar: 26, trace: 27, dotFill: 18,
  swap: 16, plate: 18, morph: 26, morphSurround: 5, exit: 7, blank: 11, blankHold: 7, ring: 5,
  stagger: 2, staggerCap: 10,
};
export const RISE = 16; // px at 1080 high, `arrive`
export const FALL = 7; // px, `exit`

// 24 fps frames -> frames at `fps`
export const f = (n24: number, fps: number) => Math.round((n24 * fps) / 24);
// the reveal frame for a word onset in seconds: onset + 1 frame (Evident median, read/ig_Ddos1QZRGmV.md section 1.2)
export const onset = (sec: number, fps: number) => Math.round(sec * fps) + 1;
// eased progress 0..1 of a token that starts at `start` (frame) and lasts `dur` frames
export const prog = (frame: number, start: number, dur: number, token: Token = "sweep") =>
  dur <= 0 ? (frame >= start ? 1 : 0) : curve[token](clamp((frame - start) / dur));
// staggered start for item i (`arrive` cascade: 2 f, capped at 10 f, at 24 fps)
export const stagger = (i: number, fps: number, step = D24.stagger, cap = D24.staggerCap) => f(Math.min(i * step, cap), fps);
// enter with `arrive`, leave with `exit`, as a style
export const arriveStyle = (frame: number, start: number, fps: number, out = Infinity): React.CSSProperties => {
  const i = prog(frame, start, f(D24.arrive, fps), "arrive");
  const o = prog(frame, out, f(D24.exit, fps), "exit");
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * RISE + o * FALL}px)` };
};
