"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { WorkItem } from "@/app/api/work/route";

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "fine-arts": "fine arts",
  "consulting": "consulting",
};

function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  function toggle() {
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

export default function PiecePage({ item }: { item: WorkItem }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSending(true);
    try {
      await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: `[re: ${item.title}]\n\n${message}`,
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      style={{ fontFamily: "'Courier New', Courier, monospace", minHeight: "100vh", background: "#fff", color: "#000" }}
    >
      {/* Nav */}
      <div style={{ padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/work" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
          ← work
        </Link>
        <Link href="/" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
          waituntilmay
        </Link>
      </div>

      {/* Media */}
      {(item.image || item.video) && (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 24px 40px" }}>
          <div style={{
            width: "min(480px, 90vw)",
            aspectRatio: "8.5 / 11",
            background: "#f7f7f7",
            overflow: "hidden",
            position: "relative",
          }}>
            {item.video ? (
              <VideoPlayer src={item.video} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 32px 80px" }}>

        {/* Category + year */}
        <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb", marginBottom: 12 }}>
          {CATEGORY_LABELS[item.category] ?? item.category}
          {item.year ? ` — ${item.year}` : ""}
        </p>

        {/* Title */}
        <h1 style={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: "normal", lineHeight: 1.6, marginBottom: 8 }}>
          {item.title}
        </h1>

        {/* Role */}
        {item.role && (
          <p style={{ fontSize: 10, letterSpacing: "0.08em", color: "#aaa", marginBottom: 32 }}>
            {item.role}
          </p>
        )}

        {/* Bio / statement */}
        {item.bio && (
          <>
            <div style={{ borderTop: "1px solid #efefef", marginBottom: 28 }} />
            <p style={{ fontSize: 12, letterSpacing: "0.04em", lineHeight: 2, color: "#333", fontStyle: "italic", whiteSpace: "pre-wrap", marginBottom: 40 }}>
              {item.bio}
            </p>
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: "1px solid #efefef", marginBottom: 28 }} />

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
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="name"
                required
                style={inputStyle}
              />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email"
                type="email"
                required
                style={inputStyle}
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="message"
                required
                rows={4}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.8 }}
              />
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: "none",
                  border: "1px solid #000",
                  padding: "12px 0",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: "#000",
                  transition: "all 0.2s",
                }}
              >
                {sending ? "sending..." : "send"}
              </button>
            </form>
          </>
        )}

        {/* Footer url */}
        <p style={{ fontSize: 9, letterSpacing: "0.12em", color: "#ddd", marginTop: 48 }}>
          waituntilmay.com/work
        </p>
      </div>
    </main>
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
