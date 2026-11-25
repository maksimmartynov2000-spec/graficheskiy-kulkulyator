// Тесты дополнения режима Statistics (81-stat2.js): распределения, тесты, интервалы, новые диаграммы.
//   node tests/stat2.js       — числовая часть (Node)
//   node tests/stat2.js web   — ещё и сценарии «с клавиш» в браузере (нужен Playwright и собранный index.html)
// Эталоны посчитаны независимо: замкнутые формулы либо интегрирование плотностей квадратурой Гаусса — Лежандра.
const { load, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '40-ui.js', '80-stat.js', '81-stat2.js'],
  ['G', 'S', 'mem', 'CalcError', 'st2LnGamma', 'st2GammaPQ', 'st2BetaIQ',
    'st2TQ', 'st2TCdf', 'st2TPdf', 'st2TCd', 'st2TInv', 'st2ChiCdf', 'st2ChiQ', 'st2ChiPdf', 'st2ChiCd', 'st2ChiInv',
    'st2FQ', 'st2FCdf', 'st2FPdf', 'st2FCd', 'st2FInv', 'st2GeoPd', 'st2GeoCd', 'st2GeoInv', 'st2HypPd', 'st2HypCd', 'st2HypInv',
    'st2BinInv', 'st2PoisInv', 'st2ZTest1', 'st2ZTest2', 'st2ZProp1', 'st2ZProp2', 'st2TTest1', 'st2TTest2', 'st2RegTest',
    'st2ChiGof', 'st2Chi2Way', 'st2FTest', 'st2Anova', 'st2ZInt1', 'st2ZInt2', 'st2PropInt1', 'st2PropInt2', 'st2TInt1', 'st2TInt2',
    'st2NormScores', 'st2SubChar', 'stat1']);
const c = core, { CalcError } = core;
const t = runner();
const near = (got, want, what, tol) => t.near(got, want, what, tol || 1e-10);
const errOf = (fn) => { try { fn(); return 'нет ошибки'; } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };

// --- гамма- и бета-функции ---
near(c.st2LnGamma(4.5), 2.453736570842443, 'lnΓ(4.5)', 1e-14);
near(c.st2LnGamma(0.5), Math.log(Math.sqrt(Math.PI)), 'lnΓ(0.5)', 1e-14);
near(c.st2LnGamma(100), 359.1342053695754, 'lnΓ(100)', 1e-14);
near(c.st2GammaPQ(1, 2)[0], 1 - Math.exp(-2), 'P(1, 2) = 1 − e⁻²', 1e-13);
near(c.st2GammaPQ(2, 30)[1], Math.exp(-30) * 31, 'Q(2, 30): малый хвост без потери точности', 1e-12);
near(c.st2BetaIQ(2, 3, 0.4)[0], 0.5248, 'I(2, 3; 0.4)', 1e-13);       // 6x² − 8x³ + 3x⁴
near(c.st2BetaIQ(0.5, 0.5, 0.5)[0], 0.5, 'I(½, ½; ½)', 1e-13);

