// ══════ 40-ui.js — клавиатура, SHIFT/ALPHA, экраны и окна, меню F1–F6 ══════

// [код, надпись, надпись SHIFT, надпись ALPHA, класс]
const FRAC_SVG = '<svg viewBox="0 0 20 28" aria-hidden="true"><rect x="5.5" y="2" width="9" height="8"/><line x1="2" y1="14" x2="18" y2="14"/><rect x="5.5" y="18" width="9" height="8"/></svg>';
const KEYS_F = [['F1', 'F1', 'Trace'], ['F2', 'F2', 'Zoom'], ['F3', 'F3', 'V-Window'], ['F4', 'F4', 'Sketch'], ['F5', 'F5', 'G-Solv'], ['F6', 'F6', 'G⇔T']];
const KEYS_NAV = [
  ['SHIFT', 'SHIFT', '', '', 'shift sm'], ['OPTN', 'OPTN', '', '', 'sm'], ['VARS', 'VARS', 'PRGM', '', 'sm'], ['MENU', 'MENU', 'SET UP', '', 'sm'],
  ['ALPHA', 'ALPHA', 'A-LOCK', '', 'alpha sm'], ['SQR', 'x<sup>2</sup>', '√', 'r'], ['POW', '^', '<sup>x</sup>√', 'θ'], ['EXIT', 'EXIT', 'QUIT', '', 'sm']
];
const KEYS_FN = [
  ['XTT', 'X,θ,T', '∠', 'A', 'sm'], ['LOG', 'log', '10<sup>x</sup>', 'B'], ['LN', 'ln', 'e<sup>x</sup>', 'C'],
  ['SIN', 'sin', 'sin<sup>-1</sup>', 'D'], ['COS', 'cos', 'cos<sup>-1</sup>', 'E'], ['TAN', 'tan', 'tan<sup>-1</sup>', 'F'],
  ['FRAC', FRAC_SVG, 'a b/c', 'G'], ['SD', 'S⇔D', 'ab/c⇔d/c', 'H', 'sm'], ['LPAR', '(', '<sup>3</sup>√', 'I'], ['RPAR', ')', 'x<sup>-1</sup>', 'J'],
  ['COMMA', ',', '', 'K'], ['STO', '→', '', 'L']
];
const KEYS_NUM = [
  ['7', '7', 'CAPTURE', 'M', 'num'], ['8', '8', 'CLIP', 'N', 'num'], ['9', '9', 'PASTE', 'O', 'num'], ['DEL', 'DEL', 'INS', 'UNDO', 'del'], ['AC', 'AC<sup>/ON</sup>', 'OFF', '', 'del'],
  ['4', '4', 'CATALOG', 'P', 'num'], ['5', '5', 'FORMAT', 'Q', 'num'], ['6', '6', '', 'R', 'num'], ['MUL', '×', '{', 'S', 'num op'], ['DIV', '÷', '}', 'T', 'num op'],
  ['1', '1', 'List', 'U', 'num'], ['2', '2', 'Mat', 'V', 'num'], ['3', '3', '', 'W', 'num'], ['ADD', '+', '[', 'X', 'num op'], ['SUB', '−', ']', 'Y', 'num op'],
  ['0', '0', 'i', 'Z', 'num'], ['DOT', '.', '=', 'SPACE', 'num'], ['EXP', '×10<sup>x</sup>', 'π', '"', 'num sm'], ['NEG', '(−)', 'Ans', '', 'num sm'], ['EXE', 'EXE', '↵', '', 'exe']
];
const ALPHA_KEY = {
  XTT: 'A', LOG: 'B', LN: 'C', SIN: 'D', COS: 'E', TAN: 'F', FRAC: 'G', SD: 'H', LPAR: 'I', RPAR: 'J', COMMA: 'K', STO: 'L',
  7: 'M', 8: 'N', 9: 'O', 4: 'P', 5: 'Q', 6: 'R', MUL: 'S', DIV: 'T', 1: 'U', 2: 'V', 3: 'W', ADD: 'X', SUB: 'Y', 0: 'Z', SQR: 'r', POW: 'θ'
};
const REPEAT_KEYS = new Set(['LEFT', 'RIGHT', 'UP', 'DOWN', 'DEL']);

