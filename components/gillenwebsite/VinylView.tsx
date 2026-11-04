"use client";
/* eslint-disable react-hooks/immutability -- three.js objects, the shared rig and the handle are mutated by design */
// The record view (SOURCES #12, replacing the large-cover panel): a click on the front sleeve, the caption's
// thumbnail, Enter, or a row on the discography page opens the release as a gatefold record (record.ts) with its
// info in a column beside it (above it on phones, the record full width over the info).
// From the Rolodex the front sleeve itself lifts off the ring: this canvas draws over the stage with the stage
// camera's own view, the closed model stands exactly where the sleeve was, and then it moves to the middle and
// opens, in OPEN_MS, while a white veil dims the Rolodex behind it. Close runs it back onto the ring. From the
// discography the closed sleeve starts on the row's cover. Drag turns the record; it spins at 33 1/3 rpm unless
// the reader prefers reduced motion. Plain three.js, so the timing is in one requestAnimationFrame loop.
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Text } from "troika-three-text";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, wrap } from "./rig";
import { SLEEVE, sharpen, loadTex, sideFile, sideWidth, type Side } from "./sleeve";
import { buildRecord, grooveNormals, OPEN_BOX, RPM, LABEL_R, type RecordModel } from "./record";
import { paperGrain } from "./textures";
import { no3, pad2, caps } from "./shared";
import css from "./site.module.css";

export const OPEN_MS = 450;
const LABEL_FONT = "/gillenwebsite/fonts/texgyreheros-regular.ttf";
const INFO_W = 420; // the info column on desktop
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export type From = "rolodex" | HTMLElement | null;
export type VinylHandle = { open: (i: number, from: From) => void; close: () => void };
type Pose = { p: THREE.Vector3; q: THREE.Quaternion; s: number };

type Engine = {
  gl: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; rec: RecordModel; holder: THREE.Group;
  centre: THREE.Vector3; artist: Text; title: Text; blank: THREE.Texture;
  tex: Record<Side, { t: THREE.Texture | null; w: number; own: boolean }>;
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
  // the holder turns about the open model's centre: the record hangs off it, offset so that centre is the origin
  const centre = new THREE.Vector3((OPEN_BOX.x0 + OPEN_BOX.x1) / 2, SLEEVE / 2, OPEN_BOX.z1 / 2);
  const holder = new THREE.Group();
  rec.root.position.copy(centre).negate();
  holder.add(rec.root);
  scene.add(holder);
  // the label's type: artist and title in the site's face, SDF, turning with the record
  const type = (y: number, size: number) => {
    const t = new Text();
    Object.assign(t, { font: LABEL_FONT, fontSize: size, anchorX: "center", anchorY: "middle", textAlign: "center", maxWidth: LABEL_R * 1.5, color: 0xffffff });
    t.position.set(0, y, 0.0012 + 0.0004);
    rec.labelPivot.add(t);
    return t;
  };
  const artist = type(-LABEL_R * 0.48, 0.0058), title = type(-LABEL_R * 0.66, 0.0046);
  // warm up: lay the label's type out once (loads the font, builds the glyph atlas) and compile every program the
  // open record needs, so the first opening has nothing to build
  artist.text = "A"; title.text = "A";
  await new Promise<void>((r) => artist.sync(() => title.sync(() => r())));
  rec.pose(1);
  cam.position.set(0, 0, 3); cam.updateMatrixWorld();
  gl.compile(scene, cam);
  rec.pose(0);
  holder.visible = false;
  return { gl, scene, cam, rec, holder, centre, artist, title, blank, tex: { front: { t: null, w: 0, own: false }, back: { t: null, w: 0, own: false } } };
}

// light or dark type for the label, from the luminance of the cover's lower third
function inkFor(img: CanvasImageSource) {
  try {
    const c = new OffscreenCanvas(32, 32), x = c.getContext("2d")!;
    x.drawImage(img, 0, 0, 32, 32);
    // the bitmap is flipped for the GPU (flipY at decode), so its lower third is the cover's upper rows here; either
    // way the label's type sits over the middle band, sample rows 10-22
    const d = x.getImageData(0, 10, 32, 12).data;
    let l = 0;
    for (let k = 0; k < d.length; k += 4) l += 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
    return l / (d.length / 4) / 255 > 0.55 ? 0x111111 : 0xffffff;
  } catch { return 0xffffff; }
}

