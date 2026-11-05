"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// The Rolodex: housing.glb with its torn rod left out and its cradle replaced (kit/cradle.glb), the drum core, and TOTAL record sleeves on the axis:
// the N releases three times round, so the drum is full and turns forever (slot i holds release i mod N).
// Numbers are the prototype's (BUILD.md). Materials: the parts baked from the painted part sheets (kit/bake, listed in
// lib/gillenwebsite/housing-bake.json) take their baked geometry (new UVs, housing-baked.glb) and maps; the rest keep
// the tileable materials mapped triplanar (triplanar.ts): chrome on the axle, rails
// and hubs. Sleeves are cardboard, their spines the aged paper from the sheets.
// A sleeve (sleeve.ts) is one mesh with three material groups: the front cover, the back cover and the spine. Each
// release has one front and one back material, shared by its three sleeves. No text is drawn on a sleeve.
import { useMemo, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, per, FLIP_DIR, coast, makeAngle, wrap, setPos, jumpTo, jumpToRelease } from "./rig";
import { R0 } from "./cardTexture";
import { SLEEVE, sleeveGeometry, sharpen, loadTex, setMap, sideWidth, sideFile, type Side } from "./sleeve";
import { paperGrain } from "./textures";
import { triplanar, materialsFrom, MATERIAL_URLS } from "./triplanar";
import { Text } from "troika-three-text";
import bake from "@/lib/gillenwebsite/housing-bake.json";

export const MODEL = "/models/housing.glb";
// The sleeve face's two lines (the artist, the release; not Dylan's name), SDF in the header's face (Archivo at 118%),
// white with a thin dark halo, on a strip along the bottom edge just above the rail slots. One block per release, on
// its copy nearest the front, drawn only while that copy is the front sleeve: it draws after the cover (renderOrder)
// with no depth test, so nothing can hide it, and only the front sleeve has it so it never shows through another.
const FACE_FONT = "/gillenwebsite/fonts/archivo-wdth118-regular.ttf";
const FACE = { size: 0.0135, margin: 0.013, bottom: 0.042, lead: 1.18, order: 3 };
// the baked parts: their geometry with new UVs, and per part albedo, roughness (G) + metalness (B), and normal
const BAKED = "/models/housing-baked.glb";
const BAKED_PARTS = [...new Set(Object.values(bake.nodes).map((n) => n.maps))];
// the drum's end plates: the inner discs' painted gunmetal as a tile (kit/bake/gunmetal.py), 0.367 m a tile
const GUNMETAL_URLS = ["albedo.jpg", "rm.png", "normal.png"].map((f) => `/models/housing-maps/gunmetal-${f}`), GUNMETAL_TILE_M = 0.3668;
// The end plates sit just inside the parts beside them, 3 mm clear: within the plate's radius of the axle the right
// side plate's inside face is at x = +0.2399 and, on the left, the frame's side loop's at x = -0.2588 (measured in the
// page, scripts/gillenwebsite/endplates.mjs). A 3 mm plate there: its middle 4.5 mm inside each.
const PLATE_T = 0.003, PLATE_GAP = 0.003, PLATE_X = [-0.2588 + PLATE_GAP + PLATE_T / 2, 0.2399 - PLATE_GAP - PLATE_T / 2];
const CRADLE = "/models/cradle-baked.glb", CRADLE_URLS = ["albedo.jpg", "rm.png", "normal.png"].map((f) => `/models/housing-maps/cradle-${f}`);
const BAKED_URLS = [...BAKED_PARTS.flatMap((p) => [`/models/housing-maps/${p}-albedo.jpg`, `/models/housing-maps/${p}-rm.png`, `/models/housing-maps/${p}-normal.png`]), "/materials/paper.jpg"];
// the front release gets 2048 covers (front and back), its two neighbours 1024, once its sleeve has settled; the
// rest stay at 512. Never less than the face's device pixels on screen.
const BIG = 2048, NEAR = 1024, BIG_SPAN = 1;
// a sleeve has to stay at the front this long before its big covers load, so a fast run through the drum loads none
const SETTLE_MS = 150;

