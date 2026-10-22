#Requires -Version 5.1
<#
    Windows dagitim paketi olusturur (GitHub Release eki icin).

        powershell -NoProfile -ExecutionPolicy Bypass -File tools\package-windows.ps1
        powershell -NoProfile -ExecutionPolicy Bypass -File tools\package-windows.ps1 -Version 1.1.0

    Cikti: dist\Summa-OPOS-Regmark-Windows-<surum>.zip
    Paket icinde: Kur.bat, Kaldir.bat, tools\, scripts\, README-WINDOWS.txt,
                  WINDOWS-KURULUM.md, WINDOWS-INSTALL.en.md, LICENSE
#>
[CmdletBinding()]
param(
    [string]$Version,
    [string]$OutDir
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Scripts  = Join-Path $RepoRoot 'scripts'
$Docs     = Join-Path $RepoRoot 'docs'

if (-not $OutDir) {
    $OutDir = Join-Path $RepoRoot 'dist'
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $null
    try {
        $Version = (& git -C $RepoRoot describe --tags --always 2>$null)
    } catch {
        $Version = $null
    }
    if ([string]::IsNullOrWhiteSpace($Version)) {
        $Version = Get-Date -Format 'yyyyMMdd'
    }
}
$Version = $Version.Trim() -replace '^v', ''

$PackageName = "Summa-OPOS-Regmark-Windows-$Version"
$StageRoot   = Join-Path ([IO.Path]::GetTempPath()) ('summa-regmark-' + [guid]::NewGuid().ToString('N'))
$PackageDir  = Join-Path $StageRoot 'Summa-OPOS-Regmark-Windows'
$ZipPath     = Join-Path $OutDir "$PackageName.zip"

function Copy-TextFile {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [switch]$Bom
    )
    $text = [IO.File]::ReadAllText($Source)
    $text = $text -replace "`r?`n", "`r`n"
    $encoding = New-Object System.Text.UTF8Encoding([bool]$Bom)
    [IO.File]::WriteAllText($Destination, $text, $encoding)
}

try {
    New-Item -ItemType Directory -Path (Join-Path $PackageDir 'scripts') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $PackageDir 'tools')   -Force | Out-Null

    # --- launcher'lar ve kurulum betigi (CRLF) ---
    Copy-TextFile -Source (Join-Path $RepoRoot 'Kur.bat')    -Destination (Join-Path $PackageDir 'Kur.bat')
    Copy-TextFile -Source (Join-Path $RepoRoot 'Kaldir.bat') -Destination (Join-Path $PackageDir 'Kaldir.bat')
    Copy-TextFile -Source (Join-Path $RepoRoot 'tools\install-windows.ps1') `
                  -Destination (Join-Path $PackageDir 'tools\install-windows.ps1') -Bom

    # --- JavaScript betikleri (LF korunur) ---
    $jsFiles = @(Get-ChildItem -LiteralPath $Scripts -Filter '*.js' -File | Sort-Object Name)
    if ($jsFiles.Count -eq 0) {
        throw "scripts klasorunde .js dosyasi yok: $Scripts"
    }
    foreach ($file in $jsFiles) {
        Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $PackageDir 'scripts') -Force
    }

    # --- belgeler ---
    $winTr = Join-Path $Docs 'WINDOWS-KURULUM.md'
    $winEn = Join-Path $Docs 'windows-install.en.md'
    if (Test-Path -LiteralPath $winTr) {
        Copy-TextFile -Source $winTr -Destination (Join-Path $PackageDir 'WINDOWS-KURULUM.md') -Bom
    }
    if (Test-Path -LiteralPath $winEn) {
        Copy-TextFile -Source $winEn -Destination (Join-Path $PackageDir 'WINDOWS-INSTALL.en.md') -Bom
    }
    $license = Join-Path $RepoRoot 'LICENSE'
    if (Test-Path -LiteralPath $license) {
        Copy-Item -LiteralPath $license -Destination (Join-Path $PackageDir 'LICENSE') -Force
    }

    $readme = @"
Summa OPOS Regmark · CorelDRAW Windows
=====================================

Surum: $Version
Depo:  https://github.com/ewolution/coreldraw-summa-regmark

HIZLI KURULUM
-------------
1. Bu ZIP'i bir klasore cikarin.
2. "Kur.bat" dosyasina cift tiklayin.
3. Windows "Windows korumali bilgisayarinizi korudu" derse:
   "Ek bilgi" > "Yine de calistir".
4. CorelDRAW'i yeniden baslatin (veya Scripts panelinde Load kullanin).

KURULUM NE YAPAR?
-----------------
Asagidaki klasorlere (varsa 2024/2025/2026) alti .js betigini kopyalar:

  %APPDATA%\Corel\CorelDRAW Graphics Suite 2026\Draw\Scripts

Yonetici hakki, kayit defteri veya eklenti kurulumu gerekmez.
Var olan ayni adli betikler yedeklenir:
  %LOCALAPPDATA%\SummaRegmark\backup\...

KULLANIM
--------
1. CorelDRAW'da dosyanizi acin (once kaydedin).
2. Tools > Scripts > Scripts  (Alt+Shift+F11)
   Turkce arayuz: Araclar > Komut Dosyalari > Komut Dosyalari
3. Solda JavaScript > User Scripts secin.
4. Durumunuza uygun betige cift tiklayin:
   Summa-OPOS-X.js / Summa-OPOS-XY.js / Summa-OPOS-XY2.js

KALDIRMA
--------
"Kaldir.bat" dosyasina cift tiklayin, sonra CorelDRAW'i yeniden baslatin.

AYRINTILAR
----------
WINDOWS-KURULUM.md      (Turkce)
WINDOWS-INSTALL.en.md   (English)

Lisans: MIT (LICENSE)
"@
    [IO.File]::WriteAllText((Join-Path $PackageDir 'README-WINDOWS.txt'), $readme,
        (New-Object System.Text.UTF8Encoding($true)))

    # --- ZIP ---
    if (-not (Test-Path -LiteralPath $OutDir)) {
        New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    }
    if (Test-Path -LiteralPath $ZipPath) {
        Remove-Item -LiteralPath $ZipPath -Force
    }
    Compress-Archive -LiteralPath $PackageDir -DestinationPath $ZipPath -CompressionLevel Optimal

    $item = Get-Item -LiteralPath $ZipPath
    Write-Host ''
    Write-Host 'Paket hazir:' -ForegroundColor Green
    Write-Host ("  {0}" -f $item.FullName)
    Write-Host ("  {0:N1} KB · {1} JavaScript betigi" -f ($item.Length / 1KB), $jsFiles.Count)
    Write-Host ''
} finally {
    if (Test-Path -LiteralPath $StageRoot) {
        Remove-Item -LiteralPath $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
