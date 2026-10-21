# Teknik detaylar

**Türkçe** | [English](technical-details.en.md)

Bu belge, betiklerin nasıl üretildiğini, CorelDRAW API'sini nasıl kullandığını ve
geometrinin nasıl hesaplandığını açıklar. Kullanıcı dokümanı için `README.md`,
OPOS kuralları için `docs/OPOS-marka-yerlesimi.md` dosyasına bakın.

## 1. Dosya yapısı

```
src/regmark.template.js   Ana şablon (tek kaynak)
src/cleanup.js            "Regmark" katmanını silen betik
src/test.js               API/seçim teşhis betiği
tools/build.py            Şablondan scripts/*.js üretir
scripts/                  CorelDRAW'a kurulan üretilmiş betikler
tests/mock_coreldraw.js   CorelDRAW API'sini taklit eden test ortamı
docs/                     OPOS yerleşimi ve bu teknik belge
ornek/                    Örnek yerleşim görselleri
Kur.command               Betikleri CorelDRAW Scripts klasörlerine kopyalar
Kaldir.command            Betikleri kaldırır
```

Betikler elle düzenlenmez; `src/regmark.template.js` düzenlenip yeniden üretilir:

```bash
python3 tools/build.py
node tests/mock_coreldraw.js
```

`tools/build.py`, şablondaki `__OPOS__` yer tutucusunu `X`, `XY`, `XY2` ile
değiştirerek üç betik üretir. Böylece geometri kodu tek yerde kalır.

## 2. CorelDRAW JavaScript ortamı

CorelDRAW'ın macOS JavaScript motoru tarayıcı değildir:

- Global `host` nesnesi üzerinden API'ye erişilir: `host.ActiveDocument`,
  `host.ActivePage`, `host.ActiveSelection`.
- `alert()` dışında arayüz yoktur; bu yüzden ayarlar dosya başındaki `AYAR`
  nesnesinden yapılır.
- Enum değerleri **sayı** olarak verilmelidir. Örneğin milimetre `cdrMillimeter = 3`.
- ECMAScript 6 desteklenir; ancak uyumluluk için betiklerde `var` ve klasik
  fonksiyonlar kullanılır.
- Nesne modeli VBA ile aynıdır; `undefined` ile isteğe bağlı parametre atlanır.

## 3. Seçim algılama

Seçim, geometri hesaplanmadan **önce** ve birim değiştirilmeden okunur. Sürüme göre
seçim farklı nesnelerden erişilebildiği için sırayla denenir:

1. `host.ActiveSelectionRange`
2. `host.ActiveSelection`
3. `host.ActiveView.Selection`
4. `host.ActiveDocument.ActiveSelection`
5. `host.ActiveDocument.Selection`

Her aday için sırayla:

1. `BoundingBox` (varsa metod gibi çağrılır),
2. `Shapes` koleksiyonu (`Count` / `Item`),
3. doğrudan `Count` / `Item`,
4. son çare olarak sayfadaki `Shape.Selected == true` nesneler.

Seçim yoksa veya sınır kutusu okunamazsa sayfa bazlı davranışa düşülür ve uyarı
penceresinde kısa bir teşhis metni gösterilir.

### Birim dönüşümü

Seçim birim değişikliğinden önce okunduğu için eski birimde olabilir. `unitToMm()`
`cdrUnit` değerlerini mm'ye çevirir (inch, cm, point, pica, cicero vb.). Belge
zaten mm ise çarpan 1'dir.

## 4. Geometri

### Temel büyüklükler

```
size  = markaBoyutu          (varsayılan 3 mm)
gap   = tasarimBosluk        (varsayılan 5 mm)
edge  = sayfaKenari          (varsayılan 10 mm)
frame = size + gap + edge    (varsayılan 18 mm)
```

### Hedef alan

- Seçim varsa: `target` = seçimin sınır kutusu.
- Seçim yoksa: `target` = sayfa (0,0)–(W,H).

### Sayfa büyütme

Sayfa **küçültülmez**. Yalnızca işaretler sayfaya sığmıyorsa büyütülür:

```
shiftX = target.x0 < frame ? frame - target.x0 : 0
shiftY = target.y0 < frame ? frame - target.y0 : 0
newW   = max(W, target.x1 + shiftX + frame)
newH   = max(H, target.y1 + shiftY + frame)
```

`SetSize` içeriği kendiliğinden kaydırırsa, ilk şeklin `PositionX/Y` değeri
karşılaştırılarak fark telafi edilir. Böylece hem "içerik sabit kalır" hem
"içerik kayar" davranışı doğru sonuç verir.

Seçim yoksa ve `sayfaBuyut: true` ise sayfa her kenardan `frame` kadar büyütülür
(klasik sayfa bazlı davranış). `Regmark` katmanı zaten varsa sayfa ikinci kez
büyütülmez (idempotent).

### Marka satırları

Sol/sağ kolonlarda köşe markaları ve gerekirse ara satırlar:

```
bottomCenter = cutY0 - gap - size/2
topCenter    = cutY1 + gap + size/2
span         = topCenter - bottomCenter
intervals    = max(1, ceil(span / markaAraligi))
rowStep      = span / intervals
```

`intervals + 1` satır, her satırda iki kare (sol/sağ). `markaAraligi: 0` ise
`intervals = 1` olur, yalnızca köşe kareleri çizilir.

### Çizgiler