const PART_MAT: Partial<Record<string, "plate" | "bakelite">> = {
  side_right_inner: "plate",
  side_left_inner: "plate",
  knob_right: "bakelite",
  knob_left: "bakelite",
  knob_left_cap: "bakelite",
  knob_left_face: "bakelite",
};
const KNOBS = ["knob_right", "knob_left", "knob_left_cap", "knob_left_face"];

function makeMaterials(gl: THREE.WebGLRenderer, tex: THREE.Texture[]) {
  const T = materialsFrom(gl, tex);
  const enamel = () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
  return {
    metal: triplanar(enamel(), T.enamel, { normalScale: 1 }),
    // the inner side plates are the same enamel, darker
    plate: triplanar(enamel(), T.enamel, { normalScale: 1, tint: "#5b534b" }),
    chrome: triplanar(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1 }), T.chrome),
    // the knobs turn, so their maps turn with them (mapped in their own space)
    bakelite: triplanar(new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }), T.bakelite, { object: true }),
    grain: sharpen(paperGrain(), gl, false),
  };
}

// one side of one release: its material (shared by the release's three sleeves) and the textures it has loaded
type Face = { mat: THREE.MeshStandardMaterial; small: THREE.Texture | null; big: THREE.Texture | null; bigW: number; want: number };