const UI = {
  shift: false, alpha: false, alock: false,
  app: null, appId: '', modals: [], off: false,
  blink: true, lastKeyAt: 0, vib: true,
  apps: {}
};

// ---------- ввод в редактор ----------
// Клавиша → знак или шаблон. Возвращает true, если что-то вставлено
function typeKey(ed, k, xvar) {
  const m = ed.math;
  if (k.alpha) {
    const c = ALPHA_KEY[k.id];
    if (c) { ed.ins(c); return true; }
    return false;
  }
  if (k.shift) {
    switch (k.id) {
      case '0': ed.ins('i'); return true;       // мнимая единица
      case 'XTT': ed.ins('∠'); return true;     // полярная запись r∠θ
      case 'SQR': if (m) ed.tpl('sqrt'); else ed.ins('√'); return true;
      case 'POW': if (m) ed.tpl('root'); else ed.ins(G.XRT); return true;
      case 'LOG': if (m) ed.tpl('pow10'); else ed.ins(G.TEN); return true;
      case 'LN': if (m) ed.tpl('epow'); else ed.ins('e^'); return true;
      case 'SIN': ed.ins('sin' + INVS); return true;
      case 'COS': ed.ins('cos' + INVS); return true;
      case 'TAN': ed.ins('tan' + INVS); return true;
      case 'FRAC': if (m) { ed.tpl('mixed'); return true; } return false;
      case 'LPAR': if (m) ed.tpl('cbrt'); else ed.ins(G.CBRT); return true;
      case 'RPAR': ed.ins(G.INV); return true;
      case 'MUL': ed.ins('{'); return true;
      case 'DIV': ed.ins('}'); return true;
      case 'ADD': ed.ins('['); return true;
      case 'SUB': ed.ins(']'); return true;
      case 'DOT': ed.ins('='); return true;
      case 'EXP': ed.ins('π'); return true;
      case 'NEG': ed.ins('Ans'); return true;
      case '1': ed.ins('List '); return true;
      case '2': ed.ins('Mat '); return true;
      case '8': openClip(ed); return true;                          // CLIP
      case '9':                                                     // PASTE
        if (UI.clip && (ed.math || UI.clip.every((t) => typeof t === 'string'))) for (const t of cloneRow(UI.clip)) { ed.row.splice(ed.i, 0, t); ed.i++; }
        return true;
      default: return false;
    }
  }
  if (isDigit(k.id)) { ed.ins(k.id); return true; }
  switch (k.id) {
    case 'DOT': ed.ins('.'); return true;
    case 'EXP': ed.ins(G.EE); return true;
    case 'NEG': ed.ins(G.NEG); return true;
    case 'ADD': ed.ins('+'); return true;
    case 'SUB': ed.ins('−'); return true;
    case 'MUL': ed.ins('×'); return true;
    case 'DIV': ed.ins('÷'); return true;
    case 'LPAR': ed.ins('('); return true;
    case 'RPAR': ed.ins(')'); return true;
    case 'COMMA': ed.ins(','); return true;
    case 'STO': ed.ins('→'); return true;
    case 'XTT': ed.ins(xvar || 'x'); return true;
    case 'LOG': ed.ins('log '); return true;
    case 'LN': ed.ins('ln '); return true;
    case 'SIN': ed.ins('sin '); return true;
    case 'COS': ed.ins('cos '); return true;
    case 'TAN': ed.ins('tan '); return true;
    case 'SQR': ed.ins(G.SQ); return true;
    case 'POW': if (m) ed.tpl('pow'); else ed.ins('^'); return true;
    case 'FRAC': if (m) ed.tpl('frac'); else ed.ins(G.FRC); return true;
    default: return false;
  }
}
// Курсор и удаление. Возвращает true, если клавиша обработана
function edNav(ed, k) {
  if (k.alpha && k.id === 'DEL') { ed.undo(); return true; }      // UNDO
  if (k.shift || k.alpha) return false;
  switch (k.id) {
    case 'LEFT': ed.left(); return true;
    case 'RIGHT': ed.right(); return true;
    case 'UP': return ed.vert(-1);
    case 'DOWN': return ed.vert(1);
    case 'DEL': ed.del(); return true;
    default: return false;
  }
}
// CLIP: ◄ ► выделяют часть строки, F1 копирует, F2 вырезает; вставка — SHIFT 9 (PASTE)
function openClip(ed) {
  if (ed.empty) return;
  const row = ed.row;
  ed.selA = ed.i;
  const done = () => { ed.selA = null; popModal(); };
  pushModal({
    lock: true,
    key(k) {
      if (k.id === 'LEFT') { if (ed.i > 0) ed.i--; }
      else if (k.id === 'RIGHT') { if (ed.i < row.length) ed.i++; }
      else if (k.id === 'F1' || k.id === 'F2') {
        const a = Math.min(ed.selA, ed.i), b = Math.max(ed.selA, ed.i);
        if (b > a) {
          UI.clip = cloneRow(row.slice(a, b));
          if (k.id === 'F2') { ed.snap(); row.splice(a, b - a); ed.i = a; }
        }
        done();
      } else if (k.id === 'EXIT' || k.id === 'AC') done();
    },
    draw() { lcd.rect(0, 192, LW, 24, '#fff'); lcd.fmenu([{ l: 'COPY', k: 'cmd' }, { l: 'CUT', k: 'cmd' }]); }
  });
}

