"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO } from "@/lib/theme";
import BlobBackground from "./work/BlobBackground";
import CloudView from "./work/CloudView";
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

const NAV_LINKS = [
  { href: "/",     label: "home" },
  { href: "/work", label: "work" },
];

export default function WorkPage() {
  const [items, setItems]       = useState<WorkItem[]>([]);
  const [category, setCategory] = useState<CatId>("all");
  const [lightbox, setLightbox] = useState<{ items: WorkItem[]; index: number } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/work").then((r) => r.json()).then(setItems).catch(() => {});
  }, []);

  const visible = items.filter(
    (i) => i.visible && i.listed !== false && (category === "all" || i.category === category)
  );

  const sorted = [...visible].sort(
    (a, b) => (CAT_PRIORITY[a.category] ?? 99) - (CAT_PRIORITY[b.category] ?? 99)
  );

  const mediaItems = sorted.filter((i) => !!(i.image || i.video || i.images?.length));

  const openLightbox = useCallback(
    (item: WorkItem) => {
      console.log("[wum] openLightbox called", item.id, "mediaItems:", mediaItems.length);
      const idx = mediaItems.findIndex((i) => i.id === item.id);
      console.log("[wum] idx:", idx);
      if (idx !== -1) setLightbox({ items: mediaItems, index: idx });
    },
    [mediaItems]
  );

  return (
    <>
      <div className="work-canvas">
        <BlobBackground />

        {/* Top navigation */}
        <nav className="work-topnav">
          <Link href="/" className="work-topnav-logo" style={{ fontFamily: FONT_MONO }}>
            waituntilmay
          </Link>
          <div className="work-topnav-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`work-topnav-link${pathname === link.href ? " active" : ""}`}
                style={{ fontFamily: FONT_MONO }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <CloudView items={mediaItems} onSelect={openLightbox} />
      </div>

      {/* Category filters — fixed, outside canvas so nothing blocks events */}
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
