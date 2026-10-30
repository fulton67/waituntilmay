"use client";
// Dylan Neustadter: the page around the Rolodex. Scroll drives the drum (BUILD.md); the styling follows
// the Felix Luke bible (channels/felixluke/BRAND-BIBLE.md, ed8a2ea). Rule numbers are cited where applied.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { Release } from "@/lib/gillenwebsite/discography";
import { rig, per, jumpTo, FLIP_DIR } from "./rig";
import { hue } from "./cardTexture";
import css from "./site.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const pad = (n: number) => String(n).padStart(2, "0");
const COOKIE = "alphabetOrdering"; // the cookie name viscosesyllabus.com uses for the same toggle (S6)

function readCookie(name: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}

const orderListeners = new Set<() => void>();
const subscribeOrder = (f: () => void) => { orderListeners.add(f); return () => { orderListeners.delete(f); }; };

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

function Face({ r, className }: { r: Release; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- 1024 px local JPEGs shown at 64 px; no resizing service needed
  if (r.cover) return <img className={className} src={r.cover} alt="" width={88} height={88} />;
  // same tinted placeholder as the card face
  const h = hue(r.artist + r.release);
  return (
    <div className={className} style={{ background: `hsl(${h} 12% 86%)`, color: `hsl(${h} 18% 34%)` }} aria-hidden>
      {r.release.toUpperCase()}
    </div>
  );
}

// caption thumbnail: the new cover crossfades in over the previous one
function Cover({ r }: { r: Release }) {
  const [pair, setPair] = useState<{ cur: Release; prev: Release | null }>({ cur: r, prev: null });
  if (pair.cur.id !== r.id) setPair({ cur: r, prev: pair.cur });
  return (
    <div className={css.thumbBox}>
      {pair.prev && <Face key={`p${pair.prev.id}`} r={pair.prev} className={css.thumb} />}
      <Face key={pair.cur.id} r={pair.cur} className={`${css.thumb} ${css.thumbIn}`} />
    </div>
  );
}

export default function Site({
  releases, about, mono, display, fontClass,
}: {
  releases: Release[];
  about: { text: string; instagram: string; contact: string };
  mono: string;
  display: string;
  fontClass: string;
}) {
  const N = releases.length;
  const flip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const [perPx, setPerPx] = useState(378);
  const [wide, setWide] = useState(true);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<number | null>(null);
  const counted = useCounted(front);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // stage sizing, scroll bookkeeping, phone/desktop switch
  useEffect(() => {
    rig.N = N;
    rig.flip = flip.current;
    rig.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mq = matchMedia("(min-width: 720px)");
    const size = () => { setPerPx(per()); rig.wide = mq.matches; setWide(mq.matches); };
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

  // S6: the order lives in a cookie, so it is restored on the next visit
  const order = useSyncExternalStore(
    subscribeOrder,
    () => (readCookie(COOKIE) === "alphabetical" ? "alphabetical" : "default"),
    () => "default"
  );
  const setOrdering = (o: "default" | "alphabetical") => {
    document.cookie = `${COOKIE}=${o}; path=/gillenwebsite; max-age=31536000; samesite=lax`;
    orderListeners.forEach((f) => f());
  };

  const open = useCallback((i: number) => { if (i >= 0 && i < N) setSheet(i); }, [N]);
  const close = useCallback(() => setSheet(null), []);
  useEffect(() => { if (sheet !== null) closeBtn.current?.focus(); }, [sheet]);

  // keyboard: arrows step cards, Enter opens the front card, Escape closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet !== null) { if (e.key === "Escape") close(); return; }
      if (!rig.flip || scrollY > rig.flip.offsetTop + (N - 1) * per() + innerHeight * 0.5) return;
      const i = Math.round(rig.s);
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "ArrowRight") { e.preventDefault(); jumpTo(Math.min(N - 1, i + 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); jumpTo(Math.max(0, i - 1)); }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") { e.preventDefault(); open(i); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [sheet, N, open, close]);

  // drag: on a card it flips (scrolls the page), anywhere else it turns the Rolodex; a click opens or jumps
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const moved = useRef(0);
  const hitCard = (e: React.PointerEvent) => {
    if (!rig.camera || !stage.current) return null;
    const b = stage.current.getBoundingClientRect();
    pointer.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(pointer, rig.camera);
    return ray.intersectObjects(rig.cards, true)[0] ?? null;
  };
  const onDown = (e: React.PointerEvent) => {
    rig.drag = { x: e.clientX, y: e.clientY, sy: scrollY, az: rig.az, el: rig.el, mode: e.pointerType === "mouse" && hitCard(e) ? "flip" : "orbit" };
    moved.current = 0;
    stage.current?.classList.add(css.dragging);
    stage.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = rig.drag;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    moved.current = Math.max(moved.current, Math.hypot(dx, dy));
    if (d.mode === "flip") scrollTo(0, d.sy - FLIP_DIR * dy * per() / 70); // the card surface follows the pointer
    else {
      rig.az = d.az - dx * 0.008;
      if (e.pointerType === "mouse") rig.el = Math.max(0.04, Math.min(1.2, d.el + dy * 0.005));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    stage.current?.classList.remove(css.dragging);
    const click = rig.drag && moved.current < 5;
    rig.drag = null;
    if (!click) return;
    const h = hitCard(e);
    if (!h) return;
    const i = h.object.userData.i as number;
    if (i >= N) return;
    if (i === Math.round(rig.s)) open(i); else jumpTo(i);
  };
  const onCancel = () => { stage.current?.classList.remove(css.dragging); rig.drag = null; };

  const r = releases[front];
  const years = useMemo(() => [...new Set(releases.map((x) => x.year))], [releases]);
  const az = useMemo(
    () => releases.map((x, i) => ({ x, i })).sort((a, b) => a.x.artist.localeCompare(b.x.artist) || a.x.year - b.x.year),
    [releases]
  );
  const row = (x: Release, i: number, showYear: boolean) => (
    <li key={x.id} className={css.row}>
      <span className={css.no}>{pad(i + 1)}</span>
      <button type="button" className={css.artist} onClick={() => jumpTo(i)}>{x.artist}</button>
      <span>{x.release}{x.tracks.length ? ` — ${x.tracks.map((t) => t.title).join(" / ")}` : ""}</span>
      <span>{showYear ? `${x.year} · ` : ""}{x.role.toUpperCase()}</span>
    </li>
  );
  const s = sheet === null ? null : releases[sheet];

  return (
    <div className={`${css.root} ${fontClass}`}>
      <header className={`${css.top} ${css.gut}`}>
        <a className={css.name} href="#flip">DYLAN NEUSTADTER</a>
        <nav className={css.nav}>
          <a href="#flip">DISCOGRAPHY</a>
          <a href="#about">ABOUT</a>
          <a href={about.instagram} target="_blank" rel="noopener">INSTAGRAM ↗</a>
        </nav>
      </header>

      <div id="flip" ref={flip} className={css.flip} style={{ height: `calc(100svh + ${(N - 1) * perPx}px)` }}>
        <div className={css.sticky}>
          <div
            ref={stage}
            className={css.stage}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
          >
            <Scene releases={releases} mono={mono} display={display} wide={wide} />
          </div>
          {!ready && <div className={css.loading}>LOADING THE ROLODEX</div>}
          <div className={`${css.cap} ${css.gut}`}>
            {!wide && r && (
              <div className={css.capMain}>
                <Cover r={r} />
                <div>
                  <div>{r.year}</div>
                  <h2 className={css.capArtist}>{r.artist.toUpperCase()}</h2>
                  <div>
                    {r.tracks.length === 1 && r.tracks[0].title !== r.release
                      ? `“${r.tracks[0].title}” — ${r.release}`
                      : r.tracks.length > 1 ? `${r.release} · ${r.tracks.length} tracks` : r.release}
                  </div>
                  <div>{r.role.toUpperCase()}</div>
                </div>
              </div>
            )}
            <div className={css.count}>
              <span>No. {pad(counted + 1)} / {pad(N)}</span>
              <span className={css.hint}>SCROLL TO FLIP · DRAG TO TURN · CLICK CARD</span>
            </div>
          </div>
        </div>
      </div>

      <section className={`${css.page} ${css.gut}`} id="about">
        <p className={css.label}>ABOUT</p>
        <div className={css.about}>
          <p className={css.label}>PRODUCER · WRITER · MIXER · MULTI-INSTRUMENTALIST</p>
          {/* verbatim from dylansproduce.net/about */}
          <p className={css.aboutText}>{about.text}</p>
        </div>
      </section>

      <section className={`${css.page} ${css.gut}`} id="credits">
        <div className={css.creditsHead}>
          <p className={css.label}>CREDITS, {years[years.length - 1]}–{years[0]}</p>
          {/* S6: re-order the list in place, saved in a cookie */}
          <div className={css.sort}>
            <button type="button" aria-pressed={order === "default"} onClick={() => setOrdering("default")}>
              [{order === "default" ? "→ " : ""}YEAR]
            </button>
            <button type="button" aria-pressed={order === "alphabetical"} onClick={() => setOrdering("alphabetical")}>
              [{order === "alphabetical" ? "→ " : ""}A–Z]
            </button>
          </div>
        </div>
        <div className={css.credits}>
          {order === "default"
            ? years.map((y) => (
                <div key={y} className={css.year}>
                  <h3>{y}</h3>
                  <ul>{releases.map((x, i) => (x.year === y ? row(x, i, false) : null))}</ul>
                </div>
              ))
            : <ul className={css.flat}>{az.map(({ x, i }) => row(x, i, true))}</ul>}
        </div>
      </section>

      <section className={`${css.page} ${css.gut} ${css.last}`}>
        <footer className={css.footer}>
          <span>DYLAN NEUSTADTER</span>
          <a href={about.instagram} target="_blank" rel="noopener">INSTAGRAM @DYLANNEU ↗</a>
          {about.contact && <a href={`mailto:${about.contact}`}>CONTACT</a>}
        </footer>
      </section>

      <aside className={`${css.sheet} ${s ? css.open : ""}`} aria-hidden={!s}>
        {s && sheet !== null && (
          <>
            <button ref={closeBtn} type="button" className={css.close} onClick={close}>[CLOSE]</button>
            <div>No. {pad(sheet + 1)} · {s.year}</div>
            <h3 className={css.sheetName}>{s.artist.toUpperCase()}</h3>
            <div className={css.meta}>
              <div>{s.release}</div>
              <div>{s.role.toUpperCase()}</div>
            </div>
            <ol className={css.tracks}>
              {(s.tracks.length ? s.tracks : [{ title: `${s.release} (full release)`, role: s.role }]).map((t, k) => (
                <li key={k}>
                  <span>{pad(k + 1)}</span>
                  <span>{t.title}</span>
                  <span className={css.trackRole}>{t.role.toUpperCase()}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}
