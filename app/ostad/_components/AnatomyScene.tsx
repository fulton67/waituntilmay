"use client";
// The /ostad/anatomy canvas: face.glb or skin_crosssection.glb, layer toggles, a cutaway plane, five procedure
// presets that animate, and a transparent/black/white background so a frame can be exported as a PNG with alpha.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";

export type ModelKey = "face" | "skin";
export type Bg = "transparent" | "black" | "white";
export type LayerDef = { id: string; label: string; color: string; default_visible: boolean; nodes: string[]; approximated?: boolean };
export type ModelDef = { url: string; node_count: number; layers: LayerDef[]; depths_mm?: Record<string, number> };
export type PresetKey = "botox" | "filler" | "morpheus8" | "fraxel" | "mohs";
export type Phase = { at: number; text: string };

export type SceneProps = {
  model: ModelKey;
  def: ModelDef;
  visible: Record<string, boolean>;
  opacity: Record<string, number>;
  cut: number;
  bg: Bg;
  preset: PresetKey | null;
  cycle: number;
  /** null = playing; a number in [0,1] freezes every preset at that point of its cycle */
  freeze: number | null;
  onReady: (found: number, expected: number) => void;
  onPhase: (text: string) => void;
  exportRef: React.MutableRefObject<(() => Promise<Blob | null>) | null>;
};

const OUTER: Record<ModelKey, string[]> = {
  face: ["epidermis", "dermis", "fat_superficial", "smas"],
  skin: [], // empty = the cut applies to every layer of the block
};

type Mats = { mat: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color };

function useModel(def: ModelDef) {
  const { scene } = useGLTF(def.url);
  return useMemo(() => {
    const byName = new Map<string, THREE.Object3D>();
    scene.traverse((o) => o.name && byName.set(o.name, o));
    // one material per mesh so layers can fade, clip and glow on their own
    const mats = new Map<THREE.Object3D, Mats[]>();
    for (const l of def.layers)
      for (const n of l.nodes) {
        const o = byName.get(n);
        if (!o) continue;
        const list: Mats[] = [];
        o.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh) return;
          const src = mesh.material as THREE.MeshStandardMaterial;
          const mat = (mesh.userData.ostadMat as THREE.MeshStandardMaterial) ?? src.clone();
          mesh.userData.ostadMat = mat;
          mesh.material = mat;
          list.push({ mat, color: mat.color.clone(), emissive: mat.emissive.clone() });
        });
        mats.set(o, list);
      }
    const box = new THREE.Box3().setFromObject(scene);
    return { scene, byName, mats, box };
  }, [scene, def]);
}

function nodeBox(byName: Map<string, THREE.Object3D>, names: string[]) {
  const b = new THREE.Box3();
  for (const n of names) {
    const o = byName.get(n);
    if (o) b.union(new THREE.Box3().setFromObject(o));
  }
  return b;
}