// --- распределение Стьюдента ---
near(c.st2TCdf(1, 1), 0.75, 't, df = 1: F(1) = 0,75', 1e-13);
near(c.st2TPdf(0, 1), 1 / Math.PI, 't, df = 1: плотность в нуле', 1e-13);
near(c.st2TCdf(1, 2), 0.5 + 1 / (2 * Math.sqrt(3)), 't, df = 2: F(1)', 1e-13);
near(c.st2TQ(2.2281388519649385, 10), 0.025, 't, df = 10: правый хвост 0,025');
near(c.st2TCdf(-1.5, 30), 0.07203296456432534, 't, df = 30: F(−1,5)');
near(c.st2TCdf(0.3, 7.5), 0.6138386707156109, 't, дробное число степеней свободы');
near(c.st2TCd(-1, 2, 5), 0.7674215267605089, 'tcd(−1…2), df = 5');
near(c.st2TCd(3, 1e99, 5), c.st2TQ(3, 5), 'tcd до «бесконечности» — правый хвост', 1e-12);
near(c.st2TPdf(1.2, 6), 0.18026846186311338, 'tpd(1,2), df = 6', 1e-12);
near(c.st2TInv(0.025, 10), 2.2281388519862615, 'Invt(0,025), df = 10');
near(c.st2TInv(0.025, 4), 2.7764451051977836, 'Invt(0,025), df = 4');
near(c.st2TInv(0.975, 10), -2.2281388519862615, 'Invt(0,975) — отрицательное значение');
t.eq(c.st2TInv(0.5, 3), 0, 'Invt(0,5) = 0');
t.eq(Number.isNaN(c.st2TInv(0, 3)) && Number.isNaN(c.st2TInv(1, 3)) && Number.isNaN(c.st2TQ(1, 0)), true, 't: недопустимые параметры');
near(c.st2TQ(40, 3), 1.7574133e-05, 't: далёкий хвост', 1e-6);

// --- распределение χ² ---
near(c.st2ChiCdf(3, 2), 1 - Math.exp(-1.5), 'χ², df = 2: F(3)', 1e-13);
near(c.st2ChiQ(5.991464547107979, 2), 0.05, 'χ², df = 2: хвост 0,05', 1e-12);
near(c.st2ChiCdf(3.841458820694124, 1), 0.95, 'χ², df = 1: F(3,84) = 0,95', 1e-12);
near(c.st2ChiCdf(9.487729036781154, 4), 0.95, 'χ², df = 4: F(9,49) = 0,95', 1e-12);
near(c.st2ChiCdf(5, 7), 0.3400367703057176, 'χ², df = 7: F(5)');
near(c.st2ChiCdf(60, 50), 0.8427579727616059, 'χ², df = 50: F(60)');
near(c.st2ChiPdf(2, 3), 0.20755374871029741, 'χ², df = 3: плотность', 1e-12);
near(c.st2ChiCd(1, 5, 2), Math.exp(-0.5) - Math.exp(-2.5), 'Ccd(1…5), df = 2', 1e-13);
near(c.st2ChiInv(0.05, 1), 3.841458820694124, 'InvC(0,05), df = 1');
near(c.st2ChiInv(0.05, 2), -2 * Math.log(0.05), 'InvC(0,05), df = 2', 1e-12);
near(c.st2ChiInv(0.05, 10), 18.307038053275093, 'InvC(0,05), df = 10');
near(c.st2ChiInv(0.99, 10), 2.5582121601872064, 'InvC(0,99), df = 10', 1e-9);
near(c.st2ChiQ(200, 3), 4.215376e-43, 'χ²: очень далёкий хвост', 1e-5);

// --- распределение Фишера ---
near(c.st2FCdf(3, 2, 10), 1 - (10 / 16) ** 5, 'F(2, 10): F(3)', 1e-13);
near(c.st2FQ(3, 2, 10), (10 / 16) ** 5, 'F(2, 10): хвост', 1e-13);
near(c.st2FCdf(1, 5, 2), (5 / 7) ** 2.5, 'F(5, 2): F(1)', 1e-13);
near(c.st2FCdf(2, 5, 7), 0.8043267551331769, 'F(5, 7): F(2)');
near(c.st2FCdf(16 / 9, 9, 7), 0.7698248517736282, 'F(9, 7): F(16/9)');
near(c.st2FPdf(1, 2, 10), 5 * (10 / 12) ** 4 * 20 / 144, 'F(2, 10): плотность', 1e-12);
near(c.st2FPdf(1.5, 5, 7), 0.27237413495507795, 'F(5, 7): плотность', 1e-12);
near(c.st2FQ(2.5 * 2.5, 1, 8), 2 * c.st2TQ(2.5, 8), 'F(1, d) — квадрат t', 1e-12);
near(c.st2FCd(1, 3, 2, 10), (10 / 12) ** 5 - (10 / 16) ** 5, 'Fcd(1…3)', 1e-12);
near(c.st2FInv(0.05, 2, 10), 5 * (0.05 ** -0.2 - 1), 'InvF(0,05; 2, 10)', 1e-12);
near(c.st2FInv(0.05, 5, 7), 3.971523150611329, 'InvF(0,05; 5, 7)');

