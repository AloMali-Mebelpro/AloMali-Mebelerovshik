import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   МЕБЕЛИРОВЩИК PRO 5.0
   Купе: каждая дверь ездит отдельно в свою сторону · Петли видны
   в 3D · Сетка/рулетка/авторазмеры в 3D · Скрытие стен · Светильники
   с люменами и настоящим светом + тени + рендер-снимок · Полки и
   штанги по секциям · Смета: основная / по изделиям / для клиента,
   зарплата, НДС, валюта с курсом · Калькулятор
   ═══════════════════════════════════════════════════════════════ */

const SHEET_W = 2800, SHEET_H = 2070, KERF = 4, T = 16;

const CORPUS_MATS = [
  { id: "oak",      name: "ЛДСП Дуб Сонома",  hex: "#c9a06a", price: 27 },
  { id: "white",    name: "ЛДСП Белый",       hex: "#f0eee8", price: 24 },
  { id: "graphite", name: "ЛДСП Графит",      hex: "#4a4d52", price: 28 },
  { id: "walnut",   name: "ЛДСП Орех",        hex: "#7a5230", price: 29 },
];
const FACADE_MATS = [
  { id: "f-oak",     name: "ЛДСП Дуб Сонома",        hex: "#c9a06a", kind: "ldsp", ldspId: "oak" },
  { id: "f-white",   name: "ЛДСП Белый",             hex: "#f0eee8", kind: "ldsp", ldspId: "white" },
  { id: "f-graphite",name: "ЛДСП Графит",            hex: "#4a4d52", kind: "ldsp", ldspId: "graphite" },
  { id: "f-emwhite", name: "МДФ эмаль Белый глянец", hex: "#f5f5f1", kind: "mdf", priceM2: 42 },
  { id: "f-sage",    name: "МДФ эмаль Шалфей",       hex: "#93a389", kind: "mdf", priceM2: 42 },
  { id: "f-navy",    name: "МДФ эмаль Графит синий", hex: "#3d4c5f", kind: "mdf", priceM2: 44 },
  { id: "f-cashmere",name: "МДФ плёнка Кашемир",     hex: "#d9d0c3", kind: "mdf", priceM2: 26 },
  { id: "f-kraft",   name: "МДФ плёнка Дуб крафт",   hex: "#b08d5f", kind: "mdf", priceM2: 27 },
  { id: "f-gl-iod",  name: "Стекло йодовое",         hex: "#6e5a48", kind: "glass", priceM2: 52 },
  { id: "f-gl-mat",  name: "Стекло матовое",         hex: "#dfe4e6", kind: "glass", priceM2: 47 },
  { id: "f-gl-graph",name: "Стекло графит",          hex: "#4b5258", kind: "glass", priceM2: 50 },
];
const COUNTER_MATS = [
  { id: "stone",  name: "Камень серый",  hex: "#8d8d88", priceM: 32 },
  { id: "marble", name: "Мрамор белый",  hex: "#e9e7e2", priceM: 38 },
  { id: "woodtop",name: "Дуб светлый",   hex: "#c8a878", priceM: 24 },
  { id: "dark",   name: "Гранит тёмный", hex: "#3f3f3d", priceM: 34 },
];
const BACK_OPTIONS = [
  { id: "hdf", name: "ХДФ 3 мм (экономично)" },
  { id: "ldsp", name: "ЛДСП 16 мм (как корпус)" },
  { id: "none", name: "Без задней стенки" },
];
const SCOPE_OPTIONS = [
  { id: "all", name: "Во всех секциях" },
  { id: "left", name: "Только левая секция" },
  { id: "right", name: "Только правая секция" },
];
const HANDLE_STYLES = [
  { id: "skoba", name: "Скоба" }, { id: "profile", name: "Профиль по кромке" },
  { id: "knob", name: "Кноб (круглая)" }, { id: "none", name: "Push-up (без ручек)" },
];
const HANDLE_FINISH = [
  { id: "chrome", name: "Хром", hex: "#c9ccd1" },
  { id: "black", name: "Чёрный", hex: "#26262a" },
  { id: "gold", name: "Латунь", hex: "#c8a04b" },
];
const APPLIANCE_COLORS = [
  { id: "steel", name: "Сталь", hex: "#b7bcc2" },
  { id: "white", name: "Белый", hex: "#f2f2ef" },
  { id: "black", name: "Чёрный", hex: "#2e2e31" },
];
const FLOOR_COLORS = [
  { id: "oakf", name: "Дуб", hex: "#a9825a" }, { id: "grayf", name: "Серый", hex: "#8a8a86" },
  { id: "tile", name: "Плитка", hex: "#cfcac0" }, { id: "dark", name: "Венге", hex: "#5a4634" },
];
const WALL_COLORS = [
  { id: "warm", name: "Тёплый белый", hex: "#e6e0d4" }, { id: "gray", name: "Светло-серый", hex: "#cfd2d4" },
  { id: "sage", name: "Шалфей", hex: "#b9c4b1" }, { id: "sand", name: "Песочный", hex: "#d9c9ab" },
  { id: "blue", name: "Пыльный синий", hex: "#a9bccb" },
];
const CURRENCIES = [
  { code: "USD", sym: "$", rate: 1 },
  { code: "UZS", sym: "сум", rate: 12600 },
  { code: "RUB", sym: "₽", rate: 79 },
  { code: "EUR", sym: "€", rate: 0.92 },
];
const byId = (arr, id) => arr.find((m) => m.id === id) || arr[0];
const hex2num = (h) => parseInt((h || "#888888").slice(1), 16);
const isTex = (id) => typeof id === "string" && id.startsWith("tex:");

function resolveCorpus(id, customTex) {
  if (isTex(id)) {
    const t = (customTex || []).find((x) => x.id === id);
    return t ? { id, name: t.name, hex: t.hex, price: t.priceSheet, tex: t.url } : CORPUS_MATS[0];
  }
  return byId(CORPUS_MATS, id);
}
function resolveFacade(id, customTex) {
  if (isTex(id)) {
    const t = (customTex || []).find((x) => x.id === id);
    return t ? { id, name: t.name, hex: t.hex, kind: "tex", priceM2: t.priceM2, tex: t.url } : FACADE_MATS[0];
  }
  return byId(FACADE_MATS, id);
}
const scopeCnt = (sections, scope) => (scope === "all" || !scope ? sections : 1);
const scopeHas = (s, sections, scope) =>
  scope === "all" || !scope ? true : scope === "left" ? s === 0 : s === sections - 1;

const STANDARDS = {
  euro: { name: "Евростандарт", baseH: 860, baseD: 560, wallH: 720, wallD: 320, wallMount: 1450, tallH: 2200, wardH: 2400, wardD: 600, tvH: 450 },
  sng:  { name: "СНГ (ГОСТ)",   baseH: 850, baseD: 500, wallH: 700, wallD: 300, wallMount: 1400, tallH: 2100, wardH: 2200, wardD: 520, tvH: 420 },
  asia: { name: "Азия",         baseH: 800, baseD: 500, wallH: 650, wallD: 300, wallMount: 1350, tallH: 2000, wardH: 2000, wardD: 450, tvH: 400 },
};
function applyStandard(cfg, stdId) {
  const s = STANDARDS[stdId];
  if (!s || cfg.kind !== "cabinet") return cfg;
  const c = { ...cfg };
  if ((c.mount || 0) > 800) { c.H = s.wallH; c.D = s.wallD; c.mount = s.wallMount; }
  else if (c.counter) { c.H = s.baseH; c.D = s.baseD; }
  else if (c.H > 1500) { c.H = c.H > 2000 ? s.wardH : s.tallH; c.D = s.wardD; }
  else if (c.H <= 600) { c.H = s.tvH; }
  return c;
}

const defHandle = { style: "skoba", finish: "black", ox: 50, oy: 60, orient: "auto" };
const cabBase = (over = {}) => ({
  kind: "cabinet", W: 600, H: 850, D: 560, plinth: 100, mount: 0,
  counter: true, counterMat: "stone", island: false, sink: false,
  rod: false, rodY: 0, rodScope: "all", shelfScope: "all", backMat: "hdf",
  sections: 1, shelves: 1, facade: "doors", doorType: "hinged", doors: 1, drawers: 0,
  hingesPerDoor: 0,
  corpusMat: "white", facadeMat: "f-kraft", handle: { ...defHandle }, ...over,
});
const lightBase = (sub, over = {}) => ({
  kind: "light", sub, W: 400, H: 300, D: 400, mount: 2200,
  lumens: 1500, on: true, lightWarm: 0.6, price: 4500, color: "black", ...over,
});
const CATALOG = [
  { cat: "Кухня", items: [
    { id: "kb600",  name: "Нижний модуль 600",  icon: "🚪", cfg: cabBase() },
    { id: "kb800",  name: "Нижний модуль 800",  icon: "🚪", cfg: cabBase({ W: 800, doors: 2 }) },
    { id: "kdrw",   name: "Модуль с ящиками",   icon: "🗄", cfg: cabBase({ facade: "drawers", doors: 0, drawers: 3, shelves: 0 }) },
    { id: "ksink",  name: "Модуль под мойку",   icon: "🚰", cfg: cabBase({ W: 800, doors: 2, sink: true, shelves: 1 }) },
    { id: "kwall",  name: "Навесной шкаф",      icon: "🗃", cfg: cabBase({ W: 800, H: 720, D: 320, plinth: 0, mount: 1450, counter: false, doors: 2 }) },
    { id: "ktall",  name: "Пенал (духовка)",    icon: "🏢", cfg: cabBase({ H: 2100, counter: false, shelves: 3, doors: 1, ovenSlot: true }) },
    { id: "kisland",name: "Остров",             icon: "🏝", cfg: cabBase({ W: 1600, D: 900, island: true, doors: 3, sections: 3 }) },
    { id: "fridge", name: "Холодильник", icon: "🧊", cfg: { kind: "appliance", sub: "fridge", W: 600, H: 1850, D: 650, mount: 0, color: "steel", price: 550 } },
    { id: "stove",  name: "Плита",       icon: "🔥", cfg: { kind: "appliance", sub: "stove", W: 600, H: 850, D: 600, mount: 0, color: "steel", price: 320 } },
    { id: "dw",     name: "Посудомойка", icon: "🫧", cfg: { kind: "appliance", sub: "dw", W: 450, H: 850, D: 600, mount: 0, color: "steel", price: 340 } },
    { id: "hood",   name: "Вытяжка",     icon: "💨", cfg: { kind: "appliance", sub: "hood", W: 600, H: 450, D: 350, mount: 1500, color: "steel", price: 140 } },
    { id: "wash",   name: "Стиральная",  icon: "🌀", cfg: { kind: "appliance", sub: "wash", W: 600, H: 850, D: 600, mount: 0, color: "white", price: 280 } },
  ]},
  { cat: "Спальня · Гостиная", items: [
    { id: "wardrobe", name: "Шкаф распашной", icon: "🚪", cfg: cabBase({ W: 1200, H: 2100, D: 560, plinth: 80, counter: false, sections: 2, shelves: 4, doors: 2, rod: true, facadeMat: "f-white", corpusMat: "oak" }) },
    { id: "kupe",     name: "Шкаф-купе",      icon: "🚃", cfg: cabBase({ W: 1800, H: 2400, D: 600, plinth: 80, counter: false, sections: 3, shelves: 3, doors: 2, doorType: "sliding", rod: true, facadeMat: "f-gl-graph", corpusMat: "oak" }) },
    { id: "penal",    name: "Пенал",          icon: "🏢", cfg: cabBase({ W: 600, H: 2100, D: 560, plinth: 80, counter: false, shelves: 5, doors: 1, facadeMat: "f-white", corpusMat: "oak" }) },
    { id: "komod",    name: "Комод",          icon: "🗄", cfg: cabBase({ W: 900, H: 900, D: 450, plinth: 60, counter: false, facade: "drawers", doors: 0, drawers: 4, shelves: 0, facadeMat: "f-cashmere", corpusMat: "oak" }) },
    { id: "tumba",    name: "Тумба",          icon: "🛏", cfg: cabBase({ W: 450, H: 450, D: 400, plinth: 40, counter: false, facade: "drawers", doors: 0, drawers: 2, shelves: 0, corpusMat: "oak", facadeMat: "f-cashmere" }) },
    { id: "tv",       name: "Тумба ТВ",       icon: "📺", cfg: cabBase({ W: 1600, H: 450, D: 400, plinth: 50, counter: false, sections: 3, shelves: 0, doors: 3, corpusMat: "graphite", facadeMat: "f-kraft" }) },
    { id: "stellazh", name: "Стеллаж",        icon: "📚", cfg: cabBase({ W: 900, H: 1800, D: 350, plinth: 50, counter: false, sections: 2, shelves: 4, facade: "none", doors: 0, corpusMat: "oak" }) },
    { id: "bed",   name: "Кровать", icon: "🛏", cfg: { kind: "furniture", sub: "bed", W: 1700, H: 950, D: 2100, mount: 0, color: "steel", fabric: "#8b93a3", price: 420 } },
    { id: "table", name: "Стол",    icon: "🪑", cfg: { kind: "furniture", sub: "table", W: 1200, H: 760, D: 650, mount: 0, color: "steel", fabric: "#b08d5f", price: 150 } },
    { id: "sofa",  name: "Диван",   icon: "🛋", cfg: { kind: "furniture", sub: "sofa", W: 2100, H: 850, D: 950, mount: 0, color: "steel", fabric: "#6f7d8f", price: 480 } },
    { id: "chair", name: "Стул",    icon: "🪑", cfg: { kind: "furniture", sub: "chair", W: 450, H: 900, D: 500, mount: 0, color: "steel", fabric: "#5a4634", price: 45 } },
    { id: "armch", name: "Кресло",  icon: "💺", cfg: { kind: "furniture", sub: "armchair", W: 850, H: 800, D: 850, mount: 0, color: "steel", fabric: "#8a9b7a", price: 220 } },
  ]},
  { cat: "Санфаянс", items: [
    { id: "wc",    name: "Унитаз",          icon: "🚽", cfg: { kind: "furniture", sub: "wc", W: 370, H: 780, D: 640, mount: 0, color: "white", fabric: "#f2f2ef", price: 120 } },
    { id: "basin", name: "Раковина-тюльпан", icon: "🚿", cfg: { kind: "furniture", sub: "basin", W: 550, H: 850, D: 450, mount: 0, color: "white", fabric: "#f2f2ef", price: 90 } },
    { id: "bath",  name: "Ванна",           icon: "🛁", cfg: { kind: "furniture", sub: "bath", W: 1700, H: 580, D: 750, mount: 0, color: "white", fabric: "#f2f2ef", price: 350 } },
  ]},
  { cat: "Примитивы", items: [
    { id: "pbox", name: "Параллелепипед", icon: "◻", cfg: { kind: "prim", shape: "box", W: 600, H: 600, D: 600, mount: 0, fabric: "#9aa3b5", price: 0 } },
    { id: "pcyl", name: "Цилиндр",        icon: "⬤", cfg: { kind: "prim", shape: "cyl", W: 500, H: 800, D: 500, mount: 0, fabric: "#9aa3b5", price: 0 } },
    { id: "ppod", name: "Подиум",         icon: "▬", cfg: { kind: "prim", shape: "box", W: 2000, H: 180, D: 1200, mount: 0, fabric: "#b08d5f", price: 0 } },
  ]},
  { cat: "Свет", items: [
    { id: "lustre", name: "Люстра потолочная", icon: "💡", cfg: lightBase("ceiling", { W: 450, H: 350, D: 450, mount: 2150, lumens: 3000, price: 90 }) },
    { id: "bra",    name: "Бра настенное",     icon: "🕯", cfg: lightBase("wall", { W: 180, H: 260, D: 200, mount: 1800, lumens: 800, price: 35 }) },
    { id: "lampT",  name: "Настольная лампа",  icon: "🛋", cfg: lightBase("table", { W: 220, H: 450, D: 220, mount: 0, lumens: 600, price: 25 }) },
    { id: "spot",   name: "Трек-спот",         icon: "🔦", cfg: lightBase("spot", { W: 120, H: 200, D: 120, mount: 2550, lumens: 1200, price: 40 }) },
  ]},
];
const catItem = (id) => CATALOG.flatMap((c) => c.items).find((t) => t.id === id);

/* ── деталировка ── */
function computeParts(cfg, itemName, customTex) {
  if (cfg.kind !== "cabinet") return [];
  const { W, H, D, plinth, sections, shelves } = cfg;
  const innerW = W - 2 * T, innerH = H - plinth - 2 * T;
  const sectionW = Math.round((innerW - (sections - 1) * T) / sections);
  const parts = [];
  const add = (name, l, w, qty, edge, matId, matKind, note = "") =>
    parts.push({ item: itemName, name, l: Math.round(l), w: Math.round(w), qty, edge: Math.round(edge), matId, matKind, note });
  const cm = cfg.corpusMat;
  add("Боковина", H, D, 2, H, cm, "ldsp");
  add("Крыша", innerW, D, 1, innerW, cm, "ldsp");
  add("Дно", innerW, D, 1, innerW, cm, "ldsp");
  if (plinth > 0 && cfg.mount === 0) add("Цоколь", innerW, plinth, 1, innerW, cm, "ldsp");
  if (sections > 1) add("Перегородка", innerH, D - 20, sections - 1, innerH, cm, "ldsp");
  const shQty = shelves * scopeCnt(sections, cfg.shelfScope);
  if (shQty > 0) add("Полка", sectionW - 2, D - 20, shQty, sectionW - 2, cm, "ldsp", "съёмная");
  if (cfg.backMat === "ldsp") add("Задняя стенка", Math.min(H - plinth - 2, 2790), W - 2, 1, 0, cm, "ldsp");
  const fm = resolveFacade(cfg.facadeMat, customTex);
  const fMatId = fm.kind === "ldsp" ? fm.ldspId : fm.id;
  const fKind = fm.kind === "ldsp" ? "ldsp" : fm.kind;
  if (cfg.facade === "doors" && cfg.doors > 0) {
    const slide = cfg.doorType === "sliding";
    const dw = slide ? Math.round(W / cfg.doors + 30) : Math.round((W - 4) / cfg.doors - 2);
    const dh = H - plinth - (slide ? 60 : 4);
    add(slide ? "Дверь-купе" : "Фасад дверь", dh, dw, cfg.doors, fKind === "glass" ? 0 : 2 * (dh + dw), fMatId, fKind, fm.name);
  }
  if (cfg.facade === "drawers" && cfg.drawers > 0) {
    const total = H - plinth - 4 - 3 * (cfg.drawers - 1);
    const fh = Math.round(total / cfg.drawers), fw = W - 4;
    add("Фасад ящика", fw, fh, cfg.drawers, fKind === "glass" ? 0 : 2 * (fw + fh), fMatId, fKind, fm.name);
    add("Боковина ящика", D - 80, 120, cfg.drawers * 2, 0, cm, "ldsp");
    add("Царга ящика", innerW - 90, 120, cfg.drawers * 2, 0, cm, "ldsp");
  }
  return parts;
}

function fasteners(cfg) {
  if (cfg.kind !== "cabinet") return null;
  const conf = 8 + (cfg.plinth > 0 && cfg.mount === 0 ? 2 : 0) + (cfg.sections - 1) * 4
    + (cfg.facade === "drawers" ? cfg.drawers * 8 : 0);
  const shelfPins = cfg.shelves * scopeCnt(cfg.sections, cfg.shelfScope) * 4;
  const dowels = 4 + cfg.sections * 2;
  const selftap = cfg.backMat === "hdf" ? Math.ceil(2 * (cfg.W + cfg.H) / 150) : 0;
  const autoH = cfg.H > 2000 ? 5 : cfg.H > 1000 ? 4 : 2;
  const hinges = cfg.facade === "doors" && cfg.doorType === "hinged"
    ? cfg.doors * (cfg.hingesPerDoor > 0 ? cfg.hingesPerDoor : autoH) : 0;
  const rollers = cfg.facade === "doors" && cfg.doorType === "sliding" ? cfg.doors * 2 : 0;
  const fronts = cfg.facade === "doors" ? cfg.doors : cfg.facade === "drawers" ? cfg.drawers : 0;
  const push = (cfg.handle?.style || "skoba") === "none" ? fronts : 0;
  return { conf, shelfPins, dowels, selftap, hinges, rollers, autoH, push, fronts };
}

function nestParts(flat) {
  const items = [];
  flat.forEach((pt) => Array.from({ length: pt.qty }).forEach(() => items.push({ l: pt.l, w: pt.w, name: pt.name })));
  items.forEach((it) => { if (it.w > it.l) [it.l, it.w] = [it.w, it.l]; });
  items.sort((a, b) => b.w - a.w || b.l - a.l);
  const sheets = [];
  items.forEach((it) => {
    let ok = false;
    for (const sh of sheets) {
      for (const row of sh.rows)
        if (it.w <= row.h && row.x + it.l + KERF <= SHEET_W) {
          sh.placed.push({ ...it, x: row.x, y: row.y }); row.x += it.l + KERF; ok = true; break;
        }
      if (ok) break;
      if (sh.usedH + it.w + KERF <= SHEET_H && it.l <= SHEET_W) {
        sh.placed.push({ ...it, x: 0, y: sh.usedH });
        sh.rows.push({ y: sh.usedH, h: it.w, x: it.l + KERF });
        sh.usedH += it.w + KERF; ok = true;
      }
      if (ok) break;
    }
    if (!ok) sheets.push({ placed: [{ ...it, x: 0, y: 0 }], rows: [{ y: 0, h: it.w, x: it.l + KERF }], usedH: it.w + KERF });
  });
  return sheets;
}

function footprint(it) {
  const r = ((it.pos.rot % 360) + 360) % 360, swap = r === 90 || r === 270;
  const w = swap ? it.cfg.D : it.cfg.W, d = swap ? it.cfg.W : it.cfg.D;
  return { x: it.pos.x - w / 2, y: it.pos.y - d / 2, w, d, r };
}
const overlaps = (a, b) => a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.d - 1 && a.y + a.d > b.y + 1;
const vRange = (it) => [it.cfg.mount || 0, (it.cfg.mount || 0) + it.cfg.H];
const vOverlap = (a, b) => { const A = vRange(a), B = vRange(b); return A[0] < B[1] - 1 && A[1] > B[0] + 1; };

/* ═══════════ 3D ═══════════ */
const S = 0.001;
const texCache = {};
function texMaterial(url, opts = {}) {
  if (!texCache[url]) {
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache[url] = t;
  }
  return new THREE.MeshStandardMaterial({ map: texCache[url], roughness: 0.6, metalness: 0.05, ...opts });
}
const std = (hex, opt = {}) => new THREE.MeshStandardMaterial({ color: hex2num(hex), roughness: 0.72, metalness: 0.05, ...opt });
const metal = (hex) => new THREE.MeshStandardMaterial({ color: hex2num(hex), roughness: 0.3, metalness: 0.75 });

