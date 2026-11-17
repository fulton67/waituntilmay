import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "./brand";
import { HN_NEED, useElza } from "./Fonts";
import { Sfx } from "./components/Ro";
import { BG0, BLUE, Canvas, DISPLAY, GlassLife, Grain, H1, HERO, ICON, INK, Kinetic, LAB, M, MUTE, MUTE2, RADIUS, TEXT, TOP, TYPEFACE, glass, head, label, life, small } from "./components/YT";
import { ARoll, Full, Keyed, YTCaptions, ZONES, elev, v, type YTProps, type YTSection, type Zone } from "./OstadYT";
import { Highlighter, ICE_HL } from "./library/Highlighter";
import { RollingLabel } from "./library/RollingLabel";
import { D24, FALL, RISE, curve, prog } from "./library/motion";

// OstadYT5: YouTube v5 of "Exomind and total skin health" (style DECISIONS 14f). The v4 base is kept as is: the cut, his pauses, 1.15x,
// the audio chain, word-onset captions, the room canvas in brand blues, the calm glass, the Exomind/BTL footage, the Flora glass head
// and neurons, the 13 sections in his order and their timings (edit.json "yt"). What changes is the graphics, against the client's
// 2026-11-16 notes on v4: no play/pause/step-player or cursor/press UI anywhere; no decorative lines (every line is a highlighter, a
// trace, a leader to a label, a ledger divider or the busy-to-calm wave); every graphic is a research/ostad/style/ANIMATION_LIBRARY.md
// entry tied to the word he says, revealed 1 frame after its measured onset (DECISIONS 14d rule 9) on the MOTION.md tokens, and no two
// neighbouring sections share a device. Nothing he does not say goes on screen (no stress, cortisol, inflammation, prefrontal cortex,
// sessions), and the v4 "+24 new connections" counter (an illustrative number, rule 10) is replaced by a literal count of the junctions
// ringed in the clip. One sound per hero reveal (5 in the cut), no per-section swish.

// measured word onsets, output timeline (yt_words.json via props_yt.json), seconds
const W = {
  understand: 4.8, exomind: 5.18, mind: 7.78, total1: 9.32, giveaway: 18.24, email: 19.12, phone: 19.74, check: 24.16, text: 24.68,
  event: 25.72, appointment: 30.5, during: 31.34, goals: 32.62, history: 33.86, appropriate: 35.78, sending: 39.22, question: 40.58,
  covered: 42.84, love: 43.36, hear: 43.68, thank: 45.12, and2: 46.78, look: 49.22, seeing: 49.88, this: 53.8, comprehensive: 54.12,
  approach: 54.86, to: 55.32, total: 55.64, skin: 56.0, health: 56.34, forMe: 56.66, frontier: 59.1, care: 60.84, beyond: 62.02,
  classic: 64.14, how: 68.5, our: 68.76, emotions: 68.94, technology: 71.64, actually: 72.52, create: 73.28, neuroplasticity: 73.96, rewire: 75.5,
  neurotransmitter: 78.14, production: 79.06, we: 79.72, focused: 80.8, flow: 81.72, feel: 83.8, translate: 85.16, into: 85.58,
  better: 85.86, skin2: 86.08,
} as const;

// ---------- frame helpers: section-local frames that agree with the caption clock (Math.round(t * fps) on the output timeline) ----------
const Sec = React.createContext(0);
const useSec = () => {
  const at = React.useContext(Sec);
  const fr = useCurrentFrame();
  const F0 = Math.round(at * 24);
  // local frame of a word onset, and the reveal frame (+1 f, `cut`)
  const wf = (abs: number) => Math.round(abs * 24) - F0;
  const on = (abs: number) => wf(abs) + 1;
  // local seconds of a word onset, an exact frame multiple, for the library components (their onset() adds the +1 f)
  const ls = (abs: number) => wf(abs) / 24;
  return { fr, wf, on, ls };
};
const tok = (fr: number, start: number, dur: number, t: keyof typeof curve = "sweep") => prog(fr, start, dur, t);
// `arrive` in (14 f, 16 px rise), optional `exit` out (7 f, 7 px fall)
const arr = (fr: number, start: number, out = Infinity): React.CSSProperties => {
  const i = tok(fr, start, D24.arrive, "arrive"), o = tok(fr, out, D24.exit, "exit");
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * RISE + o * FALL}px)` };
};
const Room: React.FC<{ glow?: [number, number]; px?: number; field?: number }> = (p) => <Canvas {...p} strip={false} />;
const caps = (px: number, color = INK): React.CSSProperties => ({ font: `500 ${px}px/1.1 ${DISPLAY}`, letterSpacing: "0.04em", textTransform: "uppercase", color, whiteSpace: "nowrap" });
const disp = (px: number, color = INK): React.CSSProperties => ({ font: `500 ${px}px/1.12 ${DISPLAY}`, letterSpacing: "0.0082em", color });
// a literal icon (YT ICON set) drawn on with `sweep` (pathLength)
const DrawIcon: React.FC<{ name: string; size: number; p: number; color?: string }> = ({ name, size, p, color = INK }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: "visible", flex: "none" }}>
    {ICON[name].split(" M").map((d, i) => <path key={i} d={(i ? "M" : "") + d} fill="none" stroke={color} strokeWidth={(3 * 48) / size} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${clamp(p)} 1`} />)}
  </svg>
);
// L14 typed on the rag: 1 character per frame from `start`, no caret; the rest of the line holds its place invisibly (no reflow)
const Typed: React.FC<{ text: string; start: number; style: React.CSSProperties }> = ({ text, start, style }) => {
  const { fr } = useSec();
  const n = clamp((fr - start + 1) / text.length) * text.length;
  return <span style={{ ...style, whiteSpace: "nowrap" }}><span>{text.slice(0, Math.round(n))}</span><span style={{ visibility: "hidden" }}>{text.slice(Math.round(n))}</span></span>;
};
const Credit: React.FC<{ text: string; light?: boolean; left?: boolean }> = ({ text, light, left }) => <div style={{ position: "absolute", ...(left ? { left: M } : { right: M }), top: 64, ...label(22, light ? "rgba(255,255,255,.85)" : "#5b6f8a"), whiteSpace: "nowrap" }}>{text}</div>;

