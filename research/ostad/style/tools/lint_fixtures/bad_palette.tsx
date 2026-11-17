// lint fixture: off-palette markup and highlight colours (must FAIL with PAL)
import React from "react";
const BLUE = "#37a9e8", ICE = "#cfe9f7";
export const BlueRing: React.FC = () => (
  <svg width={100} height={100}><ellipse cx={50} cy={50} rx={30} ry={20} fill="none" stroke={BLUE} strokeWidth={4} /><path d="M0,0 L10,10" stroke="#37a9e8" /></svg>
);
export const IceZone: React.FC = () => <div style={{ position: "absolute", width: 40, height: 40, background: ICE, boxShadow: "0 1px 2px #000" }} />;
