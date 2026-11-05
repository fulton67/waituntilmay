"use client";
// The first-load guide over the Rolodex (SOURCES #33): four drafting callouts. Each is a label in the interface type
// (12 px, the header face, capitals typed) set on the page grid, and a 1 px black leader from the label's end to its
// target: one horizontal or vertical segment, or a horizontal then a vertical meeting at a hard 90° corner, crisp
// (whole-pixel coordinates, crispEdges). At the target the leader ends in a typed arrow (→ ← ↑ ↓) pointing into it;
// felixluke.com has no crosshair, so no crosshair (the bible's M4 crosshairs are on wearesteve.net and rosalia.com as
// a cookie widget's plus, and on luminous27.com, which he only built). Targets: the front sleeve's top edge, the
// right knob's centre (the left dial's when the side panel covers the right knob), the white ground right of the
// Rolodex, the caption block's top edge. The leaders follow their 3D targets every frame, the bend recomputed so the
// segments stay axis-aligned. Everything appears at once (no draw-in, T2); the arrows step 4 px toward their targets
// and back, half a second each; the set holds 2.5 s, then fades over 400 ms. A callout goes at once when its gesture
// is made (rig.onAction). Shown on the first visit (localStorage), and again after 90 s with no input.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { rig, wrap } from "./rig";
import { SLEEVE } from "./sleeve";
import css from "./site.module.css";

const KEY = "gillenwebsite:guide-seen";
const HOLD = 2500, FADE = 400, IDLE = 90000, STEP_MS = 500, STEP_PX = 4;
type Act = "flip" | "knob" | "orbit" | "open";
const NOTES: { act: Act; label: string }[] = [
  { act: "flip", label: "SCROLL TO FLIP" },
  { act: "knob", label: "TAP KNOB TO SPIN FASTER" },
  { act: "orbit", label: "DRAG TO TURN" },
  { act: "open", label: "OPEN" },
];
type P = { x: number; y: number };

const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode: shown each visit */ } };
const px = (v: number) => Math.round(v) + 0.5; // a 1 px line on a whole pixel

