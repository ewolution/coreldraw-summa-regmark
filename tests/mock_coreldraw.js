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
    this.Type = 0;
    this.PowerClip = null;
    this.Fill = {
      Type: 0,
      UniformColor: new Color(this),
      ApplyNoFill: () => { this.Fill.Type = 0; }
    };
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
  Clone() {
    const copy = new Shape(this.page, this.x0, this.y0, this.x1, this.y1);
    copy.Type = this.Type;

    copy.Fill.Type = this.Fill.Type;
    copy.Fill.UniformColor.CMYKCyan = this.Fill.UniformColor.CMYKCyan;
    copy.Fill.UniformColor.CMYKMagenta = this.Fill.UniformColor.CMYKMagenta;
    copy.Fill.UniformColor.CMYKYellow = this.Fill.UniformColor.CMYKYellow;
    copy.Fill.UniformColor.CMYKBlack = this.Fill.UniformColor.CMYKBlack;
    copy.Fill.UniformColor.IsSpot = this.Fill.UniformColor.IsSpot;
    copy.Fill.UniformColor.SpotColorName = this.Fill.UniformColor.SpotColorName;

    copy.Outline.Type = this.Outline.Type;
    copy.Outline.Width = this.Outline.Width;
    copy.Outline.Color.CMYKCyan = this.Outline.Color.CMYKCyan;
    copy.Outline.Color.CMYKMagenta = this.Outline.Color.CMYKMagenta;
    copy.Outline.Color.CMYKYellow = this.Outline.Color.CMYKYellow;
    copy.Outline.Color.CMYKBlack = this.Outline.Color.CMYKBlack;
    copy.Outline.Color.IsSpot = this.Outline.Color.IsSpot;
    copy.Outline.Color.SpotColorName = this.Outline.Color.SpotColorName;

    const layer = this.page.layers.find((item) => item.Shapes.items.includes(this));
    if (layer) layer.Shapes.add(copy);
    this.page.allShapes.push(copy);
    return copy;
  }
  Ungroup() {
    if (!this.children) throw new Error("Shape is not a group");
    const layer = this.page.layers.find((item) => item.Shapes.items.includes(this));
    if (!layer) throw new Error("Group layer not found");

    layer.Shapes.items = layer.Shapes.items.filter((item) => item !== this);
    this.page.allShapes = this.page.allShapes.filter((item) => item !== this);

    this.children.forEach((child) => {
      child.page = this.page;
      layer.Shapes.add(child);
      this.page.allShapes.push(child);
    });

    return new ShapeRange(this.children);
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

function makeGroup(page, layer, shapes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  shapes.forEach((shape) => {
    x0 = Math.min(x0, shape.x0);
    y0 = Math.min(y0, shape.y0);
    x1 = Math.max(x1, shape.x1);
    y1 = Math.max(y1, shape.y1);
  });

  const group = new Shape(page, x0, y0, x1, y1);
  group.Type = 7;
  group.children = shapes.slice();
  group.Shapes = new ShapeCollection();
  group.Shapes.items = shapes.slice();

  layer.Shapes.items = layer.Shapes.items.filter((item) => !shapes.includes(item));
  page.allShapes = page.allShapes.filter((item) => !shapes.includes(item));
  layer.Shapes.add(group);
  page.allShapes.push(group);
  return group;
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

test("kesim ayir: once regmark, sonra yeni sayfaya ayirma", () => {
  const page = makePage(100, 50, false);
  const base = page.layers[0];
  const cut = base.CreateRectangle(10, 10, 80, 40).noFill().outlineCMYK(0, 100, 0, 0);
  const design = base.CreateRectangle(5, 5, 20, 20).fillCMYK(100, 0, 0, 0).noOutline();
  const fillCut = base.CreateRectangle(30, 10, 50, 20).fillCMYK(0, 100, 0, 0).noOutline();
  const mixed = base.CreateRectangle(60, 10, 70, 20).fillCMYK(100, 0, 0, 0).outlineCMYK(0, 100, 0, 0);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, null, doc);
  assert.ok(/Regmark eklendi ve kesim ayrıldı/.test(alerts[0]), alerts[0]);
  assert.strictEqual(doc.pages.length, 2, "kesim sayfasi olusmali");

  const page1 = doc.pages[0];
  const page2 = doc.pages[1];
  assert.strictEqual(round(page1.SizeWidth), 136, "baski sayfasi buyumeli");
  assert.strictEqual(round(page1.SizeHeight), 86);
  assert.strictEqual(round(page2.SizeWidth), 136, "kesim sayfasi ayni boyutta");
  assert.strictEqual(round(page2.SizeHeight), 86);

  const marks1 = page1.Layers.Find("Regmark");
  const marks2 = page2.Layers.Find("Regmark");
  assert.ok(marks1, "page1 Regmark katmani");
  assert.ok(marks2, "page2 Regmark katmani");
  assert.strictEqual(marks1.Shapes.Count, 5, "4 kare + 1 alt cizgi (OPOS XY)");
  assert.strictEqual(marks2.Shapes.Count, 5);
  assert.strictEqual(marks1.Editable, true, "page1 regmark katmani kilitli olmamali");
  assert.strictEqual(marks2.Editable, true, "page2 regmark katmani kilitli olmamali");

  const cutLayer = page2.Layers.Find("Kesim");
  assert.ok(cutLayer, "Kesim katmani olusmali");
  assert.strictEqual(cutLayer.Shapes.Count, 3, "2 kesim + karisik kopya");
  assert.deepStrictEqual(cut.rect(), [28, 28, 98, 58], "kesim konumu korunmali");
  assert.deepStrictEqual(fillCut.rect(), [48, 28, 68, 38]);
  assert.strictEqual(base.Shapes.Count, 2, "tasarim ve karisik orijinal page1'de kalir");
  assert.ok(/Taşınan nesne: 3/.test(alerts[0]), alerts[0]);
  assert.ok(/Karışık \(ayrılan\): 1/.test(alerts[0]), alerts[0]);
  assert.strictEqual(mixed.Outline.Type, 0, "orijinalde magenta kontur kalmamali");
  const mixedCopy = cutLayer.Shapes.Item(3);
  assert.strictEqual(mixedCopy.Fill.Type, 0, "kopyada dolgu olmamali (seffaf ic)");
  assert.strictEqual(mixedCopy.Outline.Type, 1, "kopyada magenta kontur olmali");
});

test("kesim ayir: katman modunda regmark + Kesim katmani", () => {
  const page = makePage(100, 50, false);
  const base = page.layers[0];
  const cut1 = base.CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 100, 0, 0);
  const cut2 = base.CreateRectangle(30, 10, 40, 20).fillCMYK(0, 100, 0, 0).noOutline();
  const doc = new Document(page);

  const alerts = runWithSettings(
    "Summa-Kesim-Ayir.js",
    [["  yeniSayfa: true,", "  yeniSayfa: false,"]],
    page,
    null,
    doc
  );

  assert.strictEqual(doc.pages.length, 1, "sayfa eklenmemeli");
  assert.ok(page.Layers.Find("Regmark"), "Regmark eklenmeli");
  const layer = page.Layers.Find("Kesim");
  assert.ok(layer, "Kesim katmani olusmali");
  assert.strictEqual(layer.Shapes.Count, 2);
  assert.strictEqual(base.Shapes.Count, 0);
  assert.deepStrictEqual(cut1.rect(), [28, 28, 38, 38], "regmark kaydirmasi");
  assert.deepStrictEqual(cut2.rect(), [48, 28, 58, 38]);
  assert.ok(/aynı sayfa/.test(alerts[0]), alerts[0]);
});

