// Oct14Reel: Dr. Ostad, the Oct 14 (2026) injection session. 9:16, 24 fps. NOT FOR POSTING until patient consent = yes.
// Beat sheet: research/ostad/style/oct14/BEATS.md. Plan and checks: brand/scripts/oct14_plan.py -> research/ostad/style/oct14/cut.json.
// Props: public/oct14/props.json (brand/scripts/oct14_prep.py props): pieces, word captions, cue frames, the patient's face tracks
// (oct14_track.py) and the before/after pair (oct14_pairs.py).
// The cut is made here, grouped by AREA (coordinator, 2026-11-17): each area is the problem from the intro, then the injection on that
// exact spot (a pop-up anchored to her face, or the injection clip full frame), then what he says while injecting. Every piece plays
// its own clip's audio from `from` at the edit speed. The picture under it is its own clip, or B-roll from the same session where he
// is off camera (pictureRole / pictureFrom). Her name is never spoken in any clip and never appears.
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { BeforeAfter, ConsentFlag, InjectionPip, WordCaptions, type Region, type Word } from "./devices";
import { DownTrace, FactCard, LaughRings, Ledger, LiftTicks, MonthsRule, SectionPill, TechLine } from "./beats";
import { D, H, M, ON_FOOTAGE, SAFE_T, W, WHITE, caps, disp, p, type Pt } from "./look";

export type Piece = { id: string; section: string; role: string; from: number; to: number; at: number; dur: number; pictureRole: string; pictureFrom: number };
export type Track = { n: number; pts: Record<string, [number, number][]> };
export type PipPlan = { n: number; cue: string; out: string; anchorRole: string; key: string; clip: string; clipFrom?: number; morphTo?: string; label: string; eyebrow: string;
  arrow?: "curved-callout" | "straight-pointer"; focus?: { fx: number; fy: number; z: number }; box?: { x: number; y: number; w: number; h: number } };
export type BAPlan = { cue: string; out: string; pull?: string; crop: { x: number; y: number; w: number }; iw: number; ih: number; subs: [string, string];
  regions: { id: string; label: string; cue: string; key: string; rx: number; ry: number; zoom?: number }[]; pts: Record<string, [number, number]> };
export type Oct14Props = {
  bare?: boolean; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: (Word & { piece: string })[]; cues: Record<string, number>;
  tracks: Record<string, Track>; pips: PipPlan[]; ba?: BAPlan; hideCaps?: [string, string][]; sfx?: { cue: string; name: string }[]; tail: number;
};

const SRC = (role: string) => `oct14/${role}.mp4`;
let BARE = false;

const Picture: React.FC<{ role: string; from: number; speed: number; blur?: boolean }> = ({ role, from, speed, blur }) => (BARE ? null : (
  <OffthreadVideo src={staticFile(SRC(role))} trimBefore={Math.round(from * 24)} playbackRate={speed} muted
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", filter: blur ? "blur(26px) brightness(.6) saturate(.85)" : undefined, transform: blur ? "scale(1.08)" : undefined }} />
));

