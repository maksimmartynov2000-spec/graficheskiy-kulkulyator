// ══════ 85-eqn.js — режим Equation: системы линейных уравнений, многочлены, Solver ══════

// ---------- системы линейных уравнений ----------
// A — n строк по n+1 чисел {v, ex, dec} (последний столбец — правая часть).
// → {kind: 'ok', x: [числа]} | {kind: 'none'} (нет решений) | {kind: 'inf'} (бесконечно много)
function eqnLinear(A) {
  const n = A.length;
  const m = A.map((r) => r.slice());
  const big = (r) => r.slice(0, n).reduce((s, x) => Math.max(s, Math.abs(x.v)), 0);
  // наибольшие встреченные величины в строке: мера погрешности для приближённых чисел
  const mag = m.map(big), magR = m.map((r) => Math.abs(r[n].v));
  // точный ноль — по точной форме; приближённое число — с допуском на округление
  const zero = (x, s) => (x.ex ? x.ex.t.length === 0 : Math.abs(x.v) <= 1e-11 * s);
  let row = 0;
  for (let col = 0; col < n && row < n; col++) {
    let p = -1, best = 0;
    for (let i = row; i < n; i++) {
      if (!zero(m[i][col], mag[i]) && Math.abs(m[i][col].v) > best) { best = Math.abs(m[i][col].v); p = i; }
    }
    if (p < 0) continue;
    if (p !== row) {
      [m[p], m[row]] = [m[row], m[p]];
      [mag[p], mag[row]] = [mag[row], mag[p]];
      [magR[p], magR[row]] = [magR[row], magR[p]];
    }
    for (let i = 0; i < n; i++) {
      if (i === row || zero(m[i][col], mag[i])) continue;
      const k = sDiv(m[i][col], m[row][col]);
      m[i] = m[i].map((x, j) => (j === col ? RI(0) : sSub(x, sMul(k, m[row][j]))));
      mag[i] = Math.max(mag[i], big(m[i]));
      magR[i] = Math.max(magR[i], Math.abs(m[i][n].v));
    }
    row++;
  }
  if (row === n) return { kind: 'ok', x: m.map((r, i) => sDiv(r[n], r[i])) };
  // вырожденная система: строка «0 = c» при c ≠ 0 — решений нет
  for (let i = row; i < n; i++) if (!zero(m[i][n], Math.max(mag[i], magR[i]))) return { kind: 'none' };
  return { kind: 'inf' };
}

// ---------- многочлены с целыми коэффициентами (BigInt), старший коэффициент первый ----------
function eqnGcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}
const zpTrim = (p) => { let i = 0; while (i < p.length && p[i] === 0n) i++; return p.slice(i); };   // [] — нулевой многочлен
function zpPrim(p) {                  // примитивная часть: без общего множителя, старший коэффициент > 0
  p = zpTrim(p);
  if (!p.length) return p;
  let g = 0n;
  for (const c of p) g = eqnGcd(g, c);
  if (p[0] < 0n) g = -g;
  return p.map((c) => c / g);
}
const zpDeriv = (p) => p.slice(0, -1).map((c, i) => c * BigInt(p.length - 1 - i));
function zpRem(a, b) {                // псевдоостаток от деления a на b
  a = zpTrim(a);
  while (a.length && a.length >= b.length) {
    const la = a[0], lb = b[0];
    a = zpTrim(a.map((c, i) => c * lb - (i < b.length ? la * b[i] : 0n)));
  }
  return a;
}
function zpGcd(a, b) {
  a = zpPrim(a); b = zpPrim(b);
  while (b.length) { const r = zpPrim(zpRem(a, b)); a = b; b = r; }
  return a;
}
function zpDiv(a, b) {                // точное деление; если нацело не делится — ошибка (ловится выше)
  a = a.slice();
  const q = [];
  while (a.length >= b.length) {
    if (a[0] % b[0] !== 0n) throw new Error('inexact division');
    const k = a[0] / b[0];
    q.push(k);
    for (let i = 0; i < b.length; i++) a[i] -= k * b[i];
    a.shift();
  }
  if (a.some((c) => c !== 0n) || !q.length) throw new Error('inexact division');
  return q;
}
// Разложение по кратности корней: [F1, F2, …], корни Fk входят в многочлен ровно k раз
function zpSqFree(p) {
  const S = [];
  let q = zpPrim(p);
  while (q.length > 1) {
    const g = zpGcd(q, zpDeriv(q));
    S.push(zpDiv(q, g));              // все различные корни q
    q = g;                            // кратности уменьшились на 1
  }
  return S.map((s, k) => (k + 1 < S.length ? zpDiv(s, S[k + 1]) : s));
}
// den^n · p(num/den): точная проверка рационального корня
function zpEval(p, num, den) {
  let acc = 0n, dp = 1n;
  for (const c of p) { acc = acc * num + c * dp; dp *= den; }
  return acc;
}
const zpFloat = (p) => { const l = Number(p[0]); return p.map((c) => Number(c) / l); };
// Точные рациональные коэффициенты {v, ex} → целые (BigInt); если есть неточные — null
function zpFrom(coefs) {
  let L = 1n;
  const fr = [];
  for (const x of coefs) {
    if (!x.ex || !exIsRat(x.ex)) return null;
    const [n, d] = x.ex.t.length ? x.ex.t[0] : [0, 1];
    fr.push([BigInt(n), BigInt(d)]);
    L = L / eqnGcd(L, BigInt(d)) * BigInt(d);
  }
  return fr.map(([n, d]) => n * (L / d));
}
const eqnBigNum = (b) => { const v = Number(b); return Math.abs(v) <= LIM ? RI(v) : R(v); };
function eqnBigRat(n, d) {
  const g = eqnGcd(n, d) || 1n;
  n /= g; d /= g;
  if (d < 0n) { n = -n; d = -d; }
  const nv = Number(n), dv = Number(d);
  const ex = Math.abs(nv) <= LIM && dv <= LIM ? exRat(nv, dv) : null;
  return ex ? RX(ex) : R(nv / dv);
}

