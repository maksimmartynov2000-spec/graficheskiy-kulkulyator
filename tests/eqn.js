// Тесты режима Equation: node tests/eqn.js        — расчёты (системы, многочлены, Solver), без браузера
//                         node tests/eqn.js ui     — ещё и сценарии «с клавиш» в браузере (нужен собранный index.html)
const { load, makeTok, makeRowStr, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '12-complex.js', '15-numeric.js', '20-parse.js', '40-ui.js', '85-eqn.js'],
  ['G', 'S', 'mem', 'PRE', 'FNA', 'evalTokens', 'compileTokens', 'numRow', 'valRow', 'CalcError', 'eqnLinear', 'eqnPoly', 'eqnQuad', 'eqnSolve', 'eqnVars', 'parse']);
const { S, CalcError, eqnLinear, eqnPoly, eqnSolve } = core;
const tok = makeTok(core), rs = makeRowStr(core);
const t = runner();

// Число из записи «как на клавишах»: '1÷3', '~2' (минус), '√2', '0.5'
const N = (s) => core.evalTokens(tok(s));
const show = (xs, mode) => xs.map((x) => rs(core.numRow(x, mode || 'auto', true))).join(' ; ');

// ---------- системы ----------
function sys(rows, want, what) {
  const s = eqnLinear(rows.map((r) => r.map(N)));
  t.eq(s.kind === 'ok' ? show(s.x) : s.kind, want, what || 'система ' + JSON.stringify(rows));
}
sys([['1', '1', '3'], ['1', '~1', '1']], '2 ; 1');
sys([['2', '3', '4'], ['5', '~7', '1']], '[31/29] ; [18/29]');
sys([['1÷2', '1÷3', '1'], ['1÷4', '~1', '2']], '[20/7] ; −[9/7]', 'система с дробными коэффициентами');
sys([['0.5', '1', '2'], ['1', '~1', '1']], '2 ; 1', 'система с десятичными коэффициентами');
sys([['0.1', '0.2', '0.5'], ['0.3', '~0.1', '0.1']], '1 ; 2', 'десятичные: 0.1x+0.2y=0.5');
sys([['1', '1', '1', '6'], ['2', '~1', '1', '3'], ['1', '2', '~1', '2']], '1 ; 2 ; 3');
sys([['2', '1', '~1', '1'], ['1', '~1', '2', '2'], ['3', '2', '1', '3']], '[4/5] ; 0 ; [3/5]');
sys([['0', '1', '2'], ['1', '0', '3']], '3 ; 2', 'ноль на месте ведущего элемента');
sys([['1', '2', '3', '4', '10'], ['2', '~1', '1', '3', '7'], ['3', '1', '~2', '1', '2'], ['1', '1', '1', '~1', '5']], '[7/3] ; [1/10] ; [38/15] ; −[1/30]', 'система 4×4');
sys([['2', '1', '0', '0', '0', '1', '10'], ['1', '3', '1', '0', '0', '0', '10'], ['0', '1', '4', '1', '0', '0', '18'],
  ['0', '0', '1', '5', '1', '0', '28'], ['0', '0', '0', '1', '6', '1', '40'], ['1', '0', '0', '0', '1', '7', '48']], '1 ; 2 ; 3 ; 4 ; 5 ; 6', 'система 6×6');
