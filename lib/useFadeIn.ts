"use client";

import { useRef, useEffect, useCallback } from "react";

// Uses a callback ref so opacity=0 / translateY(16px) are applied synchronously
// before the first browser paint — no flash of visible content.
export function useFadeIn(threshold = 0.12, delay = 0) {
  const nodeRef = useRef<HTMLElement | null>(null);

  const callbackRef = useCallback((el: HTMLElement | null) => {
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
    }
    nodeRef.current = el;
  }, []);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;
    el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, delay]);

  return callbackRef as unknown as React.RefObject<any>;
}
