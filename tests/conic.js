// Тесты режима Conic Graphs: node tests/conic.js       — расчёты (вид кривой, фокусы, вершины, асимптоты…), без браузера
//                             node tests/conic.js web   — ещё и сценарии «с клавиш» в браузере (нужен собранный index.html)
const { load, runner } = require('./lib');
const core = load(['00-util.js', '10-num.js', '15-numeric.js', '20-parse.js', '40-ui.js', '60-run.js', '83-conic.js'],
  ['G', 'S', 'CalcError', 'CON_FORMS', 'conCurve', 'conProps', 'conY', 'conPaths', 'conLineEq', 'conSolvItems']);
const { CalcError, CON_FORMS, conCurve, conProps, conY, conPaths, conLineEq, conSolvItems } = core;
const t = runner();

// Число «как на экране»: до 10 значащих цифр, без хвоста из нулей
const n = (v) => String(Number(v.toPrecision(10)));
const pts = (a) => a.map((p) => `(${n(p.x)},${n(p.y)})`).join(' ');
const line = (l) => (l.x !== undefined ? `x=${n(l.x)}` : l.y !== undefined ? `y=${n(l.y)}` : `y=${n(l.m)}x+${n(l.b)}`);
const props = (id, c) => conProps(conCurve(id, c));
const err = (id, c) => { try { conCurve(id, c); return 'ok'; } catch (e) { if (e instanceof CalcError) return e.type; throw e; } };

// ---------- виды уравнений ----------
t.eq(CON_FORMS.length, 9, 'девять видов уравнений');
t.eq(CON_FORMS.map((f) => f.text).join(' | '),
  'X=A(Y-K)^2+H | X=AY^2+BY+C | Y=A(X-H)^2+K | Y=AX^2+BX+C | (X-H)^2+(Y-K)^2=R^2 | AX^2+AY^2+BX+CY+D=0 | (X-H)^2/A^2+(Y-K)^2/B^2=1 | (X-H)^2/A^2-(Y-K)^2/B^2=1 | (Y-K)^2/A^2-(X-H)^2/B^2=1',
  'порядок видов');

// ---------- парабола Y=A(X−H)²+K: y = (x−1)²−4 ----------
{
  const p = props('py1', { A: 1, H: 1, K: -4 });
  t.eq(pts(p.VERTEX), '(1,-4)', 'py1: вершина');
  t.eq(pts(p.FOCUS), '(1,-3.75)', 'py1: фокус');
  t.eq(line(p.DIRECTX), 'y=-4.25', 'py1: директриса');
  t.eq(line(p.SYMMETRY), 'x=1', 'py1: ось симметрии');
  t.eq(n(p.LENGTH), '1', 'py1: фокальная хорда');
  t.eq(n(p.e), '1', 'py1: эксцентриситет');
  t.eq(pts(p.XICEPT), '(-1,0) (3,0)', 'py1: пересечения с осью X');
  t.eq(pts(p.YICEPT), '(0,-3)', 'py1: пересечение с осью Y');
}
// то же в общем виде: y = x²−2x−3
{
  const q = conCurve('py2', { A: 1, B: -2, C: -3 });
  t.eq(`${q.kind} a=${q.a} h=${q.h} k=${q.k}`, 'parabY a=1 h=1 k=-4', 'py2: приведение к вершинному виду');
  const p = conProps(q);
  t.eq(pts(p.XICEPT) + ' / ' + pts(p.YICEPT), '(-1,0) (3,0) / (0,-3)', 'py2: пересечения с осями');
}
// ветви вниз, ось X не пересекает: y = −2(x+1)²−3
{
  const p = props('py1', { A: -2, H: -1, K: -3 });
  t.eq(pts(p.FOCUS), '(-1,-3.125)', 'py1 вниз: фокус');
  t.eq(line(p.DIRECTX), 'y=-2.875', 'py1 вниз: директриса');
  t.eq(n(p.LENGTH), '0.5', 'py1 вниз: фокальная хорда');
  t.eq(p.XICEPT.length, 0, 'py1 вниз: с осью X не пересекается');
  t.eq(pts(p.YICEPT), '(0,-5)', 'py1 вниз: пересечение с осью Y');
}
// касание оси X: y = (x−2)²
t.eq(pts(props('py1', { A: 1, H: 2, K: 0 }).XICEPT), '(2,0)', 'py1: касание оси X — одна точка');
t.eq(pts(props('py2', { A: 0.1, B: -0.2, C: 0.1 }).XICEPT), '(1,0)', 'py2: касание оси X при десятичных коэффициентах');