// ======================= sections =======================
// s1 (0-6.62): his panel right; name and role (settle: not tied to a word); "Exomind" arrives on "understand" and the L01 highlighter
// sweeps it on "Exomind" +1 f (16 f). v4's pulsing dot and coil rings are gone.
const S1: React.FC = () => {
  const { fr, on, ls } = useSec();
  const t = fr / 24;
  return (
    <>
      <Room glow={[0.25, 0.45]} />
      <div style={{ position: "absolute", left: M, top: TOP, ...life(t, 0.2) }}><span style={label(LAB, MUTE)}>Total skin health evening</span></div>
      <div style={{ position: "absolute", left: M, top: 560 }}>
        <Kinetic text="Dr. Ariel Ostad" at={0.35} size={H1} out={on(W.understand) / 24 - 0.3} />
        <div style={{ ...small(28, 500), marginTop: 10, ...life(t, 0.8, on(W.understand) / 24 - 0.3) }}>Triple Board-Certified Dermatologist</div>
      </div>
      <div style={{ position: "absolute", left: M, top: 520, ...arr(fr, on(W.understand)) }}>
        <Highlighter words={[{ text: "Exomind", at: ls(W.exomind) }]} punch={[0, 0]} size={Math.round(HERO * 0.65)} />
      </div>
      <Sfx at={on(W.exomind) / 24} name="pop" gain={0.45} />
    </>
  );
};

// s2 (6.62-10.95): "why we include the mind in our approach to your total skin health." The Flora glass head comes in plate-then-
// picture (L06's `plate`): the frosted plate first, the picture through it on "mind" +1 f. Beside it an L05 rolling label: OUR APPROACH
// "the mind" (arrives on "mind") rolls to "total skin health" on "total" (`swap` 16 f). v4's toggle, cursor tap, drawn skin lines and the
// travelling dotted link are gone.
const S2: React.FC = () => {
  const { fr, on, ls } = useSec();
  const plate = tok(fr, 0, D24.plate, "plate"), pic = tok(fr, on(W.mind), D24.plate, "plate");
  return (
    <>
      <Room glow={[0.5, 0.45]} />
      <div style={{ position: "absolute", left: 380, top: 250, width: 580, height: 580, borderRadius: RADIUS, overflow: "hidden", background: "rgba(219,219,219,.7)", boxShadow: "inset 0 0 0 0.5px rgba(188,188,188,.7)", opacity: plate }}>
        <div style={{ position: "absolute", inset: 0, opacity: pic }}>
          <OffthreadVideo src={staticFile("exomind-skin/flora/head_final_anim.mp4")} muted playbackRate={1.16} style={{ position: "absolute", left: -220, top: 0, width: 1040, height: 580 }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 380, top: 852, ...label(22, MUTE), opacity: pic }}>Illustration</div>
      <div style={{ position: "absolute", left: 1100, top: 430, ...arr(fr, on(W.mind)) }}>
        <RollingLabel label="Our approach" values={[{ text: "the mind", at: ls(W.mind) }, { text: "total skin health", at: ls(W.total1) }]} size={Math.round(HERO * 0.65)} />
      </div>
    </>
  );
};

// s3 (10.95-17.2): the Oct 30 session full frame, kept clean: "Your questions ... your care" names nothing in the picture, so no markup.
// v4's "Session in progress" timer chip (a generic widget with a pulsing dot) is gone; a quiet source credit stays.
const S3: React.FC<{ dur: number }> = ({ dur }) => (
  <>
    <Full src="session.mp4" dur={dur} push={0.05} />
    <Credit text="Exomind session in our office" light left />
  </>
);

// s4 (17.2-27.48): his window left. L14 typed on the rag: "Giveaway winners" types from "giveaway" +1 f; the literal envelope and phone
// arrive on "email" and "phone"; "Check your text messages" types from "check", its chat icon draws on "text"; "After the event" on
// "event". v4's lit chips with a scale bump, the unread badge and the cursor tap are gone.
const S4: React.FC = () => {
  const { fr, on } = useSec();
  const X = 780;
  const item = (icon: string, text: string, at: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, ...arr(fr, at) }}>
      <DrawIcon name={icon} size={40} p={tok(fr, at, 12)} /><span style={label(28)}>{text}</span>
    </div>
  );
  return (
    <>
      <Room glow={[0.7, 0.4]} px={0.3} />
      <div style={{ position: "absolute", left: X, top: TOP, ...arr(fr, 0) }}><span style={label(LAB, MUTE)}>After tonight</span></div>
      <div style={{ position: "absolute", left: X, top: TOP + 70 }}><Typed text="Giveaway winners" start={on(W.giveaway)} style={head(H1)} /></div>
      <div style={{ position: "absolute", left: X, top: TOP + 150, display: "flex", gap: 40 }}>{item("envelope", "Email", on(W.email))}{item("phone", "Phone", on(W.phone))}</div>
      <div style={{ position: "absolute", left: X, top: 560, display: "flex", alignItems: "center", gap: 30 }}>
        <DrawIcon name="chat" size={96} p={tok(fr, on(W.text), 12)} color={fr >= on(W.text) + 12 ? BLUE : INK} />
        <div>
          <Typed text="Check your text messages" start={on(W.check)} style={head(H1)} />
          <div style={{ ...small(28), marginTop: 8, ...arr(fr, on(W.event)) }}>After the event</div>
        </div>
      </div>
    </>
  );
};

