import { SIM_SIZE } from './types'

export function computeDistanceField(golData: Float32Array): Float32Array {
  const n = SIM_SIZE
  const dist = new Float32Array(n * n).fill(Infinity)

  for (let i = 0; i < n * n; i++) {
    if (golData[i] > 0.5) dist[i] = 0
  }

  // Forward pass
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const idx = y * n + x
      if (dist[idx] === 0) continue
      const neighbors = [
        y > 0 && x > 0   ? dist[(y-1)*n+(x-1)] + 1.414 : Infinity,
        y > 0             ? dist[(y-1)*n+ x   ] + 1.0   : Infinity,
        y > 0 && x < n-1 ? dist[(y-1)*n+(x+1)] + 1.414 : Infinity,
        x > 0             ? dist[ y   *n+(x-1)] + 1.0   : Infinity,
      ]
      dist[idx] = Math.min(dist[idx], ...neighbors)
    }
  }

  // Backward pass
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      const idx = y * n + x
      if (dist[idx] === 0) continue
      const neighbors = [
        y < n-1 && x < n-1 ? dist[(y+1)*n+(x+1)] + 1.414 : Infinity,
        y < n-1             ? dist[(y+1)*n+ x   ] + 1.0   : Infinity,
        y < n-1 && x > 0   ? dist[(y+1)*n+(x-1)] + 1.414 : Infinity,
        x < n-1             ? dist[ y   *n+(x+1)] + 1.0   : Infinity,
      ]
      dist[idx] = Math.min(dist[idx], ...neighbors)
    }
  }

  // Normalize — avoid spread on large arrays (stack overflow risk)
  const maxDist = dist.reduce((a, b) => (isFinite(b) ? Math.max(a, b) : a), 0)
  for (let i = 0; i < n * n; i++) {
    dist[i] = isFinite(dist[i]) ? dist[i] / maxDist : 1.0
  }

  return dist
}
