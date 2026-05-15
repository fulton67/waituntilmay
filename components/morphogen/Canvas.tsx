"use client"
import { useEffect, useRef, useCallback } from 'react'
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
  const store = useSimStore()

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
    return Array(15).fill(1)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2')
    if (!gl) { console.error('WebGL 2 not supported'); return }

    const sim = new MorphogenSimulation(gl)
    simRef.current = sim

    if (parsedImageRef.current && distFieldRef.current) {
      sim.init(parsedImageRef.current, distFieldRef.current)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      sim.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const sim = simRef.current
    if (!canvas || !sim) return

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
    return () => cancelAnimationFrame(rafRef.current)
  }, [store.running, store.speed, getActivePalette])

  return (
    <canvas
      ref={canvasRef}
      width={SIM_SIZE}
      height={SIM_SIZE}
      className="w-full h-full object-contain rounded-lg"
    />
  )
}
