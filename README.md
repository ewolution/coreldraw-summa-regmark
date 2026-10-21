# Summa OPOS Regmark · CorelDRAW macOS

**Türkçe** | [English](README.en.md)

CorelDRAW'ın **içinde** çalışan, Summa OPOS kayıt işaretlerini (regmark) **seçili objenin
(seçim yoksa sayfanın)** etrafına ekleyen JavaScript betiği. Windows'taki Summa/GoSign eklentisi gibi; ama macOS'ta
eklenti kurmadan.

![Örnek yerleşim](ornek/regmark-ornek.png)

## Neden eklenti değil?

Summa'nın CorelDRAW eklentisi Windows'a özgüdür (COM/VBA bileşenleri). CorelDRAW'ın
macOS sürümü bu eklentileri yükleyemez. Ancak CorelDRAW macOS, **JavaScript** ile
otomasyonu destekler (`Window > Inspectors > Scripts`). Bu betikler o ortam için
yazıldı ve işaretleri doğrudan belgenin içine, vektörel olarak çizer.

## Ne yapar?

- **Seçili obje varsa** işaretleri o objenin sınır kutusunun etrafına koyar ve sayfayı
  **seçim + işaretler** boyutuna getirir.
- **Seçim yoksa** aktif sayfayı baz alır (eski davranış).
- **4 siyah kare** (OPOS X); **OPOS XY** için alta, **OPOS XY2** için alta + üste çizgi.
- Uzun işlerde sol/sağ kenara **eşit aralıklı ek marka satırları** ekler.
- Kareler **%100 K (CMYK 0/0/0/100)** ve kontursuzdur.
- İşaretleri **`Regmark`** adlı ayrı bir katmana koyar ve katmanı kilitler.
- Tekrar çalıştırılabilir: eski `Regmark` katmanını siler; seçim aynıysa sayfa
  tekrar büyümez.

Varsayılan ölçüler:

| Ayar | Değer |
|---|---|
| Marka boyutu | 3 mm |
| Tasarım–marka boşluğu | 5 mm |
| Sayfa kenarı | 10 mm |
| Marka aralığı (uzun iş) | en fazla 300 mm |
| İşaret çerçevesi | her kenara 18 mm (3 + 5 + 10) |
| Sayfa boyutu | korunur; yalnızca işaretler sığmazsa büyür |

## Kurulum

### Klonlayarak

```bash
git clone https://github.com/ewolution/coreldraw-summa-regmark.git
cd coreldraw-summa-regmark
./Kur.command
```

### ZIP / klasör olarak

1. `Kur.command` dosyasına **çift tıklayın**.
2. macOS “geliştirici doğrulanamadı” derse: dosyaya **sağ tıklayın → Aç**.
3. Betikler şu klasörlere kopyalanır (varsa 2024/2025/2026):

```
~/Library/Application Support/Corel/CorelDRAW Graphics Suite 2026/Draw/Scripts/
```

Manuel kurulum isterseniz `scripts/` içindeki `.js` dosyalarını aynı klasöre kopyalayın.

## Kullanım

1. CorelDRAW'da belgenizi açın (önce kaydedin).
2. **Window > Inspectors > Scripts**
   (Türkçe arayüzde: **Pencere > Denetçiler > Komut Dosyaları**).
3. Solda **JavaScript > User Scripts** seçin.
4. İşinize uygun olanı çift tıklayın:

| Betik | Ne zaman? |
|---|---|
| `Summa-OPOS-X.js` | Kesici OPOS **X** modunda |
| `Summa-OPOS-XY.js` | Kesici OPOS **XY** modunda |
| `Summa-OPOS-XY2.js` | Kesici OPOS **XY2** modunda |
| `Summa-Kesim-Ayir.js` | Regmark ekleyip magenta kesim çizgilerini ayırmak için |
| `Summa-Regmark-Kaldir.js` | İşaretleri/katmanı silmek için |
| `Summa-Test.js` | Betikler çalışmıyorsa API kontrolü |

