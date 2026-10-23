/*
 * SURFACE (layer A): multiply the encoder's OWN motion vectors.
 *
 * This is the ffglitch mv-script shape from the docs' own tutorials -
 * glitch_frame() per frame, frame.mv.forward as rows of [x,y] or null,
 * overflow set to "truncate" - with two changes.
 *
 * 1. The multiplier is not a constant. It comes in through -sp as one gain
 *    per frame, built from the word envelope times the damage curve: about
 *    1 where nobody is speaking, 20+ on a concept word. ffedit's -sp parser
 *    in this build rejects floating point numbers outright, so every
 *    fractional parameter arrives multiplied by 1000 and is divided here.
 *
 * 2. It accumulates, and what it accumulates is the EXCESS - the part the
 *    gain added - not the vector itself. That one choice is what makes a
 *    gain of 1 mean clean. Carry the whole vector forward and even a gain
 *    of exactly 1 drifts away from what the encoder meant, which over a
 *    236-frame run with no keyframe in it is enough to shred the picture
 *    on its own; this clip has exactly such a run, and measuring it was
 *    how the difference showed up. Carry only the excess and the calm
 *    passages reconstruct exactly, while a concept word leaves a push that
 *    keeps going after the word has finished.
 *
 *    The (1 - accum) term is there for the same reason: a plain running
 *    sum has a DC gain of 1/(1 - accum), so "remember 90% of the last
 *    frame" would quietly mean "times ten" on top of the gain asked for,
 *    and the field would saturate against the fcode range instead of
 *    following the words. This is a leaky integrator, so accum sets how
 *    long the push lasts and nothing else.
 *
 * The clean background takes care of itself. This layer is encoded WITHOUT
 * +forcemv, so a macroblock the encoder had nothing to say about is null
 * and stays null, and one it coded as [0,0] is still [0,0] after any gain
 * you like. Nothing here spawns a vector that was not already there.
 */
let gains = null;          // one per frame, from -sp
let accum = 0;             // how much of the last amplified field carries
let clamp = 1023;          // half-pel; fcode 7 gives +-1023
let idx = 0;               // frame counter, advanced on every call
let prevX = null, prevY = null;   // the carried excess, per block

export function setup(args) {
  args.features = ["mv"];
  const p = args.params || {};
  // milli-units: -sp takes integers only in this build
  gains = p.gainsK || null;
  accum = (p.accumK ?? 0) / 1000;
  clamp = p.clamp ?? 1023;
}

export function glitch_frame(frame) {
  const f = idx++;
  const mv = frame.mv;
  if (!mv) return;
  const fwd = mv.forward;
  if (!fwd) { prevX = prevY = null; return; }   // an I frame: memory resets
  mv.overflow = "truncate";

  const h = fwd.height, w = fwd.width, n = w * h;
  if (!prevX || prevX.length !== n) {
    prevX = new Float32Array(n);
    prevY = new Float32Array(n);
  }
  const g = gains ? (gains[f] ?? 1000) / 1000 : 1;

  for (let y = 0; y < h; y++) {
    const row = fwd[y];
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const v = row[x];
      if (v === null) {
        // nothing was coded here. Leave it alone - this is the static
        // background staying clean - but let the push fade so a block
        // that goes quiet does not reawaken with an old one.
        prevX[k] *= accum; prevY[k] *= accum;
        continue;
      }
      // what the gain adds this frame, carried forward as it decays
      const cx = v[0] * (g - 1) * (1 - accum) + accum * prevX[k];
      const cy = v[1] * (g - 1) * (1 - accum) + accum * prevY[k];
      prevX[k] = cx; prevY[k] = cy;
      let ax = v[0] + cx;
      let ay = v[1] + cy;
      if (ax > clamp) ax = clamp; else if (ax < -clamp) ax = -clamp;
      if (ay > clamp) ay = clamp; else if (ay < -clamp) ay = -clamp;
      v[0] = Math.round(ax);
      v[1] = Math.round(ay);
    }
  }
}
