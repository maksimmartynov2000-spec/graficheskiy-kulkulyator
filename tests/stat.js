// Тесты режима Statistics.
//   node tests/stat.js       — числовая часть (Node): регрессии, 1-VAR/2-VAR, квартили, столбцы гистограммы
//   node tests/stat.js web   — ещё и сценарии «с клавиш» в браузере (нужен Playwright и собранный index.html)
const { load, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '40-ui.js', '80-stat.js'],
  ['G', 'S', 'mem', 'CalcError', 'parse', 'compileTokens', 'statReg', 'stat1', 'stat2', 'statBins', 'statBinsDefault', 'statNice', 'statLsq', 'statSolve', 'statNumToks']);
const { S, CalcError, statReg, stat1, stat2, statBins, statBinsDefault, statNice } = core;
const t = runner();

const coef = (q) => Object.fromEntries(q.rows.map(([k, v]) => [k === 'r' + core.G.SQ ? 'r2' : k, v]));
const errOf = (fn) => { try { fn(); return 'нет ошибки'; } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };
const seq = (a, b, st) => { const out = []; for (let x = a; x <= b + 1e-9; x += st || 1) out.push(Number(x.toPrecision(12))); return out; };
// Формула для COPY должна давать те же значения, что и сама регрессия
function copyOk(q, xs, what) {
  S.angle = 'Rad';
  const f = core.compileTokens(q.toks);
  let ok = true;
  for (const x of xs) { const a = f(x), b = q.f(x); if (!(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)))) ok = false; }
  t.eq(ok, true, what + ': формула для COPY совпадает с регрессией');
}

// --- линейная ---
{
  const xs = [1, 2, 3, 4, 5], ys = [1, 3, 2, 5, 4];
  const q = statReg('lin', xs, ys, null), c = coef(q);
  t.eq(q.title, 'LinearReg(ax+b)', 'заголовок линейной');
  t.near(c.a, 0.8, 'линейная a'); t.near(c.b, 0.6, 'линейная b'); t.near(c.r, 0.8, 'линейная r');
  t.near(c.r2, 0.64, 'линейная r²'); t.near(c.MSe, 1.2, 'линейная MSe');
  const c2 = coef(statReg('lin2', xs, ys, null));
  t.near(c2.a, 0.6, 'a+bx: a'); t.near(c2.b, 0.8, 'a+bx: b');
  copyOk(q, xs, 'линейная');
  const e = coef(statReg('lin', [1, 2, 3, 4], [3, 5, 7, 9], null));
  t.near(e.a, 2, 'точная прямая a', 1e-13); t.near(e.b, 1, 'точная прямая b', 1e-13); t.near(e.r, 1, 'точная прямая r'); t.near(e.MSe, 0, 'точная прямая MSe');
  // частоты равносильны повторению точек
  const w = coef(statReg('lin', [1, 2, 3], [2, 3, 7], [2, 1, 3])), u = coef(statReg('lin', [1, 1, 2, 3, 3, 3], [2, 2, 3, 7, 7, 7], null));
  t.near(w.a, u.a, 'частоты: a'); t.near(w.b, u.b, 'частоты: b'); t.near(w.MSe, u.MSe, 'частоты: MSe');
  t.eq(errOf(() => statReg('lin', [1, 2, 3], [1, 2], null)), 'Dimension ERROR', 'разная длина списков');
  t.eq(errOf(() => statReg('lin', [], [], null)), 'Dimension ERROR', 'пустые списки');
  t.eq(errOf(() => statReg('lin', [2, 2, 2], [1, 2, 3], null)), 'Ma ERROR', 'все x одинаковы');
  t.eq(errOf(() => statReg('lin', [1, 2, 3], [1, 2, 3], [1, -1, 1])), 'Ma ERROR', 'отрицательная частота');
}

