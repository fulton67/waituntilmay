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
const CLICK_THRESHOLD = 5;

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
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const vpRef = useRef<Viewport>(viewport);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);

  // Per-item drag tracking
  const itemDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    moved: boolean;
  } | null>(null);

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

  // ── Wheel zoom ────────────────────────────────────────────────────
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

  // ── Canvas pan ────────────────────────────────────────────────────
  const onCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".work-cloud-item")) return;
    isPanning.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPan.current.x;
    const dy = e.clientY - lastPan.current.y;
    lastPan.current = { x: e.clientX, y: e.clientY };
    setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPanning.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  // ── Per-item drag (also handles click detection) ──────────────────
  const onItemPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, item: WorkItem) => {
    e.stopPropagation();
    itemDragRef.current = {
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onItemPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>, item: WorkItem) => {
    const drag = itemDragRef.current;
    if (!drag || drag.id !== item.id) return;

    const totalDx = e.clientX - drag.startX;
    const totalDy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(totalDx) + Math.abs(totalDy) > CLICK_THRESHOLD) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    // Move node by screen-space delta, converted to canvas space
    const scale = vpRef.current.scale;
    const node = nodesRef.current.find((n) => n.id === item.id);
    if (!node) return;

    const dx = e.clientX - drag.curX;
    const dy = e.clientY - drag.curY;
    drag.curX = e.clientX;
    drag.curY = e.clientY;

    node.fx = (node.fx ?? node.x) + dx / scale;
    node.fy = (node.fy ?? node.y) + dy / scale;

    simRef.current?.alpha(0.3).restart();
  }, []);

  const onItemPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>, item: WorkItem) => {
    const drag = itemDragRef.current;
    if (!drag || drag.id !== item.id) return;
    const moved = drag.moved;
    itemDragRef.current = null;

    // Release the fixed position so the simulation can settle
    const node = nodesRef.current.find((n) => n.id === item.id);
    if (node) {
      node.fx = null;
      node.fy = null;
      if (moved) simRef.current?.alpha(0.1).restart();
    }

    if (!moved) onSelect(item);
  }, [onSelect]);

  return (
    <div
      ref={wrapperRef}
      className="work-cloud-wrapper"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerLeave={onCanvasPointerUp}
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
                onPointerDown={(e) => onItemPointerDown(e, item)}
                onPointerMove={(e) => onItemPointerMove(e, item)}
                onPointerUp={(e) => onItemPointerUp(e, item)}
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
