import ColorThief from 'color-thief-ts'
import { RGBColor } from './types'

const thief = new ColorThief()

export async function extractPalette(img: HTMLImageElement, count = 5): Promise<RGBColor[]> {
  const palette = await thief.getPalette(img, count)
  return palette.map(([r, g, b]: [number, number, number]) => ({ r, g, b }))
}

export const PALETTE_PRESETS: Record<string, [RGBColor, RGBColor]> = {
  monochrome: [{ r: 0,   g: 0,   b: 0  }, { r: 255, g: 255, b: 255 }],
  neon:       [{ r: 10,  g: 0,   b: 40 }, { r: 0,   g: 255, b: 200 }],
  organic:    [{ r: 30,  g: 20,  b: 10 }, { r: 180, g: 140, b: 80  }],
  cosmic:     [{ r: 5,   g: 0,   b: 20 }, { r: 180, g: 80,  b: 255 }],
}

export function paletteToUniform(palette: RGBColor[]): number[] {
  return palette.flatMap(({ r, g, b }) => [r / 255, g / 255, b / 255])
}
