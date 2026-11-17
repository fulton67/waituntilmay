import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Arrow, type Pt } from "../devices/Arrow";
import { TypeEntry } from "../devices/TypeEntry";
import { faceBox, type Track } from "../devices/track";
import { C, SERIF, SKIN_DISCLAIMER, caps, cl, display, drift, ease, io, p, text } from "./look";
import { Chip, Disclaimer, DrawnCircle, Glass, MoaLabel, src } from "./parts";
import { SectionCard } from "./Cards";
import { PortraitPipCircle } from "./PortraitPipCircle";
import { TimelineMarkers } from "./TimelineMarkers";

// exo6/Gap1.tsx: the layouts of gap-fix round 1 on YouTube v6 (research/ostad/style/exomind/gap/ROUND1.md, DECISIONS 14o).
// Naim's repeat complaint was one layout ("him left + card right" on 22 of 25 segments, a 49 s unbroken run, 0.66 takeovers/min
// against 3-6 in the references). These are the frame-level changes: full-bleed takeovers with him in the circular pip (B04, B11,
// B12), full-height splits (B09, B15, B20), full-frame section cards over a real picture (S1-S4), and the BTL MOA film full bleed
// (S4-B17). Rules kept: no blurred side-fill anywhere (every frame edge is real picture or the cream room), the pip is a true circle
// centred from the head track, every picture moves for its whole life (push + drift), arrows are all brand blue, one weight, barb.

export const KEYED = "exomind-skin/yt/presenter_cut_k.webm"; // 756x1344 VP9 alpha (matte_fgr_cut + matte_pha_cut)
export const SPEED = 1.15;

// ------------------------------------------------------------------------------------------------ a full-frame moving picture
// cover-fit, pushed s0 -> s1 over the given span on the in-out curve, with a slow drift; video or still.
export const Bleed: React.FC<{
  file: string; video?: boolean; startFrom?: number; rate?: number; from?: number; to?: number; s0?: number; s1?: number; focus?: string; pos?: string;
  box?: { x: number; y: number; w: number; h: number }; dx?: number; dy?: number; style?: React.CSSProperties; radius?: number; shade?: string;
}> = ({ file, video, startFrom = 0, rate = 1, from = 0, to = 120, s0 = 1.0, s1 = 1.06, focus = "50% 50%", pos = "50% 50%", box = { x: 0, y: 0, w: 1920, h: 1080 }, dx = 8, dy = 5, style, radius = 0, shade }) => {
  const f = useCurrentFrame();
  const u = ease.blank(cl((f - from) / Math.max(1, to - from)));
  const s = s0 + (s1 - s0) * u;
  const st: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pos,
    transform: `translate(${drift(f, dx, 150)}px, ${drift(f, dy, 190, 0.7)}px) scale(${s})`, transformOrigin: focus, ...style };
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, overflow: "hidden", borderRadius: radius, background: C.navy }}>
      {video ? <OffthreadVideo src={src(file)} muted startFrom={startFrom} playbackRate={rate} style={st} /> : <Img src={src(file)} style={st} />}
      {shade && <div style={{ position: "absolute", inset: 0, background: shade }} />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ section card over a picture (S1-S4)
// 30 f (beats.json cards): the picture is already full frame and moving; a left-weighted darkening holds the type and lifts after
// the letters leave (f 22 -> 30), so the card hands over to the takeover (or cuts back to him) without a flash.
export const SectionOver: React.FC<{ num: string; title: string; size?: number }> = ({ num, title, size = 150 }) => {
  const f = useCurrentFrame();
  if (f > 31) return null;
  const lift = p(f, 22, 9, ease.exit);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - lift, background: "linear-gradient(90deg, rgba(12,16,24,.72) 0%, rgba(12,16,24,.5) 46%, rgba(12,16,24,.18) 100%)" }} />
      <SectionCard num={num} title={title} start={0} x={150} y={540 - size * 0.62} size={size} onImage />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ the tracked, feathered pip
