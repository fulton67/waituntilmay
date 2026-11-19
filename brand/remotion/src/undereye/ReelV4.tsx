// UndereyeReelV4: the under-eye filler reel after the client's 2026-11-19 notes (same cut, audio, words and pacing as UndereyeReelV2 /
// UndereyeReel_v3.mp4, which is not edited). Props: public/undereye-filler/props_v4.json (brand/scripts/undereye_prep_v4.py).
//   1. every drawn line-art device is a Flora anatomy plate (U1, U3-U9) on the same beat, in the STANDARD ClipCard (PlateMedia)
//   2. nothing covers a face (research/ostad/style/undereye/face_clear.py): the full-frame chapter cards with the left darkening are gone; the
//      titles sit on the wall behind the people with their RVM key over the type (KeyLayer), in face-free wall; the cards sit under the faces
//   3. the face markup is technical and locked: the plan (entries, read cannula axes, the fan to the trough, the deep deposit, the rim) on her
//      registered Sept 20 face, full frame, from "deep" to the end of P10 (it replaces the FanMap and the side boxes on moving footage); the
//      pinprick and the measured change in the before/after window, every word outside the photo
//   4. sound: chapter + card only, far below the voice (Jan 08 v2)
// The footage is the raw iPhone file: never graded, tone-mapped, brightened or faded (client ruling); the hook ends on a hard cut.
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { Lasts } from "./devices";
import { DateLabels, Mark, type SketchData } from "./devices_v2";
import { ClipCardStd } from "./standard";
import { BAWindowV4, EndCardLow, Legend, PlanMarks, PlateMedia, RoomTitle, SECTION_LEN, TallPlateCard, WidePlateCard, CardV4, type FramesMeta } from "./markup_v4";
import { FONT } from "../brand";
import { CAP_T, H, INK, M, MUTED, W, WHITE, caps, life } from "./look";

type Pic = { f0: number; f1: number; clip?: string; still?: string; src?: number; scale?: number; ox?: number; oy?: number; run0?: number };
type Piece = { id: string; clip: string; section: string; at: number; dur: number; from: number; to: number; pics: Pic[] };
type Word = { w: string; f: number; f1: number; piece: string; voice: string };
type KeySpec = { clip: string; a: number };
export type V4Props = { bare?: boolean; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: Word[]; cues: Record<string, number>;
  sketch?: SketchData; stat?: { before: number; after: number }; hook: number; keys: Record<string, KeySpec>; frames: FramesMeta };

export const TAIL4 = 72;
const STILL: Record<string, string> = { after: "ba_after.jpg", before_ref: "ba_before_ref.jpg", plan: "ba_wipe_before.jpg" };
let BARE = false;
let PLAN: { data?: SketchData; ev: Parameters<typeof PlanMarks>[0]["ev"] } = { ev: { rim: 0, trough: 0, entry: 0, paths: 0, fan: 0, deposit: 0 } };

const transformOf = (q: Pic, f: number) => {
  const sc = q.scale ?? 1, ox = q.ox ?? 540, oy = q.oy ?? 960;
  const push = q.still ? 1 + 0.035 * Math.min(1, (f + q.f0 - (q.run0 ?? q.f0)) / 120) : 1;
  return { transformOrigin: `${ox}px ${oy}px`, transform: `scale(${sc * push})`, k: sc * push };
};