// ---------- численный поиск корней ----------
// Все корни многочлена с вещественными коэффициентами c (старший первый): метод Аберта → [[re, im], …]
function eqnAberth(c) {
  const n = c.length - 1;
  const a = c.map((x) => x / c[0]);
  let rad = 0;
  for (let i = 1; i <= n; i++) rad = Math.max(rad, Math.abs(a[i]) ** (1 / i));
  if (!(rad > 0)) rad = 1;
  const z = [];
  for (let k = 0; k < n; k++) { const t = 2 * Math.PI * k / n + 0.7; z.push([rad * Math.cos(t), rad * Math.sin(t)]); }
  for (let it = 0; it < 400; it++) {
    let delta = 0;
    for (let k = 0; k < n; k++) {
      const [x, y] = z[k];
      // p(z) и p′(z) по схеме Горнера
      let pr = 1, pi = 0, dr = 0, di = 0;
      for (let i = 1; i <= n; i++) {
        const ndr = dr * x - di * y + pr, ndi = dr * y + di * x + pi;
        const npr = pr * x - pi * y + a[i], npi = pr * y + pi * x;
        dr = ndr; di = ndi; pr = npr; pi = npi;
      }
      if (pr === 0 && pi === 0) continue;
      const dd = dr * dr + di * di;
      if (dd === 0) { z[k] = [x + rad * 1e-3, y + rad * 1e-3]; delta = 1; continue; }
      const wr = (pr * dr + pi * di) / dd, wi = (pi * dr - pr * di) / dd;       // w = p/p′
      let sr = 0, si = 0;                                                      // s = Σ 1/(z_k − z_j)
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const ex = x - z[j][0], ey = y - z[j][1], ee = ex * ex + ey * ey;
        if (ee === 0) continue;
        sr += ex / ee; si -= ey / ee;
      }
      const tr = 1 - (wr * sr - wi * si), ti = -(wr * si + wi * sr), tt = tr * tr + ti * ti;   // 1 − w·s
      let cr = wr, ci = wi;
      if (tt > 0) { cr = (wr * tr + wi * ti) / tt; ci = (wi * tr - wr * ti) / tt; }
      z[k] = [x - cr, y - ci];
      delta = Math.max(delta, Math.hypot(cr, ci) / Math.max(1, Math.hypot(x, y)));
    }
    if (delta < 1e-15) break;
  }
  return z;
}
// Уточнение вещественного корня методом Ньютона
function eqnPolish(c, x) {
  const val = (t) => { let p = 0; for (const a of c) p = p * t + a; return p; };
  for (let i = 0; i < 10; i++) {
    let p = 0, d = 0;
    for (const a of c) { d = d * x + p; p = p * x + a; }
    if (p === 0 || d === 0) break;
    const nx = x - p / d;
    if (!Number.isFinite(nx) || nx === x || Math.abs(val(nx)) > Math.abs(p)) break;
    x = nx;
  }
  return x;
}
// Подходящие дроби числа x: кандидаты в рациональные корни → [[числитель, знаменатель], …]
function eqnRatNear(x, maxDen) {
  const out = [], neg = x < 0;
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, y = Math.abs(x);
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(y), h = a * h1 + h0, k = a * k1 + k0;
    if (k > maxDen || h > LIM) break;
    out.push([neg ? -h : h, k]);
    h0 = h1; h1 = h; k0 = k1; k1 = k;
    const f = y - a;
    if (f < 1e-12) break;
    y = 1 / f;
  }
  return out;
}

