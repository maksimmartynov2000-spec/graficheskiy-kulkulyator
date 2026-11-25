// ══════ 84-dyna.js — режим Dyna Graph: график, в котором один коэффициент меняется по шагам ══════
//
// Формула вида Y=Ax²+B: одна из переменных-коэффициентов объявляется динамической и пробегает
// значения Start…End с шагом Step; на каждое значение — свой кадр графика.

SETUP_DEF.dynaType = ['Dynamic Type', ['Cont', 'Stop']];
SETUP_DEF.locus = ['Locus', ['On', 'Off']];
S.dynaType = 'Stop'; S_DEF.dynaType = 'Stop';
S.locus = 'Off'; S_DEF.locus = 'Off';

const DYN_SPEEDS = ['Stop&Go', 'Slow', 'Normal', 'Fast'];
const DYN_MS = [0, 1000, 500, 200];    // пауза между кадрами; Stop&Go — кадр по клавише EXE
const DYN_MAX = 300;                   // больше кадров — Memory ERROR
const DYN_PASSES = 10;                 // столько проходов при Dynamic Type: Stop

// Память режима: свои 20 формул (не mem.fn), динамическая переменная, диапазон, скорость
const dyn = { fn: Array.from({ length: 20 }, (_, i) => newFn(i)), dv: '', start: 1, end: 5, step: 1, speed: 2 };

// Значения динамической переменной по кадрам
function dynFrames(start, end, step) {
  if (![start, end, step].every(Number.isFinite) || step === 0 || (end - start) / step < 0) fail('Range ERROR');
  const n = Math.floor((end - start) / step + 1e-9) + 1;
  if (n > DYN_MAX) fail('Memory ERROR');
  return Array.from({ length: n }, (_, k) => r15(start + k * step));
}

// Переменные-коэффициенты формулы (все, кроме X), в порядке A…Z, r, θ
function dynVarsOf(ast) {
  const seen = new Set();
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.k === 'var') seen.add(n.n);
    if (n.k === 'num') return;
    for (const key in n) walk(n[key]);
  };
  walk(ast);
  seen.delete('X');
  return VARS.filter((v) => seen.has(v));
}
const dynVars = (row) => dynVarsOf(parse(rowTokens(row)));

// Встроенные формулы (B-IN). math — в каком вводе записывать (естественном или строчном)
function dynBuiltin(math) {
  const p3 = math ? [{ t: 'pow', s: [['3']] }] : ['^', '3'];
  const trig = (f) => ['A', f, '(', 'B', 'x', '+', 'C', ')'];
  return [
    ['A', 'x', '+', 'B'],
    ['A', '(', 'x', '−', 'B', ')', G.SQ, '+', 'C'],
    ['A', 'x', G.SQ, '+', 'B', 'x', '+', 'C'],
    ['A', 'x', ...p3, '+', 'B', 'x', G.SQ, '+', 'C', 'x', '+', 'D'],
    trig('sin '), trig('cos '), trig('tan ')
  ];
}

// Выбранная формула (одна) или −1
const dynSel = () => dyn.fn.findIndex((f) => f.sel && fnDefined(f));

// Общий список функций (FuncList) работает с mem.fn — на время вызова подставляем память Dyna
function dynWith(run) {
  const keepFn = mem.fn, keepType = S.funcType;
  mem.fn = dyn.fn; S.funcType = 'Y=';
  try { return run(); } finally { mem.fn = keepFn; S.funcType = keepType; }
}

