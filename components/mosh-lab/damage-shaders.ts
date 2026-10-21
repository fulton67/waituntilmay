/**
 * THE one damage map, and the passes that read it.
 *
 * Before this, every module decided for itself what was damaged: the
 * composite recomputed a block mask, the fold asked the composite's alpha,
 * the stretch kept its own population. Three answers to one question, which
 * is why the fold only ever folded squares - it was reading the only mask
 * that existed.
 *
 * Now there is one map per frame and three kinds of damage live in three
 * channels, so the union is available and each type's share stays
 * measurable after the union is taken:
 *
 *   R  block damage      the square dissolve on the macroblock grid
 *   G  organic openings  blobs with a wobbled radius: curved outlines, no
 *                        grid in them anywhere
 *   B  stretch damage    written by the stretch pass through a colour mask,
 *                        so heads and trails are part of the same map
 *                        rather than an overlay on top of it
 *
 * A reader takes max(R, G, B) for "damaged at all" and the channels for
 * "by what".
 */

const HASH = `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/**
 * Build the map.
 *
 * The organic shape is an implicit radius: r(theta) wobbled by two
 * harmonics with per-opening phases. Two is enough to read as organic while
 * keeping the radius single valued, so the outline never crosses itself.
 * Its anchor is jittered inside the block before anything is drawn, so the
 * only thing the grid contributes is which blocks are eligible.
 */
export const FRAG_DAMAGE = `#version 300 es
precision highp float;
${HASH}
uniform sampler2D uDiff;
uniform sampler2D uDist;
uniform vec2  uRes;
uniform vec2  uGrid;
uniform float uMb;
uniform float uFrame;
uniform float uSeed;
uniform vec3  uSizeW;
uniform float uThreshold;
uniform float uBaseline;
uniform float uLifeMin;
uniform float uLifeMax;
uniform float uFadeRatio;
uniform int   uDissolve;
uniform float uSteps;
uniform float uTJitter;
uniform float uSJitter;
uniform float uShaped;
uniform float uPeak;
uniform float uGrowRadius;
uniform float uOnset;
uniform float uOrganic;
uniform float uOrgScale;
uniform float uOrgWobble;
uniform float uOrgSoft;
out vec4 outColor;

float peakShare() { return clamp(uPeak, 0.0, 1.0); }

float openAmount(vec2 blk) {
  float h0 = hash12(blk * 1.17 + uSeed);
  float life = mix(uLifeMin, uLifeMax, h0) * (1.0 + 1.6 * uShaped);
  float rest = mix(6.0, 40.0, hash12(blk * 2.31 + uSeed * 3.1))
               * mix(1.0, 0.25, uShaped);
  float period = max(life + rest, 2.0);
  float phase = hash12(blk * 0.73 + uSeed * 5.5);
  float jit = (hash13(vec3(blk, floor(uFrame / max(life, 1.0)))) - 0.5)
              * 2.0 * uTJitter * period;
  float t = mod(uFrame + phase * period + jit, period);
  if (t >= life) return 0.0;
  float fade = max(life * clamp(uFadeRatio, 0.02, 0.5), 1.0);
  float v = min(min(1.0, (t + 1.0) / fade), min(1.0, (life - t) / fade));
  return floor(v * uSteps + 0.5) / uSteps;
}

bool eligible(vec2 blk, out float revealAmt) {
  float dist = texelFetch(uDist, ivec2(blk), 0).r;
  float diff = texelFetch(uDiff, ivec2(blk), 0).r;
  revealAmt = 0.0;
  bool glitched = diff > uThreshold;
  bool base = glitched && hash12(blk * 3.77 + uSeed * 11.0) < uBaseline;
  float radius = uGrowRadius * pow(clamp(uShaped, 0.0, 1.0), max(uOnset, 0.05));
  if (dist <= radius) {
    float edge = clamp(radius - dist, 0.0, 1.0);
    if (hash12(blk * 5.19 + uSeed * 13.0) < peakShare() * mix(0.30, 1.0, edge)) {
      revealAmt = edge;
      return true;
    }
  }
  return base;
}

