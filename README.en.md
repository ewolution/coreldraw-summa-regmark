# Summa OPOS Regmark · CorelDRAW macOS

[Türkçe](README.md) | **English**

A JavaScript script that runs **inside** CorelDRAW and places Summa OPOS
registration marks around the **selected object** (or the page if nothing is
selected). It is the macOS equivalent of the Windows Summa/GoSign plug-in,
without installing a plug-in.

![Example layout](ornek/regmark-ornek.png)

## Why not a plug-in?

Summa's CorelDRAW plug-in is Windows-only (COM/VBA components). CorelDRAW for
macOS cannot load these plug-ins. However, CorelDRAW macOS supports automation
through **JavaScript** (`Window > Inspectors > Scripts`). These scripts target
that environment and draw the marks directly into the document as vectors.

## What it does

- If an **object is selected**, it places the marks around that object's
  bounding box and sizes the page to **selection + marks**.
- If **nothing is selected**, it uses the active page (legacy behaviour).
- Draws **4 black squares** (OPOS X); for **OPOS XY** it adds a bottom line,
  for **OPOS XY2** a bottom and a top line.
- For long jobs it adds **equally spaced extra mark rows** along the left and
  right edges.
- Squares are **100% K (CMYK 0/0/0/100)** with no outline.
- Puts the marks on a separate **`Regmark`** layer and locks the layer.
- Can be run repeatedly: it removes the old `Regmark` layer and does not grow
  the page again if the selection is unchanged.

Defaults:

| Setting | Value |
|---|---|
| Mark size | 3 mm |
| Design-to-mark gap | 5 mm |
| Page edge margin | 10 mm |
| Mark spacing (long jobs) | at most 300 mm |
| Mark frame | 18 mm per side (3 + 5 + 10) |
| Page size | preserved; grows only if the marks do not fit |

## Installation

### Clone

```bash
git clone https://github.com/ewolution/coreldraw-summa-regmark.git
cd coreldraw-summa-regmark
./Kur.command
```

### ZIP / folder

1. **Double-click** `Kur.command`.
2. If macOS says the developer cannot be verified: **right-click → Open**.
3. The scripts are copied to (whichever versions exist: 2024/2025/2026):

```
~/Library/Application Support/Corel/CorelDRAW Graphics Suite 2026/Draw/Scripts/
```

For a manual install, copy the `.js` files from `scripts/` into that folder.

## Usage

1. Open your document in CorelDRAW (save it first).
2. **Window > Inspectors > Scripts**
   (Turkish UI: **Pencere > Denetçiler > Komut Dosyaları**).
3. Select **JavaScript > User Scripts** on the left.
4. Double-click the script that matches your cutter:

| Script | When? |
|---|---|
| `Summa-OPOS-X.js` | Cutter in OPOS **X** mode |
| `Summa-OPOS-XY.js` | Cutter in OPOS **XY** mode |
| `Summa-OPOS-XY2.js` | Cutter in OPOS **XY2** mode |
| `Summa-Kesim-Ayir.js` | Separate magenta cut lines |
| `Summa-Regmark-Kaldir.js` | Remove the marks/layer |
| `Summa-Test.js` | API/selection diagnostic |

A summary dialog appears after the script runs (page size, cut area, mark
count, row count and spacing). The script's dialog texts are in Turkish.

> If the scripts are not listed, restart CorelDRAW. If they are still missing,
> use **Load** in the Scripts panel and point it to `.../Draw/Scripts` once.

## Changing the settings

CorelDRAW's JavaScript environment has no dialog UI, so settings live in the
`AYAR` block at the top of each script:

```js
var AYAR = {
  markaBoyutu: 3.0,      // mark size; must match the cutter's "mark size"
  tasarimBosluk: 5.0,    // gap between the design edge and the mark
  sayfaKenari: 10.0,     // margin between the mark and the page edge
  markaAraligi: 300.0,   // max distance between mark rows on long jobs (mm)
                         // 0 = corner marks only
  oposTipi: "XY2",       // "X" | "XY" | "XY2"
  secimeGore: true,      // true: use the selected object
  sayfaBuyut: true,      // true: grow the page if the marks do not fit
                         // false: never change the page (warn if they do not fit)
  katmanAdi: "Regmark"
};
```

Edit the file in TextEdit, save it and run the script again. You do not need to
run `Kur.command` again; the file in the Scripts folder is used directly.

**Important:** `markaBoyutu` and `oposTipi` must match the cutter's OPOS
settings exactly. A wrong size or mode means the cutter will not find the marks.

## Selection / page size

1. **Select** the object (or group) you want to mark in CorelDRAW.
2. Run the script.
3. The script measures the selection's bounding box and places the **4 squares
   exactly at the object's edges**. The page is **never shrunk**; it grows only
   as much as needed for the marks to fit, and the content is shifted
   accordingly.

- With **no selection**, the page is used and grown by 18 mm on each side.
- `sayfaBuyut: false`: the page never changes. If the selection is too close to
  the edge and the marks would fall outside, the script warns and does nothing.
- `secimeGore: false` ignores the selection and uses the page.
- Objects outside the selection stay on the page as they are (the page is not
  shrunk, so they are not cropped).

If there are locked objects or locked layers, the script does not change the
page and shows a warning. Unlock them and run it again.

## Extra mark rows for long jobs

