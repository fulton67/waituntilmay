// Vertical, audio-driven take on the "phase shift and rotation experiments" Shadertoy.
// Every geometry parameter arrives already eased from JS, so shapes morph instead of jumping.

export const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0., 1.); }`;

export const FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float uTime;
uniform float uScroll;     // accumulated vertical travel
uniform float uSpin;       // accumulated blob tumble
uniform float uKick;       // kick envelope 0..1
uniform float uSnare;      // snare / clap envelope 0..1
uniform float uBass;       // continuous low-end level 0..1
uniform float uMid;        // continuous mid level 0..1
uniform float uHigh;       // continuous high level 0..1
uniform float uIntensity;  // builds across the song 0..1
uniform vec4 uMorph;       // eased: ring depth, box spread, blob size, p-norm
uniform vec3 uTwist;       // eased: twist per unit y, ring rotation, cell rotation
uniform sampler2D uText;
out vec4 fragColor;

#define dmin(a, b) ((a.x < b.x) ? a : b)
#define minkowski(v, m) pow(dot(pow(v, v * 0. + m), v * 0. + 1.), 1. / m)

const float CELL = 10.;

vec2 pR(in vec2 p, float a) {
  return cos(a) * p + sin(a) * vec2(p.y, -p.x);
}
vec3 polar6(in vec3 p) {
  float r = .5 * 6.2831 / 6.;
  float pa = r - atan(p.x, p.y);
  pa += mod(pa, -2. * r);
  return vec3(pR(p.xy, pa), p.z);
}

vec2 f(vec3 p) {
  vec3 b = p;   // the blob stays put; the rings stream past it
  // endless vertical stack: the camera rides up through repeated rings
  p.y += uScroll;
  float cell = floor(p.y / CELL + .5);
  p.y -= CELL * cell;

  vec3 q = p;
  q.xy = pR(q.xy, uTwist.y + cell * uTwist.z);   // each ring turns a little further
  q.xz = pR(q.xz, q.y * uTwist.x);               // mids twist the column
  float pn = uMorph.w;
  float ring = minkowski(
      abs(abs(polar6(abs(q) - vec3(1., .1, uMorph.x))) - vec3(uMorph.y, 3.2 + 1.2 * uBass, 1.3)),
      pn) - (1.05 + .25 * uKick);

  b.yz = pR(b.yz, uSpin);           // vertical tumble
  b.xy = pR(b.xy, .35 * uSpin);
  float blob = minkowski(abs(b), 3.05) - (uMorph.z + .45 * uKick + .25 * uBass);

  return dmin(vec2(ring * .8, 3.), vec2(blob * .8, 5.));
}

vec3 N(in vec3 pos) {
  const vec3 eps = vec3(.002, 0, 0);
  return normalize(vec3(
    f(pos + eps.xyy).x - f(pos - eps.xyy).x,
    f(pos + eps.yxy).x - f(pos - eps.yxy).x,
    f(pos + eps.yyx).x - f(pos - eps.yyx).x));
}

void main() {
  vec2 R = iResolution.xy;
  vec2 fc = gl_FragCoord.xy;
  vec2 st = -1. + 2. * fc / R;
  float txt = texture(uText, fc / R).r;

  // camera: sways and pushes with the music, always framed for a tall screen
  float sway = .35 + .9 * uIntensity;
  vec3 ro = vec3(sway * sin(uTime * .37), .6 * sway * sin(uTime * .29), 7.2 - 1.1 * uKick - .6 * uBass);
  vec3 ta = vec3(.3 * sin(uTime * .21) * uIntensity, 0., 0.);
  vec3 gc = normalize(ta - ro);
  float roll = .12 * sin(uTime * .17) * uIntensity + .08 * uSnare;
  vec3 up = vec3(sin(roll), cos(roll), 0.);
  vec3 u = normalize(cross(gc, up));
  vec3 v = normalize(cross(u, gc));
  float fovY = 1.75 - .25 * uKick;              // tall frustum
  u *= fovY * R.x / R.y;
  v *= fovY;
  vec3 rd = normalize(gc + st.x * u + st.y * v);

  vec3 c = vec3(1.);
  float h = 1.;
  vec2 d;
  int bounces = 0;
  for (int i = 0; i < 56; ++i) {
    vec3 p = ro + rd * h;
    d = f(p);
    if (abs(d.x) < .0015) {
      vec3 n = N(p);
      float fr = d.y == 3. ? sqrt(max(0., 1. - dot(-rd, n))) : (1. - dot(-rd, n));
      c *= fr;
      ro = p + n * .01;
      rd = reflect(rd, n);
      h = 0.;
      if (++bounces > 4) break;
    }
    h += d.x;
    if (h > 60.) break;
  }

  // light floods back in with the highs; snares flash the frame negative late in the song
  c = pow(c, vec3(1.15 - .35 * uHigh));
  float flash = uSnare * smoothstep(.45, .9, uIntensity) * .85;
  c = mix(c, 1. - c, flash);
  c *= 1. - txt * (1. - flash);
  c += txt * flash;
  fragColor = vec4(c, 1);
}`;
