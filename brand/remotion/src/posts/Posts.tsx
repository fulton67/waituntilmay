import React from "react";
import { useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { C, SANS, SERIF, cl, glass, useExoFonts } from "../exo6/look";
import { curve, D24 } from "../library/motion";
import { Chip, Display, Eyebrow, Foot, H, Hi, M, Photo, Ring, Rise, Room, Text, W, cover, p } from "./kit";

// posts/Posts.tsx: the first organised grid (brand/POSTS.md). Nine posts, nine different devices, every fact from a source on the
// frame, every photo a non-patient clinic-library item shown ungraded. Each post is a composition; KEYS lists the frames exported as
// stills (the carousel = the moments its motion lands; the last key is the cover / grid tile).

const BLUE = C.blue; // all arrows and rings: one colour, one weight (memory: ostad-graphics-must-explain)

// ------------------------------------------------------------------------------------------------ 1. filler, to scale (07640)
// clinic photo: a bead of HA filler beside a blueberry for size (catalog row 7640). Device: plate -> picture, then two rings that
// name each object. Explains what words can't: how small a filler volume actually is.
export const FillerScale: React.FC = () => {
  useExoFonts();
  // full bleed (are.na board: type and labels sit on the picture); the photo's own dark top band carries the white headline
  const box = { x: 0, y: 0, w: W, h: H };
  const c = cover(768, 1024, box, 0.5, 0);
  const gel = c.pt(0.68, 0.44), berry = c.pt(0.3, 0.405);
  return (
    <Room>
      <Photo id="07640" iw={768} ih={1024} box={box} fy={0} at={0} />
      <Rise at={4} style={{ left: M, top: 70 }}><Eyebrow color="rgba(255,255,255,.78)">Hyaluronic acid filler</Eyebrow></Rise>
      <Rise at={10} style={{ left: M, top: 112, width: W - 2 * M }}><Display size={96} color="#fff">Filler, to scale.</Display></Rise>
      <Ring at={40} cx={gel.x} cy={gel.y} rx={118} ry={70} color={BLUE} />
      <Chip at={46} x={gel.x} y={gel.y + 150} anchor="c">Filler</Chip>
      <Ring at={60} cx={berry.x} cy={berry.y} rx={98} ry={98} color={BLUE} />
      <Chip at={66} x={berry.x} y={berry.y + 160} anchor="c">Blueberry</Chip>
      <Rise at={76} style={{ left: M, top: 1020, width: 700 }}><Text size={34} w={500}>A bead of filler next to a blueberry. Most syringes hold about 1 mL.</Text></Rise>
      <Foot at={20} source="Clinic photo" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 2. layering order (type only)
// his own post "How to layer your skincare properly" (row 4245): cleanser, serum, eye cream, moisturizer, sunscreen. Device: the
// layers physically stack on a skin line in the order you apply them, so the last one (sunscreen) ends up on top.
const LAYERS = ["Serum", "Eye cream", "Moisturizer", "Sunscreen"];
export const LayerOrder: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  const base = 1090, sh = 132, gap = 20, x0 = M, w = W - 2 * M;
  const wipe = p(frame, 22, D24.rowWipe, curve.sweep);
  return (
    <Room>
      <Rise at={0} style={{ left: M, top: 92 }}><Eyebrow>Your morning routine</Eyebrow></Rise>
      <Rise at={6} style={{ left: M, top: 138, width: w }}><Display size={92}>Layer it in this order.</Display></Rise>
      <Rise at={12} style={{ left: M, top: 250, width: 800 }}><Text size={29} color={C.ink2}>Each step goes on top of the last. Sunscreen is always the final layer.</Text></Rise>
      {/* the skin line, wiped clean by step 1 */}
      <div style={{ position: "absolute", left: x0, top: base + 8, width: w * wipe, height: 3, background: C.ink }} />
      <div style={{ position: "absolute", left: x0, top: base + 26, fontFamily: SANS, fontWeight: 500, fontSize: 24, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink2, opacity: wipe }}>
        1 · Cleanser: start on clean skin
      </div>
      {LAYERS.map((name, i) => {
        const at = 36 + i * 10;
        const q = p(frame, at, D24.arrive);
        const y = base - (i + 1) * (sh + gap);
        const top = i === LAYERS.length - 1;
        return (
          <div key={name} style={{ position: "absolute", left: x0, top: y - (1 - q) * 60, width: w, height: sh, opacity: q, ...glass(22), background: top ? "rgba(207,233,247,.85)" : (glass(22).background as string),
            display: "flex", alignItems: "center", gap: 28, padding: "0 34px", boxSizing: "border-box" }}>
            <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 64, color: C.ink, width: 48 }}>{i + 2}</span>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: C.ink }}>{name}</span>
            {top ? <span style={{ marginLeft: "auto", fontFamily: SANS, fontSize: 24, color: C.ink2 }}>last, on top</span> : null}
          </div>
        );
      })}
      <Foot at={20} source="Dr. Ostad, How to layer your skincare" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 3. CEG + Ferulic (00374)
