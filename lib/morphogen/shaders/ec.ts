export const EC_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;

uniform sampler2D u_state;
uniform vec2 u_resolution;
uniform float u_sigmaE;
uniform float u_sigmaI;
uniform float u_ampE;
uniform float u_ampI;
uniform float u_beta;
uniform float u_theta;
uniform float u_tau;
uniform float u_bias;
uniform float u_dt;

out vec4 outColor;

float sigmoid(float x) {
  return 1.0 / (1.0 + exp(-u_beta * (x - u_theta)));
}

void main() {
  vec2 px = 1.0 / u_resolution;
  float a = texture(u_state, v_texCoord).r;

  int RADIUS = 7;
  float excite = 0.0;
  float inhibit = 0.0;
  float wSumE = 0.0;
  float wSumI = 0.0;

  for (int dy = -7; dy <= 7; dy++) {
    for (int dx = -7; dx <= 7; dx++) {
      float r = length(vec2(float(dx), float(dy)));
      vec2 offset = vec2(float(dx), float(dy)) * px;
      float neighborA = texture(u_state, v_texCoord + offset).r;
      float s = sigmoid(neighborA);

      float wE = u_ampE * exp(-(r * r) / (2.0 * u_sigmaE * u_sigmaE * 49.0));
      float wI = u_ampI * exp(-(r * r) / (2.0 * u_sigmaI * u_sigmaI * 49.0));

      excite += wE * s;
      inhibit += wI * s;
      wSumE += wE;
      wSumI += wI;
    }
  }

  excite /= max(wSumE, 0.001);
  inhibit /= max(wSumI, 0.001);

  float integral = excite - inhibit;
  float da = (-a + integral + u_bias) / u_tau;
  float newA = clamp(a + da * u_dt, 0.0, 1.0);

  outColor = vec4(newA, 0.0, 0.0, 1.0);
}`
