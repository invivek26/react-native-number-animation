#!/bin/sh
# Compiles the real iOS renderer for Mac Catalyst (no simulator needed) and
# checks slot layout when digits are added or removed.
# Usage: scripts/ios-layout-check.sh [path/to/NumberAnimationRenderer.swift]
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
renderer=${1:-"$root/ios/NumberAnimationRenderer.swift"}
sdk=$(xcrun --show-sdk-path --sdk macosx)
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
xcrun swiftc \
  -target "$(uname -m)-apple-ios17.0-macabi" \
  -sdk "$sdk" \
  -Fsystem "$sdk/System/iOSSupport/System/Library/Frameworks" \
  -L "$sdk/System/iOSSupport/usr/lib" \
  "$renderer" "$root/scripts/ios-layout-check/main.swift" \
  -o "$out/ios-layout-check"
"$out/ios-layout-check"
