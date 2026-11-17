// Jan08Reel: Dr. Ostad on "filler fatigue" (IMG_2421.MOV, filmed 2026-01-08 13:26; catalog id 163). 1080x1920, 24 fps.
// Argument map: research/ostad/style/jan08/ARGUMENT.md. Beats and sources: research/ostad/style/jan08/BEATS.md + beats.json.
// Cut: research/ostad/style/jan08/cut.json -> public/jan08/props.json (brand/scripts/jan08_prep.py props); voice: public/jan08/voice.wav
// (jan08_prep.py voice: every join a 15 ms crossfade inside a measured silence). Final loudness: jan08_prep.py master (-14 LUFS).
import React, { useLayoutEffect } from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { CheekPlacement, LipMigration, PillowVsLift, SkinBelief, VolumeLoss, type AData } from "./anatomy";
import { BAWindow, Captions, Causes, Clip, ClipCard, FaceMap, HookTitle, Keyed, Room, SECTION_LEN, SectionCard, type BA, type Word } from "./cards";
import { H, M, W } from "./look";

export type Piece = { id: string; from: number; to: number; at: number; dur: number };
export type Jan08Props = {
  audit?: boolean; fps: number; durationInFrames: number; pieces: Piece[]; words: Word[]; cues: Record<string, number>; tail: number; anatomy?: AData; ba?: { front: BA } };

