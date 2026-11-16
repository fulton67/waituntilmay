import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { HN_NEED, useElza } from "./Fonts";
import { BLUE, Canvas, DISPLAY, Grain, INK, M, MUTE, MUTE2, TEXT, TYPEFACE } from "./components/YT";

// IdeaStills: still frames (not animation) of new explainer graphics for the Exomind / total skin health YouTube edit, three looks per
// idea, for the client to pick one look per idea before anything is animated. Board and spoken lines: brand/edits/exomind-skin/stills/BOARD.md.
// Grammar from the Evident read-out (research/ostad/style/read/ig_Ddos1QZRGmV.md, sections 5-6): a graphic only for what is said, one
// accent used only on the punchline, a highlighter on the phrase, build inside one scene, flat surfaces with no drop shadows, a small
// grey source label on every borrowed image or figure, rounded windows (radius ~2 % of width) only around real footage.
// Client rules (DECISIONS 14d): brand blues never green (accent = ice blue), no UI chrome, no hand-drawn anatomy (Flora renders and real
// frames only), icons literal, not every graphic in a box, word-by-word captions in the lower zone. Type follows YT.tsx TYPEFACE.
// Source frames are extracted into public/exomind-skin/ideas/ (gitignored, with the BTL, Flora and practice footage they come from).

export type IdeaProps = { idea: number; look: "A" | "B" | "C" };

const NAVY = "#202532", ICE = "#cfe9f7", ICE_HL = "#c4e4f8", SLATE = "#5b6f8a", DIM = "#47526a", PAPER = "#f4f6f8";
const src = (f: string) => staticFile(`exomind-skin/ideas/${f}`);
const CAP_TOP = 950; // the OstadYT caption zone (y 930-1010); nothing but captions goes in it

const font = (px: number, color = INK, lh = 1.06, track = "0.0082em"): React.CSSProperties => ({ font: `500 ${px}px/${lh} ${DISPLAY}`, letterSpacing: track, color, margin: 0 });
const caps = (px = 24, color = MUTE): React.CSSProperties => ({ font: `500 ${px}px/1.1 ${DISPLAY}`, letterSpacing: "0.06em", textTransform: "uppercase", color, margin: 0 });
const smallT = (px = 22, color = MUTE): React.CSSProperties => ({ font: `400 ${px}px/1.35 ${TEXT}`, color, margin: 0 });

// highlighter (Evident R9): a flat block behind the phrase, square corners, swept left to right; p = sweep progress 0..1
const HL: React.FC<{ p?: number; fill?: string; children: React.ReactNode }> = ({ p = 1, fill = ICE_HL, children }) => (
  <span style={{ background: `linear-gradient(90deg, ${fill} ${p * 100}%, transparent ${p * 100}%)`, padding: "0 0.12em", margin: "0 -0.12em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{children}</span>
);
// word-by-word caption in the lower zone (client rule 8): `shown` words of the phrase are on, the rest hold their place invisibly
const Cap: React.FC<{ text: string; shown: number; ink?: "navy" | "white"; left?: number; soft?: boolean }> = ({ text, shown, ink = "navy", left = M, soft }) => (
  <>
    {soft && <div style={{ position: "absolute", left: left - 120, width: 1300, top: CAP_TOP - 80, height: 213, background: "radial-gradient(50% 50% at 40% 50%, rgba(16,24,40,.30) 0%, rgba(16,24,40,.16) 45%, rgba(16,24,40,0) 100%)" }} />}
    <p style={{ position: "absolute", left, top: CAP_TOP, ...font(42, ink === "navy" ? INK : "#fff", 1.271, "-0.0158em"), whiteSpace: "nowrap" }}>
      {text.split(" ").map((w, i) => <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>{(i ? " " : "") + w}</span>)}
    </p>
  </>
);
const Credit: React.FC<{ x: number; y: number; text: string; color?: string; align?: "left" | "right" }> = ({ x, y, text, color = MUTE, align = "left" }) => (
  <p style={{ position: "absolute", top: y, ...(align === "left" ? { left: x } : { right: 1920 - x }), ...smallT(20, color), letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{text}</p>
);
// review note for the client only (not part of the design): footage of a patient needs her written consent before posting
const Consent: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <p style={{ position: "absolute", right: M, top: 64, ...caps(20, dark ? "#fff" : INK), padding: "8px 14px", background: dark ? "rgba(32,37,50,.55)" : "rgba(207,233,247,.9)" }}>Review: needs patient consent</p>
);
const Full: React.FC<{ f: string; style?: React.CSSProperties }> = ({ f, style }) => <Img src={src(f)} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, objectFit: "cover", ...style }} />;
const Win: React.FC<{ f: string; x: number; y: number; w: number; h: number; pos?: string; zoom?: number; style?: React.CSSProperties }> = ({ f, x, y, w, h, pos = "50% 50%", zoom = 1, style }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: Math.round(w * 0.02), overflow: "hidden", ...style }}>
    <Img src={src(f)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, transform: `scale(${zoom})`, transformOrigin: pos }} />
  </div>
);
const Navy: React.FC = () => <AbsoluteFill style={{ background: NAVY }}><Grain opacity={0.05} /></AbsoluteFill>;
// the light room canvas, with its neural field off and its four-colour bottom strip pushed off-frame (no decorative lines)
const Room: React.FC = () => <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1086, overflow: "hidden" }}><Canvas field={0} /></div>;
// a traced path (Evident B03's coastline trace): ice stroke, round caps, drawn to `p` of its length
const Trace: React.FC<{ d: string; p?: number; w?: number; color?: string; dash?: string }> = ({ d, p = 1, w = 3, color = ICE, dash }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={dash ?? `${p} 1`} />
);

