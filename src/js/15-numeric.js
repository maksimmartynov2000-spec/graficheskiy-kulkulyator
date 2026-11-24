// ══════ 15-numeric.js — вещественные функции и численные методы (без точных форм) ══════

const angK = () => (S.angle === 'Deg' ? Math.PI / 180 : S.angle === 'Gra' ? Math.PI / 200 : 1);

function fSin(x) {
  if (S.angle !== 'Rad') {
    const p = S.angle === 'Deg' ? 360 : 400;
    const r = x % p;
    if (r % (p / 2) === 0) return 0;
    return r15(Math.sin(r * angK()));
  }
  const r = Math.sin(x);
  return Math.abs(r) < 1e-15 && Math.abs(x) > 1e-9 ? 0 : r;
}
function fCos(x) {
  if (S.angle !== 'Rad') {
    const p = S.angle === 'Deg' ? 360 : 400;
    const r = Math.abs(x % p);
    if (r === p / 4 || r === 3 * p / 4) return 0;
    return r15(Math.cos(r * angK()));
  }
  const r = Math.cos(x);
  return Math.abs(r) < 1e-15 ? 0 : r;
}
function fTan(x) {
  const c = fCos(x);
  if (c === 0) return NaN;
  const s = fSin(x);
  return S.angle === 'Rad' ? s / c : r15(s / c);
}
const fAng = (r) => (S.angle === 'Rad' ? r : r15(r / angK()));
const fAsin = (x) => (x < -1 || x > 1 ? NaN : fAng(Math.asin(x)));
const fAcos = (x) => (x < -1 || x > 1 ? NaN : fAng(Math.acos(x)));
const fAtan = (x) => fAng(Math.atan(x));

function fFact(n) {
  if (!Number.isInteger(n) || n < 0 || n > 69) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function fPerm(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < r) return NaN;
  let p = 1;
  for (let i = 0; i < r; i++) { p *= n - i; if (!Number.isFinite(p)) return NaN; }
  return p;
}
function fComb(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < r) return NaN;
  r = Math.min(r, n - r);
  let c = 1;
  for (let i = 1; i <= r; i++) { c = c * (n - r + i) / i; if (!Number.isFinite(c)) return NaN; }
  return Math.round(c);
}
function fGcd(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN;
  return igcd(a, b);
}
function fLcm(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN;
  const g = igcd(a, b);
  return g ? Math.abs(a / g * b) : 0;
}

// Функции одного аргумента (префиксные и постфиксные) для быстрого счёта
const F1 = {
  sin: fSin, cos: fCos, tan: fTan, asin: fAsin, acos: fAcos, atan: fAtan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asinh: Math.asinh, acosh: (x) => (x < 1 ? NaN : Math.acosh(x)), atanh: (x) => (x <= -1 || x >= 1 ? NaN : Math.atanh(x)),
  log: (x) => (x > 0 ? Math.log10(x) : NaN), ln: (x) => (x > 0 ? Math.log(x) : NaN),
  p10: (x) => 10 ** x, exp: Math.exp,
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)), cbrt: Math.cbrt,
  neg: (x) => -x, abs: Math.abs, int: Math.trunc, frac: (x) => r15(x - Math.trunc(x)), intg: Math.floor,
  not: (x) => (x === 0 ? 1 : 0),
  sq: (x) => x * x, inv: (x) => (x === 0 ? NaN : 1 / x), fact: fFact,
  deg: (x) => x * (Math.PI / 180) / angK(), rad: (x) => x / angK(), gra: (x) => x * (Math.PI / 200) / angK(),
  pct: (x) => x / 100
};

// Функции двух аргументов
const F2 = {
  '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? NaN : a / b),
  '^': fPow,
  xrt: (a, b) => (a === 0 ? NaN : fPow(b, 1 / a)),
  nPr: fPerm, nCr: fComb,
  'Int÷': (a, b) => (b === 0 ? NaN : Math.trunc(a / b)),
  Rmdr: (a, b) => (b === 0 ? NaN : a - b * Math.trunc(a / b)),
  '=': (a, b) => (a === b ? 1 : 0), '≠': (a, b) => (a !== b ? 1 : 0),
  '>': (a, b) => (a > b ? 1 : 0), '<': (a, b) => (a < b ? 1 : 0),
  '≥': (a, b) => (a >= b ? 1 : 0), '≤': (a, b) => (a <= b ? 1 : 0),
  And: (a, b) => (a !== 0 && b !== 0 ? 1 : 0), Or: (a, b) => (a !== 0 || b !== 0 ? 1 : 0)
};