// ---------- парабола X=A(Y−K)²+H: x = 2(y−1)²−8 ----------
{
  const p = props('px1', { A: 2, K: 1, H: -8 });
  t.eq(pts(p.VERTEX), '(-8,1)', 'px1: вершина');
  t.eq(pts(p.FOCUS), '(-7.875,1)', 'px1: фокус');
  t.eq(line(p.DIRECTX), 'x=-8.125', 'px1: директриса');
  t.eq(line(p.SYMMETRY), 'y=1', 'px1: ось симметрии');
  t.eq(n(p.LENGTH), '0.5', 'px1: фокальная хорда');
  t.eq(pts(p.YICEPT), '(0,-1) (0,3)', 'px1: пересечения с осью Y');
  t.eq(pts(p.XICEPT), '(-6,0)', 'px1: пересечение с осью X');
}
{
  const q = conCurve('px2', { A: 1, B: 0, C: -4 });
  t.eq(`${q.kind} a=${q.a} h=${q.h} k=${q.k}`, 'parabX a=1 h=-4 k=0', 'px2: x = y²−4');
  const p = conProps(q);
  t.eq(pts(p.FOCUS) + ' / ' + pts(p.YICEPT) + ' / ' + pts(p.XICEPT), '(-3.75,0) / (0,-2) (0,2) / (-4,0)', 'px2: фокус и пересечения');
  const q2 = conCurve('px2', { A: -1, B: 4, C: 1 });        // x = −y²+4y+1 = −(y−2)²+5
  t.eq(`h=${q2.h} k=${q2.k}`, 'h=5 k=2', 'px2: вершина x = −y²+4y+1');
}

// ---------- окружность ----------
{
  const p = props('c1', { H: 1, K: 2, R: 3 });
  t.eq(pts(p.CENTER), '(1,2)', 'c1: центр');
  t.eq(n(p.RADIUS), '3', 'c1: радиус');
  t.eq(pts(p.XICEPT), `(${n(1 - Math.sqrt(5))},0) (${n(1 + Math.sqrt(5))},0)`, 'c1: пересечения с осью X');
  t.eq(pts(p.YICEPT), `(0,${n(2 - Math.sqrt(8))}) (0,${n(2 + Math.sqrt(8))})`, 'c1: пересечения с осью Y');
  t.eq(n(props('c1', { H: 0, K: 0, R: -2 }).RADIUS), '2', 'c1: отрицательное R — тот же круг радиуса |R|');
  t.eq(props('c1', { H: 5, K: 5, R: 1 }).XICEPT.length + props('c1', { H: 5, K: 5, R: 1 }).YICEPT.length, 0, 'c1: далеко от осей — пересечений нет');
  t.eq(pts(props('c1', { H: 3, K: 2, R: 2 }).XICEPT), '(3,0)', 'c1: касание оси X');
}
{
  const q = conCurve('c2', { A: 1, B: -2, C: -4, D: -4 });   // x²+y²−2x−4y−4=0 → (x−1)²+(y−2)²=9
  t.eq(`${q.kind} h=${q.h} k=${q.k} r=${q.r}`, 'circle h=1 k=2 r=3', 'c2: центр и радиус из общего вида');
  const q2 = conCurve('c2', { A: 2, B: 8, C: 0, D: -10 });   // 2x²+2y²+8x−10=0 → (x+2)²+y²=9
  t.eq(`h=${q2.h} k=${q2.k} r=${q2.r}`, 'h=-2 k=0 r=3', 'c2: общий множитель A');
}

