// Все тесты подряд: node tests/all.js
// (ядро → статистика → уравнения → новые режимы → клавиши и экраны в браузере → случайные нажатия)
const { spawnSync } = require('child_process');
const path = require('path');

// [файл, ...аргументы]: у статистики и уравнений вторая часть — сценарии «с клавиш» в браузере
const order = [
  ['engine.js'], ['stat.js', 'web'], ['eqn.js', 'ui'], ['recur.js', 'web'], ['conic.js', 'web'], ['dyna.js', 'web'], ['fin.js', 'web'],
  ['ui.js'], ['monkey.js', '9000', '1']
];
let bad = 0;
for (const [f, ...args] of order) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f), ...args], { stdio: 'inherit' });
  if (r.status !== 0) bad++;
}
console.log(bad ? `\nИТОГ: не прошли ${bad} из ${order.length} наборов` : `\nИТОГ: всё прошло (${order.length} наборов)`);
process.exit(bad ? 1 : 0);
