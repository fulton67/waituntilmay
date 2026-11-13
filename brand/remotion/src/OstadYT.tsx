import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, continueRender, delayRender, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, clamp, fitPx } from "./brand";
import { HN_NEED, useElza } from "./Fonts";
import { Sfx } from "./components/Ro";
import { BG0, BLUE, Bar, DISPLAY, StepPlayer, TYPEFACE, Callout, Canvas, Counter, Cursor, Grain, H1, HERO, ICON, INK, Icon, Kinetic, LAB, LINE, M, MUTE, RADIUS, RULE, SKY, TOP, Tag, Toggle, glass, GlassLife, head, label, life, prog, quint, small, useT } from "./components/YT";
import type { Caption } from "./types";

// OstadYT: the YouTube v2 cut of the Exomind closing remarks (style DECISIONS 14b). Client on v1 (OstadWide, 6/10): "extremely
// repetitive ... looks super generative"; the cut-out head "looks cheap"; "focus and show the Exomind as much as possible ... someone
// experiencing it"; Evident's infographics ("I don't want every graphic in a box"); the rosacea reel's bespoke animations; "new
// animations showing how Exomind actually works"; no black around the captions; one themed system; "make the whole page feel
// interactive"; "a bit more white"; the bible's type, clean. So: 13 sections, no two neighbours share a layout; he is on screen
// unkeyed (native pixels or less) for the key lines and keyed once, over a bright plate, with a refined matte; the rest is Exomind
// footage (patients under the coil, a session in the office, the patient's own words) and live-feeling line graphics on white
// (components/YT.tsx). Hard cuts between sections, one focal point per frame.
export type YTSection = { at: number; dur: number; kind: string };
export type YTSpec = { speed: number; captions: Caption[]; keywords?: string[]; audio: string; footage: string; durationInSeconds: number; yt: { sections: YTSection[]; keyed: { src: string; at: number } } };
export type YTProps = { spec?: YTSpec; debugFonts?: boolean };

const v = (src: string) => staticFile(`exomind-skin/yt/${src}`);
const Full: React.FC<{ src: string; rate?: number; from?: number; push?: number; pos?: string; dur: number; style?: React.CSSProperties }> = ({ src, rate = 1, from = 0, push = 0.04, pos = "50% 50%", dur, style }) => {
  const t = useT();
  const s = 1 + push * (t / dur) + 0.03 * (1 - prog(t, 0, 0.5));
  return <OffthreadVideo src={v(src)} muted playbackRate={rate} startFrom={Math.round(from * 24)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, transform: `scale(${s})`, ...style }} />;
};
const elev = "0 24px 60px rgba(29,34,48,.16)";

// ---------- his unkeyed shot: the edit's own picture (the cut, played at the edit speed), never enlarged ----------
const ARoll: React.FC<{ at: number; speed: number; src: string; box: "panelR" | "panelL" | "window" }> = ({ at, speed, src, box }) => {
  const t = useT();
  const from = Math.round(at * speed * 24);
  const vid = (w: number, top: number) => <OffthreadVideo src={staticFile(src)} muted playbackRate={speed} startFrom={from} style={{ position: "absolute", left: 0, top, width: w, height: (w * 1920) / 1080 }} />;
  const q = prog(t, 0, 0.6);
  if (box === "window") {
    // the whole 9:16 frame at 0.5x, rounded like the glass
    return (
      <div style={{ position: "absolute", left: M - 60, top: 60, width: 540, height: 960, borderRadius: RADIUS, overflow: "hidden", boxShadow: elev, transform: `translateY(${(1 - q) * 24}px)`, opacity: q }}>
        {vid(540, 0)}
      </div>
    );
  }
  // 4:5 panel: rows 330-1680 of his 1080x1920 frame at 0.8x (864 x 1080), full height, edge to edge
  const left = box === "panelR" ? 1056 : 0;
  return (
    <div style={{ position: "absolute", left, top: 0, width: 864, height: 1080, overflow: "hidden", clipPath: `inset(0 ${box === "panelL" ? (1 - q) * 100 : 0}% 0 ${box === "panelR" ? (1 - q) * 100 : 0}%)` }}>
      {vid(864, -264)}
    </div>
  );
};

// ======================= sections =======================
// 1. opening: his shot as a panel on the right; name and role, then "Exomind" with the coil and its pulse
const S1: React.FC = () => {
  const t = useT();
  return (
    <>
      <Canvas glow={[0.25, 0.45]} />
      <div style={{ position: "absolute", left: M, top: TOP, display: "flex", alignItems: "center", gap: 14, ...life(t, 0.2) }}>
        <div style={{ width: 12, height: 12, borderRadius: 99, background: BLUE, opacity: 0.55 + 0.45 * Math.sin(t * 4) }} />
        <span style={label(LAB, MUTE)}>Total skin health evening</span>
      </div>
      <div style={{ position: "absolute", left: M, top: 560 }}>
        <Kinetic text="Dr. Ariel Ostad" at={0.35} size={H1} out={4.3} />
        <div style={{ ...small(28, 500), marginTop: 10, ...life(t, 0.8, 4.3) }}>Triple Board-Certified Dermatologist</div>
      </div>
      <div style={{ position: "absolute", left: M, top: 330 }}>
        <div style={{ position: "relative", width: 132, height: 132, ...life(t, 4.5) }}>
          <Icon name="coil" size={132} draw={prog(t, 4.5, 0.8)} color={BLUE} />
          {t > 5 && [0, 1, 2].map((k) => { const q = ((t - 5 - k * 0.33) % 1 + 1) % 1; return <div key={k} style={{ position: "absolute", left: 66 - 56 * q, top: 86, width: 112 * q, height: 56 * q, borderRadius: "0 0 999px 999px", border: `${LINE}px solid ${BLUE}`, borderTop: "none", opacity: 1 - q }} />; })}
        </div>
        <div style={{ marginTop: 34 }}><Kinetic text="Exomind" at={4.7} size={HERO} /></div>
      </div>
    </>
  );
};

