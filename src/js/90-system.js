// ══════ 90-system.js — режим System: версия и сброс памяти ══════

function resetSetup() {
  Object.assign(S, S_DEF);
  vwSet('INITIAL');
  ZOOM_FACT.x = 2; ZOOM_FACT.y = 2;
  plotVer++;
}
function resetMain() {
  mem.vars = {}; fv.fill(0);
  mem.ans = null; mem.listAns = null; mem.matAns = null;
  mem.lists = []; mem.listSub = []; mem.mats = {};
  mem.fn = Array.from({ length: 20 }, (_, i) => newFn(i));
  fnTouch(); plotVer++;
  for (const id in UI.apps) if (UI.apps[id].reset) UI.apps[id].reset();
}

const systemApp = {
  menu: null, page: 'main',
  enter() {
    this.page = 'main';
    const done = (text) => () => infoBox([text, '', 'Press:[EXIT]']);
    this.menu = new FMenu([
      null, null, null,
      mi('VERSION', () => { this.page = 'version'; }),
      mi('RESET', [
        mi('SETUP', () => confirmBox(['Reset Setup Data?', ''], () => { resetSetup(); done('Reset!')(); })),
        mi('MAIN', () => confirmBox(['Reset Main', 'Memories?'], () => { resetMain(); done('Reset!')(); })),
        null, null, null,
        mi('ALL', () => confirmBox(['Initialize All?', ''], () => { resetSetup(); resetMain(); done('Initialized!')(); }))
      ])
    ]);
  },
  key(k) {
    if (this.page === 'version') { if (k.id === 'EXIT' || k.id === 'EXE' || k.id === 'AC') this.page = 'main'; return; }
    const f = fIndex(k);
    if (f >= 0) { const it = this.menu.press(f); if (it && it.fn) it.fn(); return; }
    if (k.id === 'EXIT') this.menu.back();
  },
  draw() {
    statusBar([]);
    if (this.page === 'version') {
      const b = (document.querySelector('meta[name="app-build"]') || {}).content || '';
      lcd.text(0, 24, 'Version');
      lcd.text(18, 72, 'Graphing Calculator');
      lcd.text(18, 96, 'Build');
      lcd.mini(18, 124, b, { px: 15 });
      lcd.text(18, 168, 'Press:[EXIT]');
      return;
    }
    lcd.text(0, 24, 'System Manager');
    if (this.menu.depth === 1) {
      lcd.text(18, 72, 'F4:Version');
      lcd.text(18, 96, 'F5:Reset');
    } else {
      lcd.text(18, 72, 'F1:Setup Data');
      lcd.text(18, 96, 'F2:Main Memory');
      lcd.text(18, 120, 'F6:Initialize All');
    }
    lcd.fmenu(this.menu.labels());
  }
};
UI.apps.system = systemApp;
runApp.reset = function () { this.hist = []; this.sel = -1; if (this.ed) this.ed.clear(); };