float sizeFor(vec2 blk) {
  float r = hash12(blk + uSeed * 7.77);
  vec3 w = max(uSizeW, vec3(0.0));
  float s = w.x + w.y + w.z;
  if (s <= 0.0) return 16.0;
  w /= s;
  if (r < w.x) return 16.0;
  if (r < w.x + w.y) return 8.0;
  return 4.0;
}

bool subOn(vec2 blk, float size, vec2 px, float fill) {
  if (fill >= 0.999) return true;
  if (fill <= 0.001) return false;
  float cell = 4.0;
  vec2 sq = floor(px / size);
  vec2 sub = floor(mod(px, size) / cell);
  float nsub = max(size / cell, 1.0);
  if (nsub <= 1.0) return fill > 0.5;
  float r = hash13(vec3(sq * 1.31 + uSeed, sub.x * 7.0 + sub.y * 13.0 + 0.5));
  if (uDissolve == 0) return r < fill;
  if (uDissolve == 1) return r < clamp(fill * 0.75 + 0.125, 0.0, 1.0);
  vec2 cen = (sub + 0.5) / nsub - 0.5;
  float rim = max(abs(cen.x), abs(cen.y)) * 2.0;
  return r < clamp(fill * (1.35 - 0.6 * rim), 0.0, 1.0);
}

float organicAt(vec2 px, vec2 blk, float amt) {
  if (uOrganic <= 0.001 || amt <= 0.001) return 0.0;
  vec2 c = (blk + vec2(hash12(blk * 9.13 + uSeed),
                       hash12(blk * 4.41 + uSeed * 2.0))) * uMb;
  vec2 d = px - c;
  float r = length(d);
  float th = atan(d.y, d.x);
  float p1 = hash12(blk * 1.91 + uSeed * 5.0) * 6.2831;
  float p2 = hash12(blk * 7.33 + uSeed * 9.0) * 6.2831;
  float a1 = 0.55 + 0.9 * hash12(blk * 2.77 + uSeed * 4.0);
  float wob = 1.0 + uOrgWobble * (a1 * sin(3.0 * th + p1)
                                  + (1.0 - a1) * sin(5.0 * th + p2)) * 0.5;
  float R = uOrgScale * uMb * amt * wob
            * (0.55 + 0.9 * hash12(blk * 3.19 + uSeed * 6.0));
  return 1.0 - smoothstep(R - max(uOrgSoft, 0.5), R + max(uOrgSoft, 0.5), r);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 blkF = px / uMb;
  vec2 blk = floor(blkF);
  if (uSJitter > 0.0) {
    vec2 j = vec2(hash12(blk + 17.0 + uSeed), hash12(blk + 29.0 + uSeed)) - 0.5;
    blk = floor(blkF + j * 2.0 * uSJitter);
  }
  blk = clamp(blk, vec2(0.0), uGrid - 1.0);

  float revealAmt = 0.0;
  bool elig = eligible(blk, revealAmt);
  float fill = elig ? openAmount(blk) : 0.0;
  if (elig && revealAmt > 0.0) fill = max(fill, revealAmt * 0.85);

  float block = (elig && subOn(blk, sizeFor(blk), px, fill)) ? 1.0 : 0.0;
  // the opening shares the block's eligibility and its fill, and nothing of
  // its shape
  float organic = elig ? organicAt(px, blk, fill) * uOrganic : 0.0;

  // a neighbour's opening can reach across, so take the strongest nearby
  for (int i = 0; i < 4; i++) {
    vec2 nb = blk + (i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0)
             : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0));
    nb = clamp(nb, vec2(0.0), uGrid - 1.0);
    float ra;
    if (eligible(nb, ra)) {
      float f2 = openAmount(nb);
      if (ra > 0.0) f2 = max(f2, ra * 0.85);
      organic = max(organic, organicAt(px, nb, f2) * uOrganic);
    }
  }

  outColor = vec4(block, organic, 0.0, 1.0);
}
`;

/**
 * Composite A with B showing through the damage map.
 *
 * Reads the shared map rather than recomputing a mask: blocks through R,
 * organic openings through G. It steps aside where the stretch pass has
 * already claimed a pixel (B), which is what lets the stretches be drawn
 * first, in the order asked for, without this painting over them.
 */
export const FRAG_OPENINGS = `#version 300 es
precision highp float;
uniform sampler2D uB;
uniform sampler2D uBloom;
uniform sampler2D uDamage;
uniform sampler2D uUnder;
uniform vec2  uRes;
uniform float uBloomMix;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 dmg = texture(uDamage, uv);
  vec3 under = texture(uUnder, uv).rgb;
  float openness = max(dmg.r, dmg.g);
  // Alpha stays 1: this is a picture, not a mask. Coverage is measured from
  // the damage map now, which is where that question belongs - carrying it
  // in the image's alpha left the undamaged part of the frame transparent,
  // and a saved still showed the page through it.
  if (openness <= 0.002 || dmg.b > 0.5) {
    outColor = vec4(under, 1.0);
    return;
  }
  vec3 b = texture(uB, uv).rgb;
  if (uBloomMix > 0.0) b = mix(b, texture(uBloom, uv).rgb, uBloomMix * 0.5);
  outColor = vec4(mix(under, b, clamp(openness, 0.0, 1.0)), 1.0);
}
`;

/** Sum four channels down to one pixel, for the per-type measurements. */
export const FRAG_SUM4 = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uSrcSize;
out vec4 outColor;
void main() {
  vec2 p = floor(gl_FragCoord.xy) * 2.0;
  vec4 s = vec4(0.0);
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 q = p + vec2(float(x), float(y));
      if (q.x >= uSrcSize.x || q.y >= uSrcSize.y) continue;
      s += texelFetch(uSrc, ivec2(q), 0);
    }
  }
  outColor = s;
}
`;

