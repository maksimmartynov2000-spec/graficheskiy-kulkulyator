// ══════ 62-mat.js — редактор матриц (Run-Matrix → ▶MAT/VCT) и каталог команд (SHIFT 4) ══════

const MAT_NAMES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

// Таблица матрицы с правкой ячеек
function matEdit(name) {
  const m = mem.mats[name];
  pushModal({
    r: 0, c: 0, top: 0, left: 0, field: null,
    menu: null,
    init() {
      const done = () => this.menu.reset();
      this.menu = new FMenu([
        null,
        mi('ROW', [
          mi('DELETE', () => { if (m.length > 1) { m.splice(this.r, 1); this.r = Math.min(this.r, m.length - 1); } done(); }),
          mi('INSERT', () => { m.splice(this.r, 0, m[0].map(() => RI(0))); done(); }),
          mi('ADD', () => { m.splice(this.r + 1, 0, m[0].map(() => RI(0))); this.r++; this.see(); done(); })
        ]),
        mi('COLUMN', [
          mi('DELETE', () => { if (m[0].length > 1) { for (const row of m) row.splice(this.c, 1); this.c = Math.min(this.c, m[0].length - 1); } done(); }),
          mi('INSERT', () => { for (const row of m) row.splice(this.c, 0, RI(0)); done(); }),
          mi('ADD', () => { for (const row of m) row.splice(this.c + 1, 0, RI(0)); this.c++; this.see(); done(); })
        ]),
        mi('EDIT', () => { this.field = new NumField(); })
      ]);
      return this;
    },
    see() {
      if (this.r < this.top) this.top = this.r;
      if (this.r > this.top + 3) this.top = this.r - 3;
      if (this.c < this.left) this.left = this.c;
      if (this.c > this.left + 2) this.left = this.c - 2;
    },
    key(k) {
      if (this.field) {
        this.field.key(k, (x) => {
          m[this.r][this.c] = x; this.field = null;
          if (this.c + 1 < m[0].length) this.c++; else if (this.r + 1 < m.length) { this.r++; this.c = 0; }
          this.see();
        }, () => { this.field = null; });
        return;
      }
      const f = fIndex(k);
      if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
      if (k.id === 'UP') this.r = Math.max(0, this.r - 1);
      else if (k.id === 'DOWN') this.r = Math.min(m.length - 1, this.r + 1);
      else if (k.id === 'LEFT') this.c = Math.max(0, this.c - 1);
      else if (k.id === 'RIGHT') this.c = Math.min(m[0].length - 1, this.c + 1);
      else if (k.id === 'EXIT') { if (!this.menu.back()) popModal(); return; }
      else if (startsNumber(k)) { this.field = new NumField(); this.field.key(k); return; }
      this.see();
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(4, 24, name);
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
          const s = fmtFit(m[i][j].v, 6), x = 36 + c * 114;
          const on = i === this.r && j === this.c;
          if (on) lcd.rect(x, y, 112, 24, HILITE);
          lcd.text(x + 110 - [...s].length * 18, y, s, { color: on ? '#fff' : '#000' });
        }
      }
      lcd.frame(33, 47, LW - 34, 98, '#000', 1);
      if (this.field) this.field.draw(4, 180, LW - 8);
      else {
        const lay = layStatic(numRow(m[this.r][this.c], 'auto', false));
        drawLay(lay, LW - 4 - lay.w, 180);
      }
      lcd.fmenu(this.menu.labels());
    }
  }.init());
}

// Список матриц Mat A…Z
function openMatList() {
  const dims = (n) => (mem.mats[n] ? mem.mats[n].length + '×' + mem.mats[n][0].length : 'None');
  const define = (n, then) => numDialog('Dimension m×n', [['m', 2], ['n', 2]], (v) => {
    const [r, c] = v.map(Math.round);
    if (!(r >= 1 && r <= 20 && c >= 1 && c <= 20)) { errorBox('Dimension ERROR'); return; }
    const old = mem.mats[n];
    mem.mats[n] = Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (old && old[i] && old[i][j]) || RI(0)));
    if (then) then();
  });
  pushModal({
    sel: 0, top: 0,
    key(k) {
      const n = MAT_NAMES[this.sel], f = fIndex(k);
      if (f === 0) { if (mem.mats[n]) confirmBox(['Delete Matrix?', ''], () => { delete mem.mats[n]; }); return; }
      if (f === 1) { confirmBox(['Delete All', 'Matrices?'], () => { mem.mats = {}; }); return; }
      if (f === 2) { define(n); return; }
      if (k.id === 'UP') this.sel = (this.sel + 25) % 26;
      else if (k.id === 'DOWN') this.sel = (this.sel + 1) % 26;
      else if (k.id === 'EXE') { if (mem.mats[n]) matEdit(n); else define(n, () => matEdit(n)); return; }
      else if (k.id === 'EXIT') { popModal(); return; }
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 5) this.top = this.sel - 5;
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, 'Matrix');
      for (let r = 0; r < 6; r++) {
        const i = this.top + r, n = MAT_NAMES[i], y = 48 + r * 24;
        if (i === this.sel) lcd.rect(0, y, LW, 24, HILITE);
        const ink = i === this.sel ? '#fff' : '#000';
        lcd.text(18, y, 'Mat ' + n, { color: ink });
        lcd.text(9 * 18, y, ':' + dims(n), { color: ink });
      }
      lcd.fmenu([{ l: 'DELETE', k: 'cmd' }, { l: 'DEL-ALL', k: 'cmd' }, { l: 'DIM', k: 'cmd' }]);
    }
  });
}

// ---------- каталог команд (SHIFT 4) ----------
// Список команд по алфавиту; клавиша с буквой — переход к букве, EXE — вставить в выражение
function openCatalog(ed) {
  const names = new Map();
  for (const t of [...PRE.keys(), ...FNA.keys(), 'Ans', 'List ', 'Mat ', 'Ran# ', 'Int÷', 'Rmdr', '!', 'π', '%', '°']) {
    if (t === G.NEG || t === G.TEN || t === G.CBRT || t === '√') continue;
    names.set(t, t);
  }
  names.set(G.PERM, 'nPr'); names.set(G.COMB, 'nCr'); names.set(G.YV, 'Y (graph)');
  const items = [...names.entries()].map(([tok, show]) => ({ tok, show: show.trim() })).sort((a, b) => a.show.localeCompare(b.show, 'en', { sensitivity: 'base' }));
  pushModal({
    sel: 0, top: 0,
    key(k) {
      const n = items.length;
      if (k.id === 'UP') this.sel = (this.sel + n - 1) % n;
      else if (k.id === 'DOWN') this.sel = (this.sel + 1) % n;
      else if (k.id === 'EXE' || k.id === 'F1') { popModal(); edInsert(ed, items[this.sel].tok); return; }
      else if (k.id === 'EXIT' || k.id === 'AC') { popModal(); return; }
      else {
        const ch = ALPHA_KEY[k.id];
        const i = ch ? items.findIndex((it) => it.show[0].toUpperCase() === ch) : -1;
        if (i >= 0) this.sel = i;
      }
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 5) this.top = this.sel - 5;
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      lcd.text(0, 24, 'Catalog');
      for (let r = 0; r < 6; r++) {
        const i = this.top + r;
        if (i >= items.length) break;
        const y = 48 + r * 24;
        if (i === this.sel) lcd.rect(0, y, LW, 24, HILITE);
        lcd.text(18, y, items[i].show, { color: i === this.sel ? '#fff' : '#000' });
      }
      lcd.fmenu([{ l: 'INPUT', k: 'cmd' }]);
    }
  });
}
