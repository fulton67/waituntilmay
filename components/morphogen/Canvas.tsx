"use client"
import { useEffect, useRef, useCallback, useState } from 'react'
import { useSimStore } from '@/store/simulationStore'
import { MorphogenSimulation } from '@/lib/morphogen/simulation'
import { SIM_SIZE } from '@/lib/morphogen/types'
import { paletteToUniform, PALETTE_PRESETS } from '@/lib/morphogen/colorExtractor'
import type { ParsedImage } from '@/lib/morphogen/imageParser'

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  parsedImageRef: React.MutableRefObject<ParsedImage | null>
  distFieldRef: React.MutableRefObject<Float32Array | null>
  simRef: React.MutableRefObject<MorphogenSimulation | null>
}

export default function Canvas({ canvasRef, parsedImageRef, distFieldRef, simRef }: CanvasProps) {
  const rafRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const imageLoaded = useSimStore(s => s.imageLoaded)

  const getActivePalette = useCallback((): number[] => {
    const s = useSimStore.getState()
    if (s.palettePreset === 'auto' && s.autoPalette.length > 0) {
      return paletteToUniform(s.autoPalette)
    }
    if (s.palettePreset !== 'auto') {
      const preset = PALETTE_PRESETS[s.palettePreset]
      if (preset) {
        const colors = Array.from({ length: 5 }, (_, i) => {
          const t = i / 4
          return {
            r: Math.round(preset[0].r + t * (preset[1].r - preset[0].r)),
            g: Math.round(preset[0].g + t * (preset[1].g - preset[0].g)),
            b: Math.round(preset[0].b + t * (preset[1].b - preset[0].b)),
          }
        })
        return paletteToUniform(colors)
      }
    }
    return [0,0,0, 0.2,0,0.4, 0.5,0,0.8, 0.8,0.4,1, 1,1,1]
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) { setError('Canvas element not found'); return }

    const gl = canvas.getContext('webgl2')
    if (!gl) {
      setError('WebGL 2 is not supported in this browser. Try Chrome or Firefox on desktop.')
      return
    }

    const ext = gl.getExtension('EXT_color_buffer_float')
    if (!ext) {
      setError('EXT_color_buffer_float not supported — try a different browser or device.')
      return
    }

    let sim: MorphogenSimulation
    try {
      sim = new MorphogenSimulation(gl)
    } catch (e) {
      setError(`Shader error: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    simRef.current = sim

    if (parsedImageRef.current && distFieldRef.current) {
      sim.init(parsedImageRef.current, distFieldRef.current)
    }

    cancelAnimationFrame(rafRef.current)
    const loop = () => {
      const s = useSimStore.getState()
      if (s.running) {
        const steps = Math.max(1, Math.round(s.speed))
        for (let i = 0; i < steps; i++) {
          sim.step({
            attractionRadius: s.attractionRadius,
            attractionWeight: s.phase === 'reconstruction' ? 1.0 : 0.0,
            turing: s.turingParams,
            ec: s.ecParams,
          })
          useSimStore.setState({ iteration: s.iteration + i + 1 })
        }
      }
      sim.render(canvas, useSimStore.getState().weights, getActivePalette())
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      sim.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-lg border border-red-800 p-6 text-center">
        <div>
          <p className="text-red-400 text-sm font-mono mb-2">⚠ WebGL Error</p>
          <p className="text-zinc-400 text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={SIM_SIZE}
        height={SIM_SIZE}
        style={{ background: '#000' }}
        className="w-full h-full object-contain rounded-lg"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-500 text-sm">← drop an image to begin</p>
        </div>
      )}
    </div>
  )
}
