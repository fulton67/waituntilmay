import { useEffect, useState } from "react";
import { AbsoluteFill, Img, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { FlowingImage, type FlowPiece } from "../components/FlowingImage";

// Black Friday Sun Shade post, bottles large on the left, giant "15% / off" on the right (round 2: the bottles must not cover the 15% off).
// Layers, back to front: the user's blue column gradient moving (research/ostad/style/gradients/MOVING.md, 12 s loop), logo
// (lifted from the Black Friday reference), giant "15%", the cut-out bottles (scripts/sunshade_cutout.py), giant "off" over the
// bottles' cropped bases, then the reference's copy. Type: Montserrat, the closest Google face to both references.
// Motion = the measured Ro devices (research/ostad/style/DEVICE_LIBRARY.md):
//   type-blur-slide      hero type slides in from the right ~15 % W in 8 f, blur decays with speed, no overshoot
//   product-plate-reveal product goes blurred -> sharp over ~52 f
//   product-cutout-float product floats and sways while held
//   Ro enter()           lines: quint-out 0.45 s with an 18 px rise; type-message-lines spacing 5-6 f
const FONT = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=block";
const NAVY = "#0f1b33";
const COLUMN: FlowPiece = { src: "sunshade/column.jpg", crop: [0, 0, 372, 796], anchor: [0.5, 0.8] };
// white glass: the inside of the user's frosted tile (ref3), moving, desaturated and washed toward white
const TILE: FlowPiece = { src: "sunshade/tile.jpg", crop: [200, 200, 860, 860], anchor: [0.55, 0.5] };
type Bg = "blue" | "white";

const useMontserrat = () => {
  const [h] = useState(() => delayRender("Montserrat"));
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT}"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT; document.head.appendChild(l);
    }
    const need = ["400 40px Montserrat", "500 40px Montserrat", "600 40px Montserrat", "700 40px Montserrat"];
    (async () => {
      for (let i = 0; i < 100; i++) {
        const got = await Promise.all(need.map((f) => document.fonts.load(f).catch(() => [])));
        if (got.every((g) => g.length)) return;
        await new Promise((r) => setTimeout(r, 150));
      }
      throw new Error("Montserrat did not load");
    })().then(() => continueRender(h)).catch((e) => cancelRender(e));
  }, [h]);
};

type Fmt = "story" | "feed";
// px. Story keeps everything above IG's bottom reply bar (~250 px) and below the top bar (~120 px).
const L = {
  story: { H: 1920, logoY: 140, logoW: 330, infoTop: 1440, k: 1 },
  feed: { H: 1350, logoY: 40, logoW: 240, infoTop: 1015, k: 0.8 },
};
// Products (cut-outs from scripts/sunshade_cutout.py and scripts/product_cutout.py). Each sets where the product sits per format
// (x, top, h in px; rot = resting tilt in degrees) and the type layout:
//   side: "15%" over "off", right-aligned in the right column, never overlapped by the product
//   top:  "15% off" on one centred line above a full-width product (the lineup)
type Place = { x: number; top: number; h: number; rot?: number };
type TextSide = { mode: "side"; bigTop: number; big: number; offTop: number; off: number; textR: number };
type TextTop = { mode: "top"; top: number; size: number };
type Product = { src: string; aspect: number; story: Place & { text: TextSide | TextTop }; feed: Place & { text: TextSide | TextTop } };
export const PRODUCTS: Record<string, Product> = {
  // the two wet bottles (round 1/2): large on the left, bleeding off the left edge
  pair: { src: "sunshade/bottles.png", aspect: 1520 / 2000,
    story: { x: -110, top: 330, h: 920, text: { mode: "side", bigTop: 560, big: 225, offTop: 770, off: 260, textR: 50 } },
    feed: { x: -60, top: 150, h: 816, text: { mode: "side", bigTop: 360, big: 190, offTop: 535, off: 220, textR: 50 } } },
  // the May 2025 ad shots
  clear: { src: "sunshade/cut_sunshade_clear.png", aspect: 430 / 1743,
    story: { x: 170, top: 330, h: 1060, rot: -5, text: { mode: "side", bigTop: 590, big: 250, offTop: 830, off: 290, textR: 50 } },
    feed: { x: 150, top: 165, h: 800, rot: -5, text: { mode: "side", bigTop: 360, big: 200, offTop: 545, off: 230, textR: 50 } } },
  luma: { src: "sunshade/cut_luma.png", aspect: 625 / 801,
    story: { x: 20, top: 560, h: 690, text: { mode: "side", bigTop: 560, big: 215, offTop: 770, off: 250, textR: 40 } },
    feed: { x: 30, top: 330, h: 590, text: { mode: "side", bigTop: 330, big: 185, offTop: 505, off: 215, textR: 45 } } },
  lineup: { src: "sunshade/cut_lineup.png", aspect: 1796 / 859,
    story: { x: -14, top: 700, h: 530, text: { mode: "top", top: 360, size: 220 } },
    feed: { x: -10, top: 420, h: 525, text: { mode: "top", top: 160, size: 175 } } },
};

