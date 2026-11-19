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
  // bottles large on the left (bleeding off the left edge), "15%" over "off" right-aligned in the right column, never overlapped
  story: { H: 1920, logoY: 140, logoW: 330, botX: -110, botTop: 330, botH: 920, bigTop: 560, big: 225, offTop: 770, off: 260, textR: 50, infoTop: 1440, k: 1 },
  feed: { H: 1350, logoY: 40, logoW: 240, botX: -60, botTop: 150, botH: 816, bigTop: 360, big: 190, offTop: 535, off: 220, textR: 50, infoTop: 1015, k: 0.8 },
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

export const SunShade: React.FC<{ fmt: Fmt }> = ({ fmt }) => {
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
  const botW = c.botH * (1520 / 2000);
  const botY = c.botTop + (1 - up) * (c.H - c.botTop + 40) + bob;

  const BIG: React.CSSProperties = { position: "absolute", right: c.textR, textAlign: "right", fontFamily: "Montserrat", fontWeight: 700, lineHeight: 1, margin: 0, letterSpacing: "-0.04em" };
  const T: React.CSSProperties = { fontFamily: "Montserrat", color: "#fff", textAlign: "center", lineHeight: 1.15, margin: 0 };
  const I0 = 58; // info lines start once the bottles have landed

  return (
    <AbsoluteFill style={{ background: "#7fb4dd", overflow: "hidden" }}>
      <FlowingImage piece={COLUMN} width={W} height={c.H} fit="cover" />

      <Img src={staticFile("sunshade/logo.png")} style={{ position: "absolute", left: (W - c.logoW) / 2, top: c.logoY, width: c.logoW, ...enter(f, 0) }} />

      <p style={{ ...BIG, top: c.bigTop, fontSize: c.big, color: NAVY, ...blurSlide(f, 8, W) }}>15%</p>

      <Img src={staticFile("sunshade/bottles.png")} style={{ position: "absolute", left: c.botX, top: botY, width: botW, height: c.botH,
        transform: `rotate(${sway}deg)`, transformOrigin: "50% 85%", opacity: clamp((f - B0) / 10),
        filter: `blur(${(1 - sharp) * 16}px) drop-shadow(0 34px 40px rgba(15,27,51,${0.25 * up}))` }} />

      <p style={{ ...BIG, top: c.offTop, fontSize: c.off, color: NAVY, ...blurSlide(f, 40, W) }}>off</p>

      <div style={{ position: "absolute", left: 0, width: W, top: c.infoTop, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ ...T, ...enter(f, I0), fontSize: 50 * k, fontWeight: 600 }}>The Black Friday Skincare Event</p>
        <p style={{ ...T, ...enter(f, I0 + 6), fontSize: 34 * k, fontWeight: 500, marginTop: 10 * k }}>The entire skincare collection</p>
        <p style={{ ...T, ...enter(f, I0 + 12), fontSize: 40 * k, fontWeight: 600, letterSpacing: 4 * k, marginTop: 16 * k }}>NOVEMBER 23–30</p>
        <div style={{ ...enter(f, I0 + 18), marginTop: 26 * k, border: "2px solid #fff", borderRadius: 999, padding: `${12 * k}px ${48 * k}px` }}>
          <p style={{ ...T, fontSize: 30 * k, fontWeight: 600, letterSpacing: 2.5 * k }}>SHOP THE COLLECTION</p>
        </div>
        <p style={{ ...T, ...enter(f, I0 + 24), fontSize: 28 * k, fontWeight: 400, marginTop: 14 * k }}>drarielostadskincare.com</p>
      </div>
    </AbsoluteFill>
  );
};
