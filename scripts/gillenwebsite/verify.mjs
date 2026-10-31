// Measure /gillenwebsite against BUILD.md's "Done means" and the bible rules it applies.
//   node scripts/gillenwebsite/verify.mjs [base-url] [--only direction,detent,...]   (default http://localhost:3217)
// Runs headed Chrome so WebGL uses the GPU. Writes scripts/gillenwebsite/verify-report.json.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
// --only runs just the named sections and prints them without touching verify-report.json
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const want = (k) => !ONLY || ONLY.includes(k);
const URL = `${BASE}/gillenwebsite`;
const out = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.firstCardTexture, null, { timeout: 120000 });
await wait(1500);
// the idle screensaver (SOURCES #29) would start turning cards after 20 s; a synthetic touchstart every 4 s keeps it asleep
await page.evaluate(() => { window.__awake = setInterval(() => dispatchEvent(new Event("touchstart")), 4000); });

out.gpu = await page.evaluate(() => {
  const gl = document.querySelector("canvas").getContext("webgl2");
  const ext = gl?.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
});
out.glb = await page.evaluate(() => ({ meshNodes: window.__rolodex.meshes, triangles: window.__rolodex.triangles, names: window.__rolodex.nodes }));
out.cards = await page.evaluate(() => {
  const r = window.__rolodex;
  return { total: r.rig.TOTAL, built: r.rig.cards.length, releases: r.rig.N, faceOrder: r.faceIds };
});
const disco = JSON.parse(await fs.readFile(path.join(ROOT, "lib/gillenwebsite/discography.json"), "utf8"));
out.cards.orderMatches = JSON.stringify(out.cards.faceOrder) === JSON.stringify(disco.releases.map((r) => r.id));
delete out.cards.faceOrder;
out.canvas = await page.evaluate(() => !!document.querySelector("canvas"));
// Materials: which maps each housing part carries, map sizes, and how much of each metal part is worn
out.materials = await page.evaluate(() => {
  const res = {};
  window.__rolodex.house.traverse((o) => {
    if (!o.isMesh || !o.visible || res[o.name]) return;
    const m = o.material, w = o.geometry.attributes.wear;
    const map = (t) => (t ? `${t.image.width}x${t.image.height} procedural` : null);
    let worn = null;
    if (w) { let n = 0; for (let i = 0; i < w.count; i++) if (w.getX(i) > 0.35) n++; worn = n / w.count; }
    res[o.name] = { type: m.type, roughnessMap: map(m.roughnessMap), normalMap: map(m.normalMap), clearcoatRoughnessMap: map(m.clearcoatRoughnessMap), edgeWearVertexShare: worn };
  });
  const face = window.__rolodex.rig.cards[0].children[0].children[1].material;
  res.card = { normalMap: face.normalMap ? `${face.normalMap.image.width}x${face.normalMap.image.height} procedural, repeat ${face.normalMap.repeat.x}x${face.normalMap.repeat.y}` : null, map: `${face.map.image.width}x${face.map.image.height} canvas` };
  return res;
});

// wait for the drum to land on card k (the first seconds after load can be slow while covers upload)
const settleOn = async (k) => {
  await page.waitForFunction((k) => { const r = window.__rolodex.rig; return Math.abs(r.s - k) < 0.002 && Math.abs(r.v) < 0.01; }, k, { timeout: 20000 });
  await wait(300);
};
// world position of card k's top edge (centre of its top, before the tab)
const topEdge = (k) => page.evaluate((k) => {
  const g = window.__rolodex.rig.cards[k].children[0];
  g.updateWorldMatrix(true, false);
  const V = g.position.constructor;
  const p = g.localToWorld(new V(0, 0.3, 0));
  return { y: p.y, z: p.z };
}, k);
const perPx = () => page.evaluate(() => window.__rolodex.per());
// the drum's position is virtual (no page scroll on home): jump straight to card k
const jump = (k) => page.evaluate((k) => window.__rolodex.jumpTo(k), k);
const sNow = () => page.evaluate(() => window.__rolodex.rig.s);