// ---------- эллипс ----------
{
  const p = props('e', { A: 5, B: 3, H: 0, K: 0 });
  t.eq(pts(p.FOCUS), '(-4,0) (4,0)', 'эллипс: фокусы');
  t.eq(pts(p.VERTEX), '(-5,0) (5,0)', 'эллипс: вершины');
  t.eq(pts(p.CENTER), '(0,0)', 'эллипс: центр');
  t.eq(n(p.e), '0.8', 'эллипс: эксцентриситет');
  t.eq(pts(p.XICEPT) + ' / ' + pts(p.YICEPT), '(-5,0) (5,0) / (0,-3) (0,3)', 'эллипс: пересечения с осями');
  const v = props('e', { A: 3, B: 5, H: 1, K: -2 });           // вытянут по вертикали
  t.eq(pts(v.FOCUS), '(1,-6) (1,2)', 'эллипс вертикальный: фокусы');
  t.eq(pts(v.VERTEX), '(1,-7) (1,3)', 'эллипс вертикальный: вершины');
  t.eq(n(v.e), '0.8', 'эллипс вертикальный: эксцентриситет');
  const c = props('e', { A: 2, B: 2, H: 0, K: 0 });            // окружность как эллипс
  t.eq(pts(c.FOCUS) + ' e=' + n(c.e), '(0,0) e=0', 'эллипс с A=B: один фокус в центре');
  t.eq(props('e', { A: 1, B: 1, H: 4, K: 4 }).XICEPT.length, 0, 'эллипс: далеко от осей — пересечений нет');
}

// ---------- гиперболы ----------
{
  const p = props('hx', { A: 3, B: 4, H: 0, K: 0 });
  t.eq(pts(p.FOCUS), '(-5,0) (5,0)', 'гипербола X: фокусы');
  t.eq(pts(p.VERTEX), '(-3,0) (3,0)', 'гипербола X: вершины');
  t.eq(n(p.e), n(5 / 3), 'гипербола X: эксцентриситет');
  t.eq(p.ASYMPT.map(line).join(' ; '), `y=${n(4 / 3)}x+0 ; y=${n(-4 / 3)}x+0`, 'гипербола X: асимптоты');
  t.eq(pts(p.XICEPT), '(-3,0) (3,0)', 'гипербола X: пересечения с осью X');
  t.eq(p.YICEPT.length, 0, 'гипербола X: ось Y не пересекает');
  const s = props('hx', { A: 1, B: 1, H: 2, K: 1 });           // сдвинутая: (x−2)²−(y−1)²=1
  t.eq(s.ASYMPT.map(line).join(' ; '), 'y=1x+-1 ; y=-1x+3', 'гипербола X со сдвигом: асимптоты');
  t.eq(pts(s.YICEPT), `(0,${n(1 - Math.sqrt(3))}) (0,${n(1 + Math.sqrt(3))})`, 'гипербола X со сдвигом: пересечения с осью Y');
}
{
  const p = props('hy', { A: 3, B: 4, H: 1, K: 2 });
  t.eq(pts(p.FOCUS), '(1,-3) (1,7)', 'гипербола Y: фокусы');
  t.eq(pts(p.VERTEX), '(1,-1) (1,5)', 'гипербола Y: вершины');
  t.eq(pts(p.CENTER), '(1,2)', 'гипербола Y: центр');
  t.eq(p.ASYMPT.map(line).join(' ; '), 'y=0.75x+1.25 ; y=-0.75x+2.75', 'гипербола Y: асимптоты');
  t.eq(pts(p.YICEPT), `(0,${n(2 - 3 * Math.sqrt(1 + 1 / 16))}) (0,${n(2 + 3 * Math.sqrt(1 + 1 / 16))})`, 'гипербола Y: пересечения с осью Y');
  t.eq(p.XICEPT.length, 0, 'гипербола Y: ось X не пересекает');
  t.eq(pts(props('hy', { A: 1, B: 1, H: 0, K: 2 }).XICEPT), `(${n(-Math.sqrt(3))},0) (${n(Math.sqrt(3))},0)`, 'гипербола Y: пересечения с осью X');
}

