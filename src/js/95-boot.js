// ══════ 95-boot.js — запуск: хранилище, тема, самообновление, работа без интернета ══════

// localStorage может быть недоступен (частный режим) — тогда просто не сохраняем
const APP_KEY = 'app-' + location.pathname.replace(/[^a-z0-9]+/gi, '-');   // у каждого приложения на github.io свой ключ
const store = {
  get(k, def) { try { const v = localStorage.getItem(APP_KEY + ':' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(APP_KEY + ':' + k, JSON.stringify(v)); } catch (e) { /* нет хранилища */ } }
};
const $ = (s) => document.querySelector(s);
let toastTm = 0;
function toast(text, ms) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTm);
  toastTm = setTimeout(() => el.classList.remove('on'), ms || 2400);
}

// ---------- состояние калькулятора: сохраняется после каждого нажатия ----------
let saveOff = false;                  // тесты: «чистый запуск» — стереть память и больше не сохранять до перезагрузки
function saveState() {
  if (saveOff) return;
  const st = { v: 1, S: { ...S }, vars: mem.vars, ans: mem.ans, lists: mem.lists, listSub: mem.listSub, mats: mem.mats, app: UI.appId, apps: {} };
  for (const id in UI.apps) if (UI.apps[id].save) { try { st.apps[id] = UI.apps[id].save(); } catch (e) { /* режим не сохранился — не страшно */ } }
  store.set('state', st);
}
function loadState() {
  const st = store.get('state', null);
  if (!st || st.v !== 1) return null;
  const okNum = (x) => x && typeof x.v === 'number' && Number.isFinite(x.v);
  for (const k in S) if (st.S && typeof st.S[k] === typeof S[k]) S[k] = st.S[k];
  for (const n of VARS) if (st.vars && okNum(st.vars[n])) setVar(n, st.vars[n]);
  if (okNum(st.ans)) mem.ans = st.ans;
  if (Array.isArray(st.lists)) mem.lists = st.lists.map((l) => (Array.isArray(l) ? l.filter(okNum) : []));
  if (Array.isArray(st.listSub)) mem.listSub = st.listSub.map((s) => (typeof s === 'string' ? s : ''));
  if (st.mats && typeof st.mats === 'object') {
    for (const n in st.mats) if (/^[A-Z]$/.test(n) && Array.isArray(st.mats[n]) && st.mats[n].length && st.mats[n].every((r) => Array.isArray(r) && r.length === st.mats[n][0].length && r.every(okNum))) mem.mats[n] = st.mats[n];
  }
  for (const id in UI.apps) if (UI.apps[id].load && st.apps && st.apps[id]) { try { UI.apps[id].load(st.apps[id]); } catch (e) { /* повреждённые данные режима пропускаем */ } }
  return st;
}

// ---------- тема: как в системе / светлая / тёмная ----------
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === (t || 'auto'))));
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = dark ? '#000000' : '#d9dde3'; });
}
applyTheme(store.get('theme', 'auto'));
document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
  store.set('theme', b.dataset.themeSet);
  applyTheme(b.dataset.themeSet);
}));

// ---------- отклик клавиш (вибрация, где она есть) ----------
function applyVib(on) {
  UI.vib = on;
  document.querySelectorAll('[data-vib-set]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.vibSet === 'on') === on)));
}
applyVib(store.get('vib', true));
document.querySelectorAll('[data-vib-set]').forEach((b) => b.addEventListener('click', () => {
  store.set('vib', b.dataset.vibSet === 'on');
  applyVib(b.dataset.vibSet === 'on');
  if (UI.vib && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* нет вибрации */ } }
}));
if (!navigator.vibrate) $('#vib-row').hidden = true;

// ---------- окно настроек приложения ----------
const sheet = $('#sheet');
$('#more').addEventListener('click', () => { sheet.hidden = false; });
$('#sheet-close').addEventListener('click', () => { sheet.hidden = true; });
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.hidden = true; });

// ---------- самообновление ----------
// В начале index.html лежит метка сборки <meta name="app-build">, её ставит tools/stamp.py.
// При открытии, при возврате в приложение и раз в 10 минут скачиваем начало свежего index.html (несколько КБ)
// и сравниваем метки. Нашлась новая сборка: если человек ничем не занят — перезагружаемся сразу,
// если занят (см. isBusy) — показываем плашку с кнопкой.
const BUILD = (document.querySelector('meta[name="app-build"]') || {}).content || '';
const UPD_ON = !!BUILD && BUILD !== 'dev' && /^https?:$/.test(location.protocol);
const UPD_KEY = APP_KEY + ':upd';
let updNew = null, updAt = 0, updBusy = false, updGoing = false;
$('#ver').textContent = BUILD || '—';

// «Посреди работы»: калькулятором пользовались в последние полторы минуты или открыто окно настроек.
// Состояние калькулятора сохраняется после каждого нажатия, так что обновление ничего не теряет.
window.appBusy = () => Date.now() - UI.lastKeyAt < 90000 || !sheet.hidden;
function isBusy() {
  const a = document.activeElement;
  if (a && (a.matches('input, textarea, select') || a.isContentEditable)) return true;
  try { return !!window.appBusy(); } catch (e) { return false; }
}

const updGet = () => { try { return JSON.parse(sessionStorage.getItem(UPD_KEY) || 'null'); } catch (e) { return null; } };
const updPut = (v) => { try { if (v) sessionStorage.setItem(UPD_KEY, JSON.stringify(v)); else sessionStorage.removeItem(UPD_KEY); } catch (e) { /* нет хранилища */ } };