// arrow-over-text audit (the OstadYT6 TextAudit lint, at 1080 wide): logs ARROWTEXT lines for research/ostad/style/tools/arrow_text_lint.py
const ArrowTextAudit: React.FC = () => {
  const f = useCurrentFrame();
  useLayoutEffect(() => {
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
    let arrows = 0;
    document.querySelectorAll("[data-arrowline]").forEach((node) => {
      arrows++;
      const fr = (node as HTMLElement).getBoundingClientRect(); const k = fr.width / 1080;
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
    console.log(`TEXTAUDIT ${JSON.stringify({ f, arrows, boxes: boxes.length })}`);
    if (hits.length) console.log(`ARROWTEXT ${JSON.stringify({ f, hits })}`);
  });
  return null;
};

// a slow push about a point, keyed on his words (keys: [frame, scale]; 16 f in-out each): the picture changes inside 4 s while he explains
const PushAbout: React.FC<{ s: number; e: number; keys: [number, number][]; ox: number; oy: number; children: React.ReactNode }> = ({ s, e, keys, ox, oy, children }) => {
  const f = useCurrentFrame();
  if (f < s || f >= e) return null;
  const io = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  let z = 1;
  for (const [kf, kz] of keys) z = z + (kz - z) * io(Math.min(1, Math.max(0, (f - kf - 1) / 16)));
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</div>;
};

export const Jan08Reel: React.FC<Jan08Props> = (P) => {
  useElza();
  const c = (k: string) => { if (!(k in P.cues)) throw new Error(`cue ${k} missing`); return P.cues[k]; };
  const pc = (id: string) => P.pieces.find((x) => x.id === id)!;
  const end = P.durationInFrames;
  const A = P.anatomy!, ba = P.ba!.front;
  // keyed spans: the RVM webm starts at its piece's start
  const K = (id: string, s: number, e: number) => <Keyed src={`jan08/key_${id}.webm`} s={s} dur={e - s} from={(s - pc(id).at) / 24} scale={0.8} x={-250} />;

  // the picture plan (frames): see BEATS.md for each beat's subject and source
  const S1 = 78, S2 = c("start:aging"), S3 = c("start:method"), S4 = c("great") + 9;
  const T = {
    belief: [S1 + SECTION_LEN, c("start:cause")], aging: [S2 + SECTION_LEN, c("aging2")], bank: [c("aging2"), c("end:sags")],
    broll1: [S3 + SECTION_LEN, S3 + SECTION_LEN + 57], broll2: [S3 + SECTION_LEN + 57, c("micro")], clip: [c("micro"), c("start:cheekbones") + 10],
    cheek: [c("start:cheekbones") + 10, c("falls")], broll3: [c("falls"), S4], lip: [S4 + SECTION_LEN, c("start:approach")],
    map: [c("start:approach"), c("golf") - 12], pillow: [c("golf") - 12, c("awkward") + 11], ba: [c("awkward") + 11, end],
  } as const;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* his footage, piece by piece (picture only; the voice is one crossfaded track) */}
      {P.pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <OffthreadVideo src={staticFile("jan08/talk.mp4")} trimBefore={Math.round(x.from * 24)} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
        </Sequence>
      ))}
      <Audio src={staticFile("jan08/voice.wav")} />

      {/* B01 hook + B02 section 01 */}
      <HookTitle s={2} strike={c("fatigue0")} out={76} />
      <SectionCard s={S1} num="01" title="The belief" />

      {/* B03 the belief: keyed in front, the skin section behind (topic-only 1) */}
      <Room s={T.belief[0]} dur={T.belief[1] - T.belief[0]} />
      <PushAbout s={T.belief[0]} e={T.belief[1]} keys={[[c("overfilled"), 1.14], [c("migrate0"), 1]]} ox={690} oy={760}>
        <SkinBelief data={A} s={T.belief[0]} out={T.belief[1] - 7} stretch={c("stretch")} overfilled={c("overfilled")} migrate={c("migrate0")} x={330} y={260} w={710} h={1060} />
      </PushAbout>
      {K("belief", T.belief[0], T.belief[1])}

      {/* B04 why it is wrong: the three causes, on his words */}
      <Causes s={c("improper") - 12} out={c("end:cause") - 4} top={1000}
        rows={[{ text: "Improper injections", s: c("improper") }, { text: "Untrained injectors", s: c("trained") }, { text: "Overfilling", s: c("toomuch") }]} />

      {/* B05 section 02 + B06 aging (topic-only 2) */}
      <SectionCard s={S2} num="02" title="What aging does" />
      <Room s={T.aging[0]} dur={T.aging[1] - T.aging[0]} />
      <VolumeLoss data={A} s={T.aging[0]} out={T.aging[1] - 7} volume={c("volume")} fatty={c("fatty")} support={c("support")} x={360} y={260} w={680} h={1100} />
      {K("aging", T.aging[0], T.aging[1])}

      {/* B07 a real example of volume loss (bank, CC BY 4.0) in the STANDARD ClipCard over his video */}
      <ClipCard s={T.bank[0]} out={T.bank[1] - 8} left={M} top={1010}
        c={{ src: "jan08/clinic/bank_midcheek.jpg", img: true, caps: "Volume loss · a real example", title: "We lose volume", credit: "Hong GW et al., JPRAS Open 2026, CC BY 4.0", pos: "50% 60%" }} />

      {/* B08 section 03 + B09 his own cannula footage + B10 ClipCard + B11 placement (topic-only 3) */}
      <SectionCard s={S3} num="03" title="On the cheekbones" />
      <Clip src="jan08/clinic/IMG_3453.mp4" from={14} s={T.broll1[0]} dur={T.broll1[1] - T.broll1[0]} />
      <Clip src="jan08/clinic/IMG_3453.mp4" from={27} s={T.broll2[0]} dur={T.broll2[1] - T.broll2[0]} />
      <Sequence from={T.broll1[0] + 4} durationInFrames={100} layout="none"><NameCard /></Sequence>
      <ClipCard s={T.clip[0]} out={T.clip[1] - 8} left={W - M - 440} top={980}
        c={{ src: "jan08/clinic/IMG_3470.mp4", from: 13, caps: "His method", title: "Microcannula", depth: [2, "On the cheekbone"] }} />
      <Room s={T.cheek[0]} dur={T.cheek[1] - T.cheek[0]} />
      {/* a push toward the cheekbone on "lifting", back out on "diminish": the picture changes inside 4 s while he explains (pacing rule) */}
      <PushAbout s={T.cheek[0]} e={T.cheek[1]} keys={[[c("cheekbones"), 1.12], [c("lifting"), 1.24], [c("diminish"), 1]]} ox={480} oy={760}>
        <CheekPlacement data={A} s={T.cheek[0]} out={T.cheek[1] - 7} cheek={c("cheekbones")} lifting={c("lifting")} diminish={c("diminish")} x={60} y={250} w={960} h={1240} />
      </PushAbout>
      <Clip src="jan08/clinic/IMG_3470.mp4" from={18} s={T.broll3[0]} dur={T.broll3[1] - T.broll3[0]} />

      {/* B12 section 04 + B13 migration */}
      <SectionCard s={S4} num="04" title="Migration" />
      <Room s={T.lip[0]} dur={T.lip[1] - T.lip[0]} />
      <LipMigration data={A} s={T.lip[0]} out={T.lip[1] - 7} wrong={c("wrong")} lip={c("lip")} x={60} y={250} w={960} h={1240} />

      {/* B14 his plan on a real face (patient P0007's own before photo, landmarks) */}
      <PushAbout s={T.map[0]} e={T.map[1]} keys={[[c("lids"), 1.12]]} ox={540} oy={560}>
        <FaceMap ba={ba} s={T.map[0]} out={T.map[1] - 4} box={{ x: 80, y: 250, w: 920, h: 1200 }}
        cues={{ cheek: c("cheekbones2"), laugh: c("laugh"), marionette: c("marionette"), lids: c("lids"), mid: c("midcheek") }} />
      </PushAbout>

      {/* B15 not a golf ball (topic-only 3, the contrast) */}
      <Room s={T.pillow[0]} dur={T.pillow[1] - T.pillow[0]} />
      <PillowVsLift data={A} s={T.pillow[0]} out={T.pillow[1] - 7} golf={c("golf")} awkward={c("awkward")} x={60} y={250} w={960} h={1240} />

      {/* B16 the result: STANDARD before/after window over his video */}
      <BAWindow ba={ba} s={T.ba[0]} out={end - 2} sweep={c("address") + 6} box={{ x: 130, y: 820, w: 820, h: 640 }} />

      <Room s={end} dur={P.tail} />
      <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>
      {P.audit && <ArrowTextAudit />}
      <Captions words={P.words} end={end} ink={[T.cheek, T.lip, T.pillow].map(([a, b]) => [a, b] as [number, number])} />

      {/* one sound per event class (beats.json sfx_map): chapter, card, draw, swish, pop */}
      {[S1, S2, S3, S4].map((f) => <Sfx key={"c" + f} at={(f + 1) / 24} name="exo_chapter" />)}
      {[T.belief[0], T.aging[0], T.bank[0], T.clip[0], T.cheek[0], T.lip[0], T.map[0], T.pillow[0], T.ba[0], c("improper") - 12, end].map((f, i) => <Sfx key={"k" + i} at={(f + 1) / 24} name="exo_card" gain={0.5} />)}
      {[c("fatigue0"), c("stretch"), c("overfilled"), c("migrate0"), c("volume"), c("support"), c("cheekbones"), c("lifting"), c("diminish"), c("lip"),
        c("cheekbones2"), c("laugh"), c("marionette"), c("lids"), c("golf"), c("awkward")].map((f, i) => <Sfx key={"d" + i} at={(f + 1) / 24} name="exo_draw" gain={0.5} />)}
      {[c("trained"), c("toomuch")].map((f, i) => <Sfx key={"p" + i} at={(f + 1) / 24} name="pop" gain={0.5} />)}
      <Sfx at={(c("address") + 7) / 24} name="swish" />
    </AbsoluteFill>
  );
};
