// ══════ 12-complex.js — комплексные числа ══════
//
// Комплексное число — объект {cx: true, re, im, v, ex, dec}: re и im — обычные числа {v, ex, dec},
// поэтому части показываются дробями и корнями. Поля v (= re.v), ex (null) и dec нужны только затем,
// чтобы код, не знающий о комплексных числах, не падал; считать с таким объектом как с вещественным
// нельзя — isNum() для него даёт false, а isCx() — true (обе проверки лежат в 10-num.js).
// Вещественное число остаётся прежним объектом: CX() возвращает комплексное, только когда мнимая часть не ноль.
// Подключение: разбор и вычисление — в 20-parse.js (знаки «i» и «∠», вызовы cx1/cx2), показ — valRow().

function CX(re, im) {
  if (im.v === 0) return re;
  return { cx: true, re, im, v: re.v, ex: null, dec: re.dec || im.dec };
}
const cxRe = (z) => (isCx(z) ? z.re : z);
const cxIm = (z) => (isCx(z) ? z.im : RI(0));
const cxExact = (z) => !!(cxRe(z).ex && cxIm(z).ex);

// Части, полученные через синус и косинус: убираем «шум» в последних знаках
function cxTidy(re, im, exactIn, dec) {
  const sc = Math.max(Math.abs(re), Math.abs(im));
  const fix = (x) => (Math.abs(x) < 1e-13 * sc ? 0 : r15(x));
  return CX(RF(fix(re), exactIn, dec), RF(fix(im), exactIn, dec));
}

// ---------- арифметика ----------
const cxAdd = (a, b) => CX(sAdd(cxRe(a), cxRe(b)), sAdd(cxIm(a), cxIm(b)));
const cxSub = (a, b) => CX(sSub(cxRe(a), cxRe(b)), sSub(cxIm(a), cxIm(b)));
const cxNeg = (a) => CX(sNeg(cxRe(a)), sNeg(cxIm(a)));
const cxConj = (a) => CX(cxRe(a), sNeg(cxIm(a)));
function cxMul(a, b) {
  const p = cxRe(a), q = cxIm(a), r = cxRe(b), s = cxIm(b);
  return CX(sSub(sMul(p, r), sMul(q, s)), sAdd(sMul(p, s), sMul(q, r)));
}
function cxDiv(a, b) {
  const p = cxRe(a), q = cxIm(a), r = cxRe(b), s = cxIm(b);
  if (r.v === 0 && s.v === 0) fail('Ma ERROR');
  if (s.v === 0) return CX(sDiv(p, r), sDiv(q, r));
  const den = sAdd(sMul(r, r), sMul(s, s));
  return CX(sDiv(sAdd(sMul(p, r), sMul(q, s)), den), sDiv(sSub(sMul(q, r), sMul(p, s)), den));
}

// Модуль: точный, когда сумма квадратов частей — точный квадрат или корень
function cxAbs(z) {
  if (!isCx(z)) return z.v < 0 ? sNeg(z) : z;
  const s = sAdd(sMul(z.re, z.re), sMul(z.im, z.im));
  return s.ex ? sSqrt(s) : RF(Math.hypot(z.re.v, z.im.v), false, s.dec);
}

// Направление вектора (re, im): целое число шагов по 15°, если угол точный; иначе null
function cxStep15(re, im) {
  if (!re.ex || !im.ex) return null;
  const t = Math.atan2(im.v, re.v) * 12 / Math.PI, k = Math.round(t);
  if (Math.abs(t - k) > 1e-9) return null;
  // проверка без округлений: re·sin φ = im·cos φ
  const l = exMul(re.ex, sinEx(k)), r = exMul(im.ex, sinEx(k + 6));
  return l && r && exEq(l, r) ? k : null;
}
// Аргумент: в текущих единицах угла, а при rad = true — всегда в радианах (для ln и степеней)
function cxArg(z, rad) {
  const re = cxRe(z), im = cxIm(z), dec = re.dec || im.dec;
  if (re.v === 0 && im.v === 0) return RI(0);
  const unit = rad ? 'Rad' : S.angle;
  const k = cxStep15(re, im);
  if (k !== null) {
    const deg = k * 15;
    if (unit === 'Deg') return R(deg, exInt(deg), dec);
    if (unit === 'Gra') return RX(exRat(deg * 10, 9), dec);
    const m = mkTerm(deg, 180, 1);
    return m[0] ? RX({ t: [m], pi: true }, dec) : R(0, exInt(0), dec);
  }
  const t = Math.atan2(im.v, re.v);
  return R(unit === 'Rad' ? t : r15(t * (unit === 'Deg' ? 180 : 200) / Math.PI), null, dec);
}

