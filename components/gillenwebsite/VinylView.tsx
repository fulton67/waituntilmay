"use client";
/* eslint-disable react-hooks/immutability -- three.js objects, the shared rig and the handle are mutated by design */
// The record view (SOURCES #12): a click on the front sleeve, the caption's thumbnail, Enter, or a row on the
// discography page opens the release as the object alone on white: the sleeve (record.ts, its gatefold shut) face on
// and centred, its edge SIZE of the viewport's shorter side, the record half out of the pocket and spinning (33 1/3
// rpm, not with reduced motion). No type anywhere: no name, credits, roles, column, caption or buttons; the record's
// label is plain colour.
// From the Rolodex the front sleeve itself lifts off the ring: this canvas draws over the stage with the stage
// camera's own view, and the model starts exactly where the sleeve was. Opening (OPEN_MS): the sleeve moves to the
// middle while the white comes up over the page, then the record slides half out. A horizontal drag turns the whole
// object about its upright axis; past 90° the record slides back in (SLIDE_MS) and, let go, the sleeve settles with
// its back cover flat to the viewer; turned back past 90° the record slides out again and it settles face on. A tap
// anywhere (not the nav links, Chrome.tsx) is the close (CLOSE_MS): the record slides in and the sleeve goes back
// onto the ring or the discography row it came from. Plain three.js, one requestAnimationFrame loop.
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, wrap } from "./rig";
import { SLEEVE, sharpen, loadTex, sideFile, sideWidth, coverTexture, type Side } from "./sleeve";
import { buildRecord, grooveNormals, RPM, DISC_R, SLIDE, type RecordModel } from "./record";
import { paperGrain } from "./textures";
import css from "./site.module.css";

// open 450 ms, close 350 ms; after a flip the record slides in or out over SLIDE_MS
export const OPEN_MS = 450, CLOSE_MS = 350, SLIDE_MS = 180;
// the sleeve's edge on screen, of the viewport's shorter side; the record's travel with half of it out of the
// pocket (its centre on the pocket's mouth)
const SIZE = 0.8, HALF = SLEEVE / 2 / SLIDE;
// a drag turns the object TURN radians a px (90° in about 200 px)
const TURN = 0.008;
// each motion's stages, as fractions of its duration: [start, end] of the move and of the record's slide
type Win = [number, number];
type Plan = { move: Win; slide: Win };
const PLANS: Record<string, Plan> = {
  open: { move: [0, 260 / 450], slide: [270 / 450, 1] },
  close: { slide: [0, 150 / 350], move: [120 / 350, 1] },
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const stage = (f: number, [a, b]: Win) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
// the label: a plain paper disc in one colour from the cover (its lightest dominant colour) and the spindle hole
// (record.ts); no type, no cover pixels
const LABEL_PX = 256;

export type From = "rolodex" | HTMLElement | null;
export type VinylHandle = { open: (i: number, from: From) => void; close: () => void };
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };

type Engine = {
  gl: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; rec: RecordModel; holder: THREE.Group;
  centre: THREE.Vector3; label: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; colour: string }; blank: THREE.Texture;
  tex: Record<Side, { t: THREE.Texture | null; w: number; own: boolean }>; size: { w: number; h: number };
};

