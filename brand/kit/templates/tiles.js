// Ostad feed tiles (POST_GRID). One skeleton for every post: a meta slot top left "(…)", a label slot bottom left, and on text
// tiles one large headline bottom left. Positions sit inside the centred 1080 x 1080 crop on every canvas (--crop in tile.css),
// so the profile grid never cuts them. Styles: kit/templates/tile.css (sizes are token multiples, nothing new).
// References (brand/refs/grid/): café feed grid (skeleton, notice, clock), Seed radial capsule (diagram radial), Roam skin poster
// (ruled), green glass ingredient cards (product ingredients), profile callouts (diagram callouts), Seed feed (graphic ring).
import { ICONS } from "./icons.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const br = (s) => esc(s).replace(/\n/g, "<br>");
const bold = (s) => br(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); // "1 Serum. **5 Benefits.**"
const T = (key, label, max, opt = {}) => ({ key, type: "text", label, max, ...opt });
const L = (key, label, max, opt = {}) => ({ key, type: "longtext", label, max, ...opt });
const IMG = (key = "image", label = "Image", opt = {}) => ({ key, type: "image", label, ...opt });
const C = (key, label, def, options) => ({ key, type: "choice", label, default: def, options });
const P = (f) => `/brand/ostad/kit/templates/photos/${f}.jpg`;
const fit = (steps) => `data-fit="${steps}" data-overflow="truncate"`;

// meta: "(Mohs)" — parentheses added when missing; one per line
export const metaHTML = (m, cls = "") => (m ? `<div class="tl-meta ${cls}">${String(m).split("\n").filter(Boolean).map((l) => `<span>${esc(/^\(.*\)$/.test(l.trim()) ? l.trim() : `(${l.trim()})`)}</span>`).join("")}</div>` : "");
const label = (s, cls = "") => (s ? `<p class="tl-label ${cls}">${br(s)}</p>` : "");
const img = (src, cls = "ok-bg") => (src ? `<img class="${cls}" src="${esc(src)}" alt="">` : `<div class="ok-ph"></div>`);
const ground = (g) => (g === "dark" ? "ok--dark" : g === "white" ? "tl--white" : "");
const yes = (v) => String(v || "").toLowerCase() === "yes";

// thin line drawings of the product shapes in the line (reference 3), stroke = the kit hairline
const DRAW = {
  dropper: { vb: "0 0 100 220", d: "M43 6h14a4 4 0 0 1 4 4v26H39V10a4 4 0 0 1 4-4zM34 36h32v20H34zM28 56h44a6 6 0 0 1 6 6v142a10 10 0 0 1-10 10H32a10 10 0 0 1-10-10V62a6 6 0 0 1 6-6zM22 110h56M22 170h56" },
  jar: { vb: "0 0 140 130", d: "M14 8h112a4 4 0 0 1 4 4v26H10V12a4 4 0 0 1 4-4zM10 38h120M16 38v76a10 10 0 0 0 10 10h88a10 10 0 0 0 10-10V38M30 62h80M30 92h80" },
  pump: { vb: "0 0 90 240", d: "M38 4h22v14H38zM30 18h30v6H30zM44 24v14M16 38h58a4 4 0 0 1 4 4v186a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V42a4 4 0 0 1 4-4zM12 120h66M12 180h66" },
  capsule: { vb: "0 0 80 200", d: "M40 6a34 34 0 0 1 34 34v120a34 34 0 0 1-68 0V40A34 34 0 0 1 40 6zM6 100h68" },
  tube: { vb: "0 0 100 240", d: "M18 6h64l-6 168H24zM24 174h52v22H24zM30 196h40v38H30zM18 6h64" },
};
const drawing = (k) => { const g = DRAW[k] || DRAW.dropper; return `<svg class="tl-draw" viewBox="${g.vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${g.d}"/></svg>`; };

