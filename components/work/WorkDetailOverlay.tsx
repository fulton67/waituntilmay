"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO, FONT_DISPLAY } from "@/lib/theme";
import ReferenceCluster from "./ReferenceCluster";

const CAT: Record<string, string> = {
  "fine-arts": "fine arts",
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "consulting": "consulting",
};

function titleSize(t: string) {
  if (t.length <= 14) return "clamp(28px,4vw,44px)";
  if (t.length <= 24) return "clamp(20px,3vw,32px)";
  if (t.length <= 38) return "clamp(15px,2.4vw,24px)";
  return "clamp(13px,2vw,19px)";
}

export default function WorkDetailOverlay({ item, onClose }: { item: WorkItem; onClose: () => void }) {
  const firstSrc = item.images?.[0] ?? item.image ?? "";
  const [active, setActive] = useState(firstSrc);
  const [showRefs, setShowRefs] = useState(false);

  useEffect(() => {
    setActive(item.images?.[0] ?? item.image ?? "");
    setShowRefs(false);
  }, [item.id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const hasRefs = (item.images?.length ?? 0) > 1;
  const refs = (item.images ?? []).filter(u => u !== active);
  const totalRefs = (item.images?.length ?? 1) - 1;

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(250,250,250,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      {/* Close */}
      <button onClick={onClose} style={{ position:"fixed", top:24, right:24, background:"none", border:"none", cursor:"pointer", fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#999", zIndex:51 }}>
        close
      </button>

      {/* Content */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display:"flex", flexDirection:"row-reverse", alignItems:"center", gap:52, maxWidth:1100, width:"100%", padding:"80px 60px 60px", boxSizing:"border-box" }}
      >
        {/* Image */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {item.video
            ? <video src={item.video} autoPlay loop playsInline style={{ maxHeight:"80svh", maxWidth:"100%", objectFit:"contain", display:"block" }} />
            : (
              <AnimatePresence mode="wait">
                <motion.img
                  key={active}
                  src={active}
                  alt={item.title}
                  style={{ maxHeight:"80svh", maxWidth:"100%", objectFit:"contain", display:"block" }}
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}
                  draggable={false}
                />
              </AnimatePresence>
            )
          }
        </div>

        {/* Info */}
        <div style={{ width:220, flexShrink:0 }}>
          <p style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:"#bbb", fontFamily:FONT_MONO, marginBottom:18 }}>
            {CAT[item.category] ?? item.category}
          </p>
          <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:titleSize(item.title), fontWeight:"normal", letterSpacing:"0.06em", textTransform:"uppercase", lineHeight:1.1, margin:"0 0 14px" }}>
            {item.title}
          </h2>
          {item.year && <p style={{ fontSize:10, letterSpacing:"0.18em", color:"#bbb", fontFamily:FONT_MONO, textTransform:"uppercase", marginBottom:6 }}>{item.year}</p>}
          {item.role && <p style={{ fontSize:10, letterSpacing:"0.10em", color:"#ccc", fontFamily:FONT_MONO, marginBottom:18 }}>{item.role}</p>}
          {item.context && <p style={{ fontSize:9, letterSpacing:"0.04em", color:"#777", fontFamily:FONT_MONO, lineHeight:1.7, marginBottom:20 }}>{item.context}</p>}
          <a href={`/?inquire=${encodeURIComponent(item.title)}`} onClick={e => e.stopPropagation()} style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#111", textDecoration:"none", borderBottom:"1px solid #111", paddingBottom:1 }}>
            inquire
          </a>

          {hasRefs && (
            <div style={{ marginTop:28 }}>
              <button
                onClick={() => setShowRefs(v => !v)}
                style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#aaa", background:"none", border:"none", cursor:"pointer", padding:0 }}
              >
                {showRefs ? "− hide" : `+ ${totalRefs} references`}
              </button>
              <AnimatePresence>
                {showRefs && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.25 }} style={{ overflow:"hidden" }}>
                    <ReferenceCluster images={refs} onSelect={setActive} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
