import React from "react";
import { useCurrentFrame } from "remotion";
import { Arrow, type PtSrc } from "../devices/Arrow";
import { TypeEntry } from "../devices/TypeEntry";
import { C, SERIF, SKIN_DISCLAIMER, caps, ease, p } from "./look";
import { Disclaimer } from "./parts";
import { RoundWindow } from "./RoundWindow";

// flow-diagram-build + arrow-curved-callout (B03 f160-262). Ref: D_bh f1108-1140 (a flow builds node by node with callouts).
// Three round windows (Mind = glass head, Our approach = the practice's coil set-up, Your skin = model cheek) arrive on an arc
// (`arrive` 14 f, 2 f stagger). Callout #1 runs from Ostad's head crown (pass a tracked PtSrc: follow(track, "headTop", ...)) to
// Mind; #2 Mind -> Our approach; #3 -> Your skin; each draws 7 f and its open-V head lands last, and the window it lands on turns
// its rim blue. 'total skin health' sits dim under them and lights word by word. Windows drift out of phase; arrows breathe.
export type FlowNode = { file: string; iw: number; ih: number; fx: number; fy: number; z: number; x: number; y: number; label: string };
export type FlowProps = {
  start?: number; from?: PtSrc; arrows?: number[]; words?: number[]; discAt?: number; exitAt?: number; nodes?: FlowNode[]; line?: string; d?: number;
};

const NODES: FlowNode[] = [
  { file: "exomind-skin/flora/head_A_glass_brain.png", iw: 2752, ih: 1536, fx: 1180, fy: 600, z: 0.23, x: 860, y: 200, label: "Mind" },
  { file: "exomind-skin/clinic/IMG_3712.jpg", iw: 768, ih: 1024, fx: 320, fy: 440, z: 0.62, x: 1200, y: 130, label: "Our approach" },
  { file: "exomind-skin/btl/web/model_1012.jpg", iw: 1800, ih: 1013, fx: 905, fy: 640, z: 0.55, x: 1540, y: 200, label: "Your skin" },
];

export const FlowDiagramBuild: React.FC<FlowProps> = ({ start = 0, from = { x: 230, y: 150 }, arrows = [28, 41, 71], words = [64, 71, 78], discAt = 79, exitAt = 95,
  nodes = NODES, line = "total skin health", d = 260 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const c = (n: FlowNode) => ({ x: n.x + d / 2, y: n.y + d / 2 });
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) => {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: a.x + (dx / L) * r, y: a.y + (dy / L) * r };
  };
  // callout endpoints: start just off the source, land just outside the target rim (+16 px)
  const R = d / 2 + 16;
  const ends: [PtSrc, PtSrc][] = [
    [from, (fr: number) => edge(c(nodes[0]), typeof from === "function" ? from(fr) : from, R)],
    [edge(c(nodes[0]), c(nodes[1]), R), edge(c(nodes[1]), c(nodes[0]), R)],
    [edge(c(nodes[1]), c(nodes[2]), R), edge(c(nodes[2]), c(nodes[1]), R)],
  ];
  return (
    <>
      {nodes.map((n, i) => {
        const rim = p(f, arrows[i] + 7, 4, ease.arrive);
        return (
          <RoundWindow key={i} at={start + 2 * i} {...n} d={d} out={exitAt} rim={rim} phase={i * 2.1}
            label={<div style={{ position: "absolute", left: d / 2, top: d + 22, transform: "translateX(-50%)", ...caps(26, rim > 0.5 ? C.blue : C.ink2), whiteSpace: "nowrap" }}>{n.label}</div>} />
        );
      })}
      {ends.map(([a, b], i) => (
        <Arrow key={i} variant="curved-callout" from={a} to={b} start={arrows[i]} end={exitAt + 7} color={C.blue} bend={i === 0 ? -0.3 : -0.36} />
      ))}
      <div style={{ position: "absolute", left: 860, top: 560, width: 940, textAlign: "center" }}>
        <TypeEntry entry="type-ghost-to-lit" start={start} text={line} wordTimes={words} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 76, color: C.ink }} />
      </div>
      <Disclaimer at={discAt} out={exitAt} text={SKIN_DISCLAIMER} style={{ left: 860, top: 670, width: 940, textAlign: "center" }} />
    </>
  );
};
