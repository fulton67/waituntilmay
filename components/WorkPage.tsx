"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { WorkItem } from "@/app/api/work/route";
import { makeSlug } from "@/app/api/work/route";
import { useFadeIn } from "@/lib/useFadeIn";

const CATEGORIES = [
  { id: "all",                 label: "all" },
  { id: "clothing-production", label: "clothing production" },
  { id: "movies-video",        label: "movies & video" },
  { id: "fine-arts",           label: "fine arts" },
  { id: "consulting",          label: "consulting" },
] as const;

const SECTION_ORDER = ["clothing-production", "movies-video", "fine-arts", "consulting"] as const;
type CatId = (typeof CATEGORIES)[number]["id"];

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "fine-arts": "fine arts",
  "consulting": "consulting",
};

function VideoPlayer({ src, style }: { src: string; style?: React.CSSProperties }) {
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
      <video ref={ref} src={src} playsInline loop style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
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

// ── Fade wrapper ──────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useFadeIn(0.1, delay);
  return <div ref={ref} style={style}>{children}</div>;
}

// ── Gallery swipe mode ────────────────────────────────────────────────────────
function GalleryView({ items, onClose }: { items: WorkItem[]; onClose: () => void }) {
  const [idx, setIdx]         = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const router                = useRouter();
  const item                  = items[idx];

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

  const [touchX, setTouchX] = useState<number | null>(null);
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 100, display: "flex", flexDirection: "column" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", flexShrink: 0 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc" }}>{idx + 1} / {items.length}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", fontFamily: "'Courier New', Courier, monospace" }}>list</button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 60px", minHeight: 0, transition: "opacity 0.18s ease, transform 0.18s ease", opacity, transform }}>
        {(item.image || item.video || item.images?.length) ? (
          <div style={{ height: "min(68vh, 480px)", aspectRatio: "8.5 / 11", background: "#f5f5f5", overflow: "hidden", flexShrink: 0 }}>
            {item.video ? <VideoPlayer src={item.video} /> :
             item.images?.[0] ? <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> :
             item.image ? <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
          </div>
        ) : (
          <div style={{ height: "min(68vh, 480px)", aspectRatio: "8.5 / 11", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "0.12em", color: "#ccc", textTransform: "uppercase" }}>no image</span>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, padding: "20px 28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", transition: "opacity 0.18s ease", opacity }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", marginBottom: 6 }}>
            {CATEGORY_LABELS[item.category]}{item.year ? ` — ${item.year}` : ""}
          </p>
          <p style={{ fontSize: 12, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: item.role ? 4 : 0, lineHeight: 1.5 }}>{item.title}</p>
          {item.role && <p style={{ fontSize: 10, letterSpacing: "0.05em", color: "#aaa" }}>{item.role}</p>}
          <button onClick={() => router.push(`/work/${makeSlug(item)}`)} style={{ marginTop: 12, background: "none", border: "none", padding: 0, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", cursor: "pointer", fontFamily: "'Courier New', Courier, monospace", textDecoration: "underline", textUnderlineOffset: 4 }}>
            view piece →
          </button>
        </div>
        <div style={{ display: "flex", gap: 20, paddingLeft: 24, flexShrink: 0 }}>
          <button onClick={() => go("left")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 18, color: idx === 0 ? "#e0e0e0" : "#999", fontFamily: "'Courier New', Courier, monospace", padding: 0 }}>‹</button>
          <button onClick={() => go("right")} disabled={idx === items.length - 1} style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer", fontSize: 18, color: idx === items.length - 1 ? "#e0e0e0" : "#999", fontFamily: "'Courier New', Courier, monospace", padding: 0 }}>›</button>
        </div>
      </div>
    </div>
  );
}

// ── List row with fade-in ─────────────────────────────────────────────────────
function WorkRow({ item, index }: { item: WorkItem; index: number }) {
  const router   = useRouter();
  const ref      = useFadeIn(0.1, index * 40);
  const [open, setOpen] = useState(false);
  const hasMedia = !!(item.image || item.video || item.images?.length);
  const thumb    = item.images?.[0] ?? item.image;

  return (
    <div ref={ref}>
      <div
        onClick={() => router.push(`/work/${makeSlug(item)}`)}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.6, wordBreak: "break-word", margin: 0 }}>
            {item.title}
          </p>
          {item.role && (
            <p style={{ fontSize: 10, letterSpacing: "0.05em", color: "#aaa", lineHeight: 1.5, marginTop: 2, marginBottom: 0 }}>{item.role}</p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 2 }}>
          {item.sold && <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ddd" }}>sold</span>}
          {item.year && <span style={{ fontSize: 10, color: "#ccc" }}>{item.year}</span>}
          <span style={{ fontSize: 10, color: "#ccc" }}>→</span>
        </div>
      </div>
    </div>
  );
}