Betik çalışınca bir özet penceresi açılır (sayfa boyutu, kesim alanı, marka sayısı).

> Scripts listesinde betikler görünmüyorsa CorelDRAW'ı kapatıp açın. Yine yoksa
> Scripts panelindeki **Load** ile `.../Draw/Scripts` klasörünü bir kez gösterin.

## Ayarları değiştirme

CorelDRAW'ın JavaScript ortamında diyalog penceresi yoktur. Bu yüzden ayarlar dosyanın
başındaki `AYAR` bloğundan yapılır:

```js
var AYAR = {
  markaBoyutu: 3.0,      // kesicideki "mark size" ile aynı olmalı
  tasarimBosluk: 5.0,    // tasarım kenarı ile marka arası
  sayfaKenari: 10.0,     // marka ile sayfa kenarı arası (beyaz alan)
  markaAraligi: 300.0,   // uzun işlerde iki marka satırı arası en fazla (mm)
                         // 0 = sadece köşe markaları
  oposTipi: "XY2",       // "X" | "XY" | "XY2"
  secimeGore: true,      // true: seçili objeyi baz al
  sayfaBuyut: true,      // true: işaretler sığsın diye sayfayı gerekirse büyüt
                         // false: sayfa hiç değişmez (işaretler sığmazsa uyarır)
  katmanAdi: "Regmark"
};
```

Dosyayı TextEdit ile açıp değerleri değiştirin, kaydedin, betiği yeniden çalıştırın.
`Kur.command` ile yeniden kurmak gerekmez; dosya doğrudan Scripts klasöründedir.

**Önemli:** `markaBoyutu` ve `oposTipi`, kesicinin OPOS ayarlarıyla birebir aynı olmalı.
Yanlış boyut/mod, kesicinin işaretleri bulamamasına yol açar.

## Seçim / sayfa boyutu

1. CorelDRAW'da işaretlerini eklemek istediğin objeyi (veya grubu) **seç**.
2. Betiği çalıştır.
3. Betik seçimin sınır kutusunu ölçer ve **4 kareyi tam objenin kenarlarına** koyar.
   Sayfa **küçültülmez**; sadece işaretler sayfaya sığmıyorsa gerekli kadar büyütülür
   ve içerik o kadar kaydırılır.

- **Seçim yoksa** sayfa baz alınır ve sayfa her kenardan 18 mm büyütülür.
- `sayfaBuyut: false`: sayfa hiç değişmez. Seçim kenara çok yakınsa ve işaretler
  sayfa dışına taşacaksa betik uyarır ve işlem yapmaz.
- `secimeGore: false` yaparsan seçim yok sayılır ve sayfa bazlı davranış kullanılır.
- Seçim dışındaki nesneler sayfada olduğu gibi kalır (sayfa küçültülmediği için
  kesilmez).

Kilitli nesne veya kilitli katman varsa betik sayfayı değiştirmez ve uyarı verir.
Kilitleri açıp yeniden çalıştırın.

## Uzun işlerde ek marka satırları

Büyük/uzun işlerde tek sıra köşe markası yeterli olmaz: OPOS sensörü medyayı çok
fazla ileri geri çeker ve hassasiyet düşer. Betik, kesim yüksekliğine göre sol ve
sağ kenara **eşit aralıklı** ek marka satırları ekler.

- `markaAraligi` (varsayılan **300 mm**): iki satır arasındaki en fazla mesafe.
- İlk satır alt köşe, son satır üst köşe; aradakiler eşit dağıtılır.
- `0` yaparsanız yalnızca 4 köşe karesi çizilir.

Örnek:

| Kesim yüksekliği | Satır sayısı | Aralık |
|---|---|---|
| 100 mm | 2 | 113 mm |
| 405 mm | 3 | 209 mm |
| 600 mm | 4 | 204 mm |
| 900 mm | 5 | 228 mm |