// ---------------- 1. stress -> skin ----------------
const I1A: React.FC = () => {
  const words = [["Stress", "what you feel"], ["Cortisol", "the stress hormone"], ["Inflammation", "what the skin shows"]];
  const xs = [M, 640, 1150];
  return (
    <>
      <Room />
      <p style={{ position: "absolute", left: M, top: 149, ...caps(24, MUTE) }}>How emotions reach the skin</p>
      {/* one scene that builds: the rule under the chain grows to each stage on its word; mid-reveal, it has reached the third */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={M} y1={600} x2={1150 + 0.7 * 560} y2={600} stroke={INK} strokeWidth={2} />
        {xs.map((x, i) => <circle key={i} cx={x + 4} cy={600} r={7} fill={i < 2 ? INK : BLUE} />)}
      </svg>
      {words.map(([w, d], i) => (
        <div key={w} style={{ position: "absolute", left: xs[i], top: 470 }}>
          <p style={{ ...font(86, i < 2 ? INK : INK), whiteSpace: "nowrap" }}>{i === 2 ? <HL p={0.72}>{w}</HL> : w}</p>
          <p style={{ ...smallT(24, MUTE), marginTop: 64 }}>{d}</p>
        </div>
      ))}
      {[0, 1].map((i) => <p key={i} style={{ position: "absolute", left: xs[i + 1] - 92, top: 478, ...font(64, MUTE2) }}>→</p>)}
      <Credit x={M} y={850} text="Source: Chen Y, Lyga J. Brain-skin connection: stress, inflammation and skin aging. Inflamm Allergy Drug Targets 2014;13(3):177-90. PMID 24853682" />
      <Cap text="how our emotions improve our skin," shown={3} />
    </>
  );
};
const I1B: React.FC = () => (
  <>
    <Full f="flora_skin.png" />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(236,241,246,.78) 0%, rgba(236,241,246,.35) 34%, rgba(236,241,246,0) 52%)" }} />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* the edge of the inflamed patch traced in ice, the tail still drawing (read-out idea 3; markup on the condition image) */}
      <Trace d="M 860 420 C 980 300, 1300 290, 1430 400 C 1560 520, 1520 760, 1330 820 C 1140 880, 900 830, 830 700 C 770 590, 790 480, 860 420" p={0.78} w={3.5} color="#ffffff" />
      <line x1={760} y1={400} x2={866} y2={414} stroke="#fff" strokeWidth={2} />
    </svg>
    <div style={{ position: "absolute", left: M, top: 170, width: 640 }}>
      <p style={caps(22, INK)}>The chain</p>
      <p style={{ ...font(60, INK, 1.18), marginTop: 22 }}>Stress <span style={{ color: MUTE }}>→</span> cortisol <span style={{ color: MUTE }}>→</span> <HL p={1}>inflammation</HL></p>
    </div>
    <p style={{ position: "absolute", left: 560, top: 385, ...caps(22, INK), whiteSpace: "nowrap" }}>Inflammation</p>
    <Credit x={1745} y={880} text="Illustration · AI render (Flora)" color="#5c6470" align="right" />
    <Cap text="how our emotions improve our skin," shown={6} />
  </>
);
const I1C: React.FC = () => {
  const rows = [["Stress", "the feeling", SLATE], ["Cortisol", "the hormone", SLATE], ["Inflammation", "on the skin", ICE]] as const;
  return (
    <>
      <Navy />
      {rows.map(([w, d, c], i) => (
        <div key={w} style={{ position: "absolute", left: M - 8, top: 150 + i * 205, display: "flex", alignItems: "baseline", gap: 40 }}>
          <p style={{ ...font(176, c, 1, "-0.01em") }}>{w}</p>
          <p style={{ ...caps(24, i === 2 ? ICE : DIM) }}>{d}</p>
        </div>
      ))}
      <Credit x={M} y={835} text="Source: Chen & Lyga, Inflamm Allergy Drug Targets 2014. PMID 24853682" color="#7d889e" />
      <Cap text="how our emotions improve our skin," shown={6} ink="white" />
    </>
  );
};

