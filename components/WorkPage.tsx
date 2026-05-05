"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { WorkItem } from "@/app/api/work/route";
import { makeSlug } from "@/app/api/work/route";
import { useFadeIn } from "@/lib/useFadeIn";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// Group-show ordering: fine-arts first, then the rest
const CAT_PRIORITY: Record<string, number> = {
  "fine-arts": 0,
  "clothing-production": 1,
  "movies-video": 2,
  "consulting": 3,
};

const CATEGORIES = [
  { id: "all",                 label: "all" },
  { id: "fine-arts",           label: "fine arts" },
  { id: "clothing-production", label: "clothing production" },
  { id: "movies-video",        label: "movies & video" },
  { id: "consulting",          label: "consulting" },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video":        "movies & video",
  "fine-arts":           "fine arts",
  "consulting":          "consulting",
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isDesktop;
}

function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); }
    else { ref.current.pause(); setPlaying(false); }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", cursor: "pointer" }} onClick={toggle}>
      <video ref={ref} src={src} playsInline loop style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {!playing && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid #000", marginLeft: 3 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useFadeIn(0.1, delay);
  return <div ref={ref} style={style}>{children}</div>;
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function GalleryView({ items, onClose }: { items: WorkItem[]; onClose: () => void }) {
  const isDesktop                    = useIsDesktop();
  const [idx, setIdx]                = useState(0);
  const [animDir, setAnimDir]        = useState<"left" | "right" | null>(null);
  const [touchX, setTouchX]          = useState<number | null>(null);
  const router                       = useRouter();
  const item                         = items[idx];

  const go = useCallback((dir: "left" | "right") => {
    setAnimDir(dir);
    setTimeout(() => {
      setIdx(i => dir === "right" ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0));
      setAnimDir(null);
    }, 180);
  }, [items.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go("right");
      if (e.key === "ArrowLeft")  go("left");
      if (e.key === "Escape")     onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  function onTouchStart(e: React.TouchEvent) { setTouchX(e.touches[0].clientX); }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? "right" : "left");
    setTouchX(null);
  }

  if (!item) return null;
  const opacity   = animDir ? 0 : 1;
  const transform = animDir === "right" ? "translateX(-24px)" : animDir === "left" ? "translateX(24px)" : "translateX(0)";

  const mediaSrc = item.images?.[0] ?? item.image ?? "";

  const navButtons = (size: number, pad: number) => (
    <div style={{ display: "flex", gap: size === 22 ? 24 : 20, paddingLeft: 24, flexShrink: 0 }}>
      <button onClick={() => go("left")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: size, color: idx === 0 ? "#e0e0e0" : "#999", fontFamily: FONT_MONO, padding: pad }}>‹</button>
      <button onClick={() => go("right")} disabled={idx === items.length - 1} style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer", fontSize: size, color: idx === items.length - 1 ? "#e0e0e0" : "#999", fontFamily: FONT_MONO, padding: pad }}>›</button>
    </div>
  );

  const infoBlock = (titleSize: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", marginBottom: titleSize === "sm" ? 6 : 10, fontFamily: FONT_MONO }}>
        {CATEGORY_LABELS[item.category]}{item.year ? ` — ${item.year}` : ""}
      </p>
      <p style={{ fontFamily: FONT_DISPLAY, fontSize: titleSize === "sm" ? 16 : "clamp(18px, 2.2vw, 26px)", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.1, marginBottom: item.role ? 6 : 0 }}>
        {item.title}
      </p>
      {item.role && <p style={{ fontSize: 10, letterSpacing: "0.05em", color: "#aaa", fontFamily: FONT_MONO, marginTop: 4 }}>{item.role}</p>}
      <button
        onClick={() => router.push(`/work/${makeSlug(item)}`)}
        style={{ marginTop: 12, background: "none", border: "none", padding: 0, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", cursor: "pointer", fontFamily: FONT_MONO, textDecoration: "underline", textUnderlineOffset: "3px", transition: "transform 0.15s cubic-bezier(0,0,0.3,1)", display: "inline-block" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
      >
        view piece →
      </button>
    </div>
  );

  // ── Desktop: full-viewport white frame ────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, display: "flex", flexDirection: "column" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", flexShrink: 0 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc", fontFamily: FONT_MONO }}>{idx + 1} / {items.length}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO }}>list</button>
        </div>

        <div style={{
          flex: 1, minHeight: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 clamp(80px, 10vw, 200px)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          opacity, transform,
        }}>
          {mediaSrc && !item.video ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc} alt={item.title} style={{ maxWidth: "100%", maxHeight: "calc(100vh - 180px)", objectFit: "contain", display: "block" }} />
          ) : item.video ? (
            <div style={{ width: "100%", maxHeight: "calc(100vh - 180px)", display: "flex" }}>
              <VideoPlayer src={item.video} />
            </div>
          ) : (
            <div style={{ width: "50%", aspectRatio: "4/3", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "#ccc", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT_MONO }}>no image</span>
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: "20px 32px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", transition: "opacity 0.18s ease", opacity }}>
          {infoBlock("lg")}
          {navButtons(22, 8)}
        </div>
      </div>
    );
  }

  // ── Mobile: keep the 8.5/11 swipe card ───────────────────────────────────
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, display: "flex", flexDirection: "column" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", flexShrink: 0 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc", fontFamily: FONT_MONO }}>{idx + 1} / {items.length}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO }}>list</button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(24px, 8vw, 56px)", minHeight: 0, transition: "opacity 0.18s ease, transform 0.18s ease", opacity, transform }}>
        {(item.image || item.video || item.images?.length) ? (
          <div style={{ width: "100%", maxHeight: "62vh", aspectRatio: "8.5 / 11", background: "#f5f5f5", overflow: "hidden", flexShrink: 0 }}>
            {item.video ? <VideoPlayer src={item.video} /> :
             item.images?.[0] ? <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> :
             item.image    ? <img src={item.image}    alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
          </div>
        ) : (
          <div style={{ width: "100%", maxHeight: "62vh", aspectRatio: "8.5 / 11", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "0.12em", color: "#ccc", textTransform: "uppercase", fontFamily: FONT_MONO }}>no image</span>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: "16px 24px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", transition: "opacity 0.18s ease", opacity }}>
        {infoBlock("sm")}
        {navButtons(18, 0)}
      </div>
    </div>
  );
}

