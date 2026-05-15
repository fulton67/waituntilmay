import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { SIM_SIZE } from './types'

let ffmpeg: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  ffmpeg = new FFmpeg()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ffmpeg
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      'image/png'
    )
  })
}

export async function exportPNG(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `morphogen-${Date.now()}.png`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportMP4(
  frames: Blob[],
  fps = 24,
  onProgress?: (ratio: number) => void
): Promise<void> {
  const ff = await getFFmpeg()
  ff.on('progress', (event) => onProgress?.(event.progress))

  for (let i = 0; i < frames.length; i++) {
    const name = `frame${String(i).padStart(4, '0')}.png`
    await ff.writeFile(name, await fetchFile(frames[i]))
  }

  await ff.exec([
    '-framerate', String(fps),
    '-i', 'frame%04d.png',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    'out.mp4',
  ])

  const data = await ff.readFile('out.mp4')
  const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: 'video/mp4' })
  triggerDownload(blob, `morphogen-${Date.now()}.mp4`)
}

export async function exportGIF(frames: Blob[], fps = 12): Promise<void> {
  const ff = await getFFmpeg()
  for (let i = 0; i < frames.length; i++) {
    await ff.writeFile(`frame${String(i).padStart(4, '0')}.png`, await fetchFile(frames[i]))
  }
  await ff.exec([
    '-framerate', String(fps),
    '-i', 'frame%04d.png',
    '-vf', `fps=${fps},scale=${SIM_SIZE}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    'out.gif',
  ])
  const data = await ff.readFile('out.gif')
  triggerDownload(new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: 'image/gif' }), `morphogen-${Date.now()}.gif`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
