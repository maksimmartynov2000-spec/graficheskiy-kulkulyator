// ══════ 83-conic.js — режим Conic Graphs: параболы, окружности, эллипсы, гиперболы ══════
//
// Три экрана: выбор вида уравнения → коэффициенты → график (Trace, Zoom, V-Window, G-Solv).
// Расчётная часть (conCurve, conProps, conY, conPaths) — чистые функции, проверяются в tests/conic.js.

// (X−H)² — кусок записи уравнения
const conSq = (v, c) => ['(', v, '−', c, ')', G.SQ];
// Виды уравнений: код, коэффициенты по порядку, запись для экрана (row) и простым текстом (text)
const CON_FORMS = [
  { id: 'px1', coefs: ['A', 'K', 'H'], text: 'X=A(Y-K)^2+H', row: ['X', '=', 'A', ...conSq('Y', 'K'), '+', 'H'] },
  { id: 'px2', coefs: ['A', 'B', 'C'], text: 'X=AY^2+BY+C', row: ['X', '=', 'A', 'Y', G.SQ, '+', 'B', 'Y', '+', 'C'] },
  { id: 'py1', coefs: ['A', 'H', 'K'], text: 'Y=A(X-H)^2+K', row: ['Y', '=', 'A', ...conSq('X', 'H'), '+', 'K'] },
  { id: 'py2', coefs: ['A', 'B', 'C'], text: 'Y=AX^2+BX+C', row: ['Y', '=', 'A', 'X', G.SQ, '+', 'B', 'X', '+', 'C'] },
  { id: 'c1', coefs: ['H', 'K', 'R'], text: '(X-H)^2+(Y-K)^2=R^2', row: [...conSq('X', 'H'), '+', ...conSq('Y', 'K'), '=', 'R', G.SQ] },
  { id: 'c2', coefs: ['A', 'B', 'C', 'D'], text: 'AX^2+AY^2+BX+CY+D=0', row: ['A', 'X', G.SQ, '+', 'A', 'Y', G.SQ, '+', 'B', 'X', '+', 'C', 'Y', '+', 'D', '=', '0'] },
  { id: 'e', coefs: ['A', 'B', 'H', 'K'], text: '(X-H)^2/A^2+(Y-K)^2/B^2=1',
    row: [tplFrac(conSq('X', 'H'), ['A', G.SQ]), '+', tplFrac(conSq('Y', 'K'), ['B', G.SQ]), '=', '1'] },
  { id: 'hx', coefs: ['A', 'B', 'H', 'K'], text: '(X-H)^2/A^2-(Y-K)^2/B^2=1',
    row: [tplFrac(conSq('X', 'H'), ['A', G.SQ]), '−', tplFrac(conSq('Y', 'K'), ['B', G.SQ]), '=', '1'] },
  { id: 'hy', coefs: ['A', 'B', 'H', 'K'], text: '(Y-K)^2/A^2-(X-H)^2/B^2=1',
    row: [tplFrac(conSq('Y', 'K'), ['A', G.SQ]), '−', tplFrac(conSq('X', 'H'), ['B', G.SQ]), '=', '1'] }
];

// ---------- расчёты ----------
const conClean = (v) => snapNice(r15(v));     // убрать шум округления: 2.9999999999999996 → 3

