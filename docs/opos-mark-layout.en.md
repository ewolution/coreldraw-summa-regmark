# Summa OPOS mark layout (long jobs)

[Türkçe](OPOS-marka-yerlesimi.md) | **English**

This document explains how the `coreldraw-regmark` scripts place the marks and
why extra mark rows are added for large/long jobs.

## 1. Basic layout

```
            top line (XY2)
   ┌──────────────────────────────────┐
 ■ │                                  │ ■     ← left/right top corner squares
   │                                  │
 ■ │            CUT AREA              │ ■     ← extra row (long jobs)
   │         (selected object)        │
 ■ │                                  │ ■     ← extra row
   │                                  │
 ■ │                                  │ ■     ← left/right bottom corner squares
   └──────────────────────────────────┘
            bottom line (XY / XY2)
```

- **OPOS X:** squares only.
- **OPOS XY:** squares + bottom line.
- **OPOS XY2:** squares + bottom and top lines.
- Squares are **3 mm**, **100% K** (CMYK 0/0/0/100), no outline.
- Design-to-square gap **5 mm**; square-to-page-edge margin **10 mm**.
- Leave at least **3–4 × the mark size** of white space around each square
  (~9–12 mm for a 3 mm mark). The defaults provide this.

## 2. Why extra mark rows?

On long jobs the OPOS sensor feeds the media back and forth too much to read all
marks, which causes tracking errors and cutting misalignment.

Summa uses **OPOS panelling** for this: the job is split into panels and the
sensor reads the marks at the start/end of each panel. For this to work, the
marks must repeat at **regular intervals** along the left and right edges.

The Summa DC3 manual (section 6.2) says:

- The mark size should be **3 mm**; the line width must not enlarge the mark.
- Place the marks at **regular distances**.
- Normally **30–40 cm** is a suitable distance.
- If the mark size is smaller than 3 mm, reduce the distance.
- A smaller distance makes OPOS more accurate but slower.

The EFI Digital Factory note also says that jobs **longer than 600 mm** may need
additional "segmented marks".

## 3. The script's rule

`markaAraligi` in the `AYAR` block (default **300 mm**) is the **maximum**
distance between two mark rows.

Calculation:

```
span      = cut height + 2 × (design gap) + mark size
intervals = ceil(span / markaAraligi)
rows      = intervals + 1
spacing   = span / intervals
```

The first row is the bottom corner, the last row is the top corner. The rows in
between are distributed **evenly**, so all rows — including the corner squares —
are equally spaced.

![Long job example](../ornek/uzun-is-ornek.png)

*At a cut height of 405 mm: 3 rows (1 extra row), 209 mm spacing. The example in
the image has a 664 mm cut height, 4 rows and 225.7 mm spacing.*

`markaAraligi: 0` draws only the 4 corner squares (legacy behaviour).

### Examples

| Cut height | span | Rows | Spacing |
|---|---|---|---|
| 100 mm | 113 mm | 2 | 113 mm |
| 300 mm | 313 mm | 3 | 156.5 mm |
| 405 mm | 418 mm | 3 | 209 mm |
| 600 mm | 613 mm | 4 | 204.3 mm |
| 900 mm | 913 mm | 5 | 228.3 mm |
| 1200 mm | 1213 mm | 6 | 242.6 mm |

Note: a 405 mm job gets 1 extra row (3 rows total); 600 mm gets 2 extra rows
(4 rows total).

## 4. Cutter settings

- The cutter's **OPOS mode** (X / XY / XY2) must match `oposTipi`.
- The cutter's **mark size** must match (3 mm by default).
- **OPOS panelling**:
  - `Off`: the cutter reads the marks one by one; for short jobs.
  - `On (2 marks)`: 2 marks are read per panel.
  - `On (4 marks)`: the last marks of the previous panel are read again (better
    connection between panels).
  - If panelling is on, the mark rows must line up with the panel boundaries.
    The script uses equal spacing, so choose the panel size to match
    `markaAraligi`.
- With GoSign / WinPlot the marks must be on the **`Regmark` layer**; keep the
  cut lines on a separate layer.
- Older machines such as the DC3 have a **marker count** parameter; enter the
  number of rows you printed (e.g. 3 rows × 2 edges = 6 squares).

## 5. Printing and testing

- Print at **100% / Actual size**; disable “fit to page”.
- Make a small test print and a test cut first.
- On glossy vinyl/lamination the OPOS sensor may struggle; a media calibration
  may be needed.
- The marks must be black (K); RGB black or very light grey may not be read
  reliably.

## 6. Checklist

- [ ] Is the correct object selected?
- [ ] Does `oposTipi` match the cutter?
- [ ] Does `markaBoyutu` match the cutter value?
- [ ] Is `markaAraligi` compatible with the panel size?
- [ ] Is there enough white space around the marks?
- [ ] Is the print at 100% scale?
- [ ] Does the cut file use the same page geometry as the print file?

## 7. References

- Summa S One User's Manual — 3.2.2 "Different OPOS alignment methods",
  3.2.3 "Processing long jobs" (OPOS panelling).
- Summa S Class 2 User's Manual — 3.2.3 "Processing long jobs".
- Summa DC3 User's Manual — 6.2 "Making and printing the design"
  (3 mm mark, 30–40 cm spacing, equal distance).
- EFI Digital Factory — "Setting up Summa OPOS marks": jobs longer than 600 mm
  may need extra segmented marks.

## 8. Comparison with the Summa documentation

The table compares the script defaults with the Summa recommendations. "Matches"
means the value comes directly from the documentation; "choice" means an
engineering assumption that should be adjusted to the machine/media.

| Topic | Summa documentation | Script default | Status |
|---|---|---|---|
| Mark size | 3 mm (DC3 6.2) | 3 mm | Matches |
| Mark shape | Square | Square | Matches |
| Left/right mark columns | Yes (S One 3.2.2) | Yes | Matches |
| OPOS XY line | Bottom line | Bottom line | Matches |
| OPOS XY2 line | Bottom + top line | Bottom + top line | Matches |
| Line thickness | Equal to mark size (GoSign) | Mark size | Matches |
| Mark spacing | Normally 30–40 cm (DC3 6.2) | At most 300 mm | Matches (conservative) |
| White space around marks | 3–4 × mark size (DC3) | 5 mm inside, 10 mm outside | Partial; increase for DC3 |
| Roll side/front margin | 20 mm (min. 10 mm for short jobs) | 10 mm | Minimum; use 20 mm in production |
| Sheet last mark–edge | At least 40 mm (S One 3.2.1) | 10 mm | **May not match**; increase `sayfaKenari` |
| OPOS panelling | Off / On (2) / On (4) | Equal rows | Depends on the cutter |
| Marker count | Parameter on older machines | Calculated automatically | Enter on the cutter |

### Practical conclusions

- For **roll jobs**, set `sayfaKenari` to at least **20 mm**.
- When printing on **sheets**, leave **40 mm** between the last mark and the
  sheet edge; use `sayfaKenari: 40` or enlarge the page in CorelDRAW.
- On older machines such as the DC3, make the white space around the marks
  3–4 × 3 mm = **9–12 mm**; `tasarimBosluk` + `sayfaKenari` should cover it.
- 300 mm is a safe starting point for `markaAraligi`; if panelling is enabled on
  the cutter, match the panel size.

> Note: Summa's own GoSign/WinPlot plug-in uses its own algorithm. For an exact
> match, measure a sample PDF produced by the plug-in on Windows and use the same
> values in this script.
