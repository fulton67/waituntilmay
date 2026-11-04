// Bounding boxes of the face/skin GLBs and of the nodes the /ostad/anatomy presets frame (for camera targets).
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const load = (f) => { const b = readFileSync(new URL(`../base/${f}`, import.meta.url)); return new Promise((r, j) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "", r, j)); };
const f3 = (v) => v.toArray().map((x) => +x.toFixed(4));
for (const [f, nodes] of [["face.glb", ["skin_epidermis", "corrugator_supercilii_l", "procerus_muscle_l", "fat_deep_medial_cheek_l", "fat_deep_medial_cheek_r", "fat_deep_soof_l"]], ["skin_crosssection.glb", ["epidermis", "hypodermis"]]]) {
  const g = await load(f); g.scene.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(g.scene);
  console.log(f, "min", f3(all.min), "max", f3(all.max));
  for (const n of nodes) { const o = g.scene.getObjectByName(n); if (!o) { console.log(" missing", n); continue; } const b = new THREE.Box3().setFromObject(o); console.log(" ", n, "centre", f3(b.getCenter(new THREE.Vector3())), "min", f3(b.min), "max", f3(b.max)); }
}
