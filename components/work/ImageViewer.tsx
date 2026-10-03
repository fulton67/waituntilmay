"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO } from "@/lib/theme";

export type Slide = { src: string; kind: "image" | "video"; item: WorkItem };

const MOBILE_BP     = 768;
const MAX_ZOOM      = 4;
const DOUBLE_TAP_MS = 280;
const TAP_SLOP      = 8;
const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type Rect = { left: number; top: number; width: number; height: number };
type Pt   = { x: number; y: number };
type Zoom = { z: number; x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function rubber(z: number) {
  if (z > MAX_ZOOM) return MAX_ZOOM * Math.pow(z / MAX_ZOOM, 0.15);
  if (z < 1) return Math.pow(z, 0.15);
  return z;
}

// Cargo URLs in the work data point at its 1000px resize (/w/1000/i/...); the viewer
// fills the screen, so it asks cargo for the original (/i/...) instead.
function fullRes(src: string) {
  return src.replace(/^(https:\/\/freight\.cargo\.site)\/w\/\d+\/(i\/)/, "$1/$2");
}

// Largest box with the slide's aspect ratio that fits the stage, centred in it
function fitBox(ar: number, stage: { w: number; h: number }): Rect {
  const width = Math.min(stage.w, stage.h * ar);
  const height = width / ar;
  return { left: (stage.w - width) / 2, top: (stage.h - height) / 2, width, height };
}

// Aspect ratios of images the cloud has already decoded, so the first frame is the right shape
function seedRatios(slides: Slide[]) {
  const out: Record<string, number> = {};
  if (typeof document === "undefined") return out;
  const wanted = new Set(slides.map(s => s.src));
  document.querySelectorAll<HTMLImageElement>("img").forEach(img => {
    const src = img.dataset.fullSrc ?? img.getAttribute("src");
    if (src && wanted.has(src) && img.complete && img.naturalWidth) out[src] = img.naturalWidth / img.naturalHeight;
  });
  return out;
}

export default function ImageViewer({
  slides,
  start,
  getTileRect,
  onClose,
  onInfo,
}: {
  slides: Slide[];
  start: number;
  getTileRect: (itemId: string) => DOMRect | null;
  onClose: () => void;
  onInfo: (item: WorkItem) => void;
}) {
  const rootRef     = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const flipRef     = useRef<HTMLDivElement>(null);
  const zoomRef     = useRef<HTMLDivElement>(null);
  const chromeRef   = useRef<HTMLDivElement>(null);

  const [idx, setIdx]     = useState(start);
  const [ars, setArs]     = useState<Record<string, number>>(() => seedRatios(slides));
  const [stage, setStage] = useState<{ w: number; h: number; left: number; top: number } | null>(null);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < MOBILE_BP);

  // Mutable gesture state shared with the native listeners
  const live = useRef({ idx: start, stage, box: null as Rect | null, zoom: { z: 1, x: 0, y: 0 } as Zoom, busy: false, closing: false });

  const slide = slides[idx];
  const box = stage ? fitBox(ars[slide.src] ?? 4 / 5, stage) : null;

  useLayoutEffect(() => {
    live.current.idx = idx;
    live.current.stage = stage;
    live.current.box = box;
  });

  const setRatio = (src: string, w: number, h: number) => {
    if (w && h) setArs(a => (a[src] ? a : { ...a, [src]: w / h }));
  };

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    const el = stageRef.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height, left: r.left, top: r.top });
    });
    ro.observe(el);
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); html.style.overflow = prev; };
  }, []);

  // A new slide starts unzoomed and centred
  useLayoutEffect(() => {
    live.current.zoom = { z: 1, x: 0, y: 0 };
    if (zoomRef.current) zoomRef.current.style.transform = "";
    if (trackRef.current) trackRef.current.style.transform = "";
  }, [idx]);

  // Open: grow from the tile into place
  const openedRef = useRef(false);
  useLayoutEffect(() => {
    if (openedRef.current || !stage || !box) return;
    openedRef.current = true;
    const flip = flipRef.current!, backdrop = backdropRef.current!, chrome = chromeRef.current!;
    const t = getTileRect(slide.item.id);
    animate(backdrop, { opacity: [0, 1] }, { duration: 0.3 });
    animate(chrome, { opacity: [0, 1] }, { duration: 0.3, delay: 0.15 });
    // Runs before paint: pin the first frame on the tile so the full-size image never flashes
    if (t && t.width > 0) {
      const dx = t.left - (stage.left + box.left), dy = t.top - (stage.top + box.top), sx = t.width / box.width;
      flip.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${sx})`;
      animate(flip, { x: [dx, 0], y: [dy, 0], scale: [sx, 1] }, { duration: 0.42, ease: EASE });
    } else {
      flip.style.opacity = "0";
      animate(flip, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.3, ease: EASE });
    }
  });

  const close = () => {
    const L = live.current;
    if (L.closing) return;
    L.closing = true;
    const flip = flipRef.current, track = trackRef.current, st = L.stage, b = L.box;
    animate(chromeRef.current!, { opacity: 0 }, { duration: 0.15 });
    animate(backdropRef.current!, { opacity: 0 }, { duration: 0.3 });
    if (!flip || !track || !st || !b) { onClose(); return; }

    // Fold the current drag/zoom into the flip transform, then fly back to the tile
    if (zoomRef.current) zoomRef.current.style.transform = "";
    const cur = flip.getBoundingClientRect();
    track.style.transform = "";
    const ox = st.left + b.left, oy = st.top + b.top;
    const from = { x: cur.left - ox, y: cur.top - oy, scale: cur.width / b.width };
    const t = getTileRect(slides[L.idx].item.id);
    const onScreen = t && t.width > 0 && t.right > 0 && t.bottom > 0 && t.left < window.innerWidth && t.top < window.innerHeight;
    const to = onScreen
      ? { x: t.left - ox, y: t.top - oy, scale: t.width / b.width, opacity: 1 }
      : { x: from.x, y: from.y + 40, scale: from.scale * 0.92, opacity: 0 };
    animate(flip, { x: [from.x, to.x], y: [from.y, to.y], scale: [from.scale, to.scale], opacity: [1, to.opacity] },
      { duration: 0.34, ease: EASE }).then(onClose);
  };

  // Slide the track one page over, then hand the index to React
  const go = (dir: 1 | -1, fromX = 0) => {
    const L = live.current;
    const next = L.idx + dir;
    if (L.busy || L.closing || !L.stage || next < 0 || next >= slides.length) {
      if (fromX) settleTrack(fromX, 0);
      return;
    }
    L.busy = true;
    const w = window.innerWidth;
    animate(fromX, -dir * w, {
      duration: 0.28, ease: EASE,
      onUpdate: v => { if (trackRef.current) trackRef.current.style.transform = `translate3d(${v}px,0,0)`; },
    }).then(() => { L.busy = false; setIdx(next); });
  };

  const settleTrack = (fromX: number, fromY: number) => {
    animate(0, 1, {
      duration: 0.26, ease: EASE,
      onUpdate: k => {
        const x = fromX * (1 - k), y = fromY * (1 - k);
        if (trackRef.current) trackRef.current.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 - Math.max(0, y) / window.innerHeight * 0.25})`;
        if (backdropRef.current) backdropRef.current.style.opacity = String(1 - clamp(y / (window.innerHeight * 0.5), 0, 0.7));
      },
    });
  };

  const applyZoom = (zm: Zoom) => {
    live.current.zoom = zm;
    if (zoomRef.current) zoomRef.current.style.transform = `translate3d(${zm.x}px,${zm.y}px,0) scale(${zm.z})`;
  };

  // Clamp zoom into range and keep the image covering its box
  const settleZoom = () => {
    const b = live.current.box; if (!b) return;
    const from = { ...live.current.zoom };
    const z = clamp(from.z, 1, MAX_ZOOM);
    // Keep the box centre stable when the rubber-band pulls scale back
    const cx = b.width / 2, cy = b.height / 2;
    const px = (cx - from.x) / from.z, py = (cy - from.y) / from.z;
    const to = {
      z,
      x: clamp(cx - px * z, b.width - b.width * z, 0),
      y: clamp(cy - py * z, b.height - b.height * z, 0),
    };
    if (from.z === to.z && from.x === to.x && from.y === to.y) return;
    animate(0, 1, {
      duration: 0.3, ease: EASE,
      onUpdate: k => applyZoom({ z: from.z + (to.z - from.z) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }),
    });
  };

  const toggleZoom = (at: Pt) => {
    const L = live.current, b = L.box, st = L.stage; if (!b || !st) return;
    const from = { ...L.zoom };
    let to: Zoom;
    if (from.z > 1.01) to = { z: 1, x: 0, y: 0 };
    else {
      const lx = at.x - st.left - b.left, ly = at.y - st.top - b.top;
      to = { z: 2, x: clamp(lx - lx * 2, b.width - b.width * 2, 0), y: clamp(ly - ly * 2, b.height - b.height * 2, 0) };
    }
    animate(0, 1, {
      duration: 0.3, ease: EASE,
      onUpdate: k => applyZoom({ z: from.z + (to.z - from.z) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }),
    });
  };

  const actions = useRef({ close, go, settleTrack, settleZoom, toggleZoom, applyZoom });
  useLayoutEffect(() => { actions.current = { close, go, settleTrack, settleZoom, toggleZoom, applyZoom }; });

  // Gestures: pinch/pan when zoomed, swipe sideways to page, swipe down to close
  useEffect(() => {
    const root = rootRef.current!;
    const A = () => actions.current;
    const ptrs = new Map<number, Pt>();
    type G =
      | { mode: "none" }
      | { mode: "pending"; start: Pt }
      | { mode: "swipe-x" | "swipe-y"; start: Pt }
      | { mode: "pan"; last: Pt }
      | { mode: "pinch"; d0: number; z0: number; px: number; py: number }
      | { mode: "hold" };
    let g: G = { mode: "none" };
    let tap: { x: number; y: number; t: number; onImage: boolean } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;
    let samples: { x: number; y: number; t: number }[] = [];

    const boxOrigin = () => {
      const L = live.current;
      return L.stage && L.box ? { x: L.stage.left + L.box.left, y: L.stage.top + L.box.top } : { x: 0, y: 0 };
    };
    const velocity = () => {
      const a = samples[0], b = samples[samples.length - 1];
      if (!a || !b || b.t === a.t || performance.now() - b.t > 60) return { x: 0, y: 0 };
      return { x: (b.x - a.x) / (b.t - a.t), y: (b.y - a.y) / (b.t - a.t) };
    };
    const track = (x: number, y: number) => {
      const t = trackRef.current; if (!t) return;
      t.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 - Math.max(0, y) / window.innerHeight * 0.25})`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(1 - clamp(y / (window.innerHeight * 0.5), 0, 0.7));
    };

    const onDown = (e: PointerEvent) => {
      if (live.current.closing || live.current.busy) return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        tap = null;
        const [a, b] = [...ptrs.values()];
        const o = boxOrigin(), zm = live.current.zoom;
        const mx = (a.x + b.x) / 2 - o.x, my = (a.y + b.y) / 2 - o.y;
        if (g.mode === "swipe-x" || g.mode === "swipe-y") track(0, 0);
        g = { mode: "pinch", d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), z0: zm.z, px: (mx - zm.x) / zm.z, py: (my - zm.y) / zm.z };
        return;
      }
      if (ptrs.size > 2) return;
      const onImage = !!flipRef.current?.contains(e.target as Node);
      tap = { x: e.clientX, y: e.clientY, t: performance.now(), onImage };
      samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      g = live.current.zoom.z > 1.01 ? { mode: "pan", last: { x: e.clientX, y: e.clientY } } : { mode: "pending", start: { x: e.clientX, y: e.clientY } };
    };

    const onMove = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = performance.now();
      samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (samples.length > 2 && now - samples[0].t > 80) samples.shift();
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP) tap = null;

      if (g.mode === "pinch" && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const o = boxOrigin();
        const mx = (a.x + b.x) / 2 - o.x, my = (a.y + b.y) / 2 - o.y;
        const z = rubber(g.z0 * Math.hypot(b.x - a.x, b.y - a.y) / g.d0);
        A().applyZoom({ z, x: mx - g.px * z, y: my - g.py * z });
      } else if (g.mode === "pan") {
        const zm = live.current.zoom;
        A().applyZoom({ z: zm.z, x: zm.x + e.clientX - g.last.x, y: zm.y + e.clientY - g.last.y });
        g.last = { x: e.clientX, y: e.clientY };
      } else if (g.mode === "pending") {
        const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
        if (Math.hypot(dx, dy) > 10) g = { mode: Math.abs(dx) > Math.abs(dy) ? "swipe-x" : "swipe-y", start: g.start };
      }
      if (g.mode === "swipe-x") {
        const L = live.current;
        let dx = e.clientX - g.start.x;
        if ((dx > 0 && L.idx === 0) || (dx < 0 && L.idx === slides.length - 1)) dx *= 0.3;
        track(dx, 0);
      } else if (g.mode === "swipe-y") {
        const dy = e.clientY - g.start.y;
        track(0, dy > 0 ? dy : dy * 0.2);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (g.mode === "pinch") {
        if (ptrs.size < 2) { A().settleZoom(); g = ptrs.size ? { mode: "hold" } : { mode: "none" }; }
        return;
      }
      if (ptrs.size) return;

      const v = velocity();
      const quickTap = tap && e.type === "pointerup" && performance.now() - tap.t < 350;
      if (quickTap && tap) {
        const now = performance.now();
        if (!tap.onImage) A().close();
        else if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 30) {
          lastTap = null;
          A().toggleZoom({ x: tap.x, y: tap.y });
        } else lastTap = { x: tap.x, y: tap.y, t: now };
      } else if (g.mode === "pan") A().settleZoom();
      else if (g.mode === "swipe-x") {
        const dx = e.clientX - g.start.x;
        const w = window.innerWidth;
        if (dx < -w * 0.18 || v.x < -0.45) A().go(1, dx);
        else if (dx > w * 0.18 || v.x > 0.45) A().go(-1, dx);
        else A().settleTrack(dx, 0);
      } else if (g.mode === "swipe-y") {
        const dy = e.clientY - g.start.y;
        if (dy > 110 || v.y > 0.5) A().close();
        else A().settleTrack(0, dy > 0 ? dy : dy * 0.2);
      }
      tap = null;
      g = { mode: "none" };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const L = live.current; if (!L.box || L.closing) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const zm = L.zoom, o = boxOrigin();
      const z = clamp(zm.z * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002)), 1, MAX_ZOOM);
      const mx = e.clientX - o.x, my = e.clientY - o.y;
      const px = (mx - zm.x) / zm.z, py = (my - zm.y) / zm.z;
      const b = L.box;
      A().applyZoom({ z, x: clamp(mx - px * z, b.width - b.width * z, 0), y: clamp(my - py * z, b.height - b.height * z, 0) });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") A().close();
      else if (e.key === "ArrowRight") A().go(1);
      else if (e.key === "ArrowLeft") A().go(-1);
    };
    const stopGesture = (e: Event) => e.preventDefault();

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("gesturestart", stopGesture);
    root.addEventListener("gesturechange", stopGesture);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("gesturestart", stopGesture);
      root.removeEventListener("gesturechange", stopGesture);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [slides.length]);

  const pill: React.CSSProperties = {
    fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: FONT_MONO, color: "#111",
    background: "rgba(250,250,250,0.86)", border: "none", borderRadius: 999, padding: "8px 12px",
    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={slide.item.title}
      style={{ position: "fixed", left: 0, top: 0, width: "100%", height: "100dvh", zIndex: 60, touchAction: "none", userSelect: "none", WebkitUserSelect: "none", overflow: "hidden" }}
    >
      <div ref={backdropRef} style={{ position: "absolute", inset: 0, background: "rgba(250,250,250,0.98)", opacity: 0 }} />

      {/* Stage: the area an image may fill. Phone: full width less 16px, full height inside the safe area */}
      <div
        ref={stageRef}
        style={mobile
          ? { position: "absolute", top: "env(safe-area-inset-top)", bottom: "env(safe-area-inset-bottom)", left: "max(8px, env(safe-area-inset-left))", right: "max(8px, env(safe-area-inset-right))" }
          : { position: "absolute", top: 56, bottom: 56, left: 24, right: 24 }}
      >
        <div ref={trackRef} style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", willChange: "transform" }}>
          {stage && [idx - 1, idx, idx + 1].map(i => {
            const s = slides[i]; if (!s) return null;
            const b = fitBox(ars[s.src] ?? 4 / 5, stage);
            const current = i === idx;
            const media = s.kind === "video"
              ? <video src={s.src} autoPlay muted loop playsInline onLoadedMetadata={e => setRatio(s.src, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={fullRes(s.src)} alt={s.item.title} draggable={false} decoding="async"
                  data-viewer-image={current ? "current" : undefined}
                  onLoad={e => setRatio(s.src, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />;
            return (
              <div
                key={`${i}:${s.src}`}
                ref={current ? flipRef : undefined}
                style={{
                  position: "absolute", left: b.left + (i - idx) * window.innerWidth, top: b.top, width: b.width, height: b.height,
                  transformOrigin: "0 0",
                }}
              >
                <div ref={current ? zoomRef : undefined} style={{ width: "100%", height: "100%", transformOrigin: "0 0", willChange: "transform" }}>
                  {media}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chrome */}
      <div ref={chromeRef} style={{ opacity: 0 }}>
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 12px)", left: "max(12px, env(safe-area-inset-left))", ...pill, pointerEvents: "none" }}>
          {slide.item.title}
        </div>
        <button aria-label="Close" onClick={() => actions.current.close()}
          style={{ ...pill, position: "absolute", top: "calc(env(safe-area-inset-top) + 8px)", right: "max(8px, env(safe-area-inset-right))", width: 40, height: 40, padding: 0, fontSize: 18, lineHeight: "40px", letterSpacing: 0, cursor: "pointer" }}>
          ×
        </button>
        <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom) + 12px)", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
          <button aria-label="Previous" onClick={() => actions.current.go(-1)} disabled={idx === 0} style={{ ...pill, cursor: "pointer", opacity: idx === 0 ? 0.35 : 1 }}>←</button>
          <span style={{ ...pill, pointerEvents: "none" }}>{idx + 1} / {slides.length}</span>
          <button onClick={() => onInfo(slide.item)} style={{ ...pill, cursor: "pointer" }}>info</button>
          <button aria-label="Next" onClick={() => actions.current.go(1)} disabled={idx === slides.length - 1} style={{ ...pill, cursor: "pointer", opacity: idx === slides.length - 1 ? 0.35 : 1 }}>→</button>
        </div>
      </div>
    </div>
  );
}
