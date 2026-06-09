"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from "d3-force";
import type { SimulationNodeDatum } from "d3-force";

const REF_W   = 88;
const REF_PAD = 52;

const COLORS = ["#c9b99a","#8a9bb0","#b0a28a","#9ab09a","#a09ab0","#b08a8a","#8ab0a0"];
function nodeColor(url: string) {
  return COLORS[Math.abs(url.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

interface RefNode extends SimulationNodeDatum {
  id: string;
  x: number; y: number;
  fx?: number | null;
  fy?: number | null;
}

export default function ReferenceCluster({
  images,
  onSelect,
}: {
  images: string[];
  onSelect: (url: string) => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef   = useRef<any>(null);
  const nodesRef = useRef<RefNode[]>([]);
  const dragRef  = useRef<{ id: string; moved: boolean } | null>(null);
  const panRef   = useRef<{ x: number; y: number } | null>(null);
  const vpRef    = useRef({ x: 0, y: 0, scale: 1 });

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
      .force("charge",  forceManyBody().strength(-18))
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
      if (dragRef.current) {
        const wrap = wrapRef.current; if (!wrap) return;
        const { scale, x: vpX, y: vpY } = vpRef.current;
        const r = wrap.getBoundingClientRect();
        const sceneX = (e.clientX - r.left - vpX) / scale;
        const sceneY = (e.clientY - r.top  - vpY) / scale;
        const node = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (node) {
          node.fx = sceneX; node.fy = sceneY;
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
    const onUp = () => {
      if (dragRef.current) {
        const node = nodesRef.current.find(n => n.id === dragRef.current!.id);
        if (node) { node.fx = null; node.fy = null; }
        simRef.current?.alphaTarget(0).restart();
        if (!dragRef.current.moved) onSelect(dragRef.current.id);
        dragRef.current = null;
        setDraggingId(null);
      }
      panRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: 240,
        overflow: "hidden",
        cursor: draggingId ? "grabbing" : "grab",
        touchAction: "none",
        marginTop: 16,
        borderTop: "1px solid #f2f2f2",
      }}
      onPointerDown={e => {
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
            return (
              <motion.div
                key={url}
                data-ref-item="1"
                onPointerDown={e => {
                  e.stopPropagation();
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
                  boxShadow: isDragging ? "0 6px 24px rgba(0,0,0,0.15)" : undefined,
                }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={!isDragging ? { scale: 1.1, transition: { duration: 0.13 } } : undefined}
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