// Приведённый вид кривой по виду уравнения и коэффициентам c = {A: число, …}:
//   parabY: y = a(x−h)²+k        parabX: x = a(y−k)²+h        circle: центр (h, k), радиус r
//   ellipse: (x−h)²/a²+(y−k)²/b²=1   hyperX: (x−h)²/a²−(y−k)²/b²=1   hyperY: (y−k)²/a²−(x−h)²/b²=1
// Вырожденные коэффициенты — Ma ERROR
function conCurve(id, c) {
  const form = CON_FORMS.find((f) => f.id === id);
  if (!form || !form.coefs.every((n) => Number.isFinite(c[n]))) fail('Ma ERROR');
  const { A, B, C, D, H, K, R: rad } = c;
  switch (id) {
    case 'px1': if (A === 0) fail('Ma ERROR'); return { kind: 'parabX', a: A, h: H, k: K };
    case 'px2': if (A === 0) fail('Ma ERROR'); return { kind: 'parabX', a: A, k: conClean(-B / (2 * A)), h: conClean(C - B * B / (4 * A)) };
    case 'py1': if (A === 0) fail('Ma ERROR'); return { kind: 'parabY', a: A, h: H, k: K };
    case 'py2': if (A === 0) fail('Ma ERROR'); return { kind: 'parabY', a: A, h: conClean(-B / (2 * A)), k: conClean(C - B * B / (4 * A)) };
    case 'c1': if (rad === 0) fail('Ma ERROR'); return { kind: 'circle', h: H, k: K, r: Math.abs(rad) };
    case 'c2': {
      if (A === 0) fail('Ma ERROR');
      const h = conClean(-B / (2 * A)), k = conClean(-C / (2 * A)), r2 = conClean(h * h + k * k - D / A);
      if (!(r2 > 0)) fail('Ma ERROR');
      return { kind: 'circle', h, k, r: conClean(Math.sqrt(r2)) };
    }
    case 'e': if (A === 0 || B === 0) fail('Ma ERROR'); return { kind: 'ellipse', a: Math.abs(A), b: Math.abs(B), h: H, k: K };
    case 'hx': if (A === 0 || B === 0) fail('Ma ERROR'); return { kind: 'hyperX', a: Math.abs(A), b: Math.abs(B), h: H, k: K };
    default: if (A === 0 || B === 0) fail('Ma ERROR'); return { kind: 'hyperY', a: Math.abs(A), b: Math.abs(B), h: H, k: K };
  }
}

// Характеристики кривой для G-Solv. Точки — {x, y}, прямые — {x} (вертикальная), {y} (горизонтальная) или {m, b} (y = mx + b).
// Точки идут слева направо, при равных x — снизу вверх
function conProps(q) {
  const P = (x, y) => ({ x: conClean(x), y: conClean(y) });
  const pm = (v) => { v = conClean(v); return v > 0 ? [-Math.sqrt(v), Math.sqrt(v)] : v === 0 ? [0] : []; };   // ±√v
  const { a, b, h, k, r } = q;
  switch (q.kind) {
    case 'parabY': {
      const p = 1 / (4 * a);
      return {
        FOCUS: [P(h, k + p)], VERTEX: [P(h, k)], LENGTH: conClean(1 / Math.abs(a)), e: 1,
        DIRECTX: { y: conClean(k - p) }, SYMMETRY: { x: conClean(h) },
        XICEPT: pm(-k / a).map((d) => P(h + d, 0)), YICEPT: [P(0, a * h * h + k)]
      };
    }
    case 'parabX': {
      const p = 1 / (4 * a);
      return {
        FOCUS: [P(h + p, k)], VERTEX: [P(h, k)], LENGTH: conClean(1 / Math.abs(a)), e: 1,
        DIRECTX: { x: conClean(h - p) }, SYMMETRY: { y: conClean(k) },
        XICEPT: [P(a * k * k + h, 0)], YICEPT: pm(-h / a).map((d) => P(0, k + d))
      };
    }
    case 'circle':
      return {
        CENTER: [P(h, k)], RADIUS: conClean(r),
        XICEPT: pm(r * r - k * k).map((d) => P(h + d, 0)), YICEPT: pm(r * r - h * h).map((d) => P(0, k + d))
      };
    case 'ellipse': {
      const c = Math.sqrt(Math.abs(a * a - b * b)), wide = a >= b;
      return {
        FOCUS: (c === 0 ? [0] : [-c, c]).map((d) => (wide ? P(h + d, k) : P(h, k + d))),
        VERTEX: wide ? [P(h - a, k), P(h + a, k)] : [P(h, k - b), P(h, k + b)],
        CENTER: [P(h, k)], e: conClean(c / Math.max(a, b)),
        XICEPT: pm(1 - (k / b) ** 2).map((d) => P(h + a * d, 0)), YICEPT: pm(1 - (h / a) ** 2).map((d) => P(0, k + b * d))
      };
    }
    case 'hyperX': {
      const c = Math.sqrt(a * a + b * b), m = conClean(b / a);
      return {
        FOCUS: [P(h - c, k), P(h + c, k)], VERTEX: [P(h - a, k), P(h + a, k)], CENTER: [P(h, k)], e: conClean(c / a),
        ASYMPT: [{ m, b: conClean(k - m * h) }, { m: -m, b: conClean(k + m * h) }],
        XICEPT: pm(1 + (k / b) ** 2).map((d) => P(h + a * d, 0)), YICEPT: pm((h / a) ** 2 - 1).map((d) => P(0, k + b * d))
      };
    }
    default: {
      const c = Math.sqrt(a * a + b * b), m = conClean(a / b);
      return {
        FOCUS: [P(h, k - c), P(h, k + c)], VERTEX: [P(h, k - a), P(h, k + a)], CENTER: [P(h, k)], e: conClean(c / a),
        ASYMPT: [{ m, b: conClean(k - m * h) }, { m: -m, b: conClean(k + m * h) }],
        XICEPT: pm((k / a) ** 2 - 1).map((d) => P(h + b * d, 0)), YICEPT: pm(1 + (h / b) ** 2).map((d) => P(0, k + a * d))
      };
    }
  }
}

