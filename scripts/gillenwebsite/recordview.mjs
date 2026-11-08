// The record view's three states (VinylView.tsx), at 1440 x 900 DPR 2 and 390 x 844 DPR 3 (touch, 4x CPU throttle):
//  - open: every text the view renders (the panel's SDF blocks; DOM text nodes: there must be none), each checked
//    word by word against Dylan's name, his roles, their tracks, the artist, the release and the year; every object
//    under the open record's group; the SDF type drawn on every width, at 36 / 18 px an em on desktop (or smaller where
//    the panel's size says) and the name at about 18 px on a 390 px phone; on the phone the open sleeve's centre within
//    4 px of the viewport's and its width 92% of the viewport's; the caption block gone while open and back after
//  - the record's turn over 2 s (33 1/3 rpm: 200 degrees a second)
//  - a tap on the white (three points off the model) changes nothing: state, gatefold, slide, turn all the same
//  - a horizontal drag on the open record: the frame the record is in, the frame the gatefold has shut, and the first
//    frame the sleeve turns (it must be after the shut frame; the turn is 0 on every frame before it); more drags on
//    the shut sleeve: it stays shut (gatefold 0, record in) past a full turn
//  - a tap on the shut sleeve opens it again, facing the camera (the turn back to a whole turn), the record out and
//    spinning, the type back
//  - the turn's sensitivity: a slow drag on the shut sleeve held still before it is let go (no carry), degrees per px;
//    a flick (about 2000 px/s), how far it carries after the finger has left, in turns
//  - a vertical drag of 100 px on the sleeve sends it back to the ring from open and from shut; one of 60 px does not;
//    nor does a drag more horizontal than vertical (one that starts upward and then goes sideways past 80 px up);
//    Escape does; a click on the name does (the close's duration, 350 ms)
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
  const id = await V(() => window.__vinyl.release());
  const rel = RELEASES.find((r) => r.id === id), ok = allowed(rel);
  const T = await V(() => window.__vinyl.texts());
  const check = (s) => { const bad = words(s).filter((w) => !ok.has(w)); return bad; };
  out.release = { id, artist: rel.artist, release: rel.release, year: rel.year };
  out.sdf = T.sdf.map((t) => ({ ...t, notAllowed: check(t.text) }));
  out.dom = T.dom.map((t) => ({ ...t, notAllowed: check(t.text) }));
  out.panelSize = T.panel;
  out.objects = await V(() => window.__vinyl.objects());
  out.box = await V(() => window.__vinyl.objectBox());
  out.sleeve = { cx: +((out.box.x0 + out.box.x1) / 2).toFixed(1), cy: +((out.box.y0 + out.box.y1) / 2).toFixed(1), widthPx: +(out.box.x1 - out.box.x0).toFixed(1), widthOfViewport: +((out.box.x1 - out.box.x0) / p.w).toFixed(4), viewportCentre: [p.w / 2, p.h / 2] };
  out.openState = await now();
  // the record's turn over 2 s, by the clock, read in the page at animation frames (so both ends are frames)
  out.spinDegPerS = await V(async () => {
    const f = () => new Promise((r) => requestAnimationFrame(r));
    await f(); const a = window.__vinyl.discAngle(), t = performance.now();
    while (performance.now() - t < 2000) await f();
    return +((Math.abs(window.__vinyl.discAngle() - a) * 180) / Math.PI / ((performance.now() - t) / 1000)).toFixed(1);
  });

  // 2. taps on the white: nothing changes
  const head = await V(() => document.querySelector("header").offsetHeight);
  const b = out.box;
  const white = p.mobile
    ? [{ x: p.w / 2, y: (head + b.y0) / 2 + 20 }, { x: p.w / 2, y: (b.y1 + p.h) / 2 }, { x: p.w - 12, y: p.h - 12 }]
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
    spinningRadIn500ms: +Math.abs((await V(() => window.__vinyl.discAngle())) - a1).toFixed(3), typeOpacity: T4.sdf.map((t) => t.opacity) };

  // 4b. the turn's sensitivity: shut, then a slow drag held still before it is let go (no carry), then a flick
  { const q = await V(() => window.__vinyl.panelPoint()); await drag(q.x, q.y, (p.mobile ? -1 : 1) * 40, 0, 8, 300); await settled("shut"); await page.waitForTimeout(1500); }
  const slowPx = p.mobile ? 150 : 300, steps = 30;
  {
    // (from a third of the shut sleeve left of its middle: on it on every screen)
    const c = await V(() => window.__vinyl.coverPoint()), y0 = (await now()).yaw, in3 = (await V(() => window.__vinyl.sleevePx())) / 3;
    await drag(c.x - in3, c.y, slowPx, 0, steps, 400);
    await page.waitForTimeout(800);
    const y1 = (await now()).yaw;
    // the turn counts from the move that decided the drag's axis (the first past AXIS = 8 px)
    const stepPx = slowPx / steps, counted = slowPx - Math.ceil(8.001 / stepPx) * stepPx;
    out.sensitivity = { ...(await V(() => window.__vinyl.turning())), draggedPx: slowPx, countedPx: counted, turnedDeg: +(((y1 - y0) * 180) / Math.PI).toFixed(2), measuredDegPerPx: +(((y1 - y0) * 180) / Math.PI / counted).toFixed(4) };
    // (then opened and shut again, so the flick starts with the sleeve face on)
    const c2 = await V(() => window.__vinyl.coverPoint());
    if (Math.abs(Math.cos((await now()).yaw)) < 0.5) await drag(c2.x - in3, c2.y, 100, 0, 20, 400);
    await tap(c2.x, c2.y); await settled("open"); await page.waitForTimeout(400);
    const q = await V(() => window.__vinyl.panelPoint()); await drag(q.x, q.y, (p.mobile ? -1 : 1) * 40, 0, 8, 300); await settled("shut"); await page.waitForTimeout(800);
  }
  {
    const c0 = await V(() => window.__vinyl.coverPoint()), in3 = (await V(() => window.__vinyl.sleevePx())) / 3, fx = p.mobile ? 160 : 200, c = { x: c0.x - in3 + fx / 2, y: c0.y };
    // 6 moves 16 ms apart, let go at once; the yaw when let go is the start plus the counted px (the turn is 1:1)
    const y0 = (await now()).yaw, counted = fx - Math.ceil(8.001 / (fx / 6)) * (fx / 6);
    if (p.mobile) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x - fx / 2, y: c.y }] });
      for (let k = 1; k <= 6; k++) { await page.waitForTimeout(16); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x - fx / 2 + (fx * k) / 6, y: c.y }] }); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(c.x - fx / 2, c.y); await page.mouse.down();
      for (let k = 1; k <= 6; k++) { await page.waitForTimeout(16); await page.mouse.move(c.x - fx / 2 + (fx * k) / 6, c.y); }
      await page.mouse.up();
    }
    const yUp = y0 + counted * out.sensitivity.radPerPx;
    const v0 = await V(() => window.__vinyl.turning().velocity);
    await until(page, () => window.__vinyl.turning().velocity === 0, 4000);
    const yEnd = (await now()).yaw;
    out.flick = { carryAt1500PxPerSTurns: +((1500 * out.sensitivity.radPerPx) / out.sensitivity.friction / (2 * Math.PI)).toFixed(3), px: fx, releaseRadPerS: +v0.toFixed(3), releasePxPerS: Math.round(v0 / out.sensitivity.radPerPx), carriedTurns: +((yEnd - yUp) / (2 * Math.PI)).toFixed(3), carryPredictedTurns: +(v0 / out.sensitivity.friction / (2 * Math.PI)).toFixed(3) };
  }
  { const c = await V(() => window.__vinyl.coverPoint()); await tap(c.x, c.y); await settled("open"); await page.waitForTimeout(400); }

  // 4c. a drag more horizontal than vertical never sends it back: 30 px up, then 150 px sideways while going on up
  // to 85 px in all (it shuts and turns instead)
  {
    const q = await V(() => window.__vinyl.panelPoint()), n0 = await V(() => window.__vinyl.log().length);
    const pts = [...Array.from({ length: 6 }, (_, k) => [0, -5 * (k + 1)]), ...Array.from({ length: 15 }, (_, k) => [(p.mobile ? -1 : 1) * 10 * (k + 1), -30 - (55 * (k + 1)) / 15])];
    if (p.mobile) { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: q.x, y: q.y }] }); for (const [dx, dy] of pts) { await page.waitForTimeout(16); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: q.x + dx, y: q.y + dy }] }); } await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
    else { await page.mouse.move(q.x, q.y); await page.mouse.down(); for (const [dx, dy] of pts) { await page.waitForTimeout(16); await page.mouse.move(q.x + dx, q.y + dy); } await page.mouse.up(); }
    await page.waitForTimeout(800);
    out.diagonal = { path: "30 px up, then 150 px sideways and 55 px more up (85 up in all)", ran: await V((n0) => window.__vinyl.log().slice(n0).map((l) => l.dir).join(", "), n0), after: await now() };
    out.diagonal.sentBack = /close/.test(out.diagonal.ran);
    if ((await now()).state !== "open") { const c = await V(() => window.__vinyl.coverPoint()); await tap(c.x, c.y); await settled("open"); await page.waitForTimeout(400); }
  }

  // 4d. a click on the name sends it back to the ring
  {
    const n0 = await V(() => window.__vinyl.log().length), q = await V(() => window.__vinyl.namePoint());
    const cursor = p.mobile ? null : await (async () => { await page.mouse.move(q.x, q.y); await page.waitForTimeout(100); return V(() => document.querySelector("[data-src='12'] canvas").style.cursor); })();
    await tap(q.x, q.y);
    const back = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 2500);
    const l = (await V((n0) => window.__vinyl.log().slice(n0), n0)).find((x) => x.dir === "close");
    out.nameClose = { at: { x: Math.round(q.x), y: Math.round(q.y) }, cursor, back, closeMs: l?.ms ?? null, fps: l?.fps ?? null };
    await page.waitForTimeout(400); await open();
  }
  // 4e. so does a click on the panel away from the type (its bottom left corner)
  {
    const n0 = await V(() => window.__vinyl.log().length), q = await V(() => window.__vinyl.panelCornerPoint());
    const cursor = p.mobile ? null : await (async () => { await page.mouse.move(q.x, q.y); await page.waitForTimeout(100); return V(() => document.querySelector("[data-src='12'] canvas").style.cursor); })();
    await tap(q.x, q.y);
    const back = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 2500);
    const l = (await V((n0) => window.__vinyl.log().slice(n0), n0)).find((x) => x.dir === "close");
    out.panelClose = { at: { x: Math.round(q.x), y: Math.round(q.y) }, cursor, back, closeMs: l?.ms ?? null };
    await page.waitForTimeout(400); await open();
  }

  // 5. vertical drags: 60 px nothing, 100 px back to the ring (from open, then from shut); Escape
  const vert = async (dy) => { const e0 = await V(() => window.__vinyl.events().length); const q = await V(() => window.__vinyl.state() === "open" ? window.__vinyl.panelPoint() : window.__vinyl.coverPoint()); const n0 = await V(() => window.__vinyl.log().length); await drag(q.x, q.y, 0, dy, 12); const back = await until(page, () => window.__vinyl.state() === "closed" && window.__rolodex.rig.lifted === -1, 2500); return { why: await V((e0) => window.__vinyl.events().slice(e0).filter((x) => x.ev.startsWith("closeBy")).map((x) => x.ev).join(","), e0), from: { x: Math.round(q.x), y: Math.round(q.y) }, dy, back, ran: await V((n0) => window.__vinyl.log().slice(n0).map((l) => `${l.dir} ${l.ms}ms ${l.fps}fps`).join(", "), n0), after: await now() }; };
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
  const layoutOk = out.dom.length === 0 && out.sdf.every((t) => t.visible && t.opacity === 1) && (p.mobile
    ? (Math.abs(out.sdf[0].emPx - 18) <= 2 || out.panelSize.nameCapped) && Math.hypot(out.sleeve.cx - p.w / 2, out.sleeve.cy - p.h / 2) <= 4 && Math.abs(out.sleeve.widthOfViewport - 0.92) <= 0.005
    : (out.panelSize.nameCapped || Math.abs(out.sdf[0].emPx - 36) < 0.5) && Math.abs(out.sdf[1].emPx - 18 * out.panelSize.lineScale) < 0.5);
  out.checks = {
    text: textOk, layout: layoutOk, caption: out.captionBefore && !out.captionWhileOpen && out.captionAfterClose,
    open: out.openState.state === "open" && out.openState.gate === 1 && out.openState.slide === 1,
    spin: Math.abs(out.spinDegPerS - 200) <= 10,
    // (the flick carries what the friction says for its speed: at 1500 px/s that is half a turn)
    sensitivity: Math.abs(out.sensitivity.measuredDegPerPx - 0.6) <= 0.03 && out.flick.carriedTurns > 0 && Math.abs(out.flick.carriedTurns - out.flick.carryPredictedTurns) <= 0.03 + 0.1 * out.flick.carryPredictedTurns,
    diagonal: !out.diagonal.sentBack,
    nameClose: out.nameClose.back && Math.abs(out.nameClose.closeMs - 350) <= 20 && (p.mobile || out.nameClose.cursor === "pointer"),
    panelClose: out.panelClose.back && Math.abs(out.panelClose.closeMs - 350) <= 20 && (p.mobile || out.panelClose.cursor === "pointer"),
    whiteTaps: out.whiteTaps.every((t) => t.unchanged),
    closeThenTurn: !!(C.foldStartFrame && C.recordInFrame && C.gatefoldShutFrame && C.rotationStartFrame) && C.recordInFrame < C.gatefoldShutFrame && C.rotationStartFrame > C.gatefoldShutFrame && C.maxYawBeforeShut === 0 && C.gateAtRotationStart === 0,
    shutTurning: out.shutTurning.turnsRound >= 1 && out.shutTurning.maxGateWhileTurning === 0 && out.shutTurning.maxSlideWhileTurning === 0,
    reopen: out.reopen.state === "open" && out.reopen.gate === 1 && out.reopen.slide === 1 && out.reopen.yaw === 0 && out.reopen.spinningRadIn500ms > 0.5,
    swipes: !S.open60.back && S.open60.after.state === "open" && S.open100up.back && !S.shut60.back && S.shut60.after.state === "shut" && S.shut100down.back && out.escape.back,
    fps: Object.values(out.fps).every((x) => x === null || x >= p.fpsMin),
  };
  out.pass = Object.values(out.checks).every(Boolean);
  report.profiles[p.name] = out;
  console.log(p.name, JSON.stringify({ checks: out.checks, sleeve: out.sleeve, spinDegPerS: out.spinDegPerS, sensitivity: out.sensitivity, flick: out.flick, diagonal: out.diagonal, nameClose: out.nameClose, panelClose: out.panelClose, sdf: out.sdf, dom: out.dom, closeThenTurn: out.closeThenTurn, shutTurning: { ...out.shutTurning, drags: undefined }, reopen: out.reopen, swipes: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.back])), fps: out.fps, whiteTaps: out.whiteTaps.map((t) => t.unchanged), box: out.box, panel: out.panelSize }));
  await ctx.close();
}
await browser.close();
report.pass = Object.values(report.profiles).every((x) => x.pass);
console.log("pass", report.pass);
await fs.writeFile(OUT, JSON.stringify(report, null, 2) + "\n");
