// Тесты режима Recursion.
//   node tests/recur.js       — расчёт таблиц (Node): прогрессии, Фибоначчи, суммы, связанные последовательности, ошибки
//   node tests/recur.js web   — ещё и сценарий «с клавиш» в браузере (нужен Playwright и собранный index.html)
const { load, makeTok, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '30-lcd.js', '35-mathbox.js', '36-editor.js', '40-ui.js', '50-menu.js', '82-recur.js'],
  ['G', 'S', 'S_DEF', 'SETUP_DEF', 'mem', 'fv', 'VIX', 'PRE', 'FNA', 'CalcError', 'setVar', 'RI', 'R', 'rowTokens',
    'recTable', 'recWebF', 'recWebStep', 'recTokens', 'recLabel', 'REC_AN', 'REC_AN1', 'UI']);
const { G, S, CalcError, recTable, recWebF, recWebStep, REC_AN, REC_AN1 } = core;
const tok = makeTok(core);
const t = runner();

// Формула «как на бумаге»: {an} {bn} {cn} — предыдущие члены, {an1} … — члены с номером n+1, n — номер
const SUBS = { an: REC_AN[0], bn: REC_AN[1], cn: REC_AN[2], an1: REC_AN1[0], bn1: REC_AN1[1], cn1: REC_AN1[2] };
function F(s) {
  if (!s) return null;
  const out = [];
  for (const part of s.split(/(\{\w+\}|n)/)) {
    if (!part) continue;
    if (part === 'n') out.push('n');
    else if (part[0] === '{') out.push(SUBS[part.slice(1, -1)]);
    else out.push(...tok(part));
  }
  return out;
}
const set = (o) => ({ start: 1, end: 5, first: 1, init: [[0, 0], [0, 0], [0, 0]], ...o });
const tab = (type, fa, fb, fc, o) => recTable(type, [F(fa), F(fb), F(fc)], set(o));
const errOf = (fn) => { try { fn(); return 'нет ошибки'; } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };
const J = (a) => (a ? a.join() : 'null');

// --- общий член: арифметическая прогрессия aₙ = 3n + 2 ---
{
  const r = tab('an', '3n+2');
  t.eq(J(r.n), '1,2,3,4,5', 'aₙ: номера');
  t.eq(J(r.seq[0]), '5,8,11,14,17', 'aₙ = 3n+2');
  t.eq(J(r.seq[1]), 'null', 'без формулы столбца нет');
  t.eq(J(r.sum[0]), '5,13,24,38,55', 'суммы общего члена');
  const g = tab('an', '2^n', '(~1)^n×n', null, { start: 0, end: 4 });
  t.eq(J(g.seq[0]), '1,2,4,8,16', 'aₙ = 2^n с нулевого номера');
  t.eq(J(g.seq[1]), '0,-1,2,-3,4', 'bₙ = (−1)ⁿ·n');
}

// --- рекуррентная запись aₙ₊₁ ---
{
  const a = tab('an+1', '{an}+3', null, null, { init: [[2, 0], [0, 0], [0, 0]] });
  t.eq(J(a.n), '1,2,3,4,5', 'aₙ₊₁: номера');
  t.eq(J(a.seq[0]), '2,5,8,11,14', 'арифметическая: a1 = 2, шаг 3');
  t.eq(J(a.sum[0]), '2,7,15,26,40', 'суммы арифметической');
  const a0 = tab('an+1', '{an}+3', null, null, { first: 0, init: [[2, 0], [0, 0], [0, 0]] });
  t.eq(J(a0.seq[0]), '5,8,11,14,17', 'то же с a0 = 2: таблица с первого номера');
  const a3 = tab('an+1', '{an}+3', null, null, { start: 3, init: [[2, 0], [0, 0], [0, 0]] });
  t.eq(J(a3.n) + ';' + J(a3.seq[0]), '3,4,5;8,11,14', 'Start = 3: члены до него считаются, но не показываются');
  const g = tab('an+1', '2{an}', null, null, { init: [[3, 0], [0, 0], [0, 0]] });
  t.eq(J(g.seq[0]), '3,6,12,24,48', 'геометрическая: a1 = 3, знаменатель 2');
  const m = tab('an+1', '2{an}+1', null, null, { end: 6, init: [[1, 0], [0, 0], [0, 0]] });
  t.eq(J(m.seq[0]), '1,3,7,15,31,63', 'aₙ₊₁ = 2aₙ + 1');
  const wn = tab('an+1', '{an}+n', null, null, { init: [[1, 0], [0, 0], [0, 0]] });
  t.eq(J(wn.seq[0]), '1,2,4,7,11', 'aₙ₊₁ = aₙ + n: n — номер предыдущего члена');
  const h = tab('an+1', '{an}÷2', null, null, { init: [[1, 0], [0, 0], [0, 0]] });
  t.eq(J(h.seq[0]), '1,0.5,0.25,0.125,0.0625', 'дробные члены');
  const d = tab('an+1', '{an}+0.1', null, null, { end: 4, init: [[0.1, 0], [0, 0], [0, 0]] });
  t.eq(J(d.seq[0]), '0.1,0.2,0.3,0.4', 'десятичные без накопления двоичной погрешности');
}