// Значения Y на кривой при данном X: [верхняя половина, нижняя]; у параболы Y=… — одно значение. Вне кривой — NaN
function conY(q, x) {
  const half = (v, scale) => { const s = v >= 0 ? scale * Math.sqrt(v) : NaN; return [r15(q.k + s), r15(q.k - s)]; };
  switch (q.kind) {
    case 'parabY': return [r15(q.a * (x - q.h) ** 2 + q.k)];
    case 'parabX': return half(r15((x - q.h) / q.a), 1);
    case 'circle': return half(r15(q.r * q.r - (x - q.h) ** 2), 1);
    case 'ellipse': return half(r15(1 - ((x - q.h) / q.a) ** 2), q.b);
    case 'hyperX': return half(r15(((x - q.h) / q.a) ** 2 - 1), q.b);
    default: return half(1 + ((x - q.h) / q.b) ** 2, q.a);
  }
}

// Точки кривой для рисования: массив ветвей, ветвь — массив [x, y]. bx — видимая область {x0, x1, y0, y1}.
// Замкнутые кривые и ветви гиперболы идут по параметру, поэтому у вершин нет разрывов
function conPaths(q, bx) {
  const { a, b, h, k, r } = q, out = [];
  const N = 400;
  switch (q.kind) {
    case 'parabY': {
      const p = [];
      for (let i = 0; i <= N; i++) { const x = bx.x0 + (bx.x1 - bx.x0) * i / N; p.push([x, a * (x - h) ** 2 + k]); }
      return [p];
    }
    case 'parabX': {
      const p = [];
      for (let i = 0; i <= N; i++) { const y = bx.y0 + (bx.y1 - bx.y0) * i / N; p.push([a * (y - k) ** 2 + h, y]); }
      return [p];
    }
    case 'circle': case 'ellipse': {
      const rx = q.kind === 'circle' ? r : a, ry = q.kind === 'circle' ? r : b, p = [];
      for (let i = 0; i <= 360; i++) { const t = i * Math.PI / 180; p.push([h + rx * Math.cos(t), k + ry * Math.sin(t)]); }
      p[360] = p[0].slice();
      return [p];
    }
    default: {
      // гипербола: ветвь h ± a·ch(u), k + b·sh(u); u берём с запасом за край видимой области
      const horiz = q.kind === 'hyperX';
      const dx = Math.max(Math.abs(bx.x0 - h), Math.abs(bx.x1 - h)), dy = Math.max(Math.abs(bx.y0 - k), Math.abs(bx.y1 - k));
      const far = horiz ? Math.min(Math.acosh(Math.max(1, dx / a)), Math.asinh(dy / b)) : Math.min(Math.acosh(Math.max(1, dy / a)), Math.asinh(dx / b));
      const U = far + 0.3, M = 200;
      for (const sg of [1, -1]) {
        const p = [];
        for (let i = -M; i <= M; i++) {
          const u = U * i / M, ch = Math.cosh(u), sh = Math.sinh(u);
          p.push(horiz ? [h + sg * a * ch, k + b * sh] : [h + b * sh, k + sg * a * ch]);
        }
        out.push(p);
      }
      return out;
    }
  }
}

