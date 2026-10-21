#!/bin/zsh
# Summa OPOS regmark betiklerini CorelDRAW'in Scripts klasörlerine kurar.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/scripts"
BASE="$HOME/Library/Application Support/Corel"

clear
echo "=============================================="
echo "  Summa OPOS Regmark · CorelDRAW macOS"
echo "=============================================="
echo

if [ ! -d "$SRC" ]; then
  echo "HATA: scripts klasörü bulunamadı."
  echo "Bu dosyayı indirdiğiniz klasörün içinden çalıştırın."
  [[ -t 0 ]] && read -k 1 "?Kapatmak için bir tuşa basın..."
  exit 1
fi

COUNT=0
for dir in "$BASE"/CorelDRAW\ Graphics\ Suite\ 20*(N); do
  [ -d "$dir" ] || continue
  TARGET="$dir/Draw/Scripts"
  mkdir -p "$TARGET"
  cp "$SRC"/*.js "$TARGET"/
  echo "✓ $(basename "$dir")"
  echo "  $TARGET"
  COUNT=$((COUNT+1))
done

echo
if [ "$COUNT" -eq 0 ]; then
  echo "CorelDRAW klasörü bulunamadı:"
  echo "  $BASE"
  echo
  echo "CorelDRAW'ı bir kez açıp kapatın, sonra bu dosyayı tekrar çalıştırın."
else
  echo "Kurulum tamam: $COUNT CorelDRAW sürümü."
  echo
  echo "Kullanım:"
  echo "  1. CorelDRAW'da dosyanızı açın."
  echo "  2. Window > Inspectors > Scripts"
  echo "     (Türkçe: Pencere > Denetçiler > Komut Dosyaları)"
  echo "  3. JavaScript > User Scripts altında:"
  echo "     Summa-OPOS-X / Summa-OPOS-XY / Summa-OPOS-XY2"
  echo "  4. Çift tıklayın."
  echo
  echo "Ayrıntılar: README.md"
fi

echo
if [[ -t 0 ]]; then
  [[ -t 0 ]] && read -k 1 "?Kapatmak için bir tuşa basın..."
fi
