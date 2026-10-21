# Technical details

[Türkçe](TEKNIK-DETAYLAR.md) | **English**

This document explains how the scripts are generated, how they use the CorelDRAW
API and how the geometry is calculated. For the user guide see `README.md`; for
the OPOS rules see `docs/opos-mark-layout.en.md`.

## 1. File structure

```
src/regmark.template.js   Main template (single source)
src/cleanup.js            Script that deletes the "Regmark" layer
src/test.js               API/selection diagnostic script
tools/build.py            Generates scripts/*.js from the template
scripts/                  Generated scripts installed into CorelDRAW
tests/mock_coreldraw.js   Test harness that mocks the CorelDRAW API
docs/                     OPOS layout and this technical document
ornek/                    Example layout images
Kur.command               Copies the scripts into CorelDRAW Scripts folders
Kaldir.command            Removes the scripts
```

Do not edit the generated scripts by hand; edit `src/regmark.template.js` and
regenerate:

```bash
python3 tools/build.py
node tests/mock_coreldraw.js
```

`tools/build.py` replaces the `__OPOS__` placeholder with `X`, `XY` and `XY2` to
produce three scripts, so the geometry code lives in one place.

## 2. CorelDRAW JavaScript environment

CorelDRAW's macOS JavaScript engine is not a browser:

- The API is accessed through the global `host` object: `host.ActiveDocument`,
  `host.ActivePage`, `host.ActiveSelection`.
- There is no UI other than `alert()`, so settings live in the `AYAR` object at
  the top of the file.
- Enum values must be passed as **numbers**. For example, millimetres are
  `cdrMillimeter = 3`.
- ECMAScript 6 is supported, but the scripts use `var` and classic functions for
  compatibility.
- The object model is the same as VBA; `undefined` skips an optional parameter.

## 3. Selection detection

The selection is read **before** any geometry is calculated and before the unit
is changed. Because different versions expose the selection through different
objects, the script tries them in order:

1. `host.ActiveSelectionRange`
2. `host.ActiveSelection`
3. `host.ActiveView.Selection`
4. `host.ActiveDocument.ActiveSelection`
5. `host.ActiveDocument.Selection`

For each candidate it tries, in order:

1. `BoundingBox` (called as a method if it is a function),
2. the `Shapes` collection (`Count` / `Item`),
3. direct `Count` / `Item`,
4. as a last resort, the shapes on the page with `Shape.Selected == true`.

If there is no selection or the bounding box cannot be read, it falls back to
the page-based behaviour and shows a short diagnostic text in the alert.

### Unit conversion

Because the selection is read before the unit change, it may be in the old unit.
`unitToMm()` converts `cdrUnit` values to mm (inch, cm, point, pica, cicero,
etc.). If the document is already in mm, the factor is 1.

## 4. Geometry

### Basic values

```
size  = markaBoyutu          (default 3 mm)
gap   = tasarimBosluk        (default 5 mm)
edge  = sayfaKenari          (default 10 mm)
frame = size + gap + edge    (default 18 mm)
```

### Target area

- With a selection: `target` = the selection's bounding box.
- Without a selection: `target` = the page (0,0)–(W,H).

### Growing the page

The page is **never shrunk**. It only grows when the marks do not fit:

```
shiftX = target.x0 < frame ? frame - target.x0 : 0
shiftY = target.y0 < frame ? frame - target.y0 : 0
newW   = max(W, target.x1 + shiftX + frame)
newH   = max(H, target.y1 + shiftY + frame)
```

If `SetSize` moves the content by itself, the difference is compensated by
comparing the first shape's `PositionX/Y`. This makes both behaviours ("content
stays" and "content shifts") correct.

Without a selection and with `sayfaBuyut: true`, the page grows by `frame` on
each side (classic page-based behaviour). If a `Regmark` layer already exists,
the page is not grown a second time (idempotent).

### Mark rows

Corner marks and, if needed, intermediate rows on the left/right columns:

```
bottomCenter = cutY0 - gap - size/2
topCenter    = cutY1 + gap + size/2
span         = topCenter - bottomCenter
intervals    = max(1, ceil(span / markaAraligi))
rowStep      = span / intervals
```

`intervals + 1` rows, two squares per row (left/right). With
`markaAraligi: 0`, `intervals = 1` and only the corner squares are drawn.

### Lines

- OPOS XY: bottom line, `y = cutY0 - gap - size … cutY0 - gap`
- OPOS XY2: additionally a top line, `y = cutY1 + gap … cutY1 + gap + size`
- Line thickness = mark size (Summa/GoSign rule).
- The line spans the cut area width (`cutX0 … cutX1`).

### Colour and layer

- Fill: `CMYKAssign(0, 0, 0, 100)` → 100% K.
- Outline: `Outline.Type = 0` (`cdrNoOutline`).
- All marks are drawn on the `Regmark` layer, which is then locked
  (`Editable = false`).
