"use client"
import { useRef } from 'react'
import { useSimStore } from '@/store/simulationStore'
import { parseImage, loadImageFromFile } from '@/lib/morphogen/imageParser'
import { computeDistanceField } from '@/lib/morphogen/distanceField'
import { extractPalette } from '@/lib/morphogen/colorExtractor'
import type { MorphogenSimulation } from '@/lib/morphogen/simulation'
import type { ParsedImage } from '@/lib/morphogen/imageParser'

interface UploadZoneProps {
  parsedImageRef: React.MutableRefObject<ParsedImage | null>
  distFieldRef: React.MutableRefObject<Float32Array | null>
  simRef: React.MutableRefObject<MorphogenSimulation | null>
}

export default function UploadZone({ parsedImageRef, distFieldRef, simRef }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const store = useSimStore()

  const handleFile = async (file: File) => {
    const img = await loadImageFromFile(file)
    const parsed = parseImage(img)
    const dist = computeDistanceField(parsed.golData)
    const palette = await extractPalette(img, 5)

    parsedImageRef.current = parsed
    distFieldRef.current = dist
    store.setAutoPalette(palette)
    store.setImageLoaded(parsed.width, parsed.height)
    store.reset()

    if (simRef.current) {
      simRef.current.init(parsed, dist)
    }
  }

  return (
    <div
      className="border-2 border-dashed border-zinc-600 rounded-lg p-4 text-center cursor-pointer hover:border-zinc-400 transition-colors"
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <p className="text-zinc-400 text-sm">Drop logo / image here</p>
      <p className="text-zinc-600 text-xs mt-1">PNG · JPG · WEBP</p>
    </div>
  )
}