// his product photo (row 374) + his "What's inside" post (row 4826). Device: the name decoded letter by letter, then one arrow lands
// on the name printed on the bottle.
const KEY: [string, string, string][] = [
  ["C", "Vitamin C", "Improves skin appearance and brightens the complexion."],
  ["E", "Vitamin E", "Anti-inflammatory. Helps skin lock in moisture."],
  ["G", "Green tea", "Anti-inflammatory. Can help reduce redness and irritation."],
  ["+", "Ferulic acid", "Helps protect against discoloration from sun exposure."],
];
export const CegFerulic: React.FC = () => {
  useExoFonts();
  const box = { x: 0, y: 0, w: 500, h: H };
  const c = cover(683, 1024, box, 0.2, 0.5);
  const name = c.pt(0.27, 0.55);
  const col = 560;
  return (
    <Room>
      <Photo id="00374" iw={683} ih={1024} box={box} fx={0.2} />
      <Rise at={4} style={{ left: col, top: 92 }}><Eyebrow>What the name means</Eyebrow></Rise>
      <Rise at={10} style={{ left: col, top: 138, width: W - col - M }}><Display size={74}>CEG + Ferulic Complex</Display></Rise>
      {KEY.map(([l, t, d], i) => (
        <Rise key={l} at={30 + i * 12} style={{ left: col, top: 360 + i * 200, width: W - col - M + 40, display: "flex", gap: 22 }}>
          <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 110, lineHeight: 0.8, color: BLUE, width: 64 }}>{l}</span>
          <span>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: C.ink }}>{t}</div>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 24, lineHeight: 1.3, color: C.ink2, marginTop: 6 }}>{d}</div>
          </span>
        </Rise>
      ))}
      <Arrow variant="curved-callout" from={{ x: col - 12, y: 300 }} to={{ x: name.x + 70, y: name.y - 60 }} start={84} end={10_000} color={BLUE} bend={-0.25} />
      <Foot at={20} source="Dr. Ostad, What’s inside" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 4. his words (08710 + row 8677)
