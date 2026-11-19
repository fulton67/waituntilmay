import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { FluidGlass, PALETTES, type Palette } from "../components/FluidGlass";

// FluidGlass applied to the before/after posts (feed 1080x1350), on the AviClear P0010 pair. Layout + numbers follow
// public/brand/ostad/stills/ba/v2.html (v1 split, v4a cover) and its measurements (v2.js, brand/scripts/ba_v2_measure.py).
// Rule: glass sits on top of the photos and never over the measured area; the face itself is never graded or warped.
// Source (gitignored, local only): brand/remotion/public/fluidglass/p0010_grid.jpg (copy of public/brand/ostad/stills/ba/src/v2).

const SRC = "fluidglass/p0010_grid.jpg";
const VIS0 = [154, 0, 540, 496], VIS3 = [540, 540, 926, 1053]; // before visit, 3 months after 3rd treatment (source px)
const EB = [0.2575, 0.6597, 0.2151, 0.2399, 171.8], EA = [0.239, 0.5833, 0.2149, 0.2317, 166.9]; // right cheek (crop fractions)
const M = [[0.99745, -0.08496, 32.81468], [0.08496, 0.99745, 20.92053]]; // after crop px -> before crop px
const RED = [2.88, 0.0];
const C = { ivory: "#f5f2eb", navy: "#152235", ink: "#1d1a16" };
const DISP = '"neue-haas-grotesk-display", Helvetica, Arial, sans-serif', TEXT = '"neue-haas-grotesk-text", Helvetica, Arial, sans-serif';
const SERIF = '"cormorant-garamond", Georgia, serif';
// the brand glass for pills / frames (stills.css .glass), unchanged
const GLASS: React.CSSProperties = {
  position: "absolute", backdropFilter: "blur(28px) saturate(1.12) brightness(1.04)",
  background: "linear-gradient(222deg,rgba(255,255,255,.26) 0%,rgba(255,255,255,0) 26%),rgba(255,255,255,.30)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.92),inset -1.5px 0 0 rgba(255,255,255,.70),inset 0 0 0 1px rgba(255,255,255,.34),-10px 16px 30px -14px rgba(25,22,18,.34),-2px 3px 6px -2px rgba(25,22,18,.14)",
};
// the warm-cool brand palette tuned for glass that sits on photos (lighter interior, more milk)
const ON_PHOTO: Palette = { ...PALETTES.brand, c0: "#a6c9ef", c1: "#4d6fbf", c2: "#9a80cc", c3: "#f1b65e", rim: "#f6f9ff", tint: "#eef2f8", tintA: 0.05, sat: 0.9 };

