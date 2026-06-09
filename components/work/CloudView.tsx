"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
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

interface CloudNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  const vpRef = useRef(viewport);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);

  const panRef = useRef<{ curX: number; curY: number } | null>(null);

  // Measure container
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize(prev => {
          if (prev && Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev;
          return { w: width, h: height };
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Center viewport initially
  useEffect(() => {
    if (!size) return;
    const s = 0.82;
    setViewport({ scale: s, x: (size.w * (1 - s)) / 2, y: (size.h * (1 - s)) / 2 });
  }, [size]);

  // D3 simulation
  useEffect(() => {
    if (!size || items.length === 0) return;
    simRef.current?.stop();
    const { w, h } = size;
    const cx = w / 2, cy = h / 2;
    const nodes: CloudNode[] = items.map(item => ({
      id: item.id,
      x: cx + (Math.random() - 0.5) * w * 0.55,
      y: cy + (Math.random() - 0.5) * h * 0.55,
      vx: 0, vy: 0,
    }));
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
    return () => { simRef.current?.stop(); };
  }, [items, size]);

  // Wheel zoom
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { scale, x, y } = vpRef.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      const factor = -delta * 0.0005;
      const newScale = Math.max(0.15, Math.min(5, scale * (1 + factor)));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ratio = newScale / scale;
      setViewport({ scale: newScale, x: mx - ratio * (mx - x), y: my - ratio * (my - y) });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".cloud-item")) return;
    panRef.current = { curX: e.clientX, curY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.curX;
    const dy = e.clientY - panRef.current.curY;
    panRef.current.curX = e.clientX;
    panRef.current.curY = e.clientY;
    setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    panRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ok */ }
  }

  return (
    <div
      ref={wrapperRef}
      className="work-cloud-wrapper"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="work-cloud-scene"
        style={{
          transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          width: size ? size.w : "100%",
          height: size ? size.h : "100%",
        }}
      >
        {items.map(item => {
          const pos = positions[item.id];
          if (!pos) return null;
          const src = item.images?.[0] ?? item.image ?? null;

          return (
            <div
              key={item.id}
              className="cloud-item"
              style={{
                position: "absolute",
                width: ITEM_W,
                left: pos.x - ITEM_W / 2,
                top: pos.y - COLLISION_R / 2,
                background: hashColor(item.id),
                cursor: "pointer",
                overflow: "hidden",
                transition: "transform 0.15s ease",
              }}
              onClick={() => onSelect(item)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.1)";
                (e.currentTarget as HTMLElement).style.zIndex = "10";
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  x: rect.right,
                  y: rect.top + rect.height / 2,
                  title: item.title,
                  year: item.year,
                  category: CATEGORY_LABELS[item.category] ?? item.category,
                  role: item.role,
                });
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                (e.currentTarget as HTMLElement).style.zIndex = "";
                setTooltip(null);
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={item.title}
                  style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none", userSelect: "none" }}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div style={{ width: ITEM_W, height: Math.round(ITEM_W * 0.72) }} />
              )}
            </div>
          );
        })}
      </div>

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
