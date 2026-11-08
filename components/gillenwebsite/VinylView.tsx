"use client";
/* eslint-disable react-hooks/immutability -- three.js objects, the shared rig and the handle are mutated by design */
// The record view (SOURCES #12): a click on the front sleeve, the caption's thumbnail, Enter, or a row on the
// discography page opens the release. Three states:
//  - open: the gatefold (record.ts) open on white and centred, the record all the way out of the right pocket and
//    spinning (33 1/3 rpm, not with reduced motion). On the right-hand panel, SDF type (troika-three-text) in the
//    header's face, regular: DYLAN NEUSTADTER at three times the header's 12 px, then his roles on this release, each
//    with the tracks it applies to, then the artist, release and year, at 1.5 times the 12 px interface size. Nothing
//    about anyone else. On phones (under PHONE px wide) the open sleeve is centred in the viewport at 92% of its width
//    and the same type is on its panel, scaled with the sleeve (the name about 18 px on a 390 px screen). No DOM text
//    on any width. The label is the cover's light colour with the release's title round its top, so the 33 1/3 rpm
//    turn shows. A click or tap on the panel with the name sends the sleeve back to the ring.
//  - shut, turning: a horizontal drag on the open record closes it first (the record slides in over SLIDE_MS, then the
//    gatefold shuts over GATE_MS, the type fading with it, the sleeve moving to the middle). Only then does the shut
//    sleeve turn with the drag about its upright axis, 1:1 with the finger (TURN: 0.6 degrees a px, a turn in 600 px),
//    so the back cover comes round; let go it carries on and slows (FRICTION: a 1500 px/s flick carries half a turn).
//    It stays shut, all the way round, any number of times. A tap on the shut sleeve opens it again, facing the camera.
//  - back to the Rolodex: a vertical drag of more than SWIPE px on the sleeve (more vertical than horizontal), open or
//    shut, a click on the name, or Escape: the record in, the gatefold shut, the sleeve back to its slot on the ring
//    (or the discography row it came from). A tap on the white does nothing; there is no close button.
// From the Rolodex the front sleeve itself lifts off the ring: this canvas draws over the stage with the stage
// camera's own view, and the model starts exactly where the sleeve was. Plain three.js, one requestAnimationFrame
// loop.
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Text } from "troika-three-text";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, wrap } from "./rig";
import { SLEEVE, sharpen, loadTex, sideFile, sideWidth, stripUpload, coverTexture, type Side } from "./sleeve";
import { buildRecord, grooveNormals, RPM, DISC_R, type RecordModel } from "./record";
import { paperGrain } from "./textures";
import { caps, dylanRoles } from "./shared";
import css from "./site.module.css";

// open from the ring 450 ms, back to it 350 ms (300 from shut); open to shut and back: the record's slide and the
// gatefold one after the other
export const OPEN_MS = 450, CLOSE_MS = 350, SHUT_CLOSE_MS = 300, SLIDE_MS = 180, GATE_MS = 220;
const FOLD_MS = SLIDE_MS + GATE_MS;
// a drag turns the shut sleeve TURN radians a px (0.6 degrees); let go, it turns on at the finger's speed and slows
// by FRICTION a second (exponentially: a flick of FLICK px/s carries half a turn); a vertical drag past SWIPE px sends
// it back to the ring; under TAP px of movement is a tap; the drag's axis is decided once it has moved AXIS px
const TURN = THREE.MathUtils.degToRad(0.6), FLICK = 1500, FRICTION = (FLICK * TURN) / Math.PI, SWIPE = 80, TAP = 5, AXIS = 8;
// phones: the open sleeve centred in the viewport at PHONE_W of its width, the name at PHONE_NAME px on a 390 px
// screen (in proportion on others); the shut sleeve nearer, at PHONE_SHUT of the width (at most half the height)
const PHONE = 720, PHONE_W = 0.92, PHONE_NAME = 18, PHONE_SHUT = 0.72;
// each motion's stages, as fractions of its duration: [start, end] of the move (and turn), the gatefold and the
// record's slide
type Win = [number, number];
type Plan = { move: Win; gate: Win; slide: Win };
const PLANS: Record<string, Plan> = {
  open: { move: [0, 210 / 450], gate: [170 / 450, 320 / 450], slide: [270 / 450, 1] },
  close: { slide: [0, 180 / 350], gate: [160 / 350, 270 / 350], move: [250 / 350, 1] },
  // from shut there is only the move
  closeShut: { move: [0, 1], gate: [0, 1], slide: [0, 1] },
  fold: { slide: [0, SLIDE_MS / FOLD_MS], gate: [SLIDE_MS / FOLD_MS, 1], move: [SLIDE_MS / FOLD_MS, 1] },
  unfold: { move: [0, GATE_MS / FOLD_MS], gate: [0, GATE_MS / FOLD_MS], slide: [GATE_MS / FOLD_MS, 1] },
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const stage = (f: number, [a, b]: Win) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
// the nearest whole turn: the sleeve faces the camera there
const whole = (y: number) => Math.PI * 2 * Math.round(y / (Math.PI * 2));
// The label: a paper disc in one colour from the cover (its lightest dominant colour) with the release's title round
// its top arc, in the header's face, and the spindle hole (record.ts); no cover pixels. Without the title the disc
// would look the same at every angle and the turn would not show.
const LABEL_PX = 512;
// (the header's own face, as the page has loaded it: its family name is next/font's)
const labelFace = () => (document.querySelector("header a") ? getComputedStyle(document.querySelector("header a")!).fontFamily : "") || `"Helvetica Neue", Arial, sans-serif`;
// The panel's type: Archivo at 118% width, regular (public/gillenwebsite/fonts/archivo-wdth118-regular.ttf, the
// static instance of what the header sets). The name at three times the header's 12 px as it stands on screen in the
// open pose (36 CSS px an em), or as large as the panel's width takes NEUSTADTER where that is smaller; the roles and
// tracks, and the artist, release and year, at 18 px an em, made smaller only if they would run off the panel.
const PANEL_FONT = "/gillenwebsite/fonts/archivo-wdth118-regular.ttf";
const NAME = "DYLAN NEUSTADTER";
// (the margin round the type: 26 mm; on phones 12 mm, so the name can be as large as the narrow panel takes)
const PANEL = { margin: 0.026, phoneMargin: 0.012, header: 12, ui: 12, gap: 0.9 };

export type From = "rolodex" | HTMLElement | null;
export type VinylHandle = { open: (i: number, from: From) => void; close: (why?: string) => void };
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
// the open pose and the shut one (the same distance, the shut sleeve's centre on the region's), the sleeve's edge on
// screen (CSS px), and whether it is the phone layout
type Poses = { open: Pose; shut: Pose; sleevePx: number; phone: boolean };

// widthPerSize: NEUSTADTER's width over its font size; size: the last sizePanel (metres an em, and the panel's metres
// to CSS px; setPanel may make the two smaller blocks smaller than `line`); token: the latest layout (a newer one wins)
type Panel = { name: Text; roles: Text; line: Text; widthPerSize: number; margin: number; size: { pxPerM: number; name: number; line: number; nameCapped: boolean } | null; token: number };

type Engine = {
  gl: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; rec: RecordModel; holder: THREE.Group; panel: Panel;
  centre: THREE.Vector3; label: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; colour: string }; blank: THREE.Texture;
  tex: Record<Side, { t: THREE.Texture | null; w: number; own: boolean }>; size: { w: number; h: number };
  // big covers going up a strip a frame (sleeve.ts stripUpload): the frame loop runs one step a frame
  steps: (() => void)[];
};

