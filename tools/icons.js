// Рисует значки приложения из одного SVG: icon-512.png, icon-192.png, apple-touch-icon.png (рисунок крупнее)
// и icon-maskable-512.png (рисунок в «безопасной зоне» — Android обрезает такой значок кругом или скруглённым квадратом).
// Запуск: node tools/icons.js   (нужен Playwright). Значки лежат в репозитории; перерисовывать — только если меняется рисунок.
const { chromium } = require('playwright');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const key = (x, y, w, h, fill, edge) => `<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="9" fill="${edge}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${fill}"/>`;
function svg(scale) {
  const xs = [132, 196, 260, 324];
  const top = [['#f3c52a', '#a57a06'], ['#e04449', '#8d1b20'], ['#4c525c', '#23262b'], ['#4c525c', '#23262b']];
  const rows = [
    [302, ['#dfe4ea', '#dfe4ea', '#dfe4ea', '#5b6b86']],
    [352, ['#dfe4ea', '#dfe4ea', '#dfe4ea', '#dfe4ea']],
    [402, ['#dfe4ea', '#dfe4ea', '#dfe4ea', '#2f7fe6']]
  ];
  const edge = { '#dfe4ea': '#aab2be', '#5b6b86': '#2c3648', '#2f7fe6': '#134a99' };
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b8cf0"/><stop offset="1" stop-color="#1446a0"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6eaf0"/></linearGradient>
    <clipPath id="lcd"><rect x="144" y="92" width="224" height="132" rx="5"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="110" y="68" width="292" height="400" rx="42" fill="#0b2c6b" opacity=".38"/>
    <rect x="110" y="56" width="292" height="400" rx="42" fill="url(#body)"/>
    <rect x="130" y="78" width="252" height="160" rx="18" fill="#101317"/>
    <rect x="144" y="92" width="224" height="132" rx="5" fill="#ffffff"/>
    <g clip-path="url(#lcd)">
      <path d="M144 182H368M256 92V224" stroke="#2a2d33" stroke-width="3"/>
      <path d="M186 96Q256 316 326 96" fill="none" stroke="#0a50d8" stroke-width="9" stroke-linecap="round"/>
      <path d="M150 214L362 122" fill="none" stroke="#e0262d" stroke-width="8" stroke-linecap="round"/>
    </g>
    ${top.map(([f, e], i) => key(xs[i], 256, 56, 28, f, e)).join('')}
    ${rows.map(([y, cs]) => cs.map((c, i) => key(xs[i], y, 56, 36, c, edge[c])).join('')).join('')}
  </g>
</svg>`;
}

(async () => {
  const browser = await chromium.launch();
  for (const [name, size, scale] of [['icon-512.png', 512, 1.12], ['icon-192.png', 192, 1.12], ['apple-touch-icon.png', 180, 1.12], ['icon-maskable-512.png', 512, 0.86]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(scale)}`);
    await page.screenshot({ path: path.join(ROOT, name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log('  ✓ ' + name);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
