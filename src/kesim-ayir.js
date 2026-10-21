/*
  Summa Kesim Ayır  ·  CorelDRAW macOS (JavaScript)
  -------------------------------------------------
  Magenta (varsayilan CMYK 0/100/0/0) kesim çizgilerini seçip
  ya yeni bir sayfaya ya da ayni sayfadaki "Kesim" katmanina tasir.

  - yeniSayfa: true  -> ayni boyutta 2. sayfa olusur (baski / kesim)
  - yeniSayfa: false -> nesneler ayni sayfada "Kesim" katmanina tasinir

  Kurulum / kullanim: README.md
*/

var AYAR = {
  kesimCmyk: [0, 100, 0, 0], // kesim rengi (C, M, Y, K; 0-100)
  tolerans: 0.5,             // renk eslesme toleransi (0-100 arasi puan)
  spotAdlari: ["cut", "kesim", "magenta", "kiss-cut", "kisscut", "thru-cut", "thrucut"],
  yeniSayfa: true,           // true: 2. sayfa, false: ayni sayfada "Kesim" katmani
  kesimKatmani: "Kesim",
  dolgu: true,               // magenta dolgulari da kesim say
  kontur: true               // magenta konturlari da kesim say
};

(function () {
  "use strict";

  var CDR_MILLIMETER = 3;
  var doc = null;
  var oldUnit = null;

  function msg(text) {
    alert("Summa Kesim Ayır\n\n" + text);
  }

  function near(value, target) {
    return Math.abs(value - target) <= AYAR.tolerans;
  }

  function isCutColor(color) {
    if (!color) return false;

    // Spot renk adi (Cut / Kesim / Kiss-cut ...)
    try {
      if (color.IsSpot) {
        var name = String(color.SpotColorName || color.Name || "").toLowerCase();
        for (var i = 0; i < AYAR.spotAdlari.length; i++) {
          if (name.indexOf(String(AYAR.spotAdlari[i]).toLowerCase()) >= 0) return true;
        }
      }
    } catch (e) { /* spot bilgisi yok */ }

    // Tam CMYK eslesmesi (kucuk tolerans)
    try {
      return near(color.CMYKCyan, AYAR.kesimCmyk[0]) &&
             near(color.CMYKMagenta, AYAR.kesimCmyk[1]) &&
             near(color.CMYKYellow, AYAR.kesimCmyk[2]) &&
             near(color.CMYKBlack, AYAR.kesimCmyk[3]);
    } catch (e2) {
      return false;
    }
  }

  function hasChildren(shape) {
    try { return shape.Shapes && shape.Shapes.Count > 0; } catch (e) { return false; }
  }

  function shapeState(shape) {
    var hasFill = false;
    var fillCut = false;
    var hasOutline = false;
    var outlineCut = false;

    if (AYAR.dolgu) {
      try {
        hasFill = shape.Fill.Type !== 0; // cdrNoFill = 0
        if (hasFill && shape.Fill.Type === 1) {
          fillCut = isCutColor(shape.Fill.UniformColor);
        }
      } catch (e) { /* dolgu yok */ }
    }

    if (AYAR.kontur) {
      try {
        hasOutline = shape.Outline.Type !== 0; // cdrNoOutline = 0
        if (hasOutline) {
          outlineCut = isCutColor(shape.Outline.Color);
        }
      } catch (e2) { /* kontur yok */ }
    }

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
        total++;
        var state = shapeState(child);
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
    // Sayfa/katman degisimi konumu kaydirirsa geri duzelt.
    var dx = x - shape.PositionX;
    var dy = y - shape.PositionY;
    if (dx !== 0 || dy !== 0) shape.Move(dx, dy);
  }

  try {
    doc = host.ActiveDocument;
    if (!doc) {
      msg("Açık bir belge yok. Önce CorelDRAW'da dosyanızı açın.");
      return;
    }

    var page = doc.ActivePage;
    oldUnit = doc.Unit;
    doc.Unit = CDR_MILLIMETER;

    var width = page.SizeWidth;
    var height = page.SizeHeight;

    var targets = [];
    var mixed = 0;
    var groupWarnings = 0;

    for (var li = 1; li <= page.Layers.Count; li++) {
      var layer = page.Layers.Item(li);
      if (layer.IsSpecialLayer) continue;

      for (var si = 1; si <= layer.Shapes.Count; si++) {
        var shape = layer.Shapes.Item(si);

        if (hasChildren(shape)) {
          var group = groupState(shape);
          if (group.cut === 0) continue;
          if (group.cut === group.total && group.mixed === 0) {
            targets.push(shape);
          } else {
            mixed++;
            groupWarnings++;
          }
          continue;
        }

        var state = shapeState(shape);
        if (!state.cut) continue;
        if (state.mixed) {
          mixed++;
          continue;
        }
        targets.push(shape);
      }
    }

    if (!targets.length) {
      msg("Magenta kesim çizgisi bulunamadı.\n\n" +
          "Beklenen renk: CMYK " + AYAR.kesimCmyk.join("/") + "\n" +
          "Spot renk adları: " + AYAR.spotAdlari.join(", ") + "\n\n" +
          "Grupları çözün veya rengi AYAR.kesimCmyk içinde ayarlayın.");
      return;
    }

    var cutPage = page;
    var cutLayer = null;

    if (AYAR.yeniSayfa) {
      cutPage = doc.AddPagesEx(1, width, height);
      if (!cutPage) {
        msg("Yeni sayfa oluşturulamadı.");
        return;
      }
      cutLayer = cutPage.CreateLayer(AYAR.kesimKatmani);
    } else {
      cutLayer = findLayer(page, AYAR.kesimKatmani);
      if (!cutLayer) cutLayer = page.CreateLayer(AYAR.kesimKatmani);
    }

    cutLayer.Printable = true;
    cutLayer.Visible = true;
    try { cutLayer.Editable = true; } catch (e) { /* kilitli katman */ }

    for (var t = 0; t < targets.length; t++) {
      moveShape(targets[t], cutLayer);
    }

    var text =
      "Kesim çizgileri ayrıldı.\n\n" +
      "Taşınan nesne: " + targets.length + "\n" +
      "Karışık (atlanan): " + mixed + "\n" +
      "Hedef: " + (AYAR.yeniSayfa ? ("sayfa " + cutPage.Index) : "aynı sayfa") + "\n" +
      "Katman: " + AYAR.kesimKatmani + "\n" +
      "Sayfa boyutu: " + Math.round(cutPage.SizeWidth * 100) / 100 + " × " +
        Math.round(cutPage.SizeHeight * 100) / 100 + " mm";

    if (groupWarnings > 0) {
      text += "\n\nUyarı: " + groupWarnings +
              " grup/nesne karışık renkli olduğu için atlandı. " +
              "Grupları çözüp tekrar deneyin.";
    }
    text += "\n\nArdından her iki sayfaya OPOS markalarını ekleyin.";
    msg(text);
  } catch (e) {
    msg("Hata: " + (e && e.message ? e.message : e));
  } finally {
    try {
      if (doc && oldUnit !== null) doc.Unit = oldUnit;
    } catch (e2) { /* ignore */ }
  }
})();
