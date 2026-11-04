// Small helpers shared by the three /gillenwebsite pages.
import type { Release } from "@/lib/gillenwebsite/discography";

export const pad2 = (n: number) => String(n).padStart(2, "0");
// SOURCES #09: viscosesyllabus.com's index numbers, three digits and a full stop ("001.")
export const no3 = (n: number) => `${String(n).padStart(3, "0")}.`;

// covers live at public/covers/<w>/<id>.avif|.jpg, w in r.coverSizes: 512, 1024, 2048, 3000, never above the
// original (scripts/gillenwebsite/cover-sizes.mjs). The smallest the cover has that is at least w px, else its largest.
export const coverWidth = (r: Release, w: number) => r.coverSizes.find((s) => s >= w) ?? r.coverSizes.at(-1)!;
export const coverFile = (r: Release, w: number, ext: "jpg" | "avif" = "jpg") =>
  !r.cover ? "" : `${r.cover.replace("/covers/", `/covers/${coverWidth(r, w)}/`)}.${ext}`;

// "Co-Producer, Writer" -> ["Co-Producer", "Writer"], for the release and every track on it
export const rolesOf = (r: Release) =>
  [...new Set([r.role, ...r.tracks.map((t) => t.role)].flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))];

// The other credits on a release as an index list: the credited artists first, then the collaborators by how much
// their role shapes the record (production, writing, mixing, mastering, playing, engineering, the rest), at most
// CREDITS_MAX with the count of the rest. One entry per name, its first role.
export const CREDITS_MAX = 12;
const RELEVANCE = [/^(artist|featured)/, /^producer|^co-producer|executive producer/, /writ|compos|lyric|songwriter/, /^mix/, /master/, /vocal|guitar|bass|drum|piano|keyboard|synth|string|percussion|program/, /engineer/];
export const creditList = (r: Release) => {
  const rank = (role: string) => { const k = RELEVANCE.findIndex((re) => re.test(role.toLowerCase())); return k < 0 ? RELEVANCE.length : k; };
  const artists = r.artist.split(/,|&/).map((x) => x.trim()).filter(Boolean).map((name, k) => ({ name, role: k ? "featured artist" : "artist" }));
  const seen = new Set(artists.map((a) => a.name.toLowerCase()));
  const others = r.collaborators.filter((c) => !seen.has(c.name.toLowerCase())).map((c) => ({ name: c.name, role: c.roles[0] ?? "" }));
  const all = [...artists, ...others.sort((a, b) => rank(a.role) - rank(b.role))];
  return { items: all.slice(0, CREDITS_MAX), more: Math.max(0, all.length - CREDITS_MAX), meta: [r.label, r.catno, String(r.year)].filter(Boolean).join(" · ") };
};
// Dylan's line under his name: his roles on the release, and the release
export const dylanLine = (r: Release) => `${caps(r.role)} · ${r.release}`;

// capitals are typed into the string, never set by CSS (bible R7)
export const caps = (s: string) => s.toUpperCase();
