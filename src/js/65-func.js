// ══════ 65-func.js — функции Y1…Y20, окно просмотра (V-Window), построение, общий список функций ══════

const FN_COLORS = ['Blue', 'Red', 'Green', 'Magenta', 'Black'];
const FN_STYLES = ['Normal', 'Thick', 'Broken', 'Dot', 'Thin'];
const FN_TYPES = ['Y=', 'r=', 'Param', 'X=', 'Y>', 'Y<', 'Y≥', 'Y≤'];
const newFn = (i) => ({ type: 'Y=', row: [], row2: [], math: true, sel: false, color: FN_COLORS[i % 5], style: 'Normal' });
mem.fn = Array.from({ length: 20 }, (_, i) => newFn(i));

const fnDefined = (fn) => fn.row.length > 0 && (fn.type !== 'Param' || fn.row2.length > 0);
const fnVar = (type) => (type === 'r=' ? 'θ' : type === 'Param' ? 'T' : type === 'X=' ? 'Y' : 'X');
const fnKey = (type) => (type === 'r=' ? 'θ' : type === 'Param' ? 'T' : type === 'X=' ? 'Y' : 'x');   // что вводит клавиша X,θ,T
const fnIsY = (fn) => fn.type[0] === 'Y';                         // Y= и неравенства: функции от X
function fnLabel(i, type, part) {
  const n = i + 1;
  if (type === 'r=') return 'r' + n;
  if (type === 'Param') return (part ? 'Yt' : 'Xt') + n;
  if (type === 'X=') return 'X' + n;
  return 'Y' + n;
}
const fnRel = (type) => (type.length === 2 && type[0] === 'Y' && type !== 'Y=' ? type[1] : '=');

// Готовая к счёту функция: {f, g}; g — вторая (Yt) для параметрической
function fnGet(i) {
  const fn = mem.fn[i];
  if (!fn._c) {
    const v = fnVar(fn.type);
    fn._c = { f: compileTokens(rowTokens(fn.row), v), g: fn.type === 'Param' ? compileTokens(rowTokens(fn.row2), v) : null };
  }
  return fn._c;
}
const fnTouch = () => { for (const fn of mem.fn) fn._c = null; };
yfnHook = (n) => {
  const fn = mem.fn[n - 1];
  if (!fn || !fn.row.length || fn.type === 'Param') return null;
  try { return fnGet(n - 1).f; } catch (e) { return null; }
};

// ---------- окно просмотра ----------
const VW = { xmin: -6.3, xmax: 6.3, xscl: 1, ymin: -3.1, ymax: 3.1, yscl: 1, tmin: 0, tmax: 2 * Math.PI, tptch: 2 * Math.PI / 60 };
const GA = { x0: 2.5, w: 378, y0: 26.5, h: 186, top: 23, bottom: LH };   // область графика на экране
const X2P = (x) => GA.x0 + (x - VW.xmin) / (VW.xmax - VW.xmin) * GA.w;
const Y2P = (y) => GA.y0 + (VW.ymax - y) / (VW.ymax - VW.ymin) * GA.h;
const P2X = (px) => VW.xmin + (px - GA.x0) / GA.w * (VW.xmax - VW.xmin);
const P2Y = (py) => VW.ymax - (py - GA.y0) / GA.h * (VW.ymax - VW.ymin);
const xDot = () => (VW.xmax - VW.xmin) / GA.w;
const yDot = () => (VW.ymax - VW.ymin) / GA.h;
const angFull = () => (S.angle === 'Deg' ? 360 : S.angle === 'Gra' ? 400 : 2 * Math.PI);
function vwSet(name) {
  const full = angFull();
  if (name === 'INITIAL') Object.assign(VW, { xmin: -6.3, xmax: 6.3, xscl: 1, ymin: -3.1, ymax: 3.1, yscl: 1 });
  else if (name === 'TRIG') Object.assign(VW, { xmin: -1.5 * full, xmax: 1.5 * full, xscl: full / 4, ymin: -1.6, ymax: 1.6, yscl: 0.5 });
  else if (name === 'STANDRD') Object.assign(VW, { xmin: -10, xmax: 10, xscl: 1, ymin: -10, ymax: 10, yscl: 1 });
  Object.assign(VW, { tmin: 0, tmax: full, tptch: full / 60 });
}
const vwOk = () => VW.xmax > VW.xmin && VW.ymax > VW.ymin && [VW.xmin, VW.xmax, VW.ymin, VW.ymax].every(Number.isFinite);
const clampP = (p) => (p < -4000 ? -4000 : p > 4000 ? 4000 : p);