// 2. "why we include the mind in our approach to your total skin health": head and skin; a toggle switches the mind on; a live link
const bez = (q: number, p: number[]) => (1 - q) ** 3 * p[0] + 3 * (1 - q) ** 2 * q * p[1] + 3 * (1 - q) * q * q * p[2] + q ** 3 * p[3];
const S2: React.FC = () => {
  const t = useT();
  const on = prog(t, 1.2, 0.3), lit = on > 0.5;
  const travel = (t * 0.6) % 1;
  return (
    <>
      <Canvas glow={[0.5, 0.45]} />
      <div style={{ position: "absolute", left: M, top: TOP, display: "flex", alignItems: "center", gap: 22, ...life(t, 0.3) }}>
        <Toggle on={1.2} w={92} />
        <span style={head(48)}>Include the mind</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(40 40)">
          <path d="M520 760 C 470 700 455 640 470 580 C 430 560 440 520 470 500 C 450 380 520 270 640 255 C 760 240 850 320 860 420 C 880 450 900 490 880 505 C 900 540 890 560 870 570 C 880 610 870 650 820 655 C 800 700 760 720 720 720 L 720 790"
            fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" pathLength={1} strokeDasharray={`${prog(t, 0.05, 1)} 1`} />
          <g transform="translate(560 330) scale(4.2)"><path d={ICON.brain.split(" M")[0]} fill={lit ? "rgba(55,169,232,.16)" : "none"} stroke={lit ? BLUE : INK} strokeWidth={0.72} strokeLinecap="round" opacity={0.35 + 0.65 * on} /></g>
        </g>
        <g transform="translate(1290 370)">
          {[0, 1, 2].map((k) => <path key={k} d={k ? `M0 ${70 + k * 70} H 380` : "M0 60 C 60 30 120 90 190 60 S 320 30 380 60"} fill="none" stroke={INK} strokeWidth={LINE} pathLength={1} strokeDasharray={`${prog(t, 0.3 + k * 0.15, 0.8)} 1`} />)}
          {[80, 190, 300].map((x, k) => <path key={k} d={`M${x} 64 V 210`} stroke={BLUE} strokeWidth={2} pathLength={1} strokeDasharray={`${prog(t, 0.8 + k * 0.1, 0.6)} 1`} />)}
        </g>
        <path d="M680 470 C 860 290, 1110 290, 1280 470" fill="none" stroke={lit ? BLUE : RULE} strokeWidth={LINE} strokeDasharray="2 12" strokeLinecap="round" opacity={prog(t, 1.3, 0.5)} />
        {lit && <circle cx={bez(travel, [680, 860, 1110, 1280])} cy={bez(travel, [470, 290, 290, 470])} r={9} fill={BLUE} />}
      </svg>
      <div style={{ position: "absolute", left: 560, top: 850 - 40 }}><Tag text="The mind" at={1.15} /></div>
      <div style={{ position: "absolute", left: 1290, top: 620 }}><Tag text="Your skin" at={1.8} /></div>
      <div style={{ position: "absolute", left: 1290, top: 700, width: 480 }}><Kinetic text="Total skin health" at={2.65} size={H1} key_={["total", "skin", "health"]} /></div>
      <Cursor path={[{ at: 0.4, x: 700, y: 330 }, { at: 1.0, x: M + 46, y: TOP + 26 }, { at: 1.18, x: M + 46, y: TOP + 26, tap: true }, { at: 1.9, x: 520, y: 300 }]} show={[0.4, 2.4]} />
    </>
  );
};

// 3. a real session in the office (Oct 30: the patient under the coil, his face out of frame); the coil called out, a live session chip
const S3: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  return (
    <>
      <Full src="session.mp4" dur={dur} push={0.05} />
      <Callout x={640} y={330} lx={420} ly={150} text="The Exomind coil" at={0.6} />
      <div style={{ ...glass(999), position: "absolute", right: M - 60, top: TOP - 60, display: "flex", alignItems: "center", gap: 16, padding: "16px 28px", ...life(t, 1.4) }}>
        <div style={{ width: 12, height: 12, borderRadius: 99, background: BLUE, opacity: 0.5 + 0.5 * Math.sin(t * 5) }} />
        <span style={label(26)}>Session in progress</span>
        <span style={{ ...small(26, 500, BLUE), fontVariantNumeric: "tabular-nums" }}>00:{String(Math.floor(t)).padStart(2, "0")}</span>
      </div>
    </>
  );
};

// 4. after tonight: his shot in a window; giveaway (email / phone light up), check your texts (an unread badge, tapped)
const S4: React.FC = () => {
  const t = useT();
  const chip = (text: string, icon: string, at: number) => {
    const q = prog(t, at, 0.35), lit = q > 0.5;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 999, background: lit ? BLUE : "#fff", boxShadow: lit ? "none" : `inset 0 0 0 2px ${RULE}`, transform: `scale(${1 + 0.05 * Math.sin(Math.PI * q)})` }}>
        <Icon name={icon} size={36} draw={prog(t, 1.0, 0.6)} color={lit ? "#fff" : INK} /><span style={label(28, lit ? "#fff" : INK)}>{text}</span>
      </div>
    );
  };
  const badge = prog(t, 7.0, 0.3), read = t > 7.6;
  const X = 780;
  return (
    <>
      <Canvas glow={[0.7, 0.4]} px={0.3} />
      <div style={{ position: "absolute", left: X, top: TOP }}><span style={label(LAB, MUTE)}>After tonight</span></div>
      <div style={{ position: "absolute", left: X, top: TOP + 70, ...life(t, 0.9) }}>
        <Kinetic text="Giveaway winners" at={0.9} size={H1} />
        <div style={{ display: "flex", gap: 16, marginTop: 18, ...life(t, 1.0) }}>{chip("Email", "envelope", 1.9)}{chip("Phone", "phone", 2.45)}</div>
      </div>
      <div style={{ position: "absolute", left: X, top: 560, display: "flex", alignItems: "center", gap: 34, ...life(t, 5.5) }}>
        <div style={{ position: "relative" }}>
          <Icon name="chat" size={110} draw={prog(t, 5.5, 0.7)} color={read ? BLUE : INK} />
          {!read && badge > 0 && <div style={{ position: "absolute", right: -8, top: -6, width: 42, height: 42, borderRadius: 99, background: BLUE, color: "#fff", font: `500 26px/42px ${FONT}`, textAlign: "center", transform: `scale(${badge})` }}>1</div>}
        </div>
        <div>
          <Kinetic text="Check your texts" at={5.6} size={H1} />
          <div style={{ ...small(28), marginTop: 6, ...life(t, 7.9) }}>After the event, reply to schedule a consultation.</div>
        </div>
      </div>
      <Cursor path={[{ at: 6.6, x: 1250, y: 780 }, { at: 7.3, x: X + 98, y: 588 }, { at: 7.55, x: X + 98, y: 588, tap: true }, { at: 8.4, x: 1150, y: 720 }]} show={[6.6, 9.0]} />
      <Sfx at={7.0} name="pop" gain={0.5} />
    </>
  );
};

