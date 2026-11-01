"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// The Rolodex: housing.glb with its torn rod and cradle rebuilt, the drum core, and TOTAL cards on the axis: the
// N releases three times round, so the drum is full and turns forever (slot i holds release i mod N).
// Numbers are the prototype's (BUILD.md); materials are new: brushed frame and base with edge wear,
// fingerprinted bakelite knobs, paper-grain cards.
// A card is its paper (one shared 2048-wide canvas: ruled lines, tab, head rule), its cover as a plane of its own,
// and its type as SDF text (drei <Text>, troika), so the type stays sharp at any size and angle. Each release's type
// is one group, carried by whichever of its three cards is nearest the front.
import { useMemo, useEffect, useState, Suspense, Fragment, memo } from "react";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import { useGLTF, Text } from "@react-three/drei";
import { BatchedText } from "troika-three-text";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, per, FLIP_DIR, coast, makeAngle, wrap, ringDelta, setPos, jumpTo, jumpToRelease } from "./rig";
import { CW, CH, TAB_H, R0, T, shapes, TEX_W, TEX_H, paintFace, cardText, COVER, mx, my, placeholderCanvas, type TextBlock } from "./cardTexture";
import { coverWidth } from "./shared";
import { brushed, fingerprints, paperGrain, boxUV, edgeWear, withWear } from "./textures";

export const MODEL = "/models/housing.glb";
// Courier Prime (OFL, google/fonts), the face the cards always had, as TTF for troika
const FONT = "/gillenwebsite/fonts/CourierPrime-Regular.ttf", FONT_ITALIC = "/gillenwebsite/fonts/CourierPrime-Italic.ttf";
// type is drawn on the cards within this many slots of the front (the cards behind are hidden by those in front of
// them; a wider window looked the same and cost the phone frames)
const TYPE_SLOTS = 3;
// the front three releases get the cover file that covers the plane's screen pixels, and never less than 1024: the
// front plane is ~200 device px, so 1024 is still 5x its pixels, and uploading 2048s mid-turn cost desktop frames
const BIG_MIN = 1024, BIG_SPAN = 1;
// a card has to stay at the front this long before its big cover loads, so a fast run through the drum loads none
const SETTLE_MS = 150;

