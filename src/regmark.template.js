/*
  Summa OPOS regmark  ·  CorelDRAW macOS (JavaScript)
  ---------------------------------------------------
  Aktif sayfaya Summa OPOS kayit isaretlerini ekler.

  Secili obje varsa isaretler O OBJENIN etrafina eklenir; sayfa, secim +
  isaretler boyutuna getirilir. Secim yoksa sayfa baz alinir.

  Kurulum / kullanim: README.md
*/

var AYAR = {
  // ---- olculer (mm) ----
  markaBoyutu: 3.0,      // Summa OPOS kare boyutu (kesicideki "mark size" ile ayni olmali)
  tasarimBosluk: 5.0,    // tasarim kenari ile marka arasi
  sayfaKenari: 10.0,     // marka ile sayfa kenari arasi (beyaz alan)
  markaAraligi: 300.0,   // uzun kenarda iki marka arasi EN FAZLA bu kadar (mm)
                         // 0 = sadece kose markalari (ek satir yok)

  // ---- davranis ----
  oposTipi: "__OPOS__",  // "X" | "XY" | "XY2"  (kesicideki OPOS modu ile ayni olmali)
  secimeGore: true,      // true: secili obje varsa isaretleri onun etrafina koy
  sayfaBuyut: true,      // true: isaretler sigsin diye sayfayi GEREKIRSE buyut (kucultmez)
                         // false: sayfa hic degismez (isaretler sayfaya sigmali)
  katmanAdi: "Regmark"   // isaretlerin konulacagi katman
};

