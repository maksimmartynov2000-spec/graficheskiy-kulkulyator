// Особые знаки экрана (коды из частной области Юникода) заводятся в разных файлах:
// у двух разных знаков не должно быть одного кода. Запуск: node tests/glyphs.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'js');
const seen = new Map();               // код → [[файл, имя]…]
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of text.matchAll(/\b([A-Z][A-Z0-9_]*)\s*[:=]\s*'([-])'/g)) {
    const code = m[2].codePointAt(0);
    if (!seen.has(code)) seen.set(code, []);
    seen.get(code).push([f, m[1]]);
  }
}
let bad = 0;
for (const [code, uses] of seen) {
  if (new Set(uses.map((u) => u[1])).size > 1) {
    bad++;
    console.log(`  ✗ код ${code.toString(16).toUpperCase()} занят дважды: ${uses.map((u) => `${u[1]} (${u[0]})`).join(', ')}`);
  }
}
console.log(`Особые знаки: всего ${seen.size}, совпадений кодов ${bad}`);
process.exit(bad ? 1 : 0);