// s5 (27.48-37.2): booking by text, then the visit. The thread holds his two lines (the first in place from the first frame, the second
// arriving on "appointment" +1 f). Then L08, the capped cascade ledger: three rows arrive dim on "During" (2 f stagger), and each row's
// ice wipe (`sweep` 14 f) runs on its spoken word: "goals", "history", "appropriate". v4's calendar slot tap, "Booked" tag, cursor, ticks,
// tick sounds and step player are gone.
const S5: React.FC = () => {
  const { fr, on } = useSec();
  const P = { x: M, y: 330, w: 560, h: 400 };
  const bub = (text: string, at: number, y: number) => (
    <div style={{ position: "absolute", top: y, left: 0, maxWidth: 520, padding: "20px 28px 22px", borderRadius: 28, background: "rgba(255,255,255,.9)", ...disp(32), ...arr(fr, at) }}>{text}</div>
  );
  const rows = [
    { n: "01", text: "Discuss your goals", at: on(W.goals) },
    { n: "02", text: "Review your medical history", at: on(W.history) },
    { n: "03", text: "Is Exomind appropriate for you?", at: on(W.appropriate) },
  ];
  const d0 = on(W.during);
  return (
    <>
      <Room glow={[0.3, 0.5]} px={-0.2} />
      {/* v5: no phone outline (a drawn device frame is decoration); the two text bubbles carry "reply to our text" on the canvas */}
      <div style={{ position: "absolute", left: P.x, top: P.y, width: P.w, height: P.h }}>
        {bub("Reply to schedule a consultation", -99, 0)}
        {bub("We'll help you find an appointment", on(W.appointment), 170)}
      </div>
      <div style={{ position: "absolute", left: 840, top: TOP }}>
        <div style={{ ...head(H1), ...arr(fr, d0) }}>During your visit</div>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 36 }}>
          {rows.map((r, i) => {
            const w = tok(fr, r.at, D24.rowWipe), lit = fr >= r.at;
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 28, ...arr(fr, d0 + Math.min(2 * (i + 1), 10)) }}>
                <span style={{ ...label(24, MUTE), fontVariantNumeric: "tabular-nums" }}>{r.n}</span>
                <span style={{ ...disp(44, lit ? INK : MUTE2), padding: "0 0.12em", margin: "0 -0.12em", background: w > 0 ? `linear-gradient(90deg, ${ICE_HL} ${w * 100}%, transparent ${w * 100}%)` : undefined }}>{r.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// s6 (37.2-47.25): the one keyed shot, over the bright plate (v4). The calm glass card answers his lines, one arriving per spoken phrase
// (`arrive` on "sending", "question", "covered", "love"), and the highlighter sweeps "hear about it" on "hear" +1 f. On "Thank" the card's
// lines leave (`exit` 7 f, ending on the word) and "Thank you for joining us" arrives. v4's typing input, send button press, cursor and
// "Live" pill (press UI) and its example question (words he did not say) are gone.
const S6: React.FC = () => {
  const { fr, on, ls } = useSec();
  const t = fr / 24;
  const thank = on(W.thank), out = thank - D24.exit;
  return (
    <>
      <Room glow={[0.25, 0.35]} field={0.6} px={0.2} />
      <div style={{ position: "absolute", left: 120 + 40 * Math.sin(t * 0.3), top: 60, width: 900, height: 900, borderRadius: 999, background: "radial-gradient(closest-side, rgba(255,255,255,.9), rgba(255,255,255,0))" }} />
      <div style={{ ...glass(), left: 1060, top: TOP + 40, width: 700, height: 420, ...arr(fr, on(W.sending)) }}>
        <GlassLife />
        <div style={{ position: "relative", padding: "48px 52px" }}>
          <div style={{ ...arr(fr, on(W.question), out) }}><span style={label(24, MUTE)}>The question box</span></div>
          <div style={{ ...head(H1), marginTop: 22, ...arr(fr, on(W.sending), out) }}>Keep sending your questions</div>
          <div style={{ ...disp(34), marginTop: 64, ...arr(fr, on(W.covered), out) }}>Something we haven't covered?</div>
          <div style={{ marginTop: 18, ...arr(fr, on(W.love), out) }}>
            <Highlighter words={[{ text: "I'd", at: 0 }, { text: "love", at: 0 }, { text: "to", at: 0 }, { text: "hear", at: ls(W.hear) }, { text: "about", at: 0 }, { text: "it.", at: 0 }]} punch={[3, 5]} size={34} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 52, top: 48, right: 52 }}>
          <div style={{ ...head(H1), marginTop: 22 + 24 + 4, ...arr(fr, thank) }}>Thank you for joining us</div>
          <div style={{ ...disp(34, MUTE), marginTop: 24, ...arr(fr, on(W.and2)) }}>and trusting our team with your care.</div>
        </div>
      </div>
    </>
  );
};