// `handle` receives open/close once the view is mounted (it is loaded with next/dynamic, so not through a ref)
export default function VinylView({ releases, handle, onState }: { releases: Release[]; handle: React.RefObject<VinylHandle | null>; onState?: (open: boolean) => void }) {
  const N = releases.length;
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), veil = useRef<HTMLDivElement>(null), info = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null), engine = useRef<Promise<Engine> | null>(null);
  const [cur, setCur] = useState<number | null>(null);
  const state = useRef<{ phase: "closed" | "opening" | "open" | "closing"; i: number; t0: number; from: Pose | null; to: Pose | null; slot: number; yaw: number; spin: number; drag: { x: number; yaw: number } | null; frames: number[]; raf: number; last: number; fromKind: "rolodex" | "element" | "none"; el: HTMLElement | null }>({ phase: "closed", i: 0, t0: 0, from: null, to: null, slot: -1, yaw: 0, spin: 0, drag: null, frames: [], raf: 0, last: 0, fromKind: "none", el: null });
  const reduce = useRef(false);
  const log = useRef<{ dir: string; ms: number; frames: number; fps: number; worstMs: number }[]>([]);

  // the region the open record fills: left of the info column on desktop, the top on phones (full width)
  const region = useCallback(() => {
    const W = innerWidth, H = innerHeight, head = 44;
    return W >= 720 ? { x: 0, y: head, w: W - INFO_W, h: H - head } : { x: 0, y: head, w: W, h: Math.round(W * 0.62) };
  }, []);

  // the open pose: in the camera's frame, tilted back a little, at the distance and offset where the open model's
  // projected box fills its region with a margin, centred in it. Found by measuring: place, project, correct.
  const openPose = useCallback((e: Engine): Pose => {
    const cam = e.cam, R = region(), W = innerWidth, H = innerHeight, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const q = cam.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0, 0)));
    const at = (cx: number, cy: number, d: number) => new THREE.Vector3(cx * d * tan * (W / H), cy * d * tan, -d).applyMatrix4(cam.matrixWorld);
    const was = { p: e.holder.position.clone(), q: e.holder.quaternion.clone() };
    e.rec.pose(1);
    const box = new THREE.Box3(), v = new THREE.Vector3();
    const measure = (p: THREE.Vector3) => {
      e.holder.position.copy(p); e.holder.quaternion.copy(q); e.holder.updateMatrixWorld(true);
      box.makeEmpty();
      e.rec.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox!;
        for (let k = 0; k < 8; k++) { v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld).project(cam); box.expandByPoint(v); }
      });
      return { x0: (box.min.x + 1) * 0.5 * W, x1: (box.max.x + 1) * 0.5 * W, y0: (1 - box.max.y) * 0.5 * H, y1: (1 - box.min.y) * 0.5 * H };
    };
    const margin = W >= 720 ? 0.86 : 0.94;
    let cx = ((R.x + R.w / 2) / W) * 2 - 1, cy = 1 - ((R.y + R.h / 2) / H) * 2, d = 2;
    for (let k = 0; k < 4; k++) {
      const s = measure(at(cx, cy, d));
      d *= Math.max((s.x1 - s.x0) / (R.w * margin), (s.y1 - s.y0) / (R.h * margin));
      const s2 = measure(at(cx, cy, d));
      cx += ((R.x + R.w / 2 - (s2.x0 + s2.x1) / 2) / W) * 2;
      cy -= ((R.y + R.h / 2 - (s2.y0 + s2.y1) / 2) / H) * 2;
    }
    const p = at(cx, cy, d);
    e.holder.position.copy(was.p); e.holder.quaternion.copy(was.q);
    return { p, q, s: 1 };
  }, [region]);

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
    // the holder sits at the model's centre: the sleeve's matrix times the centre offset
    m.multiply(new THREE.Matrix4().makeTranslation(e.centre.x, e.centre.y, e.centre.z));
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    m.decompose(p, q, s);
    return { p, q, s: 1 };
  }, []);

  const sizeTo = useCallback((e: Engine) => {
    const W = innerWidth, H = innerHeight;
    e.gl.setSize(W, H, false);
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

  // put a texture on a side, swapping only once it is decoded and uploaded (the mip-swap rule); the label is the front
  const put = useCallback((e: Engine, side: Side, t: THREE.Texture, w: number, own: boolean) => {
    sharpen(t, e.gl, true);
    e.gl.initTexture(t);
    const slot = e.tex[side];
    if (slot.t && slot.own && slot.t !== t) slot.t.dispose();
    slot.t = t; slot.w = w; slot.own = own;
    if (side === "front") { e.rec.front.map = t; e.rec.label.map = t; } else e.rec.back.map = t;
  }, []);

  // the panels' faces on screen, in device pixels, and the files that cover them (at least 1024)
  const facePx = useCallback((e: Engine) => {
    const R = region(), dpr = e.gl.getPixelRatio();
    // a panel is a little under half the model's width
    return Math.ceil((R.w / ((OPEN_BOX.x1 - OPEN_BOX.x0) * 1.08)) * SLEEVE * dpr);
  }, [region]);
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

  const setType = useCallback((e: Engine, r: Release, img: CanvasImageSource | null) => {
    const ink = img ? inkFor(img) : 0xffffff;
    e.artist.text = caps(r.artist); e.title.text = r.release;
    e.artist.color = e.title.color = ink;
    e.artist.sync(); e.title.sync();
  }, []);

  // the frame loop calls itself through this ref (a callback cannot name itself before it is declared)
  const loopRef = useRef<() => void>(() => {});
  const loop = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e) return;
    const now = performance.now(), dt = st.last ? Math.min((now - st.last) / 1000, 1 / 20) : 0;
    st.last = now;
    if (st.phase === "opening" || st.phase === "closing") st.frames.push(now);
    let t = 1;
    if (st.phase === "opening" || st.phase === "closing") {
      const k = Math.min(1, (now - st.t0) / OPEN_MS), x = ease(k);
      t = st.phase === "opening" ? x : 1 - x;
      const a = st.phase === "opening" ? st.from! : st.to!, b = st.phase === "opening" ? st.to! : st.from!;
      e.holder.position.lerpVectors(a.p, b.p, x);
      e.holder.quaternion.slerpQuaternions(a.q, b.q, x);
      if (k >= 1) {
        const ms = now - st.t0, gaps = st.frames.slice(1).map((f, j) => f - st.frames[j]);
        log.current.push({ dir: st.phase, ms: Math.round(ms), frames: st.frames.length, fps: +(((st.frames.length - 1) * 1000) / (st.frames[st.frames.length - 1] - st.frames[0] || 1)).toFixed(1), worstMs: Math.round(Math.max(0, ...gaps)) });
        if (st.phase === "opening") { st.phase = "open"; rig.setPaused?.(true); }
        else {
          st.phase = "closed";
          e.rec.pose(0);
          e.gl.render(e.scene, e.cam);
          // the ring draws its sleeve again in the next frame, and this canvas clears one frame later, so the
          // sleeve is always drawn by one of the two
          rig.lifted = -1;
          rig.setPaused?.(false);
          requestAnimationFrame(() => requestAnimationFrame(() => { e.holder.visible = false; e.gl.clear(); box.current?.classList.remove(css.vvOn); setCur(null); onState?.(false); }));
          return;
        }
      }
    } else if (st.phase === "open") {
      // drag turns the record (the holder's yaw about its own vertical); the disc spins
      const q = st.to!.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), st.yaw));
      e.holder.quaternion.copy(q);
    }
    e.rec.pose(t);
    if (!reduce.current && st.phase !== "closed") { st.spin -= ((RPM * Math.PI * 2) / 60) * dt; }
    e.rec.disc.rotation.z = st.spin;
    e.gl.render(e.scene, e.cam);
    // the ring's sleeve is hidden one frame after this canvas has drawn its stand-in (both draw it for that frame)
    if (st.phase === "opening" && st.fromKind === "rolodex" && rig.lifted !== st.slot && st.frames.length >= 2) rig.lifted = st.slot;
    // two frames later the stage has drawn the ring without it, and stops drawing until the view has closed again:
    // nothing moves behind the veil, and the phone has one canvas to draw instead of two
    if (st.phase === "opening" && st.fromKind === "rolodex" && st.frames.length === 4) rig.setPaused?.(true);
    st.raf = requestAnimationFrame(loopRef.current);
  }, [onState]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  const close = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e || (st.phase !== "open" && st.phase !== "opening")) return;
    // close runs back to where the sleeve is now: its slot on the ring, or the row (the stage stays paused until
    // the sleeve has landed)
    const back = st.fromKind === "rolodex" ? startPose(e, "rolodex", null, st.slot) : st.fromKind === "element" && st.el?.isConnected ? startPose(e, "element", st.el, -1) : null;
    st.from = back ?? { p: e.holder.position.clone().add(new THREE.Vector3(0, -0.6, 0)), q: e.holder.quaternion.clone(), s: 1 };
    st.to = { p: e.holder.position.clone(), q: e.holder.quaternion.clone(), s: 1 };
    st.phase = "closing"; st.t0 = performance.now(); st.frames = []; st.drag = null;
    veil.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OPEN_MS, easing: "ease", fill: "forwards" });
    info.current?.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(16px)" }], { duration: 180, easing: "ease-in", fill: "forwards" });
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  }, [startPose]);

  // switch the open view to another release: the three textures change, each once its file is decoded
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
        if (side === "front") setType(e, r, t.image as CanvasImageSource);
      });
    }
  }, [releases, facePx, put, setType]);

  const open = useCallback(async (i: number, from: From) => {
    const st = state.current;
    if (st.phase === "open") { show(i); return; }
    if (st.phase !== "closed") return;
    if (!eng.current && canvas.current) eng.current = await (engine.current ??= makeEngine(canvas.current));
    const e = eng.current;
    if (!e) return;
    const kind: "rolodex" | "element" | "none" = from === "rolodex" && rig.ready && rig.camera ? "rolodex" : from instanceof HTMLElement ? "element" : "none";
    const r = releases[i];
    st.i = i; st.yaw = 0; st.slot = kind === "rolodex" ? wrap(Math.round(rig.s), rig.TOTAL) : -1;
    st.fromKind = kind; st.el = from instanceof HTMLElement ? from : null;
    // the covers: from the Rolodex, the very bitmaps the sleeve is showing (already decoded, uploaded here now);
    // otherwise the files, decoded before the view starts to move
    const ring = kind === "rolodex" ? rig.coverImages?.(i) : null;
    if (ring?.front && ring.back) {
      put(e, "front", Object.assign(new THREE.Texture(ring.front.image as HTMLImageElement), { flipY: false }), ring.front.w, true);
      put(e, "back", Object.assign(new THREE.Texture(ring.back.image as HTMLImageElement), { flipY: false }), ring.back.w, true);
      setType(e, r, ring.front.image as CanvasImageSource);
    } else {
      const w = 1024;
      const [f, b] = await Promise.all((["front", "back"] as Side[]).map((s) => loadTex(sideFile(r, s, w))));
      put(e, "front", f, sideWidth(r, "front", w), true); put(e, "back", b, sideWidth(r, "back", w), true);
      setType(e, r, f.image as CanvasImageSource);
    }
    aim(e, kind);
    const to = openPose(e);
    const from0 = kind === "none" ? null : startPose(e, kind, st.el, st.slot);
    st.from = from0 ?? { p: to.p.clone().add(new THREE.Vector3(0, -0.4, 0).applyQuaternion(e.cam.quaternion)), q: to.q.clone(), s: 1 };
    st.to = to;
    e.holder.position.copy(st.from.p); e.holder.quaternion.copy(st.from.q);
    e.holder.visible = true;
    setCur(i); onState?.(true);
    box.current?.classList.add(css.vvOn);
    st.phase = "opening"; st.t0 = performance.now(); st.frames = []; st.last = 0; st.spin = 0;
    veil.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease", fill: "forwards" });
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(loop);
    history.replaceState(history.state, "", `#${r.id}`);
    upgrade(e, i);
  }, [releases, aim, openPose, startPose, put, setType, upgrade, loop, show, onState]);

  useEffect(() => { handle.current = { open, close }; return () => { handle.current = null; }; }, [handle, open, close]);

  // the info column comes in over the last 250 ms of the opening
  useEffect(() => {
    if (cur === null || state.current.phase !== "opening") return;
    info.current?.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 250, delay: OPEN_MS - 250, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)", fill: "both" });
  }, [cur]);

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
      if (st.phase !== "open" && st.phase !== "opening") return;
      if (ev.key === "Escape") close();
      if (ev.key === "ArrowRight") show((st.i + 1) % N);
      if (ev.key === "ArrowLeft") show((st.i - 1 + N) % N);
    };
    const onResize = () => { const e = eng.current, st = state.current; if (e && st.phase === "open") { sizeTo(e); st.to = openPose(e); } };
    addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    // measurement hook (scripts/gillenwebsite/vinyl.mjs)
    (window as unknown as { __vinyl: unknown }).__vinyl = {
      state: () => state.current.phase, log: () => log.current, discAngle: () => state.current.spin, yaw: () => state.current.yaw,
      // each texture against its face on screen: source px and the face's device px
      texels: () => {
        const e = eng.current;
        if (!e) return null;
        const proj = (o: THREE.Object3D, pts: THREE.Vector3[]) => { o.updateWorldMatrix(true, false); const sz = e.gl.getDrawingBufferSize(new THREE.Vector2()); const v = pts.map((p) => p.clone().applyMatrix4(o.matrixWorld).project(e.cam)); const xs = v.map((q) => (q.x + 1) * 0.5 * sz.x), ys = v.map((q) => (1 - q.y) * 0.5 * sz.y); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); };
        const sq = [[-SLEEVE / 2, 0], [SLEEVE / 2, 0], [-SLEEVE / 2, SLEEVE], [SLEEVE / 2, SLEEVE]].map(([x, y]) => new THREE.Vector3(x, y, 0));
        const left = e.rec.left.children[0], wall = e.rec.root.children[0].children[1];
        const disc = [[-LABEL_R, 0], [LABEL_R, 0], [0, -LABEL_R], [0, LABEL_R]].map(([x, y]) => new THREE.Vector3(x, y, 0));
        const w = (t: THREE.Texture | null) => (t?.image as { width: number } | undefined)?.width ?? 0;
        return {
          dpr: e.gl.getPixelRatio(),
          front: { texturePx: w(e.rec.front.map), screenPx: proj(left, sq.map((p) => p.clone().setX(p.x))) },
          back: { texturePx: w(e.rec.back.map), screenPx: proj(wall, sq) },
          // the label shows the cover cut to its circle: the texture's width spans the label's diameter
          label: { texturePx: w(e.rec.label.map), screenPx: proj(e.rec.labelPivot, disc) },
        };
      },
    };
    return () => { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); };
  }, [N, close, show, sizeTo, openPose]);

  // drag turns the record; a press outside the record and the info closes
  const onDown = (ev: React.PointerEvent) => {
    const st = state.current;
    if (st.phase !== "open") return;
    const R = region();
    if (ev.clientX < R.x || ev.clientX > R.x + R.w || ev.clientY < R.y || ev.clientY > R.y + R.h) { close(); return; }
    st.drag = { x: ev.clientX, yaw: st.yaw };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    const st = state.current;
    if (!st.drag) return;
    st.yaw = st.drag.yaw + (ev.clientX - st.drag.x) * 0.008;
  };
  const onUp = () => { state.current.drag = null; };

  const r = cur !== null ? releases[cur] : null;
  const tracks = r ? (r.tracks.length ? r.tracks : [{ title: `${r.release} (full release)`, role: r.role }]) : [];
  return (
    <div ref={box} className={css.vv} data-src="12">
      <div ref={veil} className={css.vvVeil} onClick={close} aria-hidden />
      <canvas ref={canvas} className={css.vvCanvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden />
      {r && (
        <div ref={info} className={css.vvInfo} role="dialog" aria-modal="true" aria-label={`${r.artist}, ${r.release}`} data-release={r.id}>
          <p className={css.vvSmall} data-src="09">{no3(cur! + 1)} / {no3(N)}</p>
          <h2 className={css.vvArtist}>{r.artist}</h2>
          <p className={css.vvRelease}>{r.release}</p>
          <p className={css.vvSmall}>{r.year} · {caps(r.role)}</p>
          {/* SOURCES #15 wearesteve.net .message rows */}
          <div className={css.vvTracks} role="list" aria-label="Tracks" data-src="15">
            {tracks.map((t, k) => (
              <div key={k} className={css.vvTrack} role="listitem">
                <span>{pad2(k + 1)}</span>
                <span>{t.title}<span className={css.trackRole}>{caps(t.role)}</span></span>
              </div>
            ))}
          </div>
          {r.collaborators.length > 0 && (
            <div className={css.vvCollab}>
              <p className={css.vvSmall}>COLLABORATORS</p>
              {r.collaborators.map((c) => <p key={c.name} className={css.vvSmall}>{c.name}<span className={css.trackRole}>{caps(c.roles.join(", "))}</span></p>)}
            </div>
          )}
          {r.catno && <p className={css.vvSmall}>{r.label ? `${r.label} · ` : ""}{r.catno}</p>}
          {/* SOURCES #14 rosalia carousel arrows; SOURCES #25 anew-formatic brackets as buttons */}
          <div className={css.vvControls} data-src="14 25">
            <button type="button" aria-label="Previous release" onClick={() => show((cur! - 1 + N) % N)}>←</button>
            <button type="button" aria-label="Next release" onClick={() => show((cur! + 1) % N)}>→</button>
            <button type="button" onClick={close}>[CLOSE]</button>
          </div>
        </div>
      )}
    </div>
  );
}
