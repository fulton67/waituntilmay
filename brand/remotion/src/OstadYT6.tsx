import React, { useLayoutEffect } from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import BEATS from "../../../research/ostad/style/exomind/beats.json";
import { Arrow, type Pt } from "./devices/Arrow";
import { faceBox, follow, landmark, useTrack, type LayerTransform, type Track } from "./devices/track";
import { C, SANS, SKIN_DISCLAIMER, caps, cl, display, drift, ease, p, roomBg, text, useExoFonts } from "./exo6/look";
import { Disclaimer, Glass, Sweep, src } from "./exo6/parts";
import { EndCard, SectionCard, WordmarkDepthSandwich } from "./exo6/Cards";
import { ProductPlateReveal } from "./exo6/ProductPlateReveal";
import { FlowDiagramBuild } from "./exo6/FlowDiagramBuild";
import { CardFullMorph } from "./exo6/CardFullMorph";
import { SpatialGlassUI } from "./exo6/SpatialGlassUI";
import { PhoneMessage } from "./exo6/PhoneMessage";
import { CalendarDateCircle, calendarSlotCenter } from "./exo6/CalendarDateCircle";
import { IntakeFormFill } from "./exo6/IntakeFormFill";
import { QuoteCardCarousel } from "./exo6/QuoteCardCarousel";
import { ChecklistLedger } from "./exo6/ChecklistLedger";
import { WindowedFootage } from "./exo6/WindowedFootage";
import { SessionTimeline } from "./exo6/SessionTimeline";
import { DonutRingFill } from "./exo6/DonutRingFill";
import { TypeNameDecode } from "./exo6/TypeNameDecode";
import { SplitLabelled } from "./exo6/SplitLabelled";
import { FieldThroughSkull } from "./exo6/FieldThroughSkull";
import { RewireTrace } from "./exo6/RewireTrace";
import { PulseTrainSynapse } from "./exo6/PulseTrainSynapse";
import { IconCalendar, IconChat, IconClipboard, IconGift, IconMail, IconPhone } from "./exo6/icons";
import type { YTSpec } from "./OstadYT";
import type { Caption } from "./types";

// OstadYT6: YouTube v6 of "Exomind and total skin health" (research/ostad/style/DECISIONS.md 14l). It implements
// research/ostad/style/exomind/beats.json frame for frame: 20 beats, the title (B01), four section cards, the end card, 2166 f at
// 24 fps on the 1.15x edit. One presentation: Ostad keyed (matte_fgr_cut + matte_pha_cut, the whole cut) on the cream room canvas,
// left third, 0.7x at (-30, -150), in every beat; he steps out only on the full-bleed beats (B04 while the consult clip fills the
// frame, B12 into the pip circle, B17-B18). Components: exo6/*, devices/Arrow, devices/TypeEntry. Word-timed captions, typed SFX
// (card / swish / pop / yes, beats.json `sfx`; the hero event of each beat at full gain, the rest at -12 dB, MOTION M19). No LUT:
// the rosacea method has none (client), so his skin stays true.
// v4.1 glitch_fix.patch, applied the v6 way: every beat is a Sequence from its start_f to end_f + 1 (beats tile the timeline with no
// gap and no overlap, so no frame falls between two sections), and every clip in-point was checked against the clip's own shot cuts
// (DECISIONS 14l), and every component's exit (exitAt + 7 f, + its stagger) ends inside its beat, so nothing is cut off at a beat
// line (measured: no single-frame flash, frame diffs > 12 grey levels only at the intended cuts and morphs). Pass `plain` to render only the room and the presenter (for the face-overlap pixel diff), `audit` to log the
// smallest on-screen text per frame.
export type YT6Props = { spec?: YTSpec; plain?: boolean; audit?: boolean };

type Beat = { id: string; start_f: number; end_f: number; sfx: [number, string][]; sfx_hero?: [number, string] };
const BT: Record<string, Beat> = Object.fromEntries((BEATS.beats as unknown as Beat[]).map((b) => [b.id, b]));
const S = (id: string) => BT[id].start_f;
const DUR = (id: string) => BT[id].end_f - BT[id].start_f + 1;
const END = BEATS.cards.find((c) => c.kind === "end")!;

