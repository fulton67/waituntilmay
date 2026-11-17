// Oct14Reel: Dr. Ostad, the Oct 14 (2026) injection session. 9:16, 24 fps. Consent = yes (written, before the procedure; DECISIONS 16d).
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
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { InjectionPip, WordCaptions, type Word } from "./devices";
import { DownTrace, FactCard, MonthsRule } from "./beats";
import { CannulaSection, ChapterCard, DayLanes, FormVsSmooth, HookBA, OctEnd, SEC_LEN, TitleCard } from "./cards";
import { Label, PenStroke, SurgeonBA, type SurgeonProps } from "./v3";
import { AnatomyCard, type AnatomyData } from "./anatomy";
import { CompareClips, InjectionCard } from "./std";
import { D, H, M, W, type Pt } from "./look";

export type Piece = { id: string; line: string; section: string; role: string; from: number; to: number; at: number; dur: number; pictureRole: string; pictureFrom: number;
  punch?: number; punchO?: [number, number]; audioJoin?: boolean };
export type Track = { n: number; pts: Record<string, [number, number][]> };
export type PipPlan = { n: number; cue: string; out: string; anchorRole: string; key: string; clip: string; clipFrom?: number; morphTo?: string; label: string; eyebrow: string; depth?: [number, string];
  arrow?: "curved-callout" | "straight-pointer"; focus?: { fx: number; fy: number; z: number }; box?: { x: number; y: number; w: number; h: number } };
export type BAPlan = { cue: string; out: string; pull?: string; crop: { x: number; y: number; w: number }; iw: number; ih: number; subs: [string, string];
  regions: { id: string; label: string; cue: string; key: string; rx: number; ry: number; zoom?: number }[]; pts: Record<string, [number, number]> };
export type Oct14Props = {
  bare?: boolean; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: (Word & { piece: string })[]; cues: Record<string, number>;
  tracks: Record<string, Track>; pips: PipPlan[]; ba?: BAPlan; hideCaps?: [string, string][]; sfx?: { cue: string; name: string }[]; tail: number;
  anatomy?: AnatomyData;
  surgeon?: Omit<SurgeonProps, "s" | "wipeS" | "gainS" | "noteS" | "out" | "before" | "after" | "iw" | "ih" | "notes"> & { cue: string; wipe: string; out: string; notes: { text: string; cue: string }[] };
};

const SRC = (role: string) => `oct14/${role}.mp4`;
let BARE = false;