// ---------- построение ----------
// Разрыв между соседними точками: значение уходит в бесконечность или скачет
function isJump(f, x0, y0, x1, y1) {
  const d0 = Math.abs(y1 - y0);
  if (d0 / yDot() < 40) return false;
  let a = x0, ya = y0, b = x1, yb = y1;
  for (let i = 0; i < 7; i++) {
    const m = (a + b) / 2, ym = f(m);
    if (!Number.isFinite(ym)) return true;
    if (ym < Math.min(ya, yb) - 1e-9 * d0 || ym > Math.max(ya, yb) + 1e-9 * d0) return true;
    if (Math.abs(ym - ya) > Math.abs(yb - ym)) { b = m; yb = ym; } else { a = m; ya = ym; }
  }
  return Math.abs(yb - ya) > 0.6 * d0;
}
// Точки функции y = f(x) по всей ширине экрана: [[px, py] | null (разрыв)]
function sampleY(f) {
  const pts = [];
  let px0 = 0, x0 = 0, y0 = NaN;
  for (let i = 0; i <= 768; i++) {
    const px = i / 2, x = P2X(px), y = f(x);
    if (Number.isFinite(y)) {
      if (Number.isFinite(y0) && isJump(f, x0, y0, x, y)) pts.push(null);
      pts.push([px, clampP(Y2P(y))]);
    } else if (pts.length && pts[pts.length - 1]) pts.push(null);
    px0 = px; x0 = x; y0 = y;
  }
  return pts;
}
function sampleX(f) {                 // x = f(y)
  const pts = [];
  for (let i = 0; i <= 384; i++) {
    const py = GA.top + i / 2, x = f(P2Y(py));
    if (Number.isFinite(x)) pts.push([clampP(X2P(x)), py]); else if (pts.length && pts[pts.length - 1]) pts.push(null);
  }
  return pts;
}
function sampleT(c, polar) {           // параметрическая или полярная
  const pts = [];
  const n = Math.min(6000, Math.floor((VW.tmax - VW.tmin) / VW.tptch + 1e-9));
  if (!(VW.tptch > 0) || !(n >= 0)) return pts;
  for (let i = 0; i <= n; i++) {
    const t = VW.tmin + i * VW.tptch;
    let x, y;
    if (polar) { const r = c.f(t); x = r * fCos(t); y = r * fSin(t); } else { x = c.f(t); y = c.g(t); }
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push([clampP(X2P(x)), clampP(Y2P(y))]); else if (pts.length && pts[pts.length - 1]) pts.push(null);
  }
  return pts;
}
function strokePts(pts, color, style) {
  const g = lcd.g;
  const lw = style === 'Thick' ? 3.6 : style === 'Thin' ? 1 : 2;
  g.strokeStyle = color; g.fillStyle = color; g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = lw;
  if (S.drawType === 'Plot') {
    for (const p of pts) if (p && Number.isInteger(p[0] * 2)) g.fillRect(p[0] - lw / 2, p[1] - lw / 2, lw, lw);
    return;
  }
  g.setLineDash(style === 'Broken' ? [6, 5] : style === 'Dot' ? [0.1, 5] : []);
  g.beginPath();
  let run = 0, last = null;
  const dot = () => { if (run === 1 && last) { g.moveTo(last[0], last[1]); g.lineTo(last[0] + 0.01, last[1]); } };
  for (const p of pts) {
    if (!p) { dot(); run = 0; continue; }
    if (run) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    run++; last = p;
  }
  dot();
  g.stroke();
  g.setLineDash([]);
}
// Сетка и оси
function drawAxes() {
  const g = lcd.g;
  const x0 = X2P(0), y0 = Y2P(0);
  const step = (scl, dot) => (scl > 0 && scl / dot >= 4 ? scl : 0);
  const sx = step(VW.xscl, xDot()), sy = step(VW.yscl, yDot());
  const ticks = (lo, hi, s, fn) => { if (!s) return; const n0 = Math.ceil(lo / s - 1e-9), n1 = Math.floor(hi / s + 1e-9); if (n1 - n0 > 400) return; for (let n = n0; n <= n1; n++) fn(n * s, n); };
  if (S.grid !== 'Off' && sx && sy) {
    if (S.grid === 'Line') {
      g.strokeStyle = '#c9d6e6'; g.lineWidth = 1;
      g.beginPath();
      ticks(P2X(0), P2X(LW), sx, (x) => { const px = Math.round(X2P(x)) + 0.5; g.moveTo(px, GA.top); g.lineTo(px, GA.bottom); });
      ticks(P2Y(GA.bottom), P2Y(GA.top), sy, (y) => { const py = Math.round(Y2P(y)) + 0.5; g.moveTo(0, py); g.lineTo(LW, py); });
      g.stroke();
    } else {
      g.fillStyle = '#000';
      ticks(P2X(0), P2X(LW), sx, (x) => ticks(P2Y(GA.bottom), P2Y(GA.top), sy, (y) => g.fillRect(Math.round(X2P(x)), Math.round(Y2P(y)), 1, 1)));
    }
  }
  if (S.axes === 'Off') return;
  g.strokeStyle = '#000'; g.lineWidth = 1;
  g.beginPath();
  if (y0 >= GA.top && y0 <= GA.bottom) {
    const py = Math.round(y0) + 0.5;
    g.moveTo(0, py); g.lineTo(LW, py);
    ticks(P2X(0), P2X(LW), sx, (x) => { const px = Math.round(X2P(x)) + 0.5; g.moveTo(px, py - 2.5); g.lineTo(px, py + 2.5); });
  }
  if (x0 >= 0 && x0 <= LW) {
    const px = Math.round(x0) + 0.5;
    g.moveTo(px, GA.top); g.lineTo(px, GA.bottom);
    ticks(P2Y(GA.bottom), P2Y(GA.top), sy, (y) => { const py = Math.round(Y2P(y)) + 0.5; g.moveTo(px - 2.5, py); g.lineTo(px + 2.5, py); });
  }
  g.stroke();
  const ax = Math.max(0, Math.min(LW, x0)), ay = Math.max(GA.top, Math.min(GA.bottom, y0));
  if (S.axes === 'Scale') {
    if (sx && sx / xDot() >= 22) ticks(P2X(0), P2X(LW), sx, (x, n) => { if (n) lcd.mini(X2P(x), Math.min(GA.bottom - 14, ay + 3), fmtFit(r15(x), 5), { px: 10, align: 'c', bold: false }); });
    if (sy && sy / yDot() >= 12) ticks(P2Y(GA.bottom), P2Y(GA.top), sy, (y, n) => { if (n) lcd.mini(Math.max(4, ax - 4), Y2P(y) - 6, fmtFit(r15(y), 5), { px: 10, align: ax < 30 ? 'l' : 'r', bold: false }); });
  }
  if (S.label === 'On') {
    lcd.mini(LW - 4, Math.max(GA.top + 1, Math.min(GA.bottom - 15, ay - 15)), 'x', { px: 13, align: 'r' });
    lcd.mini(Math.min(LW - 10, ax + 5), GA.top + 1, 'y', { px: 13 });
  }
}

