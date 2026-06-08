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
import type { WorkMeta } from "./MetadataPanel";

const ITEM_SIZE = 100; // px — uniform square tiles

interface ClusterNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function getDominantColor(item: WorkItem): string {
  // Fallback palette — color-thief-ts needs canvas API, run client-side only
  const palette = ["#c9b99a", "#8a9bb0", "#b0a28a", "#9ab09a", "#a09ab0", "#b08a8a", "#8ab0a0"];
  const idx = Math.abs(item.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % palette.length;
  return palette[idx];
}

export default function CloudView({
  items,
  onHover,
  onSelect,
}: {
  items: WorkItem[];
  onHover: (meta: WorkMeta | null) => void;
  onSelect: (item: WorkItem) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const prevItemIds = useRef<string>("");

  const runSimulation = useCallback(() => {
    const el = containerRef.current;
    if (!el || items.length === 0) return;
    const { width, height } = el.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;

    const nodes: ClusterNode[] = items.map((item) => ({
      id: item.id,
      x: cx + (Math.random() - 0.5) * width * 0.8,
      y: cy + (Math.random() - 0.5) * height * 0.8,
      vx: 0,
      vy: 0,
    }));

    const sim = forceSimulation(nodes)
      .force("collide", forceCollide(ITEM_SIZE * 0.56))
      .force("center", forceCenter(cx, cy))
      .force("charge", forceManyBody().strength(-30))
      .alphaDecay(0.04)
      .on("tick", () => {
        const pos: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) pos[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPositions({ ...pos });
      })
      .on("end", () => {
        // Stagger reveal after simulation settles
        items.forEach((item, i) => {
          setTimeout(() => {
            setRevealed((prev) => new Set([...prev, item.id]));
          }, i * 35 + 200);
        });
      });

    return () => { sim.stop(); };
  }, [items]);

  useEffect(() => {
    const key = items.map((i) => i.id).join(",");
    if (key === prevItemIds.current) return;
    prevItemIds.current = key;
    setRevealed(new Set());
    const cleanup = runSimulation();
    return cleanup ?? undefined;
  }, [items, runSimulation]);

  return (
    <div ref={containerRef} className="work-cloud">
      <AnimatePresence>
        {items.map((item) => {
          const pos = positions[item.id];
          if (!pos) return null;
          const isRevealed = revealed.has(item.id);
          const dominantColor = getDominantColor(item);
          const src = item.images?.[0] ?? item.image ?? null;

          return (
            <motion.div
              key={item.id}
              className="work-cloud-item"
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                left: pos.x - ITEM_SIZE / 2,
                top: pos.y - ITEM_SIZE / 2,
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onHoverStart={() =>
                onHover({
                  title: item.title,
                  year: item.year,
                  category: item.category,
                  role: item.role,
                })
              }
              onHoverEnd={() => onHover(null)}
              onClick={() => onSelect(item)}
            >
              {/* Color square shown until image revealed */}
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: dominantColor,
                }}
                animate={{ opacity: isRevealed && src ? 0 : 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
              {/* Actual image fades in */}
              {src && (
                <motion.img
                  src={src}
                  alt={item.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  animate={{ opacity: isRevealed ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
