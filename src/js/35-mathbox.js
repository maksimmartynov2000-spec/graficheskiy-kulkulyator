// ══════ 35-mathbox.js — «естественная» запись: раскладка и рисование дробей, корней, степеней ══════
//
// Строка — массив: знак (строка) или шаблон {t, s: [строки]}.
// layRow → {w, a, d, ops, cur}: ширина, высота над и под средней линией, что рисовать, места курсора.

const MCH = [24, 16];                 // высота знакоместа: обычный и мелкий размер
const MCW = [18, 12];
const TPL_SLOTS = { frac: 2, mixed: 3, sqrt: 1, cbrt: 1, root: 2, pow: 1, pow10: 1, epow: 1, abs: 1, logab: 2, int: 3, ddx: 2, d2dx: 2, sum: 4 };

function layRow(row, sz, math, slot) {
  const ch = MCH[sz], cw = MCW[sz], half = ch / 2;
  const ops = [], cur = [], bx = [], open = [];
  let x = 0;
  if (!row.length && slot) {
    ops.push({ t: 'g', x: cw / 2, y: 0, ch: G.BOX, h: ch });
    cur.push({ row, i: 0, x: 1, y: 0, h: ch });
    return { w: cw, a: half, d: half, ops, cur };
  }
  const liftOf = (pa) => Math.max(sz ? 1 : 2, pa - (sz ? 7 : 10));
  const pair = (i, j) => {            // скобки по высоте содержимого
    let A = half, Dn = half;
    for (let k = i + 1; k < j; k++) { A = Math.max(A, bx[k].a); Dn = Math.max(Dn, bx[k].d); }
    if (i >= 0) { bx[i].a = A; bx[i].d = Dn; }
    if (j < bx.length) { bx[j].a = A; bx[j].d = Dn; }
  };
  for (let i = 0; i < row.length; i++) {
    const it = row[i];
    cur.push({ row, i, x, y: 0, h: ch });
    const pa = bx.length ? bx[bx.length - 1].a : half;
    let b;
    if (typeof it !== 'string') {
      b = layTpl(it, sz, pa);
      for (const o of b.ops) { o.x += x; ops.push(o); }
      for (const c of b.cur) { c.x += x; cur.push(c); }
      b = { x, w: b.w, a: b.a, d: b.d };
    } else if (math && (it === G.SQ || it === G.INV)) {
      const yc = -(liftOf(pa) + 8);
      if (it === G.SQ) { ops.push({ t: 'g', x: x + 6.5, y: yc, ch: '2', h: 16 }); b = { x, w: 13, a: -yc + 8, d: 0 }; }
      else {
        ops.push({ t: 'g', x: x + 5, y: yc, ch: G.NEG, h: 16 }, { t: 'g', x: x + 13.5, y: yc, ch: '1', h: 16 });
        b = { x, w: 19, a: -yc + 8, d: 0 };
      }
    } else if (math && (it === '(' || it === ')')) {
      b = { x, w: cw, a: half, d: half, paren: it };
      bx.push(b);
      if (it === '(') open.push(bx.length - 1); else pair(open.length ? open.pop() : -1, bx.length - 1);
      x += b.w;
      continue;
    } else {
      const chars = [...it];
      chars.forEach((c, j) => ops.push({ t: 'g', x: x + (j + 0.5) * cw, y: 0, ch: c, h: ch }));
      b = { x, w: chars.length * cw, a: half, d: half };
    }
    bx.push(b);
    x += b.w;
  }
  while (open.length) pair(open.pop(), bx.length);
  cur.push({ row, i: row.length, x, y: 0, h: ch });
  let a = half, d = half;
  for (const b of bx) {
    a = Math.max(a, b.a); d = Math.max(d, b.d);
    if (!b.paren) continue;
    if (b.a > half + 0.5 || b.d > half + 0.5) ops.push({ t: 'par', x: b.x, y: -b.a, h: b.a + b.d, w: cw, side: b.paren === '(' ? 1 : -1 });
    else ops.push({ t: 'g', x: b.x + cw / 2, y: 0, ch: b.paren, h: ch });
  }
  return { w: x, a, d, ops, cur };
}

