// Run every query in refs/cache/queries.json through DuckDuckGo Images (real Chrome),
// caching each result list to refs/cache/ddg/{sha1}.json. Restartable: cached queries are skipped.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const plan = JSON.parse(fs.readFileSync(path.join(R, 'cache/queries.json'), 'utf8'));
const dir = path.join(R, 'cache/ddg');
fs.mkdirSync(dir, { recursive: true });
const key = q => crypto.createHash('sha1').update(q).digest('hex').slice(0, 16);
const todo = plan.filter(p => !fs.existsSync(path.join(dir, key(p.q) + '.json')));
console.log(`queries ${plan.length}, todo ${todo.length}`);

const WORKERS = Number(process.env.W || 2);
const b = await chromium.launch({ headless: true, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });

async function worker(id) {
  const ctx = await b.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  let empty = 0;
  while (todo.length) {
    const job = todo.shift();
    const p = await ctx.newPage();
    const got = [];
    p.on('response', async r => { if (r.url().includes('/i.js')) { try { const j = await r.json(); got.push(...(j.results || [])); } catch {} } });
    try {
      await p.goto('https://duckduckgo.com/?q=' + encodeURIComponent(job.q) + '&iax=images&ia=images&kl=us-en', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(3500);
      for (let i = 0; i < 2; i++) { await p.mouse.wheel(0, 8000); await p.waitForTimeout(1300); }
    } catch (e) { console.log('ERR', job.q, String(e).slice(0, 80)); }
    await p.close();
    const rows = got.map(r => ({ image: r.image, thumb: r.thumbnail, page: r.url, w: r.width, h: r.height, title: r.title, src: r.source }));
    if (!rows.length) { empty++; console.log(`w${id} EMPTY`, job.q); if (empty >= 5) { console.log('5 empties in a row, backing off 60s'); await new Promise(r => setTimeout(r, 60000)); empty = 0; } continue; }
    empty = 0;
    fs.writeFileSync(path.join(dir, key(job.q) + '.json'), JSON.stringify({ pid: job.pid, q: job.q, rows }));
    console.log(`w${id} ${rows.length}\t${todo.length} left\t${job.q}`);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
await b.close();
console.log('done');
