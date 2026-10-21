/*
  Summa Regmark · CorelDRAW macOS API testi
  -----------------------------------------
  Betikler calismiyorsa once bunu calistirin. Acik belgenin birimini,
  sayfa olcusunu ve SECIM API'sinin durumunu gosterir.
*/

(function () {
  "use strict";

  function safe(fn) {
    try { return fn(); } catch (e) { return "HATA (" + e + ")"; }
  }

  try {
    var doc = host.ActiveDocument;
    if (!doc) {
      alert("Açık belge yok. Önce bir .cdr dosyası açın.");
      return;
    }

    var page = doc.ActivePage;
    var lines = [];
    lines.push("Birim (cdrUnit): " + safe(function () { return doc.Unit; }));
    lines.push("Sayfa: " + safe(function () { return page.SizeWidth; }) + " × " +
               safe(function () { return page.SizeHeight; }));
    lines.push("Katman: " + safe(function () { return page.Layers.Count; }));
    lines.push("Nesne: " + safe(function () { return page.Shapes.Count; }));

    lines.push("ActiveSelection: " + safe(function () {
      return host.ActiveSelection === null ? "null" :
             host.ActiveSelection === undefined ? "undefined" : typeof host.ActiveSelection;
    }));
    lines.push("ActiveSelectionRange: " + safe(function () {
      return host.ActiveSelectionRange === null ? "null" :
             host.ActiveSelectionRange === undefined ? "undefined" : typeof host.ActiveSelectionRange;
    }));
    lines.push("Doc.Selection: " + safe(function () {
      return host.ActiveDocument.Selection === null ? "null" :
             host.ActiveDocument.Selection === undefined ? "undefined" : typeof host.ActiveDocument.Selection;
    }));

    try {
      var selection = host.ActiveSelection;
      if (selection) {
        lines.push("Sel.Count: " + safe(function () { return selection.Count; }));
        lines.push("Sel.BoundingBox tipi: " + safe(function () { return typeof selection.BoundingBox; }));
        var box = null;
        try {
          box = typeof selection.BoundingBox === "function"
            ? selection.BoundingBox()
            : selection.BoundingBox;
        } catch (e) { box = null; }
        if (box) {
          lines.push("BB: " + box.Left + ", " + box.Bottom + " → " + box.Right + ", " + box.Top);
        } else {
          lines.push("BB: okunamadı");
        }
      }
    } catch (e2) {
      lines.push("Sel detay: HATA (" + e2 + ")");
    }

    var selectedCount = 0;
    for (var li = 1; li <= page.Layers.Count; li++) {
      var layer = page.Layers.Item(li);
      if (layer.IsSpecialLayer) continue;
      for (var si = 1; si <= layer.Shapes.Count; si++) {
        try { if (layer.Shapes.Item(si).Selected) selectedCount++; } catch (e3) { /* yok */ }
      }
    }
    lines.push("Shape.Selected sayısı: " + selectedCount);

    var before = "?";
    try { before = host.ActiveSelection ? "var" : "yok"; } catch (e4) { before = "HATA"; }
    try { doc.Unit = 3; } catch (e5) { /* ignore */ }
    var after = "?";
    try { after = host.ActiveSelection ? "var" : "yok"; } catch (e6) { after = "HATA"; }
    lines.push("Birim değişimi: " + before + " → " + after);

    alert(lines.join("\n"));
  } catch (e) {
    alert("API testi hatası: " + (e && e.message ? e.message : e));
  }
})();
