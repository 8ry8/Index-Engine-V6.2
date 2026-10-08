#!/usr/bin/env bash
#
# Packages the built Index Engine.app into a distributable archive.
#
# Usage:
#   bash mobile/macos/scripts/package-app.sh            # ZIP (default)
#   bash mobile/macos/scripts/package-app.sh --dmg      # ZIP + notarization-ready DMG
#
# Requires a prior `npm run macos:build` (unsigned) or a signed build left in
# place by `scripts/sign-app.sh`. This script never signs anything itself.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MACOS_ROOT/../.." && pwd)"

APP="$MACOS_ROOT/DerivedData/Build/Products/Release/IndexEngine.app"
DIST="$MACOS_ROOT/dist"
STAGING="$DIST/staging"
VERSION="$(node -p "require('$REPO_ROOT/package.json').version")"
ZIP="$DIST/IndexEngine-$VERSION-macos-universal.zip"
DMG="$DIST/IndexEngine-$VERSION-macos-universal.dmg"

if [[ ! -d "$APP" ]]; then
  echo "error: no built app at $APP" >&2
  echo "       run 'npm run macos:build' first." >&2
  exit 1
fi

# Refuse to package a bundle that is missing the engine it is supposed to ship.
if [[ ! -f "$APP/Contents/Resources/www/index.html" ]]; then
  echo "error: the bundle is missing Contents/Resources/www/index.html." >&2
  echo "       run 'npm run macos:sync' and rebuild." >&2
  exit 1
fi

rm -rf "$STAGING"
mkdir -p "$STAGING"
cp -R "$APP" "$STAGING/"

echo "Architectures: $(/usr/bin/lipo -archs "$STAGING/IndexEngine.app/Contents/MacOS/IndexEngine")"

# `ditto` (not `zip`) preserves the resource forks, extended attributes and
# internal symlink layout that a .app bundle depends on.
rm -f "$ZIP"
ditto -c -k --sequesterRsrc --keepParent "$STAGING/IndexEngine.app" "$ZIP"
echo "wrote $ZIP"
echo
echo "To install this build (replacing any stale copy):  npm run macos:install"

if [[ "${1:-}" == "--dmg" ]]; then
  ln -sf /Applications "$STAGING/Applications"
  rm -f "$DMG"
  hdiutil create -volname "Index Engine $VERSION" -srcfolder "$STAGING" -ov -format UDZO "$DMG"
  echo "wrote $DMG"
  echo "next: sign and notarize with 'bash mobile/macos/scripts/sign-app.sh'"
fi
