// Ostad post engine (BUILDER Phase B). Plain ES module, no dependencies. The same file renders the builder's live preview,
// the server PNG (Playwright opening render.html) and the CLI (brand/post.py), so all three produce the same layout.
// Templates are built only from kit/components classes, palette roles and the type roles; layouts cite composition/layouts.json.
import { ICONS } from "./icons.js";
export { ICONS };

export const SIZES = { "4x5": [1080, 1350], "1x1": [1080, 1080], "9x16": [1080, 1920] };
// accent -> fill + ink for pills, and the colour used as text on paper (kit/palette.json rule: accent-1 takes text ink;
// accent-2 and signal take background ink; accent-1 is not caption-safe as text on paper, so its text colour is accent-2)
export const ACCENTS = {
  "accent-1": { fill: "var(--ok-accent-1)", ink: "var(--ok-text)", text: "var(--ok-accent-2)" },
  "accent-2": { fill: "var(--ok-accent-2)", ink: "var(--ok-background)", text: "var(--ok-accent-2)" },
  signal: { fill: "var(--ok-signal)", ink: "var(--ok-background)", text: "var(--ok-signal)" },
  surface: { fill: "var(--ok-surface)", ink: "var(--ok-text)", text: "var(--ok-text)" },
};
// allowed sizes for autofit (judgment, DECISIONS): headline x1 / x0.8 / x0.64 (0.8 = the 1:1 / 4:5 ratio of the measured scale), caption x1 / x0.88
const STEP = { h: ["h", "h.8", "h.64"], hs: ["h.8", "h.64", "c"], hq: ["h.64", "c"], c: ["c", "c.88"] };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const icon = (n, cls = "") => `<span class="ok-icon ${cls}">${ICONS[n] || ICONS.plus}</span>`;
const bg = (s) => (s.image ? `<img class="ok-bg" src="${esc(s.image)}" alt="">` : `<div class="ok-ph"></div>`);
const T = (key, label, max, opt = {}) => ({ key, type: "text", label, max, ...opt });
const L = (key, label, max, opt = {}) => ({ key, type: "longtext", label, max, ...opt });
const IMG = (key = "image", label = "Image", opt = {}) => ({ key, type: "image", label, ...opt });
const ICON = (key = "icon", def = "syringe") => ({ key, type: "icon", label: "Icon", default: def, options: Object.keys(ICONS) });
const GROUND = (def, opts) => ({ key: "ground", type: "choice", label: "Ground", default: def, options: opts });
const fitAttr = (steps, overflow = "truncate") => `data-fit="${STEP[steps].join(",")}" data-overflow="${overflow}"`;
const count = (c) => (c.total > 1 ? `<span class="ok-count" data-count>${c.index} / ${c.total}</span>` : "");
const paras = (txt) => esc(txt).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

