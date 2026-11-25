// ══════ 82-recur.js — режим Recursion: последовательности, таблица членов и графики ══════
//
// Три типа записи: aₙ (общий член, формула от n), aₙ₊₁ (через предыдущий член) и aₙ₊₂ (через два предыдущих).
// В каждом типе — до трёх последовательностей a, b, c; они могут ссылаться друг на друга.

// ---------- свои знаки экрана: нижние индексы ----------
G.SUBN = '';    // ₙ
G.SUBN1 = '';   // ₙ₊₁
G.SUBN2 = '';   // ₙ₊₂
G.SUB0 = '';    // ₀
G.SUB1 = '';    // ₁
G.SUB2 = '';    // ₂
G.REC_A = '';   // aₙ одним знакоместом (в формулах так плотнее: 2aₙ+1)
G.REC_B = '';   // bₙ
G.REC_C = '';   // cₙ
const REC_GLYPH = { [G.SUBN]: 'n', [G.SUBN1]: 'n+1', [G.SUBN2]: 'n+2', [G.SUB0]: '0', [G.SUB1]: '1', [G.SUB2]: '2' };
const REC_PAIR = { [G.REC_A]: 'a', [G.REC_B]: 'b', [G.REC_C]: 'c' };
const recSpecial0 = lcd.special;
lcd.special = function (ch, cx, cy, h, color) {
  const s = REC_GLYPH[ch], p = REC_PAIR[ch];
  if (s === undefined && p === undefined) return recSpecial0.call(this, ch, cx, cy, h, color);
  const g = this.g, u = h / 24;
  g.fillStyle = color;
  g.textAlign = 'left';
  if (p) {
    // буква слева и маленькая n справа внизу — в одном знакоместе
    g.font = `600 ${21.5 * u}px ${FONT}`;
    g.fillText(p, cx - 9.3 * u, cy + 8.2 * u, 12.5 * u);
    g.font = `700 ${11 * u}px ${FONT}`;
    g.fillText('n', cx + 3.4 * u, cy + 10.5 * u, 6 * u);
  } else {
    g.font = `700 ${(s.length > 1 ? 10.5 : 13) * u}px ${FONT}`;
    g.fillText(s, cx - 9.5 * u, cy + 10 * u, 18 * u);
  }
  g.textAlign = 'center';
  return true;
};

// Строка Setup «ΣDisplay»: показывать ли в таблице столбцы сумм
SETUP_DEF.sigma = ['ΣDisplay', ['On', 'Off']];
S.sigma = 'Off';
S_DEF.sigma = 'Off';

// ---------- данные режима ----------
const REC_TYPES = ['an', 'an+1', 'an+2'];
const REC_COLORS = ['Blue', 'Red', 'Green'];
const REC_SUBS = { an: G.SUBN, 'an+1': G.SUBN1, 'an+2': G.SUBN2 };
const REC_INDEX = { an: 'n', 'an+1': 'n+1', 'an+2': 'n+2' };
const REC_AN = [G.REC_A, G.REC_B, G.REC_C];                      // знаки aₙ, bₙ, cₙ в формуле
const REC_AN1 = ['a' + G.SUBN1, 'b' + G.SUBN1, 'c' + G.SUBN1];    // aₙ₊₁, bₙ₊₁, cₙ₊₁
// При счёте знаки подменяются переменными: n→N, aₙ bₙ cₙ → P Q R, aₙ₊₁ bₙ₊₁ cₙ₊₁ → S T U.
// Значения пользователя в этих переменных на время расчёта сохраняются и потом возвращаются.
const REC_VN = 'N', REC_V0 = ['P', 'Q', 'R'], REC_V1 = ['S', 'T', 'U'];
const REC_SUBST = new Map([['n', REC_VN], ...REC_AN.map((t, i) => [t, REC_V0[i]]), ...REC_AN1.map((t, i) => [t, REC_V1[i]])]);
const recTokens = (toks) => toks.map((t) => REC_SUBST.get(t) || t);
const recLabel = (i, type) => (type === 'an' ? REC_AN[i] : 'abc'[i] + REC_SUBS[type]);

