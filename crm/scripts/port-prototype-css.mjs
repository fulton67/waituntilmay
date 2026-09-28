/**
 * Ports docs/crm-prototype-styles.css (the approved prototype, source of truth) into
 * app/(crm)/crm/prototype.css without changing a single value:
 *  - every selector is scoped to [data-crm] so the portfolio site is untouched
 *  - :root tokens move to [data-crm]; the dark theme keys off html[data-theme="dark"]
 *    (the CRM's theme script always sets data-theme, so the prefers-color-scheme copy is dropped)
 *  - everything sits in @layer components so Tailwind utilities can still override it
 * Re-run after editing the prototype: `node crm/scripts/port-prototype-css.mjs`
 */
import fs from "node:fs";
import postcss from "postcss";

const SRC = "docs/crm-prototype-styles.css";
const OUT = "app/(crm)/crm/prototype.css";

const scope = (sel) => {
  sel = sel.trim();
  if (sel === ":root") return "[data-crm]";
  if (sel === ':root[data-theme="dark"]') return 'html[data-theme="dark"] [data-crm]';
  if (sel.startsWith(':root[data-theme="dark"] ')) return `html[data-theme="dark"] [data-crm] ${sel.slice(':root[data-theme="dark"] '.length)}`;
  if (sel === "html" || sel === "body") return "[data-crm]";
  // Ambient blobs: body::before/::after live on the CRM wrapper, so every /crm page gets them.
  if (sel.startsWith("body::")) return `[data-crm]${sel.slice(4)}`;
  if (sel === "*") return "[data-crm] *";
  if (sel.startsWith("html.theming ")) return sel.replace(/^html\.theming (body|\.)/, (_, m) => (m === "body" ? "html.theming [data-crm]" : "html.theming [data-crm] ."));
  if (sel.startsWith("body.intern ")) return `[data-crm].intern ${sel.slice("body.intern ".length)}`;
  return `[data-crm] ${sel}`;
};

const root = postcss.parse(fs.readFileSync(SRC, "utf8"));
root.walkAtRules("media", (at) => {
  if (at.params.includes("prefers-color-scheme")) at.remove();
});
root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  // The top-level `*,*::before,*::after{box-sizing:inherit}` reset is dropped (Tailwind's
  // preflight already sets border-box); `*` inside @media (the reduced-motion kill) is kept.
  const topLevel = rule.parent?.type === "root";
  const sels = rule.selectors.filter((s) => !(topLevel && /^\*/.test(s.trim())));
  if (!sels.length) return rule.remove();
  rule.selectors = sels.map(scope);
});

const header = `/* GENERATED from ${SRC} by crm/scripts/port-prototype-css.mjs — do not edit by hand.
   Values are the prototype's, unchanged; only selectors are scoped to [data-crm]. */\n`;
fs.writeFileSync(OUT, `${header}@layer components {\n${root.toString()}\n}\n`);
console.log(`wrote ${OUT}`);
