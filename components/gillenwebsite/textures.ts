// Procedural surface textures for the housing and cards, generated in the browser (no downloads).
// housing.glb has no UVs, so boxUV() projects them from each mesh's own shape.
import * as THREE from "three";

// seeded so the surface looks the same on every visit
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// tileable value noise on a size x size grid with `cells` cells per side
function valueNoise(size: number, cells: number, rand: () => number) {
  const g = Array.from({ length: cells * cells }, rand);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => g[((j % cells) * cells + (i % cells))];
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  return out;
}

function fbm(size: number, octaves: number[], rand: () => number) {
  const out = new Float32Array(size * size);
  let total = 0;
  octaves.forEach((cells, i) => {
    const w = 1 / (i + 1);
    total += w;
    const n = valueNoise(size, cells, rand);
    for (let k = 0; k < out.length; k++) out[k] += n[k] * w;
  });
  for (let k = 0; k < out.length; k++) out[k] /= total;
  return out;
}

function dataTexture(size: number, fill: (k: number, x: number, y: number) => [number, number, number]) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = y * size + x, [r, g, b] = fill(k, x, y);
      img.data[k * 4] = r; img.data[k * 4 + 1] = g; img.data[k * 4 + 2] = b; img.data[k * 4 + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// normal map from a tileable height field
function normalFrom(h: Float32Array, size: number, strength: number) {
  return dataTexture(size, (_k, x, y) => {
    const at = (i: number, j: number) => h[((j + size) % size) * size + ((i + size) % size)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    return [((-dx / l) * 0.5 + 0.5) * 255, ((-dy / l) * 0.5 + 0.5) * 255, ((1 / l) * 0.5 + 0.5) * 255];
  });
}

// Brushed metal: fine streaks along U, each row a little rougher or smoother than the next.
// Roughness is read from the green channel, around the frame's 0.46.
export function brushed(size = 512) {
  const rand = rng(7);
  const rows = Float32Array.from({ length: size }, rand);
  const fine = fbm(size, [64, 128, 256], rand);
  const blotch = fbm(size, [4, 8], rand);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = y * size + x;
      // streaks: the row value, smeared along x by the fine noise
      h[k] = rows[y] * 0.7 + rows[(y + 1) % size] * 0.3 + (fine[k] - 0.5) * 0.15;
    }
  const roughness = dataTexture(size, (k) => {
    const v = 0.46 + (h[k] - 0.5) * 0.16 + (blotch[k] - 0.5) * 0.12;
    const g = Math.max(0, Math.min(1, v)) * 255;
    return [g, g, g];
  });
  return { roughness, normal: normalFrom(h, size, 0.9) };
}

// Bakelite knobs: polished at 0.42, with fingerprint whorls and smudges a few hundredths rougher.
export function fingerprints(size = 512) {
  const rand = rng(23);
  const warp = fbm(size, [6, 12], rand);
  const smudge = fbm(size, [3, 6], rand);
  const v = new Float32Array(size * size).fill(0.42);
  for (let p = 0; p < 7; p++) {
    const cx = rand() * size, cy = rand() * size, rx = 28 + rand() * 26, ry = rx * (1.25 + rand() * 0.3), rot = rand() * Math.PI;
    const cs = Math.cos(rot), sn = Math.sin(rot), ridge = 0.85 + rand() * 0.3;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        // wrap-around distance so prints tile
        let dx = x - cx, dy = y - cy;
        if (dx > size / 2) dx -= size; if (dx < -size / 2) dx += size;
        if (dy > size / 2) dy -= size; if (dy < -size / 2) dy += size;
        const u = (dx * cs + dy * sn) / rx, w = (-dx * sn + dy * cs) / ry, r = Math.hypot(u, w);
        if (r > 1) continue;
        const k = y * size + x;
        const lines = 0.5 + 0.5 * Math.sin(r * 38 * ridge + warp[k] * 9);
        const fade = (1 - r * r) * (0.6 + 0.4 * smudge[k]);
        v[k] += (0.04 + lines * 0.09) * fade;
      }
  }
  for (let k = 0; k < v.length; k++) v[k] += (smudge[k] - 0.5) * 0.06;
  return dataTexture(size, (k) => {
    const g = Math.max(0, Math.min(1, v[k])) * 255;
    return [g, g, g];
  });
}