// вырожденные
sys([['1', '1', '1'], ['2', '2', '3']], 'none', 'нет решений 2×2');
sys([['1', '1', '1'], ['2', '2', '2']], 'inf', 'бесконечно много решений 2×2');
sys([['0', '0', '0'], ['0', '0', '0']], 'inf', 'все нули');
sys([['0', '0', '1'], ['0', '0', '0']], 'none', 'нулевые коэффициенты, ненулевая правая часть');
sys([['1', '1', '1', '3'], ['1', '1', '1', '4'], ['1', '~1', '0', '0']], 'none', 'нет решений 3×3');
sys([['1', '1', '1', '3'], ['2', '2', '2', '6'], ['1', '~1', '0', '0']], 'inf', 'бесконечно много решений 3×3');
sys([['1', '2', '3', '6'], ['4', '5', '6', '15'], ['7', '8', '9', '24']], 'inf', 'ранг 2, согласованная');
sys([['1', '2', '3', '6'], ['4', '5', '6', '15'], ['7', '8', '9', '25']], 'none', 'ранг 2, противоречивая');
sys([['1÷3', '1÷6', '1'], ['2÷3', '1÷3', '2']], 'inf', 'дробные пропорциональные строки');
// иррациональные коэффициенты: счёт приближённый, вырожденность — с допуском
sys([['√2', '1', '√2'], ['1', '~1', '1']], '1 ; 0', 'коэффициенты с √2');
sys([['π', '1', '1'], ['2π', '2', '2']], 'inf', 'пропорциональные строки с π');
sys([['π', '1', '1'], ['2π', '2', '3']], 'none', 'противоречие с π');
{
  const s = eqnLinear([['π', '2', '1'].map(N), ['1', '√3', '2'].map(N)]);
  const det = Math.PI * Math.sqrt(3) - 2;
  t.near(s.x[0].v, (Math.sqrt(3) - 4) / det, 'π и √3: x', 1e-12);
  t.near(s.x[1].v, (2 * Math.PI - 1) / det, 'π и √3: y', 1e-12);
}