async function makeEngine(canvas: HTMLCanvasElement): Promise<Engine> {
  const gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(gl);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pm.dispose();
  // the stage's lights (Scene.tsx): the warm key from the upper left and the hemisphere fill
  const key = new THREE.DirectionalLight("#fff6ea", 1.9);
  key.position.set(-1.0, 2.6, 1.4);
  scene.add(key, new THREE.HemisphereLight("#ffffff", "#e9e6e0", 0.6));
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
  const blank = new THREE.DataTexture(new Uint8Array([214, 204, 186, 255]), 1, 1);
  blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;
  const grain = sharpen(paperGrain(), gl, false);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(3, 3);
  const grooves = await grooveNormals(2048);
  grooves.anisotropy = gl.capabilities.getMaxAnisotropy();
  gl.initTexture(grooves);
  const rec = buildRecord(blank, grain, grooves);
  // the sleeve's bare board is the aged paper from the part sheets (kit/bake/pbr.py), on before the warm-up compile
  // so its program is built with the rest
  const paper = await new THREE.TextureLoader().loadAsync("/materials/paper.jpg").catch(() => null);
  if (paper) {
    paper.colorSpace = THREE.SRGBColorSpace; paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(1.3, 1.3);
    paper.anisotropy = gl.capabilities.getMaxAnisotropy();
    gl.initTexture(paper);
    rec.paper.map = paper; rec.paper.color.set("#ffffff"); rec.paper.needsUpdate = true;
  }
  // the holder sits on the sleeve's centre (and the middle of its thickness), so the object turns about it
  const centre = new THREE.Vector3(0, SLEEVE / 2, -0.0025);
  const holder = new THREE.Group();
  rec.root.position.copy(centre).negate();
  holder.add(rec.root);
  scene.add(holder);
  // the label's own texture, its colour per release (drawLabel)
  const lc = document.createElement("canvas");
  lc.width = lc.height = LABEL_PX;
  const ltex = new THREE.CanvasTexture(lc);
  ltex.colorSpace = THREE.SRGBColorSpace;
  drawLabel(lc, "#e8e2d4");
  ltex.needsUpdate = true;
  rec.label.map = ltex; rec.label.color.set("#ffffff");
  // warm up: compile every program the open record needs, so the first opening has nothing to build
  rec.set(0, HALF);
  cam.position.set(0, 0, 3); cam.updateMatrixWorld();
  gl.compile(scene, cam);
  // and one real frame on the hidden canvas, so every texture (grooves, label, paper) is on the GPU too
  holder.visible = true;
  gl.setSize(64, 64, false);
  gl.render(scene, cam);
  gl.clear();
  rec.set(0, 0);
  holder.visible = false;
  return { gl, scene, cam, rec, holder, centre, label: { canvas: lc, tex: ltex, colour: "#e8e2d4" }, blank, tex: { front: { t: null, w: 0, own: false }, back: { t: null, w: 0, own: false } }, size: { w: 64, h: 64 } };
}

// the label's colour: the cover's lightest dominant colour. The cover at 48 x 48, its pixels in 8 levels a channel;
// the bins holding at least 6% of them are the dominant colours (the three largest when none does), and the lightest
// of those (relative luminance), as the mean of its pixels, is the label
const lum = (r: number, g: number, b: number) => { const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
function labelColour(img: CanvasImageSource) {
  try {
    const c = new OffscreenCanvas(48, 48), x = c.getContext("2d")!;
    x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data, bins = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let k = 0; k < d.length; k += 4) {
      const key = (d[k] >> 5) * 64 + (d[k + 1] >> 5) * 8 + (d[k + 2] >> 5), o = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      o.n++; o.r += d[k]; o.g += d[k + 1]; o.b += d[k + 2]; bins.set(key, o);
    }
    const all = [...bins.values()].sort((a, b) => b.n - a.n), total = d.length / 4;
    const dom = all.filter((o) => o.n / total >= 0.06);
    const pick = (dom.length ? dom : all.slice(0, 3)).map((o) => [o.r / o.n, o.g / o.n, o.b / o.n]).sort((a, b) => lum(b[0], b[1], b[2]) - lum(a[0], a[1], a[2]))[0];
    return "#" + pick.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  } catch { return "#e8e2d4"; }
}
// the label's face: the colour edge to edge (the spindle hole is its own mesh, record.ts)
function drawLabel(c: HTMLCanvasElement, bg: string) {
  const x = c.getContext("2d")!;
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
}

