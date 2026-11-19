// UndereyeReelV5 / V5b (v5b: when the cannula beat's device is "PairItem" the object beat is ObjectPairV5b, big, in the lower part of the frame): v4b after Naim's 2026-11-19 notes. UndereyeReelV4 (ReelV4.tsx) is not edited. Every start, end, string, plate map, label, crop,
// layout rect and SFX comes from the timeline brand/remotion/timelines/undereye.json (src/timeline/timeline.ts resolves its anchors against
// props_v5.json); the components stay here.
//   - colour: every OffthreadVideo has toneMapped={false} (Remotion's default HDR tone map was the "weird filter": R +11, G -15, B -20 on 6821)
//   - audio: dialogue_v5.wav = dialogue_v2.wav with the chopped word fragments at the joins replaced by room tone ("the audio is messed up
//     at this point" = the "an-" of 6818's next sentence left at the end of P15, right before "she had a syringe put in", f1524-1531)
//   - the U4 needle/cannula card at the first "cannulas" is gone; the cannula is explained in S4 with the REAL objects (src/devices/RealObject.tsx)
//   - every pop-up holds >= 48 f (brand/scripts/undereye_holds_v5.py checks the timeline); no strike-through anywhere
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { NameCard } from "../components/NameCard";
import { Sfx } from "../components/Ro";
import { RealObject } from "../devices/RealObject";
import { ObjectPairV5b, type PairObject } from "./ObjectPairV5b";
import { Lasts } from "./devices";
import { DateLabels, Mark, type SketchData } from "./devices_v2";
import { ClipCardStd } from "./standard";
import { BAWindowV4, EndCardLow, Legend, PlanMarks, PlateMedia, RoomTitle, SECTION_LEN, TallPlateCard, WidePlateCard, CardV4, type FramesMeta } from "./markup_v4";
import { FONT } from "../brand";
import { CAP_T, H, INK, M, MUTED, W, WHITE, caps, life } from "./look";
import TL0 from "../../timelines/undereye.json";
import { beat, event, labels as tlLabels, plateMap, resolve, span, type Anchor, type Beat, type Timeline, type Transcript } from "../timeline/timeline";

type Pic = { f0: number; f1: number; clip?: string; still?: string; src?: number; scale?: number; ox?: number; oy?: number; run0?: number; rate?: number };
type Piece = { id: string; clip: string; section: string; at: number; dur: number; from: number; to: number; pics: Pic[] };
type Word = { w: string; f: number; f1: number; piece: string; voice: string };
type KeySpec = { clip: string; a: number; dur?: number }; // dur = the key webm's own length (s): past it the layer unmounts (v5b guard)
// pass (brand/scripts/reel.py --hdr, REELS.md "HDR master"): one layer of the reel on a transparent ground, no footage, no sound.
//   "under" = what sits behind the people (wall titles, full-frame stills) | "matte" = the people's RVM key as a white silhouette (alpha only)
//   "over" = every other graphic | "media" = only the clips shown inside cards. Unset = the normal reel, unchanged.
// "frost" = white where a card has a backdrop blur (the frosted glass), so the build blurs the footage there and nowhere else
export type Pass = "under" | "matte" | "over" | "media" | "frost";
const FROST_CSS = `body *{visibility:hidden !important} body [style*="backdrop-filter"]{visibility:visible !important;background:#fff !important;box-shadow:none !important;border-color:#fff !important}`;
export type V5Props = { bare?: boolean; pass?: Pass; fps: number; speed: number; durationInFrames: number; pieces: Piece[]; words: Word[]; cues: Record<string, number>;
  tailRate?: number; sketch?: SketchData; stat?: { before: number; after: number }; hook: number; keys: Record<string, KeySpec>; frames: FramesMeta; timeline?: Timeline };

export const TAIL5 = 72;
const STILL: Record<string, string> = { after: "ba_after.jpg", before_ref: "ba_before_ref.jpg", plan: "ba_wipe_before.jpg" };
let BARE = false;
let PASS: Pass | undefined;
/** visible in the normal reel, and in a pass only when it is this layer's pass */
const vis = (kind: Pass): "visible" | "hidden" => (!PASS || PASS === kind ? "visible" : "hidden");
let PLAN: { data?: SketchData; ev: Parameters<typeof PlanMarks>[0]["ev"] } = { ev: { rim: 0, trough: 0, entry: 0, paths: 0, fan: 0, deposit: 0 } };

