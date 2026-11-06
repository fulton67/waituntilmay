// FIX Phase 3 "Show it": render the type specimen with the activated Adobe fonts (kit vzz0hgt via use.typekit.net),
// in Playwright, from fonts/specimen/spec.json. 3 canvases x (3 board images + plain colour) for the chosen system,
// plus one plate per losing system. A plate whose kit font did not load says FALLBACK in the image.
// Content: the board's own headlines (OCR, fonts/crops.json), 3 real Instagram captions (existing/posts.json, first sentence),
// 5 procedure names (research/ostad/refs/procedures.json, most mentioned procedures).
// Run from the repo root: NODE_PATH=node_modules node brand/scripts/specimen_render.cjs
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const B = path.join(__dirname, '..'); const OUT = path.join(B, 'fonts', 'specimen');
const spec = JSON.parse(fs.readFileSync(path.join(OUT, 'spec.json'), 'utf8'));
const calib = JSON.parse(fs.readFileSync(path.join(OUT, 'calib', 'fonts.json'), 'utf8')).fonts;
const trk = JSON.parse(fs.readFileSync(path.join(OUT, 'calib', 'tracking.json'), 'utf8')).fonts;
const blocks = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(B, 'board', 'blocks.json'), 'utf8')).map(b => [String(b.id), b]));
const content = JSON.parse(fs.readFileSync(path.join(OUT, 'content.json'), 'utf8'));
const PAPER = '#f6f6f5', INK = '#211b15';  // colour/board.json aggregate #1 (white / paper) and #2 (black / deep shadow)
const GROUNDS = [...content.grounds.map(id => ({ kind: 'image', id, src: '/board/' + blocks[id].file })), { kind: 'colour', id: 'paper', bg: PAPER }];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function plate({ canvas, ground, headline, caption, display }) {
  const c = spec.canvases[canvas], L = spec.layout, R = spec.roles;
  const d = display || { family: R.headline.family, weight: R.headline.weight, id: R.headline.font_id, name: R.headline.adobe_style };
  const dcap = calib.find(f => f.id === d.id).cap_em, hcap = R.headline.cap_pct_h / 100 * (canvas === '1080x1920' ? 1350 : c.h);
  const hsize = hcap / dcap, hls = trk[d.id].letter_spacing_em.headline;
  const s = c.sizes, m = L.margin_pct_w / 100 * c.w;
  const bg = ground.kind === 'image' ? `background:#000 url(${ground.src}) center/cover no-repeat;` : `background:${ground.bg};`;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${spec.kit_css}"><style>
  html,body{margin:0} #p{position:relative;width:${c.w}px;height:${c.h}px;${bg}overflow:hidden;color:var(--ink)}
  .h{position:absolute;left:${m}px;top:${L.headline_top_pct_h / 100 * c.h}px;width:${R.headline.block_w_pct / 100 * c.w}px;
     font-family:'${d.family}';font-weight:${d.weight};font-size:${hsize}px;line-height:${R.headline.line_height};letter-spacing:${hls}em}
  .f{position:absolute;left:${m}px;bottom:${m}px}
  .c{width:${R.caption.block_w_pct / 100 * c.w}px;font-family:'${R.caption.family}';font-weight:${R.caption.weight};font-size:${s.caption.font_size_px}px;
     line-height:${R.caption.line_height};letter-spacing:${R.caption.letter_spacing_em}em;margin-bottom:${s.caption.font_size_px}px}
  .l{font-family:'${R.label.family}';font-weight:${R.label.weight};font-size:${s.label.font_size_px}px;line-height:${R.label.line_height};
     letter-spacing:${R.label.letter_spacing_em}em;text-transform:uppercase}
  .meta{position:absolute;right:${m}px;bottom:${m}px;font:400 15px/1.3 'neue-haas-grotesk-text',sans-serif;text-align:right;opacity:.75;max-width:${c.w * 0.4}px}
  .fb{position:absolute;inset:0;border:12px solid #d00;color:#d00;font:700 40px sans-serif;padding:30px;display:none}
  </style></head><body><div id="p"><div class="h" id="hl">${esc(headline)}</div>
  <div class="f" id="ft"><div class="c">${esc(caption)}</div><div class="l">${content.procedures.map(esc).join('<br>')}</div></div>
  <div class="meta">${esc(d.name)} / ${esc(R.caption.adobe_style)}<br>Adobe Fonts kit ${spec.kit} &middot; ${canvas.replace('x', '&times;')}<br>${ground.kind === 'image' ? 'board block ' + ground.id : 'paper ' + PAPER}</div>
  <div class="fb" id="fb">FALLBACK FONT &mdash; the Adobe kit did not load</div></div>
  <script>window.__fonts=${JSON.stringify([[d.family, d.weight], [R.caption.family, R.caption.weight], [R.label.family, R.label.weight]])}</script></body></html>`;
}

const plates = [];
let k = 0;
for (const canvas of Object.keys(spec.canvases)) GROUNDS.forEach(g => {
  plates.push({ file: `system_${canvas}_${g.id}.png`, canvas, ground: g, headline: content.headlines[k % content.headlines.length], caption: content.captions[k % content.captions.length] }); k++;
});
for (const lose of spec.system.losing) {
  const id = lose.family_slug === 'poppins' ? 'poppins-500' : lose.family_slug === 'cormorant-garamond' ? 'cormorant-500' : null;
  if (!id) continue;
  const f = calib.find(x => x.id === id);
  plates.push({ file: `losing_${lose.family_slug}_1080x1350.png`, canvas: '1080x1350', ground: GROUNDS[GROUNDS.length - 1], headline: content.headlines[0], caption: content.captions[0],
    display: { family: f.family, weight: f.weight, id, name: `${lose.family} ${f.weight === 500 ? 'Medium' : 'Regular'} (losing system: display score ${lose.score})` } });
}
const pages = {};
plates.forEach((p, i) => { pages['/p' + i] = plate(p); });
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (pages[u]) { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(pages[u]); }
  const f = path.join(B, u); if (!f.startsWith(B) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(8767, async () => {
  const b = await chromium.launch(); const log = [];
  for (let i = 0; i < plates.length; i++) {
    const p = plates[i], c = spec.canvases[p.canvas];
    const pg = await b.newPage({ viewport: { width: c.w, height: c.h } });
    await pg.goto('http://localhost:8767/p' + i); await pg.evaluate(() => document.fonts.ready);
    const res = await pg.evaluate(async () => {
      const ok = window.__fonts.every(([f, w]) => document.fonts.check(`${w} 40px "${f}"`));
      if (!ok) document.getElementById('fb').style.display = 'block';
      // ink: paper or ink, whichever contrasts with the mean luminance behind the text blocks
      const P = document.getElementById('p'); const bgi = getComputedStyle(P).backgroundImage; let lum = 0.96;
      if (bgi && bgi !== 'none') {
        const img = new Image(); img.src = bgi.slice(5, -2); await img.decode();
        const W = P.clientWidth, H = P.clientHeight, s = Math.max(W / img.width, H / img.height);
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
        x.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
        const zone = el => { const r = el.getBoundingClientRect(), pr = P.getBoundingClientRect(); const d = x.getImageData(r.left - pr.left, r.top - pr.top, Math.max(1, r.width), Math.max(1, r.height)).data;
          let t = 0; for (let j = 0; j < d.length; j += 4) t += (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255; return t / (d.length / 4); };
        lum = (zone(document.getElementById('hl')) + zone(document.getElementById('ft'))) / 2;
      }
      P.style.setProperty('--ink', lum > 0.5 ? '#211b15' : '#f6f6f5');
      return { fonts_loaded: ok, ground_luminance: +lum.toFixed(3), ink: lum > 0.5 ? 'ink #211b15' : 'paper #f6f6f5' };
    });
    await pg.locator('#p').screenshot({ path: path.join(OUT, p.file) });
    log.push({ file: 'fonts/specimen/' + p.file, canvas: p.canvas, ground: p.ground.kind === 'image' ? 'board ' + p.ground.id : 'paper', headline: p.headline, caption: p.caption,
               display: p.display ? p.display.name : spec.roles.headline.adobe_style, ...res });
    await pg.close();
  }
  fs.writeFileSync(path.join(OUT, 'renders.json'), JSON.stringify(log, null, 1));
  console.log(log.map(l => `${l.file} fonts=${l.fonts_loaded} ${l.ink}`).join('\n')); await b.close(); srv.close();
});