// every texture: the renderer's full anisotropy, trilinear mips; colour maps in sRGB, data maps (normal, roughness) linear
function sharpen(t: THREE.Texture, gl: THREE.WebGLRenderer, color: boolean) {
  t.anisotropy = gl.capabilities.getMaxAnisotropy();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
// a cover file as a texture: AVIF, or the JPEG beside it where the browser cannot decode AVIF
// decoded off the main thread: fetch, then createImageBitmap, flipped there since an ImageBitmap ignores flipY
const bitmaps = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" });
const loadBitmap = (url: string) => bitmaps.loadAsync(url).then((b) => { const t = new THREE.Texture(b as unknown as HTMLImageElement); t.flipY = false; return t; });
// put a texture on a cover material: only its first map changes the shader (USE_MAP); later swaps are a uniform
const setMap = (m: THREE.MeshStandardMaterial, t: THREE.Texture) => { if (!m.map) m.needsUpdate = true; m.map = t; };
const loadTex = (url: string) => loadBitmap(url).catch(() => loadBitmap(url.replace(/\.avif$/, ".jpg")));

const PART_MAT: Partial<Record<string, "dark" | "bakelite">> = {
  side_right_inner: "dark",
  side_left_inner: "dark",
  knob_right: "bakelite",
  knob_left: "bakelite",
  knob_left_cap: "bakelite",
  knob_left_face: "bakelite",
};
const KNOBS = ["knob_right", "knob_left", "knob_left_cap", "knob_left_face"];

function makeMaterials(gl: THREE.WebGLRenderer) {
  const b = brushed(), fp = fingerprints();
  for (const t of [b.roughness, b.normal, fp]) sharpen(t, gl, false);
  const metal = withWear(
    new THREE.MeshPhysicalMaterial({
      color: "#b39a74", metalness: 0.6, roughness: 1, roughnessMap: b.roughness, normalMap: b.normal,
      normalScale: new THREE.Vector2(0.06, 0.06), clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
    })
  );
  return {
    metal,
    // the rebuilt cradle has extrude UVs in metres, so it takes the plain finish
    metalPlain: new THREE.MeshPhysicalMaterial({ color: "#b39a74", metalness: 0.6, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d8d4cc", metalness: 1, roughness: 0.18 }),
    bakelite: new THREE.MeshPhysicalMaterial({
      color: "#2b211a", metalness: 0, roughness: 1, roughnessMap: fp, clearcoat: 0.6, clearcoatRoughness: 0.25,
      clearcoatRoughnessMap: fp, side: THREE.DoubleSide,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#3a3128", metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }),
    grain: sharpen(paperGrain(), gl, false),
  };
}

export default function Rolodex({ releases, mono }: { releases: Release[]; mono: string }) {
  const gltf = useGLTF(MODEL);
  const gl = useThree((st) => st.gl);
  const N = releases.length, TOTAL = N * 3;

  const built = useMemo(() => {
    const M = makeMaterials(gl);
    const house = gltf.scene;
    house.updateMatrixWorld(true);
    let meshes = 0, triangles = 0;
    house.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      meshes++;
      const g = m.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const kind = PART_MAT[m.name] ?? "metal";
      if (kind === "metal") { boxUV(m, 0.09); edgeWear(m); }
      if (kind === "bakelite") boxUV(m, 0.05);
      m.material = M[kind];
      m.castShadow = m.receiveShadow = true;
      if (m.name === "rod" || m.name === "cradle") m.visible = false; // torn sheets in the Tripo mesh; rebuilt below
    });
    const axis = new THREE.Box3().setFromObject(house.getObjectByName("knob_right")!).getCenter(new THREE.Vector3());
    // knobs turn on the drum axis: re-parent each part into a pivot group at the axis
    const knobs = KNOBS.map((n) => house.getObjectByName(n)).filter(Boolean).map((m) => {
      const p = new THREE.Group();
      p.position.set(0, axis.y, axis.z);
      house.add(p);
      p.updateMatrixWorld();
      p.attach(m!);
      return p;
    });

    // drum core: axle, dark inner drum, two chrome rails through the card slots, spokes, hubs
    const core = new THREE.Group(), span = 0.52;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, span + 0.04, 32), M.chrome);
    axle.rotation.z = Math.PI / 2;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 0.006, R0 - 0.006, CW - 0.02, 64, 1, true), M.dark);
    inner.rotation.z = Math.PI / 2;
    core.add(axle, inner);
    for (const x of [-0.075, 0.075]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.022, 0.0035, 12, 96), M.chrome);
      rail.rotation.y = Math.PI / 2; rail.position.x = x; core.add(rail);
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, R0 + 0.022, 8), M.chrome);
        const a = (k * Math.PI * 2) / 3;
        sp.position.set(x, (Math.cos(a) * (R0 + 0.022)) / 2, (Math.sin(a) * (R0 + 0.022)) / 2);
        sp.rotation.x = a; core.add(sp);
      }
    }
    for (const x of [-span / 2, span / 2]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 40), M.chrome);
      hub.rotation.z = Math.PI / 2; hub.position.x = x; core.add(hub);
    }
    core.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true; });

    // cradle: the saddle under the drum as a solid arc
    const ri = 0.474, ro = 0.49, a = 0.87, csh = new THREE.Shape();
    csh.absarc(0, 0, ro, -Math.PI / 2 - a, -Math.PI / 2 + a, false);
    csh.absarc(0, 0, ri, -Math.PI / 2 + a, -Math.PI / 2 - a, true);
    csh.closePath();
    const cg = new THREE.ExtrudeGeometry(csh, { depth: 0.512, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 96 });
    cg.translate(0, 0, -0.256); cg.rotateY(Math.PI / 2);
    const cradle = new THREE.Mesh(cg, M.metalPlain);
    cradle.position.set(0, axis.y, axis.z); cradle.castShadow = cradle.receiveShadow = true;

    // cards
    const bodyGeos = shapes.map(({ s }) => { const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -T); return g; });
    const faceGeos = shapes.map(({ s }) => {
      const g = new THREE.ShapeGeometry(s, 6), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + CW / 2) / CW, p.getY(i) / (CH + TAB_H));
      g.translate(0, 0, 0.0002);
      return g;
    });
    M.grain.repeat.set(5, 3.5);
    const paperBody = new THREE.MeshStandardMaterial({ color: "#efe8d8", roughness: 0.92 });
    const years = [...new Set(releases.map((r) => r.year))];
    const slotOf = (r: Release) => years.indexOf(r.year) % 6;
    // the paper: one canvas for every card
    const c = document.createElement("canvas");
    c.width = TEX_W; c.height = TEX_H;
    paintFace(c.getContext("2d")!);
    const faceMat = new THREE.MeshStandardMaterial({ map: sharpen(new THREE.CanvasTexture(c), gl, true), roughness: 0.9, envMapIntensity: 0.55, normalMap: M.grain, normalScale: new THREE.Vector2(0.18, 0.18) });
    // the cover plane: the square the prototype painted the cover into, a hair above the paper
    const cs = (COVER.s / 1024) * CW, coverGeo = new THREE.PlaneGeometry(cs, cs);
    coverGeo.translate(mx(COVER.x + COVER.s / 2), my(COVER.y + COVER.s / 2), 0.0003);
    // the paper grain over the cover, at the same scale as on the card
    const grainCover = M.grain.clone();
    grainCover.repeat.set(5 * (cs / CW), 3.5 * (cs / (CH + TAB_H)));
    grainCover.needsUpdate = true;
    // one cover material and one type group per release, shared by its three cards. The type group is a troika
    // BatchedText: its drei <Text> children (six blocks) draw in one call, lit like the paper
    const typeMat = new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.55 });
    const faces = releases.map((r, i) => {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.55, normalMap: grainCover, normalScale: new THREE.Vector2(0.18, 0.18) });
      const type = new BatchedText();
      type.material = typeMat;
      type.visible = false;
      return { r, i, slot: slotOf(r), mat, type, small: null as THREE.Texture | null, big: null as THREE.Texture | null, bigW: 0, want: 0, holder: -1 };
    });
    const drum = new THREE.Group();
    drum.position.set(0, axis.y, axis.z);
    drum.add(core);
    const cards: THREE.Group[] = [], holders: THREE.Group[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const f = faces[i % N], slot = f.slot;
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeos[slot], paperBody);
      body.castShadow = body.receiveShadow = true;
      const face = new THREE.Mesh(faceGeos[slot], faceMat);
      face.receiveShadow = true;
      const cover = new THREE.Mesh(coverGeo, f.mat);
      cover.receiveShadow = true;
      const innerG = new THREE.Group();
      innerG.position.y = R0;
      innerG.add(body, face, cover);
      g.add(innerG);
      g.userData.i = body.userData.i = face.userData.i = cover.userData.i = i;
      drum.add(g);
      cards.push(g);
      holders.push(innerG);
    }
    return { house, axis, knobs, drum, cradle, cards, holders, faces, faceTex: c, coverGeo, meshes, triangles };
  }, [gltf, gl, releases, N, TOTAL]);

  // the first front card counts as settled 150 ms after the first frame
  const settle = useMemo(() => ({ since: 0, done: false }), []);
  // the first frames after the type is laid out draw every card's type, so all of it is packed before anyone turns
  const warm = useMemo(() => ({ frames: 3 }), []);
  const { coverPx, bigCovers } = useMemo(() => {
  // the cover plane's width on screen at rest, in device pixels: what the front texture has to cover
  const coverPx = () => {
    const card = built.cards[wrap(Math.round(rig.s), TOTAL)], cam = rig.camera;
    if (!cam) return 0;
    card.updateWorldMatrix(true, true);
    const g = built.coverGeo; g.computeBoundingBox();
    const b = g.boundingBox!, m = card.children[0].matrixWorld, sz = gl.getDrawingBufferSize(new THREE.Vector2());
    const pts = [[b.min.x, b.min.y], [b.max.x, b.min.y], [b.min.x, b.max.y], [b.max.x, b.max.y]].map(([x, y]) => new THREE.Vector3(x, y, b.max.z).applyMatrix4(m).project(cam));
    const xs = pts.map((q) => (q.x + 1) * 0.5 * sz.x), ys = pts.map((q) => (1 - q.y) * 0.5 * sz.y);
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  };
  // the front three releases: their big cover (the file at least the plane's device pixels, never under 2048); the
  // rest go back to 512 and their big textures are freed
  const bigCovers = (front: number) => {
    const need = Math.max(BIG_MIN,Math.ceil(coverPx()));
    const near = new Set([...Array(BIG_SPAN * 2 + 1)].map((_, k) => wrap(front + k - BIG_SPAN, N)));
    for (const f of built.faces) {
      if (!f.r.cover) continue;
      if (!near.has(f.i)) {
        if (f.big) { if (f.small) setMap(f.mat, f.small); f.big.dispose(); f.big = null; f.bigW = 0; f.want = 0; }
        continue;
      }
      const w = coverWidth(f.r, need);
      if (f.bigW >= w || f.want >= w) continue;
      f.want = w;
      loadTex(`/covers/${w}/${f.r.id}.avif`).then((t) => {
        if (f.want !== w) return t.dispose();
        sharpen(t, gl, true);
        // upload now, between frames, so the swap itself costs nothing
        gl.initTexture(t);
        f.big?.dispose();
        f.big = t; f.bigW = w; setMap(f.mat, t);
      });
    }
  };
  return { coverPx, bigCovers };
  }, [built, gl, N, TOTAL]);

  // the type for every release, laid out with the card face's metrics once the face is loaded
  const blocks = useTypeBlocks(built.faces, mono);
  // every character on every card, so troika builds the whole glyph atlas once, up front, instead of growing it
  // (and re-uploading it) as new cards turn to the front
  const chars = useMemo(() => [...new Set(blocks.flat().map((b) => b.text).join("").replace(/\s/g, ""))].sort().join(""), [blocks]);

  // covers: every release at 512 to begin with; the front three get their big file once their card has settled
  useEffect(() => {
    let live = true;
    for (const f of built.faces) {
      if (!f.r.cover) {
        f.small = sharpen(new THREE.CanvasTexture(placeholderCanvas(f.r, mono)), gl, true);
        setMap(f.mat, f.small);
        if (f.i === 0) rig.firstCardTexture = true;
        continue;
      }
      loadTex(`/covers/512/${f.r.id}.avif`).then((t) => {
        if (!live) return t.dispose();
        f.small = sharpen(t, gl, true);
        if (!f.big) setMap(f.mat, f.small);
        if (f.i === 0) rig.firstCardTexture = true;
      });
    }
    return () => { live = false; };
  }, [built, gl, mono]);

  useEffect(() => {
    rig.N = N; rig.TOTAL = TOTAL; rig.axisY = built.axis.y; rig.cards = built.cards; rig.knobs = built.knobs;
    rig.ready = true;
    // measurement hook for the verification script (scripts/gillenwebsite/verify.mjs)
    (window as unknown as { __rolodex: unknown }).__rolodex = { rig, per, jumpTo, jumpToRelease, gl, frontPoint: () => { const c = new THREE.Box3().setFromObject(built.cards[wrap(Math.round(rig.s), TOTAL)]).getCenter(new THREE.Vector3()).project(rig.camera!), b = rig.hit!.parentElement!.getBoundingClientRect(); return { x: b.left + (c.x + 1) * 0.5 * b.width, y: b.top + (1 - c.y) * 0.5 * b.height }; }, house: built.house, faceIds: built.faces.map((f) => f.r.id),
      // the front card's artist and release lines on screen, in CSS px (for the sharpness crop)
      titleRect: () => {
        const f = built.faces[wrap(Math.round(rig.s), N)], cam = rig.camera!, box = new THREE.Box3(), el = gl.domElement.getBoundingClientRect();
        f.type.updateWorldMatrix(true, true);
        // the batch keeps its members (artist first, then release) out of the scene graph: their local matrices, then its own
        [...f.type._members.keys()].slice(0, 2).forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrix).applyMatrix4(f.type.matrixWorld)); });
        const xs: number[] = [], ys: number[] = [];
        for (let k = 0; k < 8; k++) {
          const v = new THREE.Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(cam);
          xs.push(el.left + (v.x + 1) * 0.5 * el.width); ys.push(el.top + (1 - v.y) * 0.5 * el.height);
        }
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      },
      // texture vs screen: the front card's cover texture and the paper canvas against their device pixels on screen
      texels: () => { const f = built.faces[wrap(Math.round(rig.s), N)], img = f.mat.map?.image as { width: number } | undefined, cardPx = coverPx() * (CW / built.coverGeo.parameters.width); return { release: f.r.id, coverTexturePx: img?.width ?? 0, coverScreenPx: coverPx(), paperTexturePx: TEX_W, cardScreenPx: cardPx, pixelRatio: gl.getPixelRatio(), bigLoaded: built.faces.filter((x) => x.big).map((x) => `${x.r.id}@${x.bigW}`) }; }, meshes: built.meshes, triangles: built.triangles, axis: built.axis.toArray(), nodes: (() => { const n: string[] = []; built.house.traverse((o) => { if ((o as THREE.Mesh).isMesh) n.push(o.name); }); return n; })() };
    console.log("Website is loaded, enjoy");
  }, [built, N, TOTAL, gl, coverPx]);

  const angle = useMemo(() => makeAngle(TOTAL), [TOTAL]);
  // the drum's screen rect is the cards' touch hit area (Site.tsx): 8 corners of its rest box, projected each frame
  const hitBox = useMemo(() => {
    built.drum.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(built.drum), c: THREE.Vector3[] = [];
    for (let k = 0; k < 8; k++) c.push(new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z));
    return { c, p: new THREE.Vector3(), last: "" };
  }, [built]);
  useFrame((state, delta) => {
    const now = performance.now();
    if (rig.moveT) { rig.lag.push(now - rig.moveT); if (rig.lag.length > 400) rig.lag.shift(); rig.moveT = 0; }
    const dt = Math.min(delta, 1 / 30);
    // a flick coasts on its own curve (rig.ts) and stops on its card
    if (rig.fling !== null) {
      const c = coast(rig.fling, now);
      if (c.done) { setPos(rig.fling.to); rig.s = rig.fling.to; rig.v = 0; rig.fling = null; }
      else { setPos(c.x); rig.s = c.x; rig.v = c.v; }
    }
    const raw = rig.pos;
    if (rig.drag?.mode === "flip" || rig.fling !== null) {
      // the finger (or the flick) drives the drum directly: the card under it follows 1:1; the spring waits for release
      if (rig.fling === null) { rig.s = raw; rig.v = 0; }
    } else {
      // settle on a card like the real ratchet once scrolling stops
      const goal = performance.now() - rig.lastScroll > 160 && !rig.drag ? Math.round(raw) : raw;
      if (rig.reduce) { rig.s = goal; rig.v = 0; }
      else { rig.v += (goal - rig.s) * 170 * dt; rig.v *= Math.exp(-18 * dt); rig.s += rig.v * dt; }
    }
    // angle() wraps the distance to each slot round the ring, so s runs on past TOTAL with no seam
    for (let i = 0; i < TOTAL; i++) built.cards[i].rotation.x = angle(FLIP_DIR * (rig.s - i));
    for (const k of built.knobs) k.rotation.x = FLIP_DIR * -rig.s * 0.42;
    const front = wrap(Math.round(rig.s), N);
    if (front !== rig.front) { rig.front = front; rig.onFront.forEach((f) => f(front)); settle.since = now; settle.done = false; }
    // each release's type rides on its copy nearest the front, and is drawn only near the front
    for (const f of built.faces) {
      let best = -1, bd = Infinity;
      for (let k = 0; k < 3; k++) { const c = f.i + k * N, d = Math.abs(ringDelta(rig.s, c, TOTAL)); if (d < bd) { bd = d; best = c; } }
      if (f.holder !== best) { built.holders[best].add(f.type); f.holder = best; }
      f.type.visible = warm.frames > 0 || bd <= TYPE_SLOTS;
    }
    if (warm.frames > 0 && built.faces.every((f) => f.type._members.size > 0)) warm.frames--;
    if (!settle.done && now - settle.since > SETTLE_MS) { settle.done = true; bigCovers(front); }
    if (rig.hit) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const { width: W, height: H } = state.size;
      for (const c of hitBox.c) {
        hitBox.p.copy(c).project(state.camera);
        const x = (hitBox.p.x + 1) * 0.5 * W, y = (1 - hitBox.p.y) * 0.5 * H;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
      const key = `${x0 | 0} ${y0 | 0} ${(x1 - x0) | 0} ${(y1 - y0) | 0}`;
      if (key !== hitBox.last) {
        hitBox.last = key;
        Object.assign(rig.hit.style, { left: `${x0 | 0}px`, top: `${y0 | 0}px`, width: `${(x1 - x0) | 0}px`, height: `${(y1 - y0) | 0}px` });
      }
    }
  });

  return (
    <>
      <primitive object={built.house} />
      <primitive object={built.drum} />
      <primitive object={built.cradle} />
      {/* the type waits for its font without holding up the drum */}
      <Suspense fallback={null}>
        {built.faces.map((f, k) => blocks[k] && <Fragment key={f.r.id}>{createPortal(<CardType blocks={blocks[k]} chars={chars} />, f.type)}</Fragment>)}
      </Suspense>
    </>
  );
}