// ---------------- 2. the coil -> prefrontal cortex ----------------
const I2A: React.FC = () => (
  <>
    <Full f="head_final_4.9.png" />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* the pulse's path from the coil pad into the frontal lobe, traced on the Flora glass head; the label's leader elbows above the head */}
      {/* brand blue, not ice: the coil's own glow is ice-white, and an ice ring disappears into it */}
      <Trace d="M 1168 318 C 1150 345, 1128 372, 1100 400" w={4} color={BLUE} />
      <circle cx={1100} cy={400} r={22} fill="none" stroke={BLUE} strokeWidth={3.5} />
      <circle cx={1100} cy={400} r={6} fill={BLUE} />
      <polyline points="1084,385 900,182 640,182" fill="none" stroke="#fff" strokeWidth={1.5} />
      <line x1={1290} y1={110} x2={1200} y2={250} stroke="#fff" strokeWidth={1.5} />
    </svg>
    <div style={{ position: "absolute", left: M, top: 118 }}>
      <p style={caps(22, INK)}>Target</p>
      <p style={{ ...font(62, INK), marginTop: 10, whiteSpace: "nowrap" }}>Prefrontal cortex</p>
    </div>
    <p style={{ position: "absolute", left: 1300, top: 92, ...caps(22, INK) }}>Exomind coil</p>
    <Credit x={M} y={880} text="Illustration · AI render (Flora)" color="#3f4a5a" />
    <Cap text="and if there's technology that" shown={4} ink="white" soft />
  </>
);
const I2B: React.FC = () => (
  <>
    <Full f="trio.png" />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* the pulse travels from the real coil down through the scalp: three arcs drawn in order, the last still drawing */}
      {[0, 1, 2].map((i) => <Trace key={i} d={`M ${1150 - i * 6} ${388 + i * 26} Q 1235 ${420 + i * 34}, ${1330 + i * 6} ${388 + i * 26}`} p={i < 2 ? 1 : 0.55} w={3} color={i === 2 ? ICE : "rgba(207,233,247,.75)"} />)}
      <circle cx={1236} cy={462} r={5} fill={ICE} />
      <polyline points="1250,462 1420,462 1520,560" fill="none" stroke="#fff" strokeWidth={1.5} />
    </svg>
    <div style={{ position: "absolute", left: 1530, top: 545, width: 330 }}>
      <p style={caps(22, ICE)}>Magnetic pulse</p>
      <p style={{ ...font(50, "#fff", 1.1), marginTop: 12 }}>to the prefrontal cortex</p>
    </div>
    <Credit x={1745} y={880} text="BTL · EXOMIND film" color="#c9d3e3" align="right" />
    <Cap text="and if there's technology that" shown={4} ink="white" soft />
  </>
);
const I2C: React.FC = () => (
  <>
    <Room />
    <div style={{ position: "absolute", left: M, top: 210, width: 760 }}>
      <p style={caps(24, MUTE)}>The coil sits over</p>
      <p style={{ ...font(96, INK, 1.04), marginTop: 30 }}>the <HL p={1}>prefrontal cortex</HL></p>
      <p style={{ ...smallT(26, MUTE), marginTop: 40, maxWidth: 560 }}>the front of the brain, behind the forehead</p>
    </div>
    {/* stepped punch-in (Evident B09) end state: the window is already at 1.2x on the frontal lobe */}
    <Win f="head_final_4.9.png" x={1000} y={150} w={745} h={690} pos="52% 38%" zoom={1.2} />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* (1100, 400) in the source frame, through the window's cover fit and 1.2x zoom */}
      <circle cx={1466} cy={405} r={30} fill="none" stroke={BLUE} strokeWidth={3.5} />
      <circle cx={1466} cy={405} r={6} fill={BLUE} />
    </svg>
    <Credit x={1000} y={856} text="Illustration · AI render (Flora)" />
    <Cap text="and if there's technology that" shown={4} />
  </>
);

