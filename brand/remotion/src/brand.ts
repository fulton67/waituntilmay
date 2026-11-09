// Kit values (brand/kit/tokens.css) in px for the 1080x1920 frame: 1cqw = 10.8 px.
export const W = 1080, H = 1920;
export const cqw = (n: number) => n * (W / 100);
export const MARGIN = cqw(9.1);
export const SAFE_T = 0.13021 * H;
export const CAP_TOP = 0.83; // caption box top (client reference frame, DECISIONS 66)
export const ACCENT = "#bf8662"; // --ok-accent-1
// Brand blues for coloured words (Instagram navy #202532 + blue #37a9e8, lighter; same stops as GradientText in app/globals.css)
export const BLUES = ["#37a9e8", "#9fd6f5", "#cfe9f7", "#9fd6f5", "#37a9e8"];
export const ELZA = '"elza", sans-serif'; // Adobe Fonts kit rwy7toj (Elza 400/600/700), DECISIONS 65
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const easeOutBack = (q: number, c1 = 1.70158) => 1 + (c1 + 1) * (q - 1) ** 3 + c1 * (q - 1) ** 2;
export const easeOut = (q: number) => 1 - (1 - q) ** 3;
export const easeIn = (q: number) => q ** 3;