// --- большие числа степеней свободы (эталоны — интегрирование плотности) ---
near(c.st2TQ(2, 1e4), 0.022763630330717738, 't, df = 10⁴ (цепная дробь)', 1e-11);
near(c.st2TQ(2, 1e5), 0.022751481728753253, 't, df = 10⁵ (разложение Хилла)', 1e-12);
near(c.st2TQ(5, 1e8), 2.866520550633643e-07, 't, df = 10⁸: хвост', 1e-12);
near(c.st2TQ(-0.5, 1e5), 1 - 0.30853808882720923, 't, df = 10⁵: отрицательный аргумент', 1e-12);
near(c.st2TInv(0.022751481728753253, 1e5), 2, 'Invt при df = 10⁵', 1e-10);
near(c.st2ChiQ(1.002e6, 1e6), 0.07871866138613041, 'χ², df = 10⁶', 1e-11);
near(c.st2ChiQ(2.0001e8, 2e8), 0.30852873711115747, 'χ², df = 2·10⁸', 1e-11);
near(c.st2ChiCdf(9700, 1e4), 1 - 0.9837492048222903, 'χ², df = 10⁴: левый хвост', 1e-10);
near(c.st2FQ(1.3, 300, 500), 0.005058337234339822, 'F(300, 500)', 1e-12);
near(c.st2FQ(1.02, 1e4, 2e4), 0.12580234175036284, 'F(10⁴, 2·10⁴)', 1e-11);
near(c.st2FQ(2, 4, 1e6), 0.09157907359355567, 'F(4, 10⁶)', 1e-10);
near(c.st2FQ(1.5, 60, 60), 0.05955200426782248, 'F(60, 60)', 1e-12);

// --- геометрическое и гипергеометрическое ---
near(c.st2GeoPd(3, 0.2), 0.128, 'Gpd(3; 0,2)', 1e-14);
t.eq(c.st2GeoPd(0, 0.2), 0, 'Gpd(0) = 0');
near(c.st2GeoCd(1, 3, 0.2), 0.488, 'Gcd(1…3; 0,2)', 1e-13);
near(c.st2GeoCd(2, 4, 0.5), 0.4375, 'Gcd(2…4; 0,5)', 1e-14);
t.eq([c.st2GeoInv(0.488, 0.2), c.st2GeoInv(0.5, 0.2), c.st2GeoInv(0, 0.3), c.st2GeoInv(0.999, 1)].join(), '3,4,1,1', 'InvG');
near(c.st2HypPd(1, 3, 4, 10), 0.5, 'Hpd(1; n=3, M=4, N=10)', 1e-14);
near(c.st2HypCd(0, 1, 3, 4, 10), 2 / 3, 'Hcd(0…1)', 1e-14);
t.eq(c.st2HypPd(4, 3, 4, 10), 0, 'Hpd вне диапазона = 0');
near(c.st2HypPd(5, 20, 40, 200), 0.18268850734871273, 'Hpd для большой совокупности', 1e-11);
near(c.st2HypCd(0, 20, 20, 40, 200), 1, 'Hcd по всему диапазону = 1', 1e-11);
t.eq([c.st2HypInv(0.5, 3, 4, 10), c.st2HypInv(0.7, 3, 4, 10), c.st2HypInv(0, 3, 4, 10)].join(), '1,2,0', 'InvH');
t.eq(Number.isNaN(c.st2HypPd(1, 11, 4, 10)) && Number.isNaN(c.st2HypPd(1, 3, 11, 10)) && Number.isNaN(c.st2GeoPd(1, 0)), true, 'дискретные: недопустимые параметры');
t.eq([c.st2BinInv(0.5, 10, 0.5), c.st2BinInv(0.376953125, 10, 0.5), c.st2BinInv(0.38, 10, 0.5), c.st2BinInv(1, 10, 0.5)].join(), '5,4,5,10', 'InvB');
t.eq([c.st2PoisInv(0.5, 3), c.st2PoisInv(0.42, 3), c.st2PoisInv(0, 3)].join(), '3,2,0', 'InvP');

