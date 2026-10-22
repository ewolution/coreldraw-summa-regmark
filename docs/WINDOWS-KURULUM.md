# Summa OPOS Regmark · Windows kurulum

**Türkçe** | [English](windows-install.en.md)

CorelDRAW (Windows) içinde çalışan Summa OPOS regmark betiklerinin Windows
kurulumu, kullanımı ve kaldırılması. Betikler aynı JavaScript dosyalarıdır;
macOS sürümüyle tek kaynaktan üretilir.

> **Kısa yol:** [Releases](https://github.com/ewolution/coreldraw-summa-regmark/releases/latest)
> sayfasından `Summa-OPOS-Regmark-Windows-*.zip` indir → çıkar → `Kur.bat` →
> CorelDRAW'ı yeniden başlat → **Tools > Scripts > Scripts**.

## Gereksinimler

| Gereksinim | Ayrıntı |
|---|---|
| İşletim sistemi | Windows 10 veya 11 (64-bit) |
| CorelDRAW | CorelDRAW Graphics Suite **2019 veya üzeri** (Windows sürümü) |
| PowerShell | Windows PowerShell 5.1 (Windows'ta hazır gelir) |
| Yetki | **Yönetici gerekmez**; kurulum kullanıcı klasörüne yazılır |
| İnternet | Yalnızca indirme için; kurulum çevrimdışı çalışır |

Betikler CorelDRAW'ın JavaScript API'sini kullanır. CorelDRAW 2019+ Windows
sürümleri JavaScript kullanıcı betiklerini destekler; eklenti (COM/VBA) kurulumu
gerekmez.

## Hızlı kurulum (önerilen)

1. [Releases](https://github.com/ewolution/coreldraw-summa-regmark/releases/latest)
   sayfasından `Summa-OPOS-Regmark-Windows-<sürüm>.zip` dosyasını indirin.
2. ZIP'e **sağ tıklayın → Tümünü ayıkla**. Dosyaları doğrudan ZIP içinden
   çalıştırmayın.
3. Çıkan klasördeki **`Kur.bat`** dosyasına **çift tıklayın**.
4. Windows “Windows korumalı bilgisayarınızı korudu” derse:
   **Ek bilgi → Yine de çalıştır**.
5. Kurulum penceresi hangi CorelDRAW sürümlerine yazdığını listeler:

   ```
   Kurulum tamam: 3 sürüm, 18 dosya.
   ```
6. CorelDRAW'ı **kapatıp yeniden açın** (açıkken kopyalama yapılır, ancak
   betik listesi yenilenmez).

Kurulum sonrası kontrol: CorelDRAW'da **Tools > Scripts > Scripts**
(Alt+Shift+F11) → **JavaScript > User Scripts** altında `Summa-OPOS-X`,
`Summa-OPOS-XY`, `Summa-OPOS-XY2` görünmelidir.

## Kurulum yöntemleri

### A. Git ile

```bat
git clone https://github.com/ewolution/coreldraw-summa-regmark.git
cd coreldraw-summa-regmark
Kur.bat
```

Komut satırından (ör. uzak masaüstü / otomasyon):

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1
```

### B. ZIP / klasör olarak

Depoyu **Code → Download ZIP** ile indirip çıkardıktan sonra `Kur.bat`'a çift
tıklayın. ZIP sürümünde `Kur.bat`, `Kaldir.bat`, `tools\` ve `scripts\` aynı
klasörde olmalıdır.

### C. Elle kopyalama (betik kullanmadan)

1. `%APPDATA%\Corel` klasörünü açın (Gezgin'in adres çubuğuna yazabilirsiniz).
2. CorelDRAW sürüm klasörünü bulun, örn.
   `CorelDRAW Graphics Suite 2026\Draw`.
3. `Scripts` klasörü yoksa oluşturun.
4. Depodaki `scripts\*.js` dosyalarının **altısını** bu klasöre kopyalayın.
5. CorelDRAW'ı yeniden başlatın.

### D. PowerShell seçenekleri

| Parametre | Ne yapar |
|---|---|
| `-DryRun` | Hiçbir dosya yazmadan ne yapılacağını gösterir |
| `-Uninstall` | Betikleri kaldırır (Kaldir.bat bunu kullanır) |
| `-NoBackup` | Üzerine yazılan dosyaları yedeklemez |
| `-AppDataRoot <yol>` | Corel klasörünü elle belirtir (test/özel kurulum) |

Örnek:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1 -DryRun
```

## Kurulum nereye yazıyor?

Kurulum her CorelDRAW sürümü için kullanıcı betik klasörüne yazar:

| CorelDRAW | Klasör |
|---|---|
| 2024 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2024\Draw\Scripts` |
| 2025 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2025\Draw\Scripts` |
| 2026 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2026\Draw\Scripts` |
| Technical Suite | `%APPDATA%\Corel\CorelDRAW Technical Suite <yıl>\Draw\Scripts` |

Kurulum betiği `%APPDATA%\Corel` altında `CorelDRAW ... Suite 20xx` klasörlerini
bulur ve yalnızca içinde `Draw` klasörü olanlara yazar. Hiçbiri yoksa
“CorelDRAW'ı bir kez açıp kapatın” uyarısı verir.

Kopyalanan dosyalar:

| Dosya | İşlev |
|---|---|
| `Summa-OPOS-X.js` | OPOS **X** modunda regmark |
| `Summa-OPOS-XY.js` | OPOS **XY** modunda regmark |
| `Summa-OPOS-XY2.js` | OPOS **XY2** modunda regmark |
| `Summa-Kesim-Ayir.js` | Regmark + magenta kesim çizgilerini ayırma |
| `Summa-Regmark-Kaldir.js` | İşaretleri/katmanı silme |
| `Summa-Test.js` | API ve seçim teşhisi |

Kurulum ayrıca:

- Daha önce kurulmuş aynı adlı betikleri şu klasöre **yedekler**:
  `%LOCALAPPDATA%\SummaRegmark\backup\<tarih-saat>\<sürüm>\`
- Kayıt defterine, Program Files'a veya sistem ayarlarına **dokunmaz**.
- Yönetici izni istemez; kaldırma da aynı şekilde kullanıcı klasöründen siler.

## Kullanım

1. CorelDRAW'da belgenizi açın (işlem öncesi kaydedin).
2. **Tools > Scripts > Scripts** (kısayol: **Alt+Shift+F11**)
   Türkçe arayüzde: **Araçlar > Komut Dosyaları > Komut Dosyaları**
   (Bazı sürümlerde: **Window > Dockers > Scripts**.)
3. Solda **JavaScript > User Scripts** seçin.
4. İşinize uygun betiği **çift tıklayın** (veya seçip **Run**).

| Betik | Ne zaman? |
|---|---|
| `Summa-OPOS-X.js` | Kesici OPOS **X** modunda |
| `Summa-OPOS-XY.js` | Kesici OPOS **XY** modunda |
| `Summa-OPOS-XY2.js` | Kesici OPOS **XY2** modunda |
| `Summa-Kesim-Ayir.js` | Regmark ekleyip magenta kesim çizgilerini ayırmak için |
| `Summa-Regmark-Kaldir.js` | İşaretleri/katmanı silmek için |
| `Summa-Test.js` | Betikler çalışmıyorsa API kontrolü |

Betik çalışınca bir özet penceresi açılır (mod, sayfa boyutu, kesim alanı,
marka satırı sayısı). Pencere görünmüyorsa **Alt+Tab** ile CorelDRAW'ın
arkasında kalmış olabilir.

> **Seçim kayboluyorsa:** Scripts panelinden betiği çalıştırmak seçimi
> kaldırabilir. Bu durumda **Tools > Customization > Commands > Scripts**
> altından bir betiğe kısayol atayın ve objeyi seçtikten sonra kısayolu kullanın.

## Ayarları değiştirme

CorelDRAW'ın JavaScript ortamında ayar penceresi yoktur; ayarlar dosyanın başındaki
`AYAR` bloğundadır. Kurulu dosyayı **Not Defteri** ile açın:

```
%APPDATA%\Corel\CorelDRAW Graphics Suite 2026\Draw\Scripts\Summa-OPOS-XY.js
```

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
                         // false: sayfa hiç değişmez
  katmanAdi: "Regmark"
};
```

Dosyayı **UTF-8** olarak kaydedin (Not Defteri: *Farklı kaydet → Kodlama: UTF-8*).
Türkçe karakterler bozulursa betik hata verir veya metinler bozuk görünür.
`Kur.bat` ile yeniden kurmak gerekmez; dosya doğrudan Scripts klasöründedir.

**Önemli:** `markaBoyutu` ve `oposTipi`, kesicinin OPOS ayarlarıyla birebir aynı
olmalı. Yanlış boyut/mod, kesicinin işaretleri bulamamasına yol açar.

## Kaldırma

1. `Kaldir.bat` dosyasına **çift tıklayın** (veya
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1 -Uninstall`).
2. CorelDRAW'ı yeniden başlatın.

Elle kaldırmak için yukarıdaki `Scripts` klasörlerinden şu altı dosyayı silin:

```
Summa-OPOS-X.js
Summa-OPOS-XY.js
Summa-OPOS-XY2.js
Summa-Kesim-Ayir.js
Summa-Regmark-Kaldir.js
Summa-Test.js
```

Yedekler `%LOCALAPPDATA%\SummaRegmark\backup\` altında kalır; isterseniz bu
klasörü de silebilirsiniz.

## Windows'a özgü notlar

| Konu | Windows | macOS |
|---|---|---|
| Kurulum dosyası | `Kur.bat` / `Kaldir.bat` | `Kur.command` / `Kaldir.command` |
| Betik klasörü | `%APPDATA%\Corel\...\Draw\Scripts` | `~/Library/Application Support/Corel/.../Draw/Scripts` |
| Menü | **Tools > Scripts > Scripts** | **Window > Inspectors > Scripts** |
| Yönetici | Gerekmez | Gerekmez |
| Eklenti | Summa/GoSign eklentisi ayrıca kullanılabilir | Kullanılamaz |

- Windows'ta Summa'nın kendi CorelDRAW eklentisi (GoSign/WinPlot) kurulu
  olabilir. Bu betikler eklentiye bağlı değildir; belgeye yalnızca vektör
  işaretler çizer. İkisi bir arada kullanılabilir.
- Yazdırırken **%100 / Gerçek boyut** kullanın; “sayfaya sığdır” kapalı olsun.
- Ağ/OneDrive ile yönlendirilmiş `%APPDATA%` kullanıyorsanız betikler yine
  çalışır; yalnızca yolu kontrol edin.

## Kurumsal / sessiz kurulum

Kurulum kullanıcı başına çalışır ve yönetici istemez. Intune, Configuration
Manager veya bir oturum açma betiği ile dağıtırken **kullanıcı bağlamında**
çalıştırın:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File "\\sunucu\paylasim\coreldraw-summa-regmark\tools\install-windows.ps1" -NoBackup
```

Betik çıkış kodu: `0` başarılı, `1` hata (CorelDRAW klasörü bulunamadı, eksik
dosya vb.).

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| `Kur.bat` açılıp hemen kapanıyor | Komut isteminde çalıştırın: `Kur.bat` — hata mesajı görünür kalır |
| “Windows korumalı bilgisayarınızı korudu” | **Ek bilgi → Yine de çalıştır** |
| “Betikler listede yok” | CorelDRAW'ı kapatıp açın; Scripts panelinde **Load** ile `...\Draw\Scripts` klasörünü gösterin |
| “CorelDRAW sürüm klasörü bulunamadı” | CorelDRAW'ı bir kez açıp kapatın ve `Kur.bat`'ı tekrar çalıştırın |
| “Bu betiği çalıştırma izniniz yok” (ExecutionPolicy) | `Kur.bat` bunu aşar; elle çalıştırırken `-ExecutionPolicy Bypass` ekleyin |
| “Açık bir belge yok” | Önce bir `.cdr` dosyası açın |
| “Seçim okunamadı” | Önce `Summa-Test` çalıştırın; seçim kayboluyorsa kısayol atayın |
| “Kilitli nesne/katman var” | Kilitleri açın veya `sayfaBuyut: false` yapın |
| Özet penceresi görünmüyor | **Alt+Tab**; CorelDRAW penceresinin arkasında kalmış olabilir |
| Türkçe karakterler bozuk | `.js` dosyasını UTF-8 olarak kaydedin |
| Antivirüs `Kur.bat`'ı engelliyor | Dosya yalnızca `Copy-Item` yapar; kurumsal antivirüste imza/hariç tutma tanımlayın veya betikleri elle kopyalayın |
| Aynı betik iki kez kuruldu | Sorun değil; üzerine yazar ve önceki sürümü yedekler |
| Yanlış sürüme kuruldu | `-DryRun` ile listeyi görün; gerekirse `-AppDataRoot` veya elle kopyalama kullanın |

## Geliştirme / test

```bash
python tools/build.py                      # şablondan scripts/*.js üretir
node tests/mock_coreldraw.js               # 25/25 test
powershell -File tools/package-windows.ps1 -Version 1.4.0   # dist/*.zip
```

Windows paketi `dist\Summa-OPOS-Regmark-Windows-<sürüm>.zip` olarak üretilir ve
GitHub Release'e eklenir.

## Lisans

MIT © 2026 ewolution. Ayrıntılar: [LICENSE](../LICENSE).