const recNewF = () => ({ row: [], math: true, sel: false });
const recDefaults = () => ({
  type: 'an+1',
  first: 0,                            // номер начального члена: a0 или a1
  start: 1, end: 5,
  init: [[0, 0], [0, 0], [0, 0]],      // начальные члены a, b, c (второй — для типа aₙ₊₂)
  str: [0, 0, 0],                      // anStr, bnStr, cnStr — начало паутинной диаграммы
  f: { an: [recNewF(), recNewF(), recNewF()], 'an+1': [recNewF(), recNewF(), recNewF()], 'an+2': [recNewF(), recNewF(), recNewF()] }
});
const recData = recDefaults();

// ---------- расчёт (без экрана) ----------
// type — тип записи; toks — три набора знаков формул (или null, если формулы нет);
// set — {start, end, first, init: [[a0, a1], [b0, b1], [c0, c1]]}.
// Возвращает {n: номера, seq: [значения a | null, b, c], sum: [накопленные суммы | null, …]}
function recTable(type, toks, set) {
  const { start, end, first } = set;
  if (![start, end].every((v) => Number.isInteger(v) && v >= 0)) fail('Ma ERROR');
  if (end < start) fail('Range ERROR');
  if (end - start + 1 > 999) fail('Memory ERROR');
  if (type !== 'an' && start < first) fail('Range ERROR');
  const f = toks.map((t) => (t && t.length ? compileAst(parse(recTokens(t))) : null));
  const iN = VIX[REC_VN], i0 = REC_V0.map((v) => VIX[v]), i1 = REC_V1.map((v) => VIX[v]);
  const slots = [iN, ...i0, ...i1], saved = slots.map((ix) => fv[ix]);
  const val = (k) => { const y = f[k] ? r15(f[k]()) : NaN; return Number.isFinite(y) ? y : NaN; };
  const ns = [], seq = f.map((q) => (q ? [] : null));
  try {
    if (type === 'an') {
      for (let n = start; n <= end; n++) {
        fv[iN] = n;
        ns.push(n);
        for (let k = 0; k < 3; k++) if (f[k]) seq[k].push(val(k));
      }
    } else if (type === 'an+1') {
      let cur = set.init.map((q, k) => (f[k] ? q[0] : NaN));
      for (let n = first; n <= end; n++) {
        if (n >= start) { ns.push(n); for (let k = 0; k < 3; k++) if (f[k]) seq[k].push(cur[k]); }
        if (n === end) break;
        fv[iN] = n;
        for (let k = 0; k < 3; k++) fv[i0[k]] = cur[k];
        cur = [val(0), val(1), val(2)];
      }
    } else {
      let prev = set.init.map((q, k) => (f[k] ? q[0] : NaN)), cur = set.init.map((q, k) => (f[k] ? q[1] : NaN));
      for (let n = first; n <= end; n++) {
        if (n >= start) { ns.push(n); for (let k = 0; k < 3; k++) if (f[k]) seq[k].push(prev[k]); }
        if (n === end) break;
        // следующий неизвестный член — с номером n+2
        fv[iN] = n;
        for (let k = 0; k < 3; k++) { fv[i0[k]] = prev[k]; fv[i1[k]] = cur[k]; }
        const next = [val(0), val(1), val(2)];
        prev = cur; cur = next;
      }
    }
  } finally {
    slots.forEach((ix, j) => { fv[ix] = saved[j]; });
  }
  const sum = seq.map((a) => {
    if (!a) return null;
    let s = 0;
    return a.map((v) => (s = r15(s + v)));
  });
  return { n: ns, seq, sum };
}

