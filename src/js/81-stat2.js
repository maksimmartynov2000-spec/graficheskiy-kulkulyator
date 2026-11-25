// ══════ 81-stat2.js — Statistics, дополнение: распределения t, χ², F, геометрическое, гипергеометрическое,
//        обратные биномиальное и Пуассона; тесты (TEST) и интервалы (INTR); диаграммы NPPlot, Pie, N-Dist; подписи SUB ══════

// ────────── числовая часть: чистые функции без экрана (проверяются в tests/stat2.js) ──────────

// ln Γ(x): приближение Ланцоша (g = 7), относительная погрешность около 1e-15
const ST2_LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function st2LnGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - st2LnGamma(1 - x);
  x -= 1;
  let a = ST2_LG[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += ST2_LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Поправка ряда Стирлинга: ln Γ(z) = (z − ½)·ln z − z + ½·ln 2π + st2Stirling(z), z ≥ 20
function st2Stirling(z) {
  const z2 = z * z;
  return (1 / 12 - (1 / 360 - (1 / 1260 - 1 / (1680 * z2)) / z2) / z2) / z;
}
// ln Γ(a + b) − ln Γ(a) без вычитания больших чисел
function st2LnGammaDiff(a, b) {
  if (a < 20) return st2LnGamma(a + b) - st2LnGamma(a);
  return (a - 0.5) * Math.log1p(b / a) + b * Math.log(a + b) - b + st2Stirling(a + b) - st2Stirling(a);
}

// Регуляризованная неполная гамма-функция: [P(a, x), Q(a, x)], Q = 1 − P (оба хвоста без потери точности)
function st2GammaPQ(a, x) {
  if (!(a > 0) || !(x >= 0)) return [NaN, NaN];
  if (x === 0) return [0, 1];
  if (!Number.isFinite(x)) return [1, 0];
  // логарифм множителя x^a·e^(−x)/Γ(a); при больших a — через ряд Стирлинга, без вычитания больших чисел
  const u = (x - a) / a;
  const lg = a < 20 ? -x + a * Math.log(x) - st2LnGamma(a)
    : a * (Math.log1p(u) - u) + 0.5 * Math.log(a / (2 * Math.PI)) - st2Stirling(a);
  if (x < a + 1) {                      // ряд
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 200000; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-17) break;
    }
    const p = sum * Math.exp(lg);
    return [p, 1 - p];
  }
  const TINY = 1e-300;                  // цепная дробь (метод Ленца)
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 200000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  const q = Math.exp(lg) * h;
  return [1 - q, q];
}

// Цепная дробь неполной бета-функции; x1 = 1 − x (первый член считается от меньшей из долей — без потери точности)
function st2BetaCf(a, b, x, x1) {
  const TINY = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = x <= 0.5 ? 1 - qab * x / qap : (1 - b + qab * x1) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 3000000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}
// Регуляризованная неполная бета-функция: [I_x(a, b), 1 − I_x(a, b)]; x1 = 1 − x (передаётся, когда известно точнее)
function st2BetaIQ(a, b, x, x1) {
  if (!(a > 0) || !(b > 0) || Number.isNaN(x)) return [NaN, NaN];
  if (x1 === undefined) x1 = 1 - x;
  if (x <= 0) return [0, 1];
  if (x1 <= 0) return [1, 0];
  // логарифмы x и 1 − x — через log1p от меньшей из долей, иначе при больших a и b теряется точность
  const lx = x1 < 0.5 ? Math.log1p(-x1) : Math.log(x), lx1 = x < 0.5 ? Math.log1p(-x) : Math.log(x1);
  let bt;
  if (a >= 20 && b >= 20) {             // оба параметра велики: считаем от среднего x0 = a/(a + b)
    const x0 = a / (a + b), x10 = b / (a + b), dx = x <= x1 ? x - x0 : x10 - x1;
    bt = Math.exp(a * Math.log1p(dx / x0) + b * Math.log1p(-dx / x10) + 0.5 * Math.log(a * b / (2 * Math.PI * (a + b)))
      + st2Stirling(a + b) - st2Stirling(a) - st2Stirling(b));
  } else {
    const lb = a >= b ? st2LnGammaDiff(a, b) - st2LnGamma(b) : st2LnGammaDiff(b, a) - st2LnGamma(a);
    bt = Math.exp(lb + a * lx + b * lx1);
  }
  if (x < (a + 1) / (a + b + 2)) { const i = bt * st2BetaCf(a, b, x, x1) / a; return [i, 1 - i]; }
  const q = bt * st2BetaCf(b, a, x1, x) / b;
  return [1 - q, q];
}
// Корень убывающей функции хвоста: Q(x) = p на [lo, hi], границы подбираются удвоением
function st2InvQ(Q, p, start) {
  let hi = start;
  while (Q(hi) > p && hi < 1e300) hi *= 2;
  let lo = hi / 2;
  while (lo > 1e-300 && Q(lo) < p) lo /= 2;
  if (Q(hi) > p || Q(lo) < p) return NaN;
  return brent((x) => Q(x) - p, lo, hi);
}

// ----- распределение Стьюдента -----
function st2TQ(t, df) {                 // правый хвост P(T > t)
  if (!(df > 0) || Number.isNaN(t)) return NaN;
  if (df > 1e4) {                       // много степеней свободы: разложение Хилла через нормальное распределение
    const a = df - 0.5, b = 48 * a * a;
    let y = a * Math.log1p(t * t / df);
    y = (((((-0.4 * y - 3.3) * y - 24) * y - 85.5) / (0.8 * y * y + 100 + b) + y + 3) / b + 1) * Math.sqrt(y);
    return normCdf(t >= 0 ? -y : y);
  }
  const den = df + t * t;
  const i = st2BetaIQ(df / 2, 0.5, df / den, t * t / den)[0];    // P(|T| > |t|)
  return t >= 0 ? i / 2 : 1 - i / 2;
}
const st2TCdf = (t, df) => st2TQ(-t, df);
function st2TPdf(t, df) {
  if (!(df > 0)) return NaN;
  return Math.exp(st2LnGammaDiff(df / 2, 0.5) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log1p(t * t / df));
}
function st2TCd(lo, hi, df) {           // P(lo ≤ T ≤ hi)
  if (!(df > 0) || !(lo <= hi)) return NaN;
  return lo > 0 ? st2TQ(lo, df) - st2TQ(hi, df) : st2TCdf(hi, df) - st2TCdf(lo, df);
}
function st2TInv(p, df) {               // t, для которого P(T > t) = p
  if (!(p > 0 && p < 1) || !(df > 0)) return NaN;
  if (p === 0.5) return 0;
  if (p > 0.5) return -st2TInv(1 - p, df);
  return st2InvQ((t) => st2TQ(t, df), p, 1);
}

