"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { WorkItem } from "@/app/api/work/route";
import { useFadeIn } from "@/lib/useFadeIn";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

// ── Scroll dots ───────────────────────────────────────────────────────────────
function ScrollDots({ total, active }: { total: number; active: number }) {
  if (total <= 1) return null;
  return (
    <div style={{
      position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, zIndex: 50,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 3, height: 3, borderRadius: "50%",
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
      height: "100svh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "0 clamp(32px, 8vw, 120px)",
      scrollSnapAlign: "start",
      opacity: 0,
      transition: "opacity 0.7s ease",
    }} ref={ref}>
      <h1 style={{
        fontSize: "clamp(52px, 9vw, 108px)",
        fontFamily: FONT_DISPLAY,
        fontWeight: "normal",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        lineHeight: 1,
        margin: 0,
      }}>
        {item.title}
      </h1>
      {item.year && (
        <p style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "#bbb",
          marginTop: 28,
          fontFamily: FONT_MONO,
          textTransform: "uppercase",
        }}>
          {item.year}
        </p>
      )}
      <p style={{
        position: "absolute",
        bottom: "clamp(28px, 4vh, 48px)",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 9,
        letterSpacing: "0.16em",
        color: "#ccc",
        textTransform: "uppercase",
        fontFamily: FONT_MONO,
        whiteSpace: "nowrap",
      }}>
        scroll ↓
      </p>
    </section>
  );
}

// ── Image section ─────────────────────────────────────────────────────────────
function ImageSection({ src, index }: { src: string; index: number }) {
  return (
    <section style={{
      height: "100svh",
      scrollSnapAlign: "start",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: "clamp(64px, 10vh, 100px)",
      paddingBottom: "clamp(32px, 6vh, 64px)",
      paddingLeft: "clamp(24px, 6vw, 80px)",
      paddingRight: "clamp(24px, 6vw, 80px)",
      boxSizing: "border-box",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`image ${index + 1}`}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </section>
  );
}

// ── Video section ─────────────────────────────────────────────────────────────
function VideoSection({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); }
    else { ref.current.pause(); setPlaying(false); }
  }

  return (
    <section style={{
      height: "100svh", scrollSnapAlign: "start",
      display: "flex", alignItems: "center", justifyContent: "center",
      paddingTop: "clamp(64px, 10vh, 100px)",
      paddingBottom: "clamp(32px, 6vh, 64px)",
      paddingLeft: "clamp(24px, 6vw, 80px)",
      paddingRight: "clamp(24px, 6vw, 80px)",
      boxSizing: "border-box",
      cursor: "pointer", background: "#000",
    }} onClick={toggle}>
      <video
        ref={ref} src={src} playsInline loop
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      />
      {!playing && (
        <div style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
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
      minHeight: "100svh",
      scrollSnapAlign: "start",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "80px clamp(32px, 8vw, 120px)",
      fontFamily: FONT_MONO,
    }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        {item.context && (
          <p style={{
            fontSize: 12,
            letterSpacing: "0.04em",
            lineHeight: 2.2,
            color: "#333",
            fontStyle: "italic",
            whiteSpace: "pre-wrap",
            marginBottom: 40,
            textAlign: "left",
          }}>
            {item.context}
          </p>
        )}

        {item.bio && (
          <p style={{
            fontSize: 12,
            letterSpacing: "0.04em",
            lineHeight: 2.2,
            color: "#333",
            fontStyle: "italic",
            whiteSpace: "pre-wrap",
            marginBottom: 40,
          }}>
            {item.bio}
          </p>
        )}

        <div style={{ borderTop: "1px solid #efefef", marginBottom: 28 }} />

        {item.sold && (
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ccc", marginBottom: 20 }}>
            sold
          </p>
        )}

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
                cursor: "pointer", color: "#000", fontFamily: FONT_MONO,
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

  const allImages = item.images?.length ? item.images : item.image ? [item.image] : [];
  const hasVideo  = !!item.video;
  const totalSections = 1 + allImages.length + (hasVideo ? 1 : 0) + 1;

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px clamp(24px, 4vw, 48px)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, transparent 100%)",
      }}>
        <Link href="/work" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO }}>
          ← work
        </Link>
        <Link href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", fontFamily: FONT_MONO }}>
          waituntilmay
        </Link>
      </div>

      <ScrollDots total={totalSections} active={activeSection} />

      <div
        ref={containerRef}
        style={{
          height: "100svh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
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
  fontFamily: FONT_MONO,
};
