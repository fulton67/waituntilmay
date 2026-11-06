// Bridge for brand/post.py (BUILDER Phase D). Reads a request JSON on stdin, builds the spec (Auto from a caption, or the
// template + slots given), renders it through scripts/render_posts.cjs (the same code the /api/brand/ostad/render route runs)
// and prints a receipt JSON. Local image paths become JPEG data URLs, as a drop in the builder does.
// request: { out, name, size, accent, seed, template?, slots?, caption?, spec?, photos?: [paths], base? }
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const TP = path.join(HERE, "..", "kit", "templates");
const require = createRequire(import.meta.url);
const { renderJobs } = require("./render_posts.cjs");
const A = await import(pathToFileURL(path.join(TP, "auto.js")).href);
const E = await import(pathToFileURL(path.join(TP, "engine.js")).href);
const req = JSON.parse(fs.readFileSync(0, "utf8"));
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const asImage = (v) => {
  if (typeof v !== "string" || /^(data:|\/brand\/ostad\/kit\/)/.test(v)) return v;
  const p = path.resolve(v); if (!fs.existsSync(p)) throw new Error(`image not found: ${v}`);
  return `data:${MIME[path.extname(p).toLowerCase()] || "image/jpeg"};base64,${fs.readFileSync(p).toString("base64")}`;
};
const photosDefault = JSON.parse(fs.readFileSync(path.join(TP, "photos", "photos.json"), "utf8")).map((r) => r.src);
let spec, choice = null, candidates = null;
if (req.spec) spec = req.spec;
else if (req.caption) {
  const r = A.auto(req.caption, { size: req.size || "4x5", seed: req.seed || 0, photos: (req.photos || []).length ? req.photos.map(asImage) : photosDefault, template: req.template });
  spec = r.spec; choice = r.choice; candidates = r.candidates; if (req.accent) spec.accent = req.accent;
} else {
  if (!E.TEMPLATES[req.template]) throw new Error(`unknown template ${req.template}; one of ${Object.keys(E.TEMPLATES).join(", ")}`);
  spec = { size: req.size || "4x5", accent: req.accent || "accent-1", slides: [{ template: req.template, slots: req.slots || {} }] };
}
for (const s of spec.slides) { const img = new Set((E.TEMPLATES[s.template]?.slots || []).filter((d) => d.type === "image").map((d) => d.key)); for (const [k, v] of Object.entries(s.slots || {})) if (img.has(k)) s.slots[k] = asImage(v); }
// a required image slot left empty would print the "image" placeholder: fill it from the kit photo pool (DECISIONS 50)
spec.slides.forEach((s, i) => { for (const d of E.TEMPLATES[s.template]?.slots || []) if (d.type === "image" && !d.optional && !s.slots?.[d.key]) { s.slots = s.slots || {}; s.slots[d.key] = photosDefault[(i + (req.seed || 0)) % photosDefault.length]; } });
fs.mkdirSync(req.out, { recursive: true });
const outPrefix = path.join(req.out, req.name || `ostad-${spec.slides[0].template}-${spec.size}`);
const [job] = await renderJobs([{ spec, out: outPrefix }], req.base ? { base: req.base } : {});
process.stdout.write(JSON.stringify({ files: job.files, pages: job.pages, fonts: job.fonts, warnings: job.warnings, errors: job.errors, choice, candidates, size: spec.size, accent: spec.accent, templates: spec.slides.map((s) => s.template) }));
