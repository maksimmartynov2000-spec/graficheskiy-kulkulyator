// ══════ 30-lcd.js — экран 384×216: текст, линии, строка состояния, меню F1–F6 ══════
//
// Координаты — в точках экрана калькулятора (384×216); холст растягивается под устройство,
// текст рисуется шрифтом системы по знакоместам 18×24, поэтому остаётся чётким при любом размере.

const LW = 384, LH = 216;
const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", Roboto, "Noto Sans", sans-serif';
const COLORS = { Black: '#000000', Blue: '#0000ff', Red: '#ff0000', Magenta: '#ff00ff', Green: '#00a400', Cyan: '#00b4e6', Yellow: '#e6c200' };
const COLOR_NAMES = Object.keys(COLORS);
const HILITE = '#000000';             // фон выделенной строки

const lcd = {
  cv: null, g: null, kx: 1, ky: 1, log: [],

  init(cv) { this.cv = cv; this.g = cv.getContext('2d'); this.fit(); },

  // Подогнать разрешение холста под его размер на странице
  fit() {
    const r = this.cv.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const k = Math.max(1, Math.min(8, (r.width || LW) * dpr / LW));
    const w = Math.round(LW * k), h = Math.round(LH * k);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.kx = w / LW; this.ky = h / LH;
  },

  begin() {
    const g = this.g;
    g.setTransform(this.kx, 0, 0, this.ky, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, LW, LH);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    this.log = [];
  },

  rect(x, y, w, h, color) { this.g.fillStyle = color || '#000'; this.g.fillRect(x, y, w, h); },
  frame(x, y, w, h, color, lw) { const g = this.g; g.strokeStyle = color || '#000'; g.lineWidth = lw || 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); },
  line(x1, y1, x2, y2, color, lw) {
    const g = this.g;
    g.strokeStyle = color || '#000'; g.lineWidth = lw || 1; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  },
  rrect(x, y, w, h, r, fill, stroke, lw) {
    const g = this.g;
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
  },
  clip(x, y, w, h) { const g = this.g; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); },
  unclip() { this.g.restore(); },

  // Особые знаки. Возвращает true, если знак нарисован
  special(ch, cx, cy, h, color) {
    const g = this.g, u = h / 24;
    const st = (w) => { g.strokeStyle = color; g.lineWidth = w * u; g.lineCap = 'round'; g.lineJoin = 'round'; };
    const txt = (s, px, x, y, wt) => { g.font = `${wt || 600} ${px * u}px ${FONT}`; g.fillStyle = color; g.fillText(s, x, y); };
    const path = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * u, cy + y * u) : g.moveTo(cx + x * u, cy + y * u))); g.stroke(); };
    const tri = (pts) => { g.fillStyle = color; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * u, cy + y * u) : g.moveTo(cx + x * u, cy + y * u))); g.closePath(); g.fill(); };
    switch (ch) {
      case G.NEG: st(2); path([[-5, -1.5], [4.5, -1.5]]); return true;
      case G.INV: txt('1', 13, cx + 3.5 * u, cy - 2.5 * u); st(1.6); path([[-6.5, -7], [-1.5, -7]]); return true;
      case G.SQ: txt('2', 13, cx, cy - 2.5 * u); return true;
      case G.TEN: txt('10', 13, cx, cy + 9 * u, 700); return true;
      case G.EE: txt('E', 15, cx, cy + 8.5 * u, 700); return true;
      case G.XRT: txt('x', 12, cx - 4.5 * u, cy - 3 * u); st(1.7); path([[-3, 3], [0, 9], [4, -9], [9, -9]]); return true;
      case G.CBRT: txt('3', 11, cx - 4.5 * u, cy - 3 * u); st(1.7); path([[-3, 3], [0, 9], [4, -9], [9, -9]]); return true;
      case '√': st(1.8); path([[-8, 1.5], [-5.5, 0], [-2, 9], [3, -9.5], [9, -9.5]]); return true;
      case G.FRC: st(2); path([[4, -6], [4, 6], [-5, 6]]); return true;
      case G.XBAR: txt('x', 20, cx, cy + 7 * u); st(1.6); path([[-5, -7], [5, -7]]); return true;
      case G.YBAR: txt('y', 20, cx, cy + 5 * u); st(1.6); path([[-5, -8.5], [5, -8.5]]); return true;
      case G.XHAT: txt('x', 20, cx, cy + 7 * u); st(1.5); path([[-4, -6], [0, -9.5], [4, -6]]); return true;
      case G.YHAT: txt('y', 20, cx, cy + 5 * u); st(1.5); path([[-4, -7], [0, -10.5], [4, -7]]); return true;
      case G.RAD: txt('r', 14, cx, cy - 2 * u); return true;
      case G.GRA: txt('g', 14, cx, cy - 3 * u); return true;
      case G.PERM: txt('P', 21, cx, cy + 7.5 * u, 900); return true;
      case G.COMB: txt('C', 21, cx, cy + 7.5 * u, 900); return true;
      case G.BOX: g.strokeStyle = color; g.lineWidth = 1.2 * u; g.strokeRect(cx - 5 * u, cy - 7 * u, 10 * u, 14 * u); return true;
      case '▶': tri([[-5, -7], [6, 0], [-5, 7]]); return true;
      case '◀': tri([[5, -7], [-6, 0], [5, 7]]); return true;
      case '▲': tri([[-7, 5], [0, -6], [7, 5]]); return true;
      case '▼': tri([[-7, -5], [0, 6], [7, -5]]); return true;
      case '▷': st(1.6); path([[-4, -6], [5, 0], [-4, 6], [-4, -6]]); return true;
      default: return false;
    }
  },

  // Один знак по центру знакоместа высотой h
  glyph(ch, cx, cy, h, color) {
    if (ch === ' ') return;
    const g = this.g;
    color = color || '#000';
    if (ch === G.YV) ch = 'Y'; else if (ch === G.DX) ch = 'd';
    if ((ch >= '' && ch <= '') || ch === '√' || (ch >= '▲' && ch <= '◀')) {
      if (this.special(ch, cx, cy, h, color)) return;
    }
    // знаки чуть растянуты по ширине, чтобы заполнять знакоместо, как у экранного шрифта калькулятора
    g.font = `600 ${h * 0.96}px ${FONT}`;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.save();
    g.translate(cx, cy + h * 0.34);
    g.scale(1.16, 1);
    g.fillText(ch, 0, 0, (h * 0.75 - 1) / 1.16);
    g.restore();
  },

  // Текст по знакоместам. o: {h, color, bg, inv}
  text(x, y, str, o) {
    o = o || {};
    const h = o.h || 24, cw = h * 0.75, chars = [...String(str)];
    let color = o.color || '#000';
    if (o.inv) { this.rect(x, y, chars.length * cw, h, o.bg || HILITE); color = '#fff'; }
    else if (o.bg) this.rect(x, y, chars.length * cw, h, o.bg);
    chars.forEach((ch, i) => this.glyph(ch, x + (i + 0.5) * cw, y + h / 2, h, color));
    this.log.push(String(str));
    return chars.length * cw;
  },

  // Мелкий пропорциональный текст. o: {px, color, bold, align: 'l'|'c'|'r', max}
  miniW(str, o) {
    o = o || {};
    const g = this.g, px = o.px || 14;
    g.font = `${o.bold === false ? 500 : 700} ${px}px ${FONT}`;
    let w = 0;
    for (const ch of String(str)) w += (ch >= '' && ch <= '') || ch === '√' || (ch >= '▲' && ch <= '◀') || ch === '▷' ? px * 0.72 : g.measureText(ch).width;
    return w;
  },
  mini(x, y, str, o) {
    o = o || {};
    str = String(str);
    const g = this.g, px = o.px || 14, color = o.color || '#000';
    let w = this.miniW(str, o);
    const sx = o.max && w > o.max ? o.max / w : 1;
    const al = o.align || 'l';
    let x0 = al === 'c' ? x - (w * sx) / 2 : al === 'r' ? x - w * sx : x;
    g.save();
    g.translate(x0, 0);
    g.scale(sx, 1);
    let cx = 0;
    const base = y + px * 0.86;
    for (const ch of str) {
      const sp = (ch >= '' && ch <= '') || ch === '√' || (ch >= '▲' && ch <= '◀') || ch === '▷';
      if (sp) {
        const cw = px * 0.72;
        this.glyph(ch, cx + cw / 2, y + px * 0.56, px * 1.12, color);
        cx += cw;
        g.font = `${o.bold === false ? 500 : 700} ${px}px ${FONT}`;
      } else {
        g.font = `${o.bold === false ? 500 : 700} ${px}px ${FONT}`;
        const cw = g.measureText(ch).width;
        g.fillStyle = color;
        g.textAlign = 'left';
        g.fillText(ch, cx, base);
        cx += cw;
      }
    }
    g.restore();
    g.textAlign = 'center';
    this.log.push(str);
    return w * sx;
  },

  // Строка состояния: батарея, значок SHIFT/ALPHA, метки режима
  status(tags, mod) {
    const g = this.g;
    this.rect(0, 0, LW, 22, '#fff');
    // батарея
    this.frame(3, 6, 18, 10, '#000', 1);
    this.rect(21, 9, 2, 4, '#000');
    for (let i = 0; i < 3; i++) this.rect(5 + i * 5, 8, 4, 6, '#1e9e3e');
    let x = 27;
    if (mod) {
      const col = mod === 'S' ? '#e6a800' : '#d8232a';
      this.rrect(x, 3, 17, 16, 3, col);
      this.mini(x + 8.5, 4.2, mod === 'S' ? 'S' : 'A', { px: 12.5, color: '#fff', align: 'c' });
      if (mod === 'AL') { this.rect(x + 12, 13, 5, 5, '#fff'); this.frame(x + 12, 13, 5, 5, '#d8232a', 1); }
      this.log.push('[' + mod + ']');
    }
    x = 48;
    for (const t of tags || []) {
      if (!t) continue;
      const w = this.miniW(t, { px: 10.5 }) + 7;
      this.rrect(x + .5, 4.5, w, 13, 2.5, '#fff', '#000', 1);
      this.mini(x + 0.5 + w / 2, 5.8, t, { px: 10.5, align: 'c' });
      x += w + 3;
    }
    this.line(0, 22.5, LW, 22.5, '#000', 1);
    g.textAlign = 'center';
  },

  // Меню F1–F6. items: до 6 пунктов {l, k}: k = 'cmd' (команда), 'sub' (подменю), 'ins' (вставка)
  fmenu(items) {
    const g = this.g;
    for (let i = 0; i < 6; i++) {
      const it = items && items[i];
      if (!it) continue;
      const x = i * 64 + 1, y = 193, w = 62, h = 22;
      if (it.k === 'ins') {
        this.rrect(x + .5, y + .5, w - 1, h - 1, 2.5, '#fff', '#000', 1);
        this.mini(x + w / 2, y + 4, it.l, { px: 13, align: 'c', max: w - 6 });
      } else {
        this.rrect(x, y, w, h, 3, '#000');
        if (it.k === 'sub') {
          g.fillStyle = '#fff';
          g.beginPath(); g.moveTo(x + w + .5, y + h - 8); g.lineTo(x + w + .5, y + h + .5); g.lineTo(x + w - 8, y + h + .5); g.closePath(); g.fill();
        }
        this.mini(x + w / 2, y + 4, it.l, { px: 13, align: 'c', color: '#fff', max: w - (it.k === 'sub' ? 9 : 6) });
      }
    }
  },

  // Окно сообщения по центру экрана
  popup(lines, o) {
    o = o || {};
    const n = lines.length, w = o.w || 300, h = n * 24 + 20;
    const x = (LW - w) / 2, y = o.y !== undefined ? o.y : Math.max(26, 24 + (168 - h) / 2);
    this.rect(x + 3, y + 3, w, h, 'rgba(0,0,0,.25)');
    this.rect(x, y, w, h, '#fff');
    this.frame(x, y, w, h, '#000', 2);
    lines.forEach((s, i) => {
      const chars = [...s];
      const tw = chars.length * 18;
      if (o.left) this.text(x + 12, y + 10 + i * 24, s);
      else this.text(x + (w - tw) / 2, y + 10 + i * 24, s);
    });
  }
};
