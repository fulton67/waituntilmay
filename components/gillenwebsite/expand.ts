// The discography's covers, expanding in place (Discography.tsx, desktop only). The hovered row's cover grows from its
// 20 px slice to the whole cover at 60% of the viewport height, over its neighbours, 180 ms in and 220 ms out.
// A grown cover is a layer of its own over the list (pointer-events: none, so the rows under it still take the
// hover), made when the row grows and removed once it has shrunk back. Its box is the whole cover at its open
// place; collapsed, a transform squeezes it onto the slice exactly, and the image inside is counter-scaled so it
// never stretches: what shows is the slice's middle strip opening out to the square. Every frame of the motion is
// baked into the keyframes with its easing, so it runs on the compositor: transform only.
import type { Release } from "@/lib/gillenwebsite/discography";
import { coverFile, coverWidth } from "./shared";

export const IN_MS = 180, OUT_MS = 220;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Geo = { sx: number; sy: number; sw: number; sh: number; lx: number; ty: number; S: number };
type Layer = { el: HTMLElement; img: HTMLImageElement; geo: Geo; anims: Animation[]; from: number; to: number; t0: number; ms: number; delay: number; big: string | null };

// keyframes from e0 to e1 (0 the slice, 1 the open cover), sampled with the easing baked in
function frames(g: Geo, e0: number, e1: number, n = 16) {
  const clip: Keyframe[] = [], img: Keyframe[] = [];
  for (let k = 0; k <= n; k++) {
    const e = e0 + (e1 - e0) * easeOut(k / n);
    const w = g.sw + (g.S - g.sw) * e, h = g.sh + (g.S - g.sh) * e;
    clip.push({ transform: `translate(${(g.sx - g.lx) * (1 - e)}px, ${(g.sy - g.ty) * (1 - e)}px) scale(${w / g.S}, ${h / g.S})` });
    img.push({ transform: `scaleY(${w / h})` });
  }
  return { clip, img };
}

