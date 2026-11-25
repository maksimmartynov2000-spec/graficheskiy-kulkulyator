// Тесты режима Financial.
//   node tests/fin.js       — расчёты (Node): проценты, платежи, потоки, даты, амортизация, облигации
//   node tests/fin.js web   — ещё и сценарии «с клавиш» в браузере (нужен Playwright и собранный index.html)
const { load, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '40-ui.js', '50-menu.js', '86-fin.js'],
  ['S', 'S_DEF', 'SETUP_DEF', 'CalcError', 'finRate', 'finTvm', 'finSimple', 'finAmort', 'finEff', 'finApr', 'finCost', 'finSell', 'finMargin',
    'finNpv', 'finNfv', 'finIrr', 'finPbp', 'finDays', 'finDateAdd', 'finDep', 'finBond', 'finBondParts']);
const { CalcError, finTvm, finSimple, finAmort, finEff, finApr, finNpv, finNfv, finIrr, finPbp, finDays, finDateAdd, finDep, finBond } = core;
const t = runner();
const errOf = (fn) => { try { fn(); return 'нет ошибки'; } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };
const near = (got, want, what, tol) => t.near(got, want, what, tol || 1e-9);
const D = (m, d, y) => ({ m, d, y });
// сравнение с ответом, записанным десятью значащими цифрами (как на экране калькулятора)
const d10 = (got, want, what) => t.eq(Number(got).toPrecision(10), Number(want).toPrecision(10), what);

// ---------- строки Setup ----------
t.eq(core.S.payment + ' ' + core.S.dateMode + ' ' + core.S.periods, 'End 365 Annual', 'значения Setup по умолчанию');
t.eq(core.S_DEF.payment + ' ' + core.S_DEF.dateMode + ' ' + core.S_DEF.periods, 'End 365 Annual', 'значения Setup для сброса');
t.eq(core.SETUP_DEF.payment[1].join(), 'Begin,End', 'строка Payment в Setup');
t.eq(core.SETUP_DEF.dateMode[1].join(), '365,360', 'строка Date Mode в Setup');
t.eq(core.SETUP_DEF.periods[1].join(), 'Annual,Semi', 'строка Periods/YR. в Setup');

// ---------- сложные проценты ----------
const dep10 = { n: 10, I: 5, PV: -1000, PMT: 0, FV: 0, PY: 1, CY: 1 };
d10(finTvm('FV', dep10, false), 1628.894627, 'FV: 1000 под 5% на 10 лет');
near(finTvm('I', { ...dep10, FV: 1628.894626777442 }, false), 5, 'I%: обратно из FV');
near(finTvm('n', { ...dep10, n: 0, FV: 1628.894626777442 }, false), 10, 'n: обратно из FV');
near(finTvm('PV', { ...dep10, PV: 0, FV: 1628.894626777442 }, false), -1000, 'PV: обратно из FV');
d10(finTvm('PV', { n: 2, I: 10, PV: 0, PMT: 0, FV: 1000, PY: 1, CY: 1 }, false), -826.4462810, 'PV: 1000 через 2 года под 10%');
near(finTvm('n', { n: 0, I: 7.2, PV: -1000, PMT: 0, FV: 2000, PY: 1, CY: 1 }, false), Math.log(2) / Math.log(1.072), 'n: удвоение под 7.2%');

