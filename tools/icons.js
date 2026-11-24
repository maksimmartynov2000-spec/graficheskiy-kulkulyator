// Рисует значки приложения (icon-192.png, icon-512.png, apple-touch-icon.png) из одного SVG.
// Запуск: node tools/icons.js   (нужен Playwright). Значки лежат в репозитории, перерисовывать — только если меняется рисунок.
const { chromium } = require('playwright');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Рисунок вписан в «безопасную зону» (центральные 80%), чтобы Android мог обрезать значок кругом.
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3038"/><stop offset="1" stop-color="#15181d"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="96" y="92" width="320" height="196" rx="16" fill="#0a0c0f"/>
  <rect x="110" y="106" width="292" height="168" rx="5" fill="#ffffff"/>
  <path d="M110 222H402M256 106V274" stroke="#222" stroke-width="4"/>
  <path d="M156 116Q256 392 356 116" fill="none" stroke="#0a50d8" stroke-width="10" stroke-linecap="round"/>
  <path d="M120 262L392 138" fill="none" stroke="#e0262d" stroke-width="9" stroke-linecap="round"/>
  <g>
    <rect x="96" y="318" width="68" height="44" rx="10" fill="#f0c020"/>
    <rect x="180" y="318" width="68" height="44" rx="10" fill="#565c67"/>
    <rect x="264" y="318" width="68" height="44" rx="10" fill="#565c67"/>
    <rect x="348" y="318" width="68" height="44" rx="10" fill="#565c67"/>
    <rect x="96" y="378" width="68" height="44" rx="10" fill="#e9ecf1"/>
    <rect x="180" y="378" width="68" height="44" rx="10" fill="#e9ecf1"/>
    <rect x="264" y="378" width="68" height="44" rx="10" fill="#e9ecf1"/>
    <rect x="348" y="378" width="68" height="44" rx="10" fill="#2f7fe6"/>
  </g>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${SVG}`);
    await page.screenshot({ path: path.join(ROOT, name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log('  ✓ ' + name);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