/**
 * Per-pixel fold accounting.
 *
 * R, G, B carry the fold weight at that pixel split between block, organic
 * and stretch damage in proportion to each; A carries the weight itself. Sum
 * those four and you have exactly the comparison asked for: how the fold's
 * attention divides, against how the map itself divides.
 */
export const FRAG_FOLDSTAT = `#version 300 es
precision highp float;
uniform sampler2D uDamage;
uniform vec2  uRes;
uniform float uAmount;
uniform float uSoft;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 d = texture(uDamage, uv);
  float sum = d.r + d.g + d.b;
  if (sum <= 1e-5) { outColor = vec4(0.0); return; }
  float un = max(max(d.r, d.g), d.b);
  // the same soft weighting the fold itself uses, so this measures the fold
  // that is drawn rather than an idealisation of it
  float soft = 0.0;
  vec2 o = vec2(max(uSoft, 1.0)) / uRes;
  for (int i = 0; i < 9; i++) {
    vec2 q = uv + vec2(float(i % 3) - 1.0, float(i / 3) - 1.0) * o;
    vec4 s = texture(uDamage, q);
    soft += max(max(s.r, s.g), s.b);
  }
  soft /= 9.0;
  float w = uAmount * un * soft;
  outColor = vec4(w * d.r / sum, w * d.g / sum, w * d.b / sum, w);
}
`;

/** The map's own shares, for the same reduction: block, organic, stretch. */
export const FRAG_DMGSTAT = `#version 300 es
precision highp float;
uniform sampler2D uDamage;
uniform vec2 uRes;
out vec4 outColor;
void main() {
  vec4 d = texture(uDamage, gl_FragCoord.xy / uRes);
  outColor = vec4(d.r, d.g, d.b, max(max(d.r, d.g), d.b));
}
`;

/** A plain copy, so a texture can seed a render target. */
export const FRAG_COPY = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uRes;
out vec4 outColor;
void main() { outColor = texture(uSrc, gl_FragCoord.xy / uRes); }
`;