// ----- распределение χ² -----
const st2ChiCdf = (x, k) => (x <= 0 ? 0 : st2GammaPQ(k / 2, x / 2)[0]);
const st2ChiQ = (x, k) => (x <= 0 ? 1 : st2GammaPQ(k / 2, x / 2)[1]);
function st2ChiPdf(x, k) {
  if (!(k > 0)) return NaN;
  if (x < 0) return 0;
  if (x === 0) return k < 2 ? NaN : k === 2 ? 0.5 : 0;
  return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - k / 2 * Math.LN2 - st2LnGamma(k / 2));
}
function st2ChiCd(lo, hi, k) {
  if (!(k > 0) || !(lo <= hi)) return NaN;
  lo = Math.max(0, lo); hi = Math.max(0, hi);
  return st2ChiQ(lo, k) < 0.5 ? st2ChiQ(lo, k) - st2ChiQ(hi, k) : st2ChiCdf(hi, k) - st2ChiCdf(lo, k);
}
function st2ChiInv(p, k) {              // x, для которого P(X > x) = p
  if (!(p > 0 && p < 1) || !(k > 0)) return NaN;
  return st2InvQ((x) => st2ChiQ(x, k), p, Math.max(1, k));
}

// ----- распределение Фишера -----
function st2FQ(x, n, d) {               // P(F > x)
  if (!(n > 0) || !(d > 0)) return NaN;
  if (x <= 0) return 1;
  const den = n * x + d;
  return st2BetaIQ(n / 2, d / 2, n * x / den, d / den)[1];
}
function st2FCdf(x, n, d) {
  if (!(n > 0) || !(d > 0)) return NaN;
  if (x <= 0) return 0;
  const den = n * x + d;
  return st2BetaIQ(n / 2, d / 2, n * x / den, d / den)[0];
}
function st2FPdf(x, n, d) {
  if (!(n > 0) || !(d > 0)) return NaN;
  if (x < 0) return 0;
  if (x === 0) return n < 2 ? NaN : n === 2 ? 1 : 0;
  return Math.exp(0.5 * (n * Math.log(n * x) + d * Math.log(d) - (n + d) * Math.log(n * x + d)) - Math.log(x)
    - (st2LnGamma(n / 2) + st2LnGamma(d / 2) - st2LnGamma((n + d) / 2)));
}
function st2FCd(lo, hi, n, d) {
  if (!(lo <= hi)) return NaN;
  lo = Math.max(0, lo); hi = Math.max(0, hi);
  return st2FQ(lo, n, d) < 0.5 ? st2FQ(lo, n, d) - st2FQ(hi, n, d) : st2FCdf(hi, n, d) - st2FCdf(lo, n, d);
}
function st2FInv(p, n, d) {             // x, для которого P(F > x) = p
  if (!(p > 0 && p < 1) || !(n > 0) || !(d > 0)) return NaN;
  return st2InvQ((x) => st2FQ(x, n, d), p, 1);
}

// ----- дискретные распределения -----
// Геометрическое: номер первого успеха, x = 1, 2, …
function st2GeoPd(x, p) {
  if (!Number.isInteger(x) || !(p > 0 && p <= 1)) return NaN;
  return x < 1 ? 0 : p * (1 - p) ** (x - 1);
}
function st2GeoCd(lo, hi, p) {          // P(lo ≤ X ≤ hi)
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || !(p > 0 && p <= 1)) return NaN;
  lo = Math.max(1, lo);
  return hi < lo ? 0 : (1 - p) ** (lo - 1) - (1 - p) ** hi;
}
// Наименьшее x, при котором накопленная вероятность cum(x) достигает area
function st2DiscInv(area, cum, from, to) {
  if (!(area >= 0 && area <= 1)) return NaN;
  for (let x = from; x <= to; x++) if (cum(x) >= area - 1e-13) return x;
  return NaN;
}
function st2GeoInv(area, p) {
  if (!(area >= 0 && area < 1) || !(p > 0 && p <= 1)) return NaN;
  if (p === 1) return 1;
  let x = Math.max(1, Math.ceil(Math.log1p(-area) / Math.log1p(-p) - 1e-9));
  while (x > 1 && 1 - (1 - p) ** (x - 1) >= area - 1e-13) x--;
  while (1 - (1 - p) ** x < area - 1e-13) x++;
  return x;
}
// Гипергеометрическое: n — объём выборки, M — число «успехов» в совокупности, N — объём совокупности.
// all — число всех выборок C(N, n), если оно уже посчитано (чтобы не считать заново для каждого x)
function st2HypPd(x, n, M, N, all) {
  if (![x, n, M, N].every(Number.isInteger) || N < 0 || M < 0 || M > N || n < 0 || n > N) return NaN;
  if (x < Math.max(0, n - (N - M)) || x > Math.min(n, M)) return 0;
  if (all === undefined) all = fComb(N, n);
  if (all < 9e15) return fComb(M, x) * fComb(N - M, n - x) / all;      // небольшие числа — точно
  const lc = (a, b) => st2LnGamma(a + 1) - st2LnGamma(b + 1) - st2LnGamma(a - b + 1);
  return Math.exp(lc(M, x) + lc(N - M, n - x) - lc(N, n));
}
function st2HypCd(lo, hi, n, M, N) {
  if (!Number.isInteger(lo) || !Number.isInteger(hi)) return NaN;
  if (Number.isNaN(st2HypPd(0, n, M, N, 1)) || n > 1e6) return NaN;
  const all = fComb(N, n);
  let s = 0;
  for (let x = Math.max(0, lo, n - (N - M)); x <= Math.min(n, M, hi); x++) s += st2HypPd(x, n, M, N, all);
  return Math.min(1, s);
}
function st2HypInv(area, n, M, N) {
  if (Number.isNaN(st2HypPd(0, n, M, N, 1)) || n > 1e6) return NaN;
  const all = fComb(N, n);
  let s = 0;
  return st2DiscInv(area, (x) => (s += st2HypPd(x, n, M, N, all)), 0, n);
}
function st2BinInv(area, n, p) {
  if (!Number.isInteger(n) || n < 0 || n > 1e6 || !(p >= 0 && p <= 1)) return NaN;
  let s = 0;
  return st2DiscInv(area, (x) => (s += binomPd(x, n, p)), 0, n);
}
function st2PoisInv(area, mu) {
  if (!(mu > 0) || !(area >= 0 && area < 1)) return NaN;
  let s = 0;
  return st2DiscInv(area, (x) => (s += poisPd(x, mu)), 0, 1e6);
}

// ----- тесты -----
// p-значение по виду альтернативы: left = P(стат ≤ набл.), right = P(стат ≥ набл.)
const st2PVal = (alt, left, right) => (alt === '<' ? left : alt === '>' ? right : Math.min(1, 2 * Math.min(left, right)));
const st2Need = (ok) => { if (!ok) fail('Ma ERROR'); };