test("kesim ayir: tam 0/100/0/0 disinda tolerans yok", () => {
  const exactPage = makePage(100, 50, false);
  exactPage.layers[0].CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 100, 0, 0);
  const exactDoc = new Document(exactPage);
  run("Summa-Kesim-Ayir.js", exactPage, null, exactDoc);
  assert.strictEqual(exactDoc.pages.length, 2, "tam 0/100/0/0 sayilmali");

  const nearPage = makePage(100, 50, false);
  nearPage.layers[0].CreateRectangle(10, 10, 20, 20).noFill().outlineCMYK(0, 99.9, 0, 0);
  const nearDoc = new Document(nearPage);
  const nearAlerts = run("Summa-Kesim-Ayir.js", nearPage, null, nearDoc);
  assert.strictEqual(nearDoc.pages.length, 1, "99.9 sayilmamali");
  assert.ok(/bulunamadı/.test(nearAlerts[0]), nearAlerts[0]);
  assert.strictEqual(nearPage.Layers.Find("Regmark"), null, "marka da eklenmemeli");
});

test("kesim ayir: spot renk adi tek basina kesim sayilmaz", () => {
  const page = makePage(100, 50, false);
  page.layers[0].CreateRectangle(10, 10, 20, 20).noFill().spotOutline("Cut");
  const doc = new Document(page);
  const alerts = run("Summa-Kesim-Ayir.js", page, null, doc);

  assert.strictEqual(doc.pages.length, 1);
  assert.ok(/bulunamadı/.test(alerts[0]), alerts[0]);
  assert.strictEqual(page.Layers.Find("Regmark"), null);
});