// Вставка пункта меню: знак, массив знаков или шаблон {tpl}
function edInsert(ed, x) {
  if (x && x.tpl) {
    if (ed.math) ed.tpl(x.tpl, x.first); else if (x.line) ed.insAll([].concat(x.line));
    return;
  }
  ed.insAll([].concat(x));
}

// ---------- меню F1–F6 ----------
// Пункт: mi('Надпись', [подменю]) | mi('Надпись', функция) | mi('Надпись', 'знак')
const mi = (l, x) => (Array.isArray(x) && x.length && (x[0] === null || typeof x[0] === 'object') && !x[0]?.tpl ? { l, sub: x } : typeof x === 'function' ? { l, fn: x } : { l, ins: x });
class FMenu {
  constructor(items) { this.stack = [{ items, page: 0 }]; }
  get top() { return this.stack[this.stack.length - 1]; }
  get depth() { return this.stack.length; }
  view() {
    const { items, page } = this.top;
    if (items.length <= 6) return [...items, null, null, null, null, null, null].slice(0, 6);
    const v = items.slice(page * 5, page * 5 + 5);
    while (v.length < 5) v.push(null);
    v.push({ l: '▷', next: true });
    return v;
  }
  labels() {
    return this.view().map((it) => it && { l: typeof it.l === 'function' ? it.l() : it.l, k: it.sub ? 'sub' : 'cmd' });
  }
  // n = 0…5. Возвращает пункт для исполнения (fn/ins) или null
  press(n) {
    const it = this.view()[n];
    if (!it) return null;
    if (it.next) { const t = this.top; t.page = (t.page + 1) % Math.ceil(t.items.length / 5); return null; }
    if (it.sub) { this.stack.push({ items: it.sub, page: 0 }); return null; }
    return it;
  }
  back() { if (this.stack.length > 1) { this.stack.pop(); return true; } return false; }
  reset() { this.stack.length = 1; this.top.page = 0; }
}
const fIndex = (k) => (k.id.length === 2 && k.id[0] === 'F' ? Number(k.id[1]) - 1 : -1);

// ---------- окна ----------
function pushModal(m) { UI.modals.push(m); }
function popModal() { return UI.modals.pop(); }

// Сообщение об ошибке; onClose — после EXIT
function errorBox(type, onClose) {
  pushModal({
    lock: true,
    key(k) { if (['EXIT', 'AC', 'LEFT', 'RIGHT', 'EXE'].includes(k.id)) { popModal(); if (onClose) onClose(k); } },
    draw() { lcd.popup([type, '', 'Press:[EXIT]'], { w: 290 }); }
  });
}
// Вопрос «Да/Нет»: F1 — да, F6 — нет
function confirmBox(lines, onYes) {
  pushModal({
    lock: true,
    key(k) {
      if (k.id === 'F1') { popModal(); onYes(); } else if (k.id === 'F6' || k.id === 'EXIT' || k.id === 'AC') popModal();
    },
    draw() { lcd.popup([...lines, ' Yes:[F1]', ' No :[F6]'], { w: 290 }); }
  });
}
function infoBox(lines, onClose) {
  pushModal({
    lock: true,
    key(k) { if (['EXIT', 'AC', 'EXE'].includes(k.id)) { popModal(); if (onClose) onClose(); } },
    draw() { lcd.popup(lines, { w: 300 }); }
  });
}
// Выполнить с показом ошибки калькулятора
function guard(fn, onClose) {
  try { return fn(); } catch (e) {
    if (e instanceof CalcError) { errorBox(e.type, onClose); return undefined; }
    if (e instanceof RangeError) { errorBox('Stack ERROR', onClose); return undefined; }
    throw e;
  }
}