// s7 (47.25-51.7): the client's couch/stress shot (v4) full frame, then L09: the BTL film in a glass card on the room canvas with his
// "We look forward to" beside it (arrives on "look"); on "seeing" +1 f the card grows to the full frame (`morph` 26 f, radius 24 -> 0,
// the type and canvas out in 5 f) while the shot keeps playing. The section closes on the L13 blank (`blank` out 11 f) into the chapter.
// v4's callout and the calendar chip with its cursor tap are gone. The trio clip plays at 0.95x so one shot (1.92-4.17 s) spans the card
// and the whole morph.
const CARD = { x: 1060, y: 200, w: 685, h: 560 };
const S7_CARD = 1.36; // local s: the stress shot (stressed.mp4 0.5-1.86 s, one shot) hands over to the card
const S7: React.FC<{ dur: number }> = ({ dur }) => {
  const { fr, on } = useSec();
  const c0 = Math.round(S7_CARD * 24), m0 = on(W.seeing);
  const m = tok(fr, m0, D24.morph, "morph"), sur = 1 - tok(fr, m0, D24.morphSurround, "settle");
  const lerp = (a: number, b: number) => a + (b - a) * m;
  const r = { x: lerp(CARD.x, 0), y: lerp(CARD.y, 0), w: lerp(CARD.w, 1920), h: lerp(CARD.h, 1080), rad: lerp(RADIUS, 0) };
  const end = Math.round(dur * 24);
  const blankOut = tok(fr, end - D24.blank, D24.blank, "blank");
  // object-fit cover, recomputed per frame: the 1920x1080 picture scaled to fill the moving rect, centred
  const s = Math.max(r.w / 1920, r.h / 1080);
  return (
    <>
      <Sequence durationInFrames={c0} layout="none"><Full src="stressed.mp4" from={0.5} dur={S7_CARD} pos="40% 50%" /></Sequence>
      <Sequence from={c0} layout="none">
        <Room glow={[0.3, 0.45]} />
        <div style={{ position: "absolute", left: M, top: 380, opacity: sur }}>
          <div style={{ ...head(H1), ...arr(fr - c0, on(W.look) - c0) }}>We look forward to</div>
        </div>
        <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.rad, overflow: "hidden", background: "#203040" }}>
          <OffthreadVideo src={v("trio.mp4")} muted playbackRate={0.95} startFrom={Math.round(1.96 * 24)} style={{ position: "absolute", left: (r.w - 1920 * s) / 2, top: (r.h - 1080 * s) / 2, width: 1920 * s, height: 1080 * s }} />
        </div>
      </Sequence>
      <div style={{ position: "absolute", inset: 0, opacity: blankOut }}><Room glow={[0.3, 0.45]} /></div>
    </>
  );
};

// s8 (51.7-57.4): chapter. L13 blank crossfade: the room canvas holds 7 f, then the Flora coil clip comes in under it (`blank` in 11 f) as
// the chapter label arrives. Then L02 thesis karaoke: "this comprehensive approach to total skin health." laid out dim 12 f before "this",
// each word cut to ink on its own onset +1 f, the ice block growing under "total skin health." from "total" to "health" (captions hidden
// meanwhile: the line is the caption). It leaves on "For" (`exit` 7 f). v4's three-part list (words he does not say here) and its pops are gone.
const S8: React.FC = () => {
  const { fr, wf, ls } = useSec();
  const hold = D24.blankHold, blankIn = 1 - tok(fr, hold, D24.blank, "blank");
  const words = (["this", "comprehensive", "approach", "to", "total", "skin", "health."] as const).map((text, i) => ({ text, at: ls([W.this, W.comprehensive, W.approach, W.to, W.total, W.skin, W.health][i]) }));
  return (
    <>
      <OffthreadVideo src={staticFile("exomind-skin/flora/coil_s8.mp4")} muted style={{ position: "absolute", inset: 0, width: 1920, height: 1080, objectFit: "cover", transform: "scale(1.12)", transformOrigin: "100% 85%" }} />
      <div style={{ position: "absolute", inset: 0, opacity: blankIn }}><Room glow={[0.3, 0.45]} /></div>
      <div style={{ position: "absolute", left: M, top: TOP, ...arr(fr, hold) }}><span style={label(LAB, MUTE)}>A comprehensive approach</span></div>
      {/* the coil drifts left through the clip (lateral dolly), so the line sits on the calm glass (frost + hairline, DEC 12), not bare footage */}
      <div style={{ ...glass(), left: M - 48, top: 300, width: 900, padding: "44px 48px 52px", ...arr(fr, wf(W.this) - 12, wf(W.forMe)) }}>
        <Highlighter words={words} punch={[4, 6]} mode="karaoke" size={80} maxWidth={800} dim="#9aa3ad" />
      </div>
      <div style={{ position: "absolute", left: M, top: 880, ...label(22, "#5b6f8a"), ...arr(fr, hold) }}>Illustration</div>
      <Sfx at={hold / 24} name="swish" gain={0.3} />
    </>
  );
};