// --- две связанные последовательности ---
{
  const r = tab('an+1', '{an}+{bn}', '{an}−{bn}', null, { end: 6, init: [[1, 0], [1, 0], [0, 0]] });
  t.eq(J(r.seq[0]), '1,2,2,4,4,8', 'a: aₙ₊₁ = aₙ + bₙ');
  t.eq(J(r.seq[1]), '1,0,2,0,4,0', 'b: bₙ₊₁ = aₙ − bₙ');
  t.eq(J(r.seq[2]), 'null', 'c не задана');
  const c = tab('an+1', null, '{bn}+{cn}', '2{cn}', { init: [[0, 0], [0, 0], [1, 0]] });
  t.eq(J(c.seq[1]) + ';' + J(c.seq[2]), '0,1,3,7,15;1,2,4,8,16', 'b зависит от c');
  const u = tab('an+1', '{an}+{bn}', null, null, { end: 3, init: [[1, 0], [5, 0], [0, 0]] });
  t.eq(u.seq[0][0] + ',' + Number.isNaN(u.seq[0][1]), '1,true', 'ссылка на незаданную последовательность даёт ERROR в ячейке');
}

// --- запись через два предыдущих члена: Фибоначчи ---
{
  const r = tab('an+2', '{an1}+{an}', null, null, { end: 10, init: [[1, 1], [0, 0], [0, 0]] });
  t.eq(J(r.seq[0]), '1,1,2,3,5,8,13,21,34,55', 'Фибоначчи: a1 = a2 = 1');
  t.eq(J(r.sum[0]), '1,2,4,7,12,20,33,54,88,143', 'суммы Фибоначчи');
  const z = tab('an+2', '{an1}+{an}', null, null, { first: 0, start: 0, end: 6, init: [[0, 1], [0, 0], [0, 0]] });
  t.eq(J(z.n) + ';' + J(z.seq[0]), '0,1,2,3,4,5,6;0,1,1,2,3,5,8', 'Фибоначчи с a0 = 0, a1 = 1');
  const s = tab('an+2', '{an1}+{an}', null, null, { start: 4, end: 7, init: [[1, 1], [0, 0], [0, 0]] });
  t.eq(J(s.seq[0]), '3,5,8,13', 'Start = 4 при типе aₙ₊₂');
  const w = tab('an+2', '2{an1}−{an}+n', '{bn1}×{an}', null, { end: 5, init: [[0, 1], [1, 2], [0, 0]] });
  t.eq(J(w.seq[0]), '0,1,3,7,14', 'aₙ₊₂ = 2aₙ₊₁ − aₙ + n');
  t.eq(J(w.seq[1]), '1,2,0,0,0', 'bₙ₊₂ = bₙ₊₁·aₙ');
}

// --- ошибки и границы ---
{
  t.eq(errOf(() => tab('an', 'n', null, null, { start: 5, end: 1 })), 'Range ERROR', 'End меньше Start');
  t.eq(errOf(() => tab('an', 'n', null, null, { start: 1, end: 1000 })), 'Memory ERROR', 'больше 999 строк');
  t.eq(tab('an', 'n', null, null, { start: 1, end: 999 }).n.length, 999, 'ровно 999 строк можно');
  t.eq(errOf(() => tab('an', 'n', null, null, { start: 1.5, end: 3 })), 'Ma ERROR', 'нецелый Start');
  t.eq(errOf(() => tab('an', 'n', null, null, { start: -1, end: 3 })), 'Ma ERROR', 'отрицательный Start');
  t.eq(errOf(() => tab('an+1', '{an}', null, null, { first: 1, start: 0, end: 3 })), 'Range ERROR', 'Start раньше начального члена');
  t.eq(errOf(() => tab('an', '3n+')), 'Syntax ERROR', 'ошибка в формуле');
  const z = tab('an+1', '1÷({an}−2)', null, null, { end: 4, init: [[1, 0], [0, 0], [0, 0]] });
  t.eq(z.seq[0].map((v) => (Number.isFinite(v) ? v : 'E')).join(), '1,-1,-0.333333333333333,-0.428571428571429', 'обычные дроби считаются');
  const dz = tab('an+1', '1÷({an}−1)', null, null, { end: 4, init: [[2, 0], [0, 0], [0, 0]] });
  t.eq(dz.seq[0].map((v) => (Number.isFinite(v) ? v : 'E')).join(), '2,1,E,E', 'деление на ноль: дальше ERROR');
}