// each text laid out with its current properties. troika's sync(cb) never calls cb when there is nothing left to start:
// when the frame loop's onBeforeRender has already started this layout (then wait for its synccomplete) or it is done
const synced = (ts: Text[]) => Promise.all(ts.map((t) => new Promise<void>((res) => {
  const s = t as unknown as { _needsSync: boolean; _isSyncing: boolean };
  if (s._needsSync) t.sync(() => res());
  else if (s._isSyncing) { const done = () => { t.removeEventListener("synccomplete" as never, done); res(); }; t.addEventListener("synccomplete" as never, done); }
  else res();
})));
const blockH = (t: Text) => { const b = t.textRenderInfo?.blockBounds; return b ? b[3] - b[1] : 0; };

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
  // the gatefold's bare board is the aged paper from the part sheets (kit/bake/pbr.py), on before the warm-up compile
  // so its program is built with the rest
  const paper = await new THREE.TextureLoader().loadAsync("/materials/paper.jpg").catch(() => null);
  if (paper) {
    paper.colorSpace = THREE.SRGBColorSpace; paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(1.3, 1.3);
    paper.anisotropy = gl.capabilities.getMaxAnisotropy();
    gl.initTexture(paper);
    rec.paper.map = paper; rec.paper.color.set("#ffffff"); rec.paper.needsUpdate = true;
  }
  // the holder sits on the sleeve's centre (and the middle of its thickness), so the shut sleeve turns about it
  const centre = new THREE.Vector3(0, SLEEVE / 2, -0.0025);
  const holder = new THREE.Group();
  rec.root.position.copy(centre).negate();
  holder.add(rec.root);
  scene.add(holder);
  // the label's own texture, its colour per release (drawLabel)
  const lc = document.createElement("canvas");
  lc.width = lc.height = LABEL_PX;
  const ltex = new THREE.CanvasTexture(lc);
  ltex.colorSpace = THREE.SRGBColorSpace; ltex.anisotropy = gl.capabilities.getMaxAnisotropy();
  drawLabel(lc, "#e8e2d4", "RELEASE");
  ltex.needsUpdate = true;
  rec.label.map = ltex; rec.label.color.set("#ffffff");
  // the panel's type: the name, his roles with their tracks, and the artist, release and year, from the panel's top
  // left (rec.credits: x across from its middle, y up from its bottom edge), a hair in front of its face
  const text = (size: number, lineHeight: number) => {
    const t = new Text();
    Object.assign(t, { font: PANEL_FONT, fontSize: size, color: 0x111111, anchorX: "left", anchorY: "top", lineHeight, maxWidth: SLEEVE - 2 * PANEL.margin, overflowWrap: "break-word" });
    t.position.set(-SLEEVE / 2 + PANEL.margin, SLEEVE - PANEL.margin, 0.0002);
    t.userData.type = true;
    rec.credits.add(t);
    return t;
  };
  const panel: Panel = { name: text(0.03, 1.05), roles: text(0.015, 1.25), line: text(0.015, 1.25), widthPerSize: 6.5, margin: PANEL.margin, size: null, token: 0 };
  // the font is fetched and its glyphs laid out now, so the first opening has it; NEUSTADTER's width measured
  panel.name.text = "NEUSTADTER"; panel.roles.text = "PRODUCER"; panel.line.text = "RELEASE";
  await synced([panel.name, panel.roles, panel.line]);
  const nb = panel.name.textRenderInfo?.blockBounds;
  if (nb) panel.widthPerSize = (nb[2] - nb[0]) / panel.name.fontSize;
  panel.name.text = NAME;
  await synced([panel.name]);
  // warm up: compile every program the open record needs, so the first opening has nothing to build
  rec.set(1, 1);
  cam.position.set(0, 0, 3); cam.updateMatrixWorld();
  gl.compile(scene, cam);
  // and one real frame on the hidden canvas, so every texture (grooves, label, paper, the glyphs) is on the GPU too
  holder.visible = true;
  gl.setSize(64, 64, false);
  gl.render(scene, cam);
  gl.clear();
  rec.set(0, 0);
  holder.visible = false;
  return { gl, scene, cam, rec, holder, panel, centre, label: { canvas: lc, tex: ltex, colour: "#e8e2d4" }, blank, tex: { front: { t: null, w: 0, own: false }, back: { t: null, w: 0, own: false } }, size: { w: 64, h: 64 }, steps: [] };
}