// ---------- производные ----------
// Метод Риддерса: экстраполяция центральных разностей
function ridders(g, h0) {
  const CON = 1.4, CON2 = CON * CON, NT = 10;
  const a = [];
  let ans = NaN, best = Infinity, h = h0;
  for (let i = 0; i < NT; i++) {
    a[i] = [g(h)];
    if (!Number.isFinite(a[i][0])) return ans;
    let fac = CON2;
    for (let j = 1; j <= i; j++) {
      a[i][j] = (a[i][j - 1] * fac - a[i - 1][j - 1]) / (fac - 1);
      fac *= CON2;
      const e = Math.max(Math.abs(a[i][j] - a[i][j - 1]), Math.abs(a[i][j] - a[i - 1][j - 1]));
      if (e <= best) { best = e; ans = a[i][j]; }
    }
    if (i === 0) ans = a[0][0];
    if (i > 0 && Math.abs(a[i][i] - a[i - 1][i - 1]) >= 2 * best) break;
    h /= CON;
  }
  return ans;
}
function stepFor(f, x, h) {
  for (let k = 0; k < 8; k++) {
    if (Number.isFinite(f(x + h)) && Number.isFinite(f(x - h))) return h;
    h /= 10;
  }
  return h;
}
function nDeriv(f, x) {
  if (!Number.isFinite(f(x))) return NaN;
  const h = stepFor(f, x, 0.02 * Math.max(1, Math.abs(x)));
  const d = ridders((hh) => (f(x + hh) - f(x - hh)) / (2 * hh), h);
  return Math.abs(d) < 1e-13 ? 0 : d;
}
function nDeriv2(f, x) {
  const f0 = f(x);
  if (!Number.isFinite(f0)) return NaN;
  const h = stepFor(f, x, 0.1 * Math.max(1, Math.abs(x)));
  const d = ridders((hh) => (f(x + hh) - 2 * f0 + f(x - hh)) / (hh * hh), h);
  return Math.abs(d) < 1e-9 ? 0 : Number(d.toPrecision(10));
}

// ---------- интеграл: адаптивная квадратура Гаусса — Кронрода (7, 15) ----------
const GK_X = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0];
const GK_WK = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728];
const GK_WG = [0, 0.129484966168870, 0, 0.279705391489277, 0, 0.381830050505119, 0, 0.417959183673469];
function gk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2;
  let k = 0, g = 0;
  for (let i = 0; i < 8; i++) {
    const dx = h * GK_X[i];
    const y = i === 7 ? f(c) : f(c - dx) + f(c + dx);
    k += GK_WK[i] * y; g += GK_WG[i] * y;
  }
  return [k * h, Math.abs((k - g) * h)];
}
function nInt(f, a, b, tol) {
  if (a === b) return 0;
  let count = 0;
  const rec = (lo, hi, whole, err, eps, depth) => {
    if (!Number.isFinite(whole)) return NaN;
    if (err <= eps || depth > 40 || ++count > 20000) return whole;
    const m = (lo + hi) / 2;
    const [l, le] = gk15(f, lo, m), [r, re] = gk15(f, m, hi);
    return rec(lo, m, l, le, eps / 2, depth + 1) + rec(m, hi, r, re, eps / 2, depth + 1);
  };
  const [w, e] = gk15(f, a, b);
  if (!Number.isFinite(w)) return NaN;
  const res = rec(a, b, w, e, (tol || 1e-11) * Math.max(1e-3, Math.abs(w)), 0);
  return Math.abs(res) < 1e-14 ? 0 : res;
}