function layTpl(it, sz, pa) {
  const ch = MCH[sz], cw = MCW[sz], half = ch / 2, s = it.s;
  const ops = [], cur = [];
  const put = (b, dx, dy) => {
    for (const o of b.ops) { o.x += dx; o.y += dy; ops.push(o); }
    for (const c of b.cur) { c.x += dx; c.y += dy; cur.push(c); }
  };
  const L = (k, z) => layRow(s[k], z === undefined ? sz : z, true, true);
  const glyphs = (str, x, y, z) => { [...str].forEach((c, j) => ops.push({ t: 'g', x: x + (j + 0.5) * MCW[z], y, ch: c, h: MCH[z] })); return str.length * MCW[z]; };
  const pw = sz ? 6 : 8;              // ширина скобки шаблона
  const parens = (C, x) => {          // (C) начиная с x; возвращает правый край
    const A = Math.max(half, C.a), Dn = Math.max(half, C.d);
    ops.push({ t: 'par', x, y: -A, h: A + Dn, w: pw, side: 1 });
    put(C, x + pw, 0);
    ops.push({ t: 'par', x: x + pw + C.w, y: -A, h: A + Dn, w: pw, side: -1 });
    return x + 2 * pw + C.w;
  };
  switch (it.t) {
    case 'frac': {
      const N = L(0), Dn = L(1), w = Math.max(N.w, Dn.w) + 4;
      put(N, (w - N.w) / 2, -(2 + N.d));
      put(Dn, (w - Dn.w) / 2, 3 + Dn.a);
      ops.push({ t: 'l', x: 1, y: 0.5, dx: w - 2, dy: 0, lw: sz ? 1.1 : 1.6 });
      return { w, a: 2 + N.d + N.a, d: 3 + Dn.a + Dn.d, ops, cur };
    }
    case 'mixed': {
      const W = L(0), N = L(1), Dn = L(2), fw = Math.max(N.w, Dn.w) + 4, fx = W.w + 1;
      put(W, 0, 0);
      put(N, fx + (fw - N.w) / 2, -(2 + N.d));
      put(Dn, fx + (fw - Dn.w) / 2, 3 + Dn.a);
      ops.push({ t: 'l', x: fx + 1, y: 0.5, dx: fw - 2, dy: 0, lw: sz ? 1.1 : 1.6 });
      return { w: fx + fw, a: Math.max(W.a, 2 + N.d + N.a), d: Math.max(W.d, 3 + Dn.a + Dn.d), ops, cur };
    }
    case 'sqrt': case 'cbrt': case 'root': {
      const I = it.t === 'root' ? L(0, 1) : null, C = L(it.t === 'root' ? 1 : 0);
      const pl = sz ? 8 : 11, top = C.a + 2.5;
      const ox = it.t === 'sqrt' ? 0 : Math.max(0, (I ? I.w : 9) - 5);
      let a = top + 1.5;
      if (I) { put(I, 0, -(2 + I.d)); a = Math.max(a, 2 + I.d + I.a); }
      else if (it.t === 'cbrt') { ops.push({ t: 'g', x: 4.5, y: -8, ch: '3', h: 13 }); a = Math.max(a, 15); }
      put(C, ox + pl, 0);
      ops.push({ t: 'pl', x: ox, y: 0, pts: [[1, 1.5], [3.2, 0], [pl - 4.2, C.d - 1.5], [pl - 1, -top], [pl + C.w + 1.5, -top]], lw: sz ? 1.2 : 1.7 });
      return { w: ox + pl + C.w + 3, a, d: C.d, ops, cur };
    }
    case 'pow': {
      const E = L(0, 1), lift = Math.max(sz ? 1 : 2, pa - (sz ? 7 : 10));
      put(E, 0.5, -(lift + E.d));
      return { w: E.w + 1.5, a: lift + E.d + E.a, d: 0, ops, cur };
    }
    case 'pow10': case 'epow': {
      const bw = glyphs(it.t === 'pow10' ? '10' : 'e', 0, 0, sz);
      const E = L(0, 1), lift = sz ? 1 : 2;
      put(E, bw + 0.5, -(lift + E.d));
      return { w: bw + E.w + 1.5, a: Math.max(half, lift + E.d + E.a), d: half, ops, cur };
    }
    case 'abs': {
      const C = L(0);
      put(C, 5, 0);
      ops.push({ t: 'l', x: 2.5, y: -C.a, dx: 0, dy: C.a + C.d, lw: 1.5 }, { t: 'l', x: C.w + 7.5, y: -C.a, dx: 0, dy: C.a + C.d, lw: 1.5 });
      return { w: C.w + 10, a: C.a, d: C.d, ops, cur };
    }
    case 'logab': {
      let x = glyphs('log', 0, 0, sz);
      const B = L(0, 1), C = L(1), by = (sz ? 3 : 5) + B.a;
      put(B, x, by);
      x = parens(C, x + B.w + 1);
      return { w: x, a: Math.max(half, C.a), d: Math.max(half, C.d, by + B.d), ops, cur };
    }
    case 'int': {
      const F = L(0), lo = L(1, 1), hi = L(2, 1);
      const up = Math.max(F.a, 14), dn = Math.max(F.d, 14);
      ops.push({ t: 'int', x: 1, y: -up, h: up + dn });
      put(hi, 15, -(up - 6) - hi.d);
      put(lo, 11, dn - 6 + lo.a);
      const fx = 13 + Math.max(lo.w - 2, hi.w + 2) + 3;
      put(F, fx, 0);
      const w = fx + F.w + 2 + glyphs('dx', fx + F.w + 2, 0, sz);
      return { w, a: up - 6 + hi.d + hi.a, d: dn - 6 + lo.a + lo.d, ops, cur };
    }
    case 'ddx': case 'd2dx': {
      const two = it.t === 'd2dx', F = L(0), X = L(1, 1);
      const fw = two ? 34 : 26;
      // «d/dx» мелкой дробью
      if (two) { glyphs('d', fw / 2 - 10, -10, 1); ops.push({ t: 'g', x: fw / 2 + 6, y: -13, ch: '2', h: 11 }); glyphs('dx', 1, 11, 1); ops.push({ t: 'g', x: 29, y: 8, ch: '2', h: 11 }); }
      else { glyphs('d', fw / 2 - 6, -10, 1); glyphs('dx', 1, 11, 1); }
      ops.push({ t: 'l', x: 0, y: 0.5, dx: fw, dy: 0, lw: 1.3 });
      let x = parens(F, fw + 1);
      const A = Math.max(half, F.a), Dn = Math.max(half, F.d, 19);
      ops.push({ t: 'l', x: x + 2, y: -A, dx: 0, dy: A + Dn, lw: 1.2 });
      const yl = Dn - 4;
      x += 4 + glyphs('x=', x + 4, yl, 1);
      put(X, x, yl);
      return { w: x + X.w + 1, a: Math.max(A, 19), d: Math.max(Dn, yl + X.d), ops, cur };
    }
    case 'sum': {
      const F = L(0), V = L(1, 1), Lo = L(2, 1), Hi = L(3, 1);
      const bw = V.w + 12 + Lo.w, colw = Math.max(24, bw, Hi.w);
      ops.push({ t: 'big', x: colw / 2, y: 0, ch: 'Σ', px: 32 });
      put(Hi, (colw - Hi.w) / 2, -17 - Hi.d);
      const bx0 = (colw - bw) / 2;
      put(V, bx0, 17 + Math.max(V.a, Lo.a));
      glyphs('=', bx0 + V.w, 17 + Math.max(V.a, Lo.a), 1);
      put(Lo, bx0 + V.w + 12, 17 + Math.max(V.a, Lo.a));
      const x = parens(F, colw + 1);
      return { w: x, a: Math.max(F.a, 17 + Hi.d + Hi.a), d: Math.max(F.d, 17 + Math.max(V.a, Lo.a) + Math.max(V.d, Lo.d)), ops, cur };
    }
    default:
      return { w: 0, a: half, d: half, ops, cur };
  }
}

