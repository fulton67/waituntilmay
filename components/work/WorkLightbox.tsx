"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO, FONT_DISPLAY } from "@/lib/theme";

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "fine-arts": "fine arts",
  "consulting": "consulting",
};

export default function WorkLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: WorkItem[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const item = items[index];

  const prev = useCallback(() => {
    if (index > 0) onNavigate(index - 1);
  }, [index, onNavigate]);

  const next = useCallback(() => {
    if (index < items.length - 1) onNavigate(index + 1);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (!item) return null;

  const src = item.images?.[0] ?? item.image ?? "";

  return (
    <AnimatePresence>
      <motion.div
        className="work-lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <button className="work-lightbox-close" onClick={onClose}>close</button>

        <button
          className="work-lightbox-nav prev"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          disabled={index === 0}
        >‹</button>

        <button
          className="work-lightbox-nav next"
          onClick={(e) => { e.stopPropagation(); next(); }}
          disabled={index === items.length - 1}
        >›</button>

        <motion.div
          className="work-lightbox-inner"
          onClick={(e) => e.stopPropagation()}
          key={index}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          {item.video ? (
            <video
              src={item.video}
              autoPlay
              loop
              playsInline
              muted
              className="work-lightbox-img"
            />
          ) : src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={item.title} className="work-lightbox-img" />
          ) : (
            <div style={{ width: 300, height: 300, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT_MONO }}>no image</span>
            </div>
          )}

          <div className="work-lightbox-meta">
            <p style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO, marginBottom: 10 }}>
              {CATEGORY_LABELS[item.category] ?? item.category}
              {item.year ? ` — ${item.year}` : ""}
            </p>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.3, marginBottom: 8 }}>
              {item.title}
            </p>
            {item.role && (
              <p style={{ fontSize: 9, color: "#aaa", letterSpacing: "0.08em", fontFamily: FONT_MONO, marginBottom: 12 }}>
                {item.role}
              </p>
            )}
            {item.context && (
              <p style={{ fontSize: 9, color: "#777", letterSpacing: "0.04em", fontFamily: FONT_MONO, lineHeight: 1.7, marginBottom: 12 }}>
                {item.context}
              </p>
            )}
            <p style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.1em", fontFamily: FONT_MONO }}>
              {index + 1} / {items.length}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
