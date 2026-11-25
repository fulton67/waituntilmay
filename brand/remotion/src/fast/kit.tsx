// FAST LANE components: the standard set every preset is wired to (PLAYBOOK section 4), ported from the delivered reels' devices with
// every move on a named spring (spring.ts). Delivered compositions keep their own files untouched (never edit a delivered composition);
// new reels use only these.
//   GlassCard   argument beat: caps + title (+ optional line), the calm Ro glass material  (from components/Ro.tsx card + enter)
//   TitleCard   full-frame title over the moving footage, left darkening, holds >= 60 f lit (from the section-card rule, RULES.md)
//   ObjectCut   a real cut-out floating beside him, >= 2 s hold, contact shadow             (from devices/RealObject.tsx)
//   TermWindow  a named term's real example: his own footage punched in a glass window      (from undereye/standard.tsx SkinWindow)
//   Captions    one phrase at a time, cut on at the word onset, NHG 600 white clean          (from components/Captions.tsx "clean")
//   EndCard     the call to action card over the darkened footage                            (from components/EndCard.tsx)
//   Sfx         a sound at an explicit frame (make-reel writes sfxAtSettle() frames into the timeline)
import React from "react";
import { Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { drift, life, sp, type SpringName } from "./spring";

export const W = 1080, H = 1920, M = 98, SAFE_T = 250, CHEST_T = 1040, CAP_T = 1594;
export const INK = "#1d2230", MUTED = "#6b7183", RULE = "#e2e5eb", WHITE = "#ffffff";
export const FONT = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';

// the calm glass (Ro card): frost, hairline rim, two soft light blobs that drift on the float spring so a held card never goes dead
export const glass = (frame: number, seed: number, radius = 26): React.CSSProperties => {
  const bx = 30 + drift(frame, 26, seed, 32), by = 30 + drift(frame, 22, seed + 7, 32), wx = 70 + drift(frame, 24, seed + 13, 32), wy = 70 + drift(frame, 20, seed + 19, 32);
  return {
    position: "absolute", overflow: "hidden", borderRadius: radius, color: INK, fontFamily: FONT,
    background: `radial-gradient(55% 65% at ${bx.toFixed(2)}% ${by.toFixed(2)}%, rgba(191,134,98,.14), rgba(191,134,98,0) 70%), radial-gradient(50% 60% at ${wx.toFixed(2)}% ${wy.toFixed(2)}%, rgba(255,255,255,.34), rgba(255,255,255,0) 70%), linear-gradient(165deg, rgba(255,255,255,.86) 0%, rgba(255,255,255,.72) 55%, rgba(255,255,255,.78) 100%)`,
    backdropFilter: "blur(26px) saturate(1.5)", border: "1px solid rgba(255,255,255,.75)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(255,255,255,.35), 0 22px 60px rgba(8,12,22,.24), 0 2px 8px rgba(8,12,22,.10)",
  };
};

/** enter/exit as a style: opacity and rise both from the named springs (in: `spring`, out: snap) */
const lifeStyle = (frame: number, s: number, out: number, spring: SpringName, rise = 18): React.CSSProperties => {
  const i = sp(frame, s, spring), o = sp(frame, out, "snap");
  return { opacity: Math.max(0, Math.min(1, i)) * (1 - Math.min(1, o)), transform: `translateY(${(1 - i) * rise - o * 10}px)` };
};

export type Box = { left: number; top: number; w: number };

export const GlassCard: React.FC<{ s: number; out: number; spring: SpringName; box: Box; caps?: string; title: string; line?: string; seed?: number }> = ({ s, out, spring, box, caps, title, line, seed = 3 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const breathe = drift(f - s, 3, seed, 32); // float drift while held (dead-frame rule)
  const st = lifeStyle(f, s, out, spring);
  return (
    <div style={{ ...glass(f, seed), left: box.left, top: box.top + breathe, width: box.w, padding: "26px 32px 30px", ...st }}>
      {caps && <div style={{ font: `500 20px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{caps}</div>}
      <div style={{ font: `600 48px/1.08 ${FONT}`, letterSpacing: "-0.01em", marginTop: caps ? 12 : 0 }}>{title}</div>
      {line && <div style={{ font: `500 28px/1.25 ${FONT}`, color: MUTED, marginTop: 12, ...lifeStyle(f, s + 8, out, "settle", 10) }}>{line}</div>}
    </div>
  );
};

// full-frame title: left darkening 0.72 -> 0.18, number + rule + caps, the title typed on by a spring (characters = spring progress)
export const TitleCard: React.FC<{ s: number; out: number; spring: SpringName; caps?: string; title: string; num?: string; top?: number }> = ({ s, out, spring, caps, title, num, top = 300 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const o = 1 - Math.min(1, sp(f, out, "snap"));
  const dark = Math.min(1, sp(f, s, "settle")) * o;
  const typed = Math.max(0, Math.min(title.length, Math.round(sp(f, s + 4, spring) * title.length)));
  const rule = Math.max(0, sp(f, s, "settle"));
  const y = top + drift(f - s, 4, 11, 32);
  // the darkening covers only the title's band (+-120 px, feathered), never his face: the footage itself is not dimmed
  const band = { top: top - 120, height: 560 };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, ...band, background: `linear-gradient(90deg, rgba(10,12,18,${0.72 * dark}) 0%, rgba(10,12,18,${0.18 * dark}) 100%)`,
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)" }} />
      <div style={{ position: "absolute", left: M, top: y, width: W - 2 * M, color: WHITE, opacity: o }}>
        {(num || caps) && <div style={{ display: "flex", alignItems: "center", gap: 18, font: `500 26px/1 ${FONT}`, letterSpacing: "0.14em", textTransform: "uppercase", opacity: Math.min(1, rule) }}>
          {num && <span>{num}</span>}
          <span style={{ display: "inline-block", height: 2, width: 90 * rule, background: WHITE }} />
          {caps && <span>{caps}</span>}
        </div>}
        <div style={{ font: `600 124px/1.02 ${FONT}`, letterSpacing: "-0.02em", marginTop: 26, textShadow: "0 2px 18px rgba(0,0,0,.35)" }}>
          {title.slice(0, typed)}<span style={{ opacity: 0 }}>{title.slice(typed)}</span>
        </div>
      </div>
    </div>
  );
};

export const MIN_HOLD = 48; // object hold, frames fully in (2 s)
export const ObjectCut: React.FC<{ s: number; out: number; spring: SpringName; src: string; label: string; box: Box; aspect?: number; from?: "up" | "left" | "right"; seed?: number }> = ({ s, out, spring, src, label, box, aspect = 4, from = "up", seed = 5 }) => {
  const f = useCurrentFrame();
  const o2 = Math.max(out, s + 14 + MIN_HOLD);
  if (f < s || f > o2 + 16) return null;
  const a = sp(f, s, spring), z = Math.min(1, sp(f, o2, "snap"));
  const dx0 = from === "left" ? -140 : from === "right" ? 140 : 0, dy0 = from === "up" ? 90 : 0;
  const dx = dx0 * (1 - a) + drift(f - s, 6, seed, 32), dy = dy0 * (1 - a) - 18 * z + drift(f - s, 4, seed + 3, 32);
  const h = box.w / aspect;
  const ph = /PLACEHOLDER/i.test(src);
  return (
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.w, height: h, opacity: Math.max(0, Math.min(1, a)) * (1 - z), transform: `translate(${dx}px, ${dy}px)` }}>
      <div style={{ position: "absolute", left: box.w * 0.08, width: box.w * 0.84, top: h * 0.86, height: Math.max(14, h * 0.22), borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(10,8,6,.42) 0%, rgba(10,8,6,.18) 45%, rgba(10,8,6,0) 72%)", filter: "blur(6px)" }} />
      <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: box.w, height: h, objectFit: "contain", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" }} />
      {ph && <div style={{ position: "absolute", inset: -6, border: "3px dashed rgba(255,80,80,.95)", borderRadius: 10, font: `700 22px/1 ${FONT}`, color: "rgba(255,80,80,.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>PLACEHOLDER</div>} {/* banned-lint: allow PALETTE never shipped: a SHOT_REQUESTS placeholder */}
      <div style={{ position: "absolute", left: 0, width: box.w, top: h + 22, textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "9px 16px 8px", borderRadius: 999, background: "rgba(255,255,255,.9)", color: INK, font: `600 25px/1 ${FONT}`, boxShadow: "0 6px 20px rgba(8,12,22,.22)" }}>{label}</span>
      </div>
    </div>
  );
};

// a named term's example from his own footage: the source frame region `crop` (source px of a 1080 x 1920 frame) in a glass window
export type Crop = { x: number; y: number; w: number; h: number };
export const TermWindow: React.FC<{ s: number; out: number; spring: SpringName; clip: string; at: number; crop: Crop; caps: string; title: string; top?: number; seed?: number }> = ({ s, out, spring, clip, at, crop, caps, title, top = CHEST_T, seed = 9 }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  if (f < s || f > out + 16) return null;
  const PAD = 10, IW = 520, IH = Math.min(288, (IW * crop.h) / crop.w), CW = IW + 2 * PAD, X = (W - CW) / 2; // <= 400 px tall in all: fits under a face that ends at y 1150
  const k = IW / crop.w;
  const a = sp(f, s, spring), z = Math.min(1, sp(f, out, "snap"));
  const sc = 0.9 + 0.1 * a - 0.04 * z;
  const push = 1 + 0.03 * Math.min(1, sp(f, s, "float")) + drift(f - s, 0.006, seed, 32); // the picture never sits still
  return (
    <div style={{ position: "absolute", inset: 0, opacity: Math.max(0, Math.min(1, a * 1.6)) * (1 - z) }}>
      <div style={{ ...glass(f, seed, 30), left: X, top, width: CW, height: IH + 2 * PAD + 92, transform: `scale(${sc})`, transformOrigin: "50% 40%" }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: IW, height: IH, borderRadius: 22, overflow: "hidden", background: "#000" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0",
            transform: `translate(${-crop.x * k}px, ${-crop.y * k}px) scale(${k * push})` }}>
            <OffthreadVideo src={staticFile(clip)} startFrom={Math.round(at * fps)} muted toneMapped={false} style={{ width: W, height: H }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 24, top: IH + 2 * PAD + 14 }}>
          <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{caps}</div>
          <div style={{ font: `600 38px/1.1 ${FONT}`, marginTop: 8 }}>{title}</div>
        </div>
      </div>
    </div>
  );
};

export type Caption = { from: number; to: number; text: string }; // frames
export const Captions: React.FC<{ captions: Caption[]; keywords?: string[] }> = ({ captions, keywords = [] }) => {
  const f = useCurrentFrame();
  const line = captions.find((c) => f >= c.from && f < c.to);
  if (!line) return null;
  const q = sp(f, line.from, "snap"); // cut on: full opacity on the onset frame, the scale settles on snap
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keys = new Set(keywords.map(norm));
  const px = Math.min(62.6, ((W - 2 * M - 16) / Math.max(1, line.text.length)) * 1.9);
  return (
    <div style={{ position: "absolute", left: M, width: W - 2 * M, top: CAP_T, textAlign: "center" }}>
      <p style={{ margin: 0, font: `600 ${px}px/1.2 ${FONT}`, letterSpacing: "0.01em", color: WHITE, whiteSpace: "nowrap", textShadow: "0 2px 10px rgba(0,0,0,.38), 0 0 2px rgba(0,0,0,.25)", transform: `scale(${0.95 + 0.05 * q})` }}>
        {line.text.split(" ").map((w, i) => <span key={i} style={keys.has(norm(w)) ? { fontWeight: 700 } : undefined}>{(i ? " " : "") + w}</span>)}
      </p>
    </div>
  );
};

export const EndCard: React.FC<{ s: number; spring: SpringName; lines?: string[]; handle?: string }> = ({ s, spring, lines = ["Book a consultation.", "Link in bio."], handle = "@drarielostad" }) => {
  const f = useCurrentFrame();
  if (f < s) return null;
  const bg = Math.min(1, sp(f, s, "settle"));
  const CW = 842, X = (W - CW) / 2, TOP = H * 0.36;
  const [head, ...rest] = lines;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, backdropFilter: `blur(${26 * bg}px) saturate(${1 - 0.25 * bg})`, background: `rgba(14,16,22,${0.4 * bg})` }} />
      <div style={{ ...glass(f, 21, 32), left: X, top: TOP + drift(f - s, 3, 23, 32), width: CW, padding: "65px 65px 54px", textAlign: "center", ...lifeStyle(f, s + 4, 1e9, spring) }}>
        <div style={{ font: `600 76px/1.1 ${FONT}`, letterSpacing: "-0.015em" }}>{head}</div>
        {rest.map((l, i) => <div key={i} style={{ font: `500 54px/1.2 ${FONT}`, color: MUTED, marginTop: 15, ...lifeStyle(f, s + 9 + i * 2, 1e9, "settle", 12) }}>{l}</div>)}
        <div style={{ height: 1.5, background: RULE, margin: "43px auto 32px", width: `${Math.max(0, Math.min(1, sp(f, s + 13, "settle"))) * 100}%` }} />
        <div style={{ font: `500 37px/1 ${FONT}`, letterSpacing: "0.06em", ...lifeStyle(f, s + 17, 1e9, "settle", 10) }}>{handle}</div>
      </div>
    </div>
  );
};

export const Sfx: React.FC<{ frame: number; name: string; gain?: number }> = ({ frame, name, gain = 0.16 }) => (
  <Sequence from={frame} durationInFrames={24} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={gain} /></Sequence>
);

export { life };
