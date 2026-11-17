// Fixture for lint_compositions.py --selftest: must PASS. A headed arrow (data-arrowhead), an open ring with no leader,
// synapse vesicles (small filled circles, waived), a straight divider with no dot.
import React from "react";
export const Arrow: React.FC<{ d: string; q: number; tip: [number, number]; ang: number }> = ({ d, q, tip, ang }) => (
  <svg width={1920} height={1080}>
    <path d={d} fill="none" stroke="#202532" strokeWidth={4} pathLength={1} strokeDasharray={`${q} 1`} />
    <path data-arrowhead d="M-14 -8 L0 0 L-14 8" transform={`translate(${tip[0]} ${tip[1]}) rotate(${ang})`} fill="none" stroke="#202532" strokeWidth={4} />
  </svg>
);
export const Synapse: React.FC<{ v: [number, number][] }> = ({ v }) => (
  <svg width={720} height={420}>
    <path d="M300 60 L300 360" stroke="#202532" strokeWidth={2} />
    {v.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill="#202532" />)} {/* lint-ok: vesicles, not a callout */}
  </svg>
);
export const Divider: React.FC = () => (
  <svg width={1920} height={1080}><line x1={960} y1={60} x2={960} y2={900} stroke="#fff" strokeWidth={2} /></svg>
);
export const Scene: React.FC = () => (<><Arrow d="M0 0 C 10 10 20 10 30 0" q={1} tip={[30, 0]} ang={0} /><Synapse v={[[10, 10]]} /><Divider /></>);
