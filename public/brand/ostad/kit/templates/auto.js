// Rule-based Auto mode (BUILDER Phase C/D). A caption in, a post spec out. No model, no randomness: the same caption and
// seed always give the same spec, and "regenerate" is seed + 1. Shared by the builder (/brand/ostad/make) and brand/post.py.
// Rules (DECISIONS 47):
//   clean    NFKC (Instagram's maths-bold letters to ASCII), drop URLs, hashtags, @-handles at line ends, emoji
//   detect   bullets (lines led by a glyph or a number), date, time, event words, before/after, a quoted line,
//            a treatment name (TREATMENTS), paragraphs, the hook (first sentence)
//   choose   every template whose rule matches becomes a candidate, in this order:
//            announcement (date or time + an event word), list (3+ bullets), before-after, quote, procedure-card,
//            carousel (3+ paragraphs, cover + up to 5 bodies + end), single-statement (hook <= 14 words), story (9:16 only),
//            caption-card (always). seed picks candidates[seed % n]; the accent and photos rotate with the seed too.
import { TEMPLATES, ACCENTS } from "./engine.js";
import { ICON_KEYWORDS } from "./icons.js";

export const TREATMENTS = ["Ellacor", "Morpheus8", "Jeuveau", "Botox", "Dysport", "Daxxify", "Exomind", "Sculptra", "Radiesse", "Juvederm", "Restylane",
  "RHA", "Kybella", "Ultherapy", "Thermage", "Fraxel", "CO2 laser", "IPL", "BBL", "PRP", "microneedling", "chemical peel", "filler", "laser", "Mohs"];
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const RE_DATE = new RegExp(`\\b(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?,?\\s+)?(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, "i");
const RE_TIME = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i;
const RE_EVENT = /\b(event|live|join us|register|rsvp|webinar|open house|evening|today|tonight)\b/i;
const RE_BA = /\bbefore\s*(?:and|&|\/|\+)\s*after\b/i;
const RE_BULLET = /^\s*(?:[•●▪▫‣⁃∙·\-–—*✔✓✅☑🔹🔸🔷🔶➡️▶→]+|\d{1,2}[.)])\s*/u;
const RE_EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

// abbreviations (Dr., St., e.g.) are protected so "Ask Dr. Ostad" stays one sentence
const ABBR = /\b(Dr|Mr|Mrs|Ms|St|Ave|vs|No|e\.g|i\.e)\./g;
const sentences = (t) => (t.replace(ABBR, "$1\u2024").match(/[^.!?]+[.!?]*/g) || []).map((s) => s.replace(/\u2024/g, ".").trim()).filter(Boolean);
const words = (t) => t.split(/\s+/).filter(Boolean);
// fit: whole sentences/clauses first, then a word cut; never mid-word. Ellipsis only when words were dropped.
export function fit(t, max) {
  t = (t || "").replace(/\s+/g, " ").trim(); if (!max || t.length <= max) return t;
  const s = sentences(t); let o = "";
  for (const x of s) { if ((o + " " + x).trim().length > max) break; o = (o + " " + x).trim(); }
  if (o) return o;
  const cl = t.split(/(?<=[,;:—])\s+/)[0]; if (cl.length <= max && cl.length > max * 0.4) return cl.replace(/[,;:—]$/, "");
  const cut = t.slice(0, max - 1); return cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[,;:.\s]+$/, "") + "…";
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (line) => line.normalize("NFKC").replace(/https?:\/\/\S+/g, "").replace(RE_EMOJI, "").replace(/(^|\s)#[\wÀ-￿]+/g, "").replace(/\s+/g, " ").trim();

export function parse(caption) {
  const raw = String(caption || "").replace(/\r/g, "").split("\n");
  const lines = raw.map((l) => ({ bullet: RE_BULLET.test(l.normalize("NFKC")), text: clean(l.normalize("NFKC").replace(RE_BULLET, "")) })).filter((l) => l.text);
  const meta = {}; const body = [];
  for (const l of lines) {
    const m = l.text.match(/^(when|where|how|who|what)\s*:\s*(.+)$/i);
    if (m) meta[m[1].toLowerCase()] = m[2]; else body.push(l);
  }
  const bullets = body.filter((l) => l.bullet).map((l) => cap(l.text));
  const paras = body.filter((l) => !l.bullet && !/^(rx only|for us healthcare|us-[a-z]{3}-\d+)/i.test(l.text)).map((l) => l.text);
  const all = lines.map((l) => l.text).join(" \n ");
  const hook = sentences(paras[0] || bullets[0] || "")[0] || "";
  const date = (all.match(RE_DATE) || [""])[0]; const time = (all.match(RE_TIME) || [""])[0];
  const quote = (all.match(/[“"]([^”"]{20,220})[”"]/) || [])[1] || "";
  const treatment = TREATMENTS.find((t) => new RegExp(`\\b${t.replace(/\s/g, "\\s")}\\b`, "i").test(all)) || "";
  return { lines, bullets, paras, meta, hook, date, time, quote, treatment, event: RE_EVENT.test(all), beforeAfter: RE_BA.test(all), words: words(all).length };
}
export function iconFor(text, used = new Set()) {
  const t = text.toLowerCase(); let best = null, n = 0;
  for (const [name, kws] of Object.entries(ICON_KEYWORDS)) { const k = kws.filter((w) => t.includes(w)).length; if (k > n && !used.has(name)) { best = name; n = k; } }
  return best || ["check", "plus", "target", "heart", "leaf"].find((x) => !used.has(x)) || "check";
}
const sentenceWith = (p, word) => p.paras.flatMap(sentences).find((s) => s.toLowerCase().includes(word.toLowerCase())) || "";

export function candidates(p, size) {
  const c = [];
  if ((p.date || p.time) && p.event) c.push("announcement");
  if (p.bullets.length >= 3) c.push("list");
  if (p.beforeAfter) c.push("before-after");
  if (p.quote) c.push("quote");
  if (p.treatment) c.push("procedure-card");
  if (p.paras.length >= 3) c.push("carousel");
  if (words(p.hook).length <= 14 && p.hook) c.push("single-statement");
  if (size === "9x16") c.push("story");
  c.push("caption-card");
  return c;
}
const MAX = (id) => Object.fromEntries(TEMPLATES[id].slots.map((s) => [s.key, s.max]));

export function build(id, p, photos, k) {
  const ph = (i) => (photos.length ? photos[(k + i) % photos.length] : undefined);
  const m = MAX(id === "carousel" ? "carousel-body" : id); const rest = p.paras.slice(1).join(" ");
  const one = (template, slots) => [{ template, slots }];
  switch (id) {
    case "announcement": {
      const t = sentenceWith(p, "live") || sentenceWith(p, "event") || p.hook;
      return one(id, { image: ph(0), kicker: p.treatment ? `${p.treatment} live` : "Live event", title: fit(p.treatment ? `${p.treatment} virtual event` : t, m.title),
        date: fit((p.date || "").replace(/^\w+day,?\s+/i, ""), m.date) || fit(p.meta.when || "", m.date), time: fit(p.time.replace(/\s?(am|pm)/i, (x) => " " + x.trim().toUpperCase()), m.time),
        place: fit(p.meta.where || "Upper East Side office", m.place), cta: /link in (our )?bio/i.test(p.meta.how || p.lines.map((l) => l.text).join(" ")) ? "Register in bio" : "RSVP in bio" });
    }
    case "list": {
      const used = new Set(); const items = p.bullets.slice(0, 5).map((b) => { const icon = iconFor(b, used); used.add(icon); return { text: fit(b, TEMPLATES.list.slots.find((s) => s.key === "items").itemMax || 60), icon }; });
      return one(id, { title: fit(p.hook.replace(/[:?]$/, "") || "What to know", m.title), items, ground: k % 2 ? "dark" : "paper" });
    }
    case "before-after": return one(id, { before: ph(0), after: ph(1), title: fit(p.treatment || p.hook, m.title), note: fit(sentenceWith(p, "after") || rest, m.note), footnote: "Patient consented. Results vary.", ground: "paper" });
    case "quote": return one(id, { quote: fit(p.quote, m.quote), name: "Dr. Ariel Ostad", role: "Board-certified dermatologist, NYC", ground: ["paper", "dark", "image"][k % 3], image: ph(0) });
    case "procedure-card": return one(id, { image: ph(0), chip: /filler|sculptra|radiesse|juvederm|restylane|rha|jeuveau|botox|dysport|daxxify|kybella/i.test(p.treatment) ? "Injectable" : "Treatment",
      name: fit(p.treatment, m.name), what: fit(sentenceWith(p, p.treatment) || p.hook, m.what), icon: iconFor(p.treatment + " " + p.hook) });
    case "carousel": {
      const bodies = p.paras.slice(1, 6).map((para, i) => { const s = sentences(para); const head = s.length > 1 && s[0].length <= 50 ? s[0] : `Part ${i + 1}`;
        return { template: "carousel-body", slots: { heading: fit(head.replace(/[.:]$/, ""), m.heading), body: fit(s.length > 1 && s[0].length <= 50 ? s.slice(1).join(" ") : para, m.body), label: p.treatment ? fit(`${p.treatment} · ${i + 1}`, 30) : "", image: i % 2 ? undefined : ph(i + 1) } }; });
      return [{ template: "carousel-cover", slots: { kicker: p.treatment ? `+ ${p.treatment}` : "+ Guide", title: fit(p.hook, MAX("carousel-cover").title), subtitle: fit(sentences(p.paras[0] || "")[1] || "", MAX("carousel-cover").subtitle), ground: "image", image: ph(0) } },
        ...bodies, { template: "carousel-end", slots: { image: ph(bodies.length + 1), heading: "Book a consultation", cta: "Link in bio", handle: "@drarielostad", location: "Upper East Side, New York" } }];
    }
    case "single-statement": return one(id, { statement: fit(p.hook, MAX(id).statement), byline: "Dr. Ariel Ostad", ground: ["paper", "image", "dark"][k % 3], image: ph(0) });
    case "story": return one(id, { image: ph(0), label_left: p.treatment ? fit(p.treatment, 24) : "Skin / journal", label_right: "", headline: fit(p.hook, MAX(id).headline), caption: fit(rest || p.paras[0] || "", MAX(id).caption), cta: "Read more" });
    default: return one("caption-card", { text: fit(p.paras.join("\n\n") + (p.bullets.length ? "\n\n" + p.bullets.join("\n") : ""), MAX("caption-card").text), footer: "Dr. Ariel Ostad", ground: k % 2 ? "paper" : "dark" });
  }
}
// auto(caption, { size, seed, photos, template }) -> { spec, choice, candidates, parsed }
export function auto(caption, { size = "4x5", seed = 0, photos = [], template } = {}) {
  const p = parse(caption); const c = candidates(p, size); const choice = template && (c.includes(template) || TEMPLATES[template]) ? template : c[seed % c.length];
  const accents = Object.keys(ACCENTS).filter((a) => a !== "surface");
  const slides = build(choice, p, photos, seed).map((s) => ({ template: s.template, slots: Object.fromEntries(Object.entries(s.slots).filter(([, v]) => v !== undefined)) }));
  return { spec: { size, accent: accents[seed % accents.length], slides }, choice, candidates: c, parsed: { hook: p.hook, bullets: p.bullets.length, paras: p.paras.length, date: p.date, time: p.time, treatment: p.treatment, words: p.words } };
}
