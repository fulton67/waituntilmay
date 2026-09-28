import type { Area, Candidate } from "./types";

/**
 * Keyword buckets used to match a candidate's skills to an area. Each bucket lists words that
 * can appear in an area's name/description and words that can appear in a skill.
 */
const BUCKETS: { area: string[]; skill: string[] }[] = [
  {
    area: ["web", "site", "sites", "dev", "shopify", "3d", "frontend", "code"],
    skill: ["frontend", "front-end", "react", "next", "three", "r3f", "webgl", "typescript", "javascript", "css", "shopify", "creative dev", "motion", "interaction", "web"],
  },
  {
    area: ["event", "events", "production", "run-of-show", "vendors", "on-site", "show"],
    skill: ["event", "logistics", "vendor", "run-of-show", "production", "radio", "load-in", "venue"],
  },
  {
    area: ["short-form", "content", "clipping", "editing", "posting", "clips", "video"],
    skill: ["short-form", "editing", "edit", "clip", "hooks", "captions", "premiere", "capcut", "tiktok", "reels", "community", "video", "content"],
  },
  {
    area: ["brand", "design", "identity", "print", "apparel", "graphics", "merch"],
    skill: ["brand", "graphic", "design", "typography", "type", "print", "illustrator", "indesign", "figma", "screen printing", "riso", "identity"],
  },
  {
    area: ["ops", "research", "scheduling", "outreach", "decks", "strategy"],
    skill: ["research", "strategy", "writing", "ops", "scheduling", "outreach", "interview", "decks", "keynote", "airtable", "notion"],
  },
];

const norm = (s: string) => s.toLowerCase();

function bucketsFor(text: string, key: "area" | "skill") {
  const t = norm(text);
  const words = new Set(t.split(/[^a-z0-9-]+/).filter(Boolean));
  return BUCKETS.map((b, i) => (b[key].some((k) => (k.includes(" ") ? t.includes(k) : words.has(k) || t.includes(k))) ? i : -1)).filter(
    (i) => i >= 0,
  );
}

/** The area (kind "area") whose keywords best match the candidate's scored skills, or null. */
export function suggestArea(candidate: Pick<Candidate, "skills" | "resumeJson">, areas: Area[]): Area | null {
  const bucketScore = new Map<number, number>();
  for (const s of candidate.skills) {
    for (const b of bucketsFor(s.skill, "skill")) bucketScore.set(b, (bucketScore.get(b) ?? 0) + s.score);
  }
  for (const s of candidate.resumeJson?.skills ?? []) {
    for (const b of bucketsFor(s, "skill")) bucketScore.set(b, (bucketScore.get(b) ?? 0) + 10);
  }
  let best: Area | null = null;
  let bestScore = 0;
  for (const area of areas) {
    if (area.kind !== "area") continue;
    const score = bucketsFor(`${area.name} ${area.description}`, "area").reduce((sum, b) => sum + (bucketScore.get(b) ?? 0), 0);
    if (score > bestScore) {
      best = area;
      bestScore = score;
    }
  }
  return best;
}
