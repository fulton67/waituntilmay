"use client";
// Dylan Neustadter, home: the Rolodex, the release display beside it, and the cover strip under both. Scroll
// drives the drum (BUILD.md). Every component names its row in docs/gillenwebsite/SOURCES.md.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, per, jumpTo, scrollPos, FLIP_DIR } from "./rig";
import { usePanel } from "./Chrome";
import ReleaseView from "./ReleaseView";
import { stripPx } from "./Strip";
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
      const W = innerWidth, H = innerHeight, band = stripPx(mq.matches).band;
      // desktop: the drum in the left column, between the header and the strip; phones: the upper half
      rig.view = mq.matches ? { x: Math.min(300, W * 0.2), y: 56 + (H - band - 56) * 0.5 } : { x: W / 2, y: 64 + (H - band - 64) * 0.36 };
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

  // keyboard: arrows step cards, Enter opens the front card in the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog]")) return;
      if (!rig.flip || scrollY > rig.flip.offsetTop + (N - 1) * per() + innerHeight * 0.5) return;
      const i = Math.round(rig.s);
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "ArrowRight") { e.preventDefault(); jumpTo(Math.min(N - 1, i + 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); jumpTo(Math.max(0, i - 1)); }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") { e.preventDefault(); open(i); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [N, open]);

  // pointer: in the strip band a drag spins the strip (by scrolling the page, so the Rolodex follows) and a
  // click picks a cover; on a card a drag flips it; anywhere else a drag turns the Rolodex.
  // SOURCES #17: the 5 px click/drag threshold and the grab / grabbing / pointer cursors are luckydaye.com's.
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const moved = useRef(0);
  const ndc = (e: React.PointerEvent) => {
    const b = stage.current!.getBoundingClientRect();
    pointer.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
  };
  const inStrip = (e: React.PointerEvent) => {
    const b = stage.current!.getBoundingClientRect();
    return e.clientY > b.bottom - stripPx(rig.wide).band;
  };
  const hitCard = (e: React.PointerEvent) => {
    if (!rig.camera || !stage.current) return null;
    ndc(e);
    ray.setFromCamera(pointer, rig.camera);
    return ray.intersectObjects(rig.cards, true)[0] ?? null;
  };
  const hitStrip = (e: React.PointerEvent) => {
    const st = rig.strip;
    if (!st?.camera || !stage.current) return null;
    ndc(e);
    ray.setFromCamera(pointer, st.camera);
    return ray.intersectObjects([...st.meshes, ...st.labels].filter((m) => m.parent?.visible), false)[0] ?? null;
  };
  const onDown = (e: React.PointerEvent) => {
    const mode = inStrip(e) ? "strip" : e.pointerType === "mouse" && hitCard(e) ? "flip" : "orbit";
    rig.drag = { x: e.clientX, y: e.clientY, sy: scrollY, az: rig.az, el: rig.el, mode };
    moved.current = 0;
    stage.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = rig.drag;
    if (!d) {
      if (stage.current) stage.current.style.cursor = inStrip(e) ? (hitStrip(e) ? "pointer" : "grab") : "";
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    moved.current = Math.max(moved.current, Math.hypot(dx, dy));
    if (moved.current > 5) stage.current?.classList.add(css.dragging);
    if (d.mode === "strip") {
      // a drag of one pitch moves one release: the strip follows the pointer, the Rolodex follows the strip
      if (moved.current > 5) scrollTo(0, d.sy - (dx * per()) / (rig.strip?.pitch ?? 300));
    } else if (d.mode === "flip") scrollTo(0, d.sy - FLIP_DIR * dy * per() / 70); // the card surface follows the pointer
    else {
      rig.az = d.az - dx * 0.008;
      if (e.pointerType === "mouse") rig.el = Math.max(0.04, Math.min(1.2, d.el + dy * 0.005));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    stage.current?.classList.remove(css.dragging);
    const d = rig.drag, click = d && moved.current <= 5;
    rig.drag = null;
    if (!d) return;
    if (d.mode === "strip") {
      if (click) { const h = hitStrip(e); if (h) jumpTo(h.object.userData.i as number); }
      else jumpTo(Math.max(0, Math.min(N - 1, Math.round(scrollPos())))); // one cover snaps to the centre
      return;
    }
    if (!click) return;
    const h = hitCard(e);
    if (!h) return;
    const i = h.object.userData.i as number;
    if (i >= N) return;
    if (i === Math.round(rig.s)) open(i); else jumpTo(i);
  };
  const onCancel = () => { stage.current?.classList.remove(css.dragging); rig.drag = null; };

  const step = useCallback((k: number) => jumpTo(Math.max(0, Math.min(N - 1, Math.round(scrollPos()) + k))), [N]);
  const r = releases[front];

  return (
    <div id="flip" ref={flip} className={css.flip} data-src="11" style={{ height: `calc(100svh + ${(N - 1) * perPx}px)` }}>
      <div className={css.sticky}>
        {/* SOURCES #11 felixluke.com: the renderer fills the stage; DOM layers sit over it (06485f2817250046.js:90) */}
        <div
          ref={stage}
          className={css.stage}
          data-src="11 17 18"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <Scene releases={releases} mono={mono} />
        </div>

        {/* SOURCES #06 felixluke.com loading label */}
        <p className={css.loadingLabel} data-src="06" aria-live="polite">{ready && loaded ? "Loaded" : "Loading..."}</p>

        {/* SOURCES #12: the release display beside the Rolodex, on desktop; on phones the panel opens on tap */}
        {wide && r && (
          <div className={css.inlineSlot} data-src="12">
            <ReleaseView releases={releases} i={front} mode="inline" onPrev={() => step(-1)} onNext={() => step(1)} />
          </div>
        )}

        <div className={css.cap}>
          {!wide && r && (
            <button type="button" className={css.capMain} data-src="12" onClick={() => open(front)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 512 copy shown at 64 px */}
              {r.cover && <img className={css.thumb} src={coverAt(r, 512)} alt="" width={64} height={64} />}
              <span>
                <span className={css.capArtist}>{r.artist}</span>
                <span>{r.release} [{r.year}]</span>
                <span>{caps(r.role)}</span>
              </span>
            </button>
          )}
          {/* SOURCES #09 viscosesyllabus.com "001." index numbers; SOURCES #29 the screensaver counts down in the same slot */}
          <div className={css.count} data-src="09">
            {saver !== null && saver > 0
              ? <span className={css.countdown} data-src="29">{String(saver).padStart(2, "0")}</span>
              : <span>{no3(counted + 1)} / {no3(N)}</span>}
            {/* SOURCES #10 woodrowcommunications.com M5: typed capitals as labels */}
            <span className={css.hint} data-src="10">SCROLL TO FLIP · DRAG TO TURN · DRAG THE STRIP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