test("kesim ayir: secili nesneler baz alinir", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const selectedCut = base.CreateRectangle(50, 50, 100, 100).noFill().outlineCMYK(0, 100, 0, 0);
  const otherCut = base.CreateRectangle(150, 150, 180, 180).noFill().outlineCMYK(0, 100, 0, 0);
  const design = base.CreateRectangle(10, 10, 30, 30).fillCMYK(100, 0, 0, 0).noOutline();
  const selection = new ShapeRange([selectedCut]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Mod: seçili nesneler/.test(alerts[0]), alerts[0]);
  assert.ok(/Taşınan nesne: 1/.test(alerts[0]), alerts[0]);

  assert.strictEqual(doc.pages.length, 2);
  const page1 = doc.pages[0];
  const page2 = doc.pages[1];
  assert.strictEqual(round(page1.SizeWidth), 200, "sayfa buyumemeli");
  assert.strictEqual(round(page1.SizeHeight), 200);
  assert.strictEqual(round(page2.SizeWidth), 200);
  assert.strictEqual(round(page2.SizeHeight), 200);

  assert.strictEqual(page1.Layers.Find("Regmark").Shapes.Count, 5);
  assert.strictEqual(page2.Layers.Find("Regmark").Shapes.Count, 5);
  assert.strictEqual(page2.Layers.Find("Kesim").Shapes.Count, 1, "sadece secili kesim tasinmali");

  assert.deepStrictEqual(selectedCut.rect(), [50, 50, 100, 100]);
  assert.deepStrictEqual(otherCut.rect(), [150, 150, 180, 180], "secili olmayan kesim yerinde kalmali");
  assert.deepStrictEqual(design.rect(), [10, 10, 30, 30]);
  assert.strictEqual(base.Shapes.Count, 2, "diger kesim + tasarim page1'de");
});

test("kesim ayir: secim kenardaysa hedef kayar, iki sayfa hizali kalir", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const cut = base.CreateRectangle(0, 0, 30, 30).noFill().outlineCMYK(0, 100, 0, 0);
  const selection = new ShapeRange([cut]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Mod: seçili nesneler/.test(alerts[0]), alerts[0]);

  assert.strictEqual(round(doc.pages[0].SizeWidth), 200);
  assert.strictEqual(round(doc.pages[1].SizeWidth), 200);
  assert.deepStrictEqual(cut.rect(), [18, 18, 48, 48], "secim 18,18'e kaymali");
  assert.strictEqual(doc.pages[0].Layers.Find("Regmark").Shapes.Count, 5);
  assert.strictEqual(doc.pages[1].Layers.Find("Regmark").Shapes.Count, 5);

  // Iki sayfadaki marka konumlari ayni olmali.
  const marks1 = doc.pages[0].Layers.Find("Regmark").Shapes.items.map((s) => s.rect());
  const marks2 = doc.pages[1].Layers.Find("Regmark").Shapes.items.map((s) => s.rect());
  assert.deepStrictEqual(marks2, marks1);
});