// ---------- вырожденные коэффициенты ----------
t.eq(err('py1', { A: 0, H: 1, K: 1 }), 'Ma ERROR', 'парабола: A=0');
t.eq(err('px2', { A: 0, B: 1, C: 1 }), 'Ma ERROR', 'парабола X: A=0');
t.eq(err('c1', { H: 0, K: 0, R: 0 }), 'Ma ERROR', 'окружность: R=0');
t.eq(err('c2', { A: 1, B: 0, C: 0, D: 1 }), 'Ma ERROR', 'окружность: x²+y²+1=0');
t.eq(err('c2', { A: 1, B: 0, C: 0, D: 0 }), 'Ma ERROR', 'окружность: x²+y²=0 — точка');
t.eq(err('c2', { A: 0, B: 1, C: 1, D: 1 }), 'Ma ERROR', 'окружность: A=0');
t.eq(err('e', { A: 0, B: 1, H: 0, K: 0 }), 'Ma ERROR', 'эллипс: A=0');
t.eq(err('hx', { A: 1, B: 0, H: 0, K: 0 }), 'Ma ERROR', 'гипербола: B=0');
t.eq(err('hy', { A: 0, B: 0, H: 0, K: 0 }), 'Ma ERROR', 'все нули');
t.eq(err('py1', { A: 1, H: NaN, K: 0 }), 'Ma ERROR', 'нечисловой коэффициент');
t.eq(err('c1', { H: 1, K: 2, R: 3 }), 'ok', 'обычная окружность — без ошибки');

// ---------- значения Y при данном X (для Trace) ----------
t.eq(conY(conCurve('py1', { A: 1, H: 1, K: -4 }), 3).join(), '0', 'conY: парабола — одно значение');
t.eq(conY(conCurve('c1', { H: 1, K: 2, R: 3 }), 1).join(), '5,-1', 'conY: окружность — верх и низ');
t.eq(conY(conCurve('c1', { H: 1, K: 2, R: 3 }), 4).join(), '2,2', 'conY: крайняя точка окружности');
t.eq(conY(conCurve('c1', { H: 1, K: 2, R: 3 }), 4.5).every(Number.isNaN), true, 'conY: вне окружности — нет значения');
t.eq(conY(conCurve('px1', { A: 1, K: 0, H: -4 }), 0).join(), '2,-2', 'conY: парабола X — две половины');
t.eq(conY(conCurve('px1', { A: 1, K: 0, H: -4 }), -5).every(Number.isNaN), true, 'conY: левее вершины параболы X');
t.eq(conY(conCurve('e', { A: 5, B: 3, H: 0, K: 0 }), 4).map(n).join(), '1.8,-1.8', 'conY: эллипс');
t.eq(conY(conCurve('hx', { A: 3, B: 4, H: 0, K: 0 }), 5).map(n).join(), `${n(16 / 3)},${n(-16 / 3)}`, 'conY: гипербола X');
t.eq(conY(conCurve('hx', { A: 3, B: 4, H: 0, K: 0 }), 1).every(Number.isNaN), true, 'conY: между ветвями гиперболы X');
t.eq(conY(conCurve('hy', { A: 3, B: 4, H: 0, K: 0 }), 0).join(), '3,-3', 'conY: гипербола Y в вершинах');