/** the one presenter placement (the keyed layer): 0.7x of his 1080x1920 frame, top-left at (-30, -150) */
export const LAYER6: LayerTransform = { scale: 0.7, x: -30, y: -150 };
const KEYED = "exomind-skin/yt/presenter_cut_k.webm"; // 756x1344 VP9 alpha, matte_fgr_cut + matte_pha_cut (the whole 100.9 s cut)
const SPEED = 1.15;

const Presenter: React.FC<{ opacity?: number; seqFrom?: number; style?: React.CSSProperties }> = ({ opacity = 1, seqFrom = 0, style }) => (
  <div style={{ position: "absolute", left: LAYER6.x, top: LAYER6.y, width: 1080 * LAYER6.scale, height: 1920 * LAYER6.scale, opacity, ...style }}>
    <OffthreadVideo src={staticFile(KEYED)} muted transparent playbackRate={SPEED} startFrom={Math.round(seqFrom * SPEED)} style={{ width: "100%", height: "100%" }} />
  </div>
);

/** a uniform scale on a whole beat layer (16:9 sizing), about a comp-space origin */
const Stage: React.FC<{ k: number; ox: number; oy: number; children: React.ReactNode }> = ({ k, ox, oy, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${k})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</div>
);

// ------------------------------------------------------------------------------------------------ section card sizes
// The headline is the card: set as large as the free canvas right of him allows (x 700-1870), never small text beside him.
const sectionSize = (title: string) => Math.min(220, Math.round(1120 / (0.47 * title.length)));
const Section: React.FC<{ num: string; title: string }> = ({ num, title }) => {
  const size = sectionSize(title);
  return <SectionCard num={num} title={title} start={0} x={700} y={540 - size * 0.62} size={size} />;
};