const transformOf = (q: Pic, f: number) => {
  const sc = q.scale ?? 1, ox = q.ox ?? 540, oy = q.oy ?? 960;
  const push = q.still ? 1 + 0.035 * Math.min(1, (f + q.f0 - (q.run0 ?? q.f0)) / 120) : 1;
  return { transformOrigin: `${ox}px ${oy}px`, transform: `scale(${sc * push})`, k: sc * push };
};

const PicLayer: React.FC<{ q: Pic; speed: number }> = ({ q, speed }) => {
  const f = useCurrentFrame();
  const { transformOrigin, transform, k } = transformOf(q, f);
  let body: React.ReactNode = null;
  if (PASS && !q.still) return null; // the footage itself comes from the original files, never from this render
  if (q.still === "plan") body = <>{!BARE && <Img src={staticFile(`undereye-filler/${STILL.plan}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />}
    {!BARE && PLAN.data && <PlanMarks data={PLAN.data} f={f + q.f0} ev={PLAN.ev} sw={k} />}</>;
  else if (BARE) body = null;
  else if (q.still) body = <Img src={staticFile(`undereye-filler/${STILL[q.still]}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
  else body = <OffthreadVideo src={staticFile(`undereye-filler/${q.clip}.mp4`)} trimBefore={Math.round(q.src! * 24)} playbackRate={q.rate ?? speed} muted toneMapped={false}
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />;
  return <AbsoluteFill style={{ transformOrigin, transform, background: BARE || PASS ? undefined : "#000", visibility: vis("under") }}>{body}</AbsoluteFill>;
};

const KeyLayer: React.FC<{ q: Pic; key4: KeySpec; name: string; speed: number; s: number; e: number }> = ({ q, key4, name, speed, s, e }) => {
  const f = useCurrentFrame();
  const abs = f + q.f0;
  if (abs < s || abs > e) return null;
  // v5b guard: never show a key past its own last frame (OffthreadVideo would hold that frame: the frozen figure under "04", v5 f1579-1611)
  const srcT = (q.src ?? 0) + (f * (q.rate ?? speed)) / 24;
  if (key4.dur !== undefined && (srcT < key4.a || srcT >= key4.a + key4.dur - 1 / 30)) return null;
  const { transformOrigin, transform } = transformOf(q, f);
  if (PASS && PASS !== "matte") return null;
  return (
    <AbsoluteFill style={{ transformOrigin, transform, visibility: "visible" }}>
      <OffthreadVideo src={staticFile(`undereye-filler/key_${name}.webm`)} transparent toneMapped={false} trimBefore={Math.round(q.src! * 24) - 24 * key4.a} playbackRate={speed} muted
        style={{ position: "absolute", left: 0, top: 0, width: W, height: H, filter: PASS === "matte" ? "brightness(0) invert(1)" : BARE ? "brightness(0)" : undefined }} />
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
  if (frame < from || (PASS && PASS !== "over")) return null;
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

export const UndereyeReelV5: React.FC<V5Props> = (P) => {
  useElza();
  BARE = !!P.bare;
  PASS = P.pass;
  const frame = useCurrentFrame();
  const TL = (P.timeline ?? (TL0 as unknown as Timeline));
  const TP = P as unknown as Transcript;
  const { pieces, speed } = P;
  const end = P.durationInFrames;
  // timeline lookups
  const B = (id: string): Beat => beat(TL, id);
  const sp = (id: string) => span(TL, id, TP);
  const ev = (id: string, name: string) => event(TL, id, name, TP);
  const at = (a: Anchor) => resolve(a, TL, TP);
  const tx = (id: string) => (B(id).text ?? {}) as Record<string, any>;
  const ly = (id: string) => (B(id).layout ?? {}) as Record<string, any>;
  const labs = (id: string) => tlLabels(B(id), TL, TP).map((l) => ({ text: l.text, x: l.x ?? 0, y: l.y ?? 0, s: l.s, anchor: l.anchor }));
  const pmap = (id: string) => plateMap(B(id), TL, TP);
  const crop = (id: string) => B(id).plate?.crop;

  const last = pieces[pieces.length - 1];
  const all = pieces.flatMap((x) => x.pics).sort((a, b) => a.f0 - b.f0);
  all.forEach((q, i) => { q.run0 = i && all[i - 1].still && all[i - 1].still === q.still && all[i - 1].f1 === q.f0 ? all[i - 1].run0 : q.f0; });
  const lp = last.pics[last.pics.length - 1];
  // v5: the tail continues from the last picture's real end (v4 added the whole piece length and ran past the clip end)
  const tail: Pic = { ...lp, f0: end, f1: end + TAIL5, src: (lp.src ?? 0) + ((lp.f1 - lp.f0) / 24) * speed, rate: P.tailRate ?? speed };
  const pics = [...all, tail];
  const CROP = { x: 250, y: 830, w: 580, h: 420 };
  const FR = P.frames ?? {};
  const cardPlate = (id: string, h = 315) => {
    const b = B(id), [, e] = sp(id);
    return <PlateMedia id={b.plate!.id} frames={FR} map={pmap(id)} w={420} h={h} labels={labs(id)} out={e} crop={crop(id)} />;
  };
  const pe = PLAN;
  PLAN = { data: P.sketch, ev: { rim: ev("plan", "rim"), trough: ev("plan", "trough"), deposit: ev("plan", "deposit"), entry: ev("plan", "entry"), paths: ev("plan", "paths"),
    fan: ev("plan", "fan"), side: [ev("plan", "side1"), ev("plan", "side2")] } };
  void pe;
  const tick = (s: number, used: boolean, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, opacity: frame > s ? 1 : 0 }}>
      <Mark kind={used ? "tick" : "x"} s={s} size={30} color={used ? INK : MUTED} />
      <span style={{ font: `600 26px/1.15 ${FONT}`, color: used ? INK : MUTED }}>{text}</span>
    </div>
  );
  // a section title on the wall behind the people, their key over it for the title's life
  const Sec = (id: string) => {
    const [s] = sp(id), e = s + SECTION_LEN, t = tx(id), l = ly(id), name = l.key as string;
    const k = P.keys?.[name];
    return <>
      <div style={{ display: "contents", visibility: vis("under") }}><RoomTitle s={s} num={t.num} title={t.title} px={l.px} top={l.top} align={l.align} x={l.x} /></div>
      {k && pics.filter((q) => q.clip === k.clip && q.f1 > s && q.f0 <= e).map((q, i) => (
        <Sequence key={`${name}${i}`} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><KeyLayer q={q} key4={k} name={name} speed={speed} s={s} e={e} /></Sequence>
      ))}
      {pics.filter((q) => q.f1 > s && q.f0 <= e && q.clip && k && q.clip !== k.clip).map((q, i) => {
        const k2 = P.keys?.[`${name}b`];
        return k2 && q.clip === k2.clip ? <Sequence key={`${name}b${i}`} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><KeyLayer q={q} key4={k2} name={`${name}b`} speed={speed} s={s} e={e} /></Sequence> : null;
      })}
    </>;
  };
  const [eyeS, eyeE] = sp("eye");
  const eyeRate = Math.min(0.75, 1.5 / Math.max(1, (eyeE - eyeS) / 24));
  const [winS, winE] = sp("win");
  const hw = sp("hookWin"), [u5s, u5e] = sp("U5"), [u6s, u6e] = sp("U6"), [u1s, u1e] = sp("U1b"), [lgS, lgE] = sp("legend");
  const [aS, aE] = sp("U7a"), [bS, bE] = sp("U7b"), [u3s, u3e] = sp("U3"), [u1as, u1ae] = sp("U1a");
  const [cS, cE] = sp("cannula"), [nS, nE] = sp("needle"), [stS, stE] = sp("stat"), [afS, afE] = sp("afterwards"), [laS, laE] = sp("lasts"), [nmS, nmE] = sp("name");
  const audio = (TL as unknown as { audio?: { dialogue?: string } }).audio?.dialogue ?? "undereye-filler/dialogue_v5.wav";
  const tW = tx("win");
  // v5b: the object pair (src/undereye/ObjectPairV5b.tsx), every number from the timeline
  const pair = (id: string): PairObject => {
    const b = B(id), l = ly(id), so = b.source as any, t = tx(id), [s0, e0] = sp(id);
    return { src: so.src, tipSrc: so.tip, tipAt: so.tipAt, aspect: so.aspect ?? 5, label: t.label, sub: t.sub, s: s0, loupeS: ev(id, "tip"), out: e0,
      tip: l.tip, len: l.len, angle: l.angle, loupe: l.loupe, d: l.d, labelAt: l.labelAt, labelAlign: l.labelAlign };
  };

  return (
    <AbsoluteFill style={{ background: PASS ? undefined : "#000", visibility: vis("over") }}>
      {PASS === "frost" && <style>{FROST_CSS}</style>}
      {pics.map((q, k) => (
        <Sequence key={k} from={q.f0} durationInFrames={q.f1 - q.f0} layout="none"><PicLayer q={q} speed={speed} /></Sequence>
      ))}
      {!P.bare && !PASS && <Audio src={staticFile(audio)} />}

      {/* HOOK: the registered Sept 20 -> Oct 4 wipe, full frame, then a hard cut */}
      {frame < sp("hook")[1] && !P.bare && (
        <AbsoluteFill style={{ visibility: vis("under") }}>
          <Img src={staticFile("undereye-filler/ba_wipe_before.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - Math.min(1, Math.max(0, (frame - ev("hook", "wipe")) / 22)) * 100}% 0 0)` }}>
            <Img src={staticFile("undereye-filler/ba_wipe_after.jpg")} style={{ position: "absolute", width: W, height: H, transform: `scale(${2.0 + frame * 0.002})`, transformOrigin: "540px 1050px" }} />
          </div>
        </AbsoluteFill>
      )}
      {Sec("title")}
      <BAWindowV4 s={hw[0]} out={hw[1]} top={ly("hookWin").top} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={ev("hookWin", "swap")}
        labels={{ before: tx("hookWin").before, after: tx("hookWin").after }} bare={P.bare} note={() => tx("hookWin").note} />

      {/* S1 the concern */}
      {Sec("c01")}
      <ClipCardStd s={eyeS} out={eyeE} left={ly("eye").x} top={ly("eye").y} caps={tx("eye").caps} title={tx("eye").title}
        media={P.bare ? null : <div style={{ position: "relative", width: 420, height: 315, visibility: vis("media") }}>
          <Sequence from={eyeS} layout="none"><OffthreadVideo src={staticFile(`undereye-filler/${B("eye").source!.clip}.mp4`)} trimBefore={B("eye").source!.in} playbackRate={eyeRate} muted toneMapped={false}
            style={{ position: "absolute", left: -70, top: 0, width: 560, height: 315 }} /></Sequence>
        </div>} />
      <ClipCardStd s={u1as} out={u1ae} left={ly("U1a").x} top={ly("U1a").y} caps={tx("U1a").caps} title={tx("U1a").title} media={cardPlate("U1a")} />
      <Sequence from={nmS} durationInFrames={nmE - nmS} layout="none"><NameCard /></Sequence>

      {/* S2 the procedure (v5: no U4 card at the first "cannulas") */}
      {Sec("c02")}
      <ClipCardStd s={u5s} out={u5e} left={ly("U5").x} top={ly("U5").y} caps={tx("U5").caps} title={tx("U5").title} media={cardPlate("U5")} />
      <DateLabels s={afS} out={afE} labels={[{ sub: tx("afterwards").sub, text: tx("afterwards").title, x: ly("afterwards").x, y: ly("afterwards").y, s: afS + 1, accent: true }]} />
      <Lasts s={laS} out={laE} yearS={ev("lasts", "year")} halfS={ev("lasts", "half")} y={ly("lasts").y} />
      <TallPlateCard s={u6s} out={u6e} x={ly("U6").x} y={ly("U6").y} w={ly("U6").w} eyebrow={tx("U6").caps} title={tx("U6").title}
        media={<PlateMedia id="U6" frames={FR} w={ly("U6").mw} h={ly("U6").mh} rotate={(B("U6").plate as any).rotate} crop={crop("U6")} map={pmap("U6")} labels={labs("U6")} out={u6e + 16} />} />

      {/* the plan board: marks in PicLayer (locked to the photo); the key and the section plate below her chin */}
      <Legend x={ly("legend").x} y={ly("legend").y} w={ly("legend").w} out={lgE} head={tx("legend").head} headS={lgS} size={ly("legend").size}
        rows={(tx("legend").rows as { glyph: any; text: string; at: Anchor }[]).map((r) => ({ glyph: r.glyph, text: r.text, s: at(r.at) }))} />
      <ClipCardStd s={u1s} out={u1e} left={ly("U1b").x} top={ly("U1b").y} caps={tx("U1b").caps} title={tx("U1b").title} media={cardPlate("U1b")} />

      {/* S3 the decision */}
      {Sec("c03")}
      <CardV4 cutOut mediaH={ly("U7a").mh} s={aS} out={aE} left={ly("U7a").x} top={ly("U7a").y} caps={tx("U7a").caps} title={tx("U7a").title}
        media={cardPlate("U7a")} mark={tick(at(tx("U7a").tick.at), true, tx("U7a").tick.text)} />
      <CardV4 cutOut mediaH={ly("U7b").mh} s={bS} out={bE} left={ly("U7b").x} top={ly("U7b").y} caps={tx("U7b").caps} title={tx("U7b").title} dim={frame > ev("U7b", "dim")}
        media={cardPlate("U7b")} mark={tick(at(tx("U7b").tick.at), false, tx("U7b").tick.text)} />
      <WidePlateCard s={u3s} out={u3e} x={ly("U3").x} y={ly("U3").y} w={ly("U3").w} h={ly("U3").h} eyebrow={tx("U3").caps} title={tx("U3").title}
        media={<PlateMedia id="U3" frames={FR} w={ly("U3").mw} h={ly("U3").mh} crop={crop("U3")} map={pmap("U3")} labels={labs("U3")} out={u3e} />} />

      {/* S4 the result: the REAL cannula and needle (v5), the one pinprick, the follow-up, measured */}
      {Sec("c04")}
      {B("cannula").device === "PairItem" ? <ObjectPairV5b a={pair("cannula")} b={pair("needle")} end={Math.max(cE, nE)} credit={tx("needle").credit} creditAt={ly("needle").creditAt} />
      : <>
        <RealObject src={B("cannula").source!.src as string} label={tx("cannula").label} s={cS} out={cE} x={ly("cannula").x} y={ly("cannula").y} w={ly("cannula").w}
          aspect={(B("cannula").source as any).aspect ?? 4} enter={ly("cannula").enter}
          tip={{ src: (B("cannula").source as any).tip, label: tx("cannula").tip, s: ev("cannula", "tip"), d: ly("cannula").tipD, x: ly("cannula").tipX, y: ly("cannula").tipY, at: (B("cannula").source as any).tipAt }} />
        <RealObject src={B("needle").source!.src as string} label={tx("needle").label} s={nS} out={nE} x={ly("needle").x} y={ly("needle").y} w={ly("needle").w}
          aspect={(B("needle").source as any).aspect ?? 4} enter={ly("needle").enter}
          tip={{ src: (B("needle").source as any).tip, label: tx("needle").tip, s: ev("needle", "tip"), d: ly("needle").tipD, x: ly("needle").tipX, y: ly("needle").tipY, at: (B("needle").source as any).tipAt }} />
        {frame >= nS && frame <= Math.max(nE, nS + 62) + 10 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1554, textAlign: "center", opacity: Math.min(1, (frame - nS) / 14) * (frame > Math.max(nE, nS + 62) ? Math.max(0, 1 - (frame - Math.max(nE, nS + 62)) / 10) : 1),
            font: `500 17px/1.2 ${FONT}`, color: "rgba(255,255,255,.82)", textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{tx("needle").credit}</div>
        )}
      </>}
      <BAWindowV4 s={winS} out={winE} top={ly("win").top} maxw={ly("win").maxw} crop={CROP} before="undereye-filler/ba_wipe_before.jpg" after="undereye-filler/ba_wipe_after.jpg" swapS={ev("win", "swap")}
        data={P.sketch} marksS={ev("win", "marks")} pulse={ev("win", "pulse")} barsS={ev("win", "bars")} bare={P.bare} labels={{ before: tW.before, after: tW.after }}
        note={(f) => (f < ev("win", "swap") ? tW.note1 : tW.note2)} credit={tW.credit} />
      {P.stat && (
        <div style={{ position: "absolute", left: ly("stat").x, top: ly("stat").y, ...life(frame, stS, stE), textShadow: "0 2px 14px rgba(0,0,0,.55)" }}>
          <div style={{ ...caps(24, "rgba(255,255,255,.95)") }}>{tx("stat").caps}</div>
          <div style={{ font: `600 104px/1 ${FONT}`, color: WHITE, marginTop: 8 }}>
            −{Math.round((100 * (P.stat.before - P.stat.after) / P.stat.before) * Math.min(1, Math.max(0, (frame - stS) / 26)))} %
          </div>
          <div style={{ ...caps(24, "rgba(255,255,255,.95)"), marginTop: 6 }}>{`${P.stat.before} → ${P.stat.after} L* · Sept 20 → Oct 4`}</div>
        </div>
      )}
      <Sequence from={sp("endcard")[0]} durationInFrames={TAIL5} layout="none"><EndCardLow s={0} top={ly("endcard").top} /></Sequence>

      <Captions words={P.words} from={P.hook} />
      {!P.bare && !PASS && TL.beats.flatMap((b) => (b.sfx ?? []).map((s, i) => <Sfx key={`${b.id}${i}`} at={(at(s.at ?? b.start) + 1) / 24} name={s.name} gain={s.gain} />))}
    </AbsoluteFill>
  );
};