// `handle` receives open/close once the view is mounted (it is loaded with next/dynamic, so not through a ref)
export default function VinylView({ releases, handle, onState }: { releases: Release[]; handle: React.RefObject<VinylHandle | null>; onState?: (open: boolean) => void }) {
  const N = releases.length;
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), veil = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null), engine = useRef<Promise<Engine> | null>(null);
  const [cur, setCur] = useState<number | null>(null);
  type Shape = { pose: Pose; s: number };
  type Anim = { kind: string; t0: number; dur: number; plan: Plan; from: Shape; to: Shape; end: "open" | "closed" };
  const state = useRef<{ phase: "closed" | "anim" | "open"; anim: Anim | null; rest: Pose | null; s: number; i: number; slot: number; yaw: number; goal: number; back: boolean; spin: number;
    drag: { x: number; y: number; yaw: number; moved: number } | null; frames: number[]; raf: number; last: number; fromKind: "rolodex" | "element" | "none"; el: HTMLElement | null;
    trace: { kind: string; f: number; s: number; yaw: number }[]; flips: { to: "back" | "front"; yawDeg: number; at: number }[]; spinOut: number; spinNotOut: number; liftFrames: number }>({
    phase: "closed", anim: null, rest: null, s: 0, i: 0, slot: -1, yaw: 0, goal: 0, back: false, spin: 0, drag: null, frames: [], raf: 0, last: 0, fromKind: "none", el: null, trace: [], flips: [], spinOut: 0, spinNotOut: 0, liftFrames: 0 });
  const reduce = useRef(false);
  const log = useRef<{ dir: string; ms: number; frames: number; fps: number; worstMs: number }[]>([]);

  // the resting pose: face on, the sleeve's centre on the viewport's centre, at the distance where its edge is SIZE
  // of the shorter side
  const fitPose = useCallback((e: Engine): Pose => {
    const cam = e.cam, H = innerHeight, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = (SLEEVE * H) / (2 * tan * SIZE * Math.min(innerWidth, H));
    return { p: new THREE.Vector3(0, 0, -d).applyMatrix4(cam.matrixWorld), q: cam.quaternion.clone() };
  }, []);

  // the closed model standing exactly on the ring's front sleeve, or on a cover in the page
  const startPose = useCallback((e: Engine, kind: "rolodex" | "element", el: HTMLElement | null, slot: number): Pose | null => {
    const m = new THREE.Matrix4();
    if (kind === "rolodex") {
      const body = rig.cards[slot]?.children[0];
      if (!body) return null;
      body.updateWorldMatrix(true, false);
      m.copy(body.matrixWorld);
    } else {
      const r = el?.getBoundingClientRect();
      if (!r || !r.width) return null;
      const H = innerHeight, W = innerWidth, tan = Math.tan(THREE.MathUtils.degToRad(e.cam.fov / 2));
      const side = Math.max(r.width, r.height), d = (SLEEVE * H) / (2 * tan * side);
      const cx = ((r.left + r.width / 2) / W) * 2 - 1, cy = 1 - ((r.top + r.height / 2) / H) * 2;
      const c = new THREE.Vector3(cx * d * tan * (W / H), cy * d * tan, -d).applyMatrix4(e.cam.matrixWorld);
      // the sleeve's origin is its bottom edge's middle, face toward the camera
      m.compose(c.add(new THREE.Vector3(0, -SLEEVE / 2, 0).applyQuaternion(e.cam.quaternion)), e.cam.quaternion.clone(), new THREE.Vector3(1, 1, 1));
    }
    // the holder sits at the sleeve's centre: the sleeve's matrix times the centre offset
    m.multiply(new THREE.Matrix4().makeTranslation(e.centre.x, e.centre.y, e.centre.z));
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    m.decompose(p, q, s);
    return { p, q };
  }, []);

  // the canvas to the viewport, only when it has changed (a resize of the drawing buffer costs a frame)
  const sizeTo = useCallback((e: Engine) => {
    const W = innerWidth, H = innerHeight;
    if (e.size.w !== W || e.size.h !== H) { e.gl.setSize(W, H, false); e.size = { w: W, h: H }; }
    e.cam.aspect = W / H;
    e.cam.updateProjectionMatrix();
  }, []);

  // the camera: the stage camera's own view from the Rolodex, a plain one at the origin anywhere else
  const aim = useCallback((e: Engine, kind: "rolodex" | "element" | "none") => {
    const src = kind === "rolodex" ? rig.camera : null;
    if (src) {
      src.updateMatrixWorld();
      e.cam.position.copy(src.position); e.cam.quaternion.copy(src.quaternion);
      e.cam.fov = src.fov; e.cam.near = src.near; e.cam.far = src.far;
    } else {
      e.cam.position.set(0, 0, 0); e.cam.quaternion.identity(); e.cam.fov = 30;
    }
    sizeTo(e);
    e.cam.updateMatrixWorld();
  }, [sizeTo]);

  // put a texture on a side, swapping only once it is decoded and uploaded (the mip-swap rule)
  const put = useCallback((e: Engine, side: Side, t: THREE.Texture, w: number, own: boolean) => {
    sharpen(t, e.gl, true);
    e.gl.initTexture(t);
    const slot = e.tex[side];
    if (slot.t && slot.own && slot.t !== t) slot.t.dispose();
    slot.t = t; slot.w = w; slot.own = own;
    if (side === "front") e.rec.front.map = t; else e.rec.back.map = t;
  }, []);

  // the sleeve's face on screen, in device pixels, and the files that cover it (at least 1024)
  const facePx = useCallback((e: Engine) => Math.ceil(SIZE * Math.min(innerWidth, innerHeight) * e.gl.getPixelRatio()), []);
  const upgrade = useCallback((e: Engine, i: number) => {
    const r = releases[i], need = Math.max(1024, facePx(e));
    for (const side of ["front", "back"] as Side[]) {
      const w = sideWidth(r, side, need);
      if (e.tex[side].w >= w) continue;
      loadTex(sideFile(r, side, w)).then((t) => {
        if (state.current.i !== i || state.current.phase === "closed") return t.dispose();
        put(e, side, t, w, true);
      });
    }
  }, [releases, facePx, put]);

  // the record's colour (Discogs' colour variant, or the cover's dominant colour darkened: vinyl-colour.mjs) and the
  // label's (the cover's lightest dominant colour), set before any motion starts
  const setColours = useCallback((e: Engine, r: Release, img: CanvasImageSource | null) => {
    e.rec.vinyl.color.set(r.vinyl?.colour ?? "#0b0b0c");
    const colour = img ? labelColour(img) : "#e8e2d4";
    drawLabel(e.label.canvas, colour); e.label.tex.needsUpdate = true; e.gl.initTexture(e.label.tex); e.label.colour = colour;
  }, []);

  // the frame loop calls itself through this ref (a callback cannot name itself before it is declared)
  const loopRef = useRef<() => void>(() => {});
  const finishClose = useCallback((e: Engine) => {
    e.rec.set(0, 0);
    // the record goes back into the pocket unturned, so the next opening starts it from 0
    state.current.spin = 0; e.rec.disc.rotation.z = 0;
    e.gl.render(e.scene, e.cam);
    // the ring draws its sleeve again in the next frame, and this canvas clears one frame later, so the sleeve is
    // always drawn by one of the two
    rig.lifted = -1;
    rig.setPaused?.(false);
    requestAnimationFrame(() => requestAnimationFrame(() => { e.holder.visible = false; e.gl.clear(); box.current?.classList.remove(css.vvOn); setCur(null); onState?.(false); }));
  }, [onState]);
  const loop = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e) return;
    const now = performance.now(), dt = st.last ? Math.min((now - st.last) / 1000, 1 / 20) : 0;
    st.last = now;
    const A = st.anim;
    if (st.phase === "anim" && A) {
      st.frames.push(now);
      const f = Math.min(1, (now - A.t0) / A.dur);
      const m = stage(f, A.plan.move), sx = stage(f, A.plan.slide);
      e.holder.position.lerpVectors(A.from.pose.p, A.to.pose.p, m);
      e.holder.quaternion.slerpQuaternions(A.from.pose.q, A.to.pose.q, m);
      st.s = A.from.s + (A.to.s - A.from.s) * sx;
      if (st.trace.length < 4000) st.trace.push({ kind: A.kind, f: +f.toFixed(4), s: +st.s.toFixed(4), yaw: +st.yaw.toFixed(3) });
      if (f >= 1) {
        const gaps = st.frames.slice(1).map((x, j) => x - st.frames[j]);
        log.current.push({ dir: A.kind, ms: Math.round(now - A.t0), frames: st.frames.length, fps: +(((st.frames.length - 1) * 1000) / (st.frames[st.frames.length - 1] - st.frames[0] || 1)).toFixed(1), worstMs: Math.round(Math.max(0, ...gaps)) });
        st.anim = null; st.phase = A.end; st.rest = A.to.pose; st.yaw = st.goal = 0; st.back = false;
        if (A.end === "closed") { finishClose(e); return; }
      }
    } else if (st.phase === "open") {
      // the turn: the finger's while dragging, else easing to its goal (face on or back on); past 90° either way
      // the record slides in, back under 90° it slides half out again
      if (!st.drag) st.yaw += (st.goal - st.yaw) * (1 - Math.exp(-12 * dt));
      e.holder.quaternion.copy(st.rest!.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), st.yaw));
      const back = Math.cos(st.yaw) < 0;
      if (back !== st.back) { st.back = back; st.flips.push({ to: back ? "back" : "front", yawDeg: +THREE.MathUtils.radToDeg(st.yaw).toFixed(1), at: Math.round(now) }); }
      const target = back ? 0 : HALF, step = (HALF / SLIDE_MS) * 1000 * dt;
      st.s = st.s < target ? Math.min(target, st.s + step) : Math.max(target, st.s - step);
      if (st.trace.length < 4000) st.trace.push({ kind: "turn", f: 0, s: +st.s.toFixed(4), yaw: +st.yaw.toFixed(3) });
    }
    e.rec.set(0, st.s);
    // the record spins only while it is half out
    if (!reduce.current && st.phase === "open" && st.s >= HALF - 1e-6) { st.spin -= ((RPM * Math.PI * 2) / 60) * dt; st.spinOut++; }
    else if (e.rec.disc.rotation.z !== st.spin) st.spinNotOut++;
    e.rec.disc.rotation.z = st.spin;
    e.gl.render(e.scene, e.cam);
    // the ring's sleeve is hidden one frame after this canvas has drawn its stand-in (both draw it for that frame);
    // two frames later the stage has drawn the ring without it and stops drawing until the view has closed again
    if (A?.kind === "open" && st.fromKind === "rolodex") {
      st.liftFrames++;
      if (st.liftFrames === 2) rig.lifted = st.slot;
      if (st.liftFrames === 4) rig.setPaused?.(true);
    }
    st.raf = requestAnimationFrame(loopRef.current);
  }, [finishClose]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  // start a motion from wherever the model is now
  const run = useCallback((e: Engine, kind: string, dur: number, plan: Plan, to: Shape, end: Anim["end"]) => {
    const st = state.current;
    const from: Shape = { pose: { p: e.holder.position.clone(), q: e.holder.quaternion.clone() }, s: st.s };
    st.anim = { kind, t0: performance.now(), dur, plan, from, to, end };
    st.phase = "anim"; st.frames = []; st.drag = null;
  }, []);

  const close = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e || st.phase === "closed" || st.anim?.end === "closed") return;
    // back to where the sleeve is now: its slot on the ring, or the row (the stage stays paused until it has landed)
    const back = st.fromKind === "rolodex" ? startPose(e, "rolodex", null, st.slot) : st.fromKind === "element" && st.el?.isConnected ? startPose(e, "element", st.el, -1) : null;
    const pose = back ?? { p: e.holder.position.clone().add(new THREE.Vector3(0, -0.6, 0).applyQuaternion(e.cam.quaternion)), q: e.holder.quaternion.clone() };
    run(e, "close", CLOSE_MS, PLANS.close, { pose, s: 0 }, "closed");
    veil.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: "ease", fill: "forwards" });
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  }, [startPose, run]);

  // switch the open view to another release (the arrow keys): the covers change, each once its file is decoded
  const show = useCallback((i: number) => {
    const e = eng.current, st = state.current;
    if (!e) return;
    st.i = i; setCur(i);
    const r = releases[i], need = Math.max(1024, facePx(e));
    for (const side of ["front", "back"] as Side[]) {
      const w = sideWidth(r, side, need);
      loadTex(sideFile(r, side, w)).then((t) => {
        if (st.i !== i) return t.dispose();
        put(e, side, t, w, true);
        if (side === "front") setColours(e, r, t.image as CanvasImageSource);
      });
    }
  }, [releases, facePx, put, setColours]);

  const open = useCallback(async (i: number, from: From) => {
    const st = state.current;
    if (st.phase === "open") { show(i); return; }
    if (st.phase !== "closed") return;
    if (!eng.current && canvas.current) eng.current = await (engine.current ??= makeEngine(canvas.current));
    const e = eng.current;
    if (!e) return;
    const kind: "rolodex" | "element" | "none" = from === "rolodex" && rig.ready && rig.camera ? "rolodex" : from instanceof HTMLElement ? "element" : "none";
    const r = releases[i];
    st.i = i; st.yaw = st.goal = 0; st.back = false; st.slot = kind === "rolodex" ? wrap(Math.round(rig.s), rig.TOTAL) : -1;
    st.fromKind = kind; st.el = from instanceof HTMLElement ? from : null;
    // the covers: from the Rolodex, the very bitmaps the sleeve is showing (already decoded, uploaded here now);
    // otherwise the files, decoded before the view starts to move
    const ring = kind === "rolodex" ? rig.coverImages?.(i) : null;
    if (ring?.front && ring.back) {
      put(e, "front", coverTexture(ring.front.image), ring.front.w, true);
      put(e, "back", coverTexture(ring.back.image), ring.back.w, true);
      setColours(e, r, ring.front.image as CanvasImageSource);
    } else {
      const w = 1024;
      const [f, b] = await Promise.all((["front", "back"] as Side[]).map((s) => loadTex(sideFile(r, s, w))));
      put(e, "front", f, sideWidth(r, "front", w), true); put(e, "back", b, sideWidth(r, "back", w), true);
      setColours(e, r, f.image as CanvasImageSource);
    }
    aim(e, kind);
    const to = fitPose(e);
    const from0 = kind === "none" ? null : startPose(e, kind, st.el, st.slot);
    const start = from0 ?? { p: to.p.clone().add(new THREE.Vector3(0, -0.4, 0).applyQuaternion(e.cam.quaternion)), q: to.q.clone() };
    e.holder.position.copy(start.p); e.holder.quaternion.copy(start.q);
    st.s = 0; e.rec.set(0, 0);
    e.holder.visible = true;
    setCur(i); onState?.(true);
    box.current?.classList.add(css.vvOn);
    st.last = 0; st.spin = 0; st.liftFrames = 0;
    run(e, "open", OPEN_MS, PLANS.open, { pose: to, s: HALF }, "open");
    veil.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease", fill: "forwards" });
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(loop);
    history.replaceState(history.state, "", `#${r.id}`);
    upgrade(e, i);
  }, [releases, aim, fitPose, startPose, put, setColours, upgrade, loop, show, onState, run]);

  useEffect(() => { handle.current = { open, close }; return () => { handle.current = null; }; }, [handle, open, close]);

  // the engine is built while the page is idle, so the first opening starts at once
  useEffect(() => {
    const go = () => { if (!engine.current && canvas.current) engine.current = makeEngine(canvas.current).then((e) => (eng.current = e)); };
    const id = "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 4000 }) : (setTimeout(go, 1500) as unknown as number);
    return () => { if ("cancelIdleCallback" in window) cancelIdleCallback(id); };
  }, []);

  useEffect(() => {
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onKey = (ev: KeyboardEvent) => {
      const st = state.current;
      if (st.phase === "closed") return;
      if (ev.key === "Escape") close();
      if (ev.key === "ArrowRight") show((st.i + 1) % N);
      if (ev.key === "ArrowLeft") show((st.i - 1 + N) % N);
    };
    const onResize = () => { const e = eng.current, st = state.current; if (e && st.phase === "open") { sizeTo(e); st.rest = fitPose(e); e.holder.position.copy(st.rest.p); } };
    addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    const project = (e: Engine, o: THREE.Object3D, v: THREE.Vector3) => { o.updateWorldMatrix(true, false); const p = v.applyMatrix4(o.matrixWorld).project(e.cam); return { x: (p.x + 1) * 0.5 * innerWidth, y: (1 - p.y) * 0.5 * innerHeight }; };
    // measurement hook (scripts/gillenwebsite/recordview.mjs)
    (window as unknown as { __vinyl: unknown }).__vinyl = {
      state: () => state.current.phase, log: () => log.current, discAngle: () => state.current.spin, yaw: () => state.current.yaw, goal: () => state.current.goal,
      // the record's travel (0 in, HALF half out), every animated frame's values, the flips past 90°, and how many
      // frames the record spun half out / turned while not half out
      slide: () => state.current.s, half: HALF, trace: () => state.current.trace, flips: () => state.current.flips, spin: () => ({ out: state.current.spinOut, notOut: state.current.spinNotOut }),
      // where to click: a point on the record's half out of the pocket (0.72 of its radius), and the sleeve's middle
      discPoint: () => { const e = eng.current; return e ? project(e, e.rec.disc, new THREE.Vector3(DISC_R * 0.72, 0, 0.0012)) : null; },
      coverPoint: () => { const e = eng.current; return e ? project(e, e.holder, new THREE.Vector3(0, 0, 0)) : null; },
      // the sleeve's square on screen: its four corners projected (CSS px), and the viewport's shorter side
      sleevePx: () => {
        const e = eng.current;
        if (!e) return null;
        const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => project(e, e.holder, new THREE.Vector3((x * SLEEVE) / 2, (y * SLEEVE) / 2, 0)));
        const xs = c.map((q) => q.x), ys = c.map((q) => q.y);
        return { w: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), h: +(Math.max(...ys) - Math.min(...ys)).toFixed(1), cx: +((Math.max(...xs) + Math.min(...xs)) / 2).toFixed(1), cy: +((Math.max(...ys) + Math.min(...ys)) / 2).toFixed(1), shorter: Math.min(innerWidth, innerHeight) };
      },
      // every object under the open record's group, with its parent
      objects: () => {
        const e = eng.current, out: { name: string; type: string; parent: string }[] = [];
        e?.holder.traverse((o) => { if (o !== e.holder) out.push({ name: o.name, type: o.type, parent: o.parent === e.holder ? "holder" : `${o.parent?.type}${o.parent?.name ? " " + o.parent.name : ""}` }); });
        return out;
      },
      textNodes: () => { const w = document.createTreeWalker(box.current!, NodeFilter.SHOW_TEXT); let n = 0; while (w.nextNode()) if (w.currentNode.textContent?.trim()) n++; return n; },
      texels: () => { const e = eng.current; const w = (t: THREE.Texture | null) => (t?.image as { width: number } | undefined)?.width ?? 0; return e ? { dpr: e.gl.getPixelRatio(), front: w(e.rec.front.map), back: w(e.rec.back.map), facePx: facePx(e), label: e.label.colour } : null; },
    };
    return () => { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); };
  }, [N, close, show, sizeTo, fitPose, facePx]);

  // a horizontal drag turns the object; a tap (under 5 px of movement) anywhere is the close
  const onDown = (ev: React.PointerEvent) => {
    const st = state.current;
    if (st.phase !== "open") return;
    st.drag = { x: ev.clientX, y: ev.clientY, yaw: st.yaw, moved: 0 };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    const d = state.current.drag;
    if (!d) return;
    d.moved = Math.max(d.moved, Math.hypot(ev.clientX - d.x, ev.clientY - d.y));
    if (d.moved > 5) state.current.yaw = d.yaw + (ev.clientX - d.x) * TURN;
  };
  const onUp = () => {
    const st = state.current, d = st.drag;
    st.drag = null;
    if (!d) return;
    if (d.moved <= 5) { close(); return; }
    // let go: it settles face on (the nearest whole turn) or, past 90°, back on (the nearest half turn)
    const T = Math.PI * 2;
    st.goal = Math.cos(st.yaw) < 0 ? Math.PI + T * Math.round((st.yaw - Math.PI) / T) : T * Math.round(st.yaw / T);
  };
  return (
    <div ref={box} className={css.vv} data-src="12" role={cur !== null ? "dialog" : undefined} aria-modal={cur !== null ? true : undefined} aria-label={cur !== null ? "Record" : undefined}>
      <div ref={veil} className={css.vvVeil} onClick={close} aria-hidden />
      <canvas ref={canvas} className={css.vvCanvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { state.current.drag = null; }} aria-hidden />
    </div>
  );
}
