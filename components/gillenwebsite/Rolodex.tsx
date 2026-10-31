"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// The Rolodex: housing.glb with its torn rod and cradle rebuilt, the drum core, and TOTAL cards on the axis.
// Numbers are the prototype's (BUILD.md); materials are new: brushed frame and base with edge wear,
// fingerprinted bakelite knobs, paper-grain cards. The ?look=flat housing swaps the housing's materials for
// matcaps with a black outline (look.ts); the cards are the same in both looks.
import { useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, FLIP_DIR, makeAngle, scrollPos } from "./rig";
import { CW, CH, TAB_H, R0, T, shapes, TEX_W, TEX_H, paintCard, blankTexture, loadCover } from "./cardTexture";
import { brushed, fingerprints, paperGrain, boxUV, edgeWear, withWear } from "./textures";
import { coverAt } from "./shared";
import type { Look, PHOTO } from "./look";
import { matcap, LIGHT, DARK } from "./matcap";

export const MODEL = "/models/housing.glb";

const PART_MAT: Partial<Record<string, "dark" | "bakelite">> = {
  side_right_inner: "dark",
  side_left_inner: "dark",
  knob_right: "bakelite",
  knob_left: "bakelite",
  knob_left_cap: "bakelite",
  knob_left_face: "bakelite",
};
const KNOBS = ["knob_right", "knob_left", "knob_left_cap", "knob_left_face"];