type Box = { x: number; y: number; w: number; h: number };
const fit = (view: number[], box: Box) => {
  const [x0, y0, x1, y1] = view, s = Math.max(box.w / (x1 - x0), box.h / (y1 - y0));
  const ox = x0 + (x1 - x0) / 2 - box.w / s / 2, oy = y0 + (y1 - y0) / 2 - box.h / s / 2;
  return { s, ox, oy, map: (X: number, Y: number) => [box.x + (X - ox) * s, box.y + (Y - oy) * s] as [number, number] };
};
const Win: React.FC<{ view: number[]; box: Box; r?: number | string; z?: number; children?: React.ReactNode }> = ({ view, box, r = 30, z = 3, children }) => {
  const F = fit(view, box);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: r, overflow: "hidden", zIndex: z, background: "#cfc9be" }}>
      <Img src={staticFile(SRC)} style={{ position: "absolute", width: 1080 * F.s, left: -F.ox * F.s, top: -F.oy * F.s, maxWidth: "none" }} />
      {children}
    </div>
  );
};
// fitEllipse fractions of a crop -> tile ellipse (drawn at 0.80 like v2.html)
const ell = (e: number[], crop: number[], F: ReturnType<typeof fit>, k = 1) => {
  const cw = crop[2] - crop[0], ch = crop[3] - crop[1];
  const [cx, cy] = F.map(crop[0] + e[0] * cw, crop[1] + e[1] * ch);
  return { cx, cy, rx: (e[2] / 2) * cw * F.s * 0.8 * k, ry: (e[3] / 2) * ch * F.s * 0.8 * k, rot: e[4] - 180 };
};
const Header: React.FC<{ color?: string }> = ({ color = C.navy }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 58, textAlign: "center", color }}>
    <div style={{ font: `500 34px/1 ${SERIF}`, letterSpacing: ".06em", textTransform: "uppercase" }}>Dr. Ariel Ostad</div>
    <div style={{ width: 64, height: 1, background: "currentColor", opacity: 0.35, margin: "14px auto 12px" }} />
    <div style={{ font: `500 14px/1 ${TEXT}`, letterSpacing: ".28em", textTransform: "uppercase", opacity: 0.75 }}>Total skin health</div>
  </div>
);
const Proc: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", font: `500 40px/1 ${SERIF}`, letterSpacing: ".32em", textTransform: "uppercase", paddingLeft: ".32em", color: C.navy }}>{children}</div>
);
const Cap: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", font: `500 15px/1.3 ${TEXT}`, letterSpacing: ".22em", textTransform: "uppercase", opacity: 0.72, color: C.navy }}>{children}</div>
);
const Credit = () => <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", font: `400 15px/1.2 ${TEXT}`, opacity: 0.6, color: C.ink }}>Patient of Dr. Ostad. Individual results vary.</div>;
const Pill: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div style={{ ...GLASS, left: x, top: y, padding: "9px 18px", borderRadius: 99, zIndex: 8, font: `500 15px/1 ${TEXT}`, letterSpacing: ".2em", textTransform: "uppercase", color: C.ink }}>{children}</div>
);
const Marks: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1350} style={{ position: "absolute", inset: 0, zIndex: 6, overflow: "visible", pointerEvents: "none" }}>
    <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-1" dy="1.5" stdDeviation="1.6" floodColor="#1d1a16" floodOpacity=".38" /></filter></defs>
    <g filter="url(#sh)" stroke="#fff" fill="none" strokeLinecap="round">{children}</g>
  </svg>
);
const Ellipse: React.FC<{ e: ReturnType<typeof ell>; dash?: string; w?: number }> = ({ e, dash, w = 2 }) => (
  <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} strokeWidth={w} strokeDasharray={dash} />
);
// a FluidGlass canvas placed on the tile: shape coordinates are given in tile px
const Glass: React.FC<{ x: number; y: number; w: number; h: number; z?: number; children: (o: { x: number; y: number }) => React.ReactElement }> = ({ x, y, w, h, z = 7, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, zIndex: z, pointerEvents: "none" }}>{children({ x, y })}</div>
);
const Fig: React.FC<{ x: number; y: number; k: string; v: React.ReactNode }> = ({ x, y, k, v }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 7, color: C.navy }}>
    <div style={{ font: `500 15px/1 ${TEXT}`, letterSpacing: ".2em", textTransform: "uppercase", opacity: 0.7, marginBottom: 10 }}>{k}</div>
    <div style={{ font: `400 60px/1 ${DISP}`, letterSpacing: "-.02em" }}>{v}</div>
  </div>
);
const useFonts = () => useElza();

// (a) LOUPE: the round window that frames the before has a living fluid-glass rim instead of a flat white ring
export const AppLoupe: React.FC = () => {
  useFonts();
  const box = { x: 300, y: 214, w: 600, h: 772 }, A = fit(VIS3, box);
  const cw = VIS0[2] - VIS0[0], ch = VIS0[3] - VIS0[1], R = 158, X = 236, Y = 846, W = 24;
  const ccx = VIS0[0] + EB[0] * cw, ccy = VIS0[1] + EB[1] * ch, lv = [ccx - 105, ccy - 105, ccx + 105, ccy + 105];
  const lb = { x: X - R, y: Y - R, w: 2 * R, h: 2 * R }, L = fit(lv, lb), m = 70;
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Header />
      <div style={{ ...GLASS, left: box.x - 12, top: box.y - 12, width: box.w + 24, height: box.h + 24, borderRadius: 42, zIndex: 2 }} />
      <Win view={VIS3} box={box} />
      <Win view={lv} box={lb} r="50%" z={5} />
      <Glass x={X - R - W - m} y={Y - R - W - m} w={2 * (R + W + m)} h={2 * (R + W + m)}>
        {(o) => <FluidGlass width={2 * (R + W + m)} height={2 * (R + W + m)} palette={ON_PHOTO} milk={0.05} seed={1.7} scale={0.6}
          shape={{ kind: "ring", cx: X - o.x, cy: Y - o.y, rx: R + W / 2, ry: R + W / 2, w: W }} />}
      </Glass>
      <Marks>
        <Ellipse e={ell(EB, VIS0, L, 0.86)} />
        <Ellipse e={ell(EA, VIS3, A)} dash="2 7" />
      </Marks>
      <Pill x={X - 58} y={Y + R + W + 22}>Before</Pill>
      <Pill x={box.x + box.w - 136} y={box.y + 24}>After</Pill>
      <Proc top={1104}>AviClear</Proc>
      <Cap top={1166}>Acne · right cheek measured · before in the loupe</Cap>
      <Credit />
    </AbsoluteFill>
  );
};