const loan = { n: 360, I: 6, PV: 100000, PMT: 0, FV: 0, PY: 12, CY: 12 };
const pmt = finTvm('PMT', loan, false);
d10(pmt, -599.5505252, 'PMT: 100000 под 6% на 360 месяцев');
near(finTvm('PMT', loan, true), pmt / 1.005, 'PMT при платеже в начале периода');
near(finTvm('I', { ...loan, PMT: pmt }, false), 6, 'I%: обратно из платежа');
near(finTvm('n', { ...loan, n: 0, PMT: pmt }, false), 360, 'n: обратно из платежа');
near(finTvm('PV', { ...loan, PV: 0, PMT: pmt }, false), 100000, 'PV: обратно из платежа');
near(finTvm('FV', { ...loan, n: 120, PMT: pmt }, false), -(100000 * 1.005 ** 120 + pmt * (1.005 ** 120 - 1) / 0.005), 'FV: остаток долга после 120 платежей');
near(finTvm('I', { ...loan, PMT: pmt / 1.005 }, true), 6, 'I%: платёж в начале периода');
// накопления со взносами: 200 в месяц под 3% на 5 лет
{
  const v = { n: 60, I: 3, PV: 0, PMT: -200, FV: 0, PY: 12, CY: 12 }, i = 0.03 / 12;
  near(finTvm('FV', v, false), 200 * ((1 + i) ** 60 - 1) / i, 'FV: взносы в конце месяца');
  near(finTvm('FV', v, true), 200 * ((1 + i) ** 60 - 1) / i * (1 + i), 'FV: взносы в начале месяца');
}
// P/Y ≠ C/Y: 12 платежей в год, начисление раз в полгода
{
  const i = Math.pow(1.03, 2 / 12) - 1, want = -100000 * i / (1 - Math.pow(1 + i, -300));
  const v = { n: 300, I: 6, PV: 100000, PMT: 0, FV: 0, PY: 12, CY: 2 };
  near(finTvm('PMT', v, false), want, 'PMT при P/Y=12, C/Y=2');
  near(finTvm('I', { ...v, PMT: want }, false), 6, 'I% при P/Y=12, C/Y=2');
  near(core.finRate(6, 12, 2), i, 'ставка за период при P/Y=12, C/Y=2', 1e-13);
}
// нулевая и отрицательная ставка
near(finTvm('PMT', { n: 12, I: 0, PV: 1200, PMT: 0, FV: 0, PY: 12, CY: 12 }, false), -100, 'PMT при нулевой ставке');
near(finTvm('n', { n: 0, I: 0, PV: 1200, PMT: -100, FV: 0, PY: 12, CY: 12 }, false), 12, 'n при нулевой ставке');
near(finTvm('FV', { n: 12, I: 0, PV: -500, PMT: -100, FV: 0, PY: 12, CY: 12 }, false), 1700, 'FV при нулевой ставке');
near(finTvm('I', { n: 12, I: 9, PV: 1200, PMT: -100, FV: 0, PY: 12, CY: 12 }, false), 0, 'I% = 0, когда платежи равны долгу', 1e-12);
near(finTvm('I', { n: 5, I: 0, PV: -1000, PMT: 0, FV: 900, PY: 1, CY: 1 }, false), (Math.pow(0.9, 0.2) - 1) * 100, 'I% отрицательная');
// ошибки
t.eq(errOf(() => finTvm('n', { n: 0, I: 0, PV: 100, PMT: 0, FV: 0, PY: 1, CY: 1 }, false)), 'Ma ERROR', 'n: нет платежей и нулевая ставка');
t.eq(errOf(() => finTvm('n', { n: 0, I: 5, PV: 1000, PMT: 0, FV: 1000, PY: 1, CY: 1 }, false)), 'Ma ERROR', 'n: недостижимая сумма');
t.eq(errOf(() => finTvm('I', { n: 10, I: 0, PV: 1000, PMT: 0, FV: 1000, PY: 1, CY: 1 }, false)), 'Ma ERROR', 'I%: все суммы одного знака');
t.eq(errOf(() => finTvm('FV', { ...dep10, PY: 0 }, false)), 'Ma ERROR', 'P/Y = 0');
t.eq(errOf(() => finTvm('PMT', { n: 0, I: 5, PV: 1000, PMT: 0, FV: 0, PY: 1, CY: 1 }, false)), 'Ma ERROR', 'PMT при n = 0');

// ---------- простые проценты ----------
t.eq(JSON.stringify(finSimple(365, 5, 1000, '365')), '{"SI":-50,"SFV":-1050}', 'простые проценты за год');
t.eq(JSON.stringify(finSimple(180, 5, 1000, '360')), '{"SI":-25,"SFV":-1025}', 'простые проценты, год 360 дней');
d10(finSimple(120, 5, 10000, '365').SI, -164.3835616, 'SI: 120 дней');
d10(finSimple(120, 5, 10000, '365').SFV, -10164.38356, 'SFV: 120 дней');
t.eq(JSON.stringify(finSimple(365, 5, -1000, '365')), '{"SI":50,"SFV":1050}', 'вклад: знаки обратные');