// onLog gets each whole grow or shrink: ms from the call to the end, motionMs from the animation's actual start
// (once the compositor has it) to its end, and the start latency
export type ExpandLog = { id: string; dir: "in" | "out"; ms: number; motionMs: number; latencyMs: number };
export function makeExpander(list: HTMLElement, releases: Release[], onLog?: (x: ExpandLog) => void) {
  const layers = new Map<string, Layer>();
  const box = document.createElement("div");
  box.setAttribute("data-exp-layers", "");
  box.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:30";
  list.appendChild(box);

  // where the shape is now, between 0 and 1
  const now = (L: Layer) => {
    const f = Math.min(1, Math.max(0, performance.now() - L.t0 - L.delay) / (L.ms || 1));
    return L.from + (L.to - L.from) * easeOut(f);
  };
  const run = (L: Layer, to: number, ms: number, delay = 0) => {
    const from = now(L);
    L.anims.forEach((a) => a.cancel());
    const k = frames(L.geo, from, to), dur = Math.max(1, ms * Math.abs(to - from));
    L.anims = [L.el.animate(k.clip, { duration: dur, delay, fill: "both" }), L.img.animate(k.img, { duration: dur, delay, fill: "both" })];
    L.from = from; L.to = to; L.t0 = performance.now(); L.ms = dur; L.delay = delay;
    return L.anims[0];
  };

  // the open cover's box for a row: desktop at the slice's left edge, 60vh square; phones the full width, centred on
  // the slice and kept on screen
  const geometry = (li: HTMLElement): Geo | null => {
    const slice = li.querySelector<HTMLElement>("[data-clip]");
    if (!slice) return null;
    const lr = list.getBoundingClientRect(), r = slice.getBoundingClientRect();
    const phone = innerWidth < 720, S = phone ? innerWidth : Math.round(innerHeight * 0.6), head = 44;
    // desktop: at the slice's left edge, pulled left as far as it must be to stay inside the list
    const lx = phone ? -lr.left : Math.min(r.left - lr.left, lr.width - S);
    const cy = r.top + r.height / 2;
    const top = Math.min(Math.max(cy - S / 2, head + 4), innerHeight - S - 4);
    return { sx: r.left - lr.left, sy: r.top - lr.top, sw: r.width, sh: r.height, lx, ty: top - lr.top, S };
  };

  const timing = (a: Animation, id: string, dir: "in" | "out", t: number): ExpandLog => {
    const end = Number(document.timeline.currentTime), start = Number(a.startTime), delay = Number(a.effect?.getTiming().delay ?? 0);
    return { id, dir, ms: Math.round(performance.now() - t), motionMs: Math.round(end - start - delay), latencyMs: Math.round(start - t) };
  };

  const grow = (li: HTMLElement) => {
    const id = li.dataset.id!, r = releases.find((x) => x.id === id);
    if (!r?.cover) return;
    let L = layers.get(id);
    if (!L) {
      const geo = geometry(li), src = li.querySelector<HTMLImageElement>("[data-clip] img");
      if (!geo || !src) return;
      const el = document.createElement("div"), img = document.createElement("img");
      el.style.cssText = `position:absolute;left:${geo.lx}px;top:${geo.ty}px;width:${geo.S}px;height:${geo.S}px;overflow:hidden;transform-origin:0 0;will-change:transform`;
      img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;transform-origin:50% 50%;will-change:transform";
      img.alt = "";
      // the slice's own file first (already decoded, so the layer never shows blank); the file the open cover needs
      // replaces it once that is decoded
      img.src = src.currentSrc || src.src;
      el.appendChild(img);
      el.dataset.id = id;
      L = { el, img, geo, anims: [], from: 0, to: 0, t0: 0, ms: 0, delay: 0, big: null };
      const k = frames(geo, 0, 0, 1);
      el.style.transform = String(k.clip[0].transform);
      img.style.transform = String(k.img[0].transform);
      layers.set(id, L);
      const need = coverWidth(r, geo.S * devicePixelRatio), big = new Image(), made = L;
      big.src = coverFile(r, need);
      // swapped in only while the layer stands open, never mid-motion (a new picture in a moving layer re-rasters it)
      big.decode().then(() => { if (layers.get(id) !== made) return; made.big = big.src; if (made.to === 1 && now(made) >= 1) made.img.src = big.src; }).catch(() => {});
    }
    // the one growing draws over the one shrinking, so moving down the list crossfades with no gap
    box.appendChild(L.el);
    const a = run(L, 1, IN_MS), t = performance.now(), whole = L.from === 0;
    a.finished.then(() => {
      if (whole) onLog?.(timing(a, id, "in", t));
      const G = layers.get(id);
      if (G && G.big && G.to === 1 && G.img.src !== G.big) G.img.src = G.big;
    }, () => {});
  };

  // handoff: shrinking because the next row is growing over it, it stays open for the first half of that growth,
  // so between two rows the largest cover on screen never dips toward the slice
  const shrink = (id: string, handoff = false) => {
    const L = layers.get(id);
    if (!L) return;
    const a = run(L, 0, OUT_MS, handoff ? IN_MS / 2 : 0), t = performance.now(), whole = L.from === 1;
    a.finished.then(() => {
      if (whole) onLog?.(timing(a, id, "out", t));
      if (layers.get(id) === L && L.to === 0) { L.el.remove(); layers.delete(id); }
    }, () => {});
  };

  const layerOf = (id: string) => layers.get(id)?.el ?? null;
  // how many covers are open (fully grown or growing past half)
  const open = () => [...layers.values()].filter((L) => now(L) > 0.5 && L.to === 1).length;
  const reset = () => { for (const [id, L] of layers) { L.anims.forEach((a) => a.cancel()); L.el.remove(); layers.delete(id); } };
  const destroy = () => { reset(); box.remove(); };
  return { grow, shrink, layerOf, open, reset, destroy };
}
