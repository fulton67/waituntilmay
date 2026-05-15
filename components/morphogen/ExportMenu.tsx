"use client"
import { useState } from 'react'
import { exportPNG, exportMP4, exportGIF, canvasToBlob } from '@/lib/morphogen/exporter'
import type { MorphogenSimulation } from '@/lib/morphogen/simulation'
import { useSimStore } from '@/store/simulationStore'

interface ExportMenuProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  simRef: React.MutableRefObject<MorphogenSimulation | null>
}

export default function ExportMenu({ canvasRef, simRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)

  const captureFrames = async (count: number): Promise<Blob[]> => {
    const canvas = canvasRef.current
    const sim = simRef.current
    if (!canvas || !sim) return []

    const s = useSimStore.getState()
    const frames: Blob[] = []

    for (let i = 0; i < count; i++) {
      sim.step({
        attractionRadius: s.attractionRadius,
        attractionWeight: s.phase === 'reconstruction' ? 1.0 : 0.0,
        turing: s.turingParams,
        ec: s.ecParams,
      })
      const palette = s.autoPalette.length > 0
        ? s.autoPalette.flatMap(c => [c.r / 255, c.g / 255, c.b / 255])
        : Array(15).fill(1)
      sim.render(canvas, s.weights, palette)
      frames.push(await canvasToBlob(canvas))
    }
    return frames
  }

  const handlePNG = async () => {
    if (!canvasRef.current) return
    setOpen(false)
    await exportPNG(canvasRef.current)
  }

  const handleMP4 = async () => {
    setOpen(false)
    setRecording(true)
    try {
      const frames = await captureFrames(240) // 10s @ 24fps
      await exportMP4(frames, 24, setProgress)
    } finally {
      setRecording(false)
      setProgress(0)
    }
  }

  const handleGIF = async () => {
    setOpen(false)
    setRecording(true)
    try {
      const frames = await captureFrames(60)
      await exportGIF(frames, 12)
    } finally {
      setRecording(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={recording}
        className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded disabled:opacity-50"
      >
        {recording ? `Encoding… ${Math.round(progress * 100)}%` : 'Export ▼'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-10 min-w-36">
          {[
            { label: 'PNG (frame)', action: handlePNG },
            { label: 'MP4 (10s)', action: handleMP4 },
            { label: 'GIF (loop)', action: handleGIF },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >{label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
