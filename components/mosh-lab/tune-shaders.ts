/**
 * The A x B composite, as the single implementation of its own maths.
 *
 * Everything the tuning lab exposes as a control is computed here, per frame,
 * from (block coordinate, frame index, seed, config) and the three layers.
 * The offline renderer drives these same programs through Chromium rather
 * than reimplementing them, so "the offline renderer uses the same maths" is
 * true by construction instead of by careful mirroring.
 *
 * That constraint is what shapes the mask: it has to be STATELESS. The
 * earlier Python mask simulated a population of squares, spawning them in a
 * sequential loop and carrying them frame to frame - correct, but impossible
 * to evaluate for one pixel at one frame on a GPU, and impossible to scrub.
 * So a square is no longer an object that is born and dies. Every block owns
 * a cycle whose phase is a hash of its own coordinate, and the question
 * "is this block open at frame f, and how far" is answered by arithmetic on
 * that cycle. Damage still moves around, because neighbouring blocks are at
 * different points in their cycles, and it is now seekable: frame 240 looks
 * the same whether you played to it or jumped to it.
 *
 * The one exception is the bloom, which is a feedback buffer and therefore
 * genuinely path dependent. It converges within its own decay time, so a
 * scrub reconverges rather than staying wrong, and the parity check measures
 * it separately for exactly this reason.
 *
 * Passes:
 *   DIFF     |A - C| averaged per macroblock      -> R32F, block grid
 *   DILATE   one step of outward growth            -> ping-pong, block grid
 *   BLOOM    feedback buffer displaced by B's mv   -> ping-pong, full res
 *   COMP     mask + dissolve + composite            -> offscreen
 *   DRAG     grab and smear out of the squares     -> ping-pong, screen
 */

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Hashes. Integer-free so they behave identically on every driver. */
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

/* ------------------------------------------------------------------ diff */
export const FRAG_DIFF = `#version 300 es
precision highp float;
uniform sampler2D uA;
uniform sampler2D uC;
uniform vec2 uRes;        // full video resolution
uniform float uMb;        // macroblock size in px
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  // one output texel per macroblock; average |A-C| luma inside it
  vec2 blk = floor(gl_FragCoord.xy);
  float acc = 0.0, cnt = 0.0;
  for (float y = 0.5; y < 16.0; y += 1.0) {
    if (y >= uMb) break;
    for (float x = 0.5; x < 16.0; x += 1.0) {
      if (x >= uMb) break;
      vec2 px = blk * uMb + vec2(x, y);
      if (px.x > uRes.x || px.y > uRes.y) continue;
      vec2 uv = px / uRes;
      acc += abs(luma(texture(uA, uv).rgb) - luma(texture(uC, uv).rgb));
      cnt += 1.0;
    }
  }
  // stored in 0-255 luma units, the same scale the offline floor was measured in
  outColor = vec4(cnt > 0.0 ? (acc / cnt) * 255.0 : 0.0, 0.0, 0.0, 1.0);
}
`;

/* ---------------------------------------------------------------- dilate */
/** One step of growth: distance-to-glitch, in blocks, built up by repetition. */
export const FRAG_DILATE = `#version 300 es
precision highp float;
uniform sampler2D uSrc;      // R = distance so far (0 = seed, 1e9 = far)
uniform vec2 uGrid;
uniform float uStep;         // which step this is, 1-based
out vec4 outColor;

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float d = texelFetch(uSrc, p, 0).r;
  if (d <= uStep - 0.5) { outColor = vec4(d, 0.0, 0.0, 1.0); return; }
  // 4-connected: a neighbour already at step-1 puts us at step
  float best = d;
  for (int i = 0; i < 4; i++) {
    ivec2 o = i == 0 ? ivec2(1, 0) : i == 1 ? ivec2(-1, 0)
            : i == 2 ? ivec2(0, 1) : ivec2(0, -1);
    ivec2 q = p + o;
    if (q.x < 0 || q.y < 0 || q.x >= int(uGrid.x) || q.y >= int(uGrid.y)) continue;
    float nd = texelFetch(uSrc, q, 0).r;
    if (nd <= uStep - 0.5) best = min(best, uStep);
  }
  outColor = vec4(best, 0.0, 0.0, 1.0);
}
`;

