"use client";
/* eslint-disable react-hooks/immutability -- three.js objects and the shared rig are mutated every frame by design */
// Canvas, lights, floor and camera from BUILD.md's scene: white seamless, RoomEnvironment at 0.85,
// a warm key light with a 2048 shadow, a hemisphere fill, a shadow-only floor and a contact decal.
import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig } from "./rig";
import Rolodex from "./Rolodex";
import Strip from "./Strip";

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    scene.background = new THREE.Color("#ffffff");
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Floor() {
  const blob = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <shadowMaterial opacity={0.13} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial map={blob} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function Lights() {
  const key = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff6ea", 1.9);
    l.position.set(-1.0, 2.6, 1.4);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 6 });
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.01;
    return l;
  }, []);
  return (
    <>
      <primitive object={key} />
      <hemisphereLight args={["#ffffff", "#e9e6e0", 0.6]} />
    </>
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

export default function Scene({ releases, mono }: { releases: Release[]; mono: string }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.01, far: 50, position: [0.7, 1.2, 2.2] }}
      gl={{ antialias: true }}
    >
      <Environment />
      <Lights />
      <Floor />

      <CameraRig />
      <Suspense fallback={null}>
        <Rolodex releases={releases} mono={mono} />
        <Strip releases={releases} font={mono} />
      </Suspense>
    </Canvas>
  );
}