// --- Z-тесты ---
{
  const q = c.st2ZTest1('≠', 10, 2, 11, 16);
  near(q.z, 2, '1-Sample Z: z', 1e-13); near(q.p, 0.04550026389635842, '1-Sample Z: p (≠)', 1e-12);
  near(c.st2ZTest1('>', 10, 2, 11, 16).p, 0.02275013194817921, '1-Sample Z: p (>)', 1e-12);
  near(c.st2ZTest1('<', 10, 2, 11, 16).p, 1 - 0.02275013194817921, '1-Sample Z: p (<)', 1e-12);
  const w = c.st2ZTest2('≠', 2, 3, 11, 16, 10, 25);
  near(w.z, 1.2803687993289599, '2-Sample Z: z', 1e-13); near(w.p, 0.20041546169285485, '2-Sample Z: p', 1e-12);
  const p1 = c.st2ZProp1('≠', 0.5, 60, 100);
  near(p1.z, 2, '1-Prop Z: z', 1e-12); near(p1.p, 0.04550026389635842, '1-Prop Z: p', 1e-11); near(p1.ph, 0.6, '1-Prop Z: p̂');
  const p2 = c.st2ZProp2('≠', 45, 100, 30, 80);
  near(p2.z, 1.0141851056742202, '2-Prop Z: z', 1e-12); near(p2.p, 0.3104944343172349, '2-Prop Z: p', 1e-11); near(p2.ph, 0.4166666666666667, '2-Prop Z: общая доля');
  t.eq(errOf(() => c.st2ZTest1('≠', 0, 0, 1, 5)), 'Ma ERROR', 'Z-тест: σ = 0');
  t.eq(errOf(() => c.st2ZProp1('≠', 0.5, 7, 5)), 'Ma ERROR', 'доля: x больше n');
}

