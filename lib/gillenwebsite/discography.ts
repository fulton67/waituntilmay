// Typed access to the scrape of dylansproduce.net (scripts/gillenwebsite/scrape.mjs writes both JSON files).
import discography from "./discography.json";
import aboutJson from "./about.json";
// back covers, catalogue numbers and collaborators (scripts/gillenwebsite/backs.mjs)
import sleevesJson from "./sleeves.json";

export type Track = { title: string; role: string };
export type Release = {
  id: string;
  year: number;
  artist: string;
  release: string;
  role: string;
  tracks: Track[];
  cover: string;
  coverSource: string;
  coverSizes: number[];
  // the back cover at public/covers/<w>/<id>-back.avif|.jpg for w in sizes; source "plain" when no back was found
  // and a plain sleeve back (the front's dominant colour and the catalogue number) was made instead
  back: { source: string; sizes: number[]; width: number; height: number; url?: string; page?: string; rgb?: number[] };
  catno: string | null;
  label: string | null;
  collaborators: { name: string; roles: string[] }[];
};

type Sleeve = Pick<Release, "back" | "catno" | "label" | "collaborators">;
const sleeves = sleevesJson as unknown as Record<string, Sleeve>;
export const releases: Release[] = discography.releases.map((r) => {
  const s = sleeves[r.id];
  return { ...r, back: s.back, catno: s.catno, label: s.label, collaborators: s.collaborators };
});
export const about: { source: string; text: string; instagram: string; contact: string } = aboutJson;
