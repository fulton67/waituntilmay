"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/track";

interface Props {
  name?: string;
}

const TOTAL_PAGES = 159;
const DOMAIN = "https://waituntilmay.com";

function DownloadButton({ name }: { name?: string }) {
  const [ack, setAck] = useState(false);

  async function handleDownload() {
    const response = await fetch("/lunch-bells.pdf");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lunch bells.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAck(true);
    setTimeout(() => setAck(false), 2000);
    track("download", { project: "lunch-bells", name: name || null });
    fetch("/api/download-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: "lunch-bells", name: name || null }),
    }).catch(() => {});
  }

  return (
    <>
      <button
        onClick={handleDownload}
        className="w-full max-w-sm border border-black py-4 px-6 text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer bg-transparent text-black"
      >
        download pdf
      </button>
      {ack && <p className="text-xs tracking-widest text-gray-300" style={{ height: "1em" }}>acknowledged ✓</p>}
    </>
  );
}

export default function LunchBellsPage({ name }: Props) {
  const [view, setView] = useState<"single" | "grid">("single");

  return (
    <main
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
      className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 py-16"
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl w-full mx-auto">

        <Link href="/"><Image src="/logo.jpg" alt="waituntilmay" width={64} height={64} style={{ objectFit: "contain", cursor: "pointer" }} /></Link>
        <h1 className="text-xs tracking-widest uppercase">lunch bells</h1>

        <div className="w-full border-t border-gray-200" />

        <div className="flex gap-8 justify-center">
          <button
            onClick={() => setView("single")}
            className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${
              view === "single" ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            download
          </button>
          <button
            onClick={() => setView("grid")}
            className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${
              view === "grid" ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            browse
          </button>
        </div>

        {view === "single" ? (
          <>
            <p className="text-xs tracking-widest text-gray-300 leading-relaxed max-w-sm">
              by downloading you acknowledge the{" "}
              <a href="https://whop.com/checkout/plan_wISorY0hlQgx9" target="_blank" rel="noopener noreferrer" className="text-gray-400 underline underline-offset-2">
                ip agreement
              </a>
            </p>
            <DownloadButton name={name} />

            <a
              href="/lunch-bells.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 tracking-widest underline"
            >
              open pdf
            </a>

            <EmailShare name={name ?? ""} />
          </>
        ) : (
          <GridViewer />
        )}

        <p className="text-xs text-gray-300 tracking-widest">
          waituntilmay.com/lunch-bells{name ? `/${name.toLowerCase()}` : ""}
        </p>
      </div>
    </main>
  );
}

// ─── Email share ──────────────────────────────────────────────────────────────

function EmailShare({ name }: { name: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const link = name ? `${DOMAIN}/lunch-bells/${encodeURIComponent(name.toLowerCase())}` : `${DOMAIN}/lunch-bells`;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, name, project: "lunch-bells", link }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="text-xs tracking-widest text-gray-400">link sent to {email}</p>;
  }

  return (
    <form onSubmit={send} className="flex w-full max-w-sm gap-3 items-end mt-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="send link via email"
        disabled={status === "sending"}
        className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors"
      />
      <button
        type="submit"
        disabled={!email || status === "sending"}
        aria-label="send"
        className="border-b border-gray-200 hover:border-black transition-colors pb-2 cursor-pointer bg-transparent disabled:opacity-30"
      >
        {status === "sending" ? (
          <span className="text-xs tracking-widest text-gray-400">...</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
      {status === "error" && (
        <p className="text-xs tracking-widest text-gray-400">error — try again</p>
      )}
    </form>
  );
}

// ─── Grid viewer ──────────────────────────────────────────────────────────────

function GridViewer() {
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url
      ).toString();
      const doc = await pdfjsLib.getDocument("/lunch-bells.pdf").promise;
      if (!cancelled) { setPdfDoc(doc); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p className="text-xs text-gray-400 tracking-widest">loading pages...</p>;
  }

  return (
    <>
      <div className="w-full overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <p className="text-xs text-gray-300 tracking-widest mb-4">{TOTAL_PAGES} pages</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {Array.from({ length: TOTAL_PAGES }, (_, i) => (
            <PageThumb key={i} pageNum={i + 1} pdfDoc={pdfDoc} scale={0.3} onClick={() => setLightbox(i + 1)} />
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <Lightbox
          pageNum={lightbox}
          total={TOTAL_PAGES}
          pdfDoc={pdfDoc}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((p) => Math.max(1, (p ?? 1) - 1))}
          onNext={() => setLightbox((p) => Math.min(TOTAL_PAGES, (p ?? 1) + 1))}
        />
      )}
    </>
  );
}

// ─── Page thumbnail ───────────────────────────────────────────────────────────

function PageThumb({ pageNum, pdfDoc, scale, onClick }: { pageNum: number; pdfDoc: unknown; scale: number; onClick?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!pdfDoc || renderedRef.current) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && !renderedRef.current) {
        renderedRef.current = true;
        observer.disconnect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page = await (pdfDoc as any).getPage(pageNum);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      }
    }, { rootMargin: "200px" });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pdfDoc, pageNum, scale]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{ aspectRatio: "8.5 / 11", background: "#f5f5f5", border: "1px solid #e5e5e5", position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 8, color: "#aaa", fontFamily: "Courier New" }}>{pageNum}</span>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ pageNum, total, pdfDoc, onClose, onPrev, onNext }: { pageNum: number; total: number; pdfDoc: unknown; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", fontFamily: "Courier New", textTransform: "uppercase", color: "#999" }}>close</button>
      <span style={{ position: "absolute", top: 22, left: 24, fontSize: 10, letterSpacing: "0.12em", fontFamily: "Courier New", color: "#bbb" }}>{pageNum} / {total}</span>
      {pageNum > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#bbb", padding: "8px" }}>‹</button>
      )}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PageThumb key={pageNum} pageNum={pageNum} pdfDoc={pdfDoc} scale={1.5} />
      </div>
      {pageNum < total && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} style={{ position: "absolute", right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#bbb", padding: "8px" }}>›</button>
      )}
    </div>
  );
}
