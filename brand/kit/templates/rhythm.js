// Grid rhythm (POST_GRID §3). Plain ES module: the planner page and the Node checks import the same rules.
// A grid is newest-first, three columns: posts[0] is top left. Warnings only, never a block.
import { TILE_KIND } from "./tiles.js";

export const kindOf = (p) => (p && TILE_KIND[p.template]) || "photo";
const isText = (p) => kindOf(p) === "text";

export function rhythm(posts) {
  const w = [];
  const n = posts.length;
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    if (c < 2 && i + 1 < n && isText(posts[i]) && isText(posts[i + 1])) w.push({ rule: "text-side", at: [i, i + 1], msg: `Posts ${i + 1} and ${i + 2} are text tiles side by side (row ${r + 1}).` });
    if (i + 3 < n && isText(posts[i]) && isText(posts[i + 3])) w.push({ rule: "text-stacked", at: [i, i + 3], msg: `Posts ${i + 1} and ${i + 4} are text tiles stacked (column ${c + 1}).` });
  }
  // photo runs in posting order (the feed reads as a sequence): more than two photos without a text, diagram or graphic tile
  let run = [];
  for (let i = 0; i <= n; i++) {
    if (i < n && kindOf(posts[i]) === "photo") { run.push(i); continue; }
    if (run.length > 2) w.push({ rule: "photo-run", at: run.slice(), msg: `${run.length} photo tiles in a row (posts ${run[0] + 1}–${run.at(-1) + 1}); put a text, diagram or graphic tile between.` });
    run = [];
  }
  // no template more than 3 times in any 9 consecutive posts
  const seen = new Set();
  for (let s = 0; s + Math.min(9, n) <= n; s++) {
    const win = posts.slice(s, s + 9), count = {};
    win.forEach((p, k) => { (count[p.template] ||= []).push(s + k); });
    for (const [t, at] of Object.entries(count)) if (at.length > 3 && !seen.has(t + at.join())) { seen.add(t + at.join()); w.push({ rule: "template-repeat", at, msg: `${t} appears ${at.length} times in posts ${s + 1}–${s + win.length} (max 3 in any 9).` }); }
    if (n < 9) break;
  }
  return w;
}

// Fill 9: a pattern that passes the check, then topics poured into matching tiles.
// Topic lines: "product: Advanced LUMA Cream", "notice: Closed for Thanksgiving | 2026.11.27", "statement: …", "procedure: Fraxel | fact",
// "diagram: headline", "graphic: 17 | label", "quote: text | source", "before-after: <intake id>". A bare line is a statement.
export const PATTERN = ["product", "notice", "procedure", "graphic", "before-after", "diagram", "product", "statement", "ruled"];
export function fill9(topics, { products = [], pairs = [] } = {}) {
  const lines = String(topics || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const byT = {};
  for (const l of lines) { const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); const t = m && PATTERN.concat(["quote"]).includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "statement"; (byT[t] ||= []).push(m && t !== "statement" ? m[2] : (m ? m[2] : l)); }
  const take = (t) => (byT[t] || []).shift();
  const prodPhoto = (name) => { const k = String(name || "").toLowerCase(); const hit = products.find((p) => k && (p.what || "").toLowerCase().includes(k.split(" ").slice(-1)[0])) || products[0]; return hit && hit.src; };
  let pi = 0;
  const posts = PATTERN.map((t, i) => {
    const raw = take(t); const [a, b] = String(raw || "").split("|").map((x) => x.trim());
    const slots = {};
    if (t === "product") { if (a) slots.name = a; const ph = products[(pi++) % Math.max(1, products.length)]; slots.image = a ? prodPhoto(a) : ph && ph.src; if (b) slots.line = b; }
    if (t === "notice" && a) { slots.headline = a; if (b) slots.meta = b; }
    if (t === "statement" && a) slots.headline = a;
    if (t === "procedure" && a) { slots.name = a; if (b) slots.fact = b; }
    if (t === "diagram" && a) slots.headline = a;
    if (t === "graphic" && a) { slots.variant = "number"; slots.number = a; if (b) slots.label = b; }
    if (t === "before-after") { const p = pairs.find((x) => x.id === a) || pairs[0]; if (p) Object.assign(slots, p.slots); }
    if (t === "ruled") { const ph = products[(pi++) % Math.max(1, products.length)]; if (ph) slots.image = ph.src; }
    return { id: `p${Date.now().toString(36)}${i}`, template: t, slots, status: t === "before-after" ? "needs approval" : "draft" };
  });
  return posts;
}
