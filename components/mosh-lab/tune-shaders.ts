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

/**
 * Crude skin-chroma test, in the YCbCr box that most of the literature uses.
 * It is not a face detector; on a talking head framed like this one it finds
 * the face anyway, and the fold's "face" centre reports where it landed so
 * the claim can be checked rather than believed.
 */
float skin(vec3 c) {
  float Y  = luma(c);
  float Cb = 0.564 * (c.b - Y) + 0.5;
  float Cr = 0.713 * (c.r - Y) + 0.5;
  bool ok = Cb > 0.30 && Cb < 0.50 && Cr > 0.52 && Cr < 0.68 && Y > 0.15;
  return ok ? 1.0 : 0.0;
}

void main() {
  // one output texel per macroblock; average |A-C| luma inside it, and the
  // skin fraction of A, which the fold's centre pass reads from G
  vec2 blk = floor(gl_FragCoord.xy);
  float acc = 0.0, cnt = 0.0, sk = 0.0;
  for (float y = 0.5; y < 16.0; y += 1.0) {
    if (y >= uMb) break;
    for (float x = 0.5; x < 16.0; x += 1.0) {
      if (x >= uMb) break;
      vec2 px = blk * uMb + vec2(x, y);
      if (px.x > uRes.x || px.y > uRes.y) continue;
      vec2 uv = px / uRes;
      vec3 a = texture(uA, uv).rgb;
      acc += abs(luma(a) - luma(texture(uC, uv).rgb));
      sk += skin(a);
      cnt += 1.0;
    }
  }
  // stored in 0-255 luma units, the same scale the offline floor was measured in
  outColor = vec4(cnt > 0.0 ? (acc / cnt) * 255.0 : 0.0,
                  cnt > 0.0 ? sk / cnt : 0.0, 0.0, 1.0);
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

/* ---------------------------------------------------------------- inside */
/**
 * "Inside look": what the B layer looks like through the holes.
 *
 * `current` passes B through untouched. `crystal` restyles it as polarized
 * light through a thin crystal section - the look a petrographic microscope
 * gives you - without touching its motion, which is the part that took the
 * most work to make continuous. Every spatial feature here is derived from
 * the motion field or from B's own luma, so the restyle rides the same
 * movement rather than adding a second, unrelated one.
 *
 * Four things make the look, and they are separable so they can be measured:
 *
 *   interference  a thin-film palette. Film thickness maps to hue through a
 *                 cosine ramp, which is why oil slicks and crystal sections
 *                 cycle through the same order - purple, blue, teal, orange.
 *                 Thickness here is B's luma plus the filament field, so the
 *                 bands follow the content.
 *   dendrites     anisotropic value noise, stretched ALONG the motion
 *                 direction, several octaves. Stretching is what turns noise
 *                 into filaments rather than clouds, and aligning the stretch
 *                 to the field is what makes them look grown rather than
 *                 painted on.
 *   edges         the gradient of the filament field, added as white. Thin
 *                 film is brightest where thickness changes fastest, so this
 *                 is also where the real thing is brightest.
 *   black         a floor, so the gaps go to near-black instead of grey. The
 *                 reference look is mostly black; without this the palette
 *                 reads as a pastel wash.
 */
export const FRAG_INSIDE = `#version 300 es
precision highp float;
${HASH}
uniform sampler2D uB;
uniform sampler2D uMv;
uniform vec2  uRes;
uniform vec2  uGrid;
uniform float uFrame;
uniform float uSeed;
uniform int   uLook;         // 0 = current, 1 = crystal
uniform float uHueShift;
uniform float uSat;
uniform float uBandScale;    // how many interference bands across the range
uniform float uFilament;     // dendrite strength
uniform float uFilScale;     // dendrite frequency
uniform float uStretch;      // how far noise is stretched along the motion
uniform float uEdge;         // bright edge gain
uniform float uBlack;        // black floor
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/** Octaves of noise in a frame stretched along the motion: filaments. */
float dendrite(vec2 p, vec2 dir, float stretch) {
  vec2 perp = vec2(-dir.y, dir.x);
  // compress across the direction and leave it long along it
  vec2 q = vec2(dot(p, dir) / max(stretch, 0.001), dot(p, perp));
  float a = 0.0, amp = 0.5, fq = 1.0;
  for (int i = 0; i < 5; i++) {
    a += amp * vnoise(q * fq);
    fq *= 2.03;
    amp *= 0.55;
  }
  return a;
}

/**
 * Thin-film interference ramp, as explicit stops rather than a cosine.
 *
 * A cosine palette is compact but it sweeps every hue on the way round, so
 * it spends real area in olive and yellow - measured at 95% orange on a
 * first attempt, because it also cannot be stopped from pinning to one place
 * when its input has a narrow range. Explicit stops say exactly which hues
 * exist and how much of the cycle each one owns.
 *
 * The dark stop between teal and orange is not a cheat to avoid muddy
 * mixing, though it does that too: crossed polars really do show extinction
 * bands, where the section goes black between orders.
 */
vec3 crystalRamp(float t) {
  t = fract(t);
  const vec3 violet = vec3(0.28, 0.06, 0.52);
  const vec3 blue   = vec3(0.08, 0.34, 0.98);
  const vec3 teal   = vec3(0.04, 0.82, 0.74);
  const vec3 dark   = vec3(0.02, 0.03, 0.07);
  const vec3 orange = vec3(0.95, 0.47, 0.13);
  const vec3 magenta= vec3(0.72, 0.10, 0.66);
  // Leg widths are the palette's proportions, so they are set from the
  // measured histogram rather than spaced evenly. Orange returns to the dark
  // stop instead of running into magenta: that leg passed through red, which
  // measured 22% of the frame and is not in this palette at all.
  // Orange is the most saturated stop and the histogram weights by
  // saturation x value, so equal leg widths do not give equal area - two 10%
  // orange legs measured 38% of the palette, and widening the magenta legs
  // to compensate overshot to 44% magenta. These widths were solved
  // numerically against the same weighting the measurement uses, for a
  // target of roughly 26% purple, 28% blue, 16% teal, 24% orange.
  if (t < 0.120) return mix(violet, blue, t / 0.120);
  if (t < 0.289) return mix(blue, teal, (t - 0.120) / 0.169);
  if (t < 0.380) return mix(teal, dark, (t - 0.289) / 0.091);
  if (t < 0.550) return mix(dark, orange, (t - 0.380) / 0.170);
  if (t < 0.720) return mix(orange, dark, (t - 0.550) / 0.170);
  if (t < 0.800) return mix(dark, magenta, (t - 0.720) / 0.080);
  return mix(magenta, violet, (t - 0.800) / 0.200);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec3 B = texture(uB, uv).rgb;
  if (uLook == 0) { outColor = vec4(B, 1.0); return; }

  // ---- the motion this look rides on, unchanged
  vec2 cell = uRes / uGrid;
  vec2 mv = texelFetch(uMv, ivec2(floor(px / cell)), 0).rg;
  vec2 dir = length(mv) > 1e-4 ? normalize(-mv) : vec2(0.0, -1.0);

  float l = luma(B);

  // ---- dendrites, grown along the field and carried by it
  vec2 p = px * (uFilScale / 64.0) - dir * (uFrame * 0.35);
  float f = dendrite(p + uSeed * 13.0, dir, uStretch);
  float fx = dendrite(p + vec2(1.2, 0.0) + uSeed * 13.0, dir, uStretch);
  float fy = dendrite(p + vec2(0.0, 1.2) + uSeed * 13.0, dir, uStretch);

  // The filament field sits in a narrow band around its own mean, so it is
  // stretched to fill 0-1 before anything reads it. Without this the hue
  // ramp is sampled over a tiny slice of itself and the whole frame comes
  // out one colour - measured, on the first attempt, at 95% orange.
  float fn = clamp((f - 0.34) / 0.30, 0.0, 1.0);

  // ---- film thickness. The filaments lead and B's luma only nudges: B is
  // bright (mean 149) and nearly flat, so letting it lead pins the palette.
  float thick = fn * uBandScale + l * 0.22 + uHueShift;
  vec3 col = crystalRamp(thick);

  // desaturate toward the luma when asked, so the dial has a neutral end
  col = mix(vec3(luma(col)), col, clamp(uSat, 0.0, 2.0));

  // ---- brightness: only the ridges carry light, the rest goes to black.
  // The exponent is the dial, so "black floor" moves from a wash to the
  // mostly-black field the reference look actually is.
  float body = pow(clamp(fn * 1.12, 0.0, 1.0), mix(1.0, 6.0, clamp(uBlack, 0.0, 1.0)));
  body *= 0.4 + 0.6 * l;
  col *= body;

  // ---- sharp bright edges where thickness changes fastest
  float e = length(vec2(fx - f, fy - f)) * 14.0;
  col += vec3(1.0, 0.98, 0.95) * pow(clamp(e, 0.0, 1.0), 1.6) * uEdge * body;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* ----------------------------------------------------------------- fold */
/**
 * Where the fractal should sit, measured rather than guessed.
 *
 * One pass, one 1x1 output, two loops over the macroblock grid: the first
 * for the weighted centroid, the second for the spread about it. The grid is
 * 920 texels, so looping it twice inside a single fragment is cheaper than a
 * reduction chain and costs exactly one readback.
 *
 * The weight is selectable because "the region" means different things: the
 * damage itself, the fastest-moving part of the picture, or the face. The
 * face weight is a skin-chroma fraction computed per block by the diff pass,
 * which is a crude detector but an honest one on a talking head, and its
 * result is reported so it can be checked rather than trusted.
 */
export const FRAG_CENTROID = `#version 300 es
precision highp float;
uniform sampler2D uDiff;     // R = |A-C| per block, G = skin fraction
uniform sampler2D uMv;
uniform vec2  uGrid;
uniform vec2  uMvGrid;
uniform float uThreshold;
uniform int   uMode;         // 0 damage, 1 motion, 2 face, 3 frame centre
out vec4 outColor;

float weightAt(ivec2 p) {
  if (uMode == 3) return 1.0;
  if (uMode == 1) {
    vec2 g = vec2(p) / max(uGrid - 1.0, vec2(1.0)) * max(uMvGrid - 1.0, vec2(1.0));
    vec2 mv = texelFetch(uMv, ivec2(g + 0.5), 0).rg;
    return length(mv);
  }
  vec2 d = texelFetch(uDiff, p, 0).rg;
  if (uMode == 2) return d.g;
  return max(d.r - uThreshold, 0.0);
}

void main() {
  int cols = int(uGrid.x), rows = int(uGrid.y);
  float sw = 0.0;
  vec2 acc = vec2(0.0);
  for (int y = 0; y < 128; y++) {
    if (y >= rows) break;
    for (int x = 0; x < 128; x++) {
      if (x >= cols) break;
      float w = weightAt(ivec2(x, y));
      sw += w;
      acc += w * (vec2(float(x), float(y)) + 0.5);
    }
  }
  vec2 c = sw > 1e-6 ? acc / sw : uGrid * 0.5;
  float sp = 0.0;
  for (int y = 0; y < 128; y++) {
    if (y >= rows) break;
    for (int x = 0; x < 128; x++) {
      if (x >= cols) break;
      float w = weightAt(ivec2(x, y));
      vec2 d = (vec2(float(x), float(y)) + 0.5 - c) / uGrid;
      sp += w * dot(d, d);
    }
  }
  sp = sw > 1e-6 ? sqrt(sp / sw) : 0.5;
  // centre in 0-1 of the frame, then the spread, then the total weight
  outColor = vec4(c / uGrid, sp, sw);
}
`;

/**
 * FOLD: the surface mapped onto a Julia set.
 *
 * The technique behind the reference: iterate z -> z^2 + c per pixel, and use
 * two quantities from the escape as texture coordinates.
 *
 *   u  the SMOOTH iteration count. The raw count is an integer and bands
 *      hard; subtracting log2(log|z| / log(bailout)) makes it continuous, so
 *      the image maps across the bands instead of stepping between them.
 *   v  the field-line angle, arg(z) at the moment of escape. Field lines run
 *      outward perpendicular to the bands, so (u, v) is a curvilinear grid
 *      that follows the set's own structure - which is what makes a mapped
 *      image look folded into the fractal rather than printed on it.
 *
 * Tiling is mirrored so the image meets itself at every band boundary
 * instead of cutting. Bands alternate between the surface (A) and the
 * underlayer (B), so the surface folds through into what is underneath, and
 * points that never escape - the interior of the set - are all B.
 *
 * Stateless by construction: everything here is a function of this pixel,
 * this frame's textures and the uniforms. Nothing carries over, so a scrub
 * and a playthrough give the same frame.
 */
export const FRAG_FOLD = `#version 300 es
precision highp float;
uniform sampler2D uComp;     // the composite so far; alpha is the mask
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2  uRes;
uniform float uAmount;       // 0 = off
uniform vec2  uC;            // the Julia constant
uniform float uIter;
uniform float uBandDensity;
uniform float uField;        // field-line repeat
uniform float uZoom;
uniform vec2  uCenter;       // 0-1 of the frame
uniform int   uWhere;        // 0 edges, 1 inside reveals, 2 whole frame
uniform float uAlternate;    // how much the field lines also alternate A/B
uniform float uEdge;         // edge band width, px
out vec4 outColor;

const float PI = 3.14159265359;
const float BAIL = 256.0;

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }

/** 0,1,2,3 -> 0,1,0,1 with no seam: the image meets itself at every edge. */
float mirror(float t) {
  t = fract(t * 0.5) * 2.0;
  return t > 1.0 ? 2.0 - t : t;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec4 comp = texture(uComp, uv);
  if (uAmount <= 0.001) { outColor = comp; return; }

  // ---- where it applies
  float w = 1.0;
  if (uWhere == 1) {
    w = comp.a;
  } else if (uWhere == 0) {
    // the boundary of the mask: where alpha disagrees with its neighbours
    float e = 0.0;
    vec2 o = vec2(max(uEdge, 1.0)) / uRes;
    e = max(e, abs(texture(uComp, uv + vec2(o.x, 0.0)).a - comp.a));
    e = max(e, abs(texture(uComp, uv - vec2(o.x, 0.0)).a - comp.a));
    e = max(e, abs(texture(uComp, uv + vec2(0.0, o.y)).a - comp.a));
    e = max(e, abs(texture(uComp, uv - vec2(0.0, o.y)).a - comp.a));
    w = e;
  }
  w *= uAmount;
  if (w <= 0.002) { outColor = comp; return; }

  // ---- iterate, in a frame centred on the region
  float asp = uRes.x / uRes.y;
  vec2 z = (uv - uCenter) * vec2(asp, 1.0) / max(uZoom, 1e-4);
  float n = -1.0;
  for (int i = 0; i < 512; i++) {
    if (float(i) >= uIter) break;
    z = cmul(z, z) + uC;
    if (dot(z, z) > BAIL * BAIL) { n = float(i); break; }
  }

  if (n < 0.0) {
    // never escaped: the interior of the set is all underlayer
    vec3 b = texture(uB, uv).rgb;
    outColor = vec4(mix(comp.rgb, b, w), clamp(mix(comp.a, 1.0, w), 0.0, 1.0));
    return;
  }

  // ---- smooth iteration count, and the field-line angle at escape
  float sn = n + 1.0 - log2(log(length(z)) / log(BAIL));
  float ang = atan(z.y, z.x) / (2.0 * PI) + 0.5;

  float u = sn / max(uBandDensity, 0.01);
  float v = ang * max(uField, 0.01);
  vec2 st = vec2(mirror(u), mirror(v));

  // ---- alternate surface and underlayer by band, and by field line
  float byBand = mod(floor(u), 2.0);
  float byField = step(0.5, fract(v));
  float sel = mix(byBand, mod(byBand + byField, 2.0), clamp(uAlternate, 0.0, 1.0));

  vec3 sa = texture(uA, st).rgb;
  vec3 sb = texture(uB, st).rgb;
  vec3 folded = mix(sa, sb, sel);

  outColor = vec4(mix(comp.rgb, folded, w),
                  clamp(mix(comp.a, sel, w), 0.0, 1.0));
}
`;

/* -------------------------------------------------------------- stretch */
/**
 * LIVE PIXEL STRETCH: a head block, and a trail made by repeating the head's
 * edge row all the way down.
 *
 * Repeating ONE row is the whole trick. The row has structure across its
 * width and none along the trail, so the result reads as a brushed metal
 * tube - the same thing a stalled P-frame does when it keeps pushing the
 * last line it had with no fresh keyframe to correct it.
 *
 * Drawn as instanced quads rather than a full-screen pass: there are
 * hundreds of these, each with its own position, width and length, and a
 * fragment shader looping over them would cost the whole frame per pixel.
 * One quad per stretch costs only the pixels it covers.
 */
export const VERT_STRETCH = `#version 300 es
in vec2 aPos;              // unit quad: x across, y along
in vec4 iA;                // headX, headY, width, headHeight
in vec4 iB;                // trailLen, dirX, dirY, alpha
in vec4 iC;                // bendX, bendY, srcY0, srcY1
in vec4 iD;                // swell, taper, tipRound, headMix
uniform vec2 uRes;
out vec2 vLocal;
out vec4 vA;
out vec4 vB;
out vec4 vC;
out vec4 vD;

