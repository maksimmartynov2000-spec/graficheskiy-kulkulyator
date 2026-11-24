// ══════ 00-util.js — общее: ошибки, особые знаки, настройки, память калькулятора ══════

class CalcError extends Error {
  constructor(type, pos) { super(type); this.type = type; this.pos = pos; }
}
const fail = (type, pos) => { throw new CalcError(type, pos); };

// Особые знаки экрана: один символ — одно знакоместо, рисуются вручную (см. 30-lcd.js)
const G = {
  INV: '',   // ⁻¹
  NEG: '',   // минус числа — клавиша (−)
  TEN: '',   // маленькое «10» (10^x в строчном вводе)
  XRT: '',   // ˣ√
  CBRT: '',  // ³√
  FRC: '',   // ⌟ — черта дроби в строчном вводе
  EE: '',    // ᴇ — «на десять в степени»
  XBAR: '',  // x̄
  YBAR: '',  // ȳ
  RAD: '',   // ʳ
  GRA: '',   // ᵍ
  XHAT: '',  // x̂
  YHAT: '',  // ŷ
  SQ: '',    // ² — клавиша x²
  PERM: '',  // P (nPr)
  COMB: '',  // C (nCr)
  YV: '',    // Y графика: Y1, Y2…
  SXN: '',   // σ с индексом x (σx)
  BOX: '',   // пустое место шаблона
  DX: ''     // «d» в d/dx (не переменная)
};

// Настройки экрана Setup — общие для всех режимов
const S = {
  io: 'Math',        // Input/Output: Math | Line
  frac: 'd/c',       // Frac Result: d/c | ab/c
  funcType: 'Y=',    // Func Type
  drawType: 'Connect', // Draw Type: Connect | Plot
  deriv: 'Off',      // Derivative
  angle: 'Rad',      // Angle: Deg | Rad | Gra
  coord: 'On',       // Coord
  grid: 'Off',       // Grid: Off | On | Line
  axes: 'On',        // Axes: On | Off | Scale
  label: 'Off',      // Label
  disp: 'Norm',      // Display: Fix | Sci | Norm
  dispN: 1,
  graphFunc: 'On',   // Graph Func
  statWind: 'Auto',  // Stat Wind
  q1q3: 'Std',       // Q1Q3 Type: Std | OnData
  tableVar: 'Range', // Variable (Table)
  ineq: 'Union',     // Ineq Type
  simul: 'On'        // Simul Graph
};

// Переменные A–Z, r, θ
const VARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'r', 'θ'];
const VIX = {};
VARS.forEach((n, i) => { VIX[n] = i; });
const fv = new Float64Array(VARS.length);   // значения переменных для быстрого счёта (графики)

const mem = {
  vars: {},        // имя → число {v, ex, dec}
  ans: null,       // последний ответ (число)
  listAns: null,
  matAns: null,
  lists: [],       // List 1…26: массивы чисел
  listSub: [],     // подписи списков (SUB)
  mats: {},        // Mat A…Z
  fn: []           // функции Y1…Y20 (см. 65-func.js)
};