/** Seed the distance field from the diff threshold. */
export const FRAG_SEED = `#version 300 es
precision highp float;
uniform sampler2D uDiff;
uniform float uThreshold;
out vec4 outColor;
void main() {
  float d = texelFetch(uDiff, ivec2(gl_FragCoord.xy), 0).r;
  outColor = vec4(d > uThreshold ? 0.0 : 1e9, 0.0, 0.0, 1.0);
}
`;

/* ----------------------------------------------------------------- bloom */
/**
 * The pre-reveal smear. A feedback buffer carrying B, displaced every frame
 * by B's own motion field, so by the time a square opens there is already
 * movement behind it to reveal rather than a static frame.
 */
export const FRAG_BLOOM = `#version 300 es
precision highp float;
uniform sampler2D uPrev;     // last frame's bloom
uniform sampler2D uB;        // layer B this frame
uniform sampler2D uMv;       // B's motion field, px, per block (RG32F)
uniform vec2 uRes;
uniform vec2 uGrid;
uniform float uStrength;     // how much of B is injected each frame
uniform float uDecay;        // how much of the smear survives
uniform float uScale;        // how far the mv displaces the feedback
uniform bool uReset;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 b = texture(uB, uv).rgb;
  if (uReset) { outColor = vec4(b, 1.0); return; }
  vec2 blk = floor(gl_FragCoord.xy / (uRes / uGrid));
  vec2 mv = texelFetch(uMv, ivec2(blk), 0).rg;
  // the field is (reference - current), so stepping BACK along it is what
  // follows the content forward
  vec2 src = (gl_FragCoord.xy - mv * uScale) / uRes;
  vec3 held = texture(uPrev, clamp(src, vec2(0.0), vec2(1.0))).rgb;
  // decay is how much of the displaced smear survives; strength is how far
  // the result is allowed to depart from this frame's B
  vec3 smear = mix(b, held, clamp(uDecay, 0.0, 0.995));
  outColor = vec4(mix(b, smear, clamp(uStrength, 0.0, 1.0)), 1.0);
}
`;

