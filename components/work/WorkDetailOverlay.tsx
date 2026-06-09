"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function WorkDetailOverlay({
  item,
  allItems,
  onClose,
}: {
  item: WorkItem;
  allItems: WorkItem[];
  onClose: () => void;
}) {
  // Navigation stack — each click on a linked reference pushes a new item
  const [navStack, setNavStack] = useState<WorkItem[]>([item]);
  const current = navStack[navStack.length - 1];

  const [showRefs, setShowRefs] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset when the root item changes from outside
  useEffect(() => {
    setNavStack([item]);
    setShowRefs(false);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (navStack.length > 1) setNavStack(s => s.slice(0, -1));
        else onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, navStack.length]);

  const mainSrc = current.images?.[0] ?? current.image ?? "";
  const refs    = (current.images ?? []).slice(1); // all images except first are refs
  const hasRefs = refs.length > 0;
  const totalRefs = refs.length;

  // When a reference is clicked: if it's another work → navigate; else just open that image
  const onRefNavigate = useCallback((url: string) => {
    // Find work that has this URL as its primary image or in its images array
    const linked = allItems.find(w =>
      w.id !== current.id && (w.image === url || w.images?.[0] === url || w.images?.includes(url))
    );
    if (linked) {
      setNavStack(s => [...s, linked]);
      setShowRefs(false);
    }
    // If not a linked work — the URL is just another angle, already shown in the cluster
  }, [allItems, current.id]);

  const goBack = useCallback(() => {
    if (navStack.length > 1) {
      setNavStack(s => s.slice(0, -1));
      setShowRefs(false);
    } else {
      onClose();
    }
  }, [navStack.length, onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(250,250,250,0.97)", display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      {/* Close / Back */}
      <button
        onClick={e => { e.stopPropagation(); goBack(); }}
        style={{ position:"fixed", top:24, right:24, background:"none", border:"none", cursor:"pointer", fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#999", zIndex:51 }}
      >
        {navStack.length > 1 ? "← back" : "close"}
      </button>

      {/* Breadcrumb trail when navigated deep */}
      {navStack.length > 1 && (
        <div style={{ position:"fixed", top:24, left:28, fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#ccc", zIndex:51 }}>
          {navStack.slice(0, -1).map((w, i) => (
            <span
              key={w.id}
              onClick={e => { e.stopPropagation(); setNavStack(s => s.slice(0, i + 1)); setShowRefs(false); }}
              style={{ cursor:"pointer", marginRight:8 }}
            >
              {w.title.length > 18 ? w.title.slice(0, 16) + "…" : w.title} →
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          onClick={e => e.stopPropagation()}
          style={{
            display:"flex", flexDirection:"column",
            maxWidth: isMobile ? "100%" : 1100,
            width:"100%",
            padding: isMobile ? "64px 24px 40px" : "80px 60px 60px",
            boxSizing:"border-box",
            maxHeight:"100svh",
            overflowY:"auto",
          }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{    opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Top row */}
          <div style={{
            display:"flex",
            flexDirection: isMobile ? "column" : "row-reverse",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 24 : 52,
          }}>
            {/* Main image / video */}
            <div style={{ flex: isMobile ? "none" : 1, width: isMobile ? "100%" : undefined, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {current.video
                ? <video src={current.video} autoPlay loop playsInline style={{ maxHeight: isMobile ? "45svh" : "70svh", maxWidth:"100%", width: isMobile ? "100%" : undefined, objectFit:"contain", display:"block" }} />
                : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={mainSrc}
                      src={mainSrc}
                      alt={current.title}
                      style={{ maxHeight: isMobile ? "45svh" : "70svh", maxWidth:"100%", width: isMobile ? "100%" : undefined, objectFit:"contain", display:"block" }}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}
                      draggable={false}
                    />
                  </AnimatePresence>
                )
              }
            </div>

            {/* Info */}
            <div style={{ width: isMobile ? "100%" : 220, flexShrink:0 }}>
              <p style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:"#bbb", fontFamily:FONT_MONO, marginBottom:18 }}>
                {CAT[current.category] ?? current.category}
              </p>
              <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:titleSize(current.title), fontWeight:"normal", letterSpacing:"0.06em", textTransform:"uppercase", lineHeight:1.1, margin:"0 0 14px" }}>
                {current.title}
              </h2>
              {current.year && <p style={{ fontSize:10, letterSpacing:"0.18em", color:"#bbb", fontFamily:FONT_MONO, textTransform:"uppercase", marginBottom:6 }}>{current.year}</p>}
              {current.role && <p style={{ fontSize:10, letterSpacing:"0.10em", color:"#ccc", fontFamily:FONT_MONO, marginBottom:18 }}>{current.role}</p>}
              {current.context && <p style={{ fontSize:9, letterSpacing:"0.04em", color:"#777", fontFamily:FONT_MONO, lineHeight:1.7, marginBottom:20 }}>{current.context}</p>}
              <a
                href={`/?inquire=${encodeURIComponent(current.title)}`}
                onClick={e => e.stopPropagation()}
                style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#111", textDecoration:"none", borderBottom:"1px solid #111", paddingBottom:1 }}
              >
                inquire
              </a>

              {hasRefs && (
                <div style={{ marginTop:28 }}>
                  <button
                    onClick={() => setShowRefs(v => !v)}
                    style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#aaa", background:"none", border:"none", cursor:"pointer", padding:0 }}
                  >
                    {showRefs ? "− hide" : `+ ${totalRefs} reference${totalRefs > 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reference world — full-width, same-size D3 cloud */}
          <AnimatePresence>
            {showRefs && (
              <motion.div
                initial={{ opacity:0, height:0 }}
                animate={{ opacity:1, height:"auto" }}
                exit={{ opacity:0, height:0 }}
                transition={{ duration:0.3 }}
                style={{ overflow:"hidden" }}
              >
                <ReferenceCluster
                  images={refs}
                  allItems={allItems}
                  onNavigate={onRefNavigate}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