function addBox(g, sx, sy, sz, x, y, z, mat, edges = true, ud) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sx, 0.002), Math.max(sy, 0.002), Math.max(sz, 0.002)), mat);
  m.position.set(x, y, z);
  if (ud) m.userData = { ...m.userData, ...ud };
  if (edges) {
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),
      new THREE.LineBasicMaterial({ color: 0x14120e, transparent: true, opacity: 0.28 }));
    m.add(eg);
  }
  g.add(m); return m;
}

function facadeMaterial(fm) {
  if (fm.kind === "glass") {
    return new THREE.MeshStandardMaterial({
      color: hex2num(fm.hex), transparent: true,
      opacity: fm.id === "f-gl-mat" ? 0.72 : 0.42,
      roughness: fm.id === "f-gl-iod" ? 0.12 : 0.3, metalness: 0.15,
    });
  }
  if (fm.tex) return texMaterial(fm.tex, { roughness: 0.5 });
  return std(fm.hex, fm.kind === "mdf" ? { roughness: 0.45 } : {});
}

function localHandle(pivot, cfg, doorLocalCx, doorTopLocal, doorW, doorH, zLocal, openSide, doorIdx) {
  const h = cfg.handle || defHandle;
  if (h.style === "none") return;
  const mat = metal(byId(HANDLE_FINISH, h.finish).hex);
  const ox = (h.ox ?? 50) * S, oy = (h.oy ?? 60) * S;
  const hx = openSide === "C" ? doorLocalCx : openSide === "R" ? doorLocalCx + doorW / 2 - ox : doorLocalCx - doorW / 2 + ox;
  const hy = doorTopLocal - oy;
  const ud = { doorHit: true, doorIdx };
  if (h.style === "knob") {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 20), mat);
    m.rotation.x = Math.PI / 2; m.position.set(hx, hy, zLocal + 0.015);
    m.userData = ud; pivot.add(m);
  } else if (h.style === "profile") {
    addBox(pivot, doorW, 0.024, 0.02, doorLocalCx, doorTopLocal - 0.012, zLocal + 0.008, mat, false, ud);
  } else {
    const vert = h.orient === "vert" || (h.orient === "auto" && doorH > 1 && openSide !== "C");
    if (vert) addBox(pivot, 0.013, 0.16, 0.028, hx, hy - 0.08, zLocal + 0.012, mat, false, ud);
    else addBox(pivot, 0.15, 0.013, 0.028, hx, hy, zLocal + 0.012, mat, false, ud);
  }
}

function buildCabinet(cfg, customTex, showFacades = true) {
  const g = new THREE.Group();
  const W = cfg.W * S, H = cfg.H * S, D = cfg.D * S, t = T * S, pl = (cfg.mount === 0 ? cfg.plinth : 0) * S;
  const cm = resolveCorpus(cfg.corpusMat, customTex);
  const fm = resolveFacade(cfg.facadeMat, customTex);
  const bodyMat = cm.tex ? texMaterial(cm.tex) : std(cm.hex);
  const facMat = facadeMaterial(fm);
  const innerW = W - 2 * t, innerH = H - pl - 2 * t;

  addBox(g, t, H, D, -(W - t) / 2, H / 2, 0, bodyMat);
  addBox(g, t, H, D, (W - t) / 2, H / 2, 0, bodyMat);
  addBox(g, innerW, t, D, 0, pl + t / 2, 0, bodyMat);
  addBox(g, innerW, t, D, 0, H - t / 2, 0, bodyMat);
  if (pl > 0) addBox(g, innerW, pl, t, 0, pl / 2, (D - t) / 2, std("#3a3126"));
  if (cfg.backMat !== "none")
    addBox(g, W - 0.004, H - pl - 0.004, cfg.backMat === "ldsp" ? t : 0.004, 0, pl + (H - pl) / 2,
      -D / 2 + (cfg.backMat === "ldsp" ? t / 2 : 0.002), std(cm.hex, { roughness: 0.9 }), false);

  const secW = (innerW - (cfg.sections - 1) * t) / cfg.sections;
  for (let i = 1; i < cfg.sections; i++)
    addBox(g, t, innerH, D - 0.02, -innerW / 2 + i * secW + (i - 0.5) * t, pl + t + innerH / 2, -0.01, bodyMat);
  for (let s2 = 0; s2 < cfg.sections; s2++) {
    const cx = -innerW / 2 + secW / 2 + s2 * (secW + t);
    if (scopeHas(s2, cfg.sections, cfg.shelfScope))
      for (let i = 1; i <= cfg.shelves; i++)
        addBox(g, secW - 0.002, t, D - 0.02, cx, pl + t + (innerH / (cfg.shelves + 1)) * i, -0.01, bodyMat);
    if (cfg.rod && scopeHas(s2, cfg.sections, cfg.rodScope)) {
      const rodY = cfg.rodY > 0 ? Math.min(cfg.rodY * S, pl + innerH) : pl + t + innerH - 0.12;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, secW - 0.02, 14), metal("#b9bdc2"));
      rod.rotation.z = Math.PI / 2;
      rod.position.set(cx, rodY, 0);
      g.add(rod);
    }
  }

  const zF = D / 2;
  const f = fasteners(cfg);
  if (showFacades && cfg.facade === "doors" && cfg.doors > 0) {
    if (cfg.doorType === "sliding") {
      /* купе: каждая дверь — свой пивот; левая половина ездит ВПРАВО, правая — ВЛЕВО (п.1) */
      const dw = W / cfg.doors + 0.03, dh = H - pl - 0.06;
      addBox(g, W, 0.02, 0.07, 0, H - 0.01, zF + 0.035, metal("#8d9298"), false);
      addBox(g, W, 0.02, 0.07, 0, pl + 0.01, zF + 0.035, metal("#8d9298"), false);
      for (let i = 0; i < cfg.doors; i++) {
        const laneZ = zF + (i % 2 === 0 ? 0.012 : 0.042);
        const cx = cfg.doors === 1 ? 0 : -W / 2 + dw / 2 + i * (W - dw) / (cfg.doors - 1);
        const dir = i < cfg.doors / 2 ? 1 : -1; // левая → вправо, правая → влево
        const pivot = new THREE.Group();
        pivot.position.set(cx, pl + 0.03 + dh / 2, laneZ);
        pivot.userData = { door: true, sliding: true, baseX: cx, cur: 0, doorIdx: i,
          slide: dir * Math.min(dw * 0.9, Math.max(W - dw, 0.2)) };
        addBox(pivot, dw, dh, 0.016, 0, 0, 0, facMat, true, { doorHit: true, doorIdx: i });
        const fr = metal("#9aa0a6");
        addBox(pivot, 0.02, dh, 0.02, -dw / 2 + 0.01, 0, 0.002, fr, false, { doorHit: true, doorIdx: i });
        addBox(pivot, 0.02, dh, 0.02, dw / 2 - 0.01, 0, 0.002, fr, false, { doorHit: true, doorIdx: i });
        g.add(pivot);
      }
    } else {
      const dw = (W - 0.004) / cfg.doors - 0.002, dh = H - pl - 0.004;
      for (let i = 0; i < cfg.doors; i++) {
        const x = -W / 2 + 0.002 + dw / 2 + i * (dw + 0.002);
        const hingeLeft = cfg.doors === 1 ? true : i < cfg.doors / 2;
        const pivot = new THREE.Group();
        pivot.position.set(hingeLeft ? x - dw / 2 : x + dw / 2, pl + dh / 2 + 0.002, zF + 0.011);
        pivot.userData = { door: true, sliding: false, doorIdx: i, openTarget: hingeLeft ? -1.72 : 1.72 };
        const localCx = hingeLeft ? dw / 2 : -dw / 2;
        addBox(pivot, dw, dh, 0.018, localCx, 0, 0, facMat, true, { doorHit: true, doorIdx: i });
        if (fm.kind === "glass") {
          const fr = metal("#9aa0a6");
          addBox(pivot, dw, 0.02, 0.02, localCx, dh / 2 - 0.01, 0.002, fr, false, { doorHit: true, doorIdx: i });
          addBox(pivot, dw, 0.02, 0.02, localCx, -dh / 2 + 0.01, 0.002, fr, false, { doorHit: true, doorIdx: i });
          addBox(pivot, 0.02, dh, 0.02, localCx - dw / 2 + 0.01, 0, 0.002, fr, false, { doorHit: true, doorIdx: i });
          addBox(pivot, 0.02, dh, 0.02, localCx + dw / 2 - 0.01, 0, 0.002, fr, false, { doorHit: true, doorIdx: i });
        }
        /* петли — видимые (п.2): чашка + плечо у кромки навески */
        const nH = f ? (cfg.hingesPerDoor > 0 ? cfg.hingesPerDoor : f.autoH) : 2;
        const hingeMat = metal("#c9ccd1");
        for (let k = 0; k < nH; k++) {
          const hy = nH === 1 ? 0 : -dh / 2 + 0.11 + k * (dh - 0.22) / (nH - 1);
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 18), hingeMat);
          cup.rotation.x = Math.PI / 2;
          cup.position.set(hingeLeft ? 0.028 : -0.028, hy, -0.012);
          pivot.add(cup);
          addBox(pivot, 0.05, 0.014, 0.012, hingeLeft ? 0.014 : -0.014, hy, -0.02, hingeMat, false);
        }
        localHandle(pivot, cfg, localCx, dh / 2, dw, dh, 0.009, hingeLeft ? "R" : "L", i);
        g.add(pivot);
      }
    }
  }
  if (showFacades && cfg.facade === "drawers" && cfg.drawers > 0) {
    const total = H - pl - 0.004 - 0.003 * (cfg.drawers - 1);
    const fh = total / cfg.drawers, fw = W - 0.004;
    for (let i = 0; i < cfg.drawers; i++) {
      const y = pl + 0.002 + fh / 2 + i * (fh + 0.003);
      const pivot = new THREE.Group();
      pivot.position.set(0, y, zF + 0.011);
      pivot.userData = { door: true, sliding: true, axis: "z", baseX: 0, cur: 0, doorIdx: i, slide: Math.min(cfg.D * S * 0.6, 0.45) };
      addBox(pivot, fw, fh, 0.018, 0, 0, 0, facMat, true, { doorHit: true, doorIdx: i });
      localHandle(pivot, cfg, 0, fh / 2, fw, fh, 0.009, "C", i);
      g.add(pivot);
    }
  }
  if (cfg.counter) {
    const cmat = byId(COUNTER_MATS, cfg.counterMat);
    const extraBack = cfg.island ? 0.3 : 0;
    addBox(g, W + 0.04, 0.038, D + 0.03 + extraBack, 0, H + 0.019, 0.015 - extraBack / 2, std(cmat.hex, { roughness: 0.35 }));
    if (cfg.sink) {
      addBox(g, 0.5, 0.02, 0.42, 0, H + 0.045, -0.02, metal("#9aa0a6"), false);
      const fct = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 14), metal("#c9ccd1"));
      fct.position.set(0.18, H + 0.19, -0.18); g.add(fct);
      addBox(g, 0.02, 0.02, 0.16, 0.18, H + 0.32, -0.1, metal("#c9ccd1"), false);
    }
  }
  if (cfg.ovenSlot) {
    addBox(g, W - 0.05, 0.55, 0.02, 0, pl + 0.75, D / 2 + 0.012, std("#2b2b2e", { metalness: 0.5, roughness: 0.3 }), false);
    addBox(g, W - 0.12, 0.014, 0.03, 0, pl + 0.98, D / 2 + 0.03, metal("#c9ccd1"), false);
  }
  g.position.y = (cfg.mount || 0) * S;
  return g;
}

/* светильники с настоящим источником света (п.5, 8) */
function buildLight(cfg) {
  const g = new THREE.Group();
  const W = cfg.W * S, H = cfg.H * S;
  const bodyHex = byId(APPLIANCE_COLORS, cfg.color).hex;
  const body = metal(bodyHex);
  const warm = cfg.lightWarm ?? 0.6;
  const lightColor = new THREE.Color().lerpColors(new THREE.Color(0xdfe8ff), new THREE.Color(0xffd9a0), warm);
  const glowMat = new THREE.MeshStandardMaterial({
    color: lightColor, emissive: lightColor,
    emissiveIntensity: cfg.on ? 1.2 : 0.05, roughness: 0.4,
  });
  const mountY = (cfg.mount || 0) * S;
  let srcY = mountY + H * 0.4;
  if (cfg.sub === "ceiling") {
    // подвес: шнур от потолка не рисуем (не знаем высоту) — плафон-конус + шар
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 6, H * 0.65, 24, 1, true),
      std(bodyHex, { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }));
    shade.position.y = mountY + H * 0.55; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(W / 6, 16, 12), glowMat);
    bulb.position.y = mountY + H * 0.3; g.add(bulb);
    addBox(g, 0.012, H * 0.4, 0.012, 0, mountY + H * 1.05, 0, body, false);
    srcY = mountY + H * 0.3;
  } else if (cfg.sub === "wall") {
    addBox(g, W * 0.5, H * 0.35, 0.03, 0, mountY + H * 0.4, 0, body, false);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(W / 2.4, W / 3.2, H * 0.5, 18, 1, true),
      std(bodyHex, { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }));
    shade.position.set(0, mountY + H * 0.65, 0.09); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(W / 5, 14, 10), glowMat);
    bulb.position.set(0, mountY + H * 0.6, 0.09); g.add(bulb);
    srcY = mountY + H * 0.6;
  } else if (cfg.sub === "table") {
    addBox(g, W * 0.7, 0.02, W * 0.7, 0, mountY + 0.01, 0, body, false);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, H * 0.55, 12), body);
    stem.position.y = mountY + H * 0.3; g.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 3, H * 0.35, 18, 1, true),
      std("#e8e2d4", { side: THREE.DoubleSide, roughness: 0.8 }));
    shade.position.y = mountY + H * 0.75; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(W / 6, 14, 10), glowMat);
    bulb.position.y = mountY + H * 0.68; g.add(bulb);
    srcY = mountY + H * 0.68;
  } else { // spot
    const can = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, H * 0.8, 16), body);
    can.position.y = mountY + H * 0.5; g.add(can);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(W / 2.4, W / 2.4, 0.008, 16), glowMat);
    bulb.position.y = mountY + H * 0.08; g.add(bulb);
    srcY = mountY + H * 0.05;
  }
  if (cfg.on && (cfg.lumens || 0) > 0) {
    const pt = new THREE.PointLight(lightColor, (cfg.lumens || 0) / 1400, 9, 2);
    pt.position.set(0, srcY, cfg.sub === "wall" ? 0.12 : 0);
    pt.castShadow = true;
    pt.shadow.mapSize.set(512, 512);
    pt.shadow.bias = -0.002;
    g.add(pt);
  }
  return g;
}

function buildAppliance(cfg) {
  const g = new THREE.Group();
  const W = cfg.W * S, H = cfg.H * S, D = cfg.D * S;
  const col = byId(APPLIANCE_COLORS, cfg.color).hex;
  const body = std(col, { metalness: cfg.color === "steel" ? 0.55 : 0.1, roughness: 0.35 });
  const dark = std("#232326", { metalness: 0.4, roughness: 0.3 });
  if (cfg.sub === "fridge") {
    addBox(g, W, H, D, 0, H / 2, 0, body);
    addBox(g, W - 0.02, 0.006, 0.02, 0, H * 0.62, D / 2 + 0.004, dark, false);
    addBox(g, 0.02, H * 0.3, 0.03, -W / 2 + 0.06, H * 0.78, D / 2 + 0.02, metal("#8d9298"), false);
    addBox(g, 0.02, H * 0.22, 0.03, -W / 2 + 0.06, H * 0.36, D / 2 + 0.02, metal("#8d9298"), false);
  } else if (cfg.sub === "stove") {
    addBox(g, W, H - 0.05, D, 0, (H - 0.05) / 2, 0, body);
    addBox(g, W, 0.05, D, 0, H - 0.025, 0, dark);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.015, 24), std("#111114"));
      c.position.set(a * W * 0.22, H + 0.008, b * D * 0.2); g.add(c);
    });
    addBox(g, W * 0.75, H * 0.45, 0.015, 0, H * 0.4, D / 2 + 0.008, std("#1a1a1e", { roughness: 0.2, metalness: 0.6 }), false);
    addBox(g, W * 0.8, 0.016, 0.03, 0, H * 0.72, D / 2 + 0.02, metal("#c9ccd1"), false);
  } else if (cfg.sub === "dw" || cfg.sub === "wash") {
    addBox(g, W, H, D, 0, H / 2, 0, body);
    if (cfg.sub === "wash") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 12, 32), dark);
      ring.position.set(0, H * 0.5, D / 2 + 0.01); g.add(ring);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.01, 28), std("#4a5560", { roughness: 0.15, metalness: 0.3 }));
      glass.rotation.x = Math.PI / 2; glass.position.set(0, H * 0.5, D / 2 + 0.012); g.add(glass);
      addBox(g, W * 0.8, 0.06, 0.01, 0, H * 0.9, D / 2 + 0.006, dark, false);
    } else {
      addBox(g, W - 0.02, H * 0.8, 0.012, 0, H * 0.45, D / 2 + 0.007, std(col, { metalness: 0.5, roughness: 0.3 }), false);
      addBox(g, W * 0.8, 0.016, 0.03, 0, H * 0.9, D / 2 + 0.02, metal("#c9ccd1"), false);
    }
  } else if (cfg.sub === "hood") {
    addBox(g, W, 0.08, D, 0, 0.04, 0, body);
    addBox(g, W * 0.35, H - 0.08, D * 0.5, 0, (H - 0.08) / 2 + 0.08, -D * 0.15, body);
  }
  g.position.y = (cfg.mount || 0) * S;
  return g;
}

function buildFurniture(cfg) {
  const g = new THREE.Group();
  const W = cfg.W * S, H = cfg.H * S, D = cfg.D * S;
  if (cfg.sub === "bed") {
    addBox(g, W, 0.28, D, 0, 0.14, 0, std("#6b5138"));
    addBox(g, W - 0.06, 0.18, D - 0.35, 0, 0.37, 0.14, std("#e8e4dc", { roughness: 0.85 }));
    addBox(g, W, H, 0.09, 0, H / 2, -D / 2 + 0.045, std(cfg.fabric || "#8b93a3", { roughness: 0.9 }));
    addBox(g, W * 0.38, 0.12, 0.32, -W * 0.22, 0.52, -D / 2 + 0.42, std("#ffffff", { roughness: 0.95 }), false);
    addBox(g, W * 0.38, 0.12, 0.32, W * 0.22, 0.52, -D / 2 + 0.42, std("#ffffff", { roughness: 0.95 }), false);
    addBox(g, W - 0.1, 0.1, D - 0.4, 0, 0.5, 0.35, std(cfg.fabric || "#8b93a3", { roughness: 0.9 }), false);
  } else if (cfg.sub === "table") {
    addBox(g, W, 0.03, D, 0, H, 0, std(cfg.fabric || "#b08d5f"));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, H, 12), std("#3a3a3e", { metalness: 0.5 }));
      leg.position.set(a * (W / 2 - 0.06), H / 2, b * (D / 2 - 0.06)); g.add(leg);
    });
  } else if (cfg.sub === "sofa" || cfg.sub === "armchair") {
    const fab = std(cfg.fabric || "#6f7d8f", { roughness: 0.92 });
    addBox(g, W, 0.22, D, 0, 0.2, 0, fab);
    addBox(g, W, H - 0.3, 0.2, 0, (H - 0.3) / 2 + 0.3, -D / 2 + 0.1, fab);
    addBox(g, 0.16, H * 0.55, D, -W / 2 + 0.08, H * 0.42, 0, fab);
    addBox(g, 0.16, H * 0.55, D, W / 2 - 0.08, H * 0.42, 0, fab);
    const seats = cfg.sub === "sofa" ? 3 : 1;
    for (let i = 0; i < seats; i++) {
      const sw = (W - 0.32) / seats - 0.01;
      addBox(g, sw, 0.14, D - 0.3, -W / 2 + 0.16 + sw / 2 + i * (sw + 0.01), 0.38, 0.06, fab, false);
      addBox(g, sw, 0.32, 0.14, -W / 2 + 0.16 + sw / 2 + i * (sw + 0.01), H * 0.55, -D / 2 + 0.24, fab, false);
    }
  } else if (cfg.sub === "chair") {
    const wood = std(cfg.fabric || "#5a4634", { roughness: 0.6 });
    addBox(g, W, 0.03, D, 0, 0.45, 0, wood);
    addBox(g, W, H - 0.48, 0.03, 0, (H - 0.48) / 2 + 0.48, -D / 2 + 0.015, wood);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.45, 10), wood);
      leg.position.set(a * (W / 2 - 0.03), 0.225, b * (D / 2 - 0.03)); g.add(leg);
    });
  } else if (cfg.sub === "wc") {
    const cer = std("#f2f2ef", { roughness: 0.25 });
    addBox(g, W, 0.42, W, 0, 0.21, D / 2 - W / 2, cer);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2.6, 0.14, 20), cer);
    bowl.position.set(0, 0.42, D / 2 - W / 2); g.add(bowl);
    addBox(g, W * 0.95, 0.34, 0.16, 0, 0.62, -D / 2 + 0.09, cer);
    addBox(g, W * 0.5, 0.02, 0.08, 0, 0.8, -D / 2 + 0.09, metal("#c9ccd1"), false);
  } else if (cfg.sub === "basin") {
    const cer = std("#f2f2ef", { roughness: 0.25 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, H - 0.14, 14), cer);
    ped.position.y = (H - 0.14) / 2; g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 3, 0.14, 20), cer);
    bowl.position.y = H - 0.07; g.add(bowl);
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10), metal("#c9ccd1"));
    tap.position.set(0, H + 0.08, -W / 4); g.add(tap);
  } else if (cfg.sub === "bath") {
    const cer = std("#f2f2ef", { roughness: 0.25 });
    addBox(g, W, H, D, 0, H / 2, 0, cer);
    addBox(g, W - 0.14, 0.05, D - 0.14, 0, H - 0.02, 0, std("#dce4e8", { roughness: 0.15 }), false);
  }
  return g;
}

/* примитивы (black-box) */
function buildPrim(cfg) {
  const g = new THREE.Group();
  const W = cfg.W * S, H = cfg.H * S, D = cfg.D * S;
  const mat = std(cfg.fabric || "#9aa3b5", { roughness: 0.7 });
  if (cfg.shape === "cyl") {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, H, 28), mat);
    m.position.y = H / 2; g.add(m);
  } else {
    addBox(g, W, H, D, 0, H / 2, 0, mat);
  }
  g.position.y = (cfg.mount || 0) * S;
  return g;
}

function buildItem(it, customTex, showFacades) {
  const k = it.cfg.kind;
  const g = k === "cabinet" ? buildCabinet(it.cfg, customTex, showFacades)
    : k === "appliance" ? buildAppliance(it.cfg)
    : k === "light" ? buildLight(it.cfg)
    : k === "prim" ? buildPrim(it.cfg) : buildFurniture(it.cfg);
  g.traverse((o) => (o.userData.itemId = it.id));
  g.userData.itemId = it.id;
  return g;
}