// ---------- график погашения ----------
{
  const v = { ...loan, PMT: pmt, PM1: 1, PM2: 12 };
  const a = finAmort(v, false), q = 1.005 ** 12;
  const bal12 = 100000 * q + pmt * (q - 1) / 0.005;
  near(a.INT, -500, 'INT: проценты в первом платеже');
  near(a.PRN, pmt + 500, 'PRN: основной долг в первом платеже');
  near(a.BAL, bal12, 'BAL: остаток после 12 платежей');
  near(a.SPRN, bal12 - 100000, 'ΣPRN за 12 платежей');
  near(a.SINT, 12 * pmt - (bal12 - 100000), 'ΣINT за 12 платежей');
  const last = finAmort({ ...v, PM1: 360, PM2: 360 }, false);
  near(last.BAL, 0, 'BAL после последнего платежа', 1e-6);
  near(last.INT + last.PRN, pmt, 'последний платёж = проценты + долг');
  const b = finAmort({ ...loan, PMT: pmt / 1.005, PM1: 1, PM2: 1 }, true);
  t.eq(b.INT, 0, 'платёж в начале периода: в первом платеже процентов нет');
  near(b.PRN, pmt / 1.005, 'платёж в начале периода: первый платёж — основной долг');
  near(finAmort({ ...loan, PMT: pmt / 1.005, PM1: 360, PM2: 360 }, true).BAL, 0, 'платёж в начале периода: долг погашен', 1e-6);
  t.eq(errOf(() => finAmort({ ...v, PM1: 5, PM2: 3 }, false)), 'Ma ERROR', 'PM1 больше PM2');
  t.eq(errOf(() => finAmort({ ...v, PM1: 0 }, false)), 'Ma ERROR', 'PM1 = 0');
  t.eq(errOf(() => finAmort({ ...v, PM2: 1.5 }, false)), 'Ma ERROR', 'PM2 не целое');
}

// ---------- пересчёт ставок ----------
d10(finEff(12, 12), 12.68250301, 'EFF: 12% при 12 начислениях');
near(finApr(12, 12.68250301319698), 12, 'APR: обратно');
near(finEff(1, 7), 7, 'EFF при одном начислении');
near(finEff(2, 10), 10.25, 'EFF: 10% при двух начислениях');
near(finApr(4, 8.243216), 8, 'APR: 8% при четырёх начислениях', 1e-7);
t.eq(errOf(() => finEff(0, 5)), 'Ma ERROR', 'EFF при n = 0');

// ---------- себестоимость, цена, наценка ----------
near(core.finMargin(40, 100), 60, 'наценка');
near(core.finSell(40, 60), 100, 'цена');
near(core.finCost(100, 60), 40, 'себестоимость');
near(core.finMargin(75, 60), -25, 'отрицательная наценка');
t.eq(errOf(() => core.finSell(40, 100)), 'Ma ERROR', 'цена при наценке 100%');
t.eq(errOf(() => core.finMargin(40, 0)), 'Ma ERROR', 'наценка при нулевой цене');

// ---------- денежный поток ----------
d10(finNpv(10, [-1000, 500, 600]), -49.58677686, 'NPV');
near(finNfv(10, [-1000, 500, 600]), -60, 'NFV');
d10(finIrr([-1000, 500, 600]), 6.394102980, 'IRR');
near(finNpv(finIrr([-1000, 300, 400, 500, 200]), [-1000, 300, 400, 500, 200]), 0, 'NPV при ставке IRR равна нулю', 1e-9);
near(finNpv(0, [-1000, 300, 400, 500, 200]), 400, 'NPV при нулевой ставке');
near(finIrr([-1000, 400, 400]), (Math.sqrt(0.16 + 1.6) + 0.4) / 2 * 100 - 100, 'IRR отрицательная');
t.eq(finPbp(0, [-1000, 500, 500, 500]), 2, 'PBP без дисконтирования');
near(finPbp(10, [-1000, 500, 500, 500]), 2.352, 'PBP при 10%', 1e-9);
near(finPbp(0, [-1000, 400, 400, 400]), 2.5, 'PBP: окупаемость посреди периода');
t.eq(finPbp(5, [100, 200]), 0, 'PBP: нет вложений');
t.eq(errOf(() => finPbp(0, [-1000, 100, 100])), 'Ma ERROR', 'PBP: не окупается');
t.eq(errOf(() => finIrr([100, 200, 300])), 'Ma ERROR', 'IRR: поток одного знака');
t.eq(errOf(() => finNpv(5, [])), 'Dimension ERROR', 'NPV: пустой список');
t.eq(errOf(() => finIrr([5])), 'Dimension ERROR', 'IRR: один платёж');

