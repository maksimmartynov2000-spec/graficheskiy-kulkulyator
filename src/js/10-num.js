// ══════ 10-num.js — числа: точные формы (дроби, корни, π) и вывод как на калькуляторе ══════
//
// Число — объект {v, ex, dec}:
//   v   — значение (double);
//   ex  — точная форма или null: {t: [[n, d, r], …], pi}, значение = Σ n/d·√r, а при pi — ещё ·π;
//   dec — в расчёте участвовала десятичная запись, поэтому ответ показывается десятичным.

const LIM = 9e15;
const igcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
const ms = (a, b) => { const p = a * b; return Math.abs(p) > LIM ? NaN : p; };   // умножение целых с защитой от переполнения

function mkTerm(n, d, r) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || !Number.isFinite(r) || d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = igcd(n, d) || 1;
  n /= g; d /= g;
  if (Math.abs(n) > LIM || d > LIM || r > LIM) return null;
  return [n, d, r];
}

const EX0 = () => ({ t: [], pi: false });
const exInt = (n) => (Number.isInteger(n) && Math.abs(n) <= LIM ? { t: n ? [[n, 1, 1]] : [], pi: false } : null);
const exRat = (n, d) => { const m = mkTerm(n, d, 1); return m ? { t: m[0] ? [m] : [], pi: false } : null; };
const exPi = () => ({ t: [[1, 1, 1]], pi: true });

function exVal(a) {
  let s = 0;
  for (const [n, d, r] of a.t) s += (n / d) * (r === 1 ? 1 : Math.sqrt(r));
  return a.pi ? s * Math.PI : s;
}

function exAdd(a, b) {
  if (!a || !b) return null;
  if (!a.t.length) return b;
  if (!b.t.length) return a;
  if (a.pi !== b.pi) return null;
  const t = a.t.map((x) => x.slice());
  for (const y of b.t) {
    const k = t.findIndex((x) => x[2] === y[2]);
    if (k < 0) { t.push(y.slice()); continue; }
    const m = mkTerm(ms(t[k][0], y[1]) + ms(y[0], t[k][1]), ms(t[k][1], y[1]), y[2]);
    if (!m) return null;
    t[k] = m;
  }
  const r = t.filter((x) => x[0] !== 0).sort((x, y) => x[2] - y[2]);
  if (r.length > 2) return null;
  return { t: r, pi: r.length ? a.pi : false };
}
const exNeg = (a) => (a ? { t: a.t.map(([n, d, r]) => [-n, d, r]), pi: a.pi } : null);
const exSub = (a, b) => exAdd(a, exNeg(b));

function exMul(a, b) {
  if (!a || !b) return null;
  if (!a.t.length || !b.t.length) return EX0();
  if (a.pi && b.pi) return null;
  let res = EX0();
  for (const x of a.t) for (const y of b.t) {
    const g = igcd(x[2], y[2]);
    const m = mkTerm(ms(ms(x[0], y[0]), g), ms(x[1], y[1]), ms(x[2] / g, y[2] / g));
    if (!m) return null;
    res = exAdd(res, { t: [m], pi: false });
    if (!res) return null;
  }
  const pi = a.pi || b.pi;
  if (pi && res.t.some((x) => x[2] !== 1)) return null;
  return { t: res.t, pi: res.t.length ? pi : false };
}

function exInv(a) {
  if (!a || !a.t.length || a.pi) return null;
  if (a.t.length === 1) {
    const [n, d, r] = a.t[0];
    const m = mkTerm(d, ms(n, r), r);
    return m ? { t: [m], pi: false } : null;
  }
  // 1/(p + q) = (p − q)/(p² − q²)
  const p = { t: [a.t[0]], pi: false }, q = { t: [a.t[1]], pi: false };
  const den = exSub(exMul(p, p), exMul(q, q));
  if (!den || !den.t.length) return null;
  return exMul(exSub(p, q), exInv(den));
}
const exDiv = (a, b) => (a && b && a.pi && b.pi
  ? exMul({ t: a.t, pi: false }, exInv({ t: b.t, pi: false }))      // π/π сокращается
  : exMul(a, exInv(b)));

