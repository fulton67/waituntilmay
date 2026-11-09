import type { SkinCardSpec } from "./components/SkinCard";
import type { DiagramPhases } from "./components/Explainers";
import type { TreatPhases } from "./components/Ro";
// spec.json written by scripts/prepare.cjs from brand/edits/<slug>/result.json (times in seconds of the sped-up edit)
export type Caption = { text: string; from: number; to: number };
export type Overlay =
  | { name: "lower-third"; at: number; nameText?: string; role?: string }
  | { name: "device"; at: number; id: string; fill: { img: string; label: string; maker?: string } }
  | { name: string; at: number; [k: string]: unknown };
export type Hook = { text: string; at?: number; dur?: number; strike?: string };
export type Spec = {
  slug: string; speed: number; fps: number; durationInSeconds: number;
  captions: Caption[]; overlays: Overlay[]; end?: { src: string; at: number; dissolve: number; glass?: boolean; lines?: string[]; handle?: string };
  footage: string; audio: string;
  hook?: Hook;            // opening title on glass (edit.json "remotion": { "hook": {...} }); lines split after ?.!: or on 

  cards?: SkinCardSpec[]; // image cards (condition photo, rings on the red areas, before -> after), components/SkinCard
  graphics?: { kind: "rx" | "routine" | "treatment" | "pills" | "microbes" | "diagram"; at: number; dur: number; label?: string; phases?: DiagramPhases; treat?: TreatPhases }[]; // explainers: components/Ro (calm cards, v3) and components/Explainers (drawn, v2)
  keywords?: string[];    // caption words set in the brand light blue as he says them
};
export type ReelProps = { spec: Spec | null };
