import { create } from 'zustand'
import {
  SimulationPhase, FormConstant, TuringPreset, PalettePreset,
  TuringParams, ECParams, LayerWeights, RGBColor,
  TURING_PRESETS, EC_PRESETS,
} from '@/lib/morphogen/types'

interface SimulationState {
  running: boolean
  iteration: number
  maxIterations: number
  speed: number
  phase: SimulationPhase
  weights: LayerWeights
  attractionRadius: number
  turingPreset: TuringPreset
  turingParams: TuringParams
  formConstant: FormConstant
  ecParams: ECParams
  ecIntensity: number
  palettePreset: PalettePreset
  autoPalette: RGBColor[]
  customColors: [RGBColor, RGBColor]
  imageLoaded: boolean
  imageWidth: number
  imageHeight: number
  setRunning: (v: boolean) => void
  setIteration: (v: number) => void
  setSpeed: (v: number) => void
  setPhase: (v: SimulationPhase) => void
  setWeights: (v: Partial<LayerWeights>) => void
  setAttractionRadius: (v: number) => void
  setTuringPreset: (v: TuringPreset) => void
  setTuringParams: (v: Partial<TuringParams>) => void
  setFormConstant: (v: FormConstant) => void
  setEcIntensity: (v: number) => void
  setPalettePreset: (v: PalettePreset) => void
  setAutoPalette: (v: RGBColor[]) => void
  setImageLoaded: (w: number, h: number) => void
  reset: () => void
}

const normalizeWeights = (weights: LayerWeights): LayerWeights => {
  const sum = weights.gol + weights.turing + weights.ec
  if (sum === 0) return { gol: 0.33, turing: 0.33, ec: 0.34 }
  return { gol: weights.gol / sum, turing: weights.turing / sum, ec: weights.ec / sum }
}

export const useSimStore = create<SimulationState>((set) => ({
  running: false,
  iteration: 0,
  maxIterations: 500,
  speed: 1,
  phase: 'dissolution',
  weights: { gol: 0.33, turing: 0.33, ec: 0.34 },
  attractionRadius: 20,
  turingPreset: 'romanesco',
  turingParams: TURING_PRESETS.romanesco,
  formConstant: 'spiral',
  ecParams: EC_PRESETS.spiral,
  ecIntensity: 0.8,
  palettePreset: 'auto',
  autoPalette: [],
  customColors: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }],
  imageLoaded: false,
  imageWidth: 0,
  imageHeight: 0,
  setRunning: (v) => set({ running: v }),
  setIteration: (v) => set({ iteration: v }),
  setSpeed: (v) => set({ speed: v }),
  setPhase: (v) => set({ phase: v }),
  setWeights: (v) => set((s) => ({ weights: normalizeWeights({ ...s.weights, ...v }) })),
  setAttractionRadius: (v) => set({ attractionRadius: v }),
  setTuringPreset: (v) => set({ turingPreset: v, turingParams: TURING_PRESETS[v] }),
  setTuringParams: (v) => set((s) => ({ turingParams: { ...s.turingParams, ...v } })),
  setFormConstant: (v) => set({ formConstant: v, ecParams: EC_PRESETS[v] }),
  setEcIntensity: (v) => set({ ecIntensity: v }),
  setPalettePreset: (v) => set({ palettePreset: v }),
  setAutoPalette: (v) => set({ autoPalette: v }),
  setImageLoaded: (w, h) => set({ imageLoaded: true, imageWidth: w, imageHeight: h }),
  reset: () => set({ running: false, iteration: 0, phase: 'dissolution' }),
}))
