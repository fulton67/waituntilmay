// FAST LANE motion (research/ostad/PLAYBOOK.md section 2). Every moving thing is a closed-form damped spring of the frame:
//   x(t) = 1 - e^(-z w t) (cos(wd t) + (z w / wd) sin(wd t)),  w = sqrt(k / m), z = c / (2 sqrt(k m)), wd = w sqrt(1 - z^2), t = frame / fps
// (critically and over-damped forms below). No CSS transitions, keyframes or easing curves: overshoot and follow-through come only
// from the physics. The four named springs live in brand/kit/tokens.json motion.spring; every animated element names one.
// Lint: tools/motion_lint.py. SFX timing: audio.ts sfxAtSettle(). Spring values tuned to MOTION.md section 2 on 2026-11-25.
import tokens from "../../../kit/tokens.json";

export type SpringName = "settle" | "snap" | "float" | "heavy";
export type SpringParams = { stiffness: number; damping: number; mass: number };

const T = (tokens as unknown as { motion: { spring: Record<SpringName, { $value: SpringParams }> } }).motion.spring;
export const SPRINGS: Record<SpringName, SpringParams> = {
  settle: T.settle.$value, snap: T.snap.$value, float: T.float.$value, heavy: T.heavy.$value,
};
export const TOL = 0.005; // "reached" = within 0.5 % of the target

/** unit step response of the spring at t seconds (0 at t <= 0, -> 1) */
export const step = (t: number, s: SpringParams): number => {
  if (t <= 0) return 0;
  const w = Math.sqrt(s.stiffness / s.mass), z = s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const r = Math.sqrt(z * z - 1), r1 = -w * (z - r), r2 = -w * (z + r);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

const P = (name: SpringName | SpringParams) => (typeof name === "string" ? SPRINGS[name] : name);

/** progress 0 -> 1 (with the spring's own overshoot) of a spring released at frame `start` */
export const sp = (frame: number, start: number, name: SpringName | SpringParams, fps = 24) => step((frame - start) / fps, P(name));

/** frames after release until the spring first comes within TOL of its target: where its sound lands */
export const firstReach = (name: SpringName | SpringParams, fps = 24): number => {
  const s = P(name);
  for (let f = 1; f < fps * 20; f++) if (step(f / fps, s) >= 1 - TOL) return f;
  return fps * 20;
};
/** frames after release until it stays within TOL for good */
export const settled = (name: SpringName | SpringParams, fps = 24): number => {
  const s = P(name);
  let last = 0;
  for (let f = 1; f < fps * 20; f++) if (Math.abs(step(f / fps, s) - 1) > TOL) last = f;
  return last + 1;
};

/** in at `start` on `inName`, out at `out` on `outName` (default snap): 0 -> 1 -> 0 */
export const life = (frame: number, start: number, out: number, inName: SpringName, outName: SpringName = "snap", fps = 24) =>
  sp(frame, start, inName, fps) * (1 - sp(frame, out, outName, fps));

/** a spring chasing a piecewise-constant target: x(f) = v0 + sum_i (v_i - v_{i-1}) * step(f - f_i). Closed form by superposition. */
export const chase = (frame: number, keys: [number, number][], name: SpringName | SpringParams, fps = 24) => {
  const s = P(name);
  if (!keys.length) return 0;
  let x = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (keys[i][0] > frame) break;
    x += (keys[i][1] - keys[i - 1][1]) * step((frame - keys[i][0]) / fps, s);
  }
  return x;
};

// deterministic pseudo-random in [-1, 1] for a seed and an index (no Math.random: renders must repeat)
const rnd = (seed: number, i: number) => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/** breathing / drift / parallax: the `float` spring chasing a new small target every `every` frames (seeded). Never a raw sine.
 *  every < 48 (float's settle) so the spring never comes to rest: the dead-frame rule. */
export const drift = (frame: number, amp: number, seed = 1, every = 32, name: SpringName = "float", fps = 24) => {
  const n = Math.floor(frame / every) + 1;
  const keys: [number, number][] = [[-1e9, 0]];
  for (let i = Math.max(0, n - 4); i <= n; i++) keys.push([i * every, amp * rnd(seed, i)]);
  // the window of 4 targets: older steps have settled (float settles in 48 f < 4 x 40), so their sum is the target they left
  keys[0][1] = Math.max(0, n - 4) > 0 ? amp * rnd(seed, Math.max(0, n - 4) - 1) : 0;
  return chase(frame, keys, name, fps);
};

/** a value that moves between states: [frame, value] targets, each change carried by the named spring */
export const to = chase;
