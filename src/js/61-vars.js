// ══════ 61-vars.js — меню VARS: величины окна, масштаба, статистики, таблицы ══════
//
// Пункт меню вставляет знак (например «Xmin» или «x̄»), а при вычислении знак заменяется
// текущим значением — см. EXT_VARS в 20-parse.js.

G.STATR = '';                   // r — коэффициент корреляции (не путать с переменной r)
{
  const prev = lcd.special;
  lcd.special = function (ch, cx, cy, h, color) {
    if (ch === G.STATR) { this.g.font = `600 ${h * 0.96}px ${FONT}`; this.g.fillStyle = color; this.g.textAlign = 'center'; this.g.fillText('r', cx, cy + h * 0.34); return true; }
    return prev.call(this, ch, cx, cy, h, color);
  };
}

// Последние результаты статистики: запоминаются при каждом расчёте 1-VAR, 2-VAR и регрессии
const statLast = { one: null, two: null, reg: null };
if (typeof stat1 === 'function' && typeof stat2 === 'function' && typeof statReg === 'function') {
  const f1 = stat1, f2 = stat2, fr = statReg;
  stat1 = function (...a) { const r = f1(...a); statLast.one = r; return r; };            // eslint-disable-line no-func-assign
  stat2 = function (...a) { const r = f2(...a); statLast.two = r; statLast.one = null; return r; };   // eslint-disable-line no-func-assign
  statReg = function (...a) { const r = fr(...a); statLast.reg = r; return r; };          // eslint-disable-line no-func-assign
}

{
  const one = (k) => () => (statLast.one ? statLast.one[k] : undefined);
  const two = (k) => () => (statLast.two ? statLast.two[k] : undefined);
  const xk = (k1, k2) => () => (statLast.one ? statLast.one[k1] : statLast.two ? statLast.two[k2] : undefined);
  const reg = (name) => () => { const row = statLast.reg && statLast.reg.rows.find((q) => q[0] === name); return row ? row[1] : undefined; };
  const defs = {
    Xmin: () => VW.xmin, Xmax: () => VW.xmax, Xscl: () => VW.xscl, Xdot: () => xDot(),
    Ymin: () => VW.ymin, Ymax: () => VW.ymax, Yscl: () => VW.yscl,
    'Tθmin': () => VW.tmin, 'Tθmax': () => VW.tmax, 'Tθptch': () => VW.tptch,
    Xfct: () => ZOOM_FACT.x, Yfct: () => ZOOM_FACT.y,
    n: xk('n', 'n'), [G.XBAR]: xk('mean', 'meanX'), 'Σx': xk('sum', 'sumX'), 'Σx²': xk('sum2', 'sumX2'),
    'σx': xk('sdP', 'sdPX'), sx: xk('sdS', 'sdSX'), minX: xk('min', 'minX'), maxX: xk('max', 'maxX'),
    [G.YBAR]: two('meanY'), 'Σy': two('sumY'), 'Σy²': two('sumY2'), 'Σxy': two('sumXY'),
    'σy': two('sdPY'), sy: two('sdSY'), minY: two('minY'), maxY: two('maxY'),
    a: reg('a'), b: reg('b'), c: reg('c'), d: reg('d'), e: reg('e'), [G.STATR]: reg('r'), [G.STATR + '²']: reg('r²'), MSe: reg('MSe'),
    Q1: one('q1'), Med: one('med'), Q3: one('q3'), Mod: one('mode'),
    'F Start': () => TBL.start, 'F End': () => TBL.end, 'F pitch': () => TBL.step
  };
  for (const k in defs) EXT_VARS.set(k, defs[k]);

  const ins = (...names) => names.map((t) => mi(t, t));
  VARS_RUN.splice(0, VARS_RUN.length,
    mi('V-WIN', [
      mi('X', [mi('min', 'Xmin'), mi('max', 'Xmax'), mi('scale', 'Xscl'), mi('dot', 'Xdot')]),
      mi('Y', [mi('min', 'Ymin'), mi('max', 'Ymax'), mi('scale', 'Yscl')]),
      mi('T,θ', [mi('min', 'Tθmin'), mi('max', 'Tθmax'), mi('ptch', 'Tθptch')])
    ]),
    mi('FACTOR', ins('Xfct', 'Yfct')),
    mi('STAT', [
      mi('X', ins('n', G.XBAR, 'Σx', 'Σx²', 'σx', 'sx', 'minX', 'maxX')),
      mi('Y', ins(G.YBAR, 'Σy', 'Σy²', 'Σxy', 'σy', 'sy', 'minY', 'maxY')),
      mi('GRAPH', ins('a', 'b', 'c', 'd', 'e', G.STATR, G.STATR + '²', 'MSe', 'Q1', 'Med', 'Q3', 'Mod'))
    ]),
    mi('GRAPH', [mi('Y', G.YV)]),
    null,
    mi('TABLE', [mi('Start', 'F Start'), mi('End', 'F End'), mi('pitch', 'F pitch')])
  );
}