// ---------- даты ----------
t.eq(finDays(D(1, 1, 2020), D(12, 31, 2020), '365'), 365, 'дней в високосном году без одного');
t.eq(finDays(D(1, 1, 2021), D(1, 1, 2022), '365'), 365, 'дней в обычном году');
t.eq(finDays(D(2, 28, 2020), D(3, 1, 2020), '365'), 2, 'через 29 февраля');
t.eq(finDays(D(3, 1, 2020), D(1, 1, 2020), '365'), -60, 'обратный порядок дат');
t.eq(finDays(D(1, 1, 1901), D(12, 31, 2099), '365'), 72683, 'весь допустимый диапазон');
t.eq(finDays(D(1, 1, 2020), D(12, 31, 2020), '360'), 360, 'год по правилу 30/360');
t.eq(finDays(D(1, 31, 2020), D(3, 31, 2020), '360'), 60, '30/360: два месяца с 31-го по 31-е');
t.eq(finDays(D(1, 15, 2020), D(2, 15, 2020), '360'), 30, '30/360: месяц');
t.eq(JSON.stringify(finDateAdd(D(1, 1, 2020), 59, '365')), '{"m":2,"d":29,"y":2020}', 'd1+D: 29 февраля');
t.eq(JSON.stringify(finDateAdd(D(1, 1, 2020), 60, '365')), '{"m":3,"d":1,"y":2020}', 'd1+D: 1 марта');
t.eq(JSON.stringify(finDateAdd(D(3, 1, 2021), -1, '365')), '{"m":2,"d":28,"y":2021}', 'd1−D: 28 февраля');
t.eq(JSON.stringify(finDateAdd(D(12, 31, 2019), 366, '365')), '{"m":12,"d":31,"y":2020}', 'd1+D через високосный год');
t.eq(errOf(() => finDateAdd(D(1, 1, 2020), 30, '360')), 'Ma ERROR', 'd1+D при годе из 360 дней не считается');
t.eq(errOf(() => finDays(D(2, 30, 2020), D(3, 1, 2020), '365')), 'Ma ERROR', 'несуществующая дата');
t.eq(errOf(() => finDays(D(2, 29, 2021), D(3, 1, 2021), '365')), 'Ma ERROR', '29 февраля в обычном году');
t.eq(errOf(() => finDays(D(1, 1, 1900), D(3, 1, 2021), '365')), 'Ma ERROR', 'год раньше 1901');
t.eq(errOf(() => finDateAdd(D(12, 31, 2099), 1, '365')), 'Ma ERROR', 'дата позже 2099 года');
t.eq(errOf(() => finDateAdd(D(1, 1, 2020), 1.5, '365')), 'Ma ERROR', 'нецелое число дней');