// Подпись функции мелким шрифтом (для экрана графика): «Y1=x²−2»
function fnCaption(i, x, y, color, part) {
  const fn = mem.fn[i];
  const head = fnLabel(i, fn.type, part) + fnRel(fn.type);
  const lay = layRow(part ? fn.row2 : fn.row, 1, fn.math !== false, false);
  const a = Math.max(8, lay.a), w = lcd.text(x, y + a - 8, head, { h: 16, color });
  drawLay(lay, x + w, y + a, color);
  return { w: w + lay.w, h: Math.max(16, lay.a + lay.d) };
}

// ---------- список функций (общий для Graph и Table) ----------
const FN_OPTN = [
  null,
  mi('CALC', [mi('d/dx', T('ddx', 'd/dx(')), mi('d²/dx²', T('d2dx', 'd²/dx²(')), mi('∫dx', T('int', '∫(')), mi('Σ(', T('sum', 'Σ(')), mi('logab', T('logab', 'logab('))]),
  mi('HYPERBL', [mi('sinh', 'sinh '), mi('cosh', 'cosh '), mi('tanh', 'tanh '), mi('sinh' + G.INV, 'sinh' + INVS), mi('cosh' + G.INV, 'cosh' + INVS), mi('tanh' + G.INV, 'tanh' + INVS)]),
  mi('PROB', [mi('x!', '!'), mi('nPr', G.PERM), mi('nCr', G.COMB)]),
  mi('NUMERIC', [mi('Abs', T('abs', 'Abs ')), mi('Int', 'Int '), mi('Frac', 'Frac '), mi('Intg', 'Intg '), mi('GCD', 'GCD('), mi('LCM', 'LCM('), mi('MOD', 'MOD(')])
];

