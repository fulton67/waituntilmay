"use client";
// Dylan Neustadter, home: the Rolodex, the release display beside it, and the caption block under the drum.
// Scroll drives the drum (BUILD.md). Every component names its row in docs/gillenwebsite/SOURCES.md.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, per, jumpTo, flick, scrollPos, scrollToCard, FLIP_DIR, DRAG_PX } from "./rig";
import { usePanel } from "./Chrome";
import ReleaseView from "./ReleaseView";
import { no3, coverAt, caps } from "./shared";
import css from "./site.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

// T2: time is counted, not eased. The index steps through every number between the old card and the new one.
function useCounted(target: number) {
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (shown === target) return;
    const id = setTimeout(() => setShown((s) => s + Math.sign(target - s)), rig.reduce ? 0 : 40);
    return () => clearTimeout(id);
  }, [shown, target]);
  return shown;
}

// SOURCES #29, ad93.ltd S12 (67db9042bba8379f.js:36, 87): after 20 s with no mousemove, keydown, mousedown,
// touchstart or scroll, count down from 10, one step per 1000 ms, then turn through the releases by themselves
// until any of those events.
function useScreensaver(N: number) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout>, interval: ReturnType<typeof setInterval> | undefined, auto: ReturnType<typeof setInterval> | undefined;
    let running = false;
    const stop = () => {
      clearInterval(interval); clearInterval(auto);
      interval = auto = undefined;
      running = false;
      setCount(null);
    };
    const onIdle = () => {
      running = true;
      let timer = 9;
      setCount(10);
      interval = setInterval(() => {
        setCount(timer);
        if (--timer < 0) {
          clearInterval(interval);
          setCount(0);
          auto = setInterval(() => jumpTo((Math.round(scrollPos()) + 1) % N), 2000);
        }
      }, 1000);
    };
    const arm = () => { clearTimeout(idle); idle = setTimeout(onIdle, 20000); };
    // the screensaver's own scrolling must not wake it, so once it runs only direct input stops it
    const wake = (e: Event) => {
      if (running && e.type === "scroll") return;
      if (running) stop();
      arm();
    };
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "wheel"];
    events.forEach((ev) => addEventListener(ev, wake, { passive: true }));
    arm();
    return () => { clearTimeout(idle); stop(); events.forEach((ev) => removeEventListener(ev, wake)); };
  }, [N]);
  return count;
}

