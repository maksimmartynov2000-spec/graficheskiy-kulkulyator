// ══════ 86-fin.js — режим Financial: проценты, платежи, денежные потоки, даты, амортизация, облигации ══════
//
// Знаки — как у оригинала: полученные деньги положительны, отданные отрицательны
// (PV = 100000 — взяли кредит, PMT = −599.55 — платим).

// Строки Setup этого режима
S.payment = 'End'; S_DEF.payment = 'End';          // Payment: платёж в конце или в начале периода
S.dateMode = '365'; S_DEF.dateMode = '365';        // Date Mode: дней в году
S.periods = 'Annual'; S_DEF.periods = 'Annual';    // Periods/YR.: купонов в год (облигации)
if (typeof SETUP_DEF !== 'undefined') {
  SETUP_DEF.payment = ['Payment', ['Begin', 'End']];
  SETUP_DEF.dateMode = ['Date Mode', ['365', '360']];
  SETUP_DEF.periods = ['Periods/YR.', ['Annual', 'Semi']];
}

// ---------- расчёты (чистые функции, проверяются в tests/fin.js) ----------
const finBad = () => fail('Ma ERROR');
const finNum = (x) => { if (!Number.isFinite(x)) finBad(); return x; };

// Ставка за один период платежа: I% годовых, P/Y платежей и C/Y начислений в год
function finRate(I, PY, CY) {
  if (!(PY > 0) || !(CY > 0) || !Number.isFinite(I)) finBad();
  const base = 1 + I / 100 / CY;
  if (!(base > 0)) finBad();
  return I === 0 ? 0 : Math.expm1(Math.log(base) * CY / PY);
}
// Множители уравнения PV + α·PMT + β·FV = 0 для ставки i за период и n периодов
function finAB(i, n, begin) {
  if (i === 0) return [n, 1];
  const L = Math.log1p(i);
  return [(1 + (begin ? i : 0)) * -Math.expm1(-n * L) / i, Math.exp(-n * L)];
}
// Смена знака f на сетке, идущей от нуля; корень уточняется методом Брента. Нет смены знака — NaN
function finScan(f, f0, grid) {
  let a = 0, fa = f0;
  for (const b of grid) {
    const fb = f(b);
    if (!Number.isFinite(fb)) break;
    if (fb === 0) return b;
    if ((fa < 0) !== (fb < 0)) return a < b ? brent(f, a, b, fa, fb) : brent(f, b, a, fb, fa);
    a = b; fa = fb;
  }
  return NaN;
}
// Корень f(i) = 0 при i > −1: сначала положительные ставки, потом отрицательные
function finRoot(f) {
  const f0 = f(0);
  if (f0 === 0) return 0;
  if (!Number.isFinite(f0)) finBad();
  let r = finScan(f, f0, [1e-6, 1e-4, 1e-3, 0.0025, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 100, 1e3, 1e4]);
  if (!Number.isFinite(r)) r = finScan(f, f0, [-1e-6, -1e-4, -1e-3, -0.005, -0.01, -0.02, -0.05, -0.1, -0.2, -0.5, -0.9, -0.99, -0.999]);
  if (!Number.isFinite(r)) finBad();
  return r;
}
// Сложные проценты: найти what ('n' | 'I' | 'PV' | 'PMT' | 'FV') по остальным. v = {n, I, PV, PMT, FV, PY, CY}
function finTvm(what, v, begin) {
  const { n, PV, PMT, FV, PY, CY } = v;
  if (!(PY > 0) || !(CY > 0)) finBad();
  if (what === 'I') {
    if (![n, PV, PMT, FV].every(Number.isFinite)) finBad();
    const i = finRoot((x) => { const [a, b] = finAB(x, n, begin); return PV + a * PMT + b * FV; });
    return finNum(r15(100 * CY * Math.expm1(Math.log1p(i) * PY / CY)));
  }
  const i = finRate(v.I, PY, CY);
  if (what === 'n') {
    if (i === 0) { if (PMT === 0) finBad(); return finNum(-(PV + FV) / PMT); }
    const k = 1 + (begin ? i : 0);
    const q = (k * PMT - FV * i) / (k * PMT + PV * i);
    if (!(q > 0)) finBad();
    return finNum(r15(Math.log(q) / Math.log1p(i)));
  }
  const [a, b] = finAB(i, n, begin);
  if (what === 'PV') return finNum(-(a * PMT + b * FV));
  if (what === 'FV') return finNum(-(PV + a * PMT) / b);
  if (what === 'PMT') { if (a === 0) finBad(); return finNum(-(PV + b * FV) / a); }
  return finBad();
}
// Простые проценты: n — дни. SI — проценты, SFV — сумма с процентами
function finSimple(n, I, PV, mode) {
  const si = n / (mode === '360' ? 360 : 365) * PV * I / 100;
  return { SI: finNum(-si), SFV: finNum(-(PV + si)) };
}
// График погашения: платежи с PM1 по PM2. BAL — остаток после PM2, INT и PRN — доли платежа PM1
function finAmort(v, begin) {
  const { PM1, PM2, PV, PMT } = v;
  if (!Number.isInteger(PM1) || !Number.isInteger(PM2) || PM1 < 1 || PM2 < PM1 || PM2 > 9999) finBad();
  const i = finRate(v.I, v.PY, v.CY), sg = PMT < 0 ? -1 : 1;
  let bal = PV, int1 = 0, prn1 = 0, sInt = 0, sPrn = 0;
  for (let k = 1; k <= PM2; k++) {
    const first = begin && k === 1;          // при платеже в начале периода первый платёж — целиком основной долг
    const int = first ? 0 : sg * Math.abs(bal * i);
    const prn = first ? PMT : PMT + bal * i;
    bal += prn;
    if (k === PM1) { int1 = int; prn1 = prn; }
    if (k >= PM1) { sInt += int; sPrn += prn; }
  }
  return { BAL: finNum(bal), INT: finNum(int1), PRN: finNum(prn1), SINT: finNum(sInt), SPRN: finNum(sPrn) };
}
// Пересчёт ставок: номинальная (APR) ↔ эффективная (EFF) при n начислениях в год
const finEff = (n, I) => { if (!(n > 0) || !(1 + I / 100 / n > 0)) finBad(); return finNum(r15(Math.expm1(n * Math.log1p(I / 100 / n)) * 100)); };
const finApr = (n, I) => { if (!(n > 0) || !(1 + I / 100 > 0)) finBad(); return finNum(r15(Math.expm1(Math.log1p(I / 100) / n) * n * 100)); };
// Себестоимость, цена, наценка (в процентах от цены)
const finCost = (sel, mrg) => finNum(sel * (1 - mrg / 100));
const finSell = (cst, mrg) => { if (mrg === 100) finBad(); return finNum(cst / (1 - mrg / 100)); };
const finMargin = (cst, sel) => { if (sel === 0) finBad(); return finNum(r15((1 - cst / sel) * 100)); };