// --- переменные пользователя: не портятся и доступны как постоянные ---
{
  const { setVar, RI, fv, VIX } = core;
  for (const v of ['N', 'P', 'Q', 'R', 'S', 'T', 'U']) setVar(v, RI(40 + VIX[v]));
  setVar('A', RI(3)); setVar('B', RI(-1));
  const r = recTable('an+1', [[...tok('A'), REC_AN[0], ...tok('+B')], null, null], set({ init: [[1, 0], [0, 0], [0, 0]] }));
  t.eq(J(r.seq[0]), '1,2,5,14,41', 'постоянные A и B из памяти: aₙ₊₁ = A·aₙ + B');
  t.eq(['N', 'P', 'Q', 'R', 'S', 'T', 'U'].map((v) => fv[VIX[v]] - VIX[v]).join(), '40,40,40,40,40,40,40', 'после расчёта переменные пользователя на месте');
  errOf(() => tab('an+1', '{an}+', null, null));
  t.eq(fv[VIX.P], 40 + VIX.P, 'и после ошибки тоже');
}

// --- знаки и подписи ---
{
  t.eq(core.recTokens(['2', REC_AN[0], '+', 'n', REC_AN1[2]]).join(''), '2P+NU', 'подмена знаков переменными');
  t.eq(core.recLabel(1, 'an+1'), 'b' + G.SUBN1, 'подпись bₙ₊₁');
  t.eq(core.recLabel(2, 'an') + core.recLabel(0, 'an+2'), G.REC_C + 'a' + G.SUBN2, 'подписи cₙ и aₙ₊₂');
  t.eq(S.sigma + ',' + core.S_DEF.sigma + ',' + core.SETUP_DEF.sigma[1].join('/'), 'Off,Off,On/Off', 'строка Setup ΣDisplay');
  t.eq(!!core.UI.apps.recur, true, 'режим зарегистрирован');
}

// --- паутинная диаграмма ---
{
  S.angle = 'Rad';
  const st = set({ init: [[0, 0], [0, 0], [0, 0]] });
  const f = recWebF([F('√({an}+2)'), null, null], 0, st);
  t.near(f(2), 2, 'f(2) = 2 для aₙ₊₁ = √(aₙ+2)');
  const web = { f, x: 0, path: [[0, 0]] };
  for (let i = 0; i < 40; i++) recWebStep(web);
  t.near(web.x, 2, 'паутина сходится к неподвижной точке 2', 1e-9);
  t.eq(web.path.length, 81, 'каждый шаг добавляет два отрезка');
  t.eq(web.path[1][0] + ',' + web.path[2][0] === '0,' + web.path[1][1], true, 'вертикаль к графику, затем горизонталь к y = x');
  const bad = { f: recWebF([F('1÷{an}'), null, null], 0, st), x: 0, path: [[0, 0]] };
  t.eq(recWebStep(bad), false, 'шаг из точки, где функция не определена, не делается');
  const g = recWebF([F('{an}+{bn}+n'), null, null], 0, set({ start: 3, init: [[0, 0], [10, 0], [0, 0]] }));
  t.eq(g(1), 14, 'другие последовательности — начальными значениями, n — Start');
}

const bad = t.done('Recursion (расчёты)');