// Уравнение прямой для подписи: «Y=0.5X+1», «X=3», «Y=−2»
function conLineEq(ln) {
  const f = (v) => fmtFit(v, 9);
  if (ln.x !== undefined) return 'X=' + f(ln.x);
  if (ln.y !== undefined) return 'Y=' + f(ln.y);
  let s = 'Y=' + (ln.m === 1 ? '' : ln.m === -1 ? '−' : f(ln.m)) + 'X';
  if (ln.b !== 0) s += (ln.b < 0 ? '−' : '+') + f(Math.abs(ln.b));
  return s;
}

// Пункты G-Solv по виду кривой: [надпись, ключ в conProps, что это: 'pts' | 'val' | 'line' | 'lines']
function conSolvItems(kind) {
  if (kind === 'parabX' || kind === 'parabY') {
    return [['FOCUS', 'FOCUS', 'pts'], ['VERTEX', 'VERTEX', 'pts'], ['LENGTH', 'LENGTH', 'val'], ['e', 'e', 'val'], ['DIRECTX', 'DIRECTX', 'line'],
      ['SYMMETRY', 'SYMMETRY', 'line'], ['X-ICEPT', 'XICEPT', 'pts'], ['Y-ICEPT', 'YICEPT', 'pts']];
  }
  if (kind === 'circle') return [['CENTER', 'CENTER', 'pts'], ['RADIUS', 'RADIUS', 'val'], ['X-ICEPT', 'XICEPT', 'pts'], ['Y-ICEPT', 'YICEPT', 'pts']];
  const list = [['FOCUS', 'FOCUS', 'pts'], ['VERTEX', 'VERTEX', 'pts'], ['CENTER', 'CENTER', 'pts'], ['e', 'e', 'val']];
  list.push(kind === 'ellipse' ? null : ['ASYMPT', 'ASYMPT', 'lines']);
  list.push(['X-ICEPT', 'XICEPT', 'pts'], ['Y-ICEPT', 'YICEPT', 'pts']);
  return list;
}

