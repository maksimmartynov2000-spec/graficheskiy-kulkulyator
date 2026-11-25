// ══════ 50-menu.js — главное меню и экран Setup ══════

// [режим, название, клавиша быстрого выбора]
const MAIN_MENU = [
  ['run', 'Run-Matrix', '1'], ['stat', 'Statistics', '2'], ['eact', 'eActivity', '3'], ['sheet', 'Spreadsheet', '4'],
  ['graph', 'Graph', '5'], ['dyna', 'Dyna Graph', '6'], ['table', 'Table', '7'], ['recur', 'Recursion', '8'],
  ['conic', 'Conic Graphs', '9'], ['eqn', 'Equation', 'A'], ['prgm', 'Program', 'B'], ['fin', 'Financial', 'C'],
  ['econ', 'E-CON4', 'D'], ['link', 'Link', 'E'], ['memory', 'Memory', 'F'], ['system', 'System', 'G'],
  ['python', 'Python', 'H']
];

// Пиктограммы режимов — простые собственные рисунки. p — палитра: {a, b, c, d, ink}
const ICONS = {
  run(g, x, y, p) {
    g.font = `700 17px ${FONT}`; g.textAlign = 'center'; g.fillStyle = p.a;
    g.fillText('+', x + 30, y + 16); g.fillText('−', x + 46, y + 16);
    g.fillStyle = p.b;
    g.fillText('×', x + 30, y + 33); g.fillText('÷', x + 46, y + 33);
    g.strokeStyle = p.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 58, y + 5); g.lineTo(x + 62, y + 5); g.lineTo(x + 62, y + 34); g.lineTo(x + 58, y + 34); g.stroke();
    g.beginPath(); g.moveTo(x + 18, y + 5); g.lineTo(x + 14, y + 5); g.lineTo(x + 14, y + 34); g.lineTo(x + 18, y + 34); g.stroke();
  },
  stat(g, x, y, p) {
    const hs = [14, 26, 20, 9], cs = [p.a, p.b, p.c, p.d];
    hs.forEach((h, i) => { g.fillStyle = cs[i]; g.fillRect(x + 20 + i * 12, y + 34 - h, 9, h); });
    g.strokeStyle = p.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 16, y + 4); g.lineTo(x + 16, y + 34.5); g.lineTo(x + 72, y + 34.5); g.stroke();
  },
  eact(g, x, y, p) {
    g.strokeStyle = p.ink; g.lineWidth = 1.5; g.fillStyle = p.paper;
    g.beginPath(); g.moveTo(x + 30, y + 3); g.lineTo(x + 52, y + 3); g.lineTo(x + 60, y + 11); g.lineTo(x + 60, y + 36); g.lineTo(x + 30, y + 36); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = p.a; g.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + 35, y + 14 + i * 5.5); g.lineTo(x + 55 - (i === 3 ? 8 : 0), y + 14 + i * 5.5); g.stroke(); }
  },
  sheet(g, x, y, p) {
    g.fillStyle = p.c; g.fillRect(x + 20, y + 5, 50, 8); g.fillRect(x + 20, y + 5, 12, 30);
    g.strokeStyle = p.ink; g.lineWidth = 1;
    g.strokeRect(x + 20.5, y + 5.5, 50, 30);
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + 20, y + 5.5 + i * 7.5); g.lineTo(x + 70, y + 5.5 + i * 7.5); g.stroke(); }
    for (const dx of [12, 31]) { g.beginPath(); g.moveTo(x + 20.5 + dx, y + 5); g.lineTo(x + 20.5 + dx, y + 35); g.stroke(); }
  },
  graph(g, x, y, p) {
    g.strokeStyle = p.ink; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 14, y + 26.5); g.lineTo(x + 76, y + 26.5); g.moveTo(x + 45.5, y + 3); g.lineTo(x + 45.5, y + 37); g.stroke();
    g.strokeStyle = p.a; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 24, y + 4); g.quadraticCurveTo(x + 45, y + 62, x + 66, y + 4); g.stroke();
    g.strokeStyle = p.b;
    g.beginPath(); g.moveTo(x + 16, y + 34); g.lineTo(x + 74, y + 9); g.stroke();
  },
  dyna(g, x, y, p) {
    g.strokeStyle = p.ink; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 14, y + 20.5); g.lineTo(x + 76, y + 20.5); g.moveTo(x + 45.5, y + 3); g.lineTo(x + 45.5, y + 37); g.stroke();
    [[p.c, 5], [p.b, 10], [p.a, 15]].forEach(([c, amp]) => {
      g.strokeStyle = c; g.lineWidth = 1.8; g.beginPath();
      for (let i = 0; i <= 60; i++) { const px = x + 15 + i, py = y + 20.5 - amp * Math.sin(i / 60 * Math.PI * 2); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    });
  },
  table(g, x, y, p) {
    g.fillStyle = p.a; g.fillRect(x + 22, y + 5, 46, 8);
    g.strokeStyle = p.ink; g.lineWidth = 1; g.strokeRect(x + 22.5, y + 5.5, 46, 30);
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + 22, y + 5.5 + i * 7.5); g.lineTo(x + 68, y + 5.5 + i * 7.5); g.stroke(); }
    g.beginPath(); g.moveTo(x + 45.5, y + 5); g.lineTo(x + 45.5, y + 35); g.stroke();
    g.font = `700 8px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('X', x + 34, y + 12); g.fillText('Y', x + 57, y + 12);
  },
  recur(g, x, y, p) {
    g.font = `700 16px ${FONT}`; g.textAlign = 'center'; g.fillStyle = p.a; g.fillText('a', x + 24, y + 22);
    g.font = `700 10px ${FONT}`; g.fillText('n', x + 33, y + 26);
    g.strokeStyle = p.b; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(x + 42, y + 34); g.lineTo(x + 50, y + 34); g.lineTo(x + 50, y + 25); g.lineTo(x + 58, y + 25); g.lineTo(x + 58, y + 16); g.lineTo(x + 66, y + 16); g.lineTo(x + 66, y + 7); g.lineTo(x + 74, y + 7); g.stroke();
  },
  conic(g, x, y, p) {
    g.strokeStyle = p.ink; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 14, y + 20.5); g.lineTo(x + 76, y + 20.5); g.moveTo(x + 45.5, y + 3); g.lineTo(x + 45.5, y + 37); g.stroke();
    g.strokeStyle = p.a; g.lineWidth = 2; g.beginPath(); g.ellipse(x + 45.5, y + 20.5, 24, 12, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = p.b; g.beginPath(); g.moveTo(x + 30, y + 4); g.quadraticCurveTo(x + 45.5, y + 40, x + 61, y + 4); g.stroke();
  },
  eqn(g, x, y, p) {
    g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.fillStyle = p.a; g.fillText('aX+b=0', x + 45, y + 17);
    g.fillStyle = p.b; g.fillText('X =', x + 38, y + 34);
    g.strokeStyle = p.b; g.lineWidth = 1.5; g.strokeRect(x + 54.5, y + 23.5, 11, 12);
  },
  prgm(g, x, y, p) {
    g.lineWidth = 2;
    [[20, 8, 22, p.a], [28, 15, 34, p.ink], [28, 22, 26, p.ink], [20, 29, 30, p.b], [28, 36, 18, p.ink]].forEach(([dx, dy, w, c]) => { g.strokeStyle = c; g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + w, y + dy); g.stroke(); });
  },
  fin(g, x, y, p) {
    g.fillStyle = p.d; g.beginPath(); g.arc(x + 30, y + 20, 13, 0, Math.PI * 2); g.fill();
    g.font = `700 17px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('$', x + 30, y + 26);
    g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 48, y + 33); g.lineTo(x + 57, y + 22); g.lineTo(x + 63, y + 27); g.lineTo(x + 74, y + 8); g.stroke();
  },
  econ(g, x, y, p) {
    g.strokeStyle = p.a; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 52; i++) { const px = x + 16 + i, py = y + 20 - 12 * Math.sin(i / 52 * Math.PI * 3) * Math.exp(-i / 60); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    g.fillStyle = p.b; g.beginPath(); g.arc(x + 72, y + 20, 4, 0, Math.PI * 2); g.fill();
  },
  link(g, x, y, p) {
    g.strokeStyle = p.ink; g.lineWidth = 1.5; g.strokeRect(x + 16.5, y + 7.5, 16, 26); g.strokeRect(x + 57.5, y + 7.5, 16, 26);
    g.strokeStyle = p.a; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(x + 36, y + 15); g.lineTo(x + 54, y + 15); g.moveTo(x + 49, y + 11); g.lineTo(x + 54, y + 15); g.lineTo(x + 49, y + 19); g.stroke();
    g.strokeStyle = p.b;
    g.beginPath(); g.moveTo(x + 54, y + 27); g.lineTo(x + 36, y + 27); g.moveTo(x + 41, y + 23); g.lineTo(x + 36, y + 27); g.lineTo(x + 41, y + 31); g.stroke();
  },
  memory(g, x, y, p) {
    g.fillStyle = p.a; g.fillRect(x + 30, y + 9, 30, 22);
    g.strokeStyle = p.ink; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(x + 34 + i * 7.3, y + 4); g.lineTo(x + 34 + i * 7.3, y + 9); g.moveTo(x + 34 + i * 7.3, y + 31); g.lineTo(x + 34 + i * 7.3, y + 36); g.stroke();
    }
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + 25, y + 13 + i * 7); g.lineTo(x + 30, y + 13 + i * 7); g.moveTo(x + 60, y + 13 + i * 7); g.lineTo(x + 65, y + 13 + i * 7); g.stroke(); }
  },
  system(g, x, y, p) {
    const cx = x + 45, cy = y + 20;
    g.fillStyle = p.ink;
    g.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 15 : 11, a = i * Math.PI / 8 - 0.2 + (i % 2 ? 0 : 0); g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); g.lineTo(cx + r * Math.cos(a + 0.4), cy + r * Math.sin(a + 0.4)); }
    g.closePath(); g.fill();
    g.fillStyle = p.hole; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  },
  python(g, x, y, p) {
    g.font = `700 20px ${FONT}`; g.textAlign = 'center'; g.fillStyle = p.a; g.fillText('Py', x + 45, y + 27);
    g.strokeStyle = p.d; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 22, y + 33); g.lineTo(x + 68, y + 33); g.stroke();
  }
};