/* ------------------------------------------------------------ composite */
export const FRAG_COMP = `#version 300 es
precision highp float;
${HASH}
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform sampler2D uDiff;     // |A-C| per block, 0-255
uniform sampler2D uDist;     // distance to glitch, in blocks
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform vec2 uGrid;
uniform float uMb;
uniform float uFrame;
uniform float uSeed;

// --- squares
uniform vec3  uSizeW;        // weights for 16 / 8 / 4 px
uniform float uThreshold;    // |A-C| gate
uniform float uBaseline;     // baseline share of eligible blocks, 0-1
uniform float uLifeMin;
uniform float uLifeMax;
uniform float uFadeRatio;    // fade length as a share of life
uniform int   uDissolve;     // 0 stepped, 1 half-filled, 2 broken edges
uniform float uSteps;        // dissolve quantisation

// --- reveals
uniform float uEnv;          // the followed envelope this frame, 0-1
uniform float uShaped;       // envelope past the knee, 0-1
uniform float uPeak;         // peak coverage share, 0-1
uniform float uGrowRadius;   // blocks a reveal may grow outward
uniform float uOnset;        // onset sharpness, shapes the leading edge

// --- bloom
uniform float uBloomMix;     // how much bloom replaces B behind a square
uniform float uBloomLead;    // frames before opening that bloom shows

// --- life
uniform float uTJitter;
uniform float uSJitter;

out vec4 outColor;

/** Which square size this block uses, from its own hash and the weights. */
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

/**
 * How far this block is open at this frame, 0-1, and nothing else.
 * A block owns a cycle: period = life + rest. Its phase is a hash of its
 * coordinate, so neighbours are never in step. Stateless, so scrubbing and
 * playing give the same answer.
 */
float openAmount(vec2 blk, out float ageOut, out float lifeOut) {
  ageOut = -1.0; lifeOut = 0.0;
  float h0 = hash12(blk * 1.17 + uSeed);
  float life = mix(uLifeMin, uLifeMax, h0);
  // a reveal holds longer, so a cluster can finish opening before it closes
  life *= 1.0 + 1.6 * uShaped;
  float rest = mix(6.0, 40.0, hash12(blk * 2.31 + uSeed * 3.1));
  // more of the cycle is spent open when the envelope is up
  rest *= mix(1.0, 0.25, uShaped);
  float period = max(life + rest, 2.0);
  float phase = hash12(blk * 0.73 + uSeed * 5.5);
  float jit = (hash13(vec3(blk, floor(uFrame / max(life, 1.0)))) - 0.5)
              * 2.0 * uTJitter * period;
  float t = mod(uFrame + phase * period + jit, period);
  if (t >= life) return 0.0;
  ageOut = t; lifeOut = life;
  float fade = max(life * clamp(uFadeRatio, 0.02, 0.5), 1.0);
  float up = min(1.0, (t + 1.0) / fade);
  float dn = min(1.0, (life - t) / fade);
  float v = min(up, dn);
  // stepped: quantise the ramp so it arrives in visible steps
  return floor(v * uSteps + 0.5) / uSteps;
}

/* peak coverage acts as a cap on how much of the grown region is taken */
float peakShare() { return clamp(uPeak, 0.0, 1.0); }

/** Is this block eligible at all, and is it baseline damage or a reveal? */
bool eligible(vec2 blk, out float revealAmt) {
  float dist = texelFetch(uDist, ivec2(blk), 0).r;
  float diff = texelFetch(uDiff, ivec2(blk), 0).r;
  revealAmt = 0.0;
  bool glitched = diff > uThreshold;

  // baseline: only where A itself is broken, and only a share of those
  float keep = hash12(blk * 3.77 + uSeed * 11.0);
  bool base = glitched && keep < uBaseline;

  // a reveal is seeded at damage and grows OUTWARD from it. The radius is
  // driven by the envelope; the onset exponent shapes how abruptly the
  // leading edge arrives.
  float radius = uGrowRadius * pow(clamp(uShaped, 0.0, 1.0), max(uOnset, 0.05));
  if (dist <= radius) {
    // the edge of the growth is partial, so the region has a broken rim
    float edge = clamp(radius - dist, 0.0, 1.0);
    float keep2 = hash12(blk * 5.19 + uSeed * 13.0);
    // peak coverage is the share of the grown region that actually opens, so
    // the dial moves coverage monotonically instead of saturating near 1 and
    // letting the radius decide everything
    if (keep2 < peakShare() * mix(0.30, 1.0, edge)) {
      revealAmt = edge;
      return true;
    }
  }
  return base;
}

/** Sub-cell dissolve: which 4px cell inside a square is on at this fill. */
bool subOn(vec2 blk, float size, vec2 px, float fill) {
  if (fill >= 0.999) return true;
  if (fill <= 0.001) return false;
  float cell = 4.0;
  vec2 sq = floor(px / size);                 // which square
  vec2 sub = floor(mod(px, size) / cell);     // which sub-cell within it
  float nsub = max(size / cell, 1.0);
  if (nsub <= 1.0) return fill > 0.5;
  float r = hash13(vec3(sq * 1.31 + uSeed, sub.x * 7.0 + sub.y * 13.0 + 0.5));
  if (uDissolve == 0) {
    // stepped: a fixed scrambled order, so it fills in the same sequence
    return r < fill;
  } else if (uDissolve == 1) {
    // half-filled: biased to leave the square visibly half there
    return r < clamp(fill * 0.75 + 0.125, 0.0, 1.0);
  }
  // broken edges: the rim resists, the middle goes first
  vec2 cen = (sub + 0.5) / nsub - 0.5;
  float rim = max(abs(cen.x), abs(cen.y)) * 2.0;
  return r < clamp(fill * (1.35 - 0.6 * rim), 0.0, 1.0);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec2 blkF = px / uMb;
  vec2 blk = floor(blkF);

  // spatial jitter nudges which block a pixel asks about, so the grid itself
  // is not perfectly square
  if (uSJitter > 0.0) {
    vec2 j = vec2(hash12(blk + 17.0 + uSeed), hash12(blk + 29.0 + uSeed)) - 0.5;
    blk = floor(blkF + j * 2.0 * uSJitter);
  }
  blk = clamp(blk, vec2(0.0), uGrid - 1.0);

  vec3 A = texture(uA, uv).rgb;
  vec3 B = texture(uB, uv).rgb;

  float revealAmt = 0.0;
  bool elig = eligible(blk, revealAmt);
  float age, life;
  float fill = elig ? openAmount(blk, age, life) : 0.0;
  if (elig && revealAmt > 0.0) fill = max(fill, revealAmt * 0.85);

  float size = sizeFor(blk);
  bool on = elig && subOn(blk, size, px, fill);

  // ---- bloom leads the opening: a smear appears before the square does
  float lead = 0.0;
  if (uBloomLead > 0.0 && life > 0.0 && age >= 0.0) {
    lead = clamp(1.0 - age / uBloomLead, 0.0, 1.0);
  }
  vec3 Bsrc = B;
  if (uBloomMix > 0.0) {
    vec3 bl = texture(uBloom, uv).rgb;
    Bsrc = mix(B, bl, clamp(uBloomMix * max(lead, 0.35), 0.0, 1.0));
  }

  vec3 col = on ? Bsrc : A;

  outColor = vec4(clamp(col, 0.0, 1.0), on ? 1.0 : 0.0);
}
`;

