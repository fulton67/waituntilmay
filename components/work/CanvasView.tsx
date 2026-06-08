"use client";

import { useState, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import type { WorkMeta } from "./MetadataPanel";
import { FONT_MONO } from "@/lib/theme";

interface TooltipState {
  x: number;
  y: number;
  meta: WorkMeta;
}

export default function CanvasView({
  items,
  onHover,
  onSelect,
}: {
  items: WorkItem[];
  onHover: (meta: WorkMeta | null) => void;
  onSelect: (item: WorkItem) => void;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTooltip(e: React.MouseEvent, item: WorkItem) {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltip({
      x: e.clientX + 16,
      y: e.clientY - 10,
      meta: {
        title: item.title,
        year: item.year,
        category: item.category,
        role: item.role,
      },
    });
    onHover({ title: item.title, year: item.year, category: item.category, role: item.role });
  }

  function hideTooltip() {
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 80);
    onHover(null);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    "clothing-production": "clothing production",
    "movies-video": "movies & video",
    "fine-arts": "fine arts",
    "consulting": "consulting",
  };

  return (
    <>
      <div className="work-canvas-wrap">
        <TransformWrapper
          initialScale={1}
          minScale={0.2}
          maxScale={4}
          wheel={{ step: 0.08 }}
          doubleClick={{ disabled: false, mode: "zoomIn" }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100svh" }}
            contentStyle={{ width: "100%", minHeight: "100svh" }}
          >
            <div className="work-canvas-grid">
              <AnimatePresence>
                {items.map((item, i) => {
                  const src = item.images?.[0] ?? item.image ?? null;
                  return (
                    <motion.div
                      key={item.id}
                      className="work-canvas-item"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.025, 0.6) }}
                      onMouseEnter={(e) => showTooltip(e, item)}
                      onMouseMove={(e) =>
                        setTooltip((prev) =>
                          prev ? { ...prev, x: e.clientX + 16, y: e.clientY - 10 } : prev
                        )
                      }
                      onMouseLeave={hideTooltip}
                      onClick={() => onSelect(item)}
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={item.title} />
                      ) : (
                        <div style={{ aspectRatio: "1", background: "#ebebeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 8, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT_MONO }}>
                            {item.title.slice(0, 12)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            className="work-tooltip"
            style={{ left: tooltip.x, top: tooltip.y, fontFamily: FONT_MONO }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="work-tooltip-title">{tooltip.meta.title}</div>
            <div className="work-tooltip-sub">
              {CATEGORY_LABELS[tooltip.meta.category] ?? tooltip.meta.category}
              {tooltip.meta.year ? ` · ${tooltip.meta.year}` : ""}
            </div>
            {tooltip.meta.role && (
              <div className="work-tooltip-sub" style={{ marginTop: 2 }}>{tooltip.meta.role}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
