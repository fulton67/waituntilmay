import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import {
  Arrow, BLUE, Check, Field, Frame, Glass, H, INK, INK2, M, MUTE, RULE, SCENE, Said, Tag, W, Win, body, cl, cover, head, label, p, useG3, curve,
} from "./vid";

// posts/g3/Grid3.tsx: three carousels, each one short video in the v4 system (vid.tsx). Facts are his own words (clinic-library
// reference/ostad_transcripts.md: the Jeuveau assessment, "Dose vs Duration", the Evolus partner video, "Why you need annual skin checks"),
// reference/procedures-guide.md (Mohs: 100% of each margin), his BCC post (catalog row 4018), and the catalog data on each photo (dates,
// what the plaque / billboard says). No patient appears. Markup never lands on his face.

const CW = W - 2 * M;
const Scenes: React.FC<{ list: React.FC[] }> = ({ list }) => (
  <>
    <Field />
    {list.map((S, i) => (
      <Sequence key={i} from={i * SCENE} durationInFrames={SCENE} layout="none">
        <S />
        <Frame n={i + 1} of={list.length} />
      </Sequence>
    ))}
  </>
);
const Row: React.FC<{ at: number; k: string; v: React.ReactNode; last?: boolean }> = ({ at, k, v, last }) => {
  const f = useCurrentFrame();
  const q = p(f, at, 12);
  return (
    <div style={{ display: "flex", gap: 20, padding: "16px 0", borderBottom: last ? "none" : `1px solid rgba(32,37,50,.12)`, opacity: q, transform: `translateY(${(1 - q) * 8}px)` }}>
      <div style={{ ...label(16, MUTE), width: 170, flexShrink: 0, paddingTop: 5 }}>{k}</div>
      <div style={body(25, INK, 500)}>{v}</div>
    </div>
  );
};
const End: React.FC<{ at: number; y: number }> = ({ at, y }) => (
  <Glass at={at} x={M} y={y} w={CW} pad={34}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={head(46)}>Book a consultation.</div>
        <div style={{ ...body(23, INK2), marginTop: 8 }}>(212) 517-7900 · 897 Lexington Ave, Upper East Side</div>
      </div>
      <div style={{ ...label(17, "#fff"), background: BLUE, borderRadius: 999, padding: "14px 22px" }}>Link in bio</div>
    </div>
  </Glass>
);

