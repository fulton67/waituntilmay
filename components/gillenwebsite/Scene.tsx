"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// Canvas, lights and camera. The photo stage: the studio HDRI (drei's "studio" preset file, self-hosted) with a large soft rect light as a window
//          reflection, 60-frame accumulated soft shadows, a contact shadow under the base, N8AO and a shallow
//          depth of field held on the front card.
import { memo, Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AccumulativeShadows, ContactShadows, Environment, Lightformer, RandomizedLight } from "@react-three/drei";
import { EffectComposer, N8AO, DepthOfField, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig } from "./rig";
import Rolodex from "./Rolodex";
import { readLook, type PHOTO } from "./look";

function PhotoStage({ photo }: { photo: typeof PHOTO }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    // the composer renders with NoToneMapping and applies <ToneMapping> itself; the exposure uniform is the renderer's
    gl.toneMappingExposure = photo.exposure;
    // the composer tone-maps the whole frame, background included, and NEUTRAL maps 1.0 to about 0.93 (a grey page);
    // a background of 30 comes out at 254-255, the page white
    scene.background = new THREE.Color(30, 30, 30);
  }, [gl, scene, photo.exposure]);
  return (
    <>
      <Environment files="/hdri/studio_small_03_1k.hdr" environmentIntensity={1}>
        {/* the window: one large soft rect, up and to the left, that the brushed metal reflects */}
        <Lightformer form="rect" intensity={3} color="#fffaf2" scale={[4, 2.4, 1]} position={[-3, 2.6, 2.2]} target={[0, 0.5, 0]} />
      </Environment>
      <directionalLight color="#fff6ea" intensity={0.8} position={[-1.0, 2.6, 1.4]} />
    </>
  );
}

// shadows under the photo look, mounted with the model so they capture it. Memoised: drei's AccumulativeShadows
// re-accumulates all 60 frames in a layout effect on every render, so it must not re-render when a card changes.
const PhotoGround = memo(function PhotoGround() {
  return (
    <>
      <AccumulativeShadows frames={60} temporal={false} scale={2} position={[0, 0.0005, 0]} color="#3a3128" opacity={0.9} alphaTest={0.7} resolution={1024}>
        {/* high and nearly overhead, so the soft shadow stays under the Rolodex and the catcher's edge never shows */}
        <RandomizedLight amount={8} radius={0.9} ambient={0.5} intensity={1.6} position={[-0.6, 3.6, 0.9]} bias={0.0005} mapSize={1024} />
      </AccumulativeShadows>
      <ContactShadows position={[0, 0.001, 0]} scale={1.4} far={0.25} blur={2.2} opacity={0.55} resolution={512} frames={1} color="#2a241e" />
    </>
  );
});

// N8AO and a depth of field focused on the front card's face
function PhotoPost() {
  const focus = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const c = rig.cards[rig.front]?.children[0];
    if (c) c.getWorldPosition(focus);
  });
  return (
    <EffectComposer multisampling={4}>
      {/* AO at half resolution (full-res AO stalled now and then, worst 500 ms window 10 fps); the DoF at full
          resolution, because at half it stair-steps the blurred silhouettes of the knobs and base */}
      <N8AO halfRes aoRadius={0.06} distanceFalloff={0.25} intensity={1.2} quality="medium" />
      <DepthOfField target={focus} worldFocusRange={0.45} bokehScale={1.6} resolutionScale={1} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

// Orbit camera. It looks at the drum axis; a view offset then moves the drum to rig.view on the stage (the left
// column on desktop, the upper half on phones). Orbiting and raycasts are unchanged, because the offset is part
// of the projection.
function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => { rig.camera = camera as THREE.PerspectiveCamera; }, [camera]);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const aspect = size.width / size.height;
    // BUILD.md: 2.3, or 3.9 when aspect < 0.8; pulled back on desktop where the drum shares the stage with the cover
    const dist = aspect < 0.8 ? 3.9 : rig.wide ? 3.3 : 2.3;
    const kf = rig.reduce ? 1 : 1 - Math.exp(-10 * dt);
    rig.camAz += (rig.az - rig.camAz) * kf;
    rig.camEl += (rig.el - rig.camEl) * kf;
    target.set(0, rig.axisY - 0.035, 0);
    camera.position.set(
      target.x + Math.sin(rig.camAz) * Math.cos(rig.camEl) * dist,
      target.y + Math.sin(rig.camEl) * dist,
      target.z + Math.cos(rig.camAz) * Math.cos(rig.camEl) * dist
    );
    camera.lookAt(target);
    const cam = camera as THREE.PerspectiveCamera, W = size.width, H = size.height;
    const ox = W / 2 - rig.view.x, oy = H / 2 - rig.view.y;
    if (!cam.view || cam.view.offsetX !== ox || cam.view.offsetY !== oy || cam.view.fullWidth !== W || cam.view.fullHeight !== H) cam.setViewOffset(W, H, ox, oy, W, H);
  });
  return null;
}

// memoised so Site's re-render on every card change does not reach the canvas tree
export default memo(function Scene({ releases, mono }: { releases: Release[]; mono: string }) {
  const photo = useMemo(() => readLook(), []);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.01, far: 50, position: [0.7, 1.2, 2.2] }}
      gl={{ antialias: true }}
    >
      <PhotoStage photo={photo} />
      <CameraRig />
      <Suspense fallback={null}>
        <Rolodex releases={releases} mono={mono} photo={photo} />
        <PhotoGround />
      </Suspense>
      <PhotoPost />
    </Canvas>
  );
});
