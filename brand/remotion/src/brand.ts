// Kit values (brand/kit/tokens.css) in px for the 1080x1920 frame: 1cqw = 10.8 px.
export const W = 1080, H = 1920;
export const cqw = (n: number) => n * (W / 100);
export const MARGIN = cqw(9.1);
export const SAFE_T = 0.13021 * H;
// layout zones from the face track (public/rosacea-laser/face_reel.json, YuNet every 0.5 s): hairline y 494-551, eyes y 711-767,
// face x 288-749. TOP band = SAFE_T..~610 (over the hair, never the eyes); CHEST band = 1040..1560 (over the scrubs, above captions).
export const CHEST_T = 1040, TOP_B = 610;
export const CAP_TOP = 0.83; // caption box top (client reference frame, DECISIONS 66)
export const ACCENT = "#bf8662"; // --ok-accent-1
// Brand blues for coloured words (Instagram navy #202532 + blue #37a9e8, lighter; same stops as GradientText in app/globals.css)
export const BLUES = ["#37a9e8", "#9fd6f5", "#cfe9f7", "#9fd6f5", "#37a9e8"];
export const ELZA = '"elza", sans-serif'; // Adobe Fonts kit rwy7toj (Elza 400/600/700), DECISIONS 65; retired from the reel 2026-11-09
// The brand bible's type system (brand/fonts/SYSTEM.md): Neue Haas Grotesk Display only, 600 headline / 500 caption + caps label
// (kit vzz0hgt). Back on the reel from 2026-11-09 (style DECISIONS 10): the client asked whether Elza was the bible's font; it isn't.
export const FONT = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';
let _ctx: CanvasRenderingContext2D | null = null;
// px size at which `text` (weight, tracking em) fits `maxW`, capped at `px`
export const fitPx = (text: string, weight: number, px: number, maxW: number, track = 0) => {
  _ctx ??= document.createElement("canvas").getContext("2d");
  if (!_ctx) return px;
  _ctx.font = `${weight} 100px ${FONT}`;
  const w = _ctx.measureText(text).width + track * 100 * text.length;
  return Math.min(px, Math.floor((maxW / w) * 100 * 10) / 10);
};
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const easeOutBack = (q: number, c1 = 1.70158) => 1 + (c1 + 1) * (q - 1) ** 3 + c1 * (q - 1) ** 2;
export const easeOut = (q: number) => 1 - (1 - q) ** 3;
export const easeIn = (q: number) => q ** 3;
