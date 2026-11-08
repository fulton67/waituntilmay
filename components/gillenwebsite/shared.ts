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

// Dylan's roles on a release, each with the tracks it applies to (in track order), for the record view. A track's
// "(feat. ...)" is left off: the view names no one but Dylan.
export const trackTitle = (t: string) => t.replace(/\s*[([](?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi, "").trim();
export const dylanRoles = (r: Release) =>
  r.role.split(",").map((x) => x.trim()).filter(Boolean).map((role) => ({
    role,
    tracks: r.tracks.filter((t) => t.role.split(",").map((x) => x.trim()).includes(role)).map((t) => trackTitle(t.title)),
  }));

// capitals are typed into the string, never set by CSS (bible R7)
export const caps = (s: string) => s.toUpperCase();
