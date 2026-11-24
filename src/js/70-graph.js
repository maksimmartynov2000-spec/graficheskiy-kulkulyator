// ══════ 70-graph.js — режим Graph: список функций и экран графика ══════

const SETUP_GRAPH = ['io', 'drawType', 'graphFunc', 'deriv', 'angle', 'coord', 'grid', 'axes', 'label', 'disp'];

// ---------- экран View Window ----------
const VW_ROWS = [['Xmin', 'xmin'], [' max', 'xmax'], [' scale', 'xscl'], [' dot', 'dot'], ['Ymin', 'ymin'], [' max', 'ymax'], [' scale', 'yscl'], ['T' + 'θ min', 'tmin'], ['   max', 'tmax'], ['   ptch', 'tptch']];
function openVWindow(onClose) {
  pushModal({
    sel: 0, top: 0, field: null,
    get(key) { return key === 'dot' ? xDot() : VW[key]; },
    put(key, v) {
      if (key === 'dot') { if (!(v > 0)) fail('Ma ERROR'); VW.xmax = r15(VW.xmin + v * GA.w); }
      else VW[key] = v;
    },
    move(d) {
      this.sel = (this.sel + d + VW_ROWS.length) % VW_ROWS.length;
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 5) this.top = this.sel - 5;
    },
    key(k) {
      if (this.field) {
        this.field.key(k, (x) => { this.put(VW_ROWS[this.sel][1], x.v); this.field = null; this.move(1); }, () => { this.field = null; });
        return;
      }
      const f = fIndex(k);
      if (f === 0) { vwSet('INITIAL'); return; }
      if (f === 1) { vwSet('TRIG'); return; }
      if (f === 2) { vwSet('STANDRD'); return; }
      if (k.id === 'UP') this.move(-1);
      else if (k.id === 'DOWN' || k.id === 'EXE') this.move(1);
      else if (k.id === 'EXIT') { popModal(); if (onClose) onClose(); }
      else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, 'View Window');
      for (let r = 0; r < 6; r++) {
        const i = this.top + r;
        if (i >= VW_ROWS.length) break;
        const [label, key] = VW_ROWS[i], y = 48 + r * 24;
        lcd.text(18, y, label);
        lcd.text(8 * 18, y, ':');
        const on = i === this.sel;
        if (on && this.field) this.field.draw(9 * 18, y + 12, LW - 9 * 18 - 4);
        else {
          const s = fmtFit(this.get(key), 12);
          lcd.text(9 * 18, y, s, on ? { inv: true } : undefined);
        }
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, 58, 12, '#000');
      if (this.top + 6 < VW_ROWS.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu([{ l: 'INITIAL', k: 'cmd' }, { l: 'TRIG', k: 'cmd' }, { l: 'STANDRD', k: 'cmd' }]);
    }
  });
}

// Ввод одного-двух чисел в окне (Zoom Factor и т. п.)
function numDialog(title, fields, onDone) {
  pushModal({
    lock: true, sel: 0, vals: fields.map((f) => f[1]), field: null,
    key(k) {
      if (this.field) {
        this.field.key(k, (x) => { this.vals[this.sel] = x.v; this.field = null; if (this.sel + 1 < fields.length) this.sel++; }, () => { this.field = null; });
        return;
      }
      if (k.id === 'UP') this.sel = Math.max(0, this.sel - 1);
      else if (k.id === 'DOWN') this.sel = Math.min(fields.length - 1, this.sel + 1);
      else if (k.id === 'EXE') { if (this.sel + 1 < fields.length) this.sel++; else { popModal(); onDone(this.vals); } }
      else if (k.id === 'EXIT') { popModal(); onDone(this.vals); }
      else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, title);
      fields.forEach((f, i) => {
        const y = 48 + i * 24;
        lcd.text(18, y, f[0]);
        lcd.text(8 * 18, y, ':');
        if (i === this.sel && this.field) this.field.draw(9 * 18, y + 12, LW - 9 * 18 - 4);
        else lcd.text(9 * 18, y, fmtFit(this.vals[i], 12), i === this.sel ? { inv: true } : undefined);
      });
    }
  });
}

const ZOOM_FACT = { x: 2, y: 2 };
let plotVer = 0;                       // меняется, когда графики надо пересчитать
const plotCache = new Map();

