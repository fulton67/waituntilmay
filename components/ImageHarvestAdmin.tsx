"use client";

import { useState, useRef, useCallback } from "react";
import type { Reel } from "@/lib/reels";

interface Props {
  reels: Reel[];
}

function getRotation(id: string): number {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((hash % 9) - 4) * 0.4;
}

function getSpan(weight: 1 | 2 | 3): number {
  return weight === 1 ? 1 : weight === 2 ? 2 : 3;
}

async function patchReels(body: object) {
  await fetch("/api/reels", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function ImageHarvestAdmin({ reels: initial }: Props) {
  const [reels, setReels] = useState<Reel[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragId = useRef<string | null>(null);

  // Fix: derive next weight/hidden from the current reels state at call time,
  // not from the outer closure which may be stale if the component hasn't
  // re-rendered yet. We read from `reels` (current render snapshot) to compute
  // the next value, then pass it to both setReels (functional form for safety)
  // and the API call — both using the same locally-captured value.
  const reelsRef = useRef<Reel[]>(reels);
  reelsRef.current = reels;

  const cycleWeight = useCallback(async (id: string) => {
    const current = reelsRef.current.find((r) => r.id === id);
    if (!current) return;
    const next = (current.weight === 1 ? 2 : current.weight === 2 ? 3 : 1) as 1 | 2 | 3;
    setReels((prev) =>
      prev.map((r) => (r.id === id ? { ...r, weight: next } : r))
    );
    await patchReels({ action: "update", id, weight: next });
  }, []);

  const toggleHidden = useCallback(async (id: string) => {
    const current = reelsRef.current.find((r) => r.id === id);
    if (!current) return;
    const next = !current.hidden;
    setReels((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: next } : r))
    );
    await patchReels({ action: "update", id, hidden: next });
  }, []);

  const saveOrder = useCallback(async () => {
    setSaving(true);
    await patchReels({ action: "reorder", ids: reels.map((r) => r.id) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [reels]);

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id;
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return;
    setReels((prev) => {
      const from = prev.findIndex((r) => r.id === dragId.current);
      const to = prev.findIndex((r) => r.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    dragId.current = null;
  }, []);

  const weightLabel = (w: 1 | 2 | 3) => (w === 1 ? "S" : w === 2 ? "M" : "L");

  return (
    <div style={{ minHeight: "100vh", background: "#111", padding: "0" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#111",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 12px",
        }}
      >
        <span style={{ color: "#fff", fontSize: "11px", fontFamily: "inherit" }}>
          image harvest 1 — admin
        </span>
        <button
          onClick={saveOrder}
          disabled={saving}
          style={{
            background: saved ? "#0a0" : "#fff",
            color: saved ? "#fff" : "#000",
            border: "none",
            padding: "4px 10px",
            fontSize: "11px",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {saving ? "saving..." : saved ? "saved" : "save order"}
        </button>
      </div>

      <div
        style={{
          paddingTop: "36px",
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridAutoRows: "15vw",
          gridAutoFlow: "dense",
          gap: 0,
        }}
      >
        {reels.map((reel) => {
          const span = getSpan(reel.weight);
          const rotation = getRotation(reel.id);
          return (
            <div
              key={reel.id}
              draggable
              onDragStart={() => handleDragStart(reel.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(reel.id)}
              style={{
                gridColumn: `span ${span}`,
                gridRow: `span ${span}`,
                position: "relative",
                transform: `rotate(${rotation}deg)`,
                opacity: reel.hidden ? 0.35 : 1,
                cursor: "grab",
                overflow: "hidden",
              }}
            >
              <video
                src={reel.blobUrl}
                autoPlay
                loop
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "4px",
                }}
              >
                <button
                  onClick={() => toggleHidden(reel.id)}
                  style={{
                    alignSelf: "flex-end",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    border: "none",
                    fontSize: "10px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "2px 5px",
                  }}
                >
                  {reel.hidden ? "show" : "hide"}
                </button>
                <button
                  onClick={() => cycleWeight(reel.id)}
                  style={{
                    alignSelf: "flex-start",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    border: "none",
                    fontSize: "10px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "2px 5px",
                  }}
                >
                  {weightLabel(reel.weight)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