// Naim's note 9 (DECISIONS 14n) + tracking.md gap 3: the keyed take ends at the camera frame's left edge, which read as a straight
// slice through his shoulder inside the circle. The plate's left 16 % (172 source px) now fades into the dark pip fill (a linear alpha
// ramp on the inner layer), so the frame edge never shows. Face-box centre on the circle centre per frame; scale held for the beat
// (head box = 46 % of the diameter).
const PIP_BG = "linear-gradient(180deg, #4a5160 0%, #2c303a 34%, #1b1a20 50%, #19181e 100%)";
export const TrackedPip: React.FC<{ track: Track; seqStart: number; dur: number; at: number; x: number; y: number; d?: number; out?: number }> = ({ track, seqStart, dur, at, x, y, d = 260, out }) => {
  const f = useCurrentFrame();
  const hb = faceBox(track, seqStart + Math.round(dur / 2), { scale: 1, x: 0, y: 0 }, undefined, true);
  const s = hb ? (0.46 * d) / hb.h : 0.19;
  const fb = faceBox(track, seqStart + f, { scale: 1, x: 0, y: 0 });
  const inner: React.CSSProperties = fb ? { left: d / 2 - s * (fb.x + fb.w / 2), top: d / 2 - s * (fb.y + fb.h / 2), width: 1080 * s } : { left: 26, top: -168, width: 480 };
  const mask = "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.35) 7%, #000 16%)";
  return (
    <PortraitPipCircle at={at} x={x} y={y} d={d} bg={PIP_BG} inner={inner} out={out}>
      <div style={{ width: "100%", WebkitMaskImage: mask, maskImage: mask }}>
        <OffthreadVideo src={staticFile(KEYED)} muted transparent playbackRate={SPEED} startFrom={Math.round(seqStart * SPEED)} style={{ width: "100%", display: "block" }} />
      </div>
    </PortraitPipCircle>
  );
};

