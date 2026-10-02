# iOS Delivery Guide — Index Engine V9.1.0.1

**Session:** 6 · **Primary route:** Capacitor 8 + Swift Package Manager · **Project:** `mobile/capacitor/ios/`

This project wraps the canonical V9.1.0.1 single-file SPA in a native iOS app. It keeps one policy engine instead of creating a second, divergent implementation. The wrapper bundles local web assets; it has no remote development-server URL. The iOS project, app identity, version, icons, launch art, and build scripts are checked in.

> **Master and privacy:** V9.1.0.1 is authoritative where editions conflict. Only accessible pasted text was reviewed; the body of section 13 and the PDF binary were not accessed. The app does not upload source-document bytes as part of the wrapper. Any optional AI action remains a separate, user-initiated network feature—review its request and the current App Store privacy answers before release. The project does not add iCloud/CloudKit sync; do not promise a particular iOS device-backup outcome without testing the exact OS/device configuration. Keep an encrypted export outside the device before migration or repair.

## 1. Choose a route

| Route | What it is | Repository status |
|---|---|---|
| **A — Capacitor WebView shell** | Native Xcode app with the canonical SPA bundled as local assets | **Implemented** in `mobile/capacitor/ios/`; this is the runnable route |
| **B — Native SwiftUI app** | Native screens and storage that reuse V9 behavior and golden cases | Documented as an alternative architecture below; not a second production engine in this repository |

Route A uses Capacitor 8.4.3 with Swift Package Manager. No CocoaPods install or `Podfile` is required. The generated SPM package pins the native Capacitor package at 8.4.3.

## 2. Prerequisites

- A Mac running a macOS version supported by Xcode.
- **Xcode 26.0 or later** and its Xcode Command Line Tools. Capacitor 8 requires Xcode 26+.
- Node.js 22 or later, as pinned by the mobile package's engine requirement.
- An Apple ID for local simulator/device work. A paid Apple Developer Program team and signing assets are required for TestFlight/App Store distribution.
- iOS 15 is the project's deployment target. Review current App Store Connect requirements before submission.

