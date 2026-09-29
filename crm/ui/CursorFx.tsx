"use client";

import { useEffect } from "react";

const MX = 35; // blob parallax range, px (±)
const MY = 25;
const LEAN = 7; // rail icon lean toward the cursor, px (max)
const EASE = 0.08; // lerp factor per frame for the blob parallax

/**
 * Cursor-driven ambience from the prototype:
 *  - --mx/--my on <html>: smoothed (lerp in rAF) offset the blob drift keyframes read
 *  - --px/--py on the hovered .card: position of its ::after spotlight
 *  - --tx/--ty on the hovered .rail button: its icon leans toward the cursor
 * Off under prefers-reduced-motion and on touch-only devices (hover: none).
 */
export function CursorFx() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
    const root = document.documentElement;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let card: HTMLElement | null = null;
    let railBtn: HTMLElement | null = null;

    const loop = () => {
      x += (tx - x) * EASE;
      y += (ty - y) * EASE;
      root.style.setProperty("--mx", `${x.toFixed(2)}px`);
      root.style.setProperty("--my", `${y.toFixed(2)}px`);
      raf = Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05 ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2 * MX;
      ty = (e.clientY / window.innerHeight - 0.5) * 2 * MY;
      if (!raf) raf = requestAnimationFrame(loop);

      const target = e.target instanceof Element ? e.target : null;
      const nextCard = (target?.closest("[data-crm] .card") as HTMLElement | null) ?? null;
      if (nextCard !== card) card = nextCard;
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--px", `${e.clientX - r.left}px`);
        card.style.setProperty("--py", `${e.clientY - r.top}px`);
      }

      const nextBtn = (target?.closest("[data-crm] .rail button") as HTMLElement | null) ?? null;
      if (nextBtn !== railBtn) {
        railBtn?.style.removeProperty("--tx");
        railBtn?.style.removeProperty("--ty");
        railBtn = nextBtn;
      }
      if (railBtn) {
        const r = railBtn.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        railBtn.style.setProperty("--tx", `${(nx * LEAN).toFixed(2)}px`);
        railBtn.style.setProperty("--ty", `${(ny * LEAN).toFixed(2)}px`);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, []);
  return null;
}
