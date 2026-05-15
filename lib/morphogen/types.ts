export type SimulationPhase = 'dissolution' | 'reconstruction'
export type FormConstant = 'spiral' | 'tunnel' | 'lattice' | 'cobweb'
export type TuringPreset = 'romanesco' | 'leopard' | 'zebra' | 'coral'
export type PalettePreset = 'auto' | 'monochrome' | 'neon' | 'organic' | 'cosmic'
export type ExportFormat = 'png' | 'mp4' | 'gif'

export interface TuringParams {
  du: number
  dv: number
  f: number
  k: number
}

export interface ECParams {
  sigmaE: number
  sigmaI: number
  ampE: number
  ampI: number
  beta: number
  theta: number
  tau: number
  bias: number
}

export interface LayerWeights {
  gol: number
  turing: number
  ec: number
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

export const TURING_PRESETS: Record<TuringPreset, TuringParams> = {
  romanesco: { du: 0.10, dv: 0.16, f: 0.054, k: 0.063 },
  leopard:   { du: 0.08, dv: 0.16, f: 0.035, k: 0.065 },
  zebra:     { du: 0.08, dv: 0.16, f: 0.060, k: 0.062 },
  coral:     { du: 0.08, dv: 0.16, f: 0.039, k: 0.058 },
}

export const EC_PRESETS: Record<FormConstant, ECParams> = {
  spiral:  { sigmaE: 1.5, sigmaI: 3.0, ampE: 1.2, ampI: 0.8, beta: 4.0, theta: 0.5, tau: 1.0, bias: 0.1 },
  tunnel:  { sigmaE: 2.0, sigmaI: 4.0, ampE: 1.0, ampI: 0.9, beta: 3.0, theta: 0.5, tau: 1.0, bias: 0.1 },
  lattice: { sigmaE: 1.0, sigmaI: 2.5, ampE: 1.3, ampI: 0.7, beta: 5.0, theta: 0.5, tau: 1.0, bias: 0.1 },
  cobweb:  { sigmaE: 0.8, sigmaI: 2.0, ampE: 1.4, ampI: 0.6, beta: 6.0, theta: 0.5, tau: 1.0, bias: 0.1 },
}

export const SIM_SIZE = 512