// --- t-тесты (выборки A и B) ---
{
  const A = [5.1, 4.9, 5.6, 5.8, 6.0], B = [4.4, 4.9, 5.0, 4.6, 5.2, 4.7];
  const a = c.stat1(A, null, 'Std'), b = c.stat1(B, null, 'Std');
  near(a.mean, 5.48, 'выборка A: среднее', 1e-13); near(a.sdS, 0.46583258795408455, 'выборка A: sx', 1e-13);
  const q = c.st2TTest1('≠', 5, a.mean, a.sdS, a.n);
  near(q.t, 2.304073731539131, '1-Sample t: t', 1e-12); near(q.p, 0.08256829674577304, '1-Sample t: p (≠)'); t.eq(q.df, 4, '1-Sample t: df');
  near(c.st2TTest1('>', 5, a.mean, a.sdS, a.n).p, 0.04128414837288652, '1-Sample t: p (>)');
  near(c.st2TTest1('<', 5, a.mean, a.sdS, a.n).p, 1 - 0.04128414837288652, '1-Sample t: p (<)');
  const w = c.st2TTest2('≠', a.mean, a.sdS, a.n, b.mean, b.sdS, b.n, false);
  near(w.t, 2.8382651618409187, '2-Sample t (без объединения): t', 1e-12); near(w.df, 6.459173871277618, '… df', 1e-12); near(w.p, 0.02735300371945204, '… p');
  t.eq(w.sp, null, '… sp не считается');
  const p = c.st2TTest2('≠', a.mean, a.sdS, a.n, b.mean, b.sdS, b.n, true);
  near(p.t, 2.9684963597851333, '2-Sample t (Pooled): t', 1e-12); t.eq(p.df, 9, '… df'); near(p.sp, 0.3783002922429628, '… sp', 1e-12); near(p.p, 0.01574080960023294, '… p');
  const r = c.st2RegTest('≠', [1, 2, 3, 4, 5], [1, 3, 2, 5, 4], null);
  near(r.t, 2.3094010767585034, 'LinearReg t: t', 1e-12); near(r.p, 0.10408803866182792, 'LinearReg t: p'); t.eq(r.df, 3, 'LinearReg t: df');
  near(r.a, 0.6, 'LinearReg t: a'); near(r.b, 0.8, 'LinearReg t: b'); near(r.s, Math.sqrt(1.2), 'LinearReg t: s'); near(r.r, 0.8, 'LinearReg t: r'); near(r.r2, 0.64, 'LinearReg t: r²');
  const rf = c.st2RegTest('>', [1, 2, 3], [2, 3, 7], [2, 1, 3]), ru = c.st2RegTest('>', [1, 1, 2, 3, 3, 3], [2, 2, 3, 7, 7, 7], null);
  near(rf.t, ru.t, 'LinearReg t: частоты равносильны повторению', 1e-12); near(rf.p, ru.p, '… и p', 1e-12);
  t.eq(errOf(() => c.st2TTest1('≠', 0, 1, 1, 1)), 'Ma ERROR', 't-тест: n = 1');
  t.eq(errOf(() => c.st2RegTest('≠', [1, 2, 3], [1, 2], null)), 'Dimension ERROR', 'LinearReg t: разная длина');
  t.eq(errOf(() => c.st2RegTest('≠', [1, 2, 3], [2, 4, 6], null)), 'Ma ERROR', 'LinearReg t: точная прямая (s = 0)');
  // интервалы
  const i1 = c.st2TInt1(0.95, a.mean, a.sdS, a.n);
  near(i1.lo, 4.901592446347326, '1-Sample t-интервал: Left'); near(i1.hi, 6.058407553652673, '… Right');
  const i2 = c.st2TInt2(0.95, a.mean, a.sdS, a.n, b.mean, b.sdS, b.n, false);
  near(i2.lo, 0.10371703078833938, '2-Sample t-интервал: Left', 1e-9); near(i2.hi, 1.25628296921166, '… Right', 1e-9);
  const i3 = c.st2TInt2(90, a.mean, a.sdS, a.n, b.mean, b.sdS, b.n, true);
  near(i3.lo, 0.26008478262157175, '2-Sample t-интервал (Pooled, уровень «90»): Left', 1e-9); near(i3.hi, 1.0999152173784277, '… Right', 1e-9);
}

// --- χ², F, ANOVA ---
{
  const g = c.st2ChiGof([10, 20, 30], [20, 20, 20], 2);
  near(g.chi, 10, 'GOF: χ²', 1e-13); near(g.p, Math.exp(-5), 'GOF: p', 1e-12); t.eq(g.contrib.join(), '5,0,5', 'GOF: вклады');
  t.eq(errOf(() => c.st2ChiGof([1, 2], [1], 1)), 'Dimension ERROR', 'GOF: разная длина');
  t.eq(errOf(() => c.st2ChiGof([1, 2], [1, 0], 1)), 'Ma ERROR', 'GOF: нулевая ожидаемая частота');
  const w = c.st2Chi2Way([[10, 20], [30, 40]]);
  near(w.chi, 0.7936507936507936, '2WAY: χ²', 1e-13); near(w.p, 0.37299848361348714, '2WAY: p', 1e-11); t.eq(w.df, 1, '2WAY: df');
  t.eq(w.exp.map((r) => r.map((v) => Math.round(v * 1e9) / 1e9).join()).join(';'), '12,18;28,42', '2WAY: ожидаемые частоты');
  t.eq(c.st2Chi2Way([[1, 2, 3], [4, 5, 6], [7, 8, 10]]).df, 4, '2WAY 3×3: df');
  t.eq(errOf(() => c.st2Chi2Way([[1, 2]])), 'Dimension ERROR', '2WAY: одна строка');
  t.eq(errOf(() => c.st2Chi2Way([[0, 0], [1, 2]])), 'Ma ERROR', '2WAY: нулевая строка');
  const f = c.st2FTest('≠', 2, 10, 1.5, 8);
  near(f.F, 16 / 9, 'F-тест: F', 1e-13); near(f.p, 0.4603502964527435, 'F-тест: p (≠)');
  near(c.st2FTest('>', 2, 10, 1.5, 8).p, 0.23017514822637175, 'F-тест: p (>)');
  const an = c.st2Anova([1, 1, 1, 2, 2, 2, 3, 3, 3], [1, 2, 3, 2, 3, 4, 5, 6, 7]);
  t.eq([an.dfA, an.dfE].join(), '2,6', 'ANOVA: степени свободы');
  near(an.ssA, 26, 'ANOVA: SS фактора', 1e-12); near(an.ssE, 6, 'ANOVA: SS ошибки', 1e-12); near(an.F, 13, 'ANOVA: F', 1e-12);
  near(an.p, (6 / 32) ** 3, 'ANOVA: p', 1e-12);
  t.eq(errOf(() => c.st2Anova([1, 1, 1], [1, 2, 3])), 'Ma ERROR', 'ANOVA: одна группа');
}