// Главное значение корня; √ от отрицательного вещественного — точно: √(−4) = 2i
function cxSqrt(z) {
  if (!isCx(z)) return z.v < 0 ? CX(RI(0), sSqrt(sNeg(z))) : sSqrt(z);
  const r = cxAbs(z), two = RI(2);
  const pos = (x) => (x.v < 0 ? RI(0) : x);
  const re = sSqrt(pos(sDiv(sAdd(r, z.re), two))), im = sSqrt(pos(sDiv(sSub(r, z.re), two)));
  return CX(re, z.im.v < 0 ? sNeg(im) : im);
}

// e^z: мнимая часть показателя — в радианах; e^(iπ·k/12) считается точно
function cxExp(z) {
  const a = cxRe(z), b = cxIm(z), dec = a.dec || b.dec;
  let c = null, s = null;
  if (b.ex && b.ex.pi) {
    const q = exMul({ t: b.ex.t, pi: false }, exInt(12));
    if (q && exIsInt(q)) {
      const k = q.t.length ? q.t[0][0] : 0;
      c = RX(sinEx(k + 6), dec); s = RX(sinEx(k), dec);
    }
  }
  if (c && a.v === 0) return CX(c, s);
  const m = Math.exp(a.v), t = b.v;
  return cxTidy(m * (c ? c.v : Math.cos(t)), m * (s ? s.v : Math.sin(t)), false, dec);
}
// Главное значение логарифма: ln|z| + i·Arg z
function cxLn(z) {
  const r = cxAbs(z);
  if (r.v === 0) fail('Ma ERROR');
  return CX(RF(r15(Math.log(r.v)), !!r.ex, r.dec), cxArg(z, true));
}
function cxLog(z) {
  const r = cxAbs(z);
  if (r.v === 0) fail('Ma ERROR');
  return CX(RF(r15(Math.log10(r.v)), !!r.ex, r.dec), R(r15(cxArg(z, true).v / Math.LN10), null, z.dec));
}

// Степень: целый показатель — точно (умножением), 1/2 — корень, остальное — через e^(b·Ln a)
function cxPow(a, b) {
  const zero = cxRe(a).v === 0 && cxIm(a).v === 0;
  if (!isCx(b)) {
    if (Number.isInteger(b.v) && Math.abs(b.v) <= 200) {
      if (zero && b.v <= 0) fail('Ma ERROR');
      let n = Math.abs(b.v), base = a, res = RI(1);
      while (n) {
        if (n & 1) res = cxMul(res, base);
        n >>= 1;
        if (n) base = cxMul(base, base);
      }
      return b.v < 0 ? cxDiv(RI(1), res) : res;
    }
    if (b.ex && exIsRat(b.ex) && b.ex.t.length && b.ex.t[0][0] === 1 && b.ex.t[0][1] === 2) return cxSqrt(a);
  }
  if (zero) { if (cxRe(b).v > 0) return RI(0); fail('Ma ERROR'); }
  const w = cxMul(b, cxLn(a));
  const m = Math.exp(cxRe(w).v), t = cxIm(w).v;
  return cxTidy(m * Math.cos(t), m * Math.sin(t), cxExact(a) && cxExact(b), a.dec || b.dec);
}

