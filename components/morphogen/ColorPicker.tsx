"use client"
import { useSimStore } from '@/store/simulationStore'
import { PalettePreset } from '@/lib/morphogen/types'

const PRESETS: PalettePreset[] = ['auto', 'monochrome', 'neon', 'organic', 'cosmic']

export default function ColorPicker() {
  const s = useSimStore()

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Palette</p>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => s.setPalettePreset(preset)}
            className={`px-2 py-1 rounded text-xs capitalize ${s.palettePreset === preset
              ? 'bg-violet-700 text-white'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            {preset === 'auto' ? '✦ Auto' : preset}
          </button>
        ))}
      </div>
      {s.palettePreset === 'auto' && s.autoPalette.length > 0 && (
        <div className="flex gap-1 mt-2">
          {s.autoPalette.map((c, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