function Model(p: SceneProps) {
  const m = useModel(p.def);
  useEffect(() => { FREEZE.v = p.freeze; }, [p.freeze]);
  const get = useThree((s) => s.get);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  useEffect(() => {
    const want = p.def.layers.flatMap((l) => l.nodes);
    p.onReady(want.filter((n) => m.byName.has(n)).length, p.def.node_count);
  }, [m, p]);

  // visibility, opacity, clipping
  useEffect(() => {
    const outer = OUTER[p.model];
    if (p.model === "face") {
      const x0 = m.box.min.x - 0.001, x1 = (m.box.min.x + m.box.max.x) / 2;
      plane.setComponents(1, 0, 0, -(x0 + (x1 - x0) * p.cut));
    } else {
      const z0 = m.box.max.z + 0.0005, z1 = (m.box.min.z + m.box.max.z) / 2;
      plane.setComponents(0, 0, -1, z0 + (z1 - z0) * p.cut);
    }
    for (const l of p.def.layers) {
      const vis = p.visible[l.id] !== false;
      const op = p.opacity[l.id] ?? 1;
      const clip = p.cut > 0 && (outer.length === 0 || outer.includes(l.id));
      for (const n of l.nodes) {
        const o = m.byName.get(n);
        if (!o) continue;
        o.visible = vis;
        for (const { mat } of m.mats.get(o) ?? []) {
          mat.transparent = op < 1;
          mat.opacity = op;
          mat.depthWrite = op >= 1;
          mat.clippingPlanes = clip ? [plane] : null;
          mat.side = clip ? THREE.DoubleSide : THREE.FrontSide;
          mat.needsUpdate = true;
        }
      }
    }
  }, [m, p.def, p.visible, p.opacity, p.cut, p.model, plane]);

  // background: null keeps the clear alpha at 0, so the exported PNG is transparent
  useEffect(() => {
    const { scene, gl } = get();
    scene.background = p.bg === "transparent" ? null : new THREE.Color(p.bg === "black" ? "#000000" : "#ffffff");
    gl.setClearColor(0x000000, 0);
  }, [p.bg, get]);

  return (
    <>
      <primitive object={m.scene} />
      {p.preset === "botox" && p.model === "face" && <Botox m={m} cycle={p.cycle} onPhase={p.onPhase} />}
      {p.preset === "filler" && p.model === "face" && <Filler m={m} cycle={p.cycle} onPhase={p.onPhase} />}
      <Clipped plane={p.cut > 0 ? plane : null} k={`${p.preset}-${p.cut}`}>
        {p.preset === "morpheus8" && p.model === "skin" && <Morpheus m={m} cycle={p.cycle} onPhase={p.onPhase} depths={p.def.depths_mm!} />}
        {p.preset === "fraxel" && p.model === "skin" && <Fraxel m={m} cycle={p.cycle} onPhase={p.onPhase} depths={p.def.depths_mm!} />}
        {p.preset === "mohs" && p.model === "skin" && <Mohs m={m} cycle={p.cycle} onPhase={p.onPhase} depths={p.def.depths_mm!} />}
      </Clipped>
    </>
  );
}

/** gives every material under it the cutaway plane, so effects inside the block are cut with it */
function Clipped({ plane, k, children }: { plane: THREE.Plane | null; k: string; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useEffect(() => {
    g.current?.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat) { mat.clippingPlanes = plane ? [plane] : null; mat.needsUpdate = true; }
    });
  }, [plane, k]);
  return <group ref={g}>{children}</group>;
}

const FREEZE: { v: number | null } = { v: null };

type FxProps = { m: ReturnType<typeof useModel>; cycle: number; onPhase: (t: string) => void };

/** runs a looping timeline: returns local time in [0, cycle) and reports the phase text when it changes */
function useTimeline(cycle: number, phases: Phase[], onPhase: (t: string) => void) {
  const last = useRef("");
  const t0 = useRef<number | null>(null);
  return () => {
    const now = performance.now() / 1000;
    if (t0.current === null) t0.current = now;
    if (FREEZE.v !== null) t0.current = now - FREEZE.v * cycle; // resume from the scrubbed point
    const t = FREEZE.v !== null ? Math.min(FREEZE.v, 0.9999) * cycle : (now - t0.current) % cycle;
    const ph = [...phases].reverse().find((x) => t >= x.at)?.text ?? "";
    if (ph !== last.current) { last.current = ph; onPhase(ph); }
    return t;
  };
}

const ease = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

function tint(m: FxProps["m"], names: string[], color: THREE.Color | null, amount: number) {
  for (const n of names) {
    const o = m.byName.get(n);
    for (const it of (o && m.mats.get(o)) || []) {
      if (color) { it.mat.emissive.copy(it.emissive).lerp(color, amount); it.mat.color.copy(it.color).lerp(color, amount * 0.5); }
      else { it.mat.emissive.copy(it.emissive); it.mat.color.copy(it.color); }
    }
  }
}