- On a re-run the old layer is deleted; if it is locked, it is unlocked first.

## 5. CorelDRAW APIs used

| Purpose | API |
|---|---|
| Document/page | `host.ActiveDocument`, `ActivePage` |
| Unit | `Document.Unit` (`cdrMillimeter = 3`) |
| Page size | `Page.SizeWidth`, `SizeHeight`, `Page.SetSize(w, h)` |
| Layers | `Page.CreateLayer(name)`, `Page.Layers`, `Layer.Delete()` |
| Drawing | `Layer.CreateRectangle(x0, y0, x1, y1)` |
| Fill/outline | `Shape.Fill.UniformColor.CMYKAssign(...)`, `Shape.Outline.Type` |
| Moving | `Shape.Move(dx, dy)`, `Shape.PositionX/Y` |
| Locking | `Shape.Locked`, `Layer.Editable` |
| Selection | `host.ActiveSelection`, `ShapeRange.BoundingBox`, `Shape.Selected` |

## 6. Test harness

`tests/mock_coreldraw.js` mocks the CorelDRAW API with small classes:

- `Page`, `Layer`, `Shape`, `ShapeRange`, collections
- content shifting during `SetSize` (`shiftOnResize`)
- locked shape/layer behaviour
- `ActiveSelection` injection

Run it with:

```bash
node tests/mock_coreldraw.js
```

Covered scenarios:

- OPOS X / XY / XY2 object counts
- selection-based and page-based layout
- page growth, no shrinking, content shifting
- `sayfaBuyut: false` fitting/not fitting
- locked objects and layers
- repeated runs (idempotency)
- equally spaced rows for long jobs
- cleanup script
- magenta cut separation (selection/page, layer mode, group support, exact colour match)

## 7. Adding a new OPOS variant

1. Add the new value to the `AYAR.oposTipi` comparisons in
   `src/regmark.template.js` (e.g. `"XTRA"` with intermediate lines).
2. Add the file name to the `PRESETS` dictionary in `tools/build.py`.
3. Run `python3 tools/build.py` and `node tests/mock_coreldraw.js`.
4. Update the tables in `README.md` and `docs/OPOS-marka-yerlesimi.md`.

## 8. Magenta cut separation

`src/kesim-ayir.js` → `scripts/Summa-Kesim-Ayir.js`. It works in the CorelDRAW
object model and **adds OPOS XY regmarks first, then separates the cut lines**.

Target area:

- With a **selection**, the target is the selection's bounding box and only the
  selected objects are separated.
- Without a selection, the target is the page and the whole page is scanned.
- The selection is read before and after the unit change; `ActiveSelection`,
  `ActiveSelectionRange` and `Shape.Selected` are tried.

Colour matching:

- Fill: `Shape.Fill.Type === 1` (`cdrUniformFill`) and
  `Fill.UniformColor.CMYKCyan/CMYKMagenta/CMYKYellow/CMYKBlack` must match
  `kesimCmyk` **exactly**.
- Outline: `Shape.Outline.Type !== 0` and `Outline.Color` matched the same way.
- **No tolerance**: 99.9 or 90 magenta is not selected. A spot colour name alone
  is not treated as a cut colour either.
- A mixed object (design fill + magenta outline) is skipped.
- Groups:
  - A group is detected by `Shape.Type === cdrGroupShape (7)` or
    `Shape.Shapes.Count > 0`.
  - Invisible/helper leaves (no fill and no outline) are not counted.
  - If every visible leaf is a cut object, the group is moved **intact**.
  - A mixed group is ungrouped one level with `Shape.Ungroup()`; the children are
    processed individually and the cut ones are moved.
  - Groups containing a PowerClip are skipped for safety.

Flow:

1. Collect the cut objects before adding marks.
2. `addMarks(page, true)` adds regmarks to page 1; the page grows if needed and
   the content shifts by `frame`.
3. With `yeniSayfa: true`, `Document.AddPagesEx(1, W, H)` creates page 2 at the
   **new** size of page 1.
4. `addMarks(page2, false)` adds regmarks around the **same target** on page 2;
   the page is already expanded, so it is **not grown again**.
5. The cut objects are moved to the `Kesim` layer with `MoveToLayer`; any
   `PositionX/Y` difference is corrected with `Move`.

This order keeps both pages the same size and in the same coordinate system;
page 1 is the print file, page 2 the cut file. The regmarks are **OPOS XY**:
4 squares + bottom line (no top line).

## 9. Limitations

- Only the active page and active selection are processed.
- Content on the master page does not move when the page grows.
- The page is only grown; it is never shrunk to the selection.
- There is no UI other than `alert`.
- No barcode / job number / automatic cut-file generation.
- Magenta pixels inside bitmaps cannot be separated; only vector fill/outline
  colours are inspected.
- Mixed-colour objects inside groups are not separated automatically; ungroup
  first.
- It is not a byte-for-byte copy of the Windows plug-in; mark size and spacing
  are configurable.
