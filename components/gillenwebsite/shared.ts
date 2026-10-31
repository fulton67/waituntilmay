// Small helpers shared by the three /gillenwebsite pages.
import type { Release } from "@/lib/gillenwebsite/discography";

export const pad2 = (n: number) => String(n).padStart(2, "0");
// SOURCES #09: viscosesyllabus.com's index numbers, three digits and a full stop ("001.")
export const no3 = (n: number) => `${String(n).padStart(3, "0")}.`;

// covers live at public/covers/<id>.jpg (2048) with 1080 and 512 copies beside them (scripts/gillenwebsite/covers.mjs)
export const coverAt = (r: Release, size: 2048 | 1080 | 512) =>
  !r.cover ? "" : size === 2048 ? r.cover : r.cover.replace("/covers/", `/covers/${size}/`);

// "Co-Producer, Writer" -> ["Co-Producer", "Writer"], for the release and every track on it
export const rolesOf = (r: Release) =>
  [...new Set([r.role, ...r.tracks.map((t) => t.role)].flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))];

// capitals are typed into the string, never set by CSS (bible R7)
export const caps = (s: string) => s.toUpperCase();
