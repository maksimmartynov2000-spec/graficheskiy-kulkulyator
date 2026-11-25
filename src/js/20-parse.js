// ══════ 20-parse.js — разбор и вычисление выражений ══════
//
// Выражение — массив знаков (токенов): цифры, «+», «sin », «√» и т. д.
// parse(токены) → дерево; evalAst(дерево) → значение (число, список, матрица) с точными формами;
// compileAst(дерево) → быстрая функция без точных форм (для графиков, таблиц, поиска корней).

class LList { constructor(a) { this.a = a; } }
class Mat { constructor(m) { this.m = m; } }
const DONE = { done: true };
const isL = (x) => x instanceof LList;
const isM = (x) => x instanceof Mat;
const needNum = (x) => { if (isCx(x)) fail('Non-Real ERROR'); if (!isNum(x)) fail('Argument ERROR'); return x; };
const needScalar = (x) => { if (!isNum(x) && !isCx(x)) fail('Argument ERROR'); return x; };   // число, в том числе комплексное

const INVS = G.INV + ' ';
const PRE = new Map([
  ['sin ', 'sin'], ['cos ', 'cos'], ['tan ', 'tan'],
  ['sin' + INVS, 'asin'], ['cos' + INVS, 'acos'], ['tan' + INVS, 'atan'],
  ['sinh ', 'sinh'], ['cosh ', 'cosh'], ['tanh ', 'tanh'],
  ['sinh' + INVS, 'asinh'], ['cosh' + INVS, 'acosh'], ['tanh' + INVS, 'atanh'],
  ['log ', 'log'], ['ln ', 'ln'], [G.TEN, 'p10'], ['e^', 'exp'],
  ['√', 'sqrt'], [G.CBRT, 'cbrt'], [G.NEG, 'neg'],
  ['Abs ', 'abs'], ['Int ', 'int'], ['Frac ', 'frac'], ['Intg ', 'intg'], ['Not ', 'not'],
  ['Sum ', 'sum'], ['Prod ', 'prod'], ['Dim ', 'dim'], ['Cuml ', 'cuml'], ['Percent ', 'percent'], ['ΔList ', 'dlist'],
  ['Det ', 'det'], ['Trn ', 'trn'], ['Identity ', 'ident'], ['Ref ', 'ref'], ['Rref ', 'rref'],
  ['Arg ', 'arg'], ['Conjg ', 'conjg'], ['ReP ', 'rep'], ['ImP ', 'imp']
]);
const POST = new Map([[G.SQ, 'sq'], [G.INV, 'inv'], ['!', 'fact'], ['°', 'deg'], [G.RAD, 'rad'], [G.GRA, 'gra'], ['%', 'pct']]);
const FNA = new Map([
  ['logab(', 'logab'], ['Solve(', 'solve'], ['d/dx(', 'ddx'], ['d²/dx²(', 'd2dx'], ['∫(', 'int'], ['Σ(', 'sigma'],
  ['FMin(', 'fmin'], ['FMax(', 'fmax'], ['SolveN(', 'solven'],
  ['Pol(', 'pol'], ['Rec(', 'rec'],
  ['RanInt#(', 'ranint'], ['RanNorm#(', 'rannorm'], ['RanBin#(', 'ranbin'], ['RanList#(', 'ranlist'],
  ['GCD(', 'gcd'], ['LCM(', 'lcm'], ['MOD(', 'mod'], ['MOD_Exp(', 'modexp'], ['RndFix(', 'rndfix'],
  ['Seq(', 'seq'], ['Min(', 'min'], ['Max(', 'max'], ['Mean(', 'mean'], ['Median(', 'median'],
  ['StdDev(', 'stddev'], ['Variance(', 'variance'],
  ['Augment(', 'augment'], ['Fill(', 'fill'], ['SortA(', 'sorta'], ['SortD(', 'sortd'],
  ['List→Mat(', 'l2m'], ['Mat→List(', 'm2l'],
  ['P(', 'Pz'], ['Q(', 'Qz'], ['R(', 'Rz'],
  ['NormPD(', 'normpd'], ['NormCD(', 'normcd'], ['InvNormCD(', 'invnorm'],
  ['BinomialPD(', 'binpd'], ['BinomialCD(', 'bincd'], ['PoissonPD(', 'poipd'], ['PoissonCD(', 'poicd']
]);
const RELS = new Set(['=', '≠', '>', '<', '≥', '≤']);
// Величины из меню VARS (Xmin, x̄, Strt…): знак → функция, дающая текущее значение. Заполняется в 61-vars.js
const EXT_VARS = new Map();
const CX_POLAR = '▶r∠θ', CX_RECT = '▶a+bi';   // команды в конце выражения: показать ответ как r∠θ или как a+bi
let cxHint = null;                            // какой вид ответа запрошен в последнем расчёте ('polar' | 'rect')
const cxTakeHint = () => { const h = cxHint; cxHint = null; return h; };   // забрать запрос и сбросить его
const varOf = (t) => (t === 'x' ? 'X' : t !== undefined && Object.prototype.hasOwnProperty.call(VIX, t) ? t : undefined);
const isDigit = (t) => t.length === 1 && t >= '0' && t <= '9';

// ---------- лексемы: склеиваем цифры в числа ----------
function lex(toks) {
  const out = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (isDigit(t) || t === '.' || t === G.EE) {
      const start = i;
      let mant = '';
      while (i < toks.length && (isDigit(toks[i]) || toks[i] === '.')) mant += toks[i++];
      if (mant.split('.').length > 2 || mant === '.') fail('Syntax ERROR', i);
      let exp = 0;
      if (toks[i] === G.EE) {
        i++;
        let sg = 1;
        if (toks[i] === G.NEG || toks[i] === '−') { sg = -1; i++; } else if (toks[i] === '+') i++;
        let es = '';
        while (i < toks.length && isDigit(toks[i])) es += toks[i++];
        if (!es || es.length > 3) fail('Syntax ERROR', i);
        exp = sg * Number(es);
      }
      out.push({ n: numFromLiteral(mant, exp), pos: start });
    } else if (EXT_VARS.has(t)) {
      const v = Number(EXT_VARS.get(t)()) || 0;
      out.push({ n: R(v, Number.isInteger(v) && Math.abs(v) < 1e15 ? exInt(v) : null, false), pos: i });
      i++;
    } else { out.push({ t, pos: i }); i++; }
  }
  return out;
}

