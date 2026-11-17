// Fixture for lint_compositions.py --selftest: every component here must FAIL (the patterns v4.1 / storyboard / v5 shipped).
import React from "react";
export const DotLine: React.FC<{ x: number; y: number; lx: number; ly: number }> = ({ x, y, lx, ly }) => (
  <svg width={1920} height={1080}>
    <circle cx={x} cy={y} r={6} fill="#fff" />
    <path d={`M${x} ${y} L${lx} ${ly}`} stroke="#fff" strokeWidth={3} />
  </svg>
);
export const Bead: React.FC<{ d: string; bead: [number, number] }> = ({ d, bead }) => (
  <svg width={1920} height={1080}>
    <path d={d} fill="none" stroke="#000" />
    <circle cx={bead[0]} cy={bead[1]} r={7} fill="#fff" />
  </svg>
);
export const RingLeader: React.FC<{ R: { x: number; y: number; r: number } }> = ({ R }) => (
  <svg width={1920} height={1080}>
    <circle cx={R.x} cy={R.y} r={R.r} fill="none" stroke="#37a9e8" />
    <line x1={R.x - R.r} y1={R.y} x2={R.x - 200} y2={R.y - 80} stroke="#000" />
  </svg>
);
export const Scene: React.FC = () => (<><DotLine x={1} y={2} lx={3} ly={4} /></>);
