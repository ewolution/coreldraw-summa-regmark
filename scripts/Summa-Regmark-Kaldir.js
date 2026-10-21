/*
  Summa OPOS regmark  ·  CorelDRAW macOS (JavaScript)
  ---------------------------------------------------
  "Regmark" katmanini ve uzerindeki isaretleri siler.
  Sayfa boyutunu kucultmez; gerekirse Sayfa Ayarlari'ndan elle ayarlayin.
*/

(function () {
  "use strict";

  function msg(text) {
    alert("Summa Regmark\n\n" + text);
  }

  try {
    var doc = host.ActiveDocument;
    if (!doc) {
      msg("Açık bir belge yok. Önce CorelDRAW'da dosyanızı açın.");
      return;
    }

    var page = doc.ActivePage;
    var layer = null;
    try { layer = page.Layers.Find("Regmark"); } catch (e) { layer = null; }

    if (!layer) {
      msg("Bu sayfada 'Regmark' katmanı yok.");
      return;
    }

    layer.Editable = true;
    layer.Delete();
    msg("'Regmark' katmanı ve işaretler silindi.\n\n" +
        "Sayfa boyutu değiştirilmedi. Küçültmek için Dosya > Belge Ayarları > Sayfa Boyutu.");
  } catch (e) {
    msg("Hata: " + (e && e.message ? e.message : e));
  }
})();