// Строка состояния текущего режима
function statusBar(tags) {
  lcd.status(tags, UI.shift ? 'S' : UI.alock ? 'AL' : UI.alpha ? 'A' : null);
}
const dispTag = () => (S.disp === 'Norm' ? 'Norm' + S.dispN : S.disp + S.dispN);
const stdTags = () => [S.io, S.angle, dispTag(), S.frac, S.cplx];

// ---------- редактор на экране ----------
// Нарисовать редактор в окне (x, y — левый край и средняя линия). Возвращает раскладку
function drawEd(ed, x, yc, width, o) {
  o = o || {};
  const r = edLayout(ed, o.sz || 0, width, ed.sx);
  ed.sx = r.sx;
  lcd.clip(x, yc - Math.max(r.lay.a, 12) - 2, width, Math.max(r.lay.a, 12) + Math.max(r.lay.d, 12) + 4);
  if (ed.selA !== null && ed.selA !== undefined) {                // выделение для CLIP
    const a = curOf(r.lay, ed.row, Math.min(ed.selA, ed.i)), b = curOf(r.lay, ed.row, Math.max(ed.selA, ed.i));
    if (a && b && b.x > a.x) lcd.rect(x - r.sx + a.x, yc + a.y - a.h / 2 - 1, b.x - a.x, a.h + 2, '#a9c8ff');
  }
  drawLay(r.lay, x - r.sx, yc, o.color);
  if (o.cursor !== false) UI.sawCursor = true;
  if (o.cursor !== false && UI.blink && r.c) {
    const cx = x - r.sx + r.c.x, cy = yc + r.c.y;
    lcd.line(cx + 0.5, cy - r.c.h / 2 + 1, cx + 0.5, cy + r.c.h / 2 - 1, o.color || '#000', 2);
  }
  lcd.unclip();
  if (r.sx > 0) lcd.glyph('◀', x + 5, yc, 14, '#000');
  if (r.lay.w - r.sx > width) lcd.glyph('▶', x + width - 5, yc, 14, '#000');
  return r.lay;
}

// ---------- нажатия ----------
let saveTimer = 0;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 500);
}

function openApp(id, arg) {
  const app = UI.apps[id];
  if (!app) return;
  UI.modals.length = 0;
  if (UI.app && UI.app !== app && UI.app.leave) UI.app.leave();
  UI.app = app; UI.appId = id;
  if (app.enter) app.enter(arg);
}

function press(id) {
  UI.lastKeyAt = Date.now();
  UI.blink = true;
  if (UI.off) { if (id === 'AC') { UI.off = false; redraw(); } return; }
  if (id === 'SHIFT') { UI.shift = !UI.shift; redraw(); return; }
  if (id === 'ALPHA') {
    if (UI.shift) { UI.alock = true; UI.alpha = true; UI.shift = false; }
    else if (UI.alock) { UI.alock = false; UI.alpha = false; }
    else UI.alpha = !UI.alpha;
    redraw();
    return;
  }
  const k = { id, shift: UI.shift, alpha: UI.alpha && !UI.shift };
  UI.shift = false;
  if (!UI.alock) UI.alpha = false;
  const top = UI.modals.length ? UI.modals[UI.modals.length - 1] : UI.app;
  try {
    if (k.shift && id === 'AC') { UI.off = true; UI.modals.length = 0; }
    else if (id === 'MENU' && !(top && top.lock)) {
      if (k.shift) { if (!UI.modals.length && UI.app.setup) openSetup(UI.app.setup(), () => UI.app.onSetup && UI.app.onSetup()); }
      else openApp('menu');
    } else if (top && top.key) top.key(k);
  } catch (e) {
    if (e instanceof CalcError) errorBox(e.type);
    else if (e instanceof RangeError) errorBox('Stack ERROR');
    else throw e;
  }
  redraw();
  saveSoon();
}

