export const TURING_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;

uniform sampler2D u_state;
uniform vec2 u_resolution;
uniform float u_du;
uniform float u_dv;
uniform float u_f;
uniform float u_k;
uniform float u_dt;

out vec4 outColor;

vec2 laplacian(vec2 uv, vec2 res) {
  vec2 px = 1.0 / res;
  vec2 center = texture(u_state, uv).rg;
  vec2 n = texture(u_state, uv + vec2(0, px.y)).rg;
  vec2 s = texture(u_state, uv - vec2(0, px.y)).rg;
  vec2 e = texture(u_state, uv + vec2(px.x, 0)).rg;
  vec2 w = texture(u_state, uv - vec2(px.x, 0)).rg;
  return n + s + e + w - 4.0 * center;
}

void main() {
  vec2 state = texture(u_state, v_texCoord).rg;
  float u = state.r;
  float v = state.g;

  vec2 lap = laplacian(v_texCoord, u_resolution);

  float uvv = u * v * v;
  float du = u_du * lap.r - uvv + u_f * (1.0 - u);
  float dv = u_dv * lap.g + uvv - (u_f + u_k) * v;

  float newU = clamp(u + du * u_dt, 0.0, 1.0);
  float newV = clamp(v + dv * u_dt, 0.0, 1.0);

  outColor = vec4(newU, newV, 0.0, 1.0);
}`
