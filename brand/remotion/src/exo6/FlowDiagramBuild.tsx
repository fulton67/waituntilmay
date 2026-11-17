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

// gap round 1 (graphics_arrows.md gap 1, DECISIONS 14o): no Flora brain and no BTL stock face. The mind is HIS head (callout #1 leaves
// his temple, tracked); Our approach = the Exomind unit (BTL cut-out, the B02 subject's 2nd and last beat); Your skin
// = a real treated-skin result from the practice (clinic-library row 741: the 'after' half of a cheek before/after, lower face only, no
// eyes, no patient code; on the client-approval list). Windows are 320 px and 540 px apart so every connector is >= 120 px long.
const NODES: FlowNode[] = [
  { file: "exomind-skin/btl/unit_cut.png", iw: 2400, ih: 1265, fx: 1250, fy: 640, z: 0.2, x: 960, y: 150, label: "Our approach" },
  { file: "exomind-skin/clinic/skin_after_00741.jpg", iw: 1024, ih: 1024, fx: 470, fy: 760, z: 0.62, x: 1500, y: 150, label: "Your skin" },
];

export const FlowDiagramBuild: React.FC<FlowProps> = ({ start = 0, from = { x: 230, y: 150 }, arrows = [29, 42], words = [66, 72, 79], discAt = 79, exitAt = 94,
  nodes = NODES, line = "total skin health", d = 320 }) => {
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
        <Arrow key={i} variant="curved-callout" from={a} to={b} start={arrows[i]} end={exitAt + 7} color={C.blue} bend={i === 0 ? -0.22 : -0.3} />
      ))}
      <div style={{ position: "absolute", left: 900, top: 600, width: 960, textAlign: "center" }}>
        <TypeEntry entry="type-ghost-to-lit" start={start} text={line} wordTimes={words} exitAt={exitAt} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 76, color: C.ink }} />
      </div>
      <Disclaimer at={discAt} out={exitAt} text={SKIN_DISCLAIMER} style={{ left: 900, top: 710, width: 960, textAlign: "center" }} />
    </>
  );
};
