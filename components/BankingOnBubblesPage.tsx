"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

const BASE = "https://6gou1uitbmkd2uvc.public.blob.vercel-storage.com/banking-on-bubbles/";
const IMAGES = Array.from({ length: 22 }, (_, i) => `${BASE}${String(i + 1).padStart(2, "0")}.png`);

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ startIdx, onClose }: { startIdx: number; onClose: () => void }) {
  const [idx, setIdx]         = useState(startIdx);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const touchY                = useRef<number | null>(null);

  const go = useCallback((dir: "up" | "down") => {
    const next = dir === "down" ? Math.min(idx + 1, IMAGES.length - 1) : Math.max(idx - 1, 0);
    if (next === idx) return;
    setAnimDir(dir);
    setTimeout(() => { setIdx(next); setAnimDir(null); }, 200);
  }, [idx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")                               onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight")  go("down");
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")   go("up");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  function onTouchStart(e: React.TouchEvent) { touchY.current = e.touches[0].clientY; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dy) > 40) go(dy < 0 ? "down" : "up");
    touchY.current = null;
  }

  const opacity   = animDir ? 0 : 1;
  const translate = animDir === "down" ? "translateY(-28px)" : animDir === "up" ? "translateY(28px)" : "translateY(0)";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "#000", display: "flex", flexDirection: "column" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px clamp(20px,4vw,48px)", fontFamily: FONT_MONO,
        opacity, transition: "opacity 0.2s ease",
      }}>
        <p style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>
          {String(idx + 1).padStart(2, "0")} / {String(IMAGES.length).padStart(2, "0")}
        </p>
        <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#555" }}>
          close
        </button>
      </div>

      {/* Image */}
      <div style={{
        flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 clamp(24px,6vw,80px) clamp(32px,5vh,56px)",
        opacity, transform: translate,
        transition: "opacity 0.2s ease, transform 0.2s cubic-bezier(0,0,0.3,1)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGES[idx]} alt={`banking on bubbles — ${idx + 1}`}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
      </div>

      {/* Nav */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 32, padding: "12px 0 28px", fontFamily: FONT_MONO }}>
        <button onClick={() => go("up")} disabled={idx === 0}
          style={{ background: "none", border: "none", fontSize: 18, color: idx === 0 ? "#333" : "#666", cursor: idx === 0 ? "default" : "pointer", transition: "color 0.2s" }}>↑</button>
        <button onClick={() => go("down")} disabled={idx === IMAGES.length - 1}
          style={{ background: "none", border: "none", fontSize: 18, color: idx === IMAGES.length - 1 ? "#333" : "#666", cursor: idx === IMAGES.length - 1 ? "default" : "pointer", transition: "color 0.2s" }}>↓</button>
      </div>
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function BubbleCard({ src, index, onClick }: { src: string; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    const delay = (index % 2) * 60;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        observer.disconnect();
      }
    }, { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div ref={ref} onClick={onClick} style={{ cursor: "pointer", aspectRatio: "1 / 1", background: "#000", overflow: "hidden", position: "relative" }}
      onMouseEnter={e => { (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform = "scale(1.03)"; }}
      onMouseLeave={e => { (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform = "scale(1)"; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease" }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BankingOnBubblesPage() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* Fixed header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px clamp(20px,4vw,48px)",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        fontFamily: FONT_MONO,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff", fontFamily: FONT_DISPLAY }}>
            banking on bubbles
          </p>
          <p style={{ fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>
            {String(IMAGES.length).padStart(2, "0")} works — waituntilmay
          </p>
        </div>
        <Link href="/work" style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#444", textDecoration: "none" }}>
          ← work
        </Link>
      </div>

      {/* Full-bleed black grid */}
      <div style={{ background: "#000", minHeight: "100svh" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
          paddingTop: 60,
        }}>
          {IMAGES.map((src, i) => (
            <BubbleCard key={i} src={src} index={i} onClick={() => setLightboxIdx(i)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "40px clamp(20px,4vw,48px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(16px,2.5vw,24px)", letterSpacing: "0.08em", textTransform: "uppercase", color: "#222" }}>
            banking on bubbles
          </p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", color: "#333", textTransform: "uppercase" }}>
            waituntilmay
          </p>
        </div>
      </div>
    </>
  );
}