function st2ZTest1(alt, mu0, sigma, mean, n) {
  st2Need(sigma > 0 && n > 0);
  const z = (mean - mu0) / (sigma / Math.sqrt(n));
  return { z, p: st2PVal(alt, normCdf(z), normCdf(-z)) };
}
function st2ZTest2(alt, s1, s2, m1, n1, m2, n2) {
  st2Need(s1 > 0 && s2 > 0 && n1 > 0 && n2 > 0);
  const z = (m1 - m2) / Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2);
  return { z, p: st2PVal(alt, normCdf(z), normCdf(-z)) };
}
function st2ZProp1(alt, p0, x, n) {
  st2Need(p0 > 0 && p0 < 1 && n > 0 && x >= 0 && x <= n);
  const ph = x / n, z = (ph - p0) / Math.sqrt(p0 * (1 - p0) / n);
  return { z, p: st2PVal(alt, normCdf(z), normCdf(-z)), ph };
}
function st2ZProp2(alt, x1, n1, x2, n2) {
  st2Need(n1 > 0 && n2 > 0 && x1 >= 0 && x1 <= n1 && x2 >= 0 && x2 <= n2);
  const ph1 = x1 / n1, ph2 = x2 / n2, ph = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(ph * (1 - ph) * (1 / n1 + 1 / n2));
  st2Need(se > 0);
  const z = (ph1 - ph2) / se;
  return { z, p: st2PVal(alt, normCdf(z), normCdf(-z)), ph1, ph2, ph };
}
function st2TTest1(alt, mu0, mean, sx, n) {
  st2Need(sx > 0 && n > 1);
  const t = (mean - mu0) / (sx / Math.sqrt(n)), df = n - 1;
  return { t, p: st2PVal(alt, st2TCdf(t, df), st2TQ(t, df)), df };
}
// Стандартная ошибка разности средних и число степеней свободы (pooled — общая дисперсия)
function st2Se2(s1, n1, s2, n2, pooled) {
  st2Need(n1 > 1 && n2 > 1 && s1 >= 0 && s2 >= 0 && s1 + s2 > 0);
  if (pooled) {
    const df = n1 + n2 - 2, sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df);
    return { se: sp * Math.sqrt(1 / n1 + 1 / n2), df, sp };
  }
  const a = s1 * s1 / n1, b = s2 * s2 / n2;
  return { se: Math.sqrt(a + b), df: (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1)), sp: null };
}
function st2TTest2(alt, m1, s1, n1, m2, s2, n2, pooled) {
  const q = st2Se2(s1, n1, s2, n2, pooled), t = (m1 - m2) / q.se;
  return { t, p: st2PVal(alt, st2TCdf(t, q.df), st2TQ(t, q.df)), df: q.df, sp: q.sp };
}
// t-критерий наклона прямой y = a + b·x
function st2RegTest(alt, xs, ys, fs) {
  if (!xs.length || xs.length !== ys.length || (fs && fs.length !== xs.length)) fail('Dimension ERROR');
  const ws = fs || xs.map(() => 1);
  st2Need(ws.every((w) => w >= 0));
  let n = 0, sx = 0, sy = 0;
  ws.forEach((w, i) => { n += w; sx += w * xs[i]; sy += w * ys[i]; });
  st2Need(n > 2);
  const mx = sx / n, my = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  ws.forEach((w, i) => { const dx = xs[i] - mx, dy = ys[i] - my; sxx += w * dx * dx; sxy += w * dx * dy; syy += w * dy * dy; });
  st2Need(sxx > 0 && syy > 0);
  const b = sxy / sxx, a = my - b * mx, df = n - 2;
  const sse = Math.max(0, syy - b * sxy), s = Math.sqrt(sse / df);
  st2Need(s > 0);
  const t = b / (s / Math.sqrt(sxx)), r = sxy / Math.sqrt(sxx * syy);
  return { t, p: st2PVal(alt, st2TCdf(t, df), st2TQ(t, df)), df, a, b, s, r, r2: r * r };
}
// χ²-критерий согласия: наблюдаемые и ожидаемые частоты
function st2ChiGof(obs, exp, df) {
  if (!obs.length || obs.length !== exp.length) fail('Dimension ERROR');
  st2Need(exp.every((e) => e > 0) && obs.every((o) => o >= 0) && df > 0);
  const contrib = obs.map((o, i) => (o - exp[i]) ** 2 / exp[i]);
  const chi = contrib.reduce((p, q) => p + q, 0);
  return { chi, p: st2ChiQ(chi, df), df, contrib };
}
// χ²-критерий независимости: таблица наблюдений (массив строк)
function st2Chi2Way(obs) {
  const r = obs.length, c = r ? obs[0].length : 0;
  if (r < 2 || c < 2) fail('Dimension ERROR');
  st2Need(obs.every((row) => row.every((v) => v >= 0)));
  const rs = obs.map((row) => row.reduce((p, q) => p + q, 0)), cs = obs[0].map((_, j) => obs.reduce((p, row) => p + row[j], 0));
  const tot = rs.reduce((p, q) => p + q, 0);
  st2Need(tot > 0 && rs.every((v) => v > 0) && cs.every((v) => v > 0));
  const exp = obs.map((row, i) => row.map((_, j) => rs[i] * cs[j] / tot));
  let chi = 0;
  obs.forEach((row, i) => row.forEach((o, j) => { chi += (o - exp[i][j]) ** 2 / exp[i][j]; }));
  const df = (r - 1) * (c - 1);
  return { chi, p: st2ChiQ(chi, df), df, exp };
}
function st2FTest(alt, s1, n1, s2, n2) {
  st2Need(s1 > 0 && s2 > 0 && n1 > 1 && n2 > 1);
  const F = s1 * s1 / (s2 * s2);
  return { F, p: st2PVal(alt, st2FCdf(F, n1 - 1, n2 - 1), st2FQ(F, n1 - 1, n2 - 1)) };
}
// Однофакторный дисперсионный анализ: factor — метки групп, vals — значения
function st2Anova(factor, vals) {
  if (!vals.length || factor.length !== vals.length) fail('Dimension ERROR');
  const groups = new Map();
  factor.forEach((f, i) => { if (!groups.has(f)) groups.set(f, []); groups.get(f).push(vals[i]); });
  const k = groups.size, n = vals.length, mean = vals.reduce((p, q) => p + q, 0) / n;
  st2Need(k >= 2 && n - k >= 1);
  let ssA = 0, ssE = 0;
  for (const g of groups.values()) {
    const m = g.reduce((p, q) => p + q, 0) / g.length;
    ssA += g.length * (m - mean) ** 2;
    for (const v of g) ssE += (v - m) ** 2;
  }
  st2Need(ssE > 0);
  const dfA = k - 1, dfE = n - k, msA = ssA / dfA, msE = ssE / dfE, F = msA / msE;
  return { dfA, ssA, msA, F, p: st2FQ(F, dfA, dfE), dfE, ssE, msE };
}

// ----- доверительные интервалы -----
// Уровень доверия: 0.95 или 95 (проценты)
function st2CLevel(c) {
  if (c >= 1 && c < 100) c /= 100;
  st2Need(c > 0 && c < 1);
  return c;
}
function st2ZInt1(c, sigma, mean, n) {
  st2Need(sigma > 0 && n > 0);
  const m = normInv((1 + st2CLevel(c)) / 2) * sigma / Math.sqrt(n);
  return { lo: mean - m, hi: mean + m };
}
function st2ZInt2(c, s1, s2, m1, n1, m2, n2) {
  st2Need(s1 > 0 && s2 > 0 && n1 > 0 && n2 > 0);
  const m = normInv((1 + st2CLevel(c)) / 2) * Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2);
  return { lo: m1 - m2 - m, hi: m1 - m2 + m };
}
function st2PropInt1(c, x, n) {
  st2Need(n > 0 && x >= 0 && x <= n);
  const ph = x / n, m = normInv((1 + st2CLevel(c)) / 2) * Math.sqrt(ph * (1 - ph) / n);
  return { lo: ph - m, hi: ph + m, ph };
}
function st2PropInt2(c, x1, n1, x2, n2) {
  st2Need(n1 > 0 && n2 > 0 && x1 >= 0 && x1 <= n1 && x2 >= 0 && x2 <= n2);
  const ph1 = x1 / n1, ph2 = x2 / n2;
  const m = normInv((1 + st2CLevel(c)) / 2) * Math.sqrt(ph1 * (1 - ph1) / n1 + ph2 * (1 - ph2) / n2);
  return { lo: ph1 - ph2 - m, hi: ph1 - ph2 + m, ph1, ph2 };
}
function st2TInt1(c, mean, sx, n) {
  st2Need(sx > 0 && n > 1);
  const m = st2TInv((1 - st2CLevel(c)) / 2, n - 1) * sx / Math.sqrt(n);
  return { lo: mean - m, hi: mean + m };
}
function st2TInt2(c, m1, s1, n1, m2, s2, n2, pooled) {
  const q = st2Se2(s1, n1, s2, n2, pooled), m = st2TInv((1 - st2CLevel(c)) / 2, q.df) * q.se;
  return { lo: m1 - m2 - m, hi: m1 - m2 + m, df: q.df, sp: q.sp };
}

