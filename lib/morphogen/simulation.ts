import * as twgl from 'twgl.js'
import { VERTEX_SHADER, QUAD_POSITIONS } from './shaders/passthrough'
import { GOL_FRAG } from './shaders/gol'
import { TURING_FRAG } from './shaders/turing'
import { EC_FRAG } from './shaders/ec'
import { BLEND_FRAG } from './shaders/blend'
import { SIM_SIZE, TuringParams, ECParams, LayerWeights } from './types'
import type { ParsedImage } from './imageParser'

export class MorphogenSimulation {
  private gl: WebGL2RenderingContext
  private golProgram: twgl.ProgramInfo
  private turingProgram: twgl.ProgramInfo
  private ecProgram: twgl.ProgramInfo
  private blendProgram: twgl.ProgramInfo
  private quadBuffer: twgl.BufferInfo

  private golFBOs: [twgl.FramebufferInfo, twgl.FramebufferInfo]
  private turingFBOs: [twgl.FramebufferInfo, twgl.FramebufferInfo]
  private ecFBOs: [twgl.FramebufferInfo, twgl.FramebufferInfo]
  private distFieldFBO: twgl.FramebufferInfo

  private golRead = 0
  private turingRead = 0
  private ecRead = 0

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    gl.getExtension('EXT_color_buffer_float')

    this.golProgram    = twgl.createProgramInfo(gl, [VERTEX_SHADER, GOL_FRAG])
    this.turingProgram = twgl.createProgramInfo(gl, [VERTEX_SHADER, TURING_FRAG])
    this.ecProgram     = twgl.createProgramInfo(gl, [VERTEX_SHADER, EC_FRAG])
    this.blendProgram  = twgl.createProgramInfo(gl, [VERTEX_SHADER, BLEND_FRAG])

    this.quadBuffer = twgl.createBufferInfoFromArrays(gl, {
      a_position: { numComponents: 2, data: QUAD_POSITIONS },
    })

    this.golFBOs    = [this.makeFloatFBO(), this.makeFloatFBO()]
    this.turingFBOs = [this.makeFloatFBO(), this.makeFloatFBO()]
    this.ecFBOs     = [this.makeFloatFBO(), this.makeFloatFBO()]
    this.distFieldFBO = this.makeFloatFBO()
  }

  private makeFloatFBO(): twgl.FramebufferInfo {
    const gl = this.gl
    const tex = twgl.createTexture(gl, {
      width: SIM_SIZE, height: SIM_SIZE,
      internalFormat: gl.RGBA32F,
      format: gl.RGBA, type: gl.FLOAT,
      minMag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE,
    })
    return twgl.createFramebufferInfo(gl, [{ attachment: tex }], SIM_SIZE, SIM_SIZE)
  }

  private uploadToFBO(fbo: twgl.FramebufferInfo, data: Float32Array) {
    const gl = this.gl
    const tex = fbo.attachments[0] as WebGLTexture
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIM_SIZE, SIM_SIZE, 0, gl.RGBA, gl.FLOAT, data)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  init(parsed: ParsedImage, distField: Float32Array) {
    const pack1 = (src: Float32Array) => {
      const rgba = new Float32Array(SIM_SIZE * SIM_SIZE * 4)
      for (let i = 0; i < SIM_SIZE * SIM_SIZE; i++) rgba[i * 4] = src[i]
      return rgba
    }

    const rdRGBA = new Float32Array(SIM_SIZE * SIM_SIZE * 4)
    for (let i = 0; i < SIM_SIZE * SIM_SIZE; i++) {
      rdRGBA[i * 4]     = parsed.rdUData[i]
      rdRGBA[i * 4 + 1] = parsed.rdVData[i]
    }

    this.uploadToFBO(this.golFBOs[0], pack1(parsed.golData))
    this.uploadToFBO(this.turingFBOs[0], rdRGBA)
    this.uploadToFBO(this.ecFBOs[0], pack1(parsed.ecData))
    this.uploadToFBO(this.distFieldFBO, pack1(distField))

    this.golRead = 0; this.turingRead = 0; this.ecRead = 0
  }

  private drawToFBO(
    fbo: twgl.FramebufferInfo,
    program: twgl.ProgramInfo,
    uniforms: Record<string, unknown>
  ) {
    const gl = this.gl
    twgl.bindFramebufferInfo(gl, fbo)
    gl.viewport(0, 0, SIM_SIZE, SIM_SIZE)
    gl.useProgram(program.program)
    twgl.setBuffersAndAttributes(gl, program, this.quadBuffer)
    twgl.setUniforms(program, uniforms)
    twgl.drawBufferInfo(gl, this.quadBuffer)
  }

  step(params: {
    attractionRadius: number
    attractionWeight: number
    turing: TuringParams
    ec: ECParams
  }) {
    const res = [SIM_SIZE, SIM_SIZE]

    const golWrite = 1 - this.golRead
    this.drawToFBO(this.golFBOs[golWrite], this.golProgram, {
      u_state:           this.golFBOs[this.golRead].attachments[0],
      u_distField:       this.distFieldFBO.attachments[0],
      u_resolution:      res,
      u_attractionRadius: params.attractionRadius / SIM_SIZE,
      u_attractionWeight: params.attractionWeight,
    })
    this.golRead = golWrite

    const turWrite = 1 - this.turingRead
    this.drawToFBO(this.turingFBOs[turWrite], this.turingProgram, {
      u_state:      this.turingFBOs[this.turingRead].attachments[0],
      u_resolution: res,
      u_du: params.turing.du,
      u_dv: params.turing.dv,
      u_f:  params.turing.f,
      u_k:  params.turing.k,
      u_dt: 1.0,
    })
    this.turingRead = turWrite

    const ecWrite = 1 - this.ecRead
    this.drawToFBO(this.ecFBOs[ecWrite], this.ecProgram, {
      u_state:      this.ecFBOs[this.ecRead].attachments[0],
      u_resolution: res,
      u_sigmaE: params.ec.sigmaE,
      u_sigmaI: params.ec.sigmaI,
      u_ampE:   params.ec.ampE,
      u_ampI:   params.ec.ampI,
      u_beta:   params.ec.beta,
      u_theta:  params.ec.theta,
      u_tau:    params.ec.tau,
      u_bias:   params.ec.bias,
      u_dt:     1.0,
    })
    this.ecRead = ecWrite
  }

  render(canvas: HTMLCanvasElement, weights: LayerWeights, palette: number[]) {
    const gl = this.gl
    const paddedPalette = [...palette]
    while (paddedPalette.length < 15) paddedPalette.push(1, 1, 1)

    twgl.bindFramebufferInfo(gl, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.blendProgram.program)
    twgl.setBuffersAndAttributes(gl, this.blendProgram, this.quadBuffer)
    twgl.setUniforms(this.blendProgram, {
      u_gol:     this.golFBOs[this.golRead].attachments[0],
      u_turing:  this.turingFBOs[this.turingRead].attachments[0],
      u_ec:      this.ecFBOs[this.ecRead].attachments[0],
      u_wGol:    weights.gol,
      u_wTuring: weights.turing,
      u_wEc:     weights.ec,
      'u_palette[0]': paddedPalette,
    })
    twgl.drawBufferInfo(gl, this.quadBuffer)
  }

  captureFrame(canvas: HTMLCanvasElement): Uint8ClampedArray {
    const gl = this.gl
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    twgl.bindFramebufferInfo(gl, null)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return new Uint8ClampedArray(pixels.buffer)
  }

  dispose() {}
}
