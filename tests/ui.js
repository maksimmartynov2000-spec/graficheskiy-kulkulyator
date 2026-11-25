// Проверка работы калькулятора «с клавиш» в браузере: node tests/ui.js
// Сценарии нажимают клавиши и сверяют числа в памяти и надписи на экране.
const { open } = require('./web');

(async () => {
  const c = await open({ w: 393, h: 852, dpr: 1 });
  let pass = 0, failN = 0;
  const ok = (cond, what) => { if (cond) pass++; else { failN++; console.log('  ✗ ' + what); } };
  const eq = (got, want, what) => ok(got === want, `${what}: получено «${got}», ожидалось «${want}»`);
  const near = (got, want, what) => ok(typeof got === 'number' && Math.abs(got - want) < 1e-9 * Math.max(1, Math.abs(want)), `${what}: получено ${got}, ожидалось ${want}`);
  const fresh = async () => {
    await c.page.evaluate(() => { localStorage.clear(); });
    await c.page.reload();
    await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  };
  const K = (s) => c.keys(s);
  const ans = () => c.page.evaluate(() => { const h = window.__calc.UI.apps.run.hist; const e = h[h.length - 1]; return e && e.val ? e.val.v : null; });
  const last = () => c.page.evaluate(() => { const h = window.__calc.UI.apps.run.hist; return h[h.length - 1]; });
  const scr = async () => (await c.text()).join(' | ');
  const has = async (s, what) => { const t = await scr(); ok(t.includes(s), `${what}: на экране нет «${s}» (есть: ${t})`); };
  const ev = (fn) => c.page.evaluate(fn);

  // ---------- Run-Matrix ----------
  await fresh();
  await K('MENU 1 1 DIV 3 ADD 1 DIV 6 EXE');
  near(await ans(), 0.5, '1÷3+1÷6');
  eq(JSON.stringify((await last()).val.ex.t), '[[1,2,1]]', 'ответ хранится дробью 1/2');
  await K('SD');
  eq((await last()).mode, 'dec', 'S⇔D переводит в десятичную запись');
  await K('SD');
  eq((await last()).mode, 'exact', 'S⇔D возвращает дробь');
  await K('ADD 3 EXE');
  near(await ans(), 3.5, 'нажатие + на пустой строке подставляет Ans');
  await K('FRAC 3 DOWN 4 RIGHT ADD FRAC 1 DOWN 4 EXE');
  near(await ans(), 1, 'шаблон дроби: 3/4 + 1/4');
  await K('SHIFT SQR 2 RIGHT MUL SHIFT SQR 8 EXE');
  near(await ans(), 4, '√2 × √8');
  await K('2 POW 1 0 EXE');
  near(await ans(), 1024, '2^10');
  await K('2 POW 3 RIGHT ADD 1 EXE');
  near(await ans(), 9, '2³ + 1: ► выводит из показателя');
  await K('SHIFT FRAC 2 RIGHT 1 DOWN 3 EXE');
  near(await ans(), 7 / 3, 'смешанная дробь 2 1/3');
  await K('SHIFT LPAR 2 7 EXE');
  near(await ans(), 3, 'кубический корень из 27');
  await K('5 STO ALPHA XTT EXE 2 ALPHA XTT ADD 1 EXE');
  near(await ans(), 11, 'переменная A: 5→A, 2A+1');
  await K('2 ADD EXE');
  await has('Syntax ERROR', 'незаконченное выражение');
  await K('EXIT AC');
  await K('1 DIV 0 EXE');
  await has('Ma ERROR', 'деление на ноль');
  await K('EXIT AC');
  await K('7 EXE EXE');
  eq(await ev(() => window.__calc.UI.apps.run.hist.length), 12, 'EXE на пустой строке повторяет последний расчёт');
  // правка строки из истории и пересчёт
  await K('AC 3 EXE ADD 1 EXE UP UP DEL 5 EXE');
  near(await ans(), 6, 'правка строки истории пересчитывает следующие строки');
  // Setup: градусы
  await K('SHIFT MENU DOWN DOWN DOWN DOWN DOWN DOWN F1 EXIT SIN 3 0 EXE');
  near(await ans(), 0.5, 'sin 30 в градусах');
  await K('SHIFT SIN FRAC 1 DOWN 2 EXE');
  near(await ans(), 30, 'sin⁻¹(1/2) в градусах');
  await has('Deg', 'метка Deg в строке состояния');
  // меню OPTN: 5 nCr 2
  await K('5 OPTN F6 F3 F3 2 EXE');
  near(await ans(), 10, '5C2 через OPTN → PROB → nCr');
  await K('EXIT EXIT');
  // d/dx шаблоном: d/dx(x²) при x=3
  await K('F4 F4 XTT SQR RIGHT 3 EXE');
  near(await ans(), 6, 'd/dx(x²)|x=3 через MATH');
  await K('EXIT');
  // списки
  await K('SHIFT MUL 1 COMMA 2 COMMA 3 SHIFT DIV STO SHIFT 1 1 EXE');
  await has('Ans', 'список-ответ открывается в просмотре');
  await K('EXIT');
  eq(await ev(() => window.__calc.mem.lists[0].map((x) => x.v).join()), '1,2,3', '{1,2,3}→List 1');
  // строчный ввод
  await K('SHIFT MENU F2 EXIT 1 FRAC 3 ADD 1 FRAC 6 EXE');
  near(await ans(), 0.5, 'строчный ввод: 1⌟3+1⌟6');
  await has('Line', 'метка Line');
  await K('SHIFT MENU F1 EXIT');

  // ---------- комплексные числа ----------
  const lastCx = () => ev(() => { const h = window.__calc.UI.apps.run.hist; const z = h[h.length - 1].val; return z && z.cx ? z.re.v + ',' + z.im.v : 'real'; });
  await K('AC LPAR 1 ADD 2 SHIFT 0 RPAR LPAR 3 SUB SHIFT 0 RPAR EXE');
  eq(await lastCx(), '5,5', '(1+2i)(3−i) = 5+5i (клавиша SHIFT 0)');
  await K('SHIFT 0 SQR EXE');
  near(await ans(), -1, 'i² = −1');
  await K('SHIFT SQR NEG 4 EXE');
  await has('Non-Real ERROR', 'Complex Mode Real: корень из отрицательного числа — ошибка');
  await K('EXIT AC');
  await K('SHIFT MENU DOWN DOWN DOWN DOWN DOWN DOWN DOWN F2 EXIT');
  await has('a+bi', 'Setup → Complex Mode → a+bi: метка в строке состояния');
  await K('SHIFT SQR NEG 4 EXE');
  eq(await lastCx(), '0,2', '√(−4) = 2i в режиме a+bi');
  await K('LPAR 1 ADD SHIFT 0 RPAR DIV 3 EXE SD');
  eq((await last()).mode, 'dec', 'S⇔D для комплексного ответа с дробями');
  await K('SD');
  eq((await last()).mode, 'exact', 'S⇔D возвращает дроби');
  await K('OPTN F3');
  await has('Conjg', 'OPTN → COMPLEX: меню');
  await K('F3 LPAR 1 ADD SHIFT 0 RPAR EXE');
  near(await ans(), 45, 'Arg(1+i) = 45° через OPTN → COMPLEX → Arg');
  await K('1 ADD SHIFT 0 F6 F3 EXE');
  eq((await last()).form, 'polar', 'команда ▶r∠θ: ответ в полярном виде');
  await K('EXIT EXIT');
  await K('2 SHIFT XTT 9 0 EXE');
  eq(await lastCx(), '0,2', 'полярный ввод 2∠90 = 2i (клавиша SHIFT X,θ,T)');
  await K('2 ADD 3 SHIFT 0 STO ALPHA LOG EXE');
  await c.page.waitForTimeout(700);
  await c.page.reload();
  await c.page.waitForFunction(() => window.__calc && document.querySelector('.calc.ready'));
  eq(await ev(() => { const z = window.__calc.mem.vars.B; return z && z.cx ? z.re.v + ',' + z.im.v : 'нет'; }), '2,3', 'комплексная переменная B пережила перезагрузку');
  eq(await ev(() => { const z = window.__calc.mem.ans; return z && z.cx ? z.re.v + ',' + z.im.v : 'нет'; }), '2,3', 'комплексный Ans пережил перезагрузку');
  eq(await lastCx(), '2,3', 'комплексный ответ в истории пережил перезагрузку');
  await has('a+bi', 'Complex Mode сохранился');
  await K('ALPHA LOG MUL ALPHA LOG EXE');
  eq(await lastCx(), '-5,12', 'B×B = −5+12i после перезагрузки');

  // ---------- Graph ----------
  await fresh();
  await K('MENU 5 XTT SQR SUB 2 EXE XTT EXE');
  eq(await ev(() => window.__calc.mem.fn.filter((f) => f.sel).length), 2, 'две функции записаны и выбраны');
  await K('F6 F5 F1');
  await has('Y1=', 'при двух функциях G-Solv спрашивает, какую взять');
  await K('EXE');
  await has('ROOT', 'G-Solv ROOT');
  await has('X=−1.414213562', 'первый корень x²−2');
  await K('RIGHT');
  await has('X=1.414213562', 'второй корень x²−2');
  await K('F5 F3 EXE');
  await has('MIN', 'G-Solv MIN');
  await has('X=0', 'минимум в нуле');
  await has('Y=−2', 'значение минимума');
  await K('F5 F5');
  await has('INTSECT', 'G-Solv INTSECT');
  await has('X=−1', 'первое пересечение');
  await K('RIGHT');
  await has('X=2', 'второе пересечение');
  await has('Y=2', 'ордината пересечения');
  await K('F5 F6 F1 EXE 3 EXE');
  await has('Y=7', 'Y-CAL: Y1(3)=7');
  await K('F5 F6 F2 EXE 2 EXE');
  await has('X=−2', 'X-CAL: x²−2=2 → x=−2');
  await K('RIGHT');
  await has('X=2', 'X-CAL: второй x');
  await K('F5 F4 EXE');
  await has('Y-ICEPT', 'G-Solv Y-ICEPT');
  await has('Y=−2', 'пересечение с осью Y');
  await K('EXIT F1');
  await has('X=0', 'Trace начинается в середине экрана');
  await K('RIGHT RIGHT RIGHT');
  await has('X=0.1', 'Trace: три шага вправо');
  await has('Y=−1.99', 'Trace: значение функции');
  await K('DOWN');
  await has('Y2=', 'Trace: ▼ переходит на другую функцию');
  await K('2 DOT 5 EXE');
  await has('X=2.5', 'Trace: переход к набранному X');
  await K('EXIT');
  const vw = () => ev(() => { window.__calc.keys('SHIFT F3'); const t = window.__calc.text(); window.__calc.keys('EXIT'); return t.join(' | '); });
  await K('SHIFT F2 F3');
  ok((await vw()).includes('| 3.15 |'), 'Zoom IN: Xmax стал 3.15');
  await K('SUB');
  ok((await vw()).includes('| 6.3 |'), 'клавиша «−» отдаляет: Xmax снова 6.3');
  await K('SHIFT F3 F3 EXIT');
  ok((await vw()).includes('| 10 |'), 'V-Window STANDRD: Xmax = 10');
  await K('SHIFT F3 F1 EXIT EXIT EXIT');   // V-Window → меню Zoom → список функций
  // ∫dx от −1 до 1 для x²−2: −10/3
  await K('F6 F5 F6 F3 EXE NEG 1 EXE EXE 1 EXE EXE');
  await has('∫dx=−3.333333333', '∫dx по графику');
  await K('EXIT EXIT');

  // ---------- Table ----------
  await K('MENU 7 F5 NEG 2 EXE 2 EXE 1 EXE EXIT F6');
  await has('FORMULA', 'таблица построена');
  await has('−2', 'таблица: первый X');
  eq(await ev(() => window.__calc.UI.apps.table.ys[0].join()), '2,-1,-2,-1,2', 'таблица: значения Y1');
  await K('DOWN DOWN 0 DOT 5 EXE');
  eq(await ev(() => window.__calc.UI.apps.table.ys[0][2]), -1.75, 'таблица: правка X пересчитывает строку');

  // ---------- память и выключение ----------
  await K('MENU SHIFT AC');
  eq(await ev(() => window.__calc.UI.off), true, 'SHIFT AC выключает экран');
  await K('AC');
  eq(await ev(() => window.__calc.UI.off), false, 'AC включает');

  if (c.errs.length) { failN++; console.log('  ✗ ошибки JS: ' + c.errs.join('; ')); }
  console.log(`Клавиши и экраны: прошло ${pass}, не прошло ${failN}`);
  await c.close();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