const PicLayer: React.FC<{ q: Pic; speed: number }> = ({ q, speed }) => {
  const f = useCurrentFrame(); // local to the segment
  const { transformOrigin, transform, k } = transformOf(q, f);
  let body: React.ReactNode = null;
  if (q.still === "plan") body = <>{!BARE && <Img src={staticFile(`undereye-filler/${STILL.plan}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />}
    {!BARE && PLAN.data && <PlanMarks data={PLAN.data} f={f + q.f0} ev={PLAN.ev} sw={k} />}</>;
  else if (BARE) body = null;
  else if (q.still) body = <Img src={staticFile(`undereye-filler/${STILL[q.still]}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
  else body = <OffthreadVideo src={staticFile(`undereye-filler/${q.clip}.mp4`)} trimBefore={Math.round(q.src! * 24)} playbackRate={speed} muted
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />;
  return <AbsoluteFill style={{ transformOrigin, transform, background: BARE ? undefined : "#000" }}>{body}</AbsoluteFill>;
};

/** the people's key over a title, inside the same picture transform as the footage; black in the bare pass (so covered type is not counted) */
const KeyLayer: React.FC<{ q: Pic; key4: KeySpec; name: string; speed: number; s: number; e: number }> = ({ q, key4, name, speed, s, e }) => {
  const f = useCurrentFrame();
  const abs = f + q.f0;
  if (abs < s || abs > e) return null;
  const { transformOrigin, transform } = transformOf(q, f);
  return (
    <AbsoluteFill style={{ transformOrigin, transform }}>
      <OffthreadVideo src={staticFile(`undereye-filler/key_${name}.webm`)} transparent trimBefore={Math.round(q.src! * 24) - 24 * key4.a} playbackRate={speed} muted
        style={{ position: "absolute", left: 0, top: 0, width: W, height: H, filter: BARE ? "brightness(0)" : undefined }} />
    </AbsoluteFill>
  );
};

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
const Captions: React.FC<{ words: Word[]; from?: number }> = ({ words, from = 0 }) => {
  const frame = useCurrentFrame();
  const ls = React.useMemo(() => lines(words), [words]);
  if (frame < from) return null; // not over her face in the full-frame hook (face_clear)
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

export const UndereyeReelV4: React.FC<V4Props> = (P) => {
  useElza();
  BARE = !!P.bare;
  const frame = useCurrentFrame();
  const { pieces, cues: c, speed } = P;
  const subs = (id: string) => pieces.filter((x) => x.id === id || (x.id.length === id.length + 1 && x.id.startsWith(id) && /[xyz]$/.test(x.id)));
  const S = (id: string) => subs(id)[0].at, E = (id: string) => { const l = subs(id)[subs(id).length - 1]; return l.at + l.dur - 1; };
  const end = P.durationInFrames;
  const last = pieces[pieces.length - 1];
  const all = pieces.flatMap((x) => x.pics).sort((a, b) => a.f0 - b.f0);
  all.forEach((q, i) => { q.run0 = i && all[i - 1].still && all[i - 1].still === q.still && all[i - 1].f1 === q.f0 ? all[i - 1].run0 : q.f0; });
  const tail: Pic = { ...last.pics[last.pics.length - 1], f0: end, f1: end + TAIL4, src: (last.pics[last.pics.length - 1].src ?? 0) + (last.dur / 24) * speed };
  const pics = [...all, tail];
  const CROP = { x: 250, y: 830, w: 580, h: 420 };
  const MEDIA = { w: 420, h: 315 };
  const FR = P.frames ?? {};
  /** where each (portrait) plate is cropped for a 4:3 card window: the part the line is about, at a size the eye can read */
  const PCROP: Record<string, { cx: number; cy: number; cw: number }> = { U1: { cx: 0.62, cy: 0.45, cw: 0.62 }, U4: { cx: 0.42, cy: 0.5, cw: 0.75 }, U5: { cx: 0.68, cy: 0.455, cw: 0.75 }, U7: { cx: 0.43, cy: 0.67, cw: 0.52 }, U8: { cx: 0.55, cy: 0.59, cw: 0.65 }, U9: { cx: 0.5, cy: 0.5, cw: 1 } };
  const plate = (id: string, map: [number, number][], labels: Parameters<typeof PlateMedia>[0]["labels"] = [], out?: number, h = MEDIA.h) =>
    <PlateMedia id={id} frames={FR} map={map} w={MEDIA.w} h={h} labels={labels} out={out} crop={PCROP[id]} />;
  // the plan board's word events (P09 "deep into the tissue ... right underneath the muscle", P10 "fuller on the right ... deeper")
  PLAN = { data: P.sketch, ev: { rim: c.deep, trough: c.deep + 6, deposit: c.deep + 14, entry: c.deep + 34, paths: c.we, fan: c.underneath - 10, side: [c.fuller, c.deeper] } };
  const eyeCardS = c.hollows - 10;
  const eyeRate = Math.min(0.75, 1.5 / Math.max(1, (E("P03") - 2 - eyeCardS) / 24));
  const CARD_T = 1130;
  const tick = (s: number, used: boolean, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, opacity: frame > s ? 1 : 0 }}>
      <Mark kind={used ? "tick" : "x"} s={s} size={30} color={used ? INK : MUTED} />
      <span style={{ font: `600 26px/1.15 ${FONT}`, color: used ? INK : MUTED }}>{text}</span>
    </div>
  );
  // a section title behind the people: the title, then their key over it for the card's life (every footage segment it spans)
  const Sec = (name: string, s: number, num: string, title: string, opt: { align?: "left" | "right"; px?: number; top?: number; x?: number } = {}) => {
    const e = s + SECTION_LEN;
    const k = P.keys?.[name];
    return <>
      <RoomTitle s={s} num={num} title={title} {...opt} />
      {k && pics.filter((q) => q.clip === k.clip && q.f1 > s && q.f0 <= e).map((q, i) => (
        <Sequence key={`${name}${i}`} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><KeyLayer q={q} key4={k} name={name} speed={speed} s={s} e={e} /></Sequence>
      ))}
      {pics.filter((q) => q.f1 > s && q.f0 <= e && q.clip && k && q.clip !== k.clip).map((q, i) => {
        const k2 = P.keys?.[`${name}b`];
        return k2 && q.clip === k2.clip ? <Sequence key={`${name}b${i}`} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><KeyLayer q={q} key4={k2} name={`${name}b`} speed={speed} s={s} e={e} /></Sequence> : null;
      })}
    </>;
  };
  const S4 = S("P17");
  const winS = c.pinprick - 14;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pics.map((q, k) => (
        <Sequence key={k} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><PicLayer q={q} speed={speed} /></Sequence>
      ))}
      {!P.bare && <Audio src={staticFile("undereye-filler/dialogue_v2.wav")} />}

      {/* ---------- HOOK: the registered Sept 20 -> Oct 4 wipe across her eyes, full frame, then a hard cut; the title on the wall behind her ---------- */}
      {frame < P.hook && !P.bare && (
        <AbsoluteFill>
          <Img src={staticFile("undereye-filler/ba_wipe_before.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - Math.min(1, Math.max(0, (frame - 6) / 22)) * 100}% 0 0)` }}>
            <Img src={staticFile("undereye-filler/ba_wipe_after.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          </div>
        </AbsoluteFill>
      )}
      {Sec("title", P.hook, "Dr. Ariel Ostad", "Under-eye filler", { px: 96, top: 236 })}
      <BAWindowV4 s={P.hook} out={E("H1")} top={1140} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={P.hook + 16}
        labels={{ before: "Before · Sept 20", after: "After · Oct 4" }} bare={P.bare} note={() => "Our patient, Sept 2021"} />

      {/* ---------- S1 the concern: her real under-eye beside the tear trough (U1, frame 0: the hollow over the rim) ---------- */}
      {Sec("c01", S("P03"), "01", "The concern", { align: "right", x: 1000, px: 104 })}
      <ClipCardStd s={eyeCardS} out={E("P03") - 2} left={88} top={CARD_T} caps="Sept 20 · before" title="Her under-eye"
        media={P.bare ? null : <div style={{ position: "relative", width: MEDIA.w, height: MEDIA.h }}>
          <Sequence from={eyeCardS} layout="none"><OffthreadVideo src={staticFile("undereye-filler/6814.mp4")} trimBefore={5} playbackRate={eyeRate} muted style={{ position: "absolute", left: -70, top: 0, width: 560, height: 315 }} /></Sequence>
        </div>} />
      <ClipCardStd s={c.hollows - 4} out={E("P03") - 2} left={552} top={CARD_T} caps="Illustration" title="The tear trough"
        media={plate("U1", [[c.hollows - 4, 0]], [{ text: "Tear trough", x: 0.05, y: 0.62, s: c.hollows + 4 }])} />
      <Sequence from={E("P03")} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>

      {/* ---------- S2 the procedure ---------- */}
      {Sec("c02", S("P04") - 1, "02", "The\nprocedure", { px: 92 })}
      <ClipCardStd s={c.cannula + 8} out={c.afterwards - 12} left={88} top={CARD_T} caps="Blunt cannula" title="Around, not through"
        media={plate("U4", [[c.cannula + 8, 0], [c.blunt, 50], [c.blunt + 24, 72]], [{ text: "Needle", x: 0.36, y: 0.1, s: c.cannula + 12 }, { text: "Cannula", x: 0.04, y: 0.84, s: c.blunt }], c.afterwards - 2)} />
      <ClipCardStd s={c.advanced} out={c.afterwards - 12} left={552} top={CARD_T} caps="One entry point" title="More delicate"
        media={plate("U5", [[c.advanced, 0], [c.advanced + 6, 46], [c.delicate, 54], [c.delicate + 14, 66], [c.delicate + 30, 90], [c.delicate + 40, 110], [c.afterwards - 12, 143]], [{ text: "One entry", x: 0.32, y: 0.9, s: c.advanced + 4 }, { text: "Threads, fanned", x: 0.95, y: 0.62, s: c.delicate + 14, anchor: "end" }], c.afterwards - 2)} />
      <DateLabels s={c.afterwards} out={c.typically - 1} labels={[{ sub: "Oct 4, 2021", text: "Afterwards", x: 540, y: 262, s: c.afterwards + 1, accent: true }]} />
      <Lasts s={c.last} out={E("P05")} yearS={c.year} halfS={c.half} y={1120} />
      {/* the syringe in the face-free column left of her face (the injection close-up fills the middle and the top: face_clear) */}
      <TallPlateCard s={c.anesthetic - 2} out={E("P08") - 16} x={36} y={520} w={320} eyebrow="In the syringe" title="HA filler + lidocaine"
        media={<PlateMedia id="U6" frames={FR} w={300} h={560} rotate={-90} crop={{ cx: 0.3, cy: 0.52, cw: 0.83 }} map={[[c.anesthetic, 0], [c.anesthetic + 20, 48], [c.lidocaine, 60], [E("P08"), 119]]}
          labels={[{ text: "HA gel", x: 0.6, y: 0.27, s: c.anesthetic + 4 }, { text: "+ lidocaine", x: 0.6, y: 0.36, s: c.lidocaine }]} out={E("P08")} />} />

      {/* the plan board (P09 "deep" -> end of P10): the marks on her face are in PicLayer (locked to the photo); the key to them and the
          section plate sit below her chin */}
      <Legend x={M} y={1214} w={430} out={E("P10")} head="His plan · Sept 20 · 1 syringe" headS={c.deep} size={20} rows={[
        { glyph: "rim", text: "Orbital rim (bone)", s: c.deep },
        { glyph: "hatch", text: "The hollow · filled deep", s: c.deep + 14 },
        { glyph: "x", text: "Entry · one per side", s: c.deep + 34 },
        { glyph: "path", text: "Cannula path (read)", s: c.we },
        { glyph: "fan", text: "Fan to the trough", s: c.underneath - 10 },
        { glyph: "trough", text: "Her right fuller · left deeper", s: c.fuller },
      ]} />
      <ClipCardStd s={c.underneath - 4} out={E("P10")} left={W - M - 440 + 10} top={1150} caps="Illustration" title="Deep, under the muscle"
        media={plate("U1", [[c.underneath - 4, 66], [c.underneath + 40, 120], [E("P10"), 143]], [{ text: "Muscle", x: 0.66, y: 0.5, s: c.underneath + 8 }, { text: "Filler, on the bone", x: 0.95, y: 0.92, s: c.underneath + 30, anchor: "end" }], E("P10"))} />

      {/* ---------- S3 the decision: another syringe, or not ---------- */}
      {Sec("c03", S("P14"), "03", "The decision", { px: 104 })}
      <CardV4 cutOut mediaH={315} s={c.another - 2} out={c.again - 1} left={88} top={CARD_T} caps="Done today" title="One syringe"
        media={plate("U7", [[c.another - 2, 0]], [{ text: "Smooth, deep", x: 0.63, y: 0.95, s: c.another + 6, anchor: "middle" }])} mark={tick(c.beautiful, true, "Used here")} />
      <CardV4 cutOut mediaH={315} s={c.another + 4} out={c.again - 1} left={552} top={CARD_T} caps="The question" title="Another syringe" dim={frame > c.beautiful}
        media={plate("U7", [[c.expand, 0], [c.expand + 50, 84], [c.pillowy, 96]], [{ text: "Pillowy", x: 0.63, y: 0.95, s: c.pillowy, anchor: "middle" }])} mark={tick(c.beautiful, false, "Not used: it expands")} />
      <WidePlateCard s={c.bluish - 4} out={E("P15")} x={M} y={1270} w={W - 2 * M} h={300} eyebrow="Too close to the surface" title="The Tyndall effect"
        media={<PlateMedia id="U3" frames={FR} w={W - 2 * M - 310} h={280} crop={{ cx: 0.55, cy: 0.33, cw: 0.95 }} map={[[c.bluish - 4, 0], [c.bluish, 30], [c.tyndall, 66], [c.tyndall + 1, 114], [E("P15"), 135]]}
          labels={[{ text: "Filler too shallow", x: 0.5, y: 0.72, s: c.bluish + 2, anchor: "end" }, { text: "Light scatters back", x: 0.3, y: 0.2, s: c.tyndall, anchor: "end" }]} out={E("P15")} />} />

      {/* ---------- S4 the result: needles vs the cannula, the one pinprick, then the follow-up, measured ---------- */}
      {Sec("c04", S4, "04", "The result", { align: "right", x: 1000, px: 104 })}
      <CardV4 s={c.conventional - 2} out={winS - 4} left={88} top={1215} caps="The conventional way" title="Needles" dim={frame > c.here}
        media={plate("U8", [[c.conventional - 2, 0], [c.conventional + 32, 32], [c.swelling0, 60], [c.bruised, 108], [winS - 4, 130]], [{ text: "Bruise", x: 0.3, y: 0.8, s: c.bruised, anchor: "end" }], winS - 4, 210)}
        mark={tick(c.here, false, "Not used: bruising")} />
      <CardV4 s={c.here - 2} out={winS - 4} left={552} top={1215} caps="What he used" note="deep, under the muscle" title="Blunt cannula"
        media={plate("U9", [[c.here - 2, 0], [winS, 120]], [{ text: "Blunt, rounded tip", x: 0.6, y: 0.18, s: c.here + 4, anchor: "end" }], winS - 4, 210)} mark={tick(c.here, true, "One pinprick")} />
      <BAWindowV4 s={winS} out={E("P17")} top={1212} maxw={460} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={c.two + 30}
        data={P.sketch} marksS={winS + 4} pulse={c.pinprick} barsS={c.settled} bare={P.bare} labels={{ before: "Before · Sept 20", after: "After · Oct 4" }}
        note={(f) => (f < c.two + 30 ? "x = the one pinprick · line = cannula" : f < c.settled ? "Same marks, Oct 4" : "Bars = lighter under-eye (L*, measured)")}
        credit="Patient of Dr. Ostad. Individual results vary." />
      {P.stat && (
        <div style={{ position: "absolute", left: M, top: 880, ...life(frame, c.settled + 6, E("P17")), textShadow: "0 2px 14px rgba(0,0,0,.55)" }}>
          <div style={{ ...caps(24, "rgba(255,255,255,.95)") }}>Under-eye shadow vs the cheek</div>
          <div style={{ font: `600 104px/1 ${FONT}`, color: WHITE, marginTop: 8 }}>
            −{Math.round((100 * (P.stat.before - P.stat.after) / P.stat.before) * Math.min(1, Math.max(0, (frame - c.settled - 6) / 26)))} %
          </div>
          <div style={{ ...caps(24, "rgba(255,255,255,.95)"), marginTop: 6 }}>{`${P.stat.before} → ${P.stat.after} L* · Sept 20 → Oct 4`}</div>
        </div>
      )}
      <Sequence from={end} durationInFrames={TAIL4} layout="none"><EndCardLow s={0} top={1110} /></Sequence>

      <Captions words={P.words} from={P.hook} />
      {!P.bare && <>
        {/* chapter + card only, far below the voice (v3 had 25 hits at 0.16-0.32; Jan 08 v2: chapter 0.096, card 0.07) */}
        {[P.hook, S("P03"), S("P04") - 1, S("P14"), S4].map((f, i) => <Sfx key={`ch${i}`} at={(f + 1) / 24} name="exo_chapter" gain={0.3} />)}
        {[c.hollows - 4, c.cannula + 8, c.anesthetic - 2, c.deep, c.bluish - 4, c.conventional - 2, winS].map((f, i) => <Sfx key={`k${i}`} at={(f + 1) / 24} name="exo_card" gain={0.22} />)}
      </>}
    </AbsoluteFill>
  );
};