// him at the Skin Cancer Foundation podium (row 8710) + his quote from the 2022 gala card (row 8677), word for word. Device: the line
// is laid out dim and lights word by word (progressive highlight), the highlighter lands on "skin cancer patients".
const QUOTE = "The reason I went into medicine is because I wanted to work with skin cancer patients.";
export const QuotePodium: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  const words = QUOTE.split(" ");
  const hiFrom = words.length - 3;
  return (
    <Room>
      <Photo id="08710" iw={311} ih={553} box={{ x: 560, y: 0, w: W - 560, h: H }} fx={0.05} />
      <Rise at={0} style={{ left: M, top: 92 }}><Eyebrow>Why skin cancer</Eyebrow></Rise>
      <div style={{ position: "absolute", left: M, top: 210, width: 420, fontFamily: SERIF, fontWeight: 500, fontSize: 60, lineHeight: 1.08, letterSpacing: "-0.01em" }}>
        {words.map((w, i) => {
          const lit = frame >= 14 + i * 3;
          const span = <span style={{ color: lit ? C.ink : "#bcbcbc" }}>{(i === 0 ? "“" : "") + w + (i === words.length - 1 ? "”" : "")}</span>;
          return <React.Fragment key={i}>{i >= hiFrom ? <Hi at={14 + hiFrom * 3}>{span}</Hi> : span}{i < words.length - 1 ? " " : ""}</React.Fragment>;
        })}
      </div>
      <Rise at={70} style={{ left: M, top: 1010, width: 420 }}>
        <Text size={26} w={500}>Dr. Ariel Ostad</Text>
        <Text size={22} color={C.ink2} style={{ marginTop: 6 }}>Gala Physician Co-Chair, The Skin Cancer Foundation Champions for Change Gala, 2022</Text>
      </Rise>
      <Foot at={20} source="" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 5. BCC in numbers (type only)
// his post "The facts about Basal Cell Carcinoma" (row 4018), figures from the Skin Cancer Foundation. Device: a cited counter, then
// a 1-in-3 row that fills on its line.
export const BccFacts: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  const n = curve.count(cl((frame - 16) / D24.bar)) * 3.6;
  const fill = p(frame, 60, D24.dotFill, curve.sweep);
  return (
    <Room>
      <Rise at={0} style={{ left: M, top: 92 }}><Eyebrow>Basal cell carcinoma</Eyebrow></Rise>
      <div style={{ position: "absolute", left: M - 6, top: 150, fontFamily: SERIF, fontWeight: 500, fontSize: 236, lineHeight: 1, color: C.ink, letterSpacing: "-0.03em" }}>
        {n.toFixed(1)} <span style={{ fontSize: 120 }}>million</span>
      </div>
      <Rise at={44} style={{ left: M, top: 420, width: 860 }}><Text size={38}>Americans are diagnosed with BCC each year. It is the most common skin cancer.</Text></Rise>
      <Rise at={56} style={{ left: M, top: 640, width: 860 }}><Text size={30} color={C.ink2}>More than 1 in 3 new cancers is a skin cancer.</Text></Rise>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: M + i * 296, top: 720, width: 268, height: 220, borderRadius: 24, ...(i === 0 ? {} : glass(24)),
          background: i === 0 ? `linear-gradient(90deg, ${BLUE} ${fill * 100}%, rgba(255,255,255,.55) ${fill * 100}%)` : (glass(24).background as string),
          opacity: p(frame, 56 + i * 2, D24.arrive) }} />
      ))}
      <Rise at={80} style={{ left: M, top: 1000, width: 860 }}><Text size={30} w={500}>Most are curable when found early. Get a yearly skin check with a board-certified dermatologist.</Text></Rise>
      <Foot at={20} source="Skin Cancer Foundation, via Dr. Ostad" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 6. reapply (09677 + row 4015)