// ---------- многочлены ----------
function pol(coefs, want, what, mode) {
  let got;
  try { got = show(eqnPoly(coefs.map(N)), mode); } catch (e) { if (!(e instanceof CalcError)) throw e; got = e.type; }
  t.eq(got, want, what || 'многочлен ' + coefs.join(' '));
}
// степень 2
pol(['1', '~5', '6'], '3 ; 2');
pol(['2', '3', '~2'], '[1/2] ; −2');
pol(['1', '~1', '~1'], '[1+√(5)/2] ; [1−√(5)/2]');
pol(['1', '0', '~2'], '√(2) ; −√(2)');
pol(['1', '~2', '1'], '1 ; 1', 'кратный корень');
pol(['4', '~4', '1'], '[1/2] ; [1/2]', 'кратный дробный корень');
pol(['1', '0', '1'], '', 'нет вещественных корней');
pol(['1', '1', '1'], '', 'нет вещественных корней: x²+x+1');
// комплексные корни (Complex Mode не Real): второй аргумент eqnPoly
function polC(coefs, want, what, mode) {
  let got;
  try { got = eqnPoly(coefs.map(N), true).map((x) => rs(core.valRow(x, mode || 'auto', true, 'rect'))).join(' ; '); } catch (e) { if (!(e instanceof CalcError)) throw e; got = e.type; }
  t.eq(got, want, what || 'комплексные корни ' + coefs.join(' '));
}
polC(['1', '1', '1'], '−[1/2]+[√(3)/2]i ; −[1/2]−[√(3)/2]i');
polC(['1', '0', '1'], 'i ; −i');
polC(['1', '~2', '5'], '1+2i ; 1−2i');
polC(['2', '2', '1'], '−[1/2]+[1/2]i ; −[1/2]−[1/2]i');
polC(['~1', '2', '~5'], '1+2i ; 1−2i', 'a < 0: порядок тот же');
polC(['1', '1', '1'], '−0.5+0.8660254038i ; −0.5−0.8660254038i', 'комплексные корни десятичной записью', 'dec');
polC(['0.5', '0', '0.5'], 'i ; −i', 'десятичные коэффициенты');
polC(['1', '~5', '6'], '3 ; 2', 'вещественные корни в комплексном режиме те же');
polC(['1', '~2', '1'], '1 ; 1', 'кратный корень в комплексном режиме');
polC(['1', '0', '0', '~1'], '1 ; −[1/2]+[√(3)/2]i ; −[1/2]−[√(3)/2]i', 'x³ = 1');
polC(['1', '0', '0', '8'], '1+√(3)i ; 1−√(3)i ; −2', 'x³ = −8');
polC(['1', '0', '1', '1'], '0.3411639019+1.1615414i ; 0.3411639019−1.1615414i ; −0.6823278038', 'x³+x+1');
polC(['1', '0', '0', '0', '1'], '0.7071067812+0.7071067812i ; 0.7071067812−0.7071067812i ; −0.7071067812+0.7071067812i ; −0.7071067812−0.7071067812i', 'x⁴ = −1');
polC(['1', '0', '2', '0', '1'], 'i ; i ; −i ; −i', '(x²+1)²: кратные комплексные корни');
polC(['1', '0', '0', '0', '0', '~1'], '1 ; 0.3090169944+0.9510565163i ; 0.3090169944−0.9510565163i ; −0.8090169944+0.5877852523i ; −0.8090169944−0.5877852523i', 'x⁵ = 1');
polC(['1.5', '0', '0', '1.5'], '0.5+0.8660254038i ; 0.5−0.8660254038i ; −1', 'приближённые коэффициенты, степень 3');
{
  // корни подставляются обратно: |p(z)| ≈ 0
  const cs = ['1', '~2', '3', '~4', '5', '~6', '7'].map(N);
  const zs = eqnPoly(cs, true);
  t.eq(zs.length, 6, 'степень 6: шесть корней с учётом комплексных');
  let worst = 0;
  for (const z of zs) {
    const x = z.cx ? z.re.v : z.v, y = z.cx ? z.im.v : 0;
    let pr = 0, pi = 0;
    for (const c of cs) { const nr = pr * x - pi * y + c.v; pi = pr * y + pi * x; pr = nr; }
    worst = Math.max(worst, Math.hypot(pr, pi));
  }
  t.eq(worst < 1e-8, true, 'степень 6: корни обращают многочлен в ноль (невязка ' + worst.toExponential(1) + ')');
}
pol(['~1', '0', '4'], '−2 ; 2', 'a < 0: сначала корень с «+»');
pol(['1', '~2.5', '1'], '2 ; 0.5', 'десятичные коэффициенты');
pol(['1', '~2.5', '1'], '2 ; [1/2]', 'десятичные коэффициенты, точная запись', 'exact');
pol(['1÷2', '~1÷3', '~1÷6'], '1 ; −[1/3]', 'дробные коэффициенты');
pol(['1', '~2√2', '2'], '√(2) ; √(2)', 'коэффициент с корнем, D = 0');
pol(['1', '~3', '1'], '[3+√(5)/2] ; [3−√(5)/2]');
pol(['3', '~7', '1'], '[7+√(37)/6] ; [7−√(37)/6]');
pol(['1', '~π', '0'], '3.141592654 ; 0', 'коэффициент π');
pol(['0', '1', '1'], 'Ma ERROR', 'старший коэффициент 0');
pol(['1', '~100000', '1'], '99999.99999 ; 1ᴇ−05', 'далёкие корни без потери точности');
// степень 3
pol(['1', '~6', '11', '~6'], '3 ; 2 ; 1');
pol(['1', '0', '0', '~1'], '1', 'один вещественный корень');
pol(['1', '0', '1', '1'], '−0.6823278038', 'один иррациональный корень');
pol(['1', '0', '~2', '~5'], '2.094551482');
pol(['1', '0', '~3', '2'], '1 ; 1 ; −2', 'двукратный корень');
pol(['1', '~6', '12', '~8'], '2 ; 2 ; 2', 'трёхкратный корень');
pol(['2', '~1', '~4', '2'], '√(2) ; [1/2] ; −√(2)', 'рациональный корень и корни с √');
pol(['1', '0', '0', '0'], '0 ; 0 ; 0', 'x³ = 0');
pol(['1', '~1', '0', '0'], '1 ; 0 ; 0', 'x²(x − 1)');
pol(['6', '~11', '6', '~1'], '1 ; [1/2] ; [1/3]', 'дробные корни');
pol(['1', '~1', '~3.75', '4.5'], '1.5 ; 1.5 ; −2', 'десятичные коэффициенты, кратный корень');
pol(['1', '~3', '~1', '3'], '3 ; 1 ; −1');
pol(['0', '1', '2', '3'], 'Ma ERROR', 'старший коэффициент 0 (степень 3)');
pol(['1', '~3', '1', '1'], '1+√(2) ; 1 ; 1−√(2)', '(x−1)(x²−2x−1)');
// степени 4–6
pol(['1', '0', '~5', '0', '4'], '2 ; 1 ; −1 ; −2');
pol(['1', '~10', '35', '~50', '24'], '4 ; 3 ; 2 ; 1');
pol(['1', '0', '~4', '0', '4'], '√(2) ; √(2) ; −√(2) ; −√(2)', '(x²−2)²');
pol(['1', '0', '0', '0', '1'], '', 'x⁴+1: нет вещественных корней');
pol(['1', '0', '0', '0', '~16'], '2 ; −2', 'x⁴ = 16');
pol(['1', '~4', '6', '~4', '1'], '1 ; 1 ; 1 ; 1', '(x−1)⁴');
pol(['1', '0', '0', '0', '~1', '0'], '1 ; 0 ; −1', 'x⁵ − x');
pol(['1', '~15', '85', '~225', '274', '~120'], '5 ; 4 ; 3 ; 2 ; 1');
pol(['1', '0', '0', '0', '0', '~32'], '2', 'x⁵ = 32');
pol(['1', '0', '~14', '0', '49', '0', '~36'], '3 ; 2 ; 1 ; −1 ; −2 ; −3');
pol(['1', '~6', '15', '~20', '15', '~6', '1'], '1 ; 1 ; 1 ; 1 ; 1 ; 1', '(x−1)⁶');
pol(['1', '0', '0', '0', '0', '0', '1'], '', 'x⁶+1');
pol(['1', '~6', '12', '~6', '~12', '24', '~16'], '2 ; 2 ; 2 ; −1.25992105', '(x−2)³(x³+2): кратный и иррациональный корни');
pol(['4', '0', '~5', '0', '1'], '1 ; [1/2] ; −[1/2] ; −1', 'дробные корни степени 4');
{
  // приближённые коэффициенты: (x − π)(x² + 1)
  const r = eqnPoly(['1', '~π', '1', '~π'].map(N));
  t.eq(r.length, 1, 'коэффициенты с π: один вещественный корень');
  t.near(r[0].v, Math.PI, 'корень π', 1e-12);
  // (x − √2)(x − √3)(x + 1) — три иррациональных коэффициента
  const q = eqnPoly(['1', '1−√2−√3', '√6−√2−√3', '√6'].map(N));
  t.eq(q.length, 3, 'три корня при приближённых коэффициентах');
  t.near(q[0].v, Math.sqrt(3), 'корень √3', 1e-11);
  t.near(q[1].v, Math.SQRT2, 'корень √2', 1e-11);
  t.near(q[2].v, -1, 'корень −1', 1e-11);
  // все корни подставляются обратно
  for (const c of [['1', '2', '~7', '3'], ['2', '~9', '0', '13', '~5'], ['1', '1', '~9', '~4', '11', '3'], ['3', '0', '~8', '1', '5', '~2', '~1']]) {
    const cs = c.map(N);
    for (const x of eqnPoly(cs)) {
      const val = cs.reduce((p, a) => p * x.v + a.v, 0);
      const scale = cs.reduce((p, a) => p * Math.abs(x.v) + Math.abs(a.v), 0);
      t.near(val / scale, 0, 'подстановка корня ' + x.v + ' в ' + c.join(' '), 1e-10);
    }
  }
  t.eq(eqnPoly(['1', '2', '~7', '3'].map(N)).length, 3, 'три вещественных корня у x³+2x²−7x+3');
  t.eq(eqnPoly(['1', '1', '~9', '~4', '11', '3'].map(N)).length, 5, 'пять вещественных корней');
}