// ---------- точки для рисования лежат на кривой ----------
{
  const box = { x0: -6.4, x1: 6.4, y0: -3.2, y1: 3.2 };
  const cases = [
    ['px1', { A: 0.5, K: 1, H: -2 }, (x, y) => x - (0.5 * (y - 1) ** 2 - 2), 1],
    ['px2', { A: -1, B: 2, C: 3 }, (x, y) => x - (-y * y + 2 * y + 3), 1],
    ['py1', { A: 2, H: -1, K: -2 }, (x, y) => y - (2 * (x + 1) ** 2 - 2), 1],
    ['py2', { A: -0.5, B: 1, C: 2 }, (x, y) => y - (-0.5 * x * x + x + 2), 1],
    ['c1', { H: 1, K: -1, R: 2 }, (x, y) => (x - 1) ** 2 + (y + 1) ** 2 - 4, 1],
    ['c2', { A: 2, B: 4, C: -8, D: 2 }, (x, y) => 2 * x * x + 2 * y * y + 4 * x - 8 * y + 2, 1],
    ['e', { A: 4, B: 2, H: 1, K: 0.5 }, (x, y) => ((x - 1) / 4) ** 2 + ((y - 0.5) / 2) ** 2 - 1, 1],
    ['hx', { A: 2, B: 1, H: -1, K: 0.5 }, (x, y) => ((x + 1) / 2) ** 2 - (y - 0.5) ** 2 - 1, 2],
    ['hy', { A: 1, B: 2, H: 0.5, K: -1 }, (x, y) => (y + 1) ** 2 - ((x - 0.5) / 2) ** 2 - 1, 2]
  ];
  for (const [id, c, f, branches] of cases) {
    const paths = conPaths(conCurve(id, c), box);
    let worst = 0, count = 0;
    for (const p of paths) for (const [x, y] of p) { worst = Math.max(worst, Math.abs(f(x, y)) / (1 + x * x + y * y)); count++; }
    t.eq(paths.length, branches, `${id}: число ветвей`);
    t.eq(worst < 1e-9 && count > 300, true, `${id}: точки для рисования лежат на кривой (отклонение ${worst.toExponential(1)})`);
  }
  // замкнутые кривые замкнуты, ветви гиперболы уходят за край видимой области
  const circ = conPaths(conCurve('c1', { H: 0, K: 0, R: 2 }), box)[0];
  t.eq(circ[0].join(), circ[circ.length - 1].join(), 'окружность замкнута');
  const hyp = conPaths(conCurve('hx', { A: 1, B: 1, H: 0, K: 0 }), box);
  t.eq(hyp.every((p) => Math.abs(p[0][1]) >= 3.2 && Math.abs(p[p.length - 1][1]) >= 3.2), true, 'ветви гиперболы X доходят до края экрана');
  const hypY = conPaths(conCurve('hy', { A: 1, B: 1, H: 0, K: 0 }), box);
  t.eq(hypY.every((p) => Math.abs(p[0][0]) >= 3.2 && Math.abs(p[p.length - 1][0]) >= 3.2), true, 'ветви гиперболы Y доходят до края экрана');
  const hy0 = hypY.map((p) => p[Math.floor(p.length / 2)].join());
  t.eq(hy0.join(' '), '0,1 0,-1', 'середина каждой ветви — её вершина');
}

