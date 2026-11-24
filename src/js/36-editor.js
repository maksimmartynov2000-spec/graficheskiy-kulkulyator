// ══════ 36-editor.js — редактор выражения: курсор, вставка, удаление, шаблоны ══════

const cloneRow = (row) => row.map((it) => (typeof it === 'string' ? it : { t: it.t, s: it.s.map(cloneRow) }));

// Строка с шаблонами → знаки для разбора
function rowTokens(row) {
  const out = [];
  for (const it of row) {
    if (typeof it === 'string') { out.push(it); continue; }
    const s = it.s.map(rowTokens);
    const P = (a) => ['(', ...a, ')'];
    switch (it.t) {
      case 'frac': out.push('(', ...P(s[0]), '÷', ...P(s[1]), ')'); break;
      case 'mixed': out.push('(', ...P(s[0]), '+', ...P(s[1]), '÷', ...P(s[2]), ')'); break;
      case 'sqrt': out.push('(', '√', ...P(s[0]), ')'); break;
      case 'cbrt': out.push('(', G.CBRT, ...P(s[0]), ')'); break;
      case 'root': out.push('(', ...P(s[0]), G.XRT, ...P(s[1]), ')'); break;
      case 'pow': out.push('^', ...P(s[0])); break;
      case 'pow10': out.push('(', '1', '0', '^', ...P(s[0]), ')'); break;
      case 'epow': out.push('(', 'e^', ...P(s[0]), ')'); break;
      case 'abs': out.push('(', 'Abs ', ...P(s[0]), ')'); break;
      case 'logab': out.push('logab(', ...s[0], ',', ...s[1], ')'); break;
      case 'int': out.push('∫(', ...s[0], ',', ...s[1], ',', ...s[2], ')'); break;
      case 'ddx': out.push('d/dx(', ...s[0], ',', ...s[1], ')'); break;
      case 'd2dx': out.push('d²/dx²(', ...s[0], ',', ...s[1], ')'); break;
      case 'sum': out.push('Σ(', ...s[0], ',', ...s[1], ',', ...s[2], ',', ...s[3], ')'); break;
      default:
    }
  }
  return out;
}

// Куда ведут ▲ и ▼ внутри шаблона: (слот, направление −1 вверх / +1 вниз) → слот или −1
const VMAP = {
  frac: (s, d) => (d > 0 ? (s === 0 ? 1 : -1) : (s === 1 ? 0 : -1)),
  mixed: (s, d) => (d > 0 ? (s === 1 ? 2 : -1) : (s === 2 ? 1 : -1)),
  root: (s, d) => (d > 0 ? (s === 0 ? 1 : -1) : (s === 1 ? 0 : -1)),
  logab: (s, d) => (d > 0 ? (s === 1 ? 0 : -1) : (s === 0 ? 1 : -1)),
  int: (s, d) => (d > 0 ? (s === 1 ? -1 : 1) : (s === 2 ? -1 : 2)),
  ddx: (s, d) => (d > 0 ? (s === 0 ? 1 : -1) : (s === 1 ? 0 : -1)),
  d2dx: (s, d) => (d > 0 ? (s === 0 ? 1 : -1) : (s === 1 ? 0 : -1)),
  sum: (s, d) => (d > 0 ? (s === 0 || s === 3 ? 2 : -1) : (s === 3 ? -1 : 3))
};

class MathEd {
  constructor(math) {
    this.math = math !== false;
    this.root = [];
    this.row = this.root;
    this.i = 0;
    this.lay = null;                  // последняя раскладка (для ▲▼ по ближайшему месту)
  }
  get empty() { return !this.root.length; }
  clear() { this.root = []; this.row = this.root; this.i = 0; }
  set(row, atStart) { this.root = cloneRow(row || []); this.row = this.root; this.i = atStart ? 0 : this.root.length; }
  get() { return cloneRow(this.root); }
  tokens() { return rowTokens(this.root); }

  parentOf(row) {
    const find = (r) => {
      for (let idx = 0; idx < r.length; idx++) {
        const it = r[idx];
        if (typeof it === 'string') continue;
        for (let slot = 0; slot < it.s.length; slot++) {
          if (it.s[slot] === row) return { row: r, idx, node: it, slot };
          const q = find(it.s[slot]);
          if (q) return q;
        }
      }
      return null;
    };
    return row === this.root ? null : find(this.root);
  }