// ---------- Solver ----------
{
  const f = (s, name) => core.compileTokens(tok(s), name);
  S.angle = 'Rad';
  t.near(eqnSolve(f('X²−2'), 1, -9e99, 9e99), Math.SQRT2, 'X²−2 от 1');
  t.near(eqnSolve(f('X²−2'), 1, -5, 0), -Math.SQRT2, 'X²−2 в границах [−5, 0]');
  t.near(eqnSolve(f('X−5000'), 0, -9e99, 9e99), 5000, 'далёкий корень');
  t.near(eqnSolve(f('2X+1−7'), 0, -9e99, 9e99), 3, 'линейное');
  t.near(eqnSolve(f('e^X−5'), 0, -9e99, 9e99), Math.log(5), 'e^X = 5');
  t.near(eqnSolve(f('ln X−1'), 0, -9e99, 9e99), Math.E, 'ln X = 1 при недопустимом начальном значении');
  t.near(eqnSolve(f('cos X−X'), 0, -9e99, 9e99), 0.7390851332151607, 'cos X = X');
  t.eq(Number.isNaN(eqnSolve(f('X²+1'), 0, -9e99, 9e99)), true, 'X²+1 = 0 не решается');
  t.eq(Number.isNaN(eqnSolve(f('X²−2'), 1, 5, 10)), true, 'в границах [5, 10] корня нет');
  t.near(eqnSolve(f('A×3−12', 'A'), 0, -9e99, 9e99), 4, 'другая переменная');
  t.near(eqnSolve(f('(X−3)²'), 0, -9e99, 9e99), 3, 'касание оси: (X−3)²', 1e-7);
  t.near(eqnSolve(f('X^3−2X−5'), 2, -9e99, 9e99), 2.0945514815423265, 'X³−2X−5');
  t.near(eqnSolve(f('1÷X−0.25'), 1, -9e99, 9e99), 4, '1÷X = 0.25');
  t.eq(Number.isNaN(eqnSolve(f('1÷X'), 1, -9e99, 9e99)), true, '1÷X = 0 не решается');
  S.angle = 'Deg';
  t.near(eqnSolve(f('sin X−0.5'), 10, -9e99, 9e99), 30, 'sin X = 0.5 в градусах');
  S.angle = 'Rad';
  t.eq(core.eqnVars(core.parse(tok('C=A×B+sin (2A)−X²'))).join(), 'A,B,C,X', 'переменные уравнения по алфавиту');
  t.eq(core.eqnVars(core.parse(tok('1+2=3'))).join(), '', 'уравнение без переменных');
}