// ------------------------------------------------------------------------------------------------ B04: the consult, full bleed (S1 on it)
// The Nov 5 2026 consult (catalog row 30: Ostad + P0001 waist-up; consult_wide.mp4, 1080 x 784) fills the frame (1.78x, the most a
// 1080-wide phone take allows) from the section card on; he drops into the pip as the card leaves (f30); 'In our office' on "conversation".
export const B04Consult: React.FC<{ track: Track; seqStart: number; dur: number }> = ({ track, seqStart, dur }) => (
  <AbsoluteFill>
    <Bleed file="exomind-skin/clinic/consult_wide.mp4" video from={0} to={dur} s0={1.0} s1={1.05} focus="50% 40%" />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300, background: "linear-gradient(180deg, rgba(14,18,26,0), rgba(14,18,26,.42))" }} />
    <SectionOver num="01" title="Your questions" />
    <Chip at={52} out={dur - 9} label="In our office" size={30} style={{ left: 1500, top: 64, background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(16px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), inset 0 0 0 1px rgba(255,255,255,.3)", textShadow: "0 1px 8px rgba(0,0,0,.35)" }} />
    <TrackedPip track={track} seqStart={seqStart} dur={dur} at={30} x={70} y={700} />
  </AbsoluteFill>
);

// ------------------------------------------------------------------------------------------------ B06: the phone, centred, him out
// (the phone itself lives in OstadYT6 PhoneStage; this beat only steps him out so the 0-49 s him-left run breaks at 22.8 s)

// ------------------------------------------------------------------------------------------------ B09: S2 on the waiting room, then the consult split
// "please ... continue sending your questions": the left half is the practice's own consult take (P0001 asking him a question in the
// treatment room; the same consult as B04, a second shot, the subject's 2-beat cap), the right half is the live question box, no
// invented askers. Him out (he is in the footage).
export const B09Questions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const cut = 30;
  return (
    <AbsoluteFill>
      {f < cut ? (
        <>
          <Bleed file="exomind-skin/clinic/waiting_03614.jpg" from={0} to={cut} s0={1.02} s1={1.07} focus="40% 50%" />
          <SectionOver num="02" title="Before you go" />
        </>
      ) : (
        <>
          <Bleed file="exomind-skin/clinic/consult.mp4" video from={cut} to={110} s0={1.0} s1={1.05} box={{ x: 0, y: 0, w: 960, h: 1080 }} focus="50% 40%" pos="50% 30%" />
          <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, background: C.cream }} />
          <div style={{ position: "absolute", left: 958.5, top: 0, width: 3, height: 1080, background: "#fff", boxShadow: "0 0 18px rgba(159,214,245,.7)" }} />
          <div style={{ position: "absolute", left: 60, bottom: 150, ...caps(28, "rgba(255,255,255,.92)"), textShadow: "0 1px 10px rgba(0,0,0,.45)" }}>A consult in our office</div>
          {children}
        </>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------ B11: our team, a full-frame diptych
// Two moments of the practice's own session footage (office_team | office_treat: Dr. Ostad and his staff with a patient), each a
// full-height half at 1.33x (720 x 900 phone frames, never upscaled more), the right half wiping in on `sweep`. He is in the pip.
export const B11Team: React.FC<{ track: Track; seqStart: number; dur: number }> = ({ track, seqStart, dur }) => {
  const f = useCurrentFrame();
  const w = p(f, 8, 12, ease.sweep);
  const tq = p(f, 76, 10, ease.arrive), cq = p(f, 79, 10, ease.arrive);
  const rw = 960 * w;
  return (
    <AbsoluteFill style={{ background: C.navy }}>
      <Bleed file="exomind-skin/clips/office_team.mp4" video from={0} to={dur} s0={1.0} s1={1.05} box={{ x: 0, y: 0, w: 960, h: 1080 }} focus="50% 35%" />
      {w > 0 && <Bleed file="exomind-skin/clips/office_treat.mp4" video from={8} to={dur} s0={1.04} s1={1.0} box={{ x: 1920 - rw, y: 0, w: rw, h: 1080 }} focus="50% 40%" pos="50% 40%" />}
      {w > 0 && <div style={{ position: "absolute", left: 1920 - rw - 1.5, top: 0, width: 3, height: 1080, background: "#fff", boxShadow: "0 0 18px rgba(159,214,245,.8)" }} />}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 420, background: "linear-gradient(180deg, rgba(14,18,26,0), rgba(14,18,26,.5))" }} />
      {f >= 76 && (
        <div style={{ position: "absolute", left: 1010, top: 690 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 110, lineHeight: 1, color: "#fff", opacity: tq, transform: `translateY(${(1 - io(tq)) * 16}px)`, textShadow: "0 2px 18px rgba(0,0,0,.3)" }}>Our team</div>
          <div style={{ ...caps(28, "rgba(255,255,255,.9)"), marginTop: 16, opacity: cq }}>Dr. Ostad’s office</div>
        </div>
      )}
      <TrackedPip track={track} seqStart={seqStart} dur={dur} at={1} x={70} y={700} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------ B12: the session, full bleed + markup
// The Oct 30 session (P0006, consent unknown) fills the frame (yt/session.mp4, 1920 x 1080, from 7 s); IMG_3714 of the same session sits
// in a rounded card right, cropped past the staff name tag. Rosacea method on the real photo: a curved callout from the timeline's
// SESSION tick lands on the coil pad on "office", and the 24:30 console timer is ringed. He is in the pip.
const CARD = { x: 1300, y: 60, w: 560, h: 720, s: 1.3, ox: 345, oy: 190 }; // photo crop origin (image px) and scale
const photoPt = (ix: number, iy: number, push: number): Pt => {
  const lx = (ix - CARD.ox) * CARD.s, ly = (iy - CARD.oy) * CARD.s; // inside the card
  const cx = CARD.w / 2, cy = CARD.h * 0.55; // push origin
  return { x: CARD.x + cx + (lx - cx) * push, y: CARD.y + cy + (ly - cy) * push };
};
export const B12Session: React.FC<{ track: Track; seqStart: number; dur: number }> = ({ track, seqStart, dur }) => {
  const f = useCurrentFrame();
  const end = dur - 9;
  const q = p(f, 4, 10, ease.arrive), o = p(f, end, 7, ease.exit);
  const pushAt = (fr: number) => 1 + 0.05 * ease.blank(cl(fr / dur));
  const push = pushAt(f);
  const timer = photoPt(677, 330, push);
  const x0 = 380, x1 = 1180, ty = 830;
  return (
    <AbsoluteFill style={{ background: C.navy }}>
      <Bleed file="exomind-skin/yt/session.mp4" video startFrom={7 * 24} from={0} to={dur} s0={1.0} s1={1.06} focus="40% 40%" />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 380, background: "linear-gradient(180deg, rgba(14,18,26,0), rgba(14,18,26,.55))" }} />
      <div style={{ position: "absolute", left: CARD.x + (1 - io(q)) * 24, top: CARD.y + o * 7, width: CARD.w, height: CARD.h, borderRadius: 24, overflow: "hidden", opacity: q * (1 - o),
        boxShadow: "0 40px 70px -30px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.2), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: CARD.w, height: CARD.h, transform: `scale(${push})`, transformOrigin: "50% 55%" }}>
          <Img src={src("exomind-skin/clinic/IMG_3714.jpg")} style={{ position: "absolute", maxWidth: "none", left: -CARD.ox * CARD.s, top: -CARD.oy * CARD.s, width: 768 * CARD.s, height: 1024 * CARD.s }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: timer.x - 70, top: timer.y - 36 + o * 7 }}><DrawnCircle at={40} w={140} h={72} sw={5} out={end} /></div>
      <TimelineMarkers lineAt={14} x0={x0} x1={x1} y={ty} end={end + 7} onDark
        markers={[{ at: 19, u: 0.04, label: "Arrive" }, { at: 28, u: 0.5, label: "Session" }, { at: 32, u: 0.96, label: "Walk out" }]}
        segment={{ at: 28, u0: 0.04, u1: 0.96, label: "about 20–30 min ⚠" }} />
      <Arrow variant="curved-callout" from={{ x: x0 + 0.5 * (x1 - x0) + 30, y: ty - 150 }} to={(fr: number) => { const pt = photoPt(392, 488, pushAt(fr)); return { x: pt.x - 18, y: pt.y + 10 }; }}
        start={36} end={end + 7} color={C.blue} bend={-0.28} />
      <TrackedPip track={track} seqStart={seqStart} dur={dur} at={1} x={70} y={700} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------ S3 on the practice (first 30 f of B13)
export const S3Over: React.FC = () => (
  <AbsoluteFill>
    <Bleed file="exomind-skin/clinic/reception_03612.jpg" from={0} to={30} s0={1.02} s1={1.07} focus="60% 50%" />
    <SectionOver num="03" title="Total skin health" size={140} />
  </AbsoluteFill>
);

// ------------------------------------------------------------------------------------------------ B16: emotions -> skin, sourced
// graphics_arrows.md: the old chart (rosacea flare triggers: stress WORSENS skin) contradicted his line "how our emotions improve our
// skin" and carried a rosacea headline into the ExoMind edit (ADDED RULE 2). Now: the link the way he says it. A callout leaves his
// head (templeR, tracked) as a dashed flow and lands on 'Emotions'; a second arrow carries Emotions -> Skin; under it one sourced, carefully worded
// finding in the improving direction: Kabat-Zinn et al., Psychosomatic Medicine 1998 (37 psoriasis patients on light therapy; those who
// added a guided mindfulness practice cleared faster). No percentages on screen. ⚠ physician-check before publishing.
export const B16Card = { x: 1000, y: 70, w: 860, h: 720 };
export const B16Emotions: React.FC<{ tail: (lf: number) => Pt }> = ({ tail }) => {
  const f = useCurrentFrame();
  const c = B16Card;
  const end = 101;
  const q = p(f, 1, 10, ease.arrive), o = p(f, end, 7, ease.exit);
  const n1 = p(f, 56, 10, ease.arrive), n2 = p(f, 69, 10, ease.arrive);
  const node = (x: number, label: string, sub: string, k: number, lit: boolean) => (
    <div style={{ position: "absolute", left: x, top: 150, width: 300, height: 170, borderRadius: 22, opacity: k, transform: `translateY(${(1 - io(k)) * 16}px)`,
      background: lit ? "linear-gradient(160deg, #ffffff, #eaf5fc)" : "linear-gradient(160deg, #ffffff, #f6f2ee)",
      boxShadow: `0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -18px rgba(32,37,50,.3), 0 0 0 ${lit ? 2 : 1}px ${lit ? "rgba(55,169,232,.7)" : "rgba(33,27,21,.08)"}` }}>
      <div style={{ position: "absolute", left: 30, top: 30, ...display(64) }}>{label}</div>
      <div style={{ position: "absolute", left: 32, top: 112, ...text(26, 400, C.ink2) }}>{sub}</div>
    </div>
  );
  const cite = p(f, 78, 10, ease.arrive);
  return (
    <>
      <div style={{ position: "absolute", left: c.x, top: c.y + (1 - io(q)) * 16 + o * 7 + drift(f, 3, 140), width: c.w, height: c.h, opacity: q * (1 - o) }}>
        <Glass r={30} t={f} style={{ inset: 0 }} />
        <div style={{ position: "absolute", left: 56, top: 48, ...caps(26, C.blue) }}>The mind–skin link</div>
        {node(56, "Emotions", "calmer, less stressed", n1, f >= 56)}
        {node(500, "Skin", "can respond", n2, f >= 69)}
        <div style={{ position: "absolute", left: 56, top: 380, right: 56, opacity: cite, transform: `translateY(${(1 - io(cite)) * 16}px)` }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 44, lineHeight: 1.12, color: C.ink }}>In one small study, people with psoriasis who added a mindfulness practice to light therapy cleared faster.</div>
          <div style={{ ...text(25, 400, C.ink2), marginTop: 18 }}>Kabat-Zinn et al., Psychosomatic Medicine, 1998 · 37 patients ⚠</div>
        </div>
      </div>
      <Arrow variant="dashed-flow" from={(lf: number) => tail(lf)} to={{ x: c.x + 40, y: c.y + 230 }} start={55} end={end + 7} color={C.blue} bend={-0.22} />
      <Arrow variant="straight-pointer" from={{ x: c.x + 372, y: c.y + 235 }} to={{ x: c.x + 492, y: c.y + 235 }} start={69} end={end + 7} color={C.blue} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ S4 + B17: BTL's own MOA head, full bleed
// graphics_arrows.md: the AI glass skull was a partial empty signifier and restyled v4.1/v5. Now the licensed BTL Mechanism-of-Action
// film itself (49.0 s on: the applicator settles on the head, the stimulated region lights), scaled 1.16x from the top so its
// burned-in subtitles (which name indications we may not show) fall below the frame. 'Conceptual depiction. Results may vary.' is
// on for the whole span. An orbit arc (full brand blue) rings the lit region on "create"; 'Neuroplasticity' lands on its word.
// The layer runs 8 f into B18 so B18's film can dissolve over it (motion_easing.md gap 4).
export const B17MoaHead: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const chipQ = p(f, 66, 6, ease.arrive);
  // the lit region (film px 930, 453) carried through the film's push: screen = -30u + s * film, s = 1.16 + 0.07u, u = f / dur
  const litAt = (lf: number) => { const u = cl(lf / dur), k = 1.16 + 0.07 * u; return { x: -30 * u + k * 930, y: k * 453 }; };
  return (
    <AbsoluteFill style={{ background: "#0b1220" }}>
      <OffthreadVideo src={src("exomind-skin/btl/video/Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4")} muted startFrom={Math.round(49.0 * 24)}
        style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translateX(${-30 * cl(f / dur)}px) scale(${1.16 + 0.07 * cl(f / dur)})`, transformOrigin: "0% 0%" }} />{/* left-anchored: the film's EXOMIND mark stays whole, its BTL emblem falls off the right */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 320, background: "linear-gradient(180deg, rgba(11,18,32,0), rgba(11,18,32,.55))" }} />
      <SectionOver num="04" title="The technology" />
      <Arrow variant="orbit-arc" from={litAt} to={(lf: number) => { const c = litAt(lf); return { x: c.x + 150, y: c.y + 40 }; }} bend={0.78} start={50} end={dur - 1} color={C.blue} />
      {f >= 66 && (
        <div style={{ position: "absolute", left: 1330, top: 300, opacity: chipQ, transform: `scale(${0.95 + 0.05 * chipQ})`, transformOrigin: "0% 50%", padding: "16px 26px", borderRadius: 999,
          background: "rgba(255,255,255,.14)", backdropFilter: "blur(16px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.4), inset 0 0 0 1px rgba(255,255,255,.22)", ...text(34, 500, "#fff"), whiteSpace: "nowrap" }}>Neuroplasticity</div>
      )}
      <MoaLabel at={0} dark y={812} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------ B19: the synapse film in a window
// immersion_layout.md gap 3: B19 was a drawn panel on the empty room. The BTL MOA film's synapse (74.6 s on, at 0.8x: vesicles
// release across the cleft) now fills a large rounded window right of him, cropped above its subtitle band; the ExoMind-only
// pulse-train panel sits over its lower right as the rhythm that drives it.
export const B19Window: React.FC<{ dur: number; children?: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const end = dur - 9;
  const q = p(f, 1, 10, ease.arrive), o = p(f, end, 7, ease.exit);
  const box = { x: 700, y: 40, w: 1180, h: 860 };
  const s = 1.0 + 0.05 * ease.blank(cl(f / dur));
  return (
    <>
      <div style={{ position: "absolute", left: box.x + (1 - io(q)) * 24, top: box.y + o * 7, width: box.w, height: box.h, borderRadius: 24, overflow: "hidden", opacity: q * (1 - o), background: "#0b1220",
        boxShadow: "0 40px 70px -30px rgba(32,37,50,.5), 0 4px 12px rgba(32,37,50,.14), 0 0 0 1px rgba(255,255,255,.7)" }}>
        <OffthreadVideo src={src("exomind-skin/btl/video/Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4")} muted startFrom={Math.round(74.6 * 24)} playbackRate={0.8}
          style={{ position: "absolute", left: -560, top: -10, width: 1920, height: 1080, transform: `scale(${s}) translate(${drift(f, 6, 150)}px, 0px)`, transformOrigin: "980px 560px" }} />
        <div style={{ position: "absolute", left: 30, top: 28, ...caps(26, "rgba(255,255,255,.9)") }}>Synapse · BTL Exomind film</div>
      </div>
      <div style={{ opacity: 1 - o }}>{children}</div>
      <MoaLabel at={1} out={end} y={912} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ B20: a true split, him | her
// graphics_arrows.md gap 5: the same tall window + quote card as v4.1/v5. Now a full-height split: he stays keyed in the left half on
// the cream room; the right half is the practice's own patient (P0001, consent unknown; Nov 5 consult raw 29.6-34.4 s, muted) full
// height at 1.6x, and her exact words build over her own footage on the word. A dashed flow carries his "feel better" to her words.
export const B20Split: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const end = dur - 9;
  const w = p(f, 0, 12, ease.sweep), o = p(f, end, 7, ease.exit);
  const rw = 960 * w;
  const words = ["It", "quiets", "my", "brain."];
  const wt = [32, 36, 40, 44]; // her words land right after his "feel better" (25-30)
  return (
    <>
      <div style={{ position: "absolute", left: 1920 - rw, top: 0, width: rw, height: 1080, overflow: "hidden", opacity: 1 - o }}>
        <Bleed file="exomind-skin/clinic/p0001_quiet.mp4" video from={0} to={dur} s0={1.0} s1={1.06} box={{ x: 0, y: 0, w: 960, h: 1080 }} focus="60% 35%" pos="60% 30%" />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 560, background: "linear-gradient(180deg, rgba(14,18,26,0), rgba(14,18,26,.62))" }} />
        <div style={{ position: "absolute", left: 70, top: 700, width: 820 }}>{/* below her face (stills sheet: at 560 it crossed her eyes) */}
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontStyle: "italic", fontSize: 92, lineHeight: 1.04, color: "#fff", textShadow: "0 2px 22px rgba(0,0,0,.35)" }}>
            “{words.map((w0, i) => { const k = p(f, wt[i], 8, ease.arrive); return <span key={i} style={{ opacity: k, display: "inline-block", transform: `translateY(${(1 - io(k)) * 16}px)`, whiteSpace: "pre" }}>{(i ? " " : "") + w0}</span>; })}”
          </div>
          <div style={{ ...caps(26, "rgba(255,255,255,.9)"), marginTop: 22, opacity: p(f, 50, 10) }}>Patient, after her session · Dr. Ostad’s office</div>
          <Disclaimer at={60} out={end} text={SKIN_DISCLAIMER} style={{ position: "relative", marginTop: 14, color: "rgba(255,255,255,.86)", textShadow: "0 1px 8px rgba(0,0,0,.4)" }} />
        </div>
      </div>
      {f >= 12 && <div style={{ position: "absolute", left: 1920 - rw - 1.5, top: 0, width: 3, height: 1080, background: "#fff", boxShadow: "0 0 18px rgba(159,214,245,.8)", opacity: 1 - o }} />}
      <Arrow variant="dashed-flow" from={{ x: 780, y: 540 }} to={{ x: 1016, y: 748 }} start={26} end={end + 7} color={C.blue} bend={-0.3} />
    </>
  );
};

/** the B13 'mind' chip and other small helpers */
export const TypeLine: React.FC<{ at: number; text: string; times: number[]; x: number; y: number; size?: number; exitAt?: number }> = ({ at, text: t, times, x, y, size = 64, exitAt }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    <TypeEntry entry="type-ghost-to-lit" start={at} text={t} wordTimes={times} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, color: C.ink }} />
  </div>
);