  ins(tok) { this.row.splice(this.i, 0, tok); this.i++; }
  insAll(toks) { for (const t of toks) this.ins(t); }
  tpl(type, first) {
    const node = { t: type, s: Array.from({ length: TPL_SLOTS[type] }, () => []) };
    this.row.splice(this.i, 0, node);
    this.row = node.s[first || 0];
    this.i = 0;
    return node;
  }

  right() {
    if (this.i < this.row.length) {
      const it = this.row[this.i];
      if (typeof it === 'object') { this.row = it.s[0]; this.i = 0; } else this.i++;
      return true;
    }
    const p = this.parentOf(this.row);
    if (!p) { if (!this.root.length) return false; this.i = 0; return true; }
    if (p.slot + 1 < p.node.s.length) { this.row = p.node.s[p.slot + 1]; this.i = 0; }
    else { this.row = p.row; this.i = p.idx + 1; }
    return true;
  }
  left() {
    if (this.i > 0) {
      const it = this.row[this.i - 1];
      if (typeof it === 'object') { this.row = it.s[it.s.length - 1]; this.i = this.row.length; } else this.i--;
      return true;
    }
    const p = this.parentOf(this.row);
    if (!p) { if (!this.root.length) return false; this.i = this.root.length; return true; }
    if (p.slot > 0) { this.row = p.node.s[p.slot - 1]; this.i = this.row.length; }
    else { this.row = p.row; this.i = p.idx; }
    return true;
  }
  vert(dir) {
    let row = this.row;
    const here = this.lay ? curOf(this.lay, this.row, this.i) : null;
    for (;;) {
      const p = this.parentOf(row);
      if (!p) return false;
      const f = VMAP[p.node.t], t = f ? f(p.slot, dir) : -1;
      if (t >= 0) {
        const tr = p.node.s[t];
        let best = tr.length;
        if (here && this.lay) {
          let bd = Infinity;
          for (let k = 0; k <= tr.length; k++) {
            const c = curOf(this.lay, tr, k);
            if (c && Math.abs(c.x - here.x) < bd) { bd = Math.abs(c.x - here.x); best = k; }
          }
        }
        this.row = tr; this.i = best;
        return true;
      }
      row = p.row;
    }
  }
  del() {
    if (this.i > 0) {
      const it = this.row[this.i - 1];
      if (typeof it === 'object' && !it.s.every((r) => !r.length)) {
        this.row = it.s[it.s.length - 1]; this.i = this.row.length;
        return true;
      }
      this.row.splice(this.i - 1, 1); this.i--;
      return true;
    }
    const p = this.parentOf(this.row);
    if (!p) {
      if (!this.row.length) return false;
      const it = this.row[0];
      if (typeof it === 'object' && !it.s.every((r) => !r.length)) return false;
      this.row.splice(0, 1);
      return true;
    }
    // в начале места шаблона: шаблон раскрывается, содержимое остаётся
    const before = p.node.s.slice(0, p.slot).reduce((n, r) => n + r.length, 0);
    p.row.splice(p.idx, 1, ...[].concat(...p.node.s));
    this.row = p.row; this.i = p.idx + before;
    return true;
  }
  atTop() { return this.row === this.root; }
}

// Раскладка строки редактора с горизонтальной прокруткой: возвращает {lay, sx}
// width — ширина окна; sx — сдвиг, при котором курсор виден
function edLayout(ed, sz, width, prevSx) {
  const lay = layRow(ed.root, sz || 0, ed.math, false);
  ed.lay = lay;
  const c = curOf(lay, ed.row, ed.i);
  let sx = prevSx || 0;
  const cx = c ? c.x : 0;
  if (lay.w <= width - 3) sx = 0;
  else {
    if (cx - sx > width - 14) sx = cx - (width - 14);
    if (cx - sx < 12) sx = Math.max(0, cx - 12);
    sx = Math.max(0, Math.min(sx, lay.w - width + 14));
  }
  return { lay, sx, c };
}
