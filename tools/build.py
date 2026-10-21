#!/usr/bin/env python3
"""Generate the CorelDRAW scripts from the template.

    python3 tools/build.py

Outputs to scripts/:
    Summa-OPOS-X.js
    Summa-OPOS-XY.js
    Summa-OPOS-XY2.js
    Summa-Regmark-Kaldir.js
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "src" / "regmark.template.js"
SCRIPTS = ROOT / "scripts"

PRESETS = {
    "X": "Summa-OPOS-X.js",
    "XY": "Summa-OPOS-XY.js",
    "XY2": "Summa-OPOS-XY2.js",
}


def main() -> None:
    template = TEMPLATE.read_text(encoding="utf-8")
    SCRIPTS.mkdir(parents=True, exist_ok=True)

    for preset, filename in PRESETS.items():
        text = template.replace("__OPOS__", preset)
        if "__OPOS__" in text:
            raise SystemExit("Template placeholder bulunamadi.")
        (SCRIPTS / filename).write_text(text, encoding="utf-8")
        print(f"yazildi: {filename}")

    cleanup = (ROOT / "src" / "cleanup.js").read_text(encoding="utf-8")
    (SCRIPTS / "Summa-Regmark-Kaldir.js").write_text(cleanup, encoding="utf-8")
    print("yazildi: Summa-Regmark-Kaldir.js")

    test_script = (ROOT / "src" / "test.js").read_text(encoding="utf-8")
    (SCRIPTS / "Summa-Test.js").write_text(test_script, encoding="utf-8")
    print("yazildi: Summa-Test.js")

    cut_script = (ROOT / "src" / "kesim-ayir.js").read_text(encoding="utf-8")
    (SCRIPTS / "Summa-Kesim-Ayir.js").write_text(cut_script, encoding="utf-8")
    print("yazildi: Summa-Kesim-Ayir.js")


if __name__ == "__main__":
    main()
