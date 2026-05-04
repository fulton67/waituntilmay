"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { WorkItem } from "@/app/api/work/route";
import { useFadeIn } from "@/lib/useFadeIn";

function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb", fontFamily: "'Courier New', Courier, monospace" }}
      >
        {label} {open ? "−" : "+"}
      </button>
      {open && <div style={{ marginTop: 20 }}>{children}</div>}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video":        "movies & video",
  "fine-arts":           "fine arts",
  "consulting":          "consulting",
};

// ── Scroll dots ───────────────────────────────────────────────────────────────
function ScrollDots({ total, active }: { total: number; active: number }) {
  if (total <= 1) return null;
  return (
    <div style={{
      position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 8, zIndex: 50,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: "50%",
          background: i === active ? "#000" : "#ccc",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ── Title section ─────────────────────────────────────────────────────────────
function TitleSection({ item }: { item: WorkItem }) {
  const ref = useFadeIn();
  return (
    <section style={{
      height: "100svh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", padding: "80px 40px",
      scrollSnapAlign: "start", opacity: 0, transition: "opacity 0.7s ease",
    }} ref={ref}>
      <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#bbb", marginBottom: 28 }}>
        {CATEGORY_LABELS[item.category] ?? item.category}
        {item.year ? ` — ${item.year}` : ""}
      </p>
      <h1 style={{
        fontSize: "clamp(28px, 6vw, 64px)", letterSpacing: "0.12em",
        textTransform: "uppercase", fontWeight: "normal", textAlign: "center",
        lineHeight: 1.2,
      }}>
        {item.title}
      </h1>
      {item.role && (
        <p style={{ fontSize: 10, letterSpacing: "0.1em", color: "#aaa", marginTop: 16 }}>
          {item.role}
        </p>
      )}
      <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "#ddd", marginTop: 48, textTransform: "uppercase" }}>
        scroll ↓
      </p>
    </section>
  );
}

// ── Image section ─────────────────────────────────────────────────────────────
function ImageSection({ src, index }: { src: string; index: number }) {
  const ref = useFadeIn();
  return (
    <section style={{
      height: "100svh", scrollSnapAlign: "start",
      opacity: 0, transition: "opacity 0.7s ease",
      position: "relative", overflow: "hidden",
    }} ref={ref}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`image ${index + 1}`}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#fafafa" }}
      />
    </section>
  );
}

// ── Video section ─────────────────────────────────────────────────────────────
function VideoSection({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const fadeRef = useFadeIn();
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); }
    else { ref.current.pause(); setPlaying(false); }
  }

  return (
    <section style={{
      height: "100svh", scrollSnapAlign: "start",
      opacity: 0, transition: "opacity 0.7s ease",
      position: "relative", overflow: "hidden", cursor: "pointer",
      background: "#000",
    }} ref={fadeRef} onClick={toggle}>
      <video
        ref={ref} src={src} playsInline loop
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      />
      {!playing && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "14px solid #000", marginLeft: 4 }} />
          </div>
        </div>
      )}
    </section>
  );
}

// ── Context + Inquiry section ─────────────────────────────────────────────────
function ContextSection({ item }: { item: WorkItem }) {
  const fadeRef = useFadeIn();
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: `[re: ${item.title}]\n\n${message}` }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{
      minHeight: "100svh", scrollSnapAlign: "start",
      opacity: 0, transition: "opacity 0.7s ease",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "80px 40px",
    }} ref={fadeRef}>
      <div style={{ maxWidth: 480, width: "100%", margin: "0 auto" }}>

        {/* Context disclosure */}
        {item.context && (
          <div style={{ marginBottom: 40 }}>
            <Expandable label="context">
              <p style={{ fontSize: 12, letterSpacing: "0.04em", lineHeight: 2, color: "#333", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                {item.context}
              </p>
            </Expandable>
          </div>
        )}

        {item.bio && (
          <div style={{ marginBottom: 40 }}>
            <Expandable label="statement">
              <p style={{ fontSize: 12, letterSpacing: "0.04em", lineHeight: 2, color: "#333", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                {item.bio}
              </p>
            </Expandable>
          </div>
        )}

        <div style={{ borderTop: "1px solid #efefef", marginBottom: 28 }} />

        {/* Sold */}
        {item.sold && (
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ccc", marginBottom: 20 }}>
            sold
          </p>
        )}

        {/* Inquiry */}
        {sent ? (
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa" }}>
            received — i will be in touch.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", marginBottom: 20 }}>
              inquire
            </p>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="name" required style={inputStyle} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" type="email" required style={inputStyle} />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="message" required rows={4} style={{ ...inputStyle, resize: "none", lineHeight: 1.8 }} />
              <button type="submit" disabled={sending} style={{
                background: "none", border: "1px solid #000", padding: "12px 0",
                fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
                cursor: "pointer", color: "#000", fontFamily: "'Courier New', Courier, monospace",
              }}>
                {sending ? "sending..." : "send"}
              </button>
            </form>
          </>
        )}

        <div style={{ borderTop: "1px solid #efefef", margin: "40px 0 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/work" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>← work</Link>
          <Link href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>waituntilmay</Link>
        </div>

      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PiecePage({ item }: { item: WorkItem }) {
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the list of sections for dot counting
  const allImages = item.images?.length ? item.images : item.image ? [item.image] : [];
  const hasVideo  = !!item.video;
  // title + images + (video if present) + context/inquiry
  const totalSections = 1 + allImages.length + (hasVideo ? 1 : 0) + 1;

  // Track active section via scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function onScroll() {
      const h = window.innerHeight;
      const idx = Math.round(container!.scrollTop / h);
      setActiveSection(idx);
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Fixed nav */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 28px",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, transparent 100%)",
      }}>
        <Link href="/work" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: "'Courier New', Courier, monospace" }}>
          ← work
        </Link>
        <Link href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: "'Courier New', Courier, monospace" }}>
          waituntilmay
        </Link>
      </div>

      <ScrollDots total={totalSections} active={activeSection} />

      {/* Scroll container */}
      <div
        ref={containerRef}
        style={{
          height: "100svh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          fontFamily: "'Courier New', Courier, monospace",
          background: "#fff",
          color: "#000",
        }}
      >
        <TitleSection item={item} />

        {allImages.map((src, i) => (
          <ImageSection key={src} src={src} index={i} />
        ))}

        {hasVideo && <VideoSection src={item.video!} />}

        <ContextSection item={item} />
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  borderBottom: "1px solid #e0e0e0",
  padding: "8px 0",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "#000",
  outline: "none",
  width: "100%",
  fontFamily: "'Courier New', Courier, monospace",
};