// Денежный поток cf[0], cf[1], … через равные периоды, ставка I% за период
function finNpv(I, cf, upto) {
  const q = 1 + I / 100;
  if (!cf.length) fail('Dimension ERROR');
  if (!(q > 0)) finBad();
  let s = 0;
  const last = upto === undefined ? cf.length - 1 : upto;
  for (let k = 0; k <= last; k++) s += cf[k] / Math.pow(q, k);
  return finNum(s);
}
const finNfv = (I, cf) => finNum(finNpv(I, cf) * Math.pow(1 + I / 100, cf.length - 1));
function finIrr(cf) {
  if (cf.length < 2) fail('Dimension ERROR');
  return finNum(r15(finRoot((x) => { let s = 0; for (let k = 0; k < cf.length; k++) s += cf[k] * Math.exp(-k * Math.log1p(x)); return s; }) * 100));
}
// Срок окупаемости (с дисконтированием и линейной поправкой внутри периода)
function finPbp(I, cf) {
  if (!cf.length) fail('Dimension ERROR');
  if (cf[0] >= 0) return 0;
  let prev = finNpv(I, cf, 0);
  for (let n = 0; n + 1 < cf.length; n++) {
    const next = finNpv(I, cf, n + 1);
    if (prev <= 0 && next >= 0) return finNum(r15(n - prev / (next - prev)));
    prev = next;
  }
  return finBad();
}

