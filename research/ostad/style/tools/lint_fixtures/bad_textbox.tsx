// lint fixture: the banned flat block label, both ways it was built (must FAIL with BOX1 and BOX2)
import React from "react";
const ICE = "#cfe9f7";
export const BlockLabel: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 98, top: 1100, background: ICE, padding: "4px 18px", font: "600 76px Arial" }}>{text}</div>
);
export const SlamLabel: React.FC<{ q: number }> = ({ q }) => (
  <div style={{ position: "relative", display: "inline-block" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${q * 100}%`, background: ICE }} />
    <div style={{ position: "relative", font: "600 76px Arial" }}>Deflation</div>
  </div>
);
