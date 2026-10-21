#!/usr/bin/env node
/*
  CorelDRAW API'sini taklit eden minimal bir kosum ortami.
  Gercek CorelDRAW olmadan betiklerin mantigini ve geometrisini test eder.

    node tests/mock_coreldraw.js
*/

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(ROOT, "scripts");

class Color {
  constructor(owner) {
    this.owner = owner || null;
    this.CMYKCyan = 0;
    this.CMYKMagenta = 0;
    this.CMYKYellow = 0;
    this.CMYKBlack = 0;
    this.IsSpot = false;
    this.SpotColorName = "";
  }
  CMYKAssign(c, m, y, k) {
    this.CMYKCyan = c;
    this.CMYKMagenta = m;
    this.CMYKYellow = y;
    this.CMYKBlack = k;
    if (this.owner) this.owner.cmyk = [c, m, y, k];
  }
}

class Shape {
  constructor(page, x0, y0, x1, y1) {
    this.page = page;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.locked = false;
    this.cmyk = null;
    this.Fill = { Type: 0, UniformColor: new Color(this) };
    this.Outline = { Type: 0, Width: 0.2, Color: new Color(this) };
  }
  fillCMYK(c, m, y, k) {
    this.Fill.Type = 1;
    this.Fill.UniformColor.CMYKAssign(c, m, y, k);
    return this;
  }
  outlineCMYK(c, m, y, k) {
    this.Outline.Type = 1;
    this.Outline.Color.CMYKAssign(c, m, y, k);
    return this;
  }
  spotFill(name) {
    this.Fill.Type = 1;
    this.Fill.UniformColor.IsSpot = true;
    this.Fill.UniformColor.SpotColorName = name;
    return this;
  }
  spotOutline(name) {
    this.Outline.Type = 1;
    this.Outline.Color.IsSpot = true;
    this.Outline.Color.SpotColorName = name;
    return this;
  }
  noFill() {
    this.Fill.Type = 0;
    return this;
  }
  noOutline() {
    this.Outline.Type = 0;
    return this;
  }
  MoveToLayer(layer) {
    const oldPage = this.page;
    const oldLayer = oldPage.layers.find((item) => item.Shapes.items.includes(this));
    if (oldLayer) {
      const index = oldLayer.Shapes.items.indexOf(this);
      oldLayer.Shapes.items.splice(index, 1);
    }
    oldPage.allShapes = oldPage.allShapes.filter((item) => item !== this);
    layer.Shapes.add(this);
    this.page = layer.page;
    this.page.allShapes.push(this);
  }
  get PositionX() { return this.x0; }
  get PositionY() { return this.y0; }
  get Locked() { return this.locked; }
  set Locked(value) { this.locked = value; }
  get BoundingBox() {
    return { Left: this.x0, Bottom: this.y0, Right: this.x1, Top: this.y1 };
  }
  Move(dx, dy) {
    if (this.locked) throw new Error("Shape is locked");
    this.x0 += dx;
    this.x1 += dx;
    this.y0 += dy;
    this.y1 += dy;
  }
  rect() { return [this.x0, this.y0, this.x1, this.y1].map((v) => round(v)); }
}

class ShapeCollection {
  constructor() { this.items = []; }
  get Count() { return this.items.length; }
  Item(index) {
    const item = this.items[index - 1];
    if (!item) throw new Error("Shape index out of range: " + index);
    return item;
  }
  add(shape) { this.items.push(shape); return shape; }
}

class Layer {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.Shapes = new ShapeCollection();
    this.Editable = true;
    this.Printable = true;
    this.Visible = true;
    this.IsSpecialLayer = false;
  }
  get Name() { return this.name; }
  set Name(value) { this.name = value; }
  CreateRectangle(x0, y0, x1, y1) {
    const shape = new Shape(this.page, x0, y0, x1, y1);
    this.Shapes.add(shape);
    this.page.allShapes.push(shape);
    return shape;
  }
  Delete() {
    const index = this.page.layers.indexOf(this);
    if (index < 0) throw new Error("Layer already deleted");
    this.page.layers.splice(index, 1);
  }
}

