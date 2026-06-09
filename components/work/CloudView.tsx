"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from "d3-force";
import type { SimulationNodeDatum } from "d3-force";
import type { WorkItem } from "@/app/api/work/route";

const ITEM_W = 140;
const PAD    = 76;

interface Node extends SimulationNodeDatum { id: string }

const COLORS = ["#c9b99a","#8a9bb0","#b0a28a","#9ab09a","#a09ab0","#b08a8a","#8ab0a0"];
function nodeColor(id: string) {
  return COLORS[Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];
}

export default function CloudView({
  items,
  onSelect,
}: {
  items: WorkItem[];
  onSelect: (item: WorkItem) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef  = useRef<any>(null);
  const vpRef   = useRef({ scale: 1, x: 0, y: 0 });
  // pan only active when mouse is held on background
  const panRef  = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  const [pos,  setPos]  = useState<Record<string, { x: number; y: number }>>({});
  const [vp,   setVp]   = useState({ scale: 1, x: 0, y: 0 });
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tip,  setTip]  = useState<{ x: number; y: number; item: WorkItem } | null>(null);

  useEffect(() => { vpRef.current = vp; }, [vp]);

  // Measure container
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 0 && h > 0)
        setSize(s => (s && Math.abs(s.w - w) < 2 && Math.abs(s.h - h) < 2) ? s : { w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Centre viewport once
  useEffect(() => {
    if (!size) return;
    const s = 0.82;
    setVp({ scale: s, x: (size.w * (1 - s)) / 2, y: (size.h * (1 - s)) / 2 });
  }, [size]);

  // D3 simulation
  useEffect(() => {
    if (!size || !items.length) return;
    simRef.current?.stop();
    const { w, h } = size;
    const cx = w / 2, cy = h / 2;
    const nodes: Node[] = items.map(i => ({
      id: i.id,
      x: cx + (Math.random() - .5) * w * .55,
      y: cy + (Math.random() - .5) * h * .55,
    }));
    simRef.current = forceSimulation(nodes)
      .force("collide", forceCollide(PAD))
      .force("center",  forceCenter(cx, cy))
      .force("charge",  forceManyBody().strength(-20))
      .alphaDecay(0.035)
      .on("tick", () => {
        const p: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) p[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPos({ ...p });
      });
    return () => { simRef.current?.stop(); };
  }, [items, size]);

  // Wheel zoom — native listener so we can call preventDefault
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { scale, x, y } = vpRef.current;
      const delta  = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      const factor = 1 + (-delta * 0.0005);
      const ns     = Math.max(0.15, Math.min(5, scale * factor));
      const r      = el.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const ratio  = ns / scale;
      setVp({ scale: ns, x: mx - ratio * (mx - x), y: my - ratio * (my - y) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan — use native mouse events (NOT setPointerCapture) so clicks reach children
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-item]")) return;          // ignore item clicks
      panRef.current = { x: e.clientX, y: e.clientY, dragging: false };
    };
    const onMove = (e: MouseEvent) => {
      if (!panRef.current) return;
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      panRef.current.x = e.clientX;
      panRef.current.y = e.clientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panRef.current.dragging = true;
      setVp(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const onUp = () => { panRef.current = null; };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",  onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",  onUp);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ position:"absolute", inset:0, overflow:"hidden", cursor:"grab", zIndex:1 }}
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
          {items.map(item => {
            const p   = pos[item.id]; if (!p) return null;
            const src = item.images?.[0] ?? item.image ?? null;
            return (
              <motion.div
                key={item.id}
                data-item="1"
                onClick={() => onSelect(item)}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ x: r.right, y: r.top + r.height / 2, item });
                }}
                onMouseLeave={() => setTip(null)}
                style={{
                  position:   "absolute",
                  width:       ITEM_W,
                  left:        p.x - ITEM_W / 2,
                  top:         p.y - PAD / 2,
                  background:  nodeColor(item.id),
                  cursor:      "pointer",
                  overflow:    "hidden",
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.1, zIndex: 10, transition: { duration: 0.15 } }}
              >
                {src
                  ? <img src={src} alt={item.title} style={{ display:"block", width:"100%", height:"auto", pointerEvents:"none", userSelect:"none" }} loading="lazy" draggable={false} />
                  : <div style={{ width: ITEM_W, height: 100 }} />
                }
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tip && (
          <motion.div
            style={{ position:"fixed", left: tip.x + 14, top: tip.y, transform:"translateY(-50%)", background:"#fff", border:"1px solid #e8e8e8", borderRadius:4, padding:"10px 14px", pointerEvents:"none", zIndex:30, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:200 }}
            initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-6 }} transition={{ duration: 0.13 }}
          >
            <div style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#111", marginBottom:4 }}>{tip.item.title}</div>
            <div style={{ fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", color:"#aaa" }}>
              {tip.item.category.replace(/-/g, " ")}{tip.item.year ? ` · ${tip.item.year}` : ""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
