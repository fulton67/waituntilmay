import { Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CHEST_T, FONT, SAFE_T, clamp, easeOutBack } from "../brand";
import { Chip, Mark, Ring, glass } from "../devices/Markup";

// Image card for a beat (style DECISIONS 9; client 2026-11-09: "pop up the image of that [condition] ... circle those red spots ...
// then pop up the image of it being gone and good, like after he does the machine"). A photo of the thing he's talking about pops
// up on glass in the upper half; hairline Rings draw round the red areas (spots from research/ostad/style/tools/redness_spots.py, in
// 0..1 image coords), an X marks the before; if there is an after photo it crossfades in with a check. Every pop has its sound
// (public/sfx from scripts/sfx.py). Times in a card are seconds from the card's start.
export type Spot = { cx: number; cy: number; rx: number; ry: number; angle: number };
export type SkinCardSpec = {
  at: number; dur: number;
  before: string; after?: string; w: number; h: number;      // image paths under public/, before image size (aspect)
  spots: Spot[];
  rings: { spot: number; at: number; label?: string }[];
  no?: number;                                                // when the X pops (next to the first ring)
  afterAt?: number;                                           // when the after photo crossfades in (check at +0.2 s)
  labels?: { before?: string; after?: string };
  credit?: string;
  pos?: "top" | "chest";                                      // top: above his head (default); chest: below his chin, over the scrubs
};

const SFX_GAIN = 0.32; // about -10 dB under the voice
const S: React.FC<{ at: number; name: string; gain?: number }> = ({ at, name, gain = 1 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={Math.round(fps)} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_GAIN * gain} />
    </Sequence>
  );
};

export const SkinCard: React.FC<{ card: SkinCardSpec }> = ({ card }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = frame / fps;
  const PAD = 10, MAXW = 640, MAXH = 470; // keeps the card above his mouth
  let IW = MAXW - 2 * PAD, IH = (IW * card.h) / card.w;
  if (IH > MAXH) { IH = MAXH; IW = (IH * card.w) / card.h; }
  const CW = IW + 2 * PAD, CH = IH + 2 * PAD;
  const X = (1080 - CW) / 2, Y = card.pos === "chest" ? CHEST_T : SAFE_T + 10;
  const ix = X + PAD, iy = Y + PAD;
  const q = clamp(t / 0.36);
  const out = clamp((t - (card.dur - 0.3)) / 0.3);
  const s = (0.9 + 0.1 * easeOutBack(q, 1.3)) * (1 - 0.04 * out);
  const op = clamp(q * 2.5) * (1 - out);
  const fade = card.afterAt != null ? clamp((t - card.afterAt) / 0.35) : 0;
  const beforeEnd = card.afterAt ?? card.dur;
  const px = (sp: Spot) => ({ x: ix + sp.cx * IW, y: iy + sp.cy * IH, rx: sp.rx * IW, ry: sp.ry * IH, rot: sp.angle });
  const first = card.spots[card.rings[0]?.spot ?? 0];
  // the X / check sits above the first ring on the side away from its label (the label leader goes outward from the ring)
  const markAt = first ? (() => {
    const p = px(first), away = first.cx < 0.5 ? 1 : -1;
    return { x: Math.min(ix + IW - 44, Math.max(ix + 44, p.x + away * (p.rx * 0.7 + 30))), y: Math.max(iy + 44, p.y - p.ry - 34) };
  })() : { x: X + CW + 44, y: Y + 56 }; // no rings (a ShareAlike photo is shown unaltered): the X sits just outside the card
  const chipAt = { x: ix + 18, y: iy + 34 };
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: op }}>
        <div style={{ ...glass(30), left: X, top: Y, width: CW, height: CH, transform: `scale(${s})`, transformOrigin: "50% 40%" }}>
          <div style={{ position: "absolute", left: PAD, top: PAD, width: IW, height: IH, borderRadius: 22, overflow: "hidden" }}>
            <Img src={staticFile(card.before)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            {card.after && <Img src={staticFile(card.after)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: fade }} />}
          </div>
        </div>
        {card.credit && (
          <div style={{ position: "absolute", left: X + 6, top: Y + CH + 10, width: CW - 12, color: "rgba(255,255,255,.78)", font: `500 15px/1.25 ${FONT}`,
            textShadow: "0 1px 3px rgba(0,0,0,.45)" }}>{card.credit}</div>
        )}
        {t >= 0.3 && <Chip at={chipAt} text={fade > 0.5 ? card.labels?.after ?? "After" : card.labels?.before ?? "Before"} s={0.72 + 0.28 * easeOutBack(clamp((t - (fade > 0.5 ? card.afterAt! : 0.3)) / 0.3), 1.2)} o={clamp((t - 0.3) / 0.15)} />}
      </div>
      {card.rings.map((r, i) => {
        const p = px(card.spots[r.spot]);
        return <Ring key={i} c={{ x: p.x, y: p.y }} rx={p.rx} ry={p.ry} rot={p.rot} at={r.at} dur={Math.max(0.4, beforeEnd - r.at)} label={r.label} side={card.spots[r.spot].cx < 0.5 ? "left" : "right"} />;
      })}
      {card.no != null && <Mark p={markAt} kind="no" at={card.no} dur={Math.max(0.4, beforeEnd - card.no)} />}
      {card.afterAt != null && <Mark p={markAt} kind="yes" at={card.afterAt + 0.2} dur={card.dur - card.afterAt - 0.2} />}
      {/* sound: card open, a swish per ring + a pop for its label, tock on the X, pop + chime on the after */}
      <S at={0} name="card" />
      {card.rings.map((r, i) => <S key={`r${i}`} at={r.at} name="swish" gain={0.8} />)}
      {card.rings.map((r, i) => r.label ? <S key={`l${i}`} at={r.at + 0.68} name="pop" gain={0.7} /> : null)}
      {card.no != null && <S at={card.no} name="no" />}
      {card.afterAt != null && <S at={card.afterAt} name="pop" gain={0.8} />}
      {card.afterAt != null && <S at={card.afterAt + 0.2} name="yes" />}
    </>
  );
};