class ShapeRange {
  constructor(shapes) { this.shapes = shapes; }
  get Count() { return this.shapes.length; }
  Item(index) {
    const shape = this.shapes[index - 1];
    if (!shape) throw new Error("ShapeRange index out of range: " + index);
    return shape;
  }
  get BoundingBox() {
    if (!this.shapes.length) return null;
    let left = Infinity, bottom = Infinity, right = -Infinity, top = -Infinity;
    this.shapes.forEach((shape) => {
      const box = shape.BoundingBox;
      left = Math.min(left, box.Left);
      bottom = Math.min(bottom, box.Bottom);
      right = Math.max(right, box.Right);
      top = Math.max(top, box.Top);
    });
    return { Left: left, Bottom: bottom, Right: right, Top: top };
  }
}

class Page {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.layers = [];
    this.allShapes = [];
    this.shiftOnResize = { dx: 0, dy: 0 };
    this.doc = null;
  }
  get Index() { return this.doc ? this.doc.pages.indexOf(this) + 1 : 1; }
  get SizeWidth() { return this.w; }
  get SizeHeight() { return this.h; }
  get Layers() {
    const page = this;
    return {
      get Count() { return page.layers.length; },
      Item(index) {
        const layer = page.layers[index - 1];
        if (!layer) throw new Error("Layer index out of range: " + index);
        return layer;
      },
      Find(name) {
        return page.layers.find((layer) => layer.name === name) || null;
      },
    };
  }
  CreateLayer(name) {
    const layer = new Layer(this, name);
    this.layers.push(layer);
    return layer;
  }
  SetSize(width, height) {
    this.w = width;
    this.h = height;
    const { dx, dy } = this.shiftOnResize;
    if (dx || dy) this.allShapes.forEach((shape) => shape.Move(dx, dy));
  }
}

