"use client";

import { useRef, useCallback } from "react";
import type { Reel } from "@/lib/reels";

interface Props {
  reels: Reel[];
  visitorName: string;
}

function getRotation(id: string): number {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((hash % 9) - 4) * 0.4; // -1.6 to +1.6 degrees
}

async function downloadReel(url: string, id: string, name: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `image-harvest-${id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
  } catch (err) {
    console.error("download failed:", err);
  }

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "download", project: "reels", action: "download", name }),
  }).catch(() => {});
}

function ReelCard({ reel, visitorName }: { reel: Reel; visitorName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rotation = getRotation(reel.id);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = 0.8;
    if (cardRef.current) {
      cardRef.current.style.transform = `rotate(${rotation}deg) scale(1.15)`;
      cardRef.current.style.zIndex = "10";
    }
  }, [rotation]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = 0.05;
    if (cardRef.current) {
      cardRef.current.style.transform = `rotate(${rotation}deg) scale(1)`;
      cardRef.current.style.zIndex = "1";
    }
  }, [rotation]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        gridColumn: `span ${reel.weight}`,
        gridRow: `span ${reel.weight}`,
        position: "relative",
        transform: `rotate(${rotation}deg)`,
        transition: "transform 200ms ease",
        zIndex: 1,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <video
        ref={videoRef}
        src={reel.blobUrl}
        autoPlay
        loop
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.muted = false;
          v.volume = 0.05;
        }}
      />
      <button
        onClick={() => downloadReel(reel.blobUrl, reel.id, visitorName)}
        style={{
          position: "absolute",
          bottom: "6px",
          right: "6px",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "none",
          padding: "4px 6px",
          fontSize: "11px",
          fontFamily: "inherit",
          cursor: "pointer",
          opacity: 0,
          transition: "opacity 150ms",
          pointerEvents: "auto",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0"; }}
      >
        ↓
      </button>
    </div>
  );
}

export default function ImageHarvest({ reels, visitorName }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "0" }}>
      <div style={{
        padding: "8px 12px",
        color: "#fff",
        fontSize: "11px",
        fontFamily: "inherit",
        letterSpacing: "0.05em",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        mixBlendMode: "difference",
      }}>
        image harvest 1
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gridAutoRows: "15vw",
        gridAutoFlow: "dense",
        gap: 0,
      }}>
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} visitorName={visitorName} />
        ))}
      </div>
    </div>
  );
}
