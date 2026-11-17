// Grid 4 (2026-11-17): nine single posts as designed stills (brand/posts/POST_RULES.md), rendered by
// brand/scripts/render_stills.cjs from public/brand/ostad/stills/grid4.html + ba/drafts.html. Static review only.
const TILES = [
  ["01_ceg-ferulic", "CEG + Ferulic Complex"], ["02_bcc", "3.6 million BCCs a year"], ["03_emsculpt", "Emsculpt Neo"],
  ["04_lexington", "897 Lexington, credentials"], ["05_reapply", "Reapply every 2–3 h"], ["06_jeuveau", "Jeuveau"],
  ["07_aviclear", "AviClear before / after (P0010)"], ["08_prevention", "Prevention"], ["09_chin", "Chin filler before / after (P0013)"],
] as const;
const BASE = "/brand/ostad/stills/out/grid4";

export default function Grid4() {
  return (
    <section style={{ padding: "40px 16px 24px", maxWidth: 1180, margin: "0 auto" }} data-testid="grid4">
      <h2 style={{ font: "500 28px/1.1 var(--disp, Helvetica)", margin: "0 0 6px" }}>Grid 4 · designed stills</h2>
      <p style={{ margin: "0 0 18px", opacity: 0.7, font: "400 15px/1.4 var(--text, Helvetica)" }}>
        Nine single posts, 1080 × 1350. Rules: brand/posts/POST_RULES.md · checklist: brand/posts/CHECKLIST_grid4.md ·{" "}
        <a href={`${BASE}/_compare.jpg`}>side by side with rit.clinic and Are.na</a>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
        {TILES.map(([f, name]) => (
          <a key={f} href={`${BASE}/${f}.png`} title={name} style={{ display: "block", aspectRatio: "4 / 5", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/${f}.png`} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </a>
        ))}
      </div>
    </section>
  );
}
