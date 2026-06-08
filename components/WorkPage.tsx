"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO } from "@/lib/theme";
import BlobBackground from "./work/BlobBackground";
import MetadataPanel, { type WorkMeta } from "./work/MetadataPanel";
import ModeToggle, { type ViewMode } from "./work/ModeToggle";
import CloudView from "./work/CloudView";
import CarouselView from "./work/CarouselView";
import CanvasView from "./work/CanvasView";
import WorkLightbox from "./work/WorkLightbox";

const CAT_PRIORITY: Record<string, number> = {
  "fine-arts": 0,
  "clothing-production": 1,
  "movies-video": 2,
  "consulting": 3,
};

const CATEGORIES = [
  { id: "all",                 label: "all"                },
  { id: "fine-arts",           label: "fine arts"          },
  { id: "clothing-production", label: "clothing production"},
  { id: "movies-video",        label: "movies & video"     },
  { id: "consulting",          label: "consulting"         },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

export default function WorkPage() {
  const [items, setItems]       = useState<WorkItem[]>([]);
  const [category, setCategory] = useState<CatId>("all");
  const [mode, setMode]         = useState<ViewMode>("carousel");
  const [hoveredMeta, setHoveredMeta] = useState<WorkMeta | null>(null);
  const [lightbox, setLightbox] = useState<{ items: WorkItem[]; index: number } | null>(null);

  useEffect(() => {
    fetch("/api/work").then((r) => r.json()).then(setItems).catch(() => {});
  }, []);

  const visible = items.filter(
    (i) => i.visible && i.listed !== false && (category === "all" || i.category === category)
  );

  const sorted =
    category === "all"
      ? visible.toSorted((a, b) => (CAT_PRIORITY[a.category] ?? 99) - (CAT_PRIORITY[b.category] ?? 99))
      : visible;

  const mediaItems = sorted.filter((i) => !!(i.image || i.video || i.images?.length));

  const openLightbox = useCallback(
    (item: WorkItem) => {
      const idx = mediaItems.findIndex((i) => i.id === item.id);
      if (idx !== -1) setLightbox({ items: mediaItems, index: idx });
    },
    [mediaItems]
  );

  return (
    <>
      <div className="work-canvas">
        <BlobBackground />

        <MetadataPanel meta={hoveredMeta} />

        <ModeToggle mode={mode} onChange={setMode} />

        {mode === "cloud" && (
          <CloudView
            items={mediaItems}
            onHover={setHoveredMeta}
            onSelect={openLightbox}
          />
        )}

        {mode === "carousel" && (
          <CarouselView
            items={mediaItems}
            onHover={setHoveredMeta}
            onSelect={openLightbox}
          />
        )}

        {mode === "canvas" && (
          <CanvasView
            items={mediaItems}
            onHover={setHoveredMeta}
            onSelect={openLightbox}
          />
        )}

        {/* Category filters — bottom center */}
        <div className="work-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`work-filter-btn${category === cat.id ? " active" : ""}`}
              style={{ fontFamily: FONT_MONO }}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox — rendered outside work-canvas to avoid z-index stacking */}
      {lightbox && (
        <WorkLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
        />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}