if (process.argv.includes('web')) {
  const { open } = require('./web');
  (async () => {
    const w = runner();
    const c = await open({ w: 393, h: 852, dpr: 1 });
    const fresh = async () => {
      await c.page.evaluate(() => { localStorage.clear(); });
      await c.page.reload();
      await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
    };
    const app = (expr) => c.page.evaluate(`(() => { const a = window.__calc.UI.apps.recur; return ${expr}; })()`);
    const has = async (s, what) => { const txt = await c.text(); w.eq(txt.includes(s), true, what + ' («' + s + '» среди: ' + txt.join(' | ') + ')'); };
    await fresh();
    // вход в режим клавишей 8
    await c.keys('MENU 8');
    await has('Recursion', 'экран формул');
    await has('TABLE', 'меню режима');
    // aₙ₊₁ = 2aₙ + 1: F4 — вставка, F2 — aₙ
    await c.keys('2 F4 F2 ADD 1 EXE');
    w.eq(await app('a.ed === null && a.base.depth'), 1, 'после EXE ввод закончен, меню вернулось');
    // Start 1, End 6, начальный член a1 = 1
    await c.keys('F5 1 EXE 6 EXE F2 1 EXE');
    await has('Table Setting', 'экран настройки таблицы');
    await c.keys('EXIT F6');
    await has('FORMULA', 'таблица построена');
    w.eq(await app('a.tb.res.seq[0].join()'), '1,3,7,15,31,63', 'aₙ₊₁ = 2aₙ + 1, a1 = 1');
    w.eq(await app('a.tb.cols.length'), 2, 'столбцы: номер и последовательность');
    await c.keys('RIGHT DOWN DOWN DOWN DOWN DOWN');
    await has('63', 'значение выделенной ячейки внизу');
    // график точек и трассировка
    await c.keys('F6');
    w.eq(await c.page.evaluate(() => window.__calc.UI.modals.length), 1, 'GPH-PLT открывает график');
    await c.keys('F2 F5 F1 RIGHT RIGHT');
    await has('n=3', 'трассировка по точкам: номер');
    await c.keys('EXIT EXIT');
    w.eq(await c.page.evaluate(() => window.__calc.UI.modals.length), 0, 'EXIT закрывает график');
    // паутинная диаграмма
    await c.keys('F4 EXE EXE');
    w.eq(await c.page.evaluate(() => window.__calc.UI.modals.length), 1, 'WEB-GPH открывает диаграмму');
    await c.keys('EXIT');
    // ΣDisplay: вторая строка Setup
    await c.keys('SHIFT MENU DOWN F1 EXIT');
    w.eq(await app('a.tb.cols.length'), 3, 'ΣDisplay On добавляет столбец сумм');
    w.eq(await app('a.tb.res.sum[0].join()'), '1,4,11,26,57,120', 'суммы');
    await c.keys('SHIFT MENU DOWN F2 EXIT EXIT');
    // вторая последовательность, зависящая от первой: bₙ₊₁ = aₙ + bₙ (после записи первой курсор уже на второй строке)
    w.eq(await app('a.cur'), 1, 'после записи формулы курсор переходит на следующую строку');
    await c.keys('F4 F2 ADD F3 EXE F6');
    w.eq(await app('a.tb.res.seq[1].join()'), '0,1,4,11,26,57', 'bₙ₊₁ = aₙ + bₙ, b1 = 0');
    await c.keys('EXIT');
    // SELECT снимает выбор
    await c.keys('UP F1 F6');
    w.eq(await app('a.tb.shown.join()'), '0', 'невыбранная последовательность в таблицу не попадает');
    await c.keys('EXIT');
    // тип aₙ: общий член 3n + 2 (клавиша X,θ,T даёт n)
    await c.keys('F3 F1 3 XTT ADD 2 EXE F5 1 EXE 5 EXE EXIT F6');
    w.eq(await app('a.tb.res.seq[0].join()'), '5,8,11,14,17', 'тип aₙ: 3n + 2');
    await has('n', 'заголовок столбца номеров');
    await c.keys('EXIT');
    // тип aₙ₊₂: Фибоначчи
    await c.keys('F3 F3 F4 F5 ADD F2 EXE');
    w.eq(await app('window.__calc.UI.apps.recur.fs()[0].row.length'), 3, 'формула aₙ₊₂ = aₙ₊₁ + aₙ записана');
    await c.keys('F5 1 EXE 8 EXE F2 1 EXE 1 EXE EXIT F6');
    w.eq(await app('a.tb.res.seq[0].join()'), '1,1,2,3,5,8,13,21', 'Фибоначчи');
    await c.keys('EXIT');
    // состояние переживает перезагрузку
    await c.page.waitForTimeout(700);
    await c.page.reload();
    await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
    w.eq(await c.page.evaluate(() => window.__calc.UI.appId), 'recur', 'после перезагрузки открыт тот же режим');
    await c.keys('F6');
    w.eq(await app('a.tb.res.seq[0].join()'), '1,1,2,3,5,8,13,21', 'формулы и настройки сохранились');
    await c.keys('EXIT');
    // удаление формулы и пустая таблица
    await c.keys('DEL F1 F6');
    await has('No Variable', 'без формул таблица не строится');
    await c.keys('EXIT');
    // ошибка в формуле не закрывает редактор
    await c.keys('2 ADD EXE');
    await has('Syntax ERROR', 'ошибка разбора при записи формулы');
    await c.keys('EXIT');
    w.eq(await app('!!a.ed'), true, 'после ошибки ввод продолжается');
    await c.keys('AC AC');
    if (c.errs.length) w.eq(c.errs.join('; '), '', 'ошибки JS');
    const bad2 = w.done('Recursion (с клавиш)');
    await c.close();
    process.exit(bad || bad2 ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
} else process.exit(bad ? 1 : 0);
