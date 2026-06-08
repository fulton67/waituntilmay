"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  forceSimulation,
  forceCollide,
  forceCenter,
  forceManyBody,
  SimulationNodeDatum,
} from "d3-force";
import type { WorkItem } from "@/app/api/work/route";

const ITEM_W = 140;
const COLLISION_R = 76;
const CLICK_THRESHOLD = 6;

interface CloudNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface Tooltip {
  x: number;
  y: number;
  title: string;
  year: string;
  category: string;
  role: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "fine-arts": "fine arts",
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "consulting": "consulting",
};

function hashColor(id: string): string {
  const palette = ["#c9b99a", "#8a9bb0", "#b0a28a", "#9ab09a", "#a09ab0", "#b08a8a", "#8ab0a0"];
  const idx = Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % palette.length;
  return palette[idx];
}

interface Viewport { scale: number; x: number; y: number; }

interface Gesture {
  type: "item" | "canvas";
  itemId: string | null;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  moved: boolean;
}

export default function CloudView({
  items,
  onSelect,
}: {
  items: WorkItem[];
  onSelect: (item: WorkItem) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null);
  const nodesRef = useRef<CloudNode[]>([]);
  const gestureRef = useRef<Gesture | null>(null);
  const vpRef = useRef<Viewport>(viewport);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // ── Measure container ──────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize((prev) => {
          if (prev && Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev;
          return { w: width, h: height };
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Initial viewport centering ─────────────────────────────────────
  useEffect(() => {
    if (!size) return;
    const s = 0.82;
    setViewport({
      scale: s,
      x: (size.w * (1 - s)) / 2,
      y: (size.h * (1 - s)) / 2,
    });
  }, [size]);

  // ── D3 simulation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!size || items.length === 0) return;
    simRef.current?.stop();

    const { w, h } = size;
    const cx = w / 2;
    const cy = h / 2;

    const nodes: CloudNode[] = items.map((item) => ({
      id: item.id,
      x: cx + (Math.random() - 0.5) * w * 0.55,
      y: cy + (Math.random() - 0.5) * h * 0.55,
      vx: 0,
      vy: 0,
    }));

    nodesRef.current = nodes;

    simRef.current = forceSimulation(nodes)
      .force("collide", forceCollide(COLLISION_R))
      .force("center", forceCenter(cx, cy))
      .force("charge", forceManyBody().strength(-20))
      .alphaDecay(0.035)
      .on("tick", () => {
        const pos: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) pos[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPositions({ ...pos });
      });

    return () => simRef.current?.stop();
  }, [items, size]);

  // ── Wheel zoom ─────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { scale, x, y } = vpRef.current;
    const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
    const factor = -delta * 0.0005;
    const newScale = Math.max(0.15, Math.min(5, scale * (1 + factor)));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newScale / scale;
    setViewport({ scale: newScale, x: mx - ratio * (mx - x), y: my - ratio * (my - y) });
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── All gestures handled on wrapper ───────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const itemEl = (e.target as HTMLElement).closest<HTMLElement>("[data-item-id]");
    const itemId = itemEl?.dataset.itemId ?? null;

    gestureRef.current = {
      type: itemId ? "item" : "canvas",
      itemId,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      moved: false,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g) return;

    const dx = e.clientX - g.curX;
    const dy = e.clientY - g.curY;
    const totalDx = e.clientX - g.startX;
    const totalDy = e.clientY - g.startY;

    if (!g.moved && Math.abs(totalDx) + Math.abs(totalDy) > CLICK_THRESHOLD) {
      g.moved = true;
    }

    g.curX = e.clientX;
    g.curY = e.clientY;

    if (!g.moved) return;

    if (g.type === "canvas") {
      setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } else if (g.type === "item" && g.itemId) {
      const scale = vpRef.current.scale;
      const node = nodesRef.current.find((n) => n.id === g.itemId);
      if (node) {
        node.fx = (node.fx ?? node.x) + dx / scale;
        node.fy = (node.fy ?? node.y) + dy / scale;
        simRef.current?.alpha(0.3).restart();
      }
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (!g) return;

    if (g.type === "item" && g.itemId) {
      const node = nodesRef.current.find((n) => n.id === g.itemId);
      if (node) {
        node.fx = null;
        node.fy = null;
        if (g.moved) simRef.current?.alpha(0.1).restart();
      }
      if (!g.moved) {
        // It's a click — find the full item and open lightbox
        const workItem = items.find((i) => i.id === g.itemId);
        if (workItem) onSelectRef.current(workItem);
      }
    }
  }, [items]);

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Release canvas pan state if pointer leaves; item drags continue via capture
    const g = gestureRef.current;
    if (g?.type === "canvas") {
      gestureRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="work-cloud-wrapper"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {/* Transform layer */}
      <div
        className="work-cloud-scene"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          width: size ? size.w : "100%",
          height: size ? size.h : "100%",
        }}
      >
        <AnimatePresence>
          {items.map((item) => {
            const pos = positions[item.id];
            if (!pos) return null;
            const color = hashColor(item.id);
            const src = item.images?.[0] ?? item.image ?? null;

            return (
              <motion.div
                key={item.id}
                data-item-id={item.id}
                className="work-cloud-item"
                style={{
                  width: ITEM_W,
                  left: pos.x - ITEM_W / 2,
                  top: pos.y - COLLISION_R / 2,
                  background: color,
                  cursor: "pointer",
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{
                  scale: 1.1,
                  zIndex: 10,
                  transition: { duration: 0.16, ease: "easeOut" },
                }}
                onHoverStart={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({
                    x: rect.right,
                    y: rect.top + rect.height / 2,
                    title: item.title,
                    year: item.year,
                    category: CATEGORY_LABELS[item.category] ?? item.category,
                    role: item.role,
                  });
                }}
                onHoverEnd={() => setTooltip(null)}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={item.title}
                    style={{ display: "block", width: "100%", height: "auto" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: ITEM_W, height: Math.round(ITEM_W * 0.72) }} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tooltip — screen-space, outside the transform */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            className="work-cursor-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.13 }}
          >
            <div className="work-cursor-tooltip-title">{tooltip.title}</div>
            <div className="work-cursor-tooltip-sub">
              {tooltip.category}
              {tooltip.year ? ` · ${tooltip.year}` : ""}
              {tooltip.role ? ` · ${tooltip.role}` : ""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