// Даты {m, d, y}: с 1 января 1901 по 31 декабря 2099
const finMonthLen = (m, y) => (m === 2 ? ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);
function finDateOk(q) {
  if (![q.m, q.d, q.y].every(Number.isInteger) || q.y < 1901 || q.y > 2099 || q.m < 1 || q.m > 12 || q.d < 1 || q.d > finMonthLen(q.m, q.y)) finBad();
  return q;
}
const finDayNo = (q) => Date.UTC(q.y, q.m - 1, q.d) / 86400000;
function finFromDayNo(n) {
  const t = new Date(n * 86400000);
  return finDateOk({ m: t.getUTCMonth() + 1, d: t.getUTCDate(), y: t.getUTCFullYear() });
}
// Дней от d1 до d2: по календарю или по правилу «30 дней в месяце, 360 в году»
function finDays(d1, d2, mode) {
  finDateOk(d1); finDateOk(d2);
  if (mode !== '360') return finDayNo(d2) - finDayNo(d1);
  const a = Math.min(d1.d, 30), b = d2.d === 31 && a === 30 ? 30 : d2.d;
  return (d2.y - d1.y) * 360 + (d2.m - d1.m) * 30 + (b - a);
}
// Дата через D дней (в году из 360 дней такой расчёт не делается — как у оригинала)
function finDateAdd(q, D, mode) {
  finDateOk(q);
  if (mode === '360' || !Number.isInteger(D)) finBad();
  return finFromDayNo(finDayNo(q) + D);
}
function finAddMonths(q, k) {
  const t = q.y * 12 + (q.m - 1) + k, y = Math.floor(t / 12), m = t - y * 12 + 1;
  return { m, d: Math.min(q.d, finMonthLen(m, y)), y };
}

// Амортизация имущества: kind — 'SL' | 'FP' | 'SYD' | 'DB'; v = {n, I, PV, FV, j, YR1}
// → {val, rdv}: списание за год j и остаток к списанию после него
function finDep(kind, v) {
  const { n, I, PV, FV, j, YR1 } = v;
  if (!(n > 0) || n > 9999 || !Number.isInteger(n) || !Number.isInteger(j) || j < 1 || !(YR1 >= 1 && YR1 <= 12)) finBad();
  const part = YR1 !== 12;                     // первый год неполный — есть год n+1
  if (j > n + (part ? 1 : 0)) finBad();
  const base = PV - FV, f1 = YR1 / 12;
  if (kind === 'SL') return { val: finNum(j === 1 ? base / n * f1 : j === n + 1 ? base / n * (1 - f1) : base / n), rdv: null };
  let val = 0, rdv = 0;
  if (kind === 'SYD') {
    const Z = n * (n + 1) / 2, n1 = n - f1, ip = Math.floor(n1), Z1 = (ip + 1) * (ip + 2 * (n1 - ip)) / 2;
    const first = n / Z * f1 * base;
    val = first; rdv = base - first;
    for (let k = 2; k <= j; k++) {
      val = (n1 - k + 2) / Z1 * (base - first) * (k === n + 1 ? 1 - f1 : 1);
      rdv -= val;
    }
    if (j === n + (part ? 1 : 0)) rdv = Math.abs(rdv) < 1e-9 * Math.max(1, Math.abs(base)) ? 0 : rdv;
    return { val: finNum(val), rdv: finNum(rdv) };
  }
  const rate = kind === 'FP' ? I / 100 : I / 100 / n;          // FP — доля в год, DB — коэффициент ускорения
  val = PV * rate * f1; rdv = base - val;
  for (let k = 2; k <= j; k++) {
    if (k === n + 1) { val = rdv; rdv = 0; } else { val = (rdv + FV) * rate; rdv -= val; }
  }
  return { val: finNum(val), rdv: finNum(rdv) };
}

