// Проверка перед коммитом: вид на телефонах и планшетах (обе ориентации, светлая и тёмная тема),
// работа клавиш, самообновление и работа без интернета.
// Запуск: node tools/check.js   (нужен Playwright; скриншоты — в .work/, посмотреть их глазами)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORK = path.join(ROOT, '.work');
const SITE = path.join(WORK, 'site');     // копия сайта: в ней меняем метку, чтобы изобразить «вышла новая версия»
fs.mkdirSync(SITE, { recursive: true });
const FILES = ['sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(SITE, f));
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const put = (build) => fs.writeFileSync(path.join(SITE, 'index.html'), SRC.replace(/(name="app-build" content=")[^"]*/, '$1' + build));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(p));
});

let fails = 0;
const ok = (cond, what) => { console.log((cond ? '  ✓ ' : '  ✗ ') + what); if (!cond) fails++; };
const ready = (page) => page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'), null, { timeout: 10000 });
const lastAnswer = (page) => page.evaluate(() => { const h = window.__calc.UI.apps.run.hist; const e = h[h.length - 1]; return e && e.val ? e.val.v : null; });

// [имя, ширина, высота, наименьшая высота обычной клавиши, наименьшая высота клавиш F1–F6]
const VIEWS = [
  ['iphone15', 393, 852, 34, 28], ['iphone15-safari', 393, 659, 26, 22], ['iphone15-land', 852, 393, 28, 24],
  ['android', 360, 740, 30, 26], ['android-small', 360, 560, 22, 18], ['android-land', 740, 360, 27, 24],
  ['ipadmini', 744, 1133, 44, 36], ['ipadmini-land', 1133, 744, 44, 32], ['ipad11', 834, 1194, 46, 38], ['ipad11-land', 1194, 834, 46, 34]
];

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();

  console.log('Вид:');
  put('2026-01-01·aaaaaaaa');
  for (const [name, w, h, minKey, minF] of VIEWS) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(url);
      await ready(page);
      const m = await page.evaluate(() => {
        const calc = document.getElementById('calc').getBoundingClientRect();
        const els = [...document.querySelectorAll('[data-k]')];
        const keys = els.map((el) => el.getBoundingClientRect());
        const hOf = (test) => Math.min(...els.filter(test).map((el) => el.getBoundingClientRect().height));
        const lcd = document.getElementById('lcd').getBoundingClientRect();
        return {
          sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
          calc: [calc.left, calc.top, calc.right, calc.bottom],
          keys: keys.length,
          minH: hOf((el) => el.classList.contains('key') && !el.classList.contains('f')),
          minF: hOf((el) => el.classList.contains('f')),
          minW: Math.min(...keys.map((r) => r.width)),
          out: keys.filter((r) => r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5).length,
          lcd: [lcd.width, lcd.height]
        };
      });
      const tag = `${name} ${scheme}`;
      ok(m.sw <= w && m.sh <= h, `${tag}: нет прокрутки (${m.sw}×${m.sh} в ${w}×${h})`);
      ok(m.calc[0] >= -0.5 && m.calc[1] >= -0.5 && m.calc[2] <= w + 0.5 && m.calc[3] <= h + 0.5, `${tag}: корпус целиком на экране`);
      ok(m.keys === 50 && m.out === 0, `${tag}: все 50 клавиш на экране`);
      ok(m.minH >= minKey && m.minF >= minF && m.minW >= 30, `${tag}: клавиши не ниже ${minKey} px, F1–F6 не ниже ${minF} px (сейчас ${m.minH.toFixed(0)} и ${m.minF.toFixed(0)}, ширина от ${m.minW.toFixed(0)})`);
      ok(Math.abs(m.lcd[0] / m.lcd[1] - 384 / 216) < 0.01 && m.lcd[0] >= Math.min(w, h) * 0.6, `${tag}: экран калькулятора ${m.lcd[0].toFixed(0)}×${m.lcd[1].toFixed(0)}`);
      if (scheme === 'light') {
        // настоящие касания клавиш: 1 + 2 EXE
        await page.tap('[data-k="MENU"]'); await page.tap('[data-k="1"]');
        for (const k of ['1', 'ADD', '2', 'EXE']) await page.tap(`[data-k="${k}"]`);
        ok(await lastAnswer(page) === 3, `${tag}: клавиши нажимаются, 1+2=3`);
      }
      ok(errs.length === 0, `${tag}: без ошибок JS ${errs.join('; ')}`);
      await page.screenshot({ path: path.join(WORK, `${name}-${scheme}.png`) });
      await ctx.close();
    }
  }

  console.log('Окно настроек приложения:');
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(url);
    await ready(page);
    await page.tap('#more');
    ok(await page.isVisible('#sheet'), 'открывается по кнопке «⋯»');
    await page.tap('[data-theme-set="dark"]');
    ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'тёмная тема включается');
    await page.screenshot({ path: path.join(WORK, 'sheet.png') });
    await page.tap('#sheet-close');
    ok(!(await page.isVisible('#sheet')), 'закрывается');
    await ctx.close();
  }

  console.log('Сохранение состояния:');
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(url);
    await ready(page);
    await page.evaluate(() => window.__calc.keys('MENU 1 7 MUL 6 EXE 5 STO ALPHA XTT EXE'));
    await page.waitForTimeout(700);
    await page.reload();
    await ready(page);
    ok(await page.evaluate(() => window.__calc.UI.appId) === 'run', 'после перезагрузки открыт тот же режим');
    ok(await page.evaluate(() => window.__calc.UI.apps.run.hist.length) === 2, 'история вычислений на месте');
    ok(await page.evaluate(() => window.__calc.mem.vars.A && window.__calc.mem.vars.A.v) === 5, 'переменная A сохранилась');
    await ctx.close();
  }

  console.log('Самообновление:');
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    put('2026-01-01·aaaaaaaa');
    await page.goto(url);
    await ready(page);
    await page.waitForTimeout(2200); // первая проверка через 1,5 с
    ok(await page.evaluate(() => window.__upd.on && window.__upd.found === null), 'та же сборка — ничего не происходит');

    put('2026-01-02·bbbbbbbb');
    await page.evaluate(() => { window.__calc.idle(); return window.__upd.check(); });
    await page.waitForFunction(() => window.__upd && window.__upd.build === '2026-01-02·bbbbbbbb', null, { timeout: 5000 }).catch(() => {});
    ok(await page.evaluate(() => window.__upd.build) === '2026-01-02·bbbbbbbb', 'новая сборка, калькулятором не пользуются — обновилось само');
    ok(!/[?&]v=/.test(page.url()), 'адрес после обновления чистый');

    await ready(page);
    await page.evaluate(() => window.__calc.keys('MENU 1 2 ADD 2 EXE 9 9'));
    put('2026-01-03·cccccccc');
    await page.evaluate(() => window.__upd.check());
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => window.__upd.build) === '2026-01-02·bbbbbbbb', 'идёт работа — не перезагрузилось');
    ok(await page.isVisible('#updbar'), 'показана плашка «Update»');
    await page.screenshot({ path: path.join(WORK, 'updbar.png') });
    await page.click('#updbar [data-upd="go"]');
    await page.waitForFunction(() => window.__upd && window.__upd.build === '2026-01-03·cccccccc', null, { timeout: 5000 }).catch(() => {});
    ok(await page.evaluate(() => window.__upd.build) === '2026-01-03·cccccccc', 'кнопка «Update» — обновилось');
    await ready(page);
    ok(await lastAnswer(page) === 4, 'история вычислений пережила обновление');
    ok(await page.evaluate(() => window.__calc.UI.apps.run.ed.root.join('')) === '99', 'набранное, но не вычисленное выражение тоже на месте');
    await ctx.close();
  }

  console.log('Без интернета:');
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'allow' });
    const page = await ctx.newPage();
    put('2026-01-01·aaaaaaaa');
    await page.goto(url);
    await ready(page);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
    ok(await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), 'офлайн-копия установлена');
    await page.waitForTimeout(500);
    await ctx.setOffline(true);
    await page.reload().catch(() => {});
    await ready(page).catch(() => {});
    ok(await page.evaluate(() => !!window.__calc).catch(() => false), 'без сети приложение открывается');
    await page.evaluate(() => window.__calc.keys('MENU 1 6 MUL 7 EXE')).catch(() => {});
    ok(await lastAnswer(page).catch(() => null) === 42, 'без сети считает: 6×7=42');
    await ctx.setOffline(false);
    put('2026-01-05·eeeeeeee');
    await page.evaluate(() => { window.__calc.idle(); return window.__upd.check(); });
    await page.waitForFunction(() => window.__upd && window.__upd.build === '2026-01-05·eeeeeeee', null, { timeout: 8000 }).catch(() => {});
    ok(await page.evaluate(() => window.__upd.build) === '2026-01-05·eeeeeeee', 'с офлайн-копией новая сборка тоже приходит');
    await ctx.setOffline(true);
    await page.reload().catch(() => {});
    await ready(page).catch(() => {});
    ok(await page.evaluate(() => window.__upd && window.__upd.build).catch(() => null) === '2026-01-05·eeeeeeee', 'и остаётся после перезапуска без сети');
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(fails ? `\nНе прошло: ${fails}` : '\nВсё прошло. Скриншоты — в .work/');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
