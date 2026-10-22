# Summa OPOS Regmark · Windows installation

[Turkish](WINDOWS-KURULUM.md) | **English**

Install, use and remove the Summa OPOS regmark scripts for **CorelDRAW on
Windows**. The scripts are the same JavaScript files used on macOS and are
generated from one template.

> **Quick start:** download `Summa-OPOS-Regmark-Windows-*.zip` from
> [Releases](https://github.com/ewolution/coreldraw-summa-regmark/releases/latest),
> extract it, run `Kur.bat`, restart CorelDRAW, then open
> **Tools > Scripts > Scripts**.

## Requirements

| Requirement | Detail |
|---|---|
| OS | Windows 10 or 11 (64-bit) |
| CorelDRAW | CorelDRAW Graphics Suite **2019 or later** (Windows edition) |
| PowerShell | Windows PowerShell 5.1 (included with Windows) |
| Privileges | **No administrator rights**; installs into the user profile |
| Network | Only for the download; the install itself works offline |

The scripts use CorelDRAW's JavaScript API. CorelDRAW 2019+ on Windows supports
JavaScript user scripts, so no plug-in (COM/VBA) install is needed.

## Quick install (recommended)

1. Download `Summa-OPOS-Regmark-Windows-<version>.zip` from
   [Releases](https://github.com/ewolution/coreldraw-summa-regmark/releases/latest).
2. **Right-click → Extract All**. Do not run the files from inside the ZIP.
3. **Double-click `Kur.bat`** in the extracted folder.
4. If Windows SmartScreen appears, choose **More info → Run anyway**.
5. The window lists every CorelDRAW version it wrote to:

   ```
   Kurulum tamam: 3 sürüm, 18 dosya.
   ```
6. **Close and reopen CorelDRAW** (files are copied while it runs, but the
   Scripts list is only refreshed on startup).

Check the result in CorelDRAW: **Tools > Scripts > Scripts** (Alt+Shift+F11) →
**JavaScript > User Scripts** should list `Summa-OPOS-X`, `Summa-OPOS-XY` and
`Summa-OPOS-XY2`.

## Installation methods

### A. With Git

```bat
git clone https://github.com/ewolution/coreldraw-summa-regmark.git
cd coreldraw-summa-regmark
Kur.bat
```

From a command line (remote desktop, automation):

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1
```

### B. ZIP / folder

Download the repository with **Code → Download ZIP**, extract it and
double-click `Kur.bat`. `Kur.bat`, `Kaldir.bat`, `tools\` and `scripts\` must
stay in the same folder.

### C. Manual copy (no script)

1. Open `%APPDATA%\Corel` (paste it into the Explorer address bar).
2. Find your CorelDRAW version folder, e.g.
   `CorelDRAW Graphics Suite 2026\Draw`.
3. Create the `Scripts` folder if it does not exist.
4. Copy **all six** `.js` files from `scripts\` into it.
5. Restart CorelDRAW.

### D. PowerShell options

| Parameter | Effect |
|---|---|
| `-DryRun` | Shows what would happen without writing anything |
| `-Uninstall` | Removes the scripts (`Kaldir.bat` uses this) |
| `-NoBackup` | Does not back up files being overwritten |
| `-AppDataRoot <path>` | Overrides the Corel folder (testing/custom setups) |

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1 -DryRun
```

## Where does it install?

The installer writes to the per-user script folder of every CorelDRAW version:

| CorelDRAW | Folder |
|---|---|
| 2024 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2024\Draw\Scripts` |
| 2025 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2025\Draw\Scripts` |
| 2026 | `%APPDATA%\Corel\CorelDRAW Graphics Suite 2026\Draw\Scripts` |
| Technical Suite | `%APPDATA%\Corel\CorelDRAW Technical Suite <year>\Draw\Scripts` |

The installer scans `%APPDATA%\Corel` for `CorelDRAW ... Suite 20xx` folders and
only uses those that contain a `Draw` folder. If none is found it asks you to
open CorelDRAW once and run the installer again.

Installed files:

| File | Purpose |
|---|---|
| `Summa-OPOS-X.js` | Regmarks for OPOS **X** mode |
| `Summa-OPOS-XY.js` | Regmarks for OPOS **XY** mode |
| `Summa-OPOS-XY2.js` | Regmarks for OPOS **XY2** mode |
| `Summa-Kesim-Ayir.js` | Regmarks + magenta cut-line separation |
| `Summa-Regmark-Kaldir.js` | Remove marks/layer |
| `Summa-Test.js` | API and selection diagnostics |

The installer also:

- **Backs up** previously installed scripts with the same names to
  `%LOCALAPPDATA%\SummaRegmark\backup\<timestamp>\<version>\`
- Does **not** touch the registry, Program Files or system settings.
- Needs no administrator rights; uninstalling just deletes user files.

## Usage

1. Open your document in CorelDRAW (save it first).
2. **Tools > Scripts > Scripts** (shortcut **Alt+Shift+F11**).
   Some builds expose it as **Window > Dockers > Scripts**.
3. Select **JavaScript > User Scripts** on the left.
4. **Double-click** the script that matches your cutter (or select it and
   click **Run**).

| Script | When? |
|---|---|
| `Summa-OPOS-X.js` | Cutter in OPOS **X** mode |
| `Summa-OPOS-XY.js` | Cutter in OPOS **XY** mode |
| `Summa-OPOS-XY2.js` | Cutter in OPOS **XY2** mode |
| `Summa-Kesim-Ayir.js` | Add regmarks and separate magenta cut lines |
| `Summa-Regmark-Kaldir.js` | Remove the marks/layer |
| `Summa-Test.js` | API/selection diagnostic |

A summary dialog appears after the script runs (mode, page size, cut area, mark
row count). If you do not see it, press **Alt+Tab** — it can open behind the
CorelDRAW window.

> **Selection lost?** Running a script from the Scripts docker can clear the
> selection. Assign a shortcut under **Tools > Customization > Commands >
> Scripts**, then select the object and press the shortcut.

## Changing the settings

CorelDRAW's JavaScript host has no settings dialog. Edit the `AYAR` block at the
top of the installed file with **Notepad**:

```
%APPDATA%\Corel\CorelDRAW Graphics Suite 2026\Draw\Scripts\Summa-OPOS-XY.js
```

```js
var AYAR = {
  markaBoyutu: 3.0,      // mark size; must match the cutter's "mark size"
  tasarimBosluk: 5.0,    // gap between design edge and mark
  sayfaKenari: 10.0,     // margin between mark and page edge (white space)
  markaAraligi: 300.0,   // max distance between mark rows on long jobs (mm)
                         // 0 = corner marks only
  oposTipi: "XY2",       // "X" | "XY" | "XY2"
  secimeGore: true,      // true: base marks on the selection
  sayfaBuyut: true,      // true: grow the page if the marks do not fit
                         // false: never change the page size
  katmanAdi: "Regmark"
};
```

Save as **UTF-8** (Notepad: *Save as → Encoding: UTF-8*). Re-running the
installer is not required; the file is used directly from the Scripts folder.

**Important:** `markaBoyutu` and `oposTipi` must match the cutter's OPOS
settings exactly. A wrong size/mode makes the marks unreadable for the cutter.

## Uninstall

1. **Double-click `Kaldir.bat`** (or run
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-windows.ps1 -Uninstall`).
2. Restart CorelDRAW.

To remove manually, delete these six files from every `Draw\Scripts` folder:

```
Summa-OPOS-X.js
Summa-OPOS-XY.js
Summa-OPOS-XY2.js
Summa-Kesim-Ayir.js
Summa-Regmark-Kaldir.js
Summa-Test.js
```

Backups stay in `%LOCALAPPDATA%\SummaRegmark\backup\`; delete that folder too if
you no longer need them.

## Windows vs. macOS

| Topic | Windows | macOS |
|---|---|---|
| Installer | `Kur.bat` / `Kaldir.bat` | `Kur.command` / `Kaldir.command` |
| Script folder | `%APPDATA%\Corel\...\Draw\Scripts` | `~/Library/Application Support/Corel/.../Draw/Scripts` |
| Menu | **Tools > Scripts > Scripts** | **Window > Inspectors > Scripts** |
| Admin rights | Not required | Not required |
| Plug-in | Summa/GoSign plug-in can also be used | Not loadable |

- Summa's own CorelDRAW plug-in (GoSign/WinPlot) may be installed on Windows.
  These scripts do not depend on it; they only draw vector marks into the
  document, so both can coexist.
- Print at **100% / Actual size**; keep “fit to page” off.
- Redirected `%APPDATA%` (roaming profiles, OneDrive) works; just verify the
  path.

## Enterprise / silent install

The install is per-user and needs no elevation. When deploying with Intune,
Configuration Manager or a logon script, run it **in user context**:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File "\\server\share\coreldraw-summa-regmark\tools\install-windows.ps1" -NoBackup
```

Exit codes: `0` success, `1` failure (CorelDRAW folder missing, incomplete
source, etc.).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Kur.bat` opens and closes instantly | Run `Kur.bat` from a Command Prompt so errors stay visible |
| “Windows protected your PC” | **More info → Run anyway** |
| Scripts not listed | Restart CorelDRAW; use **Load** in the Scripts docker and point it to `...\Draw\Scripts` once |
| “CorelDRAW version folder not found” | Open and close CorelDRAW once, then run `Kur.bat` again |
| “Running scripts is disabled” (ExecutionPolicy) | `Kur.bat` already bypasses it; add `-ExecutionPolicy Bypass` when running PowerShell manually |
| “No document open” | Open a `.cdr` file first |
| “Selection could not be read” | Run `Summa-Test`; assign a keyboard shortcut if the selection is cleared |
| “Locked object/layer” | Unlock layers/objects or set `sayfaBuyut: false` |
| Summary dialog not visible | Press **Alt+Tab**; it may be behind CorelDRAW |
| Turkish characters garbled | Re-save the `.js` file as UTF-8 |
| Antivirus blocks `Kur.bat` | It only copies files; allow-list it or copy the scripts manually |
| Installed twice | Harmless; it overwrites and backs up the previous copy |
| Installed into the wrong version | Check the list with `-DryRun`, use `-AppDataRoot` or copy manually |

## Development

```bash
python tools/build.py                      # regenerate scripts/*.js from the template
node tests/mock_coreldraw.js               # 25/25 tests
powershell -File tools/package-windows.ps1 -Version 1.1.0   # dist/*.zip
```

The Windows package is produced as
`dist\Summa-OPOS-Regmark-Windows-<version>.zip` and attached to the GitHub
release.

## License

MIT © 2026 ewolution. See [LICENSE](../LICENSE).
