// ══════ 80-stat.js — режим Statistics: списки, диаграммы, расчёты, регрессии, распределения ══════

// ────────── числовая часть: чистые функции без экрана (проверяются в tests/stat.js) ──────────

const statSum = (a, f) => { let s = 0; for (let i = 0; i < a.length; i++) s += f(a[i], i); return s; };

// «Круглый» шаг не меньше v: 1, 2, 5, 10 × 10^k
function statNice(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 1;
  const e = 10 ** Math.floor(Math.log10(v)), m = v / e;
  return r15((m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e);
}

// Система A·x = b методом Гаусса с выбором главного элемента; null, если вырождена
function statSolve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 1e-300)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
    if (!Number.isFinite(x[r])) return null;
  }
  return x;
}

// Наименьшие квадраты A·c ≈ y отражениями Хаусхолдера (A — массив строк)
function statLsq(A, y) {
  const n = A.length, p = A[0].length;
  if (n < p) fail('Ma ERROR');
  const M = A.map((r, i) => [...r, y[i]]);
  let big = 0;
  for (let k = 0; k < p; k++) {
    let norm = 0;
    for (let i = k; i < n; i++) norm += M[i][k] * M[i][k];
    norm = Math.sqrt(norm);
    big = Math.max(big, norm);
    if (!(norm > 1e-10 * big)) fail('Ma ERROR');        // столбцы зависимы: мало разных точек
    const alpha = M[k][k] > 0 ? -norm : norm;
    const v = new Array(n - k);
    for (let i = k; i < n; i++) v[i - k] = M[i][k];
    v[0] -= alpha;
    let vv = 0;
    for (const t of v) vv += t * t;
    if (vv > 0) {
      for (let j = k; j <= p; j++) {
        let dot = 0;
        for (let i = k; i < n; i++) dot += v[i - k] * M[i][j];
        const f = 2 * dot / vv;
        for (let i = k; i < n; i++) M[i][j] -= f * v[i - k];
      }
    }
  }
  const c = new Array(p).fill(0);
  for (let k = p - 1; k >= 0; k--) {
    let s = M[k][p];
    for (let j = k + 1; j < p; j++) s -= M[k][j] * c[j];
    c[k] = s / M[k][k];
  }
  return c;
}

// Проверка данных двух переменных → {xs, ys, ws, n}; ws — веса (частоты)
function statXY(xs, ys, fs) {
  if (!xs.length || xs.length !== ys.length || (fs && fs.length !== xs.length)) fail('Dimension ERROR');
  const ws = fs ? fs.slice() : xs.map(() => 1);
  if (ws.some((w) => !(w >= 0))) fail('Ma ERROR');
  const n = statSum(ws, (w) => w);
  if (!(n > 0)) fail('Ma ERROR');
  return { xs, ys, ws, n };
}

// Прямая y = k·x + m по наименьшим квадратам (с весами)
function statLin(xs, ys, ws) {
  const n = statSum(ws, (w) => w);
  const mx = statSum(ws, (w, i) => w * xs[i]) / n, my = statSum(ws, (w, i) => w * ys[i]) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxx += ws[i] * dx * dx; sxy += ws[i] * dx * dy; syy += ws[i] * dy * dy;
  }
  if (!(sxx > 0) || !Number.isFinite(sxx)) fail('Ma ERROR');
  const k = sxy / sxx, m = my - k * mx;
  const sse = statSum(ws, (w, i) => w * (ys[i] - (k * xs[i] + m)) ** 2);
  const r = syy > 0 ? Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy))) : NaN;
  return { k, m, r, sse, n };
}

// Многочлен степени deg: коэффициенты от старшего к свободному, SSE и R²
function statPoly(xs, ys, ws, deg) {
  const n = statSum(ws, (w) => w);
  const m = statSum(ws, (w, i) => w * xs[i]) / n;
  const s = Math.sqrt(statSum(ws, (w, i) => w * (xs[i] - m) ** 2) / n) || 1;
  const A = [], y = [];
  for (let i = 0; i < xs.length; i++) {
    if (!(ws[i] > 0)) continue;
    const q = Math.sqrt(ws[i]), t = (xs[i] - m) / s, row = [];
    for (let k = 0, p = 1; k <= deg; k++, p *= t) row.push(q * p);
    A.push(row); y.push(q * ys[i]);
  }
  const ct = statLsq(A, y);            // по степеням t = (x − m)/s
  // обратно к степеням x: ((x − m)/s)^k = Σ C(k, j)·x^j·(−m)^(k−j) / s^k
  const cx = new Array(deg + 1).fill(0);
  for (let k = 0; k <= deg; k++) {
    for (let j = 0; j <= k; j++) cx[j] += ct[k] / s ** k * fComb(k, j) * (-m) ** (k - j);
  }
  const f = (x) => { let v = 0; for (let j = deg; j >= 0; j--) v = v * x + cx[j]; return v; };
  const my = statSum(ws, (w, i) => w * ys[i]) / n;
  const sse = statSum(ws, (w, i) => w * (ys[i] - f(xs[i])) ** 2), sst = statSum(ws, (w, i) => w * (ys[i] - my) ** 2);
  return { c: cx.slice().reverse(), f, sse, r2: sst > 0 ? Math.max(0, 1 - sse / sst) : 1, n };
}

// Подбор параметров методом Левенберга — Марквардта: минимум Σ w·(y − f(x, p))²
function statLM(f, p0, xs, ys, ws) {
  const m = p0.length;
  const sse = (q) => { let s = 0; for (let i = 0; i < xs.length; i++) { const r = ys[i] - f(xs[i], q); s += ws[i] * r * r; } return s; };
  let p = p0.slice(), cur = sse(p), lam = 1e-3;
  if (!Number.isFinite(cur)) return null;
  for (let it = 0; it < 400; it++) {
    const JTJ = Array.from({ length: m }, () => new Array(m).fill(0)), JTr = new Array(m).fill(0);
    for (let i = 0; i < xs.length; i++) {
      if (!(ws[i] > 0)) continue;
      const r = ys[i] - f(xs[i], p), g = new Array(m);
      for (let k = 0; k < m; k++) {
        const h = 1e-6 * Math.max(1e-4, Math.abs(p[k]));
        const a = p.slice(), b = p.slice();
        a[k] += h; b[k] -= h;
        g[k] = (f(xs[i], a) - f(xs[i], b)) / (2 * h);
      }
      for (let k = 0; k < m; k++) {
        JTr[k] += ws[i] * g[k] * r;
        for (let j = 0; j < m; j++) JTJ[k][j] += ws[i] * g[k] * g[j];
      }
    }
    let better = false, rel = 0;
    for (let tries = 0; tries < 14 && !better; tries++) {
      const A = JTJ.map((row, k) => row.map((v, j) => (j === k ? v * (1 + lam) + 1e-300 : v)));
      const d = statSolve(A, JTr);
      const q = d ? p.map((v, k) => v + d[k]) : null;
      const s2 = q ? sse(q) : NaN;
      if (Number.isFinite(s2) && s2 < cur) { rel = (cur - s2) / (cur || 1); p = q; cur = s2; lam = Math.max(lam / 5, 1e-12); better = true; }
      else lam *= 10;
    }
    if (!better || rel < 1e-15) break;
  }
  return { p, sse: cur };
}

// Число → знаки формулы (модуль, до 15 значащих цифр)
function statNumToks(v) {
  const s = String(Math.abs(Number(v.toPrecision(15))));
  const k = s.indexOf('e');
  if (k < 0) return [...s];
  const e = Number(s.slice(k + 1));
  return [...s.slice(0, k), G.EE, ...(e < 0 ? [G.NEG] : []), ...String(Math.abs(e))];
}
const statT1 = (v) => [...(v < 0 ? [G.NEG] : []), ...statNumToks(v)];   // первое слагаемое
const statTn = (v) => [v < 0 ? '−' : '+', ...statNumToks(v)];            // следующие слагаемые