// the type for each release, once the card face's font is ready to measure line breaks with
function useTypeBlocks(faces: { r: Release; i: number; slot: number }[], mono: string) {
  const [blocks, setBlocks] = useState<TextBlock[][]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([`400 44px ${mono}`, `italic 400 30px ${mono}`].map((f) => document.fonts.load(f).catch(() => null))).then(() => {
      if (!live) return;
      const m = document.createElement("canvas").getContext("2d")!;
      setBlocks(faces.map((f) => cardText(f.r, f.i, f.slot, m, mono)));
    });
    return () => { live = false; };
  }, [faces, mono]);
  return blocks;
}

// one release's type: SDF text lying on the card face (its batch gives it the paper's material)
// A batch packs each member's colour as getHex() (sRGB) and its shader reads that as linear, so a colour given
// as itself comes out light. Handing it the colour decoded once more makes the packed value the linear colour.
const batchColor = (c: string) => new THREE.Color(c).convertSRGBToLinear();
const CardType = memo(function CardType({ blocks, chars }: { blocks: TextBlock[]; chars: string }) {
  return (
    <>
      {blocks.map((b) => (
        <Text key={b.key} characters={chars} font={b.italic ? FONT_ITALIC : FONT} fontSize={b.size} lineHeight={b.step} color={batchColor(b.color)} anchorX={b.anchorX ?? "left"} anchorY={b.anchorY ?? "top-baseline"} whiteSpace="nowrap" position={[b.x, b.y, 0.0005]}>
          {b.text}
        </Text>
      ))}
    </>
  );
});

useGLTF.preload(MODEL);
