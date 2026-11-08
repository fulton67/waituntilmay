import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
// Loads the Elza kit (Adobe Fonts rwy7toj, DECISIONS 65) and holds the render until the weights are ready, so no frame is drawn in a
// fallback face. A kit that fails to load (e.g. a domain not on the kit) stops the render instead of shipping the wrong font.
const KIT = "https://use.typekit.net/rwy7toj.css";
export const useElza = () => {
  const [handle] = useState(() => delayRender("Elza (Adobe Fonts rwy7toj)"));
  useEffect(() => {
    if (!document.querySelector(`link[href="${KIT}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = KIT;
      document.head.appendChild(l);
    }
    const load = async () => {
      for (let i = 0; i < 50 && !document.fonts.check("700 40px elza"); i++) {
        await Promise.all(["400 40px elza", "700 40px elza"].map((f) => document.fonts.load(f)));
        await new Promise((r) => setTimeout(r, 100)); // the kit stylesheet may still be arriving
      }
      if (!document.fonts.check("700 40px elza") || !document.fonts.check("400 40px elza")) throw new Error("Elza did not load (check the kit domains)");
    };
    load().then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle]);
};