// ---------- подписи прямых и состав меню G-Solv ----------
t.eq(conLineEq({ x: 3 }), 'X=3', 'подпись вертикальной прямой');
t.eq(conLineEq({ y: -4.25 }), 'Y=−4.25', 'подпись горизонтальной прямой');
t.eq(conLineEq({ m: 0.75, b: 1.25 }), 'Y=0.75X+1.25', 'подпись наклонной прямой');
t.eq(conLineEq({ m: -1, b: 3 }), 'Y=−X+3', 'наклон −1');
t.eq(conLineEq({ m: 1, b: -1 }), 'Y=X−1', 'наклон 1, отрицательный сдвиг');
t.eq(conLineEq({ m: 2, b: 0 }), 'Y=2X', 'без свободного члена');
const menu = (kind) => conSolvItems(kind).map((it) => (it ? it[0] : '·')).join(' ');
t.eq(menu('parabY'), 'FOCUS VERTEX LENGTH e DIRECTX SYMMETRY X-ICEPT Y-ICEPT', 'G-Solv: парабола');
t.eq(menu('parabX'), menu('parabY'), 'G-Solv: парабола X — те же пункты');
t.eq(menu('circle'), 'CENTER RADIUS X-ICEPT Y-ICEPT', 'G-Solv: окружность');
t.eq(menu('ellipse'), 'FOCUS VERTEX CENTER e · X-ICEPT Y-ICEPT', 'G-Solv: эллипс');
t.eq(menu('hyperX'), 'FOCUS VERTEX CENTER e ASYMPT X-ICEPT Y-ICEPT', 'G-Solv: гипербола');
t.eq(menu('hyperY'), menu('hyperX'), 'G-Solv: гипербола Y — те же пункты');
// у каждого пункта меню есть данные в conProps
{
  const sample = { parabY: ['py1', { A: 1, H: 0, K: 0 }], parabX: ['px1', { A: 1, K: 0, H: 0 }], circle: ['c1', { H: 0, K: 0, R: 1 }],
    ellipse: ['e', { A: 2, B: 1, H: 0, K: 0 }], hyperX: ['hx', { A: 1, B: 1, H: 0, K: 0 }], hyperY: ['hy', { A: 1, B: 1, H: 0, K: 0 }] };
  let missing = 0;
  for (const kind of Object.keys(sample)) {
    const p = props(...sample[kind]);
    for (const it of conSolvItems(kind)) if (it && p[it[1]] === undefined) missing++;
  }
  t.eq(missing, 0, 'для каждого пункта G-Solv есть расчёт');
}

const unit = t.done('Conic Graphs (расчёты)');