![Uzun iş örneği](ornek/uzun-is-ornek.png)

Ayrıntılı yerleşim, kesici ayarları ve kaynaklar:
**[docs/OPOS-marka-yerlesimi.md](docs/OPOS-marka-yerlesimi.md)** · [EN](docs/opos-mark-layout.en.md)

Kodun ve API kullanımının ayrıntıları:
**[docs/TEKNIK-DETAYLAR.md](docs/TEKNIK-DETAYLAR.md)** · [EN](docs/technical-details.en.md)

## Magenta kesim çizgilerini ayırma

`Summa-Kesim-Ayir.js` **önce OPOS XY regmarklarını ekler**, sonra
**tam CMYK 0/100/0/0** magenta kesim çizgilerini ayırır.

- **Seçim varsa** yalnızca seçili nesneler ayrılır ve regmarklar **seçimin
  etrafına** eklenir.
- **Seçim yoksa** sayfa baz alınır.

Renk eşleşmesinde
**tolerans yoktur**: 99.9 veya 90 magenta seçilmez; çizgi tam 0/100/0/0 olmalı.
Spot renk adı (`Cut`, `Kesim` vb.) tek başına yeterli değildir.

```js
var AYAR = {
  kesimCmyk: [0, 100, 0, 0], // tam eşleşme, tolerans yok
  yeniSayfa: true,           // true: 2. sayfa, false: aynı sayfada "Kesim" katmanı
  kesimKatmani: "Kesim",

  // OPOS regmark (OPOS betikleriyle aynı olmalı)
  markaBoyutu: 3.0,
  tasarimBosluk: 5.0,
  sayfaKenari: 10.0,
  markaAraligi: 300.0
  // OPOS XY sabittir: 4 kare + alt çizgi
};
```

- `yeniSayfa: true` (varsayılan): sayfa 1 = **baskı + regmark**, sayfa 2 =
  **kesim + regmark**. İki sayfa da aynı boyutta olur.
- `yeniSayfa: false`: tek sayfada **`Kesim` katmanı** + regmark. Baskıda bu
  katmanı, kesimde tasarım katmanlarını kapatarak iki PDF üretirsiniz.
- Bu akışta **`Regmark` katmanı kilitlenmez**; istediğiniz zaman düzenleyebilirsiniz.

### İş akışı

1. Ayırmak istediğin nesneleri **seç** (tüm sayfa için seçim yapma).
2. `Summa-Kesim-Ayir` betiğini çalıştır.
3. Sayfa 1 baskı, sayfa 2 kesim dosyasıdır; ikisinde de OPOS XY regmarkları hazırdır.
4. Sayfa 1'i baskı PDF'i, sayfa 2'yi kesim PDF'i olarak ver.

Regmarkları ayrıca çalıştırmanız gerekmez; ayırma betiği ikisini de ekler.

### Sınırlamalar

- **Tam 0/100/0/0** dışındaki magentalar seçilmez (tolerans yok).
- Seçim varsa yalnızca seçili nesneler işlenir; seçim yoksa tüm sayfa.
- Regmarklar OPOS **XY**'dir (4 kare + alt çizgi); üst çizgi eklenmez.
- **Gruplar desteklenir:** tamamen kesim renginden oluşan grup bozulmadan taşınır.
  Karışık grup (tasarım + kesim) bir seviye çözülür, kesim nesneleri ayrılır.
- **PowerClip** içeren gruplar güvenlik için atlanır; elle çözülmelidir.
- **Bitmap** içindeki magenta pikseller ayrılamaz (vektör renk taraması yapılır).
- Aynı nesnede **baskı dolgusu + magenta kontur** varsa nesne atlanır (karışık).
- `pdf-bicak` PDF içerik akışı seviyesinde çalışır; bu betik CorelDRAW **nesne**
  seviyesinde çalışır. Karmaşık PDF'ler için ikisi tamamlayıcıdır.

## İş akışı notları

