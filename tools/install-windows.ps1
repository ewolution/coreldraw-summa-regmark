#Requires -Version 5.1
<#
    Summa OPOS Regmark · CorelDRAW Windows kurulum / kaldirma

    Kur.bat ve Kaldir.bat bu betigi cagirir. Elle calistirmak icin:

        powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1

    Secenekler:
        -Uninstall       Betikleri kaldirir.
        -DryRun          Hicbir sey yazmadan ne yapilacagini gosterir.
        -NoBackup        Var olan betiklerin yedegini almaz.
        -AppDataRoot     Corel klasorunu elle belirtir (test icin).
#>
[CmdletBinding()]
param(
    [switch]$Uninstall,
    [switch]$DryRun,
    [switch]$NoBackup,
    [string]$AppDataRoot
)

$ErrorActionPreference = 'Stop'

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
    # Konsol UTF-8 desteklemiyorsa sorun degil.
}

$RepoRoot  = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $RepoRoot 'scripts'
$LocalRoot = Join-Path $env:LOCALAPPDATA 'SummaRegmark'

$KnownScripts = @(
    'Summa-OPOS-X.js',
    'Summa-OPOS-XY.js',
    'Summa-OPOS-XY2.js',
    'Summa-Kesim-Ayir.js',
    'Summa-Regmark-Kaldir.js',
    'Summa-Test.js'
)

function Write-Title {
    Write-Host ''
    Write-Host '==============================================' -ForegroundColor DarkGray
    if ($Uninstall) {
        Write-Host '  Summa OPOS Regmark · CorelDRAW Windows · Kaldirma' -ForegroundColor White
    } else {
        Write-Host '  Summa OPOS Regmark · CorelDRAW Windows · Kurulum' -ForegroundColor White
    }
    Write-Host '==============================================' -ForegroundColor DarkGray
    Write-Host ''
}

function Write-Fail {
    param([string]$Text)
    Write-Host ''
    Write-Host $Text -ForegroundColor Red
    Write-Host ''
}

Write-Title

if ($DryRun) {
    Write-Host 'DENEME MODU: hicbir dosya degistirilmeyecek.' -ForegroundColor Yellow
    Write-Host ''
}

# --------------------------------------------------------------------------
# Kaynak betikler
# --------------------------------------------------------------------------
if (-not $Uninstall) {
    if (-not (Test-Path -LiteralPath $SourceDir)) {
        Write-Fail @"
HATA: 'scripts' klasoru bulunamadi:
  $SourceDir

Bu dosyayı indirdiğiniz/paketten çıkardığınız klasörün içinden çalıştırın.
"@
        exit 1
    }

    $missing = @($KnownScripts | Where-Object { -not (Test-Path -LiteralPath (Join-Path $SourceDir $_)) })
    if ($missing.Count -gt 0) {
        Write-Fail @"
HATA: 'scripts' klasorunde eksik dosya var:
  $($missing -join ', ')

Git deposunu eksiksiz indirdiginizden emin olun.
"@
        exit 1
    }
}

# --------------------------------------------------------------------------
# CorelDRAW surum klasorleri
# --------------------------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($AppDataRoot)) {
    $AppDataRoot = Join-Path $env:APPDATA 'Corel'
}

if (-not (Test-Path -LiteralPath $AppDataRoot)) {
    Write-Fail @"
CorelDRAW klasörü bulunamadı:
  $AppDataRoot

CorelDRAW'ı bir kez açıp kapatın, sonra bu dosyayı yeniden çalıştırın.
"@
    exit 1
}

$pattern = '^(CorelDRAW Graphics Suite|CorelDRAW Technical Suite|CorelDRAW Essentials)\s+\d{4}$'

$targets = @(
    Get-ChildItem -LiteralPath $AppDataRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match $pattern } |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'Draw') } |
        Sort-Object -Property Name
)

if ($targets.Count -eq 0) {
    Write-Fail @"
CorelDRAW sürüm klasörü bulunamadı:
  $AppDataRoot

Beklenen klasör: 'CorelDRAW Graphics Suite 20xx\Draw'
CorelDRAW'ı bir kez açıp kapatın, sonra bu dosyayı yeniden çalıştırın.
"@
    exit 1
}