// --- многочлены ---
{
  const xs = seq(0, 5), q = statReg('quad', xs, xs.map((x) => x * x - 2 * x + 3), null), c = coef(q);
  t.near(c.a, 1, 'квадратичная a'); t.near(c.b, -2, 'квадратичная b'); t.near(c.c, 3, 'квадратичная c'); t.near(c.r2, 1, 'квадратичная r²');
  t.near(c.MSe, 0, 'квадратичная MSe', 1e-9);
  copyOk(q, xs, 'квадратичная');
  // с разбросом: сверка с решением нормальных уравнений «в лоб»
  const ys = [2.1, 2.9, 7.2, 12.8, 21.1, 30.7];
  const cq = coef(statReg('quad', xs, ys, null));
  const S0 = xs.length, S1 = 15, S2 = 55, S3 = 225, S4 = 979;
  const T0 = ys.reduce((a, b) => a + b, 0), T1 = xs.reduce((a, x, i) => a + x * ys[i], 0), T2 = xs.reduce((a, x, i) => a + x * x * ys[i], 0);
  const sol = core.statSolve([[S4, S3, S2], [S3, S2, S1], [S2, S1, S0]], [T2, T1, T0]);
  t.near(cq.a, sol[0], 'квадратичная с разбросом a', 1e-10); t.near(cq.b, sol[1], 'квадратичная с разбросом b', 1e-10); t.near(cq.c, sol[2], 'квадратичная с разбросом c', 1e-10);
  const x3 = seq(-3, 4), q3 = statReg('cubic', x3, x3.map((x) => 2 * x ** 3 - x * x + 4 * x - 7), null), c3 = coef(q3);
  t.near(c3.a, 2, 'кубическая a'); t.near(c3.b, -1, 'кубическая b'); t.near(c3.c, 4, 'кубическая c'); t.near(c3.d, -7, 'кубическая d');
  copyOk(q3, x3, 'кубическая');
  const x4 = seq(-3, 4), q4 = statReg('quart', x4, x4.map((x) => 0.5 * x ** 4 - 3 * x ** 3 + x * x - x + 2), null), c4 = coef(q4);
  t.near(c4.a, 0.5, 'четвёртой степени a'); t.near(c4.b, -3, 'четвёртой степени b'); t.near(c4.c, 1, 'четвёртой степени c');
  t.near(c4.d, -1, 'четвёртой степени d'); t.near(c4.e, 2, 'четвёртой степени e');
  copyOk(q4, x4, 'четвёртой степени');
  // большие x не должны портить точность (центрирование)
  const xb = seq(2001, 2008), cb = coef(statReg('quad', xb, xb.map((x) => 3 * (x - 2004) ** 2 + 5), null));
  t.near(cb.a, 3, 'квадратичная при больших x', 1e-7);
  t.eq(errOf(() => statReg('quad', [1, 2], [1, 2], null)), 'Ma ERROR', 'мало точек для параболы');
  t.eq(errOf(() => statReg('quad', [1, 1, 2, 2], [1, 2, 3, 4], null)), 'Ma ERROR', 'мало разных x для параболы');
}

// --- логарифм, экспонента, степень ---
{
  const xs = [1, 2, 3, 4, 5, 6];
  const ql = statReg('log', xs, xs.map((x) => 1 + 2 * Math.log(x)), null), cl = coef(ql);
  t.near(cl.a, 1, 'логарифмическая a'); t.near(cl.b, 2, 'логарифмическая b'); t.near(cl.r, 1, 'логарифмическая r');
  copyOk(ql, xs, 'логарифмическая');
  const qe = statReg('exp', xs, xs.map((x) => 3 * Math.exp(0.5 * x)), null), ce = coef(qe);
  t.near(ce.a, 3, 'экспонента a·e^bx: a'); t.near(ce.b, 0.5, 'экспонента a·e^bx: b');
  copyOk(qe, xs, 'экспонента a·e^bx');
  const qa = statReg('abx', xs, xs.map((x) => 3 * 2 ** x), null), ca = coef(qa);
  t.near(ca.a, 3, 'экспонента a·b^x: a'); t.near(ca.b, 2, 'экспонента a·b^x: b');
  copyOk(qa, xs, 'экспонента a·b^x');
  const qp = statReg('pow', xs, xs.map((x) => 2 * x ** 1.5), null), cp = coef(qp);
  t.near(cp.a, 2, 'степенная a'); t.near(cp.b, 1.5, 'степенная b'); t.near(cp.r, 1, 'степенная r');
  copyOk(qp, xs, 'степенная');
  // с разбросом: ответ — прямая по логарифмам
  const ys = [2.7, 7.4, 20.1, 54.6, 148.4, 403.4], cn = coef(statReg('exp', xs, ys, null));
  const ln = coef(statReg('lin', xs, ys.map(Math.log), null));
  t.near(cn.b, ln.a, 'экспонента с разбросом: b'); t.near(cn.a, Math.exp(ln.b), 'экспонента с разбросом: a'); t.near(cn.MSe, ln.MSe, 'экспонента с разбросом: MSe');
  t.eq(errOf(() => statReg('log', [0, 1, 2], [1, 2, 3], null)), 'Ma ERROR', 'ln от нуля');
  t.eq(errOf(() => statReg('exp', [1, 2, 3], [1, -2, 3], null)), 'Ma ERROR', 'экспонента при y ≤ 0');
  t.eq(errOf(() => statReg('pow', [1, -2, 3], [1, 2, 3], null)), 'Ma ERROR', 'степенная при x ≤ 0');
}