// ---------------- 3. neuroplasticity ----------------
const LIT = [[1050, 345], [1175, 475], [1410, 480], [1332, 742], [795, 592]];
const I3A: React.FC = () => (
  <>
    <Full f="neuro_4.9.png" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(232,239,246,.72) 0%, rgba(232,239,246,0) 34%)" }} />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {/* each new junction in the render is ringed as it lights; four are in, the fifth is mid-ring */}
      {LIT.map(([x, y], i) => <Trace key={i} d={`M ${x + 26} ${y} A 26 26 0 1 1 ${x + 25.9} ${y - 2}`} p={i < 4 ? 1 : 0.5} w={2} color={i < 4 ? "#ffffff" : ICE} />)}
      <line x1={1076} y1={345} x2={1250} y2={250} stroke="#fff" strokeWidth={1.5} />
    </svg>
    <p style={{ position: "absolute", left: 1260, top: 226, ...caps(22, INK) }}>New connection</p>
    <div style={{ position: "absolute", left: M, top: 130 }}>
      <p style={{ ...font(88, INK) }}>Neuroplasticity</p>
      <p style={{ ...smallT(24, "#4f5866"), marginTop: 16 }}>New connections: <span style={{ color: INK }}>[cited figure]</span></p>
    </div>
    <Credit x={1745} y={880} text="Illustration · AI render (Flora)" color="#3f4a5a" align="right" />
    <Cap text="actually help create neuroplasticity," shown={4} ink="white" soft />
  </>
);
const I3B: React.FC = () => (
  <>
    <Navy />
    <p style={{ position: "absolute", left: M, top: 120, ...font(44, "#fff") }}>Connections, before vs after</p>
    <Win f="neuro_0.2.png" x={M} y={210} w={760} h={428} />
    <Win f="neuro_4.9.png" x={985} y={210} w={760} h={428} />
    <p style={{ position: "absolute", left: M, top: 656, ...caps(22, "#aeb8c9") }}>Before</p>
    <p style={{ position: "absolute", left: 985, top: 656, ...caps(22, ICE) }}>After</p>
    {/* bars stay as outlines until a cited figure fills them: bar height must be the number (Evident R10) */}
    {[[M, "rgba(174,184,201,.8)"], [985, ICE]].map(([x, c], i) => (
      <div key={i} style={{ position: "absolute", left: x as number, top: 712, width: 760, height: 56, border: `2px dashed ${c}`, display: "flex", alignItems: "center", paddingLeft: 20, boxSizing: "border-box" }}>
        <span style={{ ...smallT(24, c as string) }}>[cited figure]</span>
      </div>
    ))}
    <Credit x={M} y={800} text="Illustration · AI render (Flora). Figure: [primary source to be cited]" color="#7d889e" />
    <Cap text="actually help create neuroplasticity," shown={4} ink="white" />
  </>
);
const I3C: React.FC = () => (
  <>
    <Full f="neuro_4.9.png" style={{ filter: "blur(14px) saturate(.7)", transform: "scale(1.05)" }} />
    <AbsoluteFill style={{ background: "rgba(214,224,236,.55)" }} />
    {/* a document crop (Evident B11-B18): the definition as published, the key phrase lit on his word */}
    <div style={{ position: "absolute", left: M, top: 130, width: 1150, padding: "54px 64px 60px", background: PAPER, boxSizing: "border-box" }}>
      <p style={{ font: "400 22px/1.3 Georgia, 'Times New Roman', serif", color: "#6b7280", letterSpacing: "0.02em" }}>StatPearls · NCBI Bookshelf</p>
      <p style={{ font: "400 64px/1.1 Georgia, 'Times New Roman', serif", color: "#1f2937", marginTop: 18 }}>Neuroplasticity</p>
      <p style={{ font: "400 36px/1.5 Georgia, 'Times New Roman', serif", color: "#1f2937", marginTop: 30 }}>
        “the ability of the nervous system to change its activity in response to intrinsic or extrinsic stimuli by <HL p={1}>reorganizing its structure, functions, or connections.</HL>”
      </p>
    </div>
    <Credit x={M} y={806} text="Margetis K, Vadakekut ES. Neuroplasticity. StatPearls, NCBI Bookshelf, 2026. PMID 32491743" color="#4f5866" />
    <Cap text="rewire the brain," shown={2} />
  </>
);

