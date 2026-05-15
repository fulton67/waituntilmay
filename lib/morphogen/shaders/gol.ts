export const GOL_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;

uniform sampler2D u_state;
uniform sampler2D u_distField;
uniform vec2 u_resolution;
uniform float u_attractionRadius;
uniform float u_attractionWeight;

out vec4 outColor;

float cell(vec2 offset) {
  return texture(u_state, v_texCoord + offset / u_resolution).r;
}

void main() {
  float state = texture(u_state, v_texCoord).r;
  float d = texture(u_distField, v_texCoord).r;

  float sigma = max(u_attractionRadius, 0.001);
  float attraction = exp(-(d * d) / (2.0 * sigma * sigma));

  float neighbors =
    cell(vec2(-1,-1)) + cell(vec2(0,-1)) + cell(vec2(1,-1)) +
    cell(vec2(-1, 0)) +                    cell(vec2(1, 0)) +
    cell(vec2(-1, 1)) + cell(vec2(0, 1)) + cell(vec2(1, 1));

  float effectiveN = neighbors + u_attractionWeight * attraction * 2.0;

  float nextState;
  if (state > 0.5) {
    nextState = (effectiveN >= 2.0 && effectiveN < 3.5) ? 1.0 : 0.0;
  } else {
    nextState = (effectiveN >= 2.5 && effectiveN < 3.5) ? 1.0 : 0.0;
  }

  outColor = vec4(nextState, 0.0, 0.0, 1.0);
}`