// 5. booking by text, then the visit: a line phone with a live thread and a calendar slot; the visit's three steps tick
const S5: React.FC = () => {
  const t = useT();
  const P = { x: M + 40, y: 110, w: 430, h: 820 };
  const bub = (text: string, at: number, me: boolean, y: number) => {
    const q = at <= 0 ? 0.6 + 0.4 * prog(t, 0, 0.35) : prog(t, at, 0.35);
    if (t < at) return null;
    return <div style={{ position: "absolute", top: y, [me ? "right" : "left"]: 26, maxWidth: 320, padding: "14px 20px 16px", borderRadius: 22, background: me ? BLUE : BG0, ...small(26, 500, me ? "#fff" : INK), opacity: q, transform: `translateY(${(1 - q) * 14}px) scale(${0.94 + 0.06 * q})`, transformOrigin: me ? "100% 100%" : "0 100%" }}>{text}</div>;
  };
  const row = (icon: string, text: string, at: number, i: number) => {
    const q = prog(t, at, 0.4), lit = q > 0.5;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 30, padding: "26px 0", borderTop: i ? `2px solid ${RULE}` : "none", opacity: prog(t, Math.min(at - 0.6, 4.1 + i * 0.15), 0.4) * (0.35 + 0.65 * q) }}>
        <Icon name={icon} size={64} draw={prog(t, at - 0.3, 0.7)} color={lit ? BLUE : INK} />
        <span style={{ ...head(48), flex: 1 }}>{text}</span>
        <svg width={48} height={48} viewBox="0 0 34 34"><circle cx={17} cy={17} r={15} fill={lit ? BLUE : "none"} stroke={lit ? BLUE : RULE} strokeWidth={2} /><path d="M10 17.5 l4.6 4.6 L24 12.6" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} /></svg>
      </div>
    );
  };
  const slot = prog(t, 3.0, 0.3);
  return (
    <>
      <Canvas glow={[0.3, 0.5]} px={-0.2} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g style={{ opacity: 0.6 + 0.4 * prog(t, 0, 0.3) }} transform={`translate(0 ${(1 - prog(t, 0, 0.5)) * 16})`}>
          <rect x={P.x} y={P.y} width={P.w} height={P.h} rx={56} fill="#fff" stroke={INK} strokeWidth={LINE} />
          <path d={`M${P.x + 170} ${P.y + 30} h90`} stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: P.x, top: P.y, width: P.w, height: P.h }}>
        {bub("Reply to book your consultation", 0.0, false, 90)}
        {bub("Yes, please", 1.0, true, 210)}
        {bub("We'll help you find an appointment", 2.1, false, 300)}
        {t > 2.6 && (
          <div style={{ position: "absolute", left: 26, top: 450, display: "grid", gridTemplateColumns: "repeat(5, 64px)", gap: 10, ...life(t, 2.6) }}>
            {Array.from({ length: 10 }, (_, k) => <div key={k} style={{ height: 52, borderRadius: 12, boxShadow: `inset 0 0 0 2px ${RULE}`, background: k === 6 && slot > 0.5 ? BLUE : "transparent", transform: k === 6 ? `scale(${1 + 0.1 * Math.sin(Math.PI * slot)})` : undefined }} />)}
          </div>
        )}
        <div style={{ position: "absolute", left: 26, top: 600 }}><Tag text="Booked" at={3.15} size={26} /></div>
      </div>
      <div style={{ position: "absolute", left: 840, top: TOP }}>
        <Kinetic text="During your visit" at={3.8} size={H1} />
        <div style={{ width: 900, marginTop: 30 }}>
          {row("target", "Your goals", 5.1, 0)}
          {row("clipboard", "Your medical history", 5.8, 1)}
          {row("coil", "Is Exomind right for you?", 7.6, 2)}
        </div>
        <div style={{ marginTop: 34, ...life(t, 4.2) }}><StepPlayer times={[4.2, 5.1, 5.8]} end={7.6} /></div>
      </div>
      <Cursor path={[{ at: 0.9, x: 520, y: 700 }, { at: 1.35, x: 600, y: 340 }, { at: 1.5, x: 600, y: 340, tap: true }, { at: 2.6, x: 540, y: 640 }, { at: 3.0, x: P.x + 26 + 74 * 1 + 32, y: P.y + 450 + 62 + 26, tap: true }, { at: 3.6, x: 700, y: 760 }]} show={[0.9, 3.8]} />
      {[5.1, 5.8, 7.6].map((a, i) => <Sfx key={i} at={a} name="yes" gain={0.4} />)}
    </>
  );
};

// 6. the one keyed shot: him over a bright, soft studio plate (light like his own wall), and the matte-white question box answering live
const S6: React.FC<{ dur: number }> = () => {
  const t = useT();
  const q1 = "What does a session feel like?";
  const n1 = Math.round(q1.length * clamp((t - 1.9) / 1.3));
  const sent = t > 3.75, thanks = t > 7.8;
  return (
    <>
      {/* a plate lit like his own back wall (bright, soft, cool white), so the hair edge has nothing dark to rim against */}
      <Canvas glow={[0.25, 0.35]} field={0.6} px={0.2} />
      <div style={{ position: "absolute", left: 120 + 40 * Math.sin(t * 0.3), top: 60, width: 900, height: 900, borderRadius: 999, background: "radial-gradient(closest-side, rgba(255,255,255,.9), rgba(255,255,255,0))" }} />
      <div style={{ ...glass(), left: 1060, top: TOP - 30, width: 700, height: 560, ...life(t, 0.3, 1e9, 24) }}>
        <GlassLife />
        <div style={{ position: "relative", padding: "44px 48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={label(LAB, MUTE)}>{thanks ? "Thank you" : "Your questions"}</span>
            {!thanks && <span style={{ background: BLUE, borderRadius: 999, padding: "8px 18px 9px", ...label(22, "#fff") }}>Live</span>}
          </div>
          {!thanks && (
            <>
              <div style={{ ...head(H1), marginTop: 22 }}>Ask us anything</div>
              {sent && <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "center", ...life(t, 3.75) }}><Icon name="check" size={32} color={BLUE} draw={prog(t, 3.8, 0.4)} /><span style={small(28, 500, INK)}>{q1}</span></div>}
              {t > 4.6 && <div style={{ marginTop: 14, display: "flex", gap: 14, alignItems: "center", ...life(t, 4.6) }}><Icon name="question" size={32} color={BLUE} draw={prog(t, 4.6, 0.5)} /><span style={small(28, 500, INK)}>Something we haven't covered?</span></div>}
              <div style={{ position: "absolute", left: 48, right: 48, top: 400, height: 88, borderRadius: 24, background: "rgba(255,255,255,.85)", boxShadow: `inset 0 0 0 2px ${RULE}`, display: "flex", alignItems: "center", padding: "0 14px 0 26px" }}>
                <span style={{ flex: 1, ...small(28, 400, sent ? MUTE : INK) }}>{sent ? "Type a question" : q1.slice(0, n1)}{!sent && Math.floor(t * 2.5) % 2 === 0 && <span style={{ color: BLUE }}>|</span>}</span>
                <div style={{ width: 60, height: 60, borderRadius: 99, background: BLUE, display: "grid", placeItems: "center", transform: `scale(${1 - 0.12 * Math.max(0, 1 - Math.abs(t - 3.65) / 0.12)})` }}>
                  <svg width={28} height={28} viewBox="0 0 24 24"><path d="M4 12h14 M12 5l7 7-7 7" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </>
          )}
          {thanks && (
            <div style={{ opacity: 0.6 + 0.4 * prog(t, 7.8, 0.3), transform: `translateY(${(1 - prog(t, 7.8, 0.4)) * 8}px)` }}>
              <div style={{ ...head(H1), marginTop: 22 }}>Thank you for joining us</div>
              <div style={{ ...small(28), marginTop: 14 }}>and for trusting our team with your care.</div>
              <div style={{ display: "flex", gap: 18, marginTop: 50 }}><Icon name="brain" size={64} color={BLUE} draw={0.5 + 0.5 * prog(t, 7.8, 0.6)} /><Icon name="wave" size={64} color={BLUE} draw={0.5 + 0.5 * prog(t, 7.9, 0.6)} /></div>
            </div>
          )}
        </div>
      </div>
      <Cursor path={[{ at: 2.6, x: 1500, y: 800 }, { at: 3.4, x: 1680, y: TOP - 30 + 444 }, { at: 3.65, x: 1680, y: TOP - 30 + 444, tap: true }, { at: 4.4, x: 1560, y: 800 }]} show={[2.6, 5.0]} />
      <Sfx at={0.3} name="card" gain={0.5} />
      <Sfx at={7.8} name="card" gain={0.45} />
    </>
  );
};

// 7. Exomind sessions (BTL film): a patient relaxing under the coil, then the coil on three people; a calendar tapped
const S7: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  return (
    <>
      <Sequence durationInFrames={Math.round(2.3 * 24)} layout="none"><Full src="couch.mp4" dur={2.3} /></Sequence>
      <Sequence from={Math.round(2.3 * 24)} layout="none"><Full src="trio.mp4" from={2.2} dur={dur - 2.3} /></Sequence>
      <Callout x={760} y={200} lx={980} ly={120} text="An Exomind session" at={0.35} out={2.1} />
      <div style={{ ...glass(999), position: "absolute", right: M - 60, top: TOP - 60, display: "flex", alignItems: "center", gap: 16, padding: "14px 28px 14px 18px", ...life(t, 2.5) }}>
        <Icon name="calendar" size={48} draw={prog(t, 2.5, 0.7)} color={t > 3.3 ? BLUE : INK} />
        <span style={label(28)}>See you in the office</span>
      </div>
      <Cursor path={[{ at: 2.7, x: 1600, y: 320 }, { at: 3.2, x: 1440, y: TOP - 10 }, { at: 3.35, x: 1440, y: TOP - 10, tap: true }, { at: 4.0, x: 1560, y: 260 }]} show={[2.7, dur]} />
    </>
  );
};

