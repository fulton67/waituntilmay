// The record view's panel type against the panel, for every release (VinylView.tsx setPanel, __vinyl.panelFit): open
// the front release, then the arrow key through all of them; each one's overrun past the bottom margin (metres, <= 0
// fits) and whether its blocks stand where the layout of their current text puts them (stale: a layout that never
// finished, as when troika's sync callback was lost). Phone size by default (393 x 659, Safari's viewport on an iPhone).
//   node scripts/gillenwebsite/panelfit.mjs [base-url] [W H] [--stop id-part shot.png]
import { chromium } from "playwright";
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const [W, H] = argv.filter((a) => /^\d+$/.test(a)).map(Number).concat([393, 659]);
const stop = argv.includes("--stop") ? argv.slice(argv.indexOf("--stop") + 1) : null;
const b = await chromium.launch({ channel: "chrome", headless: false, args: ["--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
const p = await ctx.newPage();
await p.goto(`${BASE}/gillenwebsite`);
await p.waitForFunction(() => window.__rolodex?.rig?.ready && window.__vinyl && window.__site, null, { timeout: 180000 });
await p.waitForTimeout(1500);
await p.evaluate(() => window.__site.openFront());
await p.waitForFunction(() => window.__vinyl.state() === "open", null, { timeout: 20000 });
const out = [], n = await p.evaluate(() => window.__rolodex.rig.N);
for (let k = 0; k < n; k++) {
  await p.waitForTimeout(700);
  const f = await p.evaluate(() => ({ id: window.__vinyl.release(), ...window.__vinyl.panelFit() }));
  out.push(f);
  if (stop && f.id.includes(stop[0])) { await p.screenshot({ path: stop[1] }); console.log(JSON.stringify(f)); await b.close(); process.exit(0); }
  await p.keyboard.press("ArrowRight");
}
const bad = out.filter((f) => f.over > 0.0005 || f.stale);
console.log(JSON.stringify({ base: BASE, size: [W, H], n, bad, tightest: [...out].sort((a, c) => c.over - a.over).slice(0, 3) }));
console.log("pass", bad.length === 0 && out.length === n);
await b.close();
