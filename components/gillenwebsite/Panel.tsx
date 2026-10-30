"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// The 3D detail panel: the front card's cover, 0.5 m square, standing to the right of the Rolodex,
// turned slightly toward the camera, with its readout painted on a canvas beneath it.
// It follows the orbit so it never goes edge-on, and changes by a 300 ms counted (linear) crossfade (bible T2).
import { useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig } from "./rig";
import { paintPlaceholder, wrap, loadCover } from "./cardTexture";

const COVER = 0.5, INFO_H = 0.36, GAP = 0.025, FADE_MS = 300;
const PX = 1024, INFO_PX = Math.round((PX * INFO_H) / COVER);

type Layer = { cover: THREE.Mesh; info: THREE.Mesh; cctx: CanvasRenderingContext2D; ictx: CanvasRenderingContext2D; ctex: THREE.CanvasTexture; itex: THREE.CanvasTexture; shows: number };

// Readout under the cover. Bible type rules: one weight (R2), two faces (R11), capitals typed (R7),
// one display-size line (R10), small interface size for everything else (R9), black ink only.
function paintInfo(x: CanvasRenderingContext2D, r: Release, i: number, n: number, mono: string, display: string) {
  x.clearRect(0, 0, PX, INFO_PX);
  x.fillStyle = "#000";
  x.textBaseline = "alphabetic";
  let y = 34;
  x.font = `400 24px ${mono}`;
  x.fillText(`No. ${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, 0, y);
  x.textAlign = "right"; x.fillText(String(r.year), PX, y); x.textAlign = "left";
  y += 14; x.fillRect(0, y, PX, 2);
  x.font = `400 72px ${display}`;
  const al = wrap(x, r.artist.toUpperCase(), PX).slice(0, 2);
  al.forEach((l, j) => x.fillText(l, 0, y + 74 + j * 74));
  y += 74 * al.length + 40;
  x.font = `italic 400 30px ${mono}`;
  wrap(x, r.release, PX).slice(0, 2).forEach((l, j) => { x.fillText(l, 0, y + j * 34); if (j) y += 34; });
  y += 38;
  x.font = `400 24px ${mono}`;
  x.fillText(r.role.toUpperCase(), 0, y);
  y += 22; x.fillRect(0, y, PX, 1);
  y += 34;
  const lines = r.tracks.length ? r.tracks : [{ title: `${r.release} (full release)`, role: r.role }];
  const room = Math.max(1, Math.floor((INFO_PX - y + 30) / 30));
  const show = lines.length > room ? lines.slice(0, room - 1) : lines;
  x.font = `400 22px ${mono}`;
  show.forEach((t, j) => {
    x.fillText(`${String(j + 1).padStart(2, "0")}  ${t.title}`, 0, y + j * 30);
    // a track's role only where it differs from the release's
    if (t.role !== r.role) { x.textAlign = "right"; x.fillText(t.role.toUpperCase(), PX, y + j * 30); x.textAlign = "left"; }
  });
  if (lines.length > show.length) x.fillText(`+ ${lines.length - show.length} MORE`, 0, y + show.length * 30);
}

export default function Panel({ releases, mono, display }: { releases: Release[]; mono: string; display: string }) {
  const { group, layers } = useMemo(() => {
    const group = new THREE.Group();
    const mk = (): Layer => {
      const cc = document.createElement("canvas"); cc.width = cc.height = PX;
      const ic = document.createElement("canvas"); ic.width = PX; ic.height = INFO_PX;
      const ctex = new THREE.CanvasTexture(cc), itex = new THREE.CanvasTexture(ic);
      for (const t of [ctex, itex]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
      const mat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(COVER, COVER), mat(ctex));
      cover.position.y = INFO_H + GAP + COVER / 2;
      const info = new THREE.Mesh(new THREE.PlaneGeometry(COVER, INFO_H), mat(itex));
      info.position.y = INFO_H / 2;
      group.add(cover, info);
      return { cover, info, cctx: cc.getContext("2d")!, ictx: ic.getContext("2d")!, ctex, itex, shows: -1 };
    };
    return { group, layers: [mk(), mk()] };
  }, []);

  const state = useMemo(() => ({ incoming: 0, start: -1e9, want: -1 }), []);

  useEffect(() => {
    let live = true;
    const show = async (i: number) => {
      state.want = i;
      await Promise.all([`400 24px ${mono}`, `italic 400 30px ${mono}`, `400 72px ${display}`].map((f) => document.fonts.load(f).catch(() => null)));
      const r = releases[i];
      const img = await loadCover(r.cover);
      if (!live || state.want !== i) return; // a newer card took over while the cover loaded
      const cur = layers[state.incoming];
      if (cur.shows === i) return;
      const next = cur.shows === -1 ? state.incoming : 1 - state.incoming;
      const L = layers[next];
      if (img) L.cctx.drawImage(img, 0, 0, PX, PX);
      else paintPlaceholder(L.cctx, r, 0, 0, PX, mono);
      paintInfo(L.ictx, r, i, releases.length, mono, display);
      L.ctex.needsUpdate = L.itex.needsUpdate = true;
      L.shows = i;
      state.incoming = next;
      state.start = performance.now();
    };
    rig.onFront.add(show);
    show(rig.front);
    return () => { live = false; rig.onFront.delete(show); };
  }, [layers, releases, mono, display, state]);

  useFrame(() => {
    // crossfade: counted in linear time, no easing
    const t = rig.reduce ? 1 : Math.min(1, (performance.now() - state.start) / FADE_MS);
    layers.forEach((L, k) => {
      const o = k === state.incoming ? t : L.shows === -1 ? 0 : 1 - t;
      (L.cover.material as THREE.MeshBasicMaterial).opacity = o;
      (L.info.material as THREE.MeshBasicMaterial).opacity = o;
      L.cover.visible = L.info.visible = o > 0.001;
    });
    // stand to the camera's right of the drum and face the camera, turned 0.12 rad toward the Rolodex
    const az = rig.camAz;
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    group.position.set(0, 0.16, 0).addScaledVector(right, 0.8);
    group.rotation.set(0, az - 0.12, 0);
  });

  return <primitive object={group} />;
}