// ---------------- 4. total skin health (karaoke, captions hidden: R19) ----------------
const LINE = ["this", "comprehensive", "approach", "to", "total", "skin", "health."];
const lit = 5; // mid-reveal: "total" is lit, "skin health." still to come
const I4A: React.FC = () => (
  <>
    <Room />
    <p style={{ position: "absolute", left: M, top: 149, ...caps(24, MUTE) }}>Dr. Ariel Ostad · Dermatologist</p>
    <p style={{ position: "absolute", left: M, top: 330, width: 1560, ...font(112, MUTE2, 1.1) }}>
      {LINE.map((w, i) => {
        const on = i < lit;
        const key = i >= 4;
        const word = <span style={{ color: on ? INK : MUTE2 }}>{w}</span>;
        return <React.Fragment key={i}>{i ? " " : ""}{i === 3 && <br />}{key && on ? <HL p={1}>{word}</HL> : word}</React.Fragment>;
      })}
    </p>
  </>
);
const I4B: React.FC = () => (
  <>
    <Room />
    {/* his own shot at that moment (54-56 s), unkeyed, in a 4:5 panel: the type sits in the room beside him (Evident B01) */}
    <Win f="him_55.png" x={1105} y={130} w={640} h={780} pos="50% 22%" />
    <p style={{ position: "absolute", left: M, top: 230, width: 840, ...font(76, MUTE2, 1.14) }}>
      {LINE.map((w, i) => <React.Fragment key={i}>{i ? " " : ""}<span style={{ color: i < lit ? INK : MUTE2, ...(i === 4 ? { background: ICE_HL, padding: "0 .1em", margin: "0 -.1em" } : {}) }}>{w}</span></React.Fragment>)}
    </p>
    <p style={{ position: "absolute", left: M, top: 700, ...caps(22, MUTE) }}>Dr. Ariel Ostad</p>
  </>
);
const I4C: React.FC = () => (
  <>
    <Navy />
    <p style={{ position: "absolute", left: M, top: 160, ...font(44, "#fff") }}>this comprehensive approach to</p>
    {["total", "skin", "health."].map((w, i) => (
      <p key={w} style={{ position: "absolute", left: M - 12, top: 235 + i * 210, ...font(220, i === 0 ? ICE : DIM, 1, "-0.02em") }}>{w}</p>
    ))}
  </>
);

