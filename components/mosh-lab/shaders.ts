/**
 * WebGL2 port of the lattice-reprojection shader.
 *
 * Fixes applied while porting (see the brief):
 *  1. camera() built its direction from iTime instead of its own `t`, so
 *     reprojecting to an older reference time used the wrong rotation and the
 *     image tore every 4s. `seg` is now taken from the raw `t` before the
 *     smoothstep reassignment.
 *  2. Points behind the reference camera are rejected (od.z > 0).
 *  3. The override flag carries the time it happened: w = -(t + 1). The reset
 *     branch recovers it with -last.w - 1 instead of stamping iTime, so a
 *     held pixel reprojects from when it was actually stamped. w < 0 remains
 *     the override test everywhere.
 *  4. The hardcoded `% 8` is a uniform, gated by a freeze toggle, and the
 *     random-colour override is replaced by a video stamp (faces | screen).
 */

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** map/trace/camera shared by every pass that touches the lattice. */
const LATTICE = `
precision highp float;
precision highp int;
precision highp sampler2D;

uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;
uniform int   uRefresh;      // rebase interval in frames
uniform bool  uFreeze;       // stop rebasing the reference time
uniform float uCamSpeed;
uniform float uScale;        // video repeats per block face
uniform int   uStampMode;    // 0 = faces, 1 = screen
uniform bool  uForceOverride;

float map(vec3 p) {
  vec3 q = abs(fract(p) - 0.5);
  q = min(q, q.zxy);
  return max(max(q.x, q.y), q.z) - 0.1;
}

float trace(vec3 ro, vec3 rd) {
  float m, t = 0.1;
  for (int i = 0; i < 400; i++) {
    m = map(ro + rd * t);
    t += m;
    if (m < 0.01 || t > 16.0) break;
  }
  return t;
}

mat3 camera(float t, out vec3 ro) {
  t *= uCamSpeed;
  float p = 4.0;
  float seg = floor(t / p);          // fix 1: from the raw t, not iTime
  float mt = mod(t, p);
  t = (t - mt) + p * smoothstep(0.0, p, mt);
  vec3 dir = vec3(cos(seg), sin(seg), 0.8);
  ro = vec3(0.1 * sin(t), 0.1 * cos(1.2 * t), 0.2 * t);
  vec3 cw = normalize(dir);
  vec3 cu = normalize(cross(vec3(0, 1, 0), cw));
  vec3 cv = normalize(cross(cw, cu));
  return mat3(cu, cv, cw);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

/** Dominant-axis face UV, so each block face carries a whole video frame. */
vec2 faceUV(vec3 p) {
  vec3 n = abs(calcNormal(p));
  vec2 uv;
  if (n.x >= n.y && n.x >= n.z)      uv = p.yz;
  else if (n.y >= n.x && n.y >= n.z) uv = p.zx;
  else                               uv = p.xy;
  return fract(uv * uScale);
}

bool isRebaseFrame() {
  return !uFreeze && uRefresh > 0 && (iFrame % uRefresh) == 0;
}

vec3 rayDir(mat3 cm, vec2 fc) {
  return cm * normalize(vec3(2.0 * fc - iResolution.xy, iResolution.y));
}
`;

/**
 * Buffer A - reprojection.
 * Stores either (coord.xy, 0, refTime) for a held pixel, or
 * (stampUV.xy, 0, -(t+1)) for a pixel that must be re-stamped this frame.
 */
export const FRAG_BUFFER_A = `#version 300 es
${LATTICE}
uniform sampler2D uPrevA;
out vec4 outColor;

void main() {
  ivec2 u = ivec2(gl_FragCoord.xy);
  vec4 last = texelFetch(uPrevA, u, 0);

  if (last.w < 0.0) {
    // fix 3: recover the time this pixel was stamped, do not stamp iTime
    outColor = vec4(gl_FragCoord.xy, 0.0, -last.w - 1.0);
    return;
  }

  vec3 ro;
  mat3 cm = camera(iTime, ro);
  vec3 rd = rayDir(cm, gl_FragCoord.xy);
  float t = trace(ro, rd);
  vec3 p = ro + rd * t;

  float pt = last.w;
  vec3 roOld;
  mat3 m = camera(pt, roOld);          // reference-time camera
  vec3 od = roOld - p;
  float odl = length(od);
  bool occ = trace(p, od / odl) - odl < 0.01;

  od = od * m;                          // into reference camera space
  occ = occ || od.z > 0.0;              // fix 2: behind the reference camera
  vec2 coord = 0.5 * (od.xy / od.z * iResolution.y + iResolution.xy);
  occ = occ || any(notEqual(floor(coord / iResolution.xy), vec2(0.0)));
  if (t > 16.0) occ = false;

  if (occ || iFrame < 3 || uForceOverride) {
    vec2 uvStamp = (uStampMode == 1 || t > 16.0)
      ? gl_FragCoord.xy / iResolution.xy
      : faceUV(p);
    outColor = vec4(uvStamp, 0.0, -(iTime + 1.0));
    return;
  }

  if (isRebaseFrame()) pt = iTime;
  outColor = vec4(coord, 0.0, pt);
}
`;