const mainMenu = {
  sel: 0, top: 0,
  enter() { const i = MAIN_MENU.findIndex((m) => m[0] === this.last); if (i >= 0) this.sel = i; this.fix(); },
  fix() {
    const row = Math.floor(this.sel / 4);
    if (row < this.top) this.top = row;
    if (row > this.top + 2) this.top = row - 2;
  },
  open(i) {
    const [id] = MAIN_MENU[i];
    this.sel = i; this.fix();
    if (UI.apps[id]) { this.last = id; openApp(id); }
    else infoBox(['Not available', 'in this version', '', 'Press:[EXIT]']);
  },
  key(k) {
    const n = MAIN_MENU.length;
    switch (k.id) {
      case 'LEFT': this.sel = (this.sel + n - 1) % n; break;
      case 'RIGHT': this.sel = (this.sel + 1) % n; break;
      case 'UP': this.sel = this.sel - 4 >= 0 ? this.sel - 4 : Math.min(n - 1, this.sel + 4 * Math.floor((n - 1 - this.sel) / 4)); break;
      case 'DOWN': this.sel = this.sel + 4 < n ? this.sel + 4 : this.sel % 4; break;
      case 'EXE': this.open(this.sel); return;
      default: {
        const c = isDigit(k.id) ? k.id : ALPHA_KEY[k.id];
        const i = c ? MAIN_MENU.findIndex((m) => m[2] === c) : -1;
        if (i >= 0) { this.open(i); return; }
      }
    }
    this.fix();
  },
  tap(x, y) {
    if (y < 24) return;
    const col = Math.min(3, Math.floor((x - 2) / 94)), row = Math.floor((y - 26) / 63) + this.top;
    const i = row * 4 + col;
    if (i >= 0 && i < MAIN_MENU.length) this.open(i);
  },
  draw() {
    const g = lcd.g;
    statusBar([]);
    lcd.mini(LW / 2 + 20, 4, 'MAIN MENU', { px: 13, align: 'c' });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const i = (this.top + r) * 4 + c;
      if (i >= MAIN_MENU.length) continue;
      const [id, name, key] = MAIN_MENU[i];
      const x = 3 + c * 94, y = 27 + r * 63, w = 90, h = 60;
      const on = i === this.sel, live = !!UI.apps[id];
      lcd.rrect(x, y, w, h, 5, on ? '#000' : '#fff', on ? '#000' : '#b9c0ca', 1);
      const p = !live
        ? { a: '#c4c9d1', b: '#d3d7dd', c: '#d3d7dd', d: '#c4c9d1', ink: '#b3b9c2', paper: on ? '#000' : '#fff', hole: on ? '#000' : '#fff' }
        : on
          ? { a: '#5fb0ff', b: '#ff6b6b', c: '#5fd68a', d: '#ffc233', ink: '#fff', paper: '#000', hole: '#000' }
          : { a: '#0a50d8', b: '#e0262d', c: '#16963f', d: '#e59a00', ink: '#222', paper: '#fff', hole: '#fff' };
      if (ICONS[id]) ICONS[id](g, x, y + 1, p);
      g.textAlign = 'center';
      lcd.mini(x + w / 2 - 4, y + 43, name, { px: 11.5, align: 'c', color: !live ? '#aab0b9' : on ? '#fff' : '#000', max: w - 22 });
      lcd.mini(x + w - 4, y + 45, key, { px: 10.5, align: 'r', color: !live ? '#aab0b9' : on ? '#ffd24a' : '#666' });
    }
    // полоса прокрутки
    const rows = Math.ceil(MAIN_MENU.length / 4);
    if (rows > 3) {
      lcd.rect(LW - 4, 27, 3, 186, '#dfe3e8');
      lcd.rect(LW - 4, 27 + 186 * this.top / rows, 3, 186 * 3 / rows, '#555');
    }
  }
};
UI.apps.menu = mainMenu;