// ---------- амортизация имущества ----------
{
  const v = { n: 5, I: 200, PV: 10000, FV: 1000, j: 1, YR1: 12 };
  const val = (kind, j, x) => finDep(kind, { ...v, j, ...x });
  t.eq(val('SL', 3).val, 1800, 'SL: полный год');
  t.eq(val('SL', 1, { YR1: 6 }).val, 900, 'SL: неполный первый год');
  t.eq(val('SL', 6, { YR1: 6 }).val, 900, 'SL: год n+1');
  t.eq(errOf(() => val('SL', 6)), 'Ma ERROR', 'SL: года n+1 нет, если первый год полный');
  near(val('SYD', 1).val, 3000, 'SYD: первый год'); near(val('SYD', 1).rdv, 6000, 'SYD: остаток после первого года');
  near(val('SYD', 2).val, 2400, 'SYD: второй год'); near(val('SYD', 2).rdv, 3600, 'SYD: остаток после второго года');
  near(val('SYD', 5).val, 600, 'SYD: последний год'); t.eq(val('SYD', 5).rdv, 0, 'SYD: в конце остатка нет');
  near([1, 2, 3, 4, 5].reduce((s, j) => s + val('SYD', j).val, 0), 9000, 'SYD: сумма за все годы');
  near(val('DB', 1).val, 4000, 'DB: первый год'); near(val('DB', 1).rdv, 5000, 'DB: остаток после первого года');
  near(val('DB', 2).val, 2400, 'DB: второй год'); near(val('DB', 2).rdv, 2600, 'DB: остаток после второго года');
  near(val('DB', 1, { YR1: 3 }).val, 1000, 'DB: неполный первый год');
  near(val('FP', 1, { I: 25 }).val, 2500, 'FP: первый год'); near(val('FP', 2, { I: 25 }).val, 1875, 'FP: второй год');
  near(val('FP', 2, { I: 25 }).rdv, 4625, 'FP: остаток после второго года');
  t.eq(val('FP', 6, { I: 25, YR1: 6 }).rdv, 0, 'FP: после года n+1 остатка нет');
  t.eq(errOf(() => val('SL', 0)), 'Ma ERROR', 'год 0');
  t.eq(errOf(() => val('DB', 1, { n: 0 })), 'Ma ERROR', 'срок службы 0');
  t.eq(errOf(() => val('SL', 1, { YR1: 13 })), 'Ma ERROR', 'YR1 больше 12');
  t.eq(errOf(() => val('DB', 5, { n: 1e9 })), 'Ma ERROR', 'слишком большой срок службы');
}

// ---------- облигации ----------
{
  // справочный пример: покупка 15.02.2008, погашение 15.11.2017, купон 5.75% дважды в год, доходность 6.5%, 30/360
  const b = { d1: D(2, 15, 2008), d2: D(11, 15, 2017), RDV: 100, CPN: 5.75, PRC: 0, YLD: 6.5 };
  const p = core.finBondParts(b.d1, b.d2, 2, '360');
  t.eq([p.N, p.D, p.A, p.B].join(), '20,180,90,90', 'купонные периоды');
  const r = finBond('PRC', b, '360', 'Semi');
  d10(r.PRC, -94.63436162, 'PRC: цена облигации');
  near(r.INT, -1.4375, 'INT: накопленный купон');
  near(r.CST, r.PRC + r.INT, 'CST: цена с купоном');
  near(finBond('YLD', { ...b, d2: D(11, 15, 2016), PRC: -95.04287 }, '360', 'Semi'), 6.5, 'YLD: доходность по цене', 1e-6);
  near(finBond('YLD', { ...b, PRC: r.PRC }, '360', 'Semi'), 6.5, 'YLD: обратно из цены');
  // покупка в день выплаты купона: накопленного купона нет, цена — приведённая стоимость
  const on = finBond('PRC', { ...b, d1: D(11, 15, 2007) }, '360', 'Semi');
  t.eq(on.INT === 0, true, 'в день купона накопленного купона нет');
  let pv = 100 / 1.0325 ** 20;
  for (let k = 1; k <= 20; k++) pv += 2.875 / 1.0325 ** k;
  near(on.PRC, -pv, 'цена в день купона');
  // один купонный период до погашения
  const one = finBond('PRC', { ...b, d1: D(9, 15, 2017) }, '360', 'Semi');
  near(one.PRC, -(100 + 2.875) / (1 + (60 / 180) * 0.0325) + (120 / 180) * 2.875, 'цена при одном оставшемся купоне');
  // годовые купоны и календарные дни
  const yr = { d1: D(6, 1, 2020), d2: D(6, 1, 2025), RDV: 100, CPN: 4, PRC: 0, YLD: 4 };
  near(finBond('PRC', yr, '365', 'Annual').PRC, -100, 'цена равна номиналу, когда купон равен доходности');
  const mid = finBond('PRC', { ...yr, d1: D(9, 1, 2020), YLD: 5 }, '365', 'Annual');
  near(finBond('YLD', { ...yr, d1: D(9, 1, 2020), PRC: mid.PRC }, '365', 'Annual'), 5, 'YLD: календарные дни, обратно из цены');
  near(mid.INT, -4 * 92 / 365, 'INT по календарным дням');
  t.eq(errOf(() => finBond('PRC', { ...yr, d2: D(6, 1, 2020) }, '365', 'Annual')), 'Ma ERROR', 'погашение не позже покупки');
  t.eq(errOf(() => finBond('YLD', { ...yr, PRC: 50 }, '365', 'Annual')), 'Ma ERROR', 'YLD: цена с неверным знаком');
}