// =============================================================================================== 1  JEUVEAU: the assessment
const J1: React.FC = () => (
  <>
    <Tag at={0} text="Neuromodulators · Jeuveau" x={M} y={60} />
    <div style={{ position: "absolute", right: M, top: 74, ...label(17, MUTE) }}>Times Square · 20.03.2025</div>
    <Win id="00538" at={2} x={M} y={150} w={CW} h={880} fy={0.32} />
    <Said at={14} text="Before I inject anything, I want to see how your face moves." keys={["moves"]} x={M} y={1080} w={CW} px={56} />
  </>
);
const STEPS: [string, string][] = [
  ["At rest", "The lines already there, where the brows sit, any asymmetry."],
  ["Frown", "The corrugators on either side and the procerus in the centre."],
  ["Raise the brows", "How the forehead muscles pull on the skin."],
  ["Smile and squint", "Muscles that work in opposition to one another."],
];
const J2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Tag at={0} text="The assessment" x={M} y={60} />
      <Win id="him_r22" at={0} x={M} y={150} w={410} h={729} fy={0.2} />
      <Glass at={6} x={510} y={150} w={W - M - 510} h={729} pad={34}>
        <div style={label(17, MUTE)}>What he checks, in order</div>
        {STEPS.map(([t, d], i) => (
          <div key={t} style={{ display: "flex", gap: 18, marginTop: i ? 30 : 30, opacity: p(f, 10 + i * 7, 12) }}>
            <Check on={p(f, 14 + i * 7, 10, curve.sweep)} />
            <div>
              <div style={head(32)}>{t}</div>
              <div style={{ ...body(21, INK2), marginTop: 6 }}>{d}</div>
            </div>
          </div>
        ))}
      </Glass>
      <Said at={40} text="It's all about understanding how the muscles are moving." keys={["muscles", "moving"]} x={M} y={940} w={CW} px={52} />
    </>
  );
};
const J3: React.FC = () => {
  const box = { w: 520, h: 700 };
  const c = cover("00896", box, 0.5, 0.5);
  const vial = c.pt(0.3, 0.62);
  return (
    <>
      <Tag at={0} text="What it is" x={M} y={60} />
      <Win id="00896" at={0} x={M} y={150} w={box.w} h={box.h} />
      <Glass at={8} x={520} y={330} w={W - M - 520} pad={30}>
        <Row at={12} k="Product" v="Jeuveau" />
        <Row at={15} k="Drug" v="prabotulinumtoxinA-xvfs" />
        <Row at={18} k="Vial" v="100 units, single dose" />
        <Row at={21} k="Made by" v="Evolus" />
        <Row at={24} k="Used for" v="Moderate to severe frown lines between the brows, in adults. Temporary." last />
      </Glass>
      <Arrow at={30} pts={[{ x: 540, y: 300 }, { x: 470, y: 250 }, { x: M + vial.x + 30, y: 150 + vial.y - 60 }]} curveIt />
      <Said at={36} text="What makes Jeuveau phenomenal is its ability to be so precise." keys={["precise"]} x={M} y={990} w={CW} px={52} />
    </>
  );
};
const J4: React.FC = () => {
  const f = useCurrentFrame();
  const x0 = 240, x1 = CW - 40, mo = (m: number) => x0 + ((x1 - x0) * m) / 6;
  const a = p(f, 14, 20, curve.sweep), b = p(f, 26, 26, curve.sweep);
  return (
    <>
      <Tag at={0} text="Dose vs duration" x={M} y={60} />
      <Glass at={0} x={M} y={150} w={CW} h={640} pad={40}>
        <div style={head(44)}>How long it lasts depends on the dose.</div>
        <div style={{ position: "absolute", left: 0, top: 170, width: CW }}>
          {[0, 1, 2, 3, 4, 5, 6].map((m) => (
            <div key={m} style={{ position: "absolute", left: mo(m), top: 0, height: 330, width: 1, background: RULE }}>
              <div style={{ position: "absolute", top: 340, left: -30, width: 60, textAlign: "center", ...label(16, MUTE) }}>{m}</div>
            </div>
          ))}
          <div style={{ position: "absolute", left: mo(6) - 80, top: 372, ...label(16, MUTE) }}>months</div>
          {/* row A */}
          <div style={{ position: "absolute", left: 40, top: 46, width: 180, ...body(21, INK2, 500) }}>A reduced amount</div>
          {[0, 2, 4].map((s, i) => (
            <div key={s} style={{ position: "absolute", left: mo(s) + 4, top: 40, height: 46, borderRadius: 14, width: (mo(s + 1.8) - mo(s)) * cl(a * 3 - i), background: "rgba(142,142,142,.35)" }} />
          ))}
          <div style={{ position: "absolute", left: x0, top: 100, ...body(19, MUTE), opacity: a }}>Back in the chair every couple of months.</div>
          {/* row B */}
          <div style={{ position: "absolute", left: 40, top: 196, width: 180, ...body(21, INK, 500) }}>The full dose, safely</div>
          <div style={{ position: "absolute", left: mo(0) + 4, top: 190, height: 46, borderRadius: 14, width: (mo(6) - mo(0) - 8) * b, background: `linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 62%, rgba(55,169,232,.35) 100%)` }} />
          <div style={{ position: "absolute", left: mo(4), top: 250, ...body(19, INK), opacity: b }}>Lasts 4 to 6 months.</div>
        </div>
      </Glass>
      <Said at={40} text="The results last truly four, five, even six months." keys={["four", "five", "six"]} x={M} y={850} w={CW} px={56} />
      <div style={{ position: "absolute", left: M, top: 1060, width: CW, ...body(22, MUTE), opacity: p(useCurrentFrame(), 50, 12) }}>Dr. Ostad on discount injectables, where a smaller amount is used and the effect wears off sooner.</div>
    </>
  );
};
const J5: React.FC = () => (
  <>
    <Tag at={0} text="His approach" x={M} y={60} />
    <Win id="him_r72" at={0} x={M} y={150} w={380} h={560} fy={0.18} />
    <Glass at={6} x={480} y={150} w={W - M - 480} h={560} pad={40}>
      <div style={head(54)}>“We’re not trying to make somebody look <span style={{ color: BLUE }}>frozen.</span>”</div>
      <div style={{ ...body(22, INK2), marginTop: 28 }}>Dr. Ariel Ostad, cosmetic dermatologist. 29 years in practice on the Upper East Side.</div>
    </Glass>
    <End at={18} y={770} />
    <div style={{ position: "absolute", left: M, top: 990, width: CW, ...body(17, MUTE) }}>Jeuveau temporarily improves the look of moderate to severe frown lines in adults. Its effects may spread hours to weeks after injection and cause serious symptoms; get help right away for trouble swallowing, speaking or breathing, eye problems or muscle weakness. Full safety information: evolusrx.com.</div>
  </>
);
export const P3Jeuveau: React.FC = () => { useG3(); return <Scenes list={[J1, J2, J3, J4, J5]} />; };