// ---------- Setup ----------
const SETUP_DEF = {
  io: ['Input/Output', ['Math', 'Line']],
  mode: ['Mode', ['Comp']],
  cplx: ['Complex Mode', ['Real', 'a+bi', 'r∠θ']],
  frac: ['Frac Result', ['d/c', 'ab/c']],
  funcType: ['Func Type', ['Y=', 'r=', 'Param', 'X=', 'Y>', 'Y<', 'Y≥', 'Y≤']],
  drawType: ['Draw Type', ['Connect', 'Plot']],
  deriv: ['Derivative', ['On', 'Off']],
  angle: ['Angle', ['Deg', 'Rad', 'Gra']],
  coord: ['Coord', ['On', 'Off']],
  grid: ['Grid', ['On', 'Off', 'Line']],
  axes: ['Axes', ['On', 'Off', 'Scale']],
  label: ['Label', ['On', 'Off']],
  disp: ['Display', ['Fix', 'Sci', 'Norm']],
  graphFunc: ['Graph Func', ['On', 'Off']],
  statWind: ['Stat Wind', ['Auto', 'Manual']],
  q1q3: ['Q1Q3 Type', ['Std', 'OnData']],
  simul: ['Simul Graph', ['On', 'Off']]
};
// порядок строк — как у оригинала, чтобы до нужной строки было столько же нажатий ▼
const SETUP_RUN = ['io', 'mode', 'frac', 'funcType', 'drawType', 'deriv', 'angle', 'cplx', 'coord', 'grid', 'axes', 'label', 'disp', 'q1q3'];

