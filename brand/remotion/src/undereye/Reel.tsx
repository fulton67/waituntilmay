// UndereyeReel: Dr. Ostad, under-eye (tear trough) HA filler with a blunt cannula, 2021-09-20 session. 9:16, 24 fps.
// NOT FOR POSTING until patient consent = yes (catalog consent: unknown). Beat sheet: research/ostad/style/undereye/BEATS.md.
// Props: public/undereye-filler/props.json from brand/scripts/undereye_prep.py (cut.json resolved against the word timings, the
// cue frames, the face tracks). The cut is made here, in Remotion: every piece is a Sequence that plays its clip's audio from
// `from` at the edit speed, with its own picture or a B-roll picture under it. The patient's name is cut out of the audio by the cut.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { Sfx, card } from "../components/Ro";
import { Highlighter } from "../library/Highlighter";
import { RollingLabel } from "../library/RollingLabel";
import {
  BlueTint, BoxSlam, HeadedArrow, Lasts, Loupe, MorphCard, Note, ProductPlate, SectionPill, Shot, SideBoxes, StrikeReplace, TipCompare, Title,
  TrackRing, TypedLabel, WaterPanel, WeeksCircle, type Box,
} from "./devices";
import { CAP_T, D, H, HL, INK, M, W, WHITE, life, type Pt } from "./look";

export type Piece = { id: string; clip: string; section: string; from: number; to: number; at: number; dur: number; picture: string; pictureFrom: number };
export type Word = { w: string; f: number; f1: number; piece: string; k: number };
export type Track = { f0: number; pts: Record<string, [number, number][]> }; // per comp frame from f0, comp px
export type UEProps = { bare?: boolean; fps: number; speed: number; durationInFrames: number; approx: boolean; pieces: Piece[]; words: Word[]; cues: Record<string, number>; tracks: Record<string, Track> };

export const TAIL = 72; // end card after "Thank you"
const SRC = (clip: string) => `undereye-filler/${clip}.mp4`;

// FOOTAGE: one line per clip. "stills" = the catalog's stills (clinic-library/frames, one every 3 s: 93 for 4:37), shown as timed
// stills that switch on the source clock (the proxy, while iCloud holds the originals); "video" = the transcoded original
// (public/undereye-filler/<clip>.mp4, brand/scripts/undereye_prep.py transcode). Swapping a clip to its real footage is this one line.
export const FOOTAGE: Record<string, "stills" | "video"> = {
  "6816": "video",
  "6817": "video",
  "6818": "video",
  "6821": "video",
};
const STILLS: Record<string, number> = { "6816": 17, "6817": 93, "6818": 16, "6821": 12 }; // stills per clip (every 3 s from 0 s)
export const isProxy = () => Object.values(FOOTAGE).some((m) => m === "stills");

