import localFont from "next/font/local";
import { Archivo } from "next/font/google";

// Informational text (captions, credits, track lists, buttons) is set in gaeawoods.com's body face.
// They use "nimbus-sans", which is URW Nimbus Sans Light served by Adobe Fonts (kit twr8vrw), so it is commercial
// (docs/gillenwebsite/references/gaeawoods.com). TeX Gyre Heros is GUST's free build of URW Nimbus Sans
// (GUST Font License, fonts/GUST-FONT-LICENSE.txt). It ships one weight, 400, which is also R2's single weight.
// To license the real face, buy URW Nimbus Sans Light (300 + 300 italic) and swap these two files.
export const info = localFont({
  src: [
    { path: "./fonts/texgyreheros-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/texgyreheros-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-info",
  fallback: ["Nimbus Sans", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  display: "swap",
});

// The title face sits behind one variable, --font-title. Archivo (Google, OFL) is a placeholder until a title face is chosen.
export const title = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-title", display: "swap" });