// title (`type-word-fade-rise`, DDOS f3-13: each word rises 6 % of its size and fades in 5 f on its own cue) over a soft top scrim
const Title: React.FC<{ eyebrow: { text: string; f: number }[]; words: { text: string; f: number }[]; out: number }> = ({ eyebrow, words, out }) => {
  const frame = useCurrentFrame();
  if (frame > out + D.exit) return null;
  const e = p(frame, out, D.exit, "exit");
  const word = (w: { text: string; f: number }, i: number, size: number) => {
    const q = p(frame, w.f + 1, 5, "arrive");
    return <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 0.06 * size}px)`, marginRight: "0.24em" }}>{w.text}</span>;
  };
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,14,24,.55) 0%, rgba(10,14,24,.22) 26%, rgba(10,14,24,0) 40%)" }} />
      <div style={{ position: "absolute", left: M, right: M, top: SAFE_T + 10, textShadow: ON_FOOTAGE }}>
        <div style={{ ...disp(104, WHITE) }}>{words.map((w, i) => word(w, i, 104))}</div>
        <div style={{ ...caps(30, "rgba(255,255,255,.92)"), marginTop: 18 }}>{eyebrow.map((w, i) => word(w, i, 30))}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Oct14Reel: React.FC<Oct14Props> = (P) => {
  useElza();
  BARE = !!P.bare;
  const { pieces, cues: c, speed, tracks } = P;
  const cue = (k: string) => { if (!(k in c)) throw new Error(`cue ${k} missing`); return c[k]; };
  const end = P.durationInFrames;
  // a tracked point of the patient on the picture `role`, mapped from composition frame to that clip's frame
  const tp = (role: string, key: string) => (f: number): Pt => {
    const t = tracks[role]?.pts[key];
    const ps = pieces.filter((x) => x.pictureRole === role);
    if (!t || !t.length || !ps.length) return { x: W / 2, y: H / 2 };
    const pc = ps.find((x) => f >= x.at && f < x.at + x.dur) ?? ps.reduce((a, x) => (Math.abs(x.at - f) < Math.abs(a.at - f) ? x : a));
    const cf = Math.round(pc.pictureFrom * 24 + Math.max(0, Math.min(pc.dur - 1, f - pc.at)) * speed);
    const q = t[Math.max(0, Math.min(t.length - 1, cf))];
    return { x: q[0], y: q[1] };
  };
  const ba = P.ba;
  const baS = ba ? cue(ba.cue) : Infinity;
  const regions: Region[] = ba ? ba.regions.map((r) => { const q = ba.pts[r.key]; return { id: r.id, label: r.label, s: cue(r.cue), zoom: r.zoom, c: { x: q[0] / ba.iw, y: q[1] / ba.ih }, r: { x: r.rx / ba.iw, y: r.ry / ba.ih } }; }) : [];
  const piece = (id: string) => pieces.find((x) => x.id === id)!;
  const S = (id: string) => piece(id).at, E = (id: string) => piece(id).at + piece(id).dur;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <Picture role={x.pictureRole} from={x.pictureFrom} speed={speed} />
          <Audio src={staticFile(SRC(x.role))} trimBefore={Math.round(x.from * 24)} playbackRate={speed} />
        </Sequence>
      ))}
      {/* from the before/after cue on, a blurred copy of the same shots lies over the sharp ones, as the soft ground behind the cards */}
      {ba && (() => {
        const pc = pieces.find((x) => baS >= x.at && baS < x.at + x.dur)!;
        const rest = pieces.filter((x) => x.at > pc.at);
        return (
          <>
            <Sequence from={baS} durationInFrames={pc.at + pc.dur - baS} layout="none"><Picture role={pc.pictureRole} from={pc.pictureFrom + ((baS - pc.at) / 24) * speed} speed={speed} blur /></Sequence>
            {rest.map((x) => <Sequence key={"b" + x.id} from={x.at} durationInFrames={x.dur} layout="none"><Picture role={x.pictureRole} from={x.pictureFrom} speed={speed} blur /></Sequence>)}
          </>
        );
      })()}
      <Sequence from={end} durationInFrames={P.tail} layout="none">
        <Picture role={pieces[pieces.length - 1].pictureRole} from={pieces[pieces.length - 1].to} speed={speed} blur />
      </Sequence>

      {/* ---------- opening ---------- */}
      <Title words={[{ text: "A typical", f: cue("typical") }, { text: "patient", f: cue("patient2") }]}
        eyebrow={[{ text: "Forehead lines ·", f: cue("forehead") }, { text: "frown lines", f: cue("frown") }]} out={E("intro-typical") - 2} />
      <Sequence from={6} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>

      {/* ---------- S1 upper face ---------- */}
      <SectionPill num="01" title="Upper face" s={S("intro-dynamic")} out={S("intro-dynamic") + 44} />
      {P.pips.map((q) => {
        const tgt = q.morphTo ? piece(q.morphTo) : null;
        const s = cue(q.cue), out = cue(q.out);
        const clipFrom = tgt ? tgt.pictureFrom - ((out - (s + 1)) / 24) * speed : q.clipFrom ?? 0;
        // the numbered marker stays on her face until that shot ends (it never rides into another shot)
        const host = pieces.find((x) => out >= x.at && out < x.at + x.dur);
        const park = host ? host.at + host.dur - D.exit : out;
        return <InjectionPip key={q.n} n={q.n} s={s} out={out} park={Math.max(out, park)} anchor={tp(q.anchorRole, q.key)} clip={SRC(q.clip)} clipFrom={clipFrom} rate={tgt ? speed : 1}
          label={q.label} eyebrow={q.eyebrow} morph={!!tgt} arrow={q.arrow} focus={q.focus} box={q.box} />;
      })}
      <LiftTicks s={cue("lifted")} droopS={cue("drooping")} out={E("neuro-more-less") - 2} brows={[tp("neuro", "browL"), tp("neuro", "browR")]} />
      <MonthsRule s={S("intro-lasts")} out={E("intro-lasts") + 6} title="Neuromodulator lasts" max={6} y={1180} fill={[4, 5]}
        marks={[{ m: 4, s: cue("four"), label: "" }, { m: 5, s: cue("five"), label: "4–5 months" }]} />
      <Ledger s={S("intro-onset-vs-filler")} out={E("intro-onset-vs-filler") - 2} y={1140} title="When you see it"
        rows={[{ k: "Neuromodulator", v: "a day or two", s: cue("day") }, { k: "Filler", v: "right away", s: cue("away") }]} />

      {/* ---------- S2 cheeks and jawline ---------- */}
      <SectionPill num="02" title="Cheeks and jawline" s={S("intro-midface")} out={S("intro-midface") + 44} />
      {/* the route runs from her cheekbone past the cheek to just below the jaw line (60 % of the cheekbone-to-jaw step past the jaw), so the
          headed arrow is long enough to read on a small two-shot face */}
      <DownTrace s={cue("moving")} defS={cue("deflation")} out={E("intro-deflation") - 2} from={tp("intro", "malarR")} via={tp("intro", "cheekR")}
        to={(f) => { const a = tp("intro", "malarR")(f), j = tp("intro", "jawR")(f); return { x: j.x + (j.x - a.x) * 0.6, y: j.y + (j.y - a.y) * 0.6 }; }} labelX={M} labelY={1170} />

      {/* ---------- S3 laugh lines ---------- */}
      <SectionPill num="03" title="Laugh lines" s={S("inj5-less-needed")} out={S("inj5-less-needed") + 44} />
      <LaughRings s={cue("laugh3")} betterS={cue("better3")} out={E("inj5-less-needed") - 2} pts={[tp("inj5", "nasoL"), tp("inj5", "nasoR")]} r={70} y={1260} />
      <TechLine s={S("inj6-bruising")} hiS={cue("bruising")} out={E("inj6-bruising") - 2} eyebrow="Technique" text="A cannula," hi="to minimise bruising" y={1170} />

      {/* ---------- S4 the result ---------- */}
      <SectionPill num="04" title="The result" s={S("after-summary")} out={S("after-summary") + 44} />
      {ba && <BeforeAfter s={baS} out={ba.out in c ? cue(ba.out) : end} pullS={ba.pull ? cue(ba.pull) : undefined} before="oct14/before.jpg" after="oct14/after_aligned.jpg" iw={ba.iw} ih={ba.ih}
        crop={ba.crop} regions={regions} subs={ba.subs} note="Immediately after the filler. Individual results vary." />}
      <FactCard s={S("after-15min")} out={end} y={1340} rows={[{ k: "Treatment", v: "about 15 min", s: cue("fifteen") }, { k: "Filler lasts", v: "1–1½ years", s: cue("year") }]} />
      <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>

      <WordCaptions words={P.words} hide={(P.hideCaps ?? []).map(([a, b]) => [cue(a), cue(b)])} />
      <ConsentFlag />
      {(P.sfx ?? []).map((s, i) => <Sfx key={i} at={(cue(s.cue) + 1) / 24} name={s.name} />)}
    </AbsoluteFill>
  );
};
