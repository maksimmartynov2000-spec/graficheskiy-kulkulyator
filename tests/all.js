// Все тесты подряд: node tests/all.js   (ядро → статистика → уравнения → клавиши и экраны в браузере)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const order = ['engine.js', 'stat.js', 'eqn.js', 'ui.js'];
const files = order.filter((f) => fs.existsSync(path.join(__dirname, f)));
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) bad++;
}
console.log(bad ? `\nИТОГ: не прошли ${bad} из ${files.length} наборов` : `\nИТОГ: всё прошло (${files.length} наборов)`);
process.exit(bad ? 1 : 0);