void main() {
  vLocal = aPos;
  vA = iA; vB = iB; vC = iC; vD = iD;
  float total = iA.w + iB.x;
  float t = aPos.y;                       // 0 at the head, 1 at the tip
  vec2 dir = normalize(iB.yz + vec2(1e-6, 0.0));
  vec2 across = vec2(-dir.y, dir.x);
  // the path bends quadratically, so a trail curves instead of leaning
  vec2 along = dir * (t * total) + iC.xy * (t * t);
  // widen the quad enough to hold the swell; the shape is cut in the
  // fragment stage, so the quad only has to be big enough
  float halfW = iA.z * 0.5 * (1.0 + max(iD.x, 0.0)) + 2.0;
  vec2 px = iA.xy + along + across * ((aPos.x - 0.5) * 2.0 * halfW);
  gl_Position = vec4((px / uRes) * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * The outline is cut here rather than being the quad.
 *
 * A quad gives square ends, which is the thing the reference does not have.
 * The width along the stretch is a profile - a swell near the head, a taper
 * toward the tip - and both ends close with a rounded cap, so the silhouette
 * is a droplet. The interior stays pixel-sharp: the test is a hard in/out,
 * never a blur, so the metal texture inside is untouched.
 *
 * A merged stretch carries two source rows. Which one a pixel gets is
 * decided across the width, so the two heads' pixels run side by side down
 * one shared trail rather than one overwriting the other.
 */
export const FRAG_STRETCH = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2  uRes;
uniform float uMetal;
in vec2 vLocal;
in vec4 vA;
in vec4 vB;
in vec4 vC;
in vec4 vD;
out vec4 outColor;

void main() {
  float total = vA.w + vB.x;
  float t = vLocal.y;
  float swell = vD.x, taper = vD.y, tipRound = vD.z;

  // ---- the width profile: swell, then taper to the tip
  float prof = 1.0 + swell * sin(3.14159 * pow(t, 0.7)) - taper * t;
  prof = max(prof, 0.02);
  float halfQuad = vA.z * 0.5 * (1.0 + max(swell, 0.0)) + 2.0;
  float across = (vLocal.x - 0.5) * 2.0 * halfQuad;   // px from the centre
  float halfW = vA.z * 0.5 * prof;

  // ---- rounded caps at both ends, so neither end is a cut rectangle
  float capLen = tipRound * vA.z * 0.9;
  float lenPx = t * total;
  float inside = 1.0;
  if (capLen > 0.5) {
    if (lenPx > total - capLen) {
      float d = (lenPx - (total - capLen)) / capLen;
      inside *= step(abs(across), halfW * sqrt(max(0.0, 1.0 - d * d)));
    }
    // the head end gets a shallower meniscus, not a full dome
    float hc = capLen * 0.45;
    if (lenPx < hc) {
      float d = (hc - lenPx) / hc;
      inside *= step(abs(across), halfW * sqrt(max(0.0, 1.0 - 0.75 * d * d)));
    }
  }
  if (abs(across) > halfW) inside = 0.0;
  if (inside < 0.5) discard;

  // ---- where the pixels come from
  vec2 dir = normalize(vB.yz + vec2(1e-6, 0.0));
  vec2 perp = vec2(-dir.y, dir.x);
  // a merged stretch splits its width between the two heads it came from
  float pick = step(vD.w, vLocal.x);
  float srcY = mix(vC.z, vC.w, pick);

  vec2 sp;
  if (lenPx <= vA.w) {
    // inside the head: the block itself, unstretched and pixel sharp
    sp = vA.xy + dir * lenPx + perp * across;
  } else {
    // the trail: the head's edge row, repeated along the path
    sp = vec2(vA.x + across, srcY) + perp * 0.0;
  }
  vec3 c = texture(uSrc, sp / uRes).rgb;

  if (lenPx > vA.w && uMetal > 0.0) {
    float u = (lenPx - vA.w) / max(vB.x, 1.0);
    float sheen = 1.0 + uMetal * (0.18 * sin(vLocal.x * 6.2831 - 1.2)
                                  - 0.25 * u);
    c *= clamp(sheen, 0.0, 2.0);
  }
  outColor = vec4(clamp(c, 0.0, 1.0), vB.w);
}
`;
