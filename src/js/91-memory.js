// ══════ 91-memory.js — режим Memory: что лежит в памяти и удаление по частям ══════

function memItems() {
  const size = (x) => { try { return (JSON.stringify(x) || '').length; } catch (e) { return 0; } };
  const items = [
    { name: 'ALPHA MEM', size: size(mem.vars) + size(mem.ans), del() { mem.vars = {}; fv.fill(0); mem.ans = null; } },
    { name: 'LIST FILE', size: size(mem.lists) + size(mem.listSub), del() { mem.lists = []; mem.listSub = []; mem.listAns = null; } },
    { name: 'MATRIX', size: size(mem.mats), del() { mem.mats = {}; mem.matAns = null; } },
    {
      name: 'Y=DATA', size: size(mem.fn.filter((f) => f.row.length).map((f) => [f.row, f.row2])),
      del() { mem.fn = Array.from({ length: 20 }, (_, i) => newFn(i)); fnTouch(); plotVer++; }
    },
    { name: 'SETUP', size: size(S), del() { resetSetup(); } }
  ];
  const names = { run: 'HISTORY', stat: 'STAT', eqn: 'EQUATION', table: 'TABLE', recur: 'RECURSION', dyna: 'DYNA MEM', conic: 'CONICS', fin: 'FINANCIAL' };
  for (const id in names) {
    const app = UI.apps[id];
    if (app && app.reset && app.save) items.push({ name: names[id], size: size(app.save()), del() { app.reset(); } });
  }
  return items;
}

const memoryApp = {
  sel: 0, top: 0, marks: new Set(),
  enter() { this.sel = 0; this.top = 0; this.marks = new Set(); },
  key(k) {
    const items = memItems(), n = items.length, f = fIndex(k);
    if (f === 0) { const name = items[this.sel].name; if (this.marks.has(name)) this.marks.delete(name); else this.marks.add(name); return; }
    if (f === 5 || k.id === 'DEL') {
      const todo = this.marks.size ? items.filter((it) => this.marks.has(it.name)) : [items[this.sel]];
      confirmBox(['Delete Data?', ''], () => { for (const it of todo) it.del(); this.marks = new Set(); });
      return;
    }
    if (k.id === 'UP') this.sel = (this.sel + n - 1) % n;
    else if (k.id === 'DOWN') this.sel = (this.sel + 1) % n;
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel > this.top + 5) this.top = this.sel - 5;
  },
  draw() {
    statusBar([]);
    lcd.text(0, 24, 'Main Memory');
    const items = memItems();
    for (let r = 0; r < 6; r++) {
      const i = this.top + r;
      if (i >= items.length) break;
      const it = items[i], y = 48 + r * 24, on = i === this.sel, ink = on ? '#fff' : '#000';
      if (on) lcd.rect(0, y, LW, 24, HILITE);
      if (this.marks.has(it.name)) lcd.glyph('▶', 9, y + 12, 16, ink);
      lcd.text(18, y, it.name, { color: ink });
      const s = ':' + String(it.size).padStart(6, ' ');
      lcd.text(LW - 4 - s.length * 18, y, s, { color: ink });
    }
    if (this.top > 0) lcd.glyph('▲', LW - 9, 34, 12, '#000');
    if (this.top + 6 < items.length) lcd.glyph('▼', LW - 9, 34 + 12, 12, '#000');
    lcd.fmenu([{ l: 'SELECT', k: 'cmd' }, null, null, null, null, { l: 'DELETE', k: 'cmd' }]);
  }
};
UI.apps.memory = memoryApp;