// ── Work row (flat group-show) ────────────────────────────────────────────────
function WorkRow({ item, index }: { item: WorkItem; index: number }) {
  const router = useRouter();
  const ref    = useFadeIn(0.1, index * 30);

  return (
    <div ref={ref}>
      <div
        onClick={() => router.push(`/work/${makeSlug(item)}`)}
        className="work-row-hover"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid #f0f0f0" }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.6, wordBreak: "break-word", margin: 0 }}>
            {item.title}
          </p>
          {item.role && (
            <p style={{ fontSize: 10, letterSpacing: "0.05em", color: "#aaa", lineHeight: 1.5, marginTop: 2, marginBottom: 0 }}>{item.role}</p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 2 }}>
          {item.sold && <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ddd" }}>sold</span>}
          <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ccc" }}>{CATEGORY_LABELS[item.category]}</span>
          {item.year && <span style={{ fontSize: 10, color: "#ccc" }}>{item.year}</span>}
          <span style={{ fontSize: 10, color: "#ccc" }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const [items, setItems]       = useState<WorkItem[]>([]);
  const [category, setCategory] = useState<CatId>("all");
  const [mode, setMode]         = useState<"gallery" | "list">("gallery");
  const [copied, setCopied]     = useState(false);

  const headerRef = useFadeIn(0.1, 0);
  const navRef    = useFadeIn(0.1, 80);

  useEffect(() => {
    fetch("/api/work").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  const visible = items.filter(i => i.visible && i.listed !== false && (category === "all" || i.category === category));

  // Sort by group-show priority (fine-arts first) when viewing all
  const sorted = category === "all"
    ? [...visible].sort((a, b) => (CAT_PRIORITY[a.category] ?? 99) - (CAT_PRIORITY[b.category] ?? 99))
    : visible;

  async function copyLink() {
    await navigator.clipboard.writeText("https://waituntilmay.com/work");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      {mode === "gallery" && sorted.length > 0
        ? <GalleryView items={sorted} onClose={() => setMode("list")} />
        : (
          <main style={{ fontFamily: FONT_MONO }} className="min-h-screen bg-white text-black flex flex-col items-center px-5 py-14">
            <div style={{ width: "100%", maxWidth: 620, margin: "0 auto", padding: "0 20px" }}>

              <div ref={headerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", marginBottom: 28 }}>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: "normal" }}>waituntilmay</h1>
                <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>selected work</p>
                <div style={{ width: "100%", borderTop: "1px solid #e8e8e8" }} />
              </div>

              <div ref={navRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <button onClick={() => setMode("gallery")} style={{ background: "none", border: "1px solid #e0e0e0", padding: "8px 20px", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", color: "#555", fontFamily: FONT_MONO }}>
                  view all →
                </button>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FONT_MONO, color: category === cat.id ? "#000" : "#bbb", textDecoration: category === cat.id ? "underline" : "none", textUnderlineOffset: "3px" }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flat group-show list — no section dividers */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sorted.map((item, i) => (
                  <WorkRow key={item.id} item={item} index={i} />
                ))}
              </div>

              <div style={{ borderTop: "1px solid #e8e8e8", margin: "36px 0 20px" }} />

              <FadeIn>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>← back</a>
                  <button onClick={copyLink} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO }}>
                    {copied ? "copied ✓" : "copy link"}
                  </button>
                </div>
              </FadeIn>

            </div>
          </main>
        )
      }
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}
