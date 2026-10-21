/*
  Summa Kesim Ayır  ·  CorelDRAW macOS (JavaScript)
  -------------------------------------------------
  1) Secim varsa sadece secili nesneleri, yoksa sayfayi baz alir.
  2) Once OPOS XY regmarklarini ekler (4 kare + alt cizgi).
  3) Sonra tam CMYK 0/100/0/0 magenta kesim çizgilerini ayirir.

  - yeniSayfa: true  -> sayfa 1 = baski + regmark, sayfa 2 = bicak + regmark
  - yeniSayfa: false -> tek sayfada "Kesim" katmani + regmark

  Renk eslesmesi TAMDIR: 0/100/0/0. Tolerans yoktur.
*/

var AYAR = {
  // ---- kesim rengi (tam CMYK, 0-100) ----
  kesimCmyk: [0, 100, 0, 0],

  // ---- ayirma ----
  yeniSayfa: true,
  kesimKatmani: "Kesim",

  // ---- OPOS XY regmark ----
  markaBoyutu: 3.0,
  tasarimBosluk: 5.0,
  sayfaKenari: 10.0,
  markaAraligi: 300.0
};

(function () {
  "use strict";

  var CDR_MILLIMETER = 3;
  var REGMARK_LAYER = "Regmark";
  var doc = null;
  var oldUnit = null;

  function msg(text) {
    alert("Summa Kesim Ayır\n\n" + text);
  }

  function num(value) {
    return Math.round(value * 100) / 100;
  }

  function exact(value, target) {
    return Math.abs(value - target) < 0.000001;
  }

  function isCutColor(color) {
    if (!color) return false;
    try {
      return exact(color.CMYKCyan, AYAR.kesimCmyk[0]) &&
             exact(color.CMYKMagenta, AYAR.kesimCmyk[1]) &&
             exact(color.CMYKYellow, AYAR.kesimCmyk[2]) &&
             exact(color.CMYKBlack, AYAR.kesimCmyk[3]);
    } catch (e) {
      return false;
    }
  }

  function hasChildren(shape) {
    try { if (shape.Type === 7) return true; } catch (e) { /* Type yok */ }
    try { return shape.Shapes && shape.Shapes.Count > 0; } catch (e) { return false; }
  }

  function groupChildren(group) {
    try {
      var shapes = group.Shapes;
      if (shapes) return collectionShapes(shapes);
    } catch (e) { /* yok */ }
    return [];
  }

  function isPowerClip(shape) {
    try { return !!shape.PowerClip; } catch (e) { return false; }
  }

  function shapeState(shape) {
    var hasFill = false;
    var fillCut = false;
    var hasOutline = false;
    var outlineCut = false;

    try {
      hasFill = shape.Fill.Type !== 0;
      if (hasFill && shape.Fill.Type === 1) {
        fillCut = isCutColor(shape.Fill.UniformColor);
      }
    } catch (e) { /* dolgu yok */ }

    try {
      hasOutline = shape.Outline.Type !== 0;
      if (hasOutline) {
        outlineCut = isCutColor(shape.Outline.Color);
      }
    } catch (e2) { /* kontur yok */ }

    return {
      hasFill: hasFill,
      fillCut: fillCut,
      hasOutline: hasOutline,
      outlineCut: outlineCut,
      cut: fillCut || outlineCut,
      mixed: outlineCut && hasFill && !fillCut
    };
  }

  function groupState(group) {
    var total = 0;
    var cut = 0;
    var mixed = 0;
    var count = 0;
    try { count = group.Shapes.Count; } catch (e) { return { total: 0, cut: 0, mixed: 0 }; }

    for (var i = 1; i <= count; i++) {
      var child = group.Shapes.Item(i);
      if (hasChildren(child)) {
        var sub = groupState(child);
        total += sub.total;
        cut += sub.cut;
        mixed += sub.mixed;
      } else {
        var state = shapeState(child);
        // Gorunmez/yardimci nesneler (dolgu ve kontur yok) sayilmaz.
        if (!state.hasFill && !state.hasOutline) continue;
        total++;
        if (state.cut) cut++;
        if (state.mixed) mixed++;
      }
    }
    return { total: total, cut: cut, mixed: mixed };
  }

  function findLayer(page, name) {
    try {
      var found = page.Layers.Find(name);
      if (found) return found;
    } catch (e) { /* Find yok */ }
    for (var i = 1; i <= page.Layers.Count; i++) {
      if (page.Layers.Item(i).Name === name) return page.Layers.Item(i);
    }
    return null;
  }

  function moveShape(shape, layer) {
    var x = shape.PositionX;
    var y = shape.PositionY;
    shape.MoveToLayer(layer);
    var dx = x - shape.PositionX;
    var dy = y - shape.PositionY;
    if (dx !== 0 || dy !== 0) shape.Move(dx, dy);
  }

  // ---------------- secim ----------------

  function rectFromBox(box, owner) {
    if (typeof box === "function") {
      try { box = box.call(owner); } catch (e) { return null; }
    }
    if (!box) return null;
    var x0 = Math.min(box.Left, box.Right);
    var x1 = Math.max(box.Left, box.Right);
    var y0 = Math.min(box.Bottom, box.Top);
    var y1 = Math.max(box.Bottom, box.Top);
    if (!isFinite(x0) || !isFinite(x1) || !isFinite(y0) || !isFinite(y1)) return null;
    if (x1 - x0 <= 0 || y1 - y0 <= 0) return null;
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  function unionRect(a, b) {
    if (!a) return b;
    if (!b) return a;
    return {
      x0: Math.min(a.x0, b.x0),
      y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1),
      y1: Math.max(a.y1, b.y1)
    };
  }

  function collectionShapes(collection) {
    var list = [];
    var count = 0;
    try { count = collection.Count; } catch (e) { return list; }
    if (typeof count === "function") {
      try { count = count.call(collection); } catch (e) { return list; }
    }
    for (var i = 1; i <= count; i++) {
      try { list.push(collection.Item(i)); } catch (e) { /* skip */ }
    }
    return list;
  }

  function readSelection() {
    var candidates = [];
    function add(candidate) {
      if (!candidate) return;
      if (typeof candidate === "function") {
        try { candidate = candidate(); } catch (e) { return; }
      }
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i] === candidate) return;
      }
      candidates.push(candidate);
    }

    try { add(host.ActiveSelectionRange); } catch (e) { /* yok */ }
    try { add(host.ActiveSelection); } catch (e) { /* yok */ }
    try { add(host.ActiveDocument.Selection); } catch (e) { /* yok */ }

    for (var c = 0; c < candidates.length; c++) {
      var selection = candidates[c];
      var shapes = [];

      try {
        var shapesObj = selection.Shapes;
        if (typeof shapesObj === "function") shapesObj = shapesObj.call(selection);
        if (shapesObj) shapes = collectionShapes(shapesObj);
      } catch (e1) { /* yok */ }

      if (!shapes.length) {
        try { shapes = collectionShapes(selection); } catch (e2) { /* yok */ }
      }

      var rect = null;
      try { rect = rectFromBox(selection.BoundingBox, selection); } catch (e3) { rect = null; }
      if (!rect) {
        for (var s = 0; s < shapes.length; s++) {
          try { rect = unionRect(rect, rectFromBox(shapes[s].BoundingBox, shapes[s])); } catch (e4) { /* skip */ }
        }
      }

      if (!shapes.length && rect) {
        try {
          if (selection.Fill !== undefined || selection.Outline !== undefined) {
            shapes = [selection];
          }
        } catch (e5) { /* skip */ }
      }

      if (shapes.length || rect) return { shapes: shapes, rect: rect };
    }

    return { shapes: [], rect: null };
  }

  function unitToMm(unit) {
    switch (unit) {
      case 0: return 0.0001;
      case 1: return 25.4;
      case 2: return 304.8;
      case 3: return 1;
      case 4: return 10;
      case 7: return 1000;
      case 8: return 1000000;
      case 9: return 0.3759;
      case 10: return 1.814;
      case 11: return 914.4;
      case 12: return 4.2333;
      case 13: return 4.511;
      case 14: return 0.3527778;
      case 15: return 0.25;
      case 16: return 0.25;
      default: return 1;
    }
  }

  function scaleRect(rect, factor) {
    return {
      x0: rect.x0 * factor,
      y0: rect.y0 * factor,
      x1: rect.x1 * factor,
      y1: rect.y1 * factor
    };
  }

  // ---------------- OPOS XY regmark ----------------

  function eachShape(page, callback) {
    for (var i = 1; i <= page.Layers.Count; i++) {
      var layer = page.Layers.Item(i);
      if (layer.IsSpecialLayer) continue;
      for (var j = 1; j <= layer.Shapes.Count; j++) {
        callback(layer.Shapes.Item(j), layer);
      }
    }
  }

  function firstShape(page) {
    var found = null;
    eachShape(page, function (shape) {
      if (!found) found = shape;
    });
    return found;
  }

  function countLocked(page) {
    var count = 0;
    eachShape(page, function (shape, layer) {
      if (shape.Locked || layer.Editable === false) count++;
    });
    return count;
  }

  function moveAll(page, dx, dy) {
    eachShape(page, function (shape) {
      shape.Move(dx, dy);
    });
  }

  function removeLayer(page, name) {
    var layer = findLayer(page, name);
    if (!layer) return false;
    try { layer.Editable = true; } catch (e) { /* ignore */ }
    layer.Delete();
    return true;
  }

  function drawMark(layer, x0, y0, x1, y1) {
    var shape = layer.CreateRectangle(x0, y0, x1, y1);
    shape.Fill.UniformColor.CMYKAssign(0, 0, 0, 100);
    shape.Outline.Type = 0;
    return shape;
  }

  // target: {x0,y0,x1,y1} veya null (sayfa)
  // grow=true: ilk sayfa; gerekirse sayfayi buyutur
  // grow=false: hedef zaten kaydirilmis, sayfa boyutu korunur
  function addMarks(page, grow, target) {
    var size = AYAR.markaBoyutu;
    var gap = AYAR.tasarimBosluk;
    var edge = AYAR.sayfaKenari;
    var frame = size + gap + edge;

    var width = page.SizeWidth;
    var height = page.SizeHeight;
    var rect = target || { x0: 0, y0: 0, x1: width, y1: height };
    var hadMarks = !!findLayer(page, REGMARK_LAYER);

    if (grow && !hadMarks) {
      var shiftX = rect.x0 < frame ? frame - rect.x0 : 0;
      var shiftY = rect.y0 < frame ? frame - rect.y0 : 0;
      var newWidth = Math.max(width, rect.x1 + shiftX + frame);
      var newHeight = Math.max(height, rect.y1 + shiftY + frame);

      if (newWidth !== width || newHeight !== height) {
        var locked = countLocked(page);
        if (locked > 0) {
          throw new Error("Sayfada " + locked + " kilitli nesne/katman var. " +
                          "Regmark eklemek için kilitleri açın.");
        }

        var probe = firstShape(page);
        var probeX = probe ? probe.PositionX : 0;
        var probeY = probe ? probe.PositionY : 0;

        page.SetSize(newWidth, newHeight);

        if (probe) {
          moveAll(page, shiftX - (probe.PositionX - probeX),
                         shiftY - (probe.PositionY - probeY));
        }
      } else if (shiftX !== 0 || shiftY !== 0) {
        var locked2 = countLocked(page);
        if (locked2 > 0) {
          throw new Error("Sayfada " + locked2 + " kilitli nesne/katman var. " +
                          "Regmark eklemek için kilitleri açın.");
        }
        moveAll(page, shiftX, shiftY);
      }

      rect = {
        x0: rect.x0 + shiftX,
        y0: rect.y0 + shiftY,
        x1: rect.x1 + shiftX,
        y1: rect.y1 + shiftY
      };
    }

    removeLayer(page, REGMARK_LAYER);

    var cutX0 = rect.x0;
    var cutY0 = rect.y0;
    var cutX1 = rect.x1;
    var cutY1 = rect.y1;

    var layer = page.CreateLayer(REGMARK_LAYER);
    layer.Printable = true;
    layer.Visible = true;
    layer.Editable = true;   // kesim ayirma akisinda regmark katmani kilitlenmez

    var leftOuter = cutX0 - gap - size;
    var leftInner = cutX0 - gap;
    var rightInner = cutX1 + gap;
    var rightOuter = rightInner + size;
    var bottomOuter = cutY0 - gap - size;
    var bottomInner = cutY0 - gap;

    var bottomCenter = cutY0 - gap - size / 2;
    var topCenter = cutY1 + gap + size / 2;
    var intervals = 1;
    if (AYAR.markaAraligi > 0) {
      intervals = Math.max(1, Math.ceil((topCenter - bottomCenter) / AYAR.markaAraligi));
    }
    var rowStep = (topCenter - bottomCenter) / intervals;

    for (var r = intervals; r >= 0; r--) {
      var centerY = bottomCenter + r * rowStep;
      drawMark(layer, leftOuter, centerY - size / 2, leftInner, centerY + size / 2);
      drawMark(layer, rightInner, centerY - size / 2, rightOuter, centerY + size / 2);
    }

    // OPOS XY: sadece alt cizgi
    drawMark(layer, cutX0, bottomOuter, cutX1, bottomInner);

    return { rows: intervals + 1, spacing: rowStep, rect: rect };
  }

  // ---------------- main ----------------

  try {
    doc = host.ActiveDocument;
    if (!doc) {
      msg("Açık bir belge yok. Önce CorelDRAW'da dosyanızı açın.");
      return;
    }

    var page = doc.ActivePage;
    oldUnit = doc.Unit;

    // Secimi birim degisikliginden ONCE ve SONRA oku.
    var preSelection = readSelection();
    doc.Unit = CDR_MILLIMETER;
    var postSelection = readSelection();

    var selection = (postSelection.shapes.length || postSelection.rect) ?
      postSelection : preSelection;
    var selectedShapes = selection.shapes;
    var target = selection.rect;

    if (target && selection === preSelection && oldUnit !== CDR_MILLIMETER) {
      target = scaleRect(target, unitToMm(oldUnit));
    }

    var hasSelection = selectedShapes.length > 0;
    if (!hasSelection && target) {
      // Sadece sinir kutusu var, nesne listesi yok: sayfa bazli devam.
      target = null;
    }
    if (hasSelection && !target) {
      for (var si = 0; si < selectedShapes.length; si++) {
        try {
          target = unionRect(target, rectFromBox(selectedShapes[si].BoundingBox, selectedShapes[si]));
        } catch (e0) { /* skip */ }
      }
    }

    // Kesim nesnelerini regmark eklemeden ONCE topla.
    var targets = [];
    var mixed = 0;
    var groupWarnings = 0;
    var groupsOpened = 0;

    function considerShape(shape) {
      if (isPowerClip(shape)) {
        mixed++;
        groupWarnings++;
        return;
      }

      if (hasChildren(shape)) {
        var group = groupState(shape);
        if (group.total === 0) return;
        if (group.cut === 0) return;

        // Tamamen kesim grubu: grup bozulmadan tasinir.
        if (group.cut === group.total && group.mixed === 0) {
          targets.push(shape);
          return;
        }

        // Karisik grup: bir seviye cozup alt nesneleri tek tek isle.
        var kids = groupChildren(shape);
        var ungrouped = null;
        try {
          ungrouped = shape.Ungroup();
        } catch (e) {
          mixed++;
          groupWarnings++;
          return;
        }

        var list = [];
        try {
          if (ungrouped && ungrouped.Count) list = collectionShapes(ungrouped);
        } catch (e2) { /* yok */ }
        if (!list.length) list = kids;

        groupsOpened++;
        for (var gi = 0; gi < list.length; gi++) {
          considerShape(list[gi]);
        }
        return;
      }

      var state = shapeState(shape);
      if (!state.cut) return;
      if (state.mixed) {
        mixed++;
        return;
      }
      targets.push(shape);
    }

    if (hasSelection) {
      for (var ss = 0; ss < selectedShapes.length; ss++) {
        considerShape(selectedShapes[ss]);
      }
    } else {
      for (var li = 1; li <= page.Layers.Count; li++) {
        var sourceLayer = page.Layers.Item(li);
        if (sourceLayer.IsSpecialLayer) continue;
        for (var sh = 1; sh <= sourceLayer.Shapes.Count; sh++) {
          considerShape(sourceLayer.Shapes.Item(sh));
        }
      }
    }

    if (!targets.length) {
      msg("Tam CMYK " + AYAR.kesimCmyk.join("/") + " kesim çizgisi bulunamadı.\n\n" +
          (hasSelection ? "Seçili nesnelerde " : "") +
          "Tolerans uygulanmaz; çizgi tam 0/100/0/0 olmalı.");
      return;
    }

    // 1) ONCE regmarklari ekle (secim varsa secimin etrafina).
    var markInfo = addMarks(page, true, target);

    // 2) Kesim sayfasini ayni boyutta olustur, regmarklarini ayni hedefe ekle.
    var cutPage = page;
    var cutLayer = null;

    if (AYAR.yeniSayfa) {
      cutPage = doc.AddPagesEx(1, page.SizeWidth, page.SizeHeight);
      if (!cutPage) {
        msg("Yeni sayfa oluşturulamadı.");
        return;
      }
      try { cutPage.SetSize(page.SizeWidth, page.SizeHeight); } catch (e1) { /* zaten ayni */ }

      // page1'de kullanilan nihai (kaydirilmis) hedefin aynisi.
      addMarks(cutPage, false, markInfo.rect);
      cutLayer = cutPage.CreateLayer(AYAR.kesimKatmani);
    } else {
      cutLayer = findLayer(page, AYAR.kesimKatmani);
      if (!cutLayer) cutLayer = page.CreateLayer(AYAR.kesimKatmani);
    }

    cutLayer.Printable = true;
    cutLayer.Visible = true;
    try { cutLayer.Editable = true; } catch (e) { /* kilitli katman */ }

    // 3) Kesim nesnelerini taşı.
    for (var t = 0; t < targets.length; t++) {
      moveShape(targets[t], cutLayer);
    }

    var text =
      "Regmark eklendi ve kesim ayrıldı.\n\n" +
      "Mod: " + (hasSelection ? "seçili nesneler" : "sayfa") + "\n" +
      "Taşınan nesne: " + targets.length + "\n" +
      "Karışık (atlanan): " + mixed + "\n" +
      "Açılan grup: " + groupsOpened + "\n" +
      "Hedef: " + (AYAR.yeniSayfa ? ("sayfa " + cutPage.Index) : "aynı sayfa") + "\n" +
      "Katman: " + AYAR.kesimKatmani + "\n" +
      "Sayfa boyutu: " + num(cutPage.SizeWidth) + " × " + num(cutPage.SizeHeight) + " mm\n" +
      "OPOS XY satırı: " + markInfo.rows + " (aralık " + num(markInfo.spacing) + " mm)";

    if (groupWarnings > 0) {
      text += "\n\nUyarı: " + groupWarnings +
              " grup açılamadı veya PowerClip içeriyor. " +
              "Grubu elle çözüp tekrar deneyin.";
    }
    msg(text);
  } catch (e) {
    msg("Hata: " + (e && e.message ? e.message : e));
  } finally {
    try {
      if (doc && oldUnit !== null) doc.Unit = oldUnit;
    } catch (e2) { /* ignore */ }
  }
})();
