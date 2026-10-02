# Android Delivery Guide — Index Engine V9.1.0.1

**Session:** 5 · **Primary route:** Capacitor 8 · **Package:** `mobile/capacitor/`

This guide packages the existing V9 single-file SPA in a native Android shell. It does not reimplement the filename policy or keep a second, divergent engine. The generated Android project, app ID, API level, security defaults, and web-asset sync script are included in the repository.

> **Policy and privacy:** Version 9.1.0.1 is the master where editions conflict. The accessible-source limits in [`SPEC-AUDIT.md`](SPEC-AUDIT.md) still apply. The app processes selected content in the WebView, hashes it at intake, and keeps metadata locally; it does not upload document bytes. Do not use the browser-only API-key workflow as an organizational secret-management service.

## 1. Choose a route

| Route | What it is | This repository |
|---|---|---|
| **A — Capacitor WebView shell** | Native Android activity with the canonical V9 SPA bundled as local assets | **Implemented** in `mobile/capacitor/android/`; this is the tested/recommended route |
| **B — Native Kotlin + Compose** | A separate native UI/data layer using Room, WorkManager, and Android document-provider URIs | Documented as an alternative architecture below; it is not a second production implementation in this repository |

Track A keeps one policy engine. The Capacitor app has no `server.url` and does not load the site from a remote development server. The `www/` directory and copied WebView assets are regenerated from `v9/` by `npm run android:sync`.

## 2. Prerequisites

As of 2026-10-02, the pinned Capacitor 8 toolchain requires:

- Node.js 22 or newer (`mobile/capacitor/package.json` enforces this).
- Android Studio 2025.2.1 (Otter) or newer.
- A JDK 21 installation. Use Android Studio's bundled JDK 21 for Studio and command-line Gradle.
- Android SDK Platform 36 and Build-Tools 36.x installed in SDK Manager. The project has `minSdkVersion = 24`, `compileSdkVersion = 36`, and `targetSdkVersion = 36`. Gradle 8.14.3 and its wrapper JAR are pinned to published SHA-256 digests; the mobile verifier checks the wrapper JAR before build.

Google Play requires new apps and updates to target API 36 beginning August 31, 2026. Capacitor's API 36 target is therefore deliberate; do not lower it to silence a build warning. Re-check Play policy at submission time.

