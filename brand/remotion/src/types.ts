// spec.json written by scripts/prepare.cjs from brand/edits/<slug>/result.json (times in seconds of the sped-up edit)
export type Caption = { text: string; from: number; to: number };
export type Overlay =
  | { name: "lower-third"; at: number; nameText?: string; role?: string }
  | { name: "device"; at: number; id: string; fill: { img: string; label: string; maker?: string } }
  | { name: string; at: number; [k: string]: unknown };
export type Hook = { text: string; at?: number; dur?: number };
export type Spec = {
  slug: string; speed: number; fps: number; durationInSeconds: number;
  captions: Caption[]; overlays: Overlay[]; end?: { src: string; at: number; dissolve: number };
  footage: string; audio: string;
  hook?: Hook;            // opening title, words pop on one by one (edit.json "remotion": { "hook": {...} })
  keywords?: string[];    // caption words drawn in the accent colour as he says them
};
export type ReelProps = { spec: Spec | null };