// the panel's type sizes for the open pose: the panel's metres to CSS px there (from its middle up 0.1 m, projected);
// the name at 36 px an em, or the panel's width less its margins over NEUSTADTER where that is smaller; the rest at
// 18 px. The model goes back to where it was.
function sizePanel(e: Engine, pose: Pose, g: number, s: number, phone: boolean) {
  const was = { p: e.holder.position.clone(), q: e.holder.quaternion.clone() };
  e.holder.position.copy(pose.p); e.holder.quaternion.copy(pose.q); e.rec.set(1, 1); e.holder.updateMatrixWorld(true);
  const m = e.rec.credits.matrixWorld, a = new THREE.Vector3(0, SLEEVE / 2, 0).applyMatrix4(m).project(e.cam), b = new THREE.Vector3(0, SLEEVE / 2 + 0.1, 0).applyMatrix4(m).project(e.cam);
  const pxPerM = Math.hypot(((a.x - b.x) * innerWidth) / 2, ((a.y - b.y) * innerHeight) / 2) / 0.1;
  e.holder.position.copy(was.p); e.holder.quaternion.copy(was.q); e.rec.set(g, s); e.holder.updateMatrixWorld(true);
  // (phones: the name at PHONE_NAME px on a 390 px screen, in proportion to the screen's width, the rest at half that,
  // inside the narrower margin)
  const mg = phone ? PANEL.phoneMargin : PANEL.margin;
  e.panel.margin = mg;
  for (const t of [e.panel.name, e.panel.roles, e.panel.line]) { t.maxWidth = SLEEVE - 2 * mg; t.position.x = -SLEEVE / 2 + mg; }
  const want = (phone ? (PHONE_NAME * innerWidth) / 390 : 3 * PANEL.header) / pxPerM, fit = (SLEEVE - 2 * mg) / e.panel.widthPerSize;
  const name = Math.min(want, fit);
  e.panel.size = { pxPerM, name, line: phone ? name / 2 : (1.5 * PANEL.ui) / pxPerM, nameCapped: want > fit };
}

// the panel's type for a release, laid out top down: the name, a gap, the roles with their tracks, a gap, the artist,
// release and year. If that runs past the panel's bottom margin the two smaller blocks shrink together, to the
// largest size that fits (halving the range 6 times from 0.3-1: smaller type wraps to fewer lines, so it is found by
// laying it out, not by proportion).
async function setPanel(e: Engine, r: Release) {
  const P = e.panel, sz = P.size, tok = ++P.token;
  if (!sz) return;
  P.roles.text = dylanRoles(r).map((x) => caps(x.role) + (x.tracks.length ? "\n" + x.tracks.join(", ") : "")).join("\n");
  P.line.text = `${r.artist}, ${r.release} (${r.year})`;
  P.name.fontSize = sz.name;
  const top = SLEEVE - P.margin, avail = SLEEVE - 2 * P.margin;
  // lay it out at k; whether it fits
  const at = async (k: number) => {
    P.roles.fontSize = P.line.fontSize = sz.line * k;
    await synced([P.name, P.roles, P.line]);
    if (tok !== P.token) return null;
    const gap = PANEL.gap * sz.line * k;
    P.name.position.y = top;
    P.roles.position.y = top - blockH(P.name) - gap;
    P.line.position.y = P.roles.position.y - blockH(P.roles) - gap;
    return top - (P.line.position.y - blockH(P.line)) <= avail + 1e-6;
  };
  const full = await at(1);
  if (full !== false) return;
  let lo = 0.3, hi = 1, fit = false;
  for (let pass = 0; pass < 6; pass++) {
    const k = (lo + hi) / 2, ok = await at(k);
    if (ok === null) return;
    if (ok) lo = k; else hi = k;
    fit = ok;
  }
  if (!fit) await at(lo);
}