// s9 (57.4-64.95): his panel left. L17, the ledger built in place, one step per spoken word: "The next frontier" on "frontier"; the left
// column "Caring for the skin" (literal face) on "care"; on "beyond" the divider draws (`sweep` 12 f: it separates the two columns) and
// "Beyond" (literal brain) arrives with the highlighter sweeping it; "Classic treatments" joins the left column in grey on "classic". v4's
// dashed frontier line, timeline and dragged cursor are gone.
const S9: React.FC = () => {
  const { fr, on, ls } = useSec();
  const X0 = 990, XR = 1430, Y = 360;
  const b = on(W.beyond);
  return (
    <>
      <Room glow={[0.7, 0.5]} px={0.2} />
      <div style={{ position: "absolute", left: X0, top: TOP, ...head(H1), ...arr(fr, on(W.frontier)) }}>The next frontier</div>
      {/* roko-g R8 focus: when "Beyond" arrives the left column steps back to 0.5 (`sweep` 10 f) and Beyond nudges 4 px */}
      <div style={{ position: "absolute", left: X0, top: Y, width: 380, ...arr(fr, on(W.care)), opacity: Math.min(tok(fr, on(W.care), D24.arrive, "arrive"), 1 - 0.4 * tok(fr, b, 10)) }}>
        <DrawIcon name="face" size={72} p={tok(fr, on(W.care), 12)} />
        <div style={{ ...disp(44), marginTop: 24 }}>Caring for the skin</div>
        <div style={{ ...label(26, INK), marginTop: 22, ...arr(fr, on(W.classic)) }}>Classic treatments</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${XR - 40} ${Y} V ${Y + 300}`} stroke={MUTE} strokeWidth={1} pathLength={1} strokeDasharray={`${tok(fr, b, 12)} 1`} />
      </svg>
      <div style={{ position: "absolute", left: XR + 4 * tok(fr, b + D24.arrive, 10), top: Y, ...arr(fr, b) }}>
        <DrawIcon name="brain" size={72} p={tok(fr, b, 12)} color={BLUE} />
        <div style={{ marginTop: 24 }}><Highlighter words={[{ text: "Beyond", at: ls(W.beyond) }]} punch={[0, 0]} size={44} /></div>
      </div>
    </>
  );
};

// s10 (64.95-69.9; v4 cut at 69.4): L23, the labelled split, at native scale per half: the restless night (BTL) | calm (BTL smile, then the hiker). Hard
// cut at the section start, the centre hairline draws top to bottom (`sweep` 10 f from +2 f); "How our emotions" arrives on "how" and the
// highlighter sweeps "emotions" on its onset +1 f. v4's "Stress" label (he never says stress), the slider and its dragged knob are gone.
const S10: React.FC = () => {
  const { fr, on, ls } = useSec();
  const half = (children: React.ReactNode, left: number) => <div style={{ position: "absolute", left, top: 0, width: 960, height: 1080, overflow: "hidden" }}>{children}</div>;
  // v5 halves (yt_assets.sh): stressed2_v5 = one shot slowed with frame blending over the 4.95 s section; smile_v5 = the first calm shot
  // over 57 f; then the hiker's shot from its first frame (0.667 s) at 1x
  const hk = 57;
  return (
    <>
      {half(<OffthreadVideo src={v("stressed2_v5.mp4")} muted style={{ position: "absolute", left: -480, top: 0, width: 1920, height: 1080 }} />, 0)}
      {half(<>
        <Sequence durationInFrames={hk} layout="none"><OffthreadVideo src={v("smile_v5.mp4")} muted style={{ position: "absolute", left: -480, top: 0, width: 1920, height: 1080 }} /></Sequence>
        <Sequence from={hk} layout="none"><OffthreadVideo src={v("hiker.mp4")} muted startFrom={16} style={{ position: "absolute", left: -760, top: 0, width: 1920, height: 1080 }} /></Sequence>
      </>, 960)}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M960 0 V 1080" stroke="#fff" strokeWidth={1} pathLength={1} strokeDasharray={`${tok(fr, 2, 10)} 1`} />
      </svg>
      <div style={{ position: "absolute", left: 960 + 64 - 140, top: TOP - 40 - 90, width: 820, height: 260, background: "radial-gradient(50% 50% at 50% 50%, rgba(16,24,40,.30) 0%, rgba(16,24,40,.16) 45%, rgba(16,24,40,0) 100%)", opacity: tok(fr, on(W.how), D24.arrive, "arrive") }} />
      <div style={{ position: "absolute", left: 960 + 64, top: TOP - 40, ...arr(fr, on(W.how)) }}>
        <Highlighter words={[{ text: "How", at: 0 }, { text: "our", at: 0 }, { text: "emotions", at: ls(W.emotions) }]} punch={[2, 2]} size={58} other="#fff" />
      </div>
    </>
  );
};

// s11 (69.9-82.72): how it works, four real pictures, hard cuts on his words (v4 cross-faded inside the section; MOTION: 0 crossfades):
//   A 0 -> "create": the Oct 30 session in a window; L07 dim-the-rest on "technology" +1 f: the window dims to 0.45 outside the coil
//     (`sweep` 12 f), a 1 px white box draws round it (+4 f, 14 f), a leader (+10 f, 8 f) to "Exomind coil" (+12 f; Evident G4 T2 places
//     annotation -8 to +9 f of the word, so the beat fits before the cut). The box is on the device, clear of her face.
//   B "create" -> "rewire": the Flora glass head full frame at 1.3x; L03 trace: the path from the coil pad into the brain (`sweep` 14 f)
//     lands its ring (`arrive` 5 f) on "neuroplasticity" +1 f, then the hairline leader and the label typed 1 char/frame. Hero sound.
//   C "rewire" -> "we": the Flora neurons full frame (1.194x so the clip spans the beat); L04: each junction gets a thin ring (`sweep` 6 f)
//     on the frame it lights (measured, edits/exomind-skin/v5/junctions.json), and a literal count of the rings on screen; L14 typed
//     "Neurotransmitter production" from "neurotransmitter" and "production".
//   E "we" -> end: her, calm under the coil, in a window; L19 the busy line settles into one wave (`sweep` 26 f) landing on "focused",
//     "Focused," and "in flow" arrive on their words.
// v4's step player, pulse rings and "Magnetic pulses" (not his words), the "+24 new connections" counter (an uncited number) and the
// "Prefrontal cortex" hairline are gone.
const JUNCTIONS = [{ x: 788, y: 569, f: 42 }, { x: 1175, y: 771, f: 47 }, { x: 1642, y: 757, f: 65 }, { x: 555, y: 509, f: 86 }, { x: 1473, y: 286, f: 88 }, { x: 1056, y: 331, f: 100 }, { x: 1337, y: 751, f: 103 }];
const AW = { x: M, y: 190, w: 1570, h: 740 };
const S11: React.FC<{ dur: number }> = () => {
  const { fr, wf, on } = useSec();
  const B = wf(W.create), C = wf(W.rewire), E = wf(W.we);
  const credit = fr < B || fr >= E ? "Exomind session in our office" : "Illustration";
  return (
    <>
      <Room glow={[0.5, 0.45]} field={0.5} />
      <Sequence durationInFrames={B} layout="none"><S11A t0={on(W.technology)} /></Sequence>
      <Sequence from={B} durationInFrames={C - B} layout="none"><S11B ring={on(W.neuroplasticity) - B} /></Sequence>
      <Sequence from={C} durationInFrames={E - C} layout="none"><S11C len={E - C} label0={1} type1={on(W.neurotransmitter) - C} type2={on(W.production) - C} /></Sequence>
      <Sequence from={E} layout="none"><S11E focused={on(W.focused) - E} flow={on(W.flow) - E} /></Sequence>
      <Credit text={credit} light={fr >= B && fr < E ? false : false} />
      <Sfx at={on(W.neuroplasticity) / 24} name="pop" gain={0.45} />
    </>
  );
};
const S11A: React.FC<{ t0: number }> = ({ t0 }) => {
  const fr = useCurrentFrame();
  const k = 0.82 + 0.04 * clamp(fr / 24 / 5.6);
  const tx = AW.w / 2 - 960 * k, ty = AW.h / 2 - 470 * k;
  const sc = (x: number, y: number) => [AW.x + tx + x * k, AW.y + ty + y * k];
  // the coil housing and band in session.mp4 source px (frame at 7 s): x 395-700, y 225-610; her face starts at x ~700
  const [bx, by] = sc(395, 225), [bx2, by2] = sc(700, 610);
  const pDim = tok(fr, t0, 12), pBox = tok(fr, t0 + 4, D24.rowWipe), pLead = tok(fr, t0 + 10, 8);
  const L = { x: bx - 40, y: AW.y + 60 };
  return (
    <>
      <div style={{ position: "absolute", left: AW.x, top: AW.y, width: AW.w, height: AW.h, borderRadius: RADIUS, overflow: "hidden", boxShadow: elev, background: "#ddd" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${k})` }}>
          <OffthreadVideo src={v("session.mp4")} muted startFrom={7 * 24} style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }} />
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <mask id="v5dim"><rect x={AW.x} y={AW.y} width={AW.w} height={AW.h} rx={RADIUS} fill="white" /><rect x={bx} y={by} width={bx2 - bx} height={by2 - by} rx={12} fill="black" /></mask>
        </defs>
        <rect x={AW.x} y={AW.y} width={AW.w} height={AW.h} fill="rgb(16,24,40)" opacity={0.45 * pDim} mask="url(#v5dim)" />
        {pBox > 0 && <rect x={bx} y={by} width={bx2 - bx} height={by2 - by} rx={12} fill="none" stroke="#fff" strokeWidth={1} pathLength={1} strokeDasharray={`${pBox} 1`} />}
        {pLead > 0 && <line x1={bx} y1={by} x2={bx + (L.x - bx) * pLead} y2={by + (L.y + 16 - by) * pLead} stroke="#fff" strokeWidth={1} />}
      </svg>
      <div style={{ position: "absolute", left: L.x - 12, top: L.y - 12, transform: "translateX(-100%)", ...caps(28, "#fff"), ...arr(fr, t0 + 12) }}>Exomind coil</div>
    </>
  );
};
const S11B: React.FC<{ ring: number }> = ({ ring }) => {
  const fr = useCurrentFrame();
  // full-frame px on head_final_anim (1928x1076 cover): coil pad ~(1140, 250), the brain under it ~(1060, 392); measured on frames at
  // clip 1.4-3.9 s (camera drift < 20 px over the span shown)
  const R = { x: 1062, y: 392, r: 28 }, lab = { x: 560, y: 330 };
  const pPath = tok(fr, ring - 14, 14), pRing = tok(fr, ring, D24.ring, "arrive"), pLead = tok(fr, ring + 1, 8);
  const text = "Neuroplasticity", n = Math.max(0, Math.min(text.length, fr - (ring + 1 + 4)));
  return (
    <>
      <OffthreadVideo src={staticFile("exomind-skin/flora/head_final_anim.mp4")} muted playbackRate={1.3} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, objectFit: "cover" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M1140 250 C1132 300, 1100 350, 1078 372" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${pPath} 1`} />
        {pRing > 0 && <circle cx={R.x} cy={R.y} r={R.r + 4 * (1 - pRing)} fill="none" stroke={BLUE} strokeWidth={3} opacity={pRing} />}
        {pLead > 0 && <line x1={R.x - R.r} y1={R.y} x2={R.x - R.r - (R.x - R.r - lab.x) * pLead} y2={R.y + (lab.y - R.y) * pLead} stroke={INK} strokeWidth={1.2} />}
      </svg>
      <p style={{ position: "absolute", right: 1920 - lab.x + 16, top: lab.y - 20, margin: 0, ...caps(30, INK) }}>
        <span>{text.slice(0, n)}</span><span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
      </p>
    </>
  );
};
const NEURO_RATE = 5.042 / ((Math.round(W.we * 24) - Math.round(W.rewire * 24)) / 24);
const S11C: React.FC<{ len: number; label0: number; type1: number; type2: number }> = ({ label0, type1, type2 }) => {
  const fr = useCurrentFrame();
  const rings = JUNCTIONS.map((j) => ({ ...j, at: Math.round(j.f / NEURO_RATE) }));
  const lit = rings.filter((j) => fr >= j.at).length;
  return (
    <>
      <OffthreadVideo src={staticFile("exomind-skin/flora/neuro_anim.mp4")} muted playbackRate={NEURO_RATE} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, objectFit: "cover" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {rings.map((j, i) => fr >= j.at && <circle key={i} cx={j.x} cy={j.y} r={18} fill="none" stroke="#fff" strokeWidth={1.5} pathLength={1} strokeDasharray={`${tok(fr, j.at, 6)} 1`} transform={`rotate(-90 ${j.x} ${j.y})`} />)}
      </svg>
      <div style={{ position: "absolute", left: M, top: TOP, ...arr(fr, label0) }}>
        <div style={head(H1)}>Rewire the brain</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 16, opacity: lit ? 1 : 0 }}>
          <span style={{ ...disp(44, INK), fontVariantNumeric: "tabular-nums" }}>{lit}</span>
          <span style={label(22, INK)}>junctions ringed in this clip</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: M, top: 730, opacity: fr >= type1 ? 1 : 0 }}>
        <div style={{ display: "inline-block", padding: "14px 22px 16px", borderRadius: RADIUS, background: "rgba(250,249,246,.72)", backdropFilter: "blur(14px)" }}>
          <Typed text="Neurotransmitter" start={type1} style={disp(34)} /><br />
          <Typed text="production" start={type2} style={disp(34)} />
        </div>
      </div>
    </>
  );
};
const S11E: React.FC<{ focused: number; flow: number }> = ({ focused, flow }) => {
  const fr = useCurrentFrame(), t = fr / 24;
  const calm = tok(fr, focused - 26, 26), Wd = 470;
  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = i * (Wd / 79);
    const busy = 34 * Math.sin(i * 1.7 + t * 9) * Math.sin(i * 0.31 + t * 2) + 14 * Math.sin(i * 3.1 - t * 7);
    return `${x.toFixed(1)},${(50 + busy * (1 - calm) + 34 * Math.sin(i * 0.16 - t * 2.4) * calm).toFixed(1)}`;
  });
  return (
    <>
      <div style={{ position: "absolute", left: 679, top: 250, width: 1066, height: 600, borderRadius: RADIUS, overflow: "hidden", boxShadow: elev }}>
        <OffthreadVideo src={v("session.mp4")} muted startFrom={Math.round(12.5 * 24)} style={{ position: "absolute", left: -330, top: -110, width: 1600, height: 900 }} />
      </div>
      <div style={{ position: "absolute", left: M, top: 330, width: Wd }}>
        <div style={{ ...disp(62), ...arr(fr, focused) }}>Focused,</div>
        <div style={{ ...disp(62), ...arr(fr, flow) }}>in flow</div>
        <svg width={Wd} height={100} style={{ marginTop: 40, overflow: "visible" }}>
          <polyline points={pts.join(" ")} fill="none" stroke={calm > 0.5 ? BLUE : INK} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
};