function openSetup(keys, onClose) {
  const scr = {
    sel: 0, top: 0, ask: null,
    key(k) {
      if (this.ask) {                  // ждём число знаков для Fix/Sci
        if (isDigit(k.id)) { S.disp = this.ask; S.dispN = Number(k.id); this.ask = null; }
        else if (k.id === 'EXIT' || k.id === 'AC') this.ask = null;
        return;
      }
      const key = keys[this.sel], opts = SETUP_DEF[key][1];
      const f = fIndex(k);
      if (f >= 0 && f < opts.length) {
        if (key === 'disp') {
          if (opts[f] === 'Norm') { S.dispN = S.disp === 'Norm' && S.dispN === 1 ? 2 : 1; S.disp = 'Norm'; }
          else this.ask = opts[f];
        } else S[key] = opts[f];
        return;
      }
      if (k.id === 'UP') this.sel = (this.sel + keys.length - 1) % keys.length;
      else if (k.id === 'DOWN') this.sel = (this.sel + 1) % keys.length;
      else if (k.id === 'EXIT' || k.id === 'EXE') { popModal(); if (onClose) onClose(); return; }
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 6) this.top = this.sel - 6;
    },
    draw() {
      lcd.rect(0, 23, LW, LH - 23, '#fff');
      for (let r = 0; r < 7; r++) {
        const i = this.top + r;
        if (i >= keys.length) break;
        const key = keys[i], [label] = SETUP_DEF[key];
        const val = key === 'disp' ? dispTag() : S[key];
        const y = 24 + r * 24;
        if (i === this.sel) { lcd.rect(0, y, LW, 24, HILITE); lcd.text(0, y, label, { color: '#fff' }); lcd.text(13 * 18, y, ':' + val, { color: '#fff' }); }
        else { lcd.text(0, y, label); lcd.text(13 * 18, y, ':' + val); }
      }
      if (this.top > 0) lcd.glyph('▲', LW - 9, 34, 12, '#000');
      if (this.top + 7 < keys.length) lcd.glyph('▼', LW - 9, 184, 12, '#000');
      lcd.fmenu(SETUP_DEF[keys[this.sel]][1].map((l) => ({ l, k: 'cmd' })));
      if (this.ask) lcd.popup([this.ask + ' [0~9]', '', 'Press a digit'], { w: 280 });
    }
  };
  pushModal(scr);
}
