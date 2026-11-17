// lint fixture: allowed label treatments (must PASS): type with a soft shadow on footage, and a glass plate built with depth
import React from "react";
export const ShadowType: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 98, top: 1100, font: "600 76px Arial", color: "#fff", textShadow: "0 2px 18px rgba(0,0,0,.45)" }}>{text}</div>
);
export const GlassPlate: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 98, top: 1100, background: "rgba(255,255,255,.5)", backdropFilter: "blur(22px)", boxShadow: "0 18px 44px -12px rgba(32,37,50,.22)", font: "600 44px Arial" }}>{text}</div>
);