function redraw() {
  if (!lcd.g) return;
  UI.sawCursor = false;
  lcd.begin();
  if (UI.off) { lcd.rect(0, 0, LW, LH, '#15181c'); return; }
  if (UI.app) UI.app.draw();
  for (const m of UI.modals) m.draw();
}

// Касание экрана: строка меню работает как F1–F6, остальное — на усмотрение режима
function lcdTap(x, y) {
  const top = UI.modals.length ? UI.modals[UI.modals.length - 1] : UI.app;
  if (y >= 192 && !(top && top.noFTap)) { press('F' + (Math.min(5, Math.floor(x / 64)) + 1)); return; }
  if (top && top.tap) { UI.lastKeyAt = Date.now(); top.tap(x, y); redraw(); saveSoon(); }
}

// ---------- клавиши на странице ----------
function buildKeys() {
  const cell = ([id, label, sh, al, cls], extra) =>
    `<div class="kc"><div class="lg${al ? '' : ' c'}"><span class="ls">${sh || ''}</span>${al ? `<span class="la">${al}</span>` : ''}</div>` +
    `<button type="button" class="key ${cls || ''} ${extra || ''}" data-k="${id}" aria-label="${id}">${label}</button></div>`;
  document.getElementById('k-f').innerHTML = KEYS_F.map((k) => cell(k, 'f')).join('');
  const dpad = '<div class="dpad-cell"><div class="dpad">' + ['UP', 'DOWN', 'LEFT', 'RIGHT'].map((d) => `<button type="button" class="dp" data-k="${d}" aria-label="${d}"><i></i></button>`).join('') + '</div></div>';
  document.getElementById('k-nav').innerHTML = KEYS_NAV.slice(0, 4).map((k) => cell(k)).join('') + dpad + KEYS_NAV.slice(4).map((k) => cell(k)).join('');
  document.getElementById('k-fn').innerHTML = KEYS_FN.map((k) => cell(k)).join('');
  document.getElementById('k-num').innerHTML = KEYS_NUM.map((k) => cell(k)).join('');

  const calc = document.getElementById('calc');
  const held = new Map();             // pointerId → {el, timers}
  const release = (pid) => {
    const h = held.get(pid);
    if (!h) return;
    h.el.classList.remove('on');
    clearTimeout(h.t1); clearInterval(h.t2);
    held.delete(pid);
  };
  calc.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-k]');
    if (!el) return;
    e.preventDefault();
    const id = el.dataset.k;
    el.classList.add('on');
    if (UI.vib && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* не поддерживается */ } }
    const h = { el, t1: 0, t2: 0 };
    held.set(e.pointerId, h);
    press(id);
    if (REPEAT_KEYS.has(id)) h.t1 = setTimeout(() => { h.t2 = setInterval(() => press(id), 85); }, 420);
  });
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, (e) => release(e.pointerId));
  calc.addEventListener('pointerout', (e) => {
    const h = held.get(e.pointerId);
    if (h && !h.el.contains(e.relatedTarget)) release(e.pointerId);
  });
  for (const ev of ['contextmenu', 'dblclick', 'gesturestart', 'selectstart']) calc.addEventListener(ev, (e) => e.preventDefault());

  const cv = document.getElementById('lcd');
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    lcdTap((e.clientX - r.left) * LW / r.width, (e.clientY - r.top) * LH / r.height);
  });

  // клавиатура компьютера
  const map = {
    Enter: 'EXE', Backspace: 'DEL', Delete: 'AC', Escape: 'EXIT', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
    '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '^': 'POW', '(': 'LPAR', ')': 'RPAR', ',': 'COMMA', '.': 'DOT', x: 'XTT', X: 'XTT',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6'
  };
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !document.getElementById('sheet').hidden) return;
    const id = map[e.key] || (/^[0-9]$/.test(e.key) ? e.key : null);
    if (!id) return;
    e.preventDefault();
    press(id);
  });
}

