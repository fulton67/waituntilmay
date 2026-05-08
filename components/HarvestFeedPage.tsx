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

// Layout thresholds — as the organism grows, the grid opens up
function getLayout(count: number): "book" | "two" | "three" {
  if (count < 8)  return "book";
  if (count < 24) return "two";
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

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  submissions, startIdx, onClose,
}: {
  submissions: HarvestSubmission[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx]       = useState(startIdx);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const touchY              = useRef<number | null>(null);
  const sub                 = submissions[idx];
  const img                 = sub?.images[0];

  const go = useCallback((dir: "up" | "down") => {
    const next = dir === "down"
      ? Math.min(idx + 1, submissions.length - 1)
      : Math.max(idx - 1, 0);
    if (next === idx) return;
    setAnimDir(dir);
    setTimeout(() => {
      setIdx(next);
      setAnimDir(null);
    }, 200);
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
      {/* Header — fades with image */}
      <div style={{
        flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px clamp(20px,4vw,48px)", fontFamily: FONT_MONO,
        opacity, transition: "opacity 0.2s ease",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>{sub.name}</p>
          <p style={{ fontSize: 8, letterSpacing: "0.1em", color: "#bbb" }}>{padNum(idx + 1)} / {padNum(submissions.length)}</p>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button
            onClick={() => img && downloadImg(img, sub.name)}
            style={{ background: "none", border: "1px solid #e0e0e0", padding: "6px 16px", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#555" }}
          >
            download ↓
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", color: "#bbb" }}>
            close
          </button>
        </div>
      </div>

      {/* Image — slides + fades on navigate */}
      <div style={{
        flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 clamp(24px,6vw,80px) clamp(32px,5vh,56px)",
        opacity, transform: translate,
        transition: "opacity 0.2s ease, transform 0.2s cubic-bezier(0,0,0.3,1)",
      }}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={sub.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
        )}
      </div>

      {/* Nav */}
      <div style={{
        flexShrink: 0, display: "flex", justifyContent: "center", gap: 32,
        padding: "12px 0 28px", fontFamily: FONT_MONO,
      }}>
        <button onClick={() => go("up")} disabled={idx === 0}
          style={{ background: "none", border: "none", fontSize: 18, color: idx === 0 ? "#e0e0e0" : "#999", cursor: idx === 0 ? "default" : "pointer", transition: "color 0.2s" }}>↑</button>
        <button onClick={() => go("down")} disabled={idx === submissions.length - 1}
          style={{ background: "none", border: "none", fontSize: 18, color: idx === submissions.length - 1 ? "#e0e0e0" : "#999", cursor: idx === submissions.length - 1 ? "default" : "pointer", transition: "color 0.2s" }}>↓</button>
      </div>
    </div>
  );
}

// ── Scroll dots ───────────────────────────────────────────────────────────────

function ScrollDots({ total, active }: { total: number; active: number }) {
  if (total <= 1) return null;
  return (
    <div style={{
      position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10, zIndex: 150,
      pointerEvents: "none",
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

// ── Scroll progress bar ───────────────────────────────────────────────────────

function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function update() {
      const doc   = document.documentElement;
      const pct   = doc.scrollTop / (doc.scrollHeight - doc.clientHeight);
      if (barRef.current) barRef.current.style.transform = `scaleX(${isNaN(pct) ? 0 : pct})`;
    }
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 1,
      background: "#e8e8e8", zIndex: 200, overflow: "hidden",
    }}>
      <div ref={barRef} style={{
        position: "absolute", inset: 0, background: "#000",
        transformOrigin: "left center", transform: "scaleX(0)",
        transition: "transform 0.1s linear",
      }} />
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
      <div style={{ borderTop: "1px solid #efefef" }} />
      <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", lineHeight: 2.2, color: "#111", fontStyle: "italic" }}>
        {"this is a collective archive — food without faces, names without context.\n\nsubmit a photograph of what you have eaten. your name will accompany it."}
      </p>
      <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", lineHeight: 2, color: "#555", textTransform: "uppercase" }}>
        contributions will be considered for a limited edition book publishing june 2026. not all submissions will be included in the printed edition — all will remain here.
      </p>
      <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", color: "#888" }}>
        — waituntilmay
      </p>
    </>
  );
}

function IntroSection({ theme, onSubmit, hasSubmissions }: { theme: string; onSubmit: () => void; hasSubmissions: boolean }) {
  return (
    <section style={{
      height: "100svh",
      scrollSnapAlign: "start",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "clamp(64px,10vh,100px) clamp(32px,8vw,120px)",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
        <IntroText theme={theme} />
        {hasSubmissions && (
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", color: "#ccc", textTransform: "uppercase" }}>
            scroll to see contributions ↓
          </p>
        )}
      </div>
    </section>
  );
}

// ── Card component — staggered IntersectionObserver reveal ────────────────────

function HarvestCard({
  submission, index, layout, onClick,
}: {
  submission: HarvestSubmission;
  index: number;
  layout: "book" | "two" | "three";
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    const delay = (index % (layout === "book" ? 1 : layout === "two" ? 2 : 3)) * 80;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, layout]);

  const img = submission.images[0];

  if (layout === "book") {
    return (
      <section style={{
        height: "100svh",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(56px,9vh,96px) clamp(32px,8vw,120px) clamp(40px,6vh,72px)",
        boxSizing: "border-box",
      }}>
        <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
          <div
            onClick={onClick}
            style={{
              width: "min(72vw, 440px)",
              aspectRatio: "8.5 / 11",
              background: "#f5f5f5",
              overflow: "hidden",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={submission.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "min(72vw, 440px)" }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
              {submission.name}
            </p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", color: "#ccc" }}>
              {padNum(index + 1)}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        onClick={onClick}
        style={{
          width: "100%",
          aspectRatio: "8.5 / 11",
          background: "#f5f5f5",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={submission.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
            onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = "scale(1)"; }}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4 }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#000" }}>
          {submission.name}
        </p>
        <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ccc" }}>
          {padNum(index + 1)}
        </p>
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

function SubmitForm({
  theme,
  onSubmitted,
  onClose,
}: {
  theme: string;
  onSubmitted: (s: HarvestSubmission) => void;
  onClose: () => void;
}) {
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

      // Upload one at a time — more reliable on mobile than parallel
      for (let i = 0; i < files.length; i++) {
        setProgress(`uploading ${i + 1} of ${files.length}…`);
        const compressed = await compressImage(files[i]);
        const fd = new FormData();
        fd.append("file", compressed, "photo.jpg");
        const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        fd.append("path", `harvest/${theme}/images/${safe}`);
        const r = await fetch("/api/harvest/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok || !j.url) throw new Error(j.error || `photo ${i + 1} failed to upload`);
        urls.push(j.url as string);
      }

      setProgress("saving…");
      const res  = await fetch("/api/harvest/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, name: name.trim(), images: urls }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
        onSubmitted(data.submission);
      } else {
        setStatus("error");
        setErrMsg(data.error || "server rejected submission");
      }
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (status === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "48px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,5vw,52px)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          thank you, {name}.
        </p>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#aaa" }}>
          your contribution is live.
        </p>
        <button onClick={onClose} style={ghostBtn}>close</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20, padding: "clamp(24px,5vw,48px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb" }}>
          add to the harvest
        </p>
        <button type="button" onClick={onClose} style={{ ...ghostBtn, border: "none", padding: 0, color: "#bbb" }}>✕</button>
      </div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="your name"
        required
        style={inputStyle}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pickFiles(e.dataTransfer.files); }}
        style={{
          border: `1px dashed ${drag ? "#000" : "#ddd"}`,
          padding: "clamp(24px,5vh,40px) 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          transition: "border-color 0.2s",
          background: drag ? "#fafafa" : "transparent",
        }}
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
            <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
              tap to upload
            </p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#ddd" }}>
              up to 6 photos — no faces
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => pickFiles(e.target.files)}
        />
      </div>

      {status === "error" && (
        <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#aaa", letterSpacing: "0.1em" }}>
          {errMsg || "something went wrong"} — try again
        </p>
      )}

      <button type="submit" disabled={status === "uploading"} style={{
        background: "#000", color: "#fff", border: "none",
        padding: "12px 0", fontFamily: FONT_MONO,
        fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        cursor: status === "uploading" ? "wait" : "pointer",
        opacity: status === "uploading" ? 0.5 : 1,
      }}>
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
  const [activeSection, setActiveSection] = useState(0);
  const bookRef = useRef<HTMLDivElement>(null);

  const apiTheme = storageTheme ?? theme;
  const layout = getLayout(submissions.length);

  const handleSubmitted = useCallback((s: HarvestSubmission) => {
    setSubmissions(prev => [...prev, s]);
  }, []);

  const closeForm = useCallback(() => setShowForm(false), []);

  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    function onScroll() {
      setActiveSection(Math.round(el!.scrollTop / window.innerHeight));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [layout]);

  const gridCols: React.CSSProperties =
    layout === "book" ? {} :
    layout === "two"  ? { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(16px,3vw,40px)" } :
                        { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(12px,2vw,28px)" };

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox submissions={submissions} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {layout === "book" && (
        <ScrollDots total={1 + submissions.length} active={activeSection} />
      )}

      <ScrollProgress />

      {/* Fixed header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px clamp(20px,4vw,48px)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, transparent 100%)",
        fontFamily: FONT_MONO,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#000" }}>
            {fmtTheme(theme)}
          </p>
          <p style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb" }}>
            image harvest — {String(submissions.length).padStart(5, "0")} contributions
          </p>
        </div>
        <Link href="/" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
          waituntilmay
        </Link>
      </div>

      {/* Submit drawer */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(255,255,255,0.97)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <SubmitForm theme={apiTheme} onSubmitted={handleSubmitted} onClose={closeForm} />
          </div>
        </div>
      )}

      {/* Fixed submit button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            position: "fixed", bottom: 28, left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "#fff",
            border: "1px solid #000",
            padding: "10px 28px",
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            whiteSpace: "nowrap",
          }}
        >
          add yours →
        </button>
      )}

      {/* Feed */}
      {layout === "book" ? (
        <div ref={bookRef} style={{
          height: "100svh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
        }}>
          {/* Intro page — always first */}
          <IntroSection theme={theme} onSubmit={() => setShowForm(true)} hasSubmissions={submissions.length > 0} />

          {submissions.map((s, i) => (
            <HarvestCard key={s.id} submission={s} index={i} layout="book" onClick={() => setLightboxIdx(i)} />
          ))}
        </div>
      ) : (
        <div style={{
          minHeight: "100svh",
          padding: "clamp(80px,12vh,120px) clamp(20px,4vw,60px) 120px",
        }}>
          {/* Intro block above grid */}
          <div style={{
            maxWidth: 480,
            margin: "0 auto clamp(48px,8vh,80px)",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <IntroText theme={theme} />
          </div>
          <div style={{ ...gridCols }}>
            {submissions.map((s, i) => (
              <HarvestCard key={s.id} submission={s} index={i} layout={layout} onClick={() => setLightboxIdx(i)} />
            ))}
          </div>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

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

const ghostBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #e0e0e0",
  padding: "10px 24px",
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  color: "#555",
};