// ---------------- 5. the visit and the patient's sessions ----------------
const STEPS = ["Discuss your goals", "Review your medical history", "Is Exomind appropriate for you?"];
const I5A: React.FC = () => (
  <>
    <Room />
    <p style={{ position: "absolute", left: M, top: 149, ...caps(24, MUTE) }}>During your visit</p>
    {/* a table whose rows are wiped light blue as he names them and stay lit (Evident B15): row 1 lit, row 2 mid-wipe, row 3 to come */}
    {STEPS.map((s, i) => (
      <div key={s} style={{ position: "absolute", left: M, top: 260 + i * 150, width: 1000, borderTop: `1px solid ${i ? "#b9c2cc" : INK}`, paddingTop: 34 }}>
        <span style={{ ...font(28, MUTE), display: "inline-block", width: 84, verticalAlign: "top", marginTop: 12 }}>{`0${i + 1}`}</span>
        <span style={{ ...font(52, i < 2 ? INK : MUTE2), whiteSpace: "nowrap" }}>{i === 0 ? <HL p={1}>{s}</HL> : i === 1 ? <HL p={0.6}>{s}</HL> : s}</span>
      </div>
    ))}
    <div style={{ position: "absolute", left: M, top: 710, width: 1000, borderTop: "1px solid #b9c2cc" }} />
    <Win f="clip_consult_q.png" x={1325} y={200} w={420} h={525} pos="50% 30%" />
    <Credit x={1325} y={742} text="Practice footage" />
    <Consent />
    <Cap text="review your medical history," shown={3} />
  </>
);
const I5B: React.FC = () => (
  <>
    <Room />
    <p style={{ position: "absolute", left: M, top: 120, ...caps(24, MUTE) }}>Her sessions</p>
    <Win f="session_13.png" x={M} y={190} w={860} h={484} pos="50% 40%" />
    <Win f="patient_2.5.png" x={1125} y={190} w={360} h={484} pos="50% 35%" />
    {/* the timeline under the frames: the first date is lit, the second is being reached */}
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <line x1={M} y1={730} x2={1745} y2={730} stroke="#b9c2cc" strokeWidth={2} />
      <line x1={M} y1={730} x2={1180} y2={730} stroke={INK} strokeWidth={2} />
      <circle cx={M + 6} cy={730} r={8} fill={INK} />
      <circle cx={1131} cy={730} r={8} fill={BLUE} />
    </svg>
    <div style={{ position: "absolute", left: M, top: 760 }}>
      <p style={font(40, INK)}>Oct 30</p>
      <p style={{ ...smallT(24, MUTE), marginTop: 8 }}>In the chair</p>
    </div>
    <div style={{ position: "absolute", left: 1125, top: 760 }}>
      <p style={font(40, INK)}>Nov 05</p>
      <p style={{ ...smallT(24, INK), marginTop: 8, fontStyle: "italic" }}>“It quiets my brain.”</p>
    </div>
    <Credit x={1745} y={694} text="Practice footage" align="right" />
    <Consent />
  </>
);
const I5C: React.FC = () => (
  <>
    <Full f="session_13.png" />
    {/* the three steps typed onto the white blanket of the real session frame as he says them (rag-hugging callout, Evident B09),
        clear of her face and of the machine's logo; no wash over her */}
    <div style={{ position: "absolute", left: 1235, top: 575, width: 620 }}>
      <p style={caps(20, "#6b7480")}>During your visit</p>
      {STEPS.map((s, i) => (
        <p key={s} style={{ ...font(38, i < 2 ? INK : "#a3abb4", 1.2), marginTop: i ? 14 : 20, whiteSpace: "nowrap" }}>{i === 1 ? <HL p={0.55}>{s}</HL> : s}</p>
      ))}
    </div>
    <Credit x={1745} y={880} text="Practice footage · Oct 30" color="#6b7480" align="right" />
    <Consent dark />
    <Cap text="review your medical history," shown={3} ink="white" />
  </>
);

