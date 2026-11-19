// Jan08ReelV2: the filler-fatigue reel, round 2 (Naim 2026-11-19). Same pacing and beats as Jan08Reel (Reel.tsx, delivered: not edited),
// with his notes applied:
//   1. no colour cast: talk.mp4 and the clinic clips re-made from the HLG sources with a bt.2390 tone map to bt709 (the v1 transcode kept
//      HLG-tagged 8-bit, which rendered green and flat); no navy darkening behind the section titles
//   2. titles sit in the room BEHIND him (Ro-style depth): the title is drawn on the footage and his RVM key (same piece, full frame,
//      aligned) is laid back over it, so his head passes in front of the type instead of the type covering his eyes
//   3. the traced SVG drawings are replaced by Flora renders (FloraPlate: Nano Banana Pro stills animated with Kling v4), same beats
//   4. real overfilled-face photos (open-access journal figures, credited) where he names the bad result
//   5. sound effects far quieter and fewer (chapter + card only)
//   6. the close runs to the end of his thought: "...fillers are here to stay. Regular hyaluronic acid fillers work so beautifully."
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { FloraPlate } from "../flora/FloraPlate";
import { BAWindow, Captions, Causes, Clip, ClipCard, FaceMap, Keyed, Room, type BA } from "./cards";
import { caps, disp, H, INK, M, MUTED, p, W, WHITE } from "./look";
import type { Jan08Props } from "./Reel";

export type WebImg = { file: string; subject: number; what_it_shows: string; authors_short: string; journal_year: string; license: string; pos?: string };
export type FramesMeta = Record<string, { n: number; aspect: number }>;
export type Jan08V2Props = Jan08Props & { frames: FramesMeta; web?: WebImg[] };

/** his key over the full frame, aligned with the footage (no feather: it sits exactly on himself) */
const KeyFull: React.FC<{ id: string; s: number; e: number; at: number }> = ({ id, s, e, at }) => (
  <Sequence from={s} durationInFrames={e - s} layout="none">
    <OffthreadVideo src={staticFile(`jan08/key_${id}.webm`)} transparent trimBefore={s - at} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
  </Sequence>
);

const SEC = { T: 12, HOLD: 60, OUT: 8 };
export const SECTION_LEN2 = SEC.T + SEC.HOLD + SEC.OUT;

/** a section title on the wall behind him: number + rule, the title typed on, held 60 f fully lit, letters out 8 f; a slow drift
 *  (the room's depth) and no darkening. His key goes over it (KeyFull), so it reads as type in the room. */
const RoomTitle: React.FC<{ s: number; num: string; title: string; top?: number; px?: number }> = ({ s, num, title, top = 352, px = 118 }) => {
  const f = useCurrentFrame();
  const { T, HOLD, OUT } = SEC;
  if (f < s || f > s + T + HOLD + OUT) return null;
  const inK = p(f, s, 8, "arrive"), outK = p(f, s + T + HOLD, OUT, "exit");
  const typed = Math.round(title.length * Math.min(1, Math.max(0, (f - s - 2) / (T - 2))));
  const drift = (f - s) * 0.25;
  return (
    <div style={{ position: "absolute", left: M - 10 + drift, top, width: W - 2 * M + 40, opacity: 1 - outK, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: inK }}>
        <span style={{ ...disp(48, INK, 500) }}>{num}</span>
        <span style={{ display: "block", height: 3, width: 150 * inK, background: INK, borderRadius: 2 }} />
      </div>
      <div style={{ ...disp(px, INK), marginTop: 10, textShadow: "0 1px 0 rgba(255,255,255,.35)" }}>{title.slice(0, typed)}<span style={{ opacity: 0 }}>{title.slice(typed)}</span></div>
    </div>
  );
};

