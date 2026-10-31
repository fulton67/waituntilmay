"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// The Rolodex: housing.glb with its torn rod and cradle rebuilt, the drum core, and TOTAL cards on the axis.
// Numbers are the prototype's (BUILD.md); materials are new: brushed frame and base with edge wear,
// fingerprinted bakelite knobs, paper-grain cards.
import { useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, FLIP_DIR, makeAngle, scrollPos } from "./rig";
import { CW, CH, TAB_H, R0, T, shapes, TEX_W, TEX_H, paintCard, blankTexture, loadCover } from "./cardTexture";
import { brushed, fingerprints, paperGrain, boxUV, edgeWear, withWear } from "./textures";
import { coverAt } from "./shared";
import type { PHOTO } from "./look";

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

export default function Rolodex({ releases, mono, photo }: { releases: Release[]; mono: string; photo: typeof PHOTO }) {
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
    return { house, axis, knobs, drum, cradle, cards, faces, meshes, triangles };
  }, [gltf, releases, TOTAL, TEX_SCALE, photo]);

  // Paint faces once the card font is ready, then again as each cover arrives. Every repaint re-uploads a
  // 2048 x 1478 texture with mipmaps (about 16 MB), and when several covers land together the uploads stacked into
  // 1-2 s frames on the live site. So paints go through a queue drained one face per frame, nearest the front card
  // first; a face waiting for its blank paint skips straight to its cover if the cover has arrived.
  const queue = useMemo(() => new Map<number, HTMLImageElement | null>(), []); // cleared whenever the faces are rebuilt
  useEffect(() => {
    let live = true;
    (async () => {
      await Promise.all([`400 36px ${mono}`, `italic 400 30px ${mono}`].map((f) => document.fonts.load(f).catch(() => null)));
      if (!live) return;
      built.faces.forEach((f, k) => { if (!queue.has(k)) queue.set(k, null); });
      await Promise.all(built.faces.map(async (f, k) => {
        // the 1080 copy: the cover is 350 units on the face, 700 px at 2x, so it is never scaled up
        const img = await loadCover(coverAt(f.r, 1080));
        if (live && img) queue.set(k, img);
      }));
    })();
    return () => { live = false; queue.clear(); };
  }, [built, mono, queue]);
  const paintNext = () => {
    if (!queue.size) return;
    let pick = -1, best = Infinity;
    for (const k of queue.keys()) { const d = Math.abs(built.faces[k].i - rig.s); if (d < best) { best = d; pick = k; } }
    const img = queue.get(pick)!, f = built.faces[pick];
    queue.delete(pick);
    paintCard(f.ctx, f.r, f.i, f.slot, img, mono);
    f.tex.needsUpdate = true;
    if (f.i === 0 && (img || !f.r.cover)) rig.firstCardTexture = true;
  };

  useEffect(() => {
    rig.N = N; rig.TOTAL = TOTAL; rig.axisY = built.axis.y; rig.cards = built.cards; rig.knobs = built.knobs;
    rig.ready = true;
    // measurement hook for the verification script (scripts/gillenwebsite/verify.mjs)
    (window as unknown as { __rolodex: unknown }).__rolodex = { rig, photo, texW: TEX_W * TEX_SCALE, anisotropy: 16, house: built.house, faceIds: built.faces.map((f) => f.r.id), meshes: built.meshes, triangles: built.triangles, axis: built.axis.toArray(), nodes: (() => { const n: string[] = []; built.house.traverse((o) => { if ((o as THREE.Mesh).isMesh) n.push(o.name); }); return n; })() };
    // SOURCES #07 pointnever.com C5 (6a304bdc22ff1924.js:23)
    console.log("Website is loaded, enjoy 👍");
  }, [built, N, TOTAL, TEX_SCALE, photo]);

  const angle = useMemo(() => makeAngle(TOTAL), [TOTAL]);
  useFrame((_, delta) => {
    paintNext();
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
