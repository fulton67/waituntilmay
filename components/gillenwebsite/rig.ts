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
  firstCardTexture: boolean; // card 1's face has been painted onto its texture
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
  rig.pos = x;
  rig.lastScroll = performance.now();
}
export function jumpTo(x: number) {
  rig.fling = null;
  setPos(x);
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
