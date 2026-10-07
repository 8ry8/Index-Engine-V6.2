#!/usr/bin/env bash
#
# Installs Index Engine.app into /Applications.
#
# This exists because the failure mode it prevents is silent and confusing: a
# stale .app left in /Applications keeps the old bundle even after a good
# rebuild, so the operator sees "The local engine could not start" while the
# freshly built app sitting in DerivedData is perfectly fine.
#
# Every step is verified, and the install is aborted — not "best effort" — if
# the bundle being installed is missing the engine.
#
# Usage:
#   bash mobile/macos/scripts/install-app.sh          # install the current build
#   bash mobile/macos/scripts/install-app.sh --build  # rebuild first
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MACOS_ROOT/../.." && pwd)"

APP="$MACOS_ROOT/DerivedData/Build/Products/Release/IndexEngine.app"
INSTALL_DIR="/Applications"
INSTALLED="$INSTALL_DIR/Index Engine.app"

if [[ "${1:-}" == "--build" ]]; then
  echo "==> Building"
  npm run macos:build
fi

if [[ ! -d "$APP" ]]; then
  echo "error: no built app at $APP" >&2
  echo "       run 'npm run macos:build', or this script with --build." >&2
  exit 1
fi

# ── Refuse to install a bundle that is not actually complete ─────────────
if [[ ! -f "$APP/Contents/Resources/www/index.html" ]]; then
  echo "error: the built app is missing Contents/Resources/www/index.html." >&2
  echo "       run 'npm run macos:sync', then 'npm run macos:build' again." >&2
  exit 1
fi

echo "==> Verifying the bundle to install"
echo "    version:  $(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")"
echo "    build:    $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Contents/Info.plist")"
echo "    archs:    $(/usr/bin/lipo -archs "$APP/Contents/MacOS/IndexEngine")"
echo "    engine:   $(wc -c < "$APP/Contents/Resources/www/index.html" | tr -d ' ') bytes of index.html"

# ── Quit a running instance so we are not replacing a live bundle ────────
if pgrep -x "IndexEngine" >/dev/null 2>&1; then
  echo "==> Quitting the running Index Engine"
  osascript -e 'tell application "Index Engine" to quit' >/dev/null 2>&1 || true
  for _ in $(seq 1 10); do
    pgrep -x "IndexEngine" >/dev/null 2>&1 || break
    sleep 1
  done
  if pgrep -x "IndexEngine" >/dev/null 2>&1; then
    echo "error: Index Engine is still running. Quit it and run this again." >&2
    exit 1
  fi
fi

# ── Replace, do not merge ------------------------------------------------
# `cp -R` onto an existing bundle copies INSIDE it, producing
# /Applications/Index Engine.app/IndexEngine.app. Remove first.
echo "==> Installing to $INSTALLED"
rm -rf "$INSTALLED"
cp -R "$APP" "$INSTALLED"

# ── Clear quarantine so Gatekeeper does not translocate the app ──────────
xattr -rd com.apple.quarantine "$INSTALLED" 2>/dev/null || true

# ── Verify the installed copy, not the source ────────────────────────────
if [[ ! -f "$INSTALLED/Contents/Resources/www/index.html" ]]; then
  echo "error: the installed app is missing its engine. Install failed." >&2
  exit 1
fi

echo
echo "Installed $INSTALLED"
echo "  engine present: yes ($(wc -c < "$INSTALLED/Contents/Resources/www/index.html" | tr -d ' ') bytes)"
echo "  archs: $(/usr/bin/lipo -archs "$INSTALLED/Contents/MacOS/IndexEngine")"
echo
echo "Launch it with:  open -a \"Index Engine\""