For large/long jobs a single row of corner marks is not enough: the OPOS sensor
feeds the media back and forth too much, which reduces accuracy. The script adds
**equally spaced** extra mark rows along the left and right edges, based on the
cut height.

- `markaAraligi` (default **300 mm**): maximum distance between two rows.
- The first row is the bottom corner, the last row is the top corner; the rows
  in between are distributed evenly.
- Set it to `0` to draw only the 4 corner squares.

Example:

| Cut height | Rows | Spacing |
|---|---|---|
| 100 mm | 2 | 113 mm |
| 405 mm | 3 | 209 mm |
| 600 mm | 4 | 204 mm |
| 900 mm | 5 | 228 mm |

![Long job example](ornek/uzun-is-ornek.png)

Detailed layout, cutter settings and references:
**[docs/opos-mark-layout.en.md](docs/opos-mark-layout.en.md)**

Code and API details:
**[docs/technical-details.en.md](docs/technical-details.en.md)**

## Separating magenta cut lines

`Summa-Kesim-Ayir.js` finds objects painted with exact **CMYK 0/100/0/0** (or a
spot colour named `Cut`, `Kesim`, `Magenta`, `Kiss-cut`, `Thru-cut`) and
separates them.

```js
var AYAR = {
  kesimCmyk: [0, 100, 0, 0], // C, M, Y, K (0-100)
  tolerans: 0.5,             // colour tolerance
  spotAdlari: ["cut", "kesim", "magenta", "kiss-cut", "thru-cut"],
  yeniSayfa: true,           // true: new page, false: "Kesim" layer on the same page
  kesimKatmani: "Kesim"
};
```

- `yeniSayfa: true` (default): creates a **new page** of the same size and moves
  the cut lines there. Page 1 = print, page 2 = cut.
- `yeniSayfa: false`: moves them to a **`Kesim` layer** on the same page. Hide
  that layer for the print PDF and hide the design layers for the cut PDF.

### Workflow (new-page mode)

1. Run `Summa-Kesim-Ayir`.
2. Go to page 1 and run `Summa-OPOS-*` **without a selection**.
3. Go to page 2 and run the same `Summa-OPOS-*` **without a selection**.
   Both pages grow by the same amount, so the coordinates stay aligned.
4. Export page 1 as the print PDF and page 2 as the cut PDF.

### Limitations

- **Ungroup first.** If a group contains a mix of colours, the script skips it.
- Magenta pixels inside **bitmaps** cannot be separated (only vector colours are
  inspected).
- Objects with a **design fill + magenta outline** are skipped as mixed.
- `pdf-bicak` works at the PDF content-stream level; this script works at the
  CorelDRAW **object** level. They complement each other for complex files.

## Workflow notes

- **Print:** publish to PDF from CorelDRAW as usual; the marks are on the
  `Regmark` layer and are included in the output.
- **Cut:** keep your cut lines on a separate layer. Summa software (GoSign /
  WinPlot) recognises the `Regmark` layer as registration marks; do not put the
  marks on the cut layer or they may be cut.
- **Scale:** print at **100% / Actual size**; disable “fit to page”.
- **Cutter:** the OPOS mode (X / XY / XY2), mark size and design-to-mark
  distance must match the cutter's OPOS parameters.
- **Test:** make a small test print and a test cut first. On glossy vinyl or
  lamination the OPOS sensor may need a media calibration.
- **Undo:** the script modifies the document. Save the file first; use `Cmd+Z`
  or `Summa-Regmark-Kaldir.js` to remove the marks. The page size is not shrunk
  automatically.

## Limitations

- Only the **selection on the active page** is processed (run it per page in a
  multi-page document).
- The page is never shrunk to the selection; it only grows if the marks do not
  fit.
- Content on the master page does not move when the page grows; keep the design
  on a normal layer.
- There is no UI other than `alert`, so settings are edited in the file.
- The Windows plug-in's barcode / job-number features are not included.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Scripts are not listed | Restart CorelDRAW; use **Load** to point at the Scripts folder |
| “No open document” | Open a `.cdr` file first |
| “Page too small” | Reduce the measurements or use a larger page |
| “Locked object/layer” | Unlock the layers/objects or set `sayfaBuyut: false` |
| Extra marks cause misalignment | Match `markaAraligi` to the cutter's OPOS panelling/panel size; make sure the cut file has the same page geometry as the print |
| “Selection could not be read” | Run `Summa-Test` and check the reported API state. If running from the Scripts panel clears the selection, assign a shortcut under `Tools > Customization > Commands > Scripts` and run it with the object selected. |
| Page did not grow | Is `sayfaBuyut` `true`? If a `Regmark` layer already exists, the page is not grown again |
| Cutter cannot find the marks | Same mark size/mode as the cutter? Enough white space? Is the print at 100%? |
| Marks in the wrong place | Check `tasarimBosluk` and `sayfaKenari` |

## Development / tests

The scripts are generated from a single template:

```
src/regmark.template.js   →  tools/build.py  →  scripts/*.js
```

```bash
python3 tools/build.py
node tests/mock_coreldraw.js
```

`tests/mock_coreldraw.js` mocks the CorelDRAW API and tests geometry, layer
behaviour, selection geometry, long-job mark rows, lock handling, repeated
runs and magenta cut separation (19/19 passing).

## License

MIT © 2026 ewolution. See [LICENSE](LICENSE).