// Регрессия вида kind → {title, rows: [[имя, значение]…], formula, f, toks}
//   toks — формула знаками калькулятора (для COPY в список функций)
function statReg(kind, xs0, ys0, fs) {
  const { xs, ys, ws, n } = statXY(xs0, ys0, fs);
  const mse = (sse, p) => (n - p > 0 ? sse / (n - p) : 0);
  const pos = (a) => { if (a.some((v, i) => ws[i] > 0 && !(v > 0))) fail('Ma ERROR'); };
  const R2 = 'r' + G.SQ;
  switch (kind) {
    case 'lin': case 'lin2': {
      const q = statLin(xs, ys, ws), ab = kind === 'lin';
      return {
        title: ab ? 'LinearReg(ax+b)' : 'LinearReg(a+bx)', formula: ab ? 'y=ax+b' : 'y=a+bx',
        rows: [['a', ab ? q.k : q.m], ['b', ab ? q.m : q.k], ['r', q.r], [R2, q.r * q.r], ['MSe', mse(q.sse, 2)]],
        f: (x) => q.k * x + q.m,
        toks: ab ? [...statT1(q.k), 'x', ...statTn(q.m)] : [...statT1(q.m), ...statTn(q.k), 'x']
      };
    }
    case 'med': {
      // прямая по трём медианам; частоты учитываются, если они целые
      const pts = [];
      xs.forEach((x, i) => { const c = Number.isInteger(ws[i]) ? ws[i] : 1; for (let j = 0; j < c; j++) pts.push([x, ys[i]]); });
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const m = pts.length;
      if (m < 3) fail('Ma ERROR');
      let n1 = Math.floor(m / 3), n2 = n1;
      if (m % 3 === 1) n2++; else if (m % 3 === 2) n1++;
      const med = (a) => { const s = a.slice().sort((p, q) => p - q), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
      const grp = [pts.slice(0, n1), pts.slice(n1, n1 + n2), pts.slice(n1 + n2)];
      const mx = grp.map((gq) => med(gq.map((p) => p[0]))), my = grp.map((gq) => med(gq.map((p) => p[1])));
      if (mx[2] === mx[0]) fail('Ma ERROR');
      const a = (my[2] - my[0]) / (mx[2] - mx[0]), b = (my[0] + my[1] + my[2] - a * (mx[0] + mx[1] + mx[2])) / 3;
      return { title: 'Med-MedLine', formula: 'y=ax+b', rows: [['a', a], ['b', b]], f: (x) => a * x + b, toks: [...statT1(a), 'x', ...statTn(b)] };
    }
    case 'quad': case 'cubic': case 'quart': {
      const deg = kind === 'quad' ? 2 : kind === 'cubic' ? 3 : 4;
      const q = statPoly(xs, ys, ws, deg), names = ['a', 'b', 'c', 'd', 'e'];
      const toks = [];
      q.c.forEach((v, i) => {
        const pw = deg - i;
        toks.push(...(i ? statTn(v) : statT1(v)));
        if (pw >= 1) toks.push('x');
        if (pw === 2) toks.push(G.SQ); else if (pw > 2) toks.push('^', String(pw));
      });
      return {
        title: ['QuadReg', 'CubicReg', 'QuartReg'][deg - 2],
        formula: ['y=ax' + G.SQ + '+bx+c', 'y=ax^3+bx' + G.SQ + '+cx+d', 'y=ax^4+bx^3+cx' + G.SQ + '+dx+e'][deg - 2],
        rows: [...q.c.map((v, i) => [names[i], v]), [R2, q.r2], ['MSe', mse(q.sse, deg + 1)]],
        f: q.f, toks
      };
    }
    case 'log': {
      pos(xs);
      const q = statLin(xs.map((x) => (x > 0 ? Math.log(x) : 0)), ys, ws);
      return {
        title: 'LogReg', formula: 'y=a+b·ln(x)',
        rows: [['a', q.m], ['b', q.k], ['r', q.r], [R2, q.r * q.r], ['MSe', mse(q.sse, 2)]],
        f: (x) => (x > 0 ? q.m + q.k * Math.log(x) : NaN),
        toks: [...statT1(q.m), ...statTn(q.k), 'ln ', 'x']
      };
    }
    case 'exp': case 'abx': {
      pos(ys);
      const q = statLin(xs, ys.map((y) => (y > 0 ? Math.log(y) : 0)), ws), a = Math.exp(q.m), e = kind === 'exp';
      const b = e ? q.k : Math.exp(q.k);
      return {
        title: e ? 'ExpReg(a·e^bx)' : 'ExpReg(a·b^x)', formula: e ? 'y=a·e^(bx)' : 'y=a·b^x',
        rows: [['a', a], ['b', b], ['r', q.r], [R2, q.r * q.r], ['MSe', mse(q.sse, 2)]],
        f: (x) => a * Math.exp(q.k * x),
        toks: e ? [...statT1(a), 'e^', '(', ...statT1(b), 'x', ')'] : [...statT1(a), '×', ...statNumToks(b), '^', 'x']
      };
    }
    case 'pow': {
      pos(xs); pos(ys);
      const q = statLin(xs.map((x) => (x > 0 ? Math.log(x) : 0)), ys.map((y) => (y > 0 ? Math.log(y) : 0)), ws), a = Math.exp(q.m);
      return {
        title: 'PowerReg', formula: 'y=a·x^b',
        rows: [['a', a], ['b', q.k], ['r', q.r], [R2, q.r * q.r], ['MSe', mse(q.sse, 2)]],
        f: (x) => (x > 0 ? a * x ** q.k : NaN),
        toks: [...statT1(a), 'x', '^', '(', ...statT1(q.k), ')']
      };
    }
    case 'sin': {
      // y = a·sin(bx + c) + d, угол в радианах
      const ux = [...new Set(xs.filter((_, i) => ws[i] > 0))].sort((p, q) => p - q);
      if (ux.length < 4) fail('Ma ERROR');
      const range = ux[ux.length - 1] - ux[0];
      let step = Infinity;
      for (let i = 1; i < ux.length; i++) step = Math.min(step, ux[i] - ux[i - 1]);
      const sq = ws.map(Math.sqrt);
      const tryB = (b) => {
        const c = statLsq(xs.map((x, i) => [sq[i] * Math.sin(b * x), sq[i] * Math.cos(b * x), sq[i]]), ys.map((y, i) => sq[i] * y));
        return { c, sse: statSum(ws, (w, i) => w * (ys[i] - (c[0] * Math.sin(b * xs[i]) + c[1] * Math.cos(b * xs[i]) + c[2])) ** 2) };
      };
      // перебор частоты от четверти периода на всём отрезке до предела различимости по шагу данных
      const bLo = Math.PI / (2 * range), bHi = Math.PI / step * 0.98;
      const N = Math.max(200, Math.min(3000, Math.round(8 * range / step)));
      let best = null;
      for (let j = 0; j <= N; j++) {
        const b = bLo + (bHi - bLo) * j / N;
        let t;
        try { t = tryB(b); } catch (err) { if (err instanceof CalcError) continue; throw err; }
        if (!best || t.sse < best.sse * (1 - 1e-9)) best = { b, c: t.c, sse: t.sse };
      }
      if (!best) fail('Ma ERROR');
      const model = (x, p) => p[0] * Math.sin(p[1] * x + p[2]) + p[3];
      const p0 = [Math.hypot(best.c[0], best.c[1]), best.b, Math.atan2(best.c[1], best.c[0]), best.c[2]];
      const fit = statLM(model, p0, xs, ys, ws) || { p: p0, sse: best.sse };
      let [a, b, c, d] = fit.p;
      if (b < 0) { b = -b; c = Math.PI - c; }
      if (a < 0) { a = -a; c += Math.PI; }
      c -= 2 * Math.PI * Math.round(c / (2 * Math.PI));
      if (Math.abs(c) < 1e-12) c = 0;
      return {
        title: 'SinReg', formula: 'y=a·sin(bx+c)+d',
        rows: [['a', a], ['b', b], ['c', c], ['d', d], ['MSe', mse(fit.sse, 2)]],
        f: (x) => a * Math.sin(b * x + c) + d,
        toks: [...statT1(a), 'sin ', '(', ...statT1(b), 'x', ...statTn(c), ')', ...statTn(d)],
        // расчёт идёт в радианах; с пометкой «r» формула верна и при Deg/Gra
        toksAny: [...statT1(a), 'sin ', '(', '(', ...statT1(b), 'x', ...statTn(c), ')', G.RAD, ')', ...statTn(d)]
      };
    }
    case 'logistic': {
      // y = c/(1 + a·e^(−bx))
      pos(ys);
      const ymax = Math.max(...ys.filter((_, i) => ws[i] > 0));
      const model = (x, p) => p[2] / (1 + p[0] * Math.exp(-p[1] * x));
      let best = null;
      for (const mul of [1.01, 1.05, 1.2, 1.5, 2, 5]) {
        const c0 = ymax * mul;
        let q;
        try { q = statLin(xs, ys.map((y) => Math.log(c0 / y - 1)), ws); } catch (err) { if (err instanceof CalcError) continue; throw err; }
        const fit = statLM(model, [Math.exp(q.m), -q.k, c0], xs, ys, ws);
        if (fit && fit.p.every(Number.isFinite) && (!best || fit.sse < best.sse)) best = fit;
      }
      if (!best) fail('Ma ERROR');
      const [a, b, c] = best.p;
      return {
        title: 'LogisticReg', formula: 'y=c/(1+a·e^(-bx))',
        rows: [['a', a], ['b', b], ['c', c], ['MSe', mse(best.sse, 2)]],
        f: (x) => c / (1 + a * Math.exp(-b * x)),
        toks: [...statT1(c), '÷', '(', '1', ...statTn(a), 'e^', '(', ...statT1(-b), 'x', ')', ')']
      };
    }
    default: return fail('Syntax ERROR');
  }
}

// Одна переменная: mode — как считать квартили ('Std' | 'OnData')
function stat1(xs, fs, mode) {
  if (!xs.length || (fs && fs.length !== xs.length)) fail('Dimension ERROR');
  if (fs && fs.some((f) => !(f >= 0))) fail('Ma ERROR');
  const map = new Map();               // значение → частота
  xs.forEach((x, i) => { const f = fs ? fs[i] : 1; if (f > 0) map.set(x, (map.get(x) || 0) + f); });
  const pr = [...map.entries()].sort((a, b) => a[0] - b[0]);
  const n = statSum(pr, (p) => p[1]);
  if (!(n > 0)) fail('Ma ERROR');
  const sum = statSum(pr, (p) => p[0] * p[1]), sum2 = statSum(pr, (p) => p[0] * p[0] * p[1]), mean = sum / n;
  const dev = statSum(pr, (p) => p[1] * (p[0] - mean) ** 2);
  const last = pr[pr.length - 1][0];
  // k-й по порядку элемент (счёт с 1) с учётом частот
  const at = (k) => { let c = 0; for (const [x, f] of pr) { c += f; if (k <= c + 1e-9) return x; } return last; };
  const med = (lo, hi) => { const m = hi - lo + 1; return m % 2 ? at(lo + (m - 1) / 2) : (at(lo + m / 2 - 1) + at(lo + m / 2)) / 2; };
  // элемент, на котором накопленная доля впервые достигает q
  const ratio = (q) => { let c = 0; for (const [x, f] of pr) { c += f; if (c / n >= q - 1e-12) return x; } return last; };
  let q1, md, q3;
  if (Number.isInteger(n)) {
    md = med(1, n);
    if (mode === 'OnData') { q1 = ratio(0.25); q3 = ratio(0.75); }
    else if (n === 1) { q1 = md; q3 = md; }
    else { const h = Math.floor(n / 2); q1 = med(1, h); q3 = med(n - h + 1, n); }
  } else { md = ratio(0.5); q1 = ratio(0.25); q3 = ratio(0.75); }
  let maxF = 0;
  for (const p of pr) if (p[1] > maxF) maxF = p[1];
  const modes = pr.filter((p) => p[1] === maxF).map((p) => p[0]);
  return {
    n, mean, sum, sum2, sdP: Math.sqrt(dev / n), sdS: n > 1 ? Math.sqrt(dev / (n - 1)) : NaN,
    min: pr[0][0], max: last, q1, med: md, q3, mode: modes[0], modes, modeN: modes.length, modeF: maxF
  };
}

// Две переменные
function stat2(xs0, ys0, fs) {
  const { xs, ys, ws, n } = statXY(xs0, ys0, fs);
  const sm = (f) => statSum(ws, (w, i) => w * f(xs[i], ys[i]));
  const sx = sm((x) => x), sy = sm((x, y) => y), mx = sx / n, my = sy / n;
  const dx = sm((x) => (x - mx) ** 2), dy = sm((x, y) => (y - my) ** 2);
  const used = (a) => a.filter((_, i) => ws[i] > 0);
  return {
    n, meanX: mx, sumX: sx, sumX2: sm((x) => x * x), sdPX: Math.sqrt(dx / n), sdSX: n > 1 ? Math.sqrt(dx / (n - 1)) : NaN,
    meanY: my, sumY: sy, sumY2: sm((x, y) => y * y), sdPY: Math.sqrt(dy / n), sdSY: n > 1 ? Math.sqrt(dy / (n - 1)) : NaN,
    sumXY: sm((x, y) => x * y),
    minX: Math.min(...used(xs)), maxX: Math.max(...used(xs)), minY: Math.min(...used(ys)), maxY: Math.max(...used(ys))
  };
}

// Столбцы гистограммы: интервалы [start + k·width, start + (k+1)·width)
function statBins(xs, fs, start, width) {
  if (!(width > 0) || !Number.isFinite(start)) fail('Ma ERROR');
  let hi = -Infinity;
  xs.forEach((x, i) => { if ((fs ? fs[i] : 1) > 0 && x > hi) hi = x; });
  const nb = Math.floor((hi - start) / width + 1e-9) + 1;
  if (!(nb >= 1) || nb > 400) fail('Ma ERROR');
  const c = new Array(nb).fill(0);
  xs.forEach((x, i) => { const k = Math.floor((x - start) / width + 1e-9); if (k >= 0 && k < nb) c[k] += fs ? fs[i] : 1; });
  return c;
}
// Начало и ширина интервала по умолчанию
function statBinsDefault(xs) {
  const lo = Math.min(...xs), hi = Math.max(...xs);
  if (xs.every(Number.isInteger) && hi - lo <= 30) return { start: lo, width: 1 };
  const k = Math.max(5, Math.ceil(Math.log2(xs.length)) + 1);
  return { start: lo, width: statNice((hi - lo) / k) };
}

// ────────── общие экраны режима ──────────

// Вопрос с вводом целого числа (номер списка и т. п.)
function statAsk(lines, lo, hi, onDone) {
  const field = new NumField();
  pushModal({
    lock: true,
    key(k) {
      field.key(k, (x) => {
        if (!Number.isInteger(x.v) || x.v < lo || x.v > hi) fail('Argument ERROR');
        popModal();
        onDone(x.v);
      }, () => popModal());
    },
    draw() {
      const w = Math.min(LW - 8, Math.max(300, 28 + 18 * Math.max(...lines.map((l) => [...l].length)))), h = lines.length * 24 + 20;
      const x = (LW - w) / 2, y = 26 + (166 - h) / 2;
      lcd.rect(x + 3, y + 3, w, h, 'rgba(0,0,0,.25)');
      lcd.rect(x, y, w, h, '#fff');
      lcd.frame(x, y, w, h, '#000', 2);
      lines.forEach((s, i) => lcd.text(x + 12, y + 10 + i * 24, s));
      const n = [...lines[lines.length - 1]].length;
      field.draw(x + 14 + n * 18, y + 22 + (lines.length - 1) * 24, w - 28 - n * 18);
    }
  });
}

// Экран настроек или параметров. o: {title, col, indent, rows: () => строки, onDone, onExit}
//   строка: {label, value, menu: [{l, fn}…] (F1–F6), num: (v) => … (ввод числа), exec: () => …}
function statForm(o) {
  const scr = {
    sel: o.sel || 0, top: 0, field: null, page: 0,
    // Пункты F1–F6 строки; больше шести — листаются по пять клавишей F6 (▷)
    view(row) {
      const m = row.menu || [];
      if (m.length <= 6) return m;
      const pages = Math.ceil(m.length / 5);
      if (this.page >= pages) this.page = 0;
      const v = m.slice(this.page * 5, this.page * 5 + 5);
      while (v.length < 5) v.push(null);
      v.push({ l: '▷', fn: () => { this.page = (this.page + 1) % pages; } });
      return v;
    },
    fix(n) {
      this.sel = Math.max(0, Math.min(n - 1, this.sel));
      const vis = o.title ? 6 : 7;
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + vis - 1) this.top = this.sel - vis + 1;
    },
    key(k) {
      let rows = o.rows();
      this.fix(rows.length);
      const row = rows[this.sel];
      if (this.field) {
        this.field.key(k, (x) => { row.num(x.v); this.field = null; if (this.sel + 1 < o.rows().length) this.sel++; }, () => { this.field = null; });
        return;
      }
      const f = fIndex(k);
      if (f >= 0) {
        const it = !k.shift && this.view(row)[f];
        if (it) it.fn();
      } else if (k.id === 'UP') { this.sel = (this.sel + rows.length - 1) % rows.length; this.page = 0; }
      else if (k.id === 'DOWN') { this.sel = (this.sel + 1) % rows.length; this.page = 0; }
      else if (k.id === 'EXE') {
        if (row.exec) row.exec();
        else if (this.sel + 1 < rows.length) this.sel++;
        else if (o.onDone) o.onDone();
      } else if (k.id === 'EXIT') { popModal(); if (o.onExit) o.onExit(); return; }
      else if (row.num && startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
      rows = o.rows();
      this.fix(rows.length);
    },
    draw() {
      const rows = o.rows(), col = o.col || 11, x0 = o.indent ? 18 : 0;
      this.fix(rows.length);
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      let y0 = 24, vis = 7;
      if (o.title) { lcd.text(0, 24, o.title); y0 = 48; vis = 6; }
      for (let r = 0; r < vis; r++) {
        const i = this.top + r;
        if (i >= rows.length) break;
        const row = rows[i], y = y0 + r * 24, on = i === this.sel, edit = on && this.field;
        if (on && !edit) lcd.rect(0, y, LW, 24, HILITE);
        const ink = on && !edit ? '#fff' : '#000';
        lcd.text(x0, y, row.label, { color: ink });
        if (row.value === undefined) continue;
        lcd.text(col * 18, y, ':', { color: ink });
        if (edit) this.field.draw((col + 1) * 18, y + 12, LW - (col + 1) * 18 - 4);
        else lcd.text((col + 1) * 18, y, row.value, { color: ink });
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, y0 + 10, 12, '#000');
      if (this.top + vis < rows.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu(this.view(rows[this.sel]).map((it) => it && { l: it.l, k: 'cmd' }));
    }
  };
  pushModal(scr);
  return scr;
}

// Экран результатов: rows — [имя, число] или [строка]; menu — до 6 пунктов {l, fn}
function statReport(title, rows, menu, onExit) {
  const fmt = (v) => (typeof v === 'string' ? v : Number.isFinite(v) ? fmtNum(v) : '');
  const wide = Math.max(1, ...rows.filter((r) => r.length > 1).map((r) => [...r[0]].length));
  pushModal({
    top: 0,
    key(k) {
      const f = fIndex(k);
      if (f >= 0) { if (!k.shift && menu && menu[f]) menu[f].fn(); return; }
      if (k.id === 'UP') this.top = Math.max(0, this.top - 1);
      else if (k.id === 'DOWN') this.top = Math.min(Math.max(0, rows.length - 6), this.top + 1);
      else if (k.id === 'EXIT' || k.id === 'AC') { popModal(); if (onExit) onExit(); }
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, title);
      for (let r = 0; r < 6; r++) {
        const row = rows[this.top + r];
        if (!row) break;
        const y = 48 + r * 24;
        lcd.text(18, y, row[0]);
        if (row.length > 1) lcd.text(18 + wide * 18, y, '=' + fmt(row[1]));
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, 58, 12, '#000');
      if (this.top + 6 < rows.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu((menu || []).map((it) => it && { l: it.l, k: 'cmd' }));
    }
  });
}

// ────────── режим ──────────

const SG_TYPES = ['Scatter', 'xyLine', 'Hist', 'MedBox', 'Bar', 'Broken'];
const SG_MARKS = ['□', '×', '•'];
const SG_TWO = (t) => t === 'Scatter' || t === 'xyLine';      // диаграммы двух переменных
const newStatGraph = (i) => ({ on: i === 0, type: 'Scatter', x: 1, y: 2, f: 0, mark: 0, color: ['Blue', 'Red', 'Green'][i] });
const ST_X0 = 42, ST_CW = 85.5;        // редактор списков: ширина левой колонки и столбца
const statListName = (n) => 'List' + n;
const statFreqName = (f) => (f ? 'List' + f : '1');

const statApp = {
  col: 0, row: 0, left: 0, top: 0, field: null, base: null, menu: null,
  sg: [newStatGraph(0), newStatGraph(1), newStatGraph(2)],
  cs: { x1: 1, f1: 0, x2: 1, y2: 2, f2: 0 },                 // CALC → SET
  dist: {
    npd: { x: 0, s: 1, m: 0 }, ncd: { lo: 0, hi: 0, s: 1, m: 0 }, invn: { tail: 'Left', area: 0, s: 1, m: 0 },
    bpd: { x: 0, n: 0, p: 0 }, bcd: { lo: 0, hi: 0, n: 0, p: 0 }, ppd: { x: 0, mu: 0 }, pcd: { lo: 0, hi: 0, mu: 0 }
  },
  scr: 'list', gr: null,

  enter() {
    this.base = new FMenu(this.listMenu());
    this.menu = this.base;
    this.scr = 'list';
    this.field = null;
    this.fix();
  },
  setup() { return ['statWind', 'graphFunc', 'angle', 'coord', 'grid', 'axes', 'label', 'disp', 'q1q3']; },
  onSetup() { if (this.scr === 'graph' && S.statWind === 'Auto') this.autoWin(); },

  // ---------- данные ----------
  list(i) { return mem.lists[i] || (mem.lists[i] = []); },
  // Список номер n числами; пустой — ошибка
  nums(n) {
    const a = mem.lists[n - 1];
    if (!a || !a.length) fail('Dimension ERROR');
    return a.map((x) => x.v);
  },
  freq(f, len) {
    if (!f) return null;
    const a = this.nums(f);
    if (a.length !== len) fail('Dimension ERROR');
    return a;
  },

  // ---------- редактор списков ----------
  fix() {
    this.col = Math.max(0, Math.min(25, this.col));
    this.row = Math.max(0, Math.min(Math.min(998, this.list(this.col).length), this.row));
    if (this.col < this.left) this.left = this.col;
    if (this.col > this.left + 3) this.left = this.col - 3;
    if (this.row < this.top) this.top = this.row;
    if (this.row > this.top + 3) this.top = this.row - 3;
  },
  listMenu() {
    return [
      mi('GRAPH', [
        mi('GRAPH1', () => this.showGraph([0])), mi('GRAPH2', () => this.showGraph([1])), mi('GRAPH3', () => this.showGraph([2])),
        mi('SELECT', () => this.selectScreen()), null, mi('SET', () => this.graphSet())
      ]),
      mi('CALC', [
        mi('1-VAR', () => this.show1(this.nums(this.cs.x1), this.freq(this.cs.f1, this.nums(this.cs.x1).length))),
        mi('2-VAR', () => this.show2()),
        mi('REG', this.regMenu((kind) => {
          const xs = this.nums(this.cs.x2), ys = this.nums(this.cs.y2);
          if (xs.length !== ys.length) fail('Dimension ERROR');
          this.regShow(kind, xs, ys, this.freq(this.cs.f2, xs.length), null);
        })),
        null, null, mi('SET', () => this.calcSet())
      ]),
      null, null,
      mi('DIST', [
        mi('NORM', [mi('Npd', () => this.distForm('npd')), mi('Ncd', () => this.distForm('ncd')), mi('InvN', () => this.distForm('invn'))]),
        null, null, null,
        mi('BINOMIAL', [mi('Bpd', () => this.distForm('bpd')), mi('Bcd', () => this.distForm('bcd'))]),
        mi('POISSON', [mi('Ppd', () => this.distForm('ppd')), mi('Pcd', () => this.distForm('pcd'))]),
        null
      ]),
      mi('TOOL', [
        mi('SORTASC', () => this.sortFlow(1)), mi('SORTDES', () => this.sortFlow(-1)),
        mi('TOP', () => { this.row = 0; this.fix(); }), mi('BOTTOM', () => { this.row = Math.max(0, this.list(this.col).length - 1); this.fix(); })
      ]),
      mi('EDIT', () => this.editCell()),
      mi('DELETE', () => this.delCell()),
      mi('DEL-ALL', () => { if (this.list(this.col).length) confirmBox(['Delete All?', ''], () => { mem.lists[this.col] = []; this.row = 0; this.fix(); }); }),
      mi('INSERT', () => { const a = this.list(this.col); if (a.length < 999) a.splice(this.row, 0, RI(0)); })
    ];
  },
  regMenu(run) {
    return [
      mi('X', [mi('ax+b', () => run('lin')), mi('a+bx', () => run('lin2'))]),
      mi('Med', () => run('med')), mi('X' + G.SQ, () => run('quad')), mi('X^3', () => run('cubic')), mi('X^4', () => run('quart')),
      mi('Log', () => run('log')), mi('Exp', [mi('ae^bx', () => run('exp')), mi('ab^x', () => run('abx'))]),
      mi('Power', () => run('pow')), mi('Sin', () => run('sin')), mi('Logistic', () => run('logistic'))
    ];
  },
  // Число → знаки для правки значения ячейки
  valToks(v) { return [...(v < 0 ? [G.NEG] : []), ...statNumToks(v)]; },
  editCell() {
    const a = this.list(this.col);
    if (this.row >= a.length) return;
    this.field = new NumField();
    this.field.ed.set(this.valToks(a[this.row].v));
  },
  delCell() {
    const a = this.list(this.col);
    if (this.row < a.length) a.splice(this.row, 1);
    this.fix();
  },
  store(x) {
    const a = this.list(this.col);
    if (this.row >= 999) fail('Memory ERROR');
    a[Math.min(this.row, a.length)] = x;
    this.field = null;
    this.row++;
    this.fix();
  },
  sortFlow(dir) {
    statAsk(['How Many Lists?:'], 1, 6, (h) => {
      const picks = [];
      const next = () => {
        if (picks.length < h) { statAsk([picks.length ? 'Select Second List' : 'Select List', 'List No:'], 1, 26, (n) => { picks.push(n); next(); }); return; }
        const ls = picks.map((n) => mem.lists[n - 1] || []);
        if (!ls[0].length || ls.some((l) => l.length !== ls[0].length)) fail('Dimension ERROR');
        const ord = ls[0].map((_, i) => i).sort((p, q) => dir * (ls[0][p].v - ls[0][q].v) || p - q);
        picks.forEach((n, k) => { mem.lists[n - 1] = ord.map((i) => ls[k][i]); });
        this.fix();
      };
      next();
    });
  },

  key(k) {
    if (this.scr === 'graph') { this.gkey(k); return; }
    if (this.field) {
      if (k.id === 'AC') this.field = null;          // AC отменяет ввод целиком
      else this.field.key(k, (x) => this.store(x), () => { this.field = null; });
      return;
    }
    const f = fIndex(k);
    if (f >= 0) {
      if (k.shift) return;
      const it = this.menu.press(f);
      if (it && it.fn) it.fn();
      return;
    }
    switch (k.id) {
      case 'LEFT': this.col--; break;
      case 'RIGHT': this.col++; break;
      case 'UP': this.row--; break;
      case 'DOWN': case 'EXE': this.row++; break;
      case 'DEL': this.delCell(); break;
      case 'EXIT': this.menu.back(); break;
      default:
        if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    }
    this.fix();
  },
  tap(x, y) {
    if (this.scr !== 'list' || this.field || y < 72 || y >= 168 || x < ST_X0) return;
    this.col = this.left + Math.min(3, Math.floor((x - ST_X0) / ST_CW));
    this.row = this.top + Math.floor((y - 72) / 24);
    this.fix();
  },

  drawList() {
    statusBar(stdTags());
    this.fix();
    for (let r = 0; r < 6; r++) lcd.line(0, 47.5 + r * 24, LW, 47.5 + r * 24, '#555', 1);
    for (let c = 0; c < 4; c++) lcd.line(Math.round(ST_X0 + c * ST_CW) + 0.5, 24, Math.round(ST_X0 + c * ST_CW) + 0.5, 168, '#555', 1);
    lcd.mini(ST_X0 - 5, 53, 'SUB', { px: 13, align: 'r' });
    for (let r = 0; r < 4; r++) lcd.mini(ST_X0 - 5, 76 + r * 24, String(this.top + r + 1), { px: 15, align: 'r', max: ST_X0 - 8 });
    for (let c = 0; c < 4; c++) {
      const li = this.left + c, x = Math.round(ST_X0 + c * ST_CW), a = mem.lists[li] || [];
      lcd.mini(x + ST_CW / 2, 28, 'List ' + (li + 1), { px: 15, align: 'c' });
      if (mem.listSub[li]) lcd.mini(x + ST_CW / 2, 52, mem.listSub[li], { px: 14, align: 'c', max: ST_CW - 8, bold: false });
      for (let r = 0; r < 4; r++) {
        const i = this.top + r, y = 72 + r * 24, on = li === this.col && i === this.row;
        if (on) lcd.rect(x + 1, y, ST_CW - 1, 23, HILITE);
        if (i < a.length) lcd.mini(x + ST_CW - 5, y + 4, fmtFit(a[i].v, 8), { px: 15, align: 'r', max: ST_CW - 9, color: on ? '#fff' : '#000' });
      }
    }
    if (this.field) this.field.draw(2, 180, LW - 4);
    else {
      const a = this.list(this.col);
      if (this.row < a.length) { const s = fmtNum(a[this.row].v); lcd.text(LW - 4 - [...s].length * 18, 168, s); }
    }
    lcd.fmenu(this.menu.labels());
  },
  draw() {
    if (this.scr === 'graph') this.drawGraph(); else this.drawList();
  },

  // ---------- настройки диаграмм ----------
  pickList(set) { statAsk(['Select List', 'List No:'], 1, 26, set); },
  graphSet() {
    let cur = 0;
    const types = [...SG_TYPES.slice(0, 2), null, null, null, ...SG_TYPES.slice(2, 5), null, null, SG_TYPES[5]];
    statForm({
      rows: () => {
        const g = this.sg[cur];
        const rows = [
          { label: 'StatGraph' + (cur + 1), menu: [0, 1, 2].map((i) => ({ l: 'GRAPH' + (i + 1), fn: () => { cur = i; } })) },
          { label: 'Graph Type', value: g.type, menu: types.map((t) => t && { l: t, fn: () => { g.type = t; } }) },
          { label: 'XList', value: statListName(g.x), menu: [{ l: 'LIST', fn: () => this.pickList((n) => { g.x = n; }) }] }
        ];
        if (SG_TWO(g.type)) rows.push({ label: 'YList', value: statListName(g.y), menu: [{ l: 'LIST', fn: () => this.pickList((n) => { g.y = n; }) }] });
        if (g.type !== 'Bar') rows.push({ label: 'Frequency', value: statFreqName(g.f), menu: [{ l: '1', fn: () => { g.f = 0; } }, { l: 'LIST', fn: () => this.pickList((n) => { g.f = n; }) }] });
        if (SG_TWO(g.type)) rows.push({ label: 'Mark Type', value: SG_MARKS[g.mark], menu: SG_MARKS.map((m, i) => ({ l: m, fn: () => { g.mark = i; } })) });
        rows.push({ label: 'Color', value: g.color, menu: COLOR_NAMES.map((c) => ({ l: c, fn: () => { g.color = c; } })) });
        return rows;
      }
    });
  },
  selectScreen() {
    let sel = 0;
    pushModal({
      key: (k) => {
        const f = fIndex(k);
        if (f === 0 && !k.shift) this.sg[sel].on = true;
        else if (f === 1 && !k.shift) this.sg[sel].on = false;
        else if (f === 5 && !k.shift) {
          const on = [0, 1, 2].filter((i) => this.sg[i].on);
          popModal();
          if (on.length) this.showGraph(on);
        } else if (k.id === 'UP') sel = (sel + 2) % 3;
        else if (k.id === 'DOWN') sel = (sel + 1) % 3;
        else if (k.id === 'EXIT') popModal();
      },
      draw: () => {
        lcd.rect(0, 23, LW, LH - 23, '#fff');
        for (let i = 0; i < 3; i++) {
          const y = 24 + i * 24, on = i === sel;
          if (on) lcd.rect(0, y, LW, 24, HILITE);
          lcd.text(0, y, 'StatGraph' + (i + 1), { color: on ? '#fff' : '#000' });
          lcd.text(11 * 18, y, ':' + (this.sg[i].on ? 'DrawOn' : 'DrawOff'), { color: on ? '#fff' : '#000' });
        }
        lcd.fmenu([{ l: 'On', k: 'cmd' }, { l: 'Off', k: 'cmd' }, null, null, null, { l: 'DRAW', k: 'cmd' }]);
      }
    });
  },
  calcSet() {
    const c = this.cs;
    const lst = (label, key) => ({ label, value: statListName(c[key]), menu: [{ l: 'LIST', fn: () => this.pickList((n) => { c[key] = n; }) }] });
    const frq = (label, key) => ({ label, value: statFreqName(c[key]), menu: [{ l: '1', fn: () => { c[key] = 0; } }, { l: 'LIST', fn: () => this.pickList((n) => { c[key] = n; }) }] });
    statForm({ rows: () => [lst('1Var XList', 'x1'), frq('1Var Freq', 'f1'), lst('2Var XList', 'x2'), lst('2Var YList', 'y2'), frq('2Var Freq', 'f2')] });
  },

  // ---------- расчёты ----------
  show1(xs, fs) {
    const s = stat1(xs, fs, S.q1q3);
    statReport('1-Variable', [
      [G.XBAR, s.mean], ['Σx', s.sum], ['Σx' + G.SQ, s.sum2], ['σx', s.sdP], ['sx', s.sdS], ['n', s.n],
      ['minX', s.min], ['Q1', s.q1], ['Med', s.med], ['Q3', s.q3], ['maxX', s.max], ['Mod', s.mode], ['Mod:n', s.modeN], ['Mod:F', s.modeF]
    ]);
  },
  show2() {
    const xs = this.nums(this.cs.x2), ys = this.nums(this.cs.y2);
    if (xs.length !== ys.length) fail('Dimension ERROR');
    const s = stat2(xs, ys, this.freq(this.cs.f2, xs.length));
    statReport('2-Variable', [
      [G.XBAR, s.meanX], ['Σx', s.sumX], ['Σx' + G.SQ, s.sumX2], ['σx', s.sdPX], ['sx', s.sdSX], ['n', s.n],
      [G.YBAR, s.meanY], ['Σy', s.sumY], ['Σy' + G.SQ, s.sumY2], ['σy', s.sdPY], ['sy', s.sdSY], ['Σxy', s.sumXY],
      ['minX', s.minX], ['maxX', s.maxX], ['minY', s.minY], ['maxY', s.maxY]
    ]);
  },
  // Регрессия и экран результата. graph — диаграмма, поверх которой можно нарисовать линию (или null)
  regShow(kind, xs, ys, fs, graph) {
    const q = statReg(kind, xs, ys, fs);
    const copy = () => {
      const i = mem.fn.findIndex((fn) => !fn.row.length && !fn.row2.length);
      if (i < 0) fail('Memory ERROR');
      const toks = S.angle !== 'Rad' && q.toksAny ? q.toksAny : q.toks;
      Object.assign(mem.fn[i], { type: 'Y=', row: toks.slice(), row2: [], math: false, sel: true, style: 'Normal' });
      fnTouch();
      infoBox(['Formula copied', 'to Y' + (i + 1), '', 'Press:[EXIT]']);
    };
    const draw = () => {
      popModal();
      this.gr.regs.push({ f: q.f, color: graph.cfg.color === 'Red' ? 'Blue' : 'Red' });
      this.gr.menu.reset();
    };
    statReport(q.title, [...q.rows, [q.formula]], [null, null, null, null, { l: 'COPY', fn: copy }, graph ? { l: 'DRAW', fn: draw } : null]);
  },

  // ---------- распределения ----------
  distForm(id) {
    const d = this.dist[id];
    const num = (label, key, check) => ({ label, value: fmtFit(d[key], 10), num: (v) => { if (check && !check(v)) fail('Ma ERROR'); d[key] = v; } });
    const data = { label: 'Data', value: 'Variable' };
    const sd = () => num('σ', 's', (v) => v > 0), mu = () => num('μ', 'm');
    const whole = (v) => Number.isInteger(v) && v >= 0, prob = (v) => v >= 0 && v <= 1;
    const need = (v) => { if (!Number.isFinite(v)) fail('Ma ERROR'); return r15(v); };
    let title, rows, calc;
    switch (id) {
      case 'npd':
        title = 'Normal P.D'; rows = () => [data, num('x', 'x'), sd(), mu()];
        calc = () => [['p', need(normPdf((d.x - d.m) / d.s) / d.s)]];
        break;
      case 'ncd':
        title = 'Normal C.D'; rows = () => [data, num('Lower', 'lo'), num('Upper', 'hi'), sd(), mu()];
        calc = () => {
          const zl = (d.lo - d.m) / d.s, zu = (d.hi - d.m) / d.s;
          return [['p', need(zl > 0 ? normCdf(-zl) - normCdf(-zu) : normCdf(zu) - normCdf(zl))], ['z:Low', r15(zl)], ['z:Up', r15(zu)]];
        };
        break;
      case 'invn':
        title = 'Inverse Normal';
        rows = () => [data, { label: 'Tail', value: d.tail, menu: ['Left', 'Right', 'Central'].map((t) => ({ l: t.toUpperCase(), fn: () => { d.tail = t; } })) },
          num('Area', 'area', (v) => v >= 0 && v <= 1), sd(), mu()];
        calc = () => {
          if (d.tail === 'Central') return [['x1Inv', need(d.m + d.s * normInv((1 - d.area) / 2))], ['x2Inv', need(d.m + d.s * normInv((1 + d.area) / 2))]];
          return [['xInv', need(d.m + d.s * normInv(d.tail === 'Left' ? d.area : 1 - d.area))]];
        };
        break;
      case 'bpd':
        title = 'Binomial P.D'; rows = () => [data, num('x', 'x', whole), num('Numtrial', 'n', whole), num('p', 'p', prob)];
        calc = () => [['p', need(binomPd(d.x, d.n, d.p))]];
        break;
      case 'bcd':
        title = 'Binomial C.D'; rows = () => [data, num('Lower', 'lo', whole), num('Upper', 'hi', whole), num('Numtrial', 'n', whole), num('p', 'p', prob)];
        calc = () => { if (d.n > 100000) fail('Ma ERROR'); return [['p', need(binomCd(d.lo, d.hi, d.n, d.p))]]; };
        break;
      case 'ppd':
        title = 'Poisson P.D'; rows = () => [data, num('x', 'x', whole), num('λ', 'mu', (v) => v > 0)];
        calc = () => [['p', need(r15(poisPd(d.x, d.mu)))]];
        break;
      default:
        title = 'Poisson C.D'; rows = () => [data, num('Lower', 'lo', whole), num('Upper', 'hi', whole), num('λ', 'mu', (v) => v > 0)];
        calc = () => { if (d.hi > 100000) fail('Ma ERROR'); return [['p', need(poisCd(d.lo, d.hi, d.mu))]]; };
    }
    const run = () => statReport(title, calc());
    statForm({ title, col: 9, indent: true, rows: () => [...rows(), { label: 'Execute', exec: run, menu: [{ l: 'CALC', fn: run }] }] });
  },

  // ---------- диаграммы ----------
  // Данные диаграммы i → {cfg, kind, xs, ys, fs, …}
  prep(i) {
    const cfg = this.sg[i], xs = this.nums(cfg.x);
    if (SG_TWO(cfg.type)) {
      const ys = this.nums(cfg.y);
      if (ys.length !== xs.length) fail('Dimension ERROR');
      return { cfg, kind: 'xy', xs, ys, fs: this.freq(cfg.f, xs.length) };
    }
    if (cfg.type === 'Bar') return { cfg, kind: 'bar', xs, fs: null };
    const fs = this.freq(cfg.f, xs.length);
    if (cfg.type === 'MedBox') return { cfg, kind: 'box', xs, fs, st: stat1(xs, fs, S.q1q3) };
    stat1(xs, fs, S.q1q3);              // проверка частот
    return { cfg, kind: cfg.type === 'Hist' ? 'hist' : 'broken', xs, fs };
  },
  showGraph(ids) {
    const gs = [];
    let k = 0;
    const next = () => {
      if (k >= ids.length) {
        this.gr = { gs, regs: [], st: 'view', tr: null, menu: null };
        this.gr.menu = new FMenu(this.graphMenu());
        this.scr = 'graph';
        this.base.reset();
        if (S.statWind === 'Auto') this.autoWin();
        if (!vwOk()) fail('Range ERROR');
        return;
      }
      const g = this.prep(ids[k++]);
      if (g.kind !== 'hist' && g.kind !== 'broken') { gs.push(g); next(); return; }
      const used = g.xs.filter((_, i) => !g.fs || g.fs[i] > 0);
      const iv = statBinsDefault(used.length ? used : g.xs);
      statForm({
        title: 'Set Interval', col: 6, indent: true,
        rows: () => [
          { label: 'Start', value: fmtFit(iv.start, 12), num: (v) => { iv.start = v; } },
          { label: 'Width', value: fmtFit(iv.width, 12), num: (v) => { if (!(v > 0)) fail('Ma ERROR'); iv.width = v; } }
        ],
        onDone: () => {
          g.bins = statBins(g.xs, g.fs, iv.start, iv.width);
          g.start = iv.start; g.width = iv.width;
          popModal();
          gs.push(g);
          next();
        }
      });
    };
    next();
  },
  graphMenu() {
    const two = this.gr.gs.find((g) => g.kind === 'xy');
    if (two) return [mi('CALC', this.regMenu((kind) => this.regShow(kind, two.xs, two.ys, two.fs, two)))];
    const one = this.gr.gs.find((g) => g.kind !== 'bar');
    return one ? [mi('1-VAR', () => this.show1(one.xs, one.fs))] : [];
  },
  // Окно просмотра по данным
  autoWin() {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, step = 0;   // step — ширина столбца гистограммы
    const X = (a, b) => { if (a < x0) x0 = a; if (b > x1) x1 = b; }, Y = (a, b) => { if (a < y0) y0 = a; if (b > y1) y1 = b; };
    for (const g of this.gr.gs) {
      if (g.kind === 'xy') { X(Math.min(...g.xs), Math.max(...g.xs)); Y(Math.min(...g.ys), Math.max(...g.ys)); }
      else if (g.kind === 'box') X(g.st.min, g.st.max);
      else if (g.kind === 'bar') { X(0.4, g.xs.length + 0.6); Y(Math.min(0, ...g.xs), Math.max(0, ...g.xs)); }
      else { X(g.start, g.start + g.bins.length * g.width); Y(0, Math.max(...g.bins)); step = step || g.width; }
    }
    let dx = x1 - x0, dy = y1 - y0;
    if (!(dx > 0)) dx = Math.abs(x0) || 1;
    const boxOnly = !Number.isFinite(y0);
    if (boxOnly) { y0 = 0; y1 = 10; dy = 10; } else if (!(dy > 0)) dy = Math.abs(y0) || 1;
    Object.assign(VW, {
      xmin: r15(x0 - dx * 0.1), xmax: r15(x1 + dx * 0.1), xscl: step || statNice(dx / 8),
      // снизу запас побольше: там строка меню и координаты
      ymin: r15(boxOnly ? -1.5 : y0 - dy * 0.4), ymax: r15(y1 + dy * 0.12), yscl: boxOnly ? 0 : statNice(dy / 6)
    });
    plotVer++;
  },

  gkey(k) {
    const s = this.gr, f = fIndex(k);
    if (f >= 0) {
      if (k.shift) {
        if (f === 0) { if (s.gs.some((g) => this.traceLen(g))) { s.st = 'trace'; s.tr = { g: s.gs.findIndex((g) => this.traceLen(g)), i: 0 }; } }
        else if (f === 2) openVWindow(() => { plotVer++; });
        else if (f === 5) this.scr = 'list';
        return;
      }
      const it = s.menu.press(f);
      if (it && it.fn) it.fn();
      return;
    }
    if (s.st === 'trace') {
      const n = this.traceLen(s.gs[s.tr.g]);
      if (k.id === 'LEFT') s.tr.i = (s.tr.i + n - 1) % n;
      else if (k.id === 'RIGHT') s.tr.i = (s.tr.i + 1) % n;
      else if (k.id === 'UP' || k.id === 'DOWN') {
        const live = s.gs.map((g, i) => i).filter((i) => this.traceLen(s.gs[i]));
        s.tr = { g: live[(live.indexOf(s.tr.g) + (k.id === 'UP' ? live.length - 1 : 1)) % live.length], i: 0 };
      } else if (k.id === 'EXIT' || k.id === 'AC') { s.st = 'view'; s.tr = null; }
      return;
    }
    const pan = (dx, dy) => {
      const sx = dx * xDot(), sy = dy * yDot();
      Object.assign(VW, { xmin: r15(VW.xmin + sx), xmax: r15(VW.xmax + sx), ymin: r15(VW.ymin + sy), ymax: r15(VW.ymax + sy) });
      plotVer++;
    };
    switch (k.id) {
      case 'LEFT': pan(-24, 0); break;
      case 'RIGHT': pan(24, 0); break;
      case 'UP': pan(0, 24); break;
      case 'DOWN': pan(0, -24); break;
      case 'EXIT': case 'AC': if (!s.menu.back()) this.scr = 'list'; break;
      default:
    }
  },
  traceLen(g) { return g.kind === 'box' ? 5 : g.kind === 'hist' || g.kind === 'broken' ? g.bins.length : g.xs.length; },
  // Высота «ящика» номер bi на экране (ось Y для него не имеет смысла)
  boxY(bi, count) { return GA.top + (GA.bottom - 24 - GA.top) * (bi + 1) / (count + 1) - 6; },
  // Точка трассировки: место на экране и подписи
  tracePoint() {
    const s = this.gr, g = s.gs[s.tr.g], i = s.tr.i;
    if (g.kind === 'xy') return { px: X2P(g.xs[i]), py: Y2P(g.ys[i]), a: 'X=' + fmtFit(g.xs[i], 13), b: 'Y=' + fmtFit(g.ys[i], 13) };
    if (g.kind === 'bar') return { px: X2P(i + 1), py: Y2P(g.xs[i]), a: 'X=' + (i + 1), b: 'Y=' + fmtFit(g.xs[i], 13) };
    if (g.kind === 'box') {
      const boxes = s.gs.filter((q) => q.kind === 'box');
      const v = [g.st.min, g.st.q1, g.st.med, g.st.q3, g.st.max][i];
      return { px: X2P(v), py: this.boxY(boxes.indexOf(g), boxes.length), a: ['minX', 'Q1', 'Med', 'Q3', 'maxX'][i] + '=' + fmtFit(v, 13), b: null };
    }
    const x = r15(g.start + i * g.width);
    return { px: X2P(g.kind === 'hist' ? x : x + g.width / 2), py: Y2P(g.bins[i]), a: 'X=' + fmtFit(x, 13), b: 'f=' + fmtFit(g.bins[i], 13) };
  },

  drawGraph() {
    const s = this.gr, g = lcd.g;
    statusBar(stdTags());
    lcd.clip(0, GA.top, LW, LH - GA.top);
    drawAxes();
    const boxes = s.gs.filter((q) => q.kind === 'box');
    const zeroY = Math.max(GA.top, Math.min(GA.bottom, Y2P(0)));
    for (const q of s.gs) {
      const color = COLORS[q.cfg.color] || '#000';
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.5; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash([]);
      if (q.kind === 'xy') {
        if (q.cfg.type === 'xyLine') {
          g.beginPath();
          q.xs.forEach((x, i) => { const px = clampP(X2P(x)), py = clampP(Y2P(q.ys[i])); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
          g.stroke();
        }
        q.xs.forEach((x, i) => {
          const px = X2P(x), py = Y2P(q.ys[i]);
          if (px < -5 || px > LW + 5 || py < GA.top - 5 || py > GA.bottom + 5) return;
          if (q.cfg.mark === 0) { g.lineWidth = 1.3; g.strokeRect(px - 2.5, py - 2.5, 5, 5); }
          else if (q.cfg.mark === 1) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(px - 3, py - 3); g.lineTo(px + 3, py + 3); g.moveTo(px + 3, py - 3); g.lineTo(px - 3, py + 3); g.stroke(); }
          else { g.beginPath(); g.arc(px, py, 1.8, 0, Math.PI * 2); g.fill(); }
        });
      } else if (q.kind === 'hist') {
        q.bins.forEach((c, i) => {
          const xa = clampP(X2P(q.start + i * q.width)), xb = clampP(X2P(q.start + (i + 1) * q.width)), yt = clampP(Y2P(c));
          g.globalAlpha = 0.25; g.fillRect(xa, yt, xb - xa, zeroY - yt); g.globalAlpha = 1;
          g.strokeRect(xa, yt, xb - xa, zeroY - yt);
        });
      } else if (q.kind === 'broken') {
        g.beginPath();
        g.moveTo(clampP(X2P(q.start - q.width / 2)), zeroY);
        q.bins.forEach((c, i) => g.lineTo(clampP(X2P(q.start + (i + 0.5) * q.width)), clampP(Y2P(c))));
        g.lineTo(clampP(X2P(q.start + (q.bins.length + 0.5) * q.width)), zeroY);
        g.stroke();
      } else if (q.kind === 'bar') {
        q.xs.forEach((v, i) => {
          const xa = clampP(X2P(i + 0.7)), xb = clampP(X2P(i + 1.3)), yt = clampP(Y2P(v));
          g.globalAlpha = 0.25; g.fillRect(xa, Math.min(yt, zeroY), xb - xa, Math.abs(zeroY - yt)); g.globalAlpha = 1;
          g.strokeRect(xa, Math.min(yt, zeroY), xb - xa, Math.abs(zeroY - yt));
        });
      } else {
        const yc = this.boxY(boxes.indexOf(q), boxes.length), t = q.st, hh = 12;
        const p = [t.min, t.q1, t.med, t.q3, t.max].map((v) => clampP(X2P(v)));
        g.globalAlpha = 0.2; g.fillRect(p[1], yc - hh, p[3] - p[1], hh * 2); g.globalAlpha = 1;
        g.strokeRect(p[1], yc - hh, p[3] - p[1], hh * 2);
        g.beginPath();
        g.moveTo(p[0], yc); g.lineTo(p[1], yc); g.moveTo(p[3], yc); g.lineTo(p[4], yc);
        g.moveTo(p[0], yc - 5); g.lineTo(p[0], yc + 5); g.moveTo(p[4], yc - 5); g.lineTo(p[4], yc + 5);
        g.moveTo(p[2], yc - hh); g.lineTo(p[2], yc + hh);
        g.stroke();
      }
    }
    for (const r of s.regs) { try { strokePts(sampleY(r.f), COLORS[r.color], 'Normal'); } catch (e) { if (!(e instanceof CalcError)) throw e; } }
    lcd.unclip();
    if (s.st === 'trace') {
      const p = this.tracePoint();
      if (p.px >= 0 && p.px <= LW && p.py >= GA.top && p.py <= GA.bottom) graphApp.pointer(p.px, p.py, COLORS[s.gs[s.tr.g].cfg.color]);
      if (S.coord !== 'Off') {
        const y = LH - 17 - 24;
        for (const [txt, x] of [[p.a, 1], [p.b, 193]]) {
          if (!txt) continue;
          lcd.rect(x, y, lcd.miniW(txt, { px: 14 }) + 6, 17, '#fff');
          lcd.mini(x + 3, y + 1, txt, { px: 14 });
        }
      }
    }
    lcd.fmenu(s.menu.labels());
  },

  reset() {
    this.sg = [newStatGraph(0), newStatGraph(1), newStatGraph(2)];
    this.cs = { x1: 1, f1: 0, x2: 1, y2: 2, f2: 0 };
    Object.assign(this, { col: 0, row: 0, left: 0, top: 0, field: null, scr: 'list', gr: null });
  },
  save() { return { sg: this.sg, cs: this.cs, col: this.col, row: this.row }; },
  load(st) {
    const okList = (n) => Number.isInteger(n) && n >= 1 && n <= 26;
    if (Array.isArray(st.sg)) {
      st.sg.slice(0, 3).forEach((g, i) => {
        if (!g) return;
        const d = newStatGraph(i);
        this.sg[i] = {
          on: !!g.on, type: SG_TYPES.includes(g.type) ? g.type : d.type, x: okList(g.x) ? g.x : d.x, y: okList(g.y) ? g.y : d.y,
          f: okList(g.f) ? g.f : 0, mark: [0, 1, 2].includes(g.mark) ? g.mark : 0, color: COLORS[g.color] ? g.color : d.color
        };
      });
    }
    if (st.cs) {
      for (const k of ['x1', 'x2', 'y2']) if (okList(st.cs[k])) this.cs[k] = st.cs[k];
      for (const k of ['f1', 'f2']) if (okList(st.cs[k])) this.cs[k] = st.cs[k];
    }
    if (Number.isInteger(st.col)) this.col = st.col;
    if (Number.isInteger(st.row)) this.row = st.row;
  }
};
UI.apps.stat = statApp;
