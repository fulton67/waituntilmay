// Compact shapes written by research/ostad/scripts/build_dashboard_data.py into app/ostad/data/.
// Transcripts are not bundled: they are fetched from /ostad/tr/{id}.txt when a panel opens.

export type Video = {
  id: string;
  p: "tiktok" | "instagram" | "youtube";
  src: "search" | "benchmark" | "own";
  url: string;
  emb: string | null; // embeddable player URL, null = link out only (checked at build time)
  h: string; // creator handle
  fol: number | null;
  d: string | null; // posted date
  dur: number | null;
  cap: string;
  title: string;
  v: number; // views
  l: number;
  c: number;
  s: number;
  sv: number;
  vpd: number; // views/day
  x: number; // × the creator's usual
  sc: number; // saves+comments per 1k views
  win: boolean;
  g: string; // genre
  f: string; // format
  ht: string; // hook type
  subj: string;
  claim: string;
  tone: string[];
  spk: string; // speaker
  mk: boolean; // makeable by Ostad
  mkn: string | null;
  ar: string | null; // audience reaction
  th: string; // theme slug
  ol: string | null; // opening line
  ts: string; // transcript status
  tw: number; // transcript words
};

export type Block = { t: "h2" | "h3" | "p" | "li" | "quote" | "fig"; s: string; theme?: string };

export type Theme = {
  slug: string;
  name: string;
  short: string; // one-line description
  n: number;
  share: number;
  winShare: number;
  medX: number;
  mkShare: number;
  mkN: number;
  examples: string[];
  says: string;
  blocks: Block[]; // themes/{slug}.md, parsed
};

export type Care = {
  rank: number;
  q: string;
  n: number;
  medX: number;
  who: string; // who usually answers
  ostad: string; // does he have anything on it
  note: string;
  ids: string[];
};

export type Ref = { id: string; ol: string | null };
export type Slot = {
  n: number | string;
  day: string | null;
  dow: string | null;
  theme: string;
  title: string;
  claim: string;
  open: string;
  beats: { open: string; middle: string; close: string };
  tone: string[];
  refs: Ref[];
  why: string;
  service: string;
  batch: string;
};
export type Plan = {
  slots: Slot[];
  backups: Slot[];
  backlog: { title: string; theme: string }[];
  batches: { key: string; name: string; note: string; slots: (number | string)[] }[];
};

export type Mix = { key: string; his: number; win: number }[];
export type Him = { medians: Record<string, { his: number | null; niche: number | null; posts: number }>; genre: Mix; tone: Mix; hisN: number; winN: number };

export type Ad = { advertiser: string; headline: string; body: string; start: string | null; days: number | null; platforms: string[]; link: string; term: string; page_url?: string | null };

export const fmt = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return String(Math.round(n));
};
export const times = (x: number) => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2)) + "× usual";
export const PLAT: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" };
