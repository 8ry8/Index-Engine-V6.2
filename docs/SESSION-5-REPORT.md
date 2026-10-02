# Session 5 Report — Android Application

**Date:** 2026-10-02
**Branch:** `arena/01a0fc76-index-engine-v6-2`
**Route delivered:** Capacitor 8 Android shell; Kotlin/Compose retained as a documented alternative.

## Delivered

| Artifact | Result |
|---|---|
| `docs/GUIDE-ANDROID.md` | Setup, exact build/install commands, target-SDK policy, privacy, release signing, verification, troubleshooting, and native Compose alternative |
| `mobile/capacitor/` | Locked Capacitor package, local V9 asset copier, cross-platform Gradle launcher, config, generated Android project and custom branded adaptive icon |
| Android security posture | API 24 minimum, compile/target 36, HTTPS-style bundled assets, mixed content disabled, WebView debug disabled, no broad storage permissions, Android system file picker, automatic cloud/device backup disabled/excluded |
| `verify-project.mjs` | Asserts source asset equality, package/config versions, application ID/version, SDK levels, manifest permissions, backup exclusions, and Gradle wrapper presence |

Capacitor 8.4.3 is pinned across CLI/core/Android in the lockfile. It was selected after the newer 8.5.2 CLI dependency tree produced three moderate `npm audit` advisories; the pinned tree currently audits clean.

## Checks

- `npm ci` in `mobile/capacitor` — passed; 0 vulnerabilities.
- `npm run android:sync` — passed; the current V9 files copied into the generated Android project.
- `npm test` in `mobile/capacitor` — passed.
- `npm audit --audit-level=moderate` — passed; 0 vulnerabilities.

## Build limitation

This workspace has Node 22 but no Java/JDK, Android SDK, or Android Studio. A local Gradle/APK build could not be run here; the report does not claim a debug APK was produced. The project includes the Gradle wrapper and API 36 configuration. Session 7 CI is planned to build it on a hosted Android runner.

## Policy and privacy

The WebView packages the single canonical V9 engine; it does not load a dev-server URL. Android backup is disabled for older platforms and all configured cloud/device-transfer domains are excluded on newer Android versions. File selection uses Android's system picker; source bytes are hashed and not retained by the web engine. Test device-transfer behavior on supported OEMs before distribution.