// ---------- корни ----------
// Метод Брента на отрезке со сменой знака
function brent(f, a, b, fa, fb) {
  if (fa === undefined) fa = f(a);
  if (fb === undefined) fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  let c = a, fc = fa, d = b - a, e = d;
  for (let it = 0; it < 200; it++) {
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol = 2 * Number.EPSILON * Math.abs(b), xm = (c - b) / 2;
    if (Math.abs(xm) <= tol || fb === 0) return b;
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p, q;
      if (a === c) { p = 2 * xm * s; q = 1 - s; } else {
        const qq = fa / fc, r = fb / fc;
        p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      p = Math.abs(p);
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = xm; e = d; }
    } else { d = xm; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol ? d : (xm > 0 ? tol : -tol);
    fb = f(b);
    if (!Number.isFinite(fb)) return NaN;
  }
  return b;
}

// «Красивое» значение рядом: 0.99999999997 → 1
function snapNice(x, scale) {
  if (x === 0 || !Number.isFinite(x)) return x;
  if (Math.abs(x) < 1e-11 * (scale || 1)) return 0;
  const r = Number(x.toPrecision(6));
  return Math.abs(r - x) <= 2e-10 * Math.max(1, Math.abs(x)) ? r : x;
}

// Все корни f на [a, b]: смена знака + касания оси
function scanRoots(f, a, b, n) {
  n = n || 756;
  const xs = [], ys = [], out = [];
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; xs.push(x); ys.push(f(x)); }
  const add = (x) => {
    if (!Number.isFinite(x)) return;
    x = snapNice(x, b - a);
    const tol = 1e-9 * Math.max(1, Math.abs(x), (b - a) * 1e-3);
    if (!out.some((r) => Math.abs(r - x) <= tol)) out.push(x);
  };
  let scale = 0;
  for (const y of ys) if (Number.isFinite(y)) scale = Math.max(scale, Math.abs(y));
  for (let i = 0; i < n; i++) {
    const y0 = ys[i], y1 = ys[i + 1];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
    if (y0 === 0) { add(xs[i]); continue; }
    if (i === n - 1 && y1 === 0) { add(xs[n]); continue; }
    if ((y0 < 0) !== (y1 < 0) && y1 !== 0) {
      const r = brent(f, xs[i], xs[i + 1], y0, y1);
      const fr = f(r);
      // у разрыва (tan, 1/x) знак меняется, но значение не стремится к нулю
      if (Number.isFinite(fr) && Math.abs(fr) <= 1e-6 * Math.max(Math.abs(y0), Math.abs(y1), 1e-300)) add(r);
    } else if (i > 0 && Number.isFinite(ys[i - 1])) {
      // касание: локальный минимум |f| без смены знака
      const p = Math.abs(ys[i - 1]), q = Math.abs(y0), r = Math.abs(y1);
      if (q <= p && q <= r && q < 1e-3 * Math.max(scale, 1e-300) && (ys[i - 1] < 0) === (y1 < 0)) {
        const g = (x) => nDeriv(f, x);
        const ga = g(xs[i - 1]), gb = g(xs[i + 1]);
        if (Number.isFinite(ga) && Number.isFinite(gb) && (ga < 0) !== (gb < 0)) {
          const x = brent(g, xs[i - 1], xs[i + 1], ga, gb);
          if (Number.isFinite(x) && Math.abs(f(snapNice(x, b - a))) <= 1e-10 * Math.max(scale, 1)) add(x);
        }
      }
    }
  }
  return out.sort((p, q) => p - q);
}

// Локальные максимумы (kind = 1) или минимумы (kind = −1) на [a, b]
function scanExtrema(f, a, b, kind, n) {
  n = n || 378;
  const xs = [], ys = [], out = [];
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; xs.push(x); ys.push(kind * f(x)); }
  for (let i = 1; i < n; i++) {
    const p = ys[i - 1], q = ys[i], r = ys[i + 1];
    if (!Number.isFinite(p) || !Number.isFinite(q) || !Number.isFinite(r)) continue;
    if (!(q >= p && q >= r && (q > p || q > r))) continue;
    if (q === p && i > 1 && ys[i - 2] === q) continue;
    const g = (x) => nDeriv(f, x) * kind;
    const ga = g(xs[i - 1]), gb = g(xs[i + 1]);
    let x;
    if (Number.isFinite(ga) && Number.isFinite(gb) && ga > 0 && gb < 0) x = brent(g, xs[i - 1], xs[i + 1], ga, gb);
    if (x === undefined || !Number.isFinite(x)) x = goldenMax((t) => kind * f(t), xs[i - 1], xs[i + 1]);
    x = snapNice(x, b - a);
    if (!out.some((t) => Math.abs(t - x) <= 1e-8 * Math.max(1, Math.abs(x)))) out.push(x);
  }
  return out.sort((p, q) => p - q);
}

