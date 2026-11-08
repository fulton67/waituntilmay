"use client";

// Liquid glass (client reference, 2026-11-08; DECISIONS 65). The same recipe drives the video lower third in
// brand/kit/video/kit.html (.vk-lt at 3x scale + SVG #vk-glass-distortion). Render <GlassFilter /> once per page.
import React from "react";

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  target?: string;
}

interface DockIcon {
  src: string;
  alt: string;
  onClick?: () => void;
}

const SPRING = "cubic-bezier(0.175, 0.885, 0.32, 2.2)";

export const GlassEffect: React.FC<GlassEffectProps> = ({ children, className = "", style = {}, href, target = "_blank" }) => {
  const content = (
    <div
      className={`relative flex font-semibold overflow-hidden text-black cursor-pointer transition-all duration-700 ${className}`}
      style={{ boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)", transitionTimingFunction: SPRING, ...style }}
    >
      {/* glass layers: warped blur, white tint, bright inset rims */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-3xl"
        style={{ backdropFilter: "blur(3px)", filter: "url(#glass-distortion)", isolation: "isolate" }}
      />
      <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: "rgba(255, 255, 255, 0.25)" }} />
      <div
        className="absolute inset-0 z-20 rounded-3xl overflow-hidden"
        style={{ boxShadow: "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)" }}
      />
      <div className="relative z-30">{children}</div>
    </div>
  );
  return href ? (
    <a href={href} target={target} rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
};

export const GlassDock: React.FC<{ icons: DockIcon[]; href?: string }> = ({ icons, href }) => (
  <GlassEffect href={href} className="rounded-3xl p-3 hover:p-4 hover:rounded-4xl">
    <div className="flex items-center justify-center gap-2 rounded-3xl p-3 py-0 px-0.5 overflow-hidden">
      {icons.map((icon, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={icon.src}
          alt={icon.alt}
          className="w-16 h-16 transition-all duration-700 hover:scale-110 cursor-pointer"
          style={{ transformOrigin: "center center", transitionTimingFunction: SPRING }}
          onClick={icon.onClick}
        />
      ))}
    </div>
  </GlassEffect>
);

export const GlassButton: React.FC<{ children: React.ReactNode; href?: string }> = ({ children, href }) => (
  <GlassEffect href={href} className="rounded-3xl px-10 py-6 hover:px-11 hover:py-7 hover:rounded-4xl overflow-hidden">
    <div className="transition-all duration-700 hover:scale-95" style={{ transitionTimingFunction: SPRING }}>
      {children}
    </div>
  </GlassEffect>
);

export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }}>
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves={1} seed={17} result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude={1} exponent={10} offset={0.5} />
        <feFuncG type="gamma" amplitude={0} exponent={1} offset={0} />
        <feFuncB type="gamma" amplitude={0} exponent={1} offset={0.5} />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
      <feSpecularLighting in="softMap" surfaceScale={5} specularConstant={1} specularExponent={100} lightingColor="white" result="specLight">
        <fePointLight x={-200} y={-200} z={300} />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="litImage" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale={200} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export default GlassEffect;