- OPOS XY: alt çizgi, `y = cutY0 - gap - size … cutY0 - gap`
- OPOS XY2: ek olarak üst çizgi, `y = cutY1 + gap … cutY1 + gap + size`
- Çizgi kalınlığı = marka boyutu (Summa/GoSign kuralı).
- Çizgi, kesim alanının genişliği kadar (`cutX0 … cutX1`).

### Renk ve katman

- Dolgu: `CMYKAssign(0, 0, 0, 100)` → %100 K.
- Kontur: `Outline.Type = 0` (`cdrNoOutline`).
- Tüm işaretler `Regmark` katmanına çizilir, ardından katman kilitlenir
  (`Editable = false`).
- Yeniden çalıştırmada eski katman silinir; kilitliyse önce açılır.

## 5. Kullanılan CorelDRAW API'leri

| Amaç | API |
|---|---|
| Belge/sayfa | `host.ActiveDocument`, `ActivePage` |
| Birim | `Document.Unit` (`cdrMillimeter = 3`) |
| Sayfa boyutu | `Page.SizeWidth`, `SizeHeight`, `Page.SetSize(w, h)` |
| Katman | `Page.CreateLayer(name)`, `Page.Layers`, `Layer.Delete()` |
| Şekil çizme | `Layer.CreateRectangle(x0, y0, x1, y1)` |
| Dolgu/kontur | `Shape.Fill.UniformColor.CMYKAssign(...)`, `Shape.Outline.Type` |
| Taşıma | `Shape.Move(dx, dy)`, `Shape.PositionX/Y` |
| Kilit | `Shape.Locked`, `Layer.Editable` |
| Seçim | `host.ActiveSelection`, `ShapeRange.BoundingBox`, `Shape.Selected` |

## 6. Test ortamı

`tests/mock_coreldraw.js`, CorelDRAW API'sini küçük sınıflarla taklit eder:

- `Page`, `Layer`, `Shape`, `ShapeRange`, koleksiyonlar
- `SetSize` sırasında içerik kaydırma simülasyonu (`shiftOnResize`)
- Kilitli şekil/katman davranışı
- `ActiveSelection` enjeksiyonu

Çalıştırma:

```bash
node tests/mock_coreldraw.js
```

Kapsanan senaryolar:

- OPOS X / XY / XY2 nesne sayıları
- Seçimli ve seçimsiz yerleşim
- Sayfa büyütme, küçültmeme ve içerik kaydırma
- `sayfaBuyut: false` sığma/sığmama
- Kilitli nesne ve katman
- Tekrar çalıştırma (idempotency)
- Uzun işlerde eşit aralıklı satırlar
- Temizleme betiği
- Magenta kesim ayrımı (sayfa ve katman modu, spot renk, tolerans)

## 7. Yeni bir OPOS varyantı eklemek

1. `src/regmark.template.js` içindeki `AYAR.oposTipi` karşılaştırmalarına yeni
   değeri ekleyin (ör. `"XTRA"` ve ara çizgiler).
2. `tools/build.py` içindeki `PRESETS` sözlüğüne dosya adını ekleyin.
3. `python3 tools/build.py` ve `node tests/mock_coreldraw.js` çalıştırın.
4. README ve `docs/OPOS-marka-yerlesimi.md` tablolarını güncelleyin.

## 8. Magenta kesim ayırma

`src/kesim-ayir.js` → `scripts/Summa-Kesim-Ayir.js`. CorelDRAW nesne modelinde
renk eşleştirmesi yapar:

- Dolgu: `Shape.Fill.Type === 1` (`cdrUniformFill`) ve
  `Fill.UniformColor.CMYKCyan/CMYKMagenta/CMYKYellow/CMYKBlack` (0–100) değerleri
  `kesimCmyk` ile `tolerans` içinde eşleşir.
- Kontur: `Shape.Outline.Type !== 0` ve `Outline.Color` aynı şekilde eşleşir.
- Spot renk: `Color.IsSpot` ve `Color.SpotColorName` / `Color.Name` içinde
  `spotAdlari` listesinden biri geçiyorsa kesim sayılır.
- Karışık nesne (tasarım dolgusu + magenta kontur) atlanır; baskı içeriği
  kaybolmasın diye.
- Gruplar: tüm yapraklar kesimse grup taşınır; karışık renk varsa uyarı verilip
  atlanır.

Taşıma:

- `yeniSayfa: true` → `Document.AddPagesEx(1, W, H)` ile aynı boyutta yeni sayfa,
  `Page.CreateLayer("Kesim")`, ardından `Shape.MoveToLayer(layer)`.
- `yeniSayfa: false` → aynı sayfada `Kesim` katmanı.
- `MoveToLayer` sonrası `PositionX/Y` farkı `Shape.Move(dx, dy)` ile düzeltilir;
  böylece kesim çizgileri baskı sayfasıyla aynı koordinatta kalır.

## 9. Sınırlamalar

- Yalnızca aktif sayfa ve aktif seçim işlenir.
- Master page içeriği sayfa büyütmesinde kaymaz.
- Sayfa yalnızca büyütülür; seçime göre küçültülmez.
- `alert` dışında arayüz yoktur.
- Barkod / iş numarası / otomatik kesim dosyası üretimi yoktur.
- Bitmap içindeki magenta pikseller ayrılamaz; yalnızca vektör dolgu/kontur
  renkleri taranır.
- Grup içindeki karışık renkli nesneler otomatik ayrılmaz; önce grup çözülmelidir.
- Windows eklentisinin birebir aynısı değildir; marka boyutu ve aralık
  ayarlanabilir.
