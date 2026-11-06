// FIX Phase 3: render each kit font (Adobe kit vzz0hgt, loaded from use.typekit.net on http://localhost) at zero tracking,
// save one PNG per font for scripts/type_calibrate.py, and report each font's cap-height / em measured in the browser.
// Run from the repo root: NODE_PATH=node_modules node brand/scripts/type_calibrate.cjs
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, '..', 'fonts', 'specimen', 'calib');
const FONTS = [['nhg-display-600', 'neue-haas-grotesk-display', 600], ['nhg-display-500', 'neue-haas-grotesk-display', 500],
  ['nhg-text-400', 'neue-haas-grotesk-text', 400], ['nhg-text-500', 'neue-haas-grotesk-text', 500],
  ['poppins-500', 'poppins', 500], ['poppins-400', 'poppins', 400], ['cormorant-500', 'cormorant-garamond', 500], ['cormorant-400', 'cormorant-garamond', 400]];
const LINE = 'Hamburgefonstiv clinic results';
const html = `<!doctype html><html><head><link rel="stylesheet" href="https://use.typekit.net/vzz0hgt.css"><style>body{margin:0;background:#fff}
div{font-size:120px;letter-spacing:0;color:#000;padding:30px 40px;white-space:nowrap;line-height:1.4}</style></head><body>
${FONTS.map(([id, fam, w]) => `<div id="${id}" style="font-family:'${fam}';font-weight:${w}">${LINE}</div>`).join('')}</body></html>`;
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(html); }).listen(8766, async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2400, height: 1600 } });
  await p.goto('http://localhost:8766/'); await p.evaluate(() => document.fonts.ready);
  const info = await p.evaluate((F) => F.map(([id, fam, w]) => {
    const loaded = document.fonts.check(`${w} 120px "${fam}"`);
    const c = document.createElement('canvas').getContext('2d'); c.font = `${w} 1000px "${fam}"`;
    const H = c.measureText('H'), x = c.measureText('x');
    return { id, family: fam, weight: w, loaded, cap_em: +(H.actualBoundingBoxAscent / 1000).toFixed(4), x_em: +(x.actualBoundingBoxAscent / 1000).toFixed(4) };
  }), FONTS);
  for (const [id] of FONTS) await p.locator('#' + id).screenshot({ path: path.join(OUT, id + '.png') });
  fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify({ kit: 'vzz0hgt', line: LINE, font_size_px: 120, fonts: info }, null, 1));
  console.log(JSON.stringify(info)); await b.close(); srv.close();
});
