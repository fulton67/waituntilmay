// Smooth the vertex normals of housing.glb's frame, base and side parts, leaving vertex positions untouched.
//   node scripts/gillenwebsite/smooth-normals.mjs   (reads models/housing.tripo.glb, writes public/models/housing.glb)
// gltf-transform reads and writes the file (meshopt + quantization kept); it has no "smooth" command, so the pass
// is here: a bilateral Laplacian on the normals. Each vertex's normal is averaged with its 1-ring neighbours (by
// shared triangle, and by identical position across UV/normal seams), counting only neighbours within CREASE
// degrees so real edges stay sharp. Positions are compared byte for byte before and after.
import path from "node:path";
import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "scripts/gillenwebsite/models/housing.tripo.glb");
const OUT = path.join(ROOT, "public/models/housing.glb");
const PARTS = ["frame", "base", "side_right", "side_right_inner"]; // side_right_inner is also the left inner side's mesh
const ITER = 12, CREASE = 50;

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(SRC);

const unpack = (a) => { const arr = a.getArray(), n = a.getCount(), out = new Float32Array(n * 3), k = a.getNormalized() ? (arr instanceof Int16Array ? 32767 : arr instanceof Int8Array ? 127 : 1) : 1;
  for (let i = 0; i < n * 3; i++) out[i] = Math.max(-1, arr[i] / k); return out; };
const pack = (a, f) => { const arr = a.getArray(), k = arr instanceof Int16Array ? 32767 : arr instanceof Int8Array ? 127 : 1;
  const out = new arr.constructor(arr.length); for (let i = 0; i < arr.length; i++) out[i] = k === 1 ? f[i] : Math.round(f[i] * k); a.setArray(out); };
const norm = (v, i) => { const l = Math.hypot(v[i], v[i + 1], v[i + 2]) || 1; v[i] /= l; v[i + 1] /= l; v[i + 2] /= l; };

// adjacency: shared triangles, plus every vertex at the identical (quantized) position
function rings(pos, idx, n) {
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const at = new Map();
  for (let i = 0; i < n; i++) { const k = `${pos[i * 3]},${pos[i * 3 + 1]},${pos[i * 3 + 2]}`; (at.get(k) || at.set(k, []).get(k)).push(i); }
  for (const g of at.values()) if (g.length > 1) for (const i of g) for (const j of g) if (i !== j) for (const x of nb[j]) nb[i].add(x);
  return nb.map((s) => [...s]);
}
// variance: angle between each vertex normal and each of its 1-ring neighbours' normals, in degrees
function variance(nrm, nb) {
  let sum = 0, sq = 0, c = 0;
  nb.forEach((list, i) => { for (const j of list) { const d = Math.min(1, Math.max(-1, nrm[i * 3] * nrm[j * 3] + nrm[i * 3 + 1] * nrm[j * 3 + 1] + nrm[i * 3 + 2] * nrm[j * 3 + 2])); const a = (Math.acos(d) * 180) / Math.PI; sum += a; sq += a * a; c++; } });
  const mean = sum / c;
  return { meanDeg: +mean.toFixed(3), varianceDeg2: +(sq / c - mean * mean).toFixed(3), pairs: c };
}

const report = {};
for (const mesh of doc.getRoot().listMeshes()) {
  if (!PARTS.includes(mesh.getName())) continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute("POSITION"), N = prim.getAttribute("NORMAL"), n = P.getCount();
    const posBefore = Buffer.from(P.getArray().buffer.slice(0));
    const idx = prim.getIndices().getArray(), nb = rings(P.getArray(), idx, n);
    let nrm = unpack(N);
    for (let i = 0; i < n; i++) norm(nrm, i * 3);
    const before = variance(nrm, nb);
    const cos = Math.cos((CREASE * Math.PI) / 180);
    for (let it = 0; it < ITER; it++) {
      const next = new Float32Array(nrm.length);
      for (let i = 0; i < n; i++) {
        let x = nrm[i * 3], y = nrm[i * 3 + 1], z = nrm[i * 3 + 2];
        for (const j of nb[i]) { const d = nrm[i * 3] * nrm[j * 3] + nrm[i * 3 + 1] * nrm[j * 3 + 1] + nrm[i * 3 + 2] * nrm[j * 3 + 2]; if (d >= cos) { x += nrm[j * 3]; y += nrm[j * 3 + 1]; z += nrm[j * 3 + 2]; } }
        next[i * 3] = x; next[i * 3 + 1] = y; next[i * 3 + 2] = z; norm(next, i * 3);
      }
      nrm = next;
    }
    pack(N, nrm);
    const after = variance(unpack(N), nb);
    const posSame = Buffer.compare(posBefore, Buffer.from(P.getArray().buffer.slice(0))) === 0;
    report[mesh.getName()] = { vertices: n, before, after, positionsUnchanged: posSame };
  }
}
await io.write(OUT, doc);
// read back and confirm the written positions equal the source's for every mesh
const a = await io.read(SRC), b = await io.read(OUT);
const pos = (d) => Object.fromEntries(d.getRoot().listMeshes().map((m) => [m.getName(), Buffer.from(m.listPrimitives()[0].getAttribute("POSITION").getArray().buffer)]));
const pa = pos(a), pb = pos(b);
report.positionsIdenticalAfterWrite = Object.keys(pa).every((k) => Buffer.compare(pa[k], pb[k]) === 0);
report.bytes = { src: (await fs.stat(SRC)).size, out: (await fs.stat(OUT)).size };
report.settings = { iterations: ITER, creaseDeg: CREASE };
await fs.writeFile(path.join(ROOT, "scripts/gillenwebsite/smooth-normals-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