// ---------- разбор ----------
function parse(toks) {
  const lx = lex(toks);
  let i = 0;
  const pt = () => (i < lx.length ? lx[i].t : undefined);
  const pos = () => (i < lx.length ? lx[i].pos : toks.length);
  const syn = () => fail('Syntax ERROR', pos());
  const eat = (t) => { if (i < lx.length && lx[i].t === t) { i++; return true; } return false; };
  const atEnd = () => i >= lx.length || lx[i].t === '→' || lx[i].t === CX_POLAR || lx[i].t === CX_RECT;
  const close = (t) => { if (!eat(t) && !atEnd()) syn(); };

  const startsL5 = () => {
    if (i >= lx.length) return false;
    const t = lx[i].t;
    return t !== undefined && (varOf(t) !== undefined || t === 'π' || t === 'Ans' || t === G.YV || t === 'i');
  };
  const startsOperand = () => {
    if (i >= lx.length) return false;
    const l = lx[i];
    if (l.n) return true;
    const t = l.t;
    return varOf(t) !== undefined || t === 'π' || t === 'Ans' || t === G.YV || t === 'i' || t === '(' || t === '{' || t === '[' || t === 'List ' || t === 'Mat ' ||
      t === 'Ran# ' || PRE.has(t) || FNA.has(t);
  };

  function pRel() {
    let a = pAdd();
    while (RELS.has(pt())) { const op = lx[i++].t; a = { k: 'bin', op, a, b: pAdd() }; }
    return a;
  }
  function pAdd() {
    let a = pMul();
    for (;;) {
      const t = pt();
      if (t === '+' || t === '−') { i++; a = { k: 'bin', op: t, a, b: pMul() }; } else return a;
    }
  }
  function pMul() {
    let a = pNpr();
    for (;;) {
      const t = pt();
      if (t === '×' || t === '÷' || t === 'Int÷' || t === 'Rmdr') { i++; a = { k: 'bin', op: t, a, b: pNpr() }; } else return a;
    }
  }
  function pNpr() {
    let a = pImp7();
    for (;;) {
      const t = pt();
      if (t === G.PERM || t === G.COMB) { i++; a = { k: 'bin', op: t === G.PERM ? 'nPr' : 'nCr', a, b: pImp7() }; }
      else if (t === '∠') { i++; a = { k: 'bin', op: '∠', a, b: pImp7() }; }      // полярная запись r∠θ
      else return a;
    }
  }
  function pImp7() {                 // 2√3, 2(3), (1)(2), 2 sin 30
    let a = pPre();
    while (startsOperand()) a = { k: 'bin', op: '×', a, b: pPre() };
    return a;
  }
  function pPre() {                  // sin, √, (−) …
    const t = pt();
    if (t === '−') { i++; return { k: 'pre', f: 'neg', a: pPre() }; }
    if (t === '+') { i++; return pPre(); }
    if (t !== undefined && PRE.has(t)) { i++; return { k: 'pre', f: PRE.get(t), a: pPre() }; }
    return pImp5();
  }
  function pImp5() {                 // 2π, 3A, XY
    let a = pFrac();
    while (startsL5()) a = { k: 'bin', op: '×', a, b: pFrac() };
    return a;
  }
  function pFrac() {                 // a⌟b, a⌟b⌟c
    const a = pPow();
    if (pt() !== G.FRC) return a;
    i++;
    const b = pPow();
    if (pt() !== G.FRC) return { k: 'bin', op: '÷', a, b };
    i++;
    return { k: 'mixed', a, b, c: pPow() };
  }
  function pPow() {
    let a = pPost();
    for (;;) {
      const t = pt();
      if (t === '^') { i++; a = { k: 'bin', op: '^', a, b: pPowOp() }; }
      else if (t === G.XRT) { i++; a = { k: 'bin', op: 'xrt', a, b: pPowOp() }; }
      else return a;
    }
  }
  function pPowOp() {
    const t = pt();
    if (t === '−' || t === G.NEG) { i++; return { k: 'pre', f: 'neg', a: pPowOp() }; }
    if (t === '+') { i++; return pPowOp(); }
    if (t !== undefined && PRE.has(t)) { i++; return { k: 'pre', f: PRE.get(t), a: pPowOp() }; }
    return pPost();
  }
  function pPost() {
    let a = pPrim();
    for (;;) {
      const t = pt();
      if (t !== undefined && POST.has(t)) { i++; a = { k: 'post', f: POST.get(t), a }; }
      else if (t === '[' && (a.k === 'listref' || a.k === 'matref')) {
        i++;
        const p = pRel();
        let q = null;
        if (eat(',')) q = pRel();
        close(']');
        a = { k: 'idx', a, i: p, j: q };
      } else return a;
    }
  }
  function pPrim() {
    if (i >= lx.length) syn();
    const l = lx[i];
    if (l.n) { i++; return { k: 'num', v: l.n }; }
    const t = l.t;
    if (varOf(t) !== undefined) { i++; return { k: 'var', n: varOf(t) }; }
    if (t === 'π') { i++; return { k: 'pi' }; }
    if (t === 'i') { i++; return { k: 'imag' }; }
    if (t === 'Ans') { i++; return { k: 'ans' }; }
    if (t === '(') { i++; const e = pRel(); close(')'); return e; }
    if (t === '{') {
      i++;
      const items = [];
      if (pt() !== '}') { do { items.push(pRel()); } while (eat(',')); }
      close('}');
      return { k: 'list', items };
    }
    if (t === '[') {
      i++;
      const rows = [];
      while (eat('[')) {
        const row = [];
        do { row.push(pRel()); } while (eat(','));
        close(']');
        rows.push(row);
      }
      close(']');
      if (!rows.length || rows.some((r) => r.length !== rows[0].length)) syn();
      return { k: 'mat', rows };
    }
    if (t === 'List ') {
      i++;
      if (eat('Ans')) return { k: 'listref', n: 'Ans' };
      const q = lx[i];
      if (!q || !q.n || !Number.isInteger(q.n.v) || q.n.v < 1 || q.n.v > 26) syn();
      i++;
      return { k: 'listref', n: q.n.v };
    }
    if (t === 'Mat ') {
      i++;
      if (eat('Ans')) return { k: 'matref', n: 'Ans' };
      const q = pt();
      if (q === undefined || q.length !== 1 || q < 'A' || q > 'Z') syn();
      i++;
      return { k: 'matref', n: q };
    }
    if (t === G.YV) {
      i++;
      const q = lx[i];
      if (!q || !q.n || !Number.isInteger(q.n.v) || q.n.v < 1 || q.n.v > 20) syn();
      i++;
      let arg = null;
      if (eat('(')) { arg = pRel(); close(')'); }
      return { k: 'yfn', n: q.n.v, arg };
    }
    if (t === 'Ran# ') { i++; if (i < lx.length && lx[i].n) i++; return { k: 'call', f: 'ran', args: [] }; }
    if (FNA.has(t)) {
      i++;
      const args = [];
      if (pt() !== ')' && !atEnd()) { do { args.push(pRel()); } while (eat(',')); }
      close(')');
      return { k: 'call', f: FNA.get(t), args };
    }
    return syn();
  }

  if (!lx.length) syn();
  let e = pRel();
  if (pt() === CX_POLAR || pt() === CX_RECT) { e = { k: 'cxform', f: pt() === CX_POLAR ? 'polar' : 'rect', a: e }; i++; }
  if (eat('→')) {
    const tg = pPost();
    if (i < lx.length || !['var', 'listref', 'matref', 'idx'].includes(tg.k)) syn();
    return { k: 'sto', a: e, tg };
  }
  if (i < lx.length) syn();
  return e;
}