// `bare` (measurement pass, brand/scripts/undereye_verify.py): graphics and captions only, on black, so frame differences are the graphics'
let BARE = false;
// Footage: the picture of clip `clip` from source second `from`, playing at `speed` on the local timeline of its Sequence
export const Footage: React.FC<{ clip: string; from: number; speed: number; style?: React.CSSProperties }> = ({ clip, from, speed, style }) => {
  const frame = useCurrentFrame();
  if (BARE) return null;
  if (FOOTAGE[clip] === "stills") {
    const t = from + (frame / 24) * speed;
    const n = Math.min(STILLS[clip] ?? 1, Math.max(1, Math.floor(t / 3) + 1));
    return <Img src={staticFile(`undereye-filler/frames/${clip}/f${String(n).padStart(4, "0")}.jpg`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", ...style }} />;
  }
  return <Shot src={SRC(clip)} trimBefore={Math.round(from * 24)} rate={speed} style={style} />;
};
const Picture: React.FC<{ pc: Piece; speed: number; approx?: boolean; style?: React.CSSProperties }> = ({ pc, speed, style }) => <Footage clip={pc.picture} from={pc.pictureFrom} speed={speed} style={style} />;

// word captions (style DECISIONS 14d rule 8): each word cuts on at its onset frame; no fade, rise, shadow-box or stroke; the rest of
// the line holds its place invisibly so nothing reflows. Lines break at a pause >= 8 f, at a piece boundary, or at 3 words / 20 chars.
// Clean white NHG 600 at 5.8cqw (the reel "clean" look, Captions.tsx), top at 83 % H.
const lines = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const len = cur.reduce((s, x) => s + x.w.length + 1, 0) + w.w.length;
    if (prev && (w.f - prev.f1 >= 8 || w.piece !== prev.piece || cur.length >= 3 || len > 20)) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
};
const WordCaptions: React.FC<{ words: Word[]; hide: [number, number][] }> = ({ words, hide }) => {
  const frame = useCurrentFrame();
  const ls = React.useMemo(() => lines(words), [words]);
  if (hide.some(([a, b]) => frame >= a && frame < b)) return null;
  const i = ls.findIndex((l, k) => frame >= l[0].f && frame < Math.min(ls[k + 1]?.[0].f ?? Infinity, l[l.length - 1].f1 + 10));
  if (i < 0) return null;
  return (
    <div style={{ position: "absolute", left: M, right: M, top: CAP_T, textAlign: "center", font: `600 62.6px/1.2 "neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif`,
      letterSpacing: "0.01em", color: WHITE, textShadow: "0 2px 10px rgba(0,0,0,.38), 0 0 2px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
      {ls[i].map((w, k) => <span key={k} style={{ visibility: frame >= w.f ? "visible" : "hidden" }}>{(k ? " " : "") + w.w.replace(/[",]/g, "")}</span>)}
    </div>
  );
};

export const UndereyeReel: React.FC<UEProps> = (P) => {
  useElza();
  BARE = !!P.bare;
  const frame = useCurrentFrame();
  const { pieces, cues: c, speed, approx, tracks } = P;
  const pc = (id: string) => pieces.find((x) => x.id === id)!;
  const S = (id: string) => pc(id).at; // piece start frame
  const E = (id: string) => pc(id).at + pc(id).dur - 1; // piece end frame
  // a tracked point, or a fixed fallback (approx mode / before the tracks exist)
  const tp = (key: string, name: string, fb: Pt) => (f: number): Pt => {
    const t = tracks[key];
    const a = t?.pts[name];
    if (!a || !a.length) return fb;
    const q = a[Math.max(0, Math.min(a.length - 1, f - t.f0))];
    return { x: q[0], y: q[1] };
  };
  const box = (key: string, name: string, fb: Pt, w: number, h: number) => (f: number): Box => { const q = tp(key, name, fb)(f); return { x: q.x - w / 2, y: q.y - h / 2, w, h }; };
  const end = P.durationInFrames;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* the cut: picture + audio per piece */}
      {pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <Picture pc={x} speed={speed} approx={approx} />
          {FOOTAGE[x.clip] === "video" && <Audio src={staticFile(SRC(x.clip))} trimBefore={Math.round(x.from * 24)} playbackRate={speed} />}
        </Sequence>
      ))}
      {/* tail: the last shot keeps running, muted, under the end card */}
      <Sequence from={end} durationInFrames={TAIL} layout="none">
        <Picture pc={{ ...pieces[pieces.length - 1], pictureFrom: pieces[pieces.length - 1].pictureFrom + (pieces[pieces.length - 1].dur / 24) * speed }} speed={speed} approx={approx} />
      </Sequence>

      {/* ---------- S1 the concern ---------- */}
      <Title eyebrow="Under-eye filler · blunt cannula" words={[{ text: "Fillers", f: c.fillers }, { text: "for her", f: c.fillers + 3 }, { text: "lower", f: c.lower }, { text: "eyelids", f: c.eyelids }]} out={E("P02") - 4} />
      <Sequence from={6} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>
      {/* B02 hollows: loupe on her under-eye, label typed on "hollows" */}
      <Loupe s={c.hollows - 6} out={c.tired - 2} c={{ x: 770, y: 1180 }} r={180} zoom={2.6} target={tp("P03", "underR", { x: 845, y: 545 })} label="Under-eye hollows" labelS={c.hollows}
        video={(st) => <Sequence from={S("P03")} durationInFrames={pc("P03").dur} layout="none"><Picture pc={pc("P03")} speed={speed} approx={approx} style={st} /></Sequence>} />
      {/* B03 "illusion of being tired. She's not." */}
      <StrikeReplace oldText="Tired?" newText="An illusion." s={c.tired} strikeS={c.not} newS={c.not + 6} out={E("P03")} y={1030} />
      {/* B04 the filler itself, plate then picture */}
      <ProductPlate s={c.usefiller} out={c.cannula - 1} img="undereye-filler/syringe.jpg" crop={{ x: 250, y: 880, w: 520, h: 520 }} srcW={1080} srcH={1920} box={{ x: M, y: 1000, w: 480, h: 480 }}
        chip="Hyaluronic acid filler" chipS={c.acid} sub="with lidocaine" />
      {/* B05 needle vs cannula */}
      <TipCompare s={c.cannula} out={E("P05")} bluntS={c.blunt} needleS={c.sharp} sharpS={c.sharp + 4} chips={[{ text: "Swelling", s: c.swelling }, { text: "Bruising", s: c.bruising }]} y={1060} />
      {/* B06 a year to a year and a half */}
      <Lasts s={c.last} out={E("P06")} yearS={c.year} halfS={c.half} y={1120} />

      {/* ---------- S2 the procedure ---------- */}
      <SectionPill num="02" title="The procedure" s={S("P07")} out={S("P07") + 44} />
      {/* B07 the one entry point */}
      <TrackRing s={c.insertion} out={E("P07")} c={tp("P07", "entry", { x: 360, y: 960 })} r={46} label="One entry point" side="right" />
      {/* B08 lidocaine */}
      <BoxSlam text="Lidocaine" s={c.lidocaine} out={E("P08")} sub="Numbing, already in the filler" subS={c.lidocaine + 6} x={M} y={330} />
      {/* B09 the route: entry point -> along the under-eye, deep */}
      <HeadedArrow variant="route" s={c.deep} out={E("P09")} from={tp("P09", "entry", { x: 360, y: 960 })} via={[tp("P09", "route1", { x: 400, y: 800 })]} to={tp("P09", "route2", { x: 520, y: 740 })} width={6} />
      <TypedLabel text="Deep, under the muscle" s={c.underneath} out={E("P09")} x={M} y={330} size={58} sub="Through one insertion point" />
      {/* B10 fuller vs deeper */}
      <SideBoxes s={c.fuller - 4} out={E("P10")} boxes={[
        { box: box("P10", "underL", { x: 380, y: 830 }, 230, 120), label: "Fuller", s: c.fuller, accent: true }, // her right side: treated first (entry on the image-left cheek)
        { box: box("P10", "underR", { x: 700, y: 830 }, 230, 120), label: "Deeper", s: c.deeper },
      ]} />
      {/* B11 water: hydrophilic vs not */}
      <WaterPanel s={c.absorb} out={E("P11")} notS={c.hydrophilic} pillowS={c.pillowy} y={1010} />
      {/* B12 how much: half a syringe -> one syringe */}
      {frame >= S("P12") && frame < E("P13") + D.exit && (
        <div style={{ ...card(24), left: M, top: 1210, padding: "26px 30px", display: "flex", alignItems: "center", gap: 28, ...life(frame, S("P12") + 1, E("P13")) }}>
          <div style={{ width: 150, height: 150, borderRadius: 16, overflow: "hidden", position: "relative", flex: "none" }}>
            <Img src={staticFile("undereye-filler/syringe.jpg")} style={{ position: "absolute", width: 1080 * 0.32, height: 1920 * 0.32, left: -101, top: -293, transform: `scale(${1 + 0.0004 * (frame - S("P12"))})` }} />
          </div>
          <RollingLabel label="Filler so far" values={[{ text: "½ syringe · one side", at: (c.halfsyringe) / 24 }, { text: "1 syringe · both sides", at: c.onesyringe / 24 }]} size={56} labelSize={24} ink={INK} />
        </div>
      )}

      {/* ---------- S3 the decision ---------- */}
      <SectionPill num="03" title="The decision" s={S("P14")} out={S("P14") + 44} />
      {frame >= c.another - 4 && frame < E("P14") + D.exit && (
        <div style={{ position: "absolute", left: M, right: M, top: 1000, ...life(frame, c.another - 4, E("P14")) }}>
          <Highlighter mode="karaoke" size={92} ink={INK} dim="rgba(255,255,255,.55)" fill={HL} maxWidth={W - 2 * M}
            words={[{ text: "Another", at: c.another / 24 }, { text: "syringe?", at: (c.another + 8) / 24 }]} punch={[0, 1]} style={{ textShadow: "0 2px 14px rgba(0,0,0,.35)" }} />
        </div>
      )}
      <HeadedArrow variant="straight" s={c.expand} out={E("P14")} from={{ x: 820, y: 1470 }} to={{ x: 820, y: 1230 }} width={6} />
      <TypedLabel text="It will expand" s={c.expand + 7} out={E("P14")} x={790} y={1400} align="right" size={46} />
      {/* B14 the Tyndall effect, shown and cleared (illustration) */}
      <BlueTint s={c.bluish} clearS={E("P15") - 22} out={E("P15")} spots={[box("P15", "underR", { x: 380, y: 830 }, 230, 120), box("P15", "underL", { x: 700, y: 830 }, 230, 120)]} />
      <TypedLabel text="Bluish hue: the Tyndall effect" s={c.tyndall} out={E("P15")} x={M} y={330} size={52} sub="Avoided by injecting deep" />
      <Note text="Illustration" s={c.bluish + 1} out={E("P15")} y={1480} />

      {/* ---------- S4 the result ---------- */}
      <SectionPill num="04" title="The result" s={S("P16")} out={S("P16") + 44} />
      <MorphCard s={S("P16")} fullS={c.nobody} out={E("P16") + 30} card={{ x: 190, y: 420, w: 700, h: 1244 }} label="Right after">
        <Sequence from={S("P16")} layout="none"><Picture pc={pc("P16")} speed={speed} approx={approx} /></Sequence>
      </MorphCard>
      <HeadedArrow variant="curved" s={c.pinprick} out={E("P17")} from={{ x: 300, y: 1240 }} to={tp("P17", "entry", { x: 380, y: 1010 })} bend={0.28} />
      <TypedLabel text="One pinprick" s={c.pinprick} out={E("P17")} x={300} y={1262} align="center" size={48} />
      <WeeksCircle s={S("P18")} circleS={c.week} out={E("P18")} y={1060} />
      <Note text="Individual results vary." s={S("P18")} out={end} y={1520} />
      <Sequence from={end} durationInFrames={TAIL} layout="none"><EndCard /></Sequence>

      <WordCaptions words={P.words} hide={[[0, c.eyelids + 8], [c.another - 4, c.another + 30]]} />
      {isProxy() && <div style={{ position: "absolute", right: 24, top: 24, padding: "8px 14px", background: "rgba(200,30,30,.85)", color: WHITE, font: `600 26px/1 "neue-haas-grotesk-display", Arial, sans-serif`, letterSpacing: "0.06em" }}>PROXY · STILLS · NOT FOR POSTING</div>}
      {/* one sound per hero reveal (MOTION §6, M19) */}
      {!isProxy() && <><Sfx at={(c.hollows + 1) / 24} name="swish" /><Sfx at={(c.half + 1) / 24} name="pop" /><Sfx at={(c.nobody + 1) / 24} name="swish" /><Sfx at={(c.week + 13) / 24} name="yes" /></>}
    </AbsoluteFill>
  );
};