export const TEMPLATES = {
  "single-statement": {
    name: "Single statement", cluster: "C9", blocks: ["32197302", "31223791", "30248124"], sizes: ["4x5", "1x1", "9x16"],
    slots: [T("statement", "Statement", 90, { default: "Imperfection helps you connect with the work." }), T("byline", "Byline", 40, { optional: true, default: "Dr. Ariel Ostad" }),
      GROUND("paper", ["paper", "dark", "image"]), IMG("image", "Image", { optional: true })],
    build: (s, c) => {
      const img = s.ground === "image";
      return `<div class="ok t-single ${s.ground === "dark" ? "ok--dark" : ""} ${img ? "ok-ink-light" : ""}">${img ? bg(s) + '<div class="ok-scrim" style="height:100%"></div>' : ""}
      <div class="ok-safe"><div class="stmt ok-grow ok-fit"><h1 class="ok-h" ${fitAttr("h")}>${esc(s.statement)}</h1></div>
      ${s.byline ? `<p class="ok-l by">${esc(s.byline)}</p>` : ""}</div></div>`;
    },
  },
  quote: {
    name: "Quote", cluster: "C9", blocks: ["32197302"], sizes: ["4x5", "1x1", "9x16"],
    slots: [L("quote", "Quote", 220, { default: "Every treatment starts with understanding the anatomy, not the trend." }), T("name", "Name", 40, { default: "Dr. Ariel Ostad" }),
      T("role", "Role", 50, { optional: true, default: "Board-certified dermatologist, NYC" }), GROUND("paper", ["paper", "dark", "image"]), IMG("image", "Image", { optional: true })],
    build: (s, c) => {
      const img = s.ground === "image";
      return `<div class="ok t-quote ${s.ground === "dark" ? "ok--dark" : ""} ${img ? "ok-ink-light" : ""}">${img ? bg(s) + '<div class="ok-scrim" style="height:100%"></div>' : ""}
      <div class="ok-safe"><div class="mark" style="${img || s.ground === "dark" ? "" : "color:var(--acc-text)"}">&ldquo;</div>
      <div class="q ok-fit" style="max-height:58%"><p class="ok-h" ${fitAttr("hq")}>${esc(s.quote)}</p></div>
      <div class="who"><hr class="ok-rule" style="width:12cqw"><p class="ok-l">${esc(s.name)}</p>${s.role ? `<p class="ok-c" style="opacity:.75">${esc(s.role)}</p>` : ""}</div></div></div>`;
    },
  },
  "procedure-card": {
    name: "Procedure card", cluster: "C5", blocks: ["41432513", "41911984", "21587531", "12400773"], sizes: ["4x5", "1x1", "9x16"],
    slots: [IMG(), T("chip", "Chip", 22, { default: "Injectable" }), T("name", "Procedure", 40, { default: "Hyaluronic acid filler" }),
      T("what", "One line: what it does", 110, { default: "Restores lost volume and softens folds, with results the same day." }), ICON("icon", "syringe")],
    build: (s, c) => `<div class="ok t-procedure">${bg(s)}
      <div class="ok-glass card"><div class="top"><span class="ok-pill ok-pill--acc">${esc(s.chip)}</span>${icon(s.icon)}</div>
      <div class="name ok-fit"><h2 class="ok-h" ${fitAttr("hs")}>${esc(s.name)}</h2></div>
      <div class="what ok-fit"><p class="ok-c" ${fitAttr("c")}>${esc(s.what)}</p></div></div></div>`,
  },
  "carousel-cover": {
    name: "Carousel cover", cluster: "C6", blocks: ["27647159", "30940781"], sizes: ["4x5", "1x1", "9x16"], carousel: "cover",
    slots: [T("kicker", "Kicker pill", 24, { default: "+ Treatment guide" }), T("title", "Title", 70, { default: "What to expect from your first laser session" }),
      T("subtitle", "Subtitle", 90, { optional: true, default: "Five things Dr. Ostad tells every patient." }), GROUND("image", ["image", "paper", "dark"]), IMG("image", "Image", { optional: true })],
    build: (s, c) => {
      const img = s.ground === "image";
      return `<div class="ok t-cover ${s.ground === "dark" ? "ok--dark" : ""} ${img ? "ok-ink-light" : ""}">${img ? bg(s) + '<div class="ok-scrim"></div>' : ""}
      <div class="ok-safe"><div class="ok-between"><span class="ok-pill ok-pill--acc">${esc(s.kicker)}</span>${count(c)}</div>
      <div class="title ok-grow ok-fit"><h1 class="ok-h" ${fitAttr("h")}>${esc(s.title)}</h1></div>
      <div class="foot ok-between">${s.subtitle ? `<p class="ok-c" style="max-width:35.7cqw">${esc(s.subtitle)}</p>` : "<span></span>"}${icon("arrow")}</div></div></div>`;
    },
  },
  "carousel-body": {
    name: "Carousel body", cluster: "C7", blocks: ["2145281", "22772082"], sizes: ["4x5", "1x1", "9x16"], carousel: "body", paginate: "body",
    slots: [T("heading", "Heading", 50, { default: "Before your session" }),
      L("body", "Body", 1200, { default: "Skip retinoids and exfoliating acids for five days. Arrive with clean skin, no makeup. Tell us about any recent sun exposure, cold sores or new medication, because each changes the settings we choose." }),
      T("label", "Vertical label", 30, { optional: true, default: "Laser · step 1" }), IMG("image", "Image", { optional: true })],
    build: (s, c) => {
      const img = !!s.image;
      return `<div class="ok t-body ${img ? "" : "is-paper"}">${img ? bg(s) : ""}
      <div class="ok-glass ok-glass--band band"><span class="idx" style="color:var(--acc-text)">${String(c.index).padStart(2, "0")}</span>
      <h2 class="ok-h" style="font-size:calc(var(--ok-headline-size)*.64)">${esc(s.heading)}${c.part > 1 ? " (cont.)" : ""}</h2>
      <div class="body ok-fit"><div class="ok-c" data-text ${fitAttr("c", "paginate")}>${paras(c.chunk ?? s.body)}</div></div>
      ${count(c) ? `<div class="ok-between">${count(c)}</div>` : ""}</div>
      ${s.label ? `<span class="ok-vert ${img ? "ok-ink-light" : ""}" style="font-size:var(--ok-label-size)">${esc(s.label)}</span>` : ""}</div>`;
    },
  },
  "carousel-end": {
    name: "Carousel end", cluster: "C8", blocks: ["41911984"], sizes: ["4x5", "1x1", "9x16"], carousel: "end",
    slots: [IMG(), T("heading", "Heading", 40, { default: "Book a consultation" }), T("cta", "Button", 24, { default: "Link in bio" }),
      T("handle", "Handle", 30, { default: "@drarielostad" }), T("location", "Location", 40, { optional: true, default: "Upper East Side, New York" }), T("phone", "Phone", 24, { optional: true })],
    build: (s, c) => `<div class="ok t-end">${bg(s)}
      <div class="ok-glass card"><div class="ok-fit" style="max-height:30cqw;width:100%"><h2 class="ok-h" style="font-size:calc(var(--ok-headline-size)*.64)" ${fitAttr("hq")}>${esc(s.heading)}</h2></div>
      <span class="ok-pill ok-pill--dark">${esc(s.cta)}</span>
      <div class="meta"><p class="ok-l">${esc(s.handle)}</p>${s.location ? `<div class="ok-row">${icon("location")}<p class="ok-c">${esc(s.location)}</p></div>` : ""}
      ${s.phone ? `<div class="ok-row">${icon("phone")}<p class="ok-c">${esc(s.phone)}</p></div>` : ""}</div></div>
      <div class="ok-footer" style="color:var(--ok-background)">${count(c)}</div></div>`,
  },
  story: {
    name: "Story", cluster: "C2", blocks: ["14664481", "16453124", "13828406"], sizes: ["9x16", "4x5", "1x1"],
    slots: [IMG(), T("label_left", "Corner label", 24, { default: "Skin / journal" }), T("label_right", "Corner label right", 24, { optional: true, default: "No. 04" }),
      T("headline", "Headline", 60, { default: "Glow comes from barrier repair" }), T("caption", "Caption", 140, { optional: true, default: "Three habits that protect the skin barrier, from the clinic." }),
      T("cta", "Button", 20, { optional: true, default: "Read more" })],
    build: (s, c) => `<div class="ok t-story ok-ink-light">${bg(s)}<div class="ok-scrim ok-scrim--top"></div><div class="ok-scrim"></div>
      <div class="progress-wrap"><div class="ok-progress"><i class="on"></i><i></i><i></i><i></i></div></div>
      <div class="ok-safe"><div class="labels"><span class="ok-meta ok-meta--slash">${esc(s.label_left)}</span><span class="ok-meta">${esc(s.label_right || "")}</span></div>
      <div class="mid"><div class="ok-fit" style="max-height:40cqh"><h1 class="ok-h" ${fitAttr("h")}>${esc(s.headline)}</h1></div>
      ${s.caption ? `<div class="ok-fit" style="max-height:18cqh;max-width:60cqw"><p class="ok-c" ${fitAttr("c")}>${esc(s.caption)}</p></div>` : ""}
      ${s.cta ? `<span class="ok-pill ok-pill--acc" style="justify-self:start">${esc(s.cta)}</span>` : ""}</div></div></div>`,
  },
  "before-after": {
    name: "Before / after", cluster: "C3", blocks: ["52386109"], sizes: ["4x5", "1x1", "9x16"],
    slots: [IMG("before", "Before"), IMG("after", "After"), T("title", "Treatment", 40, { default: "Under-eye filler" }), T("note", "Note", 90, { optional: true, default: "One session, photographed at two weeks." }),
      T("footnote", "Footnote", 60, { default: "Patient consented. Results vary." }), GROUND("paper", ["paper", "dark"])],
    build: (s, c) => `<div class="ok t-ba ${s.ground === "dark" ? "ok--dark" : ""}"><div class="ok-safe">
      <div class="head"><div class="ok-fit" style="max-height:20cqw"><h1 class="ok-h" ${fitAttr("hs")}>${esc(s.title)}</h1></div>${s.note ? `<p class="ok-c">${esc(s.note)}</p>` : ""}</div>
      <div class="pair"><div class="side">${s.before ? `<img class="ok-treated" src="${esc(s.before)}" alt="">` : ""}<span class="ok-pill">Before</span></div>
      <div class="side">${s.after ? `<img class="ok-treated" src="${esc(s.after)}" alt="">` : ""}<span class="ok-pill ok-pill--acc">After</span></div></div>
      <p class="ok-meta" style="opacity:.75">${esc(s.footnote)}</p></div></div>`,
  },
  list: {
    name: "List", cluster: "C1", blocks: ["33635746", "36747221", "31223791"], sizes: ["4x5", "1x1", "9x16"],
    slots: [T("title", "Title", 50, { default: "What laser resurfacing treats" }),
      { key: "items", type: "list", label: "Items", min: 3, max: 5, itemMax: 60, default: [{ text: "Fine lines around the eyes", icon: "lines" }, { text: "Sun damage and uneven tone", icon: "sun" }, { text: "Acne scarring", icon: "skin" }, { text: "Enlarged pores", icon: "target" }] },
      GROUND("paper", ["paper", "dark"])],
    build: (s, c) => `<div class="ok t-list ${s.ground === "dark" ? "ok--dark" : ""}"><div class="ok-safe">
      <div class="ok-fit" style="max-height:30%"><h1 class="ok-h" ${fitAttr("hs")}>${esc(s.title)}</h1></div>
      <div class="items ok-fit"><div ${fitAttr("c")}>${(s.items || []).slice(0, 5).map((it) => `<div class="item">${icon(it.icon || "check")}<p class="ok-c" style="font-size:inherit">${esc(it.text)}</p></div>`).join("")}</div></div>
      <div class="ok-between"><p class="ok-l">Dr. Ariel Ostad</p>${count(c)}</div></div></div>`,
  },
  announcement: {
    name: "Announcement", cluster: "C4", blocks: ["47483050"], sizes: ["4x5", "1x1", "9x16"],
    slots: [IMG(), T("kicker", "Kicker pill", 24, { default: "Live event" }), T("title", "Title", 50, { default: "Fall skincare evening" }), T("date", "Date", 24, { default: "Oct 20" }),
      T("time", "Time", 24, { optional: true, default: "5:30 PM" }), T("place", "Place", 50, { default: "Upper East Side office" }), T("cta", "Button", 24, { default: "RSVP in bio" })],
    build: (s, c) => `<div class="ok t-ann"><div class="photo">${bg(s)}</div><div class="ok-safe">
      <span class="ok-pill ok-pill--acc" style="align-self:flex-start">${esc(s.kicker)}</span>
      <div class="ok-fit" style="max-height:18%"><h1 class="ok-h" style="font-size:calc(var(--ok-headline-size)*.64)" ${fitAttr("hq")}>${esc(s.title)}</h1></div>
      <div class="date" style="color:var(--acc-text)">${esc(s.date)}</div>
      <div class="details">${s.time ? `<div class="ok-row">${icon("clock")}<p class="ok-c">${esc(s.time)}</p></div>` : ""}<div class="ok-row">${icon("location")}<p class="ok-c">${esc(s.place)}</p></div></div>
      <div class="cta"><span class="ok-box">${esc(s.cta)}</span>${icon("arrow")}</div></div></div>`,
  },
  "caption-card": {
    name: "Caption card", cluster: "C0", blocks: ["27454113", "27454118"], sizes: ["4x5", "1x1", "9x16"], paginate: "text",
    slots: [L("text", "Text", 3000, { default: "Exomind is a new approach to mental wellness. It uses transcranial magnetic stimulation, a non-invasive technology, to support mood and focus.\n\nSessions take about twenty minutes and need no downtime. Dr. Ostad offers a consultation first, to see whether it suits you." }),
      T("footer", "Footer", 40, { default: "Dr. Ariel Ostad / Wellness" }), GROUND("dark", ["dark", "paper"])],
    build: (s, c) => `<div class="ok t-caption ${s.ground === "paper" ? "" : "ok--dark"}"><div class="ok-safe">
      <div class="text ok-fit"><div class="ok-c" data-text ${fitAttr("c", "paginate")}>${paras(c.chunk ?? s.text)}</div></div></div>
      <div class="ok-footer"><span class="ok-meta" style="text-transform:none">${esc(s.footer)}</span>${c.total > 1 ? `<span class="ok-count" data-count>${c.index} / ${c.total}</span>` : ""}</div></div>`,
  },
};

