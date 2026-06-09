"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { WorkItem } from "@/app/api/work/route";
import { FONT_MONO, FONT_DISPLAY } from "@/lib/theme";
import CloudView from "./CloudView";
import BlobBackground from "./BlobBackground";

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
  const [navStack, setNavStack] = useState<WorkItem[]>([item]);
  const current = navStack[navStack.length - 1];

  // "info" = detail view, "refs" = full-screen cloud of references
  const [mode, setMode] = useState<"info" | "refs">("info");
  // tracks whether each nav entry was reached from the refs cloud
  const [fromRefsStack, setFromRefsStack] = useState<boolean[]>([false]);
  const [muted, setMuted] = useState(true);
  const [showInquiry, setShowInquiry] = useState(false);
  const [iqName,  setIqName]  = useState("");
  const [iqEmail, setIqEmail] = useState("");
  const [iqMsg,   setIqMsg]   = useState("");
  const [iqStatus, setIqStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setNavStack([item]);
    setFromRefsStack([false]);
    setMode("info");
    setShowInquiry(false);
    setIqStatus("idle");
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Reset inquiry form when navigating to new item
    setShowInquiry(false);
    setIqStatus("idle");
    setIqMsg("");
  }, [current.id]);

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    setIqStatus("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: iqName.trim(), email: iqEmail.trim(), message: iqMsg.trim() }),
      });
      if (!res.ok) throw new Error();
      setIqStatus("sent");
    } catch {
      setIqStatus("error");
    }
  }

  const mainSrc  = current.images?.[0] ?? current.image ?? "";
  const refUrls  = (current.images ?? []).slice(1);
  const hasRefs  = refUrls.length > 0;

  // Convert reference URLs into WorkItems — match existing works where possible,
  // create stubs for standalone reference images
  const refItems = useMemo<WorkItem[]>(() => {
    const items = refUrls.map((url, i) => {
      const match = allItems.find(w =>
        w.id !== current.id &&
        (w.image === url || w.images?.[0] === url || (w.images ?? []).includes(url))
      );
      if (match) return match;
      return {
        id: `ref-${current.id}-${i}`,
        title: "",
        category: current.category,
        image: url,
        visible: true,
        listed: false,
      } as WorkItem;
    });
    // Deduplicate
    return items.filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx);
  }, [refUrls, allItems, current.id, current.category]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = useCallback(() => {
    if (mode === "refs") { setMode("info"); return; }
    if (navStack.length > 1) {
      const cameFromRefs = fromRefsStack[fromRefsStack.length - 1];
      setNavStack(s => s.slice(0, -1));
      setFromRefsStack(s => s.slice(0, -1));
      if (cameFromRefs) setMode("refs");
      return;
    }
    onClose();
  }, [mode, navStack.length, fromRefsStack, onClose]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      goBack();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [goBack]);

  const backLabel = mode === "refs"
    ? `← ${current.title || "back"}`
    : navStack.length > 1 ? "← back" : "close";

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:50, background:"#fafafa" }}
      onClick={mode === "info" ? onClose : undefined}
    >
      {/* Close / Back */}
      <button
        onClick={e => { e.stopPropagation(); goBack(); }}
        style={{ position:"fixed", top:24, right:24, background:"none", border:"none", cursor:"pointer", fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#999", zIndex:51 }}
      >
        {backLabel}
      </button>

      {/* Breadcrumb */}
      {navStack.length > 1 && mode === "info" && (
        <div style={{ position:"fixed", top:24, left:28, fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#ccc", zIndex:51, maxWidth:"60vw", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
          {navStack.slice(0, -1).map((w, i) => (
            <span key={w.id} onClick={e => { e.stopPropagation(); setNavStack(s => s.slice(0, i + 1)); setMode("info"); }} style={{ cursor:"pointer", marginRight:8 }}>
              {(w.title || "ref").slice(0, 16)}{w.title.length > 16 ? "…" : ""} →
            </span>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── REFS MODE: full-screen cloud, same as /work ── */}
        {mode === "refs" && (
          <motion.div
            key="refs"
            style={{ position:"absolute", inset:0 }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.22 }}
            onClick={e => e.stopPropagation()}
          >
            <BlobBackground />
            <CloudView
              items={refItems}
              onSelect={ref => {
                setNavStack(s => [...s, ref]);
                setFromRefsStack(s => [...s, true]);
                setMode("info");
              }}
            />
          </motion.div>
        )}

        {/* ── INFO MODE: full-screen detail ── */}
        {mode === "info" && (
          <motion.div
            key={current.id}
            onClick={e => e.stopPropagation()}
            style={{
              position:"absolute", inset:0,
              display:"flex",
              flexDirection: isMobile ? "column" : "row",
            }}
            initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}
          >
            {/* Image / video — fills the screen */}
            <div style={{
              flex: isMobile ? "none" : 1,
              height: isMobile ? "55svh" : "100%",
              position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center",
              overflow:"hidden",
            }}>
              {current.video
                ? <>
                    <video src={current.video} autoPlay loop playsInline muted={muted} style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
                    <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} style={{ position:"absolute", bottom:12, right:12, background:"rgba(0,0,0,0.35)", border:"none", borderRadius:2, color:"#fff", fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", padding:"4px 8px", fontFamily:FONT_MONO }}>
                      {muted ? "unmute" : "mute"}
                    </button>
                  </>
                : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={mainSrc}
                      src={mainSrc}
                      alt={current.title}
                      style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}
                      draggable={false}
                    />
                  </AnimatePresence>
                )
              }
            </div>

            {/* Info panel — narrow sidebar on desktop, strip below on mobile */}
            <div style={{
              width: isMobile ? "100%" : 200,
              flexShrink: 0,
              overflowY: "auto",
              padding: isMobile ? "20px 24px 48px" : "64px 28px 40px",
              borderLeft: isMobile ? "none" : "1px solid #f0f0f0",
              borderTop: isMobile ? "1px solid #f0f0f0" : "none",
            }}>
              <p style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:"#bbb", fontFamily:FONT_MONO, marginBottom:18 }}>
                {CAT[current.category] ?? current.category}
              </p>
              <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:titleSize(current.title), fontWeight:"normal", letterSpacing:"0.06em", textTransform:"uppercase", lineHeight:1.1, margin:"0 0 14px" }}>
                {current.title}
              </h2>
              {current.year && <p style={{ fontSize:10, letterSpacing:"0.18em", color:"#bbb", fontFamily:FONT_MONO, textTransform:"uppercase", marginBottom:6 }}>{current.year}</p>}
              {current.role && <p style={{ fontSize:10, letterSpacing:"0.10em", color:"#ccc", fontFamily:FONT_MONO, marginBottom:18 }}>{current.role}</p>}
              {current.context && <p style={{ fontSize:9, letterSpacing:"0.04em", color:"#777", fontFamily:FONT_MONO, lineHeight:1.7, marginBottom:20 }}>{current.context}</p>}

              {/* Inquire */}
              <button
                onClick={e => { e.stopPropagation(); setShowInquiry(v => !v); if (!showInquiry) setIqMsg(`Inquiry regarding: ${current.title}\n\n`); setIqStatus("idle"); }}
                style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#111", background:"none", border:"none", borderBottom:"1px solid #111", paddingBottom:1, cursor:"pointer", padding:0 }}
              >
                inquire
              </button>

              <AnimatePresence>
                {showInquiry && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.22 }} style={{ overflow:"hidden", marginTop:16 }} onClick={e => e.stopPropagation()}>
                    {iqStatus === "sent" ? (
                      <p style={{ fontSize:9, letterSpacing:"0.1em", color:"#aaa", fontFamily:FONT_MONO }}>sent.</p>
                    ) : (
                      <form onSubmit={submitInquiry} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        <input required placeholder="name" value={iqName} onChange={e => setIqName(e.target.value)} style={{ borderBottom:"1px solid #e0e0e0", background:"none", outline:"none", fontSize:9, letterSpacing:"0.1em", fontFamily:FONT_MONO, color:"#111", padding:"4px 0", width:"100%" }} />
                        <input required type="email" placeholder="email" value={iqEmail} onChange={e => setIqEmail(e.target.value)} style={{ borderBottom:"1px solid #e0e0e0", background:"none", outline:"none", fontSize:9, letterSpacing:"0.1em", fontFamily:FONT_MONO, color:"#111", padding:"4px 0", width:"100%" }} />
                        <textarea required rows={3} placeholder="message" value={iqMsg} onChange={e => setIqMsg(e.target.value)} style={{ border:"none", borderBottom:"1px solid #e0e0e0", background:"none", outline:"none", fontSize:9, letterSpacing:"0.1em", fontFamily:FONT_MONO, color:"#111", padding:"4px 0", resize:"none", width:"100%" }} />
                        <button type="submit" disabled={iqStatus === "sending"} style={{ fontSize:8, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color: iqStatus === "sending" ? "#aaa" : "#111", background:"none", border:"none", borderBottom:"1px solid currentColor", cursor:"pointer", padding:0, alignSelf:"flex-start" }}>
                          {iqStatus === "sending" ? "sending…" : iqStatus === "error" ? "retry" : "send"}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* References — enter full-screen cloud */}
              {hasRefs && (
                <div style={{ marginTop:28 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMode("refs"); }}
                    style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FONT_MONO, color:"#aaa", background:"none", border:"none", cursor:"pointer", padding:0 }}
                  >
                    + {refUrls.length} reference{refUrls.length > 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
