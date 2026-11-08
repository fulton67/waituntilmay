// Shared state between the page (wheel, drag, swipe, keys, caption) and the three.js scene (cards, knobs, camera).
// Plain mutable object: it is read and written every frame, so it must not trigger React renders.
import type * as THREE from "three";

// Flip direction for the wheel, card drag and the knobs. +1: wheeling down sends the front card's top edge down
// and away from the viewer (Y and Z both fall) and brings the next card up to the front.
// A drag down on a card goes the other way, so the card face follows the pointer.
export const FLIP_DIR = 1;

// flip: on the cards, DRAG_PX per card; swipe: a vertical touch swipe off the cards, per() px per card; orbit: turn
export type Drag = { x: number; y: number; p0: number; az: number; el: number; mode: "flip" | "swipe" | "orbit" };

// a coasting flick: from x0 at t0 (performance.now), speed v0 cards/s in direction dir, stopping on card `to` after T ms
export type Fling = { x0: number; v0: number; dir: number; t0: number; T: number; to: number };

type CoverImage = { image: unknown; w: number } | null;
export type Rig = {
  N: number;
  TOTAL: number;
  s: number; // drum position in cards as drawn, unbounded: slot ((s % TOTAL) + TOTAL) % TOTAL, release that mod N
  v: number;
  pos: number; // where the input has put the drum (unbounded); the spring draws s toward it
  fling: Fling | null; // a flick while it coasts; null otherwise
  lastScroll: number; // when pos last moved, for the 160 ms detent
  drag: Drag | null;
  az: number; // orbit target
  el: number;
  camAz: number; // orbit as drawn
  camEl: number;
  reduce: boolean;
  wide: boolean; // 720 px and up: the release display sits beside the Rolodex
  front: number; // release index in front, 0..N-1
  cards: THREE.Object3D[];
  knobs: THREE.Object3D[];
  camera: THREE.PerspectiveCamera | null;
  onFront: Set<(i: number) => void>; // called when a new card comes to the front
  firstCardTexture: boolean; // sleeve 1's front cover is on its texture
  allSmall: boolean; // every sleeve has its 512 covers, front and back
  lifted: number; // the slot whose sleeve is lifted off the ring into the record view, or -1
  // the decoded bitmaps a release's sleeve is showing now, front and back, with their widths (Rolodex.tsx)
  // (and the 512 ones it has under them, small)
  coverImages?: (i: number) => { front: CoverImage; back: CoverImage; small: { front: CoverImage; back: CoverImage } };
  setPaused?: (paused: boolean) => void; // stop or restart the stage's render loop (Scene.tsx), while the record view covers it
  lastDir: number; // the direction the drum last moved in (+1 / -1), for a knob tap at rest
  lastBoost: { before: number; after: number; capped: boolean; at: number } | null; // the last knob tap's speeds (cards/s)
  // the intro spin while it runs (rig.ts introAt), and every one started (for measurement: when, from which card,
  // and when input cut it short)
  intro: Intro | null;
  introLog: { at: number; s0: number; cancelled?: number }[];
  ready: boolean;
  axisY: number; // height of the drum axis, from knob_right's bounding box
  hit: HTMLElement | null; // the cards' hit area over the stage (touch-action: none), kept on the drum's screen rect
  moveT: number; // when the last drag pointermove landed (performance.now), for the lag probe
  lag: number[]; // pointermove -> frame that drew it, ms
};

export const rig: Rig = {
  N: 0,
  TOTAL: 0,
  s: 0,
  v: 0,
  pos: 0,
  fling: null,
  lastScroll: 0,
  drag: null,
  az: 0.3,
  el: 0.3,
  camAz: 0.3,
  camEl: 0.3,
  reduce: false,
  wide: true,
  front: 0,
  cards: [],
  knobs: [],
  camera: null,
  onFront: new Set(),
  firstCardTexture: false,
  allSmall: false,
  lifted: -1,
  lastDir: 1,
  lastBoost: null,
  intro: null,
  introLog: [],
  ready: false,
  axisY: 0.585,
  hit: null,
  moveT: 0,
  lag: [],
};
// wrap into 0..m-1, and the signed shortest step from a to b on a ring of m
export const wrap = (x: number, m: number) => ((x % m) + m) % m;
export const ringDelta = (a: number, b: number, m: number) => { const d = wrap(b - a, m); return d > m / 2 ? d - m : d; };

// px per card for trackpad wheels and touch swipes off the cards; a card drag is DRAG_PX per card, a wheel notch one card
export const per = () => Math.max(120, (typeof window === "undefined" ? 900 : window.innerHeight) * 0.26);
export const DRAG_PX = 50;
// A flick (over 0.4 px/ms at release) carries whole cards past the one the drag alone would settle on: 1 for a
// normal swipe (under 1 px/ms), then one more per 0.4 px/ms, at most MAX_CARRY. It coasts under air drag plus a
// constant brake, dv/dt = -FRICTION v - BRAKE, with its speed solved so the coast stops exactly on that card.
export const FRICTION = 4, BRAKE = 30, MAX_CARRY = 4;
const carry = (v: number) => v / FRICTION - (BRAKE / FRICTION ** 2) * Math.log(1 + (FRICTION * v) / BRAKE);
const stopMs = (v: number) => (Math.log(1 + (FRICTION * v) / BRAKE) / FRICTION) * 1000;
export const carriedCards = (pxPerMs: number) => (pxPerMs < 1 ? 1 : Math.min(MAX_CARRY, 2 + Math.floor((pxPerMs - 1) / 0.4)));

