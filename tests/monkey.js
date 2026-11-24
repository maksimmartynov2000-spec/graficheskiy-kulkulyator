// «Обезьянка»: случайные нажатия во всех режимах — ни одной необработанной ошибки быть не должно.
// Запуск: node tests/monkey.js [число нажатий=6000] [зерно=1]
const { open } = require('./web');

(async () => {
  const total = Number(process.argv[2] || 6000), seed0 = Number(process.argv[3] || 1);
  const c = await open({ w: 393, h: 852, dpr: 1 });
  const res = await c.page.evaluate(({ total, seed0 }) => {
    let seed = seed0 * 2654435761 % 4294967296;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const keys = [...document.querySelectorAll('[data-k]')].map((el) => el.dataset.k);
    const common = ['EXE', 'EXE', 'EXIT', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'UP', 'DOWN', 'LEFT', 'RIGHT', '1', '2', '3', 'XTT', 'ADD', 'DOT', 'NEG'];
    const modes = ['1', '2', '5', '7', 'XTT', 'SIN'];   // Run-Matrix, Statistics, Graph, Table, Equation, System
    const log = [];
    let fails = 0;
    for (let i = 0; i < total; i++) {
      let k;
      if (i % 400 === 0) { window.__calc.press('MENU'); k = modes[(i / 400) % modes.length]; }
      else k = rnd() < 0.55 ? pick(common) : pick(keys);
      if (k === 'AC' && rnd() < 0.5) k = 'EXE';
      log.push(k);
      try { window.__calc.press(k); } catch (e) {
        fails++;
        if (fails <= 5) console.error('после «' + log.slice(-25).join(' ') + '»: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e));
        // вернуть калькулятор в рабочее состояние и продолжить
        try { window.__calc.UI.modals.length = 0; window.__calc.UI.off = false; window.__calc.press('MENU'); } catch (e2) { /* пробуем дальше */ }
      }
    }
    return fails;
  }, { total, seed0 });
  const errs = c.errs.filter((e) => !/favicon/.test(e));
  for (const e of errs.slice(0, 8)) console.log('  ✗ ' + e);
  console.log(`Случайные нажатия (${total}, зерно ${seed0}): ошибок ${res}`);
  await c.close();
  process.exit(res ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