// Облигация: d1 — покупка, d2 — погашение, M купонов в год. → число оставшихся купонов N,
// дней в купонном периоде D, прошло A, осталось B до ближайшего купона
function finBondParts(d1, d2, M, mode) {
  finDateOk(d1); finDateOk(d2);
  if (!(finDayNo(d2) > finDayNo(d1))) finBad();
  let N = 0, prev = d2, next = d2;
  do { N++; next = prev; prev = finAddMonths(d2, -N * 12 / M); } while (finDayNo(prev) > finDayNo(d1) && N < 2400);
  const cnt = (a, b) => (mode === '360' ? finDays(a, b, '360') : finDayNo(b) - finDayNo(a));
  const D = mode === '360' ? 360 / M : cnt(prev, next), A = cnt(prev, d1);
  return { N, D, A, B: D - A };
}
// Цена на 100 единиц номинала (отрицательная — деньги отдаём), без накопленного купона
function finBondPrice(p, RDV, CPN, YLD, M) {
  const y = YLD / 100 / M, c = CPN / M, w = p.B / p.D;
  if (!(1 + y > 0)) return NaN;
  if (p.N <= 1) return -(RDV + c) / (1 + w * y) + p.A / p.D * c;
  let prc = -RDV / Math.pow(1 + y, p.N - 1 + w);
  for (let k = 1; k <= p.N; k++) prc -= c / Math.pow(1 + y, k - 1 + w);
  return prc + p.A / p.D * c;
}
// what = 'PRC' → {PRC, INT, CST}; what = 'YLD' → доходность в процентах. v = {d1, d2, RDV, CPN, PRC, YLD}
function finBond(what, v, mode, periods) {
  const M = periods === 'Semi' ? 2 : 1, p = finBondParts(v.d1, v.d2, M, mode);
  if (what === 'PRC') {
    const prc = finNum(finBondPrice(p, v.RDV, v.CPN, v.YLD, M)), int = -p.A / p.D * v.CPN / M;
    return { PRC: prc, INT: finNum(int), CST: finNum(prc + int) };
  }
  const g = (yl) => finBondPrice(p, v.RDV, v.CPN, yl, M) - v.PRC;
  const g0 = g(0);
  if (g0 === 0) return 0;
  if (!Number.isFinite(g0)) finBad();
  let y = finScan(g, g0, [0.5, 1, 2, 5, 10, 20, 50, 100, 1000]);
  if (!Number.isFinite(y)) y = finScan(g, g0, [-0.5, -1, -2, -5, -10, -20, -50, -90]);
  return finNum(r15(y));
}

// ---------- экраны ----------
const FIN_T0 = { n: 0, I: 0, PV: 0, PMT: 0, FV: 0, PY: 12, CY: 12, PM1: 1, PM2: 1, j: 1, YR1: 12 };
const FIN_C0 = { Cst: 0, Sel: 0, Mrg: 0 };
const FIN_D0 = { m1: 1, d1: 1, y1: 2020, m2: 1, d2: 1, y2: 2020, D: 0 };
const FIN_B0 = { RDV: 100, CPN: 0, PRC: 0, YLD: 0 };
const FIN_PAGES = [
  [['simple', 'SIMPLE', 'Simple Interest'], ['compound', 'COMPOUND', 'Compound Interest'], ['cash', 'CASH', 'Cash Flow'], ['amort', 'AMORTZN', 'Amortization'], ['conv', 'CONVERT', 'Conversion']],
  [['cost', 'COST', 'Cost/Sell/Margin'], ['days', 'DAYS', 'Days Calculation'], ['dep', 'DEPREC', 'Depreciation'], ['bond', 'BOND', 'Bond Calculation'], null]
];

