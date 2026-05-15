"use client"
import { useSimStore } from '@/store/simulationStore'
import { TuringPreset, FormConstant, SimulationPhase } from '@/lib/morphogen/types'

function Slider({ label, value, min, max, step = 0.01, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>{label}</span><span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function Controls() {
  const s = useSimStore()

  return (
    <div className="flex flex-col gap-1 text-sm">
      <Section title="Playback">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => s.setRunning(!s.running)}
            className="flex-1 py-1 rounded bg-violet-700 hover:bg-violet-600 text-white text-xs"
          >{s.running ? '⏸ Pause' : '▶ Play'}</button>
          <button
            onClick={s.reset}
            className="py-1 px-3 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
          >↺</button>
        </div>
        <Slider label="Speed" value={s.speed} min={1} max={10} step={1} onChange={s.setSpeed} />
        <p className="text-xs text-zinc-500">Iteration: {s.iteration}</p>
      </Section>

      <Section title="Layer Blend">
        <Slider label="GoL" value={s.weights.gol} min={0} max={1}
          onChange={(v) => s.setWeights({ gol: v })} />
        <Slider label="Turing" value={s.weights.turing} min={0} max={1}
          onChange={(v) => s.setWeights({ turing: v })} />
        <Slider label="EC Neural" value={s.weights.ec} min={0} max={1}
          onChange={(v) => s.setWeights({ ec: v })} />
      </Section>

      <Section title="Conway GoL">
        <div className="mb-2">
          <label className="text-xs text-zinc-400">Phase</label>
          <select
            value={s.phase}
            onChange={(e) => s.setPhase(e.target.value as SimulationPhase)}
            className="w-full mt-1 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1"
          >
            <option value="dissolution">Dissolution</option>
            <option value="reconstruction">Reconstruction</option>
          </select>
        </div>
        <Slider label="Attraction Radius" value={s.attractionRadius} min={1} max={100} step={1}
          onChange={s.setAttractionRadius} />
      </Section>

      <Section title="Turing RD">
        <div className="mb-2">
          <label className="text-xs text-zinc-400">Preset</label>
          <select
            value={s.turingPreset}
            onChange={(e) => s.setTuringPreset(e.target.value as TuringPreset)}
            className="w-full mt-1 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1"
          >
            <option value="romanesco">Romanesco</option>
            <option value="leopard">Leopard</option>
            <option value="zebra">Zebra</option>
            <option value="coral">Coral</option>
          </select>
        </div>
        <Slider label="Feed (f)" value={s.turingParams.f} min={0.01} max={0.1}
          onChange={(v) => s.setTuringParams({ f: v })} />
        <Slider label="Kill (k)" value={s.turingParams.k} min={0.04} max={0.08}
          onChange={(v) => s.setTuringParams({ k: v })} />
      </Section>

      <Section title="Neural Field (EC)">
        <div className="mb-2">
          <label className="text-xs text-zinc-400">Form Constant</label>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {(['spiral','tunnel','lattice','cobweb'] as FormConstant[]).map((fc) => (
              <button
                key={fc}
                onClick={() => s.setFormConstant(fc)}
                className={`py-1 rounded text-xs capitalize ${s.formConstant === fc
                  ? 'bg-violet-700 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
              >{fc}</button>
            ))}
          </div>
        </div>
        <Slider label="Intensity" value={s.ecIntensity} min={0} max={1}
          onChange={s.setEcIntensity} />
      </Section>
    </div>
  )
}