// the label's colour: the cover's lightest dominant colour. The cover at 48 x 48, its pixels in 8 levels a channel;
// the bins holding at least 6% of them are the dominant colours (the three largest when none does), and the lightest
// of those (relative luminance), as the mean of its pixels, is the label
// (read on a canvas kept in memory, willReadFrequently, so the pixels come back with no wait on the GPU; once a
// release, from its 512 cover)
const labelColours = new Map<string, string>();
const lum = (r: number, g: number, b: number) => { const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
function labelColour(img: CanvasImageSource) {
  try {
    const c = new OffscreenCanvas(48, 48), x = c.getContext("2d", { willReadFrequently: true })!;
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
const inkOn = (bg: string) => { const [r, g, b] = [1, 3, 5].map((k) => parseInt(bg.slice(k, k + 2), 16)); return lum(r, g, b) > 0.3 ? "#141414" : "#f4f1ea"; };
// the label's face: the colour edge to edge, and the title round the top arc in capitals, reading clockwise, in
// near-black or near-white for the contrast, large enough to see turn on a phone (smaller to fit 225 degrees of arc).
// The spindle hole is its own mesh.
function drawLabel(c: HTMLCanvasElement, bg: string, text = "") {
  const x = c.getContext("2d")!, P = c.width, R = P / 2;
  x.fillStyle = bg; x.fillRect(0, 0, P, P);
  if (!text) return;
  x.fillStyle = inkOn(bg); x.textAlign = "center"; x.textBaseline = "alphabetic";
  const rt = R * 0.7, maxArc = Math.PI * 1.25, up = text.toUpperCase();
  let size = P * 0.13;
  const face = labelFace();
  const glyphs = () => { x.font = `400 ${size}px ${face}`; return [...up].map((ch) => ({ ch, w: x.measureText(ch).width + size * 0.12 })); };
  let gs = glyphs(), L = gs.reduce((a, q) => a + q.w, 0);
  if (L / rt > maxArc) { size *= maxArc / (L / rt); gs = glyphs(); L = gs.reduce((a, q) => a + q.w, 0); }
  let at = -Math.PI / 2 - L / rt / 2;
  for (const q of gs) {
    const a = at + q.w / 2 / rt;
    x.save(); x.translate(R + Math.cos(a) * rt, R + Math.sin(a) * rt); x.rotate(a + Math.PI / 2); x.fillText(q.ch, 0, 0); x.restore();
    at += q.w / rt;
  }
}

type Mode = "closed" | "anim" | "open" | "shut";
type Shape = { pose: Pose; g: number; s: number; yaw: number };
type Anim = { kind: "open" | "close" | "fold" | "unfold"; t0: number; dur: number; plan: Plan; from: Shape; to: Shape; end: "open" | "shut" | "closed"; slidAt?: number };
// a pointer on the sleeve: where it went down and is now, the most it has moved, its axis once decided, and for a
// turn the x it counts from and the turn then
// (and its last positions, for the speed it is let go at)
type Drag = { x0: number; y0: number; x: number; y: number; moved: number; axis: "h" | "v" | null; turnX: number | null; yaw0: number; trail: { t: number; x: number }[] };

// `handle` receives open/close once the view is mounted (it is loaded with next/dynamic, so not through a ref)
export default function VinylView({ releases, handle, onState }: { releases: Release[]; handle: React.RefObject<VinylHandle | null>; onState?: (open: boolean) => void }) {
  const N = releases.length;
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), veil = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null), engine = useRef<Promise<Engine> | null>(null);
  const [cur, setCur] = useState<number | null>(null);
  const state = useRef<{ mode: Mode; anim: Anim | null; q: THREE.Quaternion; poses: Poses | null; g: number; s: number; yaw: number; i: number; slot: number; spin: number;
    drag: Drag | null; turnV: number; frames: number[]; raf: number; last: number; frame: number; fromKind: "rolodex" | "element" | "none"; el: HTMLElement | null; op: number; turned: boolean;
    trace: { kind: string; frame: number; g: number; s: number; yaw: number }[]; events: { ev: string; frame: number; t: number }[]; spinOut: number; spinNotOut: number; liftFrames: number }>({
    mode: "closed", anim: null, q: new THREE.Quaternion(), poses: null, g: 0, s: 0, yaw: 0, i: 0, slot: -1, spin: 0, drag: null, turnV: 0, frames: [], raf: 0, last: 0, frame: 0, fromKind: "none", el: null, op: -1, turned: false,
    trace: [], events: [], spinOut: 0, spinNotOut: 0, liftFrames: 0 });
  const reduce = useRef(false);
  const log = useRef<{ dir: string; ms: number; frames: number; fps: number; worstMs: number }[]>([]);
  const ray = useRef(new THREE.Raycaster());

  // the region the open record is centred in: under the header on desktop; the whole viewport on phones
  const region = useCallback(() => {
    const W = innerWidth, H = innerHeight, head = document.querySelector("header")?.offsetHeight ?? 44;
    return W >= PHONE ? { x: 0, y: head, w: W, h: H - head, phone: false } : { x: 0, y: 0, w: W, h: H, phone: true };
  }, []);

  // the open pose: face on, at the distance and offset where the open model's projected box fills its region with a
  // margin (on phones PHONE_W of the width), centred in it. Found by measuring: place, project, correct. The shut pose is
  // the same distance with the sleeve's centre on the region's; on phones, where that leaves it small, nearer, so the
  // sleeve is PHONE_SHUT of the width. sleevePx: the shut sleeve's edge on screen.
  const fitPoses = useCallback((e: Engine): Poses => {
    const cam = e.cam, R = region(), W = innerWidth, H = innerHeight, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const q = cam.quaternion.clone();
    const at = (cx: number, cy: number, d: number) => new THREE.Vector3(cx * d * tan * (W / H), cy * d * tan, -d).applyMatrix4(cam.matrixWorld);
    const was = { p: e.holder.position.clone(), q: e.holder.quaternion.clone() };
    e.rec.set(1, 1);
    const bb = new THREE.Box3(), v = new THREE.Vector3();
    const measure = (p: THREE.Vector3) => {
      e.holder.position.copy(p); e.holder.quaternion.copy(q); e.holder.updateMatrixWorld(true);
      bb.makeEmpty();
      e.rec.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry || o.userData.type) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox!;
        for (let k = 0; k < 8; k++) { v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld).project(cam); bb.expandByPoint(v); }
      });
      return { x0: (bb.min.x + 1) * 0.5 * W, x1: (bb.max.x + 1) * 0.5 * W, y0: (1 - bb.max.y) * 0.5 * H, y1: (1 - bb.min.y) * 0.5 * H };
    };
    const mw = R.phone ? PHONE_W : 0.84, mh = R.phone ? 0.9 : 0.78;
    const ccx = ((R.x + R.w / 2) / W) * 2 - 1, ccy = 1 - ((R.y + R.h / 2) / H) * 2;
    let cx = ccx, cy = ccy, d = 2;
    for (let k = 0; k < 4; k++) {
      const s = measure(at(cx, cy, d));
      d *= Math.max((s.x1 - s.x0) / (R.w * mw), (s.y1 - s.y0) / (R.h * mh));
      const s2 = measure(at(cx, cy, d));
      cx += ((R.x + R.w / 2 - (s2.x0 + s2.x1) / 2) / W) * 2;
      cy -= ((R.y + R.h / 2 - (s2.y0 + s2.y1) / 2) / H) * 2;
    }
    e.holder.position.copy(was.p); e.holder.quaternion.copy(was.q);
    e.rec.set(state.current.g, state.current.s);
    const ds = R.phone ? Math.min(d, (SLEEVE * H) / (2 * tan * Math.min(W * PHONE_SHUT, H * 0.5))) : d;
    return { open: { p: at(cx, cy, d), q }, shut: { p: at(ccx, ccy, ds), q: q.clone() }, sleevePx: (SLEEVE * H) / (2 * tan * ds), phone: R.phone };
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

  // the new poses for the viewport, and the panel's type sized for the open one
  const place = useCallback((e: Engine) => {
    const st = state.current, P = fitPoses(e);
    st.poses = P;
    sizePanel(e, P.open, st.g, st.s, P.phone);
    return P;
  }, [fitPoses]);

  // put a texture on a side, swapping only once it is decoded and uploaded (the mip-swap rule); one that went up in
  // strips is the renderer's already (prepared: its sampling set, nothing to upload)
  const put = useCallback((e: Engine, side: Side, t: THREE.Texture, w: number, own: boolean, prepared = false) => {
    if (!prepared) sharpen(t, e.gl, true);
    e.gl.initTexture(t);
    const slot = e.tex[side];
    if (slot.t && slot.own && slot.t !== t) slot.t.dispose();
    slot.t = t; slot.w = w; slot.own = own;
    if (side === "front") e.rec.front.map = t; else e.rec.back.map = t;
  }, []);

  // a big cover goes up a strip a frame and takes its side with the last strip, if the view still wants it
  const putLater = useCallback((e: Engine, side: Side, t: THREE.Texture, w: number, want: () => boolean) => {
    const steps = stripUpload(e.gl, sharpen(t, e.gl, true)), last = steps.pop()!;
    e.steps.push(...steps.map((step) => () => { if (want()) step(); }), () => { if (!want()) { t.dispose(); return; } last(); put(e, side, t, w, true, true); });
  }, [put]);

  // a panel's face on screen, in device pixels, and the files that cover it (at least 1024)
  const facePx = useCallback((e: Engine) => Math.ceil((state.current.poses?.sleevePx ?? Math.min(innerWidth, innerHeight) * 0.5) * e.gl.getPixelRatio()), []);
  const upgrade = useCallback((e: Engine, i: number) => {
    const r = releases[i], need = Math.max(1024, facePx(e));
    for (const side of ["front", "back"] as Side[]) {
      const w = sideWidth(r, side, need);
      if (e.tex[side].w >= w) continue;
      const want = () => state.current.i === i && state.current.mode !== "closed";
      loadTex(sideFile(r, side, w)).then((t) => { if (!want()) return t.dispose(); putLater(e, side, t, w, want); });
    }
  }, [releases, facePx, putLater]);

  // the record's colour (Discogs' colour variant, or the cover's dominant colour darkened: vinyl-colour.mjs) and the
  // label's (the cover's lightest dominant colour), set before any motion starts
  const setColours = useCallback((e: Engine, r: Release, img: CanvasImageSource | null) => {
    e.rec.vinyl.color.set(r.vinyl?.colour ?? "#0b0b0c");
    const colour = labelColours.get(r.id) ?? (img ? labelColour(img) : "#e8e2d4");
    labelColours.set(r.id, colour);
    drawLabel(e.label.canvas, colour, r.release); e.label.tex.needsUpdate = true; e.gl.initTexture(e.label.tex); e.label.colour = colour;
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
    // covers still going up are dropped (each step finds the view closed)
    for (const step of e.steps.splice(0)) step();
    requestAnimationFrame(() => requestAnimationFrame(() => { e.holder.visible = false; e.gl.clear(); box.current?.classList.remove(css.vvOn); setCur(null); onState?.(false); }));
  }, [onState]);
  const up = useRef(new THREE.Vector3(0, 1, 0)), turn = useRef(new THREE.Quaternion());
  const loop = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e) return;
    // dt for the motions (capped, so a long frame does not jump them); the record's spin keeps to the clock (raw)
    const now = performance.now(), raw = st.last ? Math.min((now - st.last) / 1000, 0.5) : 0, dt = Math.min(raw, 1 / 20);
    st.last = now; st.frame++;
    e.steps.shift()?.();
    const A = st.anim;
    if (st.mode === "anim" && A) {
      st.frames.push(now);
      const f = Math.min(1, (now - A.t0) / A.dur);
      const m = stage(f, A.plan.move), gx = stage(f, A.plan.gate), sx = stage(f, A.plan.slide);
      e.holder.position.lerpVectors(A.from.pose.p, A.to.pose.p, m);
      st.q.slerpQuaternions(A.from.pose.q, A.to.pose.q, m);
      st.yaw = A.from.yaw + (A.to.yaw - A.from.yaw) * m;
      st.g = A.from.g + (A.to.g - A.from.g) * gx;
      st.s = A.from.s + (A.to.s - A.from.s) * sx;
      if (A.kind === "fold" && A.slidAt === undefined && sx >= 1) { A.slidAt = st.frame; st.events.push({ ev: "slidIn", frame: st.frame, t: now }); }
      if (f >= 1) {
        const gaps = st.frames.slice(1).map((x, j) => x - st.frames[j]);
        log.current.push({ dir: A.kind, ms: Math.round(now - A.t0), frames: st.frames.length, fps: +(((st.frames.length - 1) * 1000) / (st.frames[st.frames.length - 1] - st.frames[0] || 1)).toFixed(1), worstMs: Math.round(Math.max(0, ...gaps)) });
        st.anim = null; st.mode = A.end; st.q.copy(A.to.pose.q); e.holder.position.copy(A.to.pose.p);
        st.events.push({ ev: A.kind === "fold" ? "shut" : A.kind === "unfold" ? "opened" : A.kind, frame: st.frame, t: now });
        if (A.end === "open") st.yaw = 0;
        if (A.end === "closed") { finishClose(e); return; }
        // shut with the finger still dragging sideways: the turn counts from where the finger is now
        if (A.end === "shut") { st.turned = false; const d = st.drag; if (d?.axis === "h") { d.turnX = d.x; d.yaw0 = st.yaw; } }
      }
    } else if (st.mode === "shut") {
      // the shut sleeve turns with the finger, from where it was when the gatefold had shut
      const d = st.drag;
      if (d && d.turnX !== null) {
        const y = d.yaw0 + (d.x - d.turnX) * TURN;
        if (y !== st.yaw) { if (!st.turned) { st.turned = true; st.events.push({ ev: "turn", frame: st.frame, t: now }); } st.yaw = y; }
      } else if (!d && st.turnV !== 0) {
        // let go: on at the finger's speed, slowing by FRICTION
        st.yaw += st.turnV * dt;
        st.turnV *= Math.exp(-FRICTION * dt);
        if (Math.abs(st.turnV) < 0.01) st.turnV = 0;
      }
    }
    e.holder.quaternion.copy(st.q).multiply(turn.current.setFromAxisAngle(up.current, st.yaw));
    e.rec.set(st.g, st.s);
    // the record spins only while it is all the way out
    if (!reduce.current && st.mode === "open" && st.s >= 1) { st.spin -= ((RPM * Math.PI * 2) / 60) * raw; st.spinOut++; }
    else if (e.rec.disc.rotation.z !== st.spin) st.spinNotOut++;
    e.rec.disc.rotation.z = st.spin;
    // the type fades with the gatefold
    const op = Math.min(1, Math.max(0, (st.g - 0.5) / 0.5));
    if (op !== st.op) { for (const t of [e.panel.name, e.panel.roles, e.panel.line]) { t.visible = op > 0; t.fillOpacity = op; } st.op = op; }
    e.gl.render(e.scene, e.cam);
    if (st.trace.length < 6000) st.trace.push({ kind: A?.kind ?? st.mode, frame: st.frame, g: +st.g.toFixed(4), s: +st.s.toFixed(4), yaw: +st.yaw.toFixed(4) });
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
  const run = useCallback((e: Engine, kind: Anim["kind"], dur: number, plan: Plan, to: Shape, end: Anim["end"]) => {
    const st = state.current;
    const from: Shape = { pose: { p: e.holder.position.clone(), q: st.q.clone() }, g: st.g, s: st.s, yaw: st.yaw };
    st.anim = { kind, t0: performance.now(), dur, plan, from, to, end };
    st.mode = "anim"; st.frames = []; st.turnV = 0;
    st.events.push({ ev: kind + "Start", frame: st.frame, t: st.anim.t0 });
  }, []);

  // open to shut: the record in, then the gatefold, the sleeve to the middle
  const fold = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e || st.mode !== "open" || !st.poses) return;
    run(e, "fold", FOLD_MS, PLANS.fold, { pose: st.poses.shut, g: 0, s: 0, yaw: st.yaw }, "shut");
  }, [run]);
  // shut to open, facing the camera: the gatefold opens as the sleeve turns back and moves, then the record slides out
  const unfold = useCallback(() => {
    const st = state.current, e = eng.current;
    if (!e || st.mode !== "shut" || !st.poses) return;
    run(e, "unfold", FOLD_MS, PLANS.unfold, { pose: st.poses.open, g: 1, s: 1, yaw: whole(st.yaw) }, "open");
  }, [run]);

  // (why: what sent it back, for the event log)
  const close = useCallback((why = "api") => {
    const st = state.current, e = eng.current;
    if (!e || st.mode === "closed" || st.anim?.end === "closed") return;
    st.events.push({ ev: `closeBy:${why}`, frame: st.frame, t: performance.now() });
    // back to where the sleeve is now: its slot on the ring, or the row (the stage stays paused until it has landed)
    const back = st.fromKind === "rolodex" ? startPose(e, "rolodex", null, st.slot) : st.fromKind === "element" && st.el?.isConnected ? startPose(e, "element", st.el, -1) : null;
    const pose = back ?? { p: e.holder.position.clone().add(new THREE.Vector3(0, -0.6, 0).applyQuaternion(e.cam.quaternion)), q: st.q.clone() };
    const shut = st.g === 0 && st.s === 0, dur = shut ? SHUT_CLOSE_MS : CLOSE_MS;
    st.drag = null;
    run(e, "close", dur, shut ? PLANS.closeShut : PLANS.close, { pose, g: 0, s: 0, yaw: whole(st.yaw) }, "closed");
    veil.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: "ease", fill: "forwards" });
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  }, [startPose, run]);

  // switch the view to another release (the arrow keys): the type at once, the covers each once its file is decoded
  const show = useCallback((i: number) => {
    const e = eng.current, st = state.current;
    if (!e) return;
    st.i = i; setCur(i);
    const r = releases[i], need = Math.max(1024, facePx(e));
    void setPanel(e, r);
    for (const side of ["front", "back"] as Side[]) {
      const w = sideWidth(r, side, need);
      const want = () => st.i === i && st.mode !== "closed";
      loadTex(sideFile(r, side, w)).then((t) => {
        if (!want()) return t.dispose();
        if (side === "front") setColours(e, r, t.image as CanvasImageSource);
        putLater(e, side, t, w, want);
      });
    }
  }, [releases, facePx, putLater, setColours]);

  const open = useCallback(async (i: number, from: From) => {
    const st = state.current;
    if (st.mode === "open" || st.mode === "shut") { show(i); return; }
    if (st.mode !== "closed") return;
    if (!eng.current && canvas.current) eng.current = await (engine.current ??= makeEngine(canvas.current));
    const e = eng.current;
    if (!e) return;
    const kind: "rolodex" | "element" | "none" = from === "rolodex" && rig.ready && rig.camera ? "rolodex" : from instanceof HTMLElement ? "element" : "none";
    const r = releases[i];
    st.i = i; st.yaw = 0; st.g = 0; st.s = 0; st.slot = kind === "rolodex" ? wrap(Math.round(rig.s), rig.TOTAL) : -1;
    st.fromKind = kind; st.el = from instanceof HTMLElement ? from : null;
    // the covers: from the Rolodex, the very bitmaps the sleeve has (already decoded): its 512 ones go up now, the big
    // ones it is showing go up a strip a frame while it moves (putLater); otherwise the files, decoded before the view
    // starts to move
    const ring = kind === "rolodex" ? rig.coverImages?.(i) : null;
    const bitmap = (x: { image: unknown }) => coverTexture(x.image);
    if (ring?.front && ring.back) {
      const want = () => st.i === i && st.mode !== "closed";
      for (const side of ["front", "back"] as Side[]) {
        const big = ring[side]!, small = ring.small[side];
        if (small && small.w < big.w) { put(e, side, bitmap(small), small.w, true); putLater(e, side, bitmap(big), big.w, want); }
        else put(e, side, bitmap(big), big.w, true);
      }
      setColours(e, r, ((ring.small.front ?? ring.front).image) as CanvasImageSource);
    } else {
      const w = 1024;
      const [f, b] = await Promise.all((["front", "back"] as Side[]).map((s) => loadTex(sideFile(r, s, w))));
      put(e, "front", f, sideWidth(r, "front", w), true); put(e, "back", b, sideWidth(r, "back", w), true);
      setColours(e, r, f.image as CanvasImageSource);
    }
    aim(e, kind);
    const P = place(e);
    void setPanel(e, r);
    const from0 = kind === "none" ? null : startPose(e, kind, st.el, st.slot);
    const start = from0 ?? { p: P.open.p.clone().add(new THREE.Vector3(0, -0.4, 0).applyQuaternion(e.cam.quaternion)), q: P.open.q.clone() };
    e.holder.position.copy(start.p); st.q.copy(start.q); e.holder.quaternion.copy(start.q);
    e.rec.set(0, 0);
    e.holder.visible = true;
    setCur(i); onState?.(true);
    box.current?.classList.add(css.vvOn);
    st.last = 0; st.spin = 0; st.liftFrames = 0; st.drag = null; st.op = -1;
    run(e, "open", OPEN_MS, PLANS.open, { pose: P.open, g: 1, s: 1, yaw: 0 }, "open");
    veil.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease", fill: "forwards" });
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(loop);
    history.replaceState(history.state, "", `#${r.id}`);
    upgrade(e, i);
  }, [releases, aim, place, startPose, put, putLater, setColours, upgrade, loop, show, onState, run]);

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
      if (st.mode === "closed") return;
      if (ev.key === "Escape") close("escape");
      if (ev.key === "Enter" && st.mode === "shut") unfold();
      if (ev.key === "ArrowRight") show((st.i + 1) % N);
      if (ev.key === "ArrowLeft") show((st.i - 1 + N) % N);
    };
    const onResize = () => {
      const e = eng.current, st = state.current;
      if (!e || (st.mode !== "open" && st.mode !== "shut")) return;
      sizeTo(e);
      const P = place(e);
      e.holder.position.copy(st.mode === "open" ? P.open.p : P.shut.p);
      void setPanel(e, releases[st.i]);
    };
    addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    const project = (e: Engine, o: THREE.Object3D, v: THREE.Vector3) => { o.updateWorldMatrix(true, false); const p = v.applyMatrix4(o.matrixWorld).project(e.cam); return { x: (p.x + 1) * 0.5 * innerWidth, y: (1 - p.y) * 0.5 * innerHeight }; };
    // measurement hook (scripts/gillenwebsite/recordview.mjs)
    (window as unknown as { __vinyl: unknown }).__vinyl = {
      state: () => state.current.mode, log: () => log.current, discAngle: () => state.current.spin, yaw: () => state.current.yaw,
      // the gatefold (0 shut, 1 open), the record's travel (0 in, 1 out), the frame count, every animated or turned
      // frame's values, the events with their frames (fold/unfold/open/close starts, slidIn, shut, turn, opened), and
      // how many frames the record spun all the way out / turned while not out
      gate: () => state.current.g, slide: () => state.current.s, frame: () => state.current.frame, trace: () => state.current.trace, events: () => state.current.events,
      spin: () => ({ out: state.current.spinOut, notOut: state.current.spinNotOut }),
      // where to press: the record (0.72 of its radius, on its side away from the pocket), the credits panel's middle,
      // the sleeve's centre (the holder: the shut sleeve's middle)
      discPoint: () => { const e = eng.current; return e ? project(e, e.rec.disc, new THREE.Vector3(DISC_R * 0.72, 0, 0.0012)) : null; },
      panelPoint: () => { const e = eng.current; return e ? project(e, e.rec.credits, new THREE.Vector3(0, SLEEVE / 2, 0)) : null; },
      // (and the panel's bottom left corner, inside by its margin: the board, no type)
      panelCornerPoint: () => { const e = eng.current; return e ? project(e, e.rec.credits, new THREE.Vector3(-SLEEVE / 2 + e.panel.margin, e.panel.margin, 0)) : null; },
      coverPoint: () => { const e = eng.current; return e ? project(e, e.holder, new THREE.Vector3(0, 0, 0)) : null; },
      // the model's box on screen (CSS px): every mesh's corners projected, the type left out (the record unturned
      // for it, so its square box is the disc's)
      objectBox: () => {
        const e = eng.current;
        if (!e) return null;
        const xs: number[] = [], ys: number[] = [], spun = e.rec.disc.rotation.z;
        e.rec.disc.rotation.z = 0;
        e.rec.root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || o.userData.type) return;
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const b = m.geometry.boundingBox!;
          for (let k = 0; k < 8; k++) { const q = project(e, m, new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z)); xs.push(q.x); ys.push(q.y); }
        });
        e.rec.disc.rotation.z = spun;
        return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), w: innerWidth, h: innerHeight };
      },
      // the sleeve's edge on screen at the poses' distance (CSS px)
      sleevePx: () => state.current.poses?.sleevePx ?? null,
      // every text the view renders: the panel's SDF blocks (text, face, metres an em, its em on screen now in CSS px,
      // opacity, drawn or not) and every DOM text node in the view, with its font size and whether it is on screen
      texts: () => {
        const e = eng.current, sz = e?.panel.size;
        const sdf = e ? [e.panel.name, e.panel.roles, e.panel.line].map((t) => ({ text: t.text, font: t.font.split("/").pop(), fontSizeM: +t.fontSize.toFixed(5), emPx: sz ? +(t.fontSize * sz.pxPerM).toFixed(1) : null, opacity: t.fillOpacity, visible: t.visible })) : [];
        const dom: { text: string; px: number; onScreen: boolean }[] = [];
        const w = document.createTreeWalker(box.current!, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const n = w.currentNode, el = n.parentElement!, txt = n.textContent?.trim();
          if (!txt) continue;
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          dom.push({ text: txt, px: parseFloat(cs.fontSize), onScreen: r.width > 2 && r.height > 2 && cs.visibility !== "hidden" });
        }
        return { sdf, dom, panel: sz && e ? { ...sz, lineScale: +(e.panel.roles.fontSize / sz.line).toFixed(3) } : null };
      },
      // every object under the open record's group, with its parent
      objects: () => {
        const e = eng.current, out: { name: string; type: string; parent: string; text?: string }[] = [];
        e?.holder.traverse((o) => { if (o !== e.holder) out.push({ name: o.name, type: o.type, parent: o.parent === e.holder ? "holder" : `${o.parent?.type}${o.parent?.name ? " " + o.parent.name : ""}`, ...(o.userData.type ? { text: (o as unknown as Text).text } : {}) }); });
        return out;
      },
      release: () => releases[state.current.i]?.id ?? null,
      // the panel's type against the panel: the bottom of the last block over the bottom margin (metres; <= 0 fits)
      panelFit: () => {
        const P = eng.current?.panel;
        if (!P) return null;
        // (stale: the blocks are not where the layout of their current text puts them, as when a layout never finished)
        const gap = PANEL.gap * P.roles.fontSize, stale = Math.abs(P.roles.position.y - (P.name.position.y - blockH(P.name) - gap)) > 1e-4 || Math.abs(P.line.position.y - (P.roles.position.y - blockH(P.roles) - gap)) > 1e-4;
        return { over: +(P.margin - (P.line.position.y - blockH(P.line))).toFixed(5), stale, roles: +P.roles.fontSize.toFixed(5), line: P.size?.line ?? null };
      },
      // the drag's turn and the friction (radians a px; per second), and the turn's speed now (radians a second)
      turning: () => ({ radPerPx: TURN, degPerPx: +THREE.MathUtils.radToDeg(TURN).toFixed(4), friction: +FRICTION.toFixed(3), velocity: state.current.turnV }),
      // where to click on the name (its middle)
      namePoint: () => {
        const e = eng.current, t = e?.panel.name, b = t?.textRenderInfo?.blockBounds;
        return e && t && b ? project(e, t, new THREE.Vector3((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 0)) : null;
      },
      texels: () => { const e = eng.current; const w = (t: THREE.Texture | null) => (t?.image as { width: number } | undefined)?.width ?? 0; return e ? { dpr: e.gl.getPixelRatio(), front: w(e.rec.front.map), back: w(e.rec.back.map), facePx: facePx(e), label: e.label.colour } : null; },
    };
    return () => { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); };
  }, [N, releases, close, unfold, show, sizeTo, place, facePx]);

  // is a point on the model (the gatefold, the record or the shut sleeve)? The white around it is not.
  const onModel = (x: number, y: number) => {
    const e = eng.current;
    if (!e) return false;
    ray.current.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2), e.cam);
    return ray.current.intersectObject(e.rec.root, true).length > 0;
  };
  // is a point on the panel with the name (open): the credits board or its type, not the record in front of it?
  const onPanel = (x: number, y: number) => {
    const e = eng.current;
    if (!e || state.current.mode !== "open") return false;
    ray.current.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2), e.cam);
    const hit = ray.current.intersectObject(e.rec.root, true)[0]?.object, wall = e.rec.credits.parent;
    for (let o: THREE.Object3D | null | undefined = hit; o; o = o.parent) if (o === wall) return true;
    return false;
  };
  // a press on the model starts a drag: sideways it shuts the open record and then turns it, up or down past SWIPE
  // it goes back to the ring; a tap on the shut sleeve opens it, a tap on the panel with the name sends it back. A press on the
  // white does nothing.
  const onDown = (ev: React.PointerEvent) => {
    const st = state.current;
    if ((st.mode !== "open" && st.mode !== "shut") || !onModel(ev.clientX, ev.clientY)) return;
    st.turnV = 0;
    st.drag = { x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, moved: 0, axis: null, turnX: null, yaw0: st.yaw, trail: [{ t: ev.timeStamp, x: ev.clientX }] };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    const st = state.current, d = st.drag;
    if (!d) {
      if (st.mode === "open" || st.mode === "shut") (ev.currentTarget as HTMLElement).style.cursor = onPanel(ev.clientX, ev.clientY) ? "pointer" : onModel(ev.clientX, ev.clientY) ? "grab" : "";
      return;
    }
    d.x = ev.clientX; d.y = ev.clientY;
    d.trail.push({ t: ev.timeStamp, x: ev.clientX });
    while (d.trail.length > 2 && ev.timeStamp - d.trail[0].t > 100) d.trail.shift();
    d.moved = Math.max(d.moved, Math.hypot(d.x - d.x0, d.y - d.y0));
    if (!d.axis && d.moved > AXIS) {
      d.axis = Math.abs(d.x - d.x0) >= Math.abs(d.y - d.y0) ? "h" : "v";
      if (d.axis === "h" && st.mode === "open") fold();
      else if (d.axis === "h" && st.mode === "shut") { d.turnX = d.x; d.yaw0 = st.yaw; }
    }
    // (only a drag more vertical than horizontal)
    if (d.axis === "v" && Math.abs(d.y - d.y0) > SWIPE && Math.abs(d.y - d.y0) > Math.abs(d.x - d.x0)) close(`swipe ${Math.round(d.x - d.x0)},${Math.round(d.y - d.y0)}`);
  };
  const onUp = (ev: React.PointerEvent) => {
    const st = state.current, d = st.drag;
    st.drag = null;
    if (!d) return;
    if (!d.axis && d.moved <= TAP) {
      if (st.mode === "shut") unfold();
      else if (onPanel(ev.clientX, ev.clientY)) close("panel");
      return;
    }
    // a turn let go: the finger's speed over its last 100 ms carries on
    if (st.mode === "shut" && d.turnX !== null && d.trail.length > 1) {
      const a = d.trail[0], b = d.trail[d.trail.length - 1], ms = b.t - a.t;
      st.turnV = ms > 0 && ev.timeStamp - b.t < 80 ? ((b.x - a.x) / ms) * 1000 * TURN : 0;
    }
  };
  const r = cur !== null ? releases[cur] : null;
  return (
    <div ref={box} className={css.vv} data-src="12" role={r ? "dialog" : undefined} aria-modal={r ? true : undefined} aria-label={r ? `Dylan Neustadter, ${r.release}` : undefined}>
      <div ref={veil} className={css.vvVeil} aria-hidden />
      <canvas ref={canvas} className={css.vvCanvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { state.current.drag = null; }} aria-hidden />
    </div>
  );
}