// --- Z-интервалы ---
{
  const i = c.st2ZInt1(0.95, 2, 11, 16);
  near(i.lo, 10.020018007729973, '1-Sample Z-интервал: Left'); near(i.hi, 11.979981992270027, '… Right');
  const j = c.st2ZInt2(0.95, 2, 3, 11, 16, 10, 25);
  near(j.lo, -0.5307808075042679, '2-Sample Z-интервал: Left', 1e-9); near(j.hi, 2.530780807504268, '… Right');
  const p = c.st2PropInt1(0.95, 60, 100);
  near(p.lo, 0.5039817664728937, '1-Prop интервал: Left'); near(p.hi, 0.6960182335271062, '… Right');
  const q = c.st2PropInt2(0.95, 45, 100, 30, 80);
  near(q.lo, -0.06908984860138585, '2-Prop интервал: Left', 1e-9); near(q.hi, 0.21908984860138586, '… Right');
  t.eq(errOf(() => c.st2ZInt1(0, 2, 11, 16)), 'Ma ERROR', 'интервал: уровень 0');
  t.eq(errOf(() => c.st2ZInt1(100, 2, 11, 16)), 'Ma ERROR', 'интервал: уровень 100');
}

// --- диаграмма NPPlot и подписи SUB ---
{
  const z = c.st2NormScores(5);
  near(z[0], -1.2815515655446008, 'NPPlot: первое ожидаемое значение'); near(z[1], -0.5244005127080409, 'NPPlot: второе');
  t.eq(Math.abs(z[2]) < 1e-12, true, 'NPPlot: середина в нуле'); near(z[4], 1.2815515655446004, 'NPPlot: последнее');
  t.eq([c.st2SubChar({ id: 'XTT', alpha: true }), c.st2SubChar({ id: '7' }), c.st2SubChar({ id: '7', shift: true }), c.st2SubChar({ id: 'SIN' })].join(), 'A,7,,', 'знаки подписи SUB');
}