// his sunscreen on the office counter (row 9677: Sun Shade C+M, Broad Spectrum SPF 40) + his "Prevention is Key!" post (row 4015):
// "Reapply your sunscreen every 2-3 hours". Device: a day timeline where the reapply windows sweep in 2-3 h after each application.
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const WINDOWS: [number, number][] = [[11, 12], [14, 15], [17, 18]];
export const Reapply: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  // full bleed: the bottle on its counter fills the frame; the day sits on one calm glass card over the blurred office
  const box = { x: 0, y: 0, w: W, h: H };
  const c = cover(768, 1024, box, 1, 0.5, 1.4);
  const spf = c.pt(0.53, 0.6);
  const cx = 540, cw = W - M - cx + 30, col = cx + 36, top = 470, step = 64;
  const hy = (h: number) => top + (h - 9) * step;
  const rule = p(frame, 20, D24.trace, curve.sweep);
  const lab = (h: number) => (h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`);
  const card = p(frame, 6, D24.arrive);
  return (
    <Room>
      <Photo id="09677" iw={768} ih={1024} box={box} fx={1} zoom={1.4} />
      <div style={{ position: "absolute", left: cx, top: 70, width: cw, height: 1150, opacity: card, transform: `translateY(${(1 - card) * 16}px)`, ...glass(24) }} />
      <Rise at={8} style={{ left: col, top: 108 }}><Eyebrow>Broad spectrum SPF 40</Eyebrow></Rise>
      <Rise at={12} style={{ left: col, top: 150, width: cw - 70 }}><Display size={72}>Reapply every 2–3 hours.</Display></Rise>
      <div style={{ position: "absolute", left: col + 96, top, width: 3, height: (18 - 9) * step * rule, background: C.ink }} />
      {HOURS.map((h, i) => (
        <div key={h} style={{ position: "absolute", left: col, top: hy(h) - 14, width: 80, textAlign: "right", fontFamily: SANS, fontSize: 22, fontWeight: 500, color: C.ink2, opacity: p(frame, 20 + i * 2, D24.arrive) }}>{lab(h)}</div>
      ))}
      <Chip at={34} x={col + 120} y={hy(9)}>Apply</Chip>
      {WINDOWS.map(([a, b], i) => {
        const q = p(frame, 48 + i * 14, D24.rowWipe, curve.sweep);
        return (
          <div key={a} style={{ position: "absolute", left: col + 112, top: hy(a), height: (b - a) * step, width: (cx + cw - 36 - col - 112) * q, borderRadius: 14, background: "#cfe9f7",
            display: "flex", alignItems: "center", paddingLeft: 22, boxSizing: "border-box", fontFamily: SANS, fontWeight: 500, fontSize: 26, color: C.ink, overflow: "hidden", whiteSpace: "nowrap" }}>
            Reapply
          </div>
        );
      })}
      <Arrow variant="curved-callout" from={{ x: cx - 10, y: 330 }} to={{ x: spf.x + 70, y: spf.y }} start={30} end={10_000} color={BLUE} bend={0.3} />
      <Foot at={20} source="Dr. Ostad, Prevention is key" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 7. fifteen years (06354)
// the Castle Connolly plaque (row 6354), cropped above the engraved plate. Device: a ring lands on the "15" seal, then fifteen ticks
// count in (a literal count of what the plaque says).
export const FifteenYears: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  const box = { x: 0, y: 0, w: W, h: 800 };
  const c = cover(768, 1024, box, 0.5, 0.28);
  const seal = c.pt(0.505, 0.39);
  const lit = Math.max(0, Math.min(15, Math.floor((frame - 50) / 2) + 1));
  return (
    <Room>
      <Photo id="06354" iw={768} ih={1024} box={box} fy={0.28} />
      <Ring at={34} cx={seal.x} cy={seal.y} rx={92} ry={92} color={BLUE} />
      <div style={{ position: "absolute", left: M, top: 860, display: "flex", gap: 24 }}>
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ width: 34, height: 64, borderRadius: 4, background: i < lit ? BLUE : "rgba(33,27,21,.12)" }} />
        ))}
      </div>
      <Rise at={50} style={{ left: M, top: 960, width: W - 2 * M }}><Display size={78}>A Castle Connolly Top Doctor for 15 years.</Display></Rise>
      <Rise at={70} style={{ left: M, top: 1150 }}><Text size={26} color={C.ink2}>Cosmetic Dermatology · 15 ticks, one per year</Text></Rise>
      <Foot at={20} source="Castle Connolly award, 2022" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 8. EMSCULPT NEO, measured (02204)
// the office EMSCULPT NEO (row 2204) + his announcement (row 2267): "an average of 30% reduction in fat and a 25% increase in muscle
// thickness with 4 sessions of Emsculpt NEO spaced a week apart". Device: before -> after bars, each with its cited counter.
export const EmsculptBars: React.FC = () => {
  const frame = useCurrentFrame();
  useExoFonts();
  const unit = 360; // 100 %
  const fat = p(frame, 40, D24.bar, curve.sweep), mus = p(frame, 62, D24.bar, curve.sweep);
  const bar = (y: number, label: string, from: number, to: number, q: number, sign: string) => {
    const v = from + (to - from) * q;
    return (
      <div style={{ position: "absolute", left: M, top: y }}>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.ink }}>{label}</div>
        <div style={{ position: "relative", marginTop: 14, height: 54, width: unit * 1.3 }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: 54, width: unit, borderRadius: 6, border: `2px dashed rgba(33,27,21,.35)`, boxSizing: "border-box" }} />
          <div style={{ position: "absolute", left: 0, top: 0, height: 54, width: unit * v, borderRadius: 6, background: BLUE }} />
        </div>
        <div style={{ marginTop: 12, fontFamily: SERIF, fontWeight: 500, fontSize: 72, color: C.ink }}>{sign}{Math.round(Math.abs(v - 1) * 100)}%</div>
      </div>
    );
  };
  return (
    <Room>
      <Photo id="02204" iw={768} ih={1024} box={{ x: 600, y: 0, w: W - 600, h: H }} fx={0.75} />
      <Rise at={4} style={{ left: M, top: 92 }}><Eyebrow>EMSCULPT NEO</Eyebrow></Rise>
      <Rise at={10} style={{ left: M, top: 138, width: 470 }}><Display size={72}>Four sessions, on average.</Display></Rise>
      {bar(400, "Fat", 1, 0.7, fat, "−")}
      {bar(700, "Muscle thickness", 1, 1.25, mus, "+")}
      <Rise at={92} style={{ left: M, top: 1010, width: 460 }}><Text size={22} color={C.ink2}>30-minute sessions, one week apart. Dashed = before. Average results from clinical studies, as cited by Dr. Ostad; individual results vary.</Text></Rise>
      <Foot at={20} source="" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ 9. the office (09035)
// the waiting room (row 9035) + the address and phone from his EMFACE post (row 5920). Device: plate then picture, the address arrives
// under it and the highlighter lands on the street.
export const Office: React.FC = () => {
  useExoFonts();
  return (
    <Room>
      <Photo id="09035" iw={1024} ih={768} box={{ x: 0, y: 0, w: W, h: 820 }} />
      <Rise at={30} style={{ left: M, top: 880 }}><Eyebrow>Visit the office</Eyebrow></Rise>
      <Rise at={36} style={{ left: M, top: 926, width: W - 2 * M }}><Display size={92}><Hi at={52}>897 Lexington Avenue</Hi></Display></Rise>
      <Rise at={44} style={{ left: M, top: 1040 }}><Text size={32}>New York, NY 10065 · Upper East Side</Text></Rise>
      <Rise at={50} style={{ left: M, top: 1092 }}><Text size={32} color={C.ink2}>(212) 517-7900</Text></Rise>
      <Foot at={20} source="Waiting room" />
    </Room>
  );
};

// ------------------------------------------------------------------------------------------------ the grid
// order = the feed, top-left first; photo / type / graphic alternate so no two type-only posts touch and no row is all photos
export const POSTS = [
  { id: "FillerScale", C: FillerScale, frames: 96, keys: [36, 58, 95] },
  { id: "LayerOrder", C: LayerOrder, frames: 96, keys: [48, 72, 95] },
  { id: "CegFerulic", C: CegFerulic, frames: 120, keys: [50, 100, 119] },
  { id: "BccFacts", C: BccFacts, frames: 120, keys: [46, 82, 119] },
  { id: "QuotePodium", C: QuotePodium, frames: 110, keys: [44, 80, 109] },
  { id: "Reapply", C: Reapply, frames: 110, keys: [44, 80, 109] },
  { id: "FifteenYears", C: FifteenYears, frames: 110, keys: [50, 82, 109] },
  { id: "EmsculptBars", C: EmsculptBars, frames: 120, keys: [70, 92, 119] },
  { id: "Office", C: Office, frames: 96, keys: [40, 72, 95] },
] as const;
