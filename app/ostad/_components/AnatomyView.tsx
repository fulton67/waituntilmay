"use client";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import css from "../ostad.module.css";
import type { Bg, ModelDef, ModelKey, PresetKey } from "./AnatomyScene";

const Scene = dynamic(() => import("./AnatomyScene"), { ssr: false, loading: () => <div className={css.anatLoading}>loading 3D…</div> });

type V3 = [number, number, number];
type Preset = {
  key: PresetKey; label: string; model: ModelKey; cycle: number; cut: number;
  show?: string[]; opacity?: Record<string, number>; cam: { pos: V3; target: V3 }; note: string;
};

// camera targets measured from the GLBs (research/ostad/3d/scripts/measure_glb.mjs): the face looks down +Z,
// origin at the head centre; the skin block's surface is y = 0, 2 x 2 cm.
const PRESETS: Preset[] = [
  { key: "botox", label: "Botox · glabella", model: "face", cycle: 9, cut: 0,
    show: ["epidermis", "muscle", "vessel_artery"], opacity: { epidermis: 0.28 },
    cam: { pos: [0.07, 0.05, 0.3], target: [0, 0.018, 0.075] }, note: "signal-cut: 5 points, contraction, nerve signal cut, relaxed" },
  { key: "filler", label: "Filler · cheek", model: "face", cycle: 8.5, cut: 0.85,
    show: ["epidermis", "fat_superficial", "smas", "fat_deep", "muscle", "vessel_artery"],
    cam: { pos: [-0.2, 0.01, 0.2], target: [-0.03, -0.015, 0.06] }, note: "cannula to the deep medial cheek fat, gel fills the compartment" },
  { key: "morpheus8", label: "Morpheus8", model: "skin", cycle: 7.5, cut: 0.5,
    cam: { pos: [0.032, 0.02, 0.04], target: [0, -0.004, 0] }, note: "needle array at three depths, RF glow at the tips" },
  { key: "fraxel", label: "Fraxel", model: "skin", cycle: 8, cut: 0.5,
    cam: { pos: [0.03, 0.026, 0.036], target: [0, -0.003, 0] }, note: "fractional columns in scan order, then healing" },
  { key: "mohs", label: "Mohs", model: "skin", cycle: 10, cut: 0.45,
    cam: { pos: [0.026, 0.024, 0.042], target: [0, 0.0005, 0] }, note: "layered excision: stage 1 mapped, stage 2 only the positive zone" },
];
const FREE: Record<ModelKey, { pos: V3; target: V3 }> = {
  face: { pos: [0.22, 0.03, 0.62], target: [0, -0.04, 0] },
  skin: { pos: [0.03, 0.022, 0.04], target: [0, -0.004, 0] },
};