/* подпись-спрайт для размеров в 3D */
function makeTextSprite(text, color = "#ffd27a") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(18,20,26,0.85)";
  const tw = Math.min(490, 40 + String(text).length * 30);
  ctx.fillRect((512 - tw) / 2, 18, tw, 92);
  ctx.font = "bold 58px 'JetBrains Mono', monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(text), 256, 66);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.62, 0.155, 1);
  return sp;
}
/* ═══ общие утилиты: магнит и коллизии — одна логика для плана и 3D (6.1) ═══ */
function magnetizeXY(arr, itId, x, y, room, on) {
  const it = arr.find((i) => i.id === itId);
  if (!it) return { x, y, g: [] };
  if (!on) return { x, y, g: [] };
  const fp = footprint({ ...it, pos: { ...it.pos, x, y } });
  const SNAP = 35;
  const candX = [0, room.W, room.W / 2];
  const candY = [0, room.L, room.L / 2];
  arr.forEach((o) => {
    if (o.id === itId || o.cfg.kind === "light") return;
    const g2 = footprint(o);
    candX.push(g2.x, g2.x + g2.w, g2.x + g2.w / 2);
    candY.push(g2.y, g2.y + g2.d, g2.y + g2.d / 2);
  });
  const myX = [fp.x, fp.x + fp.w, fp.x + fp.w / 2];
  const myY = [fp.y, fp.y + fp.d, fp.y + fp.d / 2];
  let bx = null, by = null, bdx = SNAP, bdy = SNAP;
  candX.forEach((c) => myX.forEach((m2) => { const d = Math.abs(c - m2); if (d < bdx) { bdx = d; bx = { c, m: m2 }; } }));
  candY.forEach((c) => myY.forEach((m2) => { const d = Math.abs(c - m2); if (d < bdy) { bdy = d; by = { c, m: m2 }; } }));
  const g = [];
  if (bx) { x += bx.c - bx.m; g.push({ v: true, at: bx.c }); }
  if (by) { y += by.c - by.m; g.push({ v: false, at: by.c }); }
  return { x, y, g };
}
function collisionBad(arr, room, it) {
  const fp = footprint(it);
  return arr.some((o) => o.id !== it.id && o.cfg.kind !== "light" && it.cfg.kind !== "light"
      && vOverlap(it, o) && overlaps(fp, footprint(o)))
    || fp.x < -1 || fp.y < -1 || fp.x + fp.w > room.W + 1 || fp.y + fp.d > room.L + 1;
}

/* ═══ выносная линия в 3D: маркеры-засечки на обеих точках + линия + подпись (стандарт п.1) ═══ */
function dimLine3D(scene, a, b, text, colorHex = 0xe05a5a, spriteColor = "#ffd27a") {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const mat = new THREE.LineBasicMaterial({ color: colorHex, depthTest: false });
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([A, B]), mat));
  // засечки: короткие перпендикуляры на обоих концах
  const dir = B.clone().sub(A).normalize();
  let perp = new THREE.Vector3(0, 1, 0).cross(dir);
  if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(1, 0, 0).cross(dir);
  perp.normalize().multiplyScalar(0.045);
  [A, B].forEach((P) => {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      P.clone().add(perp), P.clone().sub(perp)]), mat));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8),
      new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false }));
    dot.position.copy(P); dot.renderOrder = 5; scene.add(dot);
  });
  const sp = makeTextSprite(text, spriteColor);
  sp.position.copy(A.clone().add(B).multiplyScalar(0.5));
  sp.position.y += 0.09;
  scene.add(sp);
}

/* ═══ узорные текстуры пола/стен/потолка (6.7) ═══ */
const patternCache = {};
function genPatternTex(kind, hexA) {
  const key = kind + hexA;
  if (patternCache[key]) return patternCache[key];
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = hexA; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 2;
  if (kind === "lam") { // ламинат: доски со смещением
    for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 4; r++) { const off = (r % 2) * 128; ctx.beginPath(); ctx.moveTo(off, r * 64); ctx.lineTo(off, r * 64 + 64); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let r = 0; r < 4; r++) ctx.fillRect(0, r * 64, 256, r % 2 ? 6 : 3);
  } else if (kind === "tile") { // плитка: клетка
    for (let p = 0; p <= 256; p += 128) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
    }
  } else if (kind === "herring") { // паркет ёлочка (упрощённо)
    ctx.lineWidth = 1.6;
    for (let i = -4; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 128, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 64, 256); ctx.lineTo(i * 64 + 128, 128); ctx.stroke();
    }
  } else if (kind === "stripes") { // обои полоса
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 30, 256);
  } else if (kind === "walltile") {
    for (let p = 0; p <= 256; p += 64) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  patternCache[key] = tex;
  return tex;
}
const FLOOR_PATTERNS = [
  { id: "plain", name: "Однотонный" }, { id: "lam", name: "Ламинат" },
  { id: "tile", name: "Плитка" }, { id: "herring", name: "Паркет ёлочка" },
];
const WALL_PATTERNS = [
  { id: "plain", name: "Покраска" }, { id: "stripes", name: "Обои полоса" }, { id: "walltile", name: "Плитка" },
];

/* ═══ эталонный проект (дополнение №9): шкаф 3180×2500×600, 5 дверей + антресоль ═══ */
function buildEtalonItems(nidRef) {
  const main = cabBase({
    W: 3180, H: 1800, D: 600, plinth: 80, counter: false,
    sections: 5, shelves: 2, doors: 5, rod: true, rodScope: "left",
    facadeMat: "f-white", corpusMat: "oak",
  });
  const antresol = cabBase({
    W: 3180, H: 700, D: 600, plinth: 0, mount: 1800, counter: false,
    sections: 5, shelves: 0, doors: 5, facadeMat: "f-white", corpusMat: "oak",
  });
  return [
    { id: nidRef(), name: "Эталон: низ 5 дв", cfg: main, pos: { x: 1590, y: 300, rot: 0 } },
    { id: nidRef(), name: "Эталон: антресоль", cfg: antresol, pos: { x: 1590, y: 300, rot: 0 } },
  ];
}
/* ═══════════ 3D-вьюер: орбита/орто-виды, драг мебели, Alt-цикл, двери, рулетка, снимок ═══════════ */
function useThree(mountRef, build, deps, opts = {}) {
  const st = useRef({ rotY: 0.7, rotX: 0.35, dist: null, drag: false, lx: 0, ly: 0, moved: 0, lastView: "free" });
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171a20);
    const persp = new THREE.PerspectiveCamera(45, Math.max(mount.clientWidth, 1) / Math.max(mount.clientHeight, 1), 0.05, 200);
    const ortho = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(Math.max(mount.clientWidth, 1), Math.max(mount.clientHeight, 1));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (opts.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);
    const { target, dist } = build(scene, persp);
    if (opts.shadows) scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const pivots = [];
    scene.traverse((o) => { if (o.userData?.door) pivots.push(o); });
    const s = st.current;
    if (s.dist === null) s.dist = dist;
    const cam = { active: persp };
    const applyView = (vp) => {
      if (vp === "top") { s.rotX = 1.555; s.rotY = 0.0001; }
      else if (vp === "front") { s.rotX = 0.03; s.rotY = 0; }
      else if (vp === "left") { s.rotX = 0.03; s.rotY = -Math.PI / 2; }
      else if (vp === "right") { s.rotX = 0.03; s.rotY = Math.PI / 2; }
      else if (vp === "iso") { s.rotX = 0.35; s.rotY = 0.7; }
    };
    if (opts.captureRef) {
      opts.captureRef.current = () => {
        const prev = renderer.getPixelRatio();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 3));
        renderer.render(scene, cam.active);
        const url = renderer.domElement.toDataURL("image/png");
        renderer.setPixelRatio(prev);
        return url;
      };
    }
    let raf;
    const loop = () => {
      const vp = opts.viewRef?.current || "free";
      if (vp !== s.lastView) { applyView(vp); s.lastView = vp; }
      const useOrtho = vp === "top" || vp === "front" || vp === "left" || vp === "right";
      cam.active = useOrtho ? ortho : persp;
      const anim = opts.animRef?.current || {};
      pivots.forEach((p) => {
        const key = p.userData.itemId + "#" + p.userData.doorIdx;
        const open = anim[key] !== undefined ? anim[key] : !!anim[p.userData.itemId];
        if (p.userData.sliding) {
          const tgt = open ? p.userData.slide : 0;
          p.userData.cur += (tgt - p.userData.cur) * 0.14;
          if (p.userData.axis === "z") p.position.z = (p.userData.baseZ ?? (p.userData.baseZ = p.position.z)) + p.userData.cur;
          else p.position.x = p.userData.baseX + p.userData.cur;
        } else {
          const tgt = open ? p.userData.openTarget : 0;
          p.rotation.y += (tgt - p.rotation.y) * 0.14;
        }
      });
      const px = target.x + s.dist * Math.sin(s.rotY) * Math.cos(s.rotX);
      const py = target.y + s.dist * Math.sin(s.rotX);
      const pz = target.z + s.dist * Math.cos(s.rotY) * Math.cos(s.rotX);
      persp.position.set(px, py, pz); persp.lookAt(target);
      if (useOrtho) {
        const asp = Math.max(mount.clientWidth, 1) / Math.max(mount.clientHeight, 1);
        const half = s.dist * 0.42;
        ortho.left = -half * asp; ortho.right = half * asp;
        ortho.top = half; ortho.bottom = -half;
        ortho.position.set(px, py, pz); ortho.lookAt(target);
        ortho.updateProjectionMatrix();
      }
      renderer.render(scene, cam.active);
      raf = requestAnimationFrame(loop);
    };
    loop();
    const gx = (e) => e.clientX ?? e.touches?.[0]?.clientX ?? s.lx;
    const gy = (e) => e.clientY ?? e.touches?.[0]?.clientY ?? s.ly;
    const rayAt = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const cx = clientX - rect.left, cy = clientY - rect.top;
      if (cx < 0 || cy < 0 || cx > rect.width || cy > rect.height) return null;
      const ndc = new THREE.Vector2((cx / rect.width) * 2 - 1, -(cy / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam.active);
      return ray;
    };
    const floorPoint = (ray) => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const pt = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, pt) ? pt : null;
    };
    let itemDrag = null;
    const down = (e) => {
      s.drag = true; s.moved = 0; s.lx = gx(e); s.ly = gy(e);
      /* 6.1: перетаскивание мебели прямо в 3D */
      if (opts.onDragItem && !opts.measureRef?.current) {
        const ray = rayAt(s.lx, s.ly);
        if (ray) {
          const hits = ray.intersectObjects(scene.children, true);
          const hit = hits.find((h) => h.object.userData?.itemId);
          if (hit) {
            const id = hit.object.userData.itemId;
            const pt = floorPoint(ray);
            const it = (opts.itemsRef?.current || []).find((i) => i.id === id);
            if (pt && it) {
              const roomW = opts.roomRef.current.W, roomL = opts.roomRef.current.L;
              const xmm = (pt.x + roomW * S / 2) / S, ymm = (pt.z + roomL * S / 2) / S;
              itemDrag = { id, dx: it.pos.x - xmm, dy: it.pos.y - ymm };
              opts.onPick && opts.onPick(id);
            }
          }
        }
      }
    };
    const up = (e) => {
      const wasItemDrag = itemDrag && s.moved >= 6;
      if (itemDrag) { itemDrag = null; opts.onDragEnd && opts.onDragEnd(); }
      if (s.drag && s.moved < 6 && !wasItemDrag) {
        const ray = rayAt(e.changedTouches?.[0]?.clientX ?? e.clientX ?? 0, e.changedTouches?.[0]?.clientY ?? e.clientY ?? 0);
        if (ray) {
          if (opts.measureRef?.current && opts.onMeasurePoint) {
            const hits = ray.intersectObjects(scene.children, true).filter((h) => !h.object.isSprite);
            let pt = hits[0]?.point || floorPoint(ray);
            if (pt) opts.onMeasurePoint({ x: pt.x, y: pt.y, z: pt.z });
          } else {
            const hits = ray.intersectObjects(scene.children, true);
            const doorHit = hits.find((h) => h.object.userData?.doorHit);
            if (doorHit && opts.animRef && !e.altKey) {
              const id = doorHit.object.userData.itemId;
              const key = id + "#" + doorHit.object.userData.doorIdx;
              const cur = opts.animRef.current[key] !== undefined ? opts.animRef.current[key] : !!opts.animRef.current[id];
              opts.animRef.current = { ...opts.animRef.current, [key]: !cur };
              opts.onPick && opts.onPick(id);
            } else if (opts.onPick) {
              /* 6.4: ближайший по глубине; Alt+клик — цикл по объектам под курсором */
              const ids = [];
              hits.forEach((h) => { const id = h.object.userData?.itemId; if (id && !ids.includes(id)) ids.push(id); });
              if (!ids.length) opts.onPick(null);
              else if (e.altKey && ids.length > 0) {
                const sig = ids.join(",");
                const c = (s.cycle = s.cycle || {});
                c.i = c.sig === sig ? (c.i + 1) % ids.length : 0;
                c.sig = sig;
                opts.onPick(ids[c.i]);
              } else {
                opts.onPick(ids[0]);
              }
            }
          }
        }
      }
      s.drag = false;
    };
    const move = (e) => {
      if (!s.drag) return;
      const dx = gx(e) - s.lx, dy = gy(e) - s.ly;
      s.moved += Math.abs(dx) + Math.abs(dy);
      if (itemDrag) {
        const ray = rayAt(gx(e), gy(e));
        if (ray) {
          const pt = floorPoint(ray);
          if (pt) {
            const roomW = opts.roomRef.current.W, roomL = opts.roomRef.current.L;
            const xmm = (pt.x + roomW * S / 2) / S, ymm = (pt.z + roomL * S / 2) / S;
            opts.onDragItem(itemDrag.id, xmm + itemDrag.dx, ymm + itemDrag.dy);
          }
        }
        s.lx = gx(e); s.ly = gy(e);
        return; // орбита выключена, пока тащим мебель
      }
      s.rotY += dx * 0.008;
      s.rotX = Math.min(1.55, Math.max(-0.05, s.rotX + dy * 0.006));
      s.lx = gx(e); s.ly = gy(e);
    };
    const wheel = (e) => { e.preventDefault(); s.dist = Math.min(40, Math.max(0.5, s.dist + e.deltaY * 0.004)); };
    const el = renderer.domElement;
    el.addEventListener("mousedown", down); window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move); el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchend", up); el.addEventListener("touchmove", move, { passive: true });
    const onResize = () => {
      const w = Math.max(mount.clientWidth, 1), h = Math.max(mount.clientHeight, 1);
      persp.aspect = w / h; persp.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(mount);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mouseup", up); window.removeEventListener("mousemove", move);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
      el.remove(); renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose(); });
    };
  }, deps); // eslint-disable-line
}

function lightsFor(scene, lt) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.12 + (lt?.ambient ?? 0.5) * 0.45));
  const warm = lt?.warmth ?? 0.55;
  const keyColor = new THREE.Color().lerpColors(new THREE.Color(0xdfe8ff), new THREE.Color(0xffdfae), warm);
  const key = new THREE.DirectionalLight(keyColor, 0.15 + (lt?.intensity ?? 0.8) * 0.45);
  key.position.set(4, 7, 5); scene.add(key);
}

function ItemViewer({ item, customTex, lighting, showFacades, onPick }) {
  const ref = useRef(null);
  const animRef = useRef({});
  useThree(ref, (scene) => {
    lightsFor(scene, { ...lighting, intensity: 1, ambient: 0.7 });
    scene.add(new THREE.GridHelper(8, 32, 0x2c313b, 0x22262e));
    scene.add(buildItem(item, customTex, showFacades));
    const topY = ((item.cfg.mount || 0) + item.cfg.H) * S;
    return { target: new THREE.Vector3(0, topY / 2, 0), dist: Math.max(item.cfg.W * S, topY) * 2.1 + 0.8 };
  }, [item, customTex, lighting, showFacades], { animRef, onPick });
  return <div ref={ref} className="viewer" />;
}

/* авторазмеры в 3D — выносные линии с засечками (6.3) */
function addSceneDims(scene, room, items) {
  const W = room.W * S, L = room.L * S, RH = room.H * S;
  dimLine3D(scene, [-W / 2, 0.03, L / 2 + 0.28], [W / 2, 0.03, L / 2 + 0.28], room.W + " мм");
  dimLine3D(scene, [-W / 2 - 0.28, 0, L / 2], [-W / 2 - 0.28, RH, L / 2], room.H + " мм");
  const fps = items.map((it) => ({ it, fp: footprint(it) }));
  fps.forEach(({ it, fp }, idx) => {
    if (it.cfg.kind === "light") return;
    const x1 = fp.x * S - W / 2, x2 = (fp.x + fp.w) * S - W / 2;
    const zf = (fp.y + fp.d) * S - L / 2 + 0.06;
    const cz = (fp.y + fp.d / 2) * S - L / 2;
    const bottom = (it.cfg.mount || 0) * S;
    const top = bottom + it.cfg.H * S;
    const stag = (idx % 2) * 0.14;
    dimLine3D(scene, [x1, top + 0.12 + stag, zf], [x2, top + 0.12 + stag, zf], it.cfg.W, 0x9aa0ab, "#ffd27a");
    dimLine3D(scene, [x2 + 0.12, bottom, cz], [x2 + 0.12, top, cz], it.cfg.H, 0x6ea8d8, "#8fd0ff");
    if ((it.cfg.mount || 0) > 400)
      dimLine3D(scene, [x1 - 0.1, 0, cz], [x1 - 0.1, bottom, cz], "низ " + it.cfg.mount, 0x6e88b8, "#8fb0d8");
    const toCeil = room.H - (it.cfg.mount || 0) - it.cfg.H;
    if (toCeil > 30 && it.cfg.H + (it.cfg.mount || 0) > 1500)
      dimLine3D(scene, [(x1 + x2) / 2, top, cz], [(x1 + x2) / 2, RH, cz], toCeil, 0xa98ad0, "#c9a7e8");
    let best = null;
    fps.forEach(({ it: o2, fp: g2 }) => {
      if (o2.id === it.id || o2.cfg.kind === "light") return;
      const yOv = fp.y < g2.y + g2.d && fp.y + fp.d > g2.y;
      const gap = g2.x - (fp.x + fp.w);
      if (yOv && gap > 4 && gap < 3000 && (!best || gap < best.gap)) best = { gap, g2 };
    });
    if (best) {
      const gy = Math.max(bottom, 0.35);
      dimLine3D(scene, [x2, gy, cz], [x2 + best.gap * S, gy, cz], Math.round(best.gap), 0x5fb888, "#7fd8a8");
    }
  });
}

function SceneViewer({ room, items, customTex, lighting, showFacades, onPick, animRef, ui3d, measurePts, onMeasurePoint, measureRef, captureRef, viewRef, itemsRef, roomRef, onDragItem, onDragEnd }) {
  const ref = useRef(null);
  useThree(ref, (scene) => {
    lightsFor(scene, lighting);
    const W = room.W * S, L = room.L * S, H = room.H * S, wt = 0.1;
    /* пол с узором (6.7) */
    const ft = room.floorTex || { type: "plain", scale: 600 };
    let floorMat;
    if (ft.type !== "plain") {
      const tex = genPatternTex(ft.type, byId(FLOOR_COLORS, room.floor).hex).clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(Math.max(1, room.W / (ft.scale || 600)), Math.max(1, room.L / (ft.scale || 600)));
      floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    } else floorMat = std(byId(FLOOR_COLORS, room.floor).hex, { roughness: 0.85 });
    const floor = addBox(scene, W, 0.02, L, 0, -0.01, 0, floorMat, false);
    floor.receiveShadow = true;
    if (ui3d.grid) {
      const step = (ui3d.gridSize || 500) * S;
      const div = Math.max(2, Math.round(Math.max(W, L) / step));
      const gh = new THREE.GridHelper(Math.max(W, L), div, 0x4a5162, 0x333a48);
      gh.position.y = 0.012;
      scene.add(gh);
    }
    /* стены с узором и скрытием */
    const wtx = room.wallTex || { type: "plain", scale: 600 };
    const wallHex = byId(WALL_COLORS, room.wallColor).hex;
    const wallMatFor = (len) => {
      if (wtx.type !== "plain") {
        const tex = genPatternTex(wtx.type, wallHex).clone();
        tex.needsUpdate = true;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(Math.max(1, len / (wtx.scale || 600)), Math.max(1, room.H / (wtx.scale || 600)));
        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
      }
      return std(wallHex, { roughness: 0.95, side: THREE.DoubleSide });
    };
    const walls = ui3d.walls || { N: true, S: true, W: true, E: true };
    const wall = (sx, sz, x, z, side, len) => {
      if (!walls[side]) return;
      addBox(scene, sx, H, sz, x, H / 2, z, wallMatFor(len), false);
    };
    wall(W + 2 * wt, wt, 0, -L / 2 - wt / 2, "N", room.W);
    wall(W + 2 * wt, wt, 0, L / 2 + wt / 2, "S", room.W);
    wall(wt, L, -W / 2 - wt / 2, 0, "W", room.L);
    wall(wt, L, W / 2 + wt / 2, 0, "E", room.L);
    room.openings.forEach((o) => {
      if (!walls[o.wall]) return;
      let mesh; const oc = o.color || "#7fb6e0";
      if (o.type === "window") {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(oc, { transparent: true, opacity: 0.55, roughness: 0.12, metalness: 0.2 }));
        mesh.userData = { w: o.w * S, h: (o.h || 1400) * S, sill: (o.sill || 900) * S };
      } else if (o.type === "door") {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(oc, { roughness: 0.6 }));
        mesh.userData = { w: o.w * S, h: (o.h || 2050) * S, sill: 0 };
      } else if (o.type === "radiator") {
        const rg = new THREE.Group();
        const n = Math.max(4, Math.round(o.w / 90));
        for (let i = 0; i < n; i++)
          addBox(rg, o.w * S / n - 0.012, 0.5, 0.06, -o.w * S / 2 + (i + 0.5) * (o.w * S / n), 0, 0, std(oc, { roughness: 0.5 }), false);
        rg.userData = { w: o.w * S, h: 0.5, sill: 0.15, group: true };
        mesh = rg;
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(oc, { roughness: 0.4 }));
        mesh.userData = { w: 0.08, h: 0.08, sill: 0.3 };
      }
      const { w, h, sill, group } = mesh.userData;
      if (!group) mesh.scale.set(o.wall === "W" || o.wall === "E" ? 0.06 : w, h, o.wall === "W" || o.wall === "E" ? w : 0.06);
      const off = o.off * S + w / 2, cy = sill + h / 2;
      if (o.wall === "N") mesh.position.set(-W / 2 + off, cy, -L / 2 + 0.04);
      if (o.wall === "S") mesh.position.set(-W / 2 + off, cy, L / 2 - 0.04);
      if (o.wall === "W") { mesh.position.set(-W / 2 + 0.04, cy, -L / 2 + off); if (group) mesh.rotation.y = Math.PI / 2; }
      if (o.wall === "E") { mesh.position.set(W / 2 - 0.04, cy, -L / 2 + off); if (group) mesh.rotation.y = Math.PI / 2; }
      scene.add(mesh);
    });
    items.forEach((it) => {
      const g = buildItem(it, customTex, showFacades);
      g.position.x = it.pos.x * S - W / 2;
      g.position.z = it.pos.y * S - L / 2;
      g.rotation.y = (-it.pos.rot * Math.PI) / 180;
      scene.add(g);
      /* 6.1: подсветка коллизии прямо в 3D */
      if (collisionBad(items, room, it)) {
        const fp = footprint(it);
        const bh = it.cfg.H * S;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(fp.w * S + 0.03, bh + 0.03, fp.d * S + 0.03),
          new THREE.MeshBasicMaterial({ color: 0xd84a4a, wireframe: true, transparent: true, opacity: 0.9 }));
        box.position.set((fp.x + fp.w / 2) * S - W / 2, (it.cfg.mount || 0) * S + bh / 2, (fp.y + fp.d / 2) * S - L / 2);
        scene.add(box);
      }
    });
    if (ui3d.ruler) addSceneDims(scene, room, items);
    (measurePts || []).forEach((p) => {
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xe0a44b, depthTest: false }));
      sph.position.set(p.x, p.y, p.z);
      sph.renderOrder = 6;
      scene.add(sph);
    });
    if ((measurePts || []).length === 2) {
      const [a, b] = measurePts;
      const dist = Math.round(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / S);
      dimLine3D(scene, [a.x, a.y, a.z], [b.x, b.y, b.z], dist + " мм", 0xe0a44b, "#e0a44b");
    }
    return { target: new THREE.Vector3(0, H / 3, 0), dist: Math.max(W, L) * 1.55 + 1.6 };
  }, [room, items, customTex, lighting, showFacades, ui3d, measurePts],
  { animRef, onPick, measureRef, onMeasurePoint, captureRef, shadows: true, viewRef, itemsRef, roomRef, onDragItem, onDragEnd });
  return <div ref={ref} className="viewer" />;
}