// ---------- точные значения тригонометрии (углы, кратные 15°) ----------
const SIN15 = [[], [[-1, 4, 2], [1, 4, 6]], [[1, 2, 1]], [[1, 2, 2]], [[1, 2, 3]], [[1, 4, 2], [1, 4, 6]], [[1, 1, 1]]];
function sinEx(k) {
  k = ((k % 24) + 24) % 24;
  let s = 1;
  if (k > 12) { k -= 12; s = -1; }
  if (k > 6) k = 12 - k;
  return { t: SIN15[k].map(([n, d, r]) => [s * n, d, r]), pi: false };
}
function deg15(x) {
  if (!x.ex) return null;
  let e = null;
  if (S.angle === 'Deg') e = exIsRat(x.ex) ? x.ex : null;
  else if (S.angle === 'Rad') e = x.ex.pi || !x.ex.t.length ? exMul({ t: x.ex.t, pi: false }, exInt(180)) : null;
  else e = exIsRat(x.ex) ? exMul(x.ex, exRat(9, 10)) : null;
  if (!e || !exIsInt(e)) return null;
  const n = e.t.length ? e.t[0][0] : 0;
  return n % 15 === 0 ? n / 15 : null;
}
function trigExact(f, x) {
  const k = deg15(x);
  if (k === null) return null;
  const s = sinEx(k), c = sinEx(k + 6);
  if (f === 'sin') return RX(s, x.dec);
  if (f === 'cos') return RX(c, x.dec);
  if (!c.t.length) fail('Ma ERROR');
  const t = exDiv(s, c);
  return t ? RX(t, x.dec) : null;
}
function atrigExact(f, x) {
  if (!x.ex) return null;
  const r = f === 'asin' ? Math.asin(x.v) : f === 'acos' ? Math.acos(x.v) : Math.atan(x.v);
  if (!Number.isFinite(r)) return null;
  const k = Math.round(r * 12 / Math.PI);
  if (Math.abs(r * 12 / Math.PI - k) > 1e-9) return null;
  const s = sinEx(k), c = sinEx(k + 6);
  const back = f === 'asin' ? s : f === 'acos' ? c : (c.t.length ? exDiv(s, c) : null);
  if (!back || !exEq(back, x.ex)) return null;
  const deg = k * 15;
  if (S.angle === 'Deg') return R(deg, exInt(deg), x.dec);
  if (S.angle === 'Rad') { const m = mkTerm(deg, 180, 1); return RX(m[0] ? { t: [m], pi: true } : EX0(), x.dec); }
  return RX(exRat(deg * 10, 9), x.dec);
}
function angMark(f, x) {             // 30° в текущих единицах угла
  const cur = S.angle === 'Deg' ? 'deg' : S.angle === 'Rad' ? 'rad' : 'gra';
  if (f === cur) return x;
  let ex = null;
  if (x.ex) {
    let dg = null;
    if (f === 'deg') dg = x.ex;
    else if (f === 'gra') dg = exMul(x.ex, exRat(9, 10));
    else if (x.ex.pi || !x.ex.t.length) dg = exMul({ t: x.ex.t, pi: false }, exInt(180));
    if (dg) ex = cur === 'deg' ? dg : cur === 'gra' ? exMul(dg, exRat(10, 9)) : (exIsRat(dg) ? exMul(dg, { t: [[1, 180, 1]], pi: true }) : null);
  }
  return ex ? RX(ex, x.dec) : RF(F1[f](x.v), false, x.dec);
}

// ---------- функции одного и двух чисел (с точными формами) ----------
function s1(f, x) {
  if (isCx(x)) return cx1(f, x);
  switch (f) {
    case 'neg': return sNeg(x);
    case 'sqrt': if (x.v < 0 && S.cplx !== 'Real') return cx1(f, x); return sSqrt(x);
    case 'arg': case 'conjg': case 'rep': case 'imp': return cx1(f, x);
    case 'abs': return x.v < 0 ? sNeg(x) : x;
    case 'sq': return sMul(x, x);
    case 'inv': return sDiv(RI(1), x);
    case 'pct': return sDiv(x, RI(100));
    case 'int': case 'intg': {
      const t = f === 'int' ? Math.trunc(x.v) : Math.floor(x.v);
      return R(t, x.ex ? exInt(t) : null, x.dec);
    }
    case 'frac':
      if (x.ex && exIsRat(x.ex)) return sSub(x, RI(Math.trunc(x.v)));
      break;
    case 'sin': case 'cos': case 'tan': { const e = trigExact(f, x); if (e) return e; break; }
    case 'asin': case 'acos': case 'atan': { const e = atrigExact(f, x); if (e) return e; break; }
    case 'deg': case 'rad': case 'gra': return angMark(f, x);
    case 'log': case 'ln':
      if (x.v < 0) { if (S.cplx !== 'Real') return cx1(f, x); fail('Non-Real ERROR'); }
      break;
    default:
  }
  const fn = F1[f];
  if (!fn) fail('Syntax ERROR');
  return RF(fn(x.v), !!x.ex, x.dec);
}
function s2(op, a, b) {
  if (isCx(a) || isCx(b) || op === '∠') return cx2(op, a, b);
  // в комплексном режиме степень отрицательного числа с нецелым показателем — главное комплексное значение
  if (S.cplx !== 'Real' && ((op === '^' && a.v < 0 && !Number.isInteger(b.v)) || (op === 'xrt' && b.v < 0 && !(Number.isInteger(a.v) && a.v % 2)))) return cx2(op, a, b);
  switch (op) {
    case '+': return sAdd(a, b);
    case '−': return sSub(a, b);
    case '×': return sMul(a, b);
    case '÷': return sDiv(a, b);
    case '^': return sPow(a, b);
    case 'xrt': return sPow(b, sDiv(RI(1), a));
    default:
  }
  const fn = F2[op];
  if (!fn) fail('Syntax ERROR');
  if (RELS.has(op)) return RI(fn(a.v, b.v));
  return RF(fn(a.v, b.v), !!(a.ex && b.ex), a.dec || b.dec);
}

