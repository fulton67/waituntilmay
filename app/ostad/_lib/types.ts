// Compact shapes written by research/ostad/scripts/build_dashboard_data.py into app/ostad/data/.

export type Video = {
  id: string;
  p: "tiktok" | "instagram" | "youtube";
  src: "search" | "benchmark" | "own";
  q: string; // query or hashtag
  url: string;
  h: string; // creator handle
  fol: number | null;
  d: string | null; // posted date
  days: number | null;
  dur: number | null;
  cap: string;
  title: string;
  hook: string;
  tr: string; // transcript (top 80 only)
  v: number;
  l: number;
  c: number;
  s: number;
  sv: number;
  er: number;
  vpd: number;
  os: number; // outlier score
  g: string; // genre
  f: string; // format
  ht: string; // hook type
  tags: string[];
  rel: boolean; // ostad_relevant
  win: boolean;
  why: string;
  notes: string;
};

export type Row = { key: string; n: number; medViews: number; medOutlier: number; medEr: number; winShare: number };
export type Analysis = {
  totals: { videos: number; byPlatform: Record<string, number>; bySource: Record<string, number>; from: string; to: string; costUsd: number };
  medians: Record<string, { views: number; er: number; outlier: number }>;
  tables: { genre: Row[]; format: Row[]; hook: Row[] };
  byPlatform: { genre: Record<string, Row[]> };
};

export type OwnPost = {
  id: string;
  p: string;
  url: string;
  d: string | null;
  cap: string;
  v: number | null;
  l: number;
  c: number;
  kind: string;
  g?: string;
};
export type Own = {
  baseline: Record<string, { posts: number; videos_with_views: number; median_views: number | null; median_likes: number | null }>;
  niche: Record<string, { median_views: number }>;
  posts: OwnPost[];
};

export type Ref = { id: string; why: string };
export type Slot = {
  n: number;
  day: string; // ISO date
  dow: string;
  pillar: string;
  genre: string;
  format: string;
  title: string;
  hook_type: string;
  angle: string;
  service: string;
  refs: Ref[];
  effort: string;
  ostad_version: string;
  batch?: string;
};
export type Plan = { pillars: { name: string; why: string }[]; slots: Slot[]; backups: Slot[]; backlog: string[]; batches: { name: string; slots: number[]; note: string }[] };

export type Question = { q: string; likes: number; replies: number; from: string; url: string; topic: string; service: string; covered: string };
export type Ad = { advertiser: string; headline: string; body: string; start: string | null; days: number | null; platforms: string[]; link: string; term: string; page_url?: string };

export const fmt = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return String(Math.round(n));
};
export const pct = (x: number) => (x * 100).toFixed(1) + "%";
export const PLAT: Record<string, string> = { tiktok: "TT", instagram: "IG", youtube: "YT" };
