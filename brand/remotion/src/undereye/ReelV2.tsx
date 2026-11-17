// UndereyeReelV2 (renders v2 and v3): the under-eye filler reel after the user's notes (DECISIONS 15c, 15d). Consent = yes (catalog, 2026-11-17).
// Props: public/undereye-filler/props_v2.json (brand/scripts/undereye_prep_v2.py). Audio: one dialogue track, dialogue_v2.wav, cut
// only in measured silence with 15 ms fades at every join (assembled by the prep script: Remotion's per-frame volume is 42 ms coarse).
// Picture: `pics` segments per piece: his/her footage (portrait fills the frame; a landscape clip is cropped so
// it fills the frame: no blur side-fill), a punch-in (scale about ox, oy) to cover a jump, or a still with a slow push (never static).
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { Arrow } from "../devices/Arrow";
import { Lasts, SideBoxes, TypedLabel, type Box } from "./devices";
import { BruiseSwatch, DateLabels, Mark, PillowProfile, SketchMarks, WipeBA, type SketchData } from "./devices_v2";
import { ChapterCard, EndCardClean, FanMap, GlideAnim, SectionDiagram, SyringeLido, type SectionLines } from "./devices_v3";
import { ClipCardStd, SkinWindow } from "./standard";
import { FONT } from "../brand";
import { CAP_T, H, INK, M, MUTED, W, WHITE, caps, life, p, type Pt } from "./look";

type Pic = { f0: number; f1: number; clip?: string; still?: string; src?: number; scale?: number; ox?: number; oy?: number; run0?: number };
type Piece = { id: string; clip: string; section: string; at: number; dur: number; from: number; to: number; voice?: string; pics: Pic[] };
type Word = { w: string; f: number; f1: number; piece: string; voice: string };
type Track = { f0: number; pts: Record<string, [number, number][]> };
export type V2Props = { bare?: boolean; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: Word[]; cues: Record<string, number>; tracks: Record<string, Track>; bands?: Record<string, { after: number[][] }>; sketch?: SketchData; ai?: string[]; section?: SectionLines; stat?: { before: number; after: number } };

export const TAIL2 = 72;
const LANDSCAPE = new Set(["6813", "6814"]);
const STILL: Record<string, string> = { split: "ba_split.jpg", eyes: "ba_eyes.jpg", after: "ba_after.jpg", before_ref: "ba_before_ref.jpg" };
// stills that carry the measured sketch: absolute frames of the sketch draw, the wipe and the arrows (set by the composition)
let SK: { data?: SketchData; drawS: number; wipeS: number; arrowsS: number } = { drawS: 0, wipeS: 0, arrowsS: 0 };
let BARE = false;

