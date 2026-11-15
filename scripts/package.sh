#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
bun run build

version="$(bun -e 'console.log(JSON.parse(await Bun.file("public/manifest.json").text()).version)')"
mkdir -p release
archive="release/arcside-chrome-$version.zip"
rm -f "$archive"
(cd dist && zip -qr "../$archive" . -x "*.DS_Store")
cp scripts/INSTALL.txt release/INSTALL.txt

echo "Created $archive ($(du -h "$archive" | cut -f1))"