// ---------- списки ----------
// need — проверка элементов: needNum (только вещественные, по умолчанию) или needScalar (и комплексные)
function zipL(a, b, f, need) {
  need = need || needNum;
  if (isL(a) && isL(b)) {
    if (a.a.length !== b.a.length) fail('Dimension ERROR');
    return new LList(a.a.map((x, i) => f(need(x), need(b.a[i]))));
  }
  if (isL(a)) { need(b); return new LList(a.a.map((x) => f(need(x), b))); }
  if (isL(b)) { need(a); return new LList(b.a.map((y) => f(a, need(y)))); }
  return f(need(a), need(b));
}
const needList = (x) => {
  if (!isL(x)) fail('Argument ERROR');
  if (x.a.some(isCx)) fail('Complex Number In List');
  return x.a;
};
const fvals = (a) => a.map((x) => x.v);

function listStats(xs, fs) {          // среднее, медиана и т. д. с частотами
  const n = fs ? fs.reduce((p, q) => p + q, 0) : xs.length;
  if (!xs.length || !(n > 0)) fail('Ma ERROR');
  if (fs && (fs.length !== xs.length || fs.some((q) => q < 0))) fail('Dimension ERROR');
  let sum = 0, sum2 = 0;
  xs.forEach((x, i) => { const w = fs ? fs[i] : 1; sum += x * w; sum2 += x * x * w; });
  const mean = sum / n;
  let dev = 0;
  xs.forEach((x, i) => { dev += (x - mean) ** 2 * (fs ? fs[i] : 1); });
  return { n, sum, sum2, mean, dev };
}
function listMedian(xs, fs) {
  const p = xs.map((x, i) => [x, fs ? fs[i] : 1]).filter((q) => q[1] > 0).sort((a, b) => a[0] - b[0]);
  const n = p.reduce((s, q) => s + q[1], 0);
  if (!(n > 0)) fail('Ma ERROR');
  const at = (k) => { let c = 0; for (const [x, w] of p) { c += w; if (k <= c) return x; } return p[p.length - 1][0]; };
  return Number.isInteger(n) && n % 2 === 0 ? (at(n / 2) + at(n / 2 + 1)) / 2 : at(Math.ceil(n / 2));
}

// ---------- матрицы ----------
const mDim = (A) => [A.m.length, A.m[0].length];
function matAdd(A, B, f) {
  const [r, c] = mDim(A), [r2, c2] = mDim(B);
  if (r !== r2 || c !== c2) fail('Dimension ERROR');
  return new Mat(A.m.map((row, i) => row.map((x, j) => f(x, B.m[i][j]))));
}
function matMul(A, B) {
  const [r, c] = mDim(A), [r2, c2] = mDim(B);
  if (c !== r2) fail('Dimension ERROR');
  const m = [];
  for (let i = 0; i < r; i++) {
    m.push([]);
    for (let j = 0; j < c2; j++) {
      let s = RI(0);
      for (let k = 0; k < c; k++) s = s2('+', s, s2('×', A.m[i][k], B.m[k][j]));
      m[i].push(s);
    }
  }
  return new Mat(m);
}
const matIdent = (n) => new Mat(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => RI(i === j ? 1 : 0))));
// Приведение к ступенчатому виду; возвращает {m, det, rank}
function matElim(A, reduce, ncols) {
  if (A.m.some((r) => r.some(isCx))) fail('Complex Number In Matrix');
  const m = A.m.map((r) => r.slice());
  const rows = m.length, cols = m[0].length;
  let det = RI(1), row = 0;
  for (let col = 0; col < (ncols || cols) && row < rows; col++) {
    let p = -1, best = 0;
    for (let i = row; i < rows; i++) if (Math.abs(m[i][col].v) > best) { best = Math.abs(m[i][col].v); p = i; }
    if (p < 0) { det = RI(0); continue; }
    if (p !== row) { [m[p], m[row]] = [m[row], m[p]]; det = sNeg(det); }
    const pv = m[row][col];
    det = sMul(det, pv);
    m[row] = m[row].map((x) => sDiv(x, pv));
    for (let i = reduce ? 0 : row + 1; i < rows; i++) {
      if (i === row || m[i][col].v === 0) continue;
      const k = m[i][col];
      m[i] = m[i].map((x, j) => sSub(x, sMul(k, m[row][j])));
    }
    row++;
  }
  if (row < rows) det = RI(0);
  return { m, det, rank: row };
}
function matInv(A) {
  const [r, c] = mDim(A);
  if (r !== c) fail('Dimension ERROR');
  const aug = new Mat(A.m.map((row, i) => [...row, ...matIdent(r).m[i]]));
  const e = matElim(aug, true, r);
  if (e.rank < r) fail('Ma ERROR');
  return new Mat(e.m.map((row) => row.slice(r)));
}
function matPow(A, k) {
  const [r, c] = mDim(A);
  if (r !== c) fail('Dimension ERROR');
  if (!Number.isInteger(k) || Math.abs(k) > 1000) fail('Ma ERROR');
  if (k < 0) { A = matInv(A); k = -k; }
  let res = matIdent(r);
  while (k > 0) { if (k & 1) res = matMul(res, A); k >>= 1; if (k) A = matMul(A, A); }
  return res;
}