// Функция для паутинной диаграммы: aₙ₊₁ = f(aₙ). Остальные последовательности берутся начальными значениями, n — Start
function recWebF(toks, k, set) {
  const f = compileAst(parse(recTokens(toks[k])));
  const iN = VIX[REC_VN], i0 = REC_V0.map((v) => VIX[v]);
  const slots = [iN, ...i0];
  return (x) => {
    const saved = slots.map((ix) => fv[ix]);
    fv[iN] = set.start;
    for (let j = 0; j < 3; j++) fv[i0[j]] = j === k ? x : set.init[j][0];
    try { return f(); } finally { slots.forEach((ix, j) => { fv[ix] = saved[j]; }); }
  };
}
// Один шаг паутины: от (x, …) по вертикали к графику, потом по горизонтали к прямой y = x
function recWebStep(web) {
  const y = web.f(web.x);
  if (!Number.isFinite(y)) return false;
  web.path.push([web.x, y], [y, y]);
  web.x = y;
  return true;
}

// ---------- экран настройки таблицы ----------
function recOpenSet(onClose) {
  const sub = (d) => [G.SUB0, G.SUB1, G.SUB2][d];
  const rows = () => {
    const r = [['Start', () => recData.start, (v) => { recData.start = v; }], ['End', () => recData.end, (v) => { recData.end = v; }]];
    if (recData.type === 'an') return r;
    const two = recData.type === 'an+2';
    for (let k = 0; k < 3; k++) {
      r.push(['abc'[k] + sub(recData.first), () => recData.init[k][0], (v) => { recData.init[k][0] = v; }]);
      if (two) r.push(['abc'[k] + sub(recData.first + 1), () => recData.init[k][1], (v) => { recData.init[k][1] = v; }]);
    }
    if (!two) for (let k = 0; k < 3; k++) r.push([REC_AN[k] + 'Str', () => recData.str[k], (v) => { recData.str[k] = v; }]);
    return r;
  };
  pushModal({
    sel: 0, top: 0, field: null,
    move(d) {
      const n = rows().length;
      this.sel = (this.sel + d + n) % n;
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 5) this.top = this.sel - 5;
    },
    key(k) {
      if (this.field) {
        this.field.key(k, (x) => { rows()[this.sel][2](x.v); this.field = null; this.move(1); }, () => { this.field = null; });
        return;
      }
      const f = fIndex(k);
      if (recData.type !== 'an' && (f === 0 || f === 1)) { recData.first = f; return; }
      if (k.id === 'UP') this.move(-1);
      else if (k.id === 'DOWN' || k.id === 'EXE') this.move(1);
      else if (k.id === 'EXIT') { popModal(); if (onClose) onClose(); }
      else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); }
    },
    draw() {
      const rs = rows();
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, 'Table Setting');
      lcd.text(16 * 18, 24, REC_INDEX[recData.type]);
      for (let r = 0; r < 6; r++) {
        const i = this.top + r;
        if (i >= rs.length) break;
        const y = 48 + r * 24, on = i === this.sel;
        lcd.text(18, y, rs[i][0]);
        lcd.text(6 * 18, y, ':');
        if (on && this.field) this.field.draw(7 * 18, y + 12, LW - 7 * 18 - 14);
        else lcd.text(7 * 18, y, fmtFit(rs[i][1](), 12), on ? { inv: true } : undefined);
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, 58, 12, '#000');
      if (this.top + 6 < rs.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu(recData.type === 'an' ? [] : [{ l: 'a' + G.SUB0, k: 'cmd' }, { l: 'a' + G.SUB1, k: 'cmd' }]);
    }
  });
}