// --- три медианы, синус, логистическая ---
{
  const xs = seq(1, 9), cm = coef(statReg('med', xs, xs.map((x) => 2 * x + 1), null));
  t.near(cm.a, 2, 'три медианы a'); t.near(cm.b, 1, 'три медианы b');
  // учебный пример: группы по 4, 4, 4
  const x2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], y2 = [3, 4, 6, 5, 8, 9, 9, 12, 12, 14, 15, 16];
  const c2 = coef(statReg('med', x2, y2, null));
  // медианы: (2.5, 4.5), (6.5, 9), (10.5, 14.5) → a = 10/8, b = (28 − 1.25·19.5)/3
  t.near(c2.a, 1.25, 'три медианы: наклон по группам'); t.near(c2.b, (28 - 1.25 * 19.5) / 3, 'три медианы: сдвиг');
  t.eq(errOf(() => statReg('med', [1, 2], [1, 2], null)), 'Ma ERROR', 'три медианы: мало точек');

  const xsn = seq(0, 10, 0.5), qs = statReg('sin', xsn, xsn.map((x) => 2 * Math.sin(1.5 * x + 0.5) + 1), null), cs = coef(qs);
  t.near(cs.a, 2, 'синус a', 1e-7); t.near(cs.b, 1.5, 'синус b', 1e-7); t.near(cs.c, 0.5, 'синус c', 1e-6); t.near(cs.d, 1, 'синус d', 1e-7);
  copyOk(qs, xsn, 'синус');
  {
    // в градусах формула с пометкой «r» даёт те же значения
    S.angle = 'Deg';
    const f = core.compileTokens(qs.toksAny);
    t.near(f(2), qs.f(2), 'синус: формула с пометкой радиан верна в режиме Deg');
    S.angle = 'Rad';
  }
  // температура по месяцам: период около 12
  const mon = seq(1, 12), temp = [-5.1, -3.8, 1.2, 8.9, 15.2, 19.8, 22.1, 20.6, 14.9, 8.1, 1.9, -3.2];
  const ct = coef(statReg('sin', mon, temp, null));
  t.eq(ct.b > 0.45 && ct.b < 0.6, true, 'синус по месяцам: период около 12 (b=' + ct.b.toFixed(4) + ')');
  t.eq(ct.a > 12 && ct.a < 15, true, 'синус по месяцам: размах (a=' + ct.a.toFixed(3) + ')');

  const xl = seq(0, 10), ql = statReg('logistic', xl, xl.map((x) => 10 / (1 + 5 * Math.exp(-0.8 * x))), null), cg = coef(ql);
  t.near(cg.a, 5, 'логистическая a', 1e-6); t.near(cg.b, 0.8, 'логистическая b', 1e-6); t.near(cg.c, 10, 'логистическая c', 1e-6);
  copyOk(ql, xl, 'логистическая');
}

