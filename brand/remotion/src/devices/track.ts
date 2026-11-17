import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// Head track of Ostad's footage (research/ostad/style/tools/face_track.py -> research/ostad/style/exomind/track.json, committed;
// copy it to public/exomind-skin/track.json, which is gitignored with the rest of public/). MediaPipe Face Landmarker, One Euro
// smoothed. Track coordinates are SOURCE pixels of the footage (1080x1920 @ 30 fps); L/R in names = the viewer's left/right.
//
// Composition -> source frame: every use of his footage in OstadYT plays the cut at the edit speed on the global clock
// (ARoll: Sequence from `at`, startFrom = round(at*speed*24); Keyed: Sequence from keyed.at/speed, the matte packed from cut time
// keyed.at), so source time = compTime * speed, i.e. srcFrame = compFrame / compFps * speed * srcFps (fractional; interpolated).
// Source -> composition px: the layer draws the 1080x1920 frame at `scale` with its top-left at (x, y): p' = (x + s*px, y + s*py).

export type Track = {
  fps: number; width: number; height: number; frames_total: number; coverage: number; head_top_k: number;
  one_euro: { min_cutoff: number; beta: number; d_cutoff: number };
  row: string[]; names: string[]; frames: (number[] | null)[];
};
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Pose = { yaw: number; pitch: number; roll: number };
export type LayerTransform = { scale: number; x: number; y: number };
export type TimeMap = { compFps: number; speed: number; offsetSrcSec?: number };
export type LandmarkName =
  | "foreheadTop" | "forehead" | "glabella" | "nasion" | "templeL" | "templeR" | "cheekL" | "cheekR" | "noseTip" | "chin"
  | "eyeL" | "eyeR" | "eyeOuterL" | "eyeOuterR" | "browL" | "browR" | "mouthL" | "mouthR" | "lipTop" | "lipBottom"
  | "jawL" | "jawR" | "earL" | "earR" | "headTop";

// v4.1 (OstadYT.tsx) layer transforms, at rest (their entry slides are not included: add them to x/y while they run)
export const LAYERS = {
  keyed: { scale: 0.86, x: 0, y: -150 },      // Keyed: 1080*0.86 wide, top -150
  window: { scale: 0.5, x: 115, y: 60 },      // ARoll "window": M-60, 60, 540x960
  panelR: { scale: 0.8, x: 1056, y: -264 },   // ARoll 4:5 panel, rows 330-1680
  panelL: { scale: 0.8, x: 0, y: -264 },
  source: { scale: 1, x: 0, y: 0 },
} satisfies Record<string, LayerTransform>;
export const YT_TIME: TimeMap = { compFps: 24, speed: 1.15 };

const POSE = 0, FACE = 3, HEAD = 7, PTS = 11;

export function loadTrack(src = "exomind-skin/track.json"): Promise<Track> {
  return fetch(staticFile(src)).then((r) => r.json());
}

/** React hook: holds the render until the track is loaded */
export function useTrack(src = "exomind-skin/track.json"): Track | null {
  const [track, setTrack] = useState<Track | null>(null);
  const [handle] = useState(() => delayRender(`track ${src}`));
  useEffect(() => {
    loadTrack(src).then((t) => { setTrack(t); continueRender(handle); });
  }, [src, handle]);
  return track;
}

/** composition frame -> fractional source frame (global clock; pass offsetSrcSec if a layer starts the footage elsewhere) */
export function srcFrameAt(track: Track, compFrame: number, map: TimeMap = YT_TIME): number {
  return ((compFrame / map.compFps) * map.speed + (map.offsetSrcSec ?? 0)) * track.fps;
}

// the row at a fractional source frame, linearly interpolated; nearest detected frame if one side is missing
function rowAt(track: Track, srcFrame: number): number[] | null {
  const n = track.frames.length;
  const f = Math.min(Math.max(srcFrame, 0), n - 1);
  const i = Math.floor(f), a = track.frames[i], b = track.frames[Math.min(i + 1, n - 1)], u = f - i;
  if (a && b) return a.map((v, k) => v + (b[k] - v) * u);
  if (a || b) return (a ?? b)!;
  for (let d = 1; d < 30; d++) { const r = track.frames[i - d] ?? track.frames[i + 1 + d]; if (r) return r; }
  return null;
}

export const toComp = (p: Pt, L: LayerTransform): Pt => ({ x: L.x + L.scale * p.x, y: L.y + L.scale * p.y });
export const rectToComp = (r: Rect, L: LayerTransform): Rect => ({ x: L.x + L.scale * r.x, y: L.y + L.scale * r.y, w: r.w * L.scale, h: r.h * L.scale });

/** a named landmark at a source frame, in source px */
export function landmarkSrc(track: Track, srcFrame: number, name: LandmarkName): Pt | null {
  const r = rowAt(track, srcFrame), j = track.names.indexOf(name);
  if (!r || j < 0) return null;
  return { x: r[PTS + 2 * j], y: r[PTS + 2 * j + 1] };
}

/** a named landmark at a COMPOSITION frame, in composition px, through the layer's transform */
export function landmark(track: Track, compFrame: number, name: LandmarkName, L: LayerTransform, map: TimeMap = YT_TIME): Pt | null {
  const p = landmarkSrc(track, srcFrameAt(track, compFrame, map), name);
  return p && toComp(p, L);
}

/** a frame -> point function for devices/Markup (its P type); `off` is a fixed offset in composition px */
export function follow(track: Track, name: LandmarkName, L: LayerTransform, map: TimeMap = YT_TIME, off: Pt = { x: 0, y: 0 }) {
  let last: Pt = { x: 0, y: 0 };
  return (compFrame: number): Pt => {
    const p = landmark(track, compFrame, name, L, map);
    if (p) last = { x: p.x + off.x, y: p.y + off.y };
    return last;
  };
}

export function pose(track: Track, compFrame: number, map: TimeMap = YT_TIME): Pose | null {
  const r = rowAt(track, srcFrameAt(track, compFrame, map));
  return r && { yaw: r[POSE], pitch: r[POSE + 1], roll: r[POSE + 2] };
}

/** face box (mesh extent: upper forehead to chin, ear to ear) or head box (+ the head-top estimate), composition px */
export function faceBox(track: Track, compFrame: number, L: LayerTransform, map: TimeMap = YT_TIME, head = false): Rect | null {
  const r = rowAt(track, srcFrameAt(track, compFrame, map));
  if (!r) return null;
  const o = head ? HEAD : FACE;
  return rectToComp({ x: r[o], y: r[o + 1], w: r[o + 2], h: r[o + 3] }, L);
}

/** the area overlays must avoid at this frame: the head box (to the top of the head) grown by `margin` composition px.
 *  Pass head=false for the mesh box only. */
export function faceSafeRect(track: Track, compFrame: number, margin: number, L: LayerTransform, map: TimeMap = YT_TIME, head = true): Rect | null {
  const b = faceBox(track, compFrame, L, map, head);
  return b && { x: b.x - margin, y: b.y - margin, w: b.w + 2 * margin, h: b.h + 2 * margin };
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