export function slotsSchema(id) {
  const t = TEMPLATES[id];
  return { template: id, name: t.name, cluster: t.cluster, board_blocks: t.blocks, sizes: t.sizes, paginates: t.paginate || null, carousel_role: t.carousel || null,
    slots: t.slots.map(({ key, type, label, max, optional, default: d, options, min, itemMax }) => ({ key, type, label, max, optional: !!optional, default: d, options, min, itemMax })) };
}
export function defaults(id) { const o = {}; for (const s of TEMPLATES[id].slots) if (s.default !== undefined) o[s.key] = JSON.parse(JSON.stringify(s.default)); return o; }

// ---------------- layout: mount, fit, paginate ----------------
function sizePx(page) {
  const probe = (cls) => { const e = document.createElement("span"); e.className = cls; e.textContent = "x"; e.style.position = "absolute"; e.style.visibility = "hidden"; page.appendChild(e); const v = parseFloat(getComputedStyle(e).fontSize); e.remove(); return v; };
  return { h: probe("ok-h"), c: probe("ok-c") };
}
const stepPx = (tok, px) => { const [r, m] = [tok[0], tok.slice(1)]; return px[r] * (m ? parseFloat(m) : 1); };
function overflows(el) {
  const box = el.closest(".ok-fit") || el.parentElement;
  return el.offsetHeight > box.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 || box.scrollWidth > box.clientWidth + 1;
}
function fitEl(el, px) { for (const tok of el.dataset.fit.split(",")) { el.style.fontSize = stepPx(tok, px) + "px"; if (!overflows(el)) return true; } return false; }
function truncate(el, warnings, label) {
  const words = el.textContent.split(/\s+/).filter(Boolean); let lo = 0, hi = words.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); el.textContent = words.slice(0, mid).join(" ") + "…"; if (overflows(el)) hi = mid - 1; else lo = mid; }
  el.textContent = words.slice(0, lo).join(" ") + (lo < words.length ? "…" : "");
  warnings.push(`${label}: text truncated to ${lo} of ${words.length} words`);
}
function makePage(id, slots, ctx, opts) {
  const html = TEMPLATES[id].build(slots, ctx);
  const tpl = document.createElement("template"); tpl.innerHTML = html.trim(); const page = tpl.content.firstElementChild;
  page.classList.add(`ok--${opts.size}`, "ok--svgtreat"); const a = ACCENTS[opts.accent] || ACCENTS["accent-1"];
  page.style.setProperty("--acc", a.fill); page.style.setProperty("--acc-ink", a.ink); page.style.setProperty("--acc-text", a.text);
  page.dataset.template = id; return page;
}
async function waitImages(page) { await Promise.all([...page.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))); }