// SOURCES #17: the caption block. A swipe or drag up on it goes to the next release and down goes back, one per
// gesture; a move under luckydaye.com's 5 px threshold is a click, and 24 px commits the swipe. The drum's ratchet
// is the detent. It shares the Rolodex's index: the block follows rig.front, and a swipe scrolls the page. On a
// change the old block slides out and the new one in over 320 ms on the About reveal's ease curve (SOURCES #19),
// upwards for the next release and downwards for the one before. A tap on the thumbnail opens the large-cover panel.
function Caption({ releases, front, onStep, onOpen, children }: { releases: Release[]; front: number; onStep: (k: number) => void; onOpen: (i: number) => void; children: React.ReactNode }) {
  const [pair, setPair] = useState<{ cur: number; prev: number | null }>({ cur: front, prev: null });
  if (pair.cur !== front) setPair({ cur: front, prev: pair.cur });
  const dir = pair.prev !== null && pair.prev > pair.cur ? "Down" : "Up";
  const g = useRef<{ y: number; id: number; dy: number } | null>(null);
  const stack = useRef<HTMLDivElement>(null);
  const item = (i: number, cls: string, onEnd?: () => void) => {
    const r = releases[i];
    return (
      <div key={(onEnd ? "out" : "in") + i} className={css.capItem + " " + cls} onAnimationEnd={onEnd} data-release={r.id}>
        <button
          type="button"
          className={css.capThumb}
          data-src="12"
          aria-label={"Open " + r.artist + ", " + r.release}
          onClick={() => { if (!g.current || Math.abs(g.current.dy) <= 5) onOpen(i); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 512 copy shown at 64 px */}
          {r.cover ? <img className={css.thumb} src={coverAt(r, 512)} alt="" width={64} height={64} draggable={false} /> : <span className={css.thumb} />}
        </button>
        <span className={css.capText}>
          <span className={css.capArtist}>{r.artist}</span>
          <span>{r.release} [{r.year}]</span>
          <span>{caps(r.role)}</span>
        </span>
      </div>
    );
  };
  const lean = (px: number) => { if (stack.current) stack.current.style.transform = px ? "translateY(" + px + "px)" : ""; };
  return (
    <div
      className={css.cap}
      data-src="17"
      onPointerDown={(e) => { g.current = { y: e.clientY, id: e.pointerId, dy: 0 }; }}
      onPointerMove={(e) => {
        const s = g.current;
        if (!s || s.id !== e.pointerId) return;
        s.dy = e.clientY - s.y;
        // past 5 px it is a swipe: capture the pointer (only now, so a click still reaches the thumbnail) and lean
        // the block a third of the way with it, up to 24 px, until the swipe commits
        if (Math.abs(s.dy) > 5) {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
          lean(Math.max(-24, Math.min(24, s.dy / 3)));
        }
      }}
      onPointerUp={() => {
        const s = g.current;
        lean(0);
        if (!s) return;
        if (Math.abs(s.dy) >= 24) onStep(s.dy < 0 ? 1 : -1);
        // the thumbnail's click fires after pointerup and reads g.current, so it is cleared on the next tick
        setTimeout(() => { if (g.current === s) g.current = null; }, 0);
      }}
      onPointerCancel={() => { g.current = null; lean(0); }}
    >
      <div className={css.capClip}>
        <div ref={stack} className={css.capStack}>
          {pair.prev !== null && pair.prev !== pair.cur && item(pair.prev, css["capOut" + dir], () => setPair((p) => ({ ...p, prev: null })))}
          {item(pair.cur, pair.prev !== null ? css["capIn" + dir] : "")}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Site({ releases, mono }: { releases: Release[]; mono: string }) {
  const N = releases.length;
  const flip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { open } = usePanel();
  const [front, setFront] = useState(0);
  const [perPx, setPerPx] = useState(378);
  const [wide, setWide] = useState(true);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const counted = useCounted(front);
  const saver = useScreensaver(N);

  // stage sizing, where the drum is drawn, scroll bookkeeping, phone/desktop switch
  useEffect(() => {
    rig.N = N;
    rig.flip = flip.current;
    rig.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = matchMedia("(min-width: 720px)");
    const size = () => {
      setPerPx(per());
      rig.wide = mq.matches;
      setWide(mq.matches);
    };
    size();
    const onScroll = () => { rig.lastScroll = performance.now(); };
    addEventListener("resize", size);
    mq.addEventListener("change", size);
    addEventListener("scroll", onScroll, { passive: true });
    const onFront = (i: number) => setFront(i);
    rig.onFront.add(onFront);
    const poll = setInterval(() => { if (rig.ready) { setReady(true); clearInterval(poll); } }, 100);
    return () => {
      removeEventListener("resize", size);
      mq.removeEventListener("change", size);
      removeEventListener("scroll", onScroll);
      rig.onFront.delete(onFront);
      clearInterval(poll);
    };
  }, [N]);

  // SOURCES #06, felixluke.com S8 (06485f2817250046.js:311): "Loading..." until the drum is up, "Loaded" from
  // 2000 ms after DOMContentLoaded
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), Math.max(0, 2000 - performance.now()));
    return () => clearTimeout(t);
  }, []);

  // keyboard: arrows step one card and repeat at 8 cards/s while held; Enter opens the front card in the panel
  useEffect(() => {
    let held: { key: string; id: number } | null = null;
    const inFlip = () => !!rig.flip && scrollY <= rig.flip.offsetTop + (N - 1) * per() + innerHeight * 0.5;
    // step from where the drum is heading (the scroll), not where the spring has got to, so held keys never lose a step
    const arrow = (key: string) => { const i = Math.round(rig.fling ? rig.fling.to : scrollPos()) + (key === "ArrowRight" ? 1 : -1); jumpTo(Math.max(0, Math.min(N - 1, i))); };
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog]") || !inFlip()) return;
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.repeat || held?.key === e.key) return; // the repeat is ours, not the OS's
        if (held) clearInterval(held.id);
        arrow(e.key);
        held = { key: e.key, id: window.setInterval(() => arrow(e.key), 125) };
      }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") { e.preventDefault(); open(Math.round(rig.s)); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (held?.key === e.key) { clearInterval(held.id); held = null; } };
    const stop = () => { if (held) { clearInterval(held.id); held = null; } };
    // a mouse wheel notch (about 100 px deltaY, or a line/page delta) is one card; trackpads scroll natively at per()
    const onWheel = (e: WheelEvent) => {
      if (!inFlip() || e.ctrlKey || document.querySelector("[role=dialog]")) return;
      const notch = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (!notch) return;
      const k = Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaMode !== 0 ? 100 : e.deltaY) / 100));
      const base = rig.fling !== null ? Math.round(rig.s) : Math.round(scrollPos());
      const i = base + k * FLIP_DIR;
      if (i < 0 || i > N - 1) return; // past either end the page scrolls on
      e.preventDefault();
      jumpTo(i);
    };
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKeyUp);
    addEventListener("blur", stop);
    addEventListener("wheel", onWheel, { passive: false });
    return () => { stop(); removeEventListener("keydown", onKey); removeEventListener("keyup", onKeyUp); removeEventListener("blur", stop); removeEventListener("wheel", onWheel); };
  }, [N, open]);

  // pointer: on a card a drag flips it, DRAG_PX per card, 1:1 under the pointer; anywhere else a drag turns the
  // Rolodex. On touch the cards' hit area (rig.hit, touch-action: none) takes the drag; the rest of the stage
  // still scrolls the page vertically. A release faster than 0.4 px/ms (over the last 80 ms) coasts as a flick (rig.ts).
  // SOURCES #17: the 5 px click/drag threshold and the grab / grabbing cursors are luckydaye.com's.
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const hit = useRef<HTMLDivElement>(null);
  const moved = useRef(0);
  const trail = useRef<{ t: number; y: number }[]>([]);
  const stopped = useRef(false);
  useEffect(() => { rig.hit = hit.current; return () => { rig.hit = null; }; }, []);
  const hitCard = (e: React.PointerEvent) => {
    if (!rig.camera || !stage.current) return null;
    const b = stage.current.getBoundingClientRect();
    pointer.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(pointer, rig.camera);
    return ray.intersectObjects(rig.cards, true)[0] ?? null;
  };
  const onDown = (e: React.PointerEvent) => {
    // a tap while a flick coasts stops it on the nearest card
    stopped.current = rig.fling !== null;
    if (stopped.current) jumpTo(Math.round(rig.s));
    const onCards = e.pointerType === "mouse" ? !!hitCard(e) : e.target === hit.current;
    const mode = onCards ? "flip" : "orbit";
    rig.drag = { x: e.clientX, y: e.clientY, sy: rig.flip ? rig.flip.offsetTop + scrollPos() * per() : scrollY, az: rig.az, el: rig.el, mode };
    moved.current = 0;
    trail.current = [{ t: e.timeStamp, y: e.clientY }];
    stage.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = rig.drag;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    moved.current = Math.max(moved.current, Math.hypot(dx, dy));
    if (moved.current > 5) stage.current?.classList.add(css.dragging);
    if (d.mode === "flip") {
      // the card surface follows the pointer: DRAG_PX of pointer is one card
      if (rig.flip) scrollToCard(Math.max(0, Math.min(N - 1, (d.sy - rig.flip.offsetTop) / per() - (FLIP_DIR * dy) / DRAG_PX)));
      rig.moveT = performance.now();
      trail.current.push({ t: e.timeStamp, y: e.clientY });
      while (trail.current.length > 2 && e.timeStamp - trail.current[0].t > 80) trail.current.shift();
    } else {
      rig.az = d.az - dx * 0.008;
      if (e.pointerType === "mouse") rig.el = Math.max(0.04, Math.min(1.2, d.el + dy * 0.005));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    stage.current?.classList.remove(css.dragging);
    const d = rig.drag, click = d && moved.current <= 5;
    rig.drag = null;
    if (d?.mode === "flip" && !click) {
      const tr = trail.current, a = tr[0], b = tr[tr.length - 1], dt = b.t - a.t;
      const vy = dt > 0 && e.timeStamp - b.t < 80 ? (b.y - a.y) / dt : 0; // px/ms over the last 80 ms
      if (Math.abs(vy) > 0.4 && !rig.reduce) flick(scrollPos(), -FLIP_DIR * Math.sign(vy), Math.abs(vy));
      // otherwise the detent settles it, 160 ms after the last move
      return;
    }
    if (!d || !click || stopped.current) return;
    const h = hitCard(e);
    if (!h) return;
    const i = h.object.userData.i as number;
    if (i >= N) return;
    if (i === Math.round(rig.s)) open(i); else jumpTo(i);
  };
  const onCancel = () => { stage.current?.classList.remove(css.dragging); rig.drag = null; };

  // one release per swipe or arrow: while a smooth scroll is still running, step from where it is heading
  const last = useRef({ t: 0, i: 0 });
  const step = useCallback((k: number) => {
    const base = performance.now() - last.current.t < 700 ? last.current.i : Math.round(scrollPos());
    const i = Math.max(0, Math.min(N - 1, base + k));
    last.current = { t: performance.now(), i };
    jumpTo(i);
  }, [N]);
  const r = releases[front];

  return (
    <div id="flip" ref={flip} className={css.flip} data-src="11" style={{ height: `calc(100svh + ${(N - 1) * perPx}px)` }}>
      <div className={css.sticky}>
        {/* SOURCES #11 felixluke.com: the renderer fills the stage; DOM layers sit over it (06485f2817250046.js:90) */}
        <div
          ref={stage}
          className={css.stage}
          data-src="11 17"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <Scene releases={releases} mono={mono} />
          <div ref={hit} className={css.hit} aria-hidden />
        </div>

        {/* SOURCES #06 felixluke.com loading label */}
        <p className={css.loadingLabel} data-src="06" aria-live="polite">{ready && loaded ? "Loaded" : "Loading..."}</p>

        {/* SOURCES #12: the release display beside the Rolodex, on desktop; on phones the panel opens on tap */}
        {wide && r && (
          <div className={css.inlineSlot} data-src="12">
            <ReleaseView releases={releases} i={front} mode="inline" onPrev={() => step(-1)} onNext={() => step(1)} />
          </div>
        )}

        <Caption releases={releases} front={front} onStep={step} onOpen={open}>
          {/* SOURCES #09 viscosesyllabus.com "001." index numbers; SOURCES #29 the screensaver counts down in the same slot */}
          <div className={css.count} data-src="09">
            {saver !== null && saver > 0
              ? <span className={css.countdown} data-src="29">{String(saver).padStart(2, "0")}</span>
              : <span>{no3(counted + 1)} / {no3(N)}</span>}
            {/* SOURCES #10 woodrowcommunications.com M5: typed capitals as labels */}
            <span className={css.hint} data-src="10">SCROLL TO FLIP · DRAG TO TURN · SWIPE THE CAPTION</span>
          </div>
        </Caption>
      </div>
    </div>
  );
}