// ---------- случайные проверки (псевдослучайные числа с постоянным зерном) ----------
{
  let seed = 20261125;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
  const num = (p, q) => N(`${p < 0 ? '~' : ''}${Math.abs(p)}${q === 1 ? '' : '÷' + q}`);
  const str = (x) => rs(core.numRow(x, 'auto', true));
  // многочлены с известными рациональными корнями (с повторами): корни возвращаются точно и с нужной кратностью
  let bad = 0;
  for (let it = 0; it < 300; it++) {
    const deg = 3 + rnd(4), roots = [];
    for (let i = 0; i < deg; i++) roots.push(i && rnd(3) === 0 ? roots[rnd(i)] : [rnd(13) - 6, 1 + rnd(3)]);
    // произведение (qx − p) с точными коэффициентами
    let c = [1n];
    for (const [p, q] of roots) {
      const nx = new Array(c.length + 1).fill(0n);
      c.forEach((a, i) => { nx[i] += a * BigInt(q); nx[i + 1] -= a * BigInt(p); });
      c = nx;
    }
    const lead = 1 + rnd(3);
    const got = eqnPoly(c.map((a) => num(Number(a) * lead, 1))).map(str).join(' ; ');
    const want = roots.map(([p, q]) => num(p, q)).sort((a, b) => b.v - a.v).map(str).join(' ; ');
    if (got !== want) { bad++; if (bad <= 3) console.log(`  ✗ корни (${roots.map((r) => r.join('/')).join(', ')}): получено «${got}», ожидалось «${want}»`); }
  }
  t.eq(bad, 0, 'случайные многочлены с рациональными корнями');
  // множитель x² − k (k не квадрат) и рациональные корни
  bad = 0;
  for (let it = 0; it < 100; it++) {
    const k = [2, 3, 5, 6, 7][rnd(5)], extra = 1 + rnd(4), roots = [];
    for (let i = 0; i < extra; i++) roots.push(rnd(9) - 4);
    let c = [1n, 0n, BigInt(-k)];
    for (const p of roots) {
      const nx = new Array(c.length + 1).fill(0n);
      c.forEach((a, i) => { nx[i] += a; nx[i + 1] -= a * BigInt(p); });
      c = nx;
    }
    const vals = eqnPoly(c.map((a) => num(Number(a), 1))).map((x) => x.v);
    const want = [...roots, Math.sqrt(k), -Math.sqrt(k)].sort((a, b) => b - a);
    if (vals.length !== want.length || vals.some((v, i) => Math.abs(v - want[i]) > 1e-9)) { bad++; if (bad <= 3) console.log(`  ✗ (x²−${k})·∏(x−${roots.join(')(x−')}): получено ${vals.join(' ; ')}`); }
  }
  t.eq(bad, 0, 'случайные многочлены с корнями ±√k');
  // системы с известным решением
  bad = 0;
  for (let it = 0; it < 200; it++) {
    const n = 2 + rnd(5), sol = [], rows = [];
    for (let i = 0; i < n; i++) sol.push([rnd(19) - 9, 1 + rnd(4)]);
    for (let i = 0; i < n; i++) {
      const r = [];
      for (let j = 0; j < n; j++) r.push(rnd(11) - 5);
      rows.push(r);
    }
    const A = rows.map((r) => {
      // правая часть: Σ a_j·x_j точной дробью
      let p = 0n, q = 1n;
      r.forEach((a, j) => { p = p * BigInt(sol[j][1]) + BigInt(a * sol[j][0]) * q; q *= BigInt(sol[j][1]); });
      return [...r.map((a) => num(a, 1)), core.evalTokens(tok(`${p < 0n ? '~' : ''}${p < 0n ? -p : p}÷${q}`))];
    });
    const s = eqnLinear(A);
    if (s.kind !== 'ok') continue;                 // случайная матрица оказалась вырожденной
    const got = s.x.map(str).join(' ; '), want = sol.map(([p, q]) => num(p, q)).map(str).join(' ; ');
    if (got !== want) { bad++; if (bad <= 3) console.log(`  ✗ система ${JSON.stringify(rows)}: получено «${got}», ожидалось «${want}»`); }
  }
  t.eq(bad, 0, 'случайные системы с дробными решениями');
}