// (b) ARROW / RING: a frosted glass arrow with fluid inside points from the measured figure to the cheek it was measured on;
// the ring variant replaces the white hairline ellipse with a glass band just outside the measured area
export const AppArrow: React.FC<{ variant: "arrow" | "ring" }> = ({ variant }) => {
  useFonts();
  const frame = useCurrentFrame();
  const box = { x: 330, y: 214, w: 600, h: 772 }, A = fit(VIS3, box), e = ell(EA, VIS3, A);
  const p1: [number, number] = [150, 690], ang = Math.atan2(e.cy + 30 - p1[1], e.cx - p1[0]);
  // tip stops short of the measured ellipse so the glass never covers it
  const tipR = Math.hypot(e.rx * Math.cos(ang), e.ry * Math.sin(ang)) + 16;
  const p2: [number, number] = [e.cx - Math.cos(ang) * tipR, e.cy + 30 - Math.sin(ang) * tipR - 30 * 0];
  const sw = 26, hl = 46, hw = 62;
  // arrow grows in over the first 18 frames (eased), then the fluid carries the motion
  const g = interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const q1: [number, number] = [p2[0] + (p1[0] - p2[0]) * g, p2[1] + (p1[1] - p2[1]) * g];
  const dir = [Math.cos(ang), Math.sin(ang)], n = [-dir[1], dir[0]], base = [p2[0] - dir[0] * hl, p2[1] - dir[1] * hl];
  const poly = [
    [q1[0] + n[0] * sw / 2, q1[1] + n[1] * sw / 2], [base[0] + n[0] * sw / 2, base[1] + n[1] * sw / 2], [base[0] + n[0] * hw / 2, base[1] + n[1] * hw / 2], p2,
    [base[0] - n[0] * hw / 2, base[1] - n[1] * hw / 2], [base[0] - n[0] * sw / 2, base[1] - n[1] * sw / 2], [q1[0] - n[0] * sw / 2, q1[1] - n[1] * sw / 2],
  ].map(([x, y]) => `${x}px ${y}px`).join(",");
  const RW = 16;
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Header />
      <div style={{ ...GLASS, left: box.x - 12, top: box.y - 12, width: box.w + 24, height: box.h + 24, borderRadius: 42, zIndex: 2 }} />
      <Win view={VIS3} box={box} />
      <Win view={VIS0} box={{ x: 64, y: 820, w: 200, h: 250 }} r={22} z={4} />
      <Fig x={64} y={470} k="Red area" v={<>{RED[0].toFixed(1)}<span style={{ font: `italic 500 30px/1 ${SERIF}`, opacity: 0.6, margin: "0 12px" }}>to</span>{RED[1].toFixed(1)}<span style={{ fontSize: 30 }}> %</span></>} />
      {variant === "arrow" && g > 0.02 && (
        <>
          <div style={{ position: "absolute", inset: 0, zIndex: 6, backdropFilter: "blur(9px) brightness(1.06)", clipPath: `polygon(${poly})` }} />
          <Glass x={0} y={0} w={1080} h={1350}>
            {() => <FluidGlass width={1080} height={1350} palette={ON_PHOTO} milk={0.07} seed={3.1} scale={0.55}
              shape={{ kind: "arrow", x1: q1[0], y1: q1[1], x2: p2[0], y2: p2[1], sw, hl, hw }} />}
          </Glass>
        </>
      )}
      {variant === "ring" && (
        <Glass x={e.cx - 160} y={e.cy - 160} w={320} h={320}>
          {(o) => <FluidGlass width={320} height={320} palette={ON_PHOTO} milk={0.05} seed={5.3} scale={0.7}
            shape={{ kind: "ring", cx: e.cx - o.x, cy: e.cy - o.y, rx: e.rx + RW / 2 + 2, ry: e.ry + RW / 2 + 2, w: RW, ang: e.rot }} />}
        </Glass>
      )}
      {variant === "arrow" && <Marks><Ellipse e={e} dash="2 7" /></Marks>}
      <Pill x={88} y={1086}>Before</Pill>
      <Pill x={box.x + box.w - 136} y={box.y + 24}>After</Pill>
      <Proc top={1110}>AviClear</Proc>
      <Cap top={1170}>Acne · 3 months after the 3rd treatment</Cap>
      <Credit />
    </AbsoluteFill>
  );
};