function exPowInt(a, k) {
  if (!a || !Number.isInteger(k) || Math.abs(k) > 200) return null;
  if (k < 0) return exInv(exPowInt(a, -k));
  let res = exInt(1), base = a;
  while (k > 0 && res) {
    if (k & 1) res = exMul(res, base);
    k >>= 1;
    if (k) { base = exMul(base, base); if (!base) return null; }
  }
  return res;
}

// N = s²·r, r свободно от квадратов
function sqFree(N) {
  let s = 1, r = 1, m = N;
  for (let p = 2; p * p <= m; p += (p === 2 ? 1 : 2)) {
    let c = 0;
    while (m % p === 0) { m /= p; c++; }
    if (c) { s *= p ** (c >> 1); if (c & 1) r *= p; }
  }
  return [s, r * m];
}

function exSqrt(a) {
  if (!a || a.pi) return null;
  if (!a.t.length) return EX0();
  if (a.t.length !== 1 || a.t[0][2] !== 1) return null;
  const [n, d] = a.t[0];
  if (n < 0) return null;
  const N = ms(n, d);
  if (!(N <= 1e12)) return null;
  const [s, r] = sqFree(N);
  const m = mkTerm(s, d, r);
  return m ? { t: [m], pi: false } : null;
}

const exIsRat = (a) => !!a && !a.pi && (a.t.length === 0 || (a.t.length === 1 && a.t[0][2] === 1));
const exIsInt = (a) => exIsRat(a) && (a.t.length === 0 || a.t[0][1] === 1);
const exEq = (a, b) => { const d = exSub(a, b); return !!d && d.t.length === 0; };

// ---------- числа ----------
const R = (v, ex, dec) => ({ v, ex: ex || null, dec: !!dec });
const RI = (n) => R(n, exInt(n), false);
const RX = (ex, dec) => R(exVal(ex), ex, dec);
const r15 = (x) => (x === 0 || !Number.isFinite(x) ? x : Number(x.toPrecision(15)));
const isCx = (a) => !!a && a.cx === true;                 // комплексное число (см. 12-complex.js)
const isNum = (a) => !!a && typeof a === 'object' && typeof a.v === 'number' && !a.cx;

// Результат «не точной» функции: целые значения от точных аргументов остаются точными (log 100 = 2)
function RF(v, exactIn, dec) {
  if (!Number.isFinite(v)) fail('Ma ERROR');
  if (exactIn) {
    const q = r15(v);
    if (Number.isInteger(q) && Math.abs(q) < 1e10) return R(q, exInt(q), dec);
  }
  return R(v, null, dec);
}

function sAdd(a, b) {
  const ex = a.ex && b.ex ? exAdd(a.ex, b.ex) : null;
  return ex ? RX(ex, a.dec || b.dec) : RF(a.v + b.v, false, a.dec || b.dec);
}
function sSub(a, b) {
  const ex = a.ex && b.ex ? exSub(a.ex, b.ex) : null;
  return ex ? RX(ex, a.dec || b.dec) : RF(a.v - b.v, false, a.dec || b.dec);
}
function sMul(a, b) {
  const ex = a.ex && b.ex ? exMul(a.ex, b.ex) : null;
  return ex ? RX(ex, a.dec || b.dec) : RF(a.v * b.v, false, a.dec || b.dec);
}
function sDiv(a, b) {
  if (b.v === 0) fail('Ma ERROR');
  const ex = a.ex && b.ex ? exDiv(a.ex, b.ex) : null;
  return ex ? RX(ex, a.dec || b.dec) : RF(a.v / b.v, false, a.dec || b.dec);
}
const sNeg = (a) => R(-a.v, exNeg(a.ex), a.dec);

// Степень вещественных чисел; отрицательное основание — только для показателя m/n с нечётным n
function fPow(a, b) {
  if (a === 0) return b > 0 ? 0 : NaN;
  if (a < 0 && !Number.isInteger(b)) {
    for (let d = 3; d <= 99; d += 2) {
      const n = b * d, rn = Math.round(n);
      if (Math.abs(n - rn) < 1e-11 * Math.max(1, Math.abs(n))) return (rn % 2 ? -1 : 1) * Math.pow(-a, b);
    }
    return NaN;
  }
  return Math.pow(a, b);
}