const dynaApp = {
  list: null, mode: 'list',            // list | bin | var | speed | run
  vars: [], vsel: 0, vtop: 0, field: null, vmenu: null,
  bsel: 0, boff: 0, ssel: 0,
  run: null, timer: 0,
  d: dyn,                              // для проверок

  enter() {
    this.stop();
    if (!this.list) {
      this.list = new FuncList({
        title: 'Dynamic Func',
        onExe: () => {
          const f = dyn.fn[this.list.cur];
          if (fnDefined(f)) { dyn.fn.forEach((q) => { q.sel = false; }); f.sel = true; }
          this.openVar();
        },
        menu: (l) => [
          mi('SELECT', () => this.select(l.cur)),
          mi('DELETE', () => l.del()),
          mi('TYPE', [mi('Y=', () => l.base.reset())]),
          mi('VAR', () => this.openVar()),
          mi('B-IN', () => { this.bsel = 0; this.boff = 0; this.mode = 'bin'; }),
          null
        ]
      });
    }
    this.mode = 'list';
  },
  leave() {
    this.stop();
    if (this.mode === 'run') this.mode = 'var';
  },
  setup() { return ['io', 'dynaType', 'locus', 'angle', 'coord', 'grid', 'axes', 'label', 'disp']; },
  onSetup() {
    if (this.mode === 'run') { this.run.cache = []; this.run.seen = new Set(); this.show(); }
  },

  // ---------- список формул ----------
  select(i) {
    const f = dyn.fn[i];
    if (!fnDefined(f)) return;
    const on = !f.sel;
    dyn.fn.forEach((q) => { q.sel = false; });
    f.sel = on;
  },
  // Выбранной остаётся одна формула — та, что выбрана последней
  only(prev) {
    const on = [];
    dyn.fn.forEach((f, i) => { if (f.sel && fnDefined(f)) on.push(i); else f.sel = false; });
    if (on.length < 2) return;
    const keep = on.find((i) => i !== prev);
    dyn.fn.forEach((f, i) => { f.sel = i === (keep === undefined ? on[0] : keep); });
  },

  // ---------- экран переменных ----------
  openVar() {
    let i = dynSel();
    if (i < 0 && fnDefined(dyn.fn[this.list.cur])) { i = this.list.cur; dyn.fn[i].sel = true; }
    if (i < 0) return;
    const vars = dynVars(dyn.fn[i].row);
    if (!vars.length) fail('No Variable');
    if (!vars.includes(dyn.dv)) dyn.dv = vars[0];
    this.vars = vars; this.vsel = Math.max(0, vars.indexOf(dyn.dv)); this.vtop = 0; this.field = null;
    this.vmenu = new FMenu([
      mi('SELECT', () => { dyn.dv = this.vars[this.vsel]; }),
      mi('SET', () => numDialog('Dynamic Setting   ' + dyn.dv, [['Start', dyn.start], ['End', dyn.end], ['Step', dyn.step]], (v) => {
        if (v.every(Number.isFinite)) { dyn.start = v[0]; dyn.end = v[1]; dyn.step = v[2]; }
      })),
      mi('SPEED', () => { this.ssel = dyn.speed; this.mode = 'speed'; }),
      null, null,
      mi('DYNA', () => this.start())
    ]);
    this.mode = 'var';
    this.seeVar();
  },
  moveVar(d) {
    const n = this.vars.length;
    this.vsel = (this.vsel + d + n) % n;
    this.seeVar();
  },
  seeVar() {
    if (this.vsel < this.vtop) this.vtop = this.vsel;
    if (this.vsel > this.vtop + 5) this.vtop = this.vsel - 5;
  },

  // ---------- запуск ----------
  start() {
    const i = dynSel();
    if (i < 0) return;
    if (!vwOk()) fail('Range ERROR');
    const frames = dynFrames(dyn.start, dyn.end, dyn.step);
    dynWith(() => fnGet(i));           // формула должна разбираться
    this.run = { fi: i, frames, i: 0, pass: 0, playing: false, cache: [], seen: new Set() };
    this.mode = 'run';
    this.show();
    if (dyn.speed > 0) this.play();
  },
  // Текущий кадр: записать значение в переменную и посчитать точки кривой
  show() {
    const r = this.run;
    setVar(dyn.dv, RF(r.frames[r.i], true, false));
    if (!r.cache[r.i]) r.cache[r.i] = sampleY(dynWith(() => fnGet(r.fi)).f);
    r.seen.add(r.i);
  },
  step(d) {
    const r = this.run, n = r.frames.length;
    r.i = (r.i + d + n) % n;
    this.show();
  },
  play() {
    this.stop();
    const r = this.run;
    if (r.pass >= DYN_PASSES) r.pass = 0;
    r.playing = true;
    this.timer = setInterval(() => this.tick(), DYN_MS[dyn.speed]);
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
    if (this.run) this.run.playing = false;
  },
  tick() {
    if (UI.app !== this || this.mode !== 'run' || UI.off) { this.stop(); return; }
    if (UI.modals.length) return;      // открыто окно (Setup, сообщение) — ждём
    const r = this.run;
    if (r.i + 1 >= r.frames.length) {
      r.pass++;
      if (S.dynaType !== 'Cont' && r.pass >= DYN_PASSES) { this.stop(); redraw(); return; }
      r.i = 0;
    } else r.i++;
    this.show();
    redraw();
  },

  // ---------- клавиши ----------
  key(k) {
    const f = fIndex(k);
    switch (this.mode) {
      case 'list': {
        if (k.shift && k.id === 'F3' && !this.list.ed) { openVWindow(); return; }
        const prev = dynSel();
        dynWith(() => this.list.key(k));
        this.only(prev);
        return;
      }
      case 'bin':
        if (k.id === 'UP') this.bsel = (this.bsel + 6) % 7;
        else if (k.id === 'DOWN') this.bsel = (this.bsel + 1) % 7;
        else if (k.id === 'EXE' || f === 0) {
          const math = S.io === 'Math', fn = dyn.fn[this.list.cur];
          Object.assign(fn, { type: 'Y=', row: cloneRow(dynBuiltin(math)[this.bsel]), row2: [], math, _c: null });
          dyn.fn.forEach((q) => { q.sel = false; });
          fn.sel = true;
          this.mode = 'list';
        } else if (k.id === 'EXIT') this.mode = 'list';
        return;
      case 'var':
        if (this.field) {
          this.field.key(k, (x) => { setVar(this.vars[this.vsel], x); this.field = null; this.moveVar(1); }, () => { this.field = null; });
          return;
        }
        if (k.shift && k.id === 'F3') { openVWindow(); return; }
        if (f >= 0) { const it = this.vmenu.press(f); if (it && it.fn) it.fn(); return; }
        if (k.id === 'UP') this.moveVar(-1);
        else if (k.id === 'DOWN' || k.id === 'EXE') this.moveVar(1);
        else if (k.id === 'EXIT') this.mode = 'list';
        else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
        return;
      case 'speed':
        if (k.id === 'UP') this.ssel = (this.ssel + 3) % 4;
        else if (k.id === 'DOWN') this.ssel = (this.ssel + 1) % 4;
        else if (k.id === 'EXE') { dyn.speed = this.ssel; this.mode = 'var'; }
        else if (k.id === 'EXIT') this.mode = 'var';
        return;
      default: {                       // run
        const r = this.run;
        if (r.playing) { if (k.id === 'AC' || k.id === 'EXIT') this.stop(); return; }
        if (k.id === 'EXE') { if (dyn.speed > 0) this.play(); else this.step(1); }
        else if (k.id === 'RIGHT') this.step(1);
        else if (k.id === 'LEFT') this.step(-1);
        else if (k.id === 'EXIT' || k.id === 'AC') this.mode = 'var';
      }
    }
  },

  // ---------- рисование ----------
  draw() {
    if (this.mode === 'list') { dynWith(() => this.list.draw()); return; }
    statusBar(stdTags());
    if (this.mode === 'bin') {
      const math = S.io === 'Math';
      const rows = dynBuiltin(math).map((row) => {
        const lay = layRow(row, 0, math, false), a = Math.max(12, lay.a);
        return { lay, a, h: Math.ceil(a + Math.max(12, lay.d)) };
      });
      let y = 0;
      for (const r of rows) { r.y = y; y += r.h; }
      const cur = rows[this.bsel], vh = 168;
      if (cur.y + cur.h > this.boff + vh) this.boff = cur.y + cur.h - vh;
      if (cur.y < this.boff) this.boff = cur.y;
      lcd.clip(0, 24, LW, vh);
      rows.forEach((r, i) => {
        const ry = 24 + r.y - this.boff, on = i === this.bsel, ink = on ? '#fff' : '#000';
        if (on) lcd.rect(0, ry, LW, r.h, HILITE);
        lcd.text(0, ry + r.a - 12, 'Y=', { color: ink });
        drawLay(r.lay, 36, ry + r.a, ink);
      });
      lcd.unclip();
      lcd.fmenu([{ l: 'SELECT', k: 'cmd' }]);
    } else if (this.mode === 'var') {
      lcd.text(0, 24, 'Dynamic Var');
      lcd.text(14 * 18, 24, ':' + dyn.dv);
      for (let r = 0; r < 6; r++) {
        const i = this.vtop + r;
        if (i >= this.vars.length) break;
        const name = this.vars[i], y = 48 + r * 24, on = i === this.vsel;
        lcd.text(18, y, name + '=');
        if (on && this.field) this.field.draw(3 * 18, y + 12, LW - 3 * 18 - 4);
        else lcd.text(3 * 18, y, fmtFit(getVar(name).v, 15), on ? { inv: true } : undefined);
      }
      if (this.vtop > 0) lcd.glyph('▲', LW - 9, 58, 12, '#000');
      if (this.vtop + 6 < this.vars.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu(this.vmenu.labels());
    } else if (this.mode === 'speed') {
      lcd.text(0, 24, 'Dynamic Speed');
      DYN_SPEEDS.forEach((s, i) => lcd.text(18, 48 + i * 24, s, i === this.ssel ? { inv: true } : undefined));
    } else this.drawRun();
  },
  drawRun() {
    const r = this.run, fn = dyn.fn[r.fi], color = COLORS[fn.color] || '#000', g = lcd.g;
    lcd.clip(0, GA.top, LW, LH - GA.top);
    drawAxes();
    if (S.locus === 'On') {            // след: уже показанные кривые остаются бледными
      g.save();
      g.globalAlpha = 0.28;
      for (const j of r.seen) if (j !== r.i && r.cache[j]) strokePts(r.cache[j], color, 'Thin');
      g.restore();
    }
    if (r.cache[r.i]) strokePts(r.cache[r.i], color, fn.style);
    lcd.unclip();
    if (S.graphFunc !== 'Off') {
      const lay = layRow(fn.row, 1, fn.math !== false, false);
      const head = (String(r.fi + 1).length + 2) * 12;       // «Y1=» мелким шрифтом
      lcd.rect(1, GA.top + 1, Math.min(LW - 2, head + lay.w + 8), Math.max(18, lay.a + lay.d + 2), '#fff');
      dynWith(() => fnCaption(r.fi, 4, GA.top + 2, color, 0));
    }
    drawCoords(dyn.dv + '=' + fmtFit(r.frames[r.i], 13), null, null, false);
  },

  // ---------- память ----------
  save() {
    return {
      fn: dyn.fn.map((f) => ({ row: f.row, math: f.math, sel: f.sel, color: f.color, style: f.style })),
      dv: dyn.dv, start: dyn.start, end: dyn.end, step: dyn.step, speed: dyn.speed
    };
  },
  load(st) {
    if (Array.isArray(st.fn)) {
      st.fn.slice(0, 20).forEach((f, i) => {
        if (!f || !Array.isArray(f.row)) return;
        dyn.fn[i] = Object.assign(newFn(i), {
          row: f.row, math: f.math !== false, sel: !!f.sel,
          color: COLORS[f.color] ? f.color : FN_COLORS[i % 5], style: FN_STYLES.includes(f.style) ? f.style : 'Normal'
        });
      });
    }
    if (typeof st.dv === 'string' && Object.prototype.hasOwnProperty.call(VIX, st.dv)) dyn.dv = st.dv;
    for (const k of ['start', 'end', 'step']) if (Number.isFinite(st[k])) dyn[k] = st[k];
    if ([0, 1, 2, 3].includes(st.speed)) dyn.speed = st.speed;
    this.only(-1);
  },
  reset() {
    this.stop();
    dyn.fn = Array.from({ length: 20 }, (_, i) => newFn(i));
    Object.assign(dyn, { dv: '', start: 1, end: 5, step: 1, speed: 2 });
    this.list = null; this.run = null; this.field = null; this.mode = 'list';
  }
};
UI.apps.dyna = dynaApp;
