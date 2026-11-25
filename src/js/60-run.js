// ══════ 60-run.js — режим Run-Matrix: вычисления с историей ══════

// Число в ограниченную ширину (n знаков): убираем лишние цифры
function fmtFit(v, n) {
  let s = fmtNum(v);
  if ([...s].length <= n) return s;
  for (let d = 9; d >= 1; d--) {
    s = fmtNum(Number(v.toPrecision(d)), { disp: 'Norm', dispN: S.dispN });
    if ([...s].length <= n) return s;
  }
  for (let d = 5; d >= 1; d--) {
    s = fmtNum(v, { disp: 'Sci', dispN: d });
    if ([...s].length <= n) return s;
  }
  return s;
}

const valText = (x, n) => (isCx(x) ? cxText(x, n) : fmtFit(x.v, n));

// Просмотр списка (ответ в виде списка)
function listView(title, arr) {
  pushModal({
    sel: 0, top: 0,
    key(k) {
      const n = arr.length;
      if (k.id === 'UP') this.sel = (this.sel + n - 1) % n;
      else if (k.id === 'DOWN') this.sel = (this.sel + 1) % n;
      else if (['EXIT', 'EXE', 'AC'].includes(k.id)) { popModal(); return; }
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 4) this.top = this.sel - 4;
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(108, 24, title);
      lcd.line(0, 47.5, LW, 47.5, '#000', 1);
      for (let r = 0; r < 5; r++) {
        const i = this.top + r;
        if (i >= arr.length) break;
        const y = 48 + r * 24, idx = String(i + 1);
        lcd.text(72 - idx.length * 18, y, idx);
        const s = valText(arr[i], 15);
        if (i === this.sel) lcd.rect(90, y, 15 * 18 + 6, 24, HILITE);
        lcd.text(90 + (15 - [...s].length) * 18, y, s, { color: i === this.sel ? '#fff' : '#000' });
      }
      lcd.line(81.5, 48, 81.5, 168, '#000', 1);
      lcd.line(0, 168.5, LW, 168.5, '#000', 1);
      const s = valText(arr[this.sel], 20);
      lcd.text(LW - 4 - [...s].length * 18, 169, s);
    }
  });
}

// Просмотр матрицы
function matView(title, m) {
  pushModal({
    r: 0, c: 0, top: 0, left: 0,
    key(k) {
      const R0 = m.length, C0 = m[0].length;
      if (k.id === 'UP') this.r = Math.max(0, this.r - 1);
      else if (k.id === 'DOWN') this.r = Math.min(R0 - 1, this.r + 1);
      else if (k.id === 'LEFT') this.c = Math.max(0, this.c - 1);
      else if (k.id === 'RIGHT') this.c = Math.min(C0 - 1, this.c + 1);
      else if (['EXIT', 'EXE', 'AC'].includes(k.id)) { popModal(); return; }
      if (this.r < this.top) this.top = this.r;
      if (this.r > this.top + 3) this.top = this.r - 3;
      if (this.c < this.left) this.left = this.c;
      if (this.c > this.left + 2) this.left = this.c - 2;
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(4, 24, title);
      for (let c = 0; c < 3; c++) {
        const j = this.left + c;
        if (j >= m[0].length) break;
        lcd.text(36 + c * 114 + 110 - String(j + 1).length * 18, 24, String(j + 1));
      }
      for (let r = 0; r < 4; r++) {
        const i = this.top + r;
        if (i >= m.length) break;
        const y = 48 + r * 24;
        lcd.text(4, y, String(i + 1));
        for (let c = 0; c < 3; c++) {
          const j = this.left + c;
          if (j >= m[0].length) break;
          const s = valText(m[i][j], 6), x = 36 + c * 114;
          const on = i === this.r && j === this.c;
          if (on) lcd.rect(x, y, 112, 24, HILITE);
          lcd.text(x + 110 - [...s].length * 18, y, s, { color: on ? '#fff' : '#000' });
        }
      }
      lcd.frame(33, 47, LW - 34, 98, '#000', 1);
      const s = valText(m[this.r][this.c], 20);
      lcd.text(LW - 4 - [...s].length * 18, 169, s);
    }
  });
}

