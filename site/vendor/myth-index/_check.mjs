import puppeteer from 'puppeteer';
import { pathToFileURL } from 'url';
import path from 'path';

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
await p.setViewport({ width: 1200, height: 760, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(path.resolve('index-demo.html')).href, { waitUntil: 'networkidle0' });

console.log('JS errors:', errs.length ? errs : 'none');
console.log('initial   :', JSON.stringify(await p.evaluate(() => ({
  btn: !!document.querySelector('.myth-index__toggle'),
  rows: document.querySelectorAll('.myth-index__row').length,
  cols: document.querySelectorAll('.myth-index__col').length,
  hidden: document.querySelector('.myth-index__panel').hasAttribute('hidden'),
  expanded: document.querySelector('.myth-index__toggle').getAttribute('aria-expanded'),
}))));

await p.click('.myth-index__toggle');
await new Promise(r => setTimeout(r, 400));
console.log('opened    :', JSON.stringify(await p.evaluate(() => {
  const r = document.querySelector('.myth-index__panel').getBoundingClientRect();
  return {
    hidden: document.querySelector('.myth-index__panel').hasAttribute('hidden'),
    expanded: document.querySelector('.myth-index__toggle').getAttribute('aria-expanded'),
    panel: Math.round(r.width) + 'x' + Math.round(r.height),
    firstRow: document.querySelector('.myth-index__row').textContent.trim(),
  };
})));

// hover the third row and confirm the preview appears and stays on screen
const row = (await p.$$('.myth-index__row'))[2];
await row.hover();
await new Promise(r => setTimeout(r, 400));
console.log('preview   :', JSON.stringify(await p.evaluate(() => {
  const el = document.querySelector('.myth-index__hover-preview');
  if (!el) return 'none (touch?)';
  const r = el.getBoundingClientRect();
  return {
    visible: el.classList.contains('is-visible'),
    onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    hasImg: !!el.querySelector('img').getAttribute('src'),
  };
})));

await p.screenshot({ path: 'demo-open.png' });

await p.keyboard.press('Escape');
await new Promise(r => setTimeout(r, 300));
console.log('escape    :', JSON.stringify(await p.evaluate(() => ({
  hidden: document.querySelector('.myth-index__panel').hasAttribute('hidden'),
  expanded: document.querySelector('.myth-index__toggle').getAttribute('aria-expanded'),
}))));

await p.click('.myth-index__toggle');
await new Promise(r => setTimeout(r, 300));
await p.mouse.click(1150, 700); // outside the component
await new Promise(r => setTimeout(r, 300));
console.log('outside   :', JSON.stringify(await p.evaluate(() =>
  document.querySelector('.myth-index__panel').hasAttribute('hidden'))));

await p.setViewport({ width: 390, height: 760, deviceScaleFactor: 2 });
await p.click('.myth-index__toggle');
await new Promise(r => setTimeout(r, 400));
console.log('mobile    :', JSON.stringify(await p.evaluate(() => ({
  visibleColHeads: [...document.querySelectorAll('.myth-index__col-head')].filter(e => e.offsetParent !== null).length,
  cols: getComputedStyle(document.querySelector('.myth-index__cols')).gridTemplateColumns,
  overflowsX: document.documentElement.scrollWidth > window.innerWidth,
}))));
await p.screenshot({ path: 'demo-mobile.png' });

await b.close();
console.log('\nJS errors at end:', errs.length ? errs : 'none');