Official references: [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor iOS guide](https://capacitorjs.com/docs/ios), and [Capacitor 8 migration requirements](https://capacitorjs.com/docs/updating/8-0).

Install or select Xcode Command Line Tools if needed:

```sh
xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

If multiple Xcode installations exist, select the intended one before running builds. Accept the Xcode license and install its platform components once.

## 3. Sync and open the project

From the repository root:

```sh
cd mobile/capacitor
npm ci
npm test
npm run ios:sync
npm run ios:open
```

`ios:sync` recopies `v9/index.html` and its PWA sidecars, then runs `cap sync ios`. The `www/` directory and copied `ios/App/App/public/` assets are generated and ignored; do not edit them by hand. `npm test` also verifies the current source-to-bundle copy, app/bundle identity, version `9.1.0.1` / build `90101`, iOS 15 target, pinned SPM dependency, and 1024×1024 app icon.

In Xcode, select the **App** scheme and an available iPhone/iPad simulator, then press **Run**. To list available simulators from Terminal:

```sh
xcrun simctl list devices available
```

The Capacitor CLI can also run a selected simulator interactively with `npx cap run ios`; the committed `npm run ios:simulator` is the deterministic generic-simulator build check.

## 4. Build and archive

Build for an available iOS Simulator without signing:

```sh
cd mobile/capacitor
npm run ios:simulator
```

The app product is under `ios/DerivedData/Build/Products/Debug-iphonesimulator/`. This check is for compile/build validity; it is not a device archive.

Create the unsigned Release archive used by CI to verify the Xcode archive gate:

```sh
npm run ios:archive:unsigned
```

Expected archive path:

```text
mobile/capacitor/ios/App/build/Index-Engine.xcarchive
```

This command sets `CODE_SIGNING_ALLOWED=NO`. A successful archive proves that the Xcode project compiled and archived; **it is not a signed IPA and cannot be submitted to TestFlight or the App Store**. Xcode and the iOS SDK are required for both commands. This Linux workspace can sync and statically verify the iOS skeleton, but cannot run either Xcode build.

## 5. Sign and distribute

1. Open `ios/App/App.xcodeproj` in Xcode and select the **App** target.
2. In **Signing & Capabilities**, choose the intended Apple Developer team. Confirm that `org.efnai.indexengine` is registered and available to that team; change the bundle identifier only if the organization owns a replacement ID.
3. Set the release build's version/build numbers deliberately. This skeleton is `9.1.0.1` / `90101`; App Store Connect requires each uploaded build number to be unique for the version.
4. Archive with Xcode's **Product > Archive** using a signing-enabled Release configuration. Keep certificates, private keys, provisioning profiles, and App Store Connect API keys in Keychain/approved CI secrets—not in this repository, app bundle, or logs.
5. In Organizer, validate and distribute the signed archive to App Store Connect/TestFlight. When automating export, use the `ExportOptions.plist` generated/reviewed by the current Xcode Organizer flow for the chosen distribution method; keep team and signing choices aligned. For a locally exported IPA, after saving that plist outside the repository:

   ```sh
   EXPORT_OPTIONS_PLIST="$HOME/Index-Engine-ExportOptions.plist"
   xcodebuild -exportArchive \
     -archivePath mobile/capacitor/ios/App/build/Index-Engine.xcarchive \
     -exportPath mobile/capacitor/ios/App/build/export \
     -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"
   ```

   The path above must point to a valid plist created for your team and selected distribution method; it is intentionally not committed. Apple documents this archive/export workflow in [Export an iOS app](https://help.apple.com/xcode/mac/current/en.lproj/dev23ea8b877.html).
6. Complete App Store Connect privacy disclosures, age/content rating, export-compliance answers, screenshots, and review notes. Describe the optional external AI feature and its data flow accurately; do not infer the privacy label from the fact that the default record store is local.

A development-signed simulator/device run and a Release archive are separate checks. A debug build is not a release artifact. Do not check in an `.ipa`, provisioning profile, distribution certificate, private key, or signed archive.

## 6. Device and data acceptance checklist

Test on at least one supported iPhone and one iPad-sized layout before store submission:

- Clean launch in airplane mode; confirm the bundled SPA opens without reaching localhost or a remote web server.
- Select a supported file from Files, then cancel another selection; cancellation must not create a record.
- Exercise metadata validation, Smart Review Queue, duplicate handling, and the V9 golden cases—not just the launch screen.
- Force-quit and relaunch; verify IndexedDB-backed records remain. Reinstall and clear-data behavior must be documented separately because either can erase local data.
- Export CSV and encrypted backup to a user-selected Files/share destination; restore only with the correct passphrase; reject tampering and a wrong passphrase.
- Verify the app does not retain original document bytes, place them in a web cache, or emit names, hashes, records, or API keys to logs.
- Test Dynamic Type/VoiceOver, keyboard appearance, portrait/landscape, dark/light appearance, and file-picker cancellation.
- Test the optional AI flow only with an approved key and user-authorized metadata; confirm that no document bytes are included and that all disclosures match actual behavior.
- Test update and device-migration behavior. The app adds no CloudKit sync and makes no guarantee that WebKit IndexedDB is excluded from normal iOS device backups; an encrypted in-app export is the explicit portability path.

## 7. Update the bundled SPA

After changing `v9/index.html`, rebuild the inline CSS at the repository root when needed and sync the mobile assets:

```sh
cd <repository-root>
npm ci
npm run build:spa
cd mobile/capacitor
npm ci
npm test
npm run ios:sync
```

Never set Capacitor's `server.url` for a release. Do not add arbitrary ATS exceptions, tracking SDKs, camera/microphone/location usage strings, or extra native plugins without a reviewed feature and privacy declaration. The present app manifest adds no camera, microphone, or location permission request.

## 8. Alternative route B — SwiftUI architecture

Use a native rewrite only if product requirements justify maintaining native screens. Treat it as an alternative, not as permission to alter the V9.1.0.1 schema. Port the logic only against the canonical contract and `tools/tests/v9-engine.test.js` golden cases; gate a replacement on cross-implementation parity.

| Concern | Native approach |
|---|---|
| Screens | SwiftUI Intake, Constructor, Smart Review Queue, Ledger, Taxonomy, and Backup views |
| File selection | SwiftUI `.fileImporter` with explicit allowed `UTType` values; call `startAccessingSecurityScopedResource()` while reading a selected external URL and stop access afterward |
| Persistence | Core Data is available at the iOS 15 minimum. SwiftData requires iOS 17+, so use it only if the deployment target is raised. Commit record, audit row, and max+1 ID allocation in one database transaction |
| Integrity | Stream selected bytes through SHA-256; persist metadata/hash, not source bytes, unless a separately reviewed encrypted-storage feature is approved |
| Encryption | Use CryptoKit AES-GCM for authenticated encryption and a vetted PBKDF2 implementation for key derivation; CryptoKit does not itself provide PBKDF2 |
| API key | Never embed a shared key. If a future native feature retains a user's key, use Keychain and explicit consent; clear transient values when no longer needed |
| Exports | Use `FileDocument`/document export or a user-initiated share sheet; keep backup files outside the app only after explicit user action |
| Accessibility | VoiceOver labels, Dynamic Type, keyboard navigation, contrast, and accessible queue decision controls are release gates |

The native alternative still needs migration tests, transaction-failure tests, file-picker cancellation tests, restore/tamper tests, and the exact filename/`Part2`/title-overflow rules. Keep unresolved source ambiguities surfaced; do not silently resolve them in Swift.

## 9. Troubleshooting and verification status

| Symptom | Likely cause | Fix |
|---|---|---|
| `xcodebuild: command not found` | Xcode or its Command Line Tools are missing/not selected | Install Xcode 26+ and select its developer directory with `xcode-select` |
| SPM dependency resolution fails | Network access, Xcode first-run setup, or cached package state | Open the project in Xcode, resolve package dependencies, then rerun `npm run ios:sync` and the build |
| Xcode reports a signing/profile error | Unsigned CI archive or team/profile is not configured | Use the unsigned archive command only for compile verification; select a valid team/profile for device distribution |
| App has old screens after a web change | Native project contains stale copied web assets | Run `npm run ios:sync`, then rebuild |
| App Store Connect rejects a build number | Build number was already uploaded for that version | Increment `CURRENT_PROJECT_VERSION` and `ios/App/App.xcodeproj` build settings together, rerun `npm test`, and archive again |
| Files picker/export behavior differs on device | Simulator does not reproduce all Files/share-provider behaviors | Validate on real iOS hardware with iCloud Drive and a local Files location, including cancel and error paths |

Locally verified in this workspace: `npm ci`, `npm run ios:sync`, mobile `npm test`, Android sync, and `npm audit --audit-level=moderate` (zero advisories). Not verified here: Xcode Simulator build, physical-device behavior, signed archive, App Store export/upload. Those require macOS/Xcode and, for distribution, Apple signing assets. Session 7's hosted macOS CI must run both unsigned simulator build and archive before the archive gate is marked passed.