// ---------- сценарии с клавиш ----------
async function web() {
  const { open } = require('./web');
  const u = runner();
  const c = await open({ w: 393, h: 852, dpr: 1 });
  await c.page.evaluate(() => localStorage.clear());
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  const has = async (keys, want, what, not) => {
    if (keys) await c.keys(keys);
    const txt = (await c.text()).join(' | ');
    const ok = want.every((w) => txt.includes(w)) && !(not || []).some((w) => txt.includes(w));
    u.eq(ok ? 'есть' : txt, 'есть', what);
  };
  const app = (expr) => c.page.evaluate(`(() => { const a = window.__calc.UI.apps.conic; return ${expr}; })()`);

  await has('MENU 9', ['X=A(Y-K)^2+H', 'X=AY^2+BY+C', 'Y=A(X-H)^2+K'], 'главное меню: клавиша 9 открывает выбор вида');
  u.eq(await c.page.evaluate(() => window.__calc.UI.appId), 'conic', 'режим conic открыт');
  await has('DOWN DOWN EXE', ['Y=A(X-H)^2+K', 'A=', 'H=', 'K=', 'DRAW'], 'экран коэффициентов Y=A(X−H)²+K');
  await has('F6', ['Ma ERROR'], 'все коэффициенты нулевые — Ma ERROR');
  await has('EXIT 1 EXE 1 EXE NEG 4 EXE', ['A=', '1', '−4'], 'ввод коэффициентов');
  u.eq(await app('JSON.stringify(a.vals.py1)'), '{"A":1,"H":1,"K":-4}', 'коэффициенты записаны');
  await has('F6', [], 'DRAW: график', ['A=', 'DRAW']);
  u.eq(await app('a.page + " " + a.g.q.kind'), 'graph parabY', 'открыт экран графика');
  await has('F5', ['FOCUS', 'VERTEX', 'LENGTH', 'e', 'DIRECTX', '▷'], 'меню G-Solv параболы');
  await has('F1', ['FOCUS', 'X=1', 'Y=−3.75'], 'G-Solv FOCUS');
  await has('F5 F2', ['VERTEX', 'X=1', 'Y=−4'], 'G-Solv VERTEX');
  await has('F5 F3', ['LENGTH=1'], 'G-Solv LENGTH');
  await has('F5 F4', ['e=1'], 'G-Solv e');
  await has('F5 F5', ['DIRECTX', 'Y=−4.25'], 'G-Solv DIRECTX');
  await has('F5 F6 F1', ['SYMMETRY', 'X=1'], 'G-Solv SYMMETRY');
  await has('F5 F6 F2', ['X-ICEPT', 'X=−1', 'Y=0'], 'G-Solv X-ICEPT: первая точка');
  await has('RIGHT', ['X-ICEPT', 'X=3', 'Y=0'], 'G-Solv X-ICEPT: ► — вторая точка');
  await has('F5 F6 F3', ['Y-ICEPT', 'X=0', 'Y=−3'], 'G-Solv Y-ICEPT');
  await has('EXIT F1', ['X=0', 'Y=−3'], 'Trace начинается в середине экрана');
  await has('RIGHT RIGHT RIGHT', ['X=0.1', 'Y=−3.19'], 'Trace: три шага вправо');
  await has('2 EXE', ['X=2', 'Y=−3'], 'Trace: переход к набранному X');
  u.eq(await c.page.evaluate(() => window.__calc.mem.vars.X.v + ',' + window.__calc.mem.vars.Y.v), '2,-3', 'Trace записывает X и Y в переменные');
  await c.keys('EXIT');
  const xmax = () => c.page.evaluate(() => { window.__calc.keys('SHIFT F3'); const t = window.__calc.text().join(' | '); window.__calc.keys('EXIT'); return t; });
  await c.keys('ADD');
  u.eq((await xmax()).includes('| 3.15 |'), true, 'клавиша «+» приближает: Xmax = 3.15');
  await c.keys('F2 F4');
  u.eq((await xmax()).includes('| 6.3 |'), true, 'Zoom OUT возвращает Xmax = 6.3');
  await c.keys('EXIT RIGHT');
  u.eq((await xmax()).includes('| 7.1 |'), true, 'стрелка сдвигает окно');
  await c.keys('F2 F6 F1');            // ORIGINAL сам закрывает меню
  u.eq((await xmax()).includes('| 6.3 |'), true, 'Zoom ORIGINAL возвращает исходное окно');
  await has('EXIT', ['A=', 'H=', 'K=', 'DRAW'], 'EXIT с графика — назад к коэффициентам');
  await has('EXIT', ['X=A(Y-K)^2+H'], 'EXIT с коэффициентов — назад к выбору вида');

  // окружность (X−H)²+(Y−K)²=R²
  await has('DOWN DOWN EXE', ['(X-H)^2+(Y-K)^2=R^2', 'H=', 'K=', 'R='], 'коэффициенты окружности');
  await c.keys('1 EXE 1 EXE 2 EXE EXE');
  u.eq(await app('a.page + " " + a.g.q.kind + " " + a.g.q.r'), 'graph circle 2', 'EXE без ввода рисует график');
  await has('F5 F1', ['CENTER', 'X=1', 'Y=1'], 'G-Solv CENTER');
  await has('F5 F2', ['RADIUS=2'], 'G-Solv RADIUS');
  await has('F5 F3', ['X-ICEPT', 'X=−0.7320508076'], 'G-Solv X-ICEPT окружности');
  await has('F1', ['X=0', 'Y=2.732050808'], 'Trace по окружности: верхняя половина');
  await has('DOWN', ['X=0', 'Y=−0.7320508076'], 'Trace: ▼ — нижняя половина');
  for (let i = 0; i < 12; i++) await c.keys('RIGHT RIGHT RIGHT RIGHT RIGHT RIGHT RIGHT RIGHT RIGHT RIGHT');
  await has('', ['X=3', 'Y=1'], 'Trace: у правого края окружности указатель останавливается');
  await c.keys('EXIT EXIT EXIT');

  // гипербола (X−H)²/A²−(Y−K)²/B²=1 с асимптотами
  await has('DOWN DOWN DOWN EXE', ['(X-H)^2/A^2-(Y-K)^2/B^2=1', 'A=', 'B=', 'H=', 'K='], 'коэффициенты гиперболы');
  await c.keys('2 EXE 1 EXE 0 EXE 0 EXE F6');
  await has('F5 F5', ['Y=0.5X', 'Y=−0.5X'], 'G-Solv ASYMPT: обе асимптоты');
  await has('F5 F1', ['FOCUS', 'X=−2.236067977', 'Y=0'], 'G-Solv FOCUS гиперболы: левый фокус');
  await has('RIGHT', ['FOCUS', 'X=2.236067977'], 'G-Solv FOCUS: ► — правый фокус');
  await has('F5 F6 F2', ['Not Found'], 'G-Solv Y-ICEPT: гипербола не пересекает ось Y');
  await has('EXIT EXIT F1', ['X=2', 'Y=0'], 'Trace: середина экрана между ветвями — ближайшая точка кривой');   // окно ошибки, меню, Trace
  await has('LEFT', ['X=−2', 'Y=0'], 'Trace: ◄ перескакивает на левую ветвь');
  await c.keys('EXIT EXIT EXIT');

  // эллипс и вторая гипербола — рисуются без ошибок
  await c.keys('UP EXE 3 EXE 2 EXE 0 EXE 0 EXE F6');
  await has('F5 F2', ['VERTEX', 'X=−3', 'Y=0'], 'эллипс: G-Solv VERTEX');
  await has('F5 F6 F2', ['Y-ICEPT', 'X=0', 'Y=−2'], 'эллипс: G-Solv Y-ICEPT');
  await c.keys('EXIT EXIT EXIT DOWN DOWN EXE 1 EXE 1 EXE 0 EXE 0 EXE F6');
  await has('F5 F2', ['VERTEX', 'X=0', 'Y=−1'], 'гипербола Y: G-Solv VERTEX');
  await c.keys('EXIT EXIT EXIT');

  // сохранение после перезагрузки страницы
  await c.page.waitForTimeout(800);
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  await c.keys('MENU 9');
  u.eq(await app('a.sel + " " + JSON.stringify(a.vals.c1) + " " + JSON.stringify(a.vals.hx)'), '8 {"H":1,"K":1,"R":2} {"A":2,"B":1,"H":0,"K":0}', 'после перезагрузки: вид и коэффициенты на месте');

  // случайные нажатия в режиме: необработанных ошибок быть не должно
  const fails = await c.page.evaluate(() => {
    let seed = 12345, bad = 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const keys = [...document.querySelectorAll('[data-k]')].map((el) => el.dataset.k).filter((k) => k !== 'MENU');
    const common = ['EXE', 'EXE', 'EXIT', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'UP', 'DOWN', 'LEFT', 'RIGHT', '1', '2', '3', 'NEG', 'DOT', 'ADD', 'SUB'];
    for (let i = 0; i < 5000; i++) {
      if (i % 500 === 0) window.__calc.keys('MENU 9');
      const k = rnd() < 0.6 ? common[Math.floor(rnd() * common.length)] : keys[Math.floor(rnd() * keys.length)];
      try { window.__calc.press(k); } catch (e) { bad++; if (bad < 4) console.error(String(e && e.stack || e)); window.__calc.UI.modals.length = 0; window.__calc.UI.off = false; }
    }
    return bad;
  });
  u.eq(fails, 0, '5000 случайных нажатий без ошибок');
  u.eq(c.errs.join('; '), '', 'без ошибок JS');
  await c.close();
  return u.done('Conic Graphs (с клавиш)');
}

(async () => {
  const failed = unit + (process.argv.includes('web') ? await web() : 0);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