// v2: a micro-cut inside a shot is covered by a punch-in (scale about PUNCH_O), so the jump reads as intentional (coordinator rule 2)
export const PUNCH_O = { x: 0.4, y: 0.42 };
// v3: a glossary punch-in centres on her landmark (punchO); every other punch-in on PUNCH_O
const Picture: React.FC<{ role: string; from: number; speed: number; blur?: boolean; punch?: number; o?: [number, number] }> = ({ role, from, speed, blur, punch = 1, o }) => (BARE ? null : (
  <OffthreadVideo src={staticFile(SRC(role))} trimBefore={Math.round(from * 24)} playbackRate={speed} muted
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", filter: blur ? "blur(26px) brightness(.6) saturate(.85)" : undefined,
      transformOrigin: `${(o ? o[0] : PUNCH_O.x) * 100}% ${(o ? o[1] : PUNCH_O.y) * 100}%`, transform: `scale(${(blur ? 1.08 : 1) * punch})` }} />
));

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
    const s = pc.punch ?? 1, ox = (pc.punchO ? pc.punchO[0] : PUNCH_O.x) * W, oy = (pc.punchO ? pc.punchO[1] : PUNCH_O.y) * H; // the point moves with the punch-in
    return { x: ox + (q[0] - ox) * s, y: oy + (q[1] - oy) * s };
  };
  const sg = P.surgeon;
  const baS = sg ? cue(sg.cue) : Infinity;
  // S / E: a LINE's first frame and its end (a line can be several pieces after the micro-cuts)
  const S = (line: string) => cue("start:" + line), E = (line: string) => cue("end:" + line);
  const piece = (id: string) => pieces.find((x) => x.id === id) ?? pieces.find((x) => x.line === id)!;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <Picture role={x.pictureRole} from={x.pictureFrom} speed={speed} punch={x.punch} o={x.punchO} />
        </Sequence>
      ))}
      {/* v2: his voice is one track (public/oct14/mix.wav, oct14_prep.py audio): every cut sits in >= 80 ms of silence with a 15 ms fade */}
      <Audio src={staticFile("oct14/mix.wav")} />
      {/* the tail: the last shot keeps running, sharp (no blur anywhere: CRITIQUE_v2 rows 1:16-1:30) */}
      <Sequence from={end} durationInFrames={P.tail} layout="none">
        <Picture role={pieces[pieces.length - 1].pictureRole} from={pieces[pieces.length - 1].to} speed={speed} />
      </Sequence>

      {/* ---------- opening: the needle at her cheek (hook), his line, then her own forehead and frown lines (glossary) ---------- */}
      {/* open on the result, full frame (REELS_HOW_I_WOULD_BUILD 0-1.5 s): 4:42 -> 4:55 PM wipe, the measured cheek line drawing on */}
      {sg && <HookBA before="oct14/before.jpg" after="oct14/after_aligned.jpg" crop={sg.crop} out={44} contour={(sg as { contour?: { before: [number, number][]; after: [number, number][] } }).contour} />}
      {/* title card (CRITIQUE row 0:00): the reel's argument in his words, typed under a travelling light, held 60 f, over the hook */}
      <TitleCard start={46} title="Treat the source, not the line" sub="Dr. Ariel Ostad · injectables" />
      <Sequence from={50} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>

      {/* ---------- S1 upper face: dynamic lines; the usual treatment, and he uses it ---------- */}
      {/* section card 01 (one look for all three: 80 f, title 118 px, held 60 f) over her forehead and frown punch-ins */}
      <ChapterCard num="01" title="Upper face" start={46 + SEC_LEN + 1} />
      {/* glossary: crow's feet on her own smile, punched in at her eye; three pen strokes along the fan */}
      {[[14, -18, 52, -40], [16, 0, 58, 2], [14, 18, 52, 42]].map(([a, b, c2, d], i) => (
        <PenStroke key={i} pts={[(f: number) => { const q = tp("intro", "crowR")(f); return { x: q.x + a, y: q.y + b }; }, (f: number) => { const q = tp("intro", "crowR")(f); return { x: q.x + c2, y: q.y + d }; }]}
          s={cue("crows") + i * 3} out={cue("these") - 1} d={8} />
      ))}
      {/* STANDARD ClipCard pop-ups (rosacea reel look; DECISIONS 16d): the clip of each injection on glass along the bottom, on the side
          away from the treated point, a white headed arrow to that point. Depth lines: ostad_check pending */}
      {P.pips.map((q) => {
        const tgt = q.morphTo ? piece(q.morphTo) : null;
        const s = cue(q.cue), out = cue(q.out);
        // a card that hands over to its clip full frame plays in sync with that shot, so the cut lands on the same moment
        const clipFrom = tgt ? tgt.pictureFrom - ((out - (s + 1)) / 24) * speed : q.clipFrom ?? 0;
        const host = pieces.find((x) => s >= x.at && s < x.at + x.dur);
        const arrowOut = host ? Math.min(out, host.at + host.dur - 2) : out; // the arrow never rides into another shot
        return <InjectionCard key={q.n} s={s} out={out} arrowOut={arrowOut} anchor={tp(q.anchorRole, q.key)} variant={q.arrow === "straight-pointer" ? "straight-pointer" : "curved-callout"}
          c={{ src: SRC(q.clip), from: clipFrom, rate: tgt ? speed : 1, caps: q.eyebrow ?? "", title: q.label ?? "", depth: (q.depth ?? [2, ""]) as [number, string] }} />;
      })}
      {/* anatomy (LESSONS P5): the muscles behind his three "dynamic lines", traced from face.glb; ostad_check pending */}
      {P.anatomy && <AnatomyCard data={P.anatomy} view="upper" s={cue("dynamic") + 4} out={E("neuro-more-less") - 2} x={W - M - 440} y={1000} w={440} h={480}
        eyebrow="Dynamic lines: muscles at work" title="Frown muscles"
        pulse={{ ids: ["corrugator_supercilii_l", "corrugator_supercilii_r", "procerus_muscle", "orbital_part_of_orbicularis_oculi_l", "orbital_part_of_orbicularis_oculi_r", "frontalis_muscle_l", "frontalis_muscle_r"], s: cue("dynamic") + 30, e: cue("neuromod") }}
        forces={[{ id: "frontalis_muscle_l", dir: "up", s: cue("lifted"), len: 300 }, { id: "frontalis_muscle_r", dir: "up", s: cue("lifted") + 3, len: 300 },
          { id: "orbital_part_of_orbicularis_oculi_l", dir: "down", s: cue("drooping"), len: 280, dx: 120 }, { id: "orbital_part_of_orbicularis_oculi_r", dir: "down", s: cue("drooping") + 3, len: 280, dx: -120 }]}
        focus={["frontalis_muscle_l", "frontalis_muscle_r", "corrugator_supercilii_l", "corrugator_supercilii_r", "procerus_muscle", "orbital_part_of_orbicularis_oculi_l", "orbital_part_of_orbicularis_oculi_r"]}
        context={[]} callouts={[{ id: "frontalis_muscle_l", text: "Frontalis", s: cue("neuromod") + 14 }, { id: "procerus_muscle", text: "Procerus", s: cue("neuromod") + 22, dy: 64 }, { id: "corrugator_supercilii_l", text: "Corrugator", s: cue("neuromod") + 26, dy: -34 },
          { id: "orbital_part_of_orbicularis_oculi_r", text: "Orbicularis oculi", s: cue("neuromod") + 30, dy: 46 },
          { id: "frontalis_muscle_r", text: "Lifts the brow", s: cue("lifted") + 6, dy: -110 }, { id: "orbital_part_of_orbicularis_oculi_l", text: "Pull it down", s: cue("drooping") + 6, dy: 130 }]} />}
      <MonthsRule s={S("intro-lasts")} out={S("intro-lasts") + 62} title="Neuromodulator lasts" max={6} y={1180} fill={[4, 5]}
        marks={[{ m: 4, s: cue("four"), label: "" }, { m: 5, s: cue("five"), label: "4–5 months" }]} />
      {/* a real day axis instead of a text table (CRITIQUE row 0:24) */}
      <DayLanes s={S("intro-lasts") + 68} neuroS={cue("day")} fillerS={cue("away")} out={E("intro-onset-vs-filler") - 2} y={1120} />

      {/* ---------- S2 cheeks and jawline: usually the lines are filled; here, the cheekbones first ---------- */}
      <ChapterCard num="02" title="Mid face" start={S("intro-midface")} />
      {/* glossary: jowling on her own jaw, punched in; a pen contour along the jowl */}
      <PenStroke pts={[tp("intro", "marioR"), tp("intro", "jawR"), (f: number) => { const a = tp("intro", "jawR")(f), c2 = tp("intro", "chin")(f); return { x: (a.x + c2.x) / 2, y: Math.max(a.y, c2.y) + 14 }; }]}
        s={cue("jowling")} out={E("intro-midface") - 1} d={12} />
{/* STANDARD compare: two ClipCards; the usual approach (fill the lines first) struck on his "but"; his approach (cheekbones first) */}
      <CompareClips s={cue("filled")} rightS={cue("cheeks")} strikeS={Math.max(cue("but"), cue("filled") + 40)} out={E("intro-cheekbones") - 2} top={1010} chip="Not first, here"
        left={{ src: SRC("inj7"), from: 70, caps: "Patients usually ask", title: "Fill the lines first", depth: [1, "Into the lines"] }}
        right={{ src: SRC("inj3"), from: 20, caps: "Here", title: "Cheekbones first", depth: [2, "Deep, over the bone"] }} />
      {/* the route runs from her cheekbone past the cheek to just below the jaw line; the label sits on the wall above her (his face is left) */}
      <DownTrace s={cue("moving")} defS={cue("deflation")} out={E("intro-deflation") - 2} from={tp("intro", "malarR")} via={tp("intro", "cheekR")}
        to={(f) => { const a = tp("intro", "malarR")(f), j = tp("intro", "jawR")(f); return { x: j.x + (j.x - a.x) * 0.6, y: j.y + (j.y - a.y) * 0.6 }; }} labelX={560} labelY={300} label={!P.anatomy} />
      {/* anatomy (LESSONS P5): her cheek's fat compartments over the cheekbone, traced from face.glb; on "moving down" the fat slides
          down from a dashed ghost (Illustration), on "cheekbones" the bone strengthens: where he puts the filler. ostad_check pending */}
      {/* the topic-only animation (CRITIQUE row 0:40): her profile traced from face.glb; "deflation": the cheek fat shrinks; "moving
          down": it slides down from a dashed ghost; "cheeks": filler restores volume on the cheekbone and the fat comes back up. */}
      {P.anatomy && <AnatomyCard data={P.anatomy} view="profile" s={cue("deflation")} out={E("intro-cheekbones") - 2} x={W - M - 520} y={250} w={520} h={560}
        eyebrow="The source" title="Deflation" focus={["fat_cheek_r", "fat_sup_jowl_r"]} context={["skin_epidermis", "zygomatic_bone_r", "maxilla_r", "mandible"]}
        shrink={{ ids: ["fat_cheek_r"], s: cue("deflation"), k: 0.8 }} drop={{ ids: ["fat_cheek_r", "fat_sup_jowl_r"], s: cue("moving"), px: 46 }}
        filler={{ on: "zygomatic_bone_r", s: cue("cheeks"), dx: 30, dy: 40, rx: 70, ry: 40, back: 0.6, label: "Filler" }} strong={{ ids: ["zygomatic_bone_r"], s: cue("cheeks") }}
        callouts={[{ id: "fat_cheek_r", text: "Cheek fat", s: cue("deflation") + 16, dx: 110, anchor: "start" }, { id: "fat_sup_jowl_r", text: "Jowl", s: cue("deflation") + 24, dx: 80, dy: 40, anchor: "start" },
          { id: "zygomatic_bone_r", text: "Cheekbone", s: cue("cheekbones"), dy: -70 }]} />}

      {/* laugh lines (CRITIQUE row 0:52): no ovals; a pen line along each fold, tracked on her close-up */}
      {[["nasoL", "lipCL"], ["nasoR", "lipCR"]].map(([a, b], i) => (
        <PenStroke key={i} pts={[tp("inj5", a), (f: number) => { const q = tp("inj5", a)(f), r0 = tp("inj5", b)(f); return { x: (q.x + r0.x) / 2 + (i ? 6 : -6), y: (q.y + r0.y) / 2 }; }, tp("inj5", b)]}
          s={cue("laugh3") + i * 4} out={E("inj5-less-needed") - 2} d={12} />
      ))}
      {/* thick vs thin (REELS_HOW_I_WOULD_BUILD 55.5-64.9 s, topic-only): "it's not as thick as what I put here" */}
      <FormVsSmooth s={cue("used") + 20} spreadS={cue("used") + 60} out={S("inj6-bruising") - 2} x={M} y={290} w={W - 2 * M} />
      {/* needle vs cannula (CRITIQUE row 1:02): the skin section traced from skin_crosssection.glb; the hold runs into the next beat */}
      {P.anatomy && <CannulaSection data={P.anatomy} s={S("inj6-bruising")} hiS={cue("cannula")} out={E("inj6-bruising") + 40} x={M} y={290} w={W - 2 * M} h={560} />}

      {/* ---------- S4 the result: marionette lines on her close-up, then the surgeon's before/after ---------- */}
      <ChapterCard num="03" title="The result" start={E("inj6-bruising") + 42} />
      {[["lipCL", "marioL"], ["lipCR", "marioR"]].map(([a, b], i) => (
        <PenStroke key={i} pts={[tp("after", a), tp("after", b), (f: number) => { const q = tp("after", b)(f), r0 = tp("after", a)(f); return { x: q.x + (q.x - r0.x) * 0.5, y: q.y + (q.y - r0.y) * 0.5 }; }]}
          s={cue("marionette") + i * 4} out={baS - 1} d={10} />
      ))}
      {sg && <SurgeonBA {...sg} s={baS} wipeS={cue(sg.wipe)} gainS={cue(sg.wipe) + D.bar + 2} noteS={cue("softer")} out={end + 45} before="oct14/before.jpg" after="oct14/after_aligned.jpg"
        iw={1080} ih={1920} notes={sg.notes.map((n) => ({ text: n.text, s: cue(n.cue) }))} />}
      <FactCard s={S("after-15min")} out={end + 45} y={1400} rows={[{ k: "Treatment", v: "about 15 min", s: cue("fifteen") }, { k: "Filler lasts", v: "1–1½ years", s: cue("year") }]} />
      <OctEnd start={end + 46} />

      <WordCaptions words={P.words} hide={(P.hideCaps ?? []).map(([a, b]) => [cue(a), cue(b)])} />
      {(P.sfx ?? []).map((s, i) => <Sfx key={i} at={(cue(s.cue) + 1) / 24} name={s.name} />)}
    </AbsoluteFill>
  );
};
