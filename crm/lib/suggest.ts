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
    area: ["short-form", "content", "clipping", "editing", "posting", "clips", "video", "streams", "moments"],
    skill: ["short-form", "editing", "edit", "clip", "hooks", "captions", "premiere", "capcut", "tiktok", "reels", "community", "video", "content"],
  },
  {
    area: ["brand", "design", "identity", "print", "apparel", "graphics", "merch"],
    skill: ["brand", "graphic", "design", "typography", "type", "print", "illustrator", "indesign", "figma", "screen printing", "riso", "identity"],
  },
  {
    area: ["ops", "research", "scheduling", "outreach", "decks", "strategy", "tabling", "flyering", "street"],
    skill: ["research", "strategy", "writing", "ops", "scheduling", "outreach", "interview", "decks", "keynote", "airtable", "notion"],
  },
];

const norm = (s: string) => s.toLowerCase();

export function bucketsFor(text: string, key: "area" | "skill") {
  const t = norm(text);
  const words = new Set(t.split(/[^a-z0-9-]+/).filter(Boolean));
  return BUCKETS.map((b, i) => (b[key].some((k) => (k.includes(" ") ? t.includes(k) : words.has(k) || t.includes(k))) ? i : -1)).filter(
    (i) => i >= 0,
  );
}

/** Sum of the candidate's skill scores (1–10) whose names match the area's keywords. */
export function matchScore(candidate: Pick<Candidate, "skills" | "resumeJson">, area: Pick<Area, "name" | "description">): number {
  const areaBuckets = new Set(bucketsFor(`${area.name} ${area.description}`, "area"));
  if (!areaBuckets.size) return 0;
  let score = 0;
  for (const s of candidate.skills) {
    if (bucketsFor(s.skill, "skill").some((b) => areaBuckets.has(b))) score += s.score;
  }
  for (const s of candidate.resumeJson?.skills ?? []) {
    if (bucketsFor(s, "skill").some((b) => areaBuckets.has(b))) score += 1;
  }
  return score;
}

/**
 * The area (kind "area") that best matches the candidate's skills, or null. `smallOnly` limits
 * it to small jobs — used for benched candidates.
 */
export function suggestArea(candidate: Pick<Candidate, "skills" | "resumeJson">, areas: Area[], smallOnly = false): Area | null {
  let best: Area | null = null;
  let bestScore = 0;
  for (const area of areas) {
    if (area.kind !== "area" || (smallOnly && area.level !== "small")) continue;
    const score = matchScore(candidate, area);
    if (score > bestScore) {
      best = area;
      bestScore = score;
    }
  }
  return best;
}
