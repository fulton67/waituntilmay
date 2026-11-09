"use client";
import React from "react";
import { motion, type MotionProps } from "motion/react";

import { cn } from "@/lib/utils";

// Animated gradient word (shadcn-style component, integrated per the client's paste). Four blurred blobs drift behind the text and
// are blended into it (lighten on white, darken on black). Colours are Ostad's brand blues, set as --color-1..5 in app/globals.css
// (DECISIONS 68), not the original neon set. Works on a white (or, in .dark, black) background, which is what the blend relies on.
interface GradientTextProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

// motion components are made once per element type at module level (not during render), so React keeps their state
const motionCache = new Map<React.ElementType, React.ElementType>();
const motionFor = (as: React.ElementType) => {
  let m = motionCache.get(as);
  if (!m) motionCache.set(as, (m = motion.create(as as React.ComponentType) as React.ElementType));
  return m;
};

function GradientText({ className, children, as: Component = "span", ...props }: GradientTextProps) {
  // cached motion type from motionFor (stable across renders), so createElement rather than a JSX tag
  return React.createElement(
    motionFor(Component),
    { className: cn("relative inline-flex overflow-hidden bg-white dark:bg-black", className), ...props },
    children,
      <span key="blobs" className="pointer-events-none absolute inset-0 mix-blend-lighten dark:mix-blend-darken">
        <span className="pointer-events-none absolute -top-1/2 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-1_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-1))] mix-blend-overlay blur-[1rem]"></span>
        <span className="pointer-events-none absolute right-0 top-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-2_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-2))] mix-blend-overlay blur-[1rem]"></span>
        <span className="pointer-events-none absolute bottom-0 left-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-3_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-3))] mix-blend-overlay blur-[1rem]"></span>
        <span className="pointer-events-none absolute -bottom-1/2 right-0 h-[30vw] w-[30vw] animate-[gradient-border_6s_ease-in-out_infinite,gradient-4_12s_ease-in-out_infinite_alternate] bg-[hsl(var(--color-4))] mix-blend-overlay blur-[1rem]"></span>
      </span>,
  );
}

export { GradientText };