// 8. chapter: a comprehensive approach to total skin health; three arcs close into one ring (skin care, the mind, technology)
const S8: React.FC = () => {
  const t = useT();
  const C = { x: 1400, y: 540, r: 250 };
  const pt = (a: number, r = C.r) => [C.x + r * Math.cos((a - 90) * Math.PI / 180), C.y + r * Math.sin((a - 90) * Math.PI / 180)];
  const arc = (a0: number, a1: number) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0} ${y0} A ${C.r} ${C.r} 0 0 1 ${x1} ${y1}`; };
  const parts = [{ a: [4, 116], icon: "skin", label: "Skin care", at: 0.6 }, { a: [124, 236], icon: "brain", label: "The mind", at: 1.4 }, { a: [244, 356], icon: "coil", label: "Technology", at: 2.2 }];
  const whole = prog(t, 3.9, 0.6);
  return (
    <>
      <Canvas glow={[0.7, 0.5]} />
      <div style={{ position: "absolute", left: M, top: TOP }}><span style={label(LAB, MUTE)}>Total skin health</span></div>
      <div style={{ position: "absolute", left: M, top: 380, width: 780 }}>
        <Kinetic text="A comprehensive approach to" at={2.3} size={H1} step={0.07} />
        <Kinetic text="total skin health" at={3.85} size={HERO} key_={["total", "skin", "health"]} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={C.x} cy={C.y} r={C.r} fill="none" stroke={BLUE} strokeWidth={14} opacity={0.15 * whole} />
        {parts.map((p, i) => <path key={i} d={arc(p.a[0], p.a[1])} fill="none" stroke={whole > 0.5 ? BLUE : INK} strokeWidth={LINE + 1} strokeLinecap="round" pathLength={1} strokeDasharray={`${prog(t, p.at, 0.9)} 1`} />)}
        <circle cx={C.x} cy={C.y} r={14 + 4 * Math.sin(t * 3)} fill={BLUE} opacity={0.25 + 0.75 * whole} />
      </svg>
      {parts.map((p, i) => {
        const [x, y] = pt((p.a[0] + p.a[1]) / 2, C.r + 96);
        return (
          <div key={i} style={{ position: "absolute", left: x - 120, top: y - 56, width: 240, textAlign: "center", ...life(t, p.at + 0.3) }}>
            <Icon name={p.icon} size={56} draw={prog(t, p.at + 0.3, 0.7)} color={whole > 0.5 ? BLUE : INK} />
            <div style={{ ...label(26), marginTop: 8 }}>{p.label}</div>
          </div>
        );
      })}
      {parts.map((p, i) => <Sfx key={i} at={p.at + 0.3} name="pop" gain={0.4} />)}
    </>
  );
};

// 9. the next frontier: his shot as a panel on the left; a timeline he moves past (classic care -> beyond, the mind), dragged by the cursor
const S9: React.FC = () => {
  const t = useT();
  const X0 = 990, XF = 1420, X1 = 1780, Y = 600;
  const drag = quint((t - 4.6) / 1.0), mx = XF - 160 + 330 * drag;
  return (
    <>
      <Canvas glow={[0.7, 0.5]} px={0.2} />
      <div style={{ position: "absolute", left: X0, top: TOP }}><Kinetic text="The next frontier" at={1.35} size={H1} /></div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${X0} ${Y} H ${XF}`} stroke={INK} strokeWidth={LINE + 1} strokeLinecap="round" pathLength={1} strokeDasharray={`${prog(t, 2.9, 0.8)} 1`} />
        <path d={`M${XF} ${Y} H ${X1}`} stroke={BLUE} strokeWidth={LINE + 3} strokeLinecap="round" pathLength={1} strokeDasharray={`${drag} 1`} />
        <path d={`M${XF} ${Y - 200} V ${Y + 140}`} stroke={BLUE} strokeWidth={2} strokeDasharray="10 12" opacity={prog(t, 1.3)} />
        {t > 4.4 && <circle cx={mx} cy={Y} r={18} fill="#fff" stroke={BLUE} strokeWidth={6} />}
      </svg>
      <div style={{ position: "absolute", left: X0, top: Y + 40, display: "flex", alignItems: "center", gap: 14, ...life(t, 3.0) }}>
        <Icon name="skin" size={48} draw={prog(t, 3.0, 0.7)} /><span style={label(26)}>{t > 6.6 ? "Classic treatments" : "Caring for the skin"}</span>
      </div>
      <div style={{ position: "absolute", left: XF + 40, top: Y - 120, display: "flex", alignItems: "center", gap: 14, ...life(t, 5.0) }}>
        <Icon name="brain" size={56} draw={prog(t, 5.0, 0.7)} color={BLUE} /><span style={label(28, BLUE)}>Beyond: the mind</span>
      </div>
      <Cursor path={[{ at: 4.0, x: 1500, y: 800 }, { at: 4.45, x: XF - 160, y: Y }, { at: 4.6, x: XF - 160, y: Y, tap: true }, { at: 5.6, x: XF + 170, y: Y }, { at: 6.4, x: 1700, y: 760 }]} show={[4.0, 7.2]} />
    </>
  );
};

