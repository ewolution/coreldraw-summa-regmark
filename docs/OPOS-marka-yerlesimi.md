# Summa OPOS işaret yerleşimi (uzun işler)

**Türkçe** | [English](opos-mark-layout.en.md)

Bu belge, `coreldraw-regmark` betiklerinin işaretleri nasıl yerleştirdiğini ve
büyük/uzun işlerde neden ek marka satırları eklendiğini açıklar.

## 1. Temel yerleşim

```
            üst çizgi (XY2)
   ┌──────────────────────────────────┐
 ■ │                                  │ ■     ← sol/sağ üst köşe kareleri
   │                                  │
 ■ │          KESİM ALANI             │ ■     ← ek satır (uzun işlerde)
   │          (seçili obje)            │
 ■ │                                  │ ■     ← ek satır
   │                                  │
 ■ │                                  │ ■     ← sol/sağ alt köşe kareleri
   └──────────────────────────────────┘
            alt çizgi (XY / XY2)
```

- **OPOS X:** sadece kareler.
- **OPOS XY:** kareler + alt çizgi.
- **OPOS XY2:** kareler + alt ve üst çizgi.
- Kareler **3 mm**, **%100 K** (CMYK 0/0/0/100), kontursuz.
- Tasarım ile kare arası **5 mm**; kare ile sayfa kenarı arası **10 mm**.
- Karelerin çevresinde en az **marka boyutunun 3–4 katı** beyaz alan olmalı
  (3 mm marka için ~9–12 mm). Varsayılan boşluklar bunu sağlar.

## 2. Neden ek marka satırları?

Uzun işlerde OPOS sensörü tüm işaretleri okumak için medyayı çok fazla ileri geri
çeker; bu da tracking (hat takibi) hatasına ve kesim kaymasına yol açar.

Summa bunun için **OPOS panelling** özelliğini kullanır: iş, panellere bölünür ve
sensör her panelin başındaki/sonundaki işaretleri okur. Bunun çalışması için
işaretlerin **düzenli aralıklarla**, sol ve sağ kenar boyunca tekrarlanması gerekir.

Summa DC3 kılavuzu (bölüm 6.2) şunları söyler:

- İşaret boyutu **3 mm** olmalı; çizgi kalınlığı işareti büyütmemeli.
- İşaretler **düzenli aralıklarla** yerleştirilmeli.
- Normalde **30–40 cm** aralık uygundur.
- İşaret boyutu 3 mm'den küçükse aralık küçültülmeli.
- Aralık küçüldükçe OPOS daha hassas ama daha yavaş çalışır.

EFI Digital Factory notu da **600 mm'den uzun işlerde** ek "segmented marks"
gerekebileceğini belirtir.

## 3. Betiğin kuralı

`AYAR` bloğundaki `markaAraligi` (varsayılan **300 mm**) iki marka satırı arasındaki
**en fazla** mesafedir.

Hesap:

```
span      = kesim yüksekliği + 2 × (tasarım boşluğu) + marka boyutu
intervals = ceil(span / markaAraligi)
satır     = intervals + 1
aralık    = span / intervals
```

İlk satır alt köşe, son satır üst köşedir. Aradaki satırlar **eşit aralıkla**
dağıtılır. Böylece köşe kareleri dahil tüm satırlar aynı mesafede olur.

![Uzun iş örneği](../ornek/uzun-is-ornek.png)

*405 mm kesim yüksekliğinde: 3 satır (1 ek satır), 209 mm aralık. Görseldeki
örnekte kesim yüksekliği 664 mm olup 4 satır ve 225.7 mm aralık vardır.*

`markaAraligi: 0` yaparsanız yalnızca 4 köşe karesi çizilir (eski davranış).

### Örnekler

| Kesim yüksekliği | span | Satır | Aralık |
|---|---|---|---|
| 100 mm | 113 mm | 2 | 113 mm |
| 300 mm | 313 mm | 3 | 156.5 mm |
| 405 mm | 418 mm | 3 | 209 mm |
| 600 mm | 613 mm | 4 | 204.3 mm |
| 900 mm | 913 mm | 5 | 228.3 mm |
| 1200 mm | 1213 mm | 6 | 242.6 mm |

Not: 405 mm'lik bir işte 1 ek satır (toplam 3 satır), 600 mm'de 2 ek satır
(toplam 4 satır) oluşur.

## 4. Kesici ayarları

- Kesicideki **OPOS modu** (X / XY / XY2) ile betikteki `oposTipi` aynı olmalı.
- Kesicideki **mark size** 3 mm (veya seçtiğiniz boyut) ile aynı olmalı.
- **OPOS panelling**:
  - `Off`: kesici işaretleri tek tek okur; kısa işler için.
  - `On (2 marks)`: her panelde 2 işaret okunur.
  - `On (4 marks)`: önceki panelin son işaretleri tekrar okunur (daha iyi bağlantı).
  - Panelling açıksa işaret satırları panel sınırlarına denk gelmelidir. Betik
    eşit aralık kullandığı için panel boyunu `markaAraligi` ile uyumlu seçin.