// --- одна переменная ---
{
  const s = stat1([1, 2, 3], [2, 3, 5], 'Std');
  t.eq(s.n, 10, '1-VAR n'); t.near(s.mean, 2.3, '1-VAR среднее'); t.eq(s.sum, 23, '1-VAR Σx'); t.eq(s.sum2, 59, '1-VAR Σx²');
  t.near(s.sdP, Math.sqrt(0.61), '1-VAR σx'); t.near(s.sdS, Math.sqrt(6.1 / 9), '1-VAR sx');
  t.eq(s.min, 1, '1-VAR minX'); t.eq(s.max, 3, '1-VAR maxX'); t.eq(s.med, 2.5, '1-VAR Med'); t.eq(s.q1, 2, '1-VAR Q1'); t.eq(s.q3, 3, '1-VAR Q3');
  t.eq(s.mode, 3, '1-VAR Mod'); t.eq(s.modeN, 1, '1-VAR Mod:n'); t.eq(s.modeF, 5, '1-VAR Mod:F');
  // то же, что развёрнутый список
  const u = stat1([3, 1, 2, 3, 2, 3, 1, 3, 2, 3], null, 'Std');
  t.eq([u.n, u.med, u.q1, u.q3, u.mode].join(), '10,2.5,2,3,3', '1-VAR без частот — те же ответы');
  const odd = stat1([1, 2, 3, 4, 5, 6, 7, 8, 9], null, 'Std');
  t.eq([odd.q1, odd.med, odd.q3].join(), '2.5,5,7.5', 'квартили Std, n = 9');
  const oddD = stat1([1, 2, 3, 4, 5, 6, 7, 8, 9], null, 'OnData');
  t.eq([oddD.q1, oddD.med, oddD.q3].join(), '3,5,7', 'квартили OnData, n = 9');
  const ev = stat1([8, 3, 1, 6, 2, 7, 4, 5], null, 'Std');
  t.eq([ev.q1, ev.med, ev.q3].join(), '2.5,4.5,6.5', 'квартили Std, n = 8');
  const evD = stat1([8, 3, 1, 6, 2, 7, 4, 5], null, 'OnData');
  t.eq([evD.q1, evD.med, evD.q3].join(), '2,4.5,6', 'квартили OnData, n = 8');
  const one = stat1([7], null, 'Std');
  t.eq([one.q1, one.med, one.q3, one.sdP, Number.isNaN(one.sdS)].join(), '7,7,7,0,true', 'один элемент');
  const mm = stat1([1, 1, 2, 2, 3], null, 'Std');
  t.eq([mm.mode, mm.modeN, mm.modeF].join(), '1,2,2', 'две моды');
  const z = stat1([5, 6, 7], [0, 2, 1], 'Std');
  t.eq([z.n, z.min, z.max, z.med].join(), '3,6,7,6', 'нулевая частота исключает значение');
  t.eq(errOf(() => stat1([], null, 'Std')), 'Dimension ERROR', '1-VAR пустой список');
  t.eq(errOf(() => stat1([1, 2], [1], 'Std')), 'Dimension ERROR', '1-VAR длины не совпадают');
  t.eq(errOf(() => stat1([1, 2], [0, 0], 'Std')), 'Ma ERROR', '1-VAR все частоты нулевые');
}

// --- две переменные ---
{
  const s = stat2([1, 2, 3, 4, 5], [1, 3, 2, 5, 4], null);
  t.eq([s.n, s.sumX, s.sumX2, s.sumY, s.sumY2, s.sumXY, s.minX, s.maxX, s.minY, s.maxY].join(), '5,15,55,15,55,53,1,5,1,5', '2-VAR суммы и границы');
  t.near(s.meanX, 3, '2-VAR x̄'); t.near(s.sdPX, Math.SQRT2, '2-VAR σx'); t.near(s.sdSX, Math.sqrt(2.5), '2-VAR sx'); t.near(s.sdSY, Math.sqrt(2.5), '2-VAR sy');
  const w = stat2([1, 2], [3, 5], [3, 1]);
  t.eq([w.n, w.sumX, w.sumY, w.sumXY].join(), '4,5,14,19', '2-VAR с частотами');
}

// --- гистограмма ---
{
  t.eq(statBins([1, 2, 2, 3, 3, 3, 4], null, 1, 1).join(), '1,2,3,1', 'столбцы шириной 1');
  t.eq(statBins([1, 2, 3], [2, 3, 5], 1, 1).join(), '2,3,5', 'столбцы с частотами');
  t.eq(statBins([0.5, 1.5, 2, 2.5, 4], null, 0, 2).join(), '2,2,1', 'граница интервала относится к правому столбцу');
  t.eq(statBins([0.1, 0.2, 0.3], null, 0.1, 0.1).join(), '1,1,1', 'столбцы с дробной шириной');
  t.eq(errOf(() => statBins([1, 2], null, 0, 0)), 'Ma ERROR', 'нулевая ширина');
  t.eq(errOf(() => statBins([1, 2], null, 5, 1)), 'Ma ERROR', 'начало правее всех данных');
  const d = statBinsDefault([3, 5, 4, 7, 9, 3]);
  t.eq(d.start + ',' + d.width, '3,1', 'интервал по умолчанию для целых');
  t.eq(statNice(0.37) + ',' + statNice(12) + ',' + statNice(4.2), '0.5,20,5', 'круглые шаги');
}