function PrefaceItem({ item }: { item: WorkItem }) {
  const router = useRouter();
  const ref    = useFadeIn(0.1, 0);
  return (
    <div ref={ref} style={{ paddingBottom: 20, marginBottom: 8, borderBottom: "1px solid #efefef" }}>
      <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c0c0c0", marginBottom: 10 }}>preface</p>
      <div onClick={() => router.push(`/work/${makeSlug(item)}`)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <p style={{ fontSize: 12, letterSpacing: "0.06em", lineHeight: 1.9, fontStyle: "italic", color: "#444", wordBreak: "break-word" }}>{item.title}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
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

  const headerRef  = useFadeIn(0.1, 0);
  const navRef     = useFadeIn(0.1, 80);

  useEffect(() => {
    fetch("/api/work").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  const visible = items.filter(i => i.visible && (i.listed !== false) && (category === "all" || i.category === category));

  const grouped = SECTION_ORDER.reduce<Record<string, WorkItem[]>>(
    (acc, id) => { acc[id] = visible.filter(i => i.category === id); return acc; },
    {}
  );

  async function copyLink() {
    await navigator.clipboard.writeText("https://waituntilmay.com/work");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (mode === "gallery" && visible.length > 0) {
    return <GalleryView items={visible} onClose={() => setMode("list")} />;
  }

  return (
    <>
    <main style={{ fontFamily: "'Courier New', Courier, monospace" }} className="min-h-screen bg-white text-black flex flex-col items-center px-5 py-14">
      <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: "0 20px" }}>

        <div ref={headerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: "normal" }}>naim johnson</h1>
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>selected work</p>
          <div style={{ width: "100%", borderTop: "1px solid #e8e8e8" }} />
        </div>

        <div ref={navRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button onClick={() => setMode("gallery")} style={{ background: "none", border: "1px solid #e0e0e0", padding: "8px 20px", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", color: "#555", fontFamily: "'Courier New', Courier, monospace" }}>
            view all →
          </button>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Courier New', Courier, monospace", color: category === cat.id ? "#000" : "#bbb", textDecoration: category === cat.id ? "underline" : "none", textUnderlineOffset: 4 }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {category === "all" ? (
            SECTION_ORDER.map(id => {
              const catItems = grouped[id];
              if (!catItems || catItems.length === 0) return null;
              const preface = catItems.find(i => i.preface);
              const rest    = catItems.filter(i => !i.preface);
              return (
                <FadeIn key={id}>
                  <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ccc", marginBottom: 10 }}>
                    {CATEGORY_LABELS[id]}
                  </p>
                  {preface && <PrefaceItem item={preface} />}
                  {rest.map((item, i) => <WorkRow key={item.id} item={item} index={i} />)}
                </FadeIn>
              );
            })
          ) : (
            (() => {
              const preface = visible.find(i => i.preface);
              const rest    = visible.filter(i => !i.preface);
              return (
                <>
                  {preface && <PrefaceItem item={preface} />}
                  {rest.map((item, i) => <WorkRow key={item.id} item={item} index={i} />)}
                </>
              );
            })()
          )}
        </div>

        <div style={{ borderTop: "1px solid #e8e8e8", margin: "36px 0 20px" }} />

        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>← back</a>
            <button onClick={copyLink} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: "'Courier New', Courier, monospace" }}>
              {copied ? "copied ✓" : "copy link"}
            </button>
          </div>
        </FadeIn>

      </div>
    </main>

    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}
