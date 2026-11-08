// The 12" record sleeve that replaces the index card on the Rolodex, and the texture rules every cover follows.
// A sleeve is one extruded shape: a SLEEVE square, slightly rounded corners and the card's two rail slots at the
// bottom edge, SLEEVE_T thick. Each face is the cover, edge to edge: its UVs run 0..1 on both axes over the square, so
// a square image stays square. Its faces are split into three material groups: 0 the front (+z, the front cover),
// 1 the back (-z, the back cover, mirrored so it reads from behind), 2 the edge all round (the spine).
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";

// 0.337 m: the largest size (to the mm) whose far edge, R0 + SLEEVE from the axle, stays under 0.410 m through the
// turn (the sleeves only turn about the axle, so that radius is the same at every angle)
// The housing is now 1.15x about the drum axis (Rolodex.tsx HOUSING) with the camera 1.15x as far, so a sleeve kept
// at 0.337 came out 1/1.15 the size on screen. It is 0.39 m, the largest (to the cm) that keeps 6 mm off every part
// through a full turn: 8.4 mm under the housing's frame over the drum, which is the limit (it loses about a mm per mm
// of sleeve), 6.9 mm off the inner drum at the slotted bottom edge (frameClearance in Rolodex.tsx). On screen that
// is 1.16x the 0.337 sleeve, about the size before the housing was scaled.
export const SLEEVE = 0.39, SLEEVE_T = 0.0025, CORNER = 0.004;
// the rail slots, where the card had them: 12 mm wide, 30 mm deep, round-ended, centred at x = +-0.075 (+-slotX on a
// scaled drum)
export const SLOT_X = 0.075;

// (width: across, along the axle; slotShift: where the slots sit from the sleeve's middle, so a sleeve set off-centre
// on the drum still has its slots on the rails; slotX: the rails' distance from the drum's middle)
export function sleeveShape(size = SLEEVE, slots = true, width = size, slotShift = 0, slotX = SLOT_X) {
  const s = new THREE.Shape(), r = CORNER, x0 = -width / 2, x1 = width / 2, y0 = 0, y1 = size;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  if (slots) for (const cx of [-slotX + slotShift, slotX + slotShift]) {
    const h = new THREE.Path(), w = 0.012, hh = 0.03, cy = 0.006;
    h.moveTo(cx - w / 2, cy); h.lineTo(cx + w / 2, cy); h.lineTo(cx + w / 2, cy + hh - w / 2); h.absarc(cx, cy + hh - w / 2, w / 2, 0, Math.PI, false); h.lineTo(cx - w / 2, cy);
    s.holes.push(h);
  }
  return s;
}

// the sleeve body, its back face at z = -t and its front at z = 0, with the three groups above. UVs on the faces
// span the size x size square (the back's mirrored in u); on the edge they run round the outline in metres, for the
// paper.
export function sleeveGeometry(size = SLEEVE, t = SLEEVE_T, slots = true, width = size, slotShift = 0, slotX = SLOT_X) {
  const g = new THREE.ExtrudeGeometry(sleeveShape(size, slots, width, slotShift, slotX), { depth: t, bevelEnabled: false, curveSegments: 8 });
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
// a cover file as a texture, decoded off the main thread: fetch, then createImageBitmap. Only colorSpaceConversion is
// asked of it (as three's ImageBitmapLoader did, so the colours are unchanged): asking it to flip the image or not to
// premultiply as well makes Chrome redo the decoded bitmap on the main thread (a 333 ms frame for six 2048 covers on
// a 4x throttled phone; none without). So the bitmap stays top row first, and coverTexture puts it the right way up
// with the texture's transform (an ImageBitmap ignores flipY). AVIF, or the JPEG beside it where the browser cannot
// decode AVIF.
export const coverTexture = (image: unknown) => {
  const t = new THREE.Texture(image as HTMLImageElement);
  t.flipY = false; t.repeat.set(1, -1); t.offset.set(0, 1);
  return t;
};
const loadBitmap = (url: string) =>
  fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.blob(); }).then((b) => createImageBitmap(b, { colorSpaceConversion: "none" })).then(coverTexture);
export const loadTex = (url: string) => loadBitmap(url).catch(() => loadBitmap(url.replace(/\.avif$/, ".jpg")));
// A big cover goes up to the GPU a strip at a time: a 2048 upload with its mips is one long frame on a slow phone.
// stripUpload returns the steps, one a frame: storage for the whole mip chain, then STRIP_ROWS rows of the bitmap a
// step (WebGL 2 takes a sub-rectangle of an ImageBitmap through UNPACK_SKIP_ROWS), then the mips and the sampling
// state. After the last the renderer holds it as its own (its WebGL texture put in the renderer's record of the
// texture, at the texture's version), so a material takes it with no upload; disposing it deletes the WebGL texture.
// Without WebGL 2 it is one step, the plain upload.
export const STRIP_ROWS = 128;
export function stripUpload(gl: THREE.WebGLRenderer, t: THREE.Texture): (() => void)[] {
  const c = gl.getContext(), img = t.image as ImageBitmap;
  if (!(c instanceof WebGL2RenderingContext) || !img?.width) return [() => gl.initTexture(t)];
  const w = img.width, h = img.height, levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
  let tex: WebGLTexture | null = null;
  const bind = () => { gl.state.activeTexture(c.TEXTURE0); gl.state.bindTexture(c.TEXTURE_2D, tex); };
  const steps = [() => {
    tex = c.createTexture();
    t.addEventListener("dispose", () => { if (tex) c.deleteTexture(tex); tex = null; });
    bind();
    c.texStorage2D(c.TEXTURE_2D, levels, t.colorSpace === THREE.SRGBColorSpace ? c.SRGB8_ALPHA8 : c.RGBA8, w, h);
  }];
  for (let y = 0; y < h; y += STRIP_ROWS) {
    const y0 = y, rows = Math.min(STRIP_ROWS, h - y);
    steps.push(() => {
      if (!tex) return;
      bind();
      c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL, false); c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); c.pixelStorei(c.UNPACK_ALIGNMENT, 4);
      c.pixelStorei(c.UNPACK_SKIP_ROWS, y0);
      c.texSubImage2D(c.TEXTURE_2D, 0, 0, y0, w, rows, c.RGBA, c.UNSIGNED_BYTE, img);
      c.pixelStorei(c.UNPACK_SKIP_ROWS, 0);
    });
  }
  steps.push(() => {
    if (!tex) return;
    bind();
    c.generateMipmap(c.TEXTURE_2D);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR_MIPMAP_LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
    const ani = c.getExtension("EXT_texture_filter_anisotropic");
    if (ani) c.texParameterf(c.TEXTURE_2D, ani.TEXTURE_MAX_ANISOTROPY_EXT, gl.capabilities.getMaxAnisotropy());
    const p = gl.properties.get(t) as { __webglTexture?: WebGLTexture; __webglInit?: boolean; __version?: number };
    p.__webglTexture = tex; p.__webglInit = true; p.__version = t.version;
  });
  return steps;
}

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
