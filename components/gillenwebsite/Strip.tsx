"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// SOURCES #17: the cover strip, after luckydaye.com's Gallery (00aac55989b5a00a.js:4109). Images are placed on a
// curved surface and turned to face along its normal (4109:80071, c.lookAt), so each one turns away as it leaves
// the middle. A drag past th=5 px spins it and anything less is a click, raycast onto the cover (4109:74152,
// 4109:81179–81564). Here each cover is the front face of a square prism on an arc. Its position is the
// Rolodex's own index (rig.s), so the two always agree: dragging the strip scrolls the page (Site.tsx), and
// scrolling moves the strip.
// SOURCES #18: titles sit beside each cover, after felixluke.com's CSS2D labels beside each sphere
// (06485f2817250046.js:94–104, 311–314). Here they are painted planes so they turn with the prism.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Hud, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig } from "./rig";
import { coverAt, no3, caps } from "./shared";
import { hue, wrap } from "./cardTexture";

const FOV = 30, D = 10;

// strip geometry in CSS pixels; the band sits along the bottom of the stage
export const stripPx = (wide: boolean) =>
  wide ? { band: 220, s: 128, pitch: 330, R: 980, label: 170 } : { band: 168, s: 92, pitch: 220, R: 560, label: 112 };

function label(r: Release, i: number, font: string) {
  const c = document.createElement("canvas"), W = 512, H = 256;
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.font = `400 34px ${font}`;
  x.fillText(no3(i + 1), 0, 40);
  x.font = `400 40px ${font}`;
  const lines = [...wrap(x, r.artist, W).slice(0, 2), ...wrap(x, r.release, W).slice(0, 2)];
  lines.forEach((l, k) => x.fillText(l, 0, 100 + k * 46));
  x.font = `400 30px ${font}`;
  x.fillText(String(r.year), 0, H - 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}

function placeholder(r: Release, font: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!, h = hue(r.artist + r.release);
  x.fillStyle = `hsl(${h} 12% 86%)`; x.fillRect(0, 0, 256, 256);
  x.fillStyle = `hsl(${h} 18% 34%)`; x.font = `400 22px ${font}`;
  wrap(x, caps(r.release), 220).slice(0, 5).forEach((l, k) => x.fillText(l, 18, 40 + k * 26));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Items({ releases, font }: { releases: Release[]; font: string }) {
  const { size, gl } = useThree();
  const N = releases.length;
  const wide = size.width >= 720;
  const P = stripPx(wide);
  // world units per CSS pixel on the z = 0 plane of the strip camera
  const k = (2 * D * Math.tan((FOV * Math.PI) / 360)) / size.height;

  const built = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // unlit, so the prism's sides are given fixed tones to read as a solid
    const side = (c: string) => new THREE.MeshBasicMaterial({ color: c });
    const sides = { right: side("#d9d4c8"), left: side("#cbc4b4"), top: side("#ece8de"), bottom: side("#bfb8a8"), back: side("#d2ccbe") };
    const labelGeo = new THREE.PlaneGeometry(1, 0.5);
    const items = releases.map((r, i) => {
      const front = new THREE.MeshBasicMaterial({ map: placeholder(r, font), toneMapped: false });
      const box = new THREE.Mesh(geo, [sides.right, sides.left, sides.top, sides.bottom, front, sides.back]);
      box.userData.i = i;
      const lab = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: label(r, i, font), transparent: true, toneMapped: false, depthWrite: false }));
      lab.userData.i = i;
      const g = new THREE.Group();
      g.add(box, lab);
      return { r, g, box, lab, front };
    });
    return { items, geo, labelGeo };
  }, [releases, font]);

  // covers: the 512 copies, anisotropy 16
  useEffect(() => {
    let live = true;
    const loader = new THREE.TextureLoader();
    built.items.forEach((it) => {
      const src = coverAt(it.r, 512);
      if (!src) return;
      loader.load(src, (t) => {
        if (!live) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
        it.front.map?.dispose();
        it.front.map = t;
        it.front.needsUpdate = true;
      });
    });
    return () => { live = false; };
  }, [built, gl]);

  useEffect(() => {
    rig.strip = { meshes: built.items.map((it) => it.box), labels: built.items.map((it) => it.lab), pos: 0, pitch: P.pitch };
    return () => { rig.strip = null; };
  }, [built, P.pitch]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    if (rig.strip) rig.strip.camera = state.camera as THREE.PerspectiveCamera; // the Hud's own camera, for raycasts in Site.tsx
    // the strip follows the Rolodex's own index; a short ease so a jump of several releases reads as a spin
    const goal = rig.s;
    rig.stripS = rig.reduce ? goal : rig.stripS + (goal - rig.stripS) * (1 - Math.exp(-14 * dt));
    if (rig.strip) rig.strip.pos = rig.stripS;
    const s = P.s * k, R = P.R * k, y = (-size.height / 2 + P.band / 2 + 6) * k;
    const active = Math.round(rig.stripS);
    for (let i = 0; i < N; i++) {
      const it = built.items[i];
      const th = ((i - rig.stripS) * P.pitch) / P.R;
      const vis = Math.abs(th) < Math.PI / 2;
      it.g.visible = vis;
      if (!vis) continue;
      // on the arc, facing along its normal: the face turns away as it leaves the middle
      it.g.position.set(Math.sin(th) * R, y, Math.cos(th) * R - R);
      it.g.rotation.set(0, th, 0);
      it.box.scale.set(s, s, s);
      it.lab.scale.set(P.label * k, P.label * k, 1);
      it.lab.position.set(s / 2 + 12 * k + (P.label * k) / 2, s / 2 - (P.label * k) / 4, s / 2 + 0.001);
      (it.lab.material as THREE.MeshBasicMaterial).opacity = i === active ? 1 : 0.4;
    }
  });

  return <>{built.items.map((it) => <primitive key={it.r.id} object={it.g} />)}</>;
}

export default function Strip({ releases, font }: { releases: Release[]; font: string }) {
  return (
    <Hud renderPriority={1}>
      <PerspectiveCamera makeDefault fov={FOV} position={[0, 0, D]} near={0.1} far={100} />
      <Items releases={releases} font={font} />
    </Hud>
  );
}
