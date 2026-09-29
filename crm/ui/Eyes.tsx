"use client";

import { useEffect, useRef } from "react";
import { THEME_TURN_EVENT, useTheme } from "./store";

/** Sprite geometry: 28 frames, frame 0 looks right (light rest), frame 27 looks left (dark rest). */
const LAST = 27;
const RADIUS = 260; // px from the mark's centre within which the eyes follow the cursor
const REACH = 140; // horizontal offset that maps to a full look left/right
const STEP_MS = 26; // one frame per step — never jumps

const restFrame = () => (document.documentElement.getAttribute("data-theme") === "dark" ? LAST : 0);

/**
 * The rail's eyes mark. Click toggles the theme (and plays the prototype's .turn animation);
 * on pointer devices without reduced motion the eyes follow the cursor frame by frame.
 */
export function EyesMark() {
  const [, toggleTheme] = useTheme();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const track = !matchMedia("(prefers-reduced-motion: reduce)").matches && !matchMedia("(hover: none)").matches;

    let current = restFrame();
    let target = current;
    let pointer: { x: number; y: number } | null = null;
    let timer = 0;
    let turning = false;

    const write = () => el.style.setProperty("--eyes-pos", `${(current / LAST) * 100}%`);
    const frameFor = (p: { x: number; y: number } | null) => {
      if (!p) return restFrame();
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = p.x - cx;
      if (Math.hypot(dx, p.y - cy) > RADIUS) return restFrame();
      const clamped = Math.max(-REACH, Math.min(REACH, dx));
      // full right (+REACH) → 0, full left (−REACH) → 27, linear between
      return Math.round(((REACH - clamped) / (2 * REACH)) * LAST);
    };
    const step = () => {
      timer = 0;
      if (turning || current === target) return;
      current += current < target ? 1 : -1;
      write();
      timer = window.setTimeout(step, STEP_MS);
    };
    const retarget = () => {
      target = frameFor(pointer);
      if (!timer && !turning) timer = window.setTimeout(step, STEP_MS);
    };

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      retarget();
    };
    const onLeave = () => {
      pointer = null;
      retarget();
    };
    // Theme switch: play the prototype's turn (.turn, reversed for dark → light) and pause tracking.
    const onTurn = (e: Event) => {
      const next = (e as CustomEvent<"light" | "dark">).detail;
      turning = true;
      window.clearTimeout(timer);
      timer = 0;
      el.classList.remove("turn", "rev");
      void el.offsetWidth; // restart the animation even if the classes were just removed
      el.classList.add("turn");
      if (next === "light") el.classList.add("rev");
    };
    const onEnd = () => {
      el.classList.remove("turn", "rev");
      turning = false;
      current = restFrame();
      if (track) {
        write();
        target = frameFor(pointer);
        if (!timer) timer = window.setTimeout(step, STEP_MS);
      } else {
        el.style.removeProperty("--eyes-pos");
      }
    };

    window.addEventListener(THEME_TURN_EVENT, onTurn);
    el.addEventListener("animationend", onEnd);
    if (track) {
      write();
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(THEME_TURN_EVENT, onTurn);
      el.removeEventListener("animationend", onEnd);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <button ref={ref} type="button" className="mark logo" onClick={toggleTheme} aria-label="Switch theme" title="Switch theme" data-testid="eyes" />;
}
