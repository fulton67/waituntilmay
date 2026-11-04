// Load each GLB in Node (three's GLTFLoader, no browser) and compare named mesh nodes with its layers.json.
import { readFileSync, statSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const dir = new URL("../base/", import.meta.url);
let fail = 0;
for (const name of ["face", "skin_crosssection"]) {
  const buf = readFileSync(new URL(`${name}.glb`, dir));
  const man = JSON.parse(readFileSync(new URL(`${name}.layers.json`, dir), "utf8"));
  const mb = statSync(new URL(`${name}.glb`, dir)).size / 1e6;
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", res, rej));
  const names = new Set();
  gltf.scene.traverse((o) => { if (o.isMesh || o.isGroup || o.isObject3D) names.add(o.name); });
  const want = man.layers.flatMap((l) => l.nodes);
  const missing = want.filter((n) => !names.has(n) && !names.has(n.replace(/[ .()]/g, "_")) && !names.has(n.replace(/\./g, "")));
  const ok = missing.length === 0 && mb < 15;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}.glb ${mb.toFixed(2)} MB · manifest nodes ${want.length} · found ${want.length - missing.length}${missing.length ? " · missing e.g. " + missing.slice(0, 3).join(", ") : ""}`);
}
process.exit(fail ? 1 : 0);
