"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import type { WorkMeta } from "./MetadataPanel";

const CENTER_H = 280;  // px — center item height
const SIDE_H   = 130;  // px — side item height
const FAR_H    = 100;  // px — far items height
const ITEM_W   = 200;  // px — all items same width (center expands to natural ratio)
const GAP      = 12;   // px — gap between items

function getItemStyle(distanceFromCenter: number): { height: number; opacity: number } {
  if (distanceFromCenter === 0) return { height: CENTER_H, opacity: 1 };
  if (Math.abs(distanceFromCenter) === 1) return { height: SIDE_H, opacity: 0.55 };
  return { height: FAR_H, opacity: 0.3 };
}

export default function CarouselView({
  items,
  onHover,
  onSelect,
}: {
  items: WorkItem[];
  onHover: (meta: WorkMeta | null) => void;
  onSelect: (item: WorkItem) => void;
}) {
  const [centerIdx, setCenterIdx] = useState(0);
  const [trackX, setTrackX]       = useState(0);
  const isDragging                = useRef(false);
  const dragStartX                = useRef(0);
  const dragStartTrackX           = useRef(0);
  const touchStart                = useRef<number | null>(null);

  // Clamp centerIdx when items change
  useEffect(() => {
    setCenterIdx((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  // Keep track centered on active item
  useEffect(() => {
    const itemFullW = ITEM_W + GAP;
    const targetX = -(centerIdx * itemFullW);
    setTrackX(targetX);
  }, [centerIdx]);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    setCenterIdx(clamped);
    onHover({
      title: items[clamped]?.title ?? "",
      year: items[clamped]?.year ?? "",
      category: items[clamped]?.category ?? "",
      role: items[clamped]?.role ?? "",
    });
  }, [items, onHover]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(centerIdx + 1);
      if (e.key === "ArrowLeft")  goTo(centerIdx - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [centerIdx, goTo]);

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartTrackX.current = trackX;
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    setTrackX(dragStartTrackX.current + dx);
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 40) goTo(centerIdx + (dx < 0 ? 1 : -1));
    else goTo(centerIdx); // snap back
  }

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) goTo(centerIdx + (dx < 0 ? 1 : -1));
    touchStart.current = null;
  }

  const scrollPct = items.length > 1 ? centerIdx / (items.length - 1) : 0;

  return (
    <>
      <div
        className="work-carousel"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <motion.div
          className="work-carousel-track"
          animate={{ x: trackX }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        >
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const dist = idx - centerIdx;
              const { height, opacity } = getItemStyle(dist);
              const src = item.images?.[0] ?? item.image ?? null;

              return (
                <motion.div
                  key={item.id}
                  className="work-carousel-item"
                  style={{ width: ITEM_W, opacity, cursor: dist === 0 ? "pointer" : "default" }}
                  animate={{ height, opacity }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onHoverStart={() =>
                    dist === 0 && onHover({
                      title: item.title,
                      year: item.year,
                      category: item.category,
                      role: item.role,
                    })
                  }
                  onHoverEnd={() => onHover(null)}
                  onClick={() => {
                    if (dist === 0) onSelect(item);
                    else goTo(idx);
                  }}
                >
                  {item.video ? (
                    <video src={item.video} muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  ) : src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#e8e8e8" }} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scrollbar */}
      <div className="work-scrollbar">
        <div
          className="work-scrollbar-thumb"
          style={{
            width: `${Math.max(10, 100 / Math.max(items.length, 1))}%`,
            marginLeft: `${scrollPct * (100 - Math.max(10, 100 / Math.max(items.length, 1)))}%`,
          }}
        />
      </div>
    </>
  );
}
