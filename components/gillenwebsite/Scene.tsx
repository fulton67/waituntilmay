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
import Rolodex, { HOUSING } from "./Rolodex";

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

// The floor: a shadow-only plane 40 x 40 m centred under the Rolodex (the camera's far plane past its corners, so its
// edge is never in view), drawing nothing but the key light's shadow (a ShadowMaterial: alpha 0 wherever it is lit,
// no depth written); and the contact decal under the base, a radial blur whose alpha is 0 from 90% of its radius out,
// so its square's edge carries nothing either. The white around them is the scene's background.
export const FLOOR = 40;
function Floor() {
  const gl = useThree((st) => st.gl);
  const blob = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 115);
    g.addColorStop(0, "rgba(0,0,0,.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }, [gl]);
  return (
    <>
      <mesh name="floor" rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[FLOOR, FLOOR]} />
        <shadowMaterial opacity={0.13} transparent depthWrite={false} />
      </mesh>
      <mesh name="contact" rotation-x={-Math.PI / 2} position-y={0.001}>
        <planeGeometry args={[0.95 * HOUSING, 0.95 * HOUSING]} />
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

// Orbit camera. Looks at the drum axis; on wide screens the look point moves right so the Rolodex
// and the release display beside it share the frame.
function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => { rig.camera = camera as THREE.PerspectiveCamera; }, [camera]);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const aspect = size.width / size.height;
    // BUILD.md: 2.3, or 3.9 when aspect < 0.8; pulled back on wide screens so the detail panel fits beside the drum.
    // All of it x HOUSING (the housing's scale, Rolodex.tsx), the look point's offsets too, so the housing fills the
    // screen as it did before it was scaled.
    const dist = (aspect < 0.8 ? 3.9 : rig.wide ? (aspect < 1.3 ? 3.6 : 2.9) : 2.3) * HOUSING;
    const kf = rig.reduce ? 1 : 1 - Math.exp(-10 * dt);
    rig.camAz += (rig.az - rig.camAz) * kf;
    rig.camEl += (rig.el - rig.camEl) * kf;
    // (and on wide screens 0.06 m more, for the 0.38 m sleeves: the front one's right edge clear of the release
    // display beside the drum)
    const shift = rig.wide ? 0.4 * HOUSING + 0.06 : 0;
    target.set(Math.cos(rig.camAz) * shift, rig.axisY - 0.035 * HOUSING, -Math.sin(rig.camAz) * shift);
    camera.position.set(
      target.x + Math.sin(rig.camAz) * Math.cos(rig.camEl) * dist,
      target.y + Math.sin(rig.camEl) * dist,
      target.z + Math.cos(rig.camAz) * Math.cos(rig.camEl) * dist
    );
    camera.lookAt(target);
  });
  return null;
}

// the record view (VinylView.tsx) covers the stage once it is open: the stage stops drawing meanwhile, and its last
// frame stays on screen behind the veil
function PauseGate() {
  const setFrameloop = useThree((st) => st.setFrameloop);
  useEffect(() => {
    rig.setPaused = (p) => setFrameloop(p ? "never" : "always");
    return () => { rig.setPaused = undefined; };
  }, [setFrameloop]);
  return null;
}

export default function Scene({ releases }: { releases: Release[] }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 3]}
      camera={{ fov: 30, near: 0.1, far: 40, position: [0.7, 1.2, 2.2] }}
      gl={{ antialias: true }}
    >
      <Environment />
      <Lights />
      <Floor />

      <CameraRig />
      <PauseGate />
      <Suspense fallback={null}>
        <Rolodex releases={releases} />
      </Suspense>
    </Canvas>
  );
}