const unit = t.done('Financial (расчёты)');

// ---------- сценарии «с клавиш» ----------
async function web() {
  const { open } = require('./web');
  const c = await open({ w: 393, h: 852, dpr: 1 });
  let pass = 0, failN = 0;
  const ok = (cond, what) => { if (cond) pass++; else { failN++; console.log('  ✗ ' + what); } };
  const K = (s) => c.keys(s);
  const scr = async () => (await c.text()).join(' | ');
  const has = async (s, what) => { const x = await scr(); ok(x.includes(s), `${what}: на экране нет «${s}» (есть: ${x})`); };
  const fin = (expr) => c.page.evaluate((e) => { const f = window.__calc.UI.apps.fin; return Function('f', 'return ' + e)(f); }, expr);
  const nearly = (got, want, what) => ok(typeof got === 'number' && Math.abs(got - want) <= 1e-8 * Math.max(1, Math.abs(want)), `${what}: получено ${got}, ожидалось ${want}`);
  const ready = () => c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  await c.page.evaluate(() => localStorage.clear());
  await c.page.reload();
  await ready();

  await K('MENU LN');
  await has('Financial(1/2)', 'главное меню, клавиша C');
  await has('F2:Compound Interest', 'первая страница');
  await K('F6');
  await has('Financial(2/2)', 'вторая страница');
  await has('F2:Days Calculation', 'строки второй страницы');
  await K('F6 F2');
  await has('Compound Interest:End', 'Compound Interest');
  await K('1 0 EXE 5 EXE NEG 1 0 0 0 EXE 0 EXE DOWN 1 EXE 1 EXE');
  ok(await fin('[f.t.n, f.t.I, f.t.PV, f.t.PY, f.t.CY].join()') === '10,5,-1000,1,1', 'поля записываются по EXE');
  await K('F5');
  await has('1628.894627', 'FV на экране ответа');
  await has('REPEAT', 'меню ответа');
  await K('F1');
  nearly(await fin('f.t.FV'), 1628.8946267774422, 'найденное FV записано в поле');
  await has('AMORTZN', 'REPEAT возвращает к полям');
  await K('DOWN 0 EXE F2');                       // сбросили I% и нашли её обратно
  await has('I%', 'ответ I%');
  nearly(await fin('f.t.I'), 5, 'I% найдена обратно');
  await K('F1');
  // ввод выражением и отмена ввода (курсор на PV)
  await K('2 MUL 3 EXE');
  ok(await fin('f.t.PV') === 6, 'поле принимает выражение 2×3');
  await K('UP 7 7 EXIT');
  ok(await fin('f.t.PV') === 6, 'EXIT отменяет ввод');
  // кредит и график погашения
  await K('UP UP 3 6 0 EXE 6 EXE 1 0 0 0 0 0 EXE 0 EXE 0 EXE 1 2 EXE 1 2 EXE');
  ok(await fin('[f.t.n, f.t.I, f.t.PV, f.t.PMT, f.t.FV, f.t.PY, f.t.CY].join()') === '360,6,100000,0,0,12,12', 'данные кредита введены');
  await K('F4');
  await has('PMT', 'ответ PMT');
  await has('−599.5505252', 'платёж по кредиту');
  await K('F1 F6');
  await has('Amortization:End', 'переход в Amortization');
  await K('1 EXE 1 2 EXE F1');
  await has('98771.98829', 'BAL после 12 платежей');
  await K('F1 F2');
  await has('−500', 'INT первого платежа');
  await K('EXIT F5');
  await has('−1228.011712', 'ΣPRN за 12 платежей');
  await K('F1 F6');
  await has('Compound Interest:End', 'COMPOUND возвращает в Compound Interest');
  // Setup: платёж в начале периода
  await K('SHIFT MENU');
  await has('Payment', 'Setup: строка Payment');
  await has('Date Mode', 'Setup: строка Date Mode');
  await has('Periods/YR.', 'Setup: строка Periods/YR.');
  await K('F1 EXIT');
  await has('Compound Interest:Bgn', 'заголовок при платеже в начале периода');
  await K('F4');
  await has('−596.5676867', 'PMT при платеже в начале периода');
  await K('F1 SHIFT MENU F2 EXIT EXIT');
  await has('Financial(1/2)', 'EXIT из расчёта — на начальный экран');
  // простые проценты
  await K('F1 3 6 5 EXE 5 EXE 1 0 0 0 EXE F1');
  await has('SI', 'Simple Interest: SI');
  await has('−50', 'SI за год');
  await K('F1 F2');
  await has('−1050', 'SFV за год');
  await K('EXIT EXIT');
  // пересчёт ставок
  await K('F5 1 2 EXE 1 2 EXE F1');
  await has('12.68250301', 'Conversion: EFF');
  await K('EXE F2');
  await has('APR', 'Conversion: APR');
  await K('EXIT EXIT');
  // денежный поток
  await K('F3');
  await has('List 1', 'Cash Flow: список по умолчанию');
  await K('F1');
  await has('Dimension ERROR', 'пустой список — ошибка');
  await K('EXIT F5 NEG 1 0 0 0 EXE 5 0 0 EXE 6 0 0 EXE 9 9 EXE UP DEL');
  ok(await c.page.evaluate(() => window.__calc.mem.lists[0].map((x) => x.v).join()) === '-1000,500,600', 'платежи записаны в List 1');
  await K('EXIT 1 0 EXE F1');
  await has('−49.58677686', 'NPV');
  await K('F1 F2');
  await has('6.39410298', 'IRR');
  await K('F1 F4');
  await has('−60', 'NFV');
  await K('F1 2 EXE');                            // курсор на строке Csh
  await has('List 2', 'смена списка вводом номера');
  await K('DOWN 3 0 EXE');
  await has('Argument ERROR', 'номер списка вне 1–26');
  await K('EXIT AC AC F6 1 EXE EXE');
  await has('List 1', 'выбор списка через LIST');
  await K('EXIT F6');
  // вторая страница: наценка
  await K('F1 4 0 EXE 1 0 0 EXE F3');
  await has('Mrg', 'Cost/Sell/Margin: Mrg');
  await has('60', 'наценка 60%');
  nearly(await fin('f.c.Mrg'), 60, 'наценка записана в поле');
  await K('F1 EXIT');
  await has('Financial(2/2)', 'EXIT со второй страницы возвращает на неё же');
  // дни
  await K('F2 1 EXE 1 EXE 2 0 2 0 EXE 1 2 EXE 3 1 EXE 2 0 2 0 EXE 5 9 EXE F1');
  await has('PRD', 'Days: PRD');
  await has('365', 'дней между датами');
  await K('F1 F2');
  await has('2/29/2020', 'd1+D');
  await K('F1 F3');
  await has('11/3/2019', 'd1−D');
  await K('F1 SHIFT MENU DOWN F2 EXIT F2');
  await has('Ma ERROR', 'd1+D при годе из 360 дней');
  await K('EXIT F1');
  await has('360', 'PRD по правилу 30/360');
  await K('F1 SHIFT MENU DOWN F1 EXIT EXIT');
  // амортизация имущества
  await K('F3 5 EXE 2 0 0 EXE 1 0 0 0 0 EXE 1 0 0 0 EXE 2 EXE 1 2 EXE F4');
  await has('DB', 'Depreciation: DB');
  await has('2400', 'DB за второй год');
  await has('2600', 'RDV после второго года');
  await K('F1 F1');
  await has('1800', 'SL');
  await K('F1 EXIT');
  // облигация
  await K('SHIFT MENU DOWN F2 DOWN F2 EXIT');
  await K('F4 2 EXE 1 5 EXE 2 0 0 8 EXE 1 1 EXE 1 5 EXE 2 0 1 7 EXE 1 0 0 EXE 5 DOT 7 5 EXE DOWN 6 DOT 5 EXE F1');
  await has('−94.63436162', 'Bond: PRC');
  await has('−1.4375', 'Bond: INT');
  await has('−96.07186162', 'Bond: CST');
  await K('F1 UP 0 EXE F2');
  await has('YLD', 'Bond: YLD');
  nearly(await fin('f.b.YLD'), 6.5, 'доходность найдена обратно');
  await K('F1 SHIFT MENU DOWN F1 DOWN F1 EXIT EXIT');
  // сохранение и сброс
  await c.page.waitForTimeout(700);
  await c.page.reload();
  await ready();
  ok(await c.page.evaluate(() => window.__calc.UI.appId) === 'fin', 'после перезагрузки открыт Financial');
  await has('Financial(1/2)', 'после перезагрузки — начальный экран');
  ok(await fin('[f.t.PV, f.c.Cst, f.d.D, f.b.CPN, f.cf.list].join()') === '10000,40,59,5.75,1', 'значения полей сохранились');
  await c.page.evaluate(() => window.__calc.UI.apps.fin.reset());
  ok(await fin('[f.t.PV, f.t.PY, f.c.Cst, f.d.D, f.b.RDV].join()') === '0,12,0,0,100', 'reset возвращает значения по умолчанию');
  // касание строки начального экрана
  await c.page.evaluate(() => { const r = document.getElementById('lcd').getBoundingClientRect(); const ev = new PointerEvent('pointerdown', { clientX: r.left + r.width * 0.3, clientY: r.top + r.height * (84 / 216), bubbles: true, cancelable: true }); document.getElementById('lcd').dispatchEvent(ev); });
  await has('Compound Interest:End', 'касание строки открывает расчёт');
  // случайные нажатия внутри режима: ни одной необработанной ошибки
  const crashes = await c.page.evaluate(() => {
    let seed = 20261125, bad = 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const keys = [...document.querySelectorAll('[data-k]')].map((el) => el.dataset.k).filter((k) => k !== 'MENU');
    const common = ['EXE', 'EXE', 'EXIT', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'UP', 'DOWN', '1', '2', '0', 'NEG', 'DOT', '9'];
    const log = [];
    for (let i = 0; i < 4000; i++) {
      if (i % 500 === 0) { window.__calc.UI.modals.length = 0; window.__calc.UI.off = false; window.__calc.keys('MENU LN'); }
      const k = rnd() < 0.7 ? common[Math.floor(rnd() * common.length)] : keys[Math.floor(rnd() * keys.length)];
      log.push(k);
      try { window.__calc.press(k); } catch (e) {
        bad++;
        if (bad <= 3) console.error('после «' + log.slice(-20).join(' ') + '»: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
        window.__calc.UI.modals.length = 0;
      }
    }
    window.__calc.UI.modals.length = 0; window.__calc.UI.off = false;
    return bad;
  });
  ok(crashes === 0, 'случайные нажатия в режиме: ошибок ' + crashes);
  await K('MENU 1 AC 2 ADD 2 EXE');
  ok(await c.page.evaluate(() => { const h = window.__calc.UI.apps.run.hist; return h[h.length - 1].val.v; }) === 4, 'после Financial остальные режимы работают');
  if (c.errs.length) { failN++; console.log('  ✗ ошибки JS: ' + c.errs.join('; ')); }
  console.log(`Financial (с клавиш): прошло ${pass}, не прошло ${failN}`);
  await c.close();
  return failN;
}

(async () => {
  const failed = unit + (process.argv.includes('web') ? await web() : 0);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
