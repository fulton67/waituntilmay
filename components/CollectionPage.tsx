"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/app/api/collections/route";
import { track } from "@/lib/track";

interface Props { collection: Collection; }

export default function CollectionPage({ collection }: Props) {
  const [view, setView] = useState<"download" | "browse">("download");
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [ack, setAck] = useState(false);
  const isPitch = collection.format === "pitch-deck";

  useEffect(() => {
    if (view !== "browse") return;
    setLoading(true);
    // For collections, we render images directly rather than via pdfjs
    setLoading(false);
  }, [view]);

  async function handleDownload() {
    const { PDFDocument, rgb } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const W = 8.5 * 72, H = 11 * 72;

    if (isPitch && collection.brand.name) {
      // Cover slide
      const cover = doc.addPage([W, H]);
      const font = await doc.embedFont("Helvetica");
      cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0, 0, 0) });
      cover.drawText(collection.brand.name.toUpperCase(), { x: 48, y: H / 2 + 40, size: 28, font, color: rgb(1, 1, 1) });
      if (collection.brand.tagline) {
        cover.drawText(collection.brand.tagline, { x: 48, y: H / 2 + 8, size: 12, font, color: rgb(0.7, 0.7, 0.7) });
      }
      cover.drawText("waituntilmay.com", { x: 48, y: 36, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    }

    for (const url of collection.images) {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const ct = res.headers.get("content-type") ?? "";
        let img;
        if (ct.includes("jpeg") || ct.includes("jpg") || url.match(/\.jpe?g$/i)) {
          img = await doc.embedJpg(buf);
        } else {
          img = await doc.embedPng(buf);
        }
        const page = doc.addPage([W, H]);
        const scale = Math.min(W / img.width, H / img.height);
        const w = img.width * scale, h = img.height * scale;
        page.drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });

        if (isPitch) {
          const font = await doc.embedFont("Helvetica");
          page.drawText(collection.brand.name || collection.title, { x: 24, y: 20, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
        }
      } catch {}
    }

    const bytes = await doc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${collection.slug}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    setAck(true);
    setTimeout(() => setAck(false), 2000);
    track("download", { project: collection.slug });
  }

  return (
    <main style={{ fontFamily: "'Courier New', Courier, monospace" }} className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl w-full mx-auto">
        <Link href="/"><Image src="/logo.jpg" alt="waituntilmay" width={64} height={64} style={{ objectFit: "contain", cursor: "pointer" }} /></Link>
        <h1 className="text-xs tracking-widest uppercase">{collection.title}</h1>
        {collection.brand?.tagline && <p className="text-xs tracking-widest text-gray-400">{collection.brand.tagline}</p>}

        <div className="w-full border-t border-gray-200" />

        <div className="flex gap-8 justify-center">
          <button onClick={() => setView("download")} className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${view === "download" ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>download</button>
          <button onClick={() => setView("browse")} className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${view === "browse" ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>browse</button>
        </div>

        {view === "download" ? (
          <>
            <p className="text-xs tracking-widest text-gray-300 leading-relaxed max-w-sm">
              {collection.images.length} image{collection.images.length !== 1 ? "s" : ""} — {isPitch ? "pitch deck" : "8.5 × 11 print format"}
            </p>
            <button onClick={handleDownload} className="w-full max-w-sm border border-black py-4 px-6 text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer bg-transparent text-black">
              download pdf
            </button>
            {ack && <p className="text-xs tracking-widest text-gray-300">acknowledged ✓</p>}
          </>
        ) : (
          <div className="w-full overflow-y-auto" style={{ maxHeight: "70vh" }}>
            <p className="text-xs text-gray-300 tracking-widest mb-4">{collection.images.length} images</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {collection.images.map((url, i) => (
                <div key={i} onClick={() => setLightbox(i)}
                  style={{ aspectRatio: "8.5/11", background: "#f5f5f5", border: "1px solid #e5e5e5", overflow: "hidden", cursor: "pointer", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 8, color: "#aaa", fontFamily: "Courier New" }}>{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {lightbox !== null && (
          <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", fontFamily: "Courier New", textTransform: "uppercase", color: "#999" }}>close</button>
            <span style={{ position: "absolute", top: 22, left: 24, fontSize: 10, letterSpacing: "0.12em", fontFamily: "Courier New", color: "#bbb" }}>{lightbox + 1} / {collection.images.length}</span>
            {lightbox > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.max(0, (l ?? 0) - 1)); }} style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#bbb" }}>‹</button>}
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collection.images[lightbox]} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain" }} />
            </div>
            {lightbox < collection.images.length - 1 && <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.min(collection.images.length - 1, (l ?? 0) + 1)); }} style={{ position: "absolute", right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#bbb" }}>›</button>}
          </div>
        )}

        <p className="text-xs text-gray-300 tracking-widest">waituntilmay.com/w/{collection.slug}</p>
      </div>
    </main>
  );
}