// s12 (82.72-87.15): L21 another voice: her window comes in plate-then-picture (plate 18 f, picture 18 f), her words in italic (her
// register, Evident R14), credited. Then his line built in place: "Feel better" arrives on "feel"; "translates into better skin" arrives
// on "translate" and the highlighter sweeps "better skin" on "better" +1 f (hero sound). v4's lit pill nodes, icons and drawn arrow are gone.
const S12: React.FC = () => {
  const { fr, on, ls } = useSec();
  const plate = tok(fr, 0, D24.plate, "plate"), pic = tok(fr, D24.plate, D24.plate, "plate");
  return (
    <>
      <Room glow={[0.3, 0.45]} px={-0.3} />
      <div style={{ position: "absolute", left: M - 25, top: 110, width: 440, height: 780, borderRadius: 9, overflow: "hidden", background: "rgba(219,219,219,.7)", opacity: plate }}>
        <OffthreadVideo src={v("patient.mp4")} muted style={{ width: 440, height: 780, opacity: pic }} />
      </div>
      <div style={{ position: "absolute", left: 760, top: 200 }}>
        <div style={{ ...disp(64, "#5b6f8a"), fontStyle: "italic", ...arr(fr, D24.plate) }}>“It quiets my brain.”</div>
        <div style={{ ...small(26, 500), marginTop: 16, ...arr(fr, D24.plate + 12) }}>An Exomind patient, in our office</div>
        <div style={{ ...head(H1), marginTop: 110, ...arr(fr, on(W.feel)) }}>Feel better</div>
        <div style={{ marginTop: 14, ...arr(fr, on(W.translate)) }}>
          <Highlighter words={[{ text: "translates", at: 0 }, { text: "into", at: 0 }, { text: "better", at: ls(W.better) }, { text: "skin", at: ls(W.skin2) }]} punch={[2, 3]} size={44} />
        </div>
      </div>
      <Sfx at={on(W.better) / 24} name="yes" gain={0.4} />
    </>
  );
};