function makeMaterials(photo: typeof PHOTO) {
  const b = brushed(), fp = fingerprints();
  // the brushed roughness map is centred on 0.46, so the factor scales it to centre on photo.roughness
  const metal = withWear(
    new THREE.MeshPhysicalMaterial({
      color: "#b39a74", metalness: 0.6, roughness: photo.roughness / 0.46, roughnessMap: b.roughness, normalMap: b.normal,
      normalScale: new THREE.Vector2(photo.grain, photo.grain), clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
    })
  );
  return {
    metal,
    // the rebuilt cradle has extrude UVs in metres, so it takes the plain finish
    metalPlain: new THREE.MeshPhysicalMaterial({ color: "#b39a74", metalness: 0.6, roughness: photo.roughness, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d8d4cc", metalness: 1, roughness: 0.18 }),
    bakelite: new THREE.MeshPhysicalMaterial({
      color: "#2b211a", metalness: 0, roughness: 1, roughnessMap: fp, clearcoat: 0.6, clearcoatRoughness: 0.25,
      clearcoatRoughnessMap: fp, side: THREE.DoubleSide,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#3a3128", metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }),
    grain: paperGrain(),
  };
}

// EdgesGeometry's rule (an edge is drawn where its two faces meet at more than `deg`, and every open edge), with
// each face's normal taken from its smoothed vertex normals instead of its vertex positions. Tripo's positions are
// noisy, so plain EdgesGeometry at 20 degrees hatches whole surfaces (51,175 segments on this model); the smoothed
// normals (scripts/gillenwebsite/smooth-normals.mjs) keep the real creases and drop the noise. Vertices are welded by
// position, so UV and normal seams are not mistaken for open edges. The lines use the mesh's own positions.
function creaseEdges(g: THREE.BufferGeometry, deg: number) {
  const p = g.attributes.position, n = g.attributes.normal, idx = g.index;
  const count = idx ? idx.count : p.count, at = (k: number) => (idx ? idx.getX(k) : k);
  const weld = new Map<string, number>(), id = new Int32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
    if (!weld.has(k)) weld.set(k, weld.size);
    id[i] = weld.get(k)!;
  }
  const edges = new Map<string, { a: number; b: number; f: THREE.Vector3[] }>();
  for (let t = 0; t < count; t += 3) {
    const v = [at(t), at(t + 1), at(t + 2)];
    const fn = new THREE.Vector3();
    for (const i of v) fn.add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
    fn.normalize();
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], ia = id[a], ib = id[b];
      if (ia === ib) continue;
      const key = ia < ib ? `${ia}_${ib}` : `${ib}_${ia}`;
      const rec = edges.get(key);
      if (rec) rec.f.push(fn); else edges.set(key, { a, b, f: [fn] });
    }
  }
  const cos = Math.cos((deg * Math.PI) / 180), out: number[] = [];
  for (const { a, b, f } of edges.values()) {
    if (f.length === 1 || f[0].dot(f[1]) < cos) out.push(p.getX(a), p.getY(a), p.getZ(a), p.getX(b), p.getY(b), p.getZ(b));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  return geo;
}

// Silhouette: the Tripo housing's bevels are rounded, so they never turn 20 degrees between neighbouring faces and
// the crease lines alone leave the outer contour undrawn. Each part also gets a black back-face hull pushed out by
// exactly one screen pixel along its (smoothed) normals in clip space, which draws a 1 px contour at any distance.
export const OUTLINE_RES = { value: new THREE.Vector2(1440, 900) }; // drawing-buffer size, updated every frame
function hullMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRes = OUTLINE_RES;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec2 uRes;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vec2 nClip = (projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0)).xy;
gl_Position.xy += normalize(nClip + 1e-6) * (2.0 / uRes) * gl_Position.w;`
      );
  };
  m.customProgramCacheKey = () => "hull1px";
  return m;
}

// The flat look: every housing part (shell, cradle, drum core) takes a neutral grey-white matcap, the knobs a darker
// one, and every part gets a 1 px black outline: crease lines at a 20 degree threshold plus the 1 px silhouette.
// Lines are always 1 px in WebGL; the fill is pushed back with polygon offset so the lines are not z-fought.
function flatten(roots: THREE.Object3D[], darkParts: Set<string>) {
  const fill = (t: typeof LIGHT) => new THREE.MeshMatcapMaterial({ matcap: matcap(t), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const light = fill(LIGHT), dark = fill(DARK), hull = hullMaterial();
  const ink = new THREE.LineBasicMaterial({ color: "#000000" });
  let lines = 0;
  const meshes: THREE.Mesh[] = [];
  for (const r of roots) r.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    m.material = darkParts.has(m.name) ? dark : light;
    m.castShadow = m.receiveShadow = false;
    const e = new THREE.LineSegments(creaseEdges(m.geometry, 20), ink);
    e.raycast = () => {}; // outlines are not hit targets
    lines += e.geometry.attributes.position.count / 2;
    const h = new THREE.Mesh(m.geometry, hull);
    h.raycast = () => {};
    m.add(e, h);
  }
  return lines;
}

export default function Rolodex({ releases, mono, look, photo }: { releases: Release[]; mono: string; look: Look; photo: typeof PHOTO }) {
  const gltf = useGLTF(MODEL);
  const N = releases.length, TOTAL = Math.max(N + 12, 96);
  const TEX_SCALE = useMemo(() => (matchMedia("(min-width: 720px)").matches ? 2 : 1), []);

  const built = useMemo(() => {
    const M = makeMaterials(photo);
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
    const blankMats = [...Array(6)].map((_, i) => new THREE.MeshStandardMaterial({ map: blankTexture(i), roughness: 0.9, normalMap: M.grain, normalScale: new THREE.Vector2(0.18, 0.18) }));
    const faces: { r: Release; i: number; slot: number; tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D }[] = [];
    const drum = new THREE.Group();
    drum.position.set(0, axis.y, axis.z);
    drum.add(core);
    const cards: THREE.Group[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const r = releases[i], slot = r ? slotOf(r) : i % 6;
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeos[slot], paperBody);
      body.castShadow = body.receiveShadow = true;
      let mat: THREE.Material = blankMats[slot];
      if (r) {
        // faces are 2048 px wide on desktop (the painter draws in 1024 units at 2x), 1024 on phones to fit their GPU memory
        const c = document.createElement("canvas");
        c.width = TEX_W * TEX_SCALE; c.height = TEX_H * TEX_SCALE;
        const ctx = c.getContext("2d")!;
        ctx.scale(TEX_SCALE, TEX_SCALE);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
        faces.push({ r, i, slot, tex, ctx });
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.55, normalMap: M.grain, normalScale: new THREE.Vector2(0.18, 0.18) });
      }
      const face = new THREE.Mesh(faceGeos[slot], mat);
      face.receiveShadow = true;
      const innerG = new THREE.Group();
      innerG.position.y = R0;
      innerG.add(body, face);
      g.add(innerG);
      g.userData.i = body.userData.i = face.userData.i = i;
      drum.add(g);
      cards.push(g);
    }
    const outlineSegments = look === "flat" ? flatten([house, core, cradle], new Set(KNOBS)) : 0;
    return { house, axis, knobs, drum, cradle, cards, faces, meshes, triangles, outlineSegments };
  }, [gltf, releases, TOTAL, TEX_SCALE, look, photo]);

  // paint faces once the card font is ready, then again as each cover arrives
  useEffect(() => {
    let live = true;
    (async () => {
      await Promise.all([`400 36px ${mono}`, `italic 400 30px ${mono}`].map((f) => document.fonts.load(f).catch(() => null)));
      for (const f of built.faces) {
        paintCard(f.ctx, f.r, f.i, f.slot, null, mono);
        f.tex.needsUpdate = true;
        if (f.i === 0 && !f.r.cover) rig.firstCardTexture = true;
      }
      await Promise.all(built.faces.map(async (f) => {
        // the 1080 copy: the cover is 350 units on the face, 700 px at 2x, so it is never scaled up
        const img = await loadCover(coverAt(f.r, 1080));
        if (!live || !img) return;
        paintCard(f.ctx, f.r, f.i, f.slot, img, mono);
        f.tex.needsUpdate = true;
        if (f.i === 0) rig.firstCardTexture = true;
      }));
    })();
    return () => { live = false; };
  }, [built, mono]);

  useEffect(() => {
    rig.N = N; rig.TOTAL = TOTAL; rig.axisY = built.axis.y; rig.cards = built.cards; rig.knobs = built.knobs;
    rig.ready = true;
    // measurement hook for the verification script (scripts/gillenwebsite/verify.mjs)
    (window as unknown as { __rolodex: unknown }).__rolodex = { rig, look, photo, outlineSegments: built.outlineSegments, texW: TEX_W * TEX_SCALE, anisotropy: 16, house: built.house, faceIds: built.faces.map((f) => f.r.id), meshes: built.meshes, triangles: built.triangles, axis: built.axis.toArray(), nodes: (() => { const n: string[] = []; built.house.traverse((o) => { if ((o as THREE.Mesh).isMesh) n.push(o.name); }); return n; })() };
    // SOURCES #07 pointnever.com C5 (6a304bdc22ff1924.js:23)
    console.log("Website is loaded, enjoy 👍");
  }, [built, N, TOTAL, TEX_SCALE, look, photo]);

  const angle = useMemo(() => makeAngle(TOTAL), [TOTAL]);
  useFrame((state, delta) => {
    state.gl.getDrawingBufferSize(OUTLINE_RES.value); // the 1 px silhouette is sized in device pixels
    const dt = Math.min(delta, 1 / 30), raw = scrollPos();
    // settle on a card like the real ratchet once scrolling stops
    const goal = performance.now() - rig.lastScroll > 160 && !rig.drag ? Math.round(raw) : raw;
    if (rig.reduce) { rig.s = goal; rig.v = 0; }
    else { rig.v += (goal - rig.s) * 170 * dt; rig.v *= Math.exp(-18 * dt); rig.s += rig.v * dt; }
    for (let i = 0; i < TOTAL; i++) built.cards[i].rotation.x = angle(FLIP_DIR * (rig.s - i));
    for (const k of built.knobs) k.rotation.x = FLIP_DIR * -rig.s * 0.42;
    const front = Math.max(0, Math.min(N - 1, Math.round(rig.s)));
    if (front !== rig.front) { rig.front = front; rig.onFront.forEach((f) => f(front)); }
  });

  return (
    <>
      <primitive object={built.house} />
      <primitive object={built.drum} />
      <primitive object={built.cradle} />
    </>
  );
}

useGLTF.preload(MODEL);
