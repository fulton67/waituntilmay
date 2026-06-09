"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO } from "@/lib/theme";
import BlobBackground from "./work/BlobBackground";
import CloudView from "./work/CloudView";
import WorkDetailOverlay from "./work/WorkDetailOverlay";

const CAT_PRIORITY: Record<string, number> = { "fine-arts":0, "clothing-production":1, "movies-video":2, "consulting":3 };

const CATEGORIES = [
  { id: "all",                 label: "all"                },
  { id: "fine-arts",           label: "fine arts"          },
  { id: "clothing-production", label: "clothing production"},
  { id: "movies-video",        label: "movies & video"     },
  { id: "consulting",          label: "consulting"         },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

export default function WorkPage() {
  const [items, setItems]     = useState<WorkItem[]>([]);
  const [cat, setCat]         = useState<CatId>("all");
  const [open, setOpen]       = useState<WorkItem | null>(null);
  const pathname              = usePathname();

  useEffect(() => {
    fetch("/api/work").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  // Prevent body scroll while on the work canvas
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const visible = items.filter(i => i.visible && i.listed !== false && (cat === "all" || i.category === cat));
  const sorted  = [...visible].sort((a, b) => (CAT_PRIORITY[a.category] ?? 99) - (CAT_PRIORITY[b.category] ?? 99));
  const media   = sorted.filter(i => !!(i.image || i.video || i.images?.length));

  return (
    <>
      {/* Canvas */}
      <div style={{ position:"relative", width:"100%", height:"100svh", background:"#fafafa", overflow:"hidden" }}>
        <BlobBackground />

        {/* Nav */}
        <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:20, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 28px", pointerEvents:"none" }}>
          <Link href="/" style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:"#111", fontFamily:FONT_MONO, pointerEvents:"all", textDecoration:"none" }}>
            waituntilmay
          </Link>
          <div style={{ display:"flex", gap:24, pointerEvents:"all" }}>
            {([{ href:"/", label:"home" },{ href:"/work", label:"work" }] as const).map(l => (
              <Link key={l.href} href={l.href} style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color: pathname === l.href ? "#111" : "#aaa", textDecoration:"none" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <CloudView items={media} onSelect={setOpen} />
      </div>

      {/* Filters */}
      <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", zIndex:20, display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center" }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:FONT_MONO, color: cat === c.id ? "#111" : "#888", padding:"4px 0", transition:"color 0.2s" }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Overlay */}
      {open && <WorkDetailOverlay item={open} allItems={items} onClose={() => setOpen(null)} />}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}
