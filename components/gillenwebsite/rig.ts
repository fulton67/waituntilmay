// Shared state between the page (scroll, drag, caption) and the three.js scene (cards, knobs, camera).
// Plain mutable object: it is read and written every frame, so it must not trigger React renders.
import type * as THREE from "three";

// Flip direction for page scroll, card drag and the knobs. -1 is the reversed direction Naim asked for:
// scrolling down tips the front card toward the viewer and stands the next one up behind it.
export const FLIP_DIR = -1;

export type Drag = { x: number; y: number; sy: number; az: number; el: number; mode: "flip" | "orbit" };

export type Rig = {
  N: number;
  TOTAL: number;
  s: number; // drum position in cards (0 = first release in front)
  v: number;
  lastScroll: number;
  drag: Drag | null;
  az: number; // orbit target
  el: number;
  camAz: number; // orbit as drawn
  camEl: number;
  reduce: boolean;
  wide: boolean; // 720 px and up: the 3D detail panel is shown
  front: number;
  flip: HTMLElement | null;
  cards: THREE.Object3D[];
  knobs: THREE.Object3D[];
  camera: THREE.PerspectiveCamera | null;
  onFront: Set<(i: number) => void>; // called when a new card comes to the front
  firstCardTexture: boolean; // card 1's face has been painted onto its texture
  ready: boolean;
  axisY: number; // height of the drum axis, from knob_right's bounding box
};

export const rig: Rig = {
  N: 0,
  TOTAL: 0,
  s: 0,
  v: 0,
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
};

// scroll distance per card
export const per = () => Math.max(140, (typeof window === "undefined" ? 900 : window.innerHeight) * 0.42);

export const scrollPos = () =>
  rig.flip ? Math.max(0, Math.min(rig.N - 1, (window.scrollY - rig.flip.offsetTop) / per())) : 0;

export function jumpTo(i: number) {
  if (!rig.flip) return;
  window.scrollTo({ top: rig.flip.offsetTop + i * per(), behavior: rig.reduce ? "auto" : "smooth" });
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