// ---------- размеры корпуса под экран устройства ----------
function layoutCalc() {
  const app = document.getElementById('app'), calc = document.getElementById('calc');
  const cs = getComputedStyle(app);
  const W = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const H = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (!(W > 50 && H > 50)) return;
  const land = W > H * 1.08;
  const set = (o) => { for (const k in o) calc.style.setProperty(k, typeof o[k] === 'number' ? o[k].toFixed(2) + 'px' : o[k]); };
  calc.classList.toggle('land', land);
  let cw, chh, full;
  if (!land) {
    // книжная: экран сверху, клавиши снизу. 8.9 ряда клавиш: F (0.9) + 2 + 2 + 4
    const fit = (w) => {
      const pad = Math.max(6, w * 0.026), bez = Math.max(5, w * 0.022);
      const lcdW = w - 2 * pad - 2 * bez, lcdH = lcdW * LH / LW;
      const fixed = 2 * pad + pad * 1.9 + lcdH + 2 * bez + 3;
      return { pad, bez, fixed, rh: (H - fixed) / 8.9 };
    };
    cw = Math.min(W, H * 0.6);
    let f = fit(cw);
    if (f.rh < cw * 0.118) {          // низкое окно: уменьшаем корпус целиком
      for (let i = 0; i < 30 && f.rh < cw * 0.118; i++) { cw *= 0.97; f = fit(cw); }
    }
    const rh = Math.min(f.rh, cw * 0.185);
    chh = f.fixed + rh * 8.9;
    full = cw >= W - 1 && chh >= H - 1;
    set({ '--pad': f.pad, '--bez': f.bez, '--gap': Math.max(3, cw * 0.012), '--rh': rh, '--rh2': rh, width: cw, height: chh, '--rw': 'auto' });
  } else {
    // альбомная: слева экран, F1–F6 и блок курсора; справа остальные клавиши
    const pad = Math.max(6, Math.min(W, H) * 0.022), bez = Math.max(5, pad * 0.85);
    const gapX = pad * 1.4, head = pad * 1.9;
    const rhMin = Math.max(46, H * 0.12);
    let lcdW = Math.min(W * 0.53, (H - 2 * pad - head - 2 * bez - 3 - 2.9 * rhMin) * LW / LH);
    lcdW = Math.max(200, lcdW);
    const lcdH = lcdW * LH / LW;
    const leftW = lcdW + 2 * bez;
    const rw = Math.min(W - 2 * pad - gapX - leftW, leftW * 1.2, H * 1.1);
    const rh2 = Math.min((H - 2 * pad) / 6, rw / 6 * 1.35);
    const rh = Math.min((H - 2 * pad - head - lcdH - 2 * bez - 3) / 2.9, leftW / 6 * 1.05, rh2 * 1.12);
    cw = 2 * pad + leftW + gapX + rw;
    chh = Math.max(head + lcdH + 2 * bez + 3 + rh * 2.9, rh2 * 6) + 2 * pad;
    full = cw >= W - 1 && chh >= H - 1;
    set({ '--pad': pad, '--bez': bez, '--gap': Math.max(3, rw * 0.012), '--rh': rh, '--rh2': rh2, width: cw, height: chh, '--rw': rw.toFixed(2) + 'px' });
    calc.querySelector('.left').style.width = leftW.toFixed(2) + 'px';
  }
  if (!land) calc.querySelector('.left').style.width = '';
  calc.classList.toggle('full', full);
  calc.classList.add('ready');
  // длинные подписи над клавишами ужимаем, чтобы не обрезались
  for (const lg of calc.querySelectorAll('.lg')) {
    lg.style.fontSize = '';
    let need = 0;
    for (const sp of lg.children) need += sp.getBoundingClientRect().width;
    need += lg.children.length > 1 && lg.children[1].textContent ? 3 : 0;
    const have = lg.clientWidth - 2;
    if (need > have && have > 0) lg.style.fontSize = (parseFloat(getComputedStyle(lg).fontSize) * have / need * 0.97).toFixed(2) + 'px';
  }
  lcd.fit();
  redraw();
}