test("kesim ayir: tamamen kesim grubu bozulmadan tasinir", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const cut1 = base.CreateRectangle(50, 50, 70, 70).noFill().outlineCMYK(0, 100, 0, 0);
  const cut2 = base.CreateRectangle(80, 50, 100, 70).noFill().outlineCMYK(0, 100, 0, 0);
  const group = makeGroup(page, base, [cut1, cut2]);
  const selection = new ShapeRange([group]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Taşınan nesne: 1/.test(alerts[0]), alerts[0]);
  assert.ok(/Açılan grup: 0/.test(alerts[0]), alerts[0]);

  const cutLayer = doc.pages[1].Layers.Find("Kesim");
  assert.strictEqual(cutLayer.Shapes.Count, 1);
  assert.strictEqual(cutLayer.Shapes.Item(1).Type, 7, "grup korunmali");
  assert.strictEqual(base.Shapes.Count, 0);
  assert.deepStrictEqual(group.rect(), [50, 50, 100, 70]);
});

test("kesim ayir: karisik grup cozulup kesim ayrilir", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const cut = base.CreateRectangle(50, 50, 70, 70).noFill().outlineCMYK(0, 100, 0, 0);
  const design = base.CreateRectangle(80, 50, 100, 70).fillCMYK(100, 0, 0, 0).noOutline();
  const group = makeGroup(page, base, [cut, design]);
  const selection = new ShapeRange([group]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Açılan grup: 1/.test(alerts[0]), alerts[0]);
  assert.ok(/Taşınan nesne: 1/.test(alerts[0]), alerts[0]);

  const cutLayer = doc.pages[1].Layers.Find("Kesim");
  assert.strictEqual(cutLayer.Shapes.Count, 1);
  assert.notStrictEqual(cutLayer.Shapes.Item(1).Type, 7, "kesim yapragi tasinmali");
  assert.strictEqual(base.Shapes.Count, 1, "tasarim yapragi page1'de kalmali");
  assert.deepStrictEqual(design.rect(), [80, 50, 100, 70]);
});

test("kesim ayir: gorunmez yardimci nesne grubu bozmaz", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const cut = base.CreateRectangle(50, 50, 70, 70).noFill().outlineCMYK(0, 100, 0, 0);
  const helper = base.CreateRectangle(50, 50, 70, 70).noFill().noOutline();
  const group = makeGroup(page, base, [cut, helper]);
  const selection = new ShapeRange([group]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Açılan grup: 0/.test(alerts[0]), alerts[0]);
  assert.strictEqual(doc.pages[1].Layers.Find("Kesim").Shapes.Count, 1);
  assert.strictEqual(doc.pages[1].Layers.Find("Kesim").Shapes.Item(1).Type, 7);
  assert.strictEqual(base.Shapes.Count, 0);
});

test("kesim ayir: yazi dolgusu + magenta kontur ayrilir", () => {
  const page = makePage(200, 200, false);
  const base = page.layers[0];
  const text = base.CreateRectangle(50, 50, 120, 80)
    .fillCMYK(0, 0, 0, 100)
    .outlineCMYK(0, 100, 0, 0);
  const selection = new ShapeRange([text]);
  const doc = new Document(page);

  const alerts = run("Summa-Kesim-Ayir.js", page, selection, doc);
  assert.ok(/Karışık \(ayrılan\): 1/.test(alerts[0]), alerts[0]);
  assert.ok(/Taşınan nesne: 1/.test(alerts[0]), alerts[0]);

  assert.strictEqual(base.Shapes.Count, 1, "orijinal page1'de kalmali");
  assert.strictEqual(text.Fill.Type, 1, "orijinalde dolgu korunmali");
  assert.strictEqual(text.Outline.Type, 0, "orijinalde magenta kontur kaldirilmali");

  const cutLayer = doc.pages[1].Layers.Find("Kesim");
  assert.strictEqual(cutLayer.Shapes.Count, 1);
  const copy = cutLayer.Shapes.Item(1);
  assert.strictEqual(copy.Fill.Type, 0, "kesim kopyasinda dolgu olmamali (seffaf ic)");
  assert.strictEqual(copy.Outline.Type, 1, "kesim kopyasinda kontur olmali");
  assert.deepStrictEqual(
    [copy.Outline.Color.CMYKCyan, copy.Outline.Color.CMYKMagenta, copy.Outline.Color.CMYKYellow, copy.Outline.Color.CMYKBlack],
    [0, 100, 0, 0],
    "kopya konturu tam magenta olmali"
  );
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