// Ожидаемые нормальные значения для диаграммы NPPlot: z-значения долей (i − 0.5)/n
function st2NormScores(n) {
  return Array.from({ length: n }, (_, i) => normInv((i + 0.5) / n));
}

// ────────── знак p̂ ──────────
G.PHAT = '';
if (typeof lcd !== 'undefined') {
  const st2Special0 = lcd.special;
  lcd.special = function (ch, cx, cy, h, color) {
    if (ch !== G.PHAT) return st2Special0.call(this, ch, cx, cy, h, color);
    const g = this.g, u = h / 24;
    g.font = `600 ${20 * u}px ${FONT}`; g.fillStyle = color; g.textAlign = 'center';
    g.fillText('p', cx, cy + 5 * u);
    g.strokeStyle = color; g.lineWidth = 1.5 * u; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - 4 * u, cy - 6 * u); g.lineTo(cx, cy - 9.5 * u); g.lineTo(cx + 4 * u, cy - 6 * u); g.stroke();
    return true;
  };
}

// ────────── параметры форм (живут до перезагрузки страницы или сброса памяти) ──────────
const st2Defaults = () => ({
  tpd: { x: 0, df: 1 }, tcd: { lo: 0, hi: 0, df: 1 }, invt: { area: 0, df: 1 },
  cpd: { x: 0, df: 1 }, ccd: { lo: 0, hi: 0, df: 1 }, invc: { area: 0, df: 1 },
  fpd: { x: 0, n: 1, d: 1 }, fcd: { lo: 0, hi: 0, n: 1, d: 1 }, invf: { area: 0, n: 1, d: 1 },
  gpd: { x: 0, p: 0 }, gcd: { lo: 0, hi: 0, p: 0 }, invg: { area: 0, p: 0 },
  hpd: { x: 0, n: 0, M: 0, N: 0 }, hcd: { lo: 0, hi: 0, n: 0, M: 0, N: 0 }, invh: { area: 0, n: 0, M: 0, N: 0 },
  invb: { area: 0, n: 0, p: 0 }, invp: { area: 0, mu: 0 },
  z1: { data: 'Variable', alt: '≠', mu0: 0, s: 1, m: 0, n: 0, l: 1, f: 0 },
  z2: { data: 'Variable', alt: '≠', s1: 1, s2: 1, m1: 0, n1: 0, m2: 0, n2: 0, l1: 1, l2: 2, f1: 0, f2: 0 },
  zp1: { alt: '≠', p0: 0.5, x: 0, n: 0 },
  zp2: { alt: '≠', x1: 0, n1: 0, x2: 0, n2: 0 },
  t1: { data: 'Variable', alt: '≠', mu0: 0, m: 0, sx: 0, n: 0, l: 1, f: 0 },
  t2: { data: 'Variable', alt: '≠', m1: 0, sx1: 0, n1: 0, m2: 0, sx2: 0, n2: 0, pooled: 'Off', l1: 1, l2: 2, f1: 0, f2: 0 },
  treg: { alt: '≠', x: 1, y: 2, f: 0 },
  gof: { o: 1, e: 2, df: 1, c: 3 },
  chi2: { o: 'A', e: 'B' },
  f2: { data: 'Variable', alt: '≠', sx1: 0, n1: 0, sx2: 0, n2: 0, l1: 1, l2: 2, f1: 0, f2: 0 },
  anova: { a: 1, d: 2 },
  zi1: { data: 'Variable', c: 0.95, s: 1, m: 0, n: 0, l: 1, f: 0 },
  zi2: { data: 'Variable', c: 0.95, s1: 1, s2: 1, m1: 0, n1: 0, m2: 0, n2: 0, l1: 1, l2: 2, f1: 0, f2: 0 },
  zpi1: { c: 0.95, x: 0, n: 0 },
  zpi2: { c: 0.95, x1: 0, n1: 0, x2: 0, n2: 0 },
  ti1: { data: 'Variable', c: 0.95, m: 0, sx: 0, n: 0, l: 1, f: 0 },
  ti2: { data: 'Variable', c: 0.95, m1: 0, sx1: 0, n1: 0, m2: 0, sx2: 0, n2: 0, pooled: 'Off', l1: 1, l2: 2, f1: 0, f2: 0 }
});
let st2P = st2Defaults();
function st2Reset() {
  st2P = st2Defaults();
  statApp.sub = false; statApp.subEd = null;
}

// ────────── общие части форм ──────────
const st2Fin = (v) => { if (!Number.isFinite(v)) fail('Ma ERROR'); return r15(v); };
const ST2_WHOLE = (v) => Number.isInteger(v) && v >= 0;
const ST2_COUNT = (v) => Number.isInteger(v) && v > 0;
const ST2_PROB = (v) => v >= 0 && v <= 1;
const ST2_POS = (v) => v > 0;