export default function AnatomyView({ defs }: { defs: Record<ModelKey, ModelDef> }) {
  const [model, setModel] = useState<ModelKey>("face");
  const [preset, setPreset] = useState<PresetKey | null>(null);
  const defaults = useCallback((k: ModelKey) => Object.fromEntries(defs[k].layers.map((l) => [l.id, l.default_visible || k === "skin"])), [defs]);
  const [visible, setVisible] = useState<Record<string, boolean>>(() => defaults("face"));
  const [opacity, setOpacity] = useState<Record<string, number>>({});
  const [cut, setCut] = useState(0);
  const [bg, setBg] = useState<Bg>("transparent");
  const [cam, setCam] = useState(FREE.face);
  const [nodes, setNodes] = useState<string>("");
  const [phase, setPhase] = useState("");
  const [saved, setSaved] = useState("");
  const [freeze, setFreeze] = useState<number | null>(null);
  const exportRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const def = defs[model];

  const choose = (p: Preset | null, m: ModelKey = p?.model ?? model) => {
    setPreset(p?.key ?? null);
    setFreeze(null);
    setModel(m);
    setNodes("");
    setPhase("");
    const base = defaults(m);
    if (p?.show) for (const k of Object.keys(base)) base[k] = p.show.includes(k);
    setVisible(base);
    setOpacity(p?.opacity ?? {});
    setCut(p?.cut ?? 0);
    setCam(p ? { ...p.cam } : { ...FREE[m] });
  };
  const active = PRESETS.find((p) => p.key === preset) ?? null;
  const onReady = useCallback((found: number, expected: number) => setNodes(`${found}/${expected}`), []);
  const onPhase = useCallback((t: string) => setPhase(t), []);

  const exportPng = async () => {
    const blob = await exportRef.current?.();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ostad-anatomy-${preset ?? model}-${bg}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setSaved(`${a.download} · ${(blob.size / 1024).toFixed(0)} KB`);
  };

  const sceneProps = useMemo(() => ({ model, def, visible, opacity, cut, bg, preset, cycle: active?.cycle ?? 8, cam, freeze }), [model, def, visible, opacity, cut, bg, preset, active, cam, freeze]);

  return (
    <div className={css.anat}>
      <div className={css.anatBar}>
        <div className={css.chipRow}>
          <span className={css.chipLabel}>Procedure</span>
          {PRESETS.map((p) => (
            <button key={p.key} data-preset={p.key} className={preset === p.key ? css.chipOn : css.chip} onClick={() => choose(p)}>{p.label}</button>
          ))}
          <button data-preset="none" className={preset === null ? css.chipOn : css.chip} onClick={() => choose(null)}>free orbit</button>
        </div>
        <div className={css.chipRow}>
          <span className={css.chipLabel}>Model</span>
          {(["face", "skin"] as ModelKey[]).map((k) => (
            <button key={k} data-model={k} className={model === k ? css.chipOn : css.chip} onClick={() => choose(null, k)}>{k === "face" ? "face + neck" : "skin block"}</button>
          ))}
        </div>
        <div className={css.chipRow}>
          <span className={css.chipLabel}>Layers</span>
          {def.layers.map((l) => (
            <button key={l.id} data-layer={l.id} className={visible[l.id] ? css.chipOn : css.chip}
              title={l.approximated ? "approximated (see layers.json)" : undefined}
              onClick={() => setVisible((v) => ({ ...v, [l.id]: !v[l.id] }))}>
              <span className={css.anatSwatch} style={{ background: l.color }} />{l.label}{l.approximated ? "*" : ""}
            </button>
          ))}
        </div>
        <div className={css.chipRow}>
          <span className={css.chipLabel}>Cutaway</span>
          <input type="range" min={0} max={1} step={0.01} value={cut} data-testid="cut" className={css.anatRange}
            onChange={(e) => setCut(Number(e.target.value))} aria-label="cutaway" />
          <span className={css.mono}>{Math.round(cut * 100)}%</span>
        </div>
        {active && (
          <div className={css.chipRow}>
            <span className={css.chipLabel}>Time</span>
            <button data-testid="play" className={css.chip} onClick={() => setFreeze((f) => (f === null ? 0 : null))}>{freeze === null ? "[❚❚ pause]" : "[▶ play]"}</button>
            {freeze !== null && (
              <>
                <input type="range" min={0} max={1} step={0.005} value={freeze} data-testid="scrub" className={css.anatRange}
                  onChange={(e) => setFreeze(Number(e.target.value))} aria-label="animation time" />
                <span className={css.mono}>{(freeze * active.cycle).toFixed(1)} s / {active.cycle} s</span>
              </>
            )}
          </div>
        )}
        <div className={css.chipRow}>
          <span className={css.chipLabel}>Background</span>
          {(["transparent", "black", "white"] as Bg[]).map((b) => (
            <button key={b} data-bg={b} className={bg === b ? css.chipOn : css.chip} onClick={() => setBg(b)}>{b}</button>
          ))}
          <button data-testid="export-png" className={css.chip} onClick={exportPng}>[export frame as PNG{bg === "transparent" ? " with alpha" : ""} ↓]</button>
          {saved && <span className={`${css.mono} ${css.mid}`} data-testid="export-status">{saved}</span>}
        </div>
      </div>
      <div className={`${css.anatStage} ${bg === "transparent" ? css.anatChecker : ""}`} data-bg-active={bg}>
        <Scene {...sceneProps} onReady={onReady} onPhase={onPhase} exportRef={exportRef} key={model} />
        <div className={css.anatHud}>
          <span data-testid="preset-active">{active ? active.label : "free orbit"}</span>
          {phase && <span data-testid="phase"> · {phase}</span>}
        </div>
        <div className={`${css.anatHud2} ${css.mono}`}>
          nodes <span data-testid="node-count">{nodes || "…"}</span>
        </div>
      </div>
      <p className={css.mid}>
        {active ? active.note + ". " : ""}Drag to orbit, scroll to zoom. * = approximated layer (fat compartments, SMAS, skin thickness, eyes; see face.layers.json).
        Face from Z-Anatomy (CC BY-SA 4.0) / BodyParts3D (CC BY-SA 2.1 JP); skin block built from primitives. Placeholder palette.
      </p>
    </div>
  );
}
