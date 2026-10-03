"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getImageProps } from "next/image";
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from "d3-force";
import type { Simulation, SimulationNodeDatum } from "d3-force";
import type { WorkItem } from "@/app/api/work/route";

const ITEM_W = 140;
const PAD    = 76;

const MOBILE_BP     = 768;
const DESKTOP_SCALE = 0.82;   // desktop opens at this zoom, centred
const FIT_MARGIN    = 16;     // mobile opens with the whole cloud in view, this far from the edges
const MAX_SCALE     = 4;
const ZOOM_EASE     = 0.22;   // per-frame lerp toward the zoom goal
const PINCH_EASE    = 0.55;   // pinch follows the fingers closely, but never in one jump
const FRICTION      = 0.94;   // per-16ms velocity decay for pan inertia
const TAP_SLOP      = 8;
const DOUBLE_TAP_MS = 280;

interface Node extends SimulationNodeDatum {
  id: string;
  x: number; y: number;
  fx?: number | null;
  fy?: number | null;
}

type View = { x: number; y: number; s: number };
// Zoom goal: bring scale to `s` while moving scene point (px,py) to screen point (ax,ay)
type Goal = { s: number; ax: number; ay: number; px: number; py: number; ease?: number };
type Pt   = { x: number; y: number };

type Gesture =
  | { mode: "none" }
  | { mode: "pan";   last: Pt }
  | { mode: "drag";  id: string; item: WorkItem; moved: boolean }
  | { mode: "pinch"; d0: number; s0: number; px: number; py: number; mid: Pt }
  | { mode: "hold" };   // pinch ended with a finger still down: wait for it to lift

const COLORS = ["#c9b99a","#8a9bb0","#b0a28a","#9ab09a","#a09ab0","#b08a8a","#8ab0a0"];
function nodeColor(id: string) {
  return COLORS[Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Tiles are 140px wide and zoom to a few times that, so they get a 384px (1x) /
// 640px (2x) optimized rendition instead of the multi-megabyte original.
const TILE_SRC_W = 320;
function tileImage(src: string) {
  const { props } = getImageProps({ src, alt: "", width: TILE_SRC_W, height: TILE_SRC_W, quality: 75 });
  return { src: props.src, srcSet: props.srcSet };
}

const VIDEO_DWELL_MS = 250;
const SETTLED_ALPHA  = 0.1;   // below this the opening spread has mostly finished

// A video tile fetches nothing until it has been on screen for a moment, then plays
// only while visible — tiles that just fly past during a pan never start a download.
// `armed` holds off the first load until the opening spread settles, since every
// tile starts near the centre and crosses the screen on its way out.
function TileVideo({ src, title, armed }: { src: string; title: string; armed: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v || (!armed && !load)) return;
    let dwell: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        dwell = setTimeout(() => { setLoad(true); v.play().catch(() => {}); }, VIDEO_DWELL_MS);
      } else {
        if (dwell) { clearTimeout(dwell); dwell = null; }
        v.pause();
      }
    });
    io.observe(v);
    return () => { io.disconnect(); if (dwell) clearTimeout(dwell); };
  }, [armed, load]);
  // muted + playsInline are what let iOS and Chrome autoplay
  return <video ref={ref} src={load ? src : undefined} muted playsInline autoPlay loop preload="metadata" aria-label={title}
    style={{ display:"block", width:"100%", height:"auto", pointerEvents:"none" }} />;
}

// Past a limit, scale keeps moving but with heavy resistance; it springs back on release
function rubber(s: number, min: number, max: number) {
  if (s > max) return max * Math.pow(s / max, 0.15);
  if (s < min) return min * Math.pow(s / min, 0.15);
  return s;
}