// Строки формы для набора параметров d
function st2Rows(app, d) {
  const pick = (key) => () => app.pickList((n) => { d[key] = n; });
  return {
    num: (label, key, check) => ({ label, value: fmtFit(d[key], 10), num: (v) => { st2Need(!check || check(v)); d[key] = v; } }),
    list: (label, key) => ({ label, value: 'List' + d[key], menu: [{ l: 'LIST', fn: pick(key) }] }),
    freq: (label, key) => ({ label, value: d[key] ? 'List' + d[key] : '1', menu: [{ l: '1', fn: () => { d[key] = 0; } }, { l: 'LIST', fn: pick(key) }] }),
    data: () => ({ label: 'Data', value: d.data, menu: [{ l: 'List', fn: () => { d.data = 'List'; } }, { l: 'Var', fn: () => { d.data = 'Variable'; } }] }),
    alt: (label, rhs) => ({ label, value: d.alt + rhs, menu: ['≠', '<', '>'].map((a) => ({ l: a, fn: () => { d.alt = a; } })) }),
    opt: (label, key, opts) => ({ label, value: d[key], menu: opts.map((o) => ({ l: o, fn: () => { d[key] = o; } })) }),
    fixed: (label, value) => ({ label, value })
  };
}
// Выборка: из списка (среднее, sx, n) или из введённых чисел. sfx — '' | '1' | '2'
function st2Sample(app, d, sfx) {
  if (d.data === 'List') {
    const xs = app.nums(d['l' + sfx]);
    const s = stat1(xs, app.freq(d['f' + sfx], xs.length), 'Std');
    return { mean: s.mean, sx: s.sdS, n: s.n, list: true };
  }
  return { mean: d['m' + sfx], sx: d['sx' + sfx], n: d['n' + sfx], list: false };
}
// Форма с строкой Execute и экран результата. calc() → {title?, cond?: [имя, условие], rows}
function st2Form(title, rows, calc) {
  const run = () => {
    const r = calc();
    const out = r.rows.map((row) => (row.length > 1 && typeof row[1] === 'number' ? [row[0], st2Fin(row[1])] : row));
    if (r.cond) {
      const wide = Math.max(1, ...out.filter((row) => row.length > 1).map((row) => [...row[0]].length));
      out.unshift([r.cond[0] + ' '.repeat(Math.max(0, wide - [...r.cond[0]].length)) + r.cond[1]]);
    }
    statReport(r.title || title, out);
  };
  statForm({ title, col: 9, indent: true, rows: () => [...rows(), { label: 'Execute', exec: run, menu: [{ l: 'CALC', fn: run }] }] });
}
// Выбор матрицы буквой A–Z
function st2AskMat(onDone) {
  pushModal({
    lock: true,
    key(k) {
      if (k.id === 'EXIT' || k.id === 'AC') { popModal(); return; }
      const ch = ALPHA_KEY[k.id];
      if (ch && ch >= 'A' && ch <= 'Z') { popModal(); onDone(ch); }
    },
    draw() { lcd.popup(['Select Matrix', 'Mat A~Z'], { w: 290 }); }
  });
}
const st2Mat = (name) => {
  const m = mem.mats[name];
  if (!m || !m.length) fail('Dimension ERROR');
  return m.map((row) => row.map((x) => x.v));
};
const ST2_XB = G.XBAR, ST2_CHI2 = 'χ' + G.SQ;

// ────────── DIST: t, χ², F, GEO, H.GEO, InvB, InvP ──────────
function st2Dist(app, id) {
  const d = st2P[id], r = st2Rows(app, d);
  const data = r.fixed('Data', 'Variable');
  const df = () => r.num('df', 'df', ST2_POS), ndf = () => r.num('n:df', 'n', ST2_POS), ddf = () => r.num('d:df', 'd', ST2_POS);
  const lohi = (check) => [r.num('Lower', 'lo', check), r.num('Upper', 'hi', check)];
  const area = () => r.num('Area', 'area', ST2_PROB);
  const hyp = () => [r.num('n', 'n', ST2_WHOLE), r.num('M', 'M', ST2_WHOLE), r.num('N', 'N', ST2_WHOLE)];
  const P = (v) => [['p', v]], X = (v) => [['xInv', v]];
  const defs = {
    tpd: ['Student-t P.D', () => [r.num('x', 'x'), df()], () => P(st2TPdf(d.x, d.df))],
    tcd: ['Student-t C.D', () => [...lohi(), df()], () => [['p', st2TCd(d.lo, d.hi, d.df)], ['t:Low', d.lo], ['t:Up', d.hi]]],
    invt: ['Inverse Student-t', () => [area(), df()], () => X(st2TInv(d.area, d.df))],
    cpd: [ST2_CHI2 + ' P.D', () => [r.num('x', 'x'), df()], () => P(st2ChiPdf(d.x, d.df))],
    ccd: [ST2_CHI2 + ' C.D', () => [...lohi(), df()], () => P(st2ChiCd(d.lo, d.hi, d.df))],
    invc: ['Inverse ' + ST2_CHI2, () => [area(), df()], () => X(st2ChiInv(d.area, d.df))],
    fpd: ['F P.D', () => [r.num('x', 'x'), ndf(), ddf()], () => P(st2FPdf(d.x, d.n, d.d))],
    fcd: ['F C.D', () => [...lohi(), ndf(), ddf()], () => P(st2FCd(d.lo, d.hi, d.n, d.d))],
    invf: ['Inverse F', () => [area(), ndf(), ddf()], () => X(st2FInv(d.area, d.n, d.d))],
    gpd: ['Geometric P.D', () => [r.num('x', 'x', ST2_WHOLE), r.num('p', 'p', ST2_PROB)], () => P(st2GeoPd(d.x, d.p))],
    gcd: ['Geometric C.D', () => [...lohi(ST2_WHOLE), r.num('p', 'p', ST2_PROB)], () => P(st2GeoCd(d.lo, d.hi, d.p))],
    invg: ['Inverse Geometric', () => [area(), r.num('p', 'p', ST2_PROB)], () => X(st2GeoInv(d.area, d.p))],
    hpd: ['Hypergeometric P.D', () => [r.num('x', 'x', ST2_WHOLE), ...hyp()], () => P(st2HypPd(d.x, d.n, d.M, d.N))],
    hcd: ['Hypergeometric C.D', () => [...lohi(ST2_WHOLE), ...hyp()], () => P(st2HypCd(d.lo, d.hi, d.n, d.M, d.N))],
    invh: ['Inverse Hypergeo', () => [area(), ...hyp()], () => X(st2HypInv(d.area, d.n, d.M, d.N))],
    invb: ['Inverse Binomial', () => [area(), r.num('Numtrial', 'n', ST2_WHOLE), r.num('p', 'p', ST2_PROB)], () => X(st2BinInv(d.area, d.n, d.p))],
    invp: ['Inverse Poisson', () => [area(), r.num('λ', 'mu', ST2_POS)], () => X(st2PoisInv(d.area, d.mu))]
  };
  const [title, rows, calc] = defs[id];
  st2Form(title, () => [data, ...rows()], () => ({ rows: calc() }));
}
function st2DistMenu(app) {
  const old = (id) => () => app.distForm(id), neu = (id) => () => st2Dist(app, id);
  return [
    mi('NORM', [mi('Npd', old('npd')), mi('Ncd', old('ncd')), mi('InvN', old('invn'))]),
    mi('t', [mi('tpd', neu('tpd')), mi('tcd', neu('tcd')), mi('Invt', neu('invt'))]),
    mi('CHI', [mi('Cpd', neu('cpd')), mi('Ccd', neu('ccd')), mi('InvC', neu('invc'))]),
    mi('F', [mi('Fpd', neu('fpd')), mi('Fcd', neu('fcd')), mi('InvF', neu('invf'))]),
    mi('BINOMIAL', [mi('Bpd', old('bpd')), mi('Bcd', old('bcd')), mi('InvB', neu('invb'))]),
    mi('POISSON', [mi('Ppd', old('ppd')), mi('Pcd', old('pcd')), mi('InvP', neu('invp'))]),
    mi('GEO', [mi('Gpd', neu('gpd')), mi('Gcd', neu('gcd')), mi('InvG', neu('invg'))]),
    mi('H.GEO', [mi('Hpd', neu('hpd')), mi('Hcd', neu('hcd')), mi('InvH', neu('invh'))])
  ];
}

