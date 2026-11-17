// Oct14Reel: Dr. Ostad, the Oct 14 (2026) injection session. 9:16, 24 fps. NOT FOR POSTING until patient consent = yes.
// Beat sheet: research/ostad/style/oct14/BEATS.md. Props: public/oct14/props.json from brand/scripts/oct14_prep.py (cut.json resolved
// against the local word timings) plus the face tracks (oct14_track.py) and the before/after pair (oct14_pairs.py).
// The cut is made here: each piece is a Sequence that plays its clip's picture and audio from `from` at the edit speed. The patient's
// name is cut out of the audio by the cut (prep refuses a piece that contains it) and never appears on screen.
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { BeforeAfter, ConsentFlag, InjectionPip, Note, WordCaptions, type Region, type Word } from "./devices";
import { D, H, M, ON_FOOTAGE, SAFE_T, W, WHITE, caps, disp, life, p, type Pt } from "./look";

export type Piece = { id: string; role: string; from: number; to: number; at: number; dur: number; blur?: boolean };
export type Track = { n: number; pts: Record<string, [number, number][]> };
export type PipPlan = { n: number; cue: string; out: string | number; key: string; role: string; clipFrom: number; rate?: number; label: string; focus?: { fx: number; fy: number; z: number } };
export type BAPlan = { cue: string; out: number | string; pull?: string | number; crop: { x: number; y: number; w: number }; iw: number; ih: number;
  regions: { id: string; label: string; cue: string; key: string; rx: number; ry: number; zoom?: number }[]; pts: Record<string, [number, number]>; subs: [string, string] };
export type Oct14Props = {
  bare?: boolean; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: (Word & { piece: string })[]; cues: Record<string, number>;
  tracks: Record<string, Track>; pips: PipPlan[]; ba?: BAPlan; title?: { eyebrow: string; words: { text: string; cue: string }[]; out: string }; hideCaps?: [string, string][];
  sfx?: { cue: string; name: string }[]; tail: number;
};

const SRC = (role: string) => `oct14/${role}.mp4`;
let BARE = false;

// the clip's picture under a piece (full bleed, cover); `blur` = the soft ground behind the before/after cards
const Picture: React.FC<{ pc: Piece; speed: number; blur?: boolean }> = ({ pc, speed, blur }) => (BARE ? null : (
  <OffthreadVideo src={staticFile(SRC(pc.role))} trimBefore={Math.round(pc.from * 24)} playbackRate={speed} muted
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", filter: blur ? "blur(26px) brightness(.62) saturate(.85)" : undefined, transform: blur ? "scale(1.08)" : undefined }} />
));

// title (`type-word-fade-rise`, DDOS f3-13: each word rises 6 % of its size and fades in 5 f on its own cue) over a soft top scrim
const Title: React.FC<{ eyebrow: string; words: { text: string; f: number }[]; out: number }> = ({ eyebrow, words, out }) => {
  const frame = useCurrentFrame();
  const e = p(frame, out, D.exit, "exit");
  if (frame > out + D.exit) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,14,24,.55) 0%, rgba(10,14,24,.22) 28%, rgba(10,14,24,0) 42%)" }} />
      <div style={{ position: "absolute", left: M, right: M, top: SAFE_T + 20, textShadow: ON_FOOTAGE }}>
        <div style={{ ...caps(28, "rgba(255,255,255,.88)"), ...life(frame, 0) }}>{eyebrow}</div>
        <div style={{ ...disp(100, WHITE), marginTop: 18 }}>
          {words.map((w, i) => { const q = p(frame, w.f + 1, 5, "arrive"); return <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 0.06 * 100}px)`, marginRight: "0.24em" }}>{w.text}</span>; })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Oct14Reel: React.FC<Oct14Props> = (P) => {
  useElza();
  BARE = !!P.bare;
  const { pieces, cues, speed, tracks } = P;
  const cue = (k: string | number) => (typeof k === "number" ? k : cues[k]);
  const end = P.durationInFrames;
  // a tracked point of the patient, mapped from composition frame to the frame of the clip on screen under that piece
  const tp = (role: string, key: string) => (f: number): Pt => {
    const t = tracks[role]?.pts[key];
    if (!t || !t.length) return { x: W / 2, y: H / 2 };
    const pc = pieces.filter((x) => x.role === role).reduce((best, x) => (f >= x.at && f < x.at + x.dur ? x : best), pieces.find((x) => x.role === role)!);
    const cf = Math.round(pc.from * 24 + Math.max(0, Math.min(pc.dur - 1, f - pc.at)) * speed);
    const q = t[Math.max(0, Math.min(t.length - 1, cf))];
    return { x: q[0], y: q[1] };
  };
  const ba = P.ba;
  const baS = ba ? cue(ba.cue) : Infinity;
  const regions: Region[] = ba ? ba.regions.map((r) => { const q = ba.pts[r.key]; return { id: r.id, label: r.label, s: cue(r.cue), zoom: r.zoom, c: { x: q[0] / ba.iw, y: q[1] / ba.ih }, r: { x: r.rx / ba.iw, y: r.ry / ba.ih } }; }) : [];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <Picture pc={x} speed={speed} blur={x.at >= baS - 1 || x.blur} />
          <Audio src={staticFile(SRC(x.role))} trimBefore={Math.round(x.from * 24)} playbackRate={speed} />
        </Sequence>
      ))}
      {/* tail: the last shot keeps running, muted and soft, under the end card */}
      <Sequence from={end} durationInFrames={P.tail} layout="none">
        <Picture pc={{ ...pieces[pieces.length - 1], from: pieces[pieces.length - 1].to }} speed={speed} blur />
      </Sequence>

      {P.title && <Title eyebrow={P.title.eyebrow} words={P.title.words.map((w) => ({ text: w.text, f: cue(w.cue) }))} out={cue(P.title.out)} />}
      <Sequence from={8} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>

      {P.pips.map((q) => (
        <InjectionPip key={q.n} n={q.n} s={cue(q.cue)} out={cue(q.out)} park={Math.min(baS - 1, pieces.filter((x) => x.role === "intro").reduce((a, x) => Math.max(a, x.at + x.dur), 0))}
          anchor={tp("intro", q.key)} clip={SRC(q.role)} clipFrom={q.clipFrom} rate={q.rate ?? 1} label={q.label} eyebrow={`Injection ${q.n}`} focus={q.focus} />
      ))}

      {ba && (
        <BeforeAfter s={baS} out={cue(ba.out)} pullS={ba.pull != null ? cue(ba.pull) : undefined} before="oct14/before.jpg" after="oct14/after_aligned.jpg" iw={ba.iw} ih={ba.ih}
          crop={ba.crop} regions={regions} subs={ba.subs} note="Immediately after treatment. Individual results vary." />
      )}
      {!ba && <Note text="Individual results vary." s={end - 72} out={end} />}
      <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>

      <WordCaptions words={P.words.filter((w) => w.w !== "[name]")} hide={(P.hideCaps ?? []).map(([a, b]) => [cue(a), cue(b)])} />
      <ConsentFlag />
      {(P.sfx ?? []).map((s, i) => <Sfx key={i} at={(cue(s.cue) + 1) / 24} name={s.name} />)}
    </AbsoluteFill>
  );
};