class Document {
  constructor(page) {
    this.Unit = 4;
    this.pages = [page];
    page.doc = this;
    this.ActivePage = page;
  }
  get Pages() {
    const doc = this;
    return {
      get Count() { return doc.pages.length; },
      Item(index) {
        const page = doc.pages[index - 1];
        if (!page) throw new Error("Page index out of range: " + index);
        return page;
      },
    };
  }
  AddPagesEx(count, width, height) {
    let first = null;
    for (let i = 0; i < count; i++) {
      const page = new Page(width, height);
      page.doc = this;
      page.CreateLayer("Layer 1");
      this.pages.push(page);
      if (!first) first = page;
    }
    this.ActivePage = first;
    return first;
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function makePage(width = 100, height = 50, withShape = true) {
  const page = new Page(width, height);
  const base = page.CreateLayer("Layer 1");
  if (withShape) base.CreateRectangle(0, 0, 10, 10);
  return page;
}

function run(scriptName, page, selection = null, doc = null) {
  const code = fs.readFileSync(path.join(SCRIPTS, scriptName), "utf8");
  const alerts = [];
  const document = doc || new Document(page);
  const sandbox = {
    host: {
      ActiveDocument: document,
      ActiveSelection: selection,
    },
    alert: (text) => alerts.push(String(text)),
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptName });
  return alerts;
}

function marks(page) {
  const layer = page.Layers.Find("Regmark");
  if (!layer) return [];
  return layer.Shapes.items.map((shape) => shape.rect());
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const FRAME = 18; // 3 marka + 5 bosluk + 10 kenar

test("OPOS X: sayfa buyur, icerik kayar, 4 kare", () => {
  const page = makePage();
  const alerts = run("Summa-OPOS-X.js", page);

  assert.strictEqual(alerts.length, 1, "tek bilgi mesaji bekleniyor");
  assert.ok(/eklendi/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 136);
  assert.strictEqual(round(page.SizeHeight), 86);
  assert.deepStrictEqual(page.allShapes[0].rect(), [18, 18, 28, 28], "icerik +18 mm kaymali");

  const rects = marks(page);
  assert.strictEqual(rects.length, 4);
  assert.deepStrictEqual(rects[0], [10, 73, 13, 76], "sol ust");
  assert.deepStrictEqual(rects[1], [123, 73, 126, 76], "sag ust");
  assert.deepStrictEqual(rects[2], [10, 10, 13, 13], "sol alt");
  assert.deepStrictEqual(rects[3], [123, 10, 126, 13], "sag alt");

  const layer = page.Layers.Find("Regmark");
  assert.strictEqual(layer.Editable, false, "katman kilitli olmali");
  layer.Shapes.items.forEach((shape) => {
    assert.deepStrictEqual(shape.cmyk, [0, 0, 0, 100], "100K siyah");
    assert.strictEqual(shape.Outline.Type, 0, "contur yok");
  });
});

test("OPOS XY: alt cizgi eklenir (5 nesne)", () => {
  const page = makePage();
  run("Summa-OPOS-XY.js", page);
  const rects = marks(page);
  assert.strictEqual(rects.length, 5);
  assert.deepStrictEqual(rects[4], [18, 10, 118, 13], "alt cizgi");
});

test("OPOS XY2: alt + ust cizgi (6 nesne)", () => {
  const page = makePage();
  run("Summa-OPOS-XY2.js", page);
  const rects = marks(page);
  assert.strictEqual(rects.length, 6);
  assert.deepStrictEqual(rects[4], [18, 10, 118, 13], "alt cizgi");
  assert.deepStrictEqual(rects[5], [18, 73, 118, 76], "ust cizgi");
});

test("sayfaBuyut=false: sayfa ayni kalir, markalar icerde", () => {
  const page = makePage();
  // Betigi gecici olarak inside moda al
  const source = fs
    .readFileSync(path.join(SCRIPTS, "Summa-OPOS-X.js"), "utf8")
    .replace("sayfaBuyut: true", "sayfaBuyut: false");
  const file = path.join(SCRIPTS, ".tmp-inside.js");
  fs.writeFileSync(file, source);
  try {
    const alerts = run(".tmp-inside.js", page);
    assert.ok(/eklendi/.test(alerts[0]), alerts[0]);
  } finally {
    fs.unlinkSync(file);
  }
  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(round(page.SizeHeight), 50);
  assert.deepStrictEqual(page.allShapes[0].rect(), [0, 0, 10, 10], "icerik kaymamali");
  const rects = marks(page);
  assert.deepStrictEqual(rects[0], [10, 37, 13, 40], "sol ust icerde");
});

test("kilitli nesne varsa sayfa buyutulmez", () => {
  const page = makePage();
  page.allShapes[0].Locked = true;
  const alerts = run("Summa-OPOS-X.js", page);
  assert.ok(/kilitli/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(page.Layers.Find("Regmark"), null);
});

test("kilitli katman varsa sayfa buyutulmez", () => {
  const page = makePage();
  page.Layers.Item(1).Editable = false;
  const alerts = run("Summa-OPOS-X.js", page);
  assert.ok(/kilitli/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(page.Layers.Find("Regmark"), null);
});

test("tekrar calistirma sayfayi tekrar buyutmez", () => {
  const page = makePage();
  run("Summa-OPOS-X.js", page);
  const afterFirst = [round(page.SizeWidth), round(page.SizeHeight)];
  const alerts = run("Summa-OPOS-X.js", page);
  assert.ok(/eklendi/.test(alerts[0]), alerts[0]);
  assert.deepStrictEqual([round(page.SizeWidth), round(page.SizeHeight)], afterFirst);
  assert.strictEqual(marks(page).length, 4);
  assert.deepStrictEqual(page.allShapes[0].rect(), [18, 18, 28, 28]);
});

test("SetSize icerigi kaydirsa telafi eder", () => {
  const page = makePage();
  page.shiftOnResize = { dx: 5, dy: 7 };
  run("Summa-OPOS-X.js", page);
  assert.deepStrictEqual(page.allShapes[0].rect(), [18, 18, 28, 28]);
});

test("temizleme betigi Regmark katmanini siler", () => {
  const page = makePage();
  run("Summa-OPOS-X.js", page);
  const alerts = run("Summa-Regmark-Kaldir.js", page);
  assert.ok(/silindi/.test(alerts[0]), alerts[0]);
  assert.strictEqual(page.Layers.Find("Regmark"), null);
  assert.strictEqual(round(page.SizeWidth), 136, "sayfa kucultulmez");
  assert.deepStrictEqual(page.allShapes[0].rect(), [18, 18, 28, 28]);
});

function runWithSettings(scriptName, replacements, page, selection = null, doc = null) {
  let source = fs.readFileSync(path.join(SCRIPTS, scriptName), "utf8");
  replacements.forEach(([from, to]) => {
    source = source.replace(from, to);
  });
  const name = ".tmp-" + Math.random().toString(36).slice(2) + ".js";
  const file = path.join(SCRIPTS, name);
  fs.writeFileSync(file, source);
  try {
    return run(name, page, selection, doc);
  } finally {
    fs.unlinkSync(file);
  }
}

test("secili obje: isaretler ve sayfa secime gore", () => {
  const page = makePage(100, 50, false);
  const shape = page.layers[0].CreateRectangle(20, 10, 60, 40);
  const alerts = run("Summa-OPOS-X.js", page, new ShapeRange([shape]));

  assert.ok(/Seçili obje/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 100, "sayfa genisligi korunmali");
  assert.strictEqual(round(page.SizeHeight), 66, "yalnizca yukseklik buyumeli");
  assert.deepStrictEqual(shape.rect(), [20, 18, 60, 48], "secim yalnizca yukari kaymali");
  assert.deepStrictEqual(marks(page), [
    [12, 53, 15, 56],
    [65, 53, 68, 56],
    [12, 10, 15, 13],
    [65, 10, 68, 13],
  ]);
});

test("secili obje sol/alt kenardaysa icerik kaydirilir", () => {
  const page = makePage(100, 50, false);
  const shape = page.layers[0].CreateRectangle(0, 0, 30, 20);
  run("Summa-OPOS-XY.js", page, new ShapeRange([shape]));

  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(round(page.SizeHeight), 56);
  assert.deepStrictEqual(shape.rect(), [18, 18, 48, 38]);
  assert.deepStrictEqual(marks(page)[0], [10, 43, 13, 46]);
  assert.strictEqual(marks(page).length, 5);
});

test("secili obje + sayfaBuyut=false: sayfa sabit, markalar sigar", () => {
  const page = makePage(100, 50, false);
  const shape = page.layers[0].CreateRectangle(20, 10, 60, 40);
  const alerts = runWithSettings(
    "Summa-OPOS-X.js",
    [["sayfaBuyut: true", "sayfaBuyut: false"]],
    page,
    new ShapeRange([shape])
  );

  assert.ok(/sayfa sabit/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(round(page.SizeHeight), 50);
  assert.deepStrictEqual(shape.rect(), [20, 10, 60, 40]);
  assert.deepStrictEqual(marks(page), [
    [12, 45, 15, 48],
    [65, 45, 68, 48],
    [12, 2, 15, 5],
    [65, 2, 68, 5],
  ]);
});

test("secili obje + sayfaBuyut=false: sigmazsa uyarir", () => {
  const page = makePage(100, 50, false);
  const shape = page.layers[0].CreateRectangle(0, 0, 20, 20);
  const alerts = runWithSettings(
    "Summa-OPOS-X.js",
    [["sayfaBuyut: true", "sayfaBuyut: false"]],
    page,
    new ShapeRange([shape])
  );

  assert.ok(/sayfa dışına/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 100);
  assert.strictEqual(page.Layers.Find("Regmark"), null);
});

test("secimeGore=false: secim yok sayilir, sayfa baz alinir", () => {
  const page = makePage(100, 50, false);
  const shape = page.layers[0].CreateRectangle(20, 10, 60, 40);
  const alerts = runWithSettings(
    "Summa-OPOS-X.js",
    [["secimeGore: true", "secimeGore: false"]],
    page,
    new ShapeRange([shape])
  );

  assert.ok(/Mod: Sayfa/.test(alerts[0]), alerts[0]);
  assert.strictEqual(round(page.SizeWidth), 136);
  assert.strictEqual(round(page.SizeHeight), 86);
  assert.deepStrictEqual(shape.rect(), [38, 28, 78, 58]);
});

test("uzun is: esit aralikli ek marka satirlari", () => {
  const page = makePage(100, 700, false);
  const alerts = runWithSettings(
    "Summa-OPOS-X.js",
    [["sayfaBuyut: true", "sayfaBuyut: false"]],
    page
  );

  assert.ok(/Marka satırı: 4/.test(alerts[0]), alerts[0]);
  const rects = marks(page);
  assert.strictEqual(rects.length, 8, "4 satir x 2 kenar");

  const left = rects.filter((r) => r[0] === 10);
  assert.strictEqual(left.length, 4);
  const centers = left.map((r) => (r[1] + r[3]) / 2).sort((a, b) => a - b);
  const gaps = centers.slice(1).map((value, index) => round(value - centers[index]));
  assert.ok(gaps.every((gap) => Math.abs(gap - gaps[0]) < 0.01), "araliklar esit");
  assert.ok(gaps[0] <= 300.01, "aralik 300 mm'yi gecmemeli");
});

test("kesim ayir: magenta nesneler yeni sayfaya tasinir", () => {
  const page = makePage(100, 50, false);
  const base = page.layers[0];
  const cut = base.CreateRectangle(10, 10, 80, 40).noFill().outlineCMYK(0, 100, 0, 0);
  const design = base.CreateRectangle(5, 5, 20, 20).fillCMYK(100, 0, 0, 0).noOutline();
  const fillCut = base.CreateRectangle(30, 10, 50, 20).fillCMYK(0, 100, 0, 0).noOutline();
  const mixed = base.CreateRectangle(60, 10, 70, 20).fillCMYK(100, 0, 0, 0).outlineCMYK(0, 100, 0, 0);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, null, doc);
  assert.ok(/ayrıldı/.test(alerts[0]), alerts[0]);
  assert.strictEqual(doc.pages.length, 2, "yeni kesim sayfasi olusmali");
  assert.strictEqual(round(doc.pages[1].SizeWidth), 100);
  assert.strictEqual(round(doc.pages[1].SizeHeight), 50);

  const cutLayer = doc.pages[1].Layers.Find("Kesim");
  assert.ok(cutLayer, "Kesim katmani olusmali");
  assert.strictEqual(cutLayer.Shapes.Count, 2);
  assert.deepStrictEqual(cut.rect(), [10, 10, 80, 40], "konum korunmali");
  assert.deepStrictEqual(fillCut.rect(), [30, 10, 50, 20]);
  assert.strictEqual(base.Shapes.Count, 2, "tasarim ve karisik nesne kalir");
  assert.ok(/Taşınan nesne: 2/.test(alerts[0]), alerts[0]);
  assert.ok(/Karışık \(atlanan\): 1/.test(alerts[0]), alerts[0]);
});

test("kesim ayir: katman modunda sayfa korunur", () => {
  const page = makePage(100, 50, false);
  const base = page.layers[0];
  base.CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 100, 0, 0);
  base.CreateRectangle(30, 10, 40, 20).fillCMYK(0, 100, 0, 0).noOutline();
  const doc = new Document(page);

  const alerts = runWithSettings(
    "Summa-Kesim-Ayir.js",
    [["  yeniSayfa: true,", "  yeniSayfa: false,"]],
    page,
    null,
    doc
  );

  assert.strictEqual(doc.pages.length, 1, "sayfa eklenmemeli");
  const layer = page.Layers.Find("Kesim");
  assert.ok(layer, "Kesim katmani olusmali");
  assert.strictEqual(layer.Shapes.Count, 2);
  assert.strictEqual(base.Shapes.Count, 0);
  assert.ok(/aynı sayfa/.test(alerts[0]), alerts[0]);
});

test("kesim ayir: spot renk adi ile tanima", () => {
  const page = makePage(100, 50, false);
  const base = page.layers[0];
  base.CreateRectangle(10, 10, 20, 20).noFill().spotOutline("Cut");
  base.CreateRectangle(30, 10, 40, 20).spotFill("Kesim");

  const doc = new Document(page);
  const alerts = run("Summa-Kesim-Ayir.js", page, null, doc);
  assert.ok(/Taşınan nesne: 2/.test(alerts[0]), alerts[0]);
  assert.strictEqual(doc.pages[1].Layers.Find("Kesim").Shapes.Count, 2);
});

test("kesim ayir: tolerans siniri", () => {
  const nearPage = makePage(100, 50, false);
  nearPage.layers[0].CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 99.6, 0, 0);
  const nearDoc = new Document(nearPage);
  run("Summa-Kesim-Ayir.js", nearPage, null, nearDoc);
  assert.strictEqual(nearDoc.pages.length, 2, "99.6 magenta sayilmali");

  const farPage = makePage(100, 50, false);
  farPage.layers[0].CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 99, 0, 0);
  const farDoc = new Document(farPage);
  const alerts = run("Summa-Kesim-Ayir.js", farPage, null, farDoc);
  assert.strictEqual(farDoc.pages.length, 1, "99 magenta sayilmamali");
  assert.ok(/bulunamadı/.test(alerts[0]), alerts[0]);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log("ok   " + name);
  } catch (error) {
    failed++;
    console.log("FAIL " + name);
    console.log("     " + error.message);
  }
}

console.log("\n" + (tests.length - failed) + "/" + tests.length + " test gecti");
process.exit(failed ? 1 : 0);
