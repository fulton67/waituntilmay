"use client";

import { useEffect, useState, useRef } from "react";
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
const DRAG_THRESHOLD = 6;

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

  // Always-current refs so native listeners never go stale
  const itemsRef = useRef(items);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const vpRef = useRef<Viewport>(viewport);
  useEffect(() => { vpRef.current = viewport; }, [viewport]);

  // Drag tracking (shared between native pointer and React handlers)
  const dragRef = useRef<{
    isItem: boolean;
    itemId: string | null;
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

  // ── All native pointer + click listeners on wrapper ────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Wheel zoom
    const onWheel = (e: WheelEvent) => {
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

    // Pointer down — detect item vs canvas
    const onPointerDown = (e: PointerEvent) => {
      const itemEl = (e.target as HTMLElement).closest<HTMLElement>("[data-item-id]");
      dragRef.current = {
        isItem: !!itemEl,
        itemId: itemEl?.dataset.itemId ?? null,
        startX: e.clientX,
        startY: e.clientY,
        curX: e.clientX,
        curY: e.clientY,
        moved: false,
      };
    };

    // Pointer move — pan or drag item
    const onPointerMove = (e: PointerEvent) => {
      const g = dragRef.current;
      if (!g) return;
      const dx = e.clientX - g.curX;
      const dy = e.clientY - g.curY;
      g.curX = e.clientX;
      g.curY = e.clientY;
      if (!g.moved) {
        const dist = Math.abs(e.clientX - g.startX) + Math.abs(e.clientY - g.startY);
        if (dist > DRAG_THRESHOLD) g.moved = true;
      }
      if (!g.moved) return;
      if (!g.isItem) {
        // Canvas pan
        setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      } else if (g.itemId) {
        // Item drag — update D3 node
        const node = nodesRef.current.find((n) => n.id === g.itemId);
        if (node) {
          node.fx = (node.fx ?? node.x) + dx / vpRef.current.scale;
          node.fy = (node.fy ?? node.y) + dy / vpRef.current.scale;
          simRef.current?.alpha(0.3).restart();
        }
      }
    };

    // Pointer up — release item drag
    const onPointerUp = () => {
      const g = dragRef.current;
      if (!g) return;
      dragRef.current = null;
      if (g.isItem && g.itemId) {
        const node = nodesRef.current.find((n) => n.id === g.itemId);
        if (node) {
          node.fx = null;
          node.fy = null;
          if (g.moved) simRef.current?.alpha(0.1).restart();
        }
      }
    };

    // Native click — fires after pointerup, most reliable open trigger
    const onClick = (e: MouseEvent) => {
      const itemEl = (e.target as HTMLElement).closest<HTMLElement>("[data-item-id]");
      if (!itemEl) return;
      const itemId = itemEl.dataset.itemId;
      // Suppress if this gesture was a drag
      if (dragRef.current?.moved) return;
      const item = itemsRef.current.find((i) => i.id === itemId);
      if (item) onSelectRef.current(item);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerUp);
    el.addEventListener("click", onClick);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerUp);
      el.removeEventListener("click", onClick);
    };
  }, []); // runs once — uses refs for live values

  return (
    <div ref={wrapperRef} className="work-cloud-wrapper">
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
                whileHover={{ scale: 1.1, zIndex: 10, transition: { duration: 0.16 } }}
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
                    style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none" }}
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div style={{ width: ITEM_W, height: Math.round(ITEM_W * 0.72) }} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
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