(function () {
  "use strict";

  var CDR_MILLIMETER = 3;
  var doc = null;
  var oldUnit = null;

  function msg(text) {
    alert("Summa Regmark\n\n" + text);
  }

  function num(value) {
    return Math.round(value * 100) / 100;
  }

  function findLayer(page, name) {
    try {
      var found = page.Layers.Find(name);
      if (found) return found;
    } catch (e) { /* Find desteklenmiyorsa asagidaki dongu */ }
    for (var i = 1; i <= page.Layers.Count; i++) {
      var layer = page.Layers.Item(i);
      if (layer.Name === name) return layer;
    }
    return null;
  }

  function removeLayer(page, name) {
    var layer = findLayer(page, name);
    if (!layer) return false;
    try { layer.Editable = true; } catch (e) { /* ignore */ }
    layer.Delete();
    return true;
  }

  function eachShape(page, callback) {
    var layerCount = page.Layers.Count;
    for (var i = 1; i <= layerCount; i++) {
      var layer = page.Layers.Item(i);
      if (layer.IsSpecialLayer) continue;
      var shapeCount = layer.Shapes.Count;
      for (var j = 1; j <= shapeCount; j++) {
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
    return {
      x0: Math.min(a.x0, b.x0),
      y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1),
      y1: Math.max(a.y1, b.y1)
    };
  }

  // Bir Shape/Shapes/ShapeRange koleksiyonunun ortak sinir kutusu.
  function unionCollection(collection) {
    var count = 0;
    try { count = collection.Count; } catch (e) { return null; }
    if (typeof count === "function") {
      try { count = count.call(collection); } catch (e) { return null; }
    }
    if (!count) return null;

    var result = null;
    for (var i = 1; i <= count; i++) {
      var shape = null;
      try { shape = collection.Item(i); } catch (e) { continue; }
      if (!shape) continue;
      var rect = null;
      try { rect = rectFromBox(shape.BoundingBox, shape); } catch (e) { rect = null; }
      if (!rect) continue;
      result = result ? unionRect(result, rect) : rect;
    }
    return result;
  }

  // Secili objelerin ortak sinir kutusu (yoksa null).
  // Farkli surumlerde secim farkli nesneler uzerinden erisilebilir; hepsi denenir.
  function rawSelectionRect(page) {
    var candidates = [];
    function add(candidate) {
      if (!candidate) return;
      if (typeof candidate === "function") {
        try { candidate = candidate(); } catch (e) { return; }
      }
      for (var k = 0; k < candidates.length; k++) {
        if (candidates[k] === candidate) return;
      }
      candidates.push(candidate);
    }

    try { add(host.ActiveSelectionRange); } catch (e) { /* yok */ }
    try { add(host.ActiveSelection); } catch (e) { /* yok */ }
    try { add(host.ActiveView.Selection); } catch (e) { /* yok */ }
    try { add(host.ActiveDocument.ActiveSelection); } catch (e) { /* yok */ }
    try { add(host.ActiveDocument.Selection); } catch (e) { /* yok */ }

    for (var c = 0; c < candidates.length; c++) {
      var selection = candidates[c];

      // 1) ShapeRange.BoundingBox
      var rect = null;
      try { rect = rectFromBox(selection.BoundingBox, selection); } catch (e) { rect = null; }
      if (rect) return rect;

      // 2) ActiveSelection.Shapes (Shapes koleksiyonu)
      try {
        var shapes = selection.Shapes;
        if (typeof shapes === "function") shapes = shapes.call(selection);
        if (shapes) {
          rect = unionCollection(shapes);
          if (rect) return rect;
        }
      } catch (e) { /* yok */ }

      // 3) Count / Item
      try {
        rect = unionCollection(selection);
        if (rect) return rect;
      } catch (e) { /* yok */ }
    }

    // 4) Son care: sayfadaki Shape.Selected == true olan nesneler
    if (page) {
      var selected = null;
      eachShape(page, function (shape) {
        var isSelected = false;
        try { isSelected = shape.Selected; } catch (e) { isSelected = false; }
        if (!isSelected) return;
        var r = null;
        try { r = rectFromBox(shape.BoundingBox, shape); } catch (e) { r = null; }
        if (r) selected = selected ? unionRect(selected, r) : r;
      });
      if (selected) return selected;
    }

    return null;
  }

  function selectionDebug() {
    var parts = [];
    try { parts.push("ActiveSelection:" + (host.ActiveSelection ? "var" : "yok")); }
    catch (e) { parts.push("ActiveSelection:HATA"); }
    try { parts.push("Range:" + (host.ActiveSelectionRange ? "var" : "yok")); }
    catch (e) { parts.push("Range:HATA"); }
    try {
      var sel = host.ActiveSelection;
      if (sel && sel.Shapes) parts.push("Shapes:" + sel.Shapes.Count);
    } catch (e) { /* yok */ }
    try {
      var selectedCount = 0;
      eachShape(host.ActivePage, function (shape) {
        try { if (shape.Selected) selectedCount++; } catch (e) { /* yok */ }
      });
      parts.push("Secili:" + selectedCount);
    } catch (e2) { /* yok */ }
    return parts.join(" ");
  }

  // Secim, birim degisikliginden once okunursa eski birimde olabilir.
  function unitToMm(unit) {
    switch (unit) {
      case 0: return 0.0001;      // tenth micron
      case 1: return 25.4;        // inch
      case 2: return 304.8;       // foot
      case 3: return 1;           // millimeter
      case 4: return 10;          // centimeter
      case 7: return 1000;        // meter
      case 8: return 1000000;     // kilometer
      case 9: return 0.3759;      // didot
      case 10: return 1.814;      // agate
      case 11: return 914.4;      // yard
      case 12: return 4.2333;     // pica
      case 13: return 4.511;      // cicero
      case 14: return 0.3527778;  // point
      case 15: return 0.25;       // Q
      case 16: return 0.25;       // H
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

  function drawMark(layer, x0, y0, x1, y1) {
    var shape = layer.CreateRectangle(x0, y0, x1, y1);
    shape.Fill.UniformColor.CMYKAssign(0, 0, 0, 100); // %100 K siyah
    shape.Outline.Type = 0;                           // cdrNoOutline
    return shape;
  }

  try {
    doc = host.ActiveDocument;
    if (!doc) {
      msg("Açık bir belge yok. Önce CorelDRAW'da dosyanızı açın.");
      return;
    }

    var page = doc.ActivePage;
    oldUnit = doc.Unit;

    // Secimi birim degisikliginden ve katman silmeden ONCE oku.
    var preSelection = AYAR.secimeGore ? rawSelectionRect(page) : null;

    doc.Unit = CDR_MILLIMETER;
    var postSelection = AYAR.secimeGore ? rawSelectionRect(page) : null;

    var target = postSelection;
    if (!target && preSelection) {
      target = scaleRect(preSelection, unitToMm(oldUnit));
    }

    var width = page.SizeWidth;
    var height = page.SizeHeight;

    var size = AYAR.markaBoyutu;
    var gap = AYAR.tasarimBosluk;
    var edge = AYAR.sayfaKenari;
    var frame = size + gap + edge;

    // Daha once eklenmis isaretler varsa once temizle.
    var hadMarks = removeLayer(page, AYAR.katmanAdi);

    var selectionNote = "";
    if (AYAR.secimeGore && !target) {
      selectionNote = "Seçim okunamadı (" + selectionDebug() + "): sayfa baz alındı.";
    }

    var newWidth = width;
    var newHeight = height;
    var shiftX = 0;
    var shiftY = 0;
    var cutX0, cutY0, cutX1, cutY1;
    var modeText;

    if (target) {
      // ---- secili objeye gore: isaretler objenin kenarlarina ----
      if (AYAR.sayfaBuyut) {
        // Sayfayı küçültme; sadece işaretler sığmıyorsa gerekli kadar büyüt.
        shiftX = target.x0 < frame ? frame - target.x0 : 0;
        shiftY = target.y0 < frame ? frame - target.y0 : 0;
        newWidth = Math.max(width, target.x1 + shiftX + frame);
        newHeight = Math.max(height, target.y1 + shiftY + frame);
        modeText = "Seçili obje (sayfa korunur)";
      } else {
        // Sayfa sabit: isaretler sayfa icinde kalmali.
        if (target.x0 - gap - size < 0 || target.y0 - gap - size < 0 ||
            target.x1 + gap + size > width || target.y1 + gap + size > height) {
          msg("İşaretler sayfa dışına taşıyor.\n\n" +
              "Seçimi sayfa kenarından en az " + num(frame) + " mm içeri taşıyın " +
              "veya AYAR.sayfaBuyut = true yapın.");
          return;
        }
        modeText = "Seçili obje (sayfa sabit)";
      }
      cutX0 = target.x0 + shiftX;
      cutY0 = target.y0 + shiftY;
      cutX1 = target.x1 + shiftX;
      cutY1 = target.y1 + shiftY;
    } else {
      // ---- sayfaya gore ----
      if (AYAR.sayfaBuyut && !hadMarks) {
        // Ilk calistirmada sayfayi buyut; sonraki calistirmalarda tekrar buyutme.
        newWidth = width + 2 * frame;
        newHeight = height + 2 * frame;
        shiftX = frame;
        shiftY = frame;
        cutX0 = frame;
        cutY0 = frame;
        cutX1 = frame + width;
        cutY1 = frame + height;
        modeText = "Sayfa";
      } else if (AYAR.sayfaBuyut && hadMarks) {
        cutX0 = frame;
        cutY0 = frame;
        cutX1 = page.SizeWidth - frame;
        cutY1 = page.SizeHeight - frame;
        modeText = "Sayfa (zaten hazır)";
      } else {
        if (width <= 2 * frame || height <= 2 * frame) {
          msg("Sayfa işaretler için çok küçük (" + num(width) + " × " + num(height) +
              " mm).\n\nÖlçüleri küçültün veya daha büyük bir sayfa kullanın.");
          return;
        }
        cutX0 = frame;
        cutY0 = frame;
        cutX1 = width - frame;
        cutY1 = height - frame;
        modeText = "Sayfa (içeride)";
      }
    }

    if (newWidth < 1 || newHeight < 1) {
      msg("Hesaplanan sayfa boyutu geçersiz. Ölçüleri kontrol edin.");
      return;
    }

    var needResize = AYAR.sayfaBuyut && (newWidth !== width || newHeight !== height);
    var needMove = shiftX !== 0 || shiftY !== 0;

    if (needResize || needMove) {
      var locked = countLocked(page);
      if (locked > 0) {
        msg("Sayfada " + locked + " kilitli nesne/katman var. İşlem yapılamıyor.\n\n" +
            "Kilitleri açın veya AYAR.sayfaBuyut = false yapın.");
        return;
      }

      var probe = firstShape(page);
      var probeX = probe ? probe.PositionX : 0;
      var probeY = probe ? probe.PositionY : 0;

      if (needResize) page.SetSize(newWidth, newHeight);

      if (probe) {
        // CorelDRAW sayfa boyutu degisiminde icerigi kaydirirsa farki telafi et.
        moveAll(page, shiftX - (probe.PositionX - probeX),
                       shiftY - (probe.PositionY - probeY));
      }
    }

    var layer = page.CreateLayer(AYAR.katmanAdi);
    layer.Printable = true;
    layer.Visible = true;

    // Sol / sag kolonlar ve alt / ust satirlar (CorelDRAW: y yukari dogru).
    var leftOuter = cutX0 - gap - size;
    var leftInner = cutX0 - gap;
    var rightInner = cutX1 + gap;
    var rightOuter = rightInner + size;
    var bottomOuter = cutY0 - gap - size;
    var bottomInner = cutY0 - gap;
    var topInner = cutY1 + gap;
    var topOuter = topInner + size;

    // Uzun islerde sol/sag kenara ESIT ARALIKLI ek marka satirlari.
    // Ilk satir alt kose, son satir ust kose; aradaki satirlar esit dagitilir.
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

    if (AYAR.oposTipi === "XY" || AYAR.oposTipi === "XY2") {
      drawMark(layer, cutX0, bottomOuter, cutX1, bottomInner);       // alt cizgi
    }
    if (AYAR.oposTipi === "XY2") {
      drawMark(layer, cutX0, topInner, cutX1, topOuter);             // ust cizgi
    }

    // Isaretler yanlislikla oynatilmasin.
    layer.Editable = false;

    var text =
      "OPOS " + AYAR.oposTipi + " işaretleri eklendi.\n\n" +
      "Mod: " + modeText + "\n" +
      "Sayfa: " + num(page.SizeWidth) + " × " + num(page.SizeHeight) + " mm\n" +
      "Kesim alanı: " + num(cutX1 - cutX0) + " × " + num(cutY1 - cutY0) + " mm\n" +
      "Marka: " + num(size) + " mm · Katman: " + AYAR.katmanAdi + "\n" +
      "Marka satırı: " + (intervals + 1) + " (aralık " + num(rowStep) + " mm)\n\n" +
      "Yazdırırken %100 / Gerçek boyut kullanın.";
    if (selectionNote) text += "\n\n" + selectionNote;
    if (newWidth > width || newHeight > height) {
      text += "\n\nSayfa, işaretler sığsın diye büyütüldü.";
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
