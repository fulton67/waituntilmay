"use client";

import { useState, useEffect, useMemo } from "react";
import type { HarvestImage } from "@/app/api/harvest/route";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HarvestStrip() {
  const [images, setImages] = useState<HarvestImage[]>([]);

  useEffect(() => {
    fetch("/api/harvest").then(r => r.json()).then(setImages).catch(() => {});
  }, []);

  // Shuffle once per mount so order changes each visit
  const shuffled = useMemo(() => shuffle(images), [images]);

  if (shuffled.length === 0) return null;

  return (
    <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
          cursor: "grab",
        }}
        onMouseDown={e => {
          const el = e.currentTarget;
          el.style.cursor = "grabbing";
          const startX = e.pageX - el.offsetLeft;
          const scrollLeft = el.scrollLeft;
          function onMove(ev: MouseEvent) {
            const x = ev.pageX - el.offsetLeft;
            el.scrollLeft = scrollLeft - (x - startX);
          }
          function onUp() {
            el.style.cursor = "grab";
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          }
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        {shuffled.map(img => (
          <div
            key={img.id}
            style={{
              flexShrink: 0,
              width: "clamp(120px, 28vw, 220px)",
              aspectRatio: "3/4",
              overflow: "hidden",
              background: "#f5f5f5",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