// ---------- функции одного и двух аргументов (вызываются из s1 и s2 в 20-parse.js) ----------
function cx1(f, z) {
  switch (f) {
    case 'neg': return cxNeg(z);
    case 'abs': return cxAbs(z);
    case 'arg': return cxArg(z);
    case 'conjg': return cxConj(z);
    case 'rep': return cxRe(z);
    case 'imp': return cxIm(z);
    case 'sq': return cxMul(z, z);
    case 'inv': return cxDiv(RI(1), z);
    case 'sqrt': return cxSqrt(z);
    case 'exp': return cxExp(z);
    case 'ln': return cxLn(z);
    case 'log': return cxLog(z);
    case 'p10': return cxPow(RI(10), z);
    case 'cbrt': return cxPow(z, RX(exRat(1, 3)));
    case 'pct': return cxDiv(z, RI(100));
    case 'int': case 'intg': case 'frac':
      if (isCx(z)) return CX(s1(f, z.re), s1(f, z.im));
      return s1(f, z);
    default: return fail('Non-Real ERROR');   // тригонометрия, факториал и прочее — только для вещественных
  }
}
function cx2(op, a, b) {
  switch (op) {
    case '+': return cxAdd(a, b);
    case '−': return cxSub(a, b);
    case '×': return cxMul(a, b);
    case '÷': return cxDiv(a, b);
    case '^': return cxPow(a, b);
    case 'xrt': return cxPow(b, cxDiv(RI(1), a));
    case '∠': {                        // r∠θ, θ — в текущих единицах угла
      if (isCx(a) || isCx(b)) fail('Non-Real ERROR');
      const c = trigExact('cos', b) || R(fCos(b.v), null, b.dec), s = trigExact('sin', b) || R(fSin(b.v), null, b.dec);
      return CX(sMul(a, c), sMul(a, s));
    }
    default: return fail('Non-Real ERROR');   // сравнения, nPr, nCr, деление нацело
  }
}

// ---------- показ ----------
// Скобки вокруг мнимой части нужны, если в ней есть «+» или «−» не в начале и не в записи порядка (1.2ᴇ+15)
function cxNeedsParen(row) {
  for (let k = 1; k < row.length; k++) if ((row[k] === '+' || row[k] === '−') && row[k - 1] !== G.EE) return true;
  return false;
}
const cxPolar = (form) => (form ? form === 'polar' : S.cplx === 'r∠θ');
// Строка ответа: a+bi либо r∠θ. form: 'polar' | 'rect' | null (по настройке Complex Mode)
function cxRow(z, mode, math, form) {
  if (math === undefined) math = S.io === 'Math';
  const re = cxRe(z), im = cxIm(z);
  const m = (mode || 'auto') === 'auto' && (re.dec || im.dec) ? 'dec' : (mode || 'auto');
  if (cxPolar(form)) return [...numRow(cxAbs(z), m, math), '∠', ...numRow(cxArg(z), m, math)];
  const row = re.v !== 0 || im.v === 0 ? numRow(re, m, math) : [];
  if (im.v === 0) return row;
  const neg = im.v < 0;
  if (row.length) row.push(neg ? '−' : '+'); else if (neg) row.push('−');
  let ir = numRow(neg ? sNeg(im) : im, m, math);
  if (!(ir.length === 1 && ir[0] === '1')) {
    if (cxNeedsParen(ir)) ir = ['(', ...ir, ')'];
    row.push(...ir);
  }
  row.push('i');
  return row;
}
// Строка ответа для любого числа — вещественного или комплексного
function valRow(x, mode, math, form) {
  return isCx(x) || form === 'polar' ? cxRow(x, mode, math, form) : numRow(x, mode, math);
}
// Есть ли у числа точная запись, отличная от десятичной (для S⇔D)
function valExact(x, math, form) {
  if (!isCx(x) && form !== 'polar') return !!exactForm(x, math);
  const parts = cxPolar(form) ? [cxAbs(x), cxArg(x)] : [cxRe(x), cxIm(x)];
  return parts.some((p) => !!exactForm(p, math));
}
// S⇔D для комплексного ответа: обе части разом. e — запись истории {val, mode, math, form}
function cxToggleSD(e) {
  if (!valExact(e.val, e.math, e.form)) return;
  const shown = e.mode !== 'dec' && (e.mode === 'exact' || !e.val.dec);
  e.mode = shown ? 'dec' : 'exact';
}
// Комплексное число одной строкой для таблиц (списки, матрицы): «1.5+2i», не длиннее n знаков
function cxText(z, n) {
  let s = '';
  for (let d = 10; d >= 1; d--) {
    const p = (v) => fmtNum(Number(v.toPrecision(d)), { disp: 'Norm', dispN: S.dispN });
    const re = z.re.v !== 0 ? p(z.re.v) : '', a = Math.abs(z.im.v);
    s = re + (z.im.v < 0 ? '−' : re ? '+' : '') + (a === 1 ? '' : p(a)) + 'i';
    if ([...s].length <= n) break;
  }
  return s;
}