// ---------- корни многочленов ----------
// Квадратное уравнение ax² + bx + c = 0: [] либо два корня — сначала (−b+√D)/2a, потом (−b−√D)/2a
function eqnQuad(a, b, c) {
  const D = sSub(sMul(b, b), sMul(RI(4), sMul(a, c)));
  // у приближённых коэффициентов «почти нулевой» дискриминант считаем нулём
  const tiny = !D.ex && Math.abs(D.v) <= 1e-12 * (b.v * b.v + Math.abs(4 * a.v * c.v));
  if (D.v < 0 && !tiny) return [];
  const twoA = sMul(RI(2), a);
  if (D.v === 0 || tiny) { const x = sDiv(sNeg(b), twoA); return [x, x]; }
  const sq = sSqrt(D);
  // значения считаем по формуле без вычитания близких чисел: один корень через q, второй — через c/q
  const q = -(b.v + (b.v >= 0 ? sq.v : -sq.v)) / 2, r1 = q / a.v, r2 = c.v / q;
  const vp = b.v >= 0 ? r2 : r1, vm = b.v >= 0 ? r1 : r2;
  const dec = a.dec || b.dec || c.dec;
  if (!sq.ex) return [RF(snapNice(vp), false, dec), RF(snapNice(vm), false, dec)];
  // точная запись — как есть; если это не дробь, значение берём устойчивое
  const fix = (x, v) => (x.ex && exIsRat(x.ex) ? x : R(v, x.ex, x.dec));
  return [fix(sDiv(sAdd(sNeg(b), sq), twoA), vp), fix(sDiv(sSub(sNeg(b), sq), twoA), vm)];
}
// Вещественные корни многочлена без кратных корней (целые коэффициенты): рациональные — точно
function eqnSqfRoots(F) {
  const roots = [];
  let p = F;
  if (p[p.length - 1] === 0n) { roots.push(RI(0)); p = p.slice(0, -1); }
  let zs = null;
  while (p.length > 3) {
    zs = eqnAberth(zpFloat(p));
    let hit = null;
    search: for (const [re, im] of zs) {
      if (Math.abs(im) > 1e-6 * Math.max(1, Math.abs(re))) continue;
      for (const [h, k] of eqnRatNear(re, 1e6)) {
        if (Math.abs(re - h / k) > 1e-6 * Math.max(1, Math.abs(re))) continue;
        if (zpEval(p, BigInt(h), BigInt(k)) === 0n) { hit = [h, k]; break search; }
      }
    }
    if (!hit) break;
    roots.push(eqnBigRat(BigInt(hit[0]), BigInt(hit[1])));
    p = zpDiv(p, [BigInt(hit[1]), BigInt(-hit[0])]);
    zs = null;
  }
  const n = p.length - 1;
  if (n === 1) roots.push(eqnBigRat(-p[1], p[0]));
  else if (n === 2) roots.push(...eqnQuad(eqnBigNum(p[0]), eqnBigNum(p[1]), eqnBigNum(p[2])));
  else if (n >= 3) {
    const c = zpFloat(p);
    for (const [re, im] of zs || eqnAberth(c)) {
      if (Math.abs(im) <= 1e-9 * Math.max(1, Math.abs(re))) roots.push(RF(snapNice(eqnPolish(c, re)), false, false));
    }
  }
  return roots;
}
// Приближённые коэффициенты: все корни численно, вещественные — с малой мнимой частью
function eqnFloatRoots(c) {
  const out = [];
  c = c.slice();
  while (c.length > 1 && c[c.length - 1] === 0) { out.push(0); c.pop(); }
  if (c.length === 2) out.push(-c[1] / c[0]);
  else if (c.length > 2) {
    for (const [re, im] of eqnAberth(c)) {
      if (Math.abs(im) <= 1e-6 * Math.max(1, Math.abs(re))) out.push(snapNice(eqnPolish(c, re)));
    }
  }
  return out.map((v) => RF(v, false, false));
}
// Вещественные корни многочлена. coefs — числа, старший коэффициент первый.
// Кратный корень повторяется столько раз, какова его кратность
function eqnPoly(coefs) {
  if (coefs[0].v === 0) fail('Ma ERROR');
  const deg = coefs.length - 1, dec = coefs.some((x) => x.dec);
  let roots = null;
  if (deg === 1) roots = [sDiv(sNeg(coefs[1]), coefs[0])];
  else if (deg === 2) roots = eqnQuad(coefs[0], coefs[1], coefs[2]);
  else {
    const big = zpFrom(coefs);
    if (big) {
      try {
        roots = [];
        zpSqFree(big).forEach((F, k) => {
          if (F.length < 2) return;
          for (const r of eqnSqfRoots(F)) for (let i = 0; i <= k; i++) roots.push(r);
        });
      } catch (e) {
        if (e instanceof CalcError) throw e;
        roots = null;                  // точный путь не удался — считаем численно
      }
    }
    if (!roots) roots = eqnFloatRoots(coefs.map((x) => x.v));
    roots.sort((p, q) => q.v - p.v);
  }
  return roots.map((x) => R(x.v, x.ex, dec || x.dec));
}

