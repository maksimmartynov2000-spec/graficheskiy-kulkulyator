// Общая часть браузерных тестов: локальный сервер с сайтом и страница в Chromium.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORK = path.join(ROOT, '.work');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

function serve(dir) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const p = path.join(dir, rel);
    if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(p));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

// Открыть калькулятор. o: {w, h, dark, dpr, touch}
async function open(o) {
  o = o || {};
  fs.mkdirSync(WORK, { recursive: true });
  const { server, url } = await serve(ROOT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: o.w || 393, height: o.h || 852 }, colorScheme: o.dark ? 'dark' : 'light', deviceScaleFactor: o.dpr || 2, hasTouch: o.touch !== false, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  const api = {
    page, errs, url,
    keys: (s) => page.evaluate((x) => window.__calc.keys(x), s),
    text: () => page.evaluate(() => window.__calc.text()),
    shot: (name) => page.screenshot({ path: path.join(WORK, name + '.png') }),
    lcd: async (name) => { await page.locator('#lcd').screenshot({ path: path.join(WORK, name + '.png') }); },
    close: async () => { await browser.close(); server.close(); }
  };
  return api;
}

module.exports = { open, serve, ROOT, WORK };