/** the hook: "Filler fatigue" on the wall behind him; an ink pen strike through "fatigue" on the word */
const HookRoom: React.FC<{ s: number; strike: number; out: number }> = ({ s, strike, out }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  const i = p(f, s, 8, "arrive"), o = p(f, out, 8, "exit"), k = p(f, strike + 1, 9, "sweep");
  return (
    <div style={{ position: "absolute", left: M - 10, top: 318, opacity: i * (1 - o), transform: `translateY(${(1 - i) * 14}px)` }}>
      <div style={{ ...caps(28, MUTED), marginBottom: 12 }}>Dr. Ariel Ostad on</div>
      <div style={{ position: "relative", ...disp(132, INK), whiteSpace: "nowrap" }}>
        Filler <span style={{ position: "relative" }}>fatigue
          {k > 0 && <svg width={460} height={60} style={{ position: "absolute", left: -6, top: 48, overflow: "visible" }}>
            <path d="M0,34 C120,22 280,30 450,18" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} />
          </svg>}
        </span>
      </div>
    </div>
  );
};

/** a real photo in the STANDARD window, with its journal credit */
const WebCard: React.FC<{ img: WebImg; s: number; out: number; left: number; top: number; title: string; eyebrow: string; w?: number }> = ({ img, s, out, left, top, title, eyebrow, w = 440 }) => (
  <ClipCard s={s} out={out} left={left} top={top} w={w}
    c={{ src: `jan08/clinic/web/${img.file}`, img: true, caps: eyebrow, title, credit: `${img.authors_short}, ${img.journal_year}, ${img.license}`, pos: img.pos }} />
);