$running = @(Get-Process -Name 'CorelDRW' -ErrorAction SilentlyContinue)
if ($running.Count -gt 0 -and -not $Uninstall) {
    Write-Host 'Not: CorelDRAW açık. Dosyalar kopyalanır, ancak Scripts listesinin' -ForegroundColor Yellow
    Write-Host '     yenilenmesi için CorelDRAW''ı yeniden başlatın veya Load kullanın.' -ForegroundColor Yellow
    Write-Host ''
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$versionCount = 0
$fileCount = 0
$lastScriptsDir = $null

foreach ($target in $targets) {
    $scriptsDir = Join-Path $target.FullName 'Draw\Scripts'
    $lastScriptsDir = $scriptsDir

    Write-Host $target.Name -ForegroundColor Cyan
    Write-Host "  $scriptsDir"

    if ($Uninstall) {
        $removed = 0
        foreach ($name in $KnownScripts) {
            $path = Join-Path $scriptsDir $name
            if (-not (Test-Path -LiteralPath $path)) {
                continue
            }
            if ($DryRun) {
                Write-Host "  silinecek: $name" -ForegroundColor DarkGray
            } else {
                Remove-Item -LiteralPath $path -Force
                $removed++
            }
        }

        if ($DryRun) {
            Write-Host '  (deneme)' -ForegroundColor DarkGray
        } elseif ($removed -gt 0) {
            Write-Host "  $removed betik silindi" -ForegroundColor Green
            $fileCount += $removed
            $versionCount++
        } else {
            Write-Host '  bu sürümde kurulu betik yok' -ForegroundColor DarkGray
        }

        continue
    }

    # Scripts klasoru yoksa olustur.
    if (-not (Test-Path -LiteralPath $scriptsDir)) {
        if ($DryRun) {
            Write-Host '  (klasör oluşturulacak)' -ForegroundColor DarkGray
        } else {
            New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
        }
    }

    # Uzerine yazilacak dosyalari yedekle.
    $existing = @($KnownScripts | Where-Object { Test-Path -LiteralPath (Join-Path $scriptsDir $_) })
    if ($existing.Count -gt 0 -and -not $NoBackup) {
        if ($DryRun) {
            Write-Host "  (yedeklenecek: $($existing.Count) dosya)" -ForegroundColor DarkGray
        } else {
            $backupDir = Join-Path $LocalRoot ("backup\{0}\{1}" -f $stamp, $target.Name)
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            foreach ($name in $existing) {
                Copy-Item -LiteralPath (Join-Path $scriptsDir $name) `
                          -Destination (Join-Path $backupDir $name) -Force
            }
            Write-Host "  Yedek: $backupDir" -ForegroundColor DarkGray
        }
    }

    $copied = 0
    foreach ($name in $KnownScripts) {
        $source = Join-Path $SourceDir $name
        $destination = Join-Path $scriptsDir $name

        if ($DryRun) {
            Write-Host "  kopyalanacak: $name" -ForegroundColor DarkGray
            $copied++
            continue
        }

        Copy-Item -LiteralPath $source -Destination $destination -Force
        $copied++
    }

    if ($DryRun) {
        Write-Host "  ($copied betik kopyalanacak)" -ForegroundColor DarkGray
    } else {
        Write-Host "  $copied betik kopyalandı" -ForegroundColor Green
    }

    $fileCount += $copied
    $versionCount++
}

Write-Host ''

if ($Uninstall) {
    if ($fileCount -eq 0) {
        Write-Host 'Kaldırılacak betik bulunamadı (zaten kurulu değil).' -ForegroundColor Yellow
    } else {
        Write-Host "Kaldırma tamam: $versionCount sürüm, $fileCount dosya." -ForegroundColor Green
        Write-Host 'CorelDRAW''ı yeniden başlatın.'
    }
    Write-Host ''
    exit 0
}

Write-Host "Kurulum tamam: $versionCount sürüm, $fileCount dosya." -ForegroundColor Green
Write-Host ''
Write-Host 'Kullanım:' -ForegroundColor White
Write-Host '  1. CorelDRAW''da dosyanızı açın (önce kaydedin).'
Write-Host '  2. Tools > Scripts > Scripts   (kısayol: Alt+Shift+F11)'
Write-Host '     Türkçe arayüzde: Araçlar > Komut Dosyaları > Komut Dosyaları'
Write-Host '  3. Solda JavaScript > User Scripts seçin.'
Write-Host '  4. Summa-OPOS-X / Summa-OPOS-XY / Summa-OPOS-XY2 betiğini çift tıklayın.'
Write-Host ''
Write-Host 'Betikler listede yoksa: CorelDRAW''ı kapatıp açın. Yine yoksa Scripts'
Write-Host 'panelindeki Load düğmesiyle şu klasörü bir kez gösterin:'
Write-Host "  $lastScriptsDir" -ForegroundColor DarkGray
Write-Host ''
$guide = Join-Path $RepoRoot 'docs\WINDOWS-KURULUM.md'
if (Test-Path -LiteralPath $guide) {
    Write-Host "Ayrıntılı kılavuz: $guide" -ForegroundColor DarkGray
} else {
    Write-Host 'Ayrıntılı kılavuz: WINDOWS-KURULUM.md (bu klasörde) veya GitHub deposunda docs/WINDOWS-KURULUM.md' -ForegroundColor DarkGray
}
Write-Host ''

exit 0
