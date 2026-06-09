"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from "d3-force";
import type { SimulationNodeDatum } from "d3-force";
import type { WorkItem } from "@/app/api/work/route";

// Same dimensions as the main cloud so refs look equal in weight
const REF_W   = 140;
const REF_PAD = 76;

const COLORS = ["#c9b99a","#8a9bb0","#b0a28a","#9ab09a","#a09ab0","#b08a8a","#8ab0a0"];
function nodeColor(url: string) {
  return COLORS[Math.abs(url.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)/i.test(url);
}

interface RefNode extends SimulationNodeDatum {
  id: string;
  x: number; y: number;
  fx?: number | null;
  fy?: number | null;
}

export default function ReferenceCluster({
  images,
  allItems,
  onNavigate,
}: {
  images: string[];
  allItems: WorkItem[];
  onNavigate: (url: string) => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef   = useRef<any>(null);
  const nodesRef = useRef<RefNode[]>([]);
  const dragRef  = useRef<{ id: string; moved: boolean } | null>(null);
  const panRef   = useRef<{ x: number; y: number } | null>(null);
  const vpRef    = useRef({ x: 0, y: 0, scale: 1 });
  const activePtrsRef    = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);

  const [pos,  setPos]  = useState<Record<string, { x: number; y: number }>>({});
  const [vp,   setVp]   = useState({ x: 0, y: 0, scale: 1 });
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => { vpRef.current = vp; }, [vp]);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 0 && h > 0) setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset viewport when images change
  useEffect(() => {
    setVp({ x: 0, y: 0, scale: 1 });
  }, [images]);

  useEffect(() => {
    if (!size || !images.length) return;
    simRef.current?.stop();
    const { w, h } = size;
    const cx = w / 2, cy = h / 2;
    const nodes: RefNode[] = images.map(url => ({
      id: url,
      x: cx + (Math.random() - 0.5) * w * 0.5,
      y: cy + (Math.random() - 0.5) * h * 0.5,
    }));
    nodesRef.current = nodes;
    simRef.current = forceSimulation(nodes)
      .force("collide", forceCollide(REF_PAD))
      .force("center",  forceCenter(cx, cy))
      .force("charge",  forceManyBody().strength(-20))
      .alphaDecay(0.02)
      .on("tick", () => {
        const p: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) p[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPos({ ...p });
      });
    return () => { simRef.current?.stop(); };
  }, [images, size]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      activePtrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePtrsRef.current.size >= 2) {
        const pts = [...activePtrsRef.current.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (lastPinchDistRef.current !== null && wrapRef.current) {
          const ratio = dist / lastPinchDistRef.current;
          const { scale, x, y } = vpRef.current;
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          const r  = wrapRef.current.getBoundingClientRect();
          const mx = midX - r.left, my = midY - r.top;
          const ns = Math.max(0.15, Math.min(5, scale * ratio));
          const nr = ns / scale;
          setVp({ scale: ns, x: mx - nr * (mx - x), y: my - nr * (my - y) });
        }
        lastPinchDistRef.current = dist;
        return;
      }
      lastPinchDistRef.current = null;

      if (dragRef.current) {
        const wrap = wrapRef.current; if (!wrap) return;
        const { scale, x: vpX, y: vpY } = vpRef.current;
        const r = wrap.getBoundingClientRect();
        const node = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (node) {
          node.fx = (e.clientX - r.left - vpX) / scale;
          node.fy = (e.clientY - r.top  - vpY) / scale;
          dragRef.current.moved = true;
          simRef.current?.alphaTarget(0.3).restart();
        }
      } else if (panRef.current) {
        const dx = e.clientX - panRef.current.x;
        const dy = e.clientY - panRef.current.y;
        panRef.current = { x: e.clientX, y: e.clientY };
        setVp(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    };

    const onUp = (e: PointerEvent) => {
      activePtrsRef.current.delete(e.pointerId);
      lastPinchDistRef.current = null;

      if (dragRef.current) {
        const node = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (node) { node.fx = null; node.fy = null; }
        simRef.current?.alphaTarget(0).restart();
        if (!dragRef.current.moved) onNavigate(dragRef.current.id);
        dragRef.current = null;
        setDraggingId(null);
      }
      panRef.current = null;
    };

    window.addEventListener("pointermove",   onMove);
    window.addEventListener("pointerup",     onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove",   onMove);
      window.removeEventListener("pointerup",     onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNavigate]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: 320,
        overflow: "hidden",
        cursor: draggingId ? "grabbing" : "grab",
        touchAction: "none",
        marginTop: 20,
        borderTop: "1px solid #f0f0f0",
      }}
      onPointerDown={e => {
        activePtrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePtrsRef.current.size >= 2) { panRef.current = null; return; }
        const t = e.target as HTMLElement;
        if (t.closest("[data-ref-item]")) return;
        panRef.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0,
        width:  size?.w ?? "100%",
        height: size?.h ?? "100%",
        transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.scale})`,
        transformOrigin: "0 0",
        willChange: "transform",
      }}>
        <AnimatePresence>
          {images.map((url, idx) => {
            const p = pos[url]; if (!p) return null;
            const vid = isVideoUrl(url);
            const isDragging = draggingId === url;
            // Check if this URL belongs to another work in the portfolio
            const linkedWork = allItems.find(w =>
              w.images?.includes(url) || w.image === url
            );
            return (
              <motion.div
                key={url}
                data-ref-item="1"
                onPointerDown={e => {
                  e.stopPropagation();
                  activePtrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                  if (activePtrsRef.current.size >= 2) {
                    if (dragRef.current) { dragRef.current = null; setDraggingId(null); }
                    panRef.current = null;
                    return;
                  }
                  dragRef.current = { id: url, moved: false };
                  setDraggingId(url);
                }}
                style={{
                  position: "absolute",
                  width: REF_W,
                  left: p.x - REF_W / 2,
                  top:  p.y - REF_PAD / 2,
                  background: nodeColor(url),
                  cursor: isDragging ? "grabbing" : "pointer",
                  overflow: "hidden",
                  zIndex: isDragging ? 10 : undefined,
                  boxShadow: isDragging
                    ? "0 8px 32px rgba(0,0,0,0.18)"
                    : linkedWork
                      ? "0 0 0 2px #c9b99a"  // gold-ish ring on portfolio works
                      : undefined,
                }}
                initial={{ x: idx % 2 === 0 ? -80 : 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{    x: idx % 2 === 0 ? -60 : 60, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
                whileHover={!isDragging ? { scale: 1.08, transition: { duration: 0.13 } } : undefined}
              >
                {vid
                  ? <video src={url} autoPlay loop playsInline muted style={{ display:"block", width:"100%", height:"auto", pointerEvents:"none" }} />
                  : /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="" style={{ display:"block", width:"100%", height:"auto", pointerEvents:"none", userSelect:"none" }} draggable={false} loading="lazy" />
                }
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
