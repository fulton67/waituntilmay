// The record view's three states (VinylView.tsx), at 1440 x 900 DPR 2 and 390 x 844 DPR 3 (touch, 4x CPU throttle):
//  - open: every text the view renders (the panel's SDF blocks and every DOM text node), each checked word by word
//    against Dylan's name, his roles, their tracks, the artist, the release and the year; every object under the open
//    record's group; desktop: the SDF type drawn at 36 / 18 px an em (or smaller where the panel's size says) and the
//    DOM text off screen (screen readers only); phones: the SDF type not drawn, the open sleeve the screen's width,
//    the DOM text under it at 22 / 15 px; the caption block gone while open and back after
//  - a tap on the white (three points off the model) changes nothing: state, gatefold, slide, turn all the same
//  - a horizontal drag on the open record: the frame the record is in, the frame the gatefold has shut, and the first
//    frame the sleeve turns (it must be after the shut frame; the turn is 0 on every frame before it); more drags on
//    the shut sleeve: it stays shut (gatefold 0, record in) past a full turn
//  - a tap on the shut sleeve opens it again, facing the camera (the turn back to a whole turn), the record out and
//    spinning, the type back
//  - a vertical drag of 100 px on the sleeve sends it back to the ring from open and from shut; one of 60 px does not;
//    Escape does
//  - fps of each motion (>= 55 desktop, >= 45 phone) and over the drags
//   node scripts/gillenwebsite/recordview.mjs [base-url] [--out file]
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3217").replace(/\/$/, "");
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "docs/gillenwebsite/recordview-report.json";
const SHOTS = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const RELEASES = JSON.parse(await fs.readFile(new URL("../../lib/gillenwebsite/discography.json", import.meta.url), "utf8")).releases;
const PROFILES = [
  { name: "desktop", w: 1440, h: 900, dpr: 2, mobile: false, throttle: 1, fpsMin: 55 },
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true, throttle: 4, fpsMin: 45 },
];
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=0,0", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const report = { base: BASE, at: new Date().toISOString(), profiles: {} };
const until = async (page, f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(f)) return true; await page.waitForTimeout(20); } return false; };
// the words the view may use for a release: Dylan's name, his roles, the titles of his tracks (no "(feat. ...)"), the
// artist, the release and the year
const trackTitle = (t) => t.replace(/\s*[([](?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi, "").trim();
const words = (s) => s.toUpperCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
const allowed = (r) => new Set(words(["DYLAN NEUSTADTER", r.role, ...r.tracks.map((t) => trackTitle(t.title)), r.artist, r.release, String(r.year)].join(" ")));

for (const p of PROFILES) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem("gillenwebsite:guide-seen", "1"); localStorage.setItem("gillenwebsite:intro-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/gillenwebsite`);
  await page.waitForFunction(() => window.__rolodex?.rig?.ready && window.__rolodex.rig.allSmall && window.__vinyl && window.__site, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.throttle });
  const V = (f, a) => page.evaluate(f, a);
  const now = () => V(() => { const v = window.__vinyl; return { state: v.state(), gate: +v.gate().toFixed(2), slide: +v.slide().toFixed(2), yaw: +v.yaw().toFixed(4), lifted: window.__rolodex.rig.lifted }; });
  const caption = () => V(() => { const c = document.querySelector("[data-src='17'][role=button]"); return !!c && c.getBoundingClientRect().height > 0; });
  const settled = (s) => page.waitForFunction((s) => window.__vinyl.state() === s, s, { timeout: 6000 }).then(() => true, () => false);
  const open = async () => { await V(() => window.__site.openFront()); const ok = await until(page, () => window.__vinyl.state() === "open"); await page.waitForTimeout(400); return ok; };
  const tap = async (x, y) => { if (p.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  // a drag from (x, y) by (dx, dy) in `steps` moves 16 ms apart; the page's frame times over it
  const drag = async (x, y, dx, dy, steps = 30, holdMs = 0) => {
    await V(() => { window.__df = []; const f = (t) => { if (!window.__df) return; window.__df.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    if (p.mobile) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let k = 1; k <= steps; k++) { await page.waitForTimeout(16); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * k) / steps, y: y + (dy * k) / steps }] }); }
      if (holdMs) await page.waitForTimeout(holdMs);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      for (let k = 1; k <= steps; k++) { await page.waitForTimeout(16); await page.mouse.move(x + (dx * k) / steps, y + (dy * k) / steps); }
      if (holdMs) await page.waitForTimeout(holdMs);
      await page.mouse.up();
    }
    await page.waitForTimeout(500);
    return V(() => { const f = window.__df; window.__df = null; const d = f.slice(1).map((t, k) => t - f[k]); return { fps: +((d.length * 1000) / (f.at(-1) - f[0])).toFixed(1), over33: d.filter((x) => x > 33.4).length, frames: d.length }; });
  };
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${p.name}-${n}.png` }); };
  const out = { captionBefore: await caption() };

  // 1. open: the texts and the objects
  await open();
  await page.waitForTimeout(600);
  out.captionWhileOpen = await caption();
  await shot("1-open");
  const id = await V(() => document.querySelector("[data-src='12'] [data-release]")?.getAttribute("data-release"));
  const rel = RELEASES.find((r) => r.id === id), ok = allowed(rel);
  const T = await V(() => window.__vinyl.texts());
  const check = (s) => { const bad = words(s).filter((w) => !ok.has(w)); return bad; };
  out.release = { id, artist: rel.artist, release: rel.release, year: rel.year };
  out.sdf = T.sdf.map((t) => ({ ...t, notAllowed: check(t.text) }));
  out.dom = T.dom.map((t) => ({ ...t, notAllowed: check(t.text) }));
  out.panelSize = T.panel;
  out.objects = await V(() => window.__vinyl.objects());
  out.box = await V(() => window.__vinyl.objectBox());
  out.infoBox = await V(() => window.__vinyl.infoBox());
  const a0 = await V(() => window.__vinyl.discAngle()); await page.waitForTimeout(500);
  out.openState = { ...(await now()), spinningRadIn500ms: +Math.abs((await V(() => window.__vinyl.discAngle())) - a0).toFixed(3) };

  // 2. taps on the white: nothing changes
  const head = await V(() => document.querySelector("header").offsetHeight);
  const b = out.box;
  // (phones: above the sleeve, between it and the text, and the bottom right corner past the text)
  const white = p.mobile
    ? [{ x: p.w / 2, y: (head + b.y0) / 2 }, { x: p.w / 2, y: (b.y1 + out.infoBox.top) / 2 }, { x: p.w - 12, y: p.h - 12 }]
    : [{ x: 30, y: p.h - 30 }, { x: p.w / 2, y: (head + b.y0) / 2 }, { x: p.w - 30, y: (b.y1 + p.h) / 2 }];
  out.whiteTaps = [];
  for (const pt of white) {
    // what is under the point: the view's canvas (the white) or its DOM text, never the model
    const target = await V(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}` : null; }, pt);
    const before = await now(); await tap(pt.x, pt.y); await page.waitForTimeout(600); const after = await now();
    out.whiteTaps.push({ x: Math.round(pt.x), y: Math.round(pt.y), target, before, after, unchanged: JSON.stringify(before) === JSON.stringify(after) });
  }

  // 3. a horizontal drag on the open record: shut first, then the turn
  const e0 = await V(() => window.__vinyl.events().length), fr0 = await V(() => window.__vinyl.frame());
  const pp = await V(() => window.__vinyl.panelPoint());
  const dir = p.mobile ? -1 : 1, span = p.mobile ? Math.min(pp.x - 8, 200) : 300;
  out.turnDrag = await drag(pp.x, pp.y, dir * span, 0, 50);
  await shot("2-shut-turned");
  const ev = (await V(() => window.__vinyl.events())).slice(e0), tr = (await V(() => window.__vinyl.trace())).filter((x) => x.frame > fr0);
  const at = (name) => ev.find((x) => x.ev === name);
  const fs0 = at("foldStart"), si = at("slidIn"), sh = at("shut"), tu = at("turn");
  out.closeThenTurn = {
    foldStartFrame: fs0?.frame, recordInFrame: si?.frame, gatefoldShutFrame: sh?.frame, rotationStartFrame: tu?.frame,
    slideMs: si && fs0 ? Math.round(si.t - fs0.t) : null, gateMs: sh && si ? Math.round(sh.t - si.t) : null,
    maxYawBeforeShut: Math.max(0, ...tr.filter((x) => sh && x.frame <= sh.frame).map((x) => Math.abs(x.yaw))),
    gateAtRotationStart: tr.find((x) => tu && x.frame === tu.frame)?.g, after: await now(),
  };
  // more drags on the shut sleeve, from its middle: past a full turn, still shut
  const turns = [];
  for (let k = 0; k < (p.mobile ? 6 : 3); k++) {
    const c = await V(() => window.__vinyl.coverPoint());
    const d = p.mobile ? Math.min(p.w - c.x - 8, 180) : 300;
    const fps = await drag(c.x, c.y, d, 0, 30);
    turns.push({ ...(await now()), fps: fps.fps });
  }
  await shot("3-turned-more");
  const trAll = (await V(() => window.__vinyl.trace())).filter((x) => x.frame > fr0 && x.kind === "shut");
  out.shutTurning = { drags: turns, yawRad: turns.at(-1).yaw, turnsRound: +(Math.abs(turns.at(-1).yaw) / (2 * Math.PI)).toFixed(2), maxGateWhileTurning: Math.max(...trAll.map((x) => x.g)), maxSlideWhileTurning: Math.max(...trAll.map((x) => x.s)) };

  // 4. a tap on the shut sleeve opens it again, facing the camera
  // (turned a quarter or three quarters it is edge on: a small drag first so its face is toward the camera)
  const y4 = (await now()).yaw, ph = ((y4 % Math.PI) + Math.PI) % Math.PI;
  if (Math.abs(ph - Math.PI / 2) < 0.6) { const c = await V(() => window.__vinyl.coverPoint()); await drag(c.x, c.y, 120, 0, 12); }
  const yawBeforeTap = (await now()).yaw;
  const c4 = await V(() => window.__vinyl.coverPoint());
  await tap(c4.x, c4.y);
  await settled("open"); await page.waitForTimeout(500);
  const a1 = await V(() => window.__vinyl.discAngle()); await page.waitForTimeout(500);
  const T4 = await V(() => window.__vinyl.texts());
  out.reopen = { yawBeforeTap, ...(await now()), wholeTurns: +((await V(() => window.__vinyl.trace())).at(-1).yaw / (2 * Math.PI)).toFixed(3),
    spinningRadIn500ms: +Math.abs((await V(() => window.__vinyl.discAngle())) - a1).toFixed(3), typeOpacity: p.mobile ? T4.dom.length && (await V(() => getComputedStyle(document.querySelector("[data-src='12'] [data-release]")).opacity)) : T4.sdf.map((t) => t.opacity) };

  // 5. vertical drags: 60 px nothing, 100 px back to the ring (from open, then from shut); Escape
  const vert = async (dy) => { const q = await V(() => window.__vinyl.state() === "open" ? window.__vinyl.panelPoint() : window.__vinyl.coverPoint()); const n0 = await V(() => window.__vinyl.log().length); await drag(q.x, q.y, 0, dy, 12); const back = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 2500); return { from: { x: Math.round(q.x), y: Math.round(q.y) }, dy, back, ran: await V((n0) => window.__vinyl.log().slice(n0).map((l) => `${l.dir} ${l.ms}ms ${l.fps}fps`).join(", "), n0), after: await now() }; };
  out.swipes = {};
  out.swipes.open60 = await vert(-60);
  out.swipes.open100up = await vert(-100);
  out.captionAfterClose = await caption();
  await page.waitForTimeout(400); await open();
  { const q = await V(() => window.__vinyl.panelPoint()); await drag(q.x, q.y, (p.mobile ? -1 : 1) * 40, 0, 8); await settled("shut"); }
  out.swipes.shut60 = await vert(60);
  out.swipes.shut100down = await vert(100);
  await page.waitForTimeout(400); await open();
  await page.keyboard.press("Escape");
  out.escape = { back: await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 2500) };

  const log = await V(() => window.__vinyl.log());
  const minFps = (k) => { const x = log.filter((l) => l.dir === k).map((l) => l.fps); return x.length ? Math.min(...x) : null; };
  out.fps = { open: minFps("open"), close: minFps("close"), fold: minFps("fold"), unfold: minFps("unfold"), turnDrag: out.turnDrag.fps, shutDrags: Math.min(...turns.map((x) => x.fps)) };
  out.motions = log;
  out.spin = await V(() => window.__vinyl.spin());
  if (p.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  const C = out.closeThenTurn, S = out.swipes;
  const textOk = [...out.sdf, ...out.dom].every((t) => t.notAllowed.length === 0) && out.sdf.length === 3 && out.objects.filter((o) => o.text !== undefined).length === 3;
  const layoutOk = p.mobile
    ? out.sdf.every((t) => !t.visible) && out.dom.every((t) => t.onScreen) && out.dom[0].px === 22 && out.dom.slice(1).every((t) => t.px === 15) && out.infoBox.top >= out.box.y1 && out.box.x1 - out.box.x0 >= p.w * 0.9
    : out.sdf.every((t) => t.visible && t.opacity === 1) && out.dom.every((t) => !t.onScreen) && (out.panelSize.nameCapped || Math.abs(out.sdf[0].emPx - 36) < 0.5) && Math.abs(out.sdf[1].emPx - 18 * out.panelSize.lineScale) < 0.5;
  out.checks = {
    text: textOk, layout: layoutOk, caption: out.captionBefore && !out.captionWhileOpen && out.captionAfterClose,
    open: out.openState.state === "open" && out.openState.gate === 1 && out.openState.slide === 1 && out.openState.spinningRadIn500ms > 0.5,
    whiteTaps: out.whiteTaps.every((t) => t.unchanged),
    closeThenTurn: !!(C.foldStartFrame && C.recordInFrame && C.gatefoldShutFrame && C.rotationStartFrame) && C.recordInFrame < C.gatefoldShutFrame && C.rotationStartFrame > C.gatefoldShutFrame && C.maxYawBeforeShut === 0 && C.gateAtRotationStart === 0,
    shutTurning: out.shutTurning.turnsRound >= 1 && out.shutTurning.maxGateWhileTurning === 0 && out.shutTurning.maxSlideWhileTurning === 0,
    reopen: out.reopen.state === "open" && out.reopen.gate === 1 && out.reopen.slide === 1 && out.reopen.yaw === 0 && out.reopen.spinningRadIn500ms > 0.5,
    swipes: !S.open60.back && S.open60.after.state === "open" && S.open100up.back && !S.shut60.back && S.shut60.after.state === "shut" && S.shut100down.back && out.escape.back,
    fps: Object.values(out.fps).every((x) => x === null || x >= p.fpsMin),
  };
  out.pass = Object.values(out.checks).every(Boolean);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify({ checks: out.checks, sdf: out.sdf, dom: out.dom, closeThenTurn: out.closeThenTurn, shutTurning: { ...out.shutTurning, drags: undefined }, reopen: out.reopen, swipes: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.back])), fps: out.fps, whiteTaps: out.whiteTaps.map((t) => t.unchanged), box: out.box, infoBox: out.infoBox, panel: out.panelSize }));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
