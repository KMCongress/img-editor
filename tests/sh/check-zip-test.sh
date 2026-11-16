#!/usr/bin/env bash
# bin/check-zip.sh viselkedése: jó zip átmegy, rossz verzió és rossz szerkezet elbukik.
# Előfeltétel: npm run build.
set -uo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
fails=0
expect() { # expect <ok|fail> <leírás> <parancs...>
  local want=$1 what=$2; shift 2
  if "$@" >/dev/null 2>&1; then got=ok; else got=fail; fi
  if [ "$got" = "$want" ]; then echo "  ✓ $what"; else echo "  × $what (várt: $want, kapott: $got)"; fails=$((fails+1)); fi
}

"$root/bin/package.sh" 1.2.3 "$tmp/good.zip" >/dev/null
"$root/bin/package.sh" 1x2x3 "$tmp/lookalike.zip" >/dev/null
mkdir -p "$tmp/flat" && cp "$root/kmc-featured-image-fit.php" "$root/readme.txt" "$tmp/flat/"
(cd "$tmp/flat" && python3 -I -m zipfile -c "$tmp/flat.zip" kmc-featured-image-fit.php readme.txt)

expect ok   "a jó zip átmegy"                       "$root/bin/check-zip.sh" "$tmp/good.zip" 1.2.3
expect fail "más verzió elbukik"                    "$root/bin/check-zip.sh" "$tmp/good.zip" 1.2.4
expect fail "a . nem illeszt bármit (1x2x3 ≠ 1.2.3)" "$root/bin/check-zip.sh" "$tmp/lookalike.zip" 1.2.3
expect fail "gyökérkönyvtár nélküli zip elbukik"    "$root/bin/check-zip.sh" "$tmp/flat.zip" 1.2.3

[ "$fails" -eq 0 ] && echo "check-zip-test: OK" || { echo "check-zip-test: $fails hiba"; exit 1; }