const graphApp = {
  list: null, mode: 'list', g: null,

  enter() {
    if (!this.list) {
      this.list = new FuncList({
        title: 'Graph Func',
        onExe: () => this.show(),
        menu: (l) => [
          mi('SELECT', () => l.select()),
          mi('DELETE', () => l.del()),
          mi('TYPE', [...FN_TYPES.slice(0, 4).map((t) => mi(t, () => { S.funcType = t; l.base.reset(); })), null,
            ...FN_TYPES.slice(4).map((t) => mi(t, () => { S.funcType = t; l.base.reset(); }))]),
          mi('TOOL', [{ l: 'STYLE', get sub() { return l.styleMenu(); } }, { l: 'COLOR', get sub() { return l.colorMenu(); } }]),
          null,
          mi('DRAW', () => this.show())
        ]
      });
    }
    this.mode = 'list';
  },
  setup() { return this.mode === 'list' ? ['io', 'funcType', ...SETUP_GRAPH.slice(1)] : SETUP_GRAPH; },
  onSetup() { plotVer++; },

  // ---------- переход к графику ----------
  show() {
    if (!vwOk()) fail('Range ERROR');
    const fns = [];
    mem.fn.forEach((fn, i) => { if (fn.sel && fnDefined(fn)) { fnGet(i); fns.push(i); } });
    const old = this.g;
    this.g = { fns, st: 'view', menu: null, sketch: old ? old.sketch : [], shade: null, orig: { ...VW }, prev: null, tr: null, res: null, pick: null, ptr: null, input: null, note: null };
    this.mode = 'graph';
    plotVer++;
  },

  key(k) {
    if (this.mode === 'list') {
      if (k.shift && k.id === 'F3' && !this.list.ed) { openVWindow(() => { plotVer++; }); return; }
      this.list.key(k);
      return;
    }
    this.gkey(k);
  },

  // ---------- клавиши на экране графика ----------
  gkey(k) {
    const s = this.g, f = fIndex(k);
    if (s.input) {
      s.input.field.key(k, (x) => { const then = s.input.then; s.input = null; then(x.v); }, () => { s.input = null; });
      return;
    }
    if (f >= 0 && (k.shift || !s.menu)) { this.fkey(f); return; }
    if (s.menu) {
      if (f >= 0) { const it = s.menu.press(f); if (it && it.fn) it.fn(); return; }
      if (k.id === 'EXIT') { if (!s.menu.back()) s.menu = null; return; }
    }
    if (this.stateKey(k)) return;
    switch (k.id) {
      case 'LEFT': this.pan(-24, 0); break;
      case 'RIGHT': this.pan(24, 0); break;
      case 'UP': this.pan(0, 24); break;
      case 'DOWN': this.pan(0, -24); break;
      case 'ADD': this.zoom(ZOOM_FACT.x, ZOOM_FACT.y); break;
      case 'SUB': this.zoom(1 / ZOOM_FACT.x, 1 / ZOOM_FACT.y); break;
      case 'EXIT': case 'AC':
        if (s.st !== 'view') this.toView(); else this.mode = 'list';
        break;
      default:
    }
  },
  toView() { const s = this.g; s.st = 'view'; s.res = null; s.pick = null; s.ptr = null; s.note = null; },
  fkey(f) {
    const s = this.g;
    switch (f) {
      case 0: this.startTrace('trace'); break;
      case 1: s.menu = new FMenu(this.zoomMenu()); break;
      case 2: openVWindow(() => { plotVer++; this.toView(); }); break;
      case 3: s.menu = new FMenu(this.sketchMenu()); break;
      case 4: s.menu = new FMenu(this.gsolvMenu()); break;
      case 5: this.mode = 'list'; break;
      default:
    }
  },

  // ---------- окно просмотра ----------
  keep() { this.g.prev = { ...VW }; },
  pan(dx, dy) {
    const sx = dx * xDot(), sy = dy * yDot();
    VW.xmin = r15(VW.xmin + sx); VW.xmax = r15(VW.xmax + sx);
    VW.ymin = r15(VW.ymin + sy); VW.ymax = r15(VW.ymax + sy);
    plotVer++;
  },
  zoom(fx, fy, cx, cy) {
    this.keep();
    const s = this.g;
    if (cx === undefined) {
      const p = s.st === 'trace' && s.tr ? this.point(s.tr) : null;
      cx = p ? p.x : (VW.xmin + VW.xmax) / 2;
      cy = p && Number.isFinite(p.y) ? p.y : (VW.ymin + VW.ymax) / 2;
    }
    const hw = (VW.xmax - VW.xmin) / 2 / fx, hh = (VW.ymax - VW.ymin) / 2 / fy;
    Object.assign(VW, { xmin: r15(cx - hw), xmax: r15(cx + hw), ymin: r15(cy - hh), ymax: r15(cy + hh) });
    plotVer++;
  },
  zoomMenu() {
    const s = this.g, done = () => { s.menu = null; plotVer++; };
    return [
      mi('BOX', () => { s.menu = null; s.st = 'box1'; s.ptr = { px: 192, py: 120 }; }),
      mi('FACTOR', () => numDialog('Zoom Factor', [['Xfact', ZOOM_FACT.x], ['Yfact', ZOOM_FACT.y]], (v) => { if (v[0] > 0) ZOOM_FACT.x = v[0]; if (v[1] > 0) ZOOM_FACT.y = v[1]; })),
      mi('IN', () => { this.zoom(ZOOM_FACT.x, ZOOM_FACT.y); }),
      mi('OUT', () => { this.zoom(1 / ZOOM_FACT.x, 1 / ZOOM_FACT.y); }),
      mi('AUTO', () => {
        let lo = Infinity, hi = -Infinity;
        for (const i of s.fns) {
          if (!fnIsY(mem.fn[i])) continue;
          const fq = fnGet(i).f;
          for (let n = 0; n <= GA.w; n++) { const y = fq(VW.xmin + n * xDot()); if (Number.isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; } }
        }
        if (lo > hi) return;
        this.keep();
        if (lo === hi) { lo -= 1; hi += 1; }
        VW.ymin = r15(lo); VW.ymax = r15(hi);
        done();
      }),
      mi('ORIGINAL', () => { this.keep(); Object.assign(VW, s.orig); done(); }),
      mi('SQUARE', () => { this.keep(); const cy = (VW.ymin + VW.ymax) / 2, hh = xDot() * GA.h / 2; VW.ymin = r15(cy - hh); VW.ymax = r15(cy + hh); done(); }),
      mi('ROUND', () => {
        this.keep();
        const rd = (lo, hi, n) => { const d = Number(((hi - lo) / n).toPrecision(2)), c = Math.round((lo + hi) / 2 / d) * d; return [r15(c - d * n / 2), r15(c + d * n / 2)]; };
        [VW.xmin, VW.xmax] = rd(VW.xmin, VW.xmax, GA.w); [VW.ymin, VW.ymax] = rd(VW.ymin, VW.ymax, GA.h);
        done();
      }),
      mi('INTEGER', () => {
        this.keep();
        const cx = Math.round((VW.xmin + VW.xmax) / 2), cy = Math.round((VW.ymin + VW.ymax) / 2);
        Object.assign(VW, { xmin: cx - 189, xmax: cx + 189, xscl: 10, ymin: cy - 93, ymax: cy + 93, yscl: 10 });
        done();
      }),
      mi('PREVIOUS', () => { if (!s.prev) return; const cur = { ...VW }; Object.assign(VW, s.prev); s.prev = cur; done(); })
    ];
  },

  // ---------- точка на графике ----------
  // tr: {k — номер функции в списке построенных, x | y | t — параметр}
  point(tr) {
    const i = this.g.fns[tr.k], fn = mem.fn[i], c = fnGet(i);
    if (fn.type === 'r=') { const r = c.f(tr.t); return { x: r15(r * fCos(tr.t)), y: r15(r * fSin(tr.t)), t: tr.t, r }; }
    if (fn.type === 'Param') return { x: c.f(tr.t), y: c.g(tr.t), t: tr.t };
    if (fn.type === 'X=') return { x: c.f(tr.y), y: tr.y };
    return { x: tr.x, y: c.f(tr.x) };
  },
  newTr(k) {
    const fn = mem.fn[this.g.fns[k]];
    const old = this.g.tr;
    if (fn.type === 'r=' || fn.type === 'Param') return { k, t: VW.tmin };
    if (fn.type === 'X=') return { k, y: r15(VW.ymin + Math.round(GA.h / 2) * yDot()) };
    return { k, x: old && old.x !== undefined ? old.x : r15(VW.xmin + Math.round(GA.w / 2) * xDot()) };
  },
  startTrace(st) {
    const s = this.g;
    if (!s.fns.length) return;
    s.menu = null; s.res = null; s.note = null;
    s.tr = this.newTr(s.tr && s.tr.k < s.fns.length ? s.tr.k : 0);
    s.st = st;
    this.follow();
  },
  // Держать точку в поле зрения и записать её в переменные X и Y
  follow() {
    const s = this.g, p = this.point(s.tr);
    if (Number.isFinite(p.x)) {
      const px = X2P(p.x);
      if (px < 0 || px > LW) { const hw = (VW.xmax - VW.xmin) / 2; VW.xmin = r15(p.x - hw); VW.xmax = r15(p.x + hw); plotVer++; }
      setVar('X', R(p.x));
    }
    if (Number.isFinite(p.y)) {
      const py = Y2P(p.y);
      if (py < GA.top || py > GA.bottom) { const hh = (VW.ymax - VW.ymin) / 2; VW.ymin = r15(p.y - hh); VW.ymax = r15(p.y + hh); plotVer++; }
      setVar('Y', R(p.y));
    }
  },
  moveTr(d) {
    const s = this.g, tr = s.tr;
    if (tr.t !== undefined) tr.t = Math.max(VW.tmin, Math.min(VW.tmax, r15(tr.t + d * VW.tptch)));
    else if (tr.y !== undefined) tr.y = r15(tr.y + d * yDot());
    else {
      tr.x = r15(tr.x + d * xDot());
      if (Math.abs(tr.x) < xDot() * 1e-6) tr.x = 0;
      const px = X2P(tr.x);
      if (px < 0 || px > LW) { this.pan(d * 24, 0); }
    }
    this.follow();
  },
  askNumber(prompt, k, then) {
    const s = this.g;
    s.input = { prompt, field: new NumField(), then };
    if (k) s.input.field.key(k);
  },

  // Клавиши, зависящие от состояния. true — обработано
  stateKey(k) {
    const s = this.g;
    const arrowsTrace = () => {
      if (k.id === 'LEFT') { this.moveTr(-1); return true; }
      if (k.id === 'RIGHT') { this.moveTr(1); return true; }
      if (startsNumber(k) && s.tr.x !== undefined) {
        this.askNumber('X:', k, (v) => { s.tr.x = v; this.follow(); });
        return true;
      }
      return false;
    };
    switch (s.st) {
      case 'trace':
        if (arrowsTrace()) return true;
        if (k.id === 'UP' || k.id === 'DOWN') {
          const n = s.fns.length;
          s.tr = this.newTr((s.tr.k + (k.id === 'UP' ? n - 1 : 1)) % n);
          this.follow();
          return true;
        }
        return false;
      case 'pick': {
        const p = s.pick;
        if (k.id === 'UP') p.i = (p.i + p.c.length - 1) % p.c.length;
        else if (k.id === 'DOWN') p.i = (p.i + 1) % p.c.length;
        else if (k.id === 'EXE') { s.pick = null; s.st = 'view'; p.then(p.c[p.i]); }
        else return false;
        return true;
      }
      case 'result': {
        const r = s.res;
        if (k.id === 'LEFT' || k.id === 'RIGHT') {
          if (r.pts.length > 1) { r.i = Math.max(0, Math.min(r.pts.length - 1, r.i + (k.id === 'RIGHT' ? 1 : -1))); this.seeResult(); }
          return true;
        }
        return false;
      }
      case 'tangent': case 'normal':
        if (arrowsTrace()) { s.note = null; return true; }
        if (k.id === 'EXE') { this.addLine(s.st); return true; }
        return false;
      case 'intLo': case 'intHi':
        if (arrowsTrace()) return true;
        if (k.id === 'EXE') {
          if (s.st === 'intLo') { s.intLo = s.tr.x; s.st = 'intHi'; }
          else this.integral(s.intLo, s.tr.x);
          return true;
        }
        return false;
      case 'box1': case 'box2': case 'vline': case 'hline': {
        const d = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] }[k.id];
        if (d) {
          const now = Date.now();
          s.streak = now - (s.lastMove || 0) < 200 ? (s.streak || 0) + 1 : 0;
          s.lastMove = now;
          const step = s.streak > 14 ? 6 : s.streak > 5 ? 3 : 1;
          s.ptr.px = Math.max(0, Math.min(LW, s.ptr.px + d[0] * step));
          s.ptr.py = Math.max(GA.top + 1, Math.min(GA.bottom, s.ptr.py + d[1] * step));
          return true;
        }
        if (k.id === 'EXE') {
          const x = P2X(s.ptr.px), y = P2Y(s.ptr.py);
          if (s.st === 'box1') { s.box = { x, y }; s.st = 'box2'; }
          else if (s.st === 'box2') {
            if (x !== s.box.x && y !== s.box.y) {
              this.keep();
              Object.assign(VW, { xmin: r15(Math.min(x, s.box.x)), xmax: r15(Math.max(x, s.box.x)), ymin: r15(Math.min(y, s.box.y)), ymax: r15(Math.max(y, s.box.y)) });
              plotVer++;
            }
            this.toView();
          } else { s.sketch.push(s.st === 'vline' ? { t: 'v', x: r15(x) } : { t: 'h', y: r15(y) }); this.toView(); }
          return true;
        }
        return false;
      }
      default: return false;
    }
  },

  // ---------- G-Solv ----------
  pickFn(cands, then) {
    const s = this.g;
    if (!cands.length) return;
    if (cands.length === 1) { then(cands[0]); return; }
    s.menu = null; s.st = 'pick'; s.pick = { c: cands, i: 0, then };
  },
  yFns() { return this.g.fns.filter((i) => fnIsY(mem.fn[i])); },
  result(label, i, pts, j) {
    const s = this.g;
    if (!pts.length) { errorBox('Not Found'); return; }
    s.menu = null; s.st = 'result';
    s.res = { label, k: s.fns.indexOf(i), pts, i: 0, j };
    this.seeResult();
  },
  seeResult() {
    const r = this.g.res, p = r.pts[r.i];
    setVar('X', R(p.x));
    if (Number.isFinite(p.y)) setVar('Y', R(p.y));
  },
  gsolvMenu() {
    const s = this.g;
    const one = (label, find) => () => this.pickFn(this.yFns(), (i) => {
      const fq = fnGet(i).f;
      this.result(label, i, find(fq).filter((x) => Number.isFinite(fq(x))).map((x) => ({ x, y: label === 'ROOT' ? 0 : snapNice(fq(x)) })));
    });
    const lo = () => P2X(0), hi = () => P2X(LW);
    return [
      mi('ROOT', one('ROOT', (fq) => scanRoots(fq, lo(), hi()))),
      mi('MAX', one('MAX', (fq) => scanExtrema(fq, lo(), hi(), 1))),
      mi('MIN', one('MIN', (fq) => scanExtrema(fq, lo(), hi(), -1))),
      mi('Y-ICEPT', one('Y-ICEPT', () => [0])),
      mi('INTSECT', () => {
        const c = this.yFns();
        if (c.length < 2) { errorBox('Not Found'); return; }
        const go = (a, b) => {
          const fa = fnGet(a).f, fb = fnGet(b).f;
          this.result('INTSECT', a, scanRoots((x) => fa(x) - fb(x), lo(), hi()).map((x) => ({ x, y: snapNice(fa(x)) })), b);
        };
        if (c.length === 2) go(c[0], c[1]);
        else this.pickFn(c, (a) => this.pickFn(c.filter((q) => q !== a), (b) => go(a, b)));
      }),
      mi('Y-CAL', () => this.pickFn(this.yFns(), (i) => {
        s.menu = null;
        this.askNumber('X:', null, (x) => { const y = fnGet(i).f(x); if (!Number.isFinite(y)) { errorBox('Ma ERROR'); return; } this.result('Y-CAL', i, [{ x, y }]); this.follow2(x, y); });
      })),
      mi('X-CAL', () => this.pickFn(this.yFns(), (i) => {
        s.menu = null;
        this.askNumber('Y:', null, (y) => { const fq = fnGet(i).f; this.result('X-CAL', i, scanRoots((x) => fq(x) - y, lo(), hi()).map((x) => ({ x, y }))); });
      })),
      mi('∫dx', () => this.pickFn(this.yFns(), (i) => {
        s.menu = null; s.shade = null;
        s.tr = { k: s.fns.indexOf(i), x: r15(VW.xmin + Math.round(GA.w / 2) * xDot()) };
        s.st = 'intLo';
      }))
    ];
  },
  follow2(x, y) {                      // показать точку, даже если она за экраном
    if (X2P(x) < 0 || X2P(x) > LW) { const hw = (VW.xmax - VW.xmin) / 2; VW.xmin = r15(x - hw); VW.xmax = r15(x + hw); plotVer++; }
    if (Y2P(y) < GA.top || Y2P(y) > GA.bottom) { const hh = (VW.ymax - VW.ymin) / 2; VW.ymin = r15(y - hh); VW.ymax = r15(y + hh); plotVer++; }
  },
  integral(a, b) {
    const s = this.g, i = s.fns[s.tr.k], fq = fnGet(i).f;
    if (a > b) [a, b] = [b, a];
    const v = nInt(fq, a, b);
    if (!Number.isFinite(v)) { errorBox('Ma ERROR'); this.toView(); return; }
    s.shade = { i, a, b };
    s.st = 'result';
    s.res = { label: '∫dx', k: s.tr.k, pts: [{ x: b, y: fq(b) }], i: 0, value: Number(v.toPrecision(12)), a, b };
  },

  // ---------- Sketch ----------
  sketchMenu() {
    const s = this.g;
    return [
      mi('Cls', () => { s.sketch = []; s.shade = null; s.menu = null; this.toView(); }),
      mi('Tangent', () => this.pickFn(this.yFns(), (i) => { this.startTrace('tangent'); s.tr = this.newTr(s.fns.indexOf(i)); })),
      mi('Norm', () => this.pickFn(this.yFns(), (i) => { this.startTrace('normal'); s.tr = this.newTr(s.fns.indexOf(i)); })),
      mi('Inverse', () => this.pickFn(this.yFns(), (i) => { s.sketch.push({ t: 'inv', i }); s.menu = null; })),
      null,
      null, null, null,
      mi('Vertical', () => { s.menu = null; s.st = 'vline'; s.ptr = { px: 192, py: 120 }; }),
      mi('Horz', () => { s.menu = null; s.st = 'hline'; s.ptr = { px: 192, py: 120 }; })
    ];
  },
  addLine(kind) {
    const s = this.g, p = this.point(s.tr), fq = fnGet(s.fns[s.tr.k]).f;
    if (!Number.isFinite(p.y)) return;
    let m = nDeriv(fq, p.x);
    if (!Number.isFinite(m)) { errorBox('Ma ERROR'); return; }
    m = snapNice(m);
    if (kind === 'normal') {
      if (m === 0) { s.sketch.push({ t: 'v', x: p.x }); s.note = 'X=' + fmtFit(p.x, 10); return; }
      m = snapNice(-1 / m);
    }
    const b = snapNice(p.y - m * p.x);
    s.sketch.push({ t: 'line', m, b });
    s.note = 'Y=' + fmtFit(m, 9) + 'X' + (b < 0 ? '−' : '+') + fmtFit(Math.abs(b), 9);
  },

  // ---------- рисование ----------
  pts(i) {
    const fn = mem.fn[i];
    const key = [plotVer, VW.xmin, VW.xmax, VW.ymin, VW.ymax, VW.tmin, VW.tmax, VW.tptch, S.angle, fn.type].join();
    const c = plotCache.get(i);
    if (c && c.key === key) return c.pts;
    const f = fnGet(i);
    const pts = fn.type === 'r=' ? sampleT(f, true) : fn.type === 'Param' ? sampleT(f, false) : fn.type === 'X=' ? sampleX(f.f) : sampleY(f.f);
    plotCache.set(i, { key, pts });
    return pts;
  },
  drawCurve(i) {
    const fn = mem.fn[i], color = COLORS[fn.color] || '#000', g = lcd.g, pts = this.pts(i);
    const rel = fnRel(fn.type);
    if (rel === '=') { strokePts(pts, color, fn.style); return; }
    const up = rel === '>' || rel === '≥';
    g.save();
    g.globalAlpha = 0.22; g.fillStyle = color;
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        g.beginPath();
        g.moveTo(run[0][0], up ? GA.top : GA.bottom);
        for (const p of run) g.lineTo(p[0], Math.max(GA.top, Math.min(GA.bottom, p[1])));
        g.lineTo(run[run.length - 1][0], up ? GA.top : GA.bottom);
        g.closePath(); g.fill();
      }
      run = [];
    };
    for (const p of pts) { if (p) run.push(p); else flush(); }
    flush();
    g.restore();
    strokePts(pts, color, rel === '>' || rel === '<' ? 'Broken' : fn.style);
  },
  pointer(px, py, color) {
    const g = lcd.g;
    UI.sawCursor = true;
    if (!UI.blink) return;
    g.lineCap = 'butt';
    for (const [c, w] of [['#fff', 4], [color || '#000', 1.6]]) {
      g.strokeStyle = c; g.lineWidth = w;
      g.beginPath(); g.moveTo(px - 8, py); g.lineTo(px + 8, py); g.moveTo(px, py - 8); g.lineTo(px, py + 8); g.stroke();
      g.beginPath(); g.arc(px, py, 3.2, 0, Math.PI * 2); g.stroke();
    }
  },
  // Подпись внизу: «X=…» слева, «Y=…» справа; строка выше — для пометок
  coords(a, b, upper) {
    const y = LH - 17 - (this.g.menu ? 24 : 0);
    if (upper) {
      const w = lcd.miniW(upper, { px: 14 });
      lcd.rect(1, y - 17, w + 6, 17, '#fff');
      lcd.mini(4, y - 16, upper, { px: 14 });
    }
    if (S.coord === 'Off' && !this.g.input) return;
    if (a) { const w = lcd.miniW(a, { px: 14 }); lcd.rect(1, y, w + 6, 17, '#fff'); lcd.mini(4, y + 1, a, { px: 14 }); }
    if (b) { const w = lcd.miniW(b, { px: 14 }); lcd.rect(193, y, w + 6, 17, '#fff'); lcd.mini(196, y + 1, b, { px: 14 }); }
  },
  caption(k, hilite) {
    if (S.graphFunc === 'Off' && !hilite) return;
    const i = this.g.fns[k], fn = mem.fn[i];
    const lay = layRow(fn.row, 1, fn.math !== false, false);
    const h = Math.max(18, lay.a + lay.d + 2) * (fn.type === 'Param' ? 2 : 1);
    const head = fnLabel(i, fn.type, 0) + fnRel(fn.type);
    const w = head.length * 12 + lay.w + 8;
    lcd.rect(1, GA.top + 1, Math.min(LW - 2, w + (fn.type === 'Param' ? 40 : 0)), h, hilite && UI.blink ? '#000' : '#fff');
    const ink = hilite && UI.blink ? '#fff' : COLORS[fn.color];
    const c = fnCaption(i, 4, GA.top + 2, ink, 0);
    if (fn.type === 'Param') fnCaption(i, 4, GA.top + 2 + c.h, ink, 1);
    if (hilite) UI.sawCursor = true;
  },

  draw() {
    if (this.mode === 'list') { this.list.draw(); return; }
    const s = this.g, g = lcd.g;
    statusBar(stdTags());
    lcd.clip(0, GA.top, LW, LH - GA.top);
    drawAxes();
    if (s.shade) {
      const fq = fnGet(s.shade.i).f, y0 = Math.max(GA.top, Math.min(GA.bottom, Y2P(0)));
      g.save(); g.globalAlpha = 0.3; g.fillStyle = COLORS[mem.fn[s.shade.i].color];
      g.beginPath();
      const xa = X2P(s.shade.a), xb = X2P(s.shade.b);
      g.moveTo(xa, y0);
      for (let px = xa; px <= xb; px += 0.5) { const y = fq(P2X(px)); g.lineTo(px, Number.isFinite(y) ? Math.max(GA.top, Math.min(GA.bottom, Y2P(y))) : y0); }
      const ye = fq(s.shade.b);
      g.lineTo(xb, Number.isFinite(ye) ? Math.max(GA.top, Math.min(GA.bottom, Y2P(ye))) : y0);
      g.lineTo(xb, y0);
      g.closePath(); g.fill(); g.restore();
    }
    for (const i of s.fns) { try { this.drawCurve(i); } catch (e) { if (!(e instanceof CalcError)) throw e; } }
    for (const sk of s.sketch) {
      g.strokeStyle = '#000'; g.lineWidth = 1.5; g.setLineDash([]);
      g.beginPath();
      if (sk.t === 'line') { g.moveTo(0, clampP(Y2P(sk.m * P2X(0) + sk.b))); g.lineTo(LW, clampP(Y2P(sk.m * P2X(LW) + sk.b))); }
      else if (sk.t === 'v') { g.moveTo(X2P(sk.x), GA.top); g.lineTo(X2P(sk.x), GA.bottom); }
      else if (sk.t === 'h') { g.moveTo(0, Y2P(sk.y)); g.lineTo(LW, Y2P(sk.y)); }
      else if (sk.t === 'inv' && mem.fn[sk.i] && fnDefined(mem.fn[sk.i])) {
        g.strokeStyle = COLORS[mem.fn[sk.i].color]; g.setLineDash([4, 3]);
        const fq = fnGet(sk.i).f;
        let pen = false;
        for (let n = 0; n <= 768; n++) {
          const t = P2Y(GA.top + n / 4 * (GA.bottom - GA.top) / 192), v = fq(t);
          if (!Number.isFinite(v)) { pen = false; continue; }
          // обратная зависимость: координаты меняются местами
          const qx = clampP(X2P(v)), qy = clampP(Y2P(t));
          if (pen) g.lineTo(qx, qy); else { g.moveTo(qx, qy); pen = true; }
        }
      }
      g.stroke();
      g.setLineDash([]);
    }
    lcd.unclip();

    // состояние
    const fmt = (v) => (Number.isFinite(v) ? fmtFit(v, 13) : 'ERROR');
    if (s.st === 'trace' || s.st === 'tangent' || s.st === 'normal' || s.st === 'intLo' || s.st === 'intHi') {
      const tr = s.tr, p = this.point(tr), fn = mem.fn[s.fns[tr.k]];
      this.caption(tr.k);
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) this.pointer(X2P(p.x), Y2P(p.y), COLORS[fn.color]);
      let upper = s.note;
      if (s.st === 'intLo') upper = 'LOWER';
      else if (s.st === 'intHi') upper = 'UPPER';
      else if (!upper && tr.t !== undefined) upper = (fn.type === 'r=' ? 'θ=' : 'T=') + fmt(tr.t) + (fn.type === 'r=' ? '  r=' + fmt(p.r) : '');
      else if (!upper && S.deriv === 'On' && tr.x !== undefined) upper = 'dY/dX=' + fmt(snapNice(nDeriv(fnGet(s.fns[tr.k]).f, tr.x)));
      if (!s.input) this.coords('X=' + fmt(p.x), 'Y=' + fmt(p.y), upper);
    } else if (s.st === 'pick') {
      this.caption(s.fns.indexOf(s.pick.c[s.pick.i]), true);
    } else if (s.st === 'result') {
      const r = s.res, p = r.pts[r.i];
      if (r.k >= 0) this.caption(r.k);
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) this.pointer(X2P(p.x), Y2P(p.y), r.k >= 0 ? COLORS[mem.fn[s.fns[r.k]].color] : '#000');
      if (r.label === '∫dx') {
        this.coords(null, null, null);
        const y = LH - 17 - (s.menu ? 24 : 0), t1 = '∫dx=' + fmt(r.value), t2 = 'LOWER=' + fmt(r.a) + '  UPPER=' + fmt(r.b);
        lcd.rect(1, y - 17, Math.max(lcd.miniW(t1, { px: 14 }), lcd.miniW(t2, { px: 14 })) + 6, 34, '#fff');
        lcd.mini(4, y - 16, t2, { px: 14 });
        lcd.mini(4, y + 1, t1, { px: 14 });
      } else this.coords('X=' + fmt(p.x), 'Y=' + fmt(p.y), r.label);
    } else if (s.ptr) {
      const { px, py } = s.ptr;
      if (s.st === 'box2') {
        const bx = X2P(s.box.x), by = Y2P(s.box.y);
        g.strokeStyle = '#000'; g.lineWidth = 1; g.setLineDash([3, 2]);
        g.strokeRect(Math.min(bx, px) + .5, Math.min(by, py) + .5, Math.abs(px - bx), Math.abs(py - by));
        g.setLineDash([]);
      }
      if (s.st === 'vline') lcd.line(px, GA.top, px, GA.bottom, '#666', 1);
      if (s.st === 'hline') lcd.line(0, py, LW, py, '#666', 1);
      this.pointer(px, py, '#000');
      this.coords('X=' + fmt(r15(P2X(px))), 'Y=' + fmt(r15(P2Y(py))), null);
    }
    if (s.input) {
      const y = LH - 20 - (s.menu ? 24 : 0);
      lcd.rect(0, y - 4, LW, 24, '#fff');
      lcd.line(0, y - 4.5, LW, y - 4.5, '#000', 1);
      lcd.text(2, y - 3, s.input.prompt);
      s.input.field.draw(2 + s.input.prompt.length * 18, y + 9, LW - 8 - s.input.prompt.length * 18);
    }
    if (s.menu) lcd.fmenu(s.menu.labels());
  },

  save() {
    return {
      fn: mem.fn.map((f) => ({ type: f.type, row: f.row, row2: f.row2, math: f.math, sel: f.sel, color: f.color, style: f.style })),
      vw: { ...VW }, zf: { ...ZOOM_FACT }
    };
  },
  load(st) {
    if (Array.isArray(st.fn)) {
      st.fn.slice(0, 20).forEach((f, i) => {
        if (!f || !Array.isArray(f.row)) return;
        mem.fn[i] = {
          type: FN_TYPES.includes(f.type) ? f.type : 'Y=', row: f.row, row2: Array.isArray(f.row2) ? f.row2 : [], math: f.math !== false,
          sel: !!f.sel, color: COLORS[f.color] ? f.color : FN_COLORS[i % 5], style: FN_STYLES.includes(f.style) ? f.style : 'Normal'
        };
      });
    }
    if (st.vw) for (const k in VW) if (Number.isFinite(st.vw[k])) VW[k] = st.vw[k];
    if (st.zf && st.zf.x > 0 && st.zf.y > 0) { ZOOM_FACT.x = st.zf.x; ZOOM_FACT.y = st.zf.y; }
    if (!vwOk()) vwSet('INITIAL');
  }
};
UI.apps.graph = graphApp;
