import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { curve, D24 } from "../../library/motion";
import {
  Corners, Fig, H, IVORY, IVORY22, IVORY60, In, Leader, NAVY, NAVY14, NAVY60, Pic, Row, Rule, Ruler, SAND, SILVER, W, Wipe,
  body, cl, cover, disp, ital, m, mono, p, useG2Fonts,
} from "./system";

// posts/g2/Grid2.tsx: the nine Grid 2 posts. Same sources as grid 1 (brand/POSTS.md table); every number and claim is from his own
// posts or the item pictured; photo dates are the clinic-library capture dates. Device per post noted above each.

const Bg: React.FC<{ c: string; children: React.ReactNode }> = ({ c, children }) => <AbsoluteFill style={{ background: c, overflow: "hidden" }}>{children}</AbsoluteFill>;
const BRAND = "Ariel Ostad MD";

// ------------------------------------------------------------------------------------------------ 01 filler, to scale
// full bleed; the photo's own dark top band carries the title; two labelled leaders name A and B; a data block on the marble.
export const G01Filler: React.FC = () => {
  useG2Fonts();
  const c = cover(768, 1024, { x: 0, y: 0, w: W, h: H }, 0.5, 0);
  const gel = c.pt(0.68, 0.44), berry = c.pt(0.3, 0.405);
  return (
    <Bg c={NAVY}>
      <Pic id="07640" iw={768} ih={1024} box={{ x: 0, y: 0, w: W, h: H }} fy={0} plate={NAVY} />
      <Corners at={4} tl={BRAND} tr="No. 01 — Injectables" color={IVORY} />
      <In at={10} style={{ left: m, top: 118 }}><div style={disp(132, IVORY)}>Filler, <span style={ital(150, SAND)}>to scale.</span></div></In>
      <Leader at={40} pts={[{ x: 930, y: 470 }, { x: 930, y: 560 }, { x: gel.x + 92, y: gel.y - 22 }]} color={NAVY}
        label={<><div style={mono(13, NAVY60)}>A</div><div style={body(22, NAVY, 500)}>Hyaluronic acid filler</div></>} labelStyle={{ left: 790, top: 400, width: 260, textAlign: "right" }} />
      <Leader at={54} pts={[{ x: 130, y: 760 }, { x: 130, y: 690 }, { x: berry.x - 70, y: berry.y + 60 }]} color={NAVY}
        label={<><div style={mono(13, NAVY60)}>B</div><div style={body(22, NAVY, 500)}>Blueberry, for scale</div></>} labelStyle={{ left: m + 22, top: 772, width: 300 }} />
      <div style={{ position: "absolute", left: 0, top: 940, width: W, height: H - 940, background: IVORY }} />
      <Row at={64} x={m} y={980} w={W - 2 * m} k="Material" v="Hyaluronic acid gel" />
      <Row at={68} x={m} y={1036} w={W - 2 * m} k="Typical syringe" v="1.0 mL" />
      <Row at={72} x={m} y={1092} w={W - 2 * m} k="Shown" v="One bead, beside a blueberry" />
      <Row at={76} x={m} y={1148} w={W - 2 * m} k="Photographed" v="In clinic, 11.07.2022" />
      <Corners at={20} bl="@drarielostad" br="Clinic photo" color={NAVY} />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 02 layer order
// type only, ivory. Five stems rise from one line, each carrying its step as a rotated label (30940781), numbered at the foot,
// with an order arrow under the line (9606895). A small key table top-right.
const STEPS = ["Cleanser, for your skin type", "Serum, for your concerns", "Eye cream", "Moisturizer, for your skin type", "Sunscreen"];
export const G02Layers: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const base = 1090, top0 = 470, x0 = 150, dx = 195;
  return (
    <Bg c={IVORY}>
      <Corners at={0} tl={BRAND} tr="No. 02 — Skincare" />
      <In at={4} style={{ left: m, top: 118 }}><div style={disp(138)}>Layer it<br /><span style={ital(158, NAVY)}>in order.</span></div></In>
      <Row at={14} x={640} y={130} w={W - m - 640} k="Steps" v="05" kw={0.5} />
      <Row at={17} x={640} y={186} w={W - m - 640} k="Ends with" v="Sunscreen" kw={0.5} />
      <Row at={20} x={640} y={242} w={W - m - 640} k="Posted" v="20.04.2023" kw={0.5} />
      <Rule at={24} x={m} y={base} w={W - 2 * m} color={NAVY} />
      {STEPS.map((s, i) => {
        const at = 30 + i * 9;
        const q = p(f, at, D24.trace, curve.sweep);
        const x = x0 + i * dx, h = (base - top0) * q, last = i === STEPS.length - 1;
        return (
          <React.Fragment key={s}>
            <div style={{ position: "absolute", left: x, top: base - h, width: last ? 3 : 1.4, height: h, background: last ? SAND : NAVY }} />
            <div style={{ position: "absolute", left: x - 44, top: base - h, width: 36, height: h, overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, writingMode: "vertical-rl", transform: "rotate(180deg)", ...body(30, NAVY, 500), whiteSpace: "nowrap" }}>{s}</div>
            </div>
            <div style={{ position: "absolute", left: x - 30, top: base + 18, width: 60, textAlign: "center", ...mono(15), opacity: p(f, at, D24.arrive) }}>{String(i + 1).padStart(2, "0")}</div>
          </React.Fragment>
        );
      })}
      <Leader at={80} pts={[{ x: x0 - 30, y: base + 74 }, { x: x0 + 4 * dx + 30, y: base + 74 }]} label={<span style={mono(13, NAVY60)}>First on — last on</span>} labelStyle={{ left: x0 + 2 * dx - 120, top: base + 88, width: 240, textAlign: "center" }} />
      <Corners at={20} bl="@drarielostad" br="Source: Dr. Ostad, How to layer your skincare properly" />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 03 CEG + Ferulic
// full-bleed product photo with concentric hairline rings centred on the bottle, an ingredient set on each ring (17962306); a navy
// spec band below (44760710).
const ING: [string, string, string, number][] = [
  ["C", "Vitamin C", "Brightens the complexion", -38],
  ["E", "Vitamin E", "Helps skin hold moisture", -8],
  ["G", "Green tea", "Calms redness and irritation", 22],
  ["+", "Ferulic acid", "Helps guard against sun discoloration", 52],
];
export const G03Ceg: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const band = 930;
  const c = cover(683, 1024, { x: 0, y: 0, w: W, h: band }, 0.25, 0.55);
  const o = c.pt(0.3, 0.52);
  const R = [150, 270, 390, 510];
  return (
    <Bg c={NAVY}>
      <Pic id="00374" iw={683} ih={1024} box={{ x: 0, y: 0, w: W, h: band }} fx={0.25} fy={0.55} />
      <svg width={W} height={band} style={{ position: "absolute", left: 0, top: 0 }}>
        {R.map((r, i) => {
          const q = p(f, 30 + i * 6, D24.trace, curve.sweep);
          const L = 2 * Math.PI * r;
          return <circle key={r} cx={o.x} cy={o.y} r={r} fill="none" stroke={NAVY} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray={L} strokeDashoffset={L * (1 - q)} transform={`rotate(-90 ${o.x} ${o.y})`} />;
        })}
      </svg>
      {ING.map(([l, t, d, a], i) => {
        const r = R[i], rad = (a * Math.PI) / 180;
        const x = o.x + r * Math.cos(rad), y = o.y + r * Math.sin(rad);
        const q = p(f, 50 + i * 8, D24.arrive);
        return (
          <div key={l} style={{ position: "absolute", left: x + 14, top: y - 22, opacity: q, transform: `translateX(${(1 - q) * 10}px)`, background: "rgba(245,242,235,.9)", padding: "8px 12px 9px", whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={mono(14, NAVY60)}>{l}</span><span style={body(22, NAVY, 500)}>{t}</span>
            </div>
            <div style={mono(12, NAVY60)}>{d}</div>
          </div>
        );
      })}
      <Corners at={4} tl={BRAND} tr="No. 03 — Medical grade skincare" />
      <Fig at={24} x={m} y={band - 40} n="3" text="CEG + Ferulic Complex, in the studio" date="18.05.2025" />
      <In at={14} style={{ left: m, top: band + 40 }}><div style={disp(92, IVORY)}>CEG + Ferulic</div></In>
      <Row at={70} x={m} y={band + 150} w={W - 2 * m} k="Format" v="Antioxidant serum" color={IVORY} line={IVORY22} />
      <Row at={73} x={m} y={band + 202} w={W - 2 * m} k="Size" v="1 fl oz · 30 mL" color={IVORY} line={IVORY22} />
      <Row at={76} x={m} y={band + 254} w={W - 2 * m} k="In your routine" v="Step 02, after cleanser" color={IVORY} line={IVORY22} />
      <Corners at={20} bl="@drarielostad" br="Source: Dr. Ostad, What's inside" color={IVORY} />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 04 BCC, by the numbers
// navy data sheet: a giant sand numeral behind (36747221), the cited values as rows, a 1-in-3 tally.
export const G04Bcc: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const n = cl((f - 10) / D24.bar) * 3.6;
  const rows: [string, string][] = [
    ["Diagnosed each year, U.S.", "An estimated 3.6 million"],
    ["New cancers that are skin cancers", "More than 1 in 3"],
    ["Most of those", "Basal cell carcinoma"],
    ["Rise in NMSC, 1994–2014", "Up to 77 %"],
    ["Found and treated early", "Usually curable"],
    ["What to do", "A yearly skin check"],
  ];
  return (
    <Bg c={NAVY}>
      <div style={{ position: "absolute", right: -40, top: 330, ...disp(560, SAND), opacity: 0.16, letterSpacing: "-0.06em", lineHeight: 0.8 }}>{n.toFixed(1)}</div>
      <Corners at={0} tl={BRAND} tr="No. 04 — Skin cancer" color={IVORY} />
      <In at={4} style={{ left: m, top: 118, width: 760 }}><div style={disp(96, IVORY)}>Basal cell carcinoma, <span style={ital(110, SAND)}>by the numbers.</span></div></In>
      <In at={30} style={{ left: m, top: 420 }}><div style={disp(210, IVORY)}>{n.toFixed(1)}<span style={disp(90, IVORY)}> million</span></div></In>
      {rows.map(([k, v], i) => <Row key={k} at={44 + i * 5} x={m} y={690 + i * 64} w={W - 2 * m} k={k} v={v} color={IVORY} line={IVORY22} kw={0.5} />)}
      <div style={{ position: "absolute", left: W - m - 3 * 40 + 8, top: 440, display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 32, height: 32, border: `1.4px solid ${IVORY60}`, background: i === 0 && f >= 60 ? SAND : "transparent", boxSizing: "border-box" }} />)}
      </div>
      <In at={60} style={{ left: W - m - 260, top: 484, width: 260, textAlign: "right", ...mono(12, IVORY60) }}>1 in 3 new cancers</In>
      <Corners at={20} bl="@drarielostad" br="Source: Skin Cancer Foundation, via Dr. Ostad" color={IVORY} />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 05 his words
// the gala photo above, the quote below on navy; words light one by one, the punch phrase lands in sand italic.
const Q = ["The", "reason", "I", "went", "into", "medicine", "is", "because", "I", "wanted", "to", "work", "with"];
export const G05Quote: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const ph = 760;
  return (
    <Bg c={NAVY}>
      <Pic id="08710" iw={311} ih={553} box={{ x: 0, y: 0, w: W, h: ph }} fy={0.2} plate={NAVY} />
      <Corners at={4} tl="Champions for Change Gala" tr="No. 05 — 12.05.2022" color={IVORY} />
      <Fig at={24} x={m} y={ph + 22} n="5" text="Dr. Ostad at the Skin Cancer Foundation podium" color={IVORY} w={800} />
      <div style={{ position: "absolute", left: m, top: ph + 92, width: W - 2 * m, ...disp(64, IVORY), lineHeight: 1.02 }}>
        {Q.map((w, i) => <span key={i} style={{ color: f >= 16 + i * 3 ? IVORY : IVORY22 }}>{(i ? " " : "“") + w}</span>)}
        <span style={{ ...ital(76, SAND), opacity: f >= 16 + Q.length * 3 ? 1 : 0.2 }}> skin cancer patients.”</span>
      </div>
      <Rule at={70} x={m} y={H - 170} w={W - 2 * m} color={IVORY22} />
      <In at={72} style={{ left: m, top: H - 150, width: 640 }}>
        <div style={body(22, IVORY, 500)}>Dr. Ariel Ostad</div>
        <div style={mono(13, IVORY60)}>Gala physician co-chair, The Skin Cancer Foundation</div>
      </In>
      <Corners at={20} br="@drarielostad" color={IVORY} />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 06 reapply
// the bottle on its counter, left; an ivory column with the day as a mono timeline, reapply windows in sand (16463981); spec rows.
const HRS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
export const G06Reapply: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const pw = 560;
  const c = cover(768, 1024, { x: 0, y: 0, w: pw, h: H }, 0.54, 0.5, 1.1);
  const spf = c.pt(0.53, 0.6);
  const cx = pw + 40, top = 470, step = 50, tl = cx + 70;
  const hy = (h: number) => top + (h - 9) * step;
  const lab = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <Bg c={IVORY}>
      <Pic id="09677" iw={768} ih={1024} box={{ x: 0, y: 0, w: pw, h: H }} fx={0.54} zoom={1.1} />
      <Corners at={0} tl={BRAND} tr="No. 06 — Sun" />
      <In at={6} style={{ left: cx, top: 118, width: W - m - cx }}><div style={disp(100)}>Every<br />2–3 <span style={ital(116)}>hours.</span></div></In>
      <Rule at={20} x={tl} y={top} w={(18 - 9) * step} vertical color={NAVY} />
      {HRS.map((h, i) => (
        <div key={h} style={{ position: "absolute", left: cx, top: hy(h) - 9, ...mono(13, NAVY60), opacity: p(f, 20 + i * 2, D24.arrive) }}>{lab(h)}</div>
      ))}
      {[[9, 9.25, "Apply"], [11, 12, "Reapply"], [14, 15, "Reapply"], [17, 18, "Reapply"]].map(([a, b, t], i) => {
        const q = p(f, 34 + i * 12, D24.rowWipe, curve.sweep);
        const first = i === 0;
        return (
          <div key={i} style={{ position: "absolute", left: tl + 16, top: hy(a as number) - (first ? 6 : 0), height: first ? 12 : ((b as number) - (a as number)) * step, width: (first ? 40 : W - m - tl - 16) * q, background: first ? NAVY : SAND }}>
            <div style={{ position: "absolute", left: first ? 56 : 14, top: first ? -9 : 6, ...mono(13, NAVY), whiteSpace: "nowrap", opacity: q }}>{t}</div>
          </div>
        );
      })}
      <Row at={70} x={cx} y={hy(18) + 50} w={W - m - cx} k="Product" v="Sun Shade C+M" kw={0.36} vSize={21} />
      <Row at={73} x={cx} y={hy(18) + 100} w={W - m - cx} k="Filter" v="Broad spectrum SPF 40" kw={0.36} vSize={21} />
      <Row at={76} x={cx} y={hy(18) + 150} w={W - m - cx} k="Size" v="1.75 oz · 50 g" kw={0.36} vSize={21} />
      <Leader at={56} pts={[{ x: cx - 10, y: 380 }, { x: spf.x + 120, y: 380 }, { x: spf.x + 64, y: spf.y - 10 }]} label={<span style={mono(12, NAVY)}>SPF 40</span>} labelStyle={{ left: spf.x + 130, top: 352 }} />
      <Fig at={24} x={m} y={H - 96} n="6" text="On the front desk" date="21.01.2022" w={480} />
      <Corners at={20} bl="@drarielostad" br="Source: Dr. Ostad, Prevention is key" />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 07 fifteen years
// a giant silver "15" behind (36747221), the plaque framed small with its caption, rows, and a 15-tick ledger that fills.
export const G07Fifteen: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const box = { x: m, y: 200, w: 480, h: 600 };
  const c = cover(768, 1024, box, 0.5, 0, 1.3);
  const seal = c.pt(0.505, 0.39);
  const lit = Math.max(0, Math.min(15, Math.floor((f - 56) / 2) + 1));
  return (
    <Bg c={IVORY}>
      <div style={{ position: "absolute", right: -30, top: 40, ...disp(940, SILVER), opacity: 0.5, letterSpacing: "-0.07em", lineHeight: 0.8 }}>15</div>
      <Corners at={0} tl={BRAND} tr="No. 07 — Recognition" />
      <Pic id="06354" iw={768} ih={1024} box={box} fy={0} zoom={1.3} plate={SILVER} />
      <Fig at={24} x={m} y={box.y + box.h + 14} n="7" text="The plaque, as delivered" date="05.10.2022" w={480} />
      <Leader at={44} pts={[{ x: 640, y: 300 }, { x: 580, y: 300 }, { x: seal.x + 70, y: seal.y - 20 }]} label={<span style={mono(13)}>15-year seal</span>} labelStyle={{ left: 650, top: 290 }} />
      <In at={10} style={{ left: 600, top: 470, width: W - m - 600 }}><div style={disp(84)}>Fifteen<br />years on<br /><span style={ital(96)}>the list.</span></div></In>
      <Row at={60} x={m} y={900} w={W - 2 * m} k="Recognition" v="Castle Connolly Top Doctor" />
      <Row at={63} x={m} y={956} w={W - 2 * m} k="Specialty" v="Cosmetic Dermatology" />
      <Row at={66} x={m} y={1012} w={W - 2 * m} k="Years" v="15" />
      <div style={{ position: "absolute", left: m, top: 1100, display: "flex", gap: 10 }}>
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ width: 56, textAlign: "center" }}>
            <div style={{ height: 54, background: i < lit ? NAVY : "transparent", border: `1.2px solid ${NAVY}`, boxSizing: "border-box" }} />
            <div style={{ ...mono(11, NAVY60), marginTop: 8 }}>{String(i + 1).padStart(2, "0")}</div>
          </div>
        ))}
      </div>
      <Corners at={20} bl="@drarielostad" br="Source: Castle Connolly award, 2022" />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 08 EMSCULPT NEO
// navy measurement column (a % ruler, before outlines, after bars, tabular values) beside the device photo.
export const G08Emsculpt: React.FC = () => {
  const f = useCurrentFrame();
  useG2Fonts();
  const pw = 440, cx = m, cw = W - pw - 2 * m - 20;
  const unit = (cw - 20) / 1.5; // 0..150 %
  const fat = p(f, 44, D24.bar, curve.sweep), mus = p(f, 66, D24.bar, curve.sweep);
  const bar = (y: number, k: string, to: number, q: number) => {
    const v = 1 + (to - 1) * q;
    return (
      <div style={{ position: "absolute", left: cx, top: y }}>
        <div style={mono(13, IVORY60)}>{k}</div>
        <div style={{ position: "relative", height: 36, marginTop: 12 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: unit, height: 36, border: `1.2px solid ${IVORY60}`, boxSizing: "border-box" }} />
          <div style={{ position: "absolute", left: 0, top: 8, width: unit * v, height: 20, background: SAND }} />
        </div>
        <div style={{ ...disp(84, IVORY), marginTop: 16, fontVariantNumeric: "tabular-nums" }}>{to < 1 ? "−" : "+"}{Math.round(Math.abs(v - 1) * 100)}<span style={disp(48, IVORY)}> %</span></div>
      </div>
    );
  };
  return (
    <Bg c={NAVY}>
      <Pic id="02204" iw={768} ih={1024} box={{ x: W - pw, y: 0, w: pw, h: H }} fx={0.62} plate={SILVER} />
      <Corners at={0} tl={BRAND} color={IVORY} />
      <Corners at={0} tr="No. 08 — Body" color={NAVY} />
      <In at={6} style={{ left: cx, top: 118, width: cw }}><div style={disp(96, IVORY)}>Four sessions, <span style={ital(110, SAND)}>a week apart.</span></div></In>
      <Ruler at={24} x={cx} y={470} len={unit * 1.5} step={unit * 0.1} vertical={false} color={IVORY} label={(i) => `${i * 50}%`} side={-1} />
      {bar(500, "Fat · before ▭  after ▬", 0.7, fat)}
      {bar(740, "Muscle thickness · before ▭  after ▬", 1.25, mus)}
      <Row at={84} x={cx} y={1010} w={cw} k="Session" v="30 minutes" color={IVORY} line={IVORY22} vSize={22} />
      <Row at={87} x={cx} y={1062} w={cw} k="Protocol" v="4 sessions, 1 week apart" color={IVORY} line={IVORY22} vSize={22} />
      <In at={92} style={{ left: cx, top: 1130, width: cw, ...mono(12, IVORY60) }}>Average results in clinical studies, as cited by Dr. Ostad. Individual results vary.</In>
      <Fig at={24} x={W - pw + 20} y={H - 100} n="8" text="In the office" date="18.12.2023" w={pw - 40} />
      <Corners at={20} bl="@drarielostad" color={IVORY} />
    </Bg>
  );
};

// ------------------------------------------------------------------------------------------------ 09 the office
// full bleed; the address set as four corner words (22772082), a mono strip with the rest.
export const G09Office: React.FC = () => {
  useG2Fonts();
  const big = (c: string): React.CSSProperties => disp(92, c);
  return (
    <Bg c={NAVY}>
      <Pic id="09035" iw={1024} ih={768} box={{ x: 0, y: 0, w: W, h: H }} plate={NAVY} />
      <In at={30} style={{ left: m, top: 70 }}><div style={big(NAVY)}>897</div></In>
      <In at={34} style={{ right: m, top: 70, textAlign: "right" }}><div style={big(NAVY)}>Lexington</div></In>
      <In at={38} style={{ left: m, bottom: 96 }}><div style={big(IVORY)}>Avenue</div></In>
      <In at={42} style={{ right: m, bottom: 96, textAlign: "right" }}><div style={big(IVORY)}>New York</div></In>
      <Wipe at={50} style={{ left: m, top: 190, ...mono(14, NAVY) }}>No. 09 — Visit · Upper East Side · NY 10065</Wipe>
      <Wipe at={56} style={{ left: m, bottom: 56, ...mono(14, IVORY) }}>(212) 517-7900 · @drarielostad</Wipe>
      <Wipe at={60} style={{ right: m, bottom: 56, ...mono(14, IVORY60), textAlign: "right" }}>Fig. 9 — Waiting room, 08.04.2022</Wipe>
    </Bg>
  );
};

export const GRID2 = [
  { id: "G01Filler", C: G01Filler, frames: 100, keys: [30, 66, 99], photo: ["07640", 0, 0, W, H, 0.5, 0.0, 1, [0, 330, W, 300]] },
  { id: "G02Layers", C: G02Layers, frames: 110, keys: [44, 80, 109], photo: null },
  { id: "G03Ceg", C: G03Ceg, frames: 110, keys: [40, 76, 109], photo: ["00374", 0, 0, W, 930, 0.25, 0.55, 1, [0, 60, W, 160]] },
  { id: "G04Bcc", C: G04Bcc, frames: 110, keys: [24, 64, 109], photo: null },
  { id: "G05Quote", C: G05Quote, frames: 110, keys: [30, 70, 109], photo: ["08710", 0, 0, W, 760, 0.5, 0.2, 1, [200, 200, 680, 480]] },
  { id: "G06Reapply", C: G06Reapply, frames: 110, keys: [44, 80, 109], photo: ["09677", 0, 0, 560, H, 0.54, 0.5, 1.1, [0, 450, 560, 400]] },
  { id: "G07Fifteen", C: G07Fifteen, frames: 110, keys: [40, 76, 109], photo: ["06354", m, 200, 480, 600, 0.5, 0, 1.3, [m, 560, 480, 230]] },
  { id: "G08Emsculpt", C: G08Emsculpt, frames: 120, keys: [56, 96, 119], photo: ["02204", W - 440, 0, 440, H, 0.62, 0.5, 1, [W - 440, 300, 440, 700]] },
  { id: "G09Office", C: G09Office, frames: 100, keys: [40, 70, 99], photo: ["09035", 0, 0, W, H, 0.5, 0.5, 1, [200, 420, 680, 500]] },
] as const;
