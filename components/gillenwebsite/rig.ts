// Shared state between the page (scroll, drag, caption) and the three.js scene (cards, knobs, camera).
// Plain mutable object: it is read and written every frame, so it must not trigger React renders.
import type * as THREE from "three";

// Flip direction for page scroll, card drag and the knobs. +1: scrolling the page down sends the front
// card's top edge down and away from the viewer (Y and Z both fall) and brings the next card up to the front.
// A drag down on a card scrolls the other way, so the card face follows the pointer.
export const FLIP_DIR = 1;

export type Drag = { x: number; y: number; sy: number; az: number; el: number; mode: "flip" | "orbit" };

// a coasting flick: from x0 at t0 (performance.now), speed v0 cards/s in direction dir, stopping on card `to` after T ms
export type Fling = { x0: number; v0: number; dir: number; t0: number; T: number; to: number };

export type Rig = {
  N: number;
  TOTAL: number;
  s: number; // drum position in cards (0 = first release in front)
  v: number;
  fling: Fling | null; // a flick while it coasts; null otherwise
  lastScroll: number;
  drag: Drag | null;
  az: number; // orbit target
  el: number;
  camAz: number; // orbit as drawn
  camEl: number;
  reduce: boolean;
  wide: boolean; // 720 px and up: the release display sits beside the Rolodex
  front: number;
  flip: HTMLElement | null;
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
  flip: null,
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

// scroll distance per card (trackpad and touch scrolling); a card drag is DRAG_PX per card, a wheel notch one card
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
  const to = Math.max(0, Math.min(rig.N - 1, Math.round(x) + dir * carriedCards(pxPerMs)));
  const D = (to - x) * dir;
  if (D <= 0.01) return; // at the end of the stack: the detent settles it
  let lo = 0, hi = 200;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (carry(m) < D) lo = m; else hi = m; }
  rig.fling = { x0: x, v0: lo, dir, t0: performance.now(), T: stopMs(lo), to };
}
// where a coasting flick is at time now, and its velocity (cards/s)
export function coast(f: Fling, now: number) {
  const t = Math.min(now - f.t0, f.T) / 1000, a = f.v0 + BRAKE / FRICTION, e = Math.exp(-FRICTION * t);
  return { x: f.x0 + f.dir * ((a * (1 - e)) / FRICTION - (BRAKE / FRICTION) * t), v: f.dir * (a * e - BRAKE / FRICTION), done: now - f.t0 >= f.T };
}

export const scrollPos = () =>
  rig.flip ? Math.max(0, Math.min(rig.N - 1, (window.scrollY - rig.flip.offsetTop) / per())) : 0;

// the page scroll is the drum's position; jumps are instant and the spring in Rolodex.tsx animates the cards
export function scrollToCard(x: number) {
  if (!rig.flip) return;
  window.scrollTo({ top: rig.flip.offsetTop + x * per(), behavior: "instant" });
}
export function jumpTo(i: number) {
  rig.fling = null;
  scrollToCard(i);
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