const T = (tpl, line) => ({ tpl, line });
const MATH_MENU = [
  null,                                // на этом месте у оригинала шаблоны матриц (MAT/VCT)
  mi('logab', T('logab', 'logab(')), mi('Abs', T('abs', 'Abs ')), mi('d/dx', T('ddx', 'd/dx(')), mi('d²/dx²', T('d2dx', 'd²/dx²(')),
  mi('∫dx', T('int', '∫(')), mi('Σ(', T('sum', 'Σ('))
];
const notHere = (what) => () => infoBox([what, 'not available', '', 'Press:[EXIT]']);
const OPTN_RUN = [
  mi('LIST', [mi('List', 'List '), mi('Lst→Mat', 'List→Mat('), mi('Dim', 'Dim '), mi('Fill(', 'Fill('), mi('Seq', 'Seq('),
    mi('Min', 'Min('), mi('Max', 'Max('), mi('Mean', 'Mean('), mi('Median', 'Median('), mi('Augment', 'Augment('),
    mi('Sum', 'Sum '), mi('Prod', 'Prod '), mi('Cuml', 'Cuml '), mi('%', 'Percent '), mi('ΔList', 'ΔList ')]),
  mi('MAT/VCT', [mi('Mat', 'Mat '), mi('Mat→Lst', 'Mat→List('), mi('Det', 'Det '), mi('Trn', 'Trn '), mi('Augment', 'Augment('),
    mi('Identity', 'Identity '), mi('Dim', 'Dim '), mi('Fill(', 'Fill('), mi('Ref', 'Ref '), mi('Rref', 'Rref ')]),
  mi('COMPLEX', [mi('i', 'i'), mi('Abs', T('abs', 'Abs ')), mi('Arg', 'Arg '), mi('Conjg', 'Conjg '), null,
    mi('ReP', 'ReP '), mi('ImP', 'ImP '), mi(CX_POLAR, CX_POLAR), mi(CX_RECT, CX_RECT)]),
  mi('CALC', [mi('Solve', 'Solve('), mi('d/dx', T('ddx', 'd/dx(')), mi('d²/dx²', T('d2dx', 'd²/dx²(')), mi('∫dx', T('int', '∫(')), mi('SolveN', 'SolveN('),
    mi('FMin', 'FMin('), mi('FMax', 'FMax('), mi('Σ(', T('sum', 'Σ(')), mi('logab', T('logab', 'logab(')), mi('Int÷', 'Int÷'),
    mi('Rmdr', 'Rmdr')]),
  mi('STAT', [
    mi('DIST', [mi('NORM', [mi('Npd', 'NormPD('), mi('Ncd', 'NormCD('), mi('InvN', 'InvNormCD(')]),
      mi('BINOMIAL', [mi('Bpd', 'BinomialPD('), mi('Bcd', 'BinomialCD(')]),
      mi('POISSON', [mi('Ppd', 'PoissonPD('), mi('Pcd', 'PoissonCD(')])]),
    mi('StdDev', 'StdDev('), mi('Var', 'Variance(')]),
  mi('CONVERT', notHere('Unit conversion')),
  mi('HYPERBL', [mi('sinh', 'sinh '), mi('cosh', 'cosh '), mi('tanh', 'tanh '), mi('sinh' + G.INV, 'sinh' + INVS), mi('cosh' + G.INV, 'cosh' + INVS), mi('tanh' + G.INV, 'tanh' + INVS)]),
  mi('PROB', [mi('x!', '!'), mi('nPr', G.PERM), mi('nCr', G.COMB),
    mi('RAND', [mi('Ran#', 'Ran# '), mi('Int', 'RanInt#('), mi('Norm', 'RanNorm#('), mi('Bin', 'RanBin#('), mi('List', 'RanList#(')]),
    mi('P(', 'P('), mi('Q(', 'Q('), mi('R(', 'R(')]),
  mi('NUMERIC', [mi('Abs', T('abs', 'Abs ')), mi('Int', 'Int '), mi('Frac', 'Frac '), mi('Intg', 'Intg '), mi('RndFix', 'RndFix('),
    mi('GCD', 'GCD('), mi('LCM', 'LCM('), mi('MOD', 'MOD('), mi('MOD_Exp', 'MOD_Exp(')]),
  mi('ANGLE', [mi('°', '°'), mi('r', G.RAD), mi('g', G.GRA), mi('Pol(', 'Pol('), mi('Rec(', 'Rec(')])
];
const VARS_RUN = [null, null, null, mi('GRAPH', [mi('Y', G.YV)])];