/* ═══════════ ПЛАН (магнит и коллизии — те же функции, что в 3D) ═══════════ */
const WT = 110;

function PlanEditor({ room, setRoom, items, setItems, selId, setSelId, selOp, setSelOp, ui, customTex }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [guides, setGuides] = useState([]);
  const [mpts, setMpts] = useState([]);
  const movedSome = useRef(false);
  const pad = 430;
  const vbW = room.W + 2 * pad, vbH = room.L + 2 * pad;

  useEffect(() => { if (!ui.measure) setMpts([]); }, [ui.measure]);

  const toMM = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.touches?.[0]?.clientX) - r.left;
    const cy = (e.clientY ?? e.touches?.[0]?.clientY) - r.top;
    const scale = Math.max(vbW / r.width, vbH / r.height);
    const ox = (r.width * scale - vbW) / 2, oy = (r.height * scale - vbH) / 2;
    return { x: cx * scale - ox - pad, y: cy * scale - oy - pad };
  };
  const startItem = (id) => (e) => {
    e.preventDefault(); e.stopPropagation();
    setSelId(id); setSelOp(null);
    const it = items.find((i) => i.id === id);
    const m = toMM(e);
    drag.current = { type: "item", id, dx: it.pos.x - m.x, dy: it.pos.y - m.y };
    setDragging(true);
  };
  const startWall = (side) => (e) => { e.preventDefault(); e.stopPropagation(); drag.current = { type: "wall", side }; setDragging(true); };
  const startOp = (i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    setSelOp(i); setSelId(null);
    const m = toMM(e);
    const o = room.openings[i];
    const along = o.wall === "N" || o.wall === "S" ? m.x : m.y;
    drag.current = { type: "op", i, d: o.off - along };
    setDragging(true);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    movedSome.current = true;
    const m = toMM(e);
    if (d.type === "item") {
      const res = magnetizeXY(items, d.id, m.x + d.dx, m.y + d.dy, room, ui.magnet);
      setGuides(res.g);
      setItems((arr) => arr.map((it) => it.id === d.id
        ? { ...it, pos: { ...it.pos, x: Math.round(res.x), y: Math.round(res.y) } } : it));
    } else if (d.type === "wall") {
      setRoom((r) => {
        const clamp = (v) => Math.min(20000, Math.max(1500, Math.round(v / 10) * 10));
        if (d.side === "E") return { ...r, W: clamp(m.x) };
        if (d.side === "S") return { ...r, L: clamp(m.y) };
        if (d.side === "W") return { ...r, W: clamp(r.W - m.x) };
        return { ...r, L: clamp(r.L - m.y) };
      });
    } else if (d.type === "op") {
      setRoom((r) => ({
        ...r,
        openings: r.openings.map((o, j) => {
          if (j !== d.i) return o;
          const len = o.wall === "N" || o.wall === "S" ? r.W : r.L;
          const along = o.wall === "N" || o.wall === "S" ? m.x : m.y;
          return { ...o, off: Math.round(Math.min(len - o.w, Math.max(0, along + d.d))) };
        }),
      }));
    }
  };
  const onUp = () => { drag.current = null; setDragging(false); setGuides([]); };
  const onBgClick = (e) => {
    if (movedSome.current) { movedSome.current = false; return; }
    if (ui.measure) {
      const m = toMM(e);
      setMpts((p) => (p.length >= 2 ? [m] : [...p, m]));
      return;
    }
    setSelId(null); setSelOp(null);
  };

  const fps = items.map((it) => ({ it, fp: footprint(it) }));
  const opRect = (o) => {
    const w = o.type === "socket" ? 120 : o.w;
    return o.wall === "N" ? { x: o.off, y: -WT + 8, width: w, height: WT - 16 } :
      o.wall === "S" ? { x: o.off, y: room.L + 8, width: w, height: WT - 16 } :
      o.wall === "W" ? { x: -WT + 8, y: o.off, width: WT - 16, height: w } :
      { x: room.W + 8, y: o.off, width: WT - 16, height: w };
  };
  const appLabel = { fridge: "ХОЛ", stove: "ПЛИТА", dw: "ПММ", hood: "ВЫТ", wash: "СМА" };
  const gs = ui.gridSize || 500;

  const dims = [];
  if (ui.showDims && !dragging) {
    fps.forEach(({ it, fp }, idx) => {
      const off = 60 + (idx % 2) * 110;
      dims.push({ kind: "w", x1: fp.x, x2: fp.x + fp.w, y: fp.y - off, label: fp.w });
      if ((it.cfg.mount || 0) > 800) dims.push({ kind: "note", x: fp.x + fp.w / 2, y: fp.y + fp.d + 70, label: `низ ${it.cfg.mount}` });
      let best = null;
      fps.forEach(({ fp: g2 }) => {
        if (g2 === fp) return;
        const yOverlap = fp.y < g2.y + g2.d && fp.y + fp.d > g2.y;
        const gap = g2.x - (fp.x + fp.w);
        if (yOverlap && gap > 4 && gap < 3000 && (!best || gap < best.gap)) best = { gap, g2 };
      });
      if (best) {
        const ym = Math.max(fp.y, best.g2.y) + Math.min(fp.d, best.g2.d) / 2;
        dims.push({ kind: "gap", x1: fp.x + fp.w, x2: best.g2.x, y: ym, label: Math.round(best.gap) });
      }
    });
  }

  return (
    <svg ref={svgRef} viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`} className="plan"
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchMove={onMove} onTouchEnd={onUp}
      onClick={onBgClick}>
      <defs>
        <pattern id="grid" width={gs} height={gs} patternUnits="userSpaceOnUse">
          <path d={`M ${gs} 0 L 0 0 0 ${gs}`} fill="none" stroke="#262b34" strokeWidth="5" />
        </pattern>
      </defs>
      <rect x={-pad} y={-pad} width={vbW} height={vbH} fill="#14161b" />
      <rect x={-WT} y={-WT} width={room.W + 2 * WT} height={room.L + 2 * WT} fill="#3f4450" rx="14" />
      <rect x="0" y="0" width={room.W} height={room.L} fill="url(#grid)" stroke="#e7e3da" strokeWidth="10" />

      {[["N", room.W / 2, -WT / 2], ["S", room.W / 2, room.L + WT / 2], ["W", -WT / 2, room.L / 2], ["E", room.W + WT / 2, room.L / 2]].map(([sd, x, y]) => (
        <g key={sd} onMouseDown={startWall(sd)} onTouchStart={startWall(sd)} onClick={(e) => e.stopPropagation()}
          style={{ cursor: sd === "N" || sd === "S" ? "ns-resize" : "ew-resize" }}>
          <circle cx={x} cy={y} r="130" fill="#e0a44b" opacity="0.15" />
          <circle cx={x} cy={y} r="64" fill="#e0a44b" />
          <text x={x} y={y + 32} textAnchor="middle" fontSize="88" fill="#1a1408" fontWeight="800"
            style={{ pointerEvents: "none" }}>{sd === "N" || sd === "S" ? "↕" : "↔"}</text>
        </g>
      ))}

      {room.openings.map((o, i) => {
        const r = opRect(o);
        const isSel = selOp === i;
        return (
          <g key={i} onMouseDown={startOp(i)} onTouchStart={startOp(i)} onClick={(e) => e.stopPropagation()} style={{ cursor: "move" }}>
            {o.type === "door" && (o.wall === "N" || o.wall === "S") && (
              <path d={`M ${o.off} ${o.wall === "N" ? 0 : room.L} A ${o.w} ${o.w} 0 0 ${o.wall === "N" ? 1 : 0} ${o.off + o.w} ${o.wall === "N" ? o.w : room.L - o.w}`}
                fill="none" stroke="#8a8f98" strokeWidth="12" strokeDasharray="50 40" opacity="0.55" />
            )}
            <rect {...r} fill={o.color || "#7fb6e0"} rx="18"
              stroke={isSel ? "#e0a44b" : "#0f1115"} strokeWidth={isSel ? 24 : 6} />
          </g>
        );
      })}

      {fps.map(({ it, fp }) => {
        const isBad = collisionBad(items, room, it);
        const sel2 = it.id === selId;
        const isWallCab = (it.cfg.mount || 0) > 800 && it.cfg.kind !== "light";
        const isLight = it.cfg.kind === "light";
        const fill = it.cfg.kind === "cabinet"
          ? resolveFacade(it.cfg.facadeMat, customTex).hex
          : it.cfg.kind === "appliance" ? byId(APPLIANCE_COLORS, it.cfg.color).hex
          : isLight ? "#ffd76e" : it.cfg.fabric || "#9aa3b5";
        const r = fp.r;
        const front =
          r === 0 ? { x1: fp.x + 20, y1: fp.y + fp.d - 12, x2: fp.x + fp.w - 20, y2: fp.y + fp.d - 12 } :
          r === 180 ? { x1: fp.x + 20, y1: fp.y + 12, x2: fp.x + fp.w - 20, y2: fp.y + 12 } :
          r === 90 ? { x1: fp.x + 12, y1: fp.y + 20, x2: fp.x + 12, y2: fp.y + fp.d - 20 } :
          { x1: fp.x + fp.w - 12, y1: fp.y + 20, x2: fp.x + fp.w - 12, y2: fp.y + fp.d - 20 };
        const strokeW = dragging && sel2 ? 2 : sel2 ? 16 : 6;
        return (
          <g key={it.id} onMouseDown={startItem(it.id)} onTouchStart={startItem(it.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: "move" }}>
            {isLight
              ? <circle cx={fp.x + fp.w / 2} cy={fp.y + fp.d / 2} r={Math.max(fp.w, 160) / 2}
                  fill={fill} opacity="0.85" stroke={sel2 ? "#e0a44b" : "#0d0f13"} strokeWidth={strokeW} />
              : <rect x={fp.x} y={fp.y} width={fp.w} height={fp.d}
                  fill={isBad ? "#a33b3b" : fill}
                  stroke={sel2 ? "#e0a44b" : "#0d0f13"} strokeWidth={strokeW}
                  strokeDasharray={isWallCab ? "70 50" : "none"}
                  opacity={isWallCab ? 0.62 : 0.94} />}
            {!isLight && <line {...front} stroke={sel2 ? "#e0a44b" : "#17130a"} strokeWidth="22" opacity="0.8" />}
            <text x={fp.x + fp.w / 2} y={fp.y + fp.d / 2 + 40} textAnchor="middle"
              fontSize={Math.min(140, Math.max(70, fp.w / 5))} fill="#17130a" fontWeight="700"
              style={{ pointerEvents: "none", fontFamily: "Manrope,sans-serif" }}>
              {it.cfg.kind === "appliance" ? appLabel[it.cfg.sub] || it.name : isLight ? "💡" : it.name}
            </text>
          </g>
        );
      })}

      {guides.map((g, i) => g.v
        ? <line key={i} x1={g.at} y1={-WT} x2={g.at} y2={room.L + WT} stroke="#e05aa0" strokeWidth="8" strokeDasharray="60 40" />
        : <line key={i} x1={-WT} y1={g.at} x2={room.W + WT} y2={g.at} stroke="#e05aa0" strokeWidth="8" strokeDasharray="60 40" />)}

      {dims.map((d, i) => d.kind === "note"
        ? <text key={i} x={d.x} y={d.y} textAnchor="middle" fontSize="80" fill="#8fb0d8"
            style={{ fontFamily: "JetBrains Mono,monospace", pointerEvents: "none" }}>{d.label}</text>
        : (
          <g key={i} style={{ pointerEvents: "none" }}>
            <line x1={d.x1} y1={d.y} x2={d.x2} y2={d.y} stroke={d.kind === "gap" ? "#7fd8a8" : "#9aa0ab"} strokeWidth="8" />
            <line x1={d.x1} y1={d.y - 26} x2={d.x1} y2={d.y + 26} stroke={d.kind === "gap" ? "#7fd8a8" : "#9aa0ab"} strokeWidth="8" />
            <line x1={d.x2} y1={d.y - 26} x2={d.x2} y2={d.y + 26} stroke={d.kind === "gap" ? "#7fd8a8" : "#9aa0ab"} strokeWidth="8" />
            <text x={(d.x1 + d.x2) / 2} y={d.y - 20} textAnchor="middle" fontSize="86"
              fill={d.kind === "gap" ? "#7fd8a8" : "#c9cdd4"} style={{ fontFamily: "JetBrains Mono,monospace" }}>{d.label}</text>
          </g>
        ))}

      {mpts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="34" fill="#e0a44b" style={{ pointerEvents: "none" }} />)}
      {mpts.length === 2 && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={mpts[0].x} y1={mpts[0].y} x2={mpts[1].x} y2={mpts[1].y} stroke="#e0a44b" strokeWidth="12" strokeDasharray="50 40" />
          <text x={(mpts[0].x + mpts[1].x) / 2} y={(mpts[0].y + mpts[1].y) / 2 - 40} textAnchor="middle" fontSize="110" fill="#e0a44b"
            style={{ fontFamily: "JetBrains Mono,monospace" }}>
            {Math.round(Math.hypot(mpts[1].x - mpts[0].x, mpts[1].y - mpts[0].y))} мм
          </text>
        </g>
      )}

      <text x={room.W / 2} y={-WT - 90} textAnchor="middle" fontSize="140" fill="#9aa0ab"
        style={{ fontFamily: "JetBrains Mono,monospace" }}>{room.W} мм</text>
      <text x={-WT - 110} y={room.L / 2} textAnchor="middle" fontSize="140" fill="#9aa0ab"
        transform={`rotate(-90 ${-WT - 110} ${room.L / 2})`}
        style={{ fontFamily: "JetBrains Mono,monospace" }}>{room.L} мм</text>
    </svg>
  );
}

function ElevationView({ room, items, wallSide, customTex }) {
  const len = wallSide === "N" || wallSide === "S" ? room.W : room.L;
  const H = room.H;
  const proj = items.filter((i) => i.cfg.kind !== "light").map((it) => {
    const fp = footprint(it);
    const ax = wallSide === "N" || wallSide === "S" ? fp.x : fp.y;
    const aw = wallSide === "N" || wallSide === "S" ? fp.w : fp.d;
    const distToWall =
      wallSide === "N" ? fp.y : wallSide === "S" ? room.L - (fp.y + fp.d) :
      wallSide === "W" ? fp.x : room.W - (fp.x + fp.w);
    return { it, ax, aw, dist: distToWall };
  }).sort((a, b) => b.dist - a.dist);
  const ops = room.openings.filter((o) => o.wall === wallSide);
  return (
    <svg viewBox={`-300 -260 ${len + 600} ${H + 560}`} className="plan">
      <rect x="-300" y="-260" width={len + 600} height={H + 560} fill="#14161b" />
      <rect x="0" y="0" width={len} height={H} fill={byId(WALL_COLORS, room.wallColor).hex} opacity="0.25" stroke="#e7e3da" strokeWidth="10" />
      <line x1="-200" y1={H} x2={len + 200} y2={H} stroke="#e7e3da" strokeWidth="14" />
      {ops.map((o, i) => {
        const isWin = o.type === "window";
        const oh = isWin ? (o.h || 1400) : o.type === "door" ? (o.h || 2050) : o.type === "radiator" ? 500 : 90;
        const sill = isWin ? (o.sill || 900) : o.type === "radiator" ? 150 : o.type === "socket" ? 300 : 0;
        return <rect key={i} x={o.off} y={H - sill - oh} width={o.type === "socket" ? 120 : o.w} height={oh}
          fill={o.color || "#7fb6e0"} opacity="0.85" rx="14" />;
      })}
      {proj.map(({ it, ax, aw }) => {
        const c = it.cfg;
        const y = H - (c.mount || 0) - c.H;
        const fill = c.kind === "cabinet" ? resolveFacade(c.facadeMat, customTex).hex
          : c.kind === "appliance" ? byId(APPLIANCE_COLORS, c.color).hex : c.fabric || "#9aa3b5";
        return (
          <g key={it.id}>
            <rect x={ax} y={y} width={aw} height={c.H} fill={fill} opacity="0.92" stroke="#0d0f13" strokeWidth="8" />
            <text x={ax + aw / 2} y={y + c.H / 2} textAnchor="middle" fontSize={Math.min(120, aw / 4)}
              fill="#17130a" fontWeight="700" style={{ fontFamily: "Manrope,sans-serif" }}>{it.name}</text>
            <text x={ax + aw / 2} y={y + c.H / 2 + 130} textAnchor="middle" fontSize="90"
              fill="#3a2c14" style={{ fontFamily: "JetBrains Mono,monospace" }}>{c.W}×{c.H}</text>
          </g>
        );
      })}
      <text x={len / 2} y={-120} textAnchor="middle" fontSize="130" fill="#9aa0ab"
        style={{ fontFamily: "JetBrains Mono,monospace" }}>
        Развёртка стены {{ N: "верхней", S: "нижней", W: "левой", E: "правой" }[wallSide]} · {len} × {H} мм
      </text>
    </svg>
  );
}
/* ── сворачиваемая и растягиваемая панель (глобальный стандарт 6.2) ── */
function CollapsePanel({ title, side, width, onWidth, children }) {
  const [open, setOpen] = useState(true);
  const dragW = useRef(null);
  const onHandleDown = (e) => {
    e.preventDefault();
    dragW.current = { x: e.clientX ?? e.touches?.[0]?.clientX, w: width };
    const move = (ev) => {
      if (!dragW.current) return;
      const cx = ev.clientX ?? ev.touches?.[0]?.clientX;
      const dx = cx - dragW.current.x;
      onWidth(Math.min(560, Math.max(220, dragW.current.w + (side === "left" ? dx : -dx))));
    };
    const up = () => {
      dragW.current = null;
      window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move); window.addEventListener("touchend", up);
  };
  if (!open) {
    return (
      <aside className={"panel-rail " + side} onClick={() => setOpen(true)} title="Развернуть панель">
        <span className="rail-arrow">{side === "left" ? "▸" : "◂"}</span>
        <span className="rail-title">{title}</span>
      </aside>
    );
  }
  return (
    <aside className={side === "right" ? "panel right" : "panel"} style={{ width, position: "relative" }}>
      <button className="panel-collapse" title="Свернуть панель" onClick={() => setOpen(false)}>
        {side === "left" ? "◂" : "▸"}
      </button>
      {children}
      {onWidth && <div className={"resize-handle " + side} onMouseDown={onHandleDown} onTouchStart={onHandleDown} />}
    </aside>
  );
}

/* ── контролы ── */
function NumField({ label, value, min, max, step = 1, onChange, unit = "мм" }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-row">
        <input type="range" min={min} max={max} step={step} value={Math.min(value, max)} onChange={(e) => onChange(+e.target.value)} />
        <input type="number" className="num" value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, +e.target.value || min)))} />
        <span className="unit">{unit}</span>
      </div>
    </label>
  );
}
function ColorRow({ label, list, value, onChange, extra }) {
  const full = extra ? [...list, ...extra] : list;
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips">
        {full.map((c) => (
          <button key={c.id} title={c.name}
            className={value === c.id ? "chip active" : "chip"}
            style={c.url ? { backgroundImage: `url(${c.url})`, backgroundSize: "cover" } : { background: c.hex }}
            onClick={() => onChange(c.id)} />
        ))}
      </div>
      <span className="chip-name">{byId(full, value).name}</span>
    </div>
  );
}

function HandleSchematic({ cfg }) {
  if (cfg.kind !== "cabinet" || cfg.facade === "none") return null;
  const h = cfg.handle || defHandle;
  if (h.style === "none" || h.style === "profile") return null;
  const isDoors = cfg.facade === "doors";
  const dw = isDoors ? Math.round((cfg.W - 4) / Math.max(cfg.doors, 1) - 2) : cfg.W - 4;
  const dh = isDoors ? cfg.H - cfg.plinth - 4
    : Math.round((cfg.H - cfg.plinth - 4 - 3 * (cfg.drawers - 1)) / Math.max(cfg.drawers, 1));
  const ox = h.ox ?? 50, oy = h.oy ?? 60;
  const hx = isDoors ? dw - ox : dw / 2;
  const left = Math.round(hx), right = Math.round(dw - hx);
  const scale = 200 / Math.max(dw, dh);
  const vw = dw * scale, vh = dh * scale;
  const px = hx * scale, py = oy * scale;
  const vert = h.orient === "vert" || (h.orient === "auto" && dh > 1000 && isDoors);
  return (
    <svg viewBox={`-30 -34 ${vw + 70} ${vh + 60}`} className="schematic">
      <rect x="0" y="0" width={vw} height={vh} fill="#2a2e37" stroke="#4a5060" strokeWidth="1.5" rx="3" />
      {h.style === "knob"
        ? <circle cx={px} cy={py} r="5" fill="#e0a44b" />
        : vert
          ? <rect x={px - 2} y={py} width="4" height="34" rx="2" fill="#e0a44b" />
          : <rect x={px - 16} y={py - 2} width="32" height="4" rx="2" fill="#e0a44b" />}
      <line x1="0" y1="-16" x2={px} y2="-16" stroke="#9aa0ab" strokeWidth="1" />
      <line x1={px} y1="-16" x2={vw} y2="-16" stroke="#9aa0ab" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="0" y1="-22" x2="0" y2="-10" stroke="#9aa0ab" strokeWidth="1" />
      <line x1={px} y1="-22" x2={px} y2="-10" stroke="#9aa0ab" strokeWidth="1" />
      <line x1={vw} y1="-22" x2={vw} y2="-10" stroke="#9aa0ab" strokeWidth="1" />
      <text x={px / 2} y="-21" textAnchor="middle" fontSize="11" fill="#e0a44b" fontFamily="JetBrains Mono,monospace">{left}</text>
      <text x={(px + vw) / 2} y="-21" textAnchor="middle" fontSize="11" fill="#9aa0ab" fontFamily="JetBrains Mono,monospace">{right}</text>
      <line x1={vw + 14} y1="0" x2={vw + 14} y2={py} stroke="#9aa0ab" strokeWidth="1" />
      <line x1={vw + 8} y1="0" x2={vw + 20} y2="0" stroke="#9aa0ab" strokeWidth="1" />
      <line x1={vw + 8} y1={py} x2={vw + 20} y2={py} stroke="#9aa0ab" strokeWidth="1" />
      <text x={vw + 24} y={py / 2 + 4} fontSize="11" fill="#e0a44b" fontFamily="JetBrains Mono,monospace">{oy}</text>
      <text x={vw / 2} y={vh + 20} textAnchor="middle" fontSize="11" fill="#6f7580" fontFamily="JetBrains Mono,monospace">фасад {dw}×{dh}</text>
    </svg>
  );
}

/* ── ИИ: фото → мебель с bbox → текстуры из фото ── */
const AI_TYPES = { "kitchen-base": "kb600", "kitchen-drawers": "kdrw", "kitchen-sink": "ksink", "kitchen-wall": "kwall", tall: "ktall", island: "kisland", fridge: "fridge", stove: "stove", dw: "dw", hood: "hood", wardrobe: "wardrobe", kupe: "kupe", penal: "penal", komod: "komod", tv: "tv", bed: "bed", table: "table" };
async function analyzeInteriorPhoto(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const media = dataUrl.slice(5, dataUrl.indexOf(";"));
  const prompt = `Проанализируй фото интерьера. Верни ТОЛЬКО JSON без пояснений и markdown:
{"wallHex":"#...","floorHex":"#...","items":[{"type":"...","widthMM":600,"heightMM":850,"depthMM":560,"facadeHex":"#...","bbox":[x,y,w,h]}]}
bbox — рамка предмета на фото в процентах от размеров изображения (0-100), x,y — левый верхний угол.
Допустимые type: ${Object.keys(AI_TYPES).join(", ")}.
Перечисли мебель слева направо (до 12 позиций). Размеры — реалистичная оценка в мм.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 1600,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: media, data: b64 } },
        { type: "text", text: prompt },
      ]}],
    }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const txt = (data.content || []).map((c) => c.text || "").join("");
  return JSON.parse(txt.replace(/```json|```/g, "").trim());
}
function cropTexture(photoUrl, bbox) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 256; c.height = 256;
        const ctx = c.getContext("2d");
        const [bx, by, bw, bh] = (bbox || [30, 30, 40, 40]).map((v) => Math.min(99, Math.max(0, v)) / 100);
        const sx = img.width * (bx + bw * 0.22), sy = img.height * (by + bh * 0.28);
        const sw = Math.max(img.width * bw * 0.56, 12), sh = Math.max(img.height * bh * 0.44, 12);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
        resolve(c.toDataURL("image/jpeg", 0.85));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = photoUrl;
  });
}
const hexDist = (a, b) => {
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16);
  try { return Math.abs(p(a, 1) - p(b, 1)) + Math.abs(p(a, 3) - p(b, 3)) + Math.abs(p(a, 5) - p(b, 5)); } catch { return 999; }
};
const nearest = (list, hex) => list.reduce((best, m) => hexDist(m.hex, hex) < hexDist(best.hex, hex) ? m : best, list[0]);

