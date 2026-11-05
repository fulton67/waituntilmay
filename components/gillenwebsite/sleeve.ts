// The 12" record sleeve that replaces the index card on the Rolodex, and the texture rules every cover follows.
// A sleeve is one extruded shape: SLEEVE_W wide (along the axle) by SLEEVE high, slightly rounded corners and the
// card's two rail slots at the bottom edge, SLEEVE_T thick. The cover is a SLEEVE square in the middle of each face;
// the faces' UVs span that square, so outside it u runs past 0..1 and the face shows the sleeve's paper there
// (Rolodex.tsx's face material). Its faces are split into three material groups: 0 the front (+z, the front cover),
// 1 the back (-z, the back cover, mirrored so it reads from behind), 2 the edge all round (the spine).
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";

// 0.337 m: the largest size (to the mm) whose far edge, R0 + SLEEVE from the axle, stays under 0.410 m through the
// turn (the sleeves only turn about the axle, so that radius is the same at every angle)
// SLEEVE_W 0.44 m: grown along the axle, the height being at the frame's clearance (the end plates' inner faces are
// 0.4867 m apart, so 23 mm clear each side with the sleeve centred between them)
export const SLEEVE_W = 0.44;
export const SLEEVE = 0.337, SLEEVE_T = 0.0025, CORNER = 0.004;
// the rail slots, where the card had them: 12 mm wide, 30 mm deep, round-ended, centred at x = +-0.075
export const SLOT_X = 0.075;

// (width: across, along the axle; slotShift: where the slots sit from the sleeve's middle, so a sleeve set off-centre
// on the drum still has its slots on the rails)
export function sleeveShape(size = SLEEVE, slots = true, width = size, slotShift = 0) {
  const s = new THREE.Shape(), r = CORNER, x0 = -width / 2, x1 = width / 2, y0 = 0, y1 = size;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  if (slots) for (const cx of [-SLOT_X + slotShift, SLOT_X + slotShift]) {
    const h = new THREE.Path(), w = 0.012, hh = 0.03, cy = 0.006;
    h.moveTo(cx - w / 2, cy); h.lineTo(cx + w / 2, cy); h.lineTo(cx + w / 2, cy + hh - w / 2); h.absarc(cx, cy + hh - w / 2, w / 2, 0, Math.PI, false); h.lineTo(cx - w / 2, cy);
    s.holes.push(h);
  }
  return s;
}

// the sleeve body, its back face at z = -t and its front at z = 0, with the three groups above. UVs on the faces
// span the size x size square in the middle (the back's mirrored in u), past 0..1 in the margins of a wider sleeve;
// on the edge they run round the outline in metres, for the paper.
export function sleeveGeometry(size = SLEEVE, t = SLEEVE_T, slots = true, width = size, slotShift = 0) {
  const g = new THREE.ExtrudeGeometry(sleeveShape(size, slots, width, slotShift), { depth: t, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -t);
  const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  const caps = g.groups.find((x) => x.materialIndex === 0)!, sides = g.groups.find((x) => x.materialIndex === 1)!;
  // non-indexed: three vertices a triangle. Sort the cap triangles into front and back by their normal.
  const front: number[] = [], back: number[] = [];
  for (let i = caps.start; i < caps.start + caps.count; i += 3) (nrm.getZ(i) > 0 ? front : back).push(i);
  for (let i = caps.start; i < caps.start + caps.count; i++) {
    const u = (pos.getX(i) + size / 2) / size, v = pos.getY(i) / size;
    uv.setXY(i, nrm.getZ(i) > 0 ? u : 1 - u, v);
  }
  // rebuild the position/normal/uv arrays in group order: front, back, sides
  const order = [...front, ...back];
  const tris = [...order.map((i) => [i, i + 1, i + 2]).flat(), ...[...Array(sides.count)].map((_, k) => sides.start + k)];
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const a = g.attributes[name], n = a.itemSize, arr = new Float32Array(tris.length * n);
    tris.forEach((src, k) => { for (let c = 0; c < n; c++) arr[k * n + c] = a.array[src * n + c]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  out.addGroup(0, front.length * 3, 0);
  out.addGroup(front.length * 3, back.length * 3, 1);
  out.addGroup(order.length * 3, sides.count, 2);
  g.dispose();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

// every texture: the renderer's full anisotropy, trilinear mips; colour maps in sRGB, data maps (normal, roughness) linear
export function sharpen(t: THREE.Texture, gl: THREE.WebGLRenderer, color: boolean) {
  t.anisotropy = gl.capabilities.getMaxAnisotropy();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
// a cover file as a texture, decoded off the main thread: fetch, then createImageBitmap, flipped there since an
// ImageBitmap ignores flipY. AVIF, or the JPEG beside it where the browser cannot decode AVIF.
const bitmaps = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" });
const loadBitmap = (url: string) => bitmaps.loadAsync(url).then((b) => { const t = new THREE.Texture(b as unknown as HTMLImageElement); t.flipY = false; return t; });
export const loadTex = (url: string) => loadBitmap(url).catch(() => loadBitmap(url.replace(/\.avif$/, ".jpg")));
// The mip-swap rule: put a texture on a material in one frame and only once it is ready. The bitmap is already
// decoded (an ImageBitmap resolves decoded) and initTexture uploads it and its mips to the GPU now, so the frame that
// shows it has nothing left to do. Until then the old texture stays: a face never shows an undecoded texture.
export const setMap = (gl: THREE.WebGLRenderer, m: THREE.MeshStandardMaterial, t: THREE.Texture) => {
  if (m.map === t) return;
  gl.initTexture(t);
  m.map = t;
};

// the files a release has for each side: the front at r.coverSizes, the back at r.back.sizes
export type Side = "front" | "back";
export const sideSizes = (r: Release, side: Side) => (side === "front" ? r.coverSizes : r.back.sizes);
export const sideWidth = (r: Release, side: Side, w: number) => { const s = sideSizes(r, side); return s.find((x) => x >= w) ?? s.at(-1)!; };
export const sideFile = (r: Release, side: Side, w: number, ext: "avif" | "jpg" = "avif") =>
  `/covers/${sideWidth(r, side, w)}/${r.id}${side === "back" ? "-back" : ""}.${ext}`;
