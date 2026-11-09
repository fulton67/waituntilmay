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

/* ------------------------------------------------------------- feather */
/**
 * The P-frame feather: the three passes that smear the edge of the damage
 * outward instead of letting it stop at a macroblock boundary.
 *
 * What a datamosh actually is, in one line: a macroblock whose motion
 * vectors are re-used for a frame it was not coded for, so the decoder
 * keeps fetching from a picture that has moved on and the content slides.
 * The transitions do that by removing an I-VOP, which hands the whole frame
 * stale vectors at once. This does it to a RING of blocks around the
 * damage, one to three macroblocks wide, for a number of frames that decays
 * from the inner edge outward - so the glitch has a skirt rather than a cut
 * line.
 *
 * It is the same arithmetic as the real thing: a block's predicted content
 * is the previous picture sampled at px + mv, and this pass samples its own
 * previous output at px + mv with a weight that keeps it alive for N
 * frames. A ring block has no vector of its own - the background did not
 * move, which is exactly why the edge was hard - so the vector it repeats
 * is its damaged neighbour's. That is the duplication: the P-frame data
 * belonging to the blocks that did move is applied to the blocks beside
 * them.
 *
 * Three passes rather than one because the ring is a question about blocks
 * and the smear is a question about pixels:
 *
 *   DMGSEED   is there any damage in this block at all          -> block grid
 *   RINGMV    how far is this block from damage, and which      -> block grid
 *             vector should it repeat
 *   FEATHER   re-apply that vector to the previous output       -> full res
 *
 * Nothing outside the ring is read or written, which is the claim the PSNR
 * measurement checks: a block with no damaged neighbour inside the ring
 * width comes out of this pass bit-identical.
 */
export const FRAG_DMGSEED = `#version 300 es
precision highp float;
uniform sampler2D uDamage;
uniform vec2 uRes;
uniform float uMb;
out vec4 outColor;
void main() {
  vec2 blk = floor(gl_FragCoord.xy);
  float best = 0.0;
  // sixteen taps a block. The finest damage is a 4px cell inside a 16px
  // square, so a 4x4 grid cannot miss an opening, and the answer wanted
  // here is only "anything at all".
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 px = (blk + (vec2(float(x), float(y)) + 0.5) / 4.0) * uMb;
      vec4 d = texture(uDamage, px / uRes);
      best = max(best, max(max(d.r, d.g), d.b));
    }
  }
  outColor = vec4(best > 0.002 ? 0.0 : 1e9, best, 0.0, 1.0);
}
`;

/**
 * The ring, and the P-frame data each of its blocks borrows.
 *
 * The ring is at most three blocks, so a 7x7 search at block resolution is
 * 920 pixels times 49 taps - cheaper than three ping-pong passes, and it
 * gives the true Euclidean distance instead of a 4-connected approximation,
 * which matters because the distance is what sets the hold length.
 *
 * What a ring block borrows is a WHOLE coded block, not just a vector.
 * Duplicating P-frame data means taking a macroblock's (vector, residual)
 * pair and decoding it where it does not belong: the prediction comes from
 * the previous picture displaced by that vector, and the residual on top is
 * the change that was coded for the block it was taken from. The second
 * half is what carries the glitch outward, and it is the half that matters
 * here, because a ring block's own vector is the background's and the
 * background did not move - measured on this clip, half the coded blocks
 * are under half a pixel. Repeat that and nothing happens, which is what
 * the first attempt measured: 0.38 px carried, 1.6% off the edge.
 *
 * So the offset written here is two things added together:
 *
 *   one macroblock toward the damage   which is where the borrowed block
 *                                      sits, so sampling there is what
 *                                      "apply its data here" comes to once
 *                                      the picture is pixels and the
 *                                      bitstream is gone
 *   its longest vector                 the repeat proper. The longest among
 *                                      the blocks in reach rather than
 *                                      their mean: a mean of a mover and
 *                                      three still neighbours is a quarter
 *                                      of a mover, and vectors pointing
 *                                      different ways cancel to nothing.
 *
 * The direction toward the damage is an inverse-square-weighted mean over
 * every damaged block in reach rather than the nearest one: a figure's edge
 * is jagged at block resolution, and picking one neighbour makes the skirt
 * jagged with it.
 */