Official references: [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor Android target SDK matrix](https://capacitorjs.com/docs/android/setting-target-sdk), and [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk).

## 3. Build and install a debug APK

From a clean clone, install the locked mobile dependencies and build:

```sh
cd mobile/capacitor
npm ci
npm test
npm run android:debug
```

`android:debug` first recopies the current V9 assets, runs `npx cap sync android`, and then invokes the committed Gradle wrapper. On success, the installable debug APK is:

```text
mobile/capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device with USB debugging enabled:

```sh
cd mobile/capacitor/android
./gradlew installDebug
```

On Windows, use Android Studio's Run action or `gradlew.bat installDebug`. To open the native project:

```sh
cd mobile/capacitor
npm run android:open
```

The same HTML remains directly runnable in a browser. The mobile package only syncs a copy into the Android project's generated asset directory; it does not change the web release.

## 4. Update the bundled SPA

After editing the web artifact, rebuild its inline CSS at the repository root if needed, then sync mobile assets:

```sh
cd <repository-root>
npm ci
npm run build:spa
cd mobile/capacitor
npm ci
npm run android:sync
npm test
```

The Capacitor configuration bundles local files, uses HTTPS-style local assets on Android, disables mixed content, disables WebView debugging for production, and grants no broad external-storage permissions. Android's system document picker mediates file selection; do not add `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, or `MANAGE_EXTERNAL_STORAGE` for this app.

## 5. Run and inspect

- In Android Studio, choose an API 36 emulator or a physical device running a supported Android release.
- Verify app launch, keyboard/viewport behavior, document picker, local record commit, IndexedDB persistence after force-stop/relaunch, CSV export, encrypted backup/restore, and Android Back behavior.
- Test deny/cancel paths for file selection. A canceled picker must not create a record.
- Verify service-worker cache contains only app-shell assets; never cache backup files, ledgers, Gemini responses, or source documents.
- Check WebView/Logcat output before a release. The app config disables Capacitor logging; do not add document metadata, hashes, or API keys to logs.

The WebView stores the local ledger in its origin's IndexedDB. Uninstalling the app or clearing application storage can erase that ledger. Export and securely store an encrypted backup before device replacement or OS repair. A debug APK is not a signed Play release.

## 6. Prepare a signed Play build

For local unsigned/release compilation:

```sh
cd mobile/capacitor
npm run android:release
```

The command produces an AAB under `android/app/build/outputs/bundle/release/`; it is **not store-ready until signed**. Use Android Studio's **Build > Generate Signed Bundle / APK** with a dedicated upload key, then enable Play App Signing. Keep keystore and passwords outside the repository and CI logs; never place signing values in `capacitor.config.json`, source control, or the app bundle.

Before submission, verify the current Play Console target-SDK rule, app signing, data safety answers, privacy policy, package ID ownership, screenshots, and tested behavior on API 24+ and API 36. The app does not implement organization SSO, cloud backup, WORM storage, or managed-device policy.

## 7. Alternative route B — Kotlin + Compose

Choose a native rewrite only if the product requires native-first screens or lifecycle control. Preserve the master contract; do not create a second, silently divergent naming schema.

| Concern | Native approach |
|---|---|
| UI | Compose screens for Intake, Constructor, Smart Review Queue, Ledger, Taxonomy, and Backup |
| File input | `ActivityResultContracts.OpenMultipleDocuments` / Storage Access Framework; retain `content://` URIs only while processing |
| Durable metadata | Room transactions for ledger + audit; allocate `FILE` IDs under a database transaction and persistent high-water mark |
| Batch/background work | WorkManager for deferrable work; keep interactive classification visible and cancellable |
| Integrity | Stream source bytes through SHA-256; persist only metadata/hash unless product policy explicitly authorizes encrypted document storage |
| API key | Ask per session and hold in memory; do not ship a shared key in the APK or commit user keys |
| Export | `FileProvider` or Android Sharesheet for user-initiated export; encrypt backups before writing them outside app-private storage |

A native rewrite must reuse the golden cases in `tools/tests/v9-engine.test.js` (part order, `NA` scope, full version labels, eight-digit IDs, `Part2`, title overflow to review) and add Room migration, process-death, transaction-abort, and Android permission tests before replacing Track A.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `JAVA_HOME` missing or unsupported class version | Gradle picked a JDK other than 21 | Set Android Studio's Gradle JDK to its bundled JDK 21; set `JAVA_HOME` for shell builds |
| `SDK location not found` | SDK Manager path was not configured | Open project in Android Studio, install API 36/Build-Tools 36, and set local SDK path; `local.properties` stays untracked |
| Blank screen after changing web code | The native project contains stale copied web assets | Run `npm run android:sync`, then rebuild |
| App points to localhost or remote URL | A development-only `server.url` was added | Remove it before packaging; the committed config bundles local files |
| No file picker / canceled picker commits a row | Intent/result handling regression | Test Android system document picker and cancellation separately; never treat cancellation as intake |
| Google Play rejects target API | SDK target is below current policy | Keep Capacitor 8/API 36 and verify the live Play requirement immediately before submission |

## 9. Verification status

`npm test` validates the Android project configuration, local asset synchronization, app ID/version, API 24/36 settings, wrapper files, and least-permission manifest. `npm audit` is clean for the locked mobile dependencies. A full Gradle/APK build requires JDK 21 and the Android SDK; those tools are not installed in this Linux workspace. Session 7's Android CI job builds the APK on a hosted Android runner. Do not interpret the configuration test as a claim that a signed release APK has been produced.