export default function CloudView({
  items,
  onSelect,
}: {
  items: WorkItem[];
  onSelect: (item: WorkItem, tile: HTMLElement) => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const simRef   = useRef<Simulation<Node, undefined> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const onSelectRef = useRef(onSelect);

  // Camera — lives in refs and is written to the stage in rAF, never through React state
  const viewRef  = useRef<View>({ x: 0, y: 0, s: DESKTOP_SCALE });
  const goalRef  = useRef<Goal | null>(null);
  const velRef   = useRef<Pt>({ x: 0, y: 0 });          // px per ms
  const boundsRef = useRef({ min: 0.15, max: MAX_SCALE, home: DESKTOP_SCALE });
  const fitRef   = useRef<{ s: number; cx: number; cy: number } | null>(null);
  const interactedRef = useRef(false);
  const placedRef     = useRef(false);

  const [pos,  setPos]  = useState<Record<string, { x: number; y: number }>>({});
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tip,  setTip]  = useState<{ x: number; y: number; item: WorkItem } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 0 && h > 0)
        setSize(s => (s && Math.abs(s.w - w) < 2 && Math.abs(s.h - h) < 2) ? s : { w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A resize before the first gesture re-homes the camera
  useEffect(() => {
    if (!size || interactedRef.current) return;
    placedRef.current = false;
  }, [size]);

  useEffect(() => {
    if (!size || !items.length) return;
    simRef.current?.stop();
    const { w, h } = size;
    const cx = w / 2, cy = h / 2;
    const nodes: Node[] = items.map(i => ({
      id: i.id,
      x: cx + (Math.random() - .5) * w * .55,
      y: cy + (Math.random() - .5) * h * .55,
    }));
    nodesRef.current = nodes;
    simRef.current = forceSimulation(nodes)
      .force("collide", forceCollide(PAD))
      .force("center",  forceCenter(cx, cy))
      .force("charge",  forceManyBody().strength(-20))
      .alphaDecay(0.02)
      .on("tick", () => {
        const p: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) p[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPos({ ...p });
        const s = (simRef.current?.alpha() ?? 0) < SETTLED_ALPHA;
        setSettled(prev => prev || s);
      });
    return () => { simRef.current?.stop(); };
  }, [items, size]);

  // Camera loop + all input
  useEffect(() => {
    const wrap = wrapRef.current, stage = stageRef.current;
    if (!wrap || !stage) return;

    const view = viewRef.current;
    const ptrs = new Map<number, Pt>();
    let g: Gesture = { mode: "none" };
    let tap: { x: number; y: number; t: number; tile: HTMLElement | null; item: WorkItem | null; type: string } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;
    let pendingTap: ReturnType<typeof setTimeout> | null = null;
    let samples: { x: number; y: number; t: number }[] = [];
    let wheelRaw: number | null = null;
    let wheelIdle: ReturnType<typeof setTimeout> | null = null;
    let raf = 0, prevT = performance.now(), frame = 0;
    let written = "";

    const local = (cx: number, cy: number): Pt => {
      const r = wrap.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    const scenePt = (p: Pt): Pt => ({ x: (p.x - view.x) / view.s, y: (p.y - view.y) / view.s });
    const itemById = (id: string) => items.find(i => i.id === id) ?? null;

    // Cloud bounding box in scene coordinates (offsets ignore the stage transform)
    const measureFit = () => {
      const tiles = stage.querySelectorAll<HTMLElement>("[data-item-id]");
      if (!tiles.length) return;
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      tiles.forEach(el => {
        l = Math.min(l, el.offsetLeft); t = Math.min(t, el.offsetTop);
        r = Math.max(r, el.offsetLeft + el.offsetWidth); b = Math.max(b, el.offsetTop + el.offsetHeight);
      });
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const s = Math.min((W - FIT_MARGIN * 2) / (r - l), (H - FIT_MARGIN * 2) / (b - t));
      fitRef.current = { s, cx: (l + r) / 2, cy: (t + b) / 2 };
      const mobile = W < MOBILE_BP;
      const home = mobile ? s : DESKTOP_SCALE;
      boundsRef.current = { min: Math.min(s, home), max: MAX_SCALE, home };
    };

    const fitGoal = (): Goal | null => {
      const f = fitRef.current; if (!f) return null;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const { home } = boundsRef.current;
      if (W < MOBILE_BP) return { s: f.s, ax: W / 2, ay: H / 2, px: f.cx, py: f.cy };
      // Desktop home: the original centred 0.82 framing of the stage
      return { s: home, ax: W / 2, ay: H / 2, px: W / 2, py: H / 2 };
    };

    const settle = (anchor: Pt) => {
      const { min, max } = boundsRef.current;
      const heading = goalRef.current?.s ?? view.s;
      const s = clamp(heading, min, max);
      if (Math.abs(s - heading) < 1e-4) return;
      const p = scenePt(anchor);
      goalRef.current = { s, ax: anchor.x, ay: anchor.y, px: p.x, py: p.y };
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - prevT); prevT = now;
      frame++;

      if (frame % 12 === 1) measureFit();

      // Before the first gesture: hold the home framing while the simulation spreads out
      if (!interactedRef.current && fitRef.current) {
        const home = fitGoal();
        if (home) {
          if (!placedRef.current) {
            view.s = home.s; view.x = home.ax - home.px * home.s; view.y = home.ay - home.py * home.s;
            placedRef.current = true;
          } else {
            goalRef.current = home;
          }
        }
      }

      const goal = goalRef.current;
      if (goal) {
        const k = 1 - Math.pow(1 - (goal.ease ?? ZOOM_EASE), dt / 16.67);
        const curX = view.x + goal.px * view.s, curY = view.y + goal.py * view.s;
        view.s += (goal.s - view.s) * k;
        const nx = curX + (goal.ax - curX) * k, ny = curY + (goal.ay - curY) * k;
        view.x = nx - goal.px * view.s; view.y = ny - goal.py * view.s;
        if (Math.abs(goal.s - view.s) < goal.s * 1e-4 && Math.abs(goal.ax - nx) < 0.2 && Math.abs(goal.ay - ny) < 0.2) {
          view.s = goal.s; view.x = goal.ax - goal.px * goal.s; view.y = goal.ay - goal.py * goal.s;
          goalRef.current = null;
        }
      } else if (g.mode === "none") {
        const v = velRef.current;
        if (Math.abs(v.x) > 0.02 || Math.abs(v.y) > 0.02) {
          view.x += v.x * dt; view.y += v.y * dt;
          const f = Math.pow(FRICTION, dt / 16.67);
          v.x *= f; v.y *= f;
        } else { v.x = 0; v.y = 0; }
      }

      const t = `translate3d(${view.x}px,${view.y}px,0) scale(${view.s})`;
      if (t !== written) { stage.style.transform = t; written = t; }
    };
    raf = requestAnimationFrame(tick);

    const interrupt = () => {
      interactedRef.current = true;
      goalRef.current = null;
      velRef.current = { x: 0, y: 0 };
    };

    const releaseDrag = () => {
      if (g.mode !== "drag") return;
      const id = g.id;
      const node = nodesRef.current.find(n => n.id === id);
      if (node) { node.fx = null; node.fy = null; }
      simRef.current?.alphaTarget(0).restart();
      setDraggingId(null);
    };

    const startPinch = () => {
      const [a, b] = [...ptrs.values()];
      const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      const p = scenePt(mid);
      g = { mode: "pinch", d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), s0: view.s, px: p.x, py: p.y, mid };
    };

    const doubleTap = (at: Pt) => {
      const { max, home } = boundsRef.current;
      if (view.s > home * 1.3) {
        goalRef.current = fitGoal();
      } else {
        const p = scenePt(at);
        goalRef.current = { s: Math.min(max, view.s * 2.5), ax: at.x, ay: at.y, px: p.x, py: p.y };
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      interrupt();
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-item-id]");

      if (ptrs.size === 2) {
        releaseDrag();
        tap = null;
        startPinch();
        return;
      }
      if (ptrs.size > 2) return;

      const item = tile ? itemById(tile.dataset.itemId!) : null;
      tap = { x: e.clientX, y: e.clientY, t: performance.now(), tile, item, type: e.pointerType };
      samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      setTip(null);
      // Mouse on a tile drags the tile; touch anywhere pans the cloud
      if (e.pointerType === "mouse" && tile && item) {
        g = { mode: "drag", id: item.id, item, moved: false };
        setDraggingId(item.id);
      } else {
        g = { mode: "pan", last: { x: e.clientX, y: e.clientY } };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP) tap = null;

      if (g.mode === "pinch" && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const { min, max } = boundsRef.current;
        const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
        const s = rubber(g.s0 * Math.hypot(b.x - a.x, b.y - a.y) / g.d0, min, max);
        goalRef.current = { s, ax: mid.x, ay: mid.y, px: g.px, py: g.py, ease: PINCH_EASE };
        g.mid = mid;
      } else if (g.mode === "pan") {
        view.x += e.clientX - g.last.x;
        view.y += e.clientY - g.last.y;
        g.last = { x: e.clientX, y: e.clientY };
        const now = performance.now();
        samples.push({ x: e.clientX, y: e.clientY, t: now });
        while (samples.length > 2 && now - samples[0].t > 80) samples.shift();
      } else if (g.mode === "drag") {
        const r = wrap.getBoundingClientRect();
        const id = g.id;
        const node = nodesRef.current.find(n => n.id === id);
        if (node && !tap) {
          node.fx = (e.clientX - r.left - view.x) / view.s;
          node.fy = (e.clientY - r.top  - view.y) / view.s;
          g.moved = true;
          simRef.current?.alphaTarget(0.3).restart();
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);

      if (g.mode === "pinch") {
        if (ptrs.size < 2) {
          settle(g.mid);
          g = ptrs.size ? { mode: "hold" } : { mode: "none" };
        }
        return;
      }
      if (ptrs.size) return;

      if (g.mode === "pan") {
        const now = performance.now();
        const s0 = samples[0], s1 = samples[samples.length - 1];
        if (s0 && s1 && now - s1.t < 60 && s1.t > s0.t) {
          velRef.current = { x: (s1.x - s0.x) / (s1.t - s0.t), y: (s1.y - s0.y) / (s1.t - s0.t) };
        }
      }
      if (g.mode === "drag") {
        const wasClick = !g.moved, item = g.item;
        releaseDrag();
        const tile = tap?.tile;
        if (wasClick && tile) onSelectRef.current(item, tile);
      } else if (tap && e.type === "pointerup" && performance.now() - tap.t < 350) {
        const at = local(tap.x, tap.y);
        const now = performance.now();
        if (tap.type !== "mouse") {
          if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 30) {
            if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
            lastTap = null;
            doubleTap(at);
          } else {
            lastTap = { x: tap.x, y: tap.y, t: now };
            const { tile, item } = tap;
            // A single tap on a tile waits out the double-tap window before opening
            if (tile && item) pendingTap = setTimeout(() => { pendingTap = null; onSelectRef.current(item, tile); }, DOUBLE_TAP_MS);
          }
        }
      }
      tap = null;
      g = { mode: "none" };
    };

    const onDblClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-item-id]")) return;
      interrupt();
      doubleTap(local(e.clientX, e.clientY));
    };

    // A notched mouse wheel reports whole lines/pages, or a large whole-number deltaY with
    // no deltaX (Chrome: ±100 per notch, scaled by page zoom). Trackpads send small or
    // fractional deltas, often with deltaX. Once a scroll reads as trackpad it stays that
    // way until the wheel goes quiet, so a fast flick's big deltas don't flip into zoom.
    let trackpadUntil = 0;
    const isMouseWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now < trackpadUntil) { trackpadUntil = now + 200; return false; }
      const mouse = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);
      if (!mouse) trackpadUntil = now + 200;
      return mouse;
    };

    // ctrl/⌘+wheel is a trackpad pinch: zoom toward the cursor, matching the fingers
    // (Chrome reports a pinch as deltaY = -100·ln(scale), so k = 0.01 is 1:1).
    // A mouse wheel zooms toward the cursor; a trackpad two-finger scroll pans.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interrupt();
      const lineOrPage = (d: number, page: number) => e.deltaMode === 1 ? d * 16 : e.deltaMode === 2 ? d * page : d;
      const dx = lineOrPage(e.deltaX, wrap.clientWidth);
      const dy = lineOrPage(e.deltaY, wrap.clientHeight);
      const pinch = e.ctrlKey || e.metaKey;
      // A tilt wheel's sideways click has nothing to zoom with, so it pans too
      if (!pinch && (!isMouseWheel(e) || dy === 0)) {
        view.x -= dx; view.y -= dy;
        return;
      }
      const { min, max } = boundsRef.current;
      const k = pinch ? 0.01 : 0.0015;
      const base = wheelRaw ?? goalRef.current?.s ?? view.s;
      wheelRaw = clamp(base * Math.exp(-dy * k), min * 0.5, max * 2);
      const at = local(e.clientX, e.clientY);
      const p = scenePt(at);
      goalRef.current = { s: rubber(wheelRaw, min, max), ax: at.x, ay: at.y, px: p.x, py: p.y };
      if (wheelIdle) clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => {
        wheelRaw = null;
        const s = clamp(goalRef.current?.s ?? view.s, min, max);
        const q = scenePt(at);
        goalRef.current = { s, ax: at.x, ay: at.y, px: q.x, py: q.y };
      }, 160);
    };

    // Safari trackpad pinch arrives as gesture events, not ctrl+wheel. iOS also fires
    // them for touch pinches, which the pointer handlers already own.
    let gs0 = 1;
    const onGestureStart = (e: Event) => { e.preventDefault(); if (ptrs.size) return; interrupt(); gs0 = view.s; };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      if (ptrs.size) return;
      const ge = e as Event & { scale: number; clientX: number; clientY: number };
      const { min, max } = boundsRef.current;
      const at = local(ge.clientX, ge.clientY);
      const p = scenePt(at);
      goalRef.current = { s: rubber(gs0 * ge.scale, min, max), ax: at.x, ay: at.y, px: p.x, py: p.y };
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      if (ptrs.size) return;
      const ge = e as Event & { clientX: number; clientY: number };
      settle(local(ge.clientX, ge.clientY));
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("dblclick", onDblClick);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("gesturestart", onGestureStart);
    wrap.addEventListener("gesturechange", onGestureChange);
    wrap.addEventListener("gestureend", onGestureEnd);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      if (pendingTap) clearTimeout(pendingTap);
      if (wheelIdle) clearTimeout(wheelIdle);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("dblclick", onDblClick);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("gesturestart", onGestureStart);
      wrap.removeEventListener("gesturechange", onGestureChange);
      wrap.removeEventListener("gestureend", onGestureEnd);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [items]);

  return (
    <div
      ref={wrapRef}
      style={{ position:"absolute", inset:0, overflow:"hidden", cursor: draggingId ? "grabbing" : "grab", zIndex:1, touchAction:"none", userSelect:"none", WebkitUserSelect:"none" }}
    >
      <div ref={stageRef} style={{
        position:"absolute", top:0, left:0,
        width:  size?.w ?? "100%",
        height: size?.h ?? "100%",
        transformOrigin: "0 0",
        willChange: "transform",
      }}>
        <AnimatePresence>
          {items.map((item, idx) => {
            const p   = pos[item.id]; if (!p) return null;
            const src = item.images?.[0] ?? item.image ?? null;
            const isDragging = draggingId === item.id;
            return (
              <motion.div
                key={item.id}
                data-item-id={item.id}
                onPointerEnter={e => {
                  if (e.pointerType !== "mouse" || draggingId) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ x: r.right, y: r.top + r.height / 2, item });
                }}
                onPointerLeave={() => setTip(null)}
                style={{
                  position:  "absolute",
                  width:      ITEM_W,
                  left:       p.x - ITEM_W / 2,
                  top:        p.y - PAD / 2,
                  background: nodeColor(item.id),
                  cursor:     isDragging ? "grabbing" : "pointer",
                  overflow:   "hidden",
                  zIndex:     isDragging ? 20 : undefined,
                  boxShadow:  isDragging ? "0 8px 32px rgba(0,0,0,0.18)" : undefined,
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.4, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: idx * 0.04 }}
                whileHover={!isDragging ? { scale: 1.08, transition: { duration: 0.15 } } : undefined}
              >
                {src
                  ? <img {...tileImage(src)} data-full-src={src} alt={item.title} style={{ display:"block", width:"100%", height:"auto", pointerEvents:"none", userSelect:"none" }} loading="lazy" draggable={false} />
                  : item.video
                    ? <TileVideo src={item.video} title={item.title} armed={settled} />
                    : <div style={{ width: ITEM_W, height: 100 }} />
                }
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tooltip — desktop only */}
      <AnimatePresence>
        {tip && !draggingId && (
          <motion.div
            style={{ position:"fixed", left: tip.x + 14, top: tip.y, transform:"translateY(-50%)", background:"#fff", border:"1px solid #e8e8e8", borderRadius:4, padding:"10px 14px", pointerEvents:"none", zIndex:30, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:200 }}
            initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-6 }} transition={{ duration: 0.13 }}
          >
            <div style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#111", marginBottom:4 }}>{tip.item.title}</div>
            <div style={{ fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", color:"#aaa" }}>
              {tip.item.category.replace(/-/g, " ")}{tip.item.year ? ` · ${tip.item.year}` : ""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