// Нарисовать раскладку: (ox, oy) — левый край и средняя линия
function drawLay(lay, ox, oy, color) {
  const g = lcd.g;
  color = color || '#000';
  for (const o of lay.ops) {
    const x = ox + o.x, y = oy + o.y;
    switch (o.t) {
      case 'g': lcd.glyph(o.ch, x, y, o.h, color); break;
      case 'l': lcd.line(x, y, x + o.dx, y + o.dy, color, o.lw); break;
      case 'pl':
        g.strokeStyle = color; g.lineWidth = o.lw; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        o.pts.forEach(([px, py], i) => (i ? g.lineTo(x + px, y + py) : g.moveTo(x + px, y + py)));
        g.stroke();
        break;
      case 'par': {
        const xa = o.side > 0 ? x + o.w - 1.5 : x + 1.5, xb = o.side > 0 ? x + 1.5 : x + o.w - 1.5;
        g.strokeStyle = color; g.lineWidth = 1.5; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(xa, y + 1.5);
        g.quadraticCurveTo(xb - (xa - xb) * 0.55, y + o.h / 2, xa, y + o.h - 1.5);
        g.stroke();
        break;
      }
      case 'int':
        g.strokeStyle = color; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x + 11, y + 3.5);
        g.bezierCurveTo(x + 10, y - 0.5, x + 6, y, x + 6, y + 6);
        g.lineTo(x + 6, y + o.h - 6);
        g.bezierCurveTo(x + 6, y + o.h, x + 2, y + o.h + 0.5, x + 1, y + o.h - 3.5);
        g.stroke();
        break;
      case 'big':
        g.font = `500 ${o.px}px ${FONT}`; g.fillStyle = color; g.textAlign = 'center';
        g.fillText(o.ch, x, y + o.px * 0.35);
        break;
      default:
    }
  }
}

function curOf(lay, row, i) {
  for (const c of lay.cur) if (c.row === row && c.i === i) return c;
  return null;
}

// Готовая строка (ответ, подпись) — раскладка без курсора
const layStatic = (row, sz) => layRow(row, sz || 0, true, false);
