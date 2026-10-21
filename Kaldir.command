#!/bin/zsh
# Summa OPOS regmark betiklerini CorelDRAW'in Scripts klasörlerinden siler.

set -u

BASE="$HOME/Library/Application Support/Corel"

clear
echo "=============================================="
echo "  Summa OPOS Regmark · Kaldırma"
echo "=============================================="
echo

COUNT=0
for dir in "$BASE"/CorelDRAW\ Graphics\ Suite\ 20*(N); do
  [ -d "$dir" ] || continue
  TARGET="$dir/Draw/Scripts"
  if [ -d "$TARGET" ]; then
    rm -f "$TARGET"/Summa-OPOS-X.js \
          "$TARGET"/Summa-OPOS-XY.js \
          "$TARGET"/Summa-OPOS-XY2.js \
          "$TARGET"/Summa-Regmark-Kaldir.js \
          "$TARGET"/Summa-Test.js
    echo "✓ $(basename "$dir")"
    COUNT=$((COUNT+1))
  fi
done

echo
echo "Kaldırma tamam: $COUNT sürüm."
echo "CorelDRAW'ı yeniden başlatın."
echo
[[ -t 0 ]] && read -k 1 "?Kapatmak için bir tuşa basın..."