export const FRAG_RINGMV = `#version 300 es
precision highp float;
uniform sampler2D uSeed;   // R: 0 where there is damage, 1e9 where there is not
uniform sampler2D uMv;     // the motion field, px, per block
uniform vec2 uGrid;
uniform float uRing;       // ring width, blocks
uniform float uMb;         // macroblock size, px
uniform float uLen;        // the hold at the inner edge, frames
out vec4 outColor;         // rg = where to read, px; b = distance; a = in ring
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  // a damaged block is distance zero and carries no offset. It is marked
  // rather than skipped because the pixel pass interpolates this field, and
  // a hole in it would put a step back exactly where the step is being
  // taken out.
  if (texelFetch(uSeed, p, 0).r < 0.5) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  // one block further than the ring, so the weight reaches zero inside the
  // marked region and the outer edge of the skirt is not an edge
  float reach = uRing + 1.0;
  int R = int(reach + 0.5);
  float bestD = 1e9;
  vec2 dirAcc = vec2(0.0);
  float wsum = 0.0;
  vec2 held = vec2(0.0);
  float heldMag = -1.0;
  for (int dy = -4; dy <= 4; dy++) {
    for (int dx = -4; dx <= 4; dx++) {
      if (dx > R || dx < -R || dy > R || dy < -R) continue;
      float d = length(vec2(float(dx), float(dy)));
      if (d > reach + 0.001) continue;
      ivec2 q = p + ivec2(dx, dy);
      if (q.x < 0 || q.y < 0 || q.x >= int(uGrid.x) || q.y >= int(uGrid.y)) continue;
      if (texelFetch(uSeed, q, 0).r > 0.5) continue;
      bestD = min(bestD, d);
      float w = 1.0 / (1.0 + d * d);
      dirAcc += vec2(float(dx), float(dy)) * w;
      wsum += w;
      vec2 m = texelFetch(uMv, q, 0).rg;
      if (length(m) > heldMag) { heldMag = length(m); held = m; }
    }
  }
  if (wsum <= 0.0) { outColor = vec4(0.0); return; }
  vec2 dir = length(dirAcc) > 1e-5 ? normalize(dirAcc) : vec2(0.0);
  // How far in to read, per frame: far enough that content leaving the
  // damage arrives at the outer edge of the ring exactly as the hold at
  // that edge runs out. It ties the two sliders to each other instead of
  // letting the ring be a width and the length a duration with nothing
  // between them - and it is the difference between a feather and a
  // transplant. A whole macroblock a frame was measured first: it moved
  // the neighbouring block bodily outward six times over, which smeared
  // the background as well as the edge.
  float step = uRing * uMb / max(uLen, 1.0);
  outColor = vec4(dir * step + held, bestD, 1.0);
}
`;

/**
 * The smear itself.
 *
 * One sample of the PREVIOUS output, one macroblock in toward the damage
 * and along the borrowed vector, mixed with this frame's picture. That is
 * the decoder's own expression - pred(px) = ref(px + mv), an MPEG vector
 * pointing from the current picture to the reference - applied to this
 * pass's own last frame.
 *
 * It spreads because it is recursive and the previous frame is where it
 * reads. On the first frame a block at distance 1 takes the damage's
 * content; on the next, a block at distance 2 takes distance 1, which is
 * already carrying it. The bloom crawls outward one macroblock a frame, up
 * to the ring width, which is exactly what a bloom does in a stream with
 * its keyframes removed - and it is why N has to decay outward rather than
 * the ring simply being wider.
 *
 * A hold of N frames is written as a leaky one rather than a counter: keep
 * p of the previous output every frame and content stays visible for about
 * 1/(1-p) frames, so p = 1 - 1/N holds for N and decays of its own accord.
 * A counter would need a second state texture and would end every hold on
 * a hard frame, which is the edge this pass exists to remove.
 */
export const FRAG_FEATHER = `#version 300 es
precision highp float;
uniform sampler2D uSrc;    // this frame's look, after the fold
uniform sampler2D uPrev;   // the previous frame's feathered output
uniform sampler2D uRing;   // rg = offset px, b = distance in blocks, a = marked
uniform sampler2D uDamage; // the map itself, at full resolution
uniform vec2 uRes;
uniform vec2 uGrid;
uniform float uMb;
uniform float uRingW;      // ring width, blocks
uniform float uLen;        // the longest hold, frames, at the inner edge
uniform bool uReset;       // no history to carry
out vec4 outColor;

/**
 * The ring field, read between its blocks.
 *
 * Nearest would hand every pixel of a block the same hold, which is a step
 * at the block boundary - a new hard edge one macroblock out from the one
 * being softened, and measurably worse: nearest put 43.7% MORE gradient in
 * the band than the control. Bilinear by hand rather than by sampler state
 * because this is a float texture and linear filtering of one is an
 * extension rather than a guarantee.
 */
vec4 ringAt(vec2 px) {
  vec2 g = px / uMb - 0.5;
  vec2 b0 = floor(g), f = g - b0;
  ivec2 lim = ivec2(uGrid) - 1;
  ivec2 a = clamp(ivec2(b0), ivec2(0), lim);
  ivec2 b = clamp(ivec2(b0) + ivec2(1, 0), ivec2(0), lim);
  ivec2 c = clamp(ivec2(b0) + ivec2(0, 1), ivec2(0), lim);
  ivec2 d = clamp(ivec2(b0) + ivec2(1, 1), ivec2(0), lim);
  return mix(mix(texelFetch(uRing, a, 0), texelFetch(uRing, b, 0), f.x),
             mix(texelFetch(uRing, c, 0), texelFetch(uRing, d, 0), f.x), f.y);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec4 src = texture(uSrc, uv);
  if (uReset || uRingW < 0.5 || uLen < 1.0) { outColor = src; return; }
  // inside the damage, nothing: the glitch is the thing being feathered,
  // not a thing to feather over
  vec4 dmg = texture(uDamage, uv);
  if (max(max(dmg.r, dmg.g), dmg.b) > 0.002) { outColor = src; return; }
  vec4 r = ringAt(px);
  if (r.a < 0.004) { outColor = src; return; }
  // most repeats at the inner edge, none one block past the outer
  float s = clamp(1.0 - (r.b - 1.0) / max(uRingW, 1.0), 0.0, 1.0) * r.a;
  float n = uLen * s;
  if (n < 1.0) { outColor = src; return; }
  float p = clamp(1.0 - 1.0 / n, 0.0, 0.97) * s;
  vec2 q = clamp((px + r.rg) / uRes, vec2(0.0), vec2(1.0));
  vec3 held = texture(uPrev, q).rgb;
  outColor = vec4(mix(src.rgb, held, p), src.a);
}
`;
