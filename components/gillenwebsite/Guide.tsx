"use client";
// The first-load guide over the Rolodex: four notes, each a 6 px dot on what it explains, a 1 px line out from the
// dot and a small-caps label at the line's end. The front sleeve (flip), the left knob (spin faster), the white
// ground beside the drum (turn), the caption block (open). They draw 300 ms apart, each line over 250 ms with its
// label fading in after it; the set holds 2.5 s, then fades over 400 ms. A note goes at once when its gesture is
// made (rig.onAction). The dots follow their targets every frame, as the drum turns or the camera moves.
// Shown on the first visit (localStorage), and again after 90 s with no input.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { rig, wrap } from "./rig";
import css from "./site.module.css";

const KEY = "gillenwebsite:guide-seen";
const STAGGER = 300, LINE = 250, LABEL = 200, HOLD = 2500, FADE = 400, IDLE = 90000;
type Act = "flip" | "knob" | "orbit" | "open";
// each note: its gesture, its label, and where the label sits from the dot (px; flipped sideways to stay on screen)
const NOTES: { act: Act; label: string; dx: number; dy: number }[] = [
  { act: "flip", label: "SCROLL OR SWIPE TO FLIP", dx: 70, dy: -64 },
  { act: "knob", label: "TAP TO SPIN FASTER", dx: -56, dy: 58 },
  { act: "orbit", label: "DRAG TO TURN", dx: 48, dy: 40 },
  { act: "open", label: "TAP TO OPEN", dx: 44, dy: -44 },
];

const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode: shown each visit */ } };

export default function Guide({ ready }: { ready: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!ready) return;
    const s = svg.current!;
    const box = new THREE.Box3(), v = new THREE.Vector3();
    // where each target is on screen now (CSS px), or null while it is off the stage
    // (outer: the middle of the box's outer side, -x: the knob's dial as seen, not its middle inside the housing)
    const project = (o: THREE.Object3D | undefined, outer = false) => {
      if (!o || !rig.camera || !rig.hit) return null;
      box.setFromObject(o).getCenter(v);
      if (outer) v.x = box.min.x;
      v.project(rig.camera);
      const b = rig.hit.parentElement!.getBoundingClientRect();
      return { x: b.left + (v.x + 1) * 0.5 * b.width, y: b.top + (1 - v.y) * 0.5 * b.height };
    };
    const targets: (() => { x: number; y: number } | null)[] = [
      () => project(rig.cards[wrap(Math.round(rig.s), rig.TOTAL)]),
      () => project(rig.knobs.find((p) => p.getObjectByName("knob_left"))?.getObjectByName("knob_left"), true),
      // the white ground: the stage's top left, clear of the drum and the loading label
      () => { const b = rig.hit?.parentElement?.getBoundingClientRect(); return b ? { x: b.left + Math.min(110, b.width * 0.13), y: b.top + Math.max(124, b.height * 0.16) } : null; },
      () => { const c = document.querySelector<HTMLElement>("[data-src='17'][role=button]")?.getBoundingClientRect(); return c ? { x: c.left + Math.min(32, c.width / 4), y: c.top } : null; },
    ];
    const dots = [...s.querySelectorAll<SVGCircleElement>("circle")], lines = [...s.querySelectorAll<SVGLineElement>("line")];

    let t0 = -1, raf = 0, idle = 0, shows = 0, hold = HOLD;
    const gone = new Set<number>();
    const state = () => {
      if (t0 < 0) return "hidden";
      const t = performance.now() - t0, drawn = STAGGER * (NOTES.length - 1) + LINE + LABEL;
      return t < drawn ? "drawing" : t < drawn + hold ? "holding" : t < drawn + hold + FADE ? "fading" : "hidden";
    };
    const frame = () => {
      raf = 0;
      if (t0 < 0) return;
      const t = performance.now() - t0, drawn = STAGGER * (NOTES.length - 1) + LINE + LABEL;
      const fade = Math.max(0, Math.min(1, (t - drawn - hold) / FADE));
      if (fade >= 1) { hide(); return; }
      const vw = document.documentElement.clientWidth;
      NOTES.forEach((n, k) => {
        const p = targets[k](), dot = dots[k], line = lines[k], lab = labels.current[k]!;
        const local = t - k * STAGGER, draw = Math.max(0, Math.min(1, local / LINE)), lab01 = Math.max(0, Math.min(1, (local - LINE) / LABEL));
        const on = p && local >= 0 && !gone.has(k);
        const op = on ? 1 - fade : 0;
        dot.style.opacity = line.style.opacity = String(op);
        lab.style.opacity = String(op * lab01);
        if (!p) return;
        // the label goes the other way when it would leave the screen
        const w = lab.offsetWidth;
        const dx = (n.dx > 0 ? p.x + n.dx + w + 16 > vw : p.x + n.dx - w - 16 < 0) ? -n.dx : n.dx;
        const ex = p.x + dx, ey = p.y + n.dy;
        // and is kept on screen when it fits neither way
        const lx = Math.max(8, Math.min(vw - w - 8, dx > 0 ? ex + 6 : ex - 6 - w));
        dot.setAttribute("cx", String(p.x)); dot.setAttribute("cy", String(p.y));
        // the line draws out from the dot
        line.setAttribute("x1", String(p.x)); line.setAttribute("y1", String(p.y));
        line.setAttribute("x2", String(p.x + (ex - p.x) * draw)); line.setAttribute("y2", String(p.y + (ey - p.y) * draw));
        lab.style.transform = `translate(${lx}px, ${ey - lab.offsetHeight / 2}px)`;
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
    // a note goes as soon as its gesture is made; the last one gone ends the set
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
    (window as unknown as { __guide: unknown }).__guide = {
      state, shows: () => shows, gone: () => [...gone],
      show,
      points: () => NOTES.map((n, k) => ({ act: n.act, target: targets[k](), dot: { x: +dots[k].getAttribute("cx")!, y: +dots[k].getAttribute("cy")! }, opacity: +dots[k].style.opacity })),
    };
    return () => {
      hide(); clearTimeout(idle); clearTimeout(first);
      evs.forEach((e) => removeEventListener(e, arm));
      if (rig.onAction) rig.onAction = undefined;
    };
  }, [ready]);

  return (
    <div className={css.guide} style={{ visibility: "hidden" }} aria-hidden>
      <svg ref={svg} className={css.guideSvg}>
        {NOTES.map((n) => <g key={n.act}><line /><circle r={3} /></g>)}
      </svg>
      {NOTES.map((n, k) => <span key={n.act} ref={(x) => { labels.current[k] = x; }} className={css.guideLabel} data-guide={n.act}>{n.label}</span>)}
    </div>
  );
}