// ---------- Solver ----------
const EQ_LO = -9e99, EQ_HI = 9e99;     // границы поиска по умолчанию
// Проверка найденного корня: значение в точке должно быть пренебрежимо мало рядом с соседними
// (поиск на широком отрезке иначе принимает за корень место, где график только приближается к оси)
function eqnIsRoot(f, x) {
  const y = Math.abs(f(x));
  if (!(y >= 0)) return false;
  if (y === 0) return true;
  const h = 1e-3 * Math.max(1, Math.abs(x));
  const near = [f(x - h), f(x + h)].filter(Number.isFinite).map(Math.abs);
  return near.length ? y <= 1e-6 * Math.max(...near) : y < 1e-9;
}
// Корень f(x) = 0 рядом с x0 в границах [lo, hi]; NaN — не найден
function eqnSolve(f, x0, lo, hi) {
  const nearest = (rs) => rs.reduce((p, q) => (Math.abs(q - x0) < Math.abs(p - x0) ? q : p));
  if (lo <= EQ_LO && hi >= EQ_HI) {
    const x = nSolve(f, x0);
    if (Number.isFinite(x) && eqnIsRoot(f, x)) return x;
    for (const w of [1e3, 1e4, 1e5, 1e6]) {
      const rs = scanRoots(f, x0 - w, x0 + w, 4000).filter((r) => eqnIsRoot(f, r));
      if (rs.length) return nearest(rs);
    }
    return NaN;
  }
  const a = lo <= EQ_LO ? Math.min(x0, hi) - 1e4 : lo, b = hi >= EQ_HI ? Math.max(x0, lo) + 1e4 : hi;
  const x = nSolve(f, Math.min(b, Math.max(a, x0)), a, b);
  return Number.isFinite(x) && eqnIsRoot(f, x) ? x : NaN;
}
// Переменные, встречающиеся в выражении, по порядку A…Z, r, θ
function eqnVars(ast) {
  const seen = new Set();
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    if (n.k === 'var') seen.add(n.n);
    if (n.k === 'num') return;
    for (const key in n) if (key !== 'k') walk(n[key]);
  };
  walk(ast);
  return VARS.filter((v) => seen.has(v));
}

// ---------- экран ----------
const EQ_VARS = ['X', 'Y', 'Z', 'T', 'U', 'V'];
const eqnZeros = (n) => Array.from({ length: n }, () => RI(0));
// Запись ответа одной строкой — для журнала экрана (тесты)
function eqnPlain(row) {
  return row.map((x) => {
    if (typeof x === 'string') return x === G.EE ? 'E' : x === G.FRC ? '/' : x;
    const s = x.s.map(eqnPlain);
    if (x.t === 'frac') return `(${s[0]})/(${s[1]})`;
    if (x.t === 'mixed') return `${s[0]}(${s[1]})/(${s[2]})`;
    if (x.t === 'sqrt') return `√(${s[0]})`;
    return s.join(',');
  }).join('');
}
// Формула в заголовке: части — строка либо {sub} (нижний индекс) / {sup} (показатель степени)
function eqnHeader(parts, y) {
  const width = (cw, sw) => parts.reduce((w, p) => w + (typeof p === 'string' ? [...p].length * cw : sw), 0);
  const small = width(18, 11) > LW - 6;
  const h = small ? 16 : 24, cw = small ? 12 : 18, sw = small ? 8 : 11, hs = small ? 11 : 15;
  const yc = y + 12;
  let x = 2;
  for (const p of parts) {
    if (typeof p === 'string') { for (const ch of p) { lcd.glyph(ch, x + cw / 2, yc, h, '#000'); x += cw; } }
    else if (p.sub) { lcd.glyph(p.sub, x + sw / 2 - 1, yc + h * 0.24, hs, '#000'); x += sw; }
    else { lcd.glyph(p.sup, x + sw / 2 - 1, yc - h * 0.28, hs, '#000'); x += sw; }
  }
  lcd.log.push(parts.map((p) => (typeof p === 'string' ? p : p.sub || '^' + p.sup)).join(''));
}
const eqnRowOk = (row) => Array.isArray(row) && row.every((t) => typeof t === 'string' || (t && TPL_SLOTS[t.t] && Array.isArray(t.s) && t.s.length === TPL_SLOTS[t.t] && t.s.every(eqnRowOk)));

