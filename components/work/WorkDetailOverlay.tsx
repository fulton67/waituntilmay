"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO, FONT_DISPLAY } from "@/lib/theme";
import ReferenceCluster from "./ReferenceCluster";

const CATEGORY_LABELS: Record<string, string> = {
  "fine-arts": "fine arts",
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "consulting": "consulting",
};

function titleFontSize(title: string): string {
  const len = title.length;
  if (len <= 14) return "clamp(28px, 4vw, 44px)";
  if (len <= 24) return "clamp(20px, 3vw, 32px)";
  if (len <= 38) return "clamp(15px, 2.4vw, 24px)";
  return "clamp(13px, 2vw, 19px)";
}

export default function WorkDetailOverlay({
  item,
  onClose,
}: {
  item: WorkItem;
  onClose: () => void;
}) {
  const initialSrc = item.images?.[0] ?? item.image ?? "";
  const [activeImage, setActiveImage] = useState(initialSrc);
  const [showRefs, setShowRefs] = useState(false);

  // Reset when item changes
  useEffect(() => {
    setActiveImage(item.images?.[0] ?? item.image ?? "");
    setShowRefs(false);
  }, [item.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasRefs = (item.images?.length ?? 0) > 1;
  // All images from the item's array except the currently displayed one
  const refImages = (item.images ?? []).filter((url) => url !== activeImage);
  const totalRefs = (item.images?.length ?? 1) - 1;

  return (
    <motion.div
      className="wdo-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
    >
      <button className="wdo-close" onClick={onClose}>
        close
      </button>

      <div className="wdo-inner" onClick={(e) => e.stopPropagation()}>
        {/* Image — first in DOM so it renders on top on mobile */}
        <div className="wdo-image-wrap">
          {item.video ? (
            <video
              src={item.video}
              autoPlay
              loop
              playsInline
              muted
              className="wdo-image"
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={activeImage}
                alt={item.title}
                className="wdo-image"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                draggable={false}
              />
            </AnimatePresence>
          )}
        </div>

        {/* Info panel — second in DOM, appears left on desktop via row-reverse */}
        <motion.div
          className="wdo-info"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
        >
          <p style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#bbb",
            fontFamily: FONT_MONO,
            marginBottom: 18,
          }}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </p>

          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: titleFontSize(item.title),
            fontWeight: "normal",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.1,
            margin: "0 0 14px",
          }}>
            {item.title}
          </h2>

          {item.year && (
            <p style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#bbb",
              fontFamily: FONT_MONO,
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              {item.year}
            </p>
          )}

          {item.role && (
            <p style={{
              fontSize: 10,
              letterSpacing: "0.10em",
              color: "#ccc",
              fontFamily: FONT_MONO,
              marginBottom: 18,
            }}>
              {item.role}
            </p>
          )}

          {item.context && (
            <p style={{
              fontSize: 9,
              letterSpacing: "0.04em",
              color: "#777",
              fontFamily: FONT_MONO,
              lineHeight: 1.7,
              marginBottom: 20,
            }}>
              {item.context}
            </p>
          )}

          <a
            href={`/?inquire=${encodeURIComponent(item.title)}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: FONT_MONO,
              color: "#111",
              textDecoration: "none",
              borderBottom: "1px solid #111",
              paddingBottom: 1,
            }}
          >
            inquire
          </a>

          {/* Reference cluster trigger */}
          {hasRefs && (
            <div style={{ marginTop: 28 }}>
              <button
                onClick={() => setShowRefs((v) => !v)}
                style={{
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: FONT_MONO,
                  color: "#aaa",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
              >
                {showRefs ? "− hide" : `+ ${totalRefs} references`}
              </button>

              <AnimatePresence>
                {showRefs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: "hidden" }}
                  >
                    <ReferenceCluster
                      images={refImages}
                      onSelect={(url) => setActiveImage(url)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