- GoSign / WinPlot kullanıyorsanız işaretler **`Regmark` katmanında** olmalı;
  kesim çizgileri ayrı katmanda kalmalı.
- Eski DC3 gibi makinelerde **marker count** parametresi vardır; yazdırdığınız
  satır sayısını (ör. 3 satır × 2 kenar = 6 kare) bu parametreye girin.

## 5. Yazdırma ve test

- Yazdırırken **%100 / Gerçek boyut**; “sayfaya sığdır” kapalı.
- İlk işte küçük bir test baskısı + test kesimi yapın.
- Parlak vinil/laminasyonda OPOS sensörü zorlanabilir; medya kalibrasyonu gerekebilir.
- İşaretler siyah (K) olmalı; RGB siyah veya çok açık gri sensör tarafından
  güvenilir okunmayabilir.

## 6. Kontrol listesi

- [ ] Seçili obje doğru mu?
- [ ] `oposTipi` kesiciyle aynı mı?
- [ ] `markaBoyutu` kesicideki değerle aynı mı?
- [ ] `markaAraligi` panel boyuna uygun mu?
- [ ] İşaretlerin çevresinde yeterli beyaz alan var mı?
- [ ] Baskı %100 ölçekte mi?
- [ ] Kesim dosyası baskı dosyasıyla aynı sayfa geometrisinde mi?

## 7. Kaynaklar

- Summa S One User's Manual — 3.2.2 "Different OPOS alignment methods",
  3.2.3 "Processing long jobs" (OPOS panelling).
- Summa S Class 2 User's Manual — 3.2.3 "Processing long jobs".
- Summa DC3 User's Manual — 6.2 "Making and printing the design"
  (3 mm işaret, 30–40 cm aralık, eşit mesafe).
- EFI Digital Factory — "Setting up Summa OPOS marks": 600 mm üzeri işlerde
  ek segmented marks gerekebilir.

## 8. Summa dokümanlarıyla karşılaştırma

Aşağıdaki tablo, betiğin varsayılanları ile Summa dokümanlarındaki önerileri
karşılaştırır. "Uyumlu" olanlar doğrudan dokümana dayanır; "seçim" olanlar
makine/medya durumuna göre ayarlanması gereken mühendislik varsayımlarıdır.

| Konu | Summa dokümanı | Betik varsayılanı | Durum |
|---|---|---|---|
| Marka boyutu | 3 mm (DC3 6.2) | 3 mm | Uyumlu |
| Marka şekli | Kare | Kare | Uyumlu |
| Sol/sağ marka kolonları | Var (S One 3.2.2) | Var | Uyumlu |
| OPOS XY çizgisi | Alt çizgi | Alt çizgi | Uyumlu |
| OPOS XY2 çizgisi | Alt + üst çizgi | Alt + üst çizgi | Uyumlu |
| Çizgi kalınlığı | Marka boyutu kadar (GoSign) | Marka boyutu | Uyumlu |
| Marka aralığı | Normalde 30–40 cm (DC3 6.2) | En fazla 300 mm | Uyumlu (temkinli) |
| İşaret çevresi beyaz alan | 3–4 × marka boyutu (DC3) | 5 mm iç, 10 mm dış | Kısmen; DC3 için artırılabilir |
| Rulo yan/ön kenar | 20 mm (kısa işlerde min. 10 mm) | 10 mm | Minimum; üretimde 20 mm önerilir |
| Tabaka son marka–kenar | En az 40 mm (S One 3.2.1) | 10 mm | **Uyumsuz olabilir**; `sayfaKenari` artırılmalı |
| OPOS panelling | Off / On (2) / On (4) | Satırlar eşit aralıklı | Kesici ayarına bağlı |
| Marker count | Eski makinelerde parametre | Otomatik hesaplanır | Kesicide girilmeli |

### Pratik sonuç

- **Rulo işlerinde** `sayfaKenari` değerini en az **20 mm** yapın.
- **Tabakaya basıyorsanız** son marka ile tabaka kenarı arasında **40 mm**
  bırakın; yani `sayfaKenari: 40` kullanın veya sayfayı CorelDRAW'da büyütün.
- DC3 gibi eski makinelerde işaret çevresindeki beyaz alanı 3–4 × 3 mm = **9–12 mm**
  yapın; `tasarimBosluk` ve `sayfaKenari` toplamı bunu karşılamalı.
- `markaAraligi` için 300 mm güvenli bir başlangıçtır; kesicide panelling açıksa
  panel boyuyla eşleştirin.

> Not: Summa'nın kendi GoSign/WinPlot eklentisi işaretleri kendi algoritmasıyla
> koyar. Birebir aynı yerleşimi istiyorsanız Windows'ta eklentiyle üretilmiş bir
> örnek PDF'i ölçüp aynı değerleri bu betiğe girebiliriz.