// Столбец платежей (List n): правка значений денежного потока
function finListEdit(n) {
  const list = () => mem.lists[n - 1] || (mem.lists[n - 1] = []);
  pushModal({
    sel: 0, top: 0, field: null,
    see() {
      this.sel = Math.max(0, Math.min(list().length, this.sel));
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 4) this.top = this.sel - 4;
    },
    key(k) {
      const a = list();
      if (this.field) {
        this.field.key(k, (x) => { a[this.sel] = x; this.field = null; this.sel++; this.see(); }, () => { this.field = null; });
        return;
      }
      const f = fIndex(k);
      if (f === 0 || k.id === 'DEL') { if (this.sel < a.length) a.splice(this.sel, 1); }
      else if (f === 1) { if (a.length) confirmBox(['Delete All?', ''], () => { mem.lists[n - 1] = []; this.sel = 0; this.top = 0; }); return; }
      else if (f === 2) { if (a.length < 999) a.splice(this.sel, 0, RI(0)); }
      else if (k.id === 'UP') this.sel--;
      else if (k.id === 'DOWN' || k.id === 'EXE') this.sel++;
      else if (k.id === 'EXIT') { popModal(); return; }
      else if (startsNumber(k)) { if (a.length >= 999 && this.sel >= a.length) fail('Memory ERROR'); this.field = new NumField(); this.field.key(k); return; }
      this.see();
    },
    draw() {
      const a = list();
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, 'List ' + n);
      lcd.line(0, 47.5, LW, 47.5, '#000', 1);
      for (let r = 0; r < 5; r++) {
        const i = this.top + r;
        if (i > a.length) break;
        const y = 48 + r * 24, idx = String(i + 1), on = i === this.sel;
        lcd.text(54 - idx.length * 18, y, idx);
        if (on) lcd.rect(72, y, LW - 76, 24, HILITE);
        if (i < a.length) { const s = fmtFit(a[i].v, 15); lcd.text(LW - 6 - [...s].length * 18, y, s, { color: on ? '#fff' : '#000' }); }
      }
      lcd.line(63.5, 48, 63.5, 168, '#000', 1);
      lcd.line(0, 168.5, LW, 168.5, '#000', 1);
      if (this.field) this.field.draw(4, 180, LW - 8);
      else if (this.sel < a.length) { const s = fmtNum(a[this.sel].v); lcd.text(LW - 4 - [...s].length * 18, 169, s); }
      lcd.fmenu([{ l: 'DELETE', k: 'cmd' }, { l: 'DEL-ALL', k: 'cmd' }, { l: 'INSERT', k: 'cmd' }]);
    }
  });
}

