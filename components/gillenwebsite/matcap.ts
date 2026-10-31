// Matcaps for the flat look, drawn in code (no downloads). Each pixel of the disc is a sphere normal n; its shade
// is a hemisphere gradient from ground (n.y = -1) to sky (n.y = +1), a soft key from the upper left, and a faint
// rim so silhouettes separate from the white page.
import * as THREE from "three";

type Tones = { sky: [number, number, number]; ground: [number, number, number]; key: number; rim: number; spec: number };

export const LIGHT: Tones = { sky: [246, 246, 244], ground: [178, 178, 176], key: 0.1, rim: 0.05, spec: 0 }; // neutral grey-white
export const DARK: Tones = { sky: [92, 90, 88], ground: [26, 25, 24], key: 0.12, rim: 0.06, spec: 0.35 }; // the knobs

export function matcap(t: Tones, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const L = new THREE.Vector3(-0.45, 0.65, 0.62).normalize();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1, ny = 1 - ((y + 0.5) / size) * 2, r2 = nx * nx + ny * ny;
      const k = (y * size + x) * 4;
      // pixels just outside the disc take the rim value, so filtering at the edge does not pull in black
      const rr = Math.min(r2, 0.999), nz = Math.sqrt(1 - rr), s = Math.sqrt(rr / Math.max(r2, 1e-6));
      const ux = nx * s, uy = ny * s;
      const h = uy * 0.5 + 0.5;
      const lam = Math.max(0, ux * L.x + uy * L.y + nz * L.z);
      const rim = Math.pow(1 - nz, 3);
      const spec = Math.pow(Math.max(0, 2 * lam * nz - L.z), 40);
      for (let ch = 0; ch < 3; ch++) {
        const base = t.ground[ch] + (t.sky[ch] - t.ground[ch]) * h;
        img.data[k + ch] = Math.min(255, base * (1 - t.key + t.key * 2 * lam) + 255 * (t.rim * rim + t.spec * spec));
      }
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
