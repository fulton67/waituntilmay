import React, { useLayoutEffect } from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import BEATS from "../../../research/ostad/style/exomind/beats.json";
import { Arrow } from "./devices/Arrow";
import { follow, useTrack, type LayerTransform } from "./devices/track";
import { C, SANS, drift, ease, io, p, roomBg, text, useExoFonts } from "./exo6/look";
import { Glass, src } from "./exo6/parts";
import { EndCard, WordmarkDepthSandwich } from "./exo6/Cards";
import { ProductPlateReveal } from "./exo6/ProductPlateReveal";
import { FlowDiagramBuild } from "./exo6/FlowDiagramBuild";
import { SpatialGlassUI } from "./exo6/SpatialGlassUI";
import { PhoneMessage } from "./exo6/PhoneMessage";
import { CalendarDateCircle, calendarSlotCenter } from "./exo6/CalendarDateCircle";
import { IntakeFormFill } from "./exo6/IntakeFormFill";
import { QuoteCardCarousel } from "./exo6/QuoteCardCarousel";
import { ChecklistLedger } from "./exo6/ChecklistLedger";
import { DonutRingFill } from "./exo6/DonutRingFill";
import { TypeNameDecode } from "./exo6/TypeNameDecode";
import { SplitLabelled } from "./exo6/SplitLabelled";
import { RewireTrace } from "./exo6/RewireTrace";
import { PulseTrainSynapse } from "./exo6/PulseTrainSynapse";
import { IconCalendar, IconChat, IconClipboard, IconGift, IconMail, IconPhone } from "./exo6/icons";
import { B04Consult, B09Questions, B11Team, B12Session, B16Emotions, B17MoaHead, B19Window, B20Split, S3Over } from "./exo6/Gap1";
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

