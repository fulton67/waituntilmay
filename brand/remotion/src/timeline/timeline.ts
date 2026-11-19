// The reel timeline: one JSON per reel (brand/remotion/timelines/<reel>.json, schema in brand/remotion/REELS.md) lists every beat.
// A composition reads its starts, ends, strings, plate maps, layout and SFX from it instead of from TSX constants, so a change is an
// edit of the JSON (by hand or in the timeline view: python brand/scripts/timeline_view.py) and one `reel.py <reel>` rebuild.
// The same resolver exists in Python (brand/scripts/timeline_lib.py); keep the two in step.

export type Anchor = { offset?: number } & (
  | { word: number; text?: string; edge?: "start" | "end" } // index into the transcript's words; text re-finds it after a retime
  | { cue: string } // a named cue of the transcript (props.cues)
  | { piece: string; edge?: "start" | "end"; exact?: boolean } // a footage piece: its id, its line (Oct 14), or its sub-pieces <id>x/y/z (under-eye); exact = the id only
  | { beat: string; edge?: "start" | "end" } // another beat
  | { frame: number }
);
export type Lane = "footage" | "captions" | "titles" | "plates" | "objects" | "markup" | "sfx";
export type Label = { text: string; at?: Anchor; out?: Anchor; x?: number; y?: number; anchor?: "start" | "middle" | "end"; size?: number };
export type Beat = {
  id: string;
  lane: Lane;
  device?: string;
  start: Anchor;
  end: Anchor;
  text?: Record<string, unknown> & { labels?: Label[] };
  plate?: { id: string; map: [Anchor, number][]; crop?: { cx: number; cy: number; cw: number } } & Record<string, unknown>;
  source?: { clip?: string; still?: string; in?: number; out?: number; rate?: number } & Record<string, unknown>;
  layout?: Record<string, unknown>;
  events?: Record<string, Anchor>; // named moments inside the beat (strike, sweep, swap, ...)
  sfx?: { name: string; gain?: number; at?: Anchor }[];
  notes?: string;
};
export type Timeline = {
  schema: 1;
  reel: string;
  version: string;
  comp: { entry: string; id: string; props?: Record<string, unknown> };
  fps: number;
  transcript: string;
  master?: { lufs: number; tp: number; limiter?: boolean };
  beats: Beat[];
};
/** what the resolver needs of the reel's props.json */
export type Transcript = {
  words: { w: string; f: number; f1: number }[];
  cues: Record<string, number>;
  pieces: { id: string; line?: string; at: number; dur: number }[];
  durationInFrames: number;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

/** the word an anchor means: its index if the text still matches, else the nearest word with that text */
export const wordIndex = (a: { word: number; text?: string }, P: Transcript): number => {
  const ws = P.words;
  if (!a.text) return a.word;
  const t = norm(a.text);
  if (ws[a.word] && norm(ws[a.word].w) === t) return a.word;
  let best = -1;
  ws.forEach((w, i) => { if (norm(w.w) === t && (best < 0 || Math.abs(i - a.word) < Math.abs(best - a.word))) best = i; });
  if (best < 0) throw new Error(`timeline: word "${a.text}" (index ${a.word}) is not in the transcript`);
  return best;
};

export const resolve = (a: Anchor, tl: Timeline, P: Transcript, seen: string[] = []): number => {
  const off = a.offset ?? 0;
  if ("frame" in a) return a.frame + off;
  if ("word" in a) { const w = P.words[wordIndex(a, P)]; return (a.edge === "end" ? w.f1 : w.f) + off; }
  if ("cue" in a) {
    if (a.cue === "end") return P.durationInFrames + off;
    if (!(a.cue in P.cues)) throw new Error(`timeline: cue ${a.cue} missing`);
    return P.cues[a.cue] + off;
  }
  if ("piece" in a) {
    // by id, by its sub-pieces <id>x/y/z (under-eye), or by its line (Oct 14: one spoken line = several picture pieces)
    const ps = P.pieces.filter((x) => a.exact ? x.id === a.piece : x.id === a.piece || x.line === a.piece || (x.id.length === a.piece.length + 1 && x.id.startsWith(a.piece) && /[xyz]$/.test(x.id)));
    if (!ps.length) throw new Error(`timeline: piece ${a.piece} missing`);
    const l = ps[ps.length - 1];
    return (a.edge === "end" ? l.at + l.dur : ps[0].at) + off;
  }
  const key = `${a.beat}:${a.edge ?? "start"}`; // a beat's end may be its own start + n
  if (seen.includes(key)) throw new Error(`timeline: beat anchors loop through ${a.beat}`);
  const b = beat(tl, a.beat);
  return resolve(a.edge === "end" ? b.end : b.start, tl, P, [...seen, key]) + off;
};

export const beat = (tl: Timeline, id: string): Beat => {
  const b = tl.beats.find((x) => x.id === id);
  if (!b) throw new Error(`timeline: beat ${id} missing`);
  return b;
};
export const maybeBeat = (tl: Timeline, id: string): Beat | undefined => tl.beats.find((x) => x.id === id);
/** [start, end] of a beat in composition frames */
export const span = (tl: Timeline, id: string, P: Transcript): [number, number] => { const b = beat(tl, id); return [resolve(b.start, tl, P), resolve(b.end, tl, P)]; };
/** a named moment of a beat */
export const event = (tl: Timeline, id: string, name: string, P: Transcript): number => {
  const e = beat(tl, id).events?.[name];
  if (!e) throw new Error(`timeline: beat ${id} has no event ${name}`);
  return resolve(e, tl, P);
};
/** FloraPlate's map: [[composition frame, clip frame], ...] */
export const plateMap = (b: Beat, tl: Timeline, P: Transcript): [number, number][] => (b.plate?.map ?? []).map(([a, cf]) => [resolve(a, tl, P), cf]);
/** labels with their word-timed starts resolved (s / out in composition frames) */
export const labels = (b: Beat, tl: Timeline, P: Transcript) =>
  (b.text?.labels ?? []).map((l) => ({ ...l, s: l.at ? resolve(l.at, tl, P) : resolve(b.start, tl, P), out: l.out ? resolve(l.out, tl, P) : undefined }));
/** every SFX hit of the timeline: { at (seconds), name, gain } */
export const sfxHits = (tl: Timeline, P: Transcript, fps = tl.fps) =>
  tl.beats.flatMap((b) => (b.sfx ?? []).map((s) => ({ at: (resolve(s.at ?? b.start, tl, P) + 1) / fps, name: s.name, gain: s.gain })));
