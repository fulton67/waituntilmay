// The open record, built in code: a gatefold sleeve opened to OPEN_DEG with the record slid out of its right
// pocket. One model for every release; only three textures change: the front cover (left panel, both faces), the
// back cover (the sleeve's back) and the label (the front cover, cut to the label circle). Inside, the right
// pocket's front wall carries the credits.
// Local frame, closed: exactly the Rolodex sleeve's (sleeve.ts): the front cover faces +z at z = 0, x across, y up
// from the bottom edge at 0. So the closed model can stand in for the sleeve on the ring, face for face.
import * as THREE from "three";
import { SLEEVE, sleeveGeometry } from "./sleeve";

export const OPEN_DEG = 150;
export const DISC_R = 0.15, DISC_T = 0.002, LABEL_R = 0.05;
// the record slides out of the pocket until its label clears the pocket's edge
export const SLIDE = SLEEVE / 2 + LABEL_R + 0.006;
export const RPM = 100 / 3;
const PANEL_T = 0.0011;

// The groove normal map, generated: height h(r) is fine concentric rings (about 3.5 px a groove at 2048 px), a
// flat land at the rim, a wider run-out groove spiralling to the label, and the flat land under the label; the
// music has a flatter band between tracks every so often. Normals are the radial derivative of h, so the light runs
// round the disc in the familiar arcs. Built in a worker (2048 x 2048 is 4M texels), handed back as RGBA bytes.
const GROOVE_SRC = `onmessage = (ev) => {
  const { size, rIn, runOut, rOut } = ev.data, data = new Uint8Array(size * size * 4), c = size / 2;
  const h = (r) => {
    if (r < rIn || r > rOut) return 0;
    if (r < runOut) return 0.6 * Math.sin((r - rIn) * Math.PI * 2 * 18);
    const band = Math.sin(r * Math.PI * 2 * 9) > 0.96 ? 0.25 : 1;
    return band * Math.sin(r * size * 0.9);
  };
  const e = 1 / c;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5 - c) / c, dy = (y + 0.5 - c) / c, r = Math.hypot(dx, dy), k = (y * size + x) * 4;
    const s = r > 0 ? ((h(r + e) - h(r - e)) / 2) * 0.35 : 0, nx = -s * (dx / (r || 1)), ny = -s * (dy / (r || 1)), l = Math.hypot(nx, ny, 1);
    data[k] = (nx / l * 0.5 + 0.5) * 255; data[k + 1] = (ny / l * 0.5 + 0.5) * 255; data[k + 2] = (1 / l * 0.5 + 0.5) * 255; data[k + 3] = 255;
  }
  postMessage(data, [data.buffer]);
};`;
export function grooveNormals(size = 2048): Promise<THREE.DataTexture> {
  const rIn = LABEL_R / DISC_R + 0.015;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([GROOVE_SRC], { type: "text/javascript" })), w = new Worker(url);
    w.onmessage = (ev: MessageEvent<Uint8Array<ArrayBuffer>>) => {
      w.terminate(); URL.revokeObjectURL(url);
      const t = new THREE.DataTexture(ev.data, size, size);
      t.colorSpace = THREE.NoColorSpace;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      resolve(t);
    };
    w.postMessage({ size, rIn, runOut: rIn + 0.05, rOut: 0.985 });
  });
}

export type RecordModel = {
  root: THREE.Group; // place and turn this
  left: THREE.Group; // the left panel's hinge (rotation.y opens it)
  disc: THREE.Group; // slides (position.x) and spins (rotation.z)
  labelPivot: THREE.Group; // the label and its type, spinning with the disc
  credits: THREE.Group; // on the credits panel's face: x across, y up from its bottom edge (0..SLEEVE)
  front: THREE.MeshStandardMaterial;
  back: THREE.MeshStandardMaterial;
  label: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  set: (g: number, s: number) => void; // gatefold 0..1, record travel 0..1
};