function sPow(a, b) {
  const dec = a.dec || b.dec;
  if (a.v === 0 && b.v <= 0) fail('Ma ERROR');
  if (a.ex && b.ex && exIsRat(b.ex)) {
    const [n, d] = b.ex.t.length ? b.ex.t[0] : [0, 1];
    if (d === 1 && Math.abs(n) <= 200) {
      const ex = exPowInt(a.ex, n);
      if (ex) return RX(ex, dec);
    } else if (d === 2 && Math.abs(n) <= 9 && a.v >= 0) {
      const ex = exPowInt(exSqrt(a.ex), n);
      if (ex) return RX(ex, dec);
    }
  }
  return RF(fPow(a.v, b.v), !!(a.ex && b.ex), dec);
}

function sSqrt(a) {
  if (a.v < 0) fail('Non-Real ERROR');
  const ex = a.ex ? exSqrt(a.ex) : null;
  return ex ? RX(ex, a.dec) : RF(Math.sqrt(a.v), !!a.ex, a.dec);
}

// Десятичная запись → число: '12.5' → 25/2 (dec), '3' → 3
function numFromLiteral(mant, exp) {
  const hasDot = mant.includes('.');
  let [ip, fp = ''] = mant.split('.');
  if (ip === '' && fp === '') { ip = '1'; }         // «ᴇ3» = 1×10³
  const digits = (ip + fp).replace(/^0+/, '') || '0';
  const e = (exp || 0) - fp.length;
  const v = Number((ip || '0') + (fp ? '.' + fp : '') + 'e' + (exp || 0));
  if (!Number.isFinite(v)) fail('Ma ERROR');
  let ex = null;
  if (digits.length <= 15) {
    const m = Number(digits);
    if (e >= 0 && e <= 15) ex = exInt(m * 10 ** e);
    else if (e < 0 && e >= -15) ex = exRat(m, 10 ** -e);
  }
  return R(ex ? exVal(ex) : v, ex, hasDot);
}

// Приближение дробью (для S⇔D, когда точной формы нет)
function ratApprox(v) {
  if (!Number.isFinite(v) || Math.abs(v) > 1e10) return null;
  const neg = v < 0, x0 = Math.abs(v);
  if (Number.isInteger(x0)) return exInt(v);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, x = x0;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(x);
    const h = a * h1 + h0, k = a * k1 + k0;
    if (h > 1e10 || k > 1e9) return null;
    h0 = h1; h1 = h; k0 = k1; k1 = k;
    if (Math.abs(h / k - x0) <= 4e-15 * Math.max(1, x0)) {
      if (String(h).length + String(k).length > 9) return null;
      return exRat(neg ? -h : h, k);
    }
    const f = x - a;
    if (f < 1e-13) return null;
    x = 1 / f;
  }
  return null;
}