// ------------------------------------------------------------------------------------------------ name super (B01, f26 -> f98)
const NameSuper: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const q = p(f, at, 14, ease.arrive), o = p(f, out, 7, ease.exit);
  return (
    <div style={{ position: "absolute", left: 64, top: 836 + (1 - q) * 16 + o * 7 + drift(f, 2, 120), opacity: q * (1 - o) }}>
      <Glass r={22} t={f - at} style={{ position: "relative", padding: "20px 30px 22px" }}>
        <div style={{ ...text(40, 500) }}>Dr. Ariel Ostad</div>
        <div style={{ ...text(28, 400, C.ink2), marginTop: 4 }}>Triple Board-Certified Dermatologist</div>
      </Glass>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ B16: emotions -> skin, sourced (bar-build)
// Naim's review of v6 (DECISIONS 14m): the ring round his head pointed at nothing and the BTL face meant nothing. His line here is
// "how our emotions improve our skin", so the beat shows one sourced, specific fact about emotions and skin, built like the rosacea
// edit's cited cards: the National Rosacea Society survey of 1,066 rosacea patients, where emotional stress (79 %) is the
// second most reported flare trigger, just under sun exposure (81 %) and above hot weather (75 %). The bars grow one by one
// (bar-build, 26 f each, DDOS f421-693); on "emotions" the stress row lights and a callout leaves his head (track: tail on his
// templeR, 40 px outside the face mesh, followed per frame) and lands on that row: the arrow goes from the speaker's mind to the
// emotion on the chart, a real target. ⚠ physician check: the survey figures (TODO).
const TRIGGERS = [
  { label: "Sun exposure", v: 81 },
  { label: "Emotional stress", v: 79, key: true },
  { label: "Hot weather", v: 75 },
];
const B16Card = { x: 1040, y: 70, w: 800, h: 690 };
const B16RowY = (i: number) => B16Card.y + 268 + i * 128;
const B16Triggers: React.FC<{ track: Track }> = ({ track }) => {
  const f = useCurrentFrame();
  const c = B16Card;
  const q = p(f, 1, 14, ease.arrive), o = p(f, 102, 7, ease.exit);
  const lit = p(f, 55, 8, ease.arrive);
  const tail = follow(track, "templeR", LAYER6, undefined, { x: 40, y: -6 });
  const offTail = (lf: number) => tail(lf + S("B16"));
  const barX = 54, barW = c.w - 108;
  return (
    <>
      <div style={{ position: "absolute", left: c.x, top: c.y + (1 - q) * 16 + o * 7 + drift(f, 3, 140), width: c.w, height: c.h, opacity: q * (1 - o) }}>
        <Glass r={30} t={f} style={{ inset: 0 }} />
        <div style={{ position: "absolute", left: barX, top: 46, ...caps(26, C.blue) }}>Rosacea flare triggers</div>
        <div style={{ position: "absolute", left: barX, top: 90, width: barW, ...display(60) }}>What patients say sets off their skin</div>
        {TRIGGERS.map((t, i) => {
          const g = p(f, 14 + i * 9, 26, ease.sweep);
          const y = B16RowY(i) - c.y;
          const on = t.key ? lit : 0;
          return (
            <div key={t.label} style={{ position: "absolute", left: barX, top: y, width: barW }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ ...text(36, 500, t.key ? C.ink : C.ink2) }}>{t.key ? <Sweep at={55}>{t.label}</Sweep> : t.label}</div>
                <div style={{ ...text(40, 500, t.key && on > 0 ? C.blue : C.ink2), opacity: g }}>{Math.round(t.v * g)}%</div>
              </div>
              <div style={{ position: "relative", marginTop: 12, height: 22, borderRadius: 11, background: "rgba(32,37,50,.07)" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${t.v * g}%`, borderRadius: 11,
                  background: t.key ? `rgba(55,169,232,${0.45 + 0.55 * on})` : "rgba(32,37,50,.22)", boxShadow: t.key && on > 0 ? `0 0 ${18 * on}px rgba(55,169,232,.55)` : undefined }} />
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: barX, bottom: 38, width: barW, ...text(27, 400, C.ink2), opacity: p(f, 40, 10) }}>National Rosacea Society survey of 1,066 patients</div>
      </div>
      <Arrow variant="curved-callout" from={offTail} to={{ x: c.x + 40, y: B16RowY(1) + 24 }} start={55} end={109} color={C.blue} bend={-0.24} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ B20: the patient, then her words
// Naim's review (DECISIONS 14m): no stock face with a zoom box. "help us just feel better ..." is shown by the practice's own patient
// (P0001, consent unknown: on the client approval list) sitting up on the treatment bed after her session (Nov 5 2026 consult,
// raw 29.6-34.4 s, cropped to her, muted; his voice carries on), then her exact words from that clip's transcript as a quote card
// in italic (type-italic-voice): "It quiets my brain." A dashed flow goes from her clip to her words. The skin disclaimer stays.
const B20Patient: React.FC = () => {
  const f = useCurrentFrame();
  const card = { x: 720, y: 70, w: 560, h: 700 };
  const qc = { x: 1440, y: 250, w: 430, h: 330 };
  const q = p(f, 1, 14, ease.arrive), o = p(f, 97, 7, ease.exit);
  const qq = p(f, 58, 14, ease.arrive);
  const z = 1.06 - 0.06 * ease.blank(cl(f / 96));
  return (
    <>
      <div style={{ position: "absolute", left: card.x, top: card.y + (1 - q) * 16 + o * 7, width: card.w, height: card.h, opacity: q * (1 - o), borderRadius: 26, overflow: "hidden",
        boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <OffthreadVideo src={staticFile("exomind-skin/clinic/p0001_quiet.mp4")} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z})`, transformOrigin: "60% 40%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,26,0) 62%, rgba(14,18,26,.45))" }} />
        <div style={{ position: "absolute", left: 28, bottom: 26, ...caps(26, "rgba(255,255,255,.92)") }}>After her session</div>
      </div>
      <Arrow variant="dashed-flow" from={{ x: card.x + card.w + 12, y: card.y + 250 }} to={{ x: qc.x - 16, y: qc.y + 120 }} start={50} end={104} color={C.blue} bend={-0.25} />
      {f >= 58 && (
        <div style={{ position: "absolute", left: qc.x, top: qc.y + (1 - qq) * 16 + o * 7 + drift(f, 2, 130), width: qc.w, height: qc.h, opacity: qq * (1 - o) }}>
          <Glass r={26} t={f - 58} style={{ inset: 0 }} />
          <div style={{ position: "absolute", left: 40, top: 42, right: 36, ...display(66), fontStyle: "italic" }}>“It quiets my brain.”</div>
          <div style={{ position: "absolute", left: 40, top: 200, right: 30, ...text(28, 500, C.ink2) }}>Patient, Dr. Ostad’s office</div>
        </div>
      )}
      <Disclaimer at={74} out={97} text={SKIN_DISCLAIMER} style={{ left: qc.x, top: qc.y + qc.h + 30, width: qc.w, lineHeight: 1.3 }} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ B12: his pip, centred by the track
// Naim's review (DECISIONS 14m): his head sat low in the circle and was cropped. The keyed layer inside the 260 px circle is now
// placed per frame from the head track: the mesh face box's centre sits on the circle's centre, and the scale (held for the beat, so
// it never pumps) makes his head box 46 % of the circle, so head + top of the shoulders fill ~78 % of it (Naim's note 9; measured by
// research/ostad/style/tools/pip_verify.py). The mask is a clip-path circle with the rim over its edge (PortraitPipCircle).
const PIP_D = 260;
const pipInner = (track: Track, gf: number, s: number): React.CSSProperties => {
  const fb = faceBox(track, gf, { scale: 1, x: 0, y: 0 });
  if (!fb) return { left: 26, top: -168, width: 480 };
  return { left: PIP_D / 2 - s * (fb.x + fb.w / 2), top: PIP_D / 2 - s * (fb.y + fb.h / 2), width: 1080 * s };
};
const B12Session: React.FC<{ track: Track }> = ({ track }) => {
  const f = useCurrentFrame();
  const mid = S("B12") + Math.round(DUR("B12") / 2);
  const hb = faceBox(track, mid, { scale: 1, x: 0, y: 0 }, undefined, true)!;
  const s = (0.46 * PIP_D) / hb.h;
  return (
    <SessionTimeline pipInner={pipInner(track, S("B12") + f, s)}
      presenter={<OffthreadVideo src={staticFile(KEYED)} muted transparent playbackRate={SPEED} startFrom={Math.round(S("B12") * SPEED)} style={{ width: "100%" }} />} />
  );
};

// ------------------------------------------------------------------------------------------------ captions (word-timed)
// NHG Text 500 (the v6 label face), navy on the room, white over full-bleed footage; every word cuts on at its measured onset
// (yt_words.json via props_yt.json), the rest of the line holds its place invisibly (v3 fix, still the rule). One zone: under the
// graphics, right of him (x 720-1870, top 958), so a caption never sits on his face or on a card.
const Captions: React.FC<{ captions: Caption[]; keywords: string[]; white: boolean }> = ({ captions, keywords, white }) => {
  const f = useCurrentFrame();
  const on = (c: Caption) => Math.min(c.from, c.words?.[0] ?? c.from);
  const line = captions.find((c) => f >= Math.round(on(c) * 24) && f < Math.round(c.to * 24));
  if (!line) return null;
  const keys = new Set(keywords.map((k) => k.toLowerCase()));
  const px = Math.min(46, Math.floor(1120 / (0.53 * line.text.length)));
  return (
    <div style={{ position: "absolute", left: 720, width: 1150, top: 958 }}>
      {white && <div style={{ position: "absolute", left: -120, right: -120, top: -70, height: px * 1.27 + 140, background: "radial-gradient(50% 50% at 50% 50%, rgba(16,24,40,.34) 0%, rgba(16,24,40,.18) 45%, rgba(16,24,40,0) 100%)" }} />}
      <p style={{ position: "relative", margin: 0, font: `500 ${px}px/1.27 ${SANS}`, letterSpacing: "-0.005em", color: white ? "#fff" : C.navy, whiteSpace: "nowrap" }}>
        {line.text.split(" ").map((w, i) => {
          const shown = f >= Math.round((line.words?.[i] ?? line.from) * 24);
          const key = keys.has(w.toLowerCase().replace(/[^a-z]/g, ""));
          return <span key={i} style={{ opacity: shown ? 1 : 0, color: key ? (white ? C.sky : C.blue) : undefined }}>{(i ? " " : "") + w}</span>;
        })}
      </p>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ SFX (beats.json, global frames)
const SFX: React.FC = () => (
  <>
    {(BEATS.beats as unknown as Beat[]).flatMap((b) => b.sfx.map(([at, name], i) => {
      const hero = b.sfx_hero && b.sfx_hero[0] === at && b.sfx_hero[1] === name;
      return (
        <Sequence key={`${b.id}-${i}`} from={at} durationInFrames={24} layout="none">
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={hero ? 0.2 : 0.05} />
        </Sequence>
      );
    }))}
  </>
);

// ------------------------------------------------------------------------------------------------ text-size audit (stills, --log=verbose)
// Logs the smallest on-screen text (CSS font-size x the element's accumulated scale, measured with getBoundingClientRect) per frame.
const TextAudit: React.FC = () => {
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const out: { px: number; t: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const s = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!s || !el) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden") continue;
      let op = 1; for (let e: HTMLElement | null = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || "1");
      if (op < 0.5) continue;
      const fs = parseFloat(cs.fontSize);
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.right < 0 || r.left > 1920 || r.bottom < 0 || r.top > 1080) continue;
      let k = 1;
      if (el instanceof SVGElement) { const bb = (el as unknown as SVGGraphicsElement).getBBox(); k = bb.height ? r.height / bb.height : 1; }
      else if (el.offsetHeight) k = r.height / el.offsetHeight;
      out.push({ px: Math.round(fs * k * 10) / 10, t: s.slice(0, 48) });
    }
    out.sort((a, b) => a.px - b.px);
    console.log(`TEXTAUDIT ${JSON.stringify({ f, min: out.slice(0, 6) })}`);
  });
  return null;
};

// ------------------------------------------------------------------------------------------------ the composition
export const OstadYT6: React.FC<YT6Props> = ({ spec, plain = false, audit = false }) => {
  useExoFonts();
  const track = useTrack();
  const f = useCurrentFrame();
  if (!spec || !track) return <AbsoluteFill style={{ background: C.cream }} />;

  // presenter visibility (after Naim's review, DECISIONS 14m): he stays keyed on the left through B04 (the consult grows into a
  // window beside him, no full-frame blur any more); out on B12 after its cut (he is in the pip), and from B17's skull being fully up
  // (f1754) to the end of B18
  const out = (f >= S("B12") + 1 && f <= BT.B12.end_f) || (f >= S("B17") + 44 && f <= BT.B18.end_f);
  const presenterOn = !out;
  const white = f >= S("B18") && f <= BT.B18.end_f;
  const headTop = follow(track, "headTop", LAYER6, undefined, { x: 0, y: -24 });

  const seq = (id: string, node: React.ReactNode, name?: string) => (
    <Sequence key={id} from={S(id)} durationInFrames={DUR(id)} name={name ?? id}>{node}</Sequence>
  );

  return (
    <AbsoluteFill style={{ background: C.cream, overflow: "hidden" }}>
      <div style={roomBg(f)} />
      {/* ---- behind the presenter: the title wordmark (depth sandwich) and B16's ring back half */}
      {!plain && seq("B01", <WordmarkDepthSandwich word="EXOMIND" subline="Total skin health · an evening with Dr. Ariel Ostad" start={3} exitAt={98} end={105} baselineY={560} size={300} centerX={1200} />, "B01 wordmark")}

      {presenterOn && <Presenter opacity={1} />}

      {!plain && (
        <>
          <Sequence from={0} durationInFrames={DUR("B01")} name="B01 name"><NameSuper at={26} out={98} /></Sequence>
          {seq("B02", (
            <Stage k={1.15} ox={1430} oy={460}>
              <ProductPlateReveal file="exomind-skin/btl/unit_cut.png" box={[1080, 150, 700, 620]} imgStyle={{ transform: "scale(1.5)" }} plateAt={0} imageAt={19} name="Exomind" nameAt={19}
                chip="FDA-cleared: major depressive disorder ⚠" chipAt={40} pointer={{ from: { x: 1180, y: 742 }, to: { x: 1452, y: 566 }, at: 33, end: 53 }} exitAt={46} end={54} />
            </Stage>
          ))}
          {seq("B03", <FlowDiagramBuild from={(lf: number) => headTop(lf + S("B03"))} />)}
          {seq("B04", (
            <>
              <Section num="01" title="Your questions" />
              <CardFullMorph card={{ x: 1060, y: 40, w: 740, h: 880 }} />
            </>
          ))}
          {seq("B05", (
            <SpatialGlassUI lightAt={102} exitAt={121} panels={[
              { at: 25, depth: 0.6, x: 1180, y: 80, w: 660, icon: <IconGift size={36} color="#fff" />, title: "Giveaway winners", sub: "Announced after tonight", from: "fade" },
              { at: 46, depth: 1, x: 790, y: 350, w: 820, icon: <IconMail size={36} color="#fff" />, title: "Email · from our team", body: "Congratulations! You're one of tonight's winners." },
              { at: 59, depth: 1, x: 1110, y: 660, w: 700, icon: <IconPhone size={36} color="#fff" />, title: "Incoming call", sub: "Dr. Ostad's office", ring: true },
            ]} />
          ))}
          {/* B06 + B07: one phone across both beats (no jump at the beat line): close-up at 1.4x, then it steps back to 1x and left as
              the calendar arrives, and the reply types and sends */}
          <Sequence from={S("B06")} durationInFrames={DUR("B06") + DUR("B07")} name="B06-B07 phone">
            <PhoneStage />
          </Sequence>
          {seq("B07", (
            <>
              <CalendarDateCircle start={29} circleAt={66} slot={{ day: 3, row: 1 }} x={1215} y={150} exitAt={75} />
              <Arrow variant="arc-connector" from={{ x: 1128, y: 728 }} to={(() => { const t = calendarSlotCenter(1215, 150, { day: 3, row: 1 }); return { x: t.x - 30, y: t.y + 40 }; })()}
                start={29} end={82} color={C.blue} label={<IconChat size={34} color={C.blue} />} />
            </>
          ))}
          {seq("B08", (
            <IntakeFormFill start={1} end={141} exitAt={134} x={960} y={50} dimBackdrop={false}
              note="⚠ Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate." fields={[
                { kind: "write", label: "Your goals", value: "Calmer mind, better sleep, healthier skin", at: 49 },
                { kind: "check", label: "Medical history", markAt: 55, rows: [{ text: "Medications", at: 78 }, { text: "Implanted devices", at: 82 }, { text: "Conditions", at: 86 }] },
                { kind: "answer", label: "Is Exomind appropriate for you?", value: "Decided with Dr. Ostad", litAt: 93, circleAt: 108 },
              ]} />
          ))}
          {seq("B09", (
            <>
              <Section num="02" title="Before you go" />
              <QuoteCardCarousel start={30} exitAt={95} x={990} y={110} w={840} credit="Questions: the Exomind patient brochure FAQ" cards={[
                { q: "Does it hurt?", at: 40, who: "Maya" }, { q: "Will it disrupt my daily life?", at: 61, who: "Jordan" }, { q: "Is Exomind right for me?", at: 82, mark: "right for me", who: "Sam" },
              ]} />
            </>
          ))}
          {seq("B10", (
            <ChecklistLedger start={1} end={84} exitAt={71} title="Tonight" x={1030} y={70} w={800} open={{ label: "Your question", at: 25, sweepAt: 52 }} rows={[
              { label: "What Exomind is", at: 1, thumb: <Img src={src("exomind-skin/btl/unit_cut.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 50%" }} /> },
              { label: "Messages from our team", at: 3, thumb: <Thumb><IconChat size={40} color={C.blue} /></Thumb> },
              { label: "Your consultation", at: 5, thumb: <Thumb><IconClipboard size={40} color={C.blue} /></Thumb> },
              { label: "Booking a visit", at: 7, thumb: <Thumb><IconCalendar size={40} color={C.blue} /></Thumb> },
            ]} />
          ))}
          {seq("B11", <WindowedFootage box={{ x: 1060, y: 40, w: 740, h: 880 }} />)}
          {seq("B12", <B12Session track={track} />)}
          {seq("B13", (
            <>
              <Section num="03" title="Total skin health" />
              <DonutRingFill cx={1360} cy={476} />
            </>
          ))}
          {seq("B14", <TypeNameDecode x={1250} y={380} w={1100} size={128} />)}
          {seq("B15", <SplitCard />)}
          {seq("B16", <B16Triggers track={track} />)}
          {seq("B17", (
            <>
              <Section num="04" title="The technology" />
              <FieldThroughSkull />
            </>
          ))}
          {seq("B18", <RewireTrace cutAt={0} traceAt={1} />)}
          {seq("B19", <Stage k={1.15} ox={1860} oy={480}><PulseTrainSynapse /></Stage>)}
          {seq("B20", <B20Patient />)}
          <Sequence from={END.start_f} durationInFrames={END.end_f - END.start_f} name="end card">
            <EndCard lines={END.text as [string, string, string]} start={0} end={END.end_f - END.start_f} x={960} y={250} />
          </Sequence>
          <Captions captions={spec.captions} keywords={spec.keywords ?? []} white={white} />
          <SFX />
        </>
      )}
      <Audio src={staticFile(spec.audio)} />
      {audit && <TextAudit />}
    </AbsoluteFill>
  );
};

const Thumb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: C.blue }}>{children}</div>
);

// B06 (local 0-120) and B07 (local 121-204) on one clock
const PhoneStage: React.FC = () => {
  const f = useCurrentFrame();
  const b7 = DUR("B06"); // 121: B07 local 0
  const k = 1.4 - 0.4 * p(f, b7, 14, ease.sweep);
  const fade = 1 - p(f, b7, 10, ease.arrive);
  return (
    <>
      <Stage k={k} ox={1300} oy={80}>
        <PhoneMessage start={1} plateAt={36} senderAt={42} lineAt={[47, 52]} sender="Dr. Ostad's office" lines={["Thanks for joining us tonight.", "Reply to schedule a consultation."]}
          mark="schedule a consultation" markAt={91} statusAt={102} statusRight statusOut={b7} x={900} y={60} move={{ at: b7, dx: -140 }}
          reply={{ text: "Yes, I'd like to book", at: b7 + 6, sendAt: b7 + 21 }} endAt={b7 + 84} exitAt={b7 + 75} />
      </Stage>
      {/* the close-up phone runs off the frame bottom: it rises out of a soft floor of the room colour, so captions sit on cream */}
      <div style={{ position: "absolute", left: 640, width: 1000, top: 820, height: 260, opacity: fade,
        background: "linear-gradient(180deg, rgba(240,236,232,0) 0%, rgba(240,236,232,.92) 48%, rgba(240,236,232,1) 70%)" }} />
    </>
  );
};

// B15: the split (classic treatments | beyond) as a masked 16:9 card right of him (he stays keyed, per the one presentation)
const SplitCard: React.FC = () => {
  const f = useCurrentFrame();
  const q = p(f, 0, 14, ease.arrive), o = p(f, 143, 7, ease.exit);
  const W = 1150, H = Math.round((W * 9) / 16), k = W / 1920;
  return (
    <div style={{ position: "absolute", left: 720 + (1 - q) * 40, top: 120 + o * 7 + drift(f, 3, 150), width: W, height: H, borderRadius: 28, overflow: "hidden", opacity: q * (1 - o),
      boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <SplitLabelled />
      </div>
    </div>
  );
};