export function buildRecord(blank: THREE.Texture, grain: THREE.Texture, grooves: THREE.Texture): RecordModel {
  const card = (map: THREE.Texture | null) => new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0, normalMap: grain, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 0.6 });
  const front = card(blank), back = card(blank), paper = card(null);
  paper.color.set("#d6ccba");
  const panel = sleeveGeometry(SLEEVE, PANEL_T);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  // the left panel turns on the spine, the sleeve's left edge: its group sits on the spine, the panel hangs right of it
  const left = new THREE.Group();
  left.position.set(-SLEEVE / 2, 0, 0);
  const lp = new THREE.Mesh(panel, [front, front, paper]);
  lp.position.set(SLEEVE / 2, 0, 0);
  left.add(lp);
  // the right pocket: a front wall, whose inside face is the credits panel (paper, type added in VinylView), and a
  // rear wall whose outside is the back cover, the back of the sleeve; the record between them
  const wall = new THREE.Mesh(panel, [paper, paper, paper]);
  const credits = new THREE.Group();
  credits.position.z = 0.0003;
  wall.add(credits);
  wall.position.z = -PANEL_T - 0.0002;
  const rear = new THREE.Mesh(panel, [paper, back, paper]);
  rear.position.z = -PANEL_T * 2 - DISC_T - 0.0008;
  // the record: black vinyl, a clear coat over the grooves, 2 mm thick, on the sleeve's centre
  const vinyl = new THREE.MeshPhysicalMaterial({ color: "#0b0b0c", roughness: 0.25, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12, normalMap: grooves, normalScale: new THREE.Vector2(1, 1), envMapIntensity: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.4 });
  const dg = new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_T, 128, 1);
  dg.rotateX(Math.PI / 2); // axis along z, cylinder caps face +z and -z with UVs spanning the disc
  const disc = new THREE.Group();
  disc.position.set(0, SLEEVE / 2, -PANEL_T - 0.0004 - DISC_T / 2);
  const dm = new THREE.Mesh(dg, [rim, vinyl, vinyl]);
  const label = new THREE.MeshStandardMaterial({ map: blank, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
  const labelPivot = new THREE.Group();
  const lg = new THREE.CircleGeometry(LABEL_R, 96);
  const lf = new THREE.Mesh(lg, label);
  lf.position.z = DISC_T / 2 + 0.00015;
  const lb = new THREE.Mesh(lg, label);
  lb.rotation.y = Math.PI; lb.position.z = -DISC_T / 2 - 0.00015;
  // the spindle hole, as a dark dot over the label
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0036, 32), new THREE.MeshBasicMaterial({ color: "#050505" }));
  hole.position.z = DISC_T / 2 + 0.0003;
  labelPivot.add(lf, lb, hole);
  disc.add(dm, labelPivot);
  body.add(left, wall, rear, disc);
  for (const m of [lp, wall, rear, dm, lf]) { m.castShadow = true; m.receiveShadow = true; }
  // g: the gatefold, 0 shut to 1 open at OPEN_DEG; s: the record's travel along the pocket, 0 fully in to 1 fully
  // out (SLIDE). The record is always there: in the pocket it is hidden by the pocket's walls, never switched off.
  const set = (g: number, s: number) => {
    left.rotation.y = -THREE.MathUtils.degToRad(OPEN_DEG) * g;
    disc.position.x = SLIDE * s;
  };
  set(0, 0);
  return { root, left, disc, labelPivot, credits, front, back, label, paper, set };
}

// the open model's extent in its own frame (x: left panel's far edge to the disc's far edge; y: 0 to SLEEVE)
export const OPEN_BOX = (() => {
  const a = THREE.MathUtils.degToRad(OPEN_DEG);
  return { x0: -SLEEVE / 2 + Math.cos(Math.PI - a) * -SLEEVE, x1: SLIDE + DISC_R, y0: 0, y1: SLEEVE, z1: Math.sin(Math.PI - a) * SLEEVE };
})();