async function updCheck(force) {
  if (!UPD_ON || updBusy || updGoing || (!force && Date.now() - updAt < 60000) || navigator.onLine === false) return null;
  updBusy = true; updAt = Date.now();
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const tm = setTimeout(() => ctl && ctl.abort(), 9000);
  let found = null;
  try {
    // ?upd=время — чтобы не получить старую копию из кэша браузера, GitHub Pages или офлайн-копии
    const r = await fetch(location.pathname + '?upd=' + Date.now(), { cache: 'no-store', headers: { Range: 'bytes=0-4095' }, signal: ctl ? ctl.signal : undefined });
    let txt = '';
    if (r.body && r.body.getReader && typeof TextDecoder === 'function') {
      const rd = r.body.getReader(), dec = new TextDecoder();
      while (txt.length < 16384) {
        const x = await rd.read();
        if (x.done) break;
        txt += dec.decode(x.value, { stream: true });
        if (/name="app-build" content="[^"]*"/.test(txt)) break;
      }
      try { rd.cancel(); } catch (e) { /* уже закрыт */ }
    } else txt = (await r.text()).slice(0, 16384);
    const m = (r.ok || r.status === 206) && txt.match(/name="app-build" content="([^"]+)"/);
    if (m && m[1] !== BUILD && m[1] !== 'dev') { found = updNew = m[1]; updTick(); }
  } catch (e) { /* нет связи — проверим в следующий раз */ }
  clearTimeout(tm); updBusy = false;
  return found;
}

function updTick() {
  if (!updNew || updGoing) return;
  const tried = updGet();
  // защита от петли: если уже дважды за 10 минут пытались обновиться до этой сборки — только плашка
  const looping = tried && tried.to === updNew && tried.n >= 2 && Date.now() - tried.at < 600000;
  if (isBusy() || looping) updBar(true); else updGo();
}

function updGo() {
  if (!updNew || updGoing) return;
  updGoing = true;
  clearTimeout(saveTimer);
  saveState();
  const tried = updGet();
  updPut({ to: updNew, at: Date.now(), n: tried && tried.to === updNew ? (tried.n || 0) + 1 : 1 });
  toast('Updating…', 2000);
  setTimeout(() => location.replace(location.pathname + '?v=' + encodeURIComponent(updNew) + location.hash), 600);
}

function updBar(on) {
  let el = document.getElementById('updbar');
  if (!on) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'updbar';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span><b>New version available</b><small>Takes a couple of seconds</small></span>'
    + '<button type="button" class="btn" data-upd="go">Update</button>'
    + '<button type="button" class="x" data-upd="x" aria-label="Later">✕</button>';
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-upd]');
    if (!b) return;
    if (b.dataset.upd === 'go') updGo(); else { el.remove(); updNew = null; }
  });
  document.body.appendChild(el);
}

$('#checkupd').addEventListener('click', async () => {
  if (!UPD_ON) { toast('Works on the website only'); return; }
  toast('Checking…', 1200);
  const f = await updCheck(true);
  if (!f) toast('This is the latest version');
});

// ---------- работа без интернета ----------
// sw.js хранит копию страницы; после первого открытия калькулятор запускается и без сети.
function swStart() {
  const note = $('#offline-note');
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const show = () => { note.textContent = navigator.serviceWorker.controller ? 'Offline use: ready.' : ''; };
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(show).catch(() => { /* без офлайна тоже работает */ });
  navigator.serviceWorker.addEventListener('controllerchange', show);
  show();
}

// ---------- запуск ----------
function boot() {
  buildKeys();
  lcd.init($('#lcd'));
  const st = loadState();
  openApp(st && UI.apps[st.app] ? st.app : 'menu');
  layoutCalc();
  let rz = 0;
  const relayout = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layoutCalc); };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(layoutCalc, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCalc);
  setInterval(() => { UI.blink = !UI.blink; if (UI.sawCursor && sheet.hidden) redraw(); }, 500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { clearTimeout(saveTimer); saveState(); } });
  window.addEventListener('pagehide', () => { clearTimeout(saveTimer); saveState(); });

  if (UPD_ON) {
    const was = updGet();
    if (was && was.to === BUILD) { updPut(null); setTimeout(() => toast('Updated'), 500); }
    // убираем ?v=… из адреса после обновления
    if (/[?&]v=/.test(location.search) && history.replaceState) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* не страшно */ } }
    setTimeout(() => updCheck(true), 1500);
    setInterval(() => { if (document.visibilityState === 'visible') updCheck(); }, 600000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updCheck(true); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) updCheck(true); });
    window.addEventListener('online', () => updCheck(true));
  }
  swStart();
}
boot();

// для проверок (tools/check.js и tests/)
window.__upd = { get build() { return BUILD; }, get on() { return UPD_ON; }, get found() { return updNew; }, check: () => updCheck(true), busy: isBusy };
window.__calc = {
  press, UI, S, mem, lcd,
  keys(list) { for (const id of String(list).trim().split(/\s+/)) if (id) press(id); },
  text() { redraw(); return lcd.log.slice(); },
  idle() { UI.lastKeyAt = 0; },
  wipe() { saveOff = true; clearTimeout(saveTimer); try { localStorage.clear(); } catch (e) { /* нет хранилища */ } }
};