// Direction check, wheel: put card 3 in front, one wheel notch down, wait 1 s
if (want("direction")) {
  const k = 3;
  await jump(k);
  await settleOn(k);
  const before = await topEdge(k);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 100);
  await wait(1000);
  const after = await topEdge(k);
  // FLIP_DIR = +1: scrolling down sends the front card's top edge down and away (Y and Z both fall)
  out.directionScroll = { card: k + 1, before, after, dY: after.y - before.y, dZ: after.z - before.z, pass: after.y < before.y && after.z < before.z };
}
// Direction check, drag: 70 px mouse drag down on the front card
if (want("direction")) {
  const k = 8;
  await jump(k);
  await settleOn(k);
  const sp = await page.evaluate((k) => {
    const r = window.__rolodex.rig, g = r.cards[k].children[0], V = g.position.constructor;
    const p = g.localToWorld(new V(0, 0.15, 0)).project(r.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  }, k);
  const before = await topEdge(k);
  await page.mouse.move(sp.x, sp.y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) { await page.mouse.move(sp.x, sp.y + i * 5); await wait(16); }
  await page.mouse.up();
  await wait(1000);
  const after = await topEdge(k);
  // a drag down pulls the card face with the pointer: its top edge comes down toward the viewer
  out.directionDrag = { card: k + 1, at: sp, before, after, dY: after.y - before.y, dZ: after.z - before.z, pass: after.y < before.y && after.z > before.z };
}
// Detent: stop scrolling 40 % of the way into a card; s must land on an integer within 0.01 inside 1 s
if (want("detent")) {
  await jump(12.4);
  const t0 = Date.now();
  let settled = null, s = 0;
  while (Date.now() - t0 < 1500) {
    s = await sNow();
    if (Math.abs(s - Math.round(s)) < 0.01 && settled === null && Date.now() - t0 > 170) settled = Date.now() - t0;
    if (Math.abs(s - Math.round(s)) >= 0.01) settled = null;
    await wait(20);
  }
  out.detent = { stoppedAt: 12.4, s, landedOn: Math.round(s), error: Math.abs(s - Math.round(s)), settledMs: settled, pass: settled !== null && settled <= 1000 };
}
// Orbit: drag the background 360 degrees (2*PI / 0.008 px) and compare the camera azimuth
if (want("orbit")) {
  await jump(0);
  await wait(1200);
  const az0 = await page.evaluate(() => window.__rolodex.rig.camAz);
  const dx = (2 * Math.PI) / 0.008, x0 = 200, y0 = 160;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) { await page.mouse.move(x0 + (dx * i) / 40, y0); await wait(16); }
  await page.mouse.up();
  await wait(1500);
  const az1 = await page.evaluate(() => window.__rolodex.rig.camAz);
  const d = Math.atan2(Math.sin(az1 - az0), Math.cos(az1 - az0));
  out.orbit = { dragPx: dx, az0, az1, wrappedDifference: d, pass: Math.abs(d) < 0.01 };
}
// Frame rate: scroll through all cards with the wheel and time every frame
if (want("fps")) {
  await jump(0);
  await wait(1000);
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => { window.__frames.push(t); if (window.__frames.length < 100000 && !window.__stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const per = await perPx(), N = out.cards.releases;
  const steps = Math.ceil(((N - 1) * per) / 30);
  await page.mouse.move(700, 450);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 30); await wait(16); }
  await wait(600);
  const f = await page.evaluate(() => { window.__stop = true; return window.__frames; });
  const d = f.slice(1).map((t, i) => t - f[i]);
  // fps over each 500 ms window, and the single slowest frame
  const win = [];
  let start = f[0], n = 0;
  for (let i = 1; i < f.length; i++) { n++; if (f[i] - start >= 500) { win.push((n * 1000) / (f[i] - start)); start = f[i]; n = 0; } }
  out.fps = {
    frames: f.length, seconds: (f[f.length - 1] - f[0]) / 1000,
    mean: (d.length * 1000) / (f[f.length - 1] - f[0]),
    min500msWindow: Math.min(...win),
    slowestFrameMs: Math.max(...d),
    reachedCard: Math.round(await sNow()) + 1,
    pass: Math.min(...win) >= 55,
  };
}
// Bible rules, from computed styles of every element on the page (the release panel opened so it is measured too)
if (want("bible")) {
  await jump(0);
  await wait(800);
  await page.keyboard.press("Enter");
  await wait(1400);
  out.bible = await page.evaluate(() => {
    const root = document.querySelector("[class*='root']");
    const els = [root, ...root.querySelectorAll("*")].filter((e) => !(e instanceof SVGElement) && e.tagName !== "CANVAS");
    const cs = (e) => getComputedStyle(e);
    const textEls = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const tally = (arr) => arr.reduce((m, v) => ((m[v] = (m[v] || 0) + 1), m), {});
    const radius = tally(els.map((e) => cs(e).borderRadius));
    const shadow = tally(els.map((e) => `${cs(e).boxShadow} | ${cs(e).textShadow}`));
    const transform = tally(els.map((e) => cs(e).textTransform));
    const weight = tally(textEls.map((e) => cs(e).fontWeight));
    const size = tally(textEls.map((e) => cs(e).fontSize));
    const fam = tally(textEls.map((e) => cs(e).fontFamily.split(",")[0].replace(/['"]/g, "").trim()));
    const big = textEls.filter((e) => parseFloat(cs(e).fontSize) >= 40).length;
    const pinned = els.filter((e) => ["fixed", "sticky"].includes(cs(e).position)).map((e) => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} ${cs(e).position}`);
    const buttons = [...root.querySelectorAll("button")].map((b) => ({ text: b.textContent.trim(), radius: cs(b).borderRadius, border: cs(b).borderTopStyle }));
    const ink = tally(textEls.map((e) => cs(e).color));
    const uppercaseText = textEls.filter((e) => /[A-Z]{2}/.test(e.textContent)).length;
    return {
      textElements: textEls.length, elements: els.length,
      R1_ground: { body: cs(document.body).backgroundColor, root: cs(root).backgroundColor, canvasScene: "#ffffff (scene.background)" },
      R2_weight: weight,
      R3_shadows: shadow,
      R4_radius: radius,
      R5_buttons: buttons,
      R7_textTransform: transform, R7_textWithTypedCapitals: uppercaseText,
      R9_sizes: size,
      R10_displayShare: big / textEls.length,
      R11_families: fam,
      R15_pinned: pinned,
      ink,
    };
  });
  await page.keyboard.press("Escape");
}
// R16: the credit comment in the HTML as served
if (want("bible")) out.bible.R16_comment = /<!-- Site Development &(amp;)? Design; waituntilmay -->/.test(await (await fetch(URL)).text());
// ---- step 6 of the reference rebuild ----
const SOURCES = await fs.readFile(path.join(ROOT, "docs/gillenwebsite/SOURCES.md"), "utf8");
const srcRows = new Map([...SOURCES.matchAll(/^\| (\d\d) \| ([^|]+) \| ([^|]+) \|/gm)].map((m) => [m[1], { component: m[2].trim(), site: m[3].trim() }]));
// every section and interactive element on the page, and the SOURCES.md rows it carries (data-src on it or an ancestor)
const crawl = (p) => p.evaluate(() => {
  const sel = "header, nav, main, section, article, aside, footer, [role=dialog], [role=list], a, button, select, canvas, [data-src]";
  return [...document.querySelectorAll(sel)].filter((e) => e.closest("[class*=root]")).map((e) => {
    const s = e.closest("[data-src]");
    const text = (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return { el: e.tagName.toLowerCase() + (e.id ? "#" + e.id : ""), text, src: s ? s.getAttribute("data-src") : null };
  });
});
const summarise = (list) => {
  const missing = list.filter((x) => !x.src || x.src.split(" ").some((n) => !srcRows.has(n)));
  return { elements: list.length, rowsUsed: [...new Set(list.flatMap((x) => (x.src ? x.src.split(" ") : [])))].sort(), missing, pass: missing.length === 0 };
};

if (want("sources")) {
  await jump(0);
  await wait(800);
  const home = await crawl(page);
  await page.keyboard.press("Enter"); // the panel opens on the front card
  await wait(1400);
  const withPanel = await crawl(page);
  await page.keyboard.press("Escape");
  await wait(1300);
  const d = await ctx.newPage();
  await d.goto(`${URL}/discography`, { waitUntil: "load" }); await wait(1500);
  const discoEls = await crawl(d);
  const a = await ctx.newPage();
  await a.goto(`${URL}/about`, { waitUntil: "load" }); await wait(1500);
  const aboutEls = await crawl(a);
  const all = [...home, ...withPanel, ...discoEls, ...aboutEls];
  out.sources = { home: summarise(home), homeWithPanel: summarise(withPanel), discography: summarise(discoEls), about: summarise(aboutEls) };
  out.sources.pass = Object.values(out.sources).every((x) => x.pass);
  // the mark or site behind each control
  const seen = new Map();
  for (const c of all.filter((x) => /^(a|button|select|canvas)\b/.test(x.el))) {
    // the 36 discography rows and the 36 About index rows each collapse to one entry
    const k = c.el === "a" && c.src === "22 12" ? "a (discography row) x36" : c.el === "a" && c.src === "20 12" ? "a (About index row) x36" : `${c.el} "${c.text}"`;
    if (!seen.has(k)) seen.set(k, (c.src || "").split(" ").map((n) => (srcRows.has(n) ? `#${n} ${srcRows.get(n).site}: ${srcRows.get(n).component}` : `#${n} MISSING`)));
  }
  out.controls = Object.fromEntries(seen);
  const inDom = new Set(all.flatMap((x) => (x.src ? x.src.split(" ") : [])));
  const live22 = ["felixluke.com", "onehouse.com", "anew-formatic.com", "woodrowcommunications.com", "ad93.ltd", "zeynepagcabay.me", "pointnever.com", "eilidhduffy.com", "gunseli.xyz", "viscosesyllabus.com", "wearesteve.net", "rosalia.com", "luckydaye.com", "mestizaestudio.com", "viscosejournal.com", "luminous27.com", "benepooley.co.uk", "delsol-salon.com", "purplemartin.studio", "work.bog.life", "siteplan.lidofestival.co.uk", "chantalmichelle.me"];
  const perSite = {};
  for (const r of srcRows.values()) perSite[r.site] = (perSite[r.site] || 0) + 1;
  // the behaviours SOURCES.md counts as implemented with the traced timing and trigger, "S1 (#03), ..."
  const countLine = SOURCES.split("\n").find((l) => l.includes("Signature behaviours implemented"));
  const behaviours = [...countLine.matchAll(/(S\d+) \(#(\d\d)\)/g)].map((m) => `${m[1]} #${m[2]}`);
  out.sourcesCount = {
    rowsInSourcesMd: srcRows.size,
    // rows with no element of their own: a console line, an idle state, a CSS hover
    rowsNotInDom: Object.fromEntries([...srcRows.keys()].filter((n) => !inDom.has(n)).map((n) => [n, srcRows.get(n).component])),
    distinctLiveSites: Object.keys(perSite).filter((s) => live22.includes(s)).length,
    perSite,
    maxPerLiveSite: Math.max(...Object.entries(perSite).filter(([s]) => live22.includes(s)).map(([, n]) => n)),
    signatureBehaviours: behaviours,
  };
  out.sourcesCount.pass = out.sourcesCount.distinctLiveSites >= 10 && out.sourcesCount.maxPerLiveSite <= 4 && behaviours.length >= 6;

  // the large cover's rendered size at 1440 x 900: inline beside the Rolodex, and in the panel
  const coverSize = (p, sel) => p.evaluate((sel) => {
    const i = document.querySelector(sel), r = i.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), shareOfViewportHeight: +(r.height / innerHeight).toFixed(3), naturalWidth: i.naturalWidth, src: i.getAttribute("src") };
  }, sel);
  out.largeCover = { viewport: "1440x900", inline: await coverSize(page, "[class*=inlineSlot] article img") };
  // the panel opens from the caption's thumbnail on home (a discography row now expands in place instead)
  await page.click("[data-src='17'] [class*=capThumb]"); await wait(1500);
  out.largeCover.panel = await coverSize(page, "[role=dialog] article img");
  // the panel shows the 2048 file; inline, the file is never shown above its natural size at the device pixel ratio
  const dpr = await page.evaluate(() => devicePixelRatio);
  out.largeCover.devicePixelRatio = dpr;
  out.largeCover.inline.notUpscaled = out.largeCover.inline.naturalWidth >= out.largeCover.inline.w * dpr;
  out.largeCover.pass = [out.largeCover.inline, out.largeCover.panel].every((c) => c.shareOfViewportHeight >= 0.6) && out.largeCover.inline.notUpscaled && out.largeCover.panel.naturalWidth === 2048;
  await page.keyboard.press("Escape"); await wait(1200);

  // discography: all 36 in discography.json order; row pitch, cover slice and type sizes against brian-eno.net
  out.discography = await d.evaluate(() => {
    const links = [...document.querySelectorAll("ol li a")];
    const tops = links.map((x) => x.getBoundingClientRect().top);
    const pitch = tops.slice(1).map((t, i) => t - tops[i]);
    const img = links[0].querySelector("[class*=slice]").getBoundingClientRect();
    const px = (sel) => parseFloat(getComputedStyle(links[0].querySelector(sel)).fontSize);
    return { count: links.length, ids: links.map((x) => x.getAttribute("href").slice(1)), rowPitch: { min: +Math.min(...pitch).toFixed(2), max: +Math.max(...pitch).toFixed(2) }, slice: { w: Math.round(img.width), h: Math.round(img.height) }, titlePx: px("[class*=discoTitle]"), whoPx: px("[class*=discoWho]"), yearPx: px("[class*=discoYear]") };
  });
  const eno = { rowPitch: 20, sliceW: 464, sliceH: 20, titlePx: 13, whoPx: 10, yearPx: 10 }; // docs/gillenwebsite/references/brian-eno.net
  const within = (v, b) => [v, b, Math.abs(v - b) / b <= 0.1];
  const dg = out.discography;
  dg.orderMatches = JSON.stringify(dg.ids) === JSON.stringify(disco.releases.map((r) => r.id));
  delete dg.ids;
  dg.vsBrianEno = {
    rowPitchMin: within(dg.rowPitch.min, eno.rowPitch), rowPitchMax: within(dg.rowPitch.max, eno.rowPitch),
    sliceW: within(dg.slice.w, eno.sliceW), sliceH: within(dg.slice.h, eno.sliceH),
    titlePx: within(dg.titlePx, eno.titlePx), whoPx: within(dg.whoPx, eno.whoPx), yearPx: within(dg.yearPx, eno.yearPx),
  };
  dg.pass = dg.count === 36 && dg.orderMatches && Object.values(dg.vsBrianEno).every((v) => v[2]);

  // S6 on the discography: A-Z kept in the alphabetOrdering cookie and restored after a reload
  const firstTitle = () => d.evaluate(() => document.querySelector("ol li a [class*=discoTitle]").textContent);
  await d.getByRole("button", { name: /A–Z/ }).click(); await wait(300);
  const firstAfterClick = await firstTitle();
  await d.reload({ waitUntil: "load" }); await wait(1500);
  const cookie = (await ctx.cookies()).find((c) => c.name === "alphabetOrdering");
  const firstAfterReload = await firstTitle();
  await d.getByRole("button", { name: /YEAR/ }).click(); await wait(300);
  const firstDefault = await firstTitle();
  out.S6 = { cookie: cookie?.value, firstAfterClick, firstAfterReload, firstDefault, pass: cookie?.value === "alphabetical" && firstAfterClick === firstAfterReload && firstAfterClick !== firstDefault };
  // S14: the role select hides every row without that role; the empty choice shows all of them again
  const visible = () => d.evaluate(() => [...document.querySelectorAll("ol li")].filter((li) => li.style.display !== "none").map((li) => li.dataset.role));
  const roleOpts = await d.evaluate(() => [...document.querySelectorAll("#category-select option")].map((o) => o.value).filter(Boolean));
  const role = roleOpts.includes("Mixer") ? "Mixer" : roleOpts[0];
  await d.selectOption("#category-select", role); await wait(300);
  const shown = await visible();
  await d.selectOption("#category-select", ""); await wait(300);
  const after = await visible();
  out.S14 = { role, shown: shown.length, allHaveRole: shown.every((x) => x.split("|").includes(role)), afterClear: after.length };
  out.S14.pass = out.S14.shown > 0 && out.S14.shown < 36 && out.S14.allHaveRole && out.S14.afterClear === 36;

  // About index: 10 random titles; hovering each must show only that title's cover, with the line drawn from it to the cover
  const picks = [...Array(36).keys()].sort(() => Math.random() - 0.5).slice(0, 10);
  out.aboutIndex = [];
  for (const i of picks) {
    const row = a.locator("[class*=indexRow]").nth(i);
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await wait(600);
    out.aboutIndex.push(await a.evaluate((i) => {
      const row = document.querySelectorAll("[class*=indexRow]")[i];
      const shown = [...document.querySelectorAll("[class*=indexCover] img")].filter((im) => getComputedStyle(im).visibility === "visible").map((im) => im.getAttribute("src").split("/").pop().replace(".jpg", ""));
      const lines = [...document.querySelectorAll("svg[data-src] line")];
      const cover = document.querySelector("[class*=indexCover]").getBoundingClientRect();
      // each entry is one line now, as wide as the column; the line starts after its last piece, the role
      const end = row.lastElementChild.getBoundingClientRect();
      return {
        title: row.querySelector("[class*=indexTitle]").textContent, want: row.getAttribute("href").slice(1), shown,
        lineFromRow: Math.abs(+lines[0].getAttribute("x1") - (end.right + 8)) < 1.5 && Math.abs(+lines[0].getAttribute("y1") - (end.top + end.height / 2)) < 1.5,
        lineToCover: Math.abs(+lines[2].getAttribute("x2") - cover.left) < 1.5,
        drawn: lines.every((l) => getComputedStyle(l).opacity === "1"),
      };
    }, i));
  }
  out.aboutIndexPass = out.aboutIndex.every((x) => x.shown.length === 1 && x.shown[0] === x.want && x.lineFromRow && x.lineToCover && x.drawn);
  await d.close(); await a.close();
}

// The caption block and the Rolodex share one index. 20 random swipes on the caption (each must move exactly one
// release, up = next, down = back) and 20 random drags on the front card; after each settles, the caption's
// release, the Rolodex's front card and the release display must agree.
if (want("sync")) {
  await jump(0);
  await wait(1200);
  const settle = async () => {
    for (let t = 0; t < 80; t++) {
      await wait(100);
      const ok = await page.evaluate(() => { const r = window.__rolodex.rig; return Math.abs(r.s - Math.round(r.s)) < 0.005 && performance.now() - r.lastScroll > 400; });
      if (ok) break;
    }
    await wait(450); // the caption's 180 ms slide and the display's crossfade
    return page.evaluate(() => {
      const r = window.__rolodex.rig, ids = window.__rolodex.faceIds;
      const caption = [...document.querySelectorAll("[data-src='17'] [data-release]")].map((e) => e.getAttribute("data-release"));
      const shown = document.querySelector("[class*=inlineSlot] article")?.getAttribute("data-release");
      return { caption: caption.length === 1 ? ids.indexOf(caption[0]) : -1, rolodex: r.front, display: ids.indexOf(shown) };
    });
  };
  const cap = await page.evaluate(() => { const b = document.querySelector("[data-src='17'] [class*=capText]").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  out.sync = { caption: [], rolodex: [] };
  let before = (await settle()).rolodex;
  for (let k = 0; k < 20; k++) {
    // up for the next release, down for the one before; near either end, swipe inwards
    let sign = Math.random() < 0.5 ? -1 : 1;
    if (before < 1) sign = -1; if (before > 34) sign = 1;
    const dy = sign * (30 + Math.random() * 90);
    await page.mouse.move(cap.x, cap.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(cap.x, cap.y + (dy * i) / 8); await wait(16); }
    await page.mouse.up();
    const r = await settle();
    const want1 = (before + (dy < 0 ? 1 : -1) + 36) % 36;
    out.sync.caption.push({ dy: Math.round(dy), from: before, ...r, onePerSwipe: r.rolodex === want1, equal: r.caption === r.rolodex && r.rolodex === r.display });
    before = r.rolodex;
  }
  for (let k = 0; k < 20; k++) {
    // grab the front card at its face and drag vertically (the flip mode); near either end, drag inwards
    const sp = await page.evaluate(() => {
      const r = window.__rolodex.rig, g = r.cards[((Math.round(r.s) % r.TOTAL) + r.TOTAL) % r.TOTAL].children[0];
      const p = g.getWorldPosition(g.position.clone()).project(r.camera);
      return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, front: r.front, N: r.N };
    });
    let sign = Math.random() < 0.5 ? -1 : 1;
    if (sp.front < 3) sign = -1; if (sp.front > sp.N - 4) sign = 1;
    const dy = sign * (30 + Math.random() * 150) * (await page.evaluate(() => window.__rolodex.flipDir ?? 1));
    await page.mouse.move(sp.x, sp.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(sp.x, sp.y + (dy * i) / 12); await wait(16); }
    await page.mouse.up();
    const r = await settle();
    out.sync.rolodex.push({ dy: Math.round(dy), ...r, equal: r.caption === r.rolodex && r.rolodex === r.display });
  }
  const both = [...out.sync.caption, ...out.sync.rolodex];
  out.sync.pass = both.every((x) => x.equal) && out.sync.caption.every((x) => x.onePerSwipe);
  out.sync.distinctIndicesVisited = new Set(both.map((x) => x.rolodex)).size;

  // the slide: on a change the old block leaves and the new one enters, each a 180 ms ease animation
  out.captionSlide = await page.evaluate(async () => {
    const seen = new Set();
    const mo = new MutationObserver(() => {
      for (const e of document.querySelectorAll("[data-src='17'] [data-release]")) {
        const a = e.getAnimations()[0];
        if (a) seen.add(JSON.stringify({ name: a.animationName, ms: a.effect.getTiming().duration, easing: getComputedStyle(e).animationTimingFunction }));
      }
    });
    mo.observe(document.querySelector("[data-src='17']"), { subtree: true, childList: true, attributes: true });
    window.__rolodex.jumpTo(Math.round(window.__rolodex.rig.pos) + 1);
    await new Promise((r) => setTimeout(r, 900));
    mo.disconnect();
    return [...seen].map((x) => JSON.parse(x));
  });
  out.captionSlidePass = out.captionSlide.length >= 2 && out.captionSlide.every((a) => a.ms === 180 && a.easing === "ease");
  // a click on the thumbnail opens the large-cover panel on that release
  const thumbId = await page.evaluate(() => document.querySelector("[data-src='17'] [data-release]").getAttribute("data-release"));
  await page.click("[data-src='17'] [class*=capThumb]");
  await wait(1400);
  out.captionThumb = { release: thumbId, panelRelease: await page.evaluate(() => document.querySelector("[role=dialog] article")?.getAttribute("data-release") ?? null) };
  out.captionThumb.pass = out.captionThumb.panelRelease === thumbId;
  await page.keyboard.press("Escape");
  await wait(1300);
}

// Card faces: texture size and anisotropy
if (want("textures")) {
  out.textures = await page.evaluate(() => {
    const face = window.__rolodex.rig.cards[0].children[0].children[1].material.map;
    return { cardFace: { w: face.image.width, h: face.image.height, anisotropy: face.anisotropy } };
  });
  out.textures.pass = out.textures.cardFace.w === 1024 && out.textures.cardFace.anisotropy === 8; // as in 7170f0b
}

// The housing look: 7170f0b's PBR materials, no outlines
if (want("look")) {
  out.look = await page.evaluate(() => {
    const r = window.__rolodex, mats = new Set();
    let lines = 0;
    r.house.traverse((o) => { if (o.isLineSegments) lines++; else if (o.isMesh && o.visible) mats.add(o.material.type); });
    return { housingMaterials: [...mats], outlines: lines };
  });
  out.look.pass = out.look.outlines === 0 && out.look.housingMaterials.every((t) => /Physical|Standard/.test(t));
}

// Fonts: every family that renders text, the faces loaded, the files fetched and where they come from
if (want("fonts")) {
  out.fonts = await page.evaluate(() => {
    const fams = {};
    for (const e of document.querySelectorAll("body *")) {
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (getComputedStyle(e).display === "none") continue;
      const f = getComputedStyle(e).fontFamily.split(",")[0].replace(/['"]/g, "").trim();
      fams[f] = (fams[f] || 0) + 1;
    }
    const res = performance.getEntriesByType("resource");
    return {
      renderedFamilies: fams,
      facesLoaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
      files: res.filter((x) => /\.woff2?($|\?)/.test(x.name)).map((x) => x.name.replace(location.origin, "")),
      thirdPartyFontRequests: res.filter((x) => /fonts\.(googleapis|gstatic)|typekit/.test(x.name)).length,
    };
  });
  out.fonts.sources = {
    info: "TeX Gyre Heros 400 and italic, self-hosted woff2 from app/gillenwebsite/fonts (GUST Font License). Free stand-in for gaeawoods.com's nimbus-sans 300 (Adobe Fonts kit twr8vrw); to match it exactly, license URW Nimbus Sans Light",
    Archivo: "--font-title placeholder, Google Fonts (OFL), fetched at build by next/font/google and served from this site",
  };
}

// S12: the screensaver counts down after 20 s idle and then turns the Rolodex by itself
if (want("S12")) {
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  const t0 = Date.now();
  await p.waitForSelector("[data-src='29']", { timeout: 45000 });
  const shownAfterS = +((Date.now() - t0) / 1000).toFixed(1);
  const firstValue = await p.textContent("[data-src='29']");
  const front0 = await p.evaluate(() => window.__rolodex.rig.front);
  await wait(15000);
  const front1 = await p.evaluate(() => window.__rolodex.rig.front);
  await p.mouse.move(200, 200); await wait(500);
  const hiddenOnInput = (await p.$("[data-src='29']")) === null;
  out.S12 = { shownAfterS, firstValue, frontBefore: front0, frontAfter15s: front1, hiddenOnInput, pass: shownAfterS >= 18 && firstValue === "10" && front1 > front0 && hiddenOnInput };
  await p.close();
}

// Phone: 390 x 844, no horizontal scroll, caption with its 64 px thumb, and the panel with the cover full width, info below
if (want("phone")) {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await phone.newPage();
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForFunction(() => window.__rolodex?.rig?.ready, null, { timeout: 120000 });
  await wait(1500);
  out.phone = await p.evaluate(() => {
    const thumb = document.querySelector("[class*=capThumb] img");
    return {
      scrollWidth: document.documentElement.scrollWidth, innerWidth,
      wide: window.__rolodex.rig.wide, cardFaceW: window.__rolodex.rig.cards[0].children[0].children[1].material.map.image.width,
      thumb: thumb ? { w: thumb.getBoundingClientRect().width, h: thumb.getBoundingClientRect().height } : null,
      caption: document.querySelector("[class*=capArtist]")?.textContent,
    };
  });
  // a real touch swipe on the caption: up twice, then down once, one release each, and the page itself must not scroll
  // beyond what the swipes ask for
  const cdp = await phone.newCDPSession(p);
  const swipe = async (dy) => {
    const b = await p.evaluate(() => { const r = document.querySelector("[class*=capText]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x, y: b.y + (dy * i) / 8 }] }); await wait(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await wait(1600);
    return p.evaluate(() => ({ front: window.__rolodex.rig.front, caption: document.querySelector("[data-src='17'] [data-release]").getAttribute("data-release") }));
  };
  out.phone.swipes = [await swipe(-70), await swipe(-70), await swipe(60)];
  out.phone.swipePass = out.phone.swipes.map((x) => x.front).join() === "1,2,1" && out.phone.swipes.every((x, i) => x.caption === disco.releases[[1, 2, 1][i]].id);
  await p.tap("[class*=capThumb]");
  await wait(1500);
  out.phone.panel = await p.evaluate(() => {
    const i = document.querySelector("[role=dialog] article img").getBoundingClientRect();
    const info = document.querySelector("[role=dialog] article [class*=info]").getBoundingClientRect();
    return { release: document.querySelector("[role=dialog] article").getAttribute("data-release"), coverW: Math.round(i.width), infoBelowCover: info.top >= i.bottom - 1, scrollWidth: document.documentElement.scrollWidth };
  });
  for (const path of ["/discography", "/about"]) {
    await p.goto(URL + path, { waitUntil: "load" }); await wait(1200);
    out.phone[`scrollWidth ${path}`] = await p.evaluate(() => document.documentElement.scrollWidth);
  }
  out.phone.pass = out.phone.scrollWidth === 390 && out.phone["scrollWidth /discography"] === 390 && out.phone["scrollWidth /about"] === 390 && !out.phone.wide && out.phone.thumb?.w === 64 && out.phone.swipePass && out.phone.panel.release === disco.releases[1].id && out.phone.panel.infoBelowCover && out.phone.panel.coverW >= 350;
  await phone.close();
}
await browser.close();

if (ONLY) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
// Covers on disk: all 36 releases have a 2048 x 2048 file, plus the 1080 and 512 copies
out.covers = [];
for (const r of disco.releases) {
  const row = { id: r.id, exists: false, size: null, kb: null, v1080: null, v512: null };
  if (r.cover) {
    const f = path.join(ROOT, "public", r.cover);
    const m = await sharp(f).metadata().catch(() => null);
    if (m) Object.assign(row, { exists: true, size: `${m.width}x${m.height}`, kb: Math.round((await fs.stat(f)).size / 1024) });
    for (const w of [1080, 512]) {
      const v = await sharp(path.join(ROOT, "public", r.cover.replace("/covers/", `/covers/${w}/`))).metadata().catch(() => null);
      row[`v${w}`] = v ? `${v.width}x${v.height}` : null;
    }
  }
  out.covers.push(row);
}
out.coversPass = out.covers.length === disco.releases.length && out.covers.every((c) => c.exists && c.size === "2048x2048" && c.v1080 === "1080x1080" && c.v512 === "512x512");
out.errors = logs.filter((l) => /^(error|pageerror)/.test(l));
await fs.writeFile(path.join(ROOT, "scripts/gillenwebsite/verify-report.json"), JSON.stringify({ url: URL, at: new Date().toISOString(), ...out }, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