// ────────── TEST ──────────
// Строки выборки: одна (sfx = '') или две; sx — нужна ли строка sx
function st2SrcRows(r, d, two, sx) {
  if (d.data === 'List') {
    return two ? [r.list('List(1)', 'l1'), r.list('List(2)', 'l2'), r.freq('Freq(1)', 'f1'), r.freq('Freq(2)', 'f2')] : [r.list('List', 'l'), r.freq('Freq', 'f')];
  }
  const one = (s) => [r.num(ST2_XB + s, 'm' + s), ...(sx ? [r.num('sx' + s, 'sx' + s, (v) => v >= 0)] : []), r.num('n' + s, 'n' + s, ST2_COUNT)];
  return two ? [...one('1'), ...one('2')] : one('');
}
function st2Test(app, id) {
  const d = st2P[id], r = st2Rows(app, d);
  switch (id) {
    case 'z1':
      st2Form('1-Sample ZTest', () => [r.data(), r.alt('μ', 'μ0'), r.num('μ0', 'mu0'), r.num('σ', 's', ST2_POS), ...st2SrcRows(r, d, false, false)], () => {
        const s = st2Sample(app, d, ''), q = st2ZTest1(d.alt, d.mu0, d.s, s.mean, s.n);
        return { cond: ['μ', d.alt + fmtNum(d.mu0)], rows: [['z', q.z], ['p', q.p], [ST2_XB, s.mean], ...(s.list && Number.isFinite(s.sx) ? [['sx', s.sx]] : []), ['n', s.n]] };
      });
      break;
    case 'z2':
      st2Form('2-Sample ZTest', () => [r.data(), r.alt('μ1', 'μ2'), r.num('σ1', 's1', ST2_POS), r.num('σ2', 's2', ST2_POS), ...st2SrcRows(r, d, true, false)], () => {
        const a = st2Sample(app, d, '1'), b = st2Sample(app, d, '2'), q = st2ZTest2(d.alt, d.s1, d.s2, a.mean, a.n, b.mean, b.n);
        return {
          cond: ['μ1', d.alt + 'μ2'],
          rows: [['z', q.z], ['p', q.p], [ST2_XB + '1', a.mean], [ST2_XB + '2', b.mean], ...(a.list && Number.isFinite(a.sx) && Number.isFinite(b.sx) ? [['sx1', a.sx], ['sx2', b.sx]] : []), ['n1', a.n], ['n2', b.n]]
        };
      });
      break;
    case 'zp1':
      st2Form('1-Prop ZTest', () => [r.alt('Prop', 'p0'), r.num('p0', 'p0', (v) => v > 0 && v < 1), r.num('x', 'x', ST2_WHOLE), r.num('n', 'n', ST2_COUNT)], () => {
        const q = st2ZProp1(d.alt, d.p0, d.x, d.n);
        return { cond: ['Prop', d.alt + fmtNum(d.p0)], rows: [['z', q.z], ['p', q.p], [G.PHAT, q.ph], ['n', d.n]] };
      });
      break;
    case 'zp2':
      st2Form('2-Prop ZTest', () => [r.alt('p1', 'p2'), r.num('x1', 'x1', ST2_WHOLE), r.num('n1', 'n1', ST2_COUNT), r.num('x2', 'x2', ST2_WHOLE), r.num('n2', 'n2', ST2_COUNT)], () => {
        const q = st2ZProp2(d.alt, d.x1, d.n1, d.x2, d.n2);
        return { cond: ['p1', d.alt + 'p2'], rows: [['z', q.z], ['p', q.p], [G.PHAT + '1', q.ph1], [G.PHAT + '2', q.ph2], [G.PHAT, q.ph], ['n1', d.n1], ['n2', d.n2]] };
      });
      break;
    case 't1':
      st2Form('1-Sample tTest', () => [r.data(), r.alt('μ', 'μ0'), r.num('μ0', 'mu0'), ...st2SrcRows(r, d, false, true)], () => {
        const s = st2Sample(app, d, ''), q = st2TTest1(d.alt, d.mu0, s.mean, s.sx, s.n);
        return { cond: ['μ', d.alt + fmtNum(d.mu0)], rows: [['t', q.t], ['p', q.p], [ST2_XB, s.mean], ['sx', s.sx], ['n', s.n]] };
      });
      break;
    case 't2':
      st2Form('2-Sample tTest', () => [r.data(), r.alt('μ1', 'μ2'), ...st2SrcRows(r, d, true, true), r.opt('Pooled', 'pooled', ['On', 'Off'])], () => {
        const a = st2Sample(app, d, '1'), b = st2Sample(app, d, '2');
        const q = st2TTest2(d.alt, a.mean, a.sx, a.n, b.mean, b.sx, b.n, d.pooled === 'On');
        return {
          cond: ['μ1', d.alt + 'μ2'],
          rows: [['t', q.t], ['p', q.p], ['df', q.df], [ST2_XB + '1', a.mean], [ST2_XB + '2', b.mean], ['sx1', a.sx], ['sx2', b.sx], ...(q.sp === null ? [] : [['sp', q.sp]]), ['n1', a.n], ['n2', b.n]]
        };
      });
      break;
    case 'treg':
      st2Form('LinearReg tTest', () => [r.alt('β & ρ', '0'), r.list('XList', 'x'), r.list('YList', 'y'), r.freq('Freq', 'f')], () => {
        const xs = app.nums(d.x), ys = app.nums(d.y);
        if (xs.length !== ys.length) fail('Dimension ERROR');
        const q = st2RegTest(d.alt, xs, ys, app.freq(d.f, xs.length));
        return { rows: [['β' + d.alt + '0 & ρ' + d.alt + '0'], ['t', q.t], ['p', q.p], ['df', q.df], ['a', q.a], ['b', q.b], ['s', q.s], ['r', q.r], ['r' + G.SQ, q.r2]] };
      });
      break;
    case 'gof':
      st2Form(ST2_CHI2 + ' GOF Test', () => [r.list('Observed', 'o'), r.list('Expected', 'e'), r.num('df', 'df', ST2_COUNT), r.list('CNTRB', 'c')], () => {
        const q = st2ChiGof(app.nums(d.o), app.nums(d.e), d.df);
        mem.lists[d.c - 1] = q.contrib.map((v) => R(st2Fin(v), null, true));
        return { rows: [[ST2_CHI2, q.chi], ['p', q.p], ['df', q.df], ['CNTRB:List' + d.c]] };
      });
      break;
    case 'chi2':
      st2Form(ST2_CHI2 + ' Test', () => [
        { label: 'Observed', value: 'Mat ' + d.o, menu: [{ l: 'Mat', fn: () => st2AskMat((n) => { d.o = n; }) }] },
        { label: 'Expected', value: 'Mat ' + d.e, menu: [{ l: 'Mat', fn: () => st2AskMat((n) => { d.e = n; }) }] }
      ], () => {
        const q = st2Chi2Way(st2Mat(d.o));
        mem.mats[d.e] = q.exp.map((row) => row.map((v) => R(st2Fin(v), null, true)));
        return { rows: [[ST2_CHI2, q.chi], ['p', q.p], ['df', q.df]] };
      });
      break;
    case 'f2':
      st2Form('2-Sample FTest', () => {
        if (d.data === 'List') return [r.data(), r.alt('σ1', 'σ2'), r.list('List(1)', 'l1'), r.list('List(2)', 'l2'), r.freq('Freq(1)', 'f1'), r.freq('Freq(2)', 'f2')];
        return [r.data(), r.alt('σ1', 'σ2'), r.num('sx1', 'sx1', ST2_POS), r.num('n1', 'n1', ST2_COUNT), r.num('sx2', 'sx2', ST2_POS), r.num('n2', 'n2', ST2_COUNT)];
      }, () => {
        const a = st2Sample(app, d, '1'), b = st2Sample(app, d, '2'), q = st2FTest(d.alt, a.sx, a.n, b.sx, b.n);
        return {
          cond: ['σ1', d.alt + 'σ2'],
          rows: [['F', q.F], ['p', q.p], ...(a.list ? [[ST2_XB + '1', a.mean], [ST2_XB + '2', b.mean]] : []), ['sx1', a.sx], ['sx2', b.sx], ['n1', a.n], ['n2', b.n]]
        };
      });
      break;
    default:
      st2Form('ANOVA', () => [r.fixed('How Many', '1'), r.list('Factor A', 'a'), r.list('Dependnt', 'd')], () => {
        const q = st2Anova(app.nums(d.a), app.nums(d.d));
        return { rows: [['A:df', q.dfA], ['A:SS', q.ssA], ['A:MS', q.msA], ['A:F', q.F], ['A:p', q.p], ['ERR:df', q.dfE], ['ERR:SS', q.ssE], ['ERR:MS', q.msE]] };
      });
  }
}
function st2TestMenu(app) {
  const go = (id) => () => st2Test(app, id);
  return [
    mi('Z', [mi('1-SAMPLE', go('z1')), mi('2-SAMPLE', go('z2')), mi('1-PROP', go('zp1')), mi('2-PROP', go('zp2'))]),
    mi('t', [mi('1-SAMPLE', go('t1')), mi('2-SAMPLE', go('t2')), mi('REG', go('treg'))]),
    mi('CHI', [mi('GOF', go('gof')), mi('2WAY', go('chi2'))]),
    mi('F', go('f2')),
    mi('ANOVA', go('anova'))
  ];
}