// ---------------------------------------------------------------- templates
export const TILES = {
  product: {
    name: "Product", cluster: "T1", blocks: [], sizes: ["4x5", "1x1"], tile: "photo", carouselable: true,
    slots: [C("variant", "Variant", "photo", ["photo", "line", "ingredients"]), IMG("image", "Photo"), T("meta", "Meta (in brackets)", 30, { default: "Skincare" }),
      T("name", "Label (name)", 40, { default: "Advanced LUMA Cream" }), T("line", "One line", 70, { optional: true, default: "Made to order, for sun damage." }),
      T("right", "Label right", 30, { optional: true }), C("ink", "Text colour", "dark", ["dark", "light"]),
      T("headline", "Line headline (**bold**)", 50, { optional: true, default: "1 Serum. **4 Actives.**" }), C("drawing", "Line drawing", "jar", Object.keys(DRAW)),
      T("measure", "Measure label", 20, { optional: true, default: "1.25 oz / 35 g" }),
      T("c1_kicker", "Card 1 kicker", 40, { optional: true, default: "Brightening" }), L("c1_text", "Card 1 text", 140, { optional: true, default: "Arbutin and retinoic acid fade sun spots; made to order at 4, 6 or 8 %." }),
      T("c1_pills", "Card 1 pills (comma)", 80, { optional: true, default: "Arbutin, Retin-A, AHA" }), IMG("c1_a", "Card 1 photo A", { optional: true }), IMG("c1_b", "Card 1 photo B", { optional: true }),
      T("c2_kicker", "Card 2 kicker", 40, { optional: true, default: "Antioxidant" }), L("c2_text", "Card 2 text", 140, { optional: true, default: "Vitamins C and E with ferulic acid, for daytime protection under SPF." }),
      T("c2_pills", "Card 2 pills (comma)", 80, { optional: true, default: "Vitamin C, Vitamin E, Ferulic" }), IMG("c2_a", "Card 2 photo A", { optional: true }), IMG("c2_b", "Card 2 photo B", { optional: true })],
    build: (s) => {
      const light = s.ink === "light" ? "ok-ink-light" : "";
      if (s.variant === "line") return `<div class="ok tl tl-product tl-product--line ${light}">${img(s.image)}
        <div class="tl-drawbox">${drawing(s.drawing)}</div>
        ${s.measure ? `<div class="tl-measure"><i></i><span>${esc(s.measure)}</span></div>` : ""}
        ${metaHTML(s.meta)}<div class="tl-bottom"><p class="tl-mixed">${bold(s.headline)}</p><hr class="tl-hair">${label(s.name)}</div></div>`;
      if (s.variant === "ingredients") {
        const card = (k, a, b, t, p) => `<div class="ok-glass tl-card"><div class="tl-card-ph">${img(a, "ok-treated")}</div><div class="tl-card-ph">${img(b, "ok-treated")}</div>
          <p class="tl-kicker">${esc(k)}</p><p class="tl-card-t">${esc(t)}</p><div class="tl-pills">${String(p || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("")}</div></div>`;
        return `<div class="ok tl tl-product tl-product--ing">${img(s.image, "ok-bg tl-blur")}<div class="tl-cards">${card(s.c1_kicker, s.c1_a, s.c1_b, s.c1_text, s.c1_pills)}${card(s.c2_kicker, s.c2_a, s.c2_b, s.c2_text, s.c2_pills)}</div></div>`;
      }
      return `<div class="ok tl tl-product ${light}">${img(s.image)}${metaHTML(s.meta)}
        <div class="tl-bottom tl-row">${label([s.name, s.line].filter(Boolean).join("\n"))}${s.right ? label(s.right, "tl-right") : ""}</div></div>`;
    },
  },

  "before-after": {
    name: "Before / after", cluster: "T2", blocks: ["52386109"], sizes: ["4x5", "1x1", "9x16"], tile: "photo", carouselable: true, gated: true,
    slots: [IMG("before", "Before"), IMG("after", "After"), T("meta", "Meta: procedure", 30, { default: "Morpheus8" }),
      T("label", "Label: what was done", 70, { default: "Lower face, three sessions" }), T("since", "Time since (e.g. Week 6)", 20, { default: "Week 6" }),
      T("ticks", "Ruler ticks (number)", 3, { default: "6" }), C("layout", "Layout", "side", ["side", "stacked"]),
      C("markup", "Markup ring", "none", ["none", "ring"]), T("ring", "Ring x,y,r (% of each photo)", 20, { optional: true, default: "50,55,18" }),
      T("footnote", "Footnote", 50, { default: "Results vary. Shared with consent." }),
      C("patient_consent", "Patient consent", "no", ["no", "yes"]), C("approved_by_ostad", "Approved by Dr. Ostad", "no", ["no", "yes"])],
    build: (s) => {
      const n = Math.max(1, Math.min(24, parseInt(s.ticks, 10) || 6));
      const [rx, ry, rr] = String(s.ring || "50,55,18").split(",").map((v) => parseFloat(v) || 0);
      const ring = s.markup === "ring" ? `<span class="tl-ring" style="left:${rx}%;top:${ry}%;width:${rr * 2}cqmin;height:${rr * 2}cqmin"></span>` : "";
      const half = (src, tag) => `<div class="tl-half">${src ? `<img class="ok-treated" src="${esc(src)}" alt="">` : `<div class="ok-ph"></div>`}${ring}</div>`;
      const ticks = Array.from({ length: n + 1 }, (_, i) => `<i style="left:${(i / n) * 100}%"${i === 0 || i === n ? ' class="tl-major"' : ""}></i>`).join("");
      const locked = !(yes(s.patient_consent) && yes(s.approved_by_ostad));
      return `<div class="ok tl tl-ba tl-ba--${s.layout === "stacked" ? "stacked" : "side"} ok-ink-light" data-gated="${locked ? "locked" : "ok"}">
        <div class="tl-pair">${half(s.before, "Before")}${half(s.after, esc(s.since ? `After · ${s.since}` : "After"))}</div><div class="tl-shade"></div>
        ${metaHTML(s.meta)}${locked ? `<span class="tl-lock">Draft · needs consent + Dr. Ostad approval</span>` : ""}
        <div class="tl-bottom">${label(s.label)}<div class="tl-ruler">${ticks}</div>
        <div class="tl-row tl-ends"><span>Before · Day 0</span><span>After · ${esc(s.since || "")}</span></div><p class="tl-foot">${esc(s.footnote)}</p></div></div>`;
    },
  },

  statement: {
    name: "Statement", cluster: "T3", blocks: [], sizes: ["4x5", "1x1", "9x16"], tile: "text",
    slots: [T("meta", "Meta", 30, { default: "Mohs" }), T("headline", "Headline", 60, { default: "Skin cancer is the most common cancer." }),
      C("ground", "Ground", "white", ["white", "paper", "dark"]), T("label", "Label (optional)", 40, { optional: true })],
    build: (s) => `<div class="ok tl tl-text ${ground(s.ground)}">${metaHTML(s.meta)}
      <div class="tl-bottom"><div class="tl-hbox ok-fit"><h1 class="tl-head" ${fit("h2,h1.5,h1.2,h1")}>${br(s.headline)}</h1></div>${label(s.label)}</div></div>`,
  },

  notice: {
    name: "Notice", cluster: "T4", blocks: [], sizes: ["4x5", "1x1", "9x16"], tile: "text",
    slots: [T("meta", "Meta: date and time (one per line)", 60, { default: "09:00–17:00\n2026.11.27.Fri" }), T("headline", "Notice", 40, { default: "Closed for Thanksgiving" }),
      T("label", "Detail (optional)", 70, { optional: true }), C("ground", "Ground", "white", ["white", "paper", "dark"])],
    build: (s) => `<div class="ok tl tl-text ${ground(s.ground)}">${metaHTML(s.meta)}
      <div class="tl-bottom"><div class="tl-hbox ok-fit"><h1 class="tl-head" ${fit("h2,h1.5,h1.2,h1")}>${br(s.headline)}</h1></div>${label(s.label)}</div></div>`,
  },

  diagram: {
    name: "Diagram", cluster: "T5", blocks: [], sizes: ["4x5", "1x1"], tile: "diagram",
    slots: [C("variant", "Variant", "radial", ["radial", "list", "two-column", "callouts"]), T("headline", "Headline", 60, { default: "What niacinamide does for skin" }),
      T("meta", "Meta", 30, { optional: true, default: "Nia-C+" }), IMG("image", "Centre / background photo", { optional: true, default: P("p_niacinamide-caps") }),
      C("surface", "Surface", "plain", ["plain", "blurred photo", "photo"]),
      L("nodes", "Labels (one per line; callouts: text @x,y)", 260, { default: "Calms redness\nEvens tone\nStrengthens barrier\nControls oil\nSupports repair" }),
      T("center", "Centre label (list / two-column)", 30, { optional: true, default: "Niacinamide" }), T("center2", "Second centre (two-column)", 30, { optional: true, default: "Retinoid" }),
      L("nodes2", "Second labels (two-column)", 200, { optional: true, default: "Turnover\nFine lines\nTexture" }),
      T("vertical", "Vertical words (callouts)", 40, { optional: true, default: "measured. made. to order." }), T("label", "Footer / wordmark", 40, { optional: true, default: "Dr. Ariel Ostad" })],
    build: (s) => {
      const nodes = String(s.nodes || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 7);
      const surf = s.surface === "plain" ? "" : img(s.image, `ok-bg ${s.surface === "blurred photo" ? "tl-blur" : ""}`);
      const dark = s.surface === "photo" ? "ok-ink-light" : "";
      if (s.variant === "radial") {
        const k = nodes.length || 1, R = 46; // rays reach past the labels; labels sit mid-sector at 60 % of R
        const rays = nodes.map((_, i) => { const a = (-90 + (360 / k) * i) * Math.PI / 180; return `<line x1="50" y1="50" x2="${50 + R * Math.cos(a)}" y2="${50 + R * Math.sin(a)}"/>`; }).join("");
        const labels = nodes.map((t, i) => { const a = (-90 + (360 / k) * (i + 0.5)) * Math.PI / 180; return `<span class="tl-node" style="left:${50 + 33 * Math.cos(a)}%;top:${50 + 33 * Math.sin(a)}%">${esc(t)}</span>`; }).join("");
        return `<div class="ok tl tl-dia tl-dia--radial ${dark}">${surf}<h1 class="tl-dhead">${br(s.headline)}</h1>
          <div class="tl-field"><svg class="tl-rays" viewBox="0 0 100 100">${rays}</svg>${s.surface === "plain" ? `<div class="tl-plate">${img(s.image, "ok-treated")}</div>` : `<span class="tl-dot-ring"></span>`}${labels}</div>
          ${s.label ? `<p class="tl-word">${esc(s.label)}</p>` : ""}</div>`;
      }
      if (s.variant === "callouts") {
        const pre = [[34, 30], [58, 44], [30, 62], [62, 70], [44, 82]];
        const items = nodes.map((t, i) => { const m = t.match(/^(.*?)\s*@\s*([\d.]+)\s*,\s*([\d.]+)$/); const [x, y] = m ? [+m[2], +m[3]] : pre[i % pre.length]; return { t: m ? m[1] : t, x, y }; });
        // elbow leader: from the anchor up 6 %, then across to the label; an arrowhead marks the anchor (rule 8: no dot-and-line)
        const svg = items.map((p, i) => { const lx = p.x + (i % 2 ? -14 : 14); return `<path d="M${p.x} ${p.y}V${p.y - 6}H${lx}" marker-start="url(#tl-ah)"/>`; }).join("");
        const lbl = items.map((p, i) => `<span class="tl-callout ${i % 2 ? "tl-callout--l" : ""}" style="left:${p.x + (i % 2 ? -14 : 14)}%;top:${p.y - 6}%">${esc(p.t)}</span>`).join("");
        return `<div class="ok tl tl-dia tl-dia--callouts ok-ink-light">${img(s.image)}${metaHTML(s.meta)}
          <svg class="tl-leads" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="tl-ah" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" data-arrowhead><path d="M10 0L0 5L10 10" fill="none" stroke="currentColor" stroke-width="1.5"/></marker></defs>${svg}</svg>${lbl}
          ${s.vertical ? `<div class="tl-vwords">${String(s.vertical).split(/\s+/).map((w) => `<span>${esc(w)}</span>`).join("")}</div>` : ""}</div>`;
      }
      const fan = (title, list, cy, span) => {
        const n = list.length || 1; const ys = list.map((_, i) => cy - span / 2 + (span / Math.max(1, n - 1)) * i);
        return { svg: list.map((_, i) => `<line x1="30" y1="${cy}" x2="52" y2="${n === 1 ? cy : ys[i]}"/>`).join(""),
          html: `<div class="tl-circle" style="top:${cy}%"><span>${esc(title)}</span></div>` + list.map((t, i) => `<span class="tl-fanlabel" style="left:54%;top:${n === 1 ? cy : ys[i]}%">${esc(t)}</span>`).join("") };
      };
      const two = s.variant === "two-column";
      const A = two ? fan(s.center, nodes.slice(0, 4), 22, 26) : fan(s.center, nodes.slice(0, 6), 50, 56);
      const B = two ? fan(s.center2, String(s.nodes2 || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 4), 78, 26) : { svg: "", html: "" };
      return `<div class="ok tl tl-dia tl-dia--${two ? "two" : "list"} ${dark}">${surf}${metaHTML(s.meta)}<h1 class="tl-dhead tl-dhead--left">${br(s.headline)}</h1>
        <div class="tl-field tl-field--wide"><svg class="tl-rays" viewBox="0 0 100 100" preserveAspectRatio="none">${A.svg}${B.svg}</svg>${A.html}${B.html}</div>${label(s.label, "tl-bl")}</div>`;
    },
  },

  ruled: {
    name: "Ruled poster", cluster: "T6", blocks: [], sizes: ["4x5", "9x16", "1x1"], tile: "photo",
    slots: [IMG("image", "Photo", { default: P("p_texture-trio") }), T("w1", "Words line 1 (| = next column)", 40, { default: "|Measured|" }),
      T("w2", "Words line 2", 40, { default: "Made||" }), T("w3", "Words line 3", 40, { default: "||to order" }), C("face", "Word face", "serif", ["serif", "grotesk"]),
      L("a1", "Row 1 left", 90, { default: "If it is made for you,\nit is made to order." }), L("b1", "Row 1 right", 90, { default: "4 %   GENTLE\n6 %   STANDARD\n8 %   STRONG" }),
      L("a2", "Row 2 left", 140, { optional: true, default: "Advanced LUMA Cream is compounded for each patient after a consultation with Dr. Ostad." }),
      L("b2", "Row 2 right", 90, { optional: true, default: "drarielostadskincare.com\n212-517-7900" }),
      T("f1", "Footer left", 30, { default: "(Skincare)" }), T("f2", "Footer centre", 30, { default: "Upper East Side, NYC" }), T("f3", "Footer right", 30, { default: "Dr. Ariel Ostad" }),
      C("ink", "Text colour", "light", ["light", "dark"])],
    build: (s) => {
      const words = (l) => `<div class="tl-words">${String(l || "").split("|").slice(0, 3).map((w) => `<span>${esc(w.trim())}</span>`).join("")}</div>`;
      return `<div class="ok tl tl-ruled tl-ruled--${s.face === "grotesk" ? "grot" : "serif"} ${s.ink === "dark" ? "" : "ok-ink-light"}">${img(s.image)}
        <div class="tl-ruled-in">${words(s.w1)}${words(s.w2)}${words(s.w3)}
        <hr class="tl-hair"><div class="tl-cols"><p>${br(s.a1)}</p><p class="tl-mono">${br(s.b1)}</p></div>
        <hr class="tl-hair"><div class="tl-cols"><p>${br(s.a2)}</p><p>${br(s.b2)}</p></div>
        <hr class="tl-hair"><div class="tl-foot3"><span>${esc(s.f1)}</span><span>${esc(s.f2)}</span><span>${esc(s.f3)}</span></div></div></div>`;
    },
  },

  procedure: {
    name: "Procedure", cluster: "T7", blocks: [], sizes: ["4x5", "1x1"], tile: "photo", carouselable: true,
    slots: [IMG("image", "Photo or graphic"), T("meta", "Meta: category", 30, { default: "Lasers" }), T("name", "Procedure", 40, { default: "Fraxel Dual" }),
      T("fact", "One fact", 80, { default: "Two wavelengths: one for texture, one for pigment." }), C("ink", "Text colour", "light", ["light", "dark"])],
    build: (s) => `<div class="ok tl tl-proc ${s.ink === "dark" ? "" : "ok-ink-light"}">${img(s.image)}${s.ink === "dark" ? "" : '<div class="tl-shade"></div>'}${metaHTML(s.meta)}
      <div class="tl-bottom">${label(s.name, "tl-strong")}${label(s.fact)}</div></div>`,
  },

  graphic: {
    name: "Graphic", cluster: "T8", blocks: [], sizes: ["4x5", "1x1"], tile: "graphic",
    slots: [C("variant", "Variant", "clock", ["clock", "number", "ring", "timeline", "icon"]), T("meta", "Meta", 30, { optional: true, default: "Office hours" }),
      T("hours", "Clock: open hours (e.g. 9-17)", 10, { optional: true, default: "9-17" }), T("wordmark", "Wordmark", 30, { optional: true, default: "Dr. Ariel Ostad" }),
      T("number", "Number", 8, { optional: true, default: "17" }), T("label", "Label", 70, { optional: true, default: "Years in a row on Castle Connolly's Top Doctors list" }),
      T("ring", "Ring text", 120, { optional: true, default: "Examine · Measure · Treat · Recheck · " }), IMG("image", "Photo (ring)", { optional: true }),
      L("steps", "Timeline marks (one per line)", 120, { optional: true, default: "Day 0\nWeek 2\nWeek 6\nMonth 3" }),
      { key: "icon", type: "icon", label: "Icon", default: "sun", options: Object.keys(ICONS) }, C("ground", "Ground", "white", ["white", "paper", "dark"])],
    build: (s) => {
      const g = ground(s.ground);
      if (s.variant === "clock") {
        const [h0, h1] = String(s.hours || "").split("-").map((v) => parseFloat(v));
        const nums = Array.from({ length: 12 }, (_, i) => { const n = i + 1, a = (n * 30 - 90) * Math.PI / 180; return `<span style="left:${50 + 38 * Math.cos(a)}%;top:${50 + 38 * Math.sin(a)}%">${n}</span>`; }).join("");
        let arc = "";
        if (Number.isFinite(h0) && Number.isFinite(h1) && h1 > h0) { // open hours as a hairline arc on the 12 h face (wraps past 12)
          const pt = (h) => { const a = ((h % 12) * 30 - 90) * Math.PI / 180; return [50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)]; };
          const [x0, y0] = pt(h0), [x1, y1] = pt(h1), large = (h1 - h0) % 12 > 6 ? 1 : 0;
          arc = `<svg class="tl-arc" viewBox="0 0 100 100"><path d="M${x0} ${y0}A30 30 0 ${large} 1 ${x1} ${y1}"/></svg>`;
        }
        return `<div class="ok tl tl-gfx ${g}">${metaHTML(s.meta)}<div class="tl-clock">${arc}${nums}${s.wordmark ? `<span class="tl-clockmark">${esc(s.wordmark)}</span>` : ""}</div></div>`;
      }
      if (s.variant === "number") return `<div class="ok tl tl-gfx ${g}">${metaHTML(s.meta)}<div class="tl-num">${esc(s.number)}</div><div class="tl-bottom">${label(s.label)}</div></div>`;
      if (s.variant === "ring") {
        const t = esc(String(s.ring || "").repeat(Math.max(1, Math.ceil(90 / Math.max(1, String(s.ring || "").length)))).slice(0, 140));
        return `<div class="ok tl tl-gfx tl-gfx--ring ok-ink-light">${img(s.image)}${metaHTML(s.meta)}
          <svg class="tl-ringtext" viewBox="0 0 100 100"><defs><path id="tl-rp" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0"/></defs><text><textPath href="#tl-rp" textLength="211" lengthAdjust="spacing">${t}</textPath></text></svg>
          <div class="tl-bottom">${label(s.label)}</div></div>`;
      }
      if (s.variant === "timeline") {
        const st = String(s.steps || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6); const n = Math.max(1, st.length - 1);
        return `<div class="ok tl tl-gfx ${g}">${metaHTML(s.meta)}<div class="tl-tline">${st.map((x, i) => `<span style="left:${(i / n) * 100}%"><i></i><b>${esc(x)}</b></span>`).join("")}</div><div class="tl-bottom">${label(s.label)}</div></div>`;
      }
      return `<div class="ok tl tl-gfx ${g}">${metaHTML(s.meta)}<div class="tl-bigicon">${ICONS[s.icon] || ICONS.sun}</div><div class="tl-bottom">${label(s.label)}</div></div>`;
    },
  },
};

// grid metadata used by the planner's rhythm check: which kind of tile each template makes
export const TILE_KIND = { product: "photo", "before-after": "photo", statement: "text", notice: "text", diagram: "diagram", ruled: "photo", procedure: "photo", quote: "text", graphic: "graphic",
  "single-statement": "text", "procedure-card": "photo", "carousel-cover": "photo", "caption-card": "text", list: "text", announcement: "photo", story: "photo", "carousel-body": "text", "carousel-end": "photo" };
// a gated template refuses export until both fields are "yes" (before/after rule)
export function exportBlock(template, slots) {
  if (template !== "before-after") return null;
  if (!yes(slots?.patient_consent) || !yes(slots?.approved_by_ostad)) return "Before/after needs patient_consent: yes and approved_by_ostad: yes before export.";
  return null;
}