// ---------- режим ----------
const conicApp = {
  page: 'list',                        // 'list' — выбор вида, 'coef' — коэффициенты, 'graph' — график
  sel: 0, off: 0, row: 0, field: null, vals: {}, g: null,

  enter() { this.page = 'list'; this.field = null; this.fix(); },
  fix() {
    for (const f of CON_FORMS) {
      const v = this.vals[f.id] || (this.vals[f.id] = {});
      for (const n of f.coefs) if (!Number.isFinite(v[n])) v[n] = 0;
    }
  },
  setup() { return ['angle', 'coord', 'grid', 'axes', 'label', 'disp']; },
  form() { return CON_FORMS[this.sel]; },

  key(k) {
    if (this.page === 'list') this.keyList(k);
    else if (this.page === 'coef') this.keyCoef(k);
    else this.keyGraph(k);
  },

  // ---------- выбор вида уравнения ----------
  keyList(k) {
    const n = CON_FORMS.length;
    if (k.id === 'UP') this.sel = (this.sel + n - 1) % n;
    else if (k.id === 'DOWN') this.sel = (this.sel + 1) % n;
    else if (k.id === 'EXE') { this.fix(); this.page = 'coef'; this.row = 0; this.field = null; }
  },
  drawList() {
    statusBar(stdTags());
    const rows = [];
    let y = 0;
    for (const f of CON_FORMS) {
      const lay = layStatic(f.row), a = Math.max(12, lay.a), d = Math.max(12, lay.d);
      const h = Math.ceil(a + d) + 4;
      rows.push({ f, lay, a, h, y });
      y += h;
    }
    const vh = LH - 24, cur = rows[this.sel];
    if (cur.y + cur.h > this.off + vh) this.off = cur.y + cur.h - vh;
    if (cur.y < this.off) this.off = cur.y;
    lcd.clip(0, 24, LW, vh);
    rows.forEach((r, i) => {
      const ry = 24 + r.y - this.off;
      if (ry + r.h < 24 || ry > LH) return;
      const on = i === this.sel;
      if (on) lcd.rect(0, ry, LW, r.h, HILITE);
      drawLay(r.lay, 4, ry + 2 + r.a, on ? '#fff' : '#000');
      lcd.log.push(r.f.text);
    });
    lcd.unclip();
    // стрелки «есть ещё»: белые, если попадают на выделенную строку
    const over = (py) => py >= 24 + cur.y - this.off && py < 24 + cur.y + cur.h - this.off;
    if (this.off > 0) lcd.glyph('▲', LW - 9, 34, 12, over(34) ? '#fff' : '#000');
    if (this.off + vh < y) lcd.glyph('▼', LW - 9, LH - 10, 12, over(LH - 10) ? '#fff' : '#000');
  },

  // ---------- коэффициенты ----------
  keyCoef(k) {
    const f = this.form(), v = this.vals[f.id], n = f.coefs.length;
    if (this.field) {
      this.field.key(k, (x) => { v[f.coefs[this.row]] = x.v; this.field = null; if (this.row + 1 < n) this.row++; }, () => { this.field = null; });
      return;
    }
    if (k.id === 'F6' || k.id === 'EXE') this.show();
    else if (k.id === 'UP') this.row = (this.row + n - 1) % n;
    else if (k.id === 'DOWN') this.row = (this.row + 1) % n;
    else if (k.id === 'EXIT') this.page = 'list';
    else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
  },
  drawCoef() {
    statusBar(stdTags());
    const f = this.form(), v = this.vals[f.id];
    const lay = layStatic(f.row), a = Math.max(12, lay.a), d = Math.max(12, lay.d);
    drawLay(lay, 4, 25 + a);
    lcd.log.push(f.text);
    const y0 = 24 + Math.ceil(a + d) + 4;
    f.coefs.forEach((name, i) => {
      const y = y0 + i * 24, on = i === this.row;
      lcd.text(18, y, name + '=');
      if (on && this.field) this.field.draw(54, y + 12, LW - 58);
      else lcd.text(54, y, fmtFit(v[name], 16), on ? { inv: true } : undefined);
    });
    lcd.fmenu([null, null, null, null, null, { l: 'DRAW', k: 'cmd' }]);
  },

  // ---------- график ----------
  show() {
    if (!vwOk()) fail('Range ERROR');
    const f = this.form();
    const q = conCurve(f.id, this.vals[f.id]);
    this.g = { q, st: 'view', menu: null, tr: null, res: null, input: null, orig: { ...VW }, prev: null };
    this.page = 'graph';
  },
  keyGraph(k) {
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
    if (s.st === 'trace' && this.traceKey(k)) return;
    if (s.st === 'result' && (k.id === 'LEFT' || k.id === 'RIGHT')) {
      const r = s.res, n = r.pts ? r.pts.length : 0;
      if (n > 1) { r.i = Math.max(0, Math.min(n - 1, r.i + (k.id === 'RIGHT' ? 1 : -1))); this.seeResult(); }
      return;
    }
    switch (k.id) {
      case 'LEFT': vwPan(-24, 0); break;
      case 'RIGHT': vwPan(24, 0); break;
      case 'UP': vwPan(0, 24); break;
      case 'DOWN': vwPan(0, -24); break;
      case 'ADD': this.zoom(ZOOM_FACT.x, ZOOM_FACT.y); break;
      case 'SUB': this.zoom(1 / ZOOM_FACT.x, 1 / ZOOM_FACT.y); break;
      case 'EXIT': case 'AC':
        if (s.st !== 'view') { s.st = 'view'; s.res = null; } else this.page = 'coef';
        break;
      default:
    }
  },
  fkey(f) {
    const s = this.g;
    switch (f) {
      case 0: this.startTrace(); break;
      case 1: s.menu = new FMenu(this.zoomMenu()); break;
      case 2: openVWindow(() => { s.st = 'view'; s.res = null; }); break;
      case 4: s.menu = new FMenu(this.solvMenu()); break;
      case 5: this.page = 'coef'; break;
      default:
    }
  },
  zoom(fx, fy) {
    const s = this.g;
    s.prev = { ...VW };
    if (s.st === 'trace' && s.tr) {
      const y = conY(s.q, s.tr.x)[s.tr.br];
      vwZoom(fx, fy, s.tr.x, Number.isFinite(y) ? y : undefined);
    } else vwZoom(fx, fy);
  },
  zoomMenu() {
    const s = this.g, done = () => { s.menu = null; };
    return [
      null, null,
      mi('IN', () => this.zoom(ZOOM_FACT.x, ZOOM_FACT.y)),
      mi('OUT', () => this.zoom(1 / ZOOM_FACT.x, 1 / ZOOM_FACT.y)),
      null,
      mi('ORIGINAL', () => { s.prev = { ...VW }; Object.assign(VW, s.orig); done(); }),
      mi('SQUARE', () => { s.prev = { ...VW }; const cy = (VW.ymin + VW.ymax) / 2, hh = xDot() * GA.h / 2; VW.ymin = r15(cy - hh); VW.ymax = r15(cy + hh); done(); })
    ];
  },

  // ---------- Trace: шаг по X на одну точку экрана, ▲▼ — верхняя и нижняя половина кривой ----------
  yAt(x, br) { return conY(this.g.q, x)[br]; },
  startTrace() {
    const s = this.g, dot = xDot();
    s.menu = null; s.res = null; s.st = 'trace';
    const br = s.tr ? s.tr.br : 0;
    let x = r15(VW.xmin + Math.round(GA.w / 2) * dot);
    if (Math.abs(x) < dot * 1e-6) x = 0;
    // ближайшая к середине экрана точка, где кривая определена
    let found = null;
    for (let i = 0; i <= 4000 && found === null; i++) {
      for (const sg of i ? [1, -1] : [1]) {
        const t = r15(x + sg * i * dot);
        if (Number.isFinite(this.yAt(t, br))) { found = Math.abs(t) < dot * 1e-6 ? 0 : t; break; }
      }
    }
    s.tr = { x: found === null ? x : found, br };
    this.follow();
  },
  follow() {
    const s = this.g, tr = s.tr, px = X2P(tr.x);
    if (px < 0 || px > LW) { const hw = (VW.xmax - VW.xmin) / 2; VW.xmin = r15(tr.x - hw); VW.xmax = r15(tr.x + hw); }
    setVar('X', R(tr.x));
    const y = this.yAt(tr.x, tr.br);
    if (Number.isFinite(y)) setVar('Y', R(y));
  },
  traceKey(k) {
    const s = this.g, tr = s.tr, q = s.q;
    if (k.id === 'LEFT' || k.id === 'RIGHT') {
      const d = k.id === 'RIGHT' ? 1 : -1, dot = xDot(), n = (tr.x - VW.xmin) / dot;
      const step = (x0, i) => {
        const x = Math.abs(n - Math.round(n)) < 1e-6 ? r15(VW.xmin + (Math.round(n) + d * i) * dot) : r15(x0 + d * i * dot);
        return Math.abs(x) < dot * 1e-6 ? 0 : x;
      };
      let x = step(tr.x, 1);
      if (!Number.isFinite(this.yAt(x, tr.br))) {
        // край кривой: у гиперболы перескакиваем на другую ветвь, у остальных остаёмся на месте
        if (q.kind !== 'hyperX') return true;
        let hit = null;
        for (let i = 2; i < 8000 && hit === null; i++) { const t = step(tr.x, i); if (Number.isFinite(this.yAt(t, tr.br))) hit = t; }
        if (hit === null) return true;
        x = hit;
      }
      tr.x = x;
      const px = X2P(x);
      if (px < 0 || px > LW) vwPan(d * 24, 0);
      this.follow();
      return true;
    }
    if (k.id === 'UP' || k.id === 'DOWN') {
      if (conY(q, tr.x).length > 1) { tr.br = k.id === 'UP' ? 0 : 1; this.follow(); }
      return true;
    }
    if (startsNumber(k)) {
      s.input = {
        prompt: 'X:', field: new NumField(),
        then: (v) => { if (!Number.isFinite(this.yAt(v, tr.br))) { errorBox('Ma ERROR'); return; } tr.x = v; this.follow(); }
      };
      s.input.field.key(k);
      return true;
    }
    return false;
  },

  // ---------- G-Solv ----------
  solvMenu() {
    const s = this.g, pr = conProps(s.q);
    return conSolvItems(s.q.kind).map((it) => it && mi(it[0], () => {
      const [label, key, type] = it, v = pr[key];
      if (type === 'pts' && !v.length) { errorBox('Not Found'); return; }
      s.menu = null; s.st = 'result';
      s.res = { label, type, i: 0, pts: type === 'pts' ? v : null, value: type === 'val' ? v : null, lines: type === 'line' ? [v] : type === 'lines' ? v : null };
      this.seeResult();
    }));
  },
  seeResult() {
    const r = this.g.res;
    if (!r.pts) return;
    const p = r.pts[r.i];
    setVar('X', R(p.x)); setVar('Y', R(p.y));
  },

  // ---------- рисование ----------
  drawGraph() {
    const s = this.g, g = lcd.g, q = s.q;
    statusBar(stdTags());
    lcd.clip(0, GA.top, LW, LH - GA.top);
    drawAxes();
    const bx = { x0: P2X(0), x1: P2X(LW), y0: P2Y(GA.bottom), y1: P2Y(GA.top) };
    g.strokeStyle = COLORS.Blue; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash([]);
    for (const path of conPaths(q, bx)) {
      g.beginPath();
      path.forEach(([x, y], i) => { const px = clampP(X2P(x)), py = clampP(Y2P(y)); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    }
    const r = s.st === 'result' ? s.res : null;
    if (r && r.lines) {
      g.strokeStyle = '#000'; g.lineWidth = 1.5;
      g.beginPath();
      for (const ln of r.lines) {
        if (ln.x !== undefined) { g.moveTo(X2P(ln.x), GA.top); g.lineTo(X2P(ln.x), GA.bottom); }
        else if (ln.y !== undefined) { g.moveTo(0, Y2P(ln.y)); g.lineTo(LW, Y2P(ln.y)); }
        else { g.moveTo(0, clampP(Y2P(ln.m * P2X(0) + ln.b))); g.lineTo(LW, clampP(Y2P(ln.m * P2X(LW) + ln.b))); }
      }
      g.stroke();
    }
    lcd.unclip();

    const fmt = (v) => (Number.isFinite(v) ? fmtFit(v, 13) : 'ERROR');
    const hide = S.coord === 'Off';
    if (s.st === 'trace') {
      const tr = s.tr, y = this.yAt(tr.x, tr.br);
      if (Number.isFinite(y)) drawPointer(X2P(tr.x), Y2P(y), COLORS.Blue);
      if (!s.input && !hide) drawCoords('X=' + fmt(tr.x), 'Y=' + fmt(y), null, !!s.menu);
    } else if (r) {
      if (r.pts) {
        const p = r.pts[r.i];
        drawPointer(X2P(p.x), Y2P(p.y), '#000');
        drawCoords(hide ? null : 'X=' + fmt(p.x), hide ? null : 'Y=' + fmt(p.y), r.label, !!s.menu);
      } else if (r.type === 'val') drawCoords(r.label + '=' + fmt(r.value), null, null, !!s.menu);
      else if (r.type === 'line') drawCoords(conLineEq(r.lines[0]), null, r.label, !!s.menu);
      else drawCoords(conLineEq(r.lines[1]), null, conLineEq(r.lines[0]), !!s.menu);
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

  draw() {
    if (this.page === 'graph' && !this.g) this.page = 'coef';
    if (this.page === 'list') this.drawList();
    else if (this.page === 'coef') this.drawCoef();
    else this.drawGraph();
  },

  save() { return { sel: this.sel, vals: this.vals }; },
  load(st) {
    if (Number.isInteger(st.sel) && st.sel >= 0 && st.sel < CON_FORMS.length) this.sel = st.sel;
    for (const f of CON_FORMS) {
      const src = st.vals && st.vals[f.id], v = this.vals[f.id] || (this.vals[f.id] = {});
      for (const n of f.coefs) v[n] = src && Number.isFinite(src[n]) ? src[n] : 0;
    }
  },
  reset() { this.vals = {}; this.fix(); this.sel = 0; this.off = 0; this.page = 'list'; this.g = null; this.field = null; }
};
UI.apps.conic = conicApp;