// ---------------- 6. classic dermatology vs beyond ----------------
const I6A: React.FC = () => (
  <>
    <Room />
    <p style={{ position: "absolute", left: M, top: 149, ...caps(24, MUTE) }}>Taking care of one's skin</p>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}><line x1={960} y1={290} x2={960} y2={780} stroke="#b9c2cc" strokeWidth={1.5} /></svg>
    <div style={{ position: "absolute", left: M, top: 300, width: 720 }}>
      <p style={caps(22, MUTE)}>The classic treatments</p>
      <p style={{ ...font(84, MUTE, 1.08), marginTop: 26 }}>the skin</p>
    </div>
    <div style={{ position: "absolute", left: 1030, top: 300, width: 720 }}>
      <p style={caps(22, INK)}>Beyond</p>
      <p style={{ ...font(84, INK, 1.08), marginTop: 26 }}>the skin<br /><HL p={1}>and the mind</HL></p>
    </div>
    <Cap text="skin beyond just the" shown={2} />
  </>
);
const I6B: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080, overflow: "hidden" }}>
      <Img src={src("flora_classic.png")} style={{ position: "absolute", left: -900, top: 0, width: 1935, height: 1080 }} />
    </div>
    <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, overflow: "hidden" }}>
      <Img src={src("head_final_0.2.png")} style={{ position: "absolute", left: -520, top: 0, width: 1935, height: 1080 }} />
    </div>
    <div style={{ position: "absolute", left: M, top: 150 }}>
      <p style={caps(22, "#4f5866")}>The classic treatments</p>
      <p style={{ ...font(64, INK), marginTop: 12 }}>for the skin</p>
    </div>
    <div style={{ position: "absolute", left: 1040, top: 150 }}>
      <p style={caps(22, INK)}>Beyond</p>
      <p style={{ ...font(64, INK), marginTop: 12 }}><HL p={1}>the mind</HL></p>
    </div>
    <Credit x={M} y={880} text="Illustration · AI render (Flora)" color="#4f5866" />
    <Credit x={1745} y={880} text="Illustration · AI render (Flora)" color="#3f4a5a" align="right" />
    <Cap text="skin beyond just the" shown={2} />
  </>
);
// Dalgard et al. 2015 (verified on PubMed 25521458): clinical anxiety 17.2 % of patients vs 11.1 % of controls (OR 2.18, 1.68-2.82);
// clinical depression 10.1 % vs 4.3 % (OR 2.40, 1.67-3.47); 3,635 patients, 1,359 controls, 13 European countries (HADS)
const DATA = [["Clinical anxiety", 17.2, 11.1], ["Clinical depression", 10.1, 4.3]] as const;
const I6C: React.FC = () => {
  const base = 780, k = 24; // px per percentage point: bar height = the number
  return (
    <>
      <Navy />
      <p style={{ position: "absolute", left: M, top: 120, ...caps(22, "#aeb8c9") }}>Dermatology out-patients vs controls</p>
      <p style={{ position: "absolute", left: M, top: 160, ...font(44, "#fff") }}>Skin disease and the mind</p>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}><line x1={M} y1={base} x2={1110} y2={base} stroke="#5d6a80" strokeWidth={2} /></svg>
      {DATA.map(([name, pat, ctl], g) => {
        const x0 = M + 40 + g * 470;
        return (
          <React.Fragment key={name}>
            {[[pat, g === 0 ? ICE : BLUE, "Patients"], [ctl, SLATE, "Controls"]].map(([v, c, who], j) => (
              <React.Fragment key={j}>
                <div style={{ position: "absolute", left: x0 + j * 150, top: base - (v as number) * k, width: 120, height: (v as number) * k, background: c as string }} />
                <p style={{ position: "absolute", left: x0 + j * 150, top: base - (v as number) * k - 50, width: 120, textAlign: "center", ...font(36, j === 0 && g === 0 ? ICE : "#fff") }}>{`${v}%`}</p>
                <p style={{ position: "absolute", left: x0 + j * 150, top: base + 14, width: 120, textAlign: "center", ...smallT(20, "#aeb8c9") }}>{who as string}</p>
              </React.Fragment>
            ))}
            <p style={{ position: "absolute", left: x0, top: base + 58, ...caps(20, "#fff"), whiteSpace: "nowrap" }}>{name}</p>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 1250, top: 420, width: 500 }}>
        <p style={caps(22, "#aeb8c9")}>Odds ratio, clinical anxiety</p>
        <p style={{ ...font(120, ICE, 1), marginTop: 14 }}>2.18</p>
        <p style={{ ...smallT(24, "#c9d3e3"), marginTop: 16 }}>patients vs controls (95% CI 1.68–2.82)</p>
      </div>
      <Credit x={M} y={872} text="Source: Dalgard FJ et al. J Invest Dermatol 2015;135(4):984-91. PMID 25521458. 3,635 patients, 1,359 controls, 13 countries" color="#7d889e" />
      <Cap text="skin beyond just the" shown={2} ink="white" />
    </>
  );
};

const LOOKS: Record<string, React.FC> = {
  "1A": I1A, "1B": I1B, "1C": I1C, "2A": I2A, "2B": I2B, "2C": I2C, "3A": I3A, "3B": I3B, "3C": I3C,
  "4A": I4A, "4B": I4B, "4C": I4C, "5A": I5A, "5B": I5B, "5C": I5C, "6A": I6A, "6B": I6B, "6C": I6C,
};
export const IdeaStills: React.FC<IdeaProps> = ({ idea, look }) => {
  useElza(TYPEFACE === "helvetica" ? HN_NEED : []);
  const L = LOOKS[`${idea}${look}`];
  return <AbsoluteFill style={{ background: "#e8eef5", overflow: "hidden" }}>{L ? <L /> : null}</AbsoluteFill>;
};