const eqnApp = {
  st: 'home',            // home | simN | simC | simR | polN | polC | polR | solEq | solVars | solR
  n: 2, deg: 2,          // число неизвестных и степень многочлена
  sim: {}, pol: {},      // коэффициенты: по числу неизвестных и по степени
  r: 0, c: 0, top: 0, left: 0,
  field: null,           // поле ввода числа
  res: null,             // ответ: {labels, vals, sel, off, mode}
  ed: null, optn: false, // редактор уравнения Solver
  eqRow: [], eqMath: true, vars: [], vsel: 0, voff: 0, lower: EQ_LO, upper: EQ_HI, sol: null,
  menu: null,

  enter() { this.go('home'); },
  setup() { return ['io', 'frac', 'angle', 'disp']; },
  onSetup() { if (this.st === 'solEq' && this.ed.math !== (S.io === 'Math')) this.editEq(true); },

  go(st) {
    this.st = st; this.field = null; this.optn = false;
    const run = (it) => mi(it[0], it[1]);
    const items = {
      home: [['SIMUL', () => this.go('simN')], ['POLY', () => this.go('polN')], ['SOLVER', () => this.openSolver()]],
      simN: [2, 3, 4, 5, 6].map((n) => [String(n), () => this.openCoef('simC', n)]),
      polN: [2, 3, 4, 5, 6].map((n) => [String(n), () => this.openCoef('polC', n)]),
      simC: [['SOLVE', () => this.solve()], ['DELETE', () => this.delCell()], ['CLEAR', () => this.clearAll()], ['EDIT', () => this.editCell()]],
      simR: [['REPEAT', () => this.go('simC')]],
      polR: [['REPEAT', () => this.go('polC')]],
      solR: [['REPEAT', () => this.go('solVars')]],
      solEq: [],
      solVars: [null, ['DELETE', () => this.delEq()], null, null, null, ['SOLVE', () => this.solveVar()]]
    };
    items.polC = items.simC;
    this.menu = new FMenu(items[st].map((it) => it && run(it)));
  },

  // ---------- коэффициенты ----------
  openCoef(st, n) {
    if (st === 'simC') this.n = n; else this.deg = n;
    this.r = 0; this.c = 0; this.top = 0; this.left = 0;
    this.go(st);
  },
  grid() {
    if (this.st[0] === 'p') {
      const d = this.deg;
      if (!this.pol[d]) this.pol[d] = eqnZeros(d + 1);
      return { poly: true, rows: 1, cols: d + 1, data: [this.pol[d]] };
    }
    const n = this.n;
    if (!this.sim[n]) this.sim[n] = Array.from({ length: n }, () => eqnZeros(n + 1));
    return { poly: false, rows: n, cols: n + 1, data: this.sim[n] };
  },
  headParts(g) {
    const P = [], L = (j) => String.fromCharCode(97 + j);
    if (g.poly) {
      const d = this.deg;
      for (let j = 0; j <= d; j++) {
        P.push((j ? '+' : '') + L(j) + (d - j >= 1 ? 'X' : ''));
        if (d - j >= 2) P.push({ sup: String(d - j) });
      }
      P.push('=0');
    } else {
      const n = this.n;
      for (let j = 0; j < n; j++) P.push((j ? '+' : '') + L(j), { sub: 'n' }, EQ_VARS[j]);
      P.push('=' + L(n), { sub: 'n' });
    }
    return P;
  },
  see() {                              // держать выделенную ячейку на экране
    if (this.r < this.top) this.top = this.r;
    if (this.r > this.top + 3) this.top = this.r - 3;
    if (this.c < this.left) this.left = this.c;
    if (this.c > this.left + 2) this.left = this.c - 2;
  },
  next(g) {
    if (this.c + 1 < g.cols) this.c++;
    else if (this.r + 1 < g.rows) { this.r++; this.c = 0; }
    this.see();
  },
  delCell() { this.grid().data[this.r][this.c] = RI(0); },
  clearAll() {
    confirmBox(['Clear All', 'Coefficients?'], () => {
      const g = this.grid();
      g.data.forEach((row) => row.fill(RI(0)));
      this.r = 0; this.c = 0; this.see();
    });
  },
  editCell() {
    const x = this.grid().data[this.r][this.c];
    this.field = new NumField();
    this.field.ed.set(numRow(x, 'auto', false));
  },
  solve() {
    const g = this.grid();
    if (g.poly) {
      const roots = eqnPoly(g.data[0]);
      if (!roots.length) { infoBox(['No Real Roots', '', 'Press:[EXIT]']); return; }
      this.res = { labels: roots.map((_, i) => 'X' + (i + 1)), vals: roots, sel: 0, off: 0, mode: 'auto' };
      this.go('polR');
      return;
    }
    const s = eqnLinear(g.data);
    if (s.kind === 'none') { infoBox(['No Solution', '', 'Press:[EXIT]']); return; }
    if (s.kind === 'inf') { infoBox(['Infinitely Many', 'Solutions', '', 'Press:[EXIT]']); return; }
    this.res = { labels: EQ_VARS.slice(0, this.n), vals: s.x, sel: 0, off: 0, mode: 'auto' };
    this.go('simR');
  },
  coefKey(k) {
    const g = this.grid(), f = fIndex(k);
    if (this.field) {
      this.field.key(k, (x) => { g.data[this.r][this.c] = x; this.field = null; this.next(g); }, () => { this.field = null; });
      return;
    }
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    switch (k.id) {
      case 'LEFT': this.c = Math.max(0, this.c - 1); break;
      case 'RIGHT': this.c = Math.min(g.cols - 1, this.c + 1); break;
      case 'UP': this.r = Math.max(0, this.r - 1); break;
      case 'DOWN': this.r = Math.min(g.rows - 1, this.r + 1); break;
      case 'EXE': this.next(g); break;
      case 'DEL': this.delCell(); break;
      case 'EXIT': this.go(g.poly ? 'polN' : 'simN'); return;
      default:
        if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    }
    this.see();
  },

  // ---------- ответ ----------
  resKey(k) {
    const r = this.res, f = fIndex(k);
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    if (k.id === 'UP') r.sel = Math.max(0, r.sel - 1);
    else if (k.id === 'DOWN') r.sel = Math.min(r.vals.length - 1, r.sel + 1);
    else if (k.id === 'EXIT') this.go(this.st === 'polR' ? 'polC' : 'simC');
    else if (k.id === 'SD' && !k.shift) {
      // S⇔D: все значения разом — точная запись ↔ десятичная
      const math = S.io === 'Math';
      const exact = (x) => r.mode !== 'dec' && (r.mode === 'exact' || !x.dec) && !!exactForm(x, math);
      if (r.vals.some(exact)) r.mode = 'dec';
      else if (r.vals.some((x) => !!exactForm(x, math))) r.mode = 'exact';
      r.off = 0;
    }
  },

  // ---------- Solver ----------
  openSolver() {
    if (!this.eqRow.length) { this.editEq(false); return; }
    this.scanVars();
    this.go('solVars');
    this.vsel = this.vars.length ? 1 : 0; this.voff = 0;
  },
  editEq(keep, atStart) {
    this.ed = new MathEd(S.io === 'Math');
    this.ed.sx = 0;
    if (keep && (this.ed.math || this.eqRow.every((t) => typeof t === 'string'))) this.ed.set(this.eqRow, atStart);
    this.go('solEq');
  },
  scanVars() {
    try { this.vars = eqnVars(parse(rowTokens(this.eqRow))); } catch (e) {
      if (!(e instanceof CalcError)) throw e;
      this.vars = [];
    }
  },
  delEq() {
    confirmBox(['Delete Equation?', ''], () => { this.eqRow = []; this.vars = []; this.editEq(false); });
  },
  solveVar() {
    const ast = parse(rowTokens(this.eqRow));
    if (!this.vars.length) fail('No Variable');
    if (!(this.lower < this.upper)) fail('Range ERROR');
    const name = this.vars[this.vsel >= 1 && this.vsel <= this.vars.length ? this.vsel - 1 : 0];
    const x = eqnSolve(fnOf(eqAst(ast), name), getVar(name).v, this.lower, this.upper);
    if (!Number.isFinite(x)) { errorBox('Not Found'); return; }
    setVar(name, RF(x, true, false));
    const isEq = ast.k === 'bin' && ast.op === '=';
    let lft = compileAst(isEq ? ast.a : ast)();
    const rgt = isEq ? compileAst(ast.b)() : 0;
    // расхождение в последних разрядах — погрешность округления, а не разница частей
    if (Math.abs(lft - rgt) <= 1e-12 * Math.max(1, Math.abs(lft), Math.abs(rgt))) lft = rgt;
    this.sol = { name, x, lft, rgt };
    this.go('solR');
  },
  eqKey(k) {
    const ed = this.ed, f = fIndex(k);
    if (f >= 0) { const it = this.menu.press(f); if (it && it.ins !== undefined) edInsert(ed, it.ins); return; }
    switch (k.id) {
      case 'EXE': {
        if (ed.empty) return;
        const ast = parse(ed.tokens());           // при ошибке — Syntax ERROR, остаёмся в редакторе
        if (ast.k === 'sto') fail('Syntax ERROR');
        this.eqRow = ed.get(); this.eqMath = ed.math; this.ed = null;
        this.openSolver();
        return;
      }
      case 'EXIT':
        if (this.optn) { if (!this.menu.back()) { this.optn = false; this.menu = new FMenu([]); } }
        else if (this.eqRow.length) { this.ed = null; this.openSolver(); this.vsel = 0; }
        else this.go('home');
        return;
      case 'AC': ed.clear(); return;
      case 'OPTN': this.menu = new FMenu(FN_OPTN); this.optn = true; return;
      default:
    }
    if (edNav(ed, k)) return;
    typeKey(ed, k);
  },
  varsKey(k) {
    const f = fIndex(k), nv = this.vars.length, last = nv + 2;
    if (this.field) {
      this.field.key(k, (x) => {
        if (this.vsel <= nv) setVar(this.vars[this.vsel - 1], x);
        else if (this.vsel === nv + 1) this.lower = x.v;
        else this.upper = x.v;
        this.field = null;
        if (this.vsel < last) this.vsel++;
      }, () => { this.field = null; });
      return;
    }
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    switch (k.id) {
      case 'UP': this.vsel = Math.max(0, this.vsel - 1); return;
      case 'DOWN': case 'EXE': this.vsel = Math.min(last, this.vsel + 1); return;
      case 'EXIT': this.go('home'); return;
      case 'LEFT': case 'RIGHT': if (this.vsel === 0) this.editEq(true, k.id === 'RIGHT'); return;
      default:
    }
    if (this.vsel === 0) {             // на строке уравнения: ввод нового уравнения поверх старого
      if (typeKey(new MathEd(S.io === 'Math'), k)) { this.editEq(false); typeKey(this.ed, k); }
      return;
    }
    if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
  },

  key(k) {
    switch (this.st) {
      case 'simC': case 'polC': this.coefKey(k); return;
      case 'simR': case 'polR': this.resKey(k); return;
      case 'solEq': this.eqKey(k); return;
      case 'solVars': this.varsKey(k); return;
      default: {
        const f = fIndex(k);
        if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
        if (k.id !== 'EXIT') return;
        if (this.st === 'simN' || this.st === 'polN') this.go('home');
        else if (this.st === 'solR') this.go('solVars');
      }
    }
  },

  // ---------- рисование ----------
  drawCoef() {
    const g = this.grid(), X0 = 30, CWD = 116, cols = Math.min(3, g.cols), rows = Math.min(4, g.rows);
    eqnHeader(this.headParts(g), 24);
    for (let c = 0; c < cols; c++) lcd.text(X0 + c * CWD + (CWD - 18) / 2, 48, String.fromCharCode(97 + this.left + c));
    for (let r = 0; r < rows; r++) {
      const i = this.top + r, y = 72 + r * 24;
      if (!g.poly) lcd.text(4, y, String(i + 1));
      for (let c = 0; c < cols; c++) {
        const j = this.left + c, x = X0 + c * CWD, on = i === this.r && j === this.c;
        const s = fmtFit(g.data[i][j].v, 6);
        if (on) lcd.rect(x + 3, y, CWD - 6, 24, HILITE);
        lcd.text(x + CWD - 5 - [...s].length * 18, y, s, { color: on ? '#fff' : '#000' });
      }
    }
    // квадратные скобки вокруг таблицы
    const y0 = 72.5, y1 = 72 + rows * 24 - 0.5, xl = X0 - 3.5, xr = X0 + cols * CWD + 1.5;
    for (const [x, d] of [[xl, 5], [xr, -5]]) {
      lcd.line(x, y0, x, y1, '#000', 1.5);
      lcd.line(x, y0, x + d, y0, '#000', 1.5);
      lcd.line(x, y1, x + d, y1, '#000', 1.5);
    }
    if (this.left > 0) lcd.glyph('◀', X0 + 7, 60, 12, '#000');
    if (this.left + 3 < g.cols) lcd.glyph('▶', LW - 9, 60, 12, '#000');
    if (this.top > 0) lcd.glyph('▲', 13, 60, 12, '#000');
    if (this.top + 4 < g.rows && !this.field) lcd.glyph('▼', 13, 180, 12, '#000');
    // нижняя строка: ввод либо полное значение выделенной ячейки
    if (this.field) this.field.draw(2, 180, LW - 4);
    else {
      const s = numRow(g.data[this.r][this.c], 'auto', false).join('');
      lcd.text(LW - 4 - [...s].length * 18, 168, s);
    }
  },
  drawRes() {
    const r = this.res, math = S.io === 'Math', vh = 144;
    eqnHeader(this.headParts(this.grid()), 24);
    let y = 0;
    const rows = r.vals.map((x) => {
      const row = numRow(x, r.mode, math), lay = layRow(row, 0, math, false);
      const a = Math.max(12, lay.a), q = { row, lay, a, h: Math.ceil(a + Math.max(12, lay.d)), y };
      y += q.h;
      return q;
    });
    // прокрутка по целым строкам: выделенная строка видна полностью
    const cur = rows[r.sel];
    if (y <= vh || cur.y < r.off) r.off = y <= vh ? 0 : cur.y;
    while (cur.y + cur.h > r.off + vh) {
      const nx = rows.find((q) => q.y > r.off);
      if (!nx) break;
      r.off = nx.y;
    }
    lcd.clip(0, 48, LW, vh);
    rows.forEach((q, i) => {
      const ry = 48 + q.y - r.off;
      if (ry + q.h <= 48 || ry >= 48 + vh) return;
      const on = i === r.sel, ink = on ? '#fff' : '#000', label = r.labels[i];
      if (on) lcd.rect(0, ry, LW, q.h, HILITE);
      lcd.text(4, ry + q.a - 12, label, { color: ink });
      drawLay(q.lay, Math.max(4 + label.length * 18 + 8, LW - 16 - q.lay.w), ry + q.a, ink);
      lcd.log.push(eqnPlain(q.row));
    });
    lcd.unclip();
    // стрелки «есть ещё»: на выделенной строке — белые
    const at = (py) => rows.findIndex((q) => 48 + q.y - r.off <= py && py < 48 + q.y + q.h - r.off);
    if (r.off > 0) lcd.glyph('▲', LW - 7, 56, 12, at(56) === r.sel ? '#fff' : '#000');
    if (y - r.off > vh) lcd.glyph('▼', LW - 7, 184, 12, at(184) === r.sel ? '#fff' : '#000');
  },
  // Строка «Eq:» с уравнением; возвращает высоту строки
  drawEq(y, ink) {
    const lay = layRow(this.eqRow, 0, this.eqMath, false);
    const a = Math.max(12, lay.a), h = Math.ceil(a + Math.max(12, lay.d));
    if (ink === '#fff') lcd.rect(0, y, LW, h, HILITE);
    lcd.text(0, y + a - 12, 'Eq:', { color: ink });
    lcd.clip(54, y, LW - 54, h);
    drawLay(lay, 55, y + a, ink);
    lcd.unclip();
    if (lay.w > LW - 56) { lcd.rect(LW - 12, y, 12, h, ink === '#fff' ? HILITE : '#fff'); lcd.glyph('▶', LW - 6, y + a, 14, ink); }
    return h;
  },
  drawVars() {
    const vh = 168;
    const eqLay = layRow(this.eqRow, 0, this.eqMath, false);
    const eqH = Math.ceil(Math.max(12, eqLay.a) + Math.max(12, eqLay.d));
    const lines = [...this.vars.map((v) => [v + '=', getVar(v).v]), ['Lower=', this.lower], ['Upper=', this.upper]];
    // прокрутка по целым строкам: выделенная строка видна полностью
    const topOf = (i) => (i === 0 ? 0 : eqH + (i - 1) * 24), hOf = (i) => (i === 0 ? eqH : 24);
    const total = topOf(lines.length) + 24;
    if (total <= vh || topOf(this.vsel) < this.voff) this.voff = total <= vh ? 0 : topOf(this.vsel);
    for (let i = 1; topOf(this.vsel) + hOf(this.vsel) > this.voff + vh && i <= lines.length; i++) if (topOf(i) > this.voff) this.voff = topOf(i);
    lcd.clip(0, 24, LW, vh);
    if (this.voff === 0) this.drawEq(24, this.vsel === 0 ? '#fff' : '#000');
    lcd.unclip(); lcd.clip(0, 24, LW, vh);
    let more = false;
    lines.forEach(([label, v], i) => {
      const y = 24 + topOf(i + 1) - this.voff;
      if (y < 24) return;
      if (y + 24 > 24 + vh) { more = true; return; }
      const on = this.vsel === i + 1, x = 18 + label.length * 18;
      if (on && this.field) { lcd.text(18, y, label); this.field.draw(x, y + 12, LW - x - 4); lcd.unclip(); lcd.clip(0, 24, LW, vh); return; }
      if (on) lcd.rect(0, y, LW, 24, HILITE);
      lcd.text(18, y, label + fmtFit(v, 20 - label.length), { color: on ? '#fff' : '#000' });
    });
    lcd.unclip();
    if (this.voff > 0) lcd.glyph('▲', LW - 7, 32, 12, this.vsel >= 1 && topOf(this.vsel) === this.voff && !this.field ? '#fff' : '#000');
    if (more) lcd.glyph('▼', LW - 7, 184, 12, '#000');
  },
  drawSol() {
    const s = this.sol, h = this.drawEq(24, '#000');
    const line = (i, label, v) => lcd.text(18, 24 + h + i * 24, label + (Number.isFinite(v) ? fmtFit(v, 20 - label.length) : 'ERROR'));
    line(0, s.name + '=', s.x);
    line(1, 'Lft=', s.lft);
    line(2, 'Rgt=', s.rgt);
  },
  draw() {
    statusBar(stdTags());
    switch (this.st) {
      case 'home':
        lcd.text(0, 24, 'Equation');
        lcd.text(0, 72, 'Select Type');
        lcd.text(18, 96, 'F1:Simultaneous');
        lcd.text(18, 120, 'F2:Polynomial');
        lcd.text(18, 144, 'F3:Solver');
        break;
      case 'simN':
        lcd.text(0, 24, 'Simultaneous');
        lcd.text(0, 72, 'Number Of Unknowns?');
        break;
      case 'polN':
        lcd.text(0, 24, 'Polynomial');
        lcd.text(0, 72, 'Degree?');
        break;
      case 'simC': case 'polC': this.drawCoef(); break;
      case 'simR': case 'polR': this.drawRes(); break;
      case 'solEq': {
        const lay = layRow(this.ed.root, 0, this.ed.math, false), a = Math.max(12, lay.a);
        lcd.text(0, 24 + a - 12, 'Eq:');
        drawEd(this.ed, 55, 24 + a, LW - 57);
        break;
      }
      case 'solVars': this.drawVars(); break;
      case 'solR': this.drawSol(); break;
      default:
    }
    lcd.fmenu(this.menu.labels());
  },

  // ---------- сохранение ----------
  reset() {
    Object.assign(this, { n: 2, deg: 2, sim: {}, pol: {}, res: null, ed: null, eqRow: [], eqMath: true, vars: [], vsel: 0, voff: 0, lower: EQ_LO, upper: EQ_HI, sol: null });
    this.go('home');
  },
  save() {
    return { n: this.n, deg: this.deg, sim: this.sim, pol: this.pol, eq: this.eqRow, eqMath: this.eqMath, lower: this.lower, upper: this.upper };
  },
  load(st) {
    const okNum = (x) => x && typeof x.v === 'number' && Number.isFinite(x.v);
    for (const n of [2, 3, 4, 5, 6]) {
      const m = st.sim && st.sim[n], p = st.pol && st.pol[n];
      if (Array.isArray(m) && m.length === n && m.every((r) => Array.isArray(r) && r.length === n + 1 && r.every(okNum))) this.sim[n] = m;
      if (Array.isArray(p) && p.length === n + 1 && p.every(okNum)) this.pol[n] = p;
    }
    if ([2, 3, 4, 5, 6].includes(st.n)) this.n = st.n;
    if ([2, 3, 4, 5, 6].includes(st.deg)) this.deg = st.deg;
    if (eqnRowOk(st.eq)) { this.eqRow = st.eq; this.eqMath = st.eqMath !== false; }
    if (Number.isFinite(st.lower)) this.lower = st.lower;
    if (Number.isFinite(st.upper)) this.upper = st.upper;
  }
};
UI.apps.eqn = eqnApp;
