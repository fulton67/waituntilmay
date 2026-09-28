'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * fomo intern crm — intro splash
 *
 * Plays once per session on first load: the official eyes animation turns
 * one way and back (baked into fomo-eyes-turn.webp, alpha, 59 frames @ 24fps),
 * the drawn wordmark and "intern crm" settle in beside it, then the whole
 * overlay fades out to reveal the app underneath.
 *
 * Drop the three files from public/anim/ into your public/ folder and render
 * <IntroSplash /> once, at the top of the CRM route's layout or page.
 */

const EYES_SRC = '/anim/fomo-eyes-turn.webp';
const WORDMARK_SRC = '/anim/fomo-wordmark-white.png';
const STORAGE_KEY = 'fomo-intro-seen';

// ms, measured from the moment the eyes start playing.
// The eyes clip itself is 2460ms (turn 1230ms, turn back 1230ms).
const T = {
  text: 2150, // wordmark + "intern crm" start settling in as the eyes come back
  fadeOut: 3700, // overlay starts fading
  unmount: 4200, // overlay removed
  giveUp: 4000, // if the eyes haven't loaded by now, skip the intro entirely
};

type Phase = 'idle' | 'eyes' | 'text' | 'out' | 'done';

export default function IntroSplash() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [eyesUrl, setEyesUrl] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  // Gate before first paint so repeat visits never flash the overlay.
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {}
    // Intentional: gate before first paint so repeat visits never flash the overlay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reduce || seen) setPhase('done');
  }, []);

  // Fetch the animation to a blob so it starts from frame 0 the instant it's rendered.
  useEffect(() => {
    if (phase !== 'idle') return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(EYES_SRC)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setEyesUrl(objectUrl);
      })
      .catch(() => setPhase('done'));

    const giveUp = window.setTimeout(() => {
      if (!started.current) setPhase('done');
    }, T.giveUp);

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      timers.current.forEach(window.clearTimeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (started.current) return;
    started.current = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setPhase('eyes');
    const at = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, ms));
    at(T.text, () => setPhase('text'));
    at(T.fadeOut, () => setPhase('out'));
    at(T.unmount, () => setPhase('done'));
  };

  if (phase === 'done') return null;

  const showText = phase === 'text' || phase === 'out';

  return (
    <div className="fomo-intro" data-phase={phase} aria-hidden="true">
      <style>{css}</style>
      <div className={`fomo-intro__lockup${showText ? ' is-text' : ''}`}>
        <div className="fomo-intro__brand">
          <div className="fomo-intro__eyes">
            {eyesUrl && (
              <img src={eyesUrl} alt="" draggable={false} onLoad={start} onError={() => setPhase('done')} />
            )}
          </div>
          <img className="fomo-intro__wordmark" src={WORDMARK_SRC} alt="fomo" draggable={false} />
        </div>
        <span className="fomo-intro__suffix">intern crm</span>
      </div>
    </div>
  );
}

/*
 * Sizing is driven by --e, the rendered height of the eyes mark.
 * Ratios come from the brand kit lockup: the wordmark is the same height as
 * the eyes, with a gap of 0.5× the eyes' height between them. The eyes canvas
 * has transparent padding, so the <img> is oversized and offset to put the
 * mark itself exactly in a 1.52e × 1e box.
 */
const css = `
.fomo-intro {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6vw;
  background: #221D4B;
  --e: clamp(40px, 6vw, 96px);
  opacity: 1;
  transition: opacity 450ms ease;
}
.fomo-intro[data-phase="out"] { opacity: 0; }

.fomo-intro__lockup {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  column-gap: calc(var(--e) * 0.36);
  row-gap: calc(var(--e) * 0.28);
}
.fomo-intro__brand {
  display: flex;
  align-items: center;
  gap: calc(var(--e) * 0.5);
  flex: none;
}
.fomo-intro__eyes {
  position: relative;
  width: calc(var(--e) * 1.523);
  height: var(--e);
  flex: none;
}
.fomo-intro__eyes img {
  position: absolute;
  width: calc(var(--e) * 2.006);
  height: calc(var(--e) * 2.006);
  max-width: none;
  left: calc(var(--e) * -0.273);
  top: calc(var(--e) * -0.502);
  user-select: none;
  -webkit-user-drag: none;
}
.fomo-intro__wordmark {
  display: block;
  height: calc(var(--e) * 1.02);
  width: auto;
  flex: none;
}
.fomo-intro__suffix {
  font-family: var(--font-crm), 'DM Sans', system-ui, -apple-system, sans-serif;
  font-weight: 500;
  font-size: calc(var(--e) * 1.34);
  line-height: 1;
  letter-spacing: -0.01em;
  color: #EAEDFF;
  white-space: nowrap;
}

.fomo-intro__wordmark,
.fomo-intro__suffix {
  opacity: 0;
  transform: translateY(calc(var(--e) * 0.1));
}
.is-text .fomo-intro__wordmark {
  animation: fomoIntroIn 480ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
.is-text .fomo-intro__suffix {
  animation: fomoIntroIn 480ms cubic-bezier(0.2, 0.7, 0.2, 1) 140ms forwards;
}
@keyframes fomoIntroIn {
  to { opacity: 1; transform: none; }
}
`;
