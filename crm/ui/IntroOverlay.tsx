"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { INTRO_SEEN_KEY } from "./intro";

/** The official fomo eyes-turn animation (VP9 with alpha, 2.5s). */
const SRC = "/anim/fomo-eyes-turn.webm";
const MAX_MS = 1400; // JS cap; CSS also fades the overlay out by 1.4s after first paint (limit 1.5s)
const RATE = 2.5 / (MAX_MS / 1000); // play the whole turn-and-back inside the cap
const FADE_MS = 250;

function shouldSkip() {
  try {
    return !!sessionStorage.getItem(INTRO_SEEN_KEY) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Once per session, the fomo eyes turn over the navy field for at most 1.5s, then fade into the
 * app. Click or press any key to skip. Mounted only in the interviewer layout, so it never plays
 * on /crm/me or the sign-in page; skipped entirely under prefers-reduced-motion (the pre-paint
 * script in the CRM layout hides it before first paint on repeat visits).
 */
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
      // Decide before paint so a skipped intro never flashes.
      setPhase("done");
      return;
    }
    const video = videoRef.current;
    if (!video || video.error || video.ended) return finish();
    video.playbackRate = RATE;
    video.play().catch(finish);
    const timer = setTimeout(finish, MAX_MS);
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
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
      role="button"
      tabIndex={-1}
      aria-label="Skip intro"
      onClick={finish}
      className="fixed inset-0 z-[100] grid cursor-pointer place-items-center bg-[#221D4B]"
      style={{ opacity: phase === "fading" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-out` }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        src={SRC}
        onLoadedMetadata={(e) => (e.currentTarget.playbackRate = RATE)}
        onEnded={finish}
        onError={finish}
        style={{ width: "min(46vw, 320px)", height: "auto" }}
      />
    </div>
  );
}
