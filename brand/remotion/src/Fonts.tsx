import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
// Loads Neue Haas Grotesk Display + Text (Adobe Fonts kit vzz0hgt, the brand bible's face) and holds the render until those faces are
// really in the page, so no frame is drawn in a fallback face. A kit that fails to load stops the render instead of shipping the wrong font.
// Tightened 2026-11-13 (style DECISIONS 14b): document.fonts.check() also returns true for a family with NO faces registered, so the old
// loop could pass before the kit stylesheet had arrived. Now: wait for the stylesheet, then require document.fonts.load() to return a
// face for every weight (an unknown family returns none). Verified per render with OstadYT debugFonts (DOM width vs Arial + glyphs).
const KITS = ["https://use.typekit.net/rwy7toj.css", "https://use.typekit.net/vzz0hgt.css"]; // Elza (retired), Neue Haas Grotesk
const NEED = ["500 40px neue-haas-grotesk-display", "600 40px neue-haas-grotesk-display", "700 40px neue-haas-grotesk-display", "400 40px neue-haas-grotesk-text", "500 40px neue-haas-grotesk-text"];
// v3: Helvetica Neue LT Pro (the bible's Helvetica, fonts.adobe.com/fonts/helvetica-neue) 55 Roman and 65 Medium, required the same
// way when a composition asks for them (useElza(HN_NEED)); never a system Arial/Helvetica stand-in
export const HN_NEED = ["400 40px helvetica-neue-lt-pro", "500 40px helvetica-neue-lt-pro"];
// a face counts as present when document.fonts.load() resolves to at least one FontFace for it (an unknown family resolves to [])
const ready = new Set<string>();
export const useElza = (extra: string[] = []) => {
  const need = [...NEED, ...extra];
  const [handle] = useState(() => delayRender("Neue Haas Grotesk (Adobe Fonts vzz0hgt)", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    const links = KITS.map((KIT) => {
      const old = document.querySelector<HTMLLinkElement>(`link[href="${KIT}"]`);
      if (old) return old;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = KIT;
      document.head.appendChild(l);
      return l;
    });
    const sheetIn = (l: HTMLLinkElement) => new Promise<void>((res) => { if (l.sheet) return res(); l.addEventListener("load", () => res()); l.addEventListener("error", () => res()); });
    const load = async () => {
      await Promise.all(links.map(sheetIn));
      for (let i = 0; i < 100 && ready.size < need.length; i++) {
        const got = await Promise.all(need.map((f) => document.fonts.load(f).catch(() => [] as FontFace[])));
        got.forEach((g, k) => { if (g.length) ready.add(need[k]); });
        if (ready.size < need.length) await new Promise((r) => setTimeout(r, 150));
      }
      const miss = need.filter((f) => !ready.has(f));
      if (miss.length) throw new Error(`Fonts did not load: ${miss.join(", ")} (check the kit domains)`);
    };
    load().then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
};