const bad = t.done('Статистика, дополнение');
if (process.argv.includes('web')) {
  const { open } = require('./web');
  (async () => {
    const w = runner();
    const b = await open({ w: 393, h: 852 });
    await b.page.evaluate(() => { localStorage.clear(); });
    await b.page.reload();
    await b.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
    const has = async (s, what) => { const txt = await b.text(); w.eq(txt.includes(s), true, what + ' («' + s + '» среди: ' + txt.join(' | ') + ')'); };
    const ev = (fn) => b.page.evaluate(fn);
    // матрица наблюдений для χ²-теста: [[10,20][30,40]] → Mat A
    await b.keys('MENU 1 SHIFT ADD SHIFT ADD 1 0 COMMA 2 0 SHIFT SUB SHIFT ADD 3 0 COMMA 4 0 SHIFT SUB SHIFT SUB STO SHIFT 2 ALPHA XTT EXE EXIT');
    w.eq(await ev(() => window.__calc.mem.mats.A.map((r) => r.map((x) => x.v).join()).join(';')), '10,20;30,40', 'Mat A записана');
    // списки: выборки A и B
    await b.keys('MENU 2 5 DOT 1 EXE 4 DOT 9 EXE 5 DOT 6 EXE 5 DOT 8 EXE 6 EXE RIGHT 4 DOT 4 EXE 4 DOT 9 EXE 5 EXE 4 DOT 6 EXE 5 DOT 2 EXE 4 DOT 7 EXE');
    w.eq(await ev(() => window.__calc.mem.lists[0].length + ',' + window.__calc.mem.lists[1].length), '5,6', 'списки введены');
    // меню TEST и INTR
    await b.keys('F3');
    await has('ANOVA', 'меню TEST');
    await has('CHI', 'меню TEST: CHI');
    // 1-Sample ZTest по введённым числам: μ0 = 10, σ = 2, x̄ = 11, n = 16
    await b.keys('F1 F1');
    await has('1-Sample ZTest', 'форма Z-теста');
    await has('Variable', 'Data: Variable');
    await b.keys('DOWN DOWN 1 0 EXE 2 EXE 1 1 EXE 1 6 EXE EXE');
    await has('=2', 'Z-тест: z = 2');
    await has('=0.0455002639', 'Z-тест: p');
    await has('μ≠10', 'Z-тест: строка условия');
    await b.keys('EXIT UP UP UP UP UP F3 DOWN DOWN DOWN DOWN DOWN EXE');   // к строке μ, альтернатива «>», снова Execute
    await has('=0.02275013195', 'Z-тест: альтернатива «>»');
    await b.keys('EXIT EXIT EXIT');
    // 1-Sample tTest по списку: μ0 = 5
    await b.keys('F2 F1 F1');
    await has('1-Sample tTest', 'форма t-теста');
    await has('List1', 'Data: List — строка списка');
    await b.keys('DOWN DOWN 5 EXE DOWN DOWN EXE');
    await has('=2.304073732', 't-тест: t');
    await has('=0.08256829675', 't-тест: p');
    await has('=5.48', 't-тест: среднее');
    await b.keys('EXIT EXIT');
    // 2-Sample tTest по спискам, без объединения дисперсий
    await b.keys('F2 F1 DOWN DOWN DOWN DOWN DOWN DOWN DOWN EXE');
    await has('2-Sample tTest', 'экран 2-Sample t');
    await has('=2.838265162', '2-Sample t: t');
    await has('=6.459173871', '2-Sample t: df');
    await b.keys('EXIT EXIT');
    // LinearReg tTest не подходит к спискам разной длины
    await b.keys('F3 DOWN DOWN DOWN DOWN EXE');
    await has('Dimension ERROR', 'LinearReg t: списки разной длины');
    await b.keys('EXIT EXIT EXIT');
    // χ²-тест 2WAY: Mat A → ожидаемые в Mat B
    await b.keys('F3 F2 DOWN DOWN EXE');
    await has('=0.7936507937', 'χ² 2WAY: статистика');
    await has('=0.3729984836', 'χ² 2WAY: p');
    w.eq(await ev(() => window.__calc.mem.mats.B.map((r) => r.map((x) => x.v).join()).join(';')), '12,18;28,42', 'ожидаемые частоты записаны в Mat B');
    await b.keys('EXIT EXIT EXIT EXIT');
    // INTR: 1-Sample tInterval по списку
    await b.keys('F4');
    await has('Z', 'меню INTR');
    await b.keys('F2 F1 F1 DOWN DOWN DOWN DOWN EXE');
    await has('1-Sample tInterval', 'экран t-интервала');
    await has('=4.901592446', 't-интервал: Left');
    await has('=6.058407554', 't-интервал: Right');
    await b.keys('EXIT EXIT EXIT EXIT');
    // DIST: tcd(−1…2), df = 5 и Invt(0.025), df = 10
    await b.keys('F5 F2 F2 DOWN NEG 1 EXE 2 EXE 5 EXE EXE');
    await has('Student-t C.D', 'экран tcd');
    await has('=0.7674215268', 'tcd(−1…2), df = 5');
    await b.keys('EXIT EXIT F3 DOWN 0 DOT 0 2 5 EXE 1 0 EXE EXE');
    await has('=2.228138852', 'Invt(0.025), df = 10');
    await b.keys('EXIT EXIT EXIT');
    // CHI: Ccd(0…3), df = 2 и F: InvF(0.05; 2, 10)
    await b.keys('F3 F2 DOWN 0 EXE 3 EXE 2 EXE EXE');
    await has('=0.7768698399', 'Ccd(0…3), df = 2');
    await b.keys('EXIT EXIT EXIT F4 F3 DOWN 0 DOT 0 5 EXE 2 EXE 1 0 EXE EXE');
    await has('=4.102821015', 'InvF(0.05; 2, 10)');
    await b.keys('EXIT EXIT EXIT');
    // вторая страница DIST: GEO и H.GEO; InvB на первой
    await b.keys('F6 F2 F1 DOWN 3 EXE 0 DOT 2 EXE EXE');
    await has('=0.128', 'Gpd(3; 0.2)');
    await b.keys('EXIT EXIT EXIT F3 F1 DOWN 1 EXE 3 EXE 4 EXE 1 0 EXE EXE');
    await has('=0.5', 'Hpd(1; 3, 4, 10)');
    await b.keys('EXIT EXIT EXIT F6 F5 F3 DOWN 0 DOT 5 EXE 1 0 EXE 0 DOT 5 EXE EXE');
    await has('=5', 'InvB(0.5; 10, 0.5)');
    await b.keys('EXIT EXIT EXIT EXIT');
    // диаграммы: Pie, NPPlot, N-Dist
    await b.keys('F1 F6 DOWN F4');
    await has('Pie', 'Graph Type: Pie');
    await has('Display', 'строка Display у круговой');
    await b.keys('EXIT F1');
    w.eq(await ev(() => window.__calc.UI.apps.stat.gr.gs.map((g) => g.kind).join()), 'pie', 'круговая диаграмма построена');
    await b.keys('SHIFT F1 RIGHT');
    await has('B=17.88%', 'трассировка по секторам');
    await b.keys('EXIT EXIT F1 F6 DOWN F3 EXIT F1');
    w.eq(await ev(() => window.__calc.UI.apps.stat.gr.gs[0].kind), 'npp', 'NPPlot построен');
    await b.keys('SHIFT F1');
    await has('X=4.9', 'NPPlot: трассировка с наименьшего значения');
    await b.keys('EXIT EXIT F1 F6 DOWN F6 F4 EXIT F1');
    w.eq(await ev(() => window.__calc.UI.apps.stat.gr.gs[0].kind), 'ndist', 'N-Dist построен');
    await b.keys('F1');
    await has('1-Variable', 'N-Dist: 1-VAR');
    await b.keys('EXIT EXIT');
    // подпись списка в строке SUB
    await b.keys('LEFT LEFT UP UP UP UP UP UP UP ALPHA XTT ALPHA LOG 1 EXE');
    w.eq(await ev(() => window.__calc.mem.listSub[0]), 'AB1', 'подпись списка записана');
    await has('AB1', 'подпись видна в редакторе');
    await b.keys('RIGHT ALPHA LN EXE DOWN');
    w.eq(await ev(() => window.__calc.mem.listSub[1] + ',' + window.__calc.UI.apps.stat.sub), 'C,false', 'подпись второго списка и выход из строки SUB');
    w.eq(b.errs.join('; '), '', 'без ошибок JS');
    await b.close();
    process.exit(bad || w.done('Статистика, дополнение, клавиши') ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
} else process.exit(bad ? 1 : 0);