// ---------- вычисление ----------
const getVar = (n) => mem.vars[n] || RI(0);
function setVar(n, x) { mem.vars[n] = x; fv[VIX[n]] = isCx(x) ? NaN : x.v; }
function getList(n) {
  const a = n === 'Ans' ? mem.listAns : mem.lists[n - 1];
  if (!a || !a.length) fail('Dimension ERROR');
  return new LList(a.slice());
}
function getMat(n) {
  const a = n === 'Ans' ? mem.matAns : mem.mats[n];
  if (!a) fail('Dimension ERROR');
  return new Mat(a.map((r) => r.slice()));
}
// Функция одной переменной из дерева: (x) → число
function fnOf(ast, name) {
  const f = compileAst(ast), ix = VIX[name || 'X'];
  return (x) => { const sv = fv[ix]; fv[ix] = x; const y = f(); fv[ix] = sv; return y; };
}
const eqAst = (a) => (a.k === 'bin' && a.op === '=' ? { k: 'bin', op: '−', a: a.a, b: a.b } : a);
const ran10 = () => Math.floor(Math.random() * 1e10) / 1e10;
function ranNorm() { let u = 0; while (u === 0) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); }

let yfnHook = () => null;             // задаётся в 65-func.js: (n) → функция от X или null

function evalAst(n) {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': return getVar(n.n);
    case 'pi': return RX(exPi());
    case 'ans': return mem.ans || RI(0);
    case 'imag': return CX(RI(0), RI(1));
    case 'cxform': { const v = evalAst(n.a); cxHint = n.f; return v; }
    case 'pre': return evPre(n.f, evalAst(n.a));
    case 'post': {
      const x = evalAst(n.a);
      if (isM(x)) {
        if (n.f === 'sq') return matMul(x, x);
        if (n.f === 'inv') return matInv(x);
        fail('Argument ERROR');
      }
      return isL(x) ? new LList(x.a.map((q) => s1(n.f, q))) : s1(n.f, needScalar(x));
    }
    case 'bin': return evBin(n.op, evalAst(n.a), evalAst(n.b));
    case 'mixed': {
      const a = needNum(evalAst(n.a)), b = needNum(evalAst(n.b)), c = needNum(evalAst(n.c));
      return a.v < 0 ? sSub(a, sDiv(b, c)) : sAdd(a, sDiv(b, c));
    }
    case 'list': return new LList(n.items.map((q) => needScalar(evalAst(q))));
    case 'mat': return new Mat(n.rows.map((r) => r.map((q) => needScalar(evalAst(q)))));
    case 'listref': return getList(n.n);
    case 'matref': return getMat(n.n);
    case 'idx': {
      const b = evalAst(n.a), p = needNum(evalAst(n.i)).v;
      if (isL(b)) {
        if (n.j || !Number.isInteger(p) || p < 1 || p > b.a.length) fail('Dimension ERROR');
        return b.a[p - 1];
      }
      const q = n.j ? needNum(evalAst(n.j)).v : NaN;
      if (!isM(b) || !Number.isInteger(p) || !Number.isInteger(q) || p < 1 || q < 1 || p > b.m.length || q > b.m[0].length) fail('Dimension ERROR');
      return b.m[p - 1][q - 1];
    }
    case 'yfn': {
      const f = yfnHook(n.n);
      if (!f) fail('Undefined');
      const sv = fv[VIX.X], x = n.arg ? needNum(evalAst(n.arg)).v : sv;
      try { return RF(f(x), false, false); } finally { fv[VIX.X] = sv; }
    }
    case 'sto': {
      const v = evalAst(n.a), tg = n.tg;
      if (tg.k === 'var') setVar(tg.n, needScalar(v));
      else if (tg.k === 'listref') {
        if (!isL(v) || tg.n === 'Ans') fail('Syntax ERROR');
        if (v.a.some(isCx)) fail('Complex Number In List');        // редактор списков работает только с вещественными
        mem.lists[tg.n - 1] = v.a.slice();
      } else if (tg.k === 'matref') {
        if (!isM(v) || tg.n === 'Ans') fail('Syntax ERROR');
        if (v.m.some((r) => r.some(isCx))) fail('Complex Number In Matrix');
        mem.mats[tg.n] = v.m.map((r) => r.slice());
      } else {
        const p = needNum(evalAst(tg.i)).v;
        needNum(v);
        if (tg.a.k === 'listref' && tg.a.n !== 'Ans') {
          const a = mem.lists[tg.a.n - 1] || (mem.lists[tg.a.n - 1] = []);
          if (tg.j || !Number.isInteger(p) || p < 1 || p > a.length + 1) fail('Dimension ERROR');
          a[p - 1] = v;
        } else if (tg.a.k === 'matref' && mem.mats[tg.a.n]) {
          const a = mem.mats[tg.a.n], q = tg.j ? needNum(evalAst(tg.j)).v : NaN;
          if (!Number.isInteger(p) || !Number.isInteger(q) || p < 1 || q < 1 || p > a.length || q > a[0].length) fail('Dimension ERROR');
          a[p - 1][q - 1] = v;
        } else fail('Syntax ERROR');
      }
      return v;
    }
    case 'call': return evCall(n);
    default: return fail('Syntax ERROR');
  }
}

function evPre(f, x) {
  switch (f) {
    case 'sum': case 'prod': {
      const a = needList(x);
      return a.reduce((p, q) => (f === 'sum' ? sAdd(p, q) : sMul(p, q)), RI(f === 'sum' ? 0 : 1));
    }
    case 'dim':
      if (isM(x)) return new LList(mDim(x).map(RI));
      if (isL(x)) return RI(x.a.length);
      return RI(needList(x).length);
    case 'cuml': { let s = RI(0); return new LList(needList(x).map((q) => (s = sAdd(s, q)))); }
    case 'percent': { const a = needList(x), s = a.reduce((p, q) => sAdd(p, q), RI(0)); return new LList(a.map((q) => sDiv(sMul(q, RI(100)), s))); }
    case 'dlist': { const a = needList(x); if (a.length < 2) fail('Dimension ERROR'); return new LList(a.slice(1).map((q, i) => sSub(q, a[i]))); }
    case 'det': { if (!isM(x)) fail('Argument ERROR'); const [r, c] = mDim(x); if (r !== c) fail('Dimension ERROR'); return matElim(x, false).det; }
    case 'trn': if (!isM(x)) fail('Argument ERROR'); return new Mat(x.m[0].map((_, j) => x.m.map((r) => r[j])));
    case 'ident': { const k = needNum(x).v; if (!Number.isInteger(k) || k < 1 || k > 20) fail('Argument ERROR'); return matIdent(k); }
    case 'ref': case 'rref': if (!isM(x)) fail('Argument ERROR'); return new Mat(matElim(x, f === 'rref').m);
    default:
  }
  if (isM(x)) {
    if (f === 'neg') return new Mat(x.m.map((r) => r.map((q) => s1('neg', q))));
    if (f === 'abs') return new Mat(x.m.map((r) => r.map((q) => s1('abs', q))));
    fail('Argument ERROR');
  }
  return isL(x) ? new LList(x.a.map((q) => s1(f, q))) : s1(f, needScalar(x));
}