const unit = t.done('Equation (расчёты)');

// ---------- сценарии с клавиш ----------
async function ui() {
  const { open } = require('./web');
  const u = runner();
  const c = await open({ w: 393, h: 852 });
  await c.page.evaluate(() => localStorage.clear());
  const has = async (keys, want, what) => {
    await c.keys(keys);
    const txt = (await c.text()).join(' | ');
    const ok = want.every((w) => txt.includes(w));
    u.eq(ok ? 'есть' : txt, 'есть', what);
  };
  await has('MENU XTT', ['Equation', 'Select Type', 'F1:Simultaneous', 'F2:Polynomial', 'F3:Solver', 'SIMUL', 'POLY', 'SOLVER'], 'начальный экран');
  await has('F1', ['Simultaneous', 'Number Of Unknowns?', '2', '6'], 'число неизвестных');
  await has('F2', ['anX+bnY+cnZ=dn', 'SOLVE', 'DELETE', 'CLEAR', 'EDIT'], 'таблица коэффициентов 3×3');
  await has('2 EXE 1 EXE NEG 1 EXE 1 EXE 1 EXE NEG 1 EXE 2 EXE 2 EXE 3 EXE 2 EXE 1 EXE 3 EXE F1', ['X', 'Y', 'Z', '(4)/(5)', '(3)/(5)', 'REPEAT'], 'ответ системы 3×3 с дробями');
  await has('SD', ['0.8', '0.6'], 'S⇔D: десятичная запись');
  await has('SD F1', ['anX+bnY+cnZ=dn', 'SOLVE'], 'REPEAT возвращает к коэффициентам');
  await has('F3 F1 F1', ['Infinitely Many', 'Solutions'], 'CLEAR + SOLVE: все нули — бесконечно много решений');
  await has('EXIT EXIT', ['Number Of Unknowns?'], 'EXIT — на шаг назад');
  await has('F1 1 EXE 1 EXE 1 EXE 2 EXE 2 EXE 3 EXE F1', ['No Solution'], 'нет решений');
  await has('EXIT EXIT EXIT F2', ['Polynomial', 'Degree?'], 'степень многочлена');
  await has('F1 1 EXE NEG 1 EXE NEG 1 EXE', ['aX^2+bX+c=0', 'SOLVE'], 'коэффициенты квадратного уравнения');
  await has('F1', ['X1', 'X2', '(1+√(5))/(2)', '(1−√(5))/(2)', 'REPEAT'], 'корни (1±√5)/2');
  await has('EXIT 1 EXE 0 EXE 1 EXE F1', ['No Real Roots'], 'нет вещественных корней');
  // Complex Mode: a+bi — те же коэффициенты (x²−x+1: курсор стоял на c) дают комплексные корни
  await has('EXIT SHIFT MENU DOWN DOWN DOWN F2 EXIT F1', ['X1', 'X2', 'a+bi', 'REPEAT'], 'Complex Mode a+bi: комплексные корни вместо «No Real Roots»');
  u.eq(await c.page.evaluate(() => { const v = window.__calc.UI.apps.eqn.res.vals; return v.length + ':' + v.map((z) => (z.cx ? z.re.v.toFixed(4) + ',' + z.im.v.toFixed(4) : 'real')).join(';'); }), '2:0.5000,0.8660;0.5000,-0.8660', 'корни 1/2 ± √3/2·i');
  await has('EXIT 1 EXE 1 EXE 1 EXE F1', ['(1)/(2)', '(√(3))/(2)', 'i'], 'корни x²+x+1 с дробями и корнем');
  await has('SD', ['0.5', '0.8660254038'], 'S⇔D для комплексных корней');
  await has('SHIFT MENU DOWN DOWN DOWN F1 EXIT EXIT F1', ['No Real Roots'], 'Complex Mode Real: снова «No Real Roots»');
  await has('EXIT LEFT LEFT 0 EXE F1', ['Ma ERROR'], 'старший коэффициент 0');
  await has('EXIT EXIT F2 1 EXE NEG 6 EXE 1 1 EXE NEG 6 EXE F1', ['aX^3+bX^2+cX+d=0', 'X1', 'X2', 'X3'], 'кубическое уравнение');
  await has('EXIT EXIT EXIT F3', ['Eq:'], 'Solver: ввод уравнения');
  await has('XTT SQR SUB 2 SHIFT DOT 0 EXE', ['Eq:', 'X=0', 'Lower=', 'Upper=', 'SOLVE'], 'Solver: список переменных');
  await has('1 EXE UP F6', ['X=1.414213562', 'Lft=0', 'Rgt=0', 'REPEAT'], 'Solver: ответ');
  await has('F1', ['X=1.414213562', 'Lower='], 'REPEAT: значение записано в переменную');
  await has('EXIT F3', ['Eq:', 'X=1.414213562'], 'уравнение сохранилось');
  // после перезагрузки страницы коэффициенты и уравнение на месте
  await c.page.waitForTimeout(800);
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  await has('MENU XTT F3', ['Eq:', 'X=1.414213562', 'Lower='], 'после перезагрузки: уравнение Solver');
  await has('EXIT F2 F2', ['aX^3+bX^2+cX+d=0', '−6', '11'], 'после перезагрузки: коэффициенты многочлена');
  await has('F1', ['X1', 'X2', 'X3', '3', '2', '1'], 'после перезагрузки: корни 3, 2, 1');
  u.eq(c.errs.join('; '), '', 'без ошибок JS');
  await c.close();
  return u.done('Equation (с клавиш)');
}

(async () => {
  const failed = unit + (process.argv.includes('ui') ? await ui() : 0);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
