#!/usr/bin/env bash
#
# Signs and notarizes Index Engine.app for distribution outside the Mac App
# Store (Developer ID path).
#
# This script needs credentials that cannot exist in a repository. It fails
# loudly rather than producing something that only looks signed.
#
# Required environment:
#   SIGN_IDENTITY     e.g. "Developer ID Application: Your Name (TEAMID12345)"
#                     Run: security find-identity -v -p codesigning
#
# Notarization — provide ONE of:
#   NOTARY_PROFILE    name of a stored credential, created once with:
#                     xcrun notarytool store-credentials "index-engine" \
#                       --apple-id you@example.com --team-id TEAMID12345 \
#                       --password <app-specific-password>
#   ...or all three of:
#   NOTARY_APPLE_ID   Apple ID used for the developer account
#   NOTARY_TEAM_ID    ten-character team ID
#   NOTARY_PASSWORD   app-specific password (never your account password)
#
# Usage:
#   bash mobile/macos/scripts/sign-app.sh            # sign, package, notarize, staple
#   bash mobile/macos/scripts/sign-app.sh --sign-only
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MACOS_ROOT/../.." && pwd)"

APP="$MACOS_ROOT/DerivedData/Build/Products/Release/IndexEngine.app"
DIST="$MACOS_ROOT/dist"
ENTITLEMENTS="$MACOS_ROOT/IndexEngine/IndexEngine.entitlements"
VERSION="$(node -p "require('$REPO_ROOT/package.json').version")"

: "${SIGN_IDENTITY:?SIGN_IDENTITY is required, e.g. \"Developer ID Application: Your Name (TEAMID12345)\"}"
: "${NOTARY_PROFILE:=}"
: "${NOTARY_APPLE_ID:=}"
: "${NOTARY_TEAM_ID:=}"
: "${NOTARY_PASSWORD:=}"

if [[ -z "$NOTARY_PROFILE" && ( -z "$NOTARY_APPLE_ID" || -z "$NOTARY_TEAM_ID" || -z "$NOTARY_PASSWORD" ) ]]; then
  echo "error: notarization credentials are missing." >&2
  echo "       set NOTARY_PROFILE, or all of NOTARY_APPLE_ID, NOTARY_TEAM_ID, NOTARY_PASSWORD." >&2
  exit 1
fi

# ── Build with the hardened runtime that notarization requires ────────────
echo "==> Building the universal Release bundle with hardened runtime"
(
  cd "$REPO_ROOT"
  npm run macos:sync
  xcodebuild \
    -project mobile/macos/IndexEngine.xcodeproj \
    -scheme IndexEngine \
    -configuration Release \
    -destination 'generic/platform=macOS' \
    -derivedDataPath mobile/macos/DerivedData \
    ENABLE_HARDENED_RUNTIME=YES \
    CODE_SIGN_IDENTITY="$SIGN_IDENTITY" \
    CODE_SIGN_STYLE=Manual \
    build
)

# ── Sign ─────────────────────────────────────────────────────────────────
echo "==> Signing with $SIGN_IDENTITY"
codesign --force --timestamp --options runtime \
  --entitlements "$ENTITLEMENTS" \
  --sign "$SIGN_IDENTITY" \
  "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

if [[ "${1:-}" == "--sign-only" ]]; then
  echo "Signed only, as requested. Notarization was skipped."
  exit 0
fi

# ── Package, notarize, staple ────────────────────────────────────────────
echo "==> Packaging the notarization submission"
mkdir -p "$DIST"
SUBMISSION="$DIST/IndexEngine-$VERSION-notarize.zip"
rm -f "$SUBMISSION"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$SUBMISSION"

echo "==> Submitting for notarization (Apple may take a few minutes)"
if [[ -n "$NOTARY_PROFILE" ]]; then
  xcrun notarytool submit "$SUBMISSION" --keychain-profile "$NOTARY_PROFILE" --wait
else
  xcrun notarytool submit "$SUBMISSION" \
    --apple-id "$NOTARY_APPLE_ID" \
    --team-id "$NOTARY_TEAM_ID" \
    --password "$NOTARY_PASSWORD" \
    --wait
fi

echo "==> Stapling the ticket to the app bundle"
xcrun stapler staple "$APP"
spctl --assess --type execute --verbose=4 "$APP"

echo "==> Building the distributable DMG"
bash "$SCRIPT_DIR/package-app.sh" --dmg
xcrun notarytool submit "$DIST/IndexEngine-$VERSION-macos-universal.dmg" \
  ${NOTARY_PROFILE:+--keychain-profile "$NOTARY_PROFILE"} \
  ${NOTARY_PROFILE:---apple-id "$NOTARY_APPLE_ID" --team-id "$NOTARY_TEAM_ID" --password "$NOTARY_PASSWORD"} \
  --wait
xcrun stapler staple "$DIST/IndexEngine-$VERSION-macos-universal.dmg"

echo "Done. Distribute $DIST/IndexEngine-$VERSION-macos-universal.dmg"
