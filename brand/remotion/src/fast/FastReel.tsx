// FastReel: one composition for every FAST LANE reel. It draws public/fast/<reel>/timeline.json (written by tools/make_reel.py from a
// preset in brand/remotion/presets/). Editing a reel = editing that JSON (Naim's notes are applied there in one pass).
//   pass "full" (default) = footage + graphics + sound; "gfx" = graphics only on transparent (tools/dead_frames.py preview).
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import type { SpringName } from "./spring";
import { Captions, EndCard, GlassCard, ObjectCut, Sfx, TermWindow, TitleCard, type Box, type Caption, type Crop } from "./kit";
import { CompareLoupes, ContourCompare, FiberCompare, Mechanism, RiskRows, SessionStack } from "./tech";

export type Slot = {
  id: string; kind: "title" | "argument" | "object" | "term" | "end" | "tech";
  view?: "mechanism" | "compare" | "fibers" | "risks" | "sessions" | "contour"; props?: Record<string, unknown>; // kind "tech": a technical visual (tech.tsx)
  start: number; end: number; spring: SpringName; hold?: boolean; // hold = text that must stand still to be read (dead-frame exempt)
  text?: { caps?: string; title?: string; line?: string; num?: string; label?: string };
  box?: Box; src?: string; aspect?: number; at?: number; crop?: Crop; top?: number;
  sfx?: { name: string; frame: number; gain?: number } | null;
  wish?: string; // a graphic the reel wanted that the library lacks (WISHLIST.md); the slot uses the closest component meanwhile
};
export type Piece = { id: string; in: number; out: number; at: number; reason?: string; muted?: boolean }; // source seconds -> composition frame `at`
export type FastTimeline = {
  schema: "fast/1"; reel: string; preset: string; fps: number; durationInFrames: number;
  clip: string; pieces: Piece[]; captions: Caption[]; keywords?: string[]; slots: Slot[];
};
export type FastProps = { reel?: string; pass?: "full" | "gfx"; tl?: FastTimeline };

const SlotView: React.FC<{ s: Slot; clip: string }> = ({ s, clip }) => {
  const t = s.text ?? {};
  switch (s.kind) {
    case "title": return <TitleCard s={s.start} out={s.end} spring={s.spring} caps={t.caps} title={t.title ?? ""} num={t.num} top={s.top} />;
    case "argument": return <GlassCard s={s.start} out={s.end} spring={s.spring} box={s.box ?? { left: 98, top: 270, w: 884 }} caps={t.caps} title={t.title ?? ""} line={t.line} seed={s.start % 97} />;
    case "object": return <ObjectCut s={s.start} out={s.end} spring={s.spring} src={s.src ?? ""} label={t.label ?? t.title ?? ""} box={s.box ?? { left: 600, top: 1040, w: 380 }} aspect={s.aspect} seed={s.start % 89} />;
    case "term": return <TermWindow s={s.start} out={s.end} spring={s.spring} clip={clip} at={s.at ?? 0} crop={s.crop ?? { x: 240, y: 420, w: 600, h: 450 }} caps={t.caps ?? "Example"} title={t.title ?? ""} top={s.top} seed={s.start % 83} />;
    case "end": return <EndCard s={s.start} spring={s.spring} />;
    case "tech": return <TechView s={s} />;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TechView: React.FC<{ s: Slot }> = ({ s }) => {
  const b = { s: s.start, out: s.end, spring: s.spring };
  const p = (s.props ?? {}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (s.view) {
    case "mechanism": return <Mechanism {...b} {...p} />;
    case "compare": return <CompareLoupes {...b} {...p} />;
    case "fibers": return <FiberCompare {...b} {...p} />;
    case "risks": return <RiskRows {...b} {...p} />;
    case "sessions": return <SessionStack {...b} {...p} />;
    case "contour": return <ContourCompare {...b} {...p} />;
    default: return null;
  }
};

export const FastReel: React.FC<FastProps> = ({ tl, pass = "full" }) => {
  if (!tl) return null;
  const full = pass === "full";
  return (
    <AbsoluteFill style={{ background: full ? "#000" : "transparent" }}>
      {full && tl.pieces.map((p) => (
        <Sequence key={p.id} from={p.at} durationInFrames={Math.max(1, Math.round((p.out - p.in) * tl.fps))}>
          <OffthreadVideo src={staticFile(tl.clip)} startFrom={Math.round(p.in * tl.fps)} muted={!!p.muted} toneMapped={false} style={{ width: 1080, height: 1920 }} />
        </Sequence>
      ))}
      {tl.slots.map((s) => <SlotView key={s.id} s={s} clip={tl.clip} />)}
      <Captions captions={tl.captions} keywords={tl.keywords} ink={tl.slots.filter((s) => s.view === "mechanism").map((s): [number, number] => [s.start + 10, s.end + 6])} />
      {full && tl.slots.filter((s) => s.sfx).map((s) => <Sfx key={`sfx-${s.id}`} frame={s.sfx!.frame} name={s.sfx!.name} gain={s.sfx!.gain} />)}
    </AbsoluteFill>
  );
};
