"use client"
import { useRef } from 'react'
import Canvas from '@/components/morphogen/Canvas'
import Controls from '@/components/morphogen/Controls'
import ColorPicker from '@/components/morphogen/ColorPicker'
import UploadZone from '@/components/morphogen/UploadZone'
import ExportMenu from '@/components/morphogen/ExportMenu'
import type { MorphogenSimulation } from '@/lib/morphogen/simulation'
import type { ParsedImage } from '@/lib/morphogen/imageParser'

export default function MorphogenPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  const simRef = useRef<MorphogenSimulation | null>(null)
  const parsedImageRef = useRef<ParsedImage | null>(null)
  const distFieldRef = useRef<Float32Array | null>(null)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <span className="font-bold tracking-widest text-violet-400">MORPHOGEN</span>
        <ExportMenu canvasRef={canvasRef} simRef={simRef} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">
          <UploadZone
            parsedImageRef={parsedImageRef}
            distFieldRef={distFieldRef}
            simRef={simRef}
          />
          <Controls />
          <ColorPicker />
        </aside>

        <main className="flex-1 flex items-center justify-center bg-zinc-950 p-8 overflow-hidden">
          <div className="aspect-square max-h-full max-w-full">
            <Canvas
              canvasRef={canvasRef}
              parsedImageRef={parsedImageRef}
              distFieldRef={distFieldRef}
              simRef={simRef}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