// ---------- Botox glabella: injection map, contraction, signal-cut, relax ----------
function Botox({ m, cycle, onPhase }: FxProps) {
  const muscles = useMemo(() => ["corrugator_supercilii_l", "corrugator_supercilii_r", "procerus_muscle_l", "procerus_muscle_r"], []);
  const pts = useMemo(() => {
    // 5 points: procerus centre + medial/lateral corrugator on each side, projected onto the skin from the front
    const skin = m.byName.get("skin_epidermis");
    const ray = new THREE.Raycaster();
    const out: THREE.Vector3[] = [];
    const targets: THREE.Vector3[] = [];
    const pr = nodeBox(m.byName, ["procerus_muscle_l", "procerus_muscle_r"]).getCenter(new THREE.Vector3());
    targets.push(pr);
    for (const s of ["l", "r"]) {
      const b = nodeBox(m.byName, [`corrugator_supercilii_${s}`]);
      const c = b.getCenter(new THREE.Vector3());
      const half = (b.max.x - b.min.x) * 0.3;
      const sign = c.x > pr.x ? 1 : -1;
      targets.push(new THREE.Vector3(c.x - sign * half, c.y, c.z), new THREE.Vector3(c.x + sign * half, c.y + 0.004, c.z));
    }
    for (const t of targets) {
      ray.set(new THREE.Vector3(t.x, t.y, m.box.max.z + 0.1), new THREE.Vector3(0, 0, -1));
      const hit = skin ? ray.intersectObject(skin, true)[0] : undefined;
      out.push(hit ? hit.point.clone().add(new THREE.Vector3(0, 0, 0.0008)) : new THREE.Vector3(t.x, t.y, m.box.max.z));
    }
    return out;
  }, [m]);
  const dots = useRef<THREE.Mesh[]>([]);
  const rings = useRef<THREE.Mesh[]>([]);
  const red = useMemo(() => new THREE.Color("#ff2a1a"), []);
  const grey = useMemo(() => new THREE.Color("#8a8a8a"), []);
  const tl = useTimeline(cycle, [
    { at: 0, text: "Injection map: 5 points (procerus + corrugators)" },
    { at: 2.6, text: "Corrugators and procerus contract → the 11 lines" },
    { at: 4.6, text: "Signal cut at the nerve ending" },
    { at: 6.4, text: "Muscles relax: lines soften for ~3–4 months" },
  ], onPhase);
  useEffect(() => () => tint(m, muscles, null, 0), [m, muscles]);
  useFrame(() => {
    const t = tl();
    dots.current.forEach((d, i) => { if (d) d.scale.setScalar(ease((t - 0.4 - i * 0.4) / 0.25)); });
    if (t < 2.6) tint(m, muscles, red, 0.15);
    else if (t < 4.6) tint(m, muscles, red, 0.45 + 0.4 * Math.abs(Math.sin((t - 2.6) * Math.PI * 1.5)));
    else if (t < 6.4) tint(m, muscles, red, 0.85 * (1 - ease((t - 4.6) / 1.8)));
    else tint(m, muscles, grey, 0.55);
    rings.current.forEach((r, i) => {
      if (!r) return;
      const k = (t - 4.6 - i * 0.12) / 0.9;
      r.visible = k > 0 && k < 1;
      r.scale.setScalar(1 + 5 * Math.max(0, k));
      (r.material as THREE.MeshBasicMaterial).opacity = 1 - Math.max(0, k);
    });
  });
  return (
    <group>
      {pts.map((p, i) => (
        <group key={i} position={p}>
          <mesh ref={(e) => { if (e) dots.current[i] = e; }}>
            <sphereGeometry args={[0.0022, 16, 12]} />
            <meshBasicMaterial color="#3b00ff" />
          </mesh>
          <mesh ref={(e) => { if (e) rings.current[i] = e; }}>
            <ringGeometry args={[0.0022, 0.0028, 32]} />
            <meshBasicMaterial color="#ffffff" transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Filler cheek: cannula to the deep medial cheek fat, gel bolus fills, compartment swells ----------
function Filler({ m, cycle, onPhase }: FxProps) {
  const side = useMemo(() => {
    // the cut removes the half with lower x, so treat the compartment on that side
    const cl = nodeBox(m.byName, ["fat_deep_medial_cheek_l"]).getCenter(new THREE.Vector3());
    const cr = nodeBox(m.byName, ["fat_deep_medial_cheek_r"]).getCenter(new THREE.Vector3());
    return cl.x < cr.x ? "l" : "r";
  }, [m]);
  const comps = useMemo(() => [`fat_deep_medial_cheek_${side}`], [side]);
  const centre = useMemo(() => nodeBox(m.byName, [comps[0]]).getCenter(new THREE.Vector3()), [m, comps]);
  const entry = useMemo(() => centre.clone().add(new THREE.Vector3(-0.02, -0.03, 0.03)), [centre]);
  const gel = useRef<THREE.Mesh>(null);
  const tube = useRef<THREE.Group>(null);
  const blue = useMemo(() => new THREE.Color("#4fa3ff"), []);
  const dir = useMemo(() => centre.clone().sub(entry), [centre, entry]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);
  const tl = useTimeline(cycle, [
    { at: 0, text: "Midface: deep medial cheek fat + SOOF" },
    { at: 1.5, text: "Cannula to the deep fat compartment" },
    { at: 3.2, text: "HA gel fills the compartment" },
    { at: 6.2, text: "Midface lifted" },
  ], onPhase);
  useEffect(() => () => tint(m, comps, null, 0), [m, comps]);
  useFrame(() => {
    const t = tl();
    const pulse = t < 1.5 ? 0.3 + 0.3 * Math.sin(t * 6) : 0.5;
    tint(m, comps, blue, (t < 3.2 ? pulse : 0.5) * 0.6);
    const ins = ease((t - 1.5) / 1.5) * (1 - ease((t - 6.2) / 0.8));
    if (tube.current) {
      tube.current.visible = ins > 0.01;
      tube.current.position.copy(entry).addScaledVector(dir, ins - 1);
    }
    const fill = ease((t - 3.2) / 2.5) * (1 - ease((t - 7.4) / 0.6));
    if (gel.current) gel.current.scale.setScalar(Math.max(0.001, fill));
  });
  const len = dir.length();
  return (
    <group>
      <group ref={tube} quaternion={quat}>
        <mesh position={[0, len / 2, 0]}>
          <cylinderGeometry args={[0.0007, 0.0007, len, 10]} />
          <meshStandardMaterial color="#d8d8d8" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.04, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      </group>
      <mesh ref={gel} position={centre} renderOrder={10}>
        <sphereGeometry args={[0.009, 32, 24]} />
        <meshStandardMaterial color="#7fc0ff" emissive="#1f6fd1" emissiveIntensity={0.5} transparent opacity={0.6} roughness={0.1} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

type SkinFx = FxProps & { depths: Record<string, number> };
const MM = 0.001;

// ---------- Morpheus8: needle array to depth, RF glow at the tips ----------
function Morpheus({ cycle, onPhase, depths }: SkinFx) {
  const grid = useMemo(() => { const g: [number, number][] = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) g.push([(i - 2) * 0.0022, (j - 2) * 0.0022]); return g; }, []);
  const passes = useMemo(() => [depths.papillary_dermis * 0.9, depths.reticular_dermis * 0.85, (depths.reticular_dermis + depths.hypodermis) / 2], [depths]);
  const head = useRef<THREE.Group>(null);
  const glows = useRef<THREE.Mesh[]>([]);
  const lenN = 0.008;
  const tl = useTimeline(cycle, [
    { at: 0, text: "Pass 1: needles to the papillary dermis" },
    { at: cycle / 3, text: "Pass 2: reticular dermis" },
    { at: (2 * cycle) / 3, text: "Pass 3: into the fat (fibroseptal network)" },
  ], onPhase);
  useFrame(() => {
    const t = tl();
    const per = cycle / 3, k = Math.floor(t / per), u = (t % per) / per;
    const d = passes[k] * MM;
    const down = ease(u / 0.25) * (1 - ease((u - 0.75) / 0.2));
    const tipY = 0.003 - (0.003 + d) * down;
    if (head.current) head.current.position.y = tipY;
    const g = u > 0.25 && u < 0.75 ? Math.sin(((u - 0.25) / 0.5) * Math.PI) : 0;
    glows.current.forEach((m) => { if (!m) return; m.visible = g > 0.02; m.scale.setScalar(0.4 + g * (1 + 0.15 * Math.sin(t * 30))); });
  });
  return (
    <group ref={head}>
      <mesh position={[0, lenN + 0.001, 0]}>
        <boxGeometry args={[0.012, 0.002, 0.012]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.85} />
      </mesh>
      {grid.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, lenN / 2, 0]}>
            <cylinderGeometry args={[0.00012, 0.00004, lenN, 6]} />
            <meshStandardMaterial color="#e2b13c" metalness={1} roughness={0.2} />
          </mesh>
          <mesh ref={(e) => { if (e) glows.current[i] = e; }}>
            <sphereGeometry args={[0.0007, 16, 12]} />
            <meshBasicMaterial color="#ff7a1a" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Fraxel: fractional columns appear in scan order, then heal ----------
function Fraxel({ cycle, onPhase, depths }: SkinFx) {
  const N = 7;
  const depth = depths.papillary_dermis * 0.5 + depths.reticular_dermis * 0.5;
  const cols = useMemo(() => { const g: [number, number][] = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) g.push([(i - (N - 1) / 2) * 0.0024 + ((j % 2) * 0.0012), (j - (N - 1) / 2) * 0.0024]); return g; }, []);
  const refs = useRef<THREE.Mesh[]>([]);
  const hot = useMemo(() => new THREE.Color("#ffb21a"), []);
  // top of each column sits on the surface; scaling y grows it downward
  const geo = useMemo(() => new THREE.CylinderGeometry(0.00028, 0.00016, depth * MM, 12, 1, false).translate(0, (-depth * MM) / 2, 0), [depth]);
  const heal = useMemo(() => new THREE.Color("#ff8fa3"), []);
  const tl = useTimeline(cycle, [
    { at: 0, text: "Handpiece scans: microscopic columns of heat" },
    { at: cycle * 0.55, text: "Columns to the mid dermis; skin between stays intact" },
    { at: cycle * 0.75, text: "Columns heal from the untouched skin around them" },
  ], onPhase);
  useFrame(() => {
    const t = tl();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const row = Math.floor(i / N);
      const at = 0.2 + row * (cycle * 0.5 / N) + (i % N) * 0.04;
      const on = ease((t - at) / 0.15);
      const healK = ease((t - cycle * 0.75) / (cycle * 0.2));
      m.visible = on > 0.01;
      m.scale.set(1 - 0.6 * healK, on, 1 - 0.6 * healK);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.copy(hot).lerp(heal, healK);
      mat.opacity = 0.85 * (1 - 0.7 * healK);
    });
  });
  return (
    <group>
      {cols.map(([x, z], i) => (
        <group key={i} position={[x, 0.0001, z]}>
          <mesh ref={(e) => { if (e) refs.current[i] = e; }} geometry={geo}>
            <meshBasicMaterial color="#ffb21a" transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Mohs: tumour roots; stage 1 bowl lifts out and is mapped; stage 2 takes only the positive zone ----------
function Mohs({ cycle, onPhase, depths }: SkinFx) {
  const deep = depths.reticular_dermis * MM;
  const tumourA = useMemo(() => {
    const r: [number, number, number, number][] = [];
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, rr = rnd() * 0.0028; r.push([Math.cos(a) * rr, -0.0004 - rnd() * deep * 0.45, Math.sin(a) * rr, 0.0006 + rnd() * 0.0006]); }
    return r;
  }, [deep]);
  const tumourB = useMemo(() => { const r: [number, number, number, number][] = []; for (let i = 0; i < 7; i++) r.push([0.0034 + i * 0.0005, -0.0012 - i * 0.00045, 0.0004 * Math.sin(i), 0.0005]); return r; }, []);
  const bowl1 = useRef<THREE.Group>(null), bowl2 = useRef<THREE.Group>(null), restB = useRef<THREE.Group>(null);
  const quads = ["#2a78d6", "#1baf7a", "#eda100", "#e87ba4"];
  const flag = useRef<THREE.Mesh>(null);
  const tl = useTimeline(cycle, [
    { at: 0, text: "Tumour roots spread past the visible edge" },
    { at: cycle * 0.15, text: "Stage 1: a thin bowl of tissue is removed" },
    { at: cycle * 0.4, text: "Edge mapped in colours; 100% checked under the microscope" },
    { at: cycle * 0.55, text: "One zone still has tumour → Stage 2 takes only that zone" },
    { at: cycle * 0.82, text: "Margins clear: healthy tissue spared" },
  ], onPhase);
  useFrame(() => {
    const t = tl() / cycle;
    const up1 = ease((t - 0.15) / 0.2) * 0.0075;
    if (bowl1.current) { bowl1.current.position.set(-0.004 * ease((t - 0.15) / 0.2), up1, 0); bowl1.current.visible = t < 0.8; }
    if (flag.current) flag.current.visible = t > 0.45 && t < 0.8 && Math.sin(t * 80) > -0.3;
    const up2 = ease((t - 0.6) / 0.18) * 0.0075;
    if (bowl2.current) { bowl2.current.visible = t > 0.55 && t < 0.95; bowl2.current.position.set(0.003 * ease((t - 0.6) / 0.18), up2, 0); }
    if (restB.current) restB.current.visible = t < 0.6;
  });
  const R1 = 0.0042;
  return (
    <group>
      <group ref={bowl1}>
        {tumourA.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial color="#4a2a3a" roughness={0.8} />
          </mesh>
        ))}
        {quads.map((c, i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <sphereGeometry args={[R1, 32, 16, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color={c} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
        <mesh ref={flag} position={[R1 * 0.75, -R1 * 0.4, 0]}>
          <sphereGeometry args={[0.0007, 12, 8]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
      </group>
      <group ref={restB}>
        {tumourB.map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial color="#4a2a3a" roughness={0.8} />
          </mesh>
        ))}
      </group>
      <group ref={bowl2}>
        <group position={[0.0045, -0.0022, 0]}>
          {tumourB.map(([x, y, z, r], i) => (
            <mesh key={i} position={[x - 0.0045, y + 0.0022, z]}>
              <sphereGeometry args={[r, 10, 8]} />
              <meshStandardMaterial color="#4a2a3a" roughness={0.8} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.0028, 24, 12]} />
            <meshStandardMaterial color="#eda100" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function CameraRig({ pos, target }: { pos: [number, number, number]; target: [number, number, number] }) {
  const get = useThree((s) => s.get);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    const { camera } = get();
    camera.position.set(...pos);
    const c = controls as unknown as OrbitImpl | null;
    if (c) { c.target.set(...target); c.update(); } else camera.lookAt(...target);
    (camera as THREE.PerspectiveCamera).near = Math.max(0.0005, camera.position.distanceTo(new THREE.Vector3(...target)) / 200);
    camera.updateProjectionMatrix();
  }, [get, controls, pos, target]);
  return null;
}

function Exporter({ exportRef }: { exportRef: SceneProps["exportRef"] }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    exportRef.current = () => new Promise((res) => { gl.render(scene, camera); gl.domElement.toBlob((b) => res(b), "image/png"); });
    return () => { exportRef.current = null; };
  }, [gl, scene, camera, exportRef]);
  return null;
}

export default function AnatomyScene(p: SceneProps & { cam: { pos: [number, number, number]; target: [number, number, number] } }) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false }}
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.001, far: 20, position: p.cam.pos }}
      data-testid="anatomy-canvas"
      onCreated={({ gl }) => { gl.localClippingEnabled = true; gl.setClearColor(0x000000, 0); }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[1.5, 2, 2]} intensity={2.2} />
      <directionalLight position={[-2, 0.5, 1.5]} intensity={0.8} />
      <directionalLight position={[0, 1.5, -2]} intensity={1.4} />
      <Model {...p} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
      <CameraRig pos={p.cam.pos} target={p.cam.target} />
      <Exporter exportRef={p.exportRef} />
    </Canvas>
  );
}