// ---------- экран графика: точки (n, aₙ) или паутинная диаграмма ----------
// kind: 'con' — точки соединены, 'plt' — только точки, 'web' — паутина; useSum — рисовать суммы
function recGraph(tb, kind, useSum) {
  if (!vwOk()) fail('Range ERROR');
  const set = { start: recData.start, end: recData.end, first: recData.first, init: recData.init };
  const series = tb.shown.map((k) => ({
    k, color: COLORS[REC_COLORS[k]], label: (useSum ? 'Σ' : '') + recLabel(k, recData.type),
    pts: tb.res.n.map((n, r) => [n, (useSum ? tb.res.sum : tb.res.seq)[k][r]])
  }));
  const webs = kind !== 'web' ? [] : tb.shown.map((k) => {
    const f = recWebF(tb.toks, k, set);
    return { k, f, color: COLORS[REC_COLORS[k]], x: recData.str[k], path: [[recData.str[k], 0]] };
  });
  const orig = { ...VW };
  pushModal({
    menu: null, tr: null,
    auto() {
      let lo = Infinity, hi = -Infinity;
      const see = (y) => { if (Number.isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; } };
      if (kind === 'web') {
        for (const w of webs) for (let i = 0; i <= GA.w; i++) see(w.f(VW.xmin + i * xDot()));
      } else {
        const all = [].concat(...series.map((s) => s.pts)).filter((p) => Number.isFinite(p[1]));
        if (!all.length) return;
        let inside = all.filter((p) => p[0] >= VW.xmin && p[0] <= VW.xmax);
        if (!inside.length) {
          // в окне нет ни одной точки — подгоняем и по горизонтали
          const n0 = Math.min(...all.map((p) => p[0])), n1 = Math.max(...all.map((p) => p[0])), pad = Math.max(1, (n1 - n0) * 0.1);
          VW.xmin = n0 - pad; VW.xmax = n1 + pad;
          inside = all;
        }
        inside.forEach((p) => see(p[1]));
      }
      if (lo > hi) return;
      const pad = hi > lo ? (hi - lo) * 0.1 : 1;
      VW.ymin = r15(lo - pad); VW.ymax = r15(hi + pad);
    },
    zoomMenu() {
      const done = () => { this.menu = null; };
      return new FMenu([
        null, null,
        mi('IN', () => { vwZoom(2, 2); }),
        mi('OUT', () => { vwZoom(0.5, 0.5); }),
        mi('AUTO', () => { this.auto(); done(); }),
        mi('ORIGINAL', () => { Object.assign(VW, orig); done(); })
      ]);
    },
    key(k) {
      const f = fIndex(k);
      if (this.menu && !k.shift) {
        if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
        if (k.id === 'EXIT') { this.menu = null; return; }
      }
      if (f === 0) { if (kind !== 'web' && series.length) { this.menu = null; this.tr = this.tr ? null : { s: 0, r: 0 }; } return; }
      if (f === 1) { this.menu = this.zoomMenu(); return; }
      if (f === 2) { openVWindow(); return; }
      if (this.tr) {
        const tr = this.tr, n = series[tr.s].pts.length;
        if (k.id === 'LEFT') tr.r = Math.max(0, tr.r - 1);
        else if (k.id === 'RIGHT') tr.r = Math.min(n - 1, tr.r + 1);
        else if (k.id === 'UP' || k.id === 'DOWN') tr.s = (tr.s + (k.id === 'UP' ? series.length - 1 : 1)) % series.length;
        else if (k.id === 'EXIT') this.tr = null;
        else if (k.id === 'AC') popModal();
        // точка за краем окна — сдвигаем окно, чтобы её было видно
        const p = series[tr.s].pts[tr.r];
        if (p && (X2P(p[0]) < 0 || X2P(p[0]) > LW)) { const hw = (VW.xmax - VW.xmin) / 2; VW.xmin = r15(p[0] - hw); VW.xmax = r15(p[0] + hw); }
        return;
      }
      switch (k.id) {
        case 'EXE': if (kind === 'web') webs.forEach(recWebStep); break;
        case 'LEFT': vwPan(-24, 0); break;
        case 'RIGHT': vwPan(24, 0); break;
        case 'UP': vwPan(0, 24); break;
        case 'DOWN': vwPan(0, -24); break;
        case 'ADD': vwZoom(2, 2); break;
        case 'SUB': vwZoom(0.5, 0.5); break;
        case 'EXIT': case 'AC': popModal(); break;
        default:
      }
    },
    draw() {
      const g = lcd.g;
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.clip(0, GA.top, LW, LH - GA.top);
      drawAxes();
      const sv = S.drawType;
      S.drawType = 'Connect';
      try {
        if (kind === 'web') {
          g.strokeStyle = '#000'; g.lineWidth = 1; g.setLineDash([]);
          g.beginPath(); g.moveTo(X2P(P2X(0)), clampP(Y2P(P2X(0)))); g.lineTo(X2P(P2X(LW)), clampP(Y2P(P2X(LW)))); g.stroke();   // y = x
          for (const w of webs) {
            strokePts(sampleY(w.f), w.color, 'Normal');
            strokePts(w.path.map((p) => [clampP(X2P(p[0])), clampP(Y2P(p[1]))]), w.color, 'Thin');
          }
        } else {
          for (const s of series) {
            const pts = s.pts.map((p) => (Number.isFinite(p[1]) ? [clampP(X2P(p[0])), clampP(Y2P(p[1]))] : null));
            if (kind === 'con') strokePts(pts, s.color, 'Normal');
            g.fillStyle = s.color;
            for (const p of pts) if (p) g.fillRect(p[0] - 2, p[1] - 2, 4, 4);
          }
        }
      } finally { S.drawType = sv; }
      lcd.unclip();
      const fmt = (v) => (Number.isFinite(v) ? fmtFit(v, 12) : 'ERROR');
      if (this.tr) {
        const s = series[this.tr.s], p = s.pts[this.tr.r];
        if (Number.isFinite(p[1])) drawPointer(X2P(p[0]), Y2P(p[1]), s.color);
        if (S.coord !== 'Off') drawCoords('n=' + fmt(p[0]), s.label + '=' + fmt(p[1]), null, !!this.menu);
      } else if (kind === 'web' && webs.length) {
        const w = webs[0], p = w.path[w.path.length - 1];
        drawPointer(X2P(p[0]), Y2P(p[1]), w.color);
        if (S.coord !== 'Off') drawCoords('X=' + fmt(p[0]), 'Y=' + fmt(p[1]), null, !!this.menu);
      }
      if (this.menu) lcd.fmenu(this.menu.labels());
    }
  });
}