/* ------------------------------------------------------------------ drag */
/**
 * Datamosh drag: the surface is grabbed and pulled, not blurred.
 *
 * A blur averages its neighbourhood. This repeats one pixel - the trailing
 * edge of the square the streak came from - all the way along the drag path,
 * so the result is a hard constant streak with the edge's own colour, which
 * is what a stalled P-frame actually looks like.
 *
 * Finding that edge is a march UPSTREAM: step backwards along the drag
 * direction until a square pixel is hit (the composite's alpha is the square
 * mask), and take its colour. A pixel with no square behind it inside the
 * streak length is not in the drag at all. That is also what makes the drag
 * start inside existing squares and pull outward, rather than being its own
 * independent region.
 *
 * Streaks are bands across the perpendicular axis, with a gap between them,
 * and in the gaps layer B shows through directly - so the drag tears the
 * surface open instead of painting over it.
 *
 * The feedback term is the only path-dependent part, and it is why the parity
 * check reports drag separately: like the bloom, a seeked preview has no
 * history to carry.
 */
export const FRAG_DRAG = `#version 300 es
precision highp float;
${HASH}
uniform sampler2D uComp;      // this frame's composite; alpha = square mask
uniform sampler2D uB;
uniform sampler2D uPrevDrag;
uniform sampler2D uMv;
uniform vec2  uRes;
uniform vec2  uGrid;
uniform float uFire;          // drag activity this frame, 0-1, decided on the CPU
uniform float uCoverage;      // share of streaks that actually drag
uniform int   uDirMode;       // 0 = B's vectors, 1 = vertical melt, 2 = mixed
uniform float uMelt;          // melt weight when mixed
uniform float uLength;        // streak length, px
uniform float uWidth;         // streak width, px
uniform float uGap;           // gap between streaks, px
uniform float uPersist;
uniform float uDecay;
uniform float uSeed;
uniform float uFrame;
uniform bool  uReset;
out vec4 outColor;

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec4 comp = texture(uComp, uv);

  if (uFire <= 0.0 || uLength < 1.0 || uCoverage <= 0.0) {
    outColor = comp;
    return;
  }

  // ---- direction
  vec2 cell = uRes / uGrid;
  vec2 blk = floor(px / cell);
  vec2 mv = texelFetch(uMv, ivec2(blk), 0).rg;
  // the field is (reference - current), so the content travels along -mv
  vec2 dmv = length(mv) > 1e-4 ? normalize(-mv) : vec2(0.0, -1.0);
  vec2 dmelt = vec2(0.0, -1.0);                  // down the screen
  vec2 d = uDirMode == 0 ? dmv
         : uDirMode == 1 ? dmelt
         : normalize(mix(dmv, dmelt, clamp(uMelt, 0.0, 1.0)));
  if (length(d) < 1e-4) d = dmelt;

  // ---- which streak, and is this pixel in the band or the gap
  vec2 perp = vec2(-d.y, d.x);
  float period = max(uWidth + uGap, 2.0);
  float across = dot(px, perp);
  float sIdx = floor(across / period);
  float w = uWidth * mix(0.55, 1.45, hash11(sIdx * 1.7 + uSeed));
  bool inStreak = fract(across / period) < clamp(w / period, 0.0, 1.0);

  // only a share of the streaks drag, and only while the trigger is up
  if (hash11(sIdx * 3.3 + uSeed * 7.0) > uCoverage * uFire) {
    outColor = comp;
    return;
  }

  // a square keeps its own content; the drag extends past it
  if (comp.a > 0.5) {
    outColor = comp;
    return;
  }

  // ---- march upstream for the trailing edge this streak repeats
  float lenS = uLength * mix(0.4, 1.0, hash11(sIdx * 5.1 + uSeed * 3.0));
  vec3 srcCol = vec3(0.0);
  float found = -1.0;
  for (int i = 1; i <= 64; i++) {
    float t = float(i) * 2.0;
    if (t > lenS) break;
    vec2 q = px - d * t;
    if (q.x < 0.0 || q.y < 0.0 || q.x > uRes.x || q.y > uRes.y) break;
    vec4 s = texture(uComp, q / uRes);
    if (s.a > 0.5) { found = t; srcCol = s.rgb; break; }
  }
  if (found < 0.0) {
    outColor = comp;
    return;
  }

  // ---- in the band, repeat the edge; in the gap, tear through to B
  vec3 col = inStreak ? srcCol : texture(uB, uv).rgb;

  // ---- persistence: carry the streak forward along its own direction
  if (!uReset && uPersist > 0.0) {
    vec3 held = texture(uPrevDrag, clamp((px - d) / uRes, vec2(0.0), vec2(1.0))).rgb;
    col = mix(col, held, clamp(uPersist * uDecay, 0.0, 0.95));
  }

  // the drag region is torn open, so it counts as showing B-derived content
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * Coverage: the composite's alpha says whether each pixel took B, so the
 * share is read back by averaging alpha down a mip chain rather than pulling
 * the whole frame to the CPU every frame.
 */
export const FRAG_REDUCE = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uSrcSize;
// The first step averages the composite's ALPHA, which is the mask. Every
// step after that averages its own output, which lands in RED. Reading alpha
// throughout returns the constant 1.0 this shader writes there, which is a
// perfect 100% coverage reading no matter what the mask did.
uniform bool uFromAlpha;
out vec4 outColor;
void main() {
  vec2 p = floor(gl_FragCoord.xy) * 2.0;
  // Carry the SUM and the COUNT rather than a mean. An odd level pads with
  // texels that are out of range, and averaging over a fixed 4 would fold
  // those in as zeros, biasing the result low at every level - measured at
  // about half the true coverage by the time the chain reaches 1x1.
  float s = 0.0, n = 0.0;
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 q = p + vec2(float(x), float(y));
      if (q.x >= uSrcSize.x || q.y >= uSrcSize.y) continue;
      vec4 v = texelFetch(uSrc, ivec2(q), 0);
      if (uFromAlpha) { s += v.a; n += 1.0; }
      else { s += v.r; n += v.g; }
    }
  }
  outColor = vec4(s, n, 0.0, 1.0);
}
`;
