"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { HarvestSubmission } from "@/app/api/harvest/submissions/route";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  "im-starting-to-become-a-hoarder": "im starting to become a hoarder,",
};

function fmtTheme(slug: string) {
  return DISPLAY_NAMES[slug] ?? slug.replace(/-/g, " ");
}

function padNum(n: number) {
  return String(n).padStart(5, "0");
}

function getLayout(count: number): "book" | "two" | "three" {
  if (count === 0) return "book";
  if (count < 24)  return "two";
  return "three";
}

// ── Download helper ───────────────────────────────────────────────────────────

async function downloadImg(url: string, name: string) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = Object.assign(document.createElement("a"), {
      href:     URL.createObjectURL(blob),
      download: `${name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch {
    window.open(url, "_blank");
  }
}

// ── Book icon SVG ─────────────────────────────────────────────────────────────

function BookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ display: "block" }}>
      {/* Spine */}
      <rect x="13" y="4" width="1.5" height="20" fill="#ccc" />
      {/* Left cover */}
      <path d="M13 5 C10 5 5 6 4 8 L4 22 C5 20 10 19 13 19 Z" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5"/>
      {/* Right cover */}
      <path d="M14.5 5 C17.5 5 22 6 23 8 L23 22 C22 20 17.5 19 14.5 19 Z" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5"/>
      {/* Left lines */}
      <line x1="6.5" y1="10" x2="12" y2="9.5" stroke="#bbb" strokeWidth="0.6"/>
      <line x1="6.5" y1="13" x2="12" y2="12.5" stroke="#bbb" strokeWidth="0.6"/>
      <line x1="6.5" y1="16" x2="12" y2="15.5" stroke="#bbb" strokeWidth="0.6"/>
      {/* Right lines */}
      <line x1="21" y1="10" x2="15.5" y2="9.5" stroke="#bbb" strokeWidth="0.6"/>
      <line x1="21" y1="13" x2="15.5" y2="12.5" stroke="#bbb" strokeWidth="0.6"/>
      <line x1="21" y1="16" x2="15.5" y2="15.5" stroke="#bbb" strokeWidth="0.6"/>
    </svg>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  submissions, startIdx, onClose,
}: {
  submissions: HarvestSubmission[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx]         = useState(startIdx);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const touchY                = useRef<number | null>(null);
  const sub                   = submissions[idx];
  const img                   = sub?.images[0];

  const go = useCallback((dir: "up" | "down") => {
    const next = dir === "down"
      ? Math.min(idx + 1, submissions.length - 1)
      : Math.max(idx - 1, 0);
    if (next === idx) return;
    setAnimDir(dir);
    setTimeout(() => { setIdx(next); setAnimDir(null); }, 200);
  }, [idx, submissions.length]);

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

  if (!sub) return null;
  const opacity   = animDir ? 0 : 1;
  const translate = animDir === "down" ? "translateY(-28px)" : animDir === "up" ? "translateY(28px)" : "translateY(0)";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px clamp(20px,4vw,48px)", fontFamily: FONT_MONO, opacity, transition: "opacity 0.2s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>{sub.name}</p>
          <p style={{ fontSize: 8, letterSpacing: "0.1em", color: "#bbb" }}>{padNum(idx + 1)} / {padNum(submissions.length)}</p>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button onClick={() => img && downloadImg(img, sub.name)}
            style={{ background: "none", border: "1px solid #e0e0e0", padding: "6px 16px", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#555" }}>
            download ↓
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#bbb" }}>
            close
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px,6vw,80px) clamp(32px,5vh,56px)", opacity, transform: translate, transition: "opacity 0.2s ease, transform 0.2s cubic-bezier(0,0,0.3,1)" }}>
        {img && <img src={img} alt={sub.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />}
      </div>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 32, padding: "12px 0 28px", fontFamily: FONT_MONO }}>
        <button onClick={() => go("up")} disabled={idx === 0} style={{ background: "none", border: "none", fontSize: 18, color: idx === 0 ? "#e0e0e0" : "#999", cursor: idx === 0 ? "default" : "pointer" }}>↑</button>
        <button onClick={() => go("down")} disabled={idx === submissions.length - 1} style={{ background: "none", border: "none", fontSize: 18, color: idx === submissions.length - 1 ? "#e0e0e0" : "#999", cursor: idx === submissions.length - 1 ? "default" : "pointer" }}>↓</button>
      </div>
    </div>
  );
}

// ── Scroll progress bar ───────────────────────────────────────────────────────

function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function update() {
      const doc = document.documentElement;
      const pct = doc.scrollTop / (doc.scrollHeight - doc.clientHeight);
      if (barRef.current) barRef.current.style.transform = `scaleX(${isNaN(pct) ? 0 : pct})`;
    }
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "#e8e8e8", zIndex: 200, overflow: "hidden" }}>
      <div ref={barRef} style={{ position: "absolute", inset: 0, background: "#000", transformOrigin: "left center", transform: "scaleX(0)", transition: "transform 0.1s linear" }} />
    </div>
  );
}

// ── Intro copy ────────────────────────────────────────────────────────────────

function IntroText({ theme }: { theme: string }) {
  return (
    <>
      <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,5vw,52px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>
        {fmtTheme(theme)}
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <BookIcon size={32} />
      </div>
      <div style={{ borderTop: "1px solid #efefef" }} />
      <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", lineHeight: 2.2, color: "#111", fontStyle: "italic" }}>
        {"this is a collective archive — food without faces, names without context.\n\nsubmit a photograph of what you have eaten. your name will accompany it."}
      </p>
      <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", lineHeight: 2, color: "#555", textTransform: "uppercase" }}>
        contributions will be considered for a limited edition book publishing june 2026. not all submissions will be included in the printed edition — all will remain here.
      </p>
      <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", color: "#888" }}>— waituntilmay</p>
    </>
  );
}

// ── Book page ─────────────────────────────────────────────────────────────────
// A single 8.5/11 sheet: generous margin around the image, name + number inside

function BookPage({
  submission,
  index,
  onClick,
}: {
  submission: HarvestSubmission;
  index: number;
  onClick: () => void;
}) {
  const img = submission.images[0];

  return (
    <div
      onClick={onClick}
      style={{
        width: "min(68vw, 400px)",
        aspectRatio: "8.5 / 11",
        background: "#fff",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        // Book-like shadow: deeper on spine side, soft lift on fore-edge
        boxShadow: "4px 0 2px -2px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.13), -4px 0 10px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Spine shadow */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 12, background: "linear-gradient(to right, rgba(0,0,0,0.12), transparent)", pointerEvents: "none", zIndex: 2 }} />

      {/* Page-edge highlight */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 3, background: "linear-gradient(to left, rgba(255,255,255,0.9), transparent)", pointerEvents: "none", zIndex: 2 }} />

      {/* Outer margin / border frame — 10% on sides, 8% top, 18% bottom */}
      <div style={{
        position: "absolute",
        top: "8%", left: "10%", right: "10%", bottom: "18%",
        border: "0.5px solid #e0e0e0",
        overflow: "hidden",
      }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={submission.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase" }}>no image</span>
          </div>
        )}
      </div>

      {/* Bottom caption — sits in the bottom margin */}
      <div style={{
        position: "absolute",
        bottom: "5%", left: "10%", right: "10%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(7px,1.4vw,9px)", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", lineHeight: 1 }}>
          {submission.name}
        </p>
        <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(6px,1.2vw,8px)", letterSpacing: "0.1em", color: "#ccc", lineHeight: 1 }}>
          {padNum(index + 1)}
        </p>
      </div>

      {/* Top label */}
      <div style={{ position: "absolute", top: "3%", left: "10%", right: "10%", display: "flex", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc" }}>
          image harvest
        </p>
      </div>
    </div>
  );
}

// ── Book reader — state-driven with 3D page flip ──────────────────────────────

type FlipPhase = "idle" | "fold-out" | "fold-in";

function BookReader({
  submissions,
  onOpenLightbox,
  onSubmit,
  theme,
}: {
  submissions: HarvestSubmission[];
  onOpenLightbox: (i: number) => void;
  onSubmit: () => void;
  theme: string;
}) {
  // pageIdx 0 = intro, 1..n = submissions
  const [pageIdx, setPageIdx]   = useState(0);
  const [shown, setShown]       = useState(0);       // what's actually rendered during flip
  const [phase, setPhase]       = useState<FlipPhase>("idle");
  const [flipDir, setFlipDir]   = useState<"fwd" | "back">("fwd");
  const touchX                  = useRef<number | null>(null);
  const busy                    = useRef(false);
  const total                   = submissions.length + 1; // +1 for intro

  const goTo = useCallback((next: number) => {
    if (busy.current || next < 0 || next >= total) return;
    busy.current = true;
    const dir: "fwd" | "back" = next > pageIdx ? "fwd" : "back";
    setFlipDir(dir);
    setPhase("fold-out");
    setTimeout(() => {
      setShown(next);
      setPageIdx(next);
      setPhase("fold-in");
      setTimeout(() => {
        setPhase("idle");
        busy.current = false;
      }, 220);
    }, 220);
  }, [pageIdx, total]);

  const goNext = useCallback(() => goTo(pageIdx + 1), [goTo, pageIdx]);
  const goPrev = useCallback(() => goTo(pageIdx - 1), [goTo, pageIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 44) dx < 0 ? goNext() : goPrev();
    touchX.current = null;
  }

  // Build the transform for the flip animation
  // fold-out: current page folds away. fold-in: new page comes in.
  // Forward: page turns left (rotateY negative from right edge)
  // Backward: page turns right (rotateY positive from left edge)
  let transform = "rotateY(0deg)";
  let origin    = "center center";

  if (phase === "fold-out") {
    origin    = flipDir === "fwd" ? "right center" : "left center";
    transform = flipDir === "fwd" ? "rotateY(-90deg)" : "rotateY(90deg)";
  } else if (phase === "fold-in") {
    origin    = flipDir === "fwd" ? "left center" : "right center";
    transform = "rotateY(0deg)";
  }

  const transition = phase === "idle"
    ? "none"
    : "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease";

  const opacity = phase === "fold-out" ? 0 : 1;

  const sub = shown > 0 ? submissions[shown - 1] : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {/* Page counter */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", color: "#ccc", textTransform: "uppercase" }}>
          {shown === 0 ? "—" : `${padNum(shown)} / ${padNum(submissions.length)}`}
        </p>
      </div>

      {/* 3D stage */}
      <div style={{ perspective: "1400px", perspectiveOrigin: "50% 50%" }}>
        <div style={{
          transformOrigin: phase === "idle" ? "center center" : origin,
          transform,
          transition,
          opacity,
          willChange: "transform, opacity",
        }}>
          {shown === 0 ? (
            /* ── Intro page ── */
            <div style={{
              width: "min(68vw, 400px)",
              aspectRatio: "8.5 / 11",
              background: "#fff",
              boxShadow: "4px 0 2px -2px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.13), -4px 0 10px rgba(0,0,0,0.07)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "10%",
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Spine shadow */}
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 12, background: "linear-gradient(to right, rgba(0,0,0,0.10), transparent)", pointerEvents: "none" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,2vh,18px)" }}>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(13px,2.5vw,19px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2 }}>
                  {fmtTheme(theme)}
                </p>
                <BookIcon size={22} />
                <div style={{ borderTop: "0.5px solid #e8e8e8" }} />
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(7px,1.3vw,9px)", letterSpacing: "0.04em", lineHeight: 2, color: "#666", fontStyle: "italic" }}>
                  {"food without faces.\nnames without context."}
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(6px,1.1vw,8px)", letterSpacing: "0.12em", color: "#bbb", textTransform: "uppercase" }}>
                  image harvest
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(6px,1.1vw,8px)", letterSpacing: "0.1em", color: "#ccc" }}>
                  — waituntilmay
                </p>
                {submissions.length > 0 && (
                  <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(6px,1.1vw,7px)", letterSpacing: "0.12em", color: "#ddd", textTransform: "uppercase", marginTop: 4 }}>
                    {padNum(submissions.length)} contributions →
                  </p>
                )}
              </div>
            </div>
          ) : sub ? (
            <BookPage
              submission={sub}
              index={shown - 1}
              onClick={() => onOpenLightbox(shown - 1)}
            />
          ) : null}
        </div>
      </div>

      {/* Tap zones — left / right sides */}
      <button
        onClick={goPrev}
        disabled={pageIdx === 0}
        aria-label="previous"
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "20%",
          background: "none", border: "none", cursor: pageIdx === 0 ? "default" : "pointer",
          zIndex: 10,
        }}
      />
      <button
        onClick={goNext}
        disabled={pageIdx >= total - 1}
        aria-label="next"
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "20%",
          background: "none", border: "none", cursor: pageIdx >= total - 1 ? "default" : "pointer",
          zIndex: 10,
        }}
      />

      {/* Nav arrows */}
      <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
        <button onClick={goPrev} disabled={pageIdx === 0} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 16, color: pageIdx === 0 ? "#e8e8e8" : "#999", cursor: pageIdx === 0 ? "default" : "pointer" }}>‹</button>
        <button
          onClick={onSubmit}
          style={{ background: "none", border: "1px solid #e0e0e0", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", padding: "7px 18px", cursor: "pointer", color: "#555" }}
        >
          add yours
        </button>
        <button onClick={goNext} disabled={pageIdx >= total - 1} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 16, color: pageIdx >= total - 1 ? "#e8e8e8" : "#999", cursor: pageIdx >= total - 1 ? "default" : "pointer" }}>›</button>
      </div>
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ submission, index, layout, onClick }: { submission: HarvestSubmission; index: number; layout: "two" | "three"; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    const delay = (index % (layout === "two" ? 2 : 3)) * 80;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, layout]);

  const img = submission.images[0];

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div onClick={onClick} style={{ width: "100%", aspectRatio: "8.5 / 11", background: "#f5f5f5", overflow: "hidden", cursor: "pointer" }}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={submission.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
            onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = "scale(1)"; }}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4 }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>{submission.name}</p>
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ccc" }}>{padNum(index + 1)}</p>
      </div>
    </div>
  );
}

// ── Image compression ─────────────────────────────────────────────────────────

function compressImage(file: File, maxPx = 1800, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else        { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("compression failed")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Upload form ───────────────────────────────────────────────────────────────

function SubmitForm({ theme, onSubmitted, onClose }: { theme: string; onSubmitted: (s: HarvestSubmission) => void; onClose: () => void }) {
  const [name, setName]         = useState("");
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus]     = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [errMsg, setErrMsg]     = useState("");
  const [drag, setDrag]         = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  function pickFiles(picked: FileList | null) {
    if (!picked) return;
    const arr = Array.from(picked).slice(0, 6);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !files.length) return;
    setStatus("uploading");
    setErrMsg("");

    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`uploading ${i + 1} of ${files.length}…`);
        const compressed = await compressImage(files[i]);
        const fd = new FormData();
        fd.append("file", compressed, "photo.jpg");
        const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        fd.append("path", `harvest/${theme}/images/${safe}`);
        const r = await fetch("/api/harvest/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok || !j.url) throw new Error(j.error || `photo ${i + 1} failed`);
        urls.push(j.url as string);
      }

      setProgress("saving…");
      const res  = await fetch("/api/harvest/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme, name: name.trim(), images: urls }) });
      const data = await res.json();
      if (data.ok) { setStatus("done"); onSubmitted(data.submission); }
      else         { setStatus("error"); setErrMsg(data.error || "server rejected submission"); }
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (status === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "48px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,5vw,52px)", letterSpacing: "0.06em", textTransform: "uppercase" }}>thank you, {name}.</p>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#aaa" }}>your contribution is live.</p>
        <button onClick={onClose} style={ghostBtn}>close</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20, padding: "clamp(24px,5vw,48px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb" }}>add to the harvest</p>
        <button type="button" onClick={onClose} style={{ ...ghostBtn, border: "none", padding: 0, color: "#bbb" }}>✕</button>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="your name" required style={inputStyle} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pickFiles(e.dataTransfer.files); }}
        style={{ border: `1px dashed ${drag ? "#000" : "#ddd"}`, padding: "clamp(24px,5vh,40px) 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "border-color 0.2s", background: drag ? "#fafafa" : "transparent" }}
      >
        {previews.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {previews.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" style={{ height: 80, width: "auto", objectFit: "cover" }} />
            ))}
          </div>
        ) : (
          <>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>tap to upload</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ddd" }}>up to 6 photos — no faces</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => pickFiles(e.target.files)} />
      </div>
      {status === "error" && <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#aaa", letterSpacing: "0.1em" }}>{errMsg || "something went wrong"} — try again</p>}
      <button type="submit" disabled={status === "uploading"} style={{ background: "#000", color: "#fff", border: "none", padding: "12px 0", fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", cursor: status === "uploading" ? "wait" : "pointer", opacity: status === "uploading" ? 0.5 : 1 }}>
        {status === "uploading" ? (progress || "uploading…") : "submit"}
      </button>
    </form>
  );
}

// ── Main feed page ────────────────────────────────────────────────────────────

export default function HarvestFeedPage({
  theme,
  storageTheme,
  initialSubmissions,
}: {
  theme: string;
  storageTheme?: string;
  initialSubmissions: HarvestSubmission[];
}) {
  const [submissions, setSubmissions] = useState<HarvestSubmission[]>(initialSubmissions);
  const [showForm, setShowForm]       = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const apiTheme = storageTheme ?? theme;
  const layout   = getLayout(submissions.length);

  useEffect(() => {
    fetch(`/api/harvest/submissions?theme=${theme}`)
      .then(r => r.json())
      .then((fresh: HarvestSubmission[]) => {
        if (fresh.length > submissions.length) setSubmissions(fresh);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const handleSubmitted = useCallback((s: HarvestSubmission) => {
    setSubmissions(prev => [...prev, s]);
  }, []);

  const closeForm = useCallback(() => setShowForm(false), []);

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox submissions={submissions} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* Fixed header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px clamp(20px,4vw,48px)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, transparent 100%)",
        fontFamily: FONT_MONO,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#000" }}>{fmtTheme(theme)}</p>
          <p style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb" }}>image harvest — {String(submissions.length).padStart(5, "0")} contributions</p>
        </div>
        <Link href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>waituntilmay</Link>
      </div>

      {/* Submit drawer */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(255,255,255,0.97)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <SubmitForm theme={apiTheme} onSubmitted={handleSubmitted} onClose={closeForm} />
          </div>
        </div>
      )}

      {/* Feed */}
      {layout === "book" ? (
        <BookReader
          submissions={submissions}
          onOpenLightbox={setLightboxIdx}
          onSubmit={() => setShowForm(true)}
          theme={theme}
        />
      ) : (
        <>
          <ScrollProgress />
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#fff", border: "1px solid #000", padding: "10px 28px", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
              add yours →
            </button>
          )}
          <div style={{ minHeight: "100svh", padding: "clamp(80px,12vh,120px) clamp(20px,4vw,60px) 120px" }}>
            <div style={{ maxWidth: 480, margin: "0 auto clamp(48px,8vh,80px)", display: "flex", flexDirection: "column", gap: 20 }}>
              <IntroText theme={theme} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: layout === "two" ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: layout === "two" ? "clamp(16px,3vw,40px)" : "clamp(12px,2vw,28px)" }}>
              {submissions.map((s, i) => (
                <GridCard key={s.id} submission={s} index={i} layout={layout} onClick={() => setLightboxIdx(i)} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "none", border: "none", borderBottom: "1px solid #e0e0e0",
  padding: "8px 0", fontSize: 11, letterSpacing: "0.06em", color: "#000",
  outline: "none", width: "100%", fontFamily: FONT_MONO,
};

const ghostBtn: React.CSSProperties = {
  background: "none", border: "1px solid #e0e0e0", padding: "10px 24px",
  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em",
  textTransform: "uppercase", cursor: "pointer", color: "#555",
};