class FuncList {
  // o: {title, menu: (list) => пункты меню, onExe}
  constructor(o) {
    this.o = o;
    this.cur = 0; this.part = 0; this.ed = null; this.off = 0;
    this.base = new FMenu(o.menu(this));
    this.menu = this.base;
  }
  fn() { return mem.fn[this.cur]; }
  typeOf(fn) { return fnDefined(fn) || fn.row.length ? fn.type : S.funcType; }
  parts(fn) { return this.typeOf(fn) === 'Param' ? 2 : 1; }

  startEdit(keep, atStart) {
    const fn = this.fn();
    this.ed = new MathEd(S.io === 'Math');
    if (keep) {
      const row = this.part ? fn.row2 : fn.row;
      if (this.ed.math || row.every((t) => typeof t === 'string')) this.ed.set(row, atStart);
    }
    this.ed.sx = 0;
    this.menu = new FMenu(FN_OPTN);
    this.menuKind = 'edit';
  }
  stopEdit() { this.ed = null; this.menu = this.base; this.base.reset(); }
  commit() {
    const fn = this.fn(), ed = this.ed;
    if (ed.empty) { this.stopEdit(); return; }
    parse(ed.tokens());                // при ошибке — Syntax ERROR, остаёмся в редакторе
    const fresh = !fn.row.length && !fn.row2.length;
    if (fresh) { fn.type = S.funcType; fn.sel = true; }
    if (this.part) fn.row2 = ed.get(); else fn.row = ed.get();
    fn.math = ed.math;
    fnTouch();
    this.stopEdit();
    if (fn.type === 'Param' && this.part === 0) { this.part = 1; if (!fn.row2.length) this.startEdit(false); }
    else this.move(1);
  }
  move(d) {
    const n = this.parts(this.fn());
    if (d > 0) {
      if (this.part + 1 < n) this.part++;
      else if (this.cur < 19) { this.cur++; this.part = 0; }
    } else if (this.part > 0) this.part--;
    else if (this.cur > 0) { this.cur--; this.part = this.parts(this.fn()) - 1; }
  }
  del() {
    const fn = this.fn();
    if (!fn.row.length && !fn.row2.length) return;
    confirmBox(['Delete Formula?', ''], () => { Object.assign(fn, newFn(this.cur), { color: fn.color }); fnTouch(); this.part = 0; });
  }
  select() {
    const fn = this.fn();
    if (fnDefined(fn)) fn.sel = !fn.sel;
  }
  colorMenu() {
    const fn = this.fn();
    return COLOR_NAMES.map((c) => mi(c, () => { fn.color = c; this.base.reset(); this.menu = this.base; }));
  }
  styleMenu() {
    const fn = this.fn();
    return FN_STYLES.map((s) => mi(s, () => { fn.style = s; this.base.reset(); }));
  }

