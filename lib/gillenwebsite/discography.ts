// Typed access to the scrape of dylansproduce.net (scripts/gillenwebsite/scrape.mjs writes both JSON files).
import discography from "./discography.json";
import aboutJson from "./about.json";

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
};

export const releases: Release[] = discography.releases;
export const about: { source: string; text: string; instagram: string; contact: string } = aboutJson;
