export const BLEND_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;

uniform sampler2D u_gol;
uniform sampler2D u_turing;
uniform sampler2D u_ec;
uniform float u_wGol;
uniform float u_wTuring;
uniform float u_wEc;
uniform vec3 u_palette[5];

out vec4 outColor;

vec3 samplePalette(float t) {
  float scaled = t * 4.0;
  int idx = clamp(int(scaled), 0, 3);
  float frac = fract(scaled);
  return mix(u_palette[idx], u_palette[idx + 1], frac);
}

void main() {
  float gol     = texture(u_gol,    v_texCoord).r;
  float turing  = texture(u_turing, v_texCoord).r;
  float ec      = texture(u_ec,     v_texCoord).r;

  float blended = clamp(u_wGol * gol + u_wTuring * turing + u_wEc * ec, 0.0, 1.0);
  outColor = vec4(samplePalette(blended), 1.0);
}`
