"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { HarvestSubmission } from "@/app/api/harvest/submissions/route";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEXTURE_URL = "https://d2w9rnfcy7mm78.cloudfront.net/8424147/original_545e5e9598db3920be3e81593d502120.jpg";
const CREST_URL   = "https://d2w9rnfcy7mm78.cloudfront.net/45960173/original_ca1280adc59a5fb17a12589ee119d422.png";

const DISPLAY_NAMES: Record<string, string> = {
  "im-starting-to-become-a-hoarder": "im starting to become a hoarder,",
};

function fmtTheme(slug: string) {
  return DISPLAY_NAMES[slug] ?? slug.replace(/-/g, " ");
}
function padNum(n: number) { return String(n).padStart(5, "0"); }
function getLayout(count: number): "book" | "two" | "three" {
  if (count === 0) return "book";
  if (count < 24)  return "two";
  return "three";
}

async function downloadImg(url: string, name: string) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch {
    window.open(url, "_blank");
  }
}

// ── Texture overlay — applied to every page ───────────────────────────────────

function TextureOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
      backgroundImage: `url(${TEXTURE_URL})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      mixBlendMode: "multiply",
      opacity: 0.055,
    }} />
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ submissions, startIdx, onClose }: { submissions: HarvestSubmission[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx]         = useState(startIdx);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const touchY                = useRef<number | null>(null);
  const sub                   = submissions[idx];
  const img                   = sub?.images[0];

  const go = useCallback((dir: "up" | "down") => {
    const next = dir === "down" ? Math.min(idx + 1, submissions.length - 1) : Math.max(idx - 1, 0);
    if (next === idx) return;
    setAnimDir(dir);
    setTimeout(() => { setIdx(next); setAnimDir(null); }, 200);
  }, [idx, submissions.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go("down");
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  go("up");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!sub) return null;
  const opacity   = animDir ? 0 : 1;
  const translate = animDir === "down" ? "translateY(-28px)" : animDir === "up" ? "translateY(28px)" : "translateY(0)";

  function onTouchStart(e: React.TouchEvent) { touchY.current = e.touches[0].clientY; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dy) > 40) go(dy < 0 ? "down" : "up");
    touchY.current = null;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px clamp(20px,4vw,48px)", fontFamily: FONT_MONO, opacity, transition: "opacity 0.2s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>{sub.name}</p>
          <p style={{ fontSize: 8, letterSpacing: "0.1em", color: "#bbb" }}>{padNum(idx + 1)} / {padNum(submissions.length)}</p>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button onClick={() => img && downloadImg(img, sub.name)} style={{ background: "none", border: "1px solid #e0e0e0", padding: "6px 16px", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#555" }}>download ↓</button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#bbb" }}>close</button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px,6vw,80px) clamp(32px,5vh,56px)", opacity, transform: translate, transition: "opacity 0.2s ease, transform 0.2s cubic-bezier(0,0,0.3,1)" }}>
        {img && <img src={img} alt={sub.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />}
      </div>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 32, padding: "12px 0 28px" }}>
        <button onClick={() => go("up")} disabled={idx === 0} style={{ background: "none", border: "none", fontSize: 18, color: idx === 0 ? "#e0e0e0" : "#999", cursor: idx === 0 ? "default" : "pointer" }}>↑</button>
        <button onClick={() => go("down")} disabled={idx === submissions.length - 1} style={{ background: "none", border: "none", fontSize: 18, color: idx === submissions.length - 1 ? "#e0e0e0" : "#999", cursor: idx === submissions.length - 1 ? "default" : "pointer" }}>↓</button>
      </div>
    </div>
  );
}

// ── Scroll progress ───────────────────────────────────────────────────────────

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

// ── VERSO page (left) — editorial info side ───────────────────────────────────

function VersoPage({
  submission,
  index,
  isLast,
  isIntro,
  theme,
}: {
  submission?: HarvestSubmission;
  index?: number;
  isLast?: boolean;
  isIntro?: boolean;
  theme: string;
}) {
  return (
    <div style={{
      width: "min(40vw, 310px)",
      aspectRatio: "8.5 / 11",
      background: "#faf9f7",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      // Left page: spine shadow on RIGHT edge
      boxShadow: "inset -6px 0 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)",
    }}>
      <TextureOverlay />

      {/* Page edge — fore edge on left */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "linear-gradient(to right, rgba(0,0,0,0.04), transparent)", pointerEvents: "none", zIndex: 7 }} />

      {/* Content — mirrored margins (wider on right / spine side) */}
      <div style={{ position: "absolute", inset: 0, padding: "10% 12% 12% 9%", display: "flex", flexDirection: "column", zIndex: 8 }}>

        {isIntro ? (
          /* ── Intro verso: title page text ── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 10 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.22em", textTransform: "uppercase", color: "#aaa" }}>image harvest</p>
              </div>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(10px,2vw,14px)", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.3, color: "#2a2824" }}>
                {fmtTheme(theme)}
              </p>
              <div style={{ borderBottom: "0.5px solid #c8c5bf", marginTop: 4 }} />
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.9vw,7px)", letterSpacing: "0.08em", lineHeight: 2, color: "#888", fontStyle: "italic" }}>
                {"food without faces.\nnames without context."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.8vw,6px)", letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
                contributions considered for a limited edition book — june 2026
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.8vw,6px)", letterSpacing: "0.1em", color: "#ccc" }}>— waituntilmay</p>
            </div>
          </div>
        ) : (
          /* ── Submission verso: editorial info ── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 8 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa" }}>image harvest</p>
              </div>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(8px,1.6vw,12px)", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.3, color: "#2a2824" }}>
                {fmtTheme(theme)}
              </p>
            </div>

            {/* Large page number — editorial anchor */}
            <p style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(32px,7vw,56px)",
              color: "#ede9e3",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              userSelect: "none",
            }}>
              {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {submission && (
                <>
                  <div style={{ borderTop: "0.5px solid #c8c5bf", paddingTop: 8 }}>
                    <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.12em", textTransform: "uppercase", color: "#888" }}>
                      {submission.name}
                    </p>
                  </div>
                  <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.1em", color: "#bbb" }}>
                    {new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </>
              )}

              {/* Crest on last page verso */}
              {isLast && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={CREST_URL} alt="" style={{ width: "clamp(24px,4vw,36px)", opacity: 0.5, filter: "grayscale(1)" }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RECTO page (right) — photo side ──────────────────────────────────────────

function RectoPage({
  submission,
  index,
  total,
  isIntro,
  isLast,
  onClick,
}: {
  submission?: HarvestSubmission;
  index?: number;
  total: number;
  isIntro?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}) {
  const img = submission?.images[0];

  return (
    <div
      onClick={onClick}
      style={{
        width: "min(40vw, 310px)",
        aspectRatio: "8.5 / 11",
        background: "#faf9f7",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        // Right page: spine shadow on LEFT edge
        boxShadow: "inset 6px 0 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.09), 4px 0 8px rgba(0,0,0,0.04)",
      }}
    >
      <TextureOverlay />

      {/* Page edge — fore edge on right */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 3, background: "linear-gradient(to left, rgba(0,0,0,0.03), transparent)", pointerEvents: "none", zIndex: 7 }} />

      <div style={{ position: "absolute", inset: 0, padding: "10% 9% 12% 12%", display: "flex", flexDirection: "column", zIndex: 8 }}>

        {isIntro ? (
          /* ── Intro recto: cover page ── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              <div style={{ borderTop: "1px solid #2a2824", paddingTop: 12 }}>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(14px,2.8vw,22px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2, color: "#2a2824" }}>
                  {fmtTheme(theme_placeholder)}
                </p>
              </div>
              <div style={{ borderBottom: "0.5px solid #c8c5bf" }} />
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.9vw,7px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>
                a collective archive
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.12em", color: "#ccc" }}>
                {padNum(total)} contributions
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CREST_URL} alt="" style={{ width: "clamp(28px,5vw,44px)", opacity: 0.35, filter: "grayscale(1)" }} />
            </div>
          </div>
        ) : (
          /* ── Submission recto: framed photo ── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
            {/* Framed image — takes most of the page */}
            <div style={{
              flex: 1,
              border: "0.5px solid #d4cfc8",
              overflow: "hidden",
              background: "#f0ede8",
              minHeight: 0,
            }}>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={submission!.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: 7, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase" }}>no image</p>
                </div>
              )}
            </div>

            {/* Bottom margin — name + number */}
            <div style={{ flexShrink: 0, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", lineHeight: 1 }}>
                {submission?.name}
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.08em", color: "#bbb", lineHeight: 1 }}>
                {index !== undefined ? padNum(index + 1) : ""}
              </p>
            </div>

            {/* Crest on last page recto */}
            {isLast && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CREST_URL} alt="" style={{ width: "clamp(20px,3.5vw,32px)", opacity: 0.4, filter: "grayscale(1)" }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder used inside RectoPage JSX for the intro — resolved at runtime
const theme_placeholder = ""; // overridden via prop drilling below

// ── Intro copy for grid mode ──────────────────────────────────────────────────

function IntroText({ theme }: { theme: string }) {
  return (
    <>
      <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,5vw,52px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>{fmtTheme(theme)}</p>
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

// ── Book reader — two-page spread with 3D flip ────────────────────────────────

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
  const [pageIdx, setPageIdx] = useState(0);   // 0 = intro, 1..n = submission index
  const [shown, setShown]     = useState(0);
  const [phase, setPhase]     = useState<FlipPhase>("idle");
  const [flipDir, setFlipDir] = useState<"fwd" | "back">("fwd");
  const touchX                = useRef<number | null>(null);
  const busy                  = useRef(false);
  const total                 = submissions.length + 1;

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
      setTimeout(() => { setPhase("idle"); busy.current = false; }, 240);
    }, 240);
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

  // The flip transforms the RECTO (right) page going forward,
  // and the VERSO (left) page going back.
  // Forward: recto folds left (origin: left center), new recto unfolds from right
  // Backward: verso folds right (origin: right center), new verso unfolds from left
  let spreadTransform = "none";
  let spreadOrigin    = "center center";
  let spreadOpacity   = 1;

  if (phase === "fold-out") {
    spreadOrigin    = flipDir === "fwd" ? "right center" : "left center";
    spreadTransform = flipDir === "fwd" ? "perspective(1200px) rotateY(-12deg) scale(0.98)" : "perspective(1200px) rotateY(12deg) scale(0.98)";
    spreadOpacity   = 0.6;
  } else if (phase === "fold-in") {
    spreadOrigin    = flipDir === "fwd" ? "left center" : "right center";
    spreadTransform = "perspective(1200px) rotateY(0deg) scale(1)";
    spreadOpacity   = 1;
  }

  const transition = phase === "idle" ? "none" : "transform 0.24s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease";

  const sub    = shown > 0 ? submissions[shown - 1] : undefined;
  const isLast = shown === submissions.length;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#f0ede8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {/* Page counter */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", color: "#aaa", textTransform: "uppercase" }}>
          {shown === 0 ? "image harvest" : `${padNum(shown)} / ${padNum(submissions.length)}`}
        </p>
      </div>

      {/* Spread */}
      <div
        style={{
          display: "flex",
          transformOrigin: spreadOrigin,
          transform: spreadTransform,
          transition,
          opacity: spreadOpacity,
          willChange: "transform, opacity",
          // Gutter shadow between pages
          filter: "drop-shadow(0 16px 48px rgba(0,0,0,0.14))",
        }}
      >
        {/* VERSO — left page */}
        <VersoPage
          submission={sub}
          index={shown > 0 ? shown - 1 : undefined}
          isLast={isLast}
          isIntro={shown === 0}
          theme={theme}
        />

        {/* Center gutter — spine */}
        <div style={{
          width: 6,
          background: "linear-gradient(to right, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.10) 100%)",
          flexShrink: 0,
          alignSelf: "stretch",
        }} />

        {/* RECTO — right page */}
        <RectoPageWrapper
          submission={sub}
          index={shown > 0 ? shown - 1 : undefined}
          total={submissions.length}
          isIntro={shown === 0}
          isLast={isLast}
          theme={theme}
          onClick={sub ? () => onOpenLightbox(shown - 1) : undefined}
        />
      </div>

      {/* Tap zones */}
      <button onClick={goPrev} disabled={pageIdx === 0} aria-label="previous" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "18%", background: "none", border: "none", cursor: pageIdx === 0 ? "default" : "pointer", zIndex: 10 }} />
      <button onClick={goNext} disabled={pageIdx >= total - 1} aria-label="next" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "18%", background: "none", border: "none", cursor: pageIdx >= total - 1 ? "default" : "pointer", zIndex: 10 }} />

      {/* Nav */}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 36 }}>
        <button onClick={goPrev} disabled={pageIdx === 0} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 18, color: pageIdx === 0 ? "#d4cfc8" : "#888", cursor: pageIdx === 0 ? "default" : "pointer" }}>‹</button>
        <button onClick={onSubmit} style={{ background: "none", border: "1px solid #c8c5bf", fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase", padding: "7px 18px", cursor: "pointer", color: "#888" }}>
          add yours
        </button>
        <button onClick={goNext} disabled={pageIdx >= total - 1} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 18, color: pageIdx >= total - 1 ? "#d4cfc8" : "#888", cursor: pageIdx >= total - 1 ? "default" : "pointer" }}>›</button>
      </div>
    </div>
  );
}

// Wrapper to pass theme into RectoPage (avoids the placeholder hack)
function RectoPageWrapper({
  submission, index, total, isIntro, isLast, theme, onClick,
}: {
  submission?: HarvestSubmission; index?: number; total: number;
  isIntro?: boolean; isLast?: boolean; theme: string; onClick?: () => void;
}) {
  const img = submission?.images[0];

  return (
    <div
      onClick={onClick}
      style={{
        width: "min(40vw, 310px)",
        aspectRatio: "8.5 / 11",
        background: "#faf9f7",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        boxShadow: "inset 6px 0 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.09), 4px 0 8px rgba(0,0,0,0.04)",
      }}
    >
      <TextureOverlay />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 3, background: "linear-gradient(to left, rgba(0,0,0,0.03), transparent)", pointerEvents: "none", zIndex: 7 }} />
      <div style={{ position: "absolute", inset: 0, padding: "10% 9% 12% 12%", display: "flex", flexDirection: "column", zIndex: 8 }}>

        {isIntro ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div style={{ borderTop: "1px solid #2a2824", paddingTop: 10 }}>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(12px,2.4vw,19px)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2, color: "#2a2824" }}>
                  {fmtTheme(theme)}
                </p>
              </div>
              <div style={{ borderBottom: "0.5px solid #c8c5bf" }} />
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,0.9vw,7px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>a collective archive</p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.12em", color: "#ccc" }}>{padNum(total)} contributions</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CREST_URL} alt="" style={{ width: "clamp(28px,5vw,44px)", opacity: 0.35, filter: "grayscale(1)" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
            <div style={{ flex: 1, border: "0.5px solid #d4cfc8", overflow: "hidden", background: "#f0ede8", minHeight: 0 }}>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={submission!.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: 7, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase" }}>no image</p>
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(5px,1vw,7px)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555", lineHeight: 1 }}>{submission?.name}</p>
              <p style={{ fontFamily: FONT_MONO, fontSize: "clamp(4px,0.8vw,6px)", letterSpacing: "0.08em", color: "#bbb", lineHeight: 1 }}>{index !== undefined ? padNum(index + 1) : ""}</p>
            </div>
            {isLast && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CREST_URL} alt="" style={{ width: "clamp(20px,3.5vw,32px)", opacity: 0.4, filter: "grayscale(1)" }} />
              </div>
            )}
          </div>
        )}
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
    setStatus("uploading"); setErrMsg("");
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
      <div onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pickFiles(e.dataTransfer.files); }}
        style={{ border: `1px dashed ${drag ? "#000" : "#ddd"}`, padding: "clamp(24px,5vh,40px) 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "border-color 0.2s", background: drag ? "#fafafa" : "transparent" }}>
        {previews.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {previews.map((p, i) => <img key={i} src={p} alt="" style={{ height: 80, width: "auto", objectFit: "cover" }} />)}
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

// ── Main page ─────────────────────────────────────────────────────────────────

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
  const [bookMode, setBookMode]       = useState(false);

  const apiTheme = storageTheme ?? theme;
  const layout   = getLayout(submissions.length);

  useEffect(() => {
    fetch(`/api/harvest/submissions?theme=${theme}`)
      .then(r => r.json())
      .then((fresh: HarvestSubmission[]) => { if (fresh.length > submissions.length) setSubmissions(fresh); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const handleSubmitted = useCallback((s: HarvestSubmission) => { setSubmissions(prev => [...prev, s]); }, []);
  const closeForm       = useCallback(() => setShowForm(false), []);

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox submissions={submissions} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* Fixed header */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px clamp(20px,4vw,48px)", background: layout === "book" ? "linear-gradient(to bottom, rgba(240,237,232,0.95), transparent)" : "linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)", fontFamily: FONT_MONO }}>
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

      {(layout === "book" || bookMode) ? (
        <>
          {bookMode && (
            <button
              onClick={() => setBookMode(false)}
              style={{ position: "fixed", top: 18, left: 20, zIndex: 200, background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#aaa", cursor: "pointer" }}
            >
              ← grid
            </button>
          )}
          <BookReader submissions={submissions} onOpenLightbox={setLightboxIdx} onSubmit={() => setShowForm(true)} theme={theme} />
        </>
      ) : (
        <>
          <ScrollProgress />
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "#fff", border: "1px solid #000", padding: "10px 28px", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
              add yours →
            </button>
          )}
          <div style={{ minHeight: "100svh", padding: "clamp(80px,12vh,120px) clamp(20px,4vw,60px) 160px" }}>
            <div style={{ maxWidth: 480, margin: "0 auto clamp(48px,8vh,80px)", display: "flex", flexDirection: "column", gap: 20 }}>
              <IntroText theme={theme} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: layout === "two" ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: layout === "two" ? "clamp(16px,3vw,40px)" : "clamp(12px,2vw,28px)" }}>
              {submissions.map((s, i) => (
                <GridCard key={s.id} submission={s} index={i} layout={layout} onClick={() => setLightboxIdx(i)} />
              ))}
            </div>
            {/* Open as book — at the bottom after scrolling all photos */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: "clamp(60px,10vh,100px)", paddingBottom: 40 }}>
              <div style={{ width: 1, height: 48, background: "#e8e8e8" }} />
              <button
                onClick={() => setBookMode(true)}
                style={{ background: "none", border: "1px solid #000", padding: "13px 36px", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", color: "#000" }}
              >
                open as book →
              </button>
              <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ccc", textTransform: "uppercase" }}>two-page spread</p>
            </div>
          </div>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}

const inputStyle: React.CSSProperties = { background: "none", border: "none", borderBottom: "1px solid #e0e0e0", padding: "8px 0", fontSize: 11, letterSpacing: "0.06em", color: "#000", outline: "none", width: "100%", fontFamily: FONT_MONO };
const ghostBtn: React.CSSProperties   = { background: "none", border: "1px solid #e0e0e0", padding: "10px 24px", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", color: "#555" };
