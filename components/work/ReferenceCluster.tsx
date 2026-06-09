"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  forceSimulation,
  forceCollide,
  forceCenter,
  forceManyBody,
  SimulationNodeDatum,
} from "d3-force";

const REF_W = 68;
const REF_R = 38;
const W = 300;
const H = 180;

interface RefNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function ReferenceCluster({
  images,
  onSelect,
}: {
  images: string[];
  onSelect: (url: string) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null);

  useEffect(() => {
    if (images.length === 0) return;
    simRef.current?.stop();
    const cx = W / 2;
    const cy = H / 2;
    const nodes: RefNode[] = images.map((url) => ({
      id: url,
      x: cx + (Math.random() - 0.5) * W * 0.55,
      y: cy + (Math.random() - 0.5) * H * 0.55,
      vx: 0,
      vy: 0,
    }));
    simRef.current = forceSimulation(nodes)
      .force("collide", forceCollide(REF_R))
      .force("center", forceCenter(cx, cy))
      .force("charge", forceManyBody().strength(-8))
      .alphaDecay(0.04)
      .on("tick", () => {
        const pos: Record<string, { x: number; y: number }> = {};
        for (const n of nodes) pos[n.id] = { x: n.x ?? cx, y: n.y ?? cy };
        setPositions({ ...pos });
      });
    return () => simRef.current?.stop();
  }, [images]);

  return (
    <div style={{ position: "relative", width: W, height: H, marginTop: 12 }}>
      <AnimatePresence>
        {images.map((url) => {
          const pos = positions[url];
          if (!pos) return null;
          return (
            <motion.button
              key={url}
              style={{
                position: "absolute",
                width: REF_W,
                left: pos.x - REF_W / 2,
                top: pos.y - REF_W / 2,
                padding: 0,
                border: "2px solid transparent",
                background: "none",
                cursor: "pointer",
                overflow: "hidden",
                borderRadius: 2,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.14, zIndex: 10, borderColor: "#111", transition: { duration: 0.14 } }}
              onClick={() => onSelect(url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ display: "block", width: "100%", height: "auto" }}
                draggable={false}
              />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
