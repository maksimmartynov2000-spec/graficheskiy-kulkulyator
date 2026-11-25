// Тесты режима Dyna Graph.
//   node tests/dyna.js        — расчётная часть (кадры, переменные формулы, встроенные формулы)
//   node tests/dyna.js web    — ещё и сценарий «с клавиш» в браузере (нужен собранный index.html)
const { load, runner } = require('./lib');

const core = load(
  ['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '30-lcd.js', '35-mathbox.js', '36-editor.js', '40-ui.js', '50-menu.js', '60-run.js', '65-func.js', '84-dyna.js'],
  ['G', 'S', 'S_DEF', 'SETUP_DEF', 'UI', 'CalcError', 'parse', 'rowTokens', 'dyn', 'dynaApp', 'dynFrames', 'dynVarsOf', 'dynVars', 'dynBuiltin']
);
const { G, S, CalcError, dynFrames, dynVars, dynBuiltin } = core;
const t = runner();

const frames = (a, b, c) => { try { return dynFrames(a, b, c).join(); } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };
t.eq(frames(1, 5, 1), '1,2,3,4,5', 'кадры 1…5 шаг 1');
t.eq(frames(0, 1, 0.25), '0,0.25,0.5,0.75,1', 'кадры 0…1 шаг 0.25');
t.eq(frames(0, 1, 0.1), '0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1', 'шаг 0.1: без хвостов вроде 0.30000000000000004 и с последним кадром');
t.eq(frames(5, 1, -1), '5,4,3,2,1', 'убывающий диапазон с отрицательным шагом');
t.eq(frames(-2, 2, 2), '-2,0,2', 'диапазон через ноль');
t.eq(frames(1, 1, 1), '1', 'один кадр, когда Start = End');
t.eq(frames(0, 1, 0.3), '0,0.3,0.6,0.9', 'End не кратен шагу — последний кадр не дальше End');
t.eq(frames(1, 5, 0), 'Range ERROR', 'шаг 0');
t.eq(frames(5, 1, 1), 'Range ERROR', 'шаг не в ту сторону');
t.eq(frames(1, 5, -1), 'Range ERROR', 'отрицательный шаг при Start < End');
t.eq(frames(NaN, 5, 1), 'Range ERROR', 'нечисло в диапазоне');
t.eq(dynFrames(0, 299, 1).length, 300, '300 кадров — можно');
t.eq(frames(0, 300, 1), 'Memory ERROR', '301 кадр — Memory ERROR');
t.eq(frames(0, 1, 1e-9), 'Memory ERROR', 'очень мелкий шаг — Memory ERROR, а не зависание');

// переменные формулы
const P3 = { t: 'pow', s: [['3']] };
t.eq(dynVars(['A', 'x', G.SQ]).join(), 'A', 'Ax²: переменная A');
t.eq(dynVars(['A', 'X', G.SQ, '+', 'B', 'X', '+', 'C']).join(), 'A,B,C', 'заглавная X — тоже аргумент, не коэффициент');
t.eq(dynVars(['x', G.SQ, '+', '1']).join(), '', 'x²+1: коэффициентов нет');
t.eq(dynVars(['C', 'sin ', '(', 'B', 'x', ')', '+', 'A']).join(), 'A,B,C', 'порядок — по алфавиту');
t.eq(dynVars([{ t: 'frac', s: [['K'], ['x', P3]] }, '+', 'θ', '+', 'r']).join(), 'K,r,θ', 'переменные внутри дроби, r и θ — в конце');
t.eq(dynVars(['∫(', 'M', 'x', ',', '0', ',', 'N', ')']).join(), 'M,N', 'переменные в аргументах функций');

// встроенные формулы разбираются в обоих видах ввода и содержат ожидаемые коэффициенты
const want = ['A,B', 'A,B,C', 'A,B,C', 'A,B,C,D', 'A,B,C', 'A,B,C', 'A,B,C'];
for (const math of [true, false]) {
  const rows = dynBuiltin(math);
  t.eq(rows.length, 7, 'встроенных формул семь');
  rows.forEach((row, i) => t.eq(dynVars(row).join(), want[i], `встроенная формула ${i + 1} (${math ? 'Math' : 'Line'})`));
  t.eq(rows.every((row) => math || row.every((x) => typeof x === 'string')), true, 'в строчном вводе шаблонов нет');
}

// настройки Setup добавлены и имеют заводские значения
t.eq(core.SETUP_DEF.dynaType[1].join(), 'Cont,Stop', 'Setup: Dynamic Type');
t.eq(core.SETUP_DEF.locus[1].join(), 'On,Off', 'Setup: Locus');
t.eq(S.dynaType + ' ' + core.S_DEF.dynaType + ' ' + S.locus + ' ' + core.S_DEF.locus, 'Stop Stop Off Off', 'Setup: значения по умолчанию');
t.eq(core.UI.apps.dyna === core.dynaApp, true, 'режим зарегистрирован');
t.eq(core.dyn.fn.length, 20, 'своя память на 20 формул');

const bad = t.done('Dyna Graph (расчёты)');
if (process.argv[2] !== 'web') process.exit(bad ? 1 : 0);

// ---------- сценарий «с клавиш» ----------
(async () => {
  const { open } = require('./web');
  const c = await open({ w: 393, h: 852, dpr: 1 });
  let pass = 0, failN = 0;
  const ok = (cond, what) => { if (cond) pass++; else { failN++; console.log('  ✗ ' + what); } };
  const eq = (got, want2, what) => ok(got === want2, `${what}: получено «${got}», ожидалось «${want2}»`);
  const K = (s) => c.keys(s);
  const scr = async () => (await c.text()).join(' | ');
  const has = async (s, what) => { const x = await scr(); ok(x.includes(s), `${what}: на экране нет «${s}» (есть: ${x})`); };
  const ev = (fn) => c.page.evaluate(fn);
  const st = () => ev(() => {
    const a = window.__calc.UI.apps.dyna, r = a.run;
    return { mode: a.mode, timer: !!a.timer, i: r ? r.i : -1, pass: r ? r.pass : -1, playing: !!(r && r.playing), n: r ? r.frames.length : 0, speed: a.d.speed, dv: a.d.dv, A: (window.__calc.mem.vars.A || {}).v };
  });
  const wait = (ms) => c.page.waitForTimeout(ms);

  await ev(() => { localStorage.clear(); });
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));

  await K('MENU 6');
  await has('Dynamic Func', 'экран формул');
  await has(':Y=', 'тип Y=');
  await K('ALPHA XTT XTT SQR EXE');
  eq(await ev(() => window.__calc.UI.apps.dyna.d.fn.filter((f) => f.sel).length), 1, 'формула Y1=Ax² записана и выбрана');
  eq(await ev(() => window.__calc.mem.fn.every((f) => !f.row.length)), true, 'память функций Graph не тронута');

  await K('F4');
  await has('Dynamic Var', 'экран переменных');
  await has(':A', 'динамическая переменная A');
  await K('2 EXE');
  eq((await st()).A, 2, 'значение A правится вводом');
  await K('F2');
  await has('Dynamic Setting', 'экран Start/End/Step');
  await K('1 EXE 3 EXE 1 EXE EXE');
  eq(await ev(() => { const d = window.__calc.UI.apps.dyna.d; return [d.start, d.end, d.step].join(); }), '1,3,1', 'диапазон 1…3 шаг 1');
  await K('F3');
  await has('Dynamic Speed', 'экран скорости');
  await K('UP UP EXE');
  eq((await st()).speed, 0, 'выбрана скорость Stop&Go');

  // Stop&Go: кадры по EXE и стрелкам
  await K('F6');
  let s = await st();
  eq(s.mode + ' ' + s.n + ' ' + s.A + ' ' + s.timer, 'run 3 1 false', 'запуск Stop&Go: первый кадр, таймера нет');
  await has('A=1', 'подпись первого кадра');
  await has('Y1=', 'формула на экране графика');
  await K('EXE');
  await has('A=2', 'EXE — следующий кадр');
  eq((await st()).A, 2, 'переменная A получила значение кадра');
  await K('EXE');
  await has('A=3', 'третий кадр');
  await K('EXE');
  await has('A=1', 'после последнего кадра — снова первый');
  await K('LEFT');
  await has('A=3', '◄ — предыдущий кадр');
  await K('RIGHT');
  await has('A=1', '► — следующий кадр');
  await K('EXIT');
  eq((await st()).mode, 'var', 'EXIT возвращает на экран переменных');

  // Normal: кадры по таймеру, AC останавливает
  await K('F3 DOWN DOWN EXE');
  eq((await st()).speed, 2, 'выбрана скорость Normal');
  await K('F6');
  s = await st();
  eq(s.playing + ' ' + s.timer, 'true true', 'Normal: анимация идёт');
  await wait(1300);
  s = await st();
  ok(s.i >= 1 || s.pass >= 1, `Normal: за 1,3 с кадр сменился (кадр ${s.i}, проход ${s.pass})`);
  await K('AC');
  s = await st();
  eq(s.playing + ' ' + s.timer + ' ' + s.mode, 'false false run', 'AC останавливает, кадр остаётся на экране');
  const at = s.i;
  await wait(700);
  eq((await st()).i, at, 'после остановки кадры не меняются');
  await K('EXE');
  eq((await st()).playing, true, 'EXE после остановки продолжает показ');
  await K('EXIT');
  eq((await st()).playing, false, 'EXIT останавливает');
  await K('EXIT');
  eq((await st()).mode, 'var', 'второй EXIT — на экран переменных');

  // выход через MENU посреди анимации не оставляет таймера
  await K('F6');
  eq((await st()).timer, true, 'анимация запущена перед выходом');
  await K('MENU');
  eq(await ev(() => window.__calc.UI.appId), 'menu', 'MENU — главное меню');
  eq((await st()).timer, false, 'после MENU таймера нет');
  await wait(700);
  eq(c.errs.length, 0, 'после выхода ошибок JS нет: ' + c.errs.join('; '));

  // Dynamic Type: Stop — 10 проходов и остановка; Cont — без остановки (диапазон из одного кадра, скорость Fast)
  await K('6 F4 F2 1 EXE 1 EXE 1 EXE EXE F3 DOWN EXE');
  eq((await st()).speed, 3, 'выбрана скорость Fast');
  await K('F6');
  await wait(2700);
  s = await st();
  eq(s.playing + ' ' + s.pass + ' ' + s.timer, 'false 10 false', 'Stop: после 10 проходов показ остановился');
  await K('EXIT SHIFT MENU DOWN F1 EXIT');
  eq(await ev(() => window.__calc.S.dynaType), 'Cont', 'Setup: Dynamic Type → Cont');
  await K('F6');
  await wait(2700);
  s = await st();
  ok(s.playing && s.pass > 10, `Cont: показ идёт без остановки (проход ${s.pass})`);
  await K('AC EXIT SHIFT MENU DOWN F2 EXIT');
  eq(await ev(() => window.__calc.S.dynaType), 'Stop', 'Setup: Dynamic Type → Stop');

  // Locus: след прежних кривых
  await K('F2 1 EXE 3 EXE 1 EXE EXE F3 UP UP UP EXE SHIFT MENU DOWN DOWN F1 EXIT F6 EXE EXE');
  eq(await ev(() => window.__calc.S.locus + ' ' + window.__calc.UI.apps.dyna.run.seen.size), 'On 3', 'Locus: On — показанные кадры запоминаются');
  await K('EXIT SHIFT MENU DOWN DOWN F2 EXIT');

  // ошибки диапазона
  await K('F2 DOWN DOWN 0 EXE EXE F6');
  await has('Range ERROR', 'шаг 0');
  await K('EXIT F2 0 EXE 3 0 0 EXE 1 EXE EXE F6');
  await has('Memory ERROR', 'больше 300 кадров');
  await K('EXIT F2 1 EXE 5 EXE 1 EXE EXE');

  // формула без коэффициентов
  await K('EXIT XTT SQR EXE');
  eq(await ev(() => window.__calc.UI.apps.dyna.d.fn.map((f) => (f.sel ? 1 : 0)).join('').slice(0, 3)), '010', 'новая формула Y2 становится выбранной, Y1 — нет');
  await K('F4');
  await has('No Variable', 'в формуле нет коэффициентов');
  await K('EXIT');

  // встроенные формулы
  await K('F5');
  await has('SELECT', 'список встроенных формул');
  await K('DOWN DOWN EXE');
  eq(await ev(() => { const a = window.__calc.UI.apps.dyna; return a.mode + ' ' + a.d.fn.findIndex((f) => f.sel) + ' ' + a.d.fn[2].row.length; }), 'list 2 8', 'B-IN записала Ax²+Bx+C в текущую строку и выбрала её');
  await K('F4');
  await has('A=', 'переменная A встроенной формулы');
  await has('B=', 'переменная B встроенной формулы');
  await has('C=', 'переменная C встроенной формулы');
  await K('DOWN F1');
  eq((await st()).dv, 'B', 'SELECT делает динамической переменную под курсором');
  await has(':B', 'заголовок показывает новую динамическую переменную');

  // выбор снимается и ставится, удаление формулы
  await K('EXIT F1');                 // курсор на Y3 — она выбрана
  eq(await ev(() => window.__calc.UI.apps.dyna.d.fn.filter((f) => f.sel).length), 0, 'SELECT на выбранной формуле снимает выбор');
  await K('F1 UP F1');
  eq(await ev(() => window.__calc.UI.apps.dyna.d.fn.map((f) => (f.sel ? 1 : 0)).join('').slice(0, 3)), '010', 'выбранной остаётся одна формула');
  await K('F2');
  await has('Delete Formula?', 'вопрос перед удалением');
  await K('F1');
  eq(await ev(() => window.__calc.UI.apps.dyna.d.fn[1].row.length), 0, 'формула удалена');

  // сохранение
  await wait(700);
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  eq(await ev(() => { const a = window.__calc.UI.apps.dyna; return window.__calc.UI.appId + ' ' + a.d.fn[0].row.length + ' ' + a.d.fn[2].row.length + ' ' + a.d.dv + ' ' + a.d.speed; }), 'dyna 3 8 B 0', 'после перезагрузки формулы и настройки на месте');
  await has('Dynamic Func', 'после перезагрузки открыт экран формул');

  if (c.errs.length) { failN++; console.log('  ✗ ошибки JS: ' + c.errs.join('; ')); }
  console.log(`Dyna Graph (с клавиш): прошло ${pass}, не прошло ${failN}`);
  await c.close();
  process.exit(bad || failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