- **Baskı:** CorelDRAW'dan normal şekilde PDF'e verin; işaretler `Regmark`
  katmanında olduğu için çıktıya dahildir.
- **Kesim:** Kesim çizgilerinizi ayrı bir katmanda tutun. Summa yazılımı (GoSign /
  WinPlot) `Regmark` katmanını kayıt işareti olarak tanır; kesim çizgisi olarak
  yorumlanmaması için işaretleri kesim katmanına koymayın.
- **Ölçek:** Yazdırırken **%100 / Gerçek boyut** kullanın; “sayfaya sığdır” kapalı olsun.
- **Kesici:** OPOS modu (X / XY / XY2), marka boyutu ve marka–tasarım mesafesi
  kesicinin OPOS parametreleriyle eşleşmeli.
- **Test:** İlk işte küçük bir test baskısı + test kesimi yapın. Özellikle parlak
  vinil/laminasyonda OPOS sensörü için medya kalibrasyonu gerekebilir.
- **Geri alma:** Betik belgeyi değiştirir. İşlem öncesi dosyayı kaydedin; gerekirse
  `Cmd+Z` veya `Summa-Regmark-Kaldir.js` ile işaretleri silin. Sayfa boyutu
  küçültme otomatik yapılmaz.

## Sınırlamalar

- Yalnızca **aktif sayfadaki seçim** işlenir (çok sayfalı belgede her sayfa için çalıştırın).
- Sayfa seçime göre küçültülmez; yalnızca işaretler sığmazsa büyür.
- Master page üzerindeki içerik sayfa büyütmesinde kaymaz; tasarım normal katmanda olmalı.
- `alert` dışında arayüz yoktur; bu yüzden ayarlar dosyadan yapılır.
- Windows eklentisinin “barkod” veya “iş numarası” özellikleri yoktur.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Betikler listede yok | CorelDRAW'ı yeniden başlatın; **Load** ile Scripts klasörünü gösterin |
| “Açık bir belge yok” | Önce bir `.cdr` dosyası açın |
| “Sayfa çok küçük” | Ölçüleri küçültün veya daha büyük sayfa kullanın |
| “Kilitli nesne/katman var” | Katman/nesne kilitlerini açın veya `sayfaBuyut: false` yapın |
| Ek markalar kesimde kayma yapıyor | `markaAraligi` değerini kesicideki OPOS panelling/panel boyu ile uyumlu seçin; kesim dosyası baskıyla aynı geometride mi kontrol edin. |
| “Seçim okunamadı” | Önce `Summa-Test` betiğini çalıştırıp çıkan metne bakın. Betiği Scripts panelinden çalıştırmak seçimi kaldırıyorsa, `Tools > Customization > Commands > Scripts` altından bir kısayol atayıp obje seçiliyken kısayolu kullanın. |
| Sayfa büyümedi | `sayfaBuyut` değeri `true` mu? `Regmark` katmanı zaten varsa sayfa tekrar büyümez |
| Kesici işaretleri bulamıyor | Marka boyutu/mod kesiciyle aynı mı? Yeterli beyaz alan var mı? Baskı %100 mü? |
| İşaretler yanlış yerde | `tasarimBosluk` ve `sayfaKenari` değerlerini kontrol edin |

## Geliştirme / test

Betikler tek bir şablondan üretilir:

```
src/regmark.template.js   →  tools/build.py  →  scripts/*.js
```

```bash
python3 tools/build.py
node tests/mock_coreldraw.js
```

`tests/mock_coreldraw.js`, CorelDRAW API'sini taklit ederek geometriyi, katman
davranışını, seçim geometrisini, uzun iş marka satırlarını, kilit kontrolünü, tekrar çalıştırmayı ve magenta kesim ayrımını (seçim, sayfa ve grup modu) test eder (24/24 geçer).

## Lisans

MIT © 2026 ewolution. Ayrıntılar: [LICENSE](LICENSE).
