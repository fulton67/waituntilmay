"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import "./JourneyPlayer.css";

type Manifest = { files: string[] };

// Where the rendered versions live. Override with NEXT_PUBLIC_JOURNEY_BASE
// to point at Blob/CDN storage instead of the static /public folder.
const BASE = process.env.NEXT_PUBLIC_JOURNEY_BASE ?? "/journey";

// The live manifest sits on Blob so a newly rendered version is in rotation
// as soon as it is uploaded, with no deploy. It is written with a short
// max-age; the videos it points at are immutable and cached for a year.
const LIVE_MANIFEST = process.env.NEXT_PUBLIC_JOURNEY_MANIFEST
  ?? "https://6gou1uitbmkd2uvc.public.blob.vercel-storage.com/journey-v2/manifest.json";

/** Resolve once the element can render a frame; never hang forever. */
function whenReady(v: HTMLVideoElement, timeoutMs = 8000): Promise<void> {
  if (v.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      v.removeEventListener("loadeddata", done);
      v.removeEventListener("canplay", done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    v.addEventListener("loadeddata", done, { once: true });
    v.addEventListener("canplay", done, { once: true });
  });
}

export default function JourneyPlayer() {
  const [files, setFiles] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // Two elements so the next version is already buffered when the current one
  // ends; swapping between them makes the cut immediate rather than a stall.
  const videoA = useRef<HTMLVideoElement | null>(null);
  const videoB = useRef<HTMLVideoElement | null>(null);
  const [front, setFront] = useState<"a" | "b">("a");

  const lastIndex = useRef<number>(-1);

  const pickNext = useCallback(() => {
    if (files.length === 0) return "";
    if (files.length === 1) return files[0];
    let i = lastIndex.current;
    // never the same twice in a row
    while (i === lastIndex.current) {
      i = Math.floor(Math.random() * files.length);
    }
    lastIndex.current = i;
    return files[i];
  }, [files]);

  useEffect(() => {
    let alive = true;
    const load = async (url: string) => {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      const m = (await r.json()) as Manifest;
      const list = (m.files ?? []).filter(Boolean);
      if (list.length === 0) throw new Error("manifest is empty");
      return list;
    };
    // the live manifest grows without a deploy; the bundled one is the
    // fallback, so the piece never goes dark because Blob is unreachable
    load(LIVE_MANIFEST)
      .catch(() => load(`${BASE}/manifest.json`))
      .then((list) => alive && setFiles(list))
      .catch((e) => alive && setFailed(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  // Manifest entries are either bare filenames (served from BASE) or absolute
  // URLs (Blob/CDN). Supporting both means switching hosts is a manifest
  // change, never a code change.
  const srcFor = (name: string) =>
    /^https?:\/\//i.test(name) ? name : `${BASE}/${name}`;

  const start = useCallback(async () => {
    if (files.length === 0) return;
    const a = videoA.current;
    const b = videoB.current;
    if (!a || !b) return;

    a.src = srcFor(pickNext());
    b.src = srcFor(pickNext());
    a.muted = false;
    b.muted = false;
    a.load();
    b.load();

    // play() on an element that has not begun loading can stay pending
    // indefinitely, which would leave the viewer on a dead start screen.
    // Wait for the first frame to be decodable before asking it to play.
    await whenReady(a);
    try {
      await a.play();
      setStarted(true);
    } catch {
      // Some browsers still refuse sound on the first gesture; fall back to a
      // muted start rather than showing the viewer a dead page.
      a.muted = true;
      try {
        await a.play();
        setStarted(true);
      } catch {
        setFailed("playback blocked by the browser");
      }
    }
  }, [files, pickNext]);

  // when one ends, show the other (already buffered) and queue a new one behind
  useEffect(() => {
    const a = videoA.current;
    const b = videoB.current;
    if (!a || !b || !started) return;

    const advance = (finished: HTMLVideoElement, next: HTMLVideoElement,
                     nextSide: "a" | "b") => async () => {
      // the next one has been buffering for 30s, but never assume it
      await whenReady(next);
      next.currentTime = 0;
      setFront(nextSide);
      void next.play().catch(() => {});
      // reload the one that just finished with a fresh pick
      finished.src = srcFor(pickNext());
      finished.load();
    };

    const onA = advance(a, b, "b");
    const onB = advance(b, a, "a");
    a.addEventListener("ended", onA);
    b.addEventListener("ended", onB);
    return () => {
      a.removeEventListener("ended", onA);
      b.removeEventListener("ended", onB);
    };
  }, [started, pickNext]);

  return (
    <main className="jrn">
      <figure className="jrn-figure">
        <div className="jrn-stage">
          <video
            ref={videoA}
            className={`jrn-video${started && front === "a" ? " is-front" : ""}`}
            playsInline
            preload="auto"
          />
          <video
            ref={videoB}
            className={`jrn-video${started && front === "b" ? " is-front" : ""}`}
            playsInline
            preload="auto"
          />
          {!started && (
            <button
              type="button"
              onClick={start}
              className="jrn-start"
              aria-label="Play"
              disabled={files.length === 0 && !failed}
            >
              {failed ? "" : files.length === 0 ? "" : "Play"}
            </button>
          )}
        </div>
        <figcaption className="jrn-caption">
          <span>Journey to the Center of the Internet</span>
          <span>after Andrew Blum, Talks at Google</span>
        </figcaption>
      </figure>
    </main>
  );
}