// =============================================================================================== 2  MOHS: what actually happens
const M1: React.FC = () => (
  <>
    <Tag at={0} text="Skin cancer · Mohs surgery" x={M} y={60} />
    <div style={{ position: "absolute", right: M, top: 74, ...label(17, MUTE) }}>NYU Langone · 17.06.2021</div>
    <Win id="10782" at={2} x={M} y={150} w={CW} h={880} fy={0.3} />
    <Glass at={10} x={M + 30} y={880} w={560} pad={26}>
      <div style={head(36)}>What actually happens in Mohs surgery</div>
      <div style={{ ...label(16, MUTE), marginTop: 12 }}>From a Mohs surgeon · 5 slides</div>
    </Glass>
    <Said at={18} text="Early detection leads to a cure." keys={["cure"]} x={M} y={1095} w={CW} px={58} />
  </>
);
// a skin block in section: what you see vs the roots, and the first thin layer
const M2: React.FC = () => {
  const f = useCurrentFrame();
  const L = { x: 120, w: CW - 200, top: 330 };
  const epi = 34, der = 230, fat = 120;
  const lift = p(f, 30, 18) * 46;
  const xL = M + L.x, xR = M + L.x + L.w, y0 = L.top + 150;
  const cut = `M${xL + 230} ${y0} C ${xL + 260} ${y0 + 190}, ${xR - 260} ${y0 + 190}, ${xR - 230} ${y0} Z`;
  const tumour = `M${xL + 330} ${y0 - 14} C ${xL + 360} ${y0 - 40}, ${xR - 360} ${y0 - 40}, ${xR - 330} ${y0 - 14} C ${xR - 300} ${y0 + 60}, ${xR - 330} ${y0 + 150}, ${xR - 380} ${y0 + 120} C ${xR - 420} ${y0 + 200}, ${xL + 470} ${y0 + 110}, ${xL + 430} ${y0 + 150} C ${xL + 380} ${y0 + 170}, ${xL + 300} ${y0 + 80}, ${xL + 330} ${y0 - 14} Z`;
  const q = p(f, 6, 16);
  return (
    <>
      <Tag at={0} text="Illustration" x={M} y={60} live={false} />
      <Glass at={0} x={M} y={150} w={CW} h={780} pad={40}>
        <div style={head(44)}>A skin cancer has roots you can’t see.</div>
      </Glass>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: q }}>
        <defs><clipPath id="blk"><rect x={xL} y={y0} width={L.w} height={epi + der + fat} rx={8} /></clipPath></defs>
        <g clipPath="url(#blk)">
          <rect x={xL} y={y0} width={L.w} height={epi} fill="#e9d9cf" />
          <rect x={xL} y={y0 + epi} width={L.w} height={der} fill="#f3e6df" />
          <rect x={xL} y={y0 + epi + der} width={L.w} height={fat} fill="#f6efd9" />
          <path d={tumour} fill="#c98f8f" opacity={0.85} />
        </g>
        <path d={tumour} fill="none" stroke="#a46c6c" strokeWidth={1.5} transform={`translate(0 0)`} />
        <g transform={`translate(0 ${-lift})`} opacity={p(f, 24, 10)}>
          <path d={cut} fill="rgba(55,169,232,.16)" stroke={BLUE} strokeWidth={3} strokeDasharray="10 8" />
        </g>
        <rect x={xL} y={y0} width={L.w} height={epi + der + fat} rx={8} fill="none" stroke="rgba(32,37,50,.25)" />
      </svg>
      {[["Surface", y0 + 6], ["Dermis", y0 + epi + 90], ["Fat", y0 + epi + der + 40]].map(([t, y]) => (
        <div key={t as string} style={{ position: "absolute", left: M + 24, top: (y as number), ...label(15, MUTE), opacity: q }}>{t}</div>
      ))}
      <Arrow at={14} pts={[{ x: M + 130, y: 400 }, { x: xL + 330, y: 400 }, { x: xL + 380, y: y0 - 22 }]} />
      <div style={{ position: "absolute", left: M + 40, top: 372, ...body(22, INK, 500), opacity: p(f, 12, 12) }}>What you can see</div>
      <Arrow at={20} pts={[{ x: xR - 40, y: y0 + 330 }, { x: xR - 40, y: y0 + 210 }, { x: xR - 350, y: y0 + 130 }]} />
      <div style={{ position: "absolute", left: xR - 260, top: y0 + 340, width: 260, textAlign: "right", ...body(22, INK, 500), opacity: p(f, 18, 12) }}>Roots under the surface</div>
      <div style={{ position: "absolute", left: M + 40, top: 860, width: CW - 80, ...body(23, INK2), opacity: p(f, 32, 12) }}>
        <span style={{ color: BLUE, fontWeight: 500 }}>Layer 1.</span> The visible cancer comes off with a thin, saucer-shaped layer around and under it.
      </div>
      <Said at={28} text="Then every edge of that layer goes under the microscope." keys={["microscope"]} x={M} y={990} w={CW} px={50} />
    </>
  );
};
// the layer as a map: four quarters, one still positive
const M3: React.FC = () => {
  const f = useCurrentFrame();
  const cx = M + 290, cy = 560, R = 210;
  const quad = (a0: number, a1: number) => `M${cx} ${cy} L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} Z`;
  const Q = [[-Math.PI / 2, 0, "A"], [0, Math.PI / 2, "B"], [Math.PI / 2, Math.PI, "C"], [Math.PI, (3 * Math.PI) / 2, "D"]] as const;
  const pos = p(f, 22, 12);
  return (
    <>
      <Tag at={0} text="The map" x={M} y={60} />
      <Glass at={0} x={M} y={150} w={CW} h={800} pad={40}>
        <div style={head(44)}>100% of the edge is checked.</div>
      </Glass>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        {Q.map(([a0, a1, n], i) => (
          <path key={n} d={quad(a0, a1)} fill={n === "B" ? `rgba(55,169,232,${0.15 + 0.35 * pos})` : "#f3e6df"} stroke="#fff" strokeWidth={6} opacity={p(f, 4 + i * 3, 10)} />
        ))}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={BLUE} strokeWidth={3} pathLength={1} strokeDasharray={`${p(f, 12, 20, curve.sweep)} 1`} transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      {Q.map(([a0, a1, n]) => {
        const a = (a0 + a1) / 2;
        return <div key={n} style={{ position: "absolute", left: cx + R * 0.55 * Math.cos(a) - 20, top: cy + R * 0.55 * Math.sin(a) - 20, width: 40, textAlign: "center", ...head(34, n === "B" && pos > 0.5 ? "#fff" : INK) }}>{n}</div>;
      })}
      <Arrow at={30} pts={[{ x: 650, y: 760 }, { x: 560, y: 760 }, { x: cx + R * 0.95, y: cy + R * 0.55 }]} />
      <div style={{ position: "absolute", left: 610, top: 740, width: W - M - 640, ...body(22, INK, 500), opacity: p(f, 30, 12) }}>Cancer left at this edge</div>
      <div style={{ position: "absolute", left: 640, top: 330, width: W - M - 680 }}>
        {[["Cut and coloured", "The layer is divided and marked so each edge keeps its place."], ["Read on the same visit", "The whole edge is checked under the microscope while you wait."], ["Only where it’s needed", "If one quarter is positive, only that spot is taken next."]].map(([t, d], i) => (
          <div key={t} style={{ marginTop: i ? 28 : 0, opacity: p(useCurrentFrame(), 8 + i * 6, 12) }}>
            <div style={head(28)}>{t}</div>
            <div style={{ ...body(20, INK2), marginTop: 6 }}>{d}</div>
          </div>
        ))}
      </div>
      <Said at={40} text="So the healthy skin around it is spared." keys={["spared"]} x={M} y={1000} w={CW} px={54} />
    </>
  );
};
const M4: React.FC = () => {
  const f = useCurrentFrame();
  const steps = ["Layer 1", "Microscope", "Layer 2, one spot", "Clear", "Closed"];
  return (
    <>
      <Tag at={0} text="Until it’s clear" x={M} y={60} />
      <Glass at={0} x={M} y={150} w={CW} pad={30}>
        <div style={{ display: "flex", gap: 10 }}>
          {steps.map((s, i) => {
            const on = f >= 6 + i * 6, clear = i >= 3 && on;
            return <div key={s} style={{ flex: 1, textAlign: "center", padding: "18px 6px", borderRadius: 16, background: clear ? BLUE : on ? "#fff" : "rgba(255,255,255,.35)", boxShadow: clear ? "none" : `inset 0 0 0 1px ${RULE}`, ...label(16, clear ? "#fff" : on ? INK : MUTE) }}>{s}</div>;
          })}
        </div>
      </Glass>
      <Win id="03611" at={8} x={M} y={330} w={CW} h={600} />
      <div style={{ position: "absolute", left: M, top: 950, ...label(15, MUTE), opacity: p(f, 14, 12) }}>Fig. Procedure room, 897 Lexington Ave · 22.06.2023</div>
      <Said at={30} text="The same surgeon removes it and closes it." keys={["closes"]} x={M} y={1010} w={CW} px={54} />
    </>
  );
};
const M5: React.FC = () => (
  <>
    <Tag at={0} text="Why a yearly check" x={M} y={60} />
    <Win id="him_r22" at={0} x={M} y={150} w={360} h={540} fy={0.17} />
    <Glass at={6} x={460} y={150} w={W - M - 460} h={540} pad={32}>
      <Row at={10} k="Each year, U.S." v={<><span style={{ ...head(40, BLUE) }}>3.6 million</span><br />people are diagnosed with basal cell carcinoma.</>} />
      <Row at={14} k="Of new cancers" v="More than 1 in 3 are skin cancers." />
      <Row at={18} k="Caught early" v="Usually curable." last />
    </Glass>
    <Said at={24} text="When someone's diagnosed at an early stage, the treatment works." keys={["early"]} x={M} y={740} w={CW} px={46} />
    <End at={40} y={930} />
    <div style={{ position: "absolute", left: M, top: 1130, ...body(17, MUTE) }}>Figures: Skin Cancer Foundation, as posted by Dr. Ostad.</div>
  </>
);
export const P3Mohs: React.FC = () => { useG3(); return <Scenes list={[M1, M2, M3, M4, M5]} />; };

