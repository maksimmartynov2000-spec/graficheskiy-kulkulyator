// Общая часть тестов ядра: грузит модули без браузера и переводит запись «как на бумаге» в знаки калькулятора.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files, exportNames) {
  const dir = path.join(__dirname, '..', 'src', 'js');
  const src = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const code = `(() => { 'use strict';\n${src}\nreturn { ${exportNames.join(', ')} }; })()`;
  return vm.runInThisContext(code, { filename: 'calc-core.js' });
}

function makeTok(core) {
  const { G, PRE, FNA } = core;
  const alias = [
    ['⁻¹', G.INV], ['~', G.NEG], ['²', G.SQ], ['ᴇ', G.EE], ['⌟', G.FRC], ['³√', G.CBRT], ['ˣ√', G.XRT],
    ['nCr', G.COMB], ['nPr', G.PERM], ['Y#', G.YV], ['10^', G.TEN]
  ];
  const multi = [...PRE.keys(), ...FNA.keys(), 'Ans', 'List ', 'Mat ', 'Ran# ', 'Int÷', 'Rmdr'].filter((t) => t.length > 1);
  // «sin⁻¹ » в тестах пишется как 'asin ' и т. п. — проще читать
  const named = [['asin ', 'sin' + G.INV + ' '], ['acos ', 'cos' + G.INV + ' '], ['atan ', 'tan' + G.INV + ' ']];
  multi.sort((a, b) => b.length - a.length);
  return function tok(s) {
    const out = [];
    let i = 0;
    outer: while (i < s.length) {
      for (const [a, t] of named) if (s.startsWith(a, i)) { out.push(t); i += a.length; continue outer; }
      for (const t of multi) if (s.startsWith(t, i)) { out.push(t); i += t.length; continue outer; }
      for (const [a, t] of alias) if (s.startsWith(a, i)) { out.push(t); i += a.length; continue outer; }
      if (s[i] === ' ') { i++; continue; }
      out.push(s[i]); i++;
    }
    return out;
  };
}

function makeRowStr(core) {
  const { G } = core;
  const back = new Map([[G.EE, 'ᴇ'], [G.FRC, '⌟'], [G.NEG, '~'], [G.SQ, '²'], [G.INV, '⁻¹']]);
  const rs = (row) => row.map((x) => {
    if (typeof x === 'string') return back.get(x) || x;
    const s = x.s.map(rs);
    if (x.t === 'frac') return `[${s[0]}/${s[1]}]`;
    if (x.t === 'sqrt') return `√(${s[0]})`;
    if (x.t === 'mixed') return `[${s[0]}_${s[1]}/${s[2]}]`;
    return `{${x.t}:${s.join(',')}}`;
  }).join('');
  return rs;
}

function runner() {
  let pass = 0, failN = 0;
  return {
    eq(got, want, what) {
      if (got === want) { pass++; return; }
      failN++;
      console.log(`  ✗ ${what}: получено «${got}», ожидалось «${want}»`);
    },
    near(got, want, what, tol) {
      if (Math.abs(got - want) <= (tol || 1e-9) * Math.max(1, Math.abs(want))) { pass++; return; }
      failN++;
      console.log(`  ✗ ${what}: получено ${got}, ожидалось ${want}`);
    },
    done(name) {
      console.log(`${name}: прошло ${pass}, не прошло ${failN}`);
      return failN;
    }
  };
}

module.exports = { load, makeTok, makeRowStr, runner };