function evBin(op, a, b) {
  if (isM(a) || isM(b)) {
    if (isL(a) || isL(b)) fail('Argument ERROR');
    if (isM(a) && isM(b)) {
      if (op === '+' || op === '−') return matAdd(a, b, (x, y) => s2(op, x, y));
      if (op === '×') return matMul(a, b);
      fail('Argument ERROR');
    }
    if (isM(a)) {
      if (op === '×' || op === '÷') { needScalar(b); return new Mat(a.m.map((r) => r.map((x) => s2(op, x, b)))); }
      if (op === '^') return matPow(a, needNum(b).v);
      fail('Argument ERROR');
    }
    if (op === '×') { needScalar(a); return new Mat(b.m.map((r) => r.map((x) => s2('×', a, x)))); }
    fail('Argument ERROR');
  }
  return zipL(a, b, (x, y) => s2(op, x, y), needScalar);
}

function evCall(n) {
  const A = n.args, f = n.f;
  const argc = (lo, hi) => { if (A.length < lo || A.length > (hi || lo)) fail('Syntax ERROR'); };
  const val = (i) => evalAst(A[i]);
  const num = (i) => needNum(evalAst(A[i]));
  const fl = (i) => num(i).v;
  const int = (i) => { const v = fl(i); if (!Number.isInteger(v)) fail('Argument ERROR'); return v; };
  const allEx = (...xs) => xs.every((x) => !!x.ex);
  const anyDec = (...xs) => xs.some((x) => x.dec);
  switch (f) {
    case 'logab': {
      argc(2);
      const a = num(0), b = num(1);
      if (a.v <= 0 || a.v === 1 || b.v <= 0) fail('Ma ERROR');
      return RF(r15(Math.log(b.v) / Math.log(a.v)), allEx(a, b), anyDec(a, b));
    }
    case 'gcd': case 'lcm': {
      argc(2, 6);
      const g = f === 'gcd' ? fGcd : fLcm;
      let r = val(0);
      for (let i = 1; i < A.length; i++) r = zipL(r, val(i), (x, y) => RF(g(x.v, y.v), true, false));
      return r;
    }
    case 'mod': { argc(2); const a = fl(0), b = fl(1); if (!Number.isInteger(a) || !Number.isInteger(b) || b === 0) fail('Ma ERROR'); return RI(a - b * Math.floor(a / b)); }
    case 'modexp': {
      argc(3);
      const a = int(0), p = int(1), m = int(2);
      if (p < 0 || m <= 0) fail('Ma ERROR');
      let r = 1n, b = BigInt(a) % BigInt(m), e = BigInt(p);
      const M = BigInt(m);
      if (b < 0n) b += M;
      while (e > 0n) { if (e & 1n) r = r * b % M; b = b * b % M; e >>= 1n; }
      return RI(Number(r % M));
    }
    case 'rndfix': { argc(1, 2); const x = fl(0), k = A.length > 1 ? int(1) : S.dispN; if (k < 0 || k > 9) fail('Argument ERROR'); return R(Number(x.toFixed(k)), null, true); }
    case 'pol': { argc(2); const x = fl(0), y = fl(1); return new LList([RF(Math.hypot(x, y), false, false), RF(fAng(Math.atan2(y, x)), false, false)]); }
    case 'rec': { argc(2); const r = fl(0), t = fl(1); return new LList([RF(r15(r * fCos(t)), false, false), RF(r15(r * fSin(t)), false, false)]); }
    case 'ran': return R(ran10(), null, true);
    case 'ranint': {
      argc(2, 3);
      const a = int(0), b = int(1), k = A.length > 2 ? int(2) : 0;
      if (a > b || k < 0 || k > 999) fail('Argument ERROR');
      const one = () => RI(a + Math.floor(Math.random() * (b - a + 1)));
      return k ? new LList(Array.from({ length: k }, one)) : one();
    }
    case 'rannorm': {
      argc(2, 3);
      const sd = fl(0), mu = fl(1), k = A.length > 2 ? int(2) : 0;
      if (sd <= 0 || k < 0 || k > 999) fail('Argument ERROR');
      const one = () => R(Number((mu + sd * ranNorm()).toPrecision(10)), null, true);
      return k ? new LList(Array.from({ length: k }, one)) : one();
    }
    case 'ranbin': {
      argc(2, 3);
      const m = int(0), p = fl(1), k = A.length > 2 ? int(2) : 0;
      if (m < 1 || m > 100000 || p < 0 || p > 1 || k < 0 || k > 999) fail('Argument ERROR');
      const one = () => { let c = 0; for (let i = 0; i < m; i++) if (Math.random() < p) c++; return RI(c); };
      return k ? new LList(Array.from({ length: k }, one)) : one();
    }
    case 'ranlist': { argc(1); const k = int(0); if (k < 1 || k > 999) fail('Argument ERROR'); return new LList(Array.from({ length: k }, () => R(ran10(), null, true))); }
    case 'seq': {
      argc(5);
      if (A[1].k !== 'var') fail('Syntax ERROR');
      const name = A[1].n, a = num(2), b = num(3), st = num(4);
      if (st.v === 0 || (b.v - a.v) / st.v > 998) fail('Ma ERROR');
      const saved = mem.vars[name], out = [];
      try {
        for (let x = a; st.v > 0 ? x.v <= b.v + 1e-12 * Math.abs(b.v) : x.v >= b.v - 1e-12 * Math.abs(b.v); x = sAdd(x, st)) {
          setVar(name, x);
          out.push(needScalar(evalAst(A[0])));
        }
      } finally { setVar(name, saved || RI(0)); if (!saved) delete mem.vars[name]; }
      if (!out.length) fail('Ma ERROR');
      return new LList(out);
    }
    case 'min': case 'max': {
      argc(1, 2);
      const pick = (x, y) => ((f === 'min') === (x.v <= y.v) ? x : y);
      if (A.length === 1) { const a = needList(val(0)); if (!a.length) fail('Dimension ERROR'); return a.reduce(pick); }
      return zipL(val(0), val(1), pick);
    }
    case 'mean': case 'median': case 'stddev': case 'variance': {
      argc(1, 2);
      const xs = fvals(needList(val(0))), fs = A.length > 1 ? fvals(needList(val(1))) : null;
      if (f === 'median') return RF(listMedian(xs, fs), true, false);
      const st = listStats(xs, fs);
      if (f === 'mean') return RF(r15(st.mean), false, false);
      if (st.n < 2) fail('Ma ERROR');
      const v = st.dev / (st.n - 1);
      return RF(r15(f === 'variance' ? v : Math.sqrt(v)), false, false);
    }
    case 'augment': {
      argc(2);
      const a = val(0), b = val(1);
      if (isL(a) && isL(b)) return new LList([...a.a, ...b.a]);
      if (isM(a) && isM(b)) { if (a.m.length !== b.m.length) fail('Dimension ERROR'); return new Mat(a.m.map((r, i) => [...r, ...b.m[i]])); }
      return fail('Argument ERROR');
    }
    case 'fill': {
      argc(2);
      const x = num(0), tg = A[1];
      if (tg.k === 'listref' && tg.n !== 'Ans') { const a = mem.lists[tg.n - 1]; if (!a || !a.length) fail('Dimension ERROR'); a.fill(x); return DONE; }
      if (tg.k === 'matref' && mem.mats[tg.n]) { mem.mats[tg.n] = mem.mats[tg.n].map((r) => r.map(() => x)); return DONE; }
      return fail('Argument ERROR');
    }
    case 'sorta': case 'sortd': {
      argc(1, 6);
      if (A.some((q) => q.k !== 'listref' || q.n === 'Ans')) fail('Argument ERROR');
      const ls = A.map((q) => mem.lists[q.n - 1] || []);
      if (!ls[0].length || ls.some((l) => l.length !== ls[0].length)) fail('Dimension ERROR');
      const ord = ls[0].map((_, i) => i).sort((p, q) => (f === 'sorta' ? 1 : -1) * (ls[0][p].v - ls[0][q].v) || p - q);
      A.forEach((q, k) => { mem.lists[q.n - 1] = ord.map((i) => ls[k][i]); });
      return DONE;
    }
    case 'l2m': {
      argc(1, 26);
      const ls = A.map((_, i) => needList(val(i)));
      if (ls.some((l) => l.length !== ls[0].length)) fail('Dimension ERROR');
      return new Mat(ls[0].map((_, r) => ls.map((l) => l[r])));
    }
    case 'm2l': {
      argc(2);
      const m = val(0), c = int(1);
      if (!isM(m) || c < 1 || c > m.m[0].length) fail('Dimension ERROR');
      return new LList(m.m.map((r) => r[c - 1]));
    }
    case 'Pz': argc(1); return RF(r15(normCdf(fl(0))), false, true);
    case 'Qz': argc(1); return RF(r15(Math.abs(normCdf(fl(0)) - 0.5)), false, true);
    case 'Rz': argc(1); return RF(r15(1 - normCdf(fl(0))), false, true);
    case 'normpd': { argc(1, 3); const sd = A.length > 1 ? fl(1) : 1, mu = A.length > 2 ? fl(2) : 0; if (sd <= 0) fail('Ma ERROR'); return RF(r15(normPdf((fl(0) - mu) / sd) / sd), false, true); }
    case 'normcd': {
      argc(2, 4);
      const sd = A.length > 2 ? fl(2) : 1, mu = A.length > 3 ? fl(3) : 0;
      if (sd <= 0) fail('Ma ERROR');
      const lo = (fl(0) - mu) / sd, hi = (fl(1) - mu) / sd;
      return RF(r15(lo > 0 ? normCdf(-lo) - normCdf(-hi) : normCdf(hi) - normCdf(lo)), false, true);
    }
    case 'invnorm': { argc(1, 3); const sd = A.length > 1 ? fl(1) : 1, mu = A.length > 2 ? fl(2) : 0; const z = normInv(fl(0)); if (sd <= 0) fail('Ma ERROR'); return RF(r15(mu + sd * z), false, true); }
    case 'binpd': { argc(3); return RF(binomPd(int(0), int(1), fl(2)), false, true); }
    case 'bincd': {
      argc(3, 4);
      return A.length === 3 ? RF(binomCd(0, int(0), int(1), fl(2)), false, true) : RF(binomCd(int(0), int(1), int(2), fl(3)), false, true);
    }
    case 'poipd': argc(2); return RF(r15(poisPd(int(0), fl(1))), false, true);
    case 'poicd': argc(2, 3); return A.length === 2 ? RF(poisCd(0, int(0), fl(1)), false, true) : RF(poisCd(int(0), int(1), fl(2)), false, true);
    case 'ddx': argc(2); return RF(r15(nDeriv(fnOf(A[0]), fl(1))), true, false);
    case 'd2dx': argc(2); return RF(nDeriv2(fnOf(A[0]), fl(1)), true, false);
    case 'int': { argc(3, 4); const a = fl(1), b = fl(2); return RF(Number(nInt(fnOf(A[0]), a, b).toPrecision(12)), true, false); }
    case 'sigma': {
      argc(4, 5);
      if (A[1].k !== 'var') fail('Syntax ERROR');
      const a = int(2), b = int(3), st = A.length > 4 ? int(4) : 1;
      if (st <= 0 || b < a || (b - a) / st > 1e6) fail('Ma ERROR');
      // точный счёт, пока слагаемых немного
      if ((b - a) / st <= 300) {
        const name = A[1].n, saved = mem.vars[name];
        let s = RI(0);
        try {
          for (let k = a; k <= b; k += st) { setVar(name, RI(k)); s = s2('+', s, needScalar(evalAst(A[0]))); }
        } finally { setVar(name, saved || RI(0)); if (!saved) delete mem.vars[name]; }
        return s;
      }
      const g = fnOf(A[0], A[1].n);
      let s = 0;
      for (let k = a; k <= b; k += st) s += g(k);
      return RF(s, false, false);
    }
    case 'fmin': case 'fmax': {
      argc(3, 4);
      const g = fnOf(A[0]), a = fl(1), b = fl(2), kind = f === 'fmax' ? 1 : -1;
      if (!(a < b)) fail('Ma ERROR');
      // кандидаты: внутренние экстремумы и концы отрезка
      const cand = [...scanExtrema(g, a, b, kind, 400), a, b].filter((x) => Number.isFinite(g(x)));
      if (!cand.length) fail('Ma ERROR');
      const x = cand.reduce((p, q) => (kind * g(q) > kind * g(p) ? q : p));
      return new LList([RF(x, false, false), RF(g(x), false, false)]);
    }
    case 'solve': {
      argc(2, 4);
      const g = fnOf(eqAst(A[0]));
      const x = A.length >= 4 ? nSolve(g, fl(1), fl(2), fl(3)) : nSolve(g, fl(1));
      if (!Number.isFinite(x)) fail('Not Found');
      return RF(x, true, false);
    }
    case 'solven': {
      argc(1, 4);
      let name = 'X', k = 1;
      if (A.length > 1 && A[1].k === 'var') { name = A[1].n; k = 2; }
      const g = fnOf(eqAst(A[0]), name);
      const lo = A.length > k ? fl(k) : -100, hi = A.length > k + 1 ? fl(k + 1) : 100;
      const rs = scanRoots(g, lo, hi, 8000).slice(0, 10);
      if (!rs.length) fail('Not Found');
      return new LList(rs.map((x) => RF(x, true, false)));
    }
    default: return fail('Syntax ERROR');
  }
}