const ANS_KEYS = new Set(['ADD', 'SUB', 'MUL', 'DIV', 'POW', 'SQR', 'STO']);

const runApp = {
  hist: [], ed: null, sel: -1, off: 0, menu: null, base: null,

  enter() {
    if (!this.ed) this.ed = new MathEd(S.io === 'Math');
    this.syncMode();
    this.setBase();
  },
  syncMode() {
    const m = S.io === 'Math';
    if (this.ed.math !== m) { this.ed = new MathEd(m); this.sel = -1; }
  },
  setBase() {
    const items = [
      mi('JUMP', [mi('TOP', () => this.jump(0)), mi('BOTTOM', () => this.jump(-1))]),
      mi('DELETE', [mi('DEL-LINE', () => this.delLine()), mi('DEL-ALL', () => confirmBox(['Delete All?', ''], () => { this.hist = []; this.sel = -1; this.ed.clear(); }))]),
      mi('▶MAT/VCT', () => { if (typeof openMatList === 'function') openMatList(); })
    ];
    if (S.io === 'Math') items.push(mi('MATH', MATH_MENU));
    this.base = new FMenu(items);
    this.menu = this.base;
  },
  setup() { return SETUP_RUN; },
  onSetup() { this.syncMode(); this.setBase(); },

  jump(i) {
    if (i < 0 || !this.hist.length) { this.sel = -1; this.ed.clear(); return; }
    this.sel = 0; this.ed.set(this.hist[0].row);
  },
  delLine() {
    if (this.sel < 0) return;
    this.hist.splice(this.sel, 1);
    if (this.sel >= this.hist.length) { this.sel = -1; this.ed.clear(); } else this.ed.set(this.hist[this.sel].row);
  },

  // Вычислить строку → запись истории. Ошибки калькулятора пробрасываются
  run1(row, math, show) {
    const e = { row, math, kind: 'num', val: null, mode: 'auto', frac: null, form: null };
    cxTakeHint();
    const v = evalTokens(rowTokens(row));
    if (isNum(v) || isCx(v)) { e.val = v; mem.ans = v; e.form = cxTakeHint(); }   // form — вид ответа по команде ▶r∠θ / ▶a+bi
    else if (isL(v)) { e.kind = 'done'; mem.listAns = v.a; if (show) listView('Ans', v.a); }
    else if (isM(v)) { e.kind = 'done'; mem.matAns = v.m; if (show) matView('Ans', v.m); }
    else e.kind = 'done';
    return e;
  },
  exe() {
    if (this.ed.empty) {
      if (this.sel >= 0 || !this.hist.length) return;
      const last = this.hist[this.hist.length - 1];
      this.hist.push(this.run1(cloneRow(last.row), last.math, true));
    } else if (this.sel >= 0) {
      const at = this.sel;
      this.hist[at] = this.run1(this.ed.get(), this.ed.math, at === this.hist.length - 1);
      for (let i = at + 1; i < this.hist.length; i++) {
        try { this.hist[i] = this.run1(this.hist[i].row, this.hist[i].math, false); } catch (err) {
          if (!(err instanceof CalcError)) throw err;
          this.hist[i] = { row: this.hist[i].row, math: this.hist[i].math, kind: 'err', val: null, mode: 'auto', frac: null, err: err.type };
        }
      }
    } else this.hist.push(this.run1(this.ed.get(), this.ed.math, true));
    if (this.hist.length > 60) this.hist.splice(0, this.hist.length - 60);
    this.sel = -1;
    this.ed.clear();
  },
  toggleSD(shift) {
    const e = this.sel >= 0 ? this.hist[this.sel] : this.hist[this.hist.length - 1];
    if (!e || e.kind !== 'num') return;
    if (isCx(e.val) || e.form === 'polar') { if (!shift) cxToggleSD(e); return; }
    const form = () => { const sv = S.frac; if (e.frac) S.frac = e.frac; try { return exactForm(e.val, e.math); } finally { S.frac = sv; } };
    if (shift) {
      if (!e.val.ex || !exIsRat(e.val.ex) || exIsInt(e.val.ex)) return;
      e.frac = (e.frac || S.frac) === 'd/c' ? 'ab/c' : 'd/c';
      e.mode = 'exact';
      return;
    }
    const shown = e.mode !== 'dec' && (e.mode === 'exact' || !e.val.dec) && form();
    if (shown) { e.mode = 'dec'; return; }
    if (!form()) {
      if (e.val.ex) return;
      const ex = ratApprox(e.val.v);
      if (!ex || exIsInt(ex)) return;
      e.val = R(e.val.v, ex, e.val.dec);
      if (!form()) { e.val = R(e.val.v, null, e.val.dec); return; }
    }
    e.mode = 'exact';
  },

  key(k) {
    const ed = this.ed;
    const f = fIndex(k);
    if (k.shift && k.id === 'F3') { openVWindow(() => { plotVer++; }); return; }
    if (f >= 0) {
      if (k.shift) return;
      const it = this.menu.press(f);
      if (it && it.fn) it.fn();
      else if (it && it.ins !== undefined) {
        if (ed.empty && this.sel < 0 && ['!', G.PERM, G.COMB, 'Int÷', 'Rmdr'].includes(it.ins)) ed.ins('Ans');
        edInsert(ed, it.ins);
      }
      return;
    }
    switch (k.id) {
      case 'EXIT':
        if (!this.menu.back() && this.menu !== this.base) this.menu = this.base;
        return;
      case 'OPTN': this.menu = new FMenu(OPTN_RUN); return;
      case 'VARS': if (!k.shift) this.menu = new FMenu(VARS_RUN); return;
      case 'EXE': this.exe(); return;
      case 'AC':
        if (ed.empty && this.sel >= 0) this.sel = -1;
        ed.clear();
        return;
      case 'SD': this.toggleSD(k.shift); return;
      case '4': if (k.shift) { openCatalog(ed); return; } break;
      default:
    }
    if (!k.shift && !k.alpha && (k.id === 'UP' || k.id === 'DOWN')) {
      if (ed.vert(k.id === 'UP' ? -1 : 1)) return;
      if (k.id === 'UP') {
        const t = this.sel < 0 ? this.hist.length - 1 : this.sel - 1;
        if (t >= 0) { this.sel = t; ed.set(this.hist[t].row); }
      } else if (this.sel >= 0) {
        if (this.sel + 1 < this.hist.length) { this.sel++; ed.set(this.hist[this.sel].row); } else { this.sel = -1; ed.clear(); }
      }
      return;
    }
    if (!k.shift && !k.alpha && (k.id === 'LEFT' || k.id === 'RIGHT') && ed.empty && this.sel < 0) {
      // после расчёта ◄ ► возвращают последнее выражение для правки
      if (this.hist.length) ed.set(this.hist[this.hist.length - 1].row, k.id === 'RIGHT');
      return;
    }
    if (edNav(ed, k)) return;
    if (ed.empty && this.sel < 0 && !k.alpha && ((!k.shift && ANS_KEYS.has(k.id)) || (k.shift && k.id === 'RPAR'))) ed.ins('Ans');
    typeKey(ed, k);
  },

  entryRow(e) {
    const sv = S.frac;
    if (e.frac) S.frac = e.frac;
    try { return valRow(e.val, e.mode, e.math, e.form); } finally { S.frac = sv; }
  },

  draw() {
    statusBar(stdTags());
    const top = 24, vh = 168, ed = this.ed;
    const blocks = [];
    let active = 0;
    const edBlock = () => {
      const lay = layRow(ed.root, 0, ed.math, false);
      const a = Math.max(12, lay.a), d = Math.max(12, lay.d);
      blocks.push({ h: Math.ceil(a + d), a, edit: true });
      active = blocks.length - 1;
    };
    this.hist.forEach((e, i) => {
      if (i === this.sel) edBlock();
      else {
        const lay = layRow(e.row, 0, e.math, false);
        const a = Math.max(12, lay.a), d = Math.max(12, lay.d);
        blocks.push({ h: Math.ceil(a + d), a, lay });
      }
      if (e.kind === 'num') {
        const lay = layStatic(this.entryRow(e));
        const a = Math.max(12, lay.a), d = Math.max(12, lay.d);
        blocks.push({ h: Math.ceil(a + d), a, lay, right: true });
      } else blocks.push({ h: 24, a: 12, text: e.kind === 'err' ? e.err : 'Done' });
    });
    if (this.sel < 0) edBlock();
    let total = 0;
    for (const b of blocks) { b.y = total; total += b.h; }
    // прокрутка: строка ввода и её ответ должны быть видны
    let off = this.off;
    if (this.sel < 0) off = Math.max(0, total - vh);
    else {
      const b = blocks[active], nb = blocks[active + 1];
      const bottom = nb ? nb.y + nb.h : b.y + b.h;
      if (bottom > off + vh) off = bottom - vh;
      if (b.y < off) off = b.y;
      off = Math.max(0, Math.min(off, Math.max(0, total - vh)));
    }
    this.off = off;
    lcd.clip(0, top, LW, vh);
    for (const b of blocks) {
      const y = top + b.y - off;
      if (y + b.h < top || y > top + vh) continue;
      const yc = y + b.a;
      if (b.edit) { lcd.unclip(); lcd.clip(0, top, LW, vh); drawEd(ed, 1, yc, LW - 2); }
      else if (b.text) lcd.text(LW - 2 - b.text.length * 18, y, b.text);
      else if (b.right) drawLay(b.lay, Math.max(1, LW - 2 - b.lay.w), yc);
      else { drawLay(b.lay, 1, yc); if (b.lay.w > LW - 2) { lcd.rect(LW - 12, y, 12, b.h, '#fff'); lcd.glyph('▶', LW - 6, yc, 14, '#000'); } }
    }
    lcd.unclip();
    lcd.fmenu(this.menu.labels());
  },

  save() { return { hist: this.hist.slice(-30).map((e) => ({ row: e.row, math: e.math, kind: e.kind, val: e.val, mode: e.mode, frac: e.frac, form: e.form, err: e.err })), cur: this.ed ? this.ed.get() : [] }; },
  load(st) {
    if (!st) return;
    this.hist = Array.isArray(st.hist) ? st.hist.filter((e) => e && Array.isArray(e.row)) : [];
    this.ed = new MathEd(S.io === 'Math');
    if (Array.isArray(st.cur) && (S.io === 'Math' || st.cur.every((t) => typeof t === 'string'))) this.ed.set(st.cur);
  }
};
UI.apps.run = runApp;