// 10. emotions: stress | calm, side by side (BTL film, each half at its native scale), a slider dragged from one to the other
const S10: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const wipe = quint((t - 1.6) / 0.7), knob = quint((t - 2.0) / 0.9);
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920 - 960 * wipe, height: 1080, overflow: "hidden" }}><Full src="stressed.mp4" dur={dur} pos="40% 50%" /></div>
      <div style={{ position: "absolute", left: 1920 - 960 * wipe, top: 0, width: 960, height: 1080, overflow: "hidden", borderLeft: "4px solid #fff" }}>
        <OffthreadVideo src={v("smile.mp4")} muted style={{ position: "absolute", left: -480, top: 0, width: 1920, height: 1080 }} />
      </div>
      <div style={{ position: "absolute", left: M - 60, top: TOP - 60 }}><Tag text="Stress" at={0.35} /></div>
      <div style={{ position: "absolute", left: 960 + M - 60, top: TOP - 60 }}><Tag text="Calm" at={2.4} /></div>
      <div style={{ ...glass(999), position: "absolute", left: 660, top: 760, width: 600, height: 92, ...life(t, 1.6) }}>
        <div style={{ position: "absolute", left: 44, right: 44, top: 41, height: 10, borderRadius: 10, background: RULE }}>
          <div style={{ width: `${knob * 100}%`, height: "100%", borderRadius: 10, background: BLUE }} />
          <div style={{ position: "absolute", left: `calc(${knob * 100}% - 20px)`, top: -15, width: 40, height: 40, borderRadius: 99, background: "#fff", boxShadow: `inset 0 0 0 3px ${BLUE}` }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}><Tag text="Our emotions show in our skin" at={3.75} /></div>
      <Cursor path={[{ at: 1.6, x: 820, y: 900 }, { at: 1.9, x: 704, y: 806 }, { at: 2.0, x: 704, y: 806, tap: true }, { at: 2.9, x: 1216, y: 806 }, { at: 3.6, x: 1300, y: 900 }]} show={[1.6, 3.9]} />
    </>
  );
};

