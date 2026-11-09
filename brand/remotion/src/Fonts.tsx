import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
// Loads Neue Haas Grotesk Display (Adobe Fonts kit vzz0hgt, the brand bible's face) and holds the render until the weights are ready, so no frame is drawn in a
// fallback face. A kit that fails to load (e.g. a domain not on the kit) stops the render instead of shipping the wrong font.
const KITS = ["https://use.typekit.net/rwy7toj.css", "https://use.typekit.net/vzz0hgt.css"]; // Elza (retired), Neue Haas Grotesk
const NEED = ["500 40px neue-haas-grotesk-display", "600 40px neue-haas-grotesk-display", "700 40px neue-haas-grotesk-display"];
export const useElza = () => {
  const [handle] = useState(() => delayRender("Neue Haas Grotesk (Adobe Fonts vzz0hgt)"));
  useEffect(() => {
    for (const KIT of KITS) {
      if (document.querySelector(`link[href="${KIT}"]`)) continue;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = KIT;
      document.head.appendChild(l);
    }
    const load = async () => {
      for (let i = 0; i < 50 && !NEED.every((f) => document.fonts.check(f)); i++) {
        await Promise.all(NEED.map((f) => document.fonts.load(f)));
        await new Promise((r) => setTimeout(r, 100)); // the kit stylesheet may still be arriving
      }
      const miss = NEED.filter((f) => !document.fonts.check(f));
      if (miss.length) throw new Error(`Fonts did not load: ${miss.join(", ")} (check the kit domains)`);
    };
    load().then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle]);
};