// ────────── INTR ──────────
function st2Intr(app, id) {
  const d = st2P[id], r = st2Rows(app, d);
  const cl = () => r.num('C-Level', 'c', (v) => v > 0 && v < 100);
  const LR = (q) => [['Left', q.lo], ['Right', q.hi]];
  switch (id) {
    case 'zi1':
      st2Form('1-Sample ZInterval', () => [r.data(), cl(), r.num('σ', 's', ST2_POS), ...st2SrcRows(r, d, false, false)], () => {
        const s = st2Sample(app, d, '');
        return { rows: [...LR(st2ZInt1(d.c, d.s, s.mean, s.n)), [ST2_XB, s.mean], ...(s.list && Number.isFinite(s.sx) ? [['sx', s.sx]] : []), ['n', s.n]] };
      });
      break;
    case 'zi2':
      st2Form('2-Sample ZInterval', () => [r.data(), cl(), r.num('σ1', 's1', ST2_POS), r.num('σ2', 's2', ST2_POS), ...st2SrcRows(r, d, true, false)], () => {
        const a = st2Sample(app, d, '1'), b = st2Sample(app, d, '2');
        return { rows: [...LR(st2ZInt2(d.c, d.s1, d.s2, a.mean, a.n, b.mean, b.n)), [ST2_XB + '1', a.mean], [ST2_XB + '2', b.mean], ...(a.list && Number.isFinite(a.sx) && Number.isFinite(b.sx) ? [['sx1', a.sx], ['sx2', b.sx]] : []), ['n1', a.n], ['n2', b.n]] };
      });
      break;
    case 'zpi1':
      st2Form('1-Prop ZInterval', () => [cl(), r.num('x', 'x', ST2_WHOLE), r.num('n', 'n', ST2_COUNT)], () => {
        const q = st2PropInt1(d.c, d.x, d.n);
        return { rows: [...LR(q), [G.PHAT, q.ph], ['n', d.n]] };
      });
      break;
    case 'zpi2':
      st2Form('2-Prop ZInterval', () => [cl(), r.num('x1', 'x1', ST2_WHOLE), r.num('n1', 'n1', ST2_COUNT), r.num('x2', 'x2', ST2_WHOLE), r.num('n2', 'n2', ST2_COUNT)], () => {
        const q = st2PropInt2(d.c, d.x1, d.n1, d.x2, d.n2);
        return { rows: [...LR(q), [G.PHAT + '1', q.ph1], [G.PHAT + '2', q.ph2], ['n1', d.n1], ['n2', d.n2]] };
      });
      break;
    case 'ti1':
      st2Form('1-Sample tInterval', () => [r.data(), cl(), ...st2SrcRows(r, d, false, true)], () => {
        const s = st2Sample(app, d, '');
        return { rows: [...LR(st2TInt1(d.c, s.mean, s.sx, s.n)), [ST2_XB, s.mean], ['sx', s.sx], ['n', s.n]] };
      });
      break;
    default:
      st2Form('2-Sample tInterval', () => [r.data(), cl(), ...st2SrcRows(r, d, true, true), r.opt('Pooled', 'pooled', ['On', 'Off'])], () => {
        const a = st2Sample(app, d, '1'), b = st2Sample(app, d, '2');
        const q = st2TInt2(d.c, a.mean, a.sx, a.n, b.mean, b.sx, b.n, d.pooled === 'On');
        return { rows: [...LR(q), ['df', q.df], [ST2_XB + '1', a.mean], [ST2_XB + '2', b.mean], ['sx1', a.sx], ['sx2', b.sx], ...(q.sp === null ? [] : [['sp', q.sp]]), ['n1', a.n], ['n2', b.n]] };
      });
  }
}
function st2IntrMenu(app) {
  const go = (id) => () => st2Intr(app, id);
  return [
    mi('Z', [mi('1-SAMPLE', go('zi1')), mi('2-SAMPLE', go('zi2')), mi('1-PROP', go('zpi1')), mi('2-PROP', go('zpi2'))]),
    mi('t', [mi('1-SAMPLE', go('ti1')), mi('2-SAMPLE', go('ti2'))])
  ];
}

// ────────── диаграммы NPPlot, Pie, N-Dist ──────────
const ST2_KIND = { NPPlot: 'npp', Pie: 'pie', 'N-Dist': 'ndist' };
const ST2_PIE = ['Blue', 'Red', 'Green', 'Magenta', 'Cyan', 'Yellow', 'Black'];
const ST2_PIE_C = { x: 100, y: 120, r: 86 };          // круг диаграммы на экране

