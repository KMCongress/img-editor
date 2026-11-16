#!/usr/bin/env bash
# Ellenőrzi, hogy a zip feltölthető WP-bővítmény-e.  Használat: bin/check-zip.sh <zip> <verzió>
set -euo pipefail
zip="$1"; version="$2"; slug=kmc-featured-image-fit
fail() { echo "check-zip: $*" >&2; exit 1; }

[ -f "$zip" ] || fail "nincs ilyen fájl: $zip"
list=$(unzip -Z1 "$zip")

bad_root=$(printf '%s\n' "$list" | grep -v "^$slug/" || true)
[ -z "$bad_root" ] || fail "a gyökérkönyvtáron ($slug/) kívüli bejegyzés: $(echo "$bad_root" | head -3 | tr '\n' ' ')"

for need in "$slug/$slug.php" "$slug/readme.txt" "$slug/build/index.js" "$slug/build/index.asset.php" "$slug/includes/class-plugin.php" "$slug/includes/class-settings.php"; do
  printf '%s\n' "$list" | grep -qx "$need" || fail "hiányzik: $need"
done

forbidden=$(printf '%s\n' "$list" | grep -E "^$slug/(src|node_modules|tests|docs|vendor|bin|\.wp|\.github)/|/\.[^/]+$" || true)
[ -z "$forbidden" ] || fail "nem kerülhet a zipbe: $(echo "$forbidden" | head -3 | tr '\n' ' ')"

unzip -p "$zip" "$slug/$slug.php" | grep -qE "^ \* Version: +$version$" || fail "a plugin header Version nem $version"
unzip -p "$zip" "$slug/readme.txt" | grep -qE "^Stable tag: $version$" || fail "a readme.txt Stable tag nem $version"

echo "check-zip: OK ($zip, $version, $(printf '%s\n' "$list" | wc -l) bejegyzés)"