// Paper grain for the cards: fibres and tooth as a faint normal map.
export function paperGrain(size = 256) {
  const rand = rng(41);
  const tooth = fbm(size, [32, 64, 128], rand);
  const fibre = fbm(size, [8, 16], rand);
  const h = new Float32Array(size * size);
  for (let k = 0; k < h.length; k++) h[k] = tooth[k] * 0.8 + fibre[k] * 0.2;
  return normalFrom(h, size, 3);
}

// Box-projected UVs: each vertex takes the two coordinates across its normal's main axis,
// scaled so one texture tile covers `tile` metres in the world.
export function boxUV(mesh: THREE.Mesh, tile: number) {
  const g = mesh.geometry as THREE.BufferGeometry;
  if (g.attributes.uv) return;
  const p = g.attributes.position, n = g.attributes.normal;
  const sc = mesh.getWorldScale(new THREE.Vector3());
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * sc.x, y = p.getY(i) * sc.y, z = p.getZ(i) * sc.z;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// Edge wear: per-vertex convexity from how fast the normal turns along each edge.
// Sharp outside edges (bevels) score high; flat faces and inside corners score 0.
export function edgeWear(mesh: THREE.Mesh) {
  const g = mesh.geometry as THREE.BufferGeometry;
  if (g.attributes.wear) return;
  const p = g.attributes.position, n = g.attributes.normal, idx = g.index;
  const sc = mesh.getWorldScale(new THREE.Vector3());
  const sum = new Float32Array(p.count), cnt = new Uint16Array(p.count);
  const tri = idx ? idx.count : p.count;
  const id = (k: number) => (idx ? idx.getX(k) : k);
  const edge = (a: number, b: number) => {
    const dx = (p.getX(b) - p.getX(a)) * sc.x, dy = (p.getY(b) - p.getY(a)) * sc.y, dz = (p.getZ(b) - p.getZ(a)) * sc.z;
    const l2 = dx * dx + dy * dy + dz * dz;
    if (l2 < 1e-12) return;
    const k = ((n.getX(b) - n.getX(a)) * dx + (n.getY(b) - n.getY(a)) * dy + (n.getZ(b) - n.getZ(a)) * dz) / Math.sqrt(l2);
    sum[a] += k; sum[b] += k; cnt[a]++; cnt[b]++;
  };
  for (let k = 0; k < tri; k += 3) {
    const a = id(k), b = id(k + 1), c = id(k + 2);
    edge(a, b); edge(b, c); edge(c, a);
  }
  const raw = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) raw[i] = cnt[i] ? Math.max(0, sum[i] / cnt[i]) : 0;
  // normalise to the mesh's own 97th percentile so every part wears by the same rule
  const sorted = Float32Array.from(raw).sort();
  const top = sorted[Math.floor(sorted.length * 0.97)] || 1;
  const wear = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) wear[i] = Math.min(1, raw[i] / top);
  g.setAttribute("wear", new THREE.BufferAttribute(wear, 1));
}

// Adds the edge-wear attribute to a standard/physical material: worn edges are brighter, bare
// brass and smoother than the face around them. Breaks up with the roughness map so wear is patchy.
export function withWear(m: THREE.MeshPhysicalMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float wear;\nvarying float vWear;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWear = wear;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWear;")
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float wearAmt = smoothstep(0.35, 1.0, vWear);
#ifdef USE_ROUGHNESSMAP
wearAmt *= smoothstep(0.38, 0.5, texture2D(roughnessMap, vRoughnessMapUv * 3.7).g);
#endif
roughnessFactor = mix(roughnessFactor, 0.24, wearAmt);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.78, 0.62), wearAmt * 0.55);`
      );
  };
  m.customProgramCacheKey = () => "wear";
  return m;
}
