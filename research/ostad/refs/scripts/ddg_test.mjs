import { chromium } from 'playwright';
const q = process.argv[2] || 'morpheus8 mechanism of action diagram';
const b = await chromium.launch({ headless: true, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const p = await ctx.newPage();
const got = [];
p.on('response', async r => { if (r.url().includes('/i.js')) { try { const j = await r.json(); got.push(...j.results); } catch {} } });
await p.goto('https://duckduckgo.com/?q=' + encodeURIComponent(q) + '&iax=images&ia=images&iaf=size%3ALarge', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 6000); await p.waitForTimeout(1500); }
console.log('ddg', got.length);
for (const it of got.slice(0, 8)) console.log(it.image, '|', it.url, '|', it.width + 'x' + it.height, '|', it.title);
const p2 = await ctx.newPage();
await p2.goto('https://www.google.com/search?tbm=isch&hl=en&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(3000);
console.log('google title', await p2.title(), (await p2.content()).length);
await b.close();