// start a flick from the drum at x, moving in direction dir at pxPerMs of pointer speed
export function flick(x: number, dir: number, pxPerMs: number) {
  const to = Math.round(x) + dir * carriedCards(pxPerMs), D = (to - x) * dir;
  let lo = 0, hi = 200;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (carry(m) < D) lo = m; else hi = m; }
  rig.fling = { x0: x, v0: lo, dir, t0: performance.now(), T: stopMs(lo), to };
}
// where a coasting flick is at time now, and its velocity (cards/s)
export function coast(f: Fling, now: number) {
  const t = Math.min(now - f.t0, f.T) / 1000, a = f.v0 + BRAKE / FRICTION, e = Math.exp(-FRICTION * t);
  return { x: f.x0 + f.dir * ((a * (1 - e)) / FRICTION - (BRAKE / FRICTION) * t), v: f.dir * (a * e - BRAKE / FRICTION), done: now - f.t0 >= f.T };
}

// The drum's position is virtual: nothing scrolls. Moves are instant and the spring in Rolodex.tsx animates the cards.
export function setPos(x: number) {
  if (x !== rig.pos) rig.lastDir = Math.sign(x - rig.pos);
  rig.pos = x;
  rig.lastScroll = performance.now();
}
export function jumpTo(x: number) {
  rig.fling = null;
  setPos(x);
}
// the momentum maximum: the speed of a flick that carries MAX_CARRY cards
let lo = 0, hi = 200;
for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (carry(m) < MAX_CARRY) lo = m; else hi = m; }
export const V_MAX = lo;

// A knob tap. While the drum turns: its speed now (cards/s, the coasting flick's or the spring's) doubled, capped at
// V_MAX, as a new coast from where it is, landing on the card that speed carries it to (the speed solved again, a
// hair, to stop exactly there). At rest: one card on in the direction the drum last moved.
export function knobTap() {
  const now = performance.now(), v = rig.fling ? coast(rig.fling, now).v : rig.v, sp = Math.abs(v);
  if (sp > 0.5) {
    const want = Math.min(2 * sp, V_MAX), dir = Math.sign(v) || rig.lastDir, x = rig.s;
    const to = Math.round(x + dir * carry(want)), D = (to - x) * dir;
    let a = 0, b = 200;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (carry(m) < D) a = m; else b = m; }
    rig.fling = { x0: x, v0: a, dir, t0: now, T: stopMs(a), to };
    setPos(x);
    rig.lastBoost = { before: +sp.toFixed(3), after: +want.toFixed(3), capped: want === V_MAX, at: now };
  } else {
    jumpTo(Math.round(heading()) + rig.lastDir);
    rig.lastBoost = { before: +sp.toFixed(3), after: 0, capped: false, at: now };
  }
}

// The intro spin (Site.tsx useIntro starts it, Rolodex.tsx draws it), as if a hand flicked the drum, so it reads as a
// thing to spin: first the wind-up, the drum pulled back INTRO.wind of a card over INTRO.windMs (eased in and out, as a
// thumb catches a card); then the flick, hard, on a flick's own curve (dv/dt = -FRICTION v - BRAKE, the coast of the
// flick that reaches that far) slowed to take INTRO.ms (the flick itself would take about 460 ms), INTRO.cards past
// where it started, the cards blurring by; then the ratchet's spring, the one that settles a user's flick, pulls it
// back to the whole card before (INTRO.settle: 0.5 card of recoil).
// INTRO.delay after the home page is interactive on the first visit, and after INTRO.idle with no input.
export const INTRO = { wind: 0.4, windMs: 320, cards: 6.5, settle: 6, ms: 1100, delay: 800, idle: 90000 };
let iLo = 0, iHi = 400;
for (let k = 0; k < 50; k++) { const m = (iLo + iHi) / 2; if (carry(m) < INTRO.cards + INTRO.wind) iLo = m; else iHi = m; }
const INTRO_V0 = iLo, INTRO_T = stopMs(iLo) / 1000;
export type Intro = { t0: number; s0: number };
// the intro's travel (cards from where it started) and speed (cards/s) at t ms
export function introAt(t: number) {
  if (t < INTRO.windMs) {
    const u = t / INTRO.windMs;
    return { x: (-INTRO.wind * (1 - Math.cos(Math.PI * u))) / 2, v: ((-INTRO.wind * Math.PI * Math.sin(Math.PI * u)) / 2) * (1000 / INTRO.windMs), done: false };
  }
  const f = t - INTRO.windMs;
  const k = INTRO_T / (INTRO.ms / 1000), tt = (Math.min(f, INTRO.ms) / 1000) * k, a = INTRO_V0 + BRAKE / FRICTION, e = Math.exp(-FRICTION * tt);
  return { x: -INTRO.wind + (a * (1 - e)) / FRICTION - (BRAKE / FRICTION) * tt, v: (a * e - BRAKE / FRICTION) * k, done: f >= INTRO.ms };
}

// where the drum is heading: a coasting flick's card, otherwise pos
export const heading = () => (rig.fling ? rig.fling.to : rig.pos);
// bring release i to the front by the nearest of its copies, so it never spins the long way round
export function jumpToRelease(i: number) {
  const from = Math.round(heading());
  jumpTo(from + ringDelta(wrap(from, rig.N), i, rig.N));
}

// Card layout around the drum, ported exactly from the prototype: the front card stands open,
// the rest pack evenly and meet at the bottom.
export function makeAngle(TOTAL: number) {
  const AF = 1.45, AB = 0.95, half = TOTAL / 2, BF = (Math.PI - AF) / half, BB = (Math.PI - AB) / half;
  return (d: number) => {
    d = ((d % TOTAL) + TOTAL) % TOTAL;
    if (d >= half) d -= TOTAL;
    const lean = -0.1 / (1 + d * d);
    return d < 0 ? -(AF * Math.tanh(d * 1.15) + BF * d) + lean : -(AB * Math.tanh(d * 1.05) + BB * d) + lean;
  };
}