// ---------- быстрый счёт: дерево → функция без аргументов, переменные берутся из fv ----------
function compileAst(n) {
  switch (n.k) {
    case 'num': { const v = n.v.v; return () => v; }
    case 'var': { const ix = VIX[n.n]; return () => fv[ix]; }
    case 'pi': return () => Math.PI;
    case 'ans': return () => (mem.ans ? (isCx(mem.ans) ? NaN : mem.ans.v) : 0);
    case 'pre': case 'post': {
      const f = F1[n.f], a = compileAst(n.a);
      if (!f) fail('Syntax ERROR');
      return () => f(a());
    }
    case 'mixed': {
      const a = compileAst(n.a), b = compileAst(n.b), c = compileAst(n.c);
      return () => { const w = a(), q = b() / c(); return w < 0 ? w - q : w + q; };
    }
    case 'bin': {
      const a = compileAst(n.a), b = compileAst(n.b);
      switch (n.op) {
        case '+': return () => a() + b();
        case '−': return () => a() - b();
        case '×': return () => a() * b();
        case '÷': return () => { const d = b(); return d === 0 ? NaN : a() / d; };
        default: {
          const f = F2[n.op];
          if (!f) fail('Syntax ERROR');
          return () => f(a(), b());
        }
      }
    }
    case 'yfn': {
      const k = n.n, arg = n.arg ? compileAst(n.arg) : null, ix = VIX.X;
      let depth = 0;
      return () => {
        const f = yfnHook(k);
        if (!f || depth > 8) return NaN;
        const sv = fv[ix];
        depth++;
        try { return f(arg ? arg() : sv); } finally { depth--; fv[ix] = sv; }
      };
    }
    case 'call': {
      const A = n.args, c = (i) => compileAst(A[i]);
      const need = (lo, hi) => { if (A.length < lo || A.length > (hi || lo)) fail('Syntax ERROR'); };
      switch (n.f) {
        case 'logab': { need(2); const a = c(0), b = c(1); return () => { const p = a(), q = b(); return p > 0 && p !== 1 && q > 0 ? Math.log(q) / Math.log(p) : NaN; }; }
        case 'gcd': { need(2); const a = c(0), b = c(1); return () => fGcd(a(), b()); }
        case 'lcm': { need(2); const a = c(0), b = c(1); return () => fLcm(a(), b()); }
        case 'mod': { need(2); const a = c(0), b = c(1); return () => { const p = a(), q = b(); return q === 0 ? NaN : p - q * Math.floor(p / q); }; }
        case 'rndfix': { need(2); const a = c(0), b = c(1); return () => Number(a().toFixed(Math.max(0, Math.min(9, b())))); }
        case 'ran': return ran10;
        case 'ranint': { need(2); const a = c(0), b = c(1); return () => { const p = a(), q = b(); return p + Math.floor(Math.random() * (q - p + 1)); }; }
        case 'Pz': { need(1); const a = c(0); return () => normCdf(a()); }
        case 'Qz': { need(1); const a = c(0); return () => Math.abs(normCdf(a()) - 0.5); }
        case 'Rz': { need(1); const a = c(0); return () => 1 - normCdf(a()); }
        case 'normpd': { need(1, 3); const a = c(0), s = A.length > 1 ? c(1) : () => 1, m = A.length > 2 ? c(2) : () => 0; return () => { const sd = s(); return normPdf((a() - m()) / sd) / sd; }; }
        case 'normcd': { need(2, 4); const a = c(0), b = c(1), s = A.length > 2 ? c(2) : () => 1, m = A.length > 3 ? c(3) : () => 0; return () => { const sd = s(), mu = m(); return normCdf((b() - mu) / sd) - normCdf((a() - mu) / sd); }; }
        case 'binpd': { need(3); const a = c(0), b = c(1), p = c(2); return () => binomPd(Math.round(a()), b(), p()); }
        case 'ddx': { need(2); const g = fnOf(A[0]), a = c(1); return () => nDeriv(g, a()); }
        case 'd2dx': { need(2); const g = fnOf(A[0]), a = c(1); return () => nDeriv2(g, a()); }
        case 'int': { need(3, 4); const g = fnOf(A[0]), a = c(1), b = c(2); return () => nInt(g, a(), b(), 1e-9); }
        case 'sigma': {
          need(4, 5);
          if (A[1].k !== 'var') fail('Syntax ERROR');
          const g = fnOf(A[0], A[1].n), a = c(2), b = c(3), st = A.length > 4 ? c(4) : () => 1;
          return () => {
            const lo = a(), hi = b(), d = st();
            if (!(d > 0) || (hi - lo) / d > 1e5) return NaN;
            let s = 0;
            for (let k = lo; k <= hi; k += d) s += g(k);
            return s;
          };
        }
        case 'solve': { need(2, 4); const g = fnOf(eqAst(A[0])), a = c(1); return () => nSolve(g, a()); }
        default: return fail('Syntax ERROR');
      }
    }
    default: return fail('Syntax ERROR');
  }
}

// Удобные обёртки
const evalTokens = (toks) => evalAst(parse(toks));
function compileTokens(toks, name) {     // → (x) => число; переменная по умолчанию X
  const f = compileAst(parse(toks)), ix = VIX[name || 'X'];
  // значение переменной после счёта возвращается: иначе fv расходится с mem.vars (X в Solver после таблицы)
  return (x) => { const sv = fv[ix]; fv[ix] = x; const y = f(); fv[ix] = sv; return y; };
}
// Значение числового поля (V-Window, таблицы, списки): выражение → число
function evalNumber(toks) {
  const v = evalTokens(toks);
  if (isCx(v)) fail('Non-Real ERROR');
  if (!isNum(v)) fail('Syntax ERROR');
  return v;
}