  key(k) {
    const f = fIndex(k);
    if (this.ed) {
      const ed = this.ed;
      if (f >= 0) {
        if (k.shift) return;
        const it = this.menuKind === 'edit' ? null : this.menu.press(f);
        if (it && it.ins !== undefined) edInsert(ed, it.ins);
        return;
      }
      switch (k.id) {
        case 'EXE': this.commit(); return;
        case 'EXIT':
          if (this.menuKind !== 'edit') { if (!this.menu.back()) { this.menu = new FMenu(FN_OPTN); this.menuKind = 'edit'; } } else this.stopEdit();
          return;
        case 'AC': if (ed.empty) this.stopEdit(); else ed.clear(); return;
        case 'OPTN': this.menu = new FMenu(FN_OPTN); this.menuKind = 'optn'; return;
        case 'VARS': if (!k.shift) { this.menu = new FMenu(VARS_RUN); this.menuKind = 'vars'; } return;
        default:
      }
      if (!k.shift && !k.alpha && (k.id === 'UP' || k.id === 'DOWN')) {
        if (!ed.vert(k.id === 'UP' ? -1 : 1)) { this.stopEdit(); this.move(k.id === 'UP' ? -1 : 1); }
        return;
      }
      if (edNav(ed, k)) return;
      typeKey(ed, k, fnKey(this.typeOf(this.fn())));
      return;
    }
    if (f >= 0 && !k.shift) {
      const it = this.menu.press(f);
      if (it && it.fn) it.fn();
      return;
    }
    switch (k.id) {
      case 'UP': this.move(-1); return;
      case 'DOWN': this.move(1); return;
      case 'LEFT': case 'RIGHT': {
        const fn = this.fn();
        if ((this.part ? fn.row2 : fn.row).length) this.startEdit(true, k.id === 'RIGHT');
        return;
      }
      case 'EXE': if (this.o.onExe) this.o.onExe(); return;
      case 'DEL': this.del(); return;
      case 'EXIT': if (!this.menu.back() && this.menu !== this.base) this.menu = this.base; return;
      case '5': if (k.shift) { if (fnDefined(this.fn())) this.menu = new FMenu(this.colorMenu()); return; } break;
      default:
    }
    // начало ввода новой формулы
    const probe = new MathEd(S.io === 'Math');
    if (typeKey(probe, k, fnKey(this.typeOf(this.fn())))) {
      this.startEdit(false);
      typeKey(this.ed, k, fnKey(this.typeOf(this.fn())));
    }
  }