const FPS = 30;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const quint = (q: number) => 1 - (1 - q) ** 5;
// Ro enter(): quint out over 0.45 s, 18 px rise (components/Ro.tsx)
const enter = (f: number, at: number) => { const i = quint(clamp((f - at) / (0.45 * FPS))); return { opacity: i, transform: `translateY(${(1 - i) * 18}px)` }; };
// type-blur-slide: from the right 15 % W in 8 f, blur decays with the speed
const blurSlide = (f: number, at: number, W: number): React.CSSProperties => {
  const q = clamp((f - at) / 8), i = quint(q), v = 5 * (1 - q) ** 4; // normalised speed
  return { opacity: clamp(q * 3), transform: `translateX(${(1 - i) * 0.15 * W}px)`, filter: `blur(${Math.min(14, v * 4)}px)` };
};

export const SunShade: React.FC<{ fmt: Fmt; bg?: Bg; product?: string }> = ({ fmt, bg = "blue", product = "pair" }) => {
  const pr = PRODUCTS[product];
  const pl = pr[fmt];
  const tx = pl.text;
  const ink = bg === "white" ? NAVY : "#fff";
  useMontserrat();
  const f = useCurrentFrame();
  const c = L[fmt];
  const W = 1080;
  const k = c.k;

  // bottles: float up from below over ~1.5 s while going blurred -> sharp over 52 f (product-plate-reveal),
  // then float and sway (product-cutout-float): 10 px bob on a 4 s period, ±0.6° sway on 6 s, both whole loops of the 12 s piece
  const B0 = 14;
  const up = quint(clamp((f - B0) / 45));
  const sharp = clamp((f - B0) / 52);
  const held = clamp((f - B0 - 30) / 30);
  const bob = Math.sin(((f - B0) / 120) * Math.PI * 2) * 10 * held;
  const sway = Math.sin(((f - B0) / 180) * Math.PI * 2) * 0.6 * held;
  const botW = pl.h * pr.aspect;
  const botY = pl.top + (1 - up) * (c.H - pl.top + 40) + bob;

  const BIG: React.CSSProperties = { position: "absolute", fontFamily: "Montserrat", fontWeight: 700, lineHeight: 1, margin: 0, letterSpacing: "-0.04em",
    ...(tx.mode === "side" ? { right: tx.textR, textAlign: "right" } : { left: 0, width: W, textAlign: "center" }) };
  const T: React.CSSProperties = { fontFamily: "Montserrat", color: ink, textAlign: "center", lineHeight: 1.15, margin: 0 };
  const I0 = 58; // info lines start once the bottles have landed

  return (
    <AbsoluteFill style={{ background: bg === "white" ? "#eef2f6" : "#7fb4dd", overflow: "hidden" }}>
      {bg === "white" ? <>
        <FlowingImage piece={TILE} width={W} height={c.H} fit="cover" sat={0.45} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.35) 55%, rgba(255,255,255,.6))" }} />
      </> : <FlowingImage piece={COLUMN} width={W} height={c.H} fit="cover" />}

      <Img src={staticFile("sunshade/logo.png")} style={{ position: "absolute", left: (W - c.logoW) / 2, top: c.logoY, width: c.logoW, ...enter(f, 0) }} />

      {tx.mode === "side"
        ? <p style={{ ...BIG, top: tx.bigTop, fontSize: tx.big, color: NAVY, ...blurSlide(f, 8, W) }}>15%</p>
        : <p style={{ ...BIG, top: tx.top, fontSize: tx.size, color: NAVY, ...blurSlide(f, 8, W) }}>15% off</p>}

      <Img src={staticFile(pr.src)} style={{ position: "absolute", left: pl.x, top: botY, width: botW, height: pl.h,
        transform: `rotate(${(pl.rot ?? 0) + sway}deg)`, transformOrigin: "50% 85%", opacity: clamp((f - B0) / 10),
        filter: `blur(${(1 - sharp) * 16}px) drop-shadow(0 34px 40px rgba(15,27,51,${0.25 * up}))` }} />

      {tx.mode === "side" && <p style={{ ...BIG, top: tx.offTop, fontSize: tx.off, color: NAVY, ...blurSlide(f, 40, W) }}>off</p>}

      <div style={{ position: "absolute", left: 0, width: W, top: c.infoTop, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ ...T, ...enter(f, I0), fontSize: 50 * k, fontWeight: 600 }}>The Black Friday Skincare Event</p>
        <p style={{ ...T, ...enter(f, I0 + 6), fontSize: 34 * k, fontWeight: 500, marginTop: 10 * k }}>The entire skincare collection</p>
        <p style={{ ...T, ...enter(f, I0 + 12), fontSize: 40 * k, fontWeight: 600, letterSpacing: 4 * k, marginTop: 16 * k }}>NOVEMBER 23–30</p>
        <div style={{ ...enter(f, I0 + 18), marginTop: 26 * k, border: `2px solid ${ink}`, borderRadius: 999, padding: `${12 * k}px ${48 * k}px` }}>
          <p style={{ ...T, fontSize: 30 * k, fontWeight: 600, letterSpacing: 2.5 * k }}>SHOP THE COLLECTION</p>
        </div>
        <p style={{ ...T, ...enter(f, I0 + 24), fontSize: 28 * k, fontWeight: 400, marginTop: 14 * k }}>drarielostadskincare.com</p>
      </div>
    </AbsoluteFill>
  );
};