function AIReviewModal({ review, setReview, onBuild, onCancel }) {
  const [min, setMin] = useState(false);
  if (!review) return null;
  const upd = (i, patch) => setReview((r) => ({ ...r, list: r.list.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  if (min) {
    return (
      <div className="modal-mini" onClick={() => setMin(false)}>
        📷 Разбор фото ({review.list.length} поз.) — развернуть
      </div>
    );
  }
  return (
    <div className="modal-bg">
      <div className="modal">
        <button className="panel-collapse" style={{ right: 14, top: 12 }} title="Свернуть окно" onClick={() => setMin(true)}>▁</button>
        <h2>Найдено на фото — уточните размеры</h2>
        <p className="muted small">ИИ распознал предметы и вырезал текстуры из фотографии. Проверьте размеры перед построением 3D.</p>
        <div className="ai-rows">
          {review.list.map((x, i) => (
            <div className="ai-row" key={i}>
              {x.texUrl ? <img src={x.texUrl} alt="" /> : <span className="ai-noimg">—</span>}
              <div className="ai-name">{x.name}</div>
              <label>Ш<input type="number" className="num" value={x.W} onChange={(e) => upd(i, { W: +e.target.value || x.W })} /></label>
              <label>В<input type="number" className="num" value={x.H} onChange={(e) => upd(i, { H: +e.target.value || x.H })} /></label>
              <label>Г<input type="number" className="num" value={x.D} onChange={(e) => upd(i, { D: +e.target.value || x.D })} /></label>
              <button className="mini danger" onClick={() => setReview((r) => ({ ...r, list: r.list.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onBuild}>Построить 3D с текстурами фото</button>
          <button className="btn ghost" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

/* ── редактор изделия ── */
function ItemParams({ it, ctx }) {
  const { room, stdId, customTex, texAsCorpus, texAsFacade, patchItem, patchCfgOf, rotateItem, attachItem, duplicate, removeItem } = ctx;
  const c = it.cfg;
  const isCab = c.kind === "cabinet";
  const isLight = c.kind === "light";
  const pc = (patch) => patchCfgOf(it.id, patch);
  const num = (k) => (v) => pc({ [k]: v });
  const fp = footprint(it);
  const f = fasteners(c);
  const areaM2 = (room.W * room.L) / 1e6;
  return (
    <div className="params">
      <label className="field"><span className="field-label">Название</span>
        <input className="num wide full" value={it.name} onChange={(e) => patchItem(it.id, { name: e.target.value })} />
      </label>
      <div className="btn-row">
        <button className="btn slim" onClick={() => rotateItem(it.id)}>⟳ 90°</button>
        <button className="btn slim ghost" onClick={() => attachItem(it.id)}>⇥ Приставить</button>
        <button className="btn slim ghost" onClick={() => duplicate(it.id)}>⧉</button>
        <button className="btn slim danger" onClick={() => removeItem(it.id)}>✕</button>
      </div>
      <NumField label="X от левой стены" value={Math.round(fp.x)} min={0} max={room.W} step={10}
        onChange={(v) => patchItem(it.id, { pos: { ...it.pos, x: v + fp.w / 2 } })} />
      <NumField label="Y от верхней стены" value={Math.round(fp.y)} min={0} max={room.L} step={10}
        onChange={(v) => patchItem(it.id, { pos: { ...it.pos, y: v + fp.d / 2 } })} />
      <NumField label="Ширина" value={c.W} min={100} max={6000} step={10} onChange={num("W")} />
      <NumField label="Высота" value={c.H} min={100} max={4000} step={10} onChange={num("H")} />
      <NumField label="Глубина" value={c.D} min={80} max={2000} step={10} onChange={num("D")} />
      {(c.mount || 0) > 0 && <NumField label="Высота от пола" value={c.mount} min={0} max={4500} step={10} onChange={num("mount")} />}

      {isLight && (<>
        <h4>Свет (п.5, 8)</h4>
        <label className="check"><input type="checkbox" checked={!!c.on} onChange={(e) => pc({ on: e.target.checked })} />Включён</label>
        <NumField label="Световой поток" value={c.lumens || 0} min={0} max={20000} step={100} onChange={num("lumens")} unit="лм" />
        <NumField label="Теплота света" value={Math.round((c.lightWarm ?? 0.6) * 100)} min={0} max={100} step={5}
          onChange={(v) => pc({ lightWarm: v / 100 })} unit="%" />
        <ColorRow label="Корпус светильника" list={APPLIANCE_COLORS} value={c.color} onChange={(v) => pc({ color: v })} />
        <NumField label="Цена" value={c.price || 0} min={0} max={100000} step={5} onChange={num("price")} unit="" />
        <p className="muted small ai">Норматив освещённости (СанПиН): жилая комната ≈150 лк, кухня (рабочая зона) ≈300 лк, кабинет ≈300 лк.
          Для этой комнаты ({areaM2.toFixed(1)} м²) минимум ≈ <b>{Math.round(areaM2 * 150)} лм</b> суммарно, для кухни ≈ <b>{Math.round(areaM2 * 300)} лм</b>.</p>
      </>)}

      {!isLight && (
        <button className="btn ghost" onClick={() => patchItem(it.id, { cfg: applyStandard({ ...c }, stdId) })}>
          Стандарт «{STANDARDS[stdId].name}»
        </button>
      )}

      {isCab && (<>
        <h4>Наполнение</h4>
        <NumField label="Цоколь" value={c.plinth} min={0} max={200} step={10} onChange={num("plinth")} />
        <NumField label="Секции" value={c.sections} min={1} max={6} onChange={num("sections")} unit="шт" />
        <NumField label="Полки в секции" value={c.shelves} min={0} max={10} onChange={num("shelves")} unit="шт" />
        {c.shelves > 0 && c.sections > 1 && (
          <label className="field"><span className="field-label">Где полки (п.6)</span>
            <select value={c.shelfScope || "all"} onChange={(e) => pc({ shelfScope: e.target.value })}>
              {SCOPE_OPTIONS.map((s2) => <option key={s2.id} value={s2.id}>{s2.name}</option>)}
            </select>
          </label>
        )}
        {!c.rod
          ? <button className="btn ghost" onClick={() => pc({ rod: true, rodY: 0 })}>+ Добавить штангу</button>
          : (<>
            <label className="check"><input type="checkbox" checked onChange={() => pc({ rod: false })} />Штанга установлена</label>
            <NumField label="Высота штанги (0 = авто)" value={c.rodY || 0} min={0} max={c.H} step={10}
              onChange={(v) => pc({ rodY: v })} />
            {c.sections > 1 && (
              <label className="field"><span className="field-label">Где штанга (п.6)</span>
                <select value={c.rodScope || "all"} onChange={(e) => pc({ rodScope: e.target.value })}>
                  {SCOPE_OPTIONS.map((s2) => <option key={s2.id} value={s2.id}>{s2.name}</option>)}
                </select>
              </label>
            )}
          </>)}
        <label className="field"><span className="field-label">Задняя стенка</span>
          <select value={c.backMat || "hdf"} onChange={(e) => pc({ backMat: e.target.value })}>
            {BACK_OPTIONS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        <h4>Фасады и механизмы</h4>
        <label className="field"><span className="field-label">Тип фасадов</span>
          <select value={c.facade} onChange={(e) => pc({ facade: e.target.value })}>
            <option value="doors">Двери</option><option value="drawers">Ящики</option><option value="none">Открытый</option>
          </select>
        </label>
        {c.facade === "doors" && (<>
          <label className="field"><span className="field-label">Механизм</span>
            <select value={c.doorType || "hinged"} onChange={(e) => pc({ doorType: e.target.value })}>
              <option value="hinged">Распашные (петли)</option>
              <option value="sliding">Купе / роликовые</option>
            </select>
          </label>
          <NumField label="Дверей" value={c.doors} min={1} max={6} onChange={num("doors")} unit="шт" />
          {c.doorType !== "sliding" && (
            <NumField label={`Петель на дверь (0 = авто: ${f ? f.autoH : 2})`} value={c.hingesPerDoor || 0} min={0} max={7}
              onChange={(v) => pc({ hingesPerDoor: v })} unit="шт" />
          )}
        </>)}
        {c.facade === "drawers" && <NumField label="Ящиков" value={c.drawers} min={1} max={8} onChange={num("drawers")} unit="шт" />}
        <label className="check"><input type="checkbox" checked={!!c.counter} onChange={(e) => pc({ counter: e.target.checked })} />Столешница</label>
        {c.counter && <label className="check"><input type="checkbox" checked={!!c.sink} onChange={(e) => pc({ sink: e.target.checked })} />Мойка</label>}

        <h4>Цвета</h4>
        <ColorRow label="Корпус" list={CORPUS_MATS} extra={texAsCorpus} value={c.corpusMat} onChange={(v) => pc({ corpusMat: v })} />
        {c.facade !== "none" && <ColorRow label="Фасады" list={FACADE_MATS} extra={texAsFacade} value={c.facadeMat} onChange={(v) => pc({ facadeMat: v })} />}
        {c.counter && <ColorRow label="Столешница" list={COUNTER_MATS} value={c.counterMat} onChange={(v) => pc({ counterMat: v })} />}

        {c.facade !== "none" && (<>
          <h4>Ручки</h4>
          <label className="field"><span className="field-label">Тип</span>
            <select value={c.handle?.style || "skoba"} onChange={(e) => pc({ handle: { ...(c.handle || defHandle), style: e.target.value } })}>
              {HANDLE_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          {(c.handle?.style || "skoba") === "none" && f && f.push > 0 &&
            <p className="muted small">Push-up механизмы: {f.push} шт — учтены в смете.</p>}
          {(c.handle?.style || "skoba") !== "none" && (<>
            <ColorRow label="Отделка" list={HANDLE_FINISH} value={c.handle?.finish || "black"}
              onChange={(v) => pc({ handle: { ...(c.handle || defHandle), finish: v } })} />
            {c.handle?.style !== "profile" && (<>
              <NumField label="Отступ от края открывания" value={c.handle?.ox ?? 50} min={20} max={600} step={5}
                onChange={(v) => pc({ handle: { ...(c.handle || defHandle), ox: v } })} />
              <NumField label="Отступ от верха фасада" value={c.handle?.oy ?? 60} min={20} max={2000} step={5}
                onChange={(v) => pc({ handle: { ...(c.handle || defHandle), oy: v } })} />
              <label className="field"><span className="field-label">Ориентация скобы</span>
                <select value={c.handle?.orient || "auto"} onChange={(e) => pc({ handle: { ...(c.handle || defHandle), orient: e.target.value } })}>
                  <option value="auto">Авто</option><option value="horiz">Горизонтально</option><option value="vert">Вертикально</option>
                </select>
              </label>
              <HandleSchematic cfg={c} />
            </>)}
          </>)}
        </>)}

        {f && (<>
          <h4>Крепёж</h4>
          <p className="muted small mono">
            Конфирматы: {f.conf} · Шканты: {f.dowels} · Полкодерж.: {f.shelfPins}
            {f.selftap > 0 ? ` · Саморезы: ${f.selftap}` : ""}
            {f.hinges > 0 ? ` · Петли: ${f.hinges}` : ""}
            {f.rollers > 0 ? ` · Ролики: ${f.rollers}` : ""}
            {f.push > 0 ? ` · Push-up: ${f.push}` : ""}
          </p>
        </>)}
      </>)}

      {!isCab && !isLight && (<>
        {c.kind === "appliance" && <ColorRow label="Цвет" list={APPLIANCE_COLORS} value={c.color} onChange={(v) => pc({ color: v })} />}
        {(c.kind === "furniture" || c.kind === "prim") && <label className="field"><span className="field-label">Цвет</span>
          <input type="color" className="colorpick" value={c.fabric || "#8b93a3"} onChange={(e) => pc({ fabric: e.target.value })} /></label>}
        {c.kind === "prim" && <p className="muted small">Примитив — произвольный объект-габарит (колонна, короб, подиум).</p>}
        <NumField label="Цена" value={c.price || 0} min={0} max={900000} step={5} onChange={num("price")} unit="" />
      </>)}
    </div>
  );
}

function ItemAccordion({ items, selId, setSelId, setSelOp, customTex, ctx }) {
  return (
    <div className="item-list">
      {items.map((it) => (
        <div key={it.id} className={it.id === selId ? "acc open" : "acc"}>
          <div className="acc-head" onClick={() => { setSelId(it.id === selId ? null : it.id); setSelOp(null); }}>
            <span className="swatch" style={{
              background: it.cfg.kind === "cabinet" ? resolveFacade(it.cfg.facadeMat, customTex).hex
                : it.cfg.kind === "light" ? "#ffd76e"
                : it.cfg.kind === "appliance" ? byId(APPLIANCE_COLORS, it.cfg.color).hex : "#9aa3b5" }} />
            <span className="acc-name">{it.name}</span>
            <span className="muted mono">{it.cfg.kind === "light" ? (it.cfg.lumens + " лм") : (it.cfg.W + "×" + it.cfg.H)}</span>
            <span className="acc-arrow">{it.id === selId ? "▾" : "▸"}</span>
          </div>
          {it.id === selId && <ItemParams it={it} ctx={ctx} />}
        </div>
      ))}
      {items.length === 0 && <p className="muted small">Мебели нет — добавьте из каталога слева.</p>}
    </div>
  );
}

/* ── калькулятор (отдельный пункт) ── */
function Calculator({ currency }) {
  const [disp, setDisp] = useState("0");
  const [amount, setAmount] = useState(100);
  const press = (k) => {
    setDisp((d) => {
      if (k === "C") return "0";
      if (k === "⌫") return d.length > 1 ? d.slice(0, -1) : "0";
      if (k === "=") {
        try {
          if (!/^[-0-9+*/.() ]+$/.test(d)) return d;
          const r = Function('"use strict";return (' + d.replace(/[+\-*/.]$/, "") + ")")();
          return Number.isFinite(r) ? String(Math.round(r * 10000) / 10000) : "Ошибка";
        } catch { return "Ошибка"; }
      }
      if (d === "0" && /[0-9.]/.test(k)) return k;
      if (d === "Ошибка") return /[0-9.]/.test(k) ? k : "0";
      return d + k;
    });
  };
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
  return (
    <div className="calc-wrap">
      <div className="calc">
        <div className="calc-disp mono">{disp}</div>
        <div className="calc-grid">
          <button className="calc-key wide2" onClick={() => press("C")}>C</button>
          <button className="calc-key wide2" onClick={() => press("⌫")}>⌫</button>
          {keys.map((k) => (
            <button key={k} className={k === "=" ? "calc-key eq" : "calc-key"} onClick={() => press(k)}>{k}</button>
          ))}
        </div>
      </div>
      <div className="calc">
        <h3 style={{ color: "#e0a44b", fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 10 }}>Конвертер валюты</h3>
        <label className="field"><span className="field-label">Сумма в базовой валюте (USD)</span>
          <input type="number" className="num wide" value={amount} onChange={(e) => setAmount(+e.target.value || 0)} />
        </label>
        <p className="mono" style={{ fontSize: "1rem", color: "#e0a44b" }}>
          = {Math.round(amount * currency.rate).toLocaleString("ru-RU")} {currency.sym}
        </p>
        <p className="muted small">Курс {currency.code}: {currency.rate} за 1 USD — задаётся в Смете.</p>
      </div>
    </div>
  );
}
/* ═══════════ ЭКСПОРТ (6.5 OBJ+MTL, 6.6 DXF) ═══════════ */
function dlBlob(name, text, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function dlDataUrl(name, dataUrl) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = name; a.click();
}

/* OBJ + MTL: реальная сцена → треугольники; 1 юнит = 1 мм; текстуры отдельными PNG */
function exportOBJ(room, items, customTex) {
  const scene = new THREE.Scene();
  const W = room.W * S, L = room.L * S;
  // пол как подложка
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, L),
    std(byId(FLOOR_COLORS, room.floor).hex));
  floor.position.set(0, -0.01, 0);
  scene.add(floor);
  items.forEach((it) => {
    const g = buildItem(it, customTex, true);
    g.position.x = it.pos.x * S - W / 2;
    g.position.z = it.pos.y * S - L / 2;
    g.rotation.y = (-it.pos.rot * Math.PI) / 180;
    scene.add(g);
  });
  scene.updateMatrixWorld(true);

  const mats = [];   // {key, name, color, texName, texUrl}
  const texFiles = []; // {name, url}
  const matKey = (m) => {
    const map = m.map;
    let texUrl = null;
    if (map && map.image) {
      try {
        if (map.image.toDataURL) texUrl = map.image.toDataURL("image/png");
        else if (map.image.src) texUrl = map.image.src;
      } catch (e) { texUrl = null; }
    }
    const col = m.color ? m.color.getHexString() : "cccccc";
    const key = col + "|" + (texUrl ? texUrl.slice(0, 60) : "");
    let found = mats.find((x) => x.key === key);
    if (!found) {
      let texName = null;
      if (texUrl && texUrl.startsWith("data:")) {
        texName = "tex_" + texFiles.length + ".png";
        texFiles.push({ name: texName, url: texUrl });
      }
      found = { key, name: "m" + mats.length, color: col, texName };
      mats.push(found);
    }
    return found.name;
  };

  let obj = "# Мебелировщик Pro 6.0\n# 1 unit = 1 mm\nmtllib scene.mtl\n";
  let vOff = 1, tOff = 1, mi = 0;
  scene.traverse((o) => {
    if (!o.isMesh || o.isSprite) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    if (!pos) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    obj += "o mesh_" + mi++ + "\nusemtl " + matKey(mat) + "\n";
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      obj += "v " + (v.x * 1000).toFixed(1) + " " + (v.y * 1000).toFixed(1) + " " + (v.z * 1000).toFixed(1) + "\n";
    }
    if (uv) for (let i = 0; i < uv.count; i++)
      obj += "vt " + uv.getX(i).toFixed(4) + " " + uv.getY(i).toFixed(4) + "\n";
    for (let i = 0; i < pos.count; i += 3) {
      const a = vOff + i, b = vOff + i + 1, c = vOff + i + 2;
      if (uv) {
        const ta = tOff + i, tb = tOff + i + 1, tc = tOff + i + 2;
        obj += "f " + a + "/" + ta + " " + b + "/" + tb + " " + c + "/" + tc + "\n";
      } else obj += "f " + a + " " + b + " " + c + "\n";
    }
    vOff += pos.count;
    if (uv) tOff += uv.count;
    if (geo !== o.geometry) geo.dispose();
  });

  let mtl = "# Мебелировщик Pro\n";
  mats.forEach((m) => {
    const r = parseInt(m.color.slice(0, 2), 16) / 255;
    const g2 = parseInt(m.color.slice(2, 4), 16) / 255;
    const b = parseInt(m.color.slice(4, 6), 16) / 255;
    mtl += "newmtl " + m.name + "\nKd " + r.toFixed(3) + " " + g2.toFixed(3) + " " + b.toFixed(3) + "\n";
    if (m.texName) mtl += "map_Kd " + m.texName + "\n";
    mtl += "\n";
  });

  dlBlob("scene.obj", obj);
  setTimeout(() => dlBlob("scene.mtl", mtl), 350);
  texFiles.forEach((t, i) => setTimeout(() => dlDataUrl(t.name, t.url), 700 + i * 350));
  scene.traverse((o) => o.geometry?.dispose?.());
  return { meshes: mi, mats: mats.length, tex: texFiles.length };
}

/* DXF R12: только LINE и TEXT — открывается в AutoCAD/LibreCAD/NanoCAD */
function dxfHeader() {
  return "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
}
function dxfLine(x1, y1, x2, y2) {
  return "0\nLINE\n8\n0\n10\n" + x1.toFixed(1) + "\n20\n" + y1.toFixed(1) + "\n11\n" + x2.toFixed(1) + "\n21\n" + y2.toFixed(1) + "\n";
}
function dxfRect(x, y, w, h) {
  return dxfLine(x, y, x + w, y) + dxfLine(x + w, y, x + w, y + h) + dxfLine(x + w, y + h, x, y + h) + dxfLine(x, y + h, x, y);
}
function dxfText(x, y, h, text) {
  return "0\nTEXT\n8\n0\n10\n" + x.toFixed(1) + "\n20\n" + y.toFixed(1) + "\n40\n" + h + "\n1\n" + text + "\n";
}
const dxfEnd = "0\nENDSEC\n0\nEOF\n";

function exportDXFPlan(room, items) {
  // ось Y в DXF вверх → переворачиваем план (y' = L - y)
  const L = room.L;
  let d = dxfHeader();
  d += dxfRect(0, 0, room.W, room.L);
  d += dxfRect(-110, -110, room.W + 220, room.L + 220);
  items.forEach((it) => {
    if (it.cfg.kind === "light") return;
    const fp = footprint(it);
    d += dxfRect(fp.x, L - fp.y - fp.d, fp.w, fp.d);
    d += dxfText(fp.x + 30, L - fp.y - fp.d / 2, 60, it.name + " " + it.cfg.W + "x" + it.cfg.D);
  });
  room.openings.forEach((o) => {
    const w = o.type === "socket" ? 120 : o.w;
    if (o.wall === "N") d += dxfRect(o.off, L, w, 100);
    if (o.wall === "S") d += dxfRect(o.off, -100, w, 100);
    if (o.wall === "W") d += dxfRect(-100, L - o.off - w, 100, w);
    if (o.wall === "E") d += dxfRect(room.W, L - o.off - w, 100, w);
  });
  d += dxfText(0, L + 180, 120, "Plan " + room.W + "x" + room.L + " mm");
  d += dxfEnd;
  dlBlob("plan.dxf", d, "application/dxf");
}
function exportDXFElevations(room, items) {
  ["N", "S", "W", "E"].forEach((wallSide, wi) => {
    const len = wallSide === "N" || wallSide === "S" ? room.W : room.L;
    let d = dxfHeader();
    d += dxfRect(0, 0, len, room.H);
    items.forEach((it) => {
      if (it.cfg.kind === "light") return;
      const fp = footprint(it);
      const ax = wallSide === "N" || wallSide === "S" ? fp.x : fp.y;
      const aw = wallSide === "N" || wallSide === "S" ? fp.w : fp.d;
      const y = (it.cfg.mount || 0);
      d += dxfRect(ax, y, aw, it.cfg.H);
      d += dxfText(ax + 20, y + it.cfg.H / 2, 60, it.name);
    });
    room.openings.filter((o) => o.wall === wallSide).forEach((o) => {
      const isWin = o.type === "window";
      const oh = isWin ? (o.h || 1400) : o.type === "door" ? (o.h || 2050) : o.type === "radiator" ? 500 : 90;
      const sill = isWin ? (o.sill || 900) : o.type === "radiator" ? 150 : o.type === "socket" ? 300 : 0;
      d += dxfRect(o.off, sill, o.type === "socket" ? 120 : o.w, oh);
    });
    d += dxfText(0, room.H + 150, 120, "Elevation " + wallSide + " " + len + "x" + room.H + " mm");
    d += dxfEnd;
    setTimeout(() => dlBlob("razvertka_" + wallSide + ".dxf", d, "application/dxf"), wi * 350);
  });
}

function ExportModal({ open, onClose, room, items, customTex }) {
  const [status, setStatus] = useState("");
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Экспорт проекта</h2>
        <p className="muted small">⚠ Что «теряется» при экспорте: параметры мебели (петли, ящики, смета, деталировка) не переносятся —
          другие редакторы получают только геометрию, цвета и текстуры. Анимации дверей и источники света не экспортируются.
          Масштаб: <b>1 единица = 1 мм</b> (в Blender при импорте OBJ укажите Scale 0.001, чтобы получить метры).</p>
        <button className="btn" onClick={() => {
          const r = exportOBJ(room, items, customTex);
          setStatus(`OBJ готов: объектов ${r.meshes}, материалов ${r.mats}, текстур ${r.tex}. Скачаются scene.obj + scene.mtl + текстуры — сохраните их в одну папку.`);
        }}>⬇ OBJ + MTL + текстуры (Blender, 3ds Max, Cinema 4D)</button>
        <button className="btn ghost" onClick={() => { exportDXFPlan(room, items); setStatus("plan.dxf скачан (мм, вид сверху)."); }}>⬇ DXF — план (AutoCAD)</button>
        <button className="btn ghost" onClick={() => { exportDXFElevations(room, items); setStatus("4 файла развёрток DXF скачиваются по очереди."); }}>⬇ DXF — развёртки 4 стен</button>
        {status && <p className="muted small ai">{status}</p>}
        <p className="muted small">FBX и glTF/GLB — в этапе 7: это бинарные форматы, их надёжная запись требует отдельной итерации. OBJ открывается во всех трёх редакторах.</p>
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}
/* ═══════════ ПРИЛОЖЕНИЕ ═══════════ */
let nid = 10;
export default function App() {
  const [tab, setTab] = useState("room");
  const [cat, setCat] = useState("Кухня");
  const [stdId, setStdId] = useState("euro");
  const [room, setRoom] = useState({
    W: 4200, L: 3200, H: 2700, floor: "oakf", wallColor: "warm",
    openings: [
      { wall: "N", type: "window", off: 1500, w: 1400, h: 1400, sill: 900, color: "#7fb6e0" },
      { wall: "E", type: "door", off: 500, w: 900, h: 2050, color: "#c98d4a" },
    ],
  });
  const [items, setItems] = useState(() => [
    { id: 1, name: "Мойка", cfg: JSON.parse(JSON.stringify(catItem("ksink").cfg)), pos: { x: 420, y: 290, rot: 0 } },
    { id: 2, name: "Купе", cfg: JSON.parse(JSON.stringify(catItem("kupe").cfg)), pos: { x: 3250, y: 310, rot: 0 } },
    { id: 3, name: "Люстра", cfg: JSON.parse(JSON.stringify(catItem("lustre").cfg)), pos: { x: 2100, y: 1600, rot: 0 } },
  ]);
  const [selId, setSelId] = useState(null);
  const [selOp, setSelOp] = useState(null);
  const [customTex, setCustomTex] = useState([]);
  const [lighting, setLighting] = useState({ intensity: 0.7, ambient: 0.5, warmth: 0.6 });
  const [showFacades, setShowFacades] = useState(true);
  const [aiStatus, setAiStatus] = useState("");
  const [aiReview, setAiReview] = useState(null);
  const [ui, setUi] = useState({ magnet: true, gridSize: 500, showDims: false, measure: false, view: "plan" });
  const [ui3d, setUi3d] = useState({ grid: false, gridSize: 500, ruler: false, walls: { N: true, S: true, W: true, E: true } });
  const [measure3D, setMeasure3D] = useState(false);
  const measureRef = useRef(false);
  useEffect(() => { measureRef.current = measure3D; }, [measure3D]);
  const [measurePts, setMeasurePts] = useState([]);
  const [renderImg, setRenderImg] = useState(null);
  const captureRef = useRef(null);
  const [allOpen, setAllOpen] = useState(false);
  const sceneAnimRef = useRef({});
  const [costView, setCostView] = useState("main");
  const [leftW, setLeftW] = useState(300);
  const [rightW, setRightW] = useState(330);
  const [exportOpen, setExportOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const viewRef = useRef("free");
  const [view3d, setView3d] = useState("free");
  useEffect(() => { viewRef.current = view3d; }, [view3d]);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);
  const [currency, setCurrency] = useState({ code: "USD", sym: "$", rate: 1 });
  const [prices, setPrices] = useState({
    edge: 0.25, hdfM2: 2.3, hinge: 1.2, slide: 5.5, roller: 3.5, trackM: 10,
    handle: 3, push: 3.2, rod: 3.5, leg: 0.2, screw: 0.03, pin: 0.06, dowel: 0.04, selftap: 0.02,
    work: 32, margin: 25, delivery: 0, salary: 0, vat: 0,
  });

  useEffect(() => {
    const kd = (e) => {
      if (e.key !== "r" && e.key !== "R" && e.key !== "к" && e.key !== "К") return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
      setItems((a) => a.map((it) => it.id === selId ? { ...it, pos: { ...it.pos, rot: (it.pos.rot + 90) % 360 } } : it));
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [selId]);
  /* 6.1: перетаскивание в 3D → то же состояние, тот же магнит, что и на плане */
  const onDragItem3D = (id, xmm, ymm) => {
    setItems((arr) => {
      const res = magnetizeXY(arr, id, xmm, ymm, roomRef.current, ui.magnet);
      return arr.map((it) => it.id === id ? { ...it, pos: { ...it.pos, x: Math.round(res.x), y: Math.round(res.y) } } : it);
    });
  };
  const patchItem = (id, patch) => setItems((a) => a.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const patchCfgOf = (id, patch) => setItems((a) => a.map((it) => (it.id === id ? { ...it, cfg: { ...it.cfg, ...patch } } : it)));

  const addItem = (tplItem) => {
    const id = nid++;
    const cfg = applyStandard(JSON.parse(JSON.stringify(tplItem.cfg)), stdId);
    setItems((a) => [...a, {
      id, name: tplItem.name.split(" ")[0] + " " + id, cfg,
      pos: { x: cfg.W / 2 + 120, y: cfg.D / 2 + 120 + (a.length % 4) * 150, rot: 0 },
    }]);
    setSelId(id); setSelOp(null);
  };
  const duplicate = (id) => {
    const src = items.find((i) => i.id === id);
    if (!src) return;
    const nid2 = nid++;
    setItems((a) => [...a, { ...JSON.parse(JSON.stringify(src)), id: nid2, name: src.name + " коп", pos: { ...src.pos, x: src.pos.x + footprint(src).w + 20 } }]);
    setSelId(nid2);
  };
  const removeItem = (id) => { setItems((a) => a.filter((i) => i.id !== id)); if (selId === id) setSelId(null); };
  const rotateItem = (id) => {
    const it = items.find((i) => i.id === id);
    if (it) patchItem(id, { pos: { ...it.pos, rot: (it.pos.rot + 90) % 360 } });
  };
  const attachItem = (id) => {
    const it = items.find((i) => i.id === id);
    if (!it || items.length < 2) return;
    const fp = footprint(it);
    let best = null, bestD = 1e9;
    items.forEach((o) => {
      if (o.id === id || !vOverlap(it, o) || o.cfg.kind === "light") return;
      const g = footprint(o);
      const d = Math.hypot((g.x + g.w / 2) - (fp.x + fp.w / 2), (g.y + g.d / 2) - (fp.y + fp.d / 2));
      if (d < bestD) { bestD = d; best = g; }
    });
    if (!best) return;
    const meCx = fp.x + fp.w / 2, nbCx = best.x + best.w / 2;
    const meCy = fp.y + fp.d / 2, nbCy = best.y + best.d / 2;
    let nx, ny;
    if (Math.abs(meCx - nbCx) > Math.abs(meCy - nbCy)) {
      nx = meCx < nbCx ? best.x - fp.w / 2 : best.x + best.w + fp.w / 2;
      ny = best.y + fp.d / 2;
    } else {
      ny = meCy < nbCy ? best.y - fp.d / 2 : best.y + best.d + fp.d / 2;
      nx = best.x + fp.w / 2;
    }
    patchItem(id, { pos: { ...it.pos, x: Math.round(nx), y: Math.round(ny) } });
  };

  const fileTexRef = useRef(null);
  const onTexUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = "tex:" + Date.now();
      setCustomTex((a) => [...a, { id, name: f.name.replace(/\.[^.]+$/, "").slice(0, 22), url: reader.result, hex: "#a09080", priceSheet: 28, priceM2: 30 }]);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  const texAsCorpus = customTex.map((t) => ({ id: t.id, name: t.name, hex: t.hex, url: t.url, price: t.priceSheet }));
  const texAsFacade = customTex.map((t) => ({ id: t.id, name: t.name, hex: t.hex, url: t.url }));

  const filePhotoRef = useRef(null);
  const onPhotoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setAiStatus("Анализирую фото… (10–25 секунд)");
      try {
        const plan = await analyzeInteriorPhoto(reader.result);
        const raw = (plan.items || []).filter((x) => AI_TYPES[x.type]).slice(0, 12);
        if (!raw.length) { setAiStatus("Мебель на фото не распознана. Попробуйте другой ракурс."); return; }
        const list = [];
        for (const x of raw) {
          const tpl = catItem(AI_TYPES[x.type]);
          if (!tpl) continue;
          const texUrl = tpl.cfg.kind === "cabinet" ? await cropTexture(reader.result, x.bbox) : null;
          list.push({
            tplId: tpl.id, name: tpl.name,
            W: Math.round((x.widthMM || tpl.cfg.W) / 10) * 10,
            H: Math.round((x.heightMM || tpl.cfg.H) / 10) * 10,
            D: Math.round((x.depthMM || tpl.cfg.D) / 10) * 10,
            hex: x.facadeHex || "#c9a06a", texUrl,
          });
        }
        setAiReview({ wallHex: plan.wallHex, floorHex: plan.floorHex, list });
        setAiStatus("");
      } catch (err) {
        setAiStatus("ИИ-разбор недоступен: " + err.message + ". Функция работает при запуске внутри Claude.");
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  const buildFromReview = () => {
    if (!aiReview) return;
    let cursor = 60, wallCursor = 60;
    const created = [];
    aiReview.list.forEach((x) => {
      const tpl = catItem(x.tplId);
      const cfg = applyStandard(JSON.parse(JSON.stringify(tpl.cfg)), stdId);
      cfg.W = Math.min(6000, Math.max(200, x.W));
      cfg.H = Math.min(4000, Math.max(200, x.H));
      cfg.D = Math.min(2000, Math.max(150, x.D));
      if (cfg.kind === "cabinet") {
        if (x.texUrl) {
          const texId = "tex:" + Date.now() + Math.random().toString(36).slice(2, 6);
          setCustomTex((a) => [...a, { id: texId, name: "Фото: " + x.name.slice(0, 14), url: x.texUrl, hex: x.hex, priceSheet: 28, priceM2: 30 }]);
          cfg.facadeMat = texId;
        } else {
          cfg.facadeMat = nearest(FACADE_MATS, x.hex).id;
        }
      }
      const isUpper = (cfg.mount || 0) > 800;
      const cx = (isUpper ? wallCursor : cursor) + cfg.W / 2;
      if (isUpper) wallCursor += cfg.W + 10; else cursor += cfg.W + 10;
      created.push({ id: nid++, name: tpl.name.split(" ")[0] + " " + (nid - 1), cfg, pos: { x: cx, y: cfg.D / 2 + 15, rot: 0 } });
    });
    if (aiReview.wallHex) setRoom((r) => ({ ...r, wallColor: nearest(WALL_COLORS, aiReview.wallHex).id }));
    if (aiReview.floorHex) setRoom((r) => ({ ...r, floor: nearest(FLOOR_COLORS, aiReview.floorHex).id }));
    setItems((a) => [...a, ...created]);
    setAiReview(null);
    setAiStatus(`Построено ${created.length} предметов с текстурами из фото.`);
    setTab("room");
  };

  const fileProjRef = useRef(null);
  const fileGarnRef = useRef(null);
  const insertGarniture = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d.items?.length) throw 0;
        const add2 = d.items.map((it) => ({ ...it, id: nid++, name: it.name }));
        if (d.customTex) setCustomTex((a) => {
          const have = new Set(a.map((x) => x.id));
          return [...a, ...d.customTex.filter((x) => !have.has(x.id))];
        });
        setItems((a) => [...a, ...add2]);
      } catch { alert("Файл не похож на проект/гарнитур Мебелировщика"); }
    };
    reader.readAsText(f);
    e.target.value = "";
  };
  const loadEtalon = () => {
    const two = buildEtalonItems(() => nid++);
    setItems((a) => [...a, ...two]);
    setSelId(two[0].id);
  };
  const saveProject = () => {
    const data = JSON.stringify({ v: 5, room, items, customTex, prices, stdId, currency }, null, 0);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "proekt-mebel.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const openProject = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.room) setRoom(d.room);
        if (d.items) { setItems(d.items); nid = Math.max(10, ...d.items.map((i) => i.id + 1)); }
        if (d.customTex) setCustomTex(d.customTex);
        if (d.prices) setPrices((p) => ({ ...p, ...d.prices }));
        if (d.stdId) setStdId(d.stdId);
        if (d.currency) setCurrency(d.currency);
        setSelId(null);
      } catch { alert("Не удалось прочитать файл проекта"); }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  /* агрегаты */
  const allParts = useMemo(() => items.flatMap((it) => computeParts(it.cfg, it.name, customTex)), [items, customTex]);
  const ldspGroups = useMemo(() => {
    const g = {};
    allParts.filter((p) => p.matKind === "ldsp").forEach((p) => { (g[p.matId] ||= []).push(p); });
    return Object.entries(g).map(([matId, parts]) => ({ matId, parts, sheets: nestParts(parts) }));
  }, [allParts]);
  const m2Groups = useMemo(() => {
    const g = {};
    allParts.filter((p) => p.matKind !== "ldsp").forEach((p) => {
      const gg = (g[p.matId] ||= { kind: p.matKind, parts: [], area: 0 });
      gg.parts.push(p); gg.area += (p.l * p.w * p.qty) / 1e6;
    });
    return Object.entries(g).map(([matId, v]) => ({ matId, ...v }));
  }, [allParts]);

  const m2MatName = (matId, kind) =>
    kind === "tex" ? (customTex.find((t) => t.id === matId)?.name || "Фото-декор") : byId(FACADE_MATS, matId).name;
  const m2Price = (matId, kind) =>
    kind === "tex" ? (customTex.find((t) => t.id === matId)?.priceM2 || 0) : (byId(FACADE_MATS, matId).priceM2 || 0);
  const corpusName = (matId) => isTex(matId) ? (customTex.find((t) => t.id === matId)?.name || "Фото-декор") : byId(CORPUS_MATS, matId).name;
  const corpusHexF = (matId) => isTex(matId) ? "#a09080" : byId(CORPUS_MATS, matId).hex;
  const corpusPrice = (matId) => isTex(matId) ? (customTex.find((t) => t.id === matId)?.priceSheet || 28) : byId(CORPUS_MATS, matId).price;

  /* смета по каждому изделию (≈, материалы по площади) */
  const SHEET_AREA = SHEET_W * SHEET_H / 1e6;
  const itemCostCalc = (it) => {
    const c = it.cfg;
    if (c.kind !== "cabinet") return { it, mat: c.price || 0, hw: 0, work: 0, total: c.price || 0 };
    const parts = computeParts(c, it.name, customTex);
    let mat = 0, edgeLen = 0;
    parts.forEach((p) => {
      const area = p.l * p.w * p.qty / 1e6;
      if (p.matKind === "ldsp") mat += area * corpusPrice(p.matId) / (SHEET_AREA * 0.85);
      else mat += area * m2Price(p.matId, p.matKind);
      edgeLen += p.edge * p.qty / 1000;
    });
    mat += edgeLen * prices.edge;
    if (c.counter) mat += c.W / 1000 * byId(COUNTER_MATS, c.counterMat).priceM;
    if ((c.backMat || "hdf") === "hdf") mat += c.W * (c.H - c.plinth) / 1e6 * prices.hdfM2;
    const f = fasteners(c);
    const sliding = c.facade === "doors" && c.doorType === "sliding";
    const handlesCnt = (c.handle?.style || "skoba") !== "none" && c.handle?.style !== "profile" ? f.fronts : 0;
    const rods = c.rod ? scopeCnt(c.sections, c.rodScope) : 0;
    const legs = (c.mount || 0) === 0 ? Math.max(4, c.sections * 2 + 2) : 0;
    const hw = f.hinges * prices.hinge + f.rollers * prices.roller
      + (sliding ? 2 * c.W / 1000 * prices.trackM : 0)
      + (c.facade === "drawers" ? c.drawers * prices.slide : 0)
      + handlesCnt * prices.handle + f.push * prices.push
      + rods * prices.rod + legs * prices.leg
      + f.conf * prices.screw + f.shelfPins * prices.pin + f.dowels * prices.dowel + f.selftap * prices.selftap;
    const work = prices.work;
    return { it, mat, hw, work, total: mat + hw + work };
  };
  const itemCosts = useMemo(() => items.map(itemCostCalc), [items, customTex, prices]);

  const totals = useMemo(() => {
    const cabs = items.filter((i) => i.cfg.kind === "cabinet");
    const fs = cabs.map((c) => ({ c, f: fasteners(c.cfg) }));
    const edgeLen = allParts.reduce((a, p) => a + (p.edge * p.qty) / 1000, 0);
    const totalSheets = ldspGroups.reduce((a, g) => a + g.sheets.length, 0);
    const ldspArea = allParts.filter((p) => p.matKind === "ldsp").reduce((a, p) => a + p.l * p.w * p.qty / 1e6, 0);
    const util = totalSheets ? (ldspArea / (totalSheets * SHEET_AREA)) * 100 : 0;
    const drawers = cabs.reduce((a, c) => a + (c.cfg.facade === "drawers" ? c.cfg.drawers : 0), 0);
    const hinges = fs.reduce((a, x) => a + x.f.hinges, 0);
    const rollers = fs.reduce((a, x) => a + x.f.rollers, 0);
    const push = fs.reduce((a, x) => a + x.f.push, 0);
    const trackM = cabs.filter((c) => c.cfg.facade === "doors" && c.cfg.doorType === "sliding")
      .reduce((a, c) => a + 2 * c.cfg.W / 1000, 0);
    const conf = fs.reduce((a, x) => a + x.f.conf, 0);
    const pins = fs.reduce((a, x) => a + x.f.shelfPins, 0);
    const dowels = fs.reduce((a, x) => a + x.f.dowels, 0);
    const selftap = fs.reduce((a, x) => a + x.f.selftap, 0);
    const handles = cabs.reduce((a, c) => a + ((c.cfg.handle?.style || "none") !== "none" && c.cfg.handle?.style !== "profile"
      ? (c.cfg.facade === "doors" ? c.cfg.doors : c.cfg.facade === "drawers" ? c.cfg.drawers : 0) : 0), 0);
    const rods = cabs.reduce((a, c) => a + (c.cfg.rod ? scopeCnt(c.cfg.sections, c.cfg.rodScope) : 0), 0);
    const legs = cabs.filter((c) => (c.cfg.mount || 0) === 0).reduce((a, c) => a + Math.max(4, c.cfg.sections * 2 + 2), 0);
    const hdfArea = cabs.filter((c) => (c.cfg.backMat || "hdf") === "hdf")
      .reduce((a, c) => a + (c.cfg.W * (c.cfg.H - c.cfg.plinth)) / 1e6, 0);
    const counterM = cabs.filter((c) => c.cfg.counter).reduce((a, c) => a + c.cfg.W / 1000, 0);
    const counterCost = cabs.filter((c) => c.cfg.counter).reduce((a, c) => a + (c.cfg.W / 1000) * byId(COUNTER_MATS, c.cfg.counterMat).priceM, 0);
    const goods = items.filter((i) => i.cfg.kind !== "cabinet").reduce((a, i) => a + (i.cfg.price || 0), 0);
    const totalLm = items.filter((i) => i.cfg.kind === "light" && i.cfg.on).reduce((a, i) => a + (i.cfg.lumens || 0), 0);
    const cost = {
      ldsp: ldspGroups.reduce((a, g) => a + g.sheets.length * corpusPrice(g.matId), 0),
      m2: m2Groups.reduce((a, g) => a + g.area * m2Price(g.matId, g.kind), 0),
      counter: counterCost,
      edge: edgeLen * prices.edge,
      hdf: hdfArea * prices.hdfM2,
      hinges: hinges * prices.hinge,
      slides: drawers * prices.slide,
      rollers: rollers * prices.roller,
      tracks: trackM * prices.trackM,
      handles: handles * prices.handle,
      push: push * prices.push,
      rods: rods * prices.rod,
      legs: legs * prices.leg,
      krep: conf * prices.screw + pins * prices.pin + dowels * prices.dowel + selftap * prices.selftap,
      goods,
      work: cabs.length * prices.work,
    };
    const base = Object.values(cost).reduce((a, b) => a + b, 0);
    cost.marginRub = base * prices.margin / 100;
    const subtotal = base + cost.marginRub + (prices.salary || 0) + (prices.delivery || 0);
    cost.vatRub = subtotal * (prices.vat || 0) / 100;
    cost.sum = subtotal + cost.vatRub;
    cost.clientSum = base;
    return { edgeLen, totalSheets, util, hinges, rollers, push, trackM, drawers, handles, rods, legs, conf, pins, dowels, selftap, hdfArea, counterM, cost, cabCount: cabs.length, fs, base, totalLm };
  }, [items, allParts, ldspGroups, m2Groups, prices, customTex]);

  const fmtM = (v) => Math.round(v * currency.rate).toLocaleString("ru-RU") + " " + currency.sym;

  const exportCSV = () => {
    const rows = [["Изделие", "Деталь", "Материал", "Длина", "Ширина", "Кол-во", "Кромка,мм", "Примечание"]];
    allParts.forEach((p) => {
      const matName = p.matKind === "ldsp" ? corpusName(p.matId) : m2MatName(p.matId, p.matKind);
      rows.push([p.item, p.name, matName, p.l, p.w, p.qty, p.edge * p.qty, p.note]);
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "detalirovka.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const op = selOp !== null ? room.openings[selOp] : null;
  const patchOp = (patch) =>
    setRoom((r) => ({ ...r, openings: r.openings.map((o, j) => (j === selOp ? { ...o, ...patch } : o)) }));

  const ctx = { room, stdId, customTex, texAsCorpus, texAsFacade, patchItem, patchCfgOf, rotateItem, attachItem, duplicate, removeItem };

  const toggleAllDoors = () => {
    const v = !allOpen;
    setAllOpen(v);
    sceneAnimRef.current = Object.fromEntries(items.filter((i) => i.cfg.kind === "cabinet").map((i) => [i.id, v]));
  };
  const doRender = () => {
    if (captureRef.current) setRenderImg(captureRef.current());
  };

  const TABS = [["room", "Комната и план"], ["catalog", "Каталог"], ["scene", "3D для клиента"],
    ["parts", "Деталировка"], ["cut", "Раскрой"], ["cost", "Смета"], ["calc", "Калькулятор"]];

  const miniCatalog = (
    <>
      <h3>Каталог мебели</h3>
      <div className="cat-tabs">
        {CATALOG.map((c) => (
          <button key={c.cat} className={cat === c.cat ? "cat active" : "cat"} onClick={() => setCat(c.cat)}>{c.cat}</button>
        ))}
      </div>
      <input className="num wide full" placeholder="Поиск по каталогу…" value={catSearch}
        onChange={(e) => setCatSearch(e.target.value)} style={{ marginBottom: 8 }} />
      <div className="tpl-grid">
        {(catSearch.trim()
          ? CATALOG.flatMap((c) => c.items).filter((t2) => t2.name.toLowerCase().includes(catSearch.trim().toLowerCase()))
          : CATALOG.find((c) => c.cat === cat).items).map((t2) => (
          <button key={t2.id} className="tpl-card" onClick={() => addItem(t2)}>
            <span className="tpl-icon">{t2.icon}</span>
            <span className="tpl-name">{t2.name}</span>
            <span className="muted mono">{t2.cfg.kind === "light" ? t2.cfg.lumens + " лм" : t2.cfg.W + "×" + t2.cfg.H}</span>
          </button>
        ))}
      </div>
    </>
  );

  const planTools = (
    <div className="plan-tools noprint">
      <button className={ui.magnet ? "tool on" : "tool"} onClick={() => setUi((u) => ({ ...u, magnet: !u.magnet }))}>🧲 Магнит {ui.magnet ? "вкл" : "выкл"}</button>
      <label className="tool">Сетка
        <select value={ui.gridSize} onChange={(e) => setUi((u) => ({ ...u, gridSize: +e.target.value }))}>
          <option value="100">100</option><option value="250">250</option>
          <option value="500">500</option><option value="1000">1000</option>
        </select>
      </label>
      <button className={ui.showDims ? "tool on" : "tool"} onClick={() => setUi((u) => ({ ...u, showDims: !u.showDims }))}>📏 Размеры</button>
      <button className={ui.measure ? "tool on" : "tool"} onClick={() => setUi((u) => ({ ...u, measure: !u.measure }))}>📐 Рулетка</button>
      <label className="tool">Вид
        <select value={ui.view} onChange={(e) => setUi((u) => ({ ...u, view: e.target.value }))}>
          <option value="plan">План</option>
          <option value="N">Развёртка: верхняя</option><option value="S">Развёртка: нижняя</option>
          <option value="W">Развёртка: левая</option><option value="E">Развёртка: правая</option>
        </select>
      </label>
    </div>
  );

  /* панель инструментов 3D (п.3, 7) */
  const sceneTools = (
    <div className="plan-tools noprint">
      <button className={ui.magnet ? "tool on" : "tool"} onClick={() => setUi((u) => ({ ...u, magnet: !u.magnet }))}>🧲</button>
      <label className="tool">Вид
        <select value={view3d} onChange={(e) => setView3d(e.target.value)}>
          <option value="free">Свободный</option><option value="top">Сверху (орто)</option>
          <option value="front">Спереди (орто)</option><option value="left">Слева (орто)</option>
          <option value="right">Справа (орто)</option><option value="iso">Изометрия</option>
        </select>
      </label>
      <button className={ui3d.grid ? "tool on" : "tool"} onClick={() => setUi3d((u) => ({ ...u, grid: !u.grid }))}>▦ Сетка</button>
      <label className="tool">Шаг
        <select value={ui3d.gridSize} onChange={(e) => setUi3d((u) => ({ ...u, gridSize: +e.target.value }))}>
          <option value="250">250</option><option value="500">500</option><option value="1000">1000</option>
        </select>
      </label>
      <button className={ui3d.ruler ? "tool on" : "tool"} title="Автоматически показать все размеры: мебель, зазоры, комната"
        onClick={() => setUi3d((u) => ({ ...u, ruler: !u.ruler }))}>📏 Рулетка (авто)</button>
      <button className={measure3D ? "tool on" : "tool"} title="Две точки кликами по любым поверхностям"
        onClick={() => { setMeasure3D((v) => !v); setMeasurePts([]); }}>📐 Две точки</button>
      <button className="tool" onClick={doRender}>📸 Рендер</button>
    </div>
  );

  return (
    <div className="app">
      <style>{css}</style>
      <header className="topbar noprint">
        <div className="logo">
          <span className="logo-mark">М</span>
          <div>
            <div className="logo-name">Мебелировщик Pro</div>
            <div className="logo-sub">версия 6.0</div>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(([id, name]) => (
            <button key={id} className={tab === id ? "tab active" : "tab"} onClick={() => setTab(id)}>{name}</button>
          ))}
        </nav>
        <div className="proj-btns">
          <button className="tool" onClick={saveProject} title="Сохранить проект">💾</button>
          <button className="tool" onClick={() => fileProjRef.current?.click()} title="Открыть проект">📂</button>
          <button className="tool" onClick={() => setExportOpen(true)} title="Экспорт в Blender/3ds Max/C4D/AutoCAD">⇪</button>
          <input ref={fileProjRef} type="file" accept=".json" hidden onChange={openProject} />
        </div>
        <div className="topmeta">{items.length} поз. · {fmtM(totals.cost.sum)}</div>
      </header>

      <AIReviewModal review={aiReview} setReview={setAiReview} onBuild={buildFromReview} onCancel={() => setAiReview(null)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} room={room} items={items} customTex={customTex} />

      {renderImg && (
        <div className="modal-bg" onClick={() => setRenderImg(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Рендер сцены</h2>
            <img src={renderImg} alt="Рендер" className="render-img" />
            <div className="btn-row">
              <a className="btn slim" href={renderImg} download="render.png" style={{ textAlign: "center", textDecoration: "none" }}>⬇ Скачать PNG</a>
              <button className="btn slim ghost" onClick={() => setRenderImg(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {tab === "room" && (
        <div className="layout">
          <CollapsePanel side="left" title="Помещение · Каталог" width={leftW} onWidth={setLeftW}>
            <h3>Помещение</h3>
            <NumField label="Ширина" value={room.W} min={1500} max={20000} step={50} onChange={(v) => setRoom((r) => ({ ...r, W: v }))} />
            <NumField label="Глубина" value={room.L} min={1500} max={20000} step={50} onChange={(v) => setRoom((r) => ({ ...r, L: v }))} />
            <NumField label="Потолок" value={room.H} min={2200} max={5000} step={10} onChange={(v) => setRoom((r) => ({ ...r, H: v }))} />
            <ColorRow label="Пол" list={FLOOR_COLORS} value={room.floor} onChange={(v) => setRoom((r) => ({ ...r, floor: v }))} />
            <ColorRow label="Стены" list={WALL_COLORS} value={room.wallColor} onChange={(v) => setRoom((r) => ({ ...r, wallColor: v }))} />
            <label className="field"><span className="field-label">Узор пола</span>
              <select value={(room.floorTex || {}).type || "plain"}
                onChange={(e) => setRoom((r) => ({ ...r, floorTex: { type: e.target.value, scale: (r.floorTex || {}).scale || 600 } }))}>
                {FLOOR_PATTERNS.map((p2) => <option key={p2.id} value={p2.id}>{p2.name}</option>)}
              </select>
            </label>
            {((room.floorTex || {}).type || "plain") !== "plain" &&
              <NumField label="Масштаб укладки" value={(room.floorTex || {}).scale || 600} min={200} max={1200} step={50}
                onChange={(v) => setRoom((r) => ({ ...r, floorTex: { ...(r.floorTex || { type: "lam" }), scale: v } }))} />}
            <label className="field"><span className="field-label">Отделка стен</span>
              <select value={(room.wallTex || {}).type || "plain"}
                onChange={(e) => setRoom((r) => ({ ...r, wallTex: { type: e.target.value, scale: 600 } }))}>
                {WALL_PATTERNS.map((p2) => <option key={p2.id} value={p2.id}>{p2.name}</option>)}
              </select>
            </label>
            <h3>На стену</h3>
            <div className="tpl-grid">
              {[["window", "Окно"], ["door", "Дверь"], ["radiator", "Батарея"], ["socket", "Розетка"]].map(([t2, n]) => (
                <button key={t2} className="btn ghost" onClick={() => {
                  const def = { window: { w: 1200, h: 1400, sill: 900, color: "#7fb6e0" }, door: { w: 900, h: 2050, color: "#c98d4a" },
                    radiator: { w: 800, color: "#e8e6e0" }, socket: { w: 120, color: "#d8d4c8" } }[t2];
                  setRoom((r) => ({ ...r, openings: [...r.openings, { wall: "S", type: t2, off: 300, ...def }] }));
                  setSelOp(room.openings.length); setSelId(null);
                }}>{n}</button>
              ))}
            </div>
            {op && (<>
              <h3>{{ window: "Окно", door: "Дверь", radiator: "Батарея", socket: "Розетка" }[op.type]}</h3>
              <label className="field"><span className="field-label">Стена</span>
                <select value={op.wall} onChange={(e) => patchOp({ wall: e.target.value, off: 100 })}>
                  <option value="N">Верхняя</option><option value="S">Нижняя</option>
                  <option value="W">Левая</option><option value="E">Правая</option>
                </select>
              </label>
              <NumField label="Отступ от угла" value={op.off} min={0} max={20000} step={10} onChange={(v) => patchOp({ off: v })} />
              {op.type !== "socket" && <NumField label="Ширина" value={op.w} min={300} max={5000} step={10} onChange={(v) => patchOp({ w: v })} />}
              {(op.type === "window" || op.type === "door") &&
                <NumField label="Высота" value={op.h} min={400} max={3000} step={10} onChange={(v) => patchOp({ h: v })} />}
              {op.type === "window" &&
                <NumField label="Подоконник" value={op.sill} min={0} max={1600} step={10} onChange={(v) => patchOp({ sill: v })} />}
              <label className="field"><span className="field-label">Цвет</span>
                <input type="color" className="colorpick" value={op.color} onChange={(e) => patchOp({ color: e.target.value })} />
              </label>
              <button className="btn danger" onClick={() => { setRoom((r) => ({ ...r, openings: r.openings.filter((_, j) => j !== selOp) })); setSelOp(null); }}>Удалить объект</button>
            </>)}
            {miniCatalog}
            <h3>Дизайн с фото · ИИ</h3>
            <input ref={filePhotoRef} type="file" accept="image/*" hidden onChange={onPhotoUpload} />
            <button className="btn" onClick={() => filePhotoRef.current?.click()}>📷 Фото дизайна → 3D</button>
            {aiStatus && <p className="muted small ai">{aiStatus}</p>}
          </CollapsePanel>
          <main className="stage light-pad">
            {planTools}
            {ui.view === "plan"
              ? <PlanEditor room={room} setRoom={setRoom} items={items} setItems={setItems}
                  selId={selId} setSelId={setSelId} selOp={selOp} setSelOp={setSelOp} ui={ui} customTex={customTex} />
              : <ElevationView room={room} items={items} wallSide={ui.view} customTex={customTex} />}
          </main>
          <CollapsePanel side="right" title="Мебель и параметры" width={rightW} onWidth={setRightW}>
            <h3>Мебель в комнате</h3>
            <ItemAccordion items={items} selId={selId} setSelId={setSelId} setSelOp={setSelOp} customTex={customTex} ctx={ctx} />
          </CollapsePanel>
        </div>
      )}

      {tab === "catalog" && (
        <div className="layout">
          <CollapsePanel side="left" title="Каталог · Материалы" width={leftW} onWidth={setLeftW}>
            <h3>Стандарт размеров</h3>
            <div className="cat-tabs">
              {Object.entries(STANDARDS).map(([id, s2]) => (
                <button key={id} className={stdId === id ? "cat active" : "cat"} onClick={() => setStdId(id)}>{s2.name}</button>
              ))}
            </div>
            {miniCatalog}
            <h3>Гарнитуры и обмен</h3>
            <input ref={fileGarnRef} type="file" accept=".json" hidden onChange={insertGarniture} />
            <button className="btn ghost" onClick={() => fileGarnRef.current?.click()}>📥 Вставить гарнитур из файла</button>
            <button className="btn ghost" onClick={loadEtalon}>🧪 Эталонный шкаф 3180×2500 (тест)</button>
            <button className="btn ghost" onClick={() => setExportOpen(true)}>⇪ Экспорт OBJ / DXF</button>
            <h3>Свои материалы (фото)</h3>
            <input ref={fileTexRef} type="file" accept="image/*" hidden onChange={onTexUpload} />
            <button className="btn ghost" onClick={() => fileTexRef.current?.click()}>+ Фото-текстура</button>
            {customTex.map((t) => (
              <div key={t.id} className="texrow">
                <img src={t.url} alt="" />
                <input className="num wide" value={t.name}
                  onChange={(e) => setCustomTex((a) => a.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} />
                <button className="mini danger" onClick={() => setCustomTex((a) => a.filter((x) => x.id !== t.id))}>✕</button>
              </div>
            ))}
          </CollapsePanel>
          <main className="stage">
            {items.find((i) => i.id === selId)
              ? <ItemViewer item={items.find((i) => i.id === selId)} customTex={customTex} lighting={lighting} showFacades={showFacades} />
              : <div className="empty">Добавьте модуль из каталога слева или выберите справа.<br />Клик по двери — анимация открытия.</div>}
            <div className="stage-hint noprint">Купе: левая дверь едет вправо, правая — влево. Клик по двери — открыть.</div>
          </main>
          <CollapsePanel side="right" title="Мебель и параметры" width={rightW} onWidth={setRightW}>
            <h3>Мебель проекта</h3>
            <ItemAccordion items={items} selId={selId} setSelId={setSelId} setSelOp={setSelOp} customTex={customTex} ctx={ctx} />
          </CollapsePanel>
        </div>
      )}

      {tab === "scene" && (
        <div className="layout">
          <CollapsePanel side="left" title="Стены · Свет · Показ" width={leftW} onWidth={setLeftW}>
            <h3>Стены (п.4)</h3>
            <p className="muted small">Скройте стену, мешающую обзору.</p>
            {[["N", "Верхняя"], ["S", "Нижняя"], ["W", "Левая"], ["E", "Правая"]].map(([w2, n]) => (
              <label className="check" key={w2}>
                <input type="checkbox" checked={!!ui3d.walls[w2]}
                  onChange={(e) => setUi3d((u) => ({ ...u, walls: { ...u.walls, [w2]: e.target.checked } }))} />
                {n} стена
              </label>
            ))}
            <h3>Освещение (п.5)</h3>
            <p className="muted small">Свет идёт от светильников из каталога «Свет» — добавьте люстру или бра и задайте люмены. Ниже — фоновая подсветка сцены.</p>
            <NumField label="Дневной свет (фон)" value={Math.round(lighting.ambient * 100)} min={0} max={100} step={5}
              onChange={(v) => setLighting((l) => ({ ...l, ambient: v / 100 }))} unit="%" />
            <NumField label="Солнце из окна" value={Math.round(lighting.intensity * 100)} min={0} max={150} step={5}
              onChange={(v) => setLighting((l) => ({ ...l, intensity: v / 100 }))} unit="%" />
            <p className="muted small ai">Светильников включено: {items.filter((i) => i.cfg.kind === "light" && i.cfg.on).length} ·
              суммарно <b>{totals.totalLm} лм</b>.<br />
              Норматив для {((room.W * room.L) / 1e6).toFixed(1)} м²: жилая ≈ <b>{Math.round(room.W * room.L / 1e6 * 150)} лм</b>,
              кухня ≈ <b>{Math.round(room.W * room.L / 1e6 * 300)} лм</b>.
              {totals.totalLm < room.W * room.L / 1e6 * 150 ? " ⚠ Света меньше нормы." : " ✓ Норма выполнена."}</p>
            <h3>Показ</h3>
            <label className="check">
              <input type="checkbox" checked={showFacades} onChange={(e) => setShowFacades(e.target.checked)} />
              Фасады
            </label>
            <button className="btn ghost" onClick={toggleAllDoors}>{allOpen ? "Закрыть все двери" : "Открыть все двери"}</button>
            <button className="btn" onClick={doRender}>📸 Рендер-снимок (тени)</button>
          </CollapsePanel>
          <main className="stage">
            {sceneTools}
            <SceneViewer room={room} items={items} customTex={customTex} lighting={lighting}
              showFacades={showFacades} animRef={sceneAnimRef} ui3d={ui3d}
              measurePts={measurePts} measureRef={measureRef} captureRef={captureRef}
              viewRef={viewRef} itemsRef={itemsRef} roomRef={roomRef}
              onDragItem={onDragItem3D} onDragEnd={() => {}}
              onMeasurePoint={(p) => setMeasurePts((prev) => (prev.length >= 2 ? [p] : [...prev, p]))}
              onPick={(id) => { if (id) setSelId(id); }} />
            <div className="stage-hint noprint">{measure3D ? "Две точки: кликните по двум поверхностям — первая фиксируется маркером" : "Тащите мебель мышью прямо в 3D · R — поворот · Alt+клик — выбрать объект за передним"}</div>
          </main>
          <CollapsePanel side="right" title="Мебель и параметры" width={rightW} onWidth={setRightW}>
            <h3>Мебель</h3>
            <ItemAccordion items={items} selId={selId} setSelId={setSelId} setSelOp={setSelOp} customTex={customTex} ctx={ctx} />
          </CollapsePanel>
        </div>
      )}

      {tab === "parts" && (
        <main className="page">
          <div className="page-head">
            <h2>Деталировка</h2>
            <div className="btn-row">
              <button className="btn slim noprint" onClick={exportCSV}>⬇ CSV</button>
              <button className="btn slim ghost noprint" onClick={() => window.print()}>🖨 Печать</button>
            </div>
          </div>
          <p className="muted">{allParts.reduce((a, p) => a + p.qty, 0)} деталей · кромка {Math.ceil(totals.edgeLen)} м · корпусов {totals.cabCount}</p>
          <table className="table">
            <thead><tr><th>Изделие</th><th>Деталь</th><th>Материал</th><th>Длина</th><th>Ширина</th><th>Шт</th><th>Кромка</th></tr></thead>
            <tbody>
              {allParts.map((p, i) => (
                <tr key={i}>
                  <td>{p.item}</td><td>{p.name}</td>
                  <td>{p.matKind === "ldsp" ? corpusName(p.matId) : m2MatName(p.matId, p.matKind)}</td>
                  <td className="mono">{p.l}</td><td className="mono">{p.w}</td>
                  <td className="mono">{p.qty}</td><td className="mono">{Math.round(p.edge * p.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 style={{ marginTop: 26 }}>Крепёж на сборку</h2>
          <table className="table">
            <thead><tr><th>Изделие</th><th>Конфирматы</th><th>Шканты</th><th>Полкодерж.</th><th>Саморезы</th><th>Петли</th><th>Ролики</th><th>Push-up</th></tr></thead>
            <tbody>
              {totals.fs.map(({ c, f }) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono">{f.conf}</td><td className="mono">{f.dowels}</td>
                  <td className="mono">{f.shelfPins}</td><td className="mono">{f.selftap}</td>
                  <td className="mono">{f.hinges}</td><td className="mono">{f.rollers}</td><td className="mono">{f.push}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Итого</td>
                <td className="mono">{totals.conf}</td><td className="mono">{totals.dowels}</td>
                <td className="mono">{totals.pins}</td><td className="mono">{totals.selftap}</td>
                <td className="mono">{totals.hinges}</td><td className="mono">{totals.rollers}</td><td className="mono">{totals.push}</td>
              </tr>
            </tbody>
          </table>
        </main>
      )}

      {tab === "cut" && (
        <main className="page">
          <div className="page-head">
            <h2>Раскрой ЛДСП</h2>
            <button className="btn slim ghost noprint" onClick={() => window.print()}>🖨 Печать</button>
          </div>
          <p className="muted">Лист {SHEET_W}×{SHEET_H} · пропил {KERF} мм · листов {totals.totalSheets} · выход {totals.util.toFixed(0)}%</p>
          {ldspGroups.map((g) => (
            <div key={g.matId}>
              <h3 className="mat-head"><span className="swatch" style={{ background: corpusHexF(g.matId) }} />
                {corpusName(g.matId)} — {g.sheets.length} лист.</h3>
              <div className="sheets">
                {g.sheets.map((sh, si) => (
                  <svg key={si} viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} className="sheet">
                    <rect width={SHEET_W} height={SHEET_H} className="sheet-bg" />
                    {sh.placed.map((p2, i) => (
                      <g key={i}>
                        <rect x={p2.x} y={p2.y} width={p2.l} height={p2.w} fill={corpusHexF(g.matId)} className="cut-part" />
                        <text x={p2.x + p2.l / 2} y={p2.y + p2.w / 2 - 12} className="cut-name">{p2.name}</text>
                        <text x={p2.x + p2.l / 2} y={p2.y + p2.w / 2 + 62} className="cut-dim">{p2.l}×{p2.w}</text>
                      </g>
                    ))}
                  </svg>
                ))}
              </div>
            </div>
          ))}
          {m2Groups.length > 0 && (<>
            <h2 style={{ marginTop: 26 }}>Фасады по размерам</h2>
            <table className="table">
              <thead><tr><th>Материал</th><th>Деталь</th><th>Размер</th><th>Шт</th></tr></thead>
              <tbody>
                {m2Groups.flatMap((g) => g.parts.map((p2, i) => (
                  <tr key={g.matId + i}>
                    <td>{m2MatName(g.matId, g.kind)}</td><td>{p2.item} · {p2.name}</td>
                    <td className="mono">{p2.l}×{p2.w}</td><td className="mono">{p2.qty}</td>
                  </tr>
                )))}
                <tr className="total"><td colSpan={2}>Итого</td>
                  <td className="mono">{m2Groups.reduce((a, g) => a + g.area, 0).toFixed(2)} м²</td><td /></tr>
              </tbody>
            </table>
          </>)}
        </main>
      )}

      {tab === "cost" && (
        <main className="page">
          <div className="page-head">
            <h2>Смета</h2>
            <div className="btn-row noprint">
              <label className="tool">Валюта
                <select value={currency.code} onChange={(e) => {
                  const c2 = CURRENCIES.find((x) => x.code === e.target.value);
                  setCurrency({ ...c2 });
                }}>
                  {CURRENCIES.map((c2) => <option key={c2.code} value={c2.code}>{c2.code}</option>)}
                </select>
              </label>
              <label className="tool">Курс к USD
                <input type="number" className="num" value={currency.rate}
                  onChange={(e) => setCurrency((c2) => ({ ...c2, rate: +e.target.value || 1 }))} />
              </label>
              <button className="btn slim ghost" onClick={() => window.print()}>🖨 Печать</button>
            </div>
          </div>
          <div className="cat-tabs noprint" style={{ maxWidth: 520 }}>
            {[["main", "Основная"], ["items", "По изделиям"], ["client", "Для клиента"]].map(([id, n]) => (
              <button key={id} className={costView === id ? "cat active" : "cat"} onClick={() => setCostView(id)}>{n}</button>
            ))}
          </div>

          {costView === "items" && (
            <table className="table">
              <thead><tr><th>Изделие</th><th>Материалы ≈</th><th>Фурнитура</th><th>Работа</th><th>Итого</th></tr></thead>
              <tbody>
                {itemCosts.map(({ it, mat, hw, work, total }) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td className="mono">{fmtM(mat)}</td><td className="mono">{fmtM(hw)}</td>
                    <td className="mono">{fmtM(work)}</td><td className="mono">{fmtM(total)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Итого</td>
                  <td className="mono">{fmtM(itemCosts.reduce((a, x) => a + x.mat, 0))}</td>
                  <td className="mono">{fmtM(itemCosts.reduce((a, x) => a + x.hw, 0))}</td>
                  <td className="mono">{fmtM(itemCosts.reduce((a, x) => a + x.work, 0))}</td>
                  <td className="mono big">{fmtM(itemCosts.reduce((a, x) => a + x.total, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}

          {costView !== "items" && (
            <div className="cost-grid">
              <table className="table">
                <tbody>
                  <tr><td>ЛДСП корпуса</td><td className="mono">{totals.totalSheets} лист.</td><td className="mono">{fmtM(totals.cost.ldsp)}</td></tr>
                  {totals.cost.m2 > 0 && <tr><td>Фасады МДФ / стекло / фото</td><td className="mono">{m2Groups.reduce((a, g) => a + g.area, 0).toFixed(2)} м²</td><td className="mono">{fmtM(totals.cost.m2)}</td></tr>}
                  {totals.cost.counter > 0 && <tr><td>Столешница</td><td className="mono">{totals.counterM.toFixed(2)} п.м</td><td className="mono">{fmtM(totals.cost.counter)}</td></tr>}
                  <tr><td>Кромка ПВХ</td><td className="mono">{Math.ceil(totals.edgeLen)} м</td><td className="mono">{fmtM(totals.cost.edge)}</td></tr>
                  {totals.cost.hdf > 0 && <tr><td>ХДФ (задние стенки)</td><td className="mono">{totals.hdfArea.toFixed(2)} м²</td><td className="mono">{fmtM(totals.cost.hdf)}</td></tr>}
                  {totals.hinges > 0 && <tr><td>Петли</td><td className="mono">{totals.hinges} шт</td><td className="mono">{fmtM(totals.cost.hinges)}</td></tr>}
                  {totals.drawers > 0 && <tr><td>Направляющие ящиков</td><td className="mono">{totals.drawers} компл.</td><td className="mono">{fmtM(totals.cost.slides)}</td></tr>}
                  {totals.rollers > 0 && <tr><td>Ролики купе</td><td className="mono">{totals.rollers} шт</td><td className="mono">{fmtM(totals.cost.rollers)}</td></tr>}
                  {totals.trackM > 0 && <tr><td>Направляющие купе</td><td className="mono">{totals.trackM.toFixed(1)} п.м</td><td className="mono">{fmtM(totals.cost.tracks)}</td></tr>}
                  {totals.handles > 0 && <tr><td>Ручки</td><td className="mono">{totals.handles} шт</td><td className="mono">{fmtM(totals.cost.handles)}</td></tr>}
                  {totals.push > 0 && <tr><td>Push-up механизмы</td><td className="mono">{totals.push} шт</td><td className="mono">{fmtM(totals.cost.push)}</td></tr>}
                  {totals.rods > 0 && <tr><td>Штанги</td><td className="mono">{totals.rods} шт</td><td className="mono">{fmtM(totals.cost.rods)}</td></tr>}
                  <tr><td>Ножки</td><td className="mono">{totals.legs} шт</td><td className="mono">{fmtM(totals.cost.legs)}</td></tr>
                  <tr><td>Крепёж</td>
                    <td className="mono">{totals.conf + totals.dowels + totals.pins + totals.selftap} шт</td>
                    <td className="mono">{fmtM(totals.cost.krep)}</td></tr>
                  {totals.cost.goods > 0 && <tr><td>Техника, мебель, свет</td><td className="mono">{items.filter((i) => i.cfg.kind !== "cabinet").length} поз.</td><td className="mono">{fmtM(totals.cost.goods)}</td></tr>}
                  <tr><td>Работа</td><td className="mono">{totals.cabCount} изд.</td><td className="mono">{fmtM(totals.cost.work)}</td></tr>
                  {costView === "main" && (<>
                    <tr><td>Наценка {prices.margin}%</td><td /><td className="mono">{fmtM(totals.cost.marginRub)}</td></tr>
                    <tr><td>Зарплата сотрудника</td><td />
                      <td><input type="number" className="num wide" value={prices.salary}
                        onChange={(e) => setPrices((s2) => ({ ...s2, salary: +e.target.value || 0 }))} /> $</td></tr>
                    <tr><td>Доставка</td><td />
                      <td><input type="number" className="num wide" value={prices.delivery}
                        onChange={(e) => setPrices((s2) => ({ ...s2, delivery: +e.target.value || 0 }))} /> $</td></tr>
                    <tr><td>НДС, %</td><td />
                      <td><input type="number" className="num" value={prices.vat}
                        onChange={(e) => setPrices((s2) => ({ ...s2, vat: +e.target.value || 0 }))} /> % = {fmtM(totals.cost.vatRub)}</td></tr>
                    <tr className="total"><td colSpan={2}>Итого</td><td className="mono big">{fmtM(totals.cost.sum)}</td></tr>
                  </>)}
                  {costView === "client" && (
                    <tr className="total"><td colSpan={2}>Итого для клиента</td><td className="mono big">{fmtM(totals.cost.clientSum)}</td></tr>
                  )}
                </tbody>
              </table>
              <div className="panel prices noprint">
                <h3>Тарифы (в USD)</h3>
                {[["edge", "Кромка, /м"], ["hdfM2", "ХДФ, /м²"], ["hinge", "Петля"], ["slide", "Направл. ящика"],
                  ["roller", "Ролик купе"], ["trackM", "Рельс купе, /п.м"], ["handle", "Ручка"], ["push", "Push-up механизм"],
                  ["rod", "Штанга"], ["leg", "Ножка"], ["screw", "Конфирмат"], ["pin", "Полкодержатель"], ["dowel", "Шкант"],
                  ["selftap", "Саморез"], ["work", "Работа, /корпус"], ["margin", "Наценка, %"]].map(([k, n]) => (
                  <label className="field" key={k}>
                    <span className="field-label">{n}</span>
                    <input type="number" step="0.01" className="num wide" value={prices[k]}
                      onChange={(e) => setPrices((s2) => ({ ...s2, [k]: +e.target.value || 0 }))} />
                  </label>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {tab === "calc" && (
        <main className="page">
          <h2>Калькулятор</h2>
          <Calculator currency={currency} />
        </main>
      )}
    </div>
  );
}
/* ── стили ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&family=JetBrains+Mono:wght@400;600&display=swap');
:root{--bg:#14161b;--panel:#1c1f26;--panel-2:#22262f;--line:#2e333d;--text:#e7e3da;--muted:#9aa0ab;--accent:#e0a44b}
*{box-sizing:border-box;margin:0}
html{font-size:16px}
@media (max-width:1400px){html{font-size:15px}}
@media (max-width:1000px){html{font-size:14px}}
.app{min-height:100vh;background:var(--bg);color:var(--text);font-family:'Manrope',system-ui,sans-serif;display:flex;flex-direction:column}
.mono{font-family:'JetBrains Mono',monospace;font-size:.76rem}
.topbar{display:flex;align-items:center;gap:14px;padding:9px 14px;background:var(--panel);border-bottom:1px solid var(--line);flex-wrap:wrap;position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:10px}
.logo-mark{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#b3742a);color:#17130a;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px}
.logo-name{font-weight:800;font-size:.92rem}.logo-sub{font-size:.66rem;color:var(--muted)}
.tabs{display:flex;gap:3px;background:var(--panel-2);padding:4px;border-radius:10px;flex-wrap:wrap}
.tab{border:0;background:transparent;color:var(--muted);padding:6px 10px;border-radius:8px;cursor:pointer;font:inherit;font-weight:600;font-size:.78rem}
.tab:hover{color:var(--text)}.tab.active{background:var(--accent);color:#1a1408}
.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.proj-btns{display:flex;gap:6px}
.topmeta{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--muted)}
.layout{display:flex;flex:1;min-height:0}
.panel{width:min(300px,26vw);padding:13px;background:var(--panel);border-right:1px solid var(--line);overflow-y:auto;max-height:calc(100vh - 56px)}
.panel.right{border-right:0;border-left:1px solid var(--line);width:min(330px,30vw)}
.panel h3{font-size:.66rem;text-transform:uppercase;letter-spacing:.13em;color:var(--accent);margin:15px 0 8px}
.panel h3:first-child{margin-top:0}
.params h4{font-size:.64rem;text-transform:uppercase;letter-spacing:.11em;color:var(--muted);margin:12px 0 7px}
.field{display:block;margin-bottom:9px}
.field-label{font-size:.72rem;color:var(--muted);display:block;margin-bottom:3px}
.field-row{display:flex;align-items:center;gap:7px}
input[type=range]{flex:1;accent-color:var(--accent);min-width:0}
.num{width:62px;background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:6px;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-size:.78rem}
.num.wide{width:104px}.num.full{width:100%}
.num:focus{outline:1px solid var(--accent)}
.unit{font-size:.66rem;color:var(--muted);width:24px}
select{width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:6px;padding:5px;font:inherit;font-size:.78rem}
.colorpick{width:62px;height:30px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:2px;cursor:pointer}
.check{display:flex;gap:8px;align-items:center;font-size:.78rem;color:var(--muted);margin:7px 0;cursor:pointer}
.check input{accent-color:var(--accent)}
.chips{display:flex;gap:5px;flex-wrap:wrap}
.chip{width:27px;height:27px;border-radius:7px;border:2px solid rgba(0,0,0,.4);cursor:pointer;padding:0}
.chip.active{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.chip-name{font-size:.66rem;color:var(--muted);display:block;margin-top:3px}
.btn{display:block;width:100%;background:var(--accent);color:#1a1408;border:0;border-radius:8px;padding:8px;font:inherit;font-weight:700;font-size:.8rem;cursor:pointer;margin:5px 0}
.btn:hover{filter:brightness(1.08)}
.btn.ghost{background:var(--panel-2);color:var(--text);border:1px solid var(--line);font-weight:600;font-size:.74rem}
.btn.danger{background:#7e2f2f;color:#f2dcdc}
.btn.slim{width:auto;padding:7px 11px;margin:0;flex:1}
.btn-row{display:flex;gap:5px;margin:5px 0;flex-wrap:wrap}
.mini{border:0;background:var(--panel-2);color:var(--muted);border-radius:6px;width:25px;height:25px;cursor:pointer;flex:none}
.mini.danger:hover{background:#a33b3b;color:#fff}
.cat-tabs{display:flex;gap:5px;margin-bottom:9px;flex-wrap:wrap}
.cat{flex:1;border:1px solid var(--line);background:var(--panel-2);color:var(--muted);border-radius:8px;padding:6px 4px;font:inherit;font-weight:700;font-size:.68rem;cursor:pointer;white-space:nowrap}
.cat.active{color:#1a1408;background:var(--accent);border-color:var(--accent)}
.tpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tpl-card{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:8px;color:var(--text);font:inherit;font-size:.68rem;cursor:pointer;text-align:left}
.tpl-card:hover{border-color:var(--accent)}
.tpl-icon{font-size:17px}.tpl-name{font-weight:700;line-height:1.2}
.item-list{display:flex;flex-direction:column;gap:6px}
.acc{background:var(--panel-2);border:1px solid var(--line);border-radius:9px;overflow:hidden}
.acc.open{border-color:var(--accent)}
.acc-head{display:flex;align-items:center;gap:7px;padding:8px 9px;cursor:pointer;font-size:.78rem}
.acc-name{font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acc-arrow{color:var(--muted)}
.acc .params{padding:4px 9px 11px;border-top:1px solid var(--line)}
.swatch{width:18px;height:18px;border-radius:5px;border:1px solid rgba(0,0,0,.4);flex:none}
.texrow{display:flex;align-items:center;gap:7px;margin:5px 0}
.texrow img{width:32px;height:32px;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.schematic{width:100%;max-width:245px;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;margin-top:5px}
.stage{flex:1;position:relative;min-width:0;min-height:0}
.stage.light-pad{padding:8px;display:flex;flex-direction:column}
.viewer{position:absolute;inset:0;cursor:grab}.viewer:active{cursor:grabbing}
.plan{width:100%;height:100%;flex:1;touch-action:none;user-select:none;min-height:0}
.plan-tools{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;display:flex;gap:6px;background:rgba(28,31,38,.92);border:1px solid var(--line);border-radius:12px;padding:6px 8px;flex-wrap:wrap;justify-content:center;max-width:96%}
.tool{display:flex;align-items:center;gap:5px;border:1px solid var(--line);background:var(--panel-2);color:var(--muted);border-radius:8px;padding:5px 9px;font:inherit;font-size:.7rem;font-weight:600;cursor:pointer;white-space:nowrap}
.tool.on{color:#1a1408;background:var(--accent);border-color:var(--accent)}
.tool select{width:auto;padding:2px 4px;font-size:.7rem;background:transparent;border:0;color:inherit}
.tool.on select{color:#1a1408}
.stage-hint{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);font-size:.66rem;color:var(--muted);background:rgba(20,22,27,.82);padding:4px 12px;border-radius:20px;pointer-events:none;white-space:nowrap;max-width:96%;overflow:hidden;text-overflow:ellipsis}
.empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);padding:20px;text-align:center;line-height:1.6}
.page{padding:22px;max-width:1150px;width:100%;margin:0 auto;overflow-y:auto}
.page-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.page-head .btn-row{margin:0}
.page h2{font-weight:800;margin-bottom:6px;font-size:1.2rem}
.muted{color:var(--muted);font-size:.78rem}.small{font-size:.72rem;margin:5px 0}
.ai{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:8px}
.table{width:100%;border-collapse:collapse;margin-top:13px;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.table th{font-size:.64rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}
.table td{padding:7px 10px;border-bottom:1px solid var(--line);font-size:.78rem}
.table tr:last-child td{border-bottom:0}
.table .total td{background:var(--panel-2);font-weight:700}
.big{color:var(--accent);font-size:.95rem}
.mat-head{display:flex;align-items:center;gap:8px;margin:17px 0 7px;font-size:.82rem}
.sheets{display:flex;flex-direction:column;gap:14px}
.sheet{width:100%;height:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel)}
.sheet-bg{fill:#1a1d24;stroke:var(--line);stroke-width:6}
.cut-part{fill-opacity:.88;stroke:#17130a;stroke-width:6}
.cut-name{fill:#241b0d;font-size:52px;font-weight:700;text-anchor:middle;font-family:'Manrope',sans-serif}
.cut-dim{fill:#3a2c14;font-size:48px;text-anchor:middle;font-family:'JetBrains Mono',monospace}
.cost-grid{display:grid;grid-template-columns:1fr 290px;gap:16px;align-items:start;margin-top:11px}
.prices{border:1px solid var(--line);border-radius:10px;width:auto;max-height:none}
.modal-bg{position:fixed;inset:0;background:rgba(10,12,16,.75);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
.modal{background:var(--panel);border:1px solid var(--accent);border-radius:14px;padding:18px;max-width:640px;width:100%;max-height:88vh;overflow-y:auto}
.modal h2{font-size:1.05rem;font-weight:800;margin-bottom:6px}
.ai-rows{display:flex;flex-direction:column;gap:7px;margin:12px 0}
.ai-row{display:flex;align-items:center;gap:8px;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:7px}
.ai-row img{width:44px;height:44px;object-fit:cover;border-radius:7px;border:1px solid var(--line);flex:none}
.ai-noimg{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted);background:var(--panel);border-radius:7px;flex:none}
.ai-name{flex:1;min-width:80px;font-size:.76rem;font-weight:700}
.ai-row label{display:flex;align-items:center;gap:3px;font-size:.66rem;color:var(--muted)}
@media (max-width:1100px){
  .layout{flex-wrap:wrap}
  .panel{width:50% !important;max-height:38vh;order:2}
  .panel.right{width:50% !important;order:3}
  .panel-rail{width:100%;flex-direction:row;justify-content:center;padding:8px 0;order:2}
  .rail-title{writing-mode:horizontal-tb}
  .resize-handle{display:none}
  .stage{width:100%;min-height:52vh;order:1}
}
@media (max-width:640px){
  .panel,.panel.right{width:100% !important}
  .cost-grid{grid-template-columns:1fr}
  .topmeta{display:none}
}

.render-img{width:100%;border-radius:10px;border:1px solid var(--line);margin:10px 0}
.tool input.num{width:70px;background:transparent;border:0;color:inherit;padding:2px 4px}
.calc-wrap{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px}
.calc{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;width:280px}
.calc-disp{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:1.25rem;text-align:right;margin-bottom:10px;min-height:52px;word-break:break-all;color:var(--accent)}
.calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.calc-key{background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:8px;padding:12px 0;font:inherit;font-size:1rem;font-weight:700;cursor:pointer}
.calc-key:hover{border-color:var(--accent)}
.calc-key.eq{background:var(--accent);color:#1a1408}
.calc-key.wide2{grid-column:span 2;color:#e08a8a}


.panel-rail{width:36px;background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 0;cursor:pointer;flex:none}
.panel-rail.right{border-right:0;border-left:1px solid var(--line)}
.panel-rail:hover{background:var(--panel-2)}
.rail-arrow{color:var(--accent);font-size:1rem}
.rail-title{writing-mode:vertical-rl;font-size:.66rem;color:var(--muted);letter-spacing:.14em;text-transform:uppercase}
.panel-collapse{position:absolute;top:10px;right:10px;z-index:4;border:1px solid var(--line);background:var(--panel-2);color:var(--muted);border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:.7rem;line-height:1}
.panel-collapse:hover{color:var(--accent);border-color:var(--accent)}
.panel.right .panel-collapse{right:auto;left:10px}
.resize-handle{position:absolute;top:0;bottom:0;width:7px;cursor:ew-resize;z-index:5}
.resize-handle.left{right:-3px}
.resize-handle.right{left:-3px}
.resize-handle:hover{background:rgba(224,164,75,.35)}
.modal-mini{position:fixed;bottom:14px;right:14px;z-index:50;background:var(--panel);border:1px solid var(--accent);border-radius:10px;padding:9px 14px;font-size:.78rem;cursor:pointer;color:var(--text)}
.modal-mini:hover{background:var(--panel-2)}
.modal{position:relative}

@media print{
  .noprint,.topbar,.panel,.plan-tools,.stage-hint{display:none !important}
  .app{background:#fff;color:#111}
  .page{max-width:100%;padding:0}
  .table{background:#fff;border-color:#999}
  .table td,.table th{color:#111;border-color:#bbb}
  .table .total td{background:#eee}
  .muted{color:#444}
  .sheet{background:#fff}
  .big{color:#111}
}
`;