  draw(tags) {
    statusBar(tags || stdTags());
    lcd.text(0, 24, this.o.title);
    lcd.text(14 * 18, 24, ':' + S.funcType);
    // строки
    const rows = [];
    let y = 0, curTop = 0, curBot = 0;
    mem.fn.forEach((fn, i) => {
      const type = this.typeOf(fn);
      for (let p = 0; p < (type === 'Param' ? 2 : 1); p++) {
        const editing = this.ed && i === this.cur && p === this.part;
        const src = p ? fn.row2 : fn.row;
        const lay = editing ? layRow(this.ed.root, 0, this.ed.math, false) : layRow(src, 0, fn.math !== false, false);
        const a = Math.max(12, lay.a), d = Math.max(12, lay.d);
        const r = { i, p, fn, type, lay, a, h: Math.ceil(a + d), y, editing, defined: src.length > 0 };
        if (i === this.cur && p === this.part) { curTop = y; curBot = y + r.h; }
        rows.push(r); y += r.h;
      }
    });
    const vh = 144;
    if (curBot > this.off + vh) this.off = curBot - vh;
    if (curTop < this.off) this.off = curTop;
    lcd.clip(0, 48, LW, vh);
    for (const r of rows) {
      const ry = 48 + r.y - this.off;
      if (ry + r.h < 48 || ry > 48 + vh) continue;
      const on = r.i === this.cur && r.p === this.part && !this.ed;
      const yc = ry + r.a, label = fnLabel(r.i, r.type, r.p);
      if (on) lcd.rect(0, ry, LW, r.h, HILITE);
      const ink = on ? '#fff' : '#000';
      lcd.text(0, yc - 12, label, { color: ink });
      const lx = label.length * 18;
      const rel = r.defined || r.editing ? fnRel(r.type) : ':';
      if (r.defined && r.fn.sel && !r.editing) {
        // выбранная для построения функция: знак «=» в рамке
        lcd.rect(lx + 1, yc - 10, 16, 20, on ? '#fff' : '#000');
        lcd.glyph(rel, lx + 9, yc, 24, on ? '#000' : '#fff');
      } else lcd.glyph(rel, lx + 9, yc, 24, ink);
      const ex = lx + 18, ew = LW - 44 - ex;
      if (r.editing) { lcd.unclip(); lcd.clip(0, 48, LW, vh); drawEd(this.ed, ex, yc, ew); }
      else if (r.defined) {
        lcd.unclip(); lcd.clip(ex, 48, ew, vh);
        drawLay(r.lay, ex, yc, ink);
        lcd.unclip(); lcd.clip(0, 48, LW, vh);
        if (r.lay.w > ew) lcd.glyph('▶', ex + ew - 5, yc, 14, ink);
      }
      // образец линии
      if (r.p === 0) {
        lcd.rect(LW - 40, yc - 9, 36, 18, '#fff');
        lcd.frame(LW - 40, yc - 9, 36, 18, on ? '#fff' : '#888', 1);
        const g = lcd.g, st = r.fn.style;
        g.strokeStyle = COLORS[r.fn.color]; g.lineWidth = st === 'Thick' ? 3.6 : st === 'Thin' ? 1 : 2; g.lineCap = 'butt';
        g.setLineDash(st === 'Broken' ? [5, 4] : st === 'Dot' ? [1.5, 3.5] : []);
        g.beginPath(); g.moveTo(LW - 35, yc); g.lineTo(LW - 9, yc); g.stroke();
        g.setLineDash([]);
      }
    }
    lcd.unclip();
    lcd.fmenu(this.ed && this.menuKind === 'edit' ? [] : this.menu.labels());
  }
}

// ---------- ввод числа в поле (V-Window, таблицы, списки) ----------
// Поле ввода значения в одну строку. Возвращает объект с key(k) → 'done' | 'cancel' | true | false и рисованием
class NumField {
  constructor() { this.ed = new MathEd(false); this.ed.sx = 0; }
  // Клавиша обработана → true. EXE → вычисляет и вызывает onValue(число)
  key(k, onValue, onCancel) {
    const ed = this.ed;
    if (k.id === 'EXE') { if (!ed.empty) onValue(evalNumber(ed.tokens())); else if (onCancel) onCancel(); return true; }
    if (k.id === 'EXIT' || (k.id === 'AC' && ed.empty)) { if (onCancel) onCancel(); return true; }
    if (k.id === 'AC') { ed.clear(); return true; }
    if (k.id === 'LEFT' || k.id === 'RIGHT' || k.id === 'DEL') { edNav(ed, k); return true; }
    return typeKey(ed, k);
  }
  draw(x, yc, w, color) { drawEd(this.ed, x, yc, w, { color }); }
}
// Начинает ли клавиша ввод числа (цифра, точка, минус, π и т. п.)
function startsNumber(k) {
  if (k.alpha) return false;
  if (k.shift) return k.id === 'EXP' || k.id === 'SQR' || k.id === 'NEG';
  return isDigit(k.id) || ['DOT', 'NEG', 'SUB', 'LPAR', 'SIN', 'COS', 'TAN', 'LOG', 'LN', 'EXP'].includes(k.id);
}