// s13 (87.15-90.23): the BTL smile, the calm glass card with the call to action; lines arrive on `arrive` with a 2 f cascade (not tied to
// a word: he has finished). v4's "Book now" button press and cursor are gone.
// et-al's line-mask reveal (each line rises from 100 % inside its own clip, 60 ms apart) on our `swap` curve (softunion S2, 16 f), in
// newapology's case-arrive order (label, title, caption, handle; 85 ms = 2 f steps, capped at 10 f)
const Mask: React.FC<{ start: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ start, children, style }) => {
  const { fr } = useSec();
  const p = tok(fr, start, D24.swap, "swap");
  return <div style={{ overflow: "hidden", paddingBottom: "0.12em", ...style }}><div style={{ transform: `translateY(${(1 - p) * 110}%)`, opacity: fr >= start ? 1 : 0 }}>{children}</div></div>;
};
const S13: React.FC<{ dur: number }> = ({ dur }) => {
  const { fr } = useSec();
  const a = (i: number) => 2 + Math.min(i * 2, 10);
  return (
    <>
      <Full src="smile_close.mp4" dur={dur} push={0.05} />
      <div style={{ ...glass(), left: 1250, top: 300, width: 520, height: 340, ...arr(fr, 0) }}>
        <GlassLife />
        <div style={{ position: "relative", padding: "44px 46px" }}>
          <Mask start={a(0)}><div style={label(26, MUTE)}>Dr. Ariel Ostad</div></Mask>
          <Mask start={a(1)} style={{ marginTop: 26 }}><div style={head(H1)}>Book a consultation.</div></Mask>
          <Mask start={a(2)} style={{ marginTop: 12 }}><div style={small(28)}>Link in the description.</div></Mask>
          <Mask start={a(3)} style={{ marginTop: 40 }}><div style={small(26, 500)}>@drarielostad</div></Mask>
        </div>
      </div>
      <Sfx at={0} name="card" gain={0.45} />
    </>
  );
};