const Clip: React.FC<{ clip: string; src: number; speed: number }> = ({ clip, src, speed }) => {
  const v = (style: React.CSSProperties) => <OffthreadVideo src={staticFile(`undereye-filler/${clip}.mp4`)} trimBefore={Math.round(src * 24)} playbackRate={speed} muted style={style} />;
  // Naim: no blur side-fill. Landscape clips (IMG_6813 / 6814) only appear inside a ClipCard now; if one is ever used full frame it is
  // cropped to fill the frame, never letterboxed over a blurred copy
  return v({ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" });
};

const img = (name: string) => <Img src={staticFile(`undereye-filler/${name}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
const PicLayer: React.FC<{ q: Pic; speed: number }> = ({ q, speed }) => {
  const f = useCurrentFrame(); // local to the segment
  if (BARE && !(q.still === "before_ref" || q.still === "wipe")) return null;
  const sc = q.scale ?? 1, ox = q.ox ?? 540, oy = q.oy ?? 960;
  // a still drifts in 3.5 % over 5 s, counted from the first segment of its run so a still that spans two pieces never jumps
  const push = q.still ? 1 + 0.035 * Math.min(1, (f + q.f0 - (q.run0 ?? q.f0)) / 120) : 1;
  const rel = (a: number) => a - q.f0; // absolute frame -> this segment's local frame
  let body: React.ReactNode;
  if (q.still === "before_ref") body = <>{!BARE && img(STILL.before_ref)}{SK.data && <SketchMarks data={SK.data} s={rel(SK.drawS)} />}</>;
  else if (q.still === "wipe") body = SK.data ? <WipeBA before={BARE ? null : img("ba_wipe_before.jpg")} after={BARE ? null : img("ba_wipe_after.jpg")} s={0} wipeS={rel(SK.wipeS)} data={SK.data} arrowsS={rel(SK.arrowsS)} /> : null;
  else body = q.still ? img(STILL[q.still]) : <Clip clip={q.clip!} src={q.src!} speed={speed} />;
  return (
    <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: `scale(${sc * push})`, background: BARE ? undefined : "#000" }}>{body}</AbsoluteFill>
  );
};

// word captions (DECISIONS 14d rule 8), her words in italic (DDOS R14 / G4 A7)
const lines = (ws: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of ws) {
    const prev = cur[cur.length - 1];
    const len = cur.reduce((s, x) => s + x.w.length + 1, 0) + w.w.length;
    if (prev && (w.f - prev.f1 >= 8 || w.piece !== prev.piece || cur.length >= 3 || len > 20)) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
};
const Captions: React.FC<{ words: Word[]; hide: [number, number][] }> = ({ words, hide }) => {
  const frame = useCurrentFrame();
  const ls = React.useMemo(() => lines(words), [words]);
  if (hide.some(([a, b]) => frame >= a && frame < b)) return null;
  const i = ls.findIndex((l, k) => frame >= l[0].f && frame < Math.min(ls[k + 1]?.[0].f ?? Infinity, l[l.length - 1].f1 + 10));
  if (i < 0) return null;
  const it = ls[i][0].voice === "patient";
  return (
    <div style={{ position: "absolute", left: M, right: M, top: CAP_T, textAlign: "center", font: `${it ? "italic " : ""}600 62.6px/1.2 "neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif`,
      letterSpacing: "0.01em", color: WHITE, textShadow: "0 2px 10px rgba(0,0,0,.38), 0 0 2px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
      {ls[i].map((w, k) => <span key={k} style={{ visibility: frame >= w.f ? "visible" : "hidden" }}>{(k ? " " : "") + w.w.replace(/[",]/g, "").replace(/^Ostad's$/, "Ostad’s")}</span>)}
    </div>
  );
};

export const UndereyeReelV2: React.FC<V2Props> = (P) => {
  useElza();
  BARE = !!P.bare;
  const frame = useCurrentFrame();
  const { pieces, cues: c, speed, tracks } = P;
  // a piece cut into sub-pieces (a stutter cut: P03x, P03y) answers to its base id: S = first sub's start, E = last sub's end
  const subs = (id: string) => pieces.filter((x) => x.id === id || (x.id.length === id.length + 1 && x.id.startsWith(id) && /[xyz]$/.test(x.id)));
  const pc = (id: string) => subs(id)[0];
  const S = (id: string) => subs(id)[0].at, E = (id: string) => { const l = subs(id)[subs(id).length - 1]; return l.at + l.dur - 1; };
  const end = P.durationInFrames;
  // a tracked point: the track whose span covers frame f (several segments can share a piece), or a fallback
  const tp = (name: string, fb: Pt) => (f: number): Pt => {
    for (const t of Object.values(tracks)) {
      const a = t.pts[name];
      if (a && f >= t.f0 && f < t.f0 + a.length) return { x: a[f - t.f0][0], y: a[f - t.f0][1] };
    }
    return fb;
  };
  const box = (name: string, fb: Pt, w: number, h: number) => (f: number): Box => { const q = tp(name, fb)(f); return { x: q.x - w / 2, y: q.y - h / 2, w, h }; };
  const last = pieces[pieces.length - 1];
  // an AI slot image when one was generated and dropped in brand/edits/undereye-filler/ai/ (AI_SLOTS.md), else the designed fallback
  const ai = (slot: string, fallback: React.ReactNode, w: number) => (P.ai ?? []).includes(slot)
    ? <Img src={staticFile(`undereye-filler/ai/${slot}.png`)} style={{ width: w, height: w * 0.62, objectFit: "cover", borderRadius: 12 }} /> : fallback;
  SK = { data: P.sketch, drawS: 0, wipeS: 0, arrowsS: 0 };
  const all = pieces.flatMap((x) => x.pics).sort((a, b) => a.f0 - b.f0);
  all.forEach((q, i) => { q.run0 = i && all[i - 1].still && all[i - 1].still === q.still && all[i - 1].f1 === q.f0 ? all[i - 1].run0 : q.f0; });
  const CROP = { x: 250, y: 830, w: 580, h: 420 };
  const MEDIA = { w: 420, h: 315 };
  // the 6814 eye close-up in a ClipCard: the hollow points measured on that clip (MediaPipe, undereye_track points() at 0.5-2.0 s),
  // mapped into the card's 420 x 315 window (cover: 0.2917 scale, 70 px trimmed each side)
  const hollowKeys = [[0.5, 622, 822, 1153, 825], [1.0, 650, 827, 1188, 829], [1.5, 651, 827, 1189, 827], [2.0, 717, 812, 1230, 822]];
  const hollowAt = (srcT: number, side: 0 | 1): Pt => {
    const k = hollowKeys.findIndex((r) => r[0] >= srcT);
    const a = hollowKeys[Math.max(0, k - 1)], b = hollowKeys[k < 0 ? hollowKeys.length - 1 : k];
    const u = b[0] === a[0] ? 0 : Math.min(1, Math.max(0, (srcT - a[0]) / (b[0] - a[0])));
    const x = a[1 + side * 2] + (b[1 + side * 2] - a[1 + side * 2]) * u, y = a[2 + side * 2] + (b[2 + side * 2] - a[2 + side * 2]) * u;
    return { x: x * 0.2917 - 70, y: y * 0.2917 };
  };
  const eyeCardS = c.hollows - 10;
  // IMG_6814 shows her face clean only from 0.2 to 1.7 s (her hand covers it after): slow it so that 1.5 s spans the card
  const eyeRate = Math.min(0.75, 1.5 / Math.max(1, (E("P03") - 2 - eyeCardS) / 24));
  const tick = (s: number, used: boolean, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, opacity: frame > s ? 1 : 0 }}>
      <Mark kind={used ? "tick" : "x"} s={s} size={30} color={used ? INK : MUTED} />
      <span style={{ font: `600 26px/1.15 ${FONT}`, color: used ? INK : MUTED }}>{text}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pieces.flatMap((x) => x.pics.map((q, k) => (
        <Sequence key={`${x.id}-${k}`} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><PicLayer q={q} speed={speed} /></Sequence>
      )))}
      <Sequence from={end} durationInFrames={TAIL2} layout="none">
        <PicLayer q={{ ...last.pics[last.pics.length - 1], f0: end, f1: end + TAIL2, src: (last.pics[last.pics.length - 1].src ?? 0) + (last.dur / 24) * speed }} speed={speed} />
      </Sequence>
      {!P.bare && <Audio src={staticFile("undereye-filler/dialogue_v2.wav")} />}

      {/* ---------- HOOK + TITLE: the real result in the STANDARD window over her own words; the title card above it ---------- */}
      {/* the result first, full frame: the registered Sept 20 -> Oct 4 wipe across her eyes (REELS guide 0-1.5 s), then into the window */}
      {frame < 44 && (
        <AbsoluteFill style={{ opacity: 1 - p(frame, 36, 8, "exit") }}>
          <Img src={staticFile("undereye-filler/ba_wipe_before.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - p(frame, 6, 22, "sweep") * 100}% 0 0)` }}>
            <Img src={staticFile("undereye-filler/ba_wipe_after.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          </div>
        </AbsoluteFill>
      )}
      <ChapterCard num="Dr. Ariel Ostad" title="Under-eye filler" lines={["Under-eye", "filler"]} s={0} size={150} />
      <SkinWindow s={36} out={E("H1")} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={56}
        labels={{ before: "Before · Sept 20", after: "After · Oct 4" }} showSketch={false} />
      <div style={{ position: "absolute", left: M, top: 300, ...caps(30, "rgba(255,255,255,.95)"), textShadow: "0 1px 8px rgba(0,0,0,.6)", ...life(frame, 82, E("H1")) }}>
        <i>Our patient, Sept 30, 2021</i>
      </div>

      {/* ---------- S1 the concern: her real under-eye beside the model's section of the tear trough ---------- */}
      <ChapterCard num="01" title="The concern" s={S("P03")} />
      <ClipCardStd s={eyeCardS} out={E("P03") - 2} left={88} caps="Sept 20 · before" title="Her under-eye"
        media={<div style={{ position: "relative", width: MEDIA.w, height: MEDIA.h }}>
          <Sequence from={eyeCardS} layout="none"><OffthreadVideo src={staticFile("undereye-filler/6814.mp4")} trimBefore={5} playbackRate={eyeRate} muted style={{ position: "absolute", left: -70, top: 0, width: 560, height: 315 }} /></Sequence>
        </div>} />
      <ClipCardStd s={c.hollows - 4} out={E("P03") - 2} left={552} caps="Illustration · face model" title="The tear trough"
        media={P.section ? <SectionDiagram lines={P.section} w={MEDIA.w} h={MEDIA.h} mode="hollow" s={c.hollows - 4} /> : null} />
      <Sequence from={E("P03")} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>

      {/* ---------- S2 the procedure ---------- */}
      <ChapterCard num="02" title="The procedure" s={S("P04")} />
      <ClipCardStd s={c.cannula} out={c.afterwards - 2} left={88} top={1040} caps="Blunt cannula" title="Around, not through" depth={[2, "Deep, under the muscle"]}
        media={<GlideAnim w={MEDIA.w} h={MEDIA.h} s={c.cannula} />} />
      <ClipCardStd s={c.advanced} out={c.afterwards - 2} left={552} top={1040} caps="One entry point" title="More delicate" dim={false}
        media={<svg width={MEDIA.w} height={MEDIA.h}><rect width={MEDIA.w} height={MEDIA.h} fill="rgba(29,34,48,1)" />
          <path d={`M${MEDIA.w * 0.2},${MEDIA.h * 0.75} L${MEDIA.w * 0.8},${MEDIA.h * 0.3} M${MEDIA.w * 0.2},${MEDIA.h * 0.75} L${MEDIA.w * 0.85},${MEDIA.h * 0.45} M${MEDIA.w * 0.2},${MEDIA.h * 0.75} L${MEDIA.w * 0.7},${MEDIA.h * 0.2}`}
            stroke={WHITE} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${p(frame, c.advanced + 6, 20, "sweep")} 1`} />
          <path d={`M${MEDIA.w * 0.2 - 12},${MEDIA.h * 0.75 - 12} l24,24 m0,-24 l-24,24`} stroke={WHITE} strokeWidth={5} strokeLinecap="round" />
        </svg>} />
      <DateLabels s={c.afterwards} out={c.typically - 1} labels={[{ sub: "Oct 4, 2021", text: "Afterwards", x: 540, y: 300, s: c.afterwards + 1, accent: true }]} />
      <Lasts s={c.last} out={E("P05")} yearS={c.year} halfS={c.half} y={1120} />
      <ClipCardStd s={c.anesthetic - 2} out={E("P08")} left={320} caps="In the syringe" title="HA filler + lidocaine" media={<SyringeLido w={MEDIA.w} h={MEDIA.h} s={c.anesthetic} />} />
      {/* the fan map on her face: the read entry point and the cannula paths, mapped onto the footage every frame */}
      <FanMap s={c.deep} out={E("P09")} entry={tp("entryR", { x: 400, y: 1000 })} ends={[0, 1, 2].map((i) => tp(`pathR${i}`, { x: 480, y: 900 }))} />
      <ClipCardStd s={c.underneath - 4} out={E("P09")} left={320} top={1150} caps="Illustration · face model" title="Deep, under the muscle"
        media={P.section ? <SectionDiagram lines={P.section} w={MEDIA.w} h={MEDIA.h} mode="deep" s={c.underneath - 4} /> : null} />
      <SideBoxes s={c.fuller - 4} out={E("P10")} boxes={[
        { box: box("underL", { x: 380, y: 830 }, 230, 120), label: "Fuller (her right)", s: c.fuller, accent: true },
        { box: box("underR", { x: 700, y: 830 }, 230, 120), label: "Deeper (her left)", s: c.deeper },
      ]} />

      {/* ---------- S3 the decision: another syringe, or not ---------- */}
      <ChapterCard num="03" title="The decision" s={S("P14")} />
      <ClipCardStd s={c.another - 2} out={c.again - 1} left={88} caps="Done today" title="One syringe" depth={[2, "Deep, under the muscle"]}
        media={<PillowProfile grow={0} w={380} />} mark={tick(c.beautiful, true, "Used here")} />
      <ClipCardStd s={c.another + 4} out={c.again - 1} left={552} caps="The question" title="Another syringe" dim={frame > c.beautiful}
        media={ai("pillowy", <PillowProfile grow={Math.min(1, Math.max(0, (frame - c.expand) / 30))} w={380} />, 420)} mark={tick(c.beautiful, false, "Not used: it expands, pillowy")} />
      <ClipCardStd s={c.bluish - 4} out={E("P15")} left={320} caps="Illustration · face model" title="The Tyndall effect" depth={[0, "Too close to the surface"]}
        media={P.section ? <SectionDiagram lines={P.section} w={MEDIA.w} h={MEDIA.h} mode="tyndall" s={c.bluish} /> : null} />

      {/* ---------- S4 the result: needles vs the cannula, the pinprick, then the follow-up ---------- */}
      <ChapterCard num="04" title="The result" s={S("P17")} />
      <ClipCardStd s={c.conventional - 2} out={c.pinprick - 1} left={88} caps="The conventional way" title="Needles" dim={frame > c.here}
        media={ai("bruising", <BruiseSwatch size={260} />, 420)} mark={tick(c.here, false, "Not used: bruising (illustration)")} />
      <ClipCardStd s={c.here - 2} out={c.pinprick - 1} left={552} caps="What he used" title="Blunt cannula" depth={[2, "Deep, under the muscle"]}
        media={<svg width={400} height={90} viewBox="0 0 240 60"><path d="M0,22 H200 A8,8 0 0 1 200,38 H0" fill="#ffffff" stroke={INK} strokeWidth={2.5} /><rect x={170} y={27} width={16} height={6} rx={3} fill={INK} /></svg>}
        mark={tick(c.here, true, "One pinprick")} />
      <Arrow variant="curved-callout" from={{ x: 260, y: 1300 }} to={tp("entryR", { x: 380, y: 1010 })} start={c.pinprick + 1} end={c.pinprick + 70} bend={0.3} color={WHITE} />
      <TypedLabel text="One pinprick" s={c.pinprick} out={c.pinprick + 70} x={260} y={1320} align="center" size={52} />
      <SkinWindow s={c.two} out={E("P17")} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={c.two + 30}
        data={P.sketch} drawS={c.two - 200} arrowsS={c.settled} labels={{ before: "Before · Sept 20", after: "After · Oct 4" }}
        credit="Patient of Dr. Ostad. Individual results vary. Arrows only where the under-eye shadow measured lighter." />
      {P.stat && (
        <div style={{ position: "absolute", left: M, top: 300, ...life(frame, c.settled + 6, E("P17")), textShadow: "0 2px 14px rgba(0,0,0,.5)" }}>
          <div style={{ ...caps(28, "rgba(255,255,255,.92)") }}>Under-eye shadow, measured</div>
          <div style={{ font: `600 120px/1 ${FONT}`, color: WHITE, marginTop: 10 }}>
            −{Math.round((100 * (P.stat.before - P.stat.after) / P.stat.before) * Math.min(1, Math.max(0, (frame - c.settled - 6) / 26)))} %
          </div>
          <div style={{ ...caps(28, "rgba(255,255,255,.92)"), marginTop: 8 }}>{`vs the cheek: ${P.stat.before} → ${P.stat.after} L*, Sept 20 → Oct 4`}</div>
        </div>
      )}
      <Sequence from={end} durationInFrames={TAIL2} layout="none"><EndCardClean s={0} /></Sequence>

      <Captions words={P.words} hide={[]} />
      {!P.bare && <>
        {/* one sound per event class: chapter, card, draw, reveal; the hero event of a beat at 0.32, the rest 0.16 */}
        {[0, S("P03"), S("P04"), S("P14"), S("P17")].map((f, i) => <Sfx key={`ch${i}`} at={(f + 1) / 24} name="card" gain={1} />)}
        {[eyeCardS, c.hollows - 4, c.cannula, c.advanced, c.last, c.anesthetic - 2, c.underneath - 4, c.another - 2, c.another + 4, c.bluish - 4, c.conventional - 2, c.here - 2].map((f, i) => <Sfx key={`c${i}`} at={(f + 1) / 24} name="pop" gain={0.5} />)}
        {[c.hollows, c.deep, c.fuller, c.pinprick, c.beautiful, c.here].map((f, i) => <Sfx key={`d${i}`} at={(f + 1) / 24} name="swish" gain={0.5} />)}
        <Sfx at={21 / 24} name="swish" /><Sfx at={(c.two + 31) / 24} name="swish" /><Sfx at={(c.settled + 1) / 24} name="yes" />
      </>}
    </AbsoluteFill>
  );
};
