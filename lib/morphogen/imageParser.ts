import { SIM_SIZE } from './types'

export interface ParsedImage {
  golData: Float32Array
  rdUData: Float32Array
  rdVData: Float32Array
  ecData: Float32Array
  originalPixels: Uint8ClampedArray
  width: number
  height: number
}

export function parseImage(imageElement: HTMLImageElement): ParsedImage {
  const canvas = document.createElement('canvas')
  canvas.width = SIM_SIZE
  canvas.height = SIM_SIZE
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(imageElement, 0, 0, SIM_SIZE, SIM_SIZE)
  const imageData = ctx.getImageData(0, 0, SIM_SIZE, SIM_SIZE)
  const pixels = imageData.data

  const n = SIM_SIZE * SIM_SIZE
  const golData = new Float32Array(n)
  const rdUData = new Float32Array(n)
  const rdVData = new Float32Array(n)
  const ecData = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const r = pixels[i * 4] / 255
    const g = pixels[i * 4 + 1] / 255
    const b = pixels[i * 4 + 2] / 255
    const luma = 0.299 * r + 0.587 * g + 0.114 * b

    golData[i] = luma > 0.5 ? 1.0 : 0.0
    rdUData[i] = 1.0
    rdVData[i] = luma > 0.5 ? 0.5 : 0.0
    ecData[i] = luma
  }

  return {
    golData, rdUData, rdVData, ecData,
    originalPixels: pixels,
    width: SIM_SIZE,
    height: SIM_SIZE,
  }
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}
