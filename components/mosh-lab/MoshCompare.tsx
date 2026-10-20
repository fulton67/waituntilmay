"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import "./mosh-compare.css";

interface Layer {
  key: string; label: string; video: string; mv: string;
  frames: number; duration: number; mb: number;
  width: number; height: number; fps: string;
}

/** one entry per source clip; the layers themselves come from Blob */
const CLIPS = [
  { name: "blum", label: "fibre clip", manifest: "/mosh-lab/blum-compare.json" },
  { name: "blum-internet", label: "internet clip", manifest: "/mosh-lab/blum-internet-compare.json" },
];
const DRIFT_FRAMES = 1;          // correct any layer more than a frame out

export default function MoshCompare() {
  const [clip, setClip] = useState(0);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showMv, setShowMv] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [drift, setDrift] = useState<Record<string, number>>({});
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    let live = true;
    setLayers([]); setErr(null); setPlaying(false); setT(0);
    fetch(CLIPS[clip].manifest, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json(); })
      .then((m) => { if (live) setLayers(m.layers ?? []); })
      .catch((e) => { if (live) setErr(String(e.message ?? e)); });
    return () => { live = false; };
  }, [clip]);

  // one master clock: the first layer. Everything else is corrected to it.
  useEffect(() => {
    if (!layers.length) return;
    const id = window.setInterval(() => {
      const master = refs.current[layers[0].key];
      if (!master) return;
      const now = master.currentTime;
      setT(now);
      const fps = parseFloat(layers[0].fps) || 30;
      const tol = DRIFT_FRAMES / fps;
      const d: Record<string, number> = {};
      for (const l of layers.slice(1)) {
        const v = refs.current[l.key];
        if (!v || v.readyState < 2) continue;
        const diff = v.currentTime - now;
        d[l.key] = diff * 1000;
        if (Math.abs(diff) > tol) v.currentTime = now;
      }
      setDrift(d);
    }, 250);
    return () => clearInterval(id);
  }, [layers]);

  const all = useCallback((fn: (v: HTMLVideoElement) => void) => {
    for (const l of layers) { const v = refs.current[l.key]; if (v) fn(v); }
  }, [layers]);

  const toggle = () => {
    if (playing) { all((v) => v.pause()); setPlaying(false); }
    else {
      const master = refs.current[layers[0]?.key];
      const now = master?.currentTime ?? 0;
      all((v) => { v.currentTime = now; void v.play().catch(() => {}); });
      setPlaying(true);
    }
  };

  const seek = (to: number) => all((v) => { v.currentTime = to; });

  const dur = layers[0]?.duration ?? 0;

  return (
    <main className="mc-root">
      <header className="mc-bar">
        <h1>mosh lab &middot; compare</h1>
        {CLIPS.map((c, i) => (
          <button key={c.name} onClick={() => setClip(i)} aria-pressed={i === clip}>
            {c.label}
          </button>
        ))}
        <button onClick={toggle}>{playing ? "pause" : "play all"}</button>
        <button onClick={() => setShowMv((v) => !v)} aria-pressed={showMv}>
          {showMv ? "showing motion vectors" : "show motion vectors"}
        </button>
        <input type="range" min={0} max={Math.max(dur, 0.01)} step={0.01}
          value={Math.min(t, dur)} onChange={(e) => seek(parseFloat(e.target.value))} />
        <span className="mc-time">{t.toFixed(2)} / {dur.toFixed(2)}s</span>
        <Link href="/mosh-lab">&larr; lab</Link>
      </header>

      {err && <p className="mc-err">could not load {CLIPS[clip].manifest}: {err}</p>}
      {!err && !layers.length && <p className="mc-err">loading layers&hellip;</p>}

      <div className="mc-grid">
        {layers.map((l) => (
          <figure key={`${CLIPS[clip].name}:${l.key}`} className="mc-cell">
            <video
              ref={(el) => { refs.current[l.key] = el; }}
              src={showMv ? l.mv : l.video}
              muted playsInline preload="auto"
            />
            <figcaption>
              <b>{l.label}</b>
              <span>{l.frames}f &middot; {l.duration.toFixed(3)}s &middot; {l.mb.toFixed(1)}MB</span>
              <span className="mc-drift">
                {l.key === layers[0].key
                  ? "master clock"
                  : `drift ${(drift[l.key] ?? 0).toFixed(0)}ms`}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