// ------------------------------------------------------------------------------------------------ name super (B01, f26 -> f98)
const NameSuper: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const q = p(f, at, 10, ease.arrive), o = p(f, out, 7, ease.exit);
  return (
    <div style={{ position: "absolute", left: 64, top: 836 + (1 - q) * 16 + o * 7 + drift(f, 2, 120), opacity: q * (1 - o) }}>
      <Glass r={22} t={f - at} style={{ position: "relative", padding: "20px 30px 22px" }}>
        <div style={{ ...text(40, 500) }}>Dr. Ariel Ostad</div>
        <div style={{ ...text(28, 400, C.ink2), marginTop: 4 }}>Triple Board-Certified Dermatologist</div>
      </Glass>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ captions (word-timed)
// NHG Text 500 (the v6 label face), navy on the room, white over full-bleed footage; every word cuts on at its measured onset
// (yt_words.json via props_yt.json), the rest of the line holds its place invisibly (v3 fix, still the rule). One zone: under the
// graphics, right of him (x 720-1870, top 958), so a caption never sits on his face or on a card.
const Captions: React.FC<{ captions: Caption[]; keywords: string[]; white: boolean; x?: number; w?: number }> = ({ captions, keywords, white, x = 720, w = 1150 }) => {
  const f = useCurrentFrame();
  const on = (c: Caption) => Math.min(c.from, c.words?.[0] ?? c.from);
  const line = captions.find((c) => f >= Math.round(on(c) * 24) && f < Math.round(c.to * 24));
  if (!line) return null;
  const keys = new Set(keywords.map((k) => k.toLowerCase()));
  const px = Math.min(46, Math.floor((w - 30) / (0.53 * line.text.length)));
  return (
    <div style={{ position: "absolute", left: x, width: w, top: 958 }}>
      {white && <div style={{ position: "absolute", left: -120, right: -120, top: -70, height: px * 1.27 + 140, background: "radial-gradient(50% 50% at 50% 50%, rgba(16,24,40,.34) 0%, rgba(16,24,40,.18) 45%, rgba(16,24,40,0) 100%)" }} />}
      <p style={{ position: "relative", margin: 0, font: `500 ${px}px/1.27 ${SANS}`, letterSpacing: "-0.005em", color: white ? "#fff" : C.navy, whiteSpace: "nowrap" }}>
        {line.text.split(" ").map((wd, i) => {
          const shown = f >= Math.round((line.words?.[i] ?? line.from) * 24);
          const key = keys.has(wd.toLowerCase().replace(/[^a-z]/g, ""));
          return <span key={i} style={{ opacity: shown ? 1 : 0, color: key ? (white ? C.sky : C.blue) : undefined }}>{(i ? " " : "") + wd}</span>;
        })}
      </p>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ SFX (beats.json, global frames)
// gap round 1 (audio.md): the SFX were 24-33 dB under the voice (inaudible). Hero 0.32, the rest 0.16 (the rosacea level); one sound per
// event type, assigned by device class in beats.json `sfx_map` (arrow = draw, card = exo_card, chapter = chapter, reveal = swish,
// chip = pop, tick / slot = yes). Entries in `sfx` name the class; the map resolves the wav.
const SFX_MAP: Record<string, string> = (BEATS as unknown as { sfx_map: Record<string, string> }).sfx_map;
const SFX: React.FC = () => (
  <>
    {[...(BEATS.beats as unknown as Beat[]), ...((BEATS.cards as unknown as Beat[]).filter((c) => c.sfx))].flatMap((b, bi) => b.sfx.map(([at, name], i) => {
      const hero = b.sfx_hero && b.sfx_hero[0] === at && b.sfx_hero[1] === name;
      return (
        <Sequence key={`${b.id ?? "card" + bi}-${i}`} from={at} durationInFrames={30} layout="none">
          <Audio src={staticFile(`sfx/${SFX_MAP[name] ?? name}.wav`)} volume={hero ? 0.32 : 0.16} />
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
    // gap round 1 lint: an arrow path may not cross a text box (tools/arrow_text_lint.py reads these lines). The first 12 px of the
    // tail and the last 30 px before the tip are exempt (an arrow lands next to its label); an arrow's own label is exempt.
    const boxes: { r: DOMRect; t: string }[] = [];
    const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let m: Node | null;
    while ((m = w2.nextNode())) {
      const s = (m.textContent ?? "").trim(); const el = m.parentElement;
      if (!s || !el || el.closest("[data-arrowline]")) continue;
      let op = 1; for (let e: HTMLElement | null = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || "1");
      if (op < 0.5) continue;
      const rg = document.createRange(); rg.selectNodeContents(m); const r = rg.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      boxes.push({ r, t: s.slice(0, 30) });
    }
    const hits: { t: string; len: number }[] = [];
    document.querySelectorAll("[data-arrowline]").forEach((node) => {
      const fr = (node as HTMLElement).getBoundingClientRect(); const k = fr.width / 1920;
      const pts = (JSON.parse((node as HTMLElement).dataset.arrowline || "[]") as number[][]).map(([x, y]) => [fr.left + x * k, fr.top + y * k]);
      if (pts.length < 2) return;
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1];
      for (const bx of boxes) {
        let inside = 0;
        for (let i = 1; i < pts.length; i++) {
          if (cum[i] < 12 || cum[i] > L - 30) continue;
          const [x, y] = pts[i];
          if (x > bx.r.left - 4 && x < bx.r.right + 4 && y > bx.r.top - 4 && y < bx.r.bottom + 4) inside += cum[i] - cum[i - 1];
        }
        if (inside > 0) hits.push({ t: bx.t, len: Math.round(inside) });
      }
    });
    if (hits.length) console.log(`ARROWTEXT ${JSON.stringify({ f, hits })}`);
  });
  return null;
};

// ------------------------------------------------------------------------------------------------ the composition
// gap round 1 (DECISIONS 14o, research/ostad/style/exomind/gap/ROUND1.md): he is keyed left on the cream room, and steps out on purpose
// for the takeovers: B04 (consult full bleed, him in the pip), B06 (the phone centred), S2-B09 (waiting room, then the consult split),
// B11-B12 (team diptych and session full bleed, him in the pip) and S3, B15 (the full-height split), S4-B18 (the BTL MOA film).
// Every step is a picture cut on the beat line (Ro / Evident cut a frame every 4.9 s; v6 cut 1.3 /min), except B17 -> B18 (dissolve).
export const OUT_RANGES: [string, string][] = [["B04", "B04"], ["B06", "B06"], ["B09", "B09"], ["B11", "B12"], ["B15", "B15"], ["B17", "B18"]];
const S3_END = 1271; // S3 runs on the first 30 f of B13 (beats.json cards)
const outRanges = (): [number, number][] => [...OUT_RANGES.map(([a, b]) => [S(a), BT[b].end_f] as [number, number]), [S("B13"), S3_END]];
// captions are white over full-frame picture; on the splits they sit on the half that has room for them
const WHITE: [string, string][] = [["B04", "B04"], ["B11", "B12"], ["B15", "B15"], ["B17", "B18"]];

export const OstadYT6: React.FC<YT6Props> = ({ spec, plain = false, audit = false }) => {
  useExoFonts();
  const track = useTrack();
  const f = useCurrentFrame();
  if (!spec || !track) return <AbsoluteFill style={{ background: C.cream }} />;

  const inR = (r: [number, number][]) => r.some(([a, b]) => f >= a && f <= b);
  const presenterOn = !inR(outRanges());
  const white = inR([...WHITE.map(([a, b]) => [S(a), BT[b].end_f] as [number, number]), [S("B13"), S3_END]]) || (f >= S("B20") && f <= BT.B20.end_f);
  const capZone = f >= S("B09") && f <= BT.B09.end_f ? { x: 1000, w: 880 } : f >= S("B20") && f <= BT.B20.end_f ? { x: 1010, w: 870 } : { x: 720, w: 1150 };
  // tracked tails: templeR + 40 px outside the mesh (measured 3.8 / 5.5 px on the render; headTop carried an 8 px bias, tracking.md)
  const temple = follow(track, "templeR", LAYER6, undefined, { x: 40, y: -6 });

  const seq = (id: string, node: React.ReactNode, name?: string, extra = 0) => (
    <Sequence key={id} from={S(id)} durationInFrames={DUR(id) + extra} name={name ?? id}>{node}</Sequence>
  );

  return (
    <AbsoluteFill style={{ background: C.cream, overflow: "hidden" }}>
      <div style={roomBg(f)} />
      {!plain && seq("B01", <WordmarkDepthSandwich word="EXOMIND" subline="Total skin health · an evening with Dr. Ariel Ostad" start={3} exitAt={97} end={105} baselineY={560} size={300} centerX={1200} />, "B01 wordmark")}

      {presenterOn && <Presenter opacity={1} />}

      {!plain && (
        <>
          <Sequence from={0} durationInFrames={DUR("B01")} name="B01 name"><NameSuper at={26} out={97} /></Sequence>
          {seq("B02", (
            <Stage k={1.15} ox={1430} oy={460}>
              {/* gap round 1: the pointer's tail starts above the FDA chip (graphics_arrows.md: it ran 123 px over it); weight 8 / 1.15 */}
              <ProductPlateReveal file="exomind-skin/btl/unit_cut.png" box={[1080, 150, 700, 620]} imgStyle={{ transform: "scale(1.5)" }} plateAt={0} imageAt={11} name="Exomind" nameAt={20}
                chip="FDA-cleared: major depressive disorder ⚠" chipAt={38} pointer={{ from: { x: 1030, y: 640 }, to: { x: 1452, y: 566 }, at: 20, end: 52, weight: 8 / 1.15 }} exitAt={45} end={54} />
            </Stage>
          ))}
          {seq("B03", <FlowDiagramBuild from={(lf: number) => temple(lf + S("B03"))} />)}
          {seq("B04", <B04Consult track={track} seqStart={S("B04")} dur={DUR("B04")} />)}
          {seq("B05", (
            <SpatialGlassUI lightAt={102} exitAt={120} panels={[
              { at: 26, depth: 0.6, x: 1180, y: 80, w: 660, icon: <IconGift size={36} color="#fff" />, title: "Giveaway winners", sub: "Announced after tonight", from: "fade" },
              { at: 47, depth: 1, x: 790, y: 350, w: 820, icon: <IconMail size={36} color="#fff" />, title: "Email · from our team", body: "Congratulations! You're one of tonight's winners." },
              { at: 62, depth: 1, x: 1110, y: 660, w: 700, icon: <IconPhone size={36} color="#fff" />, title: "Incoming call", sub: "Dr. Ostad's office", ring: true },
            ]} />
          ))}
          {/* B06 + B07: one phone across both beats. B06: him out, the phone close-up centred (a frame-level change at 22.8 s); B07: he
              is back (picture cut) and the phone steps back to 1x and left as the calendar arrives */}
          <Sequence from={S("B06")} durationInFrames={DUR("B06") + DUR("B07")} name="B06-B07 phone">
            <PhoneStage />
          </Sequence>
          {seq("B07", (
            <>
              <CalendarDateCircle start={29} circleAt={66} slot={{ day: 3, row: 1 }} x={1215} y={150} exitAt={75} />
              {/* gap round 1 (arrow_text_lint): from the sent reply, under the card, up the clear lane between the Wed and Thu times (every
                  slot label sits centred in its cell), onto the bottom of the Thu 10:30 slot. Crosses no text */}
              <Arrow variant="arc-connector" from={{ x: 1132, y: 742 }} via={[{ x: 1380, y: 800 }, { x: 1604, y: 660 }, { x: 1606, y: 520 }]}
                to={(() => { const t = calendarSlotCenter(1215, 150, { day: 3, row: 1 }); return { x: t.x - 4, y: t.y + 30 }; })()}
                start={31} end={82} color={C.blue} />
            </>
          ))}
          {seq("B08", (
            <>
              {/* gap round 1: "during your visit" happens in this room: the practice's own procedure room (clinic-library row 3601, professional
                  photo, no people) fills a window behind the intake form, pushing for the whole beat */}
              <B08Room dur={DUR("B08")} />
              <IntakeFormFill start={3} end={141} exitAt={133} x={1080} y={70} dimBackdrop={false}
                note="⚠ Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate." fields={[
                  { kind: "write", label: "Your goals", value: "Calmer mind, better sleep, healthier skin", at: 34 },
                  { kind: "check", label: "Medical history", markAt: 56, rows: [{ text: "Medications", at: 64 }, { text: "Implanted devices", at: 68 }, { text: "Conditions", at: 72 }] },
                  { kind: "answer", label: "Is Exomind appropriate for you?", value: "Decided with Dr. Ostad", litAt: 93, circleAt: 110 },
                ]} />
            </>
          ))}
          {seq("B09", (
            <B09Questions>
              <QuoteCardCarousel start={31} exitAt={94} x={1040} y={110} w={820} credit="Questions: the Exomind patient brochure FAQ" cards={[
                { q: "Does it hurt?", at: 43 }, { q: "Will it disrupt my daily life?", at: 62 }, { q: "Is Exomind right for me?", at: 83, mark: "right for me" },
              ]} />
            </B09Questions>
          ))}
          {seq("B10", (
            <ChecklistLedger start={1} end={84} exitAt={75} title="Tonight" x={1030} y={70} w={800} open={{ label: "Your question", at: 26, sweepAt: 53 }} rows={[
              { label: "What Exomind is", at: 3, thumb: <Img src={src("exomind-skin/btl/img/EXOMIND_LOGO_Rounded-blue_ENUS100.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> },
              { label: "Messages from our team", at: 6, thumb: <Thumb><IconChat size={40} color={C.blue} /></Thumb> },
              { label: "Your consultation", at: 13, thumb: <Thumb><IconClipboard size={40} color={C.blue} /></Thumb> },
              { label: "Booking a visit", at: 19, thumb: <Thumb><IconCalendar size={40} color={C.blue} /></Thumb> },
            ]} />
          ))}
          {seq("B11", <B11Team track={track} seqStart={S("B11")} dur={DUR("B11")} />)}
          {seq("B12", <B12Session track={track} seqStart={S("B12")} dur={DUR("B12")} />)}
          {seq("B13", (
            <>
              <Sequence from={0} durationInFrames={30} layout="none"><S3Over /></Sequence>
              <DonutRingFill cx={1360} cy={476} start={30} labelsAt={47} fillAt={59} words={[95, 104, 112]} discAt={104} exitAt={128} />
            </>
          ))}
          {seq("B14", <TypeNameDecode x={1250} y={380} w={1100} size={128} exitAt={60} />)}
          {seq("B15", <SplitLabelled start={0} wipeAt={41} leftLabelAt={92} exitAt={143} rightImg="exomind-skin/btl/web/applicator_0108.jpg" />)}
          {seq("B16", <B16Emotions tail={(lf: number) => temple(lf + S("B16"))} />)}
          {seq("B17", <B17MoaHead dur={DUR("B17")} />, "S4 + B17 MOA head", 8)}
          {seq("B18", <B18Dissolve />)}
          {seq("B19", (
            <B19Window dur={DUR("B19")}>
              <PulseTrainSynapse exitAt={128} calmAt={91} wordTimes={[91, 102, 113]} x={1090} y={290} lineColor="#fff" moa={false} />
            </B19Window>
          ))}
          {seq("B20", <B20Split dur={DUR("B20")} />)}
          <Sequence from={END.start_f} durationInFrames={END.end_f - END.start_f} name="end card">
            <EndCard lines={END.text as [string, string, string]} start={0} end={END.end_f - END.start_f} x={960} y={250} />
          </Sequence>
          <Captions captions={spec.captions} keywords={spec.keywords ?? []} white={white} x={capZone.x} w={capZone.w} />
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

// B08: the procedure room behind the form (a clean rounded window, never blurred)
const B08Room: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const q = p(f, 1, 10, ease.arrive), o = p(f, dur - 9, 7, ease.exit);
  return (
    <div style={{ position: "absolute", left: 700 + (1 - io(q)) * 24, top: 40 + o * 7, width: 1180, height: 860, borderRadius: 24, overflow: "hidden", opacity: q * (1 - o),
      boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
      <Img src={src("exomind-skin/clinic/room_03601.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "40% 50%",
        transform: `translate(${drift(f, 8, 150)}px, ${drift(f, 5, 190, 0.7)}px) scale(${1.02 + 0.06 * ease.blank(Math.min(1, f / dur))})`, transformOrigin: "30% 55%" }} />
      <div style={{ position: "absolute", left: 30, bottom: 28, ...text(26, 500, "#fff"), textShadow: "0 1px 8px rgba(0,0,0,.45)" }}>Our treatment room</div>
    </div>
  );
};

// B18 dissolves in over B17's held film (8 f) instead of cutting over it (motion_easing.md gap 4)
const B18Dissolve: React.FC = () => {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", inset: 0, opacity: p(f, 0, 8, ease.blank) }}><RewireTrace cutAt={0} traceAt={2} /></div>;
};

// B06 (local 0-120) and B07 (local 121-204) on one clock
const PhoneStage: React.FC = () => {
  const f = useCurrentFrame();
  const b7 = DUR("B06"); // 121: B07 local 0
  const k = 1.4 - 0.4 * p(f, b7, 10, ease.sweep);
  const centre = -70 * (1 - p(f, b7, 10, ease.sweep)); // B06: the phone centred in the frame while he is out
  const fade = 1 - p(f, b7, 10, ease.arrive);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${centre}px)` }}>
        <Stage k={k} ox={1300} oy={80}>
          <PhoneMessage start={1} plateAt={36} senderAt={42} lineAt={[48, 53]} sender="Dr. Ostad's office" lines={["Thanks for joining us tonight.", "Reply to schedule a consultation."]}
            mark="schedule a consultation" markAt={93} statusAt={104} statusRight statusOut={b7} x={900} y={60} move={{ at: b7, dx: -140 }}
            reply={{ text: "Yes, I'd like to book", at: b7 + 7, sendAt: b7 + 22 }} endAt={b7 + 84} exitAt={b7 + 75} />
        </Stage>
      </div>
      {/* the close-up phone runs off the frame bottom: it rises out of a soft floor of the room colour, so captions sit on cream */}
      <div style={{ position: "absolute", left: 560, width: 1100, top: 820, height: 260, opacity: fade,
        background: "linear-gradient(180deg, rgba(240,236,232,0) 0%, rgba(240,236,232,.92) 48%, rgba(240,236,232,1) 70%)" }} />
    </>
  );
};