// 11. how Exomind works, on real pictures (v3; client on v2's drawn head: "doesn't look like a skull at all", so no drawn anatomy):
// A the session in our office (Oct 30), the coil on her head, pulse rings into the head and the prefrontal region lit, all tracked to
// the footage; C-E BTL's own Exomind renders at native size in white windows (new connections, neurotransmitters, the lit brain).
// The rail, counters and tags sit on the white canvas around them. C-E run in their own Sequence, so Tag/Kinetic/Counter and the
// clips use scene time.
const STEPS = [{ icon: "coil", label: "Coil", at: 0 }, { icon: "pulse", label: "Magnetic pulse", at: 1.4 }, { icon: "brain", label: "Prefrontal cortex", at: 3.3 }, { icon: "network", label: "New connections", at: 5.4 }, { icon: "spark", label: "Neurotransmitters", at: 7.6 }, { icon: "wave", label: "Focus and flow", at: 10.9 }];
export const S11: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const scene = (a: number, b: number) => (a === 0 ? 1 : prog(t, a, 0.35)) * (1 - clamp((t - b) / 0.3));
  const src = t < 5.3 ? "Exomind session in our office" : "Exomind animation by BTL";
  return (
    <>
      <Canvas glow={[0.5, 0.45]} field={0.5} />
      {/* the progress control: the step player (components/YT.tsx; replaces v2's rail of six 20 px labels): one pill per step, the
          current step named beside it at label size */}
      <div style={{ position: "absolute", left: M, top: 40 }}><StepPlayer times={STEPS.map((x) => x.at)} end={dur - 0.4} labels={STEPS.map((x) => x.label)} /></div>
      <div style={{ position: "absolute", right: M, top: 40 + 36 - 12, ...label(22, MUTE), whiteSpace: "nowrap" }}>{src}</div>
      <div style={{ position: "absolute", inset: 0, opacity: scene(0, 5.3) }}><SessionScene t={t} /></div>
      <Sequence from={Math.round(5.3 * 24)} durationInFrames={Math.round(2.6 * 24)} layout="none"><div style={{ position: "absolute", inset: 0, opacity: scene(5.3, 7.5) }}><ConnScene t={t - 5.3} /></div></Sequence>
      <Sequence from={Math.round(7.5 * 24)} durationInFrames={Math.round(3.7 * 24)} layout="none"><div style={{ position: "absolute", inset: 0, opacity: scene(7.5, 10.8) }}><SynScene t={t - 7.5} /></div></Sequence>
      <Sequence from={Math.round(10.8 * 24)} layout="none"><div style={{ position: "absolute", inset: 0, opacity: scene(10.8, 99) }}><BrainScene t={t - 10.8} /></div></Sequence>
      {STEPS.slice(1).map((s, i) => <Sfx key={i} at={s.at} name={i === 3 ? "swish" : "pop"} gain={0.4} />)}
    </>
  );
};
// a white rounded window that holds footage at native size (or less); lifts in, never enlarges the picture
const Win: React.FC<{ x: number; y: number; w: number; h: number; t: number; children: React.ReactNode }> = ({ x, y, w, h, t, children }) => {
  const q = prog(t, 0, 0.5);
  return (
    <div style={{ position: "absolute", left: x - 10, top: y - 10, width: w + 20, height: h + 20, borderRadius: RADIUS + 10, background: "#fff", boxShadow: elev, transform: `translateY(${(1 - q) * 18}px) scale(${0.985 + 0.015 * q})` }}>
      <div style={{ position: "absolute", left: 10, top: 10, width: w, height: h, borderRadius: RADIUS, overflow: "hidden", background: "#0d1b33" }}>{children}</div>
    </div>
  );
};
// a leader from a point to a label: white under-stroke so the blue line reads on footage
const Lead: React.FC<{ x: number; y: number; lx: number; ly: number; q: number }> = ({ x, y, lx, ly, q }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    <path d={`M${x} ${y} L${lx} ${ly}`} stroke="#fff" strokeWidth={LINE + 4} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} opacity={0.9} />
    <path d={`M${x} ${y} L${lx} ${ly}`} stroke={BLUE} strokeWidth={LINE} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
    <circle cx={x} cy={y} r={9} fill={BLUE} stroke="#fff" strokeWidth={3} opacity={Math.min(1, q * 3)} />
  </svg>
);
// A: Oct 30 session (session.mp4 from 7 s; s3 used 0-6.25 s). Window 1570 x 740; the picture is drawn at 0.82-0.86x of its 1920
// px, pushed in slowly about (960, 470). Everything tracked lives in source pixels: coil body ~(650, 320), its pad on the forehead
// ~(730, 340); the forehead under the pad, where the prefrontal cortex sits, ~(705, 330) (v3 first pass at (775, 365) landed on the brow and eye, moved after a frame check); the head did not move over 7-12.5 s (measured on a 1 fps strip).
const AW = { x: M, y: 190, w: 1570, h: 740 };
const SessionScene: React.FC<{ t: number }> = ({ t }) => {
  const k = 0.82 + 0.04 * clamp(t / 5.6);
  const tx = AW.w / 2 - 960 * k, ty = AW.h / 2 - 470 * k;
  const sc = (x: number, y: number) => [AW.x + tx + x * k, AW.y + ty + y * k];
  const pfc = prog(t, 3.3, 0.6), coilQ = prog(t, 0.35, 0.5);
  const rings = t > 1.4 ? [0, 1, 2].map((j) => (((t - 1.4 - j * 0.33) % 1) + 1) % 1) : [];
  const [cx, cy] = sc(640, 290), [px, py] = sc(705, 330);
  return (
    <>
      <div style={{ position: "absolute", left: AW.x, top: AW.y, width: AW.w, height: AW.h, borderRadius: RADIUS, overflow: "hidden", boxShadow: elev, background: "#ddd" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${k})` }}>
          <OffthreadVideo src={v("session.mp4")} muted startFrom={7 * 24} style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <clipPath id="s11head"><ellipse cx={820} cy={400} rx={330} ry={215} transform="rotate(-22 820 400)" /></clipPath>
              <radialGradient id="s11pfc"><stop offset="0" stopColor="#5cc3ff" stopOpacity={0.75} /><stop offset="0.55" stopColor="#37a9e8" stopOpacity={0.35} /><stop offset="1" stopColor="#37a9e8" stopOpacity={0} /></radialGradient>
            </defs>
            <g clipPath="url(#s11head)">
              {rings.map((q, j) => <ellipse key={j} cx={700} cy={320} rx={40 + 300 * q} ry={26 + 190 * q} transform="rotate(-22 700 320)" fill="none" stroke="#fff" strokeWidth={10 * (1 - q) + 2} opacity={(1 - q) * 0.55} />)}
              {rings.map((q, j) => <ellipse key={`b${j}`} cx={700} cy={320} rx={40 + 300 * q} ry={26 + 190 * q} transform="rotate(-22 700 320)" fill="none" stroke={BLUE} strokeWidth={5} opacity={(1 - q) * 0.95} />)}
            </g>
            <ellipse cx={705} cy={330} rx={140 + 8 * Math.sin(t * 5)} ry={88} transform="rotate(-24 705 330)" fill="url(#s11pfc)" opacity={pfc} style={{ mixBlendMode: "screen" }} />
            <ellipse cx={705} cy={330} rx={118} ry={70} transform="rotate(-24 705 330)" fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="6 10" opacity={pfc * 0.9} />
          </svg>
        </div>
      </div>
      {/* coil, then prefrontal cortex: leaders tracked to the picture, labels as solid tags (never on bare footage as navy text) */}
      <div style={{ opacity: 1 - clamp((t - 3.1) / 0.3) }}>
        <Lead x={cx} y={cy} lx={cx - 120} ly={AW.y + 70} q={coilQ} />
        <div style={{ position: "absolute", left: cx - 120 - 10, top: AW.y + 70 - 64 }}><Tag text="Exomind coil" at={0.6} size={28} sfx={false} /></div>
      </div>
      {t > 1.5 && t < 3.4 && <div style={{ position: "absolute", left: AW.x + AW.w - 560, top: AW.y + 40, opacity: 1 - clamp((t - 3.1) / 0.3) }}><Tag text="Magnetic pulses" at={1.5} size={28} /></div>}
      <Lead x={px} y={py} lx={AW.x + AW.w - 470} ly={AW.y + 120} q={prog(t, 3.35, 0.5)} />
      <div style={{ position: "absolute", left: AW.x + AW.w - 470 + 6, top: AW.y + 120 - 30 }}><Tag text="Prefrontal cortex" at={3.6} size={30} /></div>
      {t > 4.0 && (
        <div style={{ ...glass(), background: "rgba(250,249,246,.9)", left: AW.x + AW.w - 620, top: AW.y + AW.h - 210, width: 580, height: 170, ...life(t, 3.9) }}>
          <GlassLife />
          <div style={{ position: "relative", padding: "26px 36px" }}>
            <div style={label(22, MUTE)}>Creates</div>
            <div style={{ ...head(72, BLUE), marginTop: 10, whiteSpace: "nowrap" }}>Neuroplasticity</div>
          </div>
        </div>
      )}
    </>
  );
};
// C: "rewire": BTL's dendrite render (plasticity_full, 968 x 726, native) from 2.5 s; a counter of new links on the canvas
const ConnScene: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Win x={777} y={196} w={968} h={726} t={t}><OffthreadVideo src={staticFile("exomind/clips/plasticity_full.mp4")} muted startFrom={60} style={{ width: 968, height: 726, filter: "brightness(1.12) saturate(1.05)" }} /></Win>
    <div style={{ position: "absolute", left: M, top: 300, width: 540 }}>
      <Tag text="New connections" at={0.15} size={30} sfx={false} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 40, ...life(t, 0.3) }}>
        <span style={head(HERO, BLUE)}>+</span><Counter from={0} to={24} at={0.45} d={1.4} size={HERO} color={BLUE} />
      </div>
      <div style={{ ...small(30, 500, INK), marginTop: 6, ...life(t, 0.6) }}>links forming between neurons</div>
      <div style={{ marginTop: 40, ...life(t, 0.75) }}><Kinetic text="Your brain rewires" at={0.75} size={56} key_={["rewires"]} /></div>
    </div>
  </>
);
// D: neurotransmitters: BTL's synapse render (synapse_full, native) from 2.5 s, so a release and the receptors lighting fall inside
const SynScene: React.FC<{ t: number }> = ({ t }) => {
  const lvl = prog(t, 1.2, 1.2);
  return (
    <>
      <Win x={M} y={196} w={968} h={726} t={t}><OffthreadVideo src={staticFile("exomind/clips/synapse_full.mp4")} muted startFrom={60} style={{ width: 968, height: 726, filter: "brightness(1.15) saturate(1.05)" }} /></Win>
      <div style={{ position: "absolute", left: 1220, top: 300, width: 525 }}>
        <Tag text="Neurotransmitters" at={0.15} size={30} sfx={false} />
        <div style={{ ...small(30, 500, INK), marginTop: 30, ...life(t, 0.4) }}>released across the synapse</div>
        <svg width={460} height={170} style={{ marginTop: 40, overflow: "visible", ...life(t, 0.6) }}>
          <g transform={`rotate(${-14 * (1 - lvl)} 230 80)`}>
            <line x1={20} y1={80} x2={440} y2={80} stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
            <circle cx={44} cy={62} r={18} fill={BLUE} /><circle cx={416} cy={62} r={18} fill={lvl > 0.5 ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} />
          </g>
          <path d="M230 84 L 208 134 H 252 Z" fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        </svg>
        <div style={{ ...head(48), marginTop: 18, ...life(t, 1.6) }}>Production in balance</div>
      </div>
    </>
  );
};
// the illustrated layer, traced from the real render frame by frame (scripts/trace_outline.py: top-hat rim -> contour -> only the
// points on a real bright rim -> Douglas-Peucker); white line at our weight, drawn on, then breathing with the picture under it
const Traced: React.FC<{ src: string; t: number }> = ({ src, t }) => {
  const f = useCurrentFrame();
  const [data, setData] = React.useState<{ frames: string[] } | null>(null);
  const [h] = React.useState(() => delayRender("trace"));
  React.useEffect(() => { fetch(staticFile(src)).then((r) => r.json()).then((j) => { setData(j); continueRender(h); }); }, [src, h]);
  if (!data) return null;
  const d = data.frames[Math.min(f, data.frames.length - 1)];
  const q = prog(t, 0.15, 0.9);
  return (
    <svg width={1066} height={600} style={{ position: "absolute", inset: 0 }}>
      <path d={d} fill="none" stroke="#fff" strokeWidth={LINE} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${q} 1`} opacity={0.55 + 0.35 * (1 - q) + 0.1 * Math.sin(t * 3)} />
    </svg>
  );
};
// E: BTL's lit brain (1066 x 600, native) from 2 s; the busy line settles into one calm wave beside it
const BrainScene: React.FC<{ t: number }> = ({ t }) => {
  const calm = prog(t, 0.4, 1.3), W = 470;
  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = i * (W / 79);
    const busy = 34 * Math.sin(i * 1.7 + t * 9) * Math.sin(i * 0.31 + t * 2) + 14 * Math.sin(i * 3.1 - t * 7);
    return `${x},${50 + busy * (1 - calm) + 34 * Math.sin(i * 0.16 - t * 2.4) * calm}`;
  });
  return (
    <>
      <Win x={679} y={250} w={1066} h={600} t={t}>
        <OffthreadVideo src={staticFile("exomind-skin/clips/brainlit.mp4")} muted startFrom={48} style={{ width: 1066, height: 600, filter: "brightness(1.12) saturate(1.05)" }} />
        <Traced src="exomind-skin/yt/brain_trace.json" t={t} />
      </Win>
      <div style={{ position: "absolute", left: M, top: 330, width: W }}>
        <Kinetic text="Focused," at={0.3} size={96} />
        <Kinetic text="in flow" at={0.45} size={96} key_={["flow"]} />
        <svg width={W} height={100} style={{ marginTop: 40, overflow: "visible", ...life(t, 0.2) }}>
          <polyline points={pts.join(" ")} fill="none" stroke={calm > 0.5 ? BLUE : INK} strokeWidth={LINE + 1} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
};

