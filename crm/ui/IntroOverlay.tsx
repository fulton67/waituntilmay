"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INTRO_SEEN_KEY } from "./intro";

const FADE_MS = 400;
// Safety net for a video that neither ends nor errors (autoplay blocked, stalled network).
const MAX_MS = 8000;

function shouldSkip() {
  try {
    return !!sessionStorage.getItem(INTRO_SEEN_KEY) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 4s logo sting over the CRM on the first load of a session; fades into the app when it ends. */
export function IntroOverlay() {
  const [phase, setPhase] = useState<"playing" | "fading" | "done">("playing");
  const videoRef = useRef<HTMLVideoElement>(null);
  // Decided once: StrictMode re-runs effects, and the second run would otherwise see our own seen-flag.
  const skip = useRef<boolean | null>(null);

  const finish = () => setPhase((p) => (p === "playing" ? "fading" : p));

  // Layout effect so a skipped intro unmounts before paint on client navigation too.
  useLayoutEffect(() => {
    if (skip.current === null) {
      skip.current = shouldSkip();
      if (!skip.current) {
        try {
          sessionStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {}
      }
    }
    if (skip.current) {
      setPhase("done");
      return;
    }
    const video = videoRef.current;
    // ended/error can fire before hydration attaches handlers; catch those here.
    if (!video || video.error || video.ended) return finish();
    video.play().catch(finish);
    const timer = setTimeout(finish, MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "fading") return;
    const timer = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      data-crm-intro-overlay
      aria-hidden
      className="fixed inset-0 z-[100] bg-[#221D4B]"
      style={{ opacity: phase === "fading" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-out` }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        src="/anim/fomo-intro.mp4"
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