const bad = t.done('Статистика');
if (process.argv.includes('web')) {
  const { open } = require('./web');
  (async () => {
    const w = runner();
    const c = await open({ w: 393, h: 852 });
    await c.page.evaluate(() => { localStorage.clear(); });
    await c.page.reload();
    await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
    const has = async (s, what) => { const txt = await c.text(); w.eq(txt.includes(s), true, what + ' («' + s + '» среди: ' + txt.join(' | ') + ')'); };
    // ввод двух списков
    await c.keys('MENU 2 1 EXE 2 EXE 3 EXE 4 EXE 5 EXE RIGHT 1 EXE 3 EXE 2 EXE 5 EXE 4 EXE');
    w.eq(await c.page.evaluate(() => window.__calc.mem.lists[0].map((x) => x.v).join() + ';' + window.__calc.mem.lists[1].map((x) => x.v).join()), '1,2,3,4,5;1,3,2,5,4', 'ввод списков');
    await has('List 2', 'заголовки списков');
    // линейная регрессия из редактора
    await c.keys('F2 F3 F1 F1');
    await has('LinearReg(ax+b)', 'экран регрессии');
    await has('=0.8', 'a = 0.8');
    await has('=0.6', 'b = 0.6');
    // COPY → Y1
    await c.keys('F5');
    w.eq(await c.page.evaluate(() => window.__calc.mem.fn[0].row.join('')), '0.8x+0.6', 'COPY записал формулу в Y1');
    await c.keys('EXIT EXIT EXIT EXIT');
    // 1-VAR
    await c.keys('F1');
    await has('1-Variable', 'экран 1-VAR');
    await has('=15', 'Σx = 15');
    await c.keys('EXIT EXIT');
    // диаграмма рассеяния и линия регрессии
    await c.keys('F1 F1 F1 F2 F6');
    w.eq(await c.page.evaluate(() => window.__calc.UI.apps.stat.gr.regs.length), 1, 'линия регрессии нарисована');
    await c.keys('SHIFT F1 RIGHT');
    await has('X=2', 'трассировка по точкам');
    await c.keys('EXIT EXIT');
    // удаление и вставка
    await c.keys('LEFT UP DEL');
    w.eq(await c.page.evaluate(() => window.__calc.mem.lists[0].length), 4, 'DEL удаляет элемент');
    // распределения
    await c.keys('F5 F1 F2 DOWN NEG 1 EXE 1 EXE DOWN DOWN EXE');
    await has('Normal C.D', 'экран нормального распределения');
    await has('=0.6826894921', 'P(−1 < Z < 1)');
    await c.keys('EXIT EXIT');
    // обратное нормальное: Tail Left, Area 0.975
    await c.keys('F3 DOWN DOWN 0 DOT 9 7 5 EXE DOWN DOWN EXE');
    await has('=1.959963985', 'InvN(0.975)');
    await c.keys('EXIT EXIT EXIT');
    // биномиальное: P(X = 2), n = 5, p = 0.5 и P(0 ≤ X ≤ 2)
    await c.keys('F5 F1 DOWN 2 EXE 5 EXE 0 DOT 5 EXE EXE');
    await has('=0.3125', 'Bpd(2, 5, 0.5)');
    await c.keys('EXIT EXIT F2 DOWN 0 EXE 2 EXE 5 EXE 0 DOT 5 EXE EXE');
    await has('=0.5', 'Bcd(0..2, 5, 0.5)');
    await c.keys('EXIT EXIT EXIT');
    // Пуассона: вторая страница меню DIST
    await c.keys('F6 F1 F1 DOWN 2 EXE 3 EXE EXE');
    await has('=0.2240418077', 'Ppd(2, 3)');
    await c.keys('EXIT EXIT F2 DOWN 0 EXE 2 EXE 3 EXE EXE');
    await has('=0.4231900811', 'Pcd(0..2, 3)');
    await c.keys('EXIT EXIT EXIT EXIT');
    // гистограмма: Set Interval и столбцы
    await c.keys('F1 F6 DOWN F6 F1 EXIT F1 EXE EXE');
    w.eq(await c.page.evaluate(() => { const g = window.__calc.UI.apps.stat.gr.gs[0]; return g.kind + ':' + g.bins.join(); }), 'hist:1,1,1,1', 'гистограмма по List 1');
    await c.keys('SHIFT F1 RIGHT');
    await has('f=1', 'трассировка по столбцам');
    await c.keys('EXIT EXIT');
    // «ящик с усами»
    await c.keys('F1 F6 DOWN F6 F2 EXIT F1 SHIFT F1 RIGHT RIGHT');
    await has('Med=2.5', 'медиана на диаграмме MedBox');
    w.eq(c.errs.join('; '), '', 'без ошибок JS');
    await c.close();
    process.exit(bad || w.done('Статистика, клавиши') ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
} else process.exit(bad ? 1 : 0);