// 12. her words: the patient (Nov 05) in a window, "It quiets my brain." revealed word by word; feel better -> better skin
const S12: React.FC = () => {
  const t = useT();
  const words = ["“It", "quiets", "my", "brain.”"];
  const node = (icon: string, text: string, at: number) => {
    const q = prog(t, at, 0.4), lit = q > 0.5;
    return <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px 14px 18px", borderRadius: 999, background: lit ? BLUE : "#fff", boxShadow: lit ? "none" : `inset 0 0 0 2px ${RULE}`, opacity: 0.35 + 0.65 * q }}><Icon name={icon} size={40} draw={q} color={lit ? "#fff" : INK} /><span style={label(28, lit ? "#fff" : INK)}>{text}</span></div>;
  };
  return (
    <>
      <Canvas glow={[0.3, 0.45]} px={-0.3} />
      <div style={{ position: "absolute", left: M - 25, top: 110, width: 440, height: 780, borderRadius: RADIUS, overflow: "hidden", boxShadow: elev, ...life(t, 0, 1e9, 24) }}>
        <OffthreadVideo src={v("patient.mp4")} muted style={{ width: 440, height: 780 }} />
      </div>
      <div style={{ position: "absolute", left: 760, top: 240 }}>
        <div style={label(LAB, MUTE)}>Her words</div>
        <div style={{ ...head(HERO), marginTop: 24 }}>
          {words.map((w, i) => { const q = prog(t, 0.2 + i * 0.28, 0.3); return <span key={i} style={{ color: q > 0.5 ? INK : RULE, marginRight: HERO * 0.26, display: "inline-block" }}>{w}</span>; })}
        </div>
        <div style={{ ...small(28, 500), marginTop: 18, ...life(t, 1.4) }}>An Exomind patient, in our office</div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 64, ...life(t, 0.9) }}>
          {node("wave", "Feel better", 1.05)}
          <svg width={110} height={20}><path d="M4 10 H 100 M88 2 l12 8 -12 8" fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${prog(t, 2.0, 0.8)} 1`} /></svg>
          {node("skin", "Better skin", 3.05)}
        </div>
      </div>
      <Sfx at={1.05} name="yes" gain={0.4} />
      <Sfx at={3.05} name="yes" gain={0.4} />
    </>
  );
};

// 13. end: the BTL smile, a matte-white card with the call to action, the Book button pressed
const S13: React.FC<{ dur: number }> = ({ dur }) => {
  const t = useT();
  const press = Math.max(0, 1 - Math.abs(t - 1.35) / 0.12), done = t > 1.45;
  return (
    <>
      <Full src="smile_close.mp4" dur={dur} push={0.05} />
      <div style={{ ...glass(), left: 1100, top: 240, width: 660, height: 520, ...life(t, 0.1, 1e9, 24) }}>
        <GlassLife />
        <div style={{ position: "relative", padding: "50px 52px" }}>
          <div style={label(26, MUTE)}>Exomind · Dr. Ariel Ostad</div>
          <div style={{ ...head(H1), marginTop: 26 }}>Book a consultation.</div>
          <div style={{ ...small(28), marginTop: 12 }}>Link in the description.</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginTop: 44, padding: "18px 32px", borderRadius: 999, background: done ? "#fff" : BLUE, boxShadow: done ? `inset 0 0 0 2px ${BLUE}` : "none", transform: `scale(${1 - 0.08 * press})` }}>
            {done && <Icon name="check" size={30} color={BLUE} draw={prog(t, 1.45, 0.4)} />}<span style={label(28, done ? BLUE : "#fff")}>{done ? "Booked" : "Book now"}</span>
          </div>
          <div style={{ ...small(26, 500), marginTop: 30 }}>@drarielostad</div>
        </div>
      </div>
      <Cursor path={[{ at: 0.6, x: 1700, y: 900 }, { at: 1.15, x: 1260, y: 600 }, { at: 1.35, x: 1260, y: 600, tap: true }, { at: 2.2, x: 1500, y: 820 }]} show={[0.6, dur]} />
      <Sfx at={0.1} name="card" gain={0.5} />
    </>
  );
};

// ---------- captions: NHG Display 500 (the bible's caption role), 1.271 leading, -0.0158em, no stroke, no shadow, no box (client: "I
// don't want the black around the captions"). Navy on the white canvases; white over footage, where a very soft, wide navy wash sits far
// behind the line (no edge near the glyphs) only on bright shots. Placed in each layout's calm zone.
type Zone = { left: number; width: number; top: number; ink: "navy" | "white"; soft?: boolean };
const ZONES: Record<string, Zone> = {
  s1: { left: M, width: 820, top: 930, ink: "navy" }, s2: { left: M, width: 1570, top: 950, ink: "navy" }, s3: { left: M, width: 1570, top: 950, ink: "white", soft: true },
  s4: { left: 780, width: 1000, top: 950, ink: "navy" }, s5: { left: 840, width: 940, top: 950, ink: "navy" }, s6: { left: 1060, width: 700, top: 930, ink: "navy" },
  s7: { left: M, width: 1570, top: 950, ink: "white", soft: true }, s8: { left: M, width: 1570, top: 950, ink: "navy" }, s9: { left: 990, width: 790, top: 950, ink: "navy" },
  s10: { left: M, width: 1570, top: 950, ink: "white", soft: true }, s11: { left: M, width: 1570, top: 970, ink: "navy" }, s12: { left: 760, width: 1020, top: 950, ink: "navy" }, s13: { left: M, width: 860, top: 950, ink: "white", soft: true },
};
const CAP = 42; // the bible's caption cap ratio on a 1080-high canvas puts the caption at 30-38 px; 42 for viewing at YouTube distance (judgment call)
const YTCaptions: React.FC<{ captions: Caption[]; keywords: string[]; sections: YTSection[] }> = ({ captions, keywords, sections }) => {
  // v3 (client: "the captions are laggy"). Measured on v3 first render: phrase starts vs word onsets from a fresh transcript of the
  // delivered audio: median -0.014 s, p10 -0.052, p90 +0.018, no drift (slope 0.0007 s/s), so not a scaling or offset fault; the lag
  // was the presentation: a 3-5 word phrase appeared whole at its first word and sat ahead of him, behind a 0.14 s fade and rise.
  // Now every word cuts on at its own measured onset frame (yt_words.json via prepare.cjs), no fade, no rise, no shadow; the rest of
  // the line holds its place invisibly, so nothing reflows.
  const f = useCurrentFrame(), fps = useVideoConfig().fps, t = f / fps;
  const on = (c: Caption) => Math.min(c.from, c.words?.[0] ?? c.from);
  const line = captions.find((c) => f >= Math.round(on(c) * fps) && f < Math.round(c.to * fps));
  const sec = [...sections].reverse().find((s) => t >= s.at);
  if (!line || !sec) return null;
  const z = ZONES[sec.kind] ?? ZONES.s2;
  const px = fitPx(line.text, 500, CAP, z.width - 20, -0.0158);
  const keys = new Set(keywords.map((k) => k.toLowerCase()));
  const color = z.ink === "navy" ? INK : "#fff";
  return (
    <AbsoluteFill>
      {z.soft && <div style={{ position: "absolute", left: z.left - 120, width: z.width + 240, top: z.top - 80, height: px * 1.271 + 160, background: "radial-gradient(50% 50% at 50% 50%, rgba(16,24,40,.26) 0%, rgba(16,24,40,.16) 45%, rgba(16,24,40,0) 100%)" }} />}
      <div style={{ position: "absolute", left: z.left, width: z.width, top: z.top, textAlign: "left" }}>
        <p style={{ margin: 0, font: `500 ${px}px/1.271 ${DISPLAY}`, letterSpacing: "-0.0158em", color, whiteSpace: "nowrap" }}>
          {line.text.split(" ").map((w, i) => {
            const shown = f >= Math.round((line.words?.[i] ?? line.from) * fps);
            const key = keys.has(w.toLowerCase().replace(/[^a-z]/g, ""));
            return <span key={i} style={{ opacity: shown ? 1 : 0, color: key ? (z.ink === "navy" ? BLUE : SKY) : undefined }}>{(i ? " " : "") + w}</span>;
          })}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// the keyed shot: refined matte (video_matte.py --refine), packed from cut time keyed.at; its own clock so it stays in sync
const Keyed: React.FC<{ showFrom: number; src: string; speed: number }> = ({ showFrom, src, speed }) => {
  const t = useT();
  const q = prog(t, showFrom, 0.5);
  return (
    <div style={{ position: "absolute", left: 0, top: -150, width: 1080 * 0.86, height: 1920 * 0.86, opacity: t >= showFrom ? 1 : 0, transform: `translateX(${(1 - q) * -24}px)` }}>
      <OffthreadVideo src={staticFile(src)} muted transparent playbackRate={speed} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

// font check (DECISIONS 14b): with debugFonts the frame prints document.fonts.check for every face the cut uses
const FACES = TYPEFACE === "helvetica" ? ["400 40px helvetica-neue-lt-pro", "500 40px helvetica-neue-lt-pro"] : ["500 40px neue-haas-grotesk-display", "600 40px neue-haas-grotesk-display", "400 40px neue-haas-grotesk-text", "500 40px neue-haas-grotesk-text"];
// font check (DECISIONS 14b): with debugFonts the frame shows, per face, the DOM width of a test string in that face and in Arial
// (different widths = the brand face is drawing, not the fallback) and the same string set in each face for a visual check
const FontCheck: React.FC = () => {
  const wid = (font: string) => { const e = document.createElement("span"); e.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${font}`; e.textContent = "Exomind total skin health 0123"; document.body.appendChild(e); const w = e.getBoundingClientRect().width; e.remove(); return w.toFixed(1); };
  return (
    <div style={{ position: "absolute", left: 20, bottom: 20, padding: 16, background: "#fff", font: "16px monospace", color: "#000" }}>
      {FACES.map((f) => <div key={f}>{f}: width={wid(f)} vs Arial={wid(f.replace(/neue-haas-grotesk-(display|text)/, "Arial"))} check={String(document.fonts.check(f))}</div>)}
      {["neue-haas-grotesk-display", "neue-haas-grotesk-text", "Arial"].map((fam) => <div key={fam} style={{ font: `600 40px ${fam}` }}>Rag Gtra 123 · {fam}</div>)}
    </div>
  );
};