// render one template (paginating if it overflows) into container; returns { pages, warnings }
async function renderOne(container, id, slots, opts, idx) {
  const t = TEMPLATES[id], warnings = [], pages = [];
  const textKey = t.paginate; let tokens = textKey ? String(slots[textKey] || "").replace(/\n{2,}/g, " ¶ ").split(/\s+/).filter(Boolean) : null;
  let part = 1;
  while (true) {
    const ctx = { index: idx.next, total: idx.total, part, chunk: tokens ? tokens.join(" ").replace(/ ?¶ ?/g, "\n\n") : undefined };
    const page = makePage(id, slots, ctx, opts); container.appendChild(page); await waitImages(page);
    const px = sizePx(page); let rest = null;
    for (const el of page.querySelectorAll("[data-fit]")) {
      if (fitEl(el, px)) continue;
      if (el.dataset.overflow === "paginate" && tokens) {
        el.style.fontSize = stepPx(el.dataset.fit.split(",").at(-1), px) + "px";
        let lo = 1, hi = tokens.length;  // largest prefix that fits
        const setN = (n) => { el.innerHTML = paras(tokens.slice(0, n).join(" ").replace(/ ?¶ ?/g, "\n\n")); };
        while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); setN(mid); if (overflows(el)) hi = mid - 1; else lo = mid; }
        setN(lo); rest = tokens.slice(lo); while (rest[0] === "¶") rest.shift();
      } else truncate(el, warnings, `${id} ${el.closest("[class]").className.split(" ")[0]}`);
    }
    pages.push(page); idx.next++;
    if (!rest || !rest.length) break;
    tokens = rest; part++;
    if (part > 12) { warnings.push(`${id}: stopped at 12 pages`); break; }
  }
  return { pages, warnings };
}