// (d) SLIDER: the split layout's handle is a small fluid-glass bead riding the hairline; the split eases across the cheek
export const AppSlider: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const box = { x: 230, y: 236, w: 620, h: 796 }, B = fit(VIS0, box), s = B.s;
  const o = B.map(VIS0[0], VIS0[1]).map((v, i) => v - [box.x, box.y][i]), va = VIS3;
  const a = s * M[0][0], b = s * M[1][0], c = s * M[0][1], d = s * M[1][1];
  const e0 = o[0] + s * (M[0][2] - M[0][0] * va[0] - M[0][1] * va[1]), f0 = o[1] + s * (M[1][2] - M[1][0] * va[0] - M[1][1] * va[1]);
  const cc0 = B.map(VIS0[0] + EB[0] * (VIS0[2] - VIS0[0]), 0)[0];
  const ez = Easing.inOut(Easing.cubic);
  const cc = frame < 50 ? interpolate(frame, [0, 50], [cc0 + 190, cc0 - 110], { easing: ez }) : interpolate(frame, [50, 100], [cc0 - 110, cc0], { easing: ez, extrapolateRight: "clamp" });
  const hy = box.y + box.h * 0.3, BR = 34, bs = 150;
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <Header />
      <div style={{ ...GLASS, left: box.x - 12, top: box.y - 12, width: box.w + 24, height: box.h + 24, borderRadius: 40, zIndex: 2 }} />
      <Win view={VIS0} box={box}>
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${cc - box.x}px)` }}>
          <Img src={staticFile(SRC)} style={{ position: "absolute", left: 0, top: 0, width: 1080, maxWidth: "none", transformOrigin: "0 0", transform: `matrix(${a},${b},${c},${d},${e0},${f0})`, clipPath: `inset(${va[1] + 16}px ${1080 - va[2]}px ${1080 - va[3]}px ${va[0]}px)` }} />
        </div>
      </Win>
      <Marks>
        <line x1={cc} y1={box.y} x2={cc} y2={box.y + box.h} strokeWidth={1.5} />
        <Ellipse e={ell(EB, VIS0, B)} />
      </Marks>
      <Glass x={cc - bs / 2} y={hy - bs / 2} w={bs} h={bs} z={8}>
        {() => <FluidGlass width={bs} height={bs} palette={{ ...ON_PHOTO, sat: 1, tintA: 0.12 }} seed={2.2} scale={0.9} grain={0.02} shape={{ kind: "bead", cx: bs / 2, cy: bs / 2, r: BR }} />}
      </Glass>
      <svg width={52} height={52} style={{ position: "absolute", left: cc - 26, top: hy - 26, zIndex: 9 }}>
        <path d="M21 19 L14 26 L21 33 M31 19 L38 26 L31 33" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 1.5px rgba(20,25,40,.45))" }} />
      </svg>
      <Pill x={box.x + 24} y={box.y + box.h - 66}>Before</Pill>
      <Pill x={box.x + box.w - 140} y={box.y + box.h - 66}>After</Pill>
      <Proc top={1096}>AviClear</Proc>
      <Cap top={1160}>Right cheek · red area {RED[0].toFixed(1)} % → {RED[1].toFixed(1)} %</Cap>
      <Credit />
    </AbsoluteFill>
  );
};

// (c) END CARD: the fluid glass sphere as the object behind the call to action
export const AppEndCard: React.FC<{ palette: keyof typeof PALETTES }> = ({ palette }) => {
  useFonts();
  const frame = useCurrentFrame();
  const P = PALETTES[palette], fg = P.light ? C.navy : "#f5f2eb";
  const t = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: P.bg }}>
      <FluidGlass width={1080} height={1350} bg palette={palette} seed={4.4} grain={0.03} shape={{ kind: "sphere", cx: 540, cy: 600, r: 330 }} />
      <Header color={fg} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1010, textAlign: "center", color: fg, opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}>
        <div style={{ font: `500 15px/1 ${TEXT}`, letterSpacing: ".28em", textTransform: "uppercase", opacity: 0.7, marginBottom: 22 }}>AviClear · 1726 nm laser for acne</div>
        <div style={{ font: `500 62px/1.08 ${DISP}`, letterSpacing: "-.015em" }}>Book your AviClear<br />treatment today</div>
      </div>
    </AbsoluteFill>
  );
};
