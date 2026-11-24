// Снимки экрана для просмотра глазами.
//   node tests/shot.js 393x852 "MENU 1 1 ADD 2 EXE @сумма F1 @меню" [dark] [full]
// «@имя» — сделать снимок в этот момент (.work/имя.png): только экран калькулятора, с флагом full — вся страница.
const { open } = require('./web');
(async () => {
  const [size = '393x852', script = '', ...flags] = process.argv.slice(2);
  const [w, h] = size.split('x').map(Number);
  const c = await open({ w, h, dark: flags.includes('dark') });
  let buf = [];
  const flush = async () => { if (buf.length) { await c.keys(buf.join(' ')); buf = []; } };
  for (const t of script.trim().split(/\s+/).filter(Boolean)) {
    if (t[0] !== '@') { buf.push(t); continue; }
    await flush();
    if (flags.includes('full')) await c.shot(t.slice(1)); else await c.lcd(t.slice(1));
    console.log(t + ': ' + (await c.text()).join(' | '));
  }
  await flush();
  if (c.errs.length) console.log('ОШИБКИ:', c.errs.join('\n'));
  await c.close();
})().catch((e) => { console.error(e); process.exit(1); });
