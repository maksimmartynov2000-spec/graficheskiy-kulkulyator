// ══════ 75-table.js — режим Table: таблица значений функций ══════

const TBL = { start: 1, end: 5, step: 1 };

const tableApp = {
  list: null, mode: 'list',
  xs: [], cols: [], r: 0, c: 0, top: 0, left: 0, field: null, menu: null, plot: null,

  enter() {
    if (!this.list) {
      this.list = new FuncList({
        title: 'Table Func',
        onExe: () => this.make(),
        menu: (l) => [
          mi('SELECT', () => l.select()),
          mi('DELETE', () => l.del()),
          mi('TYPE', [mi('Y=', () => { S.funcType = 'Y='; l.base.reset(); })]),
          mi('TOOL', [{ l: 'STYLE', get sub() { return l.styleMenu(); } }, { l: 'COLOR', get sub() { return l.colorMenu(); } }]),
          mi('SET', () => this.setRange()),
          mi('TABLE', () => this.make())
        ]
      });
    }
    this.mode = 'list';
  },
  setup() { return ['io', 'deriv', 'angle', 'disp']; },
  onSetup() { if (this.mode === 'table') this.fill(); },

  setRange() {
    numDialog('Table Setting   X', [['Start', TBL.start], ['End', TBL.end], ['Step', TBL.step]], (v) => {
      if (v.every(Number.isFinite)) { TBL.start = v[0]; TBL.end = v[1]; TBL.step = v[2]; }
    });
  },

  // Построить таблицу по Start/End/Step
  make() {
    const { start, end, step } = TBL;
    if (step === 0 || (end - start) / step < 0) fail('Range ERROR');
    const n = Math.floor((end - start) / step + 1e-9) + 1;
    if (n > 999) fail('Memory ERROR');
    this.cols = [];
    mem.fn.forEach((fn, i) => { if (fn.sel && fnDefined(fn) && fnIsY(fn)) { fnGet(i); this.cols.push(i); } });
    if (!this.cols.length) fail('No Variable');
    this.xs = Array.from({ length: n }, (_, k) => r15(start + k * step));
    this.r = 0; this.c = 0; this.top = 0; this.left = 0; this.field = null;
    this.mode = 'table';
    this.menu = new FMenu([
      mi('FORMULA', () => { this.mode = 'list'; }),
      mi('DELETE', () => confirmBox(['Delete Table?', ''], () => { this.mode = 'list'; })),
      mi('ROW', [mi('DELETE', () => this.rowDel()), mi('INSERT', () => this.rowIns(0)), mi('ADD', () => this.rowIns(1))]),
      mi('EDIT', () => { if (this.c === 0) { this.field = new NumField(); } }),
      mi('GPH-CON', () => this.graph(true)),
      mi('GPH-PLT', () => this.graph(false))
    ]);
    this.fill();
  },
  // Столбцы таблицы: значения функций, а при Derivative: On — ещё и производные (Y'1, Y'2 …)
  fill() {
    this.ys = this.cols.map((i) => { const f = fnGet(i).f; return this.xs.map((x) => f(x)); });
    this.defs = [];
    this.cols.forEach((i, ci) => {
      this.defs.push({ i, vals: this.ys[ci], label: fnLabel(i, 'Y=', 0) });
      if (S.deriv === 'On') {
        const f = fnGet(i).f;
        this.defs.push({ i, vals: this.xs.map((x) => { const d = nDeriv(f, x); return Number.isFinite(d) ? snapNice(Number(d.toPrecision(11))) : NaN; }), label: "Y'" + (i + 1) });
      }
    });
    this.c = Math.min(this.c, this.defs.length);
  },
  value(r, c) { return c === 0 ? this.xs[r] : this.defs[c - 1].vals[r]; },
  rowDel() { if (this.xs.length > 1) { this.xs.splice(this.r, 1); this.r = Math.min(this.r, this.xs.length - 1); this.fill(); } this.menu.reset(); },
  rowIns(after) { this.xs.splice(this.r + after, 0, this.xs[this.r]); this.r += after; this.fill(); this.menu.reset(); },
  graph(connect) {
    if (!vwOk()) fail('Range ERROR');
    const app = this;
    pushModal({
      key(k) { if (k.id === 'EXIT' || k.id === 'AC') popModal(); },
      draw() {
        const g = lcd.g;
        lcd.rect(0, 23, LW, LH - 23, '#fff');
        lcd.clip(0, GA.top, LW, LH - GA.top);
        drawAxes();
        app.cols.forEach((i, ci) => {
          const fn = mem.fn[i], color = COLORS[fn.color];
          const pts = app.xs.map((x, r) => (Number.isFinite(app.ys[ci][r]) ? [clampP(X2P(x)), clampP(Y2P(app.ys[ci][r]))] : null));
          if (connect) { const sv = S.drawType; S.drawType = 'Connect'; strokePts(pts, color, fn.style); S.drawType = sv; }
          g.fillStyle = color;
          for (const p of pts) if (p) g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
        });
        lcd.unclip();
      }
    });
  },

  key(k) {
    if (this.mode === 'list') { this.list.key(k); return; }
    if (this.field) {
      this.field.key(k, (x) => { this.xs[this.r] = x.v; this.field = null; this.fill(); if (this.r + 1 < this.xs.length) this.r++; this.see(); }, () => { this.field = null; });
      return;
    }
    const f = fIndex(k);
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    const nr = this.xs.length, nc = this.defs.length + 1;
    switch (k.id) {
      case 'UP': this.r = (this.r + nr - 1) % nr; break;
      case 'DOWN': this.r = (this.r + 1) % nr; break;
      case 'LEFT': this.c = Math.max(0, this.c - 1); break;
      case 'RIGHT': this.c = Math.min(nc - 1, this.c + 1); break;
      case 'EXIT': if (!this.menu.back()) this.mode = 'list'; return;
      case 'DEL': this.rowDel(); return;
      default:
        if (this.c === 0 && startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
        return;
    }
    this.see();
  },
  see() {
    if (this.r < this.top) this.top = this.r;
    if (this.r > this.top + 4) this.top = this.r - 4;
    // столбец X всегда на экране, функции прокручиваются
    if (this.c > 0) {
      if (this.c - 1 < this.left) this.left = this.c - 1;
      if (this.c - 1 > this.left + 2) this.left = this.c - 3;
    }
  },

  draw() {
    if (this.mode === 'list') { this.list.draw(); return; }
    statusBar(stdTags());
    const CWD = 96;
    const head = (ci) => (ci === 0 ? 'X' : this.defs[ci - 1].label);
    const visible = [0];
    for (let j = 0; j < 3 && this.left + j < this.defs.length; j++) visible.push(this.left + j + 1);
    visible.forEach((ci, vx) => {
      const x = vx * CWD, h = head(ci);
      lcd.text(x + (CWD - h.length * 18) / 2, 24, h, ci ? { color: COLORS[mem.fn[this.defs[ci - 1].i].color] } : undefined);
      for (let rr = 0; rr < 5; rr++) {
        const r = this.top + rr;
        if (r >= this.xs.length) break;
        const v = this.value(r, ci), s = Number.isFinite(v) ? fmtFit(v, 5) : 'ERROR';
        const y = 48 + rr * 24, on = r === this.r && ci === this.c;
        if (on) lcd.rect(x + 1, y, CWD - 2, 24, HILITE);
        lcd.text(x + CWD - 4 - [...s].length * 18, y, s, { color: on ? '#fff' : '#000' });
      }
      if (vx) lcd.line(x + .5, 24, x + .5, 168, '#000', 1);
    });
    lcd.line(0, 47.5, LW, 47.5, '#000', 1);
    lcd.line(0, 168.5, LW, 168.5, '#000', 1);
    if (this.field) this.field.draw(4, 180, LW - 8);
    else {
      const v = this.value(this.r, this.c), s = Number.isFinite(v) ? fmtNum(v) : 'ERROR';
      lcd.text(LW - 4 - [...s].length * 18, 169, s);
    }
    lcd.fmenu(this.menu.labels());
  },

  save() { return { ...TBL }; },
  load(st) { for (const k of ['start', 'end', 'step']) if (Number.isFinite(st[k])) TBL[k] = st[k]; }
};
UI.apps.table = tableApp;