// ---------- режим ----------
const recurApp = {
  mode: 'list', cur: 0, ed: null, off: 0, base: null, menu: null, menuKind: 'base', tb: null, tmenu: null,

  enter() {
    this.base = new FMenu([
      mi('SELECT', () => this.select()),
      mi('DELETE', () => this.del()),
      mi('TYPE', REC_TYPES.map((t) => mi(recLabel(0, t), () => { recData.type = t; this.cur = 0; this.off = 0; this.base.reset(); }))),
      { l: 'n.' + G.REC_A + '··', get sub() { return recurApp.insMenu(); } },
      mi('SET', () => recOpenSet()),
      mi('TABLE', () => this.make())
    ]);
    this.menu = this.base; this.menuKind = 'base';
    this.mode = 'list'; this.ed = null;
  },
  setup() { return ['io', 'sigma', 'angle', 'coord', 'grid', 'axes', 'label', 'disp']; },
  onSetup() { if (this.mode === 'table') this.make(); },

  fs() { return recData.f[recData.type]; },
  insMenu() {
    const items = [mi('n', 'n')];
    if (recData.type !== 'an') REC_AN.forEach((t) => items.push(mi(t, t)));
    if (recData.type === 'an+2') REC_AN1.forEach((t) => items.push(mi(t, t)));
    return items;
  },

  // ---------- формулы ----------
  startEdit(keep, atStart) {
    const q = this.fs()[this.cur];
    this.ed = new MathEd(S.io === 'Math');
    if (keep && (this.ed.math || q.row.every((t) => typeof t === 'string'))) this.ed.set(q.row, atStart);
    this.ed.sx = 0;
  },
  stopEdit() { this.ed = null; this.menu = this.base; this.menuKind = 'base'; this.base.reset(); },
  commit() {
    const q = this.fs()[this.cur], ed = this.ed;
    if (ed.empty) { this.stopEdit(); return; }
    parse(recTokens(ed.tokens()));     // при ошибке — Syntax ERROR, остаёмся в редакторе
    if (!q.row.length) q.sel = true;
    q.row = ed.get();
    q.math = ed.math;
    this.stopEdit();
    if (this.cur < 2) this.cur++;
  },
  select() {
    const q = this.fs()[this.cur];
    if (q.row.length) q.sel = !q.sel;
  },
  del() {
    const q = this.fs()[this.cur];
    if (!q.row.length) return;
    confirmBox(['Delete Formula?', ''], () => { Object.assign(q, recNewF()); });
  },

  // ---------- таблица ----------
  make() {
    const fs = this.fs();
    const toks = fs.map((q) => (q.row.length ? rowTokens(q.row) : null));
    const shown = [0, 1, 2].filter((k) => toks[k] && fs[k].sel);
    if (!shown.length) fail('No Variable');
    const res = recTable(recData.type, toks, { start: recData.start, end: recData.end, first: recData.first, init: recData.init });
    const cols = [{ head: REC_INDEX[recData.type], vals: res.n, color: '#000' }];
    for (const k of shown) {
      cols.push({ head: recLabel(k, recData.type), vals: res.seq[k], color: COLORS[REC_COLORS[k]] });
      if (S.sigma === 'On') cols.push({ head: 'Σ' + recLabel(k, recData.type), vals: res.sum[k], color: COLORS[REC_COLORS[k]] });
    }
    this.tb = { cols, res, toks, shown, r: 0, c: 0, top: 0, left: 0 };
    const web = recData.type === 'an+1';
    this.tmenu = new FMenu([
      mi('FORMULA', () => { this.mode = 'list'; }),
      mi('DELETE', () => confirmBox(['Delete Table?', ''], () => { this.mode = 'list'; this.tb = null; })),
      null,
      web ? mi('WEB-GPH', () => recGraph(this.tb, 'web', false)) : null,
      mi('GPH-CON', () => this.graph('con')),
      mi('GPH-PLT', () => this.graph('plt'))
    ]);
    this.mode = 'table';
    this.stopEdit();
  },
  // При включённом ΣDisplay спрашиваем, что рисовать: члены или суммы
  graph(kind) {
    if (!vwOk()) fail('Range ERROR');
    if (S.sigma !== 'On') { recGraph(this.tb, kind, false); return; }
    const tb = this.tb, lab = recLabel(tb.shown[0], recData.type);
    pushModal({
      lock: true,
      key(k) {
        if (k.id === 'F1' || k.id === 'F6') { popModal(); recGraph(tb, kind, k.id === 'F6'); }
        else if (k.id === 'EXIT' || k.id === 'AC') popModal();
      },
      draw() {
        lcd.popup(['Select Graph', ' ' + lab + ' :[F1]', 'Σ' + lab + ' :[F6]'], { w: 290 });
      }
    });
  },

  key(k) {
    if (this.mode === 'table') { this.tkey(k); return; }
    const f = fIndex(k), ed = this.ed;
    if (k.shift && k.id === 'F3' && !ed) { openVWindow(); return; }
    if (ed) {
      if (f >= 0) {
        if (k.shift) return;
        if (this.menuKind !== 'base') { const it = this.menu.press(f); if (it && it.ins !== undefined) edInsert(ed, it.ins); return; }
        // во время ввода из основного меню работает только вставка (F4 и её подменю)
        if (f === 3 || this.base.depth > 1) { const it = this.base.press(f); if (it && it.ins !== undefined) edInsert(ed, it.ins); }
        return;
      }
      switch (k.id) {
        case 'EXE': this.commit(); return;
        case 'EXIT':
          if (this.menuKind !== 'base') { if (!this.menu.back()) { this.menu = this.base; this.menuKind = 'base'; } }
          else if (!this.base.back()) this.stopEdit();
          return;
        case 'AC': if (ed.empty) this.stopEdit(); else ed.clear(); return;
        case 'OPTN': this.menu = new FMenu(FN_OPTN); this.menuKind = 'optn'; return;
        case '4': if (k.shift) { openCatalog(ed); return; } break;
        default:
      }
      if (!k.shift && !k.alpha && (k.id === 'UP' || k.id === 'DOWN')) {
        if (!ed.vert(k.id === 'UP' ? -1 : 1)) { this.stopEdit(); this.cur = Math.max(0, Math.min(2, this.cur + (k.id === 'UP' ? -1 : 1))); }
        return;
      }
      if (edNav(ed, k)) return;
      typeKey(ed, k, 'n');
      return;
    }
    if (f >= 0) {
      if (k.shift) return;
      const it = this.base.press(f);
      if (it && it.fn) it.fn();
      else if (it && it.ins !== undefined) { this.startEdit(false); edInsert(this.ed, it.ins); }
      return;
    }
    switch (k.id) {
      case 'UP': this.cur = Math.max(0, this.cur - 1); return;
      case 'DOWN': this.cur = Math.min(2, this.cur + 1); return;
      case 'LEFT': case 'RIGHT':
        if (this.fs()[this.cur].row.length) this.startEdit(true, k.id === 'RIGHT');
        return;
      case 'EXE': this.make(); return;
      case 'DEL': this.del(); return;
      case 'EXIT': this.base.back(); return;
      default:
    }
    // начало ввода новой формулы
    const probe = new MathEd(S.io === 'Math');
    if (typeKey(probe, k, 'n')) { this.startEdit(false); typeKey(this.ed, k, 'n'); }
  },

  tkey(k) {
    const tb = this.tb, f = fIndex(k);
    if (f >= 0) { if (!k.shift) { const it = this.tmenu.press(f); if (it && it.fn) it.fn(); } return; }
    const nr = tb.cols[0].vals.length, nc = tb.cols.length;
    switch (k.id) {
      case 'UP': tb.r = (tb.r + nr - 1) % nr; break;
      case 'DOWN': tb.r = (tb.r + 1) % nr; break;
      case 'LEFT': tb.c = Math.max(0, tb.c - 1); break;
      case 'RIGHT': tb.c = Math.min(nc - 1, tb.c + 1); break;
      case 'EXIT': if (!this.tmenu.back()) this.mode = 'list'; return;
      default: return;
    }
    if (tb.r < tb.top) tb.top = tb.r;
    if (tb.r > tb.top + 4) tb.top = tb.r - 4;
    // столбец номеров всегда на экране, остальные прокручиваются
    if (tb.c > 0) {
      if (tb.c - 1 < tb.left) tb.left = tb.c - 1;
      if (tb.c - 1 > tb.left + 2) tb.left = tb.c - 3;
    }
  },

  // ---------- рисование ----------
  draw() {
    statusBar(stdTags());
    if (this.mode === 'table') this.drawTable(); else this.drawList();
  },
  drawList() {
    lcd.text(0, 24, 'Recursion');
    const rows = [];
    let y = 0, curTop = 0, curBot = 0;
    this.fs().forEach((q, i) => {
      const editing = !!this.ed && i === this.cur;
      const lay = editing ? layRow(this.ed.root, 0, this.ed.math, false) : layRow(q.row, 0, q.math !== false, false);
      const a = Math.max(12, lay.a), d = Math.max(12, lay.d);
      const r = { i, q, lay, a, h: Math.ceil(a + d), y, editing, defined: q.row.length > 0 };
      if (i === this.cur) { curTop = y; curBot = y + r.h; }
      rows.push(r); y += r.h;
    });
    const vh = 144;
    if (curBot > this.off + vh) this.off = curBot - vh;
    if (curTop < this.off) this.off = curTop;
    lcd.clip(0, 48, LW, vh);
    for (const r of rows) {
      const ry = 48 + r.y - this.off;
      if (ry + r.h < 48 || ry > 48 + vh) continue;
      const on = r.i === this.cur && !this.ed;
      const yc = ry + r.a;
      if (on) lcd.rect(0, ry, LW, r.h, HILITE);
      const ink = on ? '#fff' : '#000';
      const lx = lcd.text(0, yc - 12, recLabel(r.i, recData.type), { color: ink });
      const rel = r.defined || r.editing ? '=' : ':';
      if (r.defined && r.q.sel && !r.editing) {
        // выбранная для таблицы последовательность: знак «=» в рамке
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
      // образец линии цветом последовательности
      lcd.rect(LW - 40, yc - 9, 36, 18, '#fff');
      lcd.frame(LW - 40, yc - 9, 36, 18, on ? '#fff' : '#888', 1);
      lcd.line(LW - 35, yc, LW - 9, yc, COLORS[REC_COLORS[r.i]], 2);
    }
    lcd.unclip();
    lcd.fmenu(this.menu.labels());
  },
  drawTable() {
    const tb = this.tb, CWD = 96;
    const visible = [0];
    for (let j = 0; j < 3 && tb.left + j + 1 < tb.cols.length; j++) visible.push(tb.left + j + 1);
    visible.forEach((ci, vx) => {
      const col = tb.cols[ci], x = vx * CWD, hw = [...col.head].length * 18;
      lcd.text(x + (CWD - hw) / 2, 24, col.head, { color: col.color });
      for (let rr = 0; rr < 5; rr++) {
        const r = tb.top + rr;
        if (r >= col.vals.length) break;
        const v = col.vals[r], s = Number.isFinite(v) ? fmtFit(v, 5) : 'ERROR';
        const yy = 48 + rr * 24, on = r === tb.r && ci === tb.c;
        if (on) lcd.rect(x + 1, yy, CWD - 2, 24, HILITE);
        lcd.text(x + CWD - 4 - [...s].length * 18, yy, s, { color: on ? '#fff' : '#000' });
      }
      if (vx) lcd.line(x + .5, 24, x + .5, 168, '#000', 1);
    });
    lcd.line(0, 47.5, LW, 47.5, '#000', 1);
    lcd.line(0, 168.5, LW, 168.5, '#000', 1);
    const v = tb.cols[tb.c].vals[tb.r], s = Number.isFinite(v) ? fmtNum(v) : 'ERROR';
    lcd.text(LW - 4 - [...s].length * 18, 169, s);
    lcd.fmenu(this.tmenu.labels());
  },

  // ---------- сохранение ----------
  save() {
    const f = {};
    for (const t of REC_TYPES) f[t] = recData.f[t].map((q) => ({ row: q.row, math: q.math, sel: q.sel }));
    return { type: recData.type, first: recData.first, start: recData.start, end: recData.end, init: recData.init, str: recData.str, f };
  },
  load(st) {
    const num = (v, def) => (Number.isFinite(v) ? v : def);
    if (REC_TYPES.includes(st.type)) recData.type = st.type;
    recData.first = st.first === 1 ? 1 : 0;
    recData.start = num(st.start, 1); recData.end = num(st.end, 5);
    for (let k = 0; k < 3; k++) {
      if (Array.isArray(st.init) && Array.isArray(st.init[k])) recData.init[k] = [num(st.init[k][0], 0), num(st.init[k][1], 0)];
      if (Array.isArray(st.str)) recData.str[k] = num(st.str[k], 0);
    }
    for (const t of REC_TYPES) {
      const src = st.f && st.f[t];
      if (!Array.isArray(src)) continue;
      src.slice(0, 3).forEach((q, k) => {
        if (q && Array.isArray(q.row)) recData.f[t][k] = { row: q.row, math: q.math !== false, sel: !!q.sel };
      });
    }
  },
  reset() {
    Object.assign(recData, recDefaults());
    this.mode = 'list'; this.cur = 0; this.off = 0; this.ed = null; this.tb = null;
  }
};
UI.apps.recur = recurApp;