const BODY: Record<string, React.FC<{ dur: number }>> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7, s8: S8, s9: S9, s10: S10, s11: S11, s12: S12, s13: S13 };
const AROLL: Record<string, "panelR" | "panelL" | "window"> = { s1: "panelR", s4: "window", s9: "panelL" };

export const OstadYT: React.FC<YTProps> = ({ spec, debugFonts }) => {
  useElza(TYPEFACE === "helvetica" ? HN_NEED : []);
  const { fps } = useVideoConfig();
  if (!spec) return <AbsoluteFill style={{ background: BG0 }} />;
  const f = (s: number) => Math.round(s * fps);
  const S = spec.yt.sections, K = spec.yt.keyed;
  const s6 = S.find((s) => s.kind === "s6");
  const kStart = K.at / spec.speed;
  return (
    <AbsoluteFill style={{ background: BG0 }}>
      {S.map((s, i) => {
        const B = BODY[s.kind];
        return (
          <Sequence key={i} from={f(s.at)} durationInFrames={f(s.dur)} name={s.kind}>
            <B dur={s.dur} />
            {AROLL[s.kind] && <ARoll at={s.at} speed={spec.speed} src={spec.footage} box={AROLL[s.kind]} />}
            {i > 0 && <Sfx at={0} name="swish" gain={0.3} />}
          </Sequence>
        );
      })}
      {s6 && (
        <Sequence from={f(kStart)} durationInFrames={f(s6.at + s6.dur - kStart)} name="keyed">
          <Keyed showFrom={s6.at - kStart} src={K.src} speed={spec.speed} />
        </Sequence>
      )}
      <Grain opacity={0.03} />
      <Audio src={staticFile(spec.audio)} />
      <YTCaptions captions={spec.captions} keywords={spec.keywords ?? []} sections={S} />
      {debugFonts && <FontCheck />}
    </AbsoluteFill>
  );
};