export default function Guide({ ready }: { ready: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const arrows = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!ready) return;
    const s = svg.current!;
    const box = new THREE.Box3(), v = new THREE.Vector3();
    const stageRect = () => rig.hit?.parentElement?.getBoundingClientRect() ?? null;
    const toScreen = (w: THREE.Vector3): P | null => {
      const b = stageRect();
      if (!b || !rig.camera) return null;
      w.project(rig.camera);
      return { x: b.left + (w.x + 1) * 0.5 * b.width, y: b.top + (1 - w.y) * 0.5 * b.height };
    };
    const rectOf = (sel: string) => { const r = document.querySelector<HTMLElement>(sel)?.getBoundingClientRect(); return r && r.width ? r : null; };
    const panel = () => rectOf("[class*=inlineSlot]");
    const covered = (p: P) => { const r = panel(); return !!r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom; };
    const knob = (name: string) => { for (const k of rig.knobs) { const o = k.getObjectByName(name); if (o) return o; } return null; };
    // the targets on screen now
    const targets: (() => P | null)[] = [
      // the front sleeve's top edge, in its middle (the body's origin is the sleeve's bottom middle)
      () => { const c = rig.cards[wrap(Math.round(rig.s), rig.TOTAL)]?.children[0]; if (!c) return null; c.updateWorldMatrix(true, false); return toScreen(new THREE.Vector3(0, SLEEVE, 0).applyMatrix4(c.matrixWorld)); },
      // the right knob's centre, or the left one's while the side panel covers the right
      () => {
        const r = knob("knob_right");
        const p = r ? toScreen(box.setFromObject(r).getCenter(v)) : null;
        if (p && !covered(p)) return p;
        // (the left dial's visible middle: its box's outer side, -x, not its centre inside the housing)
        const l = knob("knob_left");
        if (!l) return p;
        box.setFromObject(l).getCenter(v); v.x = box.min.x;
        return toScreen(v);
      },
      // the white ground right of the Rolodex: right of the drum's screen box, below the side panel on desktop
      () => {
        const b = stageRect(), h = rig.hit?.getBoundingClientRect(), pn = panel();
        if (!b || !h) return null;
        if (pn) return { x: Math.min(pn.right - 60, h.right + 0.45 * (pn.right - h.right)), y: Math.min(b.bottom - 120, pn.bottom + 80) };
        return { x: h.right + (b.right - h.right) / 2, y: h.top + 24 };
      },
      // the caption block's top edge
      () => { const c = rectOf("[data-src='17'][role=button]"); return c ? { x: c.left + 64, y: c.top } : null; },
    ];
    // where each label sits: on the page grid, its left edge shared with a neighbour (the caption block and the
    // loading label on the left gutter; the release display's info column on desktop); y is the leader's row
    const places = (t: (P | null)[]): (P | null)[] => {
      const cap = rectOf("[data-src='17'][role=button]"), info = rectOf("[class*=inlineSlot] [class*=info]"), gutter = cap?.left ?? 20;
      return [
        t[0] && { x: gutter, y: t[0].y - 48 },
        t[1] && cap && { x: gutter, y: cap.top - 52 },
        t[2] && (info ? { x: info.left, y: t[2].y } : { x: gutter, y: t[2].y - 96 }),
        t[3] && cap && { x: gutter, y: cap.top - 24 },
      ];
    };
    const segs = [...s.querySelectorAll<SVGPolylineElement>("polyline")];

    let t0 = -1, raf = 0, idle = 0, shows = 0, hold = HOLD;
    const gone = new Set<number>();
    const route: { pts: number[][]; dir: string }[] = NOTES.map(() => ({ pts: [], dir: "" }));
    const state = () => {
      if (t0 < 0) return "hidden";
      const t = performance.now() - t0;
      return t < hold ? "holding" : t < hold + FADE ? "fading" : "hidden";
    };
    const frame = () => {
      raf = 0;
      if (t0 < 0) return;
      const t = performance.now() - t0, fade = Math.max(0, Math.min(1, (t - hold) / FADE));
      if (fade >= 1) { hide(); return; }
      const step = Math.floor(t / STEP_MS) % 2 ? STEP_PX : 0;
      const tg = targets.map((f) => f()), pl = places(tg);
      NOTES.forEach((n, k) => {
        const p = tg[k], q = pl[k], seg = segs[k], lab = labels.current[k]!, arr = arrows.current[k]!;
        const op = p && q && !gone.has(k) ? 1 - fade : 0;
        seg.style.opacity = lab.style.opacity = arr.style.opacity = String(op);
        if (!p || !q) return;
        const w = lab.offsetWidth, h = lab.offsetHeight, aw = arr.offsetWidth, ah = arr.offsetHeight;
        lab.style.transform = `translate(${Math.round(q.x)}px, ${Math.round(q.y - h / 2)}px)`;
        // the leader leaves the label's end nearer the target, runs along the label's row, then turns to the target
        const right = p.x >= q.x + w / 2, sx = right ? q.x + w + 4 : q.x - 4, sy = q.y;
        const vertical = Math.abs(p.y - sy) > 1, horizontal = Math.abs(p.x - sx) > 1;
        // the arrow points along the last segment, its tip on the target; the line stops at the arrow's tail
        const dir = vertical ? (p.y > sy ? "↓" : "↑") : (p.x > sx ? "→" : "←");
        const gap = dir === "↓" || dir === "↑" ? ah * 0.7 : aw;
        const tail = dir === "↓" ? { x: p.x, y: p.y - gap } : dir === "↑" ? { x: p.x, y: p.y + gap } : dir === "→" ? { x: p.x - gap, y: p.y } : { x: p.x + gap, y: p.y };
        const pts = !vertical ? [[sx, sy], [tail.x, sy]] : !horizontal ? [[p.x, sy], [tail.x, tail.y]] : [[sx, sy], [p.x, sy], [tail.x, tail.y]];
        seg.setAttribute("points", pts.map(([x, y]) => `${px(x)},${px(y)}`).join(" "));
        route[k] = { pts: pts.map(([x, y]) => [px(x), px(y)]), dir };
        if (arr.textContent !== dir) arr.textContent = dir;
        // the glyph's tip on the target, 4 px back on the off half-seconds (the step toward the target and back)
        const d = { "↓": [0, 1], "↑": [0, -1], "→": [1, 0], "←": [-1, 0] }[dir]!;
        const ax = dir === "→" ? p.x - aw : dir === "←" ? p.x : p.x - aw / 2;
        const ay = dir === "↓" ? p.y - ah * 0.85 : dir === "↑" ? p.y - ah * 0.15 : p.y - ah / 2;
        arr.style.transform = `translate(${Math.round(ax + d[0] * (step - STEP_PX))}px, ${Math.round(ay + d[1] * (step - STEP_PX))}px)`;
      });
      raf = requestAnimationFrame(frame);
    };
    const show = (holdMs = HOLD) => {
      if (document.querySelector("[role=dialog]") || t0 >= 0) return;
      gone.clear(); shows++; hold = holdMs;
      t0 = performance.now();
      s.parentElement!.style.visibility = "visible";
      markSeen();
      raf = requestAnimationFrame(frame);
    };
    const hide = () => {
      t0 = -1; cancelAnimationFrame(raf); raf = 0;
      s.parentElement!.style.visibility = "hidden";
    };
    // a callout goes as soon as its gesture is made; the last one gone ends the set
    rig.onAction = (a) => {
      const k = NOTES.findIndex((n) => n.act === a);
      if (t0 < 0 || k < 0) return;
      gone.add(k);
      if (gone.size === NOTES.length) hide();
    };
    // 90 s with no input: show it again
    const arm = () => { clearTimeout(idle); idle = window.setTimeout(() => { show(); arm(); }, IDLE); };
    const evs = ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"];
    evs.forEach((e) => addEventListener(e, arm, { passive: true }));
    arm();
    const first = seen() ? 0 : window.setTimeout(() => show(), 400);
    // measurement hook (scripts/gillenwebsite/guide.mjs): show(holdMs) keeps it up for holdMs
    const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    (window as unknown as { __guide: unknown }).__guide = {
      state, shows: () => shows, gone: () => [...gone], show,
      points: () => NOTES.map((n, k) => ({ act: n.act, label: labels.current[k]!.textContent, target: targets[k](), route: route[k], opacity: +segs[k].style.opacity, labelRect: rect(labels.current[k]!), arrow: { glyph: arrows.current[k]!.textContent, px: parseFloat(getComputedStyle(arrows.current[k]!).fontSize), ...rect(arrows.current[k]!) } })),
    };
    return () => {
      hide(); clearTimeout(idle); clearTimeout(first);
      evs.forEach((e) => removeEventListener(e, arm));
      if (rig.onAction) rig.onAction = undefined;
    };
  }, [ready]);

  return (
    <div className={css.guide} style={{ visibility: "hidden" }} aria-hidden>
      <svg ref={svg} className={css.guideSvg} shapeRendering="crispEdges">
        {NOTES.map((n) => <polyline key={n.act} />)}
      </svg>
      {NOTES.map((n, k) => <span key={n.act} ref={(x) => { labels.current[k] = x; }} className={css.guideLabel} data-guide={n.act}>{n.label}</span>)}
      {NOTES.map((n, k) => <span key={n.act} ref={(x) => { arrows.current[k] = x; }} className={css.guideArrow} data-guide-arrow={n.act}>↓</span>)}
    </div>
  );
}