const BODY: Record<string, React.FC<{ dur: number }>> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7, s8: S8, s9: S9, s10: S10, s11: S11, s12: S12, s13: S13 };
const AROLL: Record<string, "panelR" | "panelL" | "window"> = { s1: "panelR", s4: "window", s9: "panelL" };
const NAVY: Zone = { left: M, width: 1570, top: 950, ink: "navy" };

export const OstadYT5: React.FC<YTProps> = ({ spec }) => {
  useElza(TYPEFACE === "helvetica" ? HN_NEED : []);
  const { fps } = useVideoConfig();
  if (!spec) return <AbsoluteFill style={{ background: BG0 }} />;
  const f = (s: number) => Math.round(s * fps);
  // v5 timing change (one): s10 runs to 69.9 s instead of 69.4 s so the "emotions" highlighter (onset 68.94 + 1 f + 16 f = 69.67 s) lands
  // and holds before the cut; s11 starts 0.5 s later (still inside "improve", 69.48-70.3) and its opening session beat is 0.5 s shorter
  const S: YTSection[] = spec.yt.sections.map((s) => s.kind === "s10" ? { ...s, dur: s.dur + 0.5 } : s.kind === "s11" ? { ...s, at: s.at + 0.5, dur: s.dur - 0.5 } : s), K = spec.yt.keyed;
  const s6 = S.find((s) => s.kind === "s6"), s7 = S.find((s) => s.kind === "s7")!, s8 = S.find((s) => s.kind === "s8")!;
  const kStart = K.at / spec.speed;
  // s7: the canvas phase (card) and the blank take navy captions; the full frame after the morph's midpoint takes white
  const s7card = (f(s7.at) + Math.round(S7_CARD * 24)) / fps, s7mid = (Math.round(W.seeing * 24) + 1 + 20) / fps, s7blank = (f(s8.at) - D24.blank) / fps;
  return (
    <AbsoluteFill style={{ background: BG0 }}>
      {S.map((s, i) => {
        const B = BODY[s.kind];
        return (
          <Sequence key={i} from={f(s.at)} durationInFrames={f(s.dur)} name={s.kind}>
            <Sec.Provider value={s.at}>
              <B dur={s.dur} />
              {AROLL[s.kind] && <ARoll at={s.at} speed={spec.speed} src={spec.footage} box={AROLL[s.kind]} />}
            </Sec.Provider>
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
      <YTCaptions captions={spec.captions} keywords={spec.keywords ?? []} sections={S}
        hide={[[W.this, W.forMe]]}
        override={[{ from: s7card, to: s7mid, zone: NAVY }, { from: s7blank, to: s8.at, zone: NAVY }]} />
    </AbsoluteFill>
  );
};
// keep the v4 caption zones referenced (s7 white over footage outside the overrides)
void ZONES; void TEXT;
