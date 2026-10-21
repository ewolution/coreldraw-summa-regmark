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

class Shape {
  constructor(page, x0, y0, x1, y1) {
    this.page = page;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.locked = false;
    this.cmyk = null;
    this.Fill = {
      UniformColor: {
        CMYKAssign: (c, m, y, k) => {
          this.cmyk = [c, m, y, k];
        },
      },
    };
    this.Outline = { Type: 1, Width: 0.2 };
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
  }
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

function round(value) {
  return Math.round(value * 100) / 100;
}

function makePage(width = 100, height = 50, withShape = true) {
  const page = new Page(width, height);
  const base = page.CreateLayer("Layer 1");
  if (withShape) base.CreateRectangle(0, 0, 10, 10);
  return page;
}

function run(scriptName, page, selection = null) {
  const code = fs.readFileSync(path.join(SCRIPTS, scriptName), "utf8");
  const alerts = [];
  const sandbox = {
    host: {
      ActiveDocument: { Unit: 4, ActivePage: page },
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

function runWithSettings(scriptName, replacements, page, selection = null) {
  let source = fs.readFileSync(path.join(SCRIPTS, scriptName), "utf8");
  replacements.forEach(([from, to]) => {
    source = source.replace(from, to);
  });
  const name = ".tmp-" + Math.random().toString(36).slice(2) + ".js";
  const file = path.join(SCRIPTS, name);
  fs.writeFileSync(file, source);
  try {
    return run(name, page, selection);
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