// ---------- десятичный вывод ----------
// Строка в знаках экрана: «−», «.», цифры, G.EE, «+»
function fmtNum(v, opt) {
  const disp = (opt && opt.disp) || S.disp, dn = opt && opt.dispN !== undefined ? opt.dispN : S.dispN;
  if (!Number.isFinite(v)) fail('Ma ERROR');
  if (v === 0) v = 0;
  const neg = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const sci = (digits, trim) => {
    let [m, e] = a.toExponential(Math.max(0, digits - 1)).split('e');
    if (trim && m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
    const en = Number(e);
    return neg + m + G.EE + (en < 0 ? '−' : '+') + String(Math.abs(en)).padStart(2, '0');
  };
  if (disp === 'Sci') return sci(dn === 0 ? 10 : dn, false);
  if (disp === 'Fix') {
    if (a >= 1e10) return sci(10, true);
    const s = a.toFixed(dn);
    return (Number(s) === 0 ? '' : neg) + s;
  }
  if (a === 0) return '0';
  const e = Number(a.toExponential(9).split('e')[1]);
  const lo = dn === 2 ? -9 : -2;
  if (e < lo || e >= 10) return sci(10, true);
  let s = a.toFixed(Math.max(0, 9 - e));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return neg + s;
}

// ---------- вывод ответа «естественной» записью ----------
// Строка ответа — тот же формат, что у редактора: массив знаков и шаблонов {t, s: [строки]}
const D = (s) => [...s];
const tplFrac = (a, b) => ({ t: 'frac', s: [a, b] });
const tplSqrt = (a) => ({ t: 'sqrt', s: [a] });
const digitsOf = (n) => String(Math.abs(n)).length;

function exactRow(ex) {
  const t = ex.t;
  if (!t.length) return ['0'];
  const I = (n) => D(String(Math.abs(n)));
  if (ex.pi) {
    const [n, d] = t[0];
    if (digitsOf(n) + digitsOf(d) > 9) return null;
    const sign = n < 0 ? ['−'] : [], an = Math.abs(n);
    if (d === 1) return [...sign, ...(an === 1 ? [] : I(an)), 'π'];
    return [...sign, tplFrac(I(an), I(d)), 'π'];
  }
  if (t.length === 1 && t[0][2] === 1) {
    const [n, d] = t[0];
    if (d === 1) return Math.abs(n) < 1e10 ? [...(n < 0 ? ['−'] : []), ...I(n)] : null;
    if (digitsOf(n) + digitsOf(d) + 1 > 10) return null;
    const an = Math.abs(n), sign = n < 0 ? ['−'] : [];
    if (S.frac === 'ab/c' && an > d) {
      const w = Math.floor(an / d);
      return [...sign, { t: 'mixed', s: [I(w), I(an - w * d), I(d)] }];
    }
    return [...sign, tplFrac(I(an), I(d))];
  }
  // корни: (a√b + c√d)/e
  const lcm = t.length === 2 ? (t[0][1] / igcd(t[0][1], t[1][1])) * t[1][1] : t[0][1];
  if (lcm >= 100) return null;
  let terms = t.map(([n, d, r]) => [n * (lcm / d), r]);
  if (terms.some(([a, r]) => Math.abs(a) >= 100 || r >= 1000)) return null;
  if (terms.length === 2 && terms[0][0] < 0 && terms[1][0] > 0) terms = [terms[1], terms[0]];
  const body = ([a, r]) => (r === 1 ? I(a) : [...(Math.abs(a) === 1 ? [] : I(a)), tplSqrt(I(r))]);
  if (terms.length === 1) {
    const [a] = terms[0];
    const sign = a < 0 ? ['−'] : [];
    return lcm === 1 ? [...sign, ...body(terms[0])] : [...sign, tplFrac(body(terms[0]), I(lcm))];
  }
  const num = [];
  terms.forEach((tm, i) => {
    if (tm[0] < 0) num.push('−'); else if (i) num.push('+');
    num.push(...body(tm));
  });
  return lcm === 1 ? num : [tplFrac(num, I(lcm))];
}

// Точная запись в одну строку (Line): только дроби
function exactLine(ex) {
  if (!exIsRat(ex)) return null;
  if (!ex.t.length) return ['0'];
  const [n, d] = ex.t[0];
  const sign = n < 0 ? ['−'] : [], an = Math.abs(n);
  if (d === 1) return an < 1e10 ? [...sign, ...D(String(an))] : null;
  if (digitsOf(n) + digitsOf(d) + 1 > 10) return null;
  if (S.frac === 'ab/c' && an > d) {
    const w = Math.floor(an / d);
    return [...sign, ...D(String(w)), G.FRC, ...D(String(an - w * d)), G.FRC, ...D(String(d))];
  }
  return [...sign, ...D(String(an)), G.FRC, ...D(String(d))];
}

// Можно ли показать число точно (и отличается ли это от десятичной записи)
function exactForm(x, math) {
  if (!x.ex) return null;
  if (exIsInt(x.ex)) return null;
  return math ? exactRow(x.ex) : exactLine(x.ex);
}

// Строка для показа числа. mode: 'auto' | 'dec' | 'exact'
function numRow(x, mode, math) {
  if (math === undefined) math = S.io === 'Math';
  if (mode !== 'dec' && x.ex && (mode === 'exact' || !x.dec)) {
    const row = math ? exactRow(x.ex) : exactLine(x.ex);
    if (row) return row;
  }
  return D(fmtNum(x.v));
}