/**
 * Buffer B - the held colour buffer. Disoccluded pixels take a fresh video
 * sample at the UV Buffer A stored; everything else is gathered from the
 * previous B, through the reprojected coord on a rebase frame.
 */
export const FRAG_BUFFER_B = `#version 300 es
${LATTICE}
uniform sampler2D uBufA;
uniform sampler2D uPrevB;
uniform sampler2D uVideo;
out vec4 outColor;

void main() {
  ivec2 u = ivec2(gl_FragCoord.xy);
  vec4 tex = texelFetch(uBufA, u, 0);

  if (tex.w < 0.0) {
    outColor = vec4(texture(uVideo, tex.xy).rgb, -1.0);
    return;
  }
  if (isRebaseFrame()) u = ivec2(tex.xy);
  outColor = texelFetch(uPrevB, u, 0);
}
`;

/** Image - warp the held buffer into the current view. */
export const FRAG_IMAGE = `#version 300 es
${LATTICE}
uniform sampler2D uBufA;
uniform sampler2D uBufB;
out vec4 outColor;

void main() {
  ivec2 u = ivec2(gl_FragCoord.xy);
  vec4 tex = texelFetch(uBufA, u, 0);
  if (!isRebaseFrame() && tex.w > 0.0) u = ivec2(tex.xy);
  outColor = vec4(texelFetch(uBufB, u, 0).rgb, 1.0);
}
`;

/**
 * Live faces - every pixel re-sampled from the video this frame, no hold.
 * This is the layer at intensity ~0.33.
 */
export const FRAG_FACES = `#version 300 es
${LATTICE}
uniform sampler2D uVideo;
out vec4 outColor;

void main() {
  vec3 ro;
  mat3 cm = camera(iTime, ro);
  vec3 rd = rayDir(cm, gl_FragCoord.xy);
  float t = trace(ro, rd);
  if (t > 16.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 p = ro + rd * t;
  vec2 uv = (uStampMode == 1) ? gl_FragCoord.xy / iResolution.xy : faceUV(p);
  outColor = vec4(texture(uVideo, uv).rgb, 1.0);
}
`;

/**
 * Composite - crossfade the four layers along one intensity control.
 *   0.00 raw video | 0.33 live faces | 0.66 shader mosh | 1.00 ffmpeg mosh
 */
export const FRAG_COMPOSITE = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform vec3  iResolution;
uniform sampler2D uVideo;
uniform sampler2D uFaces;
uniform sampler2D uShader;
uniform sampler2D uFfmpeg;
uniform float uIntensity;
uniform bool  uHasFfmpeg;
uniform vec2  uVideoSize;     // intrinsic video pixels, for contain-fit
out vec4 outColor;

// letterbox the source so the raw layer is never cropped
vec3 contain(sampler2D tex, vec2 fc) {
  vec2 res = iResolution.xy;
  float sa = uVideoSize.x / max(uVideoSize.y, 1.0);
  float da = res.x / res.y;
  vec2 scale = sa > da ? vec2(1.0, da / sa) : vec2(sa / da, 1.0);
  vec2 uv = (fc / res - 0.5) / scale + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))))
    return vec3(0.0);
  return texture(tex, uv).rgb;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / iResolution.xy;

  vec3 L0 = contain(uVideo, fc);
  vec3 L1 = texture(uFaces, uv).rgb;
  vec3 L2 = texture(uShader, uv).rgb;
  vec3 L3 = uHasFfmpeg ? contain(uFfmpeg, fc) : L2;

  float x = clamp(uIntensity, 0.0, 1.0) * 3.0;
  int i = int(floor(min(x, 2.999)));
  float f = fract(min(x, 2.999));
  vec3 a = i == 0 ? L0 : (i == 1 ? L1 : L2);
  vec3 b = i == 0 ? L1 : (i == 1 ? L2 : L3);
  if (x >= 2.999) { a = L3; b = L3; f = 0.0; }
  outColor = vec4(mix(a, b, f), 1.0);
}
`;