// =============================================================================================== 3  MEET HIM: who's holding the syringe
const C1: React.FC = () => (
  <>
    <Tag at={0} text="Meet Dr. Ostad" x={M} y={60} />
    <div style={{ position: "absolute", right: M, top: 74, ...label(17, MUTE) }}>PIX11 · The Doctor Is In · 07.11.2024</div>
    <Win id="00838" at={2} x={M} y={150} w={CW} h={880} fy={0.55} />
    <Said at={14} text="I wanted to find a field that combines art and medicine." keys={["art", "medicine"]} x={M} y={1080} w={CW} px={56} />
  </>
);
const C2: React.FC = () => {
  const box = { w: 470, h: 627 };
  const c = cover("03071", box, 0.5, 0.5);
  const t = c.pt(0.5, 0.6);
  return (
    <>
      <Tag at={0} text="Teaching" x={M} y={60} />
      <Win id="03071" at={0} x={M} y={150} w={box.w} h={box.h} />
      <Glass at={8} x={590} y={300} w={W - M - 590} pad={28}>
        <Row at={12} k="Award" v="Part-Time Attending of the Year" />
        <Row at={15} k="Where" v="Bellevue Hospital Center" />
        <Row at={18} k="From" v="The NYU Dermatology residents" />
        <Row at={21} k="Year" v="2023" last />
      </Glass>
      <Arrow at={28} pts={[{ x: 600, y: 760 }, { x: 560, y: 820 }, { x: M + t.x + 60, y: 150 + t.y + 30 }]} curveIt />
      <Said at={34} text="Voted by the residents he trains at NYU." keys={["nyu"]} x={M} y={880} w={CW} px={52} />
    </>
  );
};
const C3: React.FC = () => (
  <>
    <Tag at={0} text="On the lists" x={M} y={60} />
    <Win id="01329" at={0} x={M} y={150} w={440} h={560} />
    <Win id="06354" at={6} x={M + 512} y={150} w={440} h={560} fy={0} zoom={1.3} />
    <Glass at={12} x={M} y={760} w={CW} pad={30}>
      <Row at={16} k="Super Doctors" v="New York, 17th annual list · 2024" />
      <Row at={19} k="Castle Connolly" v="Top Doctor for 15 years · Cosmetic Dermatology" last />
    </Glass>
    <Said at={26} text="Chosen by other doctors, year after year." keys={["doctors"]} x={M} y={1010} w={CW} px={54} />
  </>
);
const C4: React.FC = () => (
  <>
    <Tag at={0} text="Around the city" x={M} y={60} />
    <div style={{ position: "absolute", right: M, top: 74, ...label(17, MUTE) }}>Lexington Av–63 St · 22.09.2025</div>
    <Win id="00259" at={0} x={M} y={150} w={CW} h={880} fy={0.4} />
    <Glass at={10} x={M + 30} y={890} w={600} pad={26}>
      <div style={head(32)}>“Smooth smile lines with Evolysse”</div>
      <div style={{ ...label(15, MUTE), marginTop: 10 }}>On the subway entrance, available at his office</div>
    </Glass>
    <Said at={20} text="You may have seen him on the way to work." keys={["work"]} x={M} y={1090} w={CW} px={54} />
  </>
);
const C5: React.FC = () => (
  <>
    <Tag at={0} text="In short" x={M} y={60} />
    <Win id="him_r72" at={0} x={M} y={150} w={360} h={600} fy={0.18} />
    <Glass at={6} x={460} y={150} w={W - M - 460} h={600} pad={32}>
      <Row at={10} k="In practice" v="29 years" />
      <Row at={13} k="Certified" v="Triple board-certified" />
      <Row at={16} k="Surgery" v="Mohs skin cancer surgery and facial cosmetic surgery" />
      <Row at={19} k="Office" v="897 Lexington Ave, Upper East Side" last />
    </Glass>
    <Said at={24} text="It always starts by hearing the patient out." keys={["hearing"]} x={M} y={800} w={CW} px={50} />
    <End at={40} y={960} />
  </>
);
export const P3Meet: React.FC = () => { useG3(); return <Scenes list={[C1, C2, C3, C4, C5]} />; };

const keys = (n: number) => Array.from({ length: n }, (_, i) => i * SCENE + SCENE - 4);
export const GRID3 = [
  { id: "P3Mohs", C: P3Mohs, frames: 5 * SCENE, keys: keys(5) },
  { id: "P3Jeuveau", C: P3Jeuveau, frames: 5 * SCENE, keys: keys(5) },
  { id: "P3Meet", C: P3Meet, frames: 5 * SCENE, keys: keys(5) },
];