// Данные диаграммы по настройкам cfg (вызывается из statApp.prep)
function st2Prep(app, cfg) {
  const xs = app.nums(cfg.x);
  if (cfg.type === 'Pie') {
    if (xs.length > 20) fail('Dimension ERROR');
    st2Need(xs.every((v) => v >= 0));
    const sum = xs.reduce((p, q) => p + q, 0);
    st2Need(sum > 0);
    return { cfg, kind: 'pie', xs, fs: null, sum };
  }
  if (cfg.type === 'NPPlot') {
    const s = xs.slice().sort((a, b) => a - b);
    return { cfg, kind: 'npp', xs: s, zs: st2NormScores(s.length), fs: null };
  }
  const fs = app.freq(cfg.f, xs.length), st = stat1(xs, fs, S.q1q3);
  st2Need(st.sdP > 0);
  return { cfg, kind: 'ndist', xs, fs, st };
}
// Круговую диаграмму рисуем одну, без осей и других графиков
const st2PieOnly = (gs) => { const p = gs.find((g) => g.kind === 'pie'); return p ? [p] : gs; };
// Границы для авто-окна. true — вид диаграммы обработан здесь
function st2Win(g, X, Y) {
  if (g.kind === 'npp') { X(g.xs[0], g.xs[g.xs.length - 1]); Y(g.zs[0], g.zs[g.zs.length - 1]); return true; }
  if (g.kind === 'ndist') {
    const { mean, sdP, min, max } = g.st;
    X(Math.min(min, mean - 3 * sdP), Math.max(max, mean + 3 * sdP));
    Y(0, normPdf(0) / sdP);
    return true;
  }
  return g.kind === 'pie';
}
// Сектор номер i: углы от «12 часов» по часовой стрелке
function st2Sector(q, i) {
  let a = 0;
  for (let k = 0; k < i; k++) a += q.xs[k];
  const t0 = -Math.PI / 2 + 2 * Math.PI * a / q.sum, t1 = t0 + 2 * Math.PI * q.xs[i] / q.sum;
  return { t0, t1, mid: (t0 + t1) / 2 };
}
const st2PieText = (q, i) => (q.cfg.disp === 'Data' ? fmtFit(q.xs[i], 7) : fmtFit(Number((q.xs[i] / q.sum * 100).toPrecision(4)), 6) + '%');
// Нарисовать диаграмму. true — вид обработан здесь
function st2Draw(q) {
  if (!ST2_KIND[q.cfg.type]) return false;
  const g = lcd.g, color = COLORS[q.cfg.color] || '#000';
  if (q.kind === 'npp') {
    g.strokeStyle = color; g.fillStyle = color;
    q.xs.forEach((x, i) => {
      const px = X2P(x), py = Y2P(q.zs[i]);
      if (px < -5 || px > LW + 5 || py < GA.top - 5 || py > GA.bottom + 5) return;
      if (q.cfg.mark === 0) { g.lineWidth = 1.3; g.strokeRect(px - 2.5, py - 2.5, 5, 5); }
      else if (q.cfg.mark === 1) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(px - 3, py - 3); g.lineTo(px + 3, py + 3); g.moveTo(px + 3, py - 3); g.lineTo(px - 3, py + 3); g.stroke(); }
      else { g.beginPath(); g.arc(px, py, 1.8, 0, Math.PI * 2); g.fill(); }
    });
    return true;
  }
  if (q.kind === 'ndist') {
    const { mean, sdP } = q.st;
    strokePts(sampleY((x) => normPdf((x - mean) / sdP) / sdP), color, 'Normal');
    return true;
  }
  // круговая: секторы, буквы и список значений справа
  const C = ST2_PIE_C, n = q.xs.length;
  for (let i = 0; i < n; i++) {
    if (!(q.xs[i] > 0)) continue;
    const s = st2Sector(q, i);
    g.beginPath();
    g.moveTo(C.x, C.y);
    g.arc(C.x, C.y, C.r, s.t0, s.t1);
    g.closePath();
    g.globalAlpha = 0.55; g.fillStyle = COLORS[ST2_PIE[i % ST2_PIE.length]]; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#000'; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
  }
  const two = n > 10, lh = two ? 18 : Math.min(18, 184 / n), px = two ? 11.5 : Math.min(14, lh - 2.5);
  for (let i = 0; i < n; i++) {
    const s = st2Sector(q, i), name = String.fromCharCode(65 + i);
    if (q.xs[i] / q.sum > 0.04) lcd.mini(C.x + C.r * 0.64 * Math.cos(s.mid), C.y + C.r * 0.64 * Math.sin(s.mid) - 7, name, { px: 13, align: 'c' });
    const col = two ? Math.floor(i / 10) : 0, row = two ? i % 10 : i;
    const x = 200 + col * 92, y = 28 + row * lh;
    lcd.rect(x, y + 2, px * 0.7, px * 0.7, COLORS[ST2_PIE[i % ST2_PIE.length]]);
    lcd.mini(x + px * 0.95, y, name + ' ' + st2PieText(q, i), { px, max: (two ? 88 : 178) - px });
  }
  return true;
}
// Точка трассировки для NPPlot и Pie (вызывается из statApp.tracePoint)
function st2TracePoint(q, i) {
  if (q.kind === 'npp') return { px: X2P(q.xs[i]), py: Y2P(q.zs[i]), a: 'X=' + fmtFit(q.xs[i], 13), b: 'Y=' + fmtFit(r15(q.zs[i]), 13) };
  const s = st2Sector(q, i), C = ST2_PIE_C;
  return { px: C.x + C.r * 0.4 * Math.cos(s.mid), py: C.y + C.r * 0.4 * Math.sin(s.mid), a: String.fromCharCode(65 + i) + '=' + st2PieText(q, i), b: null };
}

// ────────── строка SUB: подписи списков ──────────
// Знак подписи с клавиши: буквы через ALPHA, цифры — как есть
function st2SubChar(k) {
  if (k.alpha) return k.id === 'DOT' ? ' ' : ALPHA_KEY[k.id] || null;
  return !k.shift && isDigit(k.id) ? k.id : null;
}
// Клавиши строки SUB. true — клавиша обработана здесь
function st2SubKey(app, k) {
  if (!app.sub) {
    if (k.id === 'UP' && !k.shift && !k.alpha && app.row === 0) { app.sub = true; app.subEd = null; return true; }
    return false;
  }
  const ed = app.subEd;
  if (ed) {                             // идёт ввод подписи
    if (k.id === 'EXE') { mem.listSub[app.col] = ed.join('').trim(); app.subEd = null; }
    else if (k.id === 'EXIT' || k.id === 'AC') app.subEd = null;
    else if (k.id === 'DEL') { ed.pop(); if (!ed.length) app.subEd = null; }
    else { const ch = st2SubChar(k); if (ch && ed.length < 8) ed.push(ch); }
    return true;
  }
  if (fIndex(k) >= 0 || k.id === 'EXIT') return false;       // меню работает как обычно
  if (k.shift) return true;
  switch (k.id) {
    case 'DOWN': case 'EXE': app.sub = false; app.row = 0; break;
    case 'LEFT': app.col--; break;
    case 'RIGHT': app.col++; break;
    case 'DEL': mem.listSub[app.col] = ''; break;
    default: { const ch = st2SubChar(k); if (ch) app.subEd = [ch]; }
  }
  return true;
}
// Касание строки SUB. true — выбрана ячейка подписи
function st2SubTap(app, x, y) {
  if (app.scr !== 'list' || app.field) return false;
  if (y >= 48 && y < 72 && x >= ST_X0) {
    app.col = app.left + Math.min(3, Math.floor((x - ST_X0) / ST_CW));
    app.sub = true; app.subEd = null;
    app.fix();
    return true;
  }
  app.sub = false; app.subEd = null;
  return false;
}
// Ячейка подписи списка li, левый край x
function st2SubDraw(app, li, x) {
  const on = !!app.sub && li === app.col, ed = on && app.subEd;
  if (on) lcd.rect(x + 1, 48, ST_CW - 1, 23, ed ? '#fff' : HILITE);
  const txt = ed ? ed.join('') : mem.listSub[li] || '';
  let w = 0;
  if (txt) w = lcd.mini(x + ST_CW / 2, 52, txt, { px: 14, align: 'c', max: ST_CW - 10, bold: false, color: on && !ed ? '#fff' : '#000' });
  if (ed) {
    UI.sawCursor = true;
    if (UI.blink) { const cx = x + ST_CW / 2 + w / 2 + 1.5; lcd.line(cx, 51, cx, 69, '#000', 1.5); }
  }
}