export const Jan08ReelV2: React.FC<Jan08V2Props> = (P) => {
  useElza();
  const c = (k: string) => { if (!(k in P.cues)) throw new Error(`cue ${k} missing`); return P.cues[k]; };
  const pc = (id: string) => P.pieces.find((x) => x.id === id)!;
  const end = P.durationInFrames;
  const ba = P.ba!.front as BA;
  const FR = (id: string) => ({ id, n: P.frames[id].n, aspect: P.frames[id].aspect });
  const K = (id: string, s: number, e: number) => <Keyed src={`jan08/key_${id}.webm`} s={s} dur={e - s} from={(s - pc(id).at) / 24} scale={0.8} x={-250} />;
  // the real cases (credits.json, CC BY 4.0): the cleanest panels, cropped by the sourcing agent; framed on the cheeks / the lip
  const pick = (f: string, pos: string) => { const x = (P.web ?? []).find((q) => q.file === f); return x ? { ...x, pos } : undefined; };
  const web1 = [pick("s1_castelanich2025_fig1_patient1_pre_crop.jpg", "50% 68%"), pick("s1_castelanich2025_fig1_patient2_pre_crop.jpg", "50% 62%")].filter(Boolean) as WebImg[];
  const web2 = [pick("s2_jmir2024_fig2_panelA_crop.jpg", "60% 50%")].filter(Boolean) as WebImg[];

  const S1 = 78, S2 = c("start:aging"), S3 = c("start:method"), S4 = c("great") + 9;
  const L = SECTION_LEN2;
  const T = {
    belief: [S1 + L, c("start:cause")], aging: [S2 + L, c("aging2")], bank: [c("aging2"), c("end:sags")],
    broll1: [S3 + L, S3 + L + 57], broll2: [S3 + L + 57, c("micro")], clip: [c("micro"), c("start:cheekbones") + 10],
    cheek: [c("start:cheekbones") + 10, c("falls")], broll3: [c("falls"), S4], lip: [S4 + L, c("start:approach")],
    map: [c("start:approach"), c("golf") - 12], pillow: [c("golf") - 12, c("awkward") + 11], ba: [c("awkward") + 11, end],
  } as const;
  // a section title behind him: the title, then his key over it for the card's life
  const Sec = (s: number, num: string, title: string, piece: string, px?: number) => <>
    <RoomTitle s={s} num={num} title={title} px={px} />
    <KeyFull id={piece} s={s} e={s + L + 1} at={pc(piece).at} />
  </>;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {P.pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
          <OffthreadVideo src={staticFile("jan08/talk.mp4")} trimBefore={Math.round(x.from * 24)} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
        </Sequence>
      ))}
      <Audio src={staticFile("jan08/voice.wav")} />

      {/* B01 hook (behind him) + B02 section 01 (behind him) */}
      <HookRoom s={2} strike={c("fatigue0")} out={pc("hook").dur - 4} />
      <KeyFull id="hook" s={0} e={pc("hook").dur} at={0} />
      {Sec(S1, "01", "The belief", "belief")}

      {/* B03 the belief: Flora skin section (gel in the fat bulges the skin, grows, beads drift) */}
      <Room s={T.belief[0]} dur={T.belief[1] - T.belief[0]} />
      <FloraPlate {...FR("J1")} s={T.belief[0]} out={T.belief[1] - 7} x={330} y={250} w={710} h={1080} eyebrow="The belief" title="Filler stretches skin?"
        map={[[T.belief[0], 0], [c("stretch"), 8], [c("stretch") + 30, 50], [c("overfilled"), 56], [c("overfilled") + 30, 96], [c("migrate0"), 100], [c("migrate0") + 36, 144]]}
        labels={[{ text: "Stretch?", x: 0.06, y: 0.1, s: c("stretch") }, { text: "Overfilled?", x: 0.4, y: 0.66, s: c("overfilled"), anchor: "middle" },
          { text: "Migrates?", x: 0.97, y: 0.86, s: c("migrate0"), anchor: "end" }]} />
      {K("belief", T.belief[0], T.belief[1])}

      {/* B04 why it is wrong: the three causes; a real overfilled face on "too much" */}
      <Causes s={c("improper") - 12} out={c("end:cause") - 4} top={1000}
        rows={[{ text: "Improper injections", s: c("improper") }, { text: "Untrained injectors", s: c("trained") }, { text: "Overfilling", s: c("toomuch") }]} />
      {web1[0] && <WebCard img={web1[0]} s={c("toomuch") + 2} out={c("end:cause") - 4} left={W - M - 440} top={300} eyebrow="Overfilling · a real case" title="Too much filler" />}

      {/* B05 section 02 + B06 aging (Flora profile: fat shrinks and drops, support thins) */}
      {Sec(S2, "02", "What aging does", "aging", 108)}
      <Room s={T.aging[0]} dur={T.aging[1] - T.aging[0]} />
      <FloraPlate {...FR("J2")} s={T.aging[0]} out={T.aging[1] - 7} x={360} y={250} w={680} h={1110} eyebrow="What aging does" title="Volume and support are lost"
        map={[[T.aging[0], 0], [c("volume"), 6], [c("volume") + 36, 60], [c("fatty"), 70], [c("fatty") + 30, 104], [c("support"), 110], [c("support") + 40, 144]]}
        labels={[{ text: "Volume", x: 0.9, y: 0.58, s: c("volume"), anchor: "end" }, { text: "Fat", x: 0.36, y: 0.5, s: c("fatty"), anchor: "end" },
          { text: "Support", x: 0.5, y: 0.24, s: c("support"), anchor: "middle" }]} />
      {K("aging", T.aging[0], T.aging[1])}

      {/* B07 a real example of volume loss (bank, CC BY 4.0) */}
      <ClipCard s={T.bank[0]} out={T.bank[1] - 8} left={M} top={1010}
        c={{ src: "jan08/clinic/bank_midcheek.jpg", img: true, caps: "Volume loss · a real example", title: "We lose volume", credit: "Hong GW et al., JPRAS Open 2026, CC BY 4.0", pos: "50% 60%" }} />

      {/* B08 section 03 (behind him) + his cannula footage + ClipCard + B11 placement (Flora: cannula along the bone, gel, lift) */}
      {Sec(S3, "03", "On the cheekbones", "method", 108)}
      <Clip src="jan08/clinic/IMG_3453.mp4" from={14} s={T.broll1[0]} dur={T.broll1[1] - T.broll1[0]} />
      <Clip src="jan08/clinic/IMG_3453.mp4" from={27} s={T.broll2[0]} dur={T.broll2[1] - T.broll2[0]} />
      <Sequence from={T.broll1[0] + 4} durationInFrames={100} layout="none"><NameCard /></Sequence>
      <ClipCard s={T.clip[0]} out={T.clip[1] - 8} left={W - M - 440} top={980}
        c={{ src: "jan08/clinic/IMG_3470.mp4", from: 13, caps: "His method", title: "Microcannula", depth: [2, "On the cheekbone"] }} />
      <Room s={T.cheek[0]} dur={T.cheek[1] - T.cheek[0]} />
      <FloraPlate {...FR("J3")} s={T.cheek[0]} out={T.cheek[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="His method" title="On the cheekbone, by microcannula"
        map={[[T.cheek[0], 0], [c("cheekbones"), 4], [c("cheekbones") + 50, 90], [c("lifting"), 96], [c("lifting") + 30, 144]]}
        zoom={{ keys: [[c("cheekbones"), 1.25], [c("diminish"), 1]], ox: 0.66, oy: 0.5 }}
        labels={[{ text: "Cheekbone", x: 0.6, y: 0.38, s: c("cheekbones") + 10, anchor: "middle" }, { text: "Microcannula", x: 0.95, y: 0.62, s: c("cheekbones") + 24, anchor: "end" },
          { text: "Lift", x: 0.52, y: 0.56, s: c("lifting"), out: c("diminish") - 2 }, { text: "Without support it falls", x: 0.5, y: 0.93, s: c("diminish"), anchor: "middle" }]} />
      <Clip src="jan08/clinic/IMG_3470.mp4" from={18} s={T.broll3[0]} dur={T.broll3[1] - T.broll3[0]} />

      {/* B12 section 04 (behind him) + B13 migration (Flora: the cheekbone gel stays, too much in a lip spreads) + a real lip case */}
      {Sec(S4, "04", "Migration", "cheekbones", 124)}
      <Room s={T.lip[0]} dur={T.lip[1] - T.lip[0]} />
      {P.frames.J4 && <FloraPlate {...FR("J4")} s={T.lip[0]} out={T.lip[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="Migration" title="Wrong filler, or too much in a lip"
        map={[[T.lip[0], 0], [c("lip"), 4], [c("lip") + 46, 84]]}
        labels={[{ text: "Stays on the bone", x: 0.64, y: 0.36, s: T.lip[0] + 10, anchor: "middle" }, { text: "Too much: spreads", x: 0.06, y: 0.8, s: c("lip") + 8 }]} />}
      {web2[0] && <WebCard img={web2[0]} s={c("lip") + 30} out={T.lip[1] - 6} left={W - M - 400} top={1080} w={400} eyebrow="Migration · a real case" title="Lip filler spread" />}

      {/* B14 his plan on a real face */}
      <FaceMap ba={ba} s={T.map[0]} out={T.map[1] - 4} box={{ x: 80, y: 250, w: 920, h: 1200 }}
        cues={{ cheek: c("cheekbones2"), laugh: c("laugh"), marionette: c("marionette"), lids: c("lids"), mid: c("midcheek") }} />

      {/* B15 not a golf ball: Flora (a lump in the mid cheek), struck on "awkward"; a real overfilled cheek beside it */}
      <Room s={T.pillow[0]} dur={T.pillow[1] - T.pillow[0]} />
      <FloraPlate {...FR("J5")} s={T.pillow[0]} out={T.pillow[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="Not this" title="Golf-size filling, mid cheek"
        map={[[T.pillow[0], 0], [c("golf"), 6], [c("golf") + 40, 120]]} strike={{ x: 0.64, y: 0.69, r: 0.13, s: c("awkward") }}
        labels={[{ text: "Looks awkward", x: 0.3, y: 0.9, s: c("awkward"), anchor: "middle" }]} />
      {web1[1] && <WebCard img={web1[1]} s={c("awkward") - 30} out={T.pillow[1] - 6} left={W - M - 360} top={1020} w={360} eyebrow="A real case" title="Overfilled cheeks" />}

      {/* B16 the result + the close */}
      <BAWindow ba={ba} s={T.ba[0]} out={c("start:close") - 2} sweep={c("address") + 6} box={{ x: 130, y: 820, w: 820, h: 640 }} />

      <Room s={end} dur={P.tail} />
      <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>
      <Captions words={P.words} end={end} ink={[T.cheek, T.lip, T.pillow].map(([a, b]) => [a, b] as [number, number])} />

      {/* sound: chapter + card only, far below the voice (v1 had 30 hits at 0.16-0.32; Naim: "too loud and distracting") */}
      {[S1, S2, S3, S4].map((f) => <Sfx key={"c" + f} at={(f + 1) / 24} name="exo_chapter" gain={0.3} />)}
      {[T.belief[0], T.aging[0], T.cheek[0], T.lip[0], T.pillow[0], T.ba[0]].map((f, i) => <Sfx key={"k" + i} at={(f + 1) / 24} name="exo_card" gain={0.22} />)}
    </AbsoluteFill>
  );
};

export { Img, WHITE };