async function fontsState() {
  // Typekit faces load lazily; ask for the three the templates use, then check (fails over to fallbacks after 6 s)
  const want = ['600 40px "neue-haas-grotesk-display"', '500 40px "neue-haas-grotesk-display"', '400 20px "neue-haas-grotesk-text"'];
  await Promise.race([Promise.all(want.map((f) => document.fonts.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 6000))]);
  await document.fonts.ready;
  const ok = document.fonts.check('600 40px "neue-haas-grotesk-display"') && document.fonts.check('500 40px "neue-haas-grotesk-display"');
  return ok ? "adobe" : "fallback";
}

// spec: { size, accent, slides: [{ template, slots }] }  (a single post is one slide)
export async function render(container, spec) {
  container.innerHTML = "";
  const size = SIZES[spec.size] ? spec.size : "4x5";
  const fonts = await fontsState();
  // first pass with a provisional total; paginated slides change the count, so render twice when needed
  let total = spec.slides.length, out;
  for (let pass = 0; pass < 2; pass++) {
    container.innerHTML = ""; const idx = { next: 1, total }; out = { pages: [], warnings: [] };
    for (const sl of spec.slides) {
      const slots = { ...defaults(sl.template), ...(sl.slots || {}) };
      const r = await renderOne(container, sl.template, slots, { size, accent: spec.accent }, idx); out.pages.push(...r.pages); out.warnings.push(...r.warnings);
    }
    if (out.pages.length === total) break; total = out.pages.length;
  }
  if (spec.slides.length === 1 && out.pages.length === 1) out.pages[0].querySelectorAll("[data-count]").forEach((e) => e.remove());
  if (fonts !== "adobe" && spec.labelFallback !== false) out.pages.forEach((p) => p.insertAdjacentHTML("beforeend", '<span class="ok-fallback">FALLBACK FONTS</span>'));
  return { ...out, fonts, size, w: SIZES[size][0], h: SIZES[size][1] };
}