const finApp = {
  page: 0, scr: 'menu', sel: 0, top: 0, field: null, res: null, menu: null, defs: null,
  t: { ...FIN_T0 }, c: { ...FIN_C0 }, d: { ...FIN_D0 }, b: { ...FIN_B0 }, cf: { list: 1 },

  enter() { this.scr = 'menu'; this.page = 0; this.field = null; this.res = null; },
  setup() { return ['payment', 'dateMode', 'periods', 'disp']; },

  // Описания расчётов: заголовок, поля [объект, ключ, подпись], меню действий
  forms() {
    if (this.defs) return this.defs;
    const t = this.t, c = this.c, d = this.d, b = this.b, cf = this.cf;
    const F = (o, k, l, list) => ({ o, k, l, list: !!list });
    const tvm = [F(t, 'n', 'n'), F(t, 'I', 'I%'), F(t, 'PV', 'PV'), F(t, 'PMT', 'PMT'), F(t, 'FV', 'FV'), F(t, 'PY', 'P/Y'), F(t, 'CY', 'C/Y')];
    const date = (x) => [F(d, 'm' + x, 'd' + x + ':M'), F(d, 'd' + x, 'd' + x + ':D'), F(d, 'y' + x, 'd' + x + ':Y')];
    const begin = () => S.payment === 'Begin';
    const pay = () => (begin() ? 'Bgn' : 'End');
    const D1 = () => ({ m: d.m1, d: d.d1, y: d.y1 }), D2 = () => ({ m: d.m2, d: d.d2, y: d.y2 });
    const flows = () => { const a = mem.lists[cf.list - 1]; if (!a || !a.length) fail('Dimension ERROR'); return a.map((x) => x.v); };
    const show = (rows) => this.show(rows);
    const dateStr = (q) => q.m + '/' + q.d + '/' + q.y;
    // найти переменную сложных процентов и записать её в своё поле
    const solve = (what, label) => mi(label, () => { const x = finTvm(what, t, begin()); t[what] = x; show([[label, x]]); });
    const amort = (key, label) => mi(label, () => show([[label, finAmort(t, begin())[key]]]));
    const dep = (kind) => mi(kind, () => { const r = finDep(kind, t); show(r.rdv === null ? [[kind, r.val]] : [[kind, r.val], ['RDV', r.rdv]]); });
    this.defs = {
      simple: {
        title: () => 'Simple Interest', fields: tvm.slice(0, 3),
        menu: [mi('SI', () => show([['SI', finSimple(t.n, t.I, t.PV, S.dateMode).SI]])), mi('SFV', () => show([['SFV', finSimple(t.n, t.I, t.PV, S.dateMode).SFV]]))]
      },
      compound: {
        title: () => 'Compound Interest:' + pay(), fields: tvm,
        menu: [solve('n', 'n'), solve('I', 'I%'), solve('PV', 'PV'), solve('PMT', 'PMT'), solve('FV', 'FV'), mi('AMORTZN', () => this.open('amort'))]
      },
      cash: {
        title: () => 'Cash Flow', fields: [F(t, 'I', 'I%'), F(cf, 'list', 'Csh', true)],
        menu: [
          mi('NPV', () => show([['NPV', finNpv(t.I, flows())]])), mi('IRR', () => show([['IRR', finIrr(flows())]])),
          mi('PBP', () => show([['PBP', finPbp(t.I, flows())]])), mi('NFV', () => show([['NFV', finNfv(t.I, flows())]])),
          mi('◀LIST', () => finListEdit(cf.list)),
          mi('LIST', () => numDialog('Cash Flow', [['List', cf.list]], (v) => { this.put({ o: cf, k: 'list', list: true }, v[0]); }))
        ]
      },
      amort: {
        title: () => 'Amortization:' + pay(), fields: [F(t, 'PM1', 'PM1'), F(t, 'PM2', 'PM2'), ...tvm],
        menu: [amort('BAL', 'BAL'), amort('INT', 'INT'), amort('PRN', 'PRN'), amort('SINT', 'ΣINT'), amort('SPRN', 'ΣPRN'), mi('COMPOUND', () => this.open('compound'))]
      },
      conv: {
        title: () => 'Conversion', fields: tvm.slice(0, 2),
        menu: [mi('▶EFF', () => show([['EFF', finEff(t.n, t.I)]])), mi('▶APR', () => show([['APR', finApr(t.n, t.I)]]))]
      },
      cost: {
        title: () => 'Cost/Sell/Margin', fields: [F(c, 'Cst', 'Cst'), F(c, 'Sel', 'Sel'), F(c, 'Mrg', 'Mrg')],
        menu: [
          mi('COST', () => { c.Cst = finCost(c.Sel, c.Mrg); show([['Cst', c.Cst]]); }),
          mi('SELL', () => { c.Sel = finSell(c.Cst, c.Mrg); show([['Sel', c.Sel]]); }),
          mi('MARGIN', () => { c.Mrg = finMargin(c.Cst, c.Sel); show([['Mrg', c.Mrg]]); })
        ]
      },
      days: {
        title: () => 'Days Calculation', fields: [...date(1), ...date(2), F(d, 'D', 'D')],
        menu: [
          mi('PRD', () => show([['PRD', finDays(D1(), D2(), S.dateMode)]])),
          mi('d1+D', () => show([['d1+D', dateStr(finDateAdd(D1(), d.D, S.dateMode))]])),
          mi('d1−D', () => show([['d1−D', dateStr(finDateAdd(D1(), -d.D, S.dateMode))]]))
        ]
      },
      dep: {
        title: () => 'Depreciation', fields: [F(t, 'n', 'n'), F(t, 'I', 'I%'), F(t, 'PV', 'PV'), F(t, 'FV', 'FV'), F(t, 'j', 'j'), F(t, 'YR1', 'YR1')],
        menu: [dep('SL'), dep('FP'), dep('SYD'), dep('DB')]
      },
      bond: {
        title: () => 'Bond Calculation', fields: [...date(1), ...date(2), F(b, 'RDV', 'RDV'), F(b, 'CPN', 'CPN'), F(b, 'PRC', 'PRC'), F(b, 'YLD', 'YLD')],
        menu: [
          mi('PRC', () => { const r = finBond('PRC', { d1: D1(), d2: D2(), ...b }, S.dateMode, S.periods); b.PRC = r.PRC; show([['PRC', r.PRC], ['INT', r.INT], ['CST', r.CST]]); }),
          mi('YLD', () => { b.YLD = finBond('YLD', { d1: D1(), d2: D2(), ...b }, S.dateMode, S.periods); show([['YLD', b.YLD]]); })
        ]
      }
    };
    return this.defs;
  },
  form() { return this.forms()[this.scr]; },
  open(id) {
    this.scr = id; this.sel = 0; this.top = 0; this.field = null; this.res = null;
    this.menu = new FMenu(this.form().menu);
  },
  show(rows) { this.res = rows; this.field = null; this.menu = new FMenu([mi('REPEAT', () => this.repeat())]); },
  repeat() { this.res = null; this.menu = new FMenu(this.form().menu); },
  put(fd, x) {
    if (fd.list) { if (!Number.isInteger(x) || x < 1 || x > 26) fail('Argument ERROR'); }
    fd.o[fd.k] = x;
  },
  move(dir) {
    const n = this.form().fields.length;
    this.sel = (this.sel + dir + n) % n;
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel > this.top + 5) this.top = this.sel - 5;
  },

  key(k) {
    const f = fIndex(k);
    if (this.scr === 'menu') {
      if (f === 5) this.page = 1 - this.page;
      else if (f >= 0) { const it = FIN_PAGES[this.page][f]; if (it) this.open(it[0]); }
      else if (k.id === 'EXIT' && this.page) this.page = 0;
      return;
    }
    if (this.res) {
      if (f === 0 || k.id === 'EXIT' || k.id === 'EXE') this.repeat();
      return;
    }
    const fields = this.form().fields;
    if (this.field) {
      this.field.key(k, (x) => { this.put(fields[this.sel], x.v); this.field = null; this.move(1); }, () => { this.field = null; });
      return;
    }
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    switch (k.id) {
      case 'UP': this.move(-1); break;
      case 'DOWN': case 'EXE': this.move(1); break;
      case 'EXIT': this.page = FIN_PAGES[0].some((p) => p && p[0] === this.scr) ? 0 : 1; this.scr = 'menu'; break;
      default: if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    }
  },
  tap(x, y) {
    if (y < 48 || y >= 192 || this.field || this.res) return;
    const r = Math.floor((y - 48) / 24);
    if (this.scr === 'menu') { if (r < 5 && FIN_PAGES[this.page][r]) this.open(FIN_PAGES[this.page][r][0]); else if (r === 5) this.page = 1 - this.page; return; }
    if (this.top + r < this.form().fields.length) this.sel = this.top + r;
  },

  row(y, label, val, on) {
    lcd.text(0, y, label);
    lcd.text(72, y, '=');
    if (on && this.field) { this.field.draw(90, y + 12, LW - 94); return; }
    lcd.text(90, y, typeof val === 'string' ? val : fmtFit(val, 16), on ? { inv: true } : undefined);
  },
  draw() {
    statusBar(stdTags());
    if (this.scr === 'menu') {
      const page = FIN_PAGES[this.page];
      lcd.text(0, 24, 'Financial(' + (this.page + 1) + '/2)');
      page.forEach((it, i) => { if (it) lcd.text(18, 48 + i * 24, 'F' + (i + 1) + ':' + it[2]); });
      lcd.text(18, 48 + 5 * 24, 'F6:Next Page');
      lcd.fmenu([...page.map((it) => it && { l: it[1], k: 'cmd' }), { l: '▷', k: 'cmd' }]);
      return;
    }
    const fm = this.form();
    lcd.text(0, 24, fm.title());
    if (this.res) this.res.forEach(([label, val], i) => this.row(48 + i * 24, label, val, false));
    else {
      for (let r = 0; r < 6; r++) {
        const i = this.top + r;
        if (i >= fm.fields.length) break;
        const fd = fm.fields[i], v = fd.o[fd.k];
        this.row(48 + r * 24, fd.l, fd.list ? 'List ' + v : v, i === this.sel);
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, 58, 12, '#000');
      if (this.top + 6 < fm.fields.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
    }
    lcd.fmenu(this.menu.labels());
  },

  save() { return { t: { ...this.t }, c: { ...this.c }, d: { ...this.d }, b: { ...this.b }, cf: { ...this.cf } }; },
  load(st) {
    const take = (to, from) => { if (from) for (const k in to) if (Number.isFinite(from[k])) to[k] = from[k]; };
    take(this.t, st.t); take(this.c, st.c); take(this.d, st.d); take(this.b, st.b);
    if (st.cf && Number.isInteger(st.cf.list) && st.cf.list >= 1 && st.cf.list <= 26) this.cf.list = st.cf.list;
  },
  reset() {
    Object.assign(this.t, FIN_T0); Object.assign(this.c, FIN_C0); Object.assign(this.d, FIN_D0); Object.assign(this.b, FIN_B0);
    this.cf.list = 1;
    this.enter();
  }
};
UI.apps.fin = finApp;