function goldenMax(f, a, b) {
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < 100 && Math.abs(b - a) > 1e-11 * Math.max(1, Math.abs(a) + Math.abs(b)); i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}

// Solve(f, x0, lo, hi): метод Ньютона, затем поиск отрезка со сменой знака
function nSolve(f, x0, lo, hi) {
  const bounded = lo !== undefined && hi !== undefined && lo < hi;
  const inside = (x) => !bounded || (x >= lo && x <= hi);
  let x = x0, fx = f(x);
  if (fx === 0) return x;
  if (Number.isFinite(fx)) {
    for (let it = 0; it < 60; it++) {
      const d = nDeriv(f, x);
      if (!Number.isFinite(d) || d === 0) break;
      const nx = x - fx / d;
      if (!Number.isFinite(nx) || !inside(nx)) break;
      const fn = f(nx);
      if (!Number.isFinite(fn)) break;
      if (Math.abs(nx - x) <= 1e-14 * Math.max(1, Math.abs(nx)) || fn === 0) {
        if (Math.abs(fn) <= 1e-9 * Math.max(1, Math.abs(fx))) return snapNice(nx);
        break;
      }
      x = nx; fx = fn;
    }
  }
  // поиск смены знака вокруг начального значения
  const a = bounded ? lo : x0 - 100 * Math.max(1, Math.abs(x0)), b = bounded ? hi : x0 + 100 * Math.max(1, Math.abs(x0));
  const roots = scanRoots(f, a, b, 4000);
  if (!roots.length) return NaN;
  return roots.reduce((p, q) => (Math.abs(q - x0) < Math.abs(p - x0) ? q : p));
}

// ---------- распределения ----------
const SQRT2PI = Math.sqrt(2 * Math.PI);
const normPdf = (z) => Math.exp(-0.5 * z * z) / SQRT2PI;
function normTail(z) {               // Q(z) = P(Z > z), z ≥ 3: цепная дробь
  let t = 0;
  for (let k = 80; k >= 1; k--) t = k / (z + t);
  return normPdf(z) / (z + t);
}
function normCdf(z) {
  if (z < -3) return normTail(-z);
  if (z > 3) return 1 - normTail(z);
  let s = z, t = 0, b = z;
  const q = z * z;
  for (let i = 1; s !== t; ) { t = s; i += 2; b *= q / i; s = t + b; }
  return 0.5 + s * Math.exp(-0.5 * q - 0.91893853320467274178);
}
function normInv(p) {                // алгоритм Аклама + шаг уточнения
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  let x;
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  for (let i = 0; i < 3; i++) {
    const e = normCdf(x) - p, u = e / normPdf(x);
    x -= u / (1 + x * u / 2);
  }
  return x;
}
function lnGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5, s = 1.000000000190015;
  t -= (x + 0.5) * Math.log(t);
  for (let j = 0; j < 6; j++) s += g[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function binomPd(x, n, p) {
  if (!Number.isInteger(x) || !Number.isInteger(n) || n < 0 || p < 0 || p > 1) return NaN;
  if (x < 0 || x > n) return 0;
  if (p === 0) return x === 0 ? 1 : 0;
  if (p === 1) return x === n ? 1 : 0;
  if (n <= 170) return r15(fComb(n, x) * p ** x * (1 - p) ** (n - x));
  return Math.exp(lnGamma(n + 1) - lnGamma(x + 1) - lnGamma(n - x + 1) + x * Math.log(p) + (n - x) * Math.log(1 - p));
}
function binomCd(lo, hi, n, p) {
  let s = 0;
  for (let k = Math.max(0, lo); k <= Math.min(n, hi); k++) s += binomPd(k, n, p);
  return r15(s);
}
function poisPd(x, mu) {
  if (!Number.isInteger(x) || x < 0 || mu <= 0) return NaN;
  return Math.exp(x * Math.log(mu) - mu - lnGamma(x + 1));
}
function poisCd(lo, hi, mu) {
  let s = 0;
  for (let k = Math.max(0, lo); k <= hi; k++) s += poisPd(k, mu);
  return r15(s);
}
