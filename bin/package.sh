#!/usr/bin/env bash
# Feltölthető WP-bővítmény zip a már buildelt fából.  Használat: bin/package.sh <verzió> [kimenet.zip]
set -euo pipefail
version="${1:?verzió kell, pl. 0.1.0}"
slug=kmc-featured-image-fit
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$(realpath -m "${2:-$root/$slug.zip}")"

[ -f "$root/build/index.asset.php" ] || { echo "package: előbb npm run build" >&2; exit 1; }

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
dest="$stage/$slug"
mkdir -p "$dest"
cp "$root/$slug.php" "$root/readme.txt" "$dest/"
cp -r "$root/includes" "$root/build" "$dest/"

sed -i -E "s/^( \* Version: +).*/\1$version/" "$dest/$slug.php"
sed -i -E "s/^Stable tag: .*/Stable tag: $version/" "$dest/readme.txt"

rm -f "$out"
(cd "$stage" && python3 -I -m zipfile -c "$out" "$slug")
echo "package: $out"