export default function Rolodex({ releases }: { releases: Release[] }) {
  const gltf = useGLTF(MODEL);
  const baked = useGLTF(BAKED);
  const tex = useLoader(THREE.TextureLoader, MATERIAL_URLS);
  const bakedTex = useLoader(THREE.TextureLoader, BAKED_URLS);
  const cradleGltf = useGLTF(CRADLE);
  const cradleTex = useLoader(THREE.TextureLoader, CRADLE_URLS);
  const gunTex = useLoader(THREE.TextureLoader, GUNMETAL_URLS);
  const gl = useThree((st) => st.gl);
  const N = releases.length, TOTAL = N * 3;

  const built = useMemo(() => {
    const M = makeMaterials(gl, tex);
    // the baked parts' materials: glTF UVs (the image's first row is v = 0), so no flip
    const B: Record<string, THREE.MeshPhysicalMaterial> = {};
    BAKED_PARTS.forEach((p, k) => {
      const [map, rm, normal] = bakedTex.slice(k * 3, k * 3 + 3).map((t, j) => { t.flipY = false; t.anisotropy = gl.capabilities.getMaxAnisotropy(); t.colorSpace = j === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; });
      const bakelite = Object.values(bake.nodes).find((n) => n.maps === p)?.kind === "bakelite";
      B[p] = new THREE.MeshPhysicalMaterial({ map, roughnessMap: rm, metalnessMap: rm, normalMap: normal, roughness: 1, metalness: 1, clearcoat: bakelite ? 0.6 : 0.3, clearcoatRoughness: bakelite ? 0.25 : 0.5, side: THREE.DoubleSide });
    });
    const paperTex = bakedTex[bakedTex.length - 1];
    paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
    paperTex.colorSpace = THREE.SRGBColorSpace;
    paperTex.anisotropy = gl.capabilities.getMaxAnisotropy();
    paperTex.needsUpdate = true;
    const house = gltf.scene;
    house.updateMatrixWorld(true);
    let meshes = 0, triangles = 0;
    house.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      meshes++;
      const g = m.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
      m.material = M[PART_MAT[m.name] ?? "metal"];
      const b = (bake.nodes as Record<string, { geometry: string; maps: string; kind: string }>)[m.name];
      if (b) {
        const geo = (baked.scene.getObjectByName(b.geometry) as THREE.Mesh | undefined)?.geometry;
        if (geo) { m.geometry = geo; m.material = B[b.maps]; }
      }
      m.castShadow = m.receiveShadow = true;
      if (m.name === "rod" || m.name === "cradle") m.visible = false; // torn sheets in the Tripo mesh; the cradle is replaced below
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

    // drum core: axle, dark inner drum, two chrome rails through the sleeve slots, spokes, hubs
    const core = new THREE.Group(), span = 0.52;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, span + 0.04, 32), M.chrome);
    axle.rotation.z = Math.PI / 2;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 0.006, R0 - 0.006, SLEEVE - 0.02, 64, 1, true), M.plate);
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
    // end plates, so the drum is closed at each end and the axle is held: a disc on the axle (radius R0 + 0.03,
    // 3 mm), a hub collar on its inner face (radius 0.03, 8 mm), and three struts along the axle, 0.05 m out (inside
    // the sleeves' 0.072 m), from the plate to the rail ring's spokes at x = +-0.075, in line with them
    const [gMap, gRm, gNormal] = gunTex.map((t, j) => { t.colorSpace = j === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; });
    const gunmetal = triplanar(new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
      { map: gMap, roughnessMap: gRm, normalMap: gNormal }, { tileM: GUNMETAL_TILE_M });
    for (const x of PLATE_X) {
      const side = Math.sign(x), inner = x - side * PLATE_T / 2;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.03, R0 + 0.03, PLATE_T, 72), gunmetal);
      plate.rotation.z = Math.PI / 2; plate.position.x = x; plate.name = "endplate";
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 40), gunmetal);
      collar.rotation.z = Math.PI / 2; collar.position.x = inner - side * 0.004; collar.name = "endplate";
      core.add(plate, collar);
      const rail = side * 0.075, len = Math.abs(inner - rail);
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI * 2) / 3;
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 10), gunmetal);
        strut.rotation.z = Math.PI / 2; strut.position.set((inner + rail) / 2, Math.cos(a) * 0.05, Math.sin(a) * 0.05); strut.name = "endplate";
        core.add(strut);
      }
    }
    core.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true; });

    // cradle: the saddle under the drum, kit/cradle.glb (already in the housing's frame: 0.512 m wide, on the drum
    // axis at y 0.585, z 0.005) with the maps baked from kit/painted-cradle.png (kit/bake/cradle.py)
    const [cMap, cRm, cNormal] = cradleTex.map((t, j) => { t.flipY = false; t.anisotropy = gl.capabilities.getMaxAnisotropy(); t.colorSpace = j === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; });
    // its scene goes in as it is, at the origin with an identity transform, like the housing's (no position, rotation
    // or scale of ours); only the material is set
    const cradleScene = cradleGltf.scene, cradle = cradleScene.getObjectByName("cradle") as THREE.Mesh;
    cradle.material = new THREE.MeshPhysicalMaterial({ map: cMap, roughnessMap: cRm, metalnessMap: cRm, normalMap: cNormal, roughness: 1, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
    cradle.castShadow = cradle.receiveShadow = true;

    // sleeves: cardboard, roughness .7, a faint paper normal map. Every face starts on a 1x1 texture of the sleeve's
    // own board colour, so the shader has its map from the first frame and a cover arriving changes no program.
    const sleeveGeo = sleeveGeometry();
    const grain = M.grain.clone();
    grain.repeat.set(3, 3);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.needsUpdate = true;
    const board = new THREE.DataTexture(new Uint8Array([214, 204, 186, 255]), 1, 1);
    board.colorSpace = THREE.SRGBColorSpace; board.needsUpdate = true;
    const cardboard = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0, normalMap: grain, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 0.6 });
    // the spine: the aged paper from the sheets (its UVs run round the outline in metres: a tile every 0.25 m)
    const spineTex = paperTex.clone();
    spineTex.repeat.set(4, 4);
    spineTex.needsUpdate = true;
    const spine = cardboard(spineTex);
    const faces = releases.map((r, i) => ({ r, i, front: { mat: cardboard(board), small: null, big: null, bigW: 0, want: 0 } as Face, back: { mat: cardboard(board), small: null, big: null, bigW: 0, want: 0 } as Face }));
    const drum = new THREE.Group();
    drum.position.set(0, axis.y, axis.z);
    drum.add(core);
    const cards: THREE.Group[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const f = faces[i % N];
      const g = new THREE.Group();
      const body = new THREE.Mesh(sleeveGeo, [f.front.mat, f.back.mat, spine]);
      body.castShadow = body.receiveShadow = true;
      body.position.y = R0;
      body.userData.i = g.userData.i = i;
      g.add(body);
      drum.add(g);
      cards.push(g);
    }
    const faceTextMat = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
    const faceText = faces.map(({ r }) => {
      const t = new Text();
      Object.assign(t, { font: FACE_FONT, fontSize: FACE.size, lineHeight: FACE.lead, color: 0xffffff, anchorX: "left", anchorY: "bottom", whiteSpace: "nowrap",
        outlineWidth: "12%", outlineBlur: "10%", outlineColor: 0x000000, outlineOpacity: 0.85, maxWidth: SLEEVE - FACE.margin * 2,
        clipRect: [0, -1, SLEEVE - FACE.margin * 2, 1] });
      t.text = `${r.artist}\n${r.release}`;
      t.position.set(-SLEEVE / 2 + FACE.margin, R0 + FACE.bottom, 0.0004);
      t.renderOrder = FACE.order;
      t.visible = false;
      // troika derives its glyph and outline materials from this base, so they inherit no depth test
      t.material = faceTextMat;
      t.sync();
      return { t, holder: -1 };
    });
    return { house, axis, knobs, drum, cradle, cradleScene, cards, faces, faceText, sleeveGeo, meshes, triangles };
  }, [gltf, baked, tex, bakedTex, cradleGltf, cradleTex, gunTex, gl, releases, N, TOTAL]);

  // the first front sleeve counts as settled 150 ms after the first frame
  const settle = useMemo(() => ({ since: 0, done: false }), []);
  // big covers, decoded and waiting to be uploaded: a 2048 upload with its mips takes a frame's worth of time, so
  // they go up one a frame, front first, and only while the drum stands still
  const uploads = useMemo<(() => void)[]>(() => [], []);
  const { facePx, bigCovers } = useMemo(() => {
    // the front sleeve's face on screen at rest, in device pixels: what its texture has to cover
    const facePx = () => {
      const card = built.cards[wrap(Math.round(rig.s), TOTAL)], cam = rig.camera;
      if (!cam) return 0;
      card.updateWorldMatrix(true, true);
      const b = built.sleeveGeo.boundingBox!, m = card.children[0].matrixWorld, sz = gl.getDrawingBufferSize(new THREE.Vector2());
      const pts = [[b.min.x, b.min.y], [b.max.x, b.min.y], [b.min.x, b.max.y], [b.max.x, b.max.y]].map(([x, y]) => new THREE.Vector3(x, y, b.max.z).applyMatrix4(m).project(cam));
      const xs = pts.map((q) => (q.x + 1) * 0.5 * sz.x), ys = pts.map((q) => (1 - q.y) * 0.5 * sz.y);
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    };
    // the front release's big covers (2048, or more if its face needs it), 1024 for the two beside it; the rest go
    // back to 512 and their big textures are freed. The 512 stays on until the big one is decoded and uploaded.
    const bigCovers = (front: number) => {
      const px = Math.ceil(facePx());
      for (const f of built.faces) {
        const d = Math.abs(((f.i - front + N + N / 2) % N) - N / 2);
        for (const side of ["front", "back"] as Side[]) {
          const face = f[side];
          if (side === "front" && !f.r.cover) continue;
          if (d > BIG_SPAN) {
            if (face.big) { if (face.small) setMap(gl, face.mat, face.small); face.big.dispose(); face.big = null; face.bigW = 0; face.want = 0; }
            continue;
          }
          const w = sideWidth(f.r, side, Math.max(d === 0 ? BIG : NEAR, px));
          if (face.bigW >= w || face.want >= w || w <= 512) continue;
          face.want = w;
          loadTex(sideFile(f.r, side, w)).then((t) => {
            if (face.want !== w) return t.dispose();
            // decoded; the upload waits its turn (one a frame, with the drum still: see useFrame)
            uploads.push(() => {
              if (face.want !== w) return t.dispose();
              const old = face.big;
              setMap(gl, face.mat, sharpen(t, gl, true));
              old?.dispose();
              face.big = t; face.bigW = w;
            });
          });
        }
      }
    };
    return { facePx, bigCovers };
  }, [built, gl, N, TOTAL, uploads]);

  // covers: both sides of every release at 512 to begin with; the front ones get their big files once settled
  useEffect(() => {
    let live = true;
    let left = 0;
    for (const f of built.faces) {
      for (const side of ["front", "back"] as Side[]) {
        if (side === "front" && !f.r.cover) continue;
        left++;
        loadTex(sideFile(f.r, side, 512)).then((t) => {
          if (!live) return t.dispose();
          const face = f[side];
          face.small = sharpen(t, gl, true);
          if (!face.big) setMap(gl, face.mat, face.small);
          if (f.i === 0 && side === "front") rig.firstCardTexture = true;
          if (--left === 0) rig.allSmall = true;
        });
      }
    }
    return () => { live = false; };
  }, [built, gl]);

  useEffect(() => {
    rig.N = N; rig.TOTAL = TOTAL; rig.axisY = built.axis.y; rig.cards = built.cards; rig.knobs = built.knobs;
    rig.coverImages = (i) => {
      const f = built.faces[i], side = (x: Face) => (x.mat.map && x.mat.map.image && (x.mat.map.image as { width: number }).width > 1 ? { image: x.mat.map.image, w: (x.mat.map.image as { width: number }).width } : null);
      return { front: side(f.front), back: side(f.back) };
    };
    rig.ready = true;
    // measurement hook for the verification scripts (scripts/gillenwebsite/*.mjs)
    (window as unknown as { __rolodex: unknown }).__rolodex = {
      rig, per, jumpTo, jumpToRelease, gl, house: built.house, faceIds: built.faces.map((f) => f.r.id),
      frontPoint: () => { const c = new THREE.Box3().setFromObject(built.cards[wrap(Math.round(rig.s), TOTAL)]).getCenter(new THREE.Vector3()).project(rig.camera!), b = rig.hit!.parentElement!.getBoundingClientRect(); return { x: b.left + (c.x + 1) * 0.5 * b.width, y: b.top + (1 - c.y) * 0.5 * b.height }; },
      // texture vs screen: the front sleeve's two cover textures against its face's device pixels on screen
      texels: () => { const f = built.faces[wrap(Math.round(rig.s), N)], w = (t: THREE.Texture | null) => (t?.image as { width: number } | undefined)?.width ?? 0; return { release: f.r.id, frontTexturePx: w(f.front.mat.map), backTexturePx: w(f.back.mat.map), faceScreenPx: facePx(), pixelRatio: gl.getPixelRatio(), bigLoaded: built.faces.flatMap((x) => [x.front.big ? `${x.r.id}@${x.front.bigW}` : "", x.back.big ? `${x.r.id}-back@${x.back.bigW}` : ""]).filter(Boolean) }; },
      // the farthest point of any sleeve from the drum axis, in metres, with the drum at s (drum space: y, z)
      sleeveRadius: () => { built.drum.updateMatrixWorld(true); const inv = built.drum.matrixWorld.clone().invert(), p = built.sleeveGeo.attributes.position, v = new THREE.Vector3(); let max = 0; for (const c of built.cards) { const m = inv.clone().multiply(c.children[0].matrixWorld); for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k).applyMatrix4(m); max = Math.max(max, Math.hypot(v.y, v.z)); } } return max; },
      // the baked parts' textures and the paper, as GPU memory (RGBA8 with mips)
      bakedTextureMB: () => +(bakedTex.reduce((t, x) => { const im = x.image as { width: number; height: number }; return t + (im.width * im.height * 4 * 4) / 3; }, 0) / 2 ** 20).toFixed(2),
      cradle: built.cradle,
      faceText: built.faceText.map((f) => f.t),
      meshes: built.meshes, triangles: built.triangles, axis: built.axis.toArray(), nodes: (() => { const n: string[] = []; built.house.traverse((o) => { if ((o as THREE.Mesh).isMesh) n.push(o.name); }); return n; })(),
    };
    console.log("Website is loaded, enjoy");
  }, [built, N, TOTAL, gl, facePx, bakedTex]);

  const angle = useMemo(() => makeAngle(TOTAL), [TOTAL]);
  // the drum's screen rect is the sleeves' touch hit area (Site.tsx): 8 corners of its rest box, projected each frame
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
    // a flick coasts on its own curve (rig.ts) and stops on its sleeve
    if (rig.fling !== null) {
      const c = coast(rig.fling, now);
      if (c.done) { setPos(rig.fling.to); rig.s = rig.fling.to; rig.v = 0; rig.fling = null; }
      else { setPos(c.x); rig.s = c.x; rig.v = c.v; }
    }
    const raw = rig.pos;
    if (rig.drag?.mode === "flip" || rig.fling !== null) {
      // the finger (or the flick) drives the drum directly: the sleeve under it follows 1:1; the spring waits for release
      if (rig.fling === null) { rig.s = raw; rig.v = 0; }
    } else {
      // settle on a sleeve like the real ratchet once scrolling stops
      const goal = performance.now() - rig.lastScroll > 160 && !rig.drag ? Math.round(raw) : raw;
      if (rig.reduce) { rig.s = goal; rig.v = 0; }
      else { rig.v += (goal - rig.s) * 170 * dt; rig.v *= Math.exp(-18 * dt); rig.s += rig.v * dt; }
    }
    // angle() wraps the distance to each slot round the ring, so s runs on past TOTAL with no seam
    for (let i = 0; i < TOTAL; i++) {
      built.cards[i].rotation.x = angle(FLIP_DIR * (rig.s - i));
      // the sleeve lifted off the ring into the record view (VinylView) is not drawn on the ring meanwhile
      built.cards[i].visible = i !== rig.lifted;
    }
    for (const k of built.knobs) k.rotation.x = FLIP_DIR * -rig.s * 0.42;
    // each release's face text rides on its copy nearest the front, shown only while that copy is the front sleeve
    for (let r = 0; r < N; r++) {
      const ft = built.faceText[r];
      let best = 0, bd = Infinity;
      for (let k = 0; k < 3; k++) { const c = r + k * N, d = Math.abs(((((c - rig.s) % TOTAL) + TOTAL + TOTAL / 2) % TOTAL) - TOTAL / 2); if (d < bd) { bd = d; best = c; } }
      if (ft.holder !== best) { built.cards[best].add(ft.t); ft.holder = best; }
      ft.t.visible = bd < 0.4 && best !== rig.lifted;
    }
    const front = wrap(Math.round(rig.s), N);
    if (front !== rig.front) { rig.front = front; rig.onFront.forEach((f) => f(front)); settle.since = now; settle.done = false; }
    if (!settle.done && now - settle.since > SETTLE_MS) { settle.done = true; bigCovers(front); }
    if (uploads.length && !rig.drag && rig.fling === null && Math.abs(rig.s - Math.round(rig.s)) < 0.01 && Math.abs(rig.v) < 0.05) uploads.shift()!();
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
      <primitive object={built.cradleScene} />
    </>
  );
}

useGLTF.preload(MODEL);
useLoader.preload(THREE.TextureLoader, MATERIAL_URLS);
useGLTF.preload(BAKED);
useGLTF.preload(CRADLE);
useLoader.preload(THREE.TextureLoader, CRADLE_URLS);
useLoader.preload(THREE.TextureLoader, GUNMETAL_URLS);
useLoader.preload(THREE.TextureLoader, BAKED_URLS);
