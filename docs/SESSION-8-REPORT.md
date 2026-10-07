# Session 8 Report — macOS Application

- **Date:** 2026-10-06
- **Branch:** `arena/07fe4a90-index-engine-v6-2`
- **Deliverable:** native macOS application around the canonical V9.1.0.1 SPA
- **Status:** project, guide, scripts, and CI gate delivered; universal Release
  build verified in hosted CI. On-device acceptance, notarization, and Mac App
  Store submission are outstanding.

## Why this session is not a Capacitor session

Sessions 5 and 6 used Capacitor. Session 8 cannot. Capacitor 8.4.3 — the
version pinned for Android and iOS in this repository — ships **iOS and Android
platforms only**. There is no `@capacitor/macos` package in the npm registry
(`npm view @capacitor/macos` returns 404) and no macOS platform in the
Capacitor 8.4.3 CLI, so `cap add macos` has nothing to add.

The alternatives were weighed against this repository's standing rules — no
build step for the shipped artifact, minimal and pinned dependencies, and
security-first defaults:

| Route | Why it was or was not chosen |
|---|---|
| **Native SwiftUI + WKWebView** | **Chosen.** Zero package dependencies, ~2 MB installed, system WebKit, notarizable, Mac App Store compatible |
| Electron / Capacitor Electron Platform | Rejected: ~250 MB and hundreds of npm dependencies |
| Tauri 2 | Rejected: introduces a Rust toolchain the repository does not otherwise need |

## Scope delivered

**Native project — `mobile/macos/IndexEngine.xcodeproj`**

- Bundle ID `org.efnai.indexengine`, display name `Index Engine`.
- macOS 13.0 Ventura deployment target; `ARCHS = arm64 x86_64` (universal).
- Marketing version `9.1.0.1`, build `90101`, matching the root
  `package.json` and the Android/iOS shells.
- Hardened runtime enabled; App Sandbox enabled; `GENERATE_INFOPLIST_FILE = NO`
  so the checked-in `Info.plist` is authoritative.
- No SwiftPM packages, no CocoaPods, no bundled browser engine.

**SwiftUI shell — `mobile/macos/IndexEngine/`**

| File | Role |
|---|---|
| `IndexEngineApp.swift` | `@main` SwiftUI app, window sizing, Reload command |
| `AppDelegate.swift` | lifecycle; stops the local server on quit |
| `ContentView.swift` | loading / ready / failure states with an honest diagnostic |
| `WebBrowserView.swift` | `NSViewRepresentable` hosting one `WKWebView` |
| `BrowserController.swift` | navigation policy, panels, alerts, downloads |
| `BrowserModel.swift` | published phase shared with SwiftUI |
| `LocalAssetServer.swift` | loopback-only HTTP server for the bundled SPA |
| `NSAlert+IndexEngine.swift` | alert / confirm / prompt bridges |

**The one design decision that matters.** The engine stores its ledger in
IndexedDB. WebKit gives `file://` origins **no storage at all**, so loading the
SPA straight from the bundle would have silently disabled the ledger — the app
would have looked fine and lost every record on quit. A custom
`WKURLSchemeHandler` scheme leaves IndexedDB behaviour version-dependent.
`LocalAssetServer` therefore binds `127.0.0.1` on an ephemeral kernel-assigned
port and serves the bundle over real HTTP, which is a *potentially trustworthy*
origin. Hardening: loopback-only bind, `Host`-header validation against
rebinding, `GET`/`HEAD` only, path traversal rejected before any file is
opened, `no-store` and `nosniff` on every response.

**Native bridges the engine needs.** The SPA exports through `blob:` URLs and
`<a download>`, ingests through `<input type="file">`, and calls `confirm` and
`prompt` for destructive and free-text operations. All four are bridged to
`NSSavePanel`, `NSOpenPanel`, and `NSAlert` — otherwise each would be a silent
no-op.

**Least-privilege entitlements.** `app-sandbox`, `network.server` (loopback
only), `files.user-selected.read-write`. The outbound-network client
entitlement is **deliberately absent**: the engine is fully offline and the
optional Gemini extraction is not part of the shipped default. The verifier
asserts its absence.

**Icons and assets.** The macOS AppIcon set (seven rendered sizes across ten
slots, 16 px through 1024 px) is rendered from the canonical `v9/icon.svg` and
committed, so a clean clone needs no rasterizer. `scripts/build-icons.mjs`
documents the one-off regeneration path.

**Scripts — `mobile/macos/scripts/`**

| Script | Purpose |
|---|---|
| `sync-web.mjs` | copies `v9/` to `IndexEngine/Resources/www` |
| `verify-project.mjs` | static gate, runs on any OS including Linux CI |
| `build-icons.mjs` | optional icon redraw from `v9/icon.svg` |
| `package-app.sh` | ZIP, and optionally a DMG |
| `sign-app.sh` | Developer ID signing, notarization, stapling |

**Repository integration**

- Root `package.json`: `macos:sync`, `macos:verify`, `macos:check`,
  `macos:build`, `macos:archive:unsigned`, `macos:package`, `macos:sign`.
  `npm run lint` now includes `macos:check`.
- `tools/check-version.mjs` asserts macOS version/build alignment alongside
  Android and iOS.
- `.github/workflows/lint.yml` gained a `macos-app` job on `macos-26`.
- `.gitignore` excludes the generated `Resources/www`, `DerivedData`, `build`,
  and `dist`.

## Verification

| Check | Result |
|---|---|
| `npm run macos:check` (Linux) | Passed — byte-identical bundle, identity, target, architecture, version, entitlements, icon sizes, sources |
| `tools/check-version.mjs` | Passed — `9.1.0.1` / `90101` aligned across Android, iOS, macOS, and the SPA |
| Universal Release build (`macos-26`) | Passed — compiles and links for `arm64` and `x86_64` |
| Unsigned Release archive | Passed |
| `lipo -archs` universal check | Passed — `arm64 x86_64` |
| `CFBundleIdentifier` / `CFBundleShortVersionString` / `LSMinimumSystemVersion` | Passed — `org.efnai.indexengine` / `9.1.0.1` / `13.0` |
| In-bundle `www/index.html` equals `v9/index.html` | Passed (`cmp`) |
| ZIP packaging | Passed — 279 KB artifact uploaded |
| Root `npm run lint` including `macos:check` | Passed — 21/21 Terminal + 24/24 V9 |
| Launching the app on a physical Mac | **Not run** — no Mac in this workspace |
| Signed / notarized distribution | **Not run** — requires Apple credentials |
| Mac App Store submission | **Not run** |

Hosted CI run [37438324358](https://github.com/8ry8/Index-Engine-V6.2/actions/runs/37438324358)
passed all five jobs — SPA/HTML/headless tests, mobile config, Android debug APK,
**macOS universal app**, and iOS Simulator/archive — on source
`0247b68a12ba6d6fb410cfc3ade2b3bb86358af8`. The uploaded macOS artifact
`index-engine-macos-app-…` is a **273 KB ZIP** containing the universal
`IndexEngine.app`; its size is the bundled engine itself, since no browser
runtime is shipped.

## Defects found and fixed during implementation

Both were invisible to static analysis in this workspace and were caught by the
hosted macOS build:

1. **`Data(message)`** in `LocalAssetServer.textResponse` — `Data.init(_:)`
   requires a `UInt8` sequence, not a `String`. Hard compile error.
2. **A delegate that compiled against nothing.** `BrowserController` declared
   `webView(_:createWebViewWithConfiguration:for:windowFeatures:)`. The
   `WKUIDelegate` requirement is named `webView(_:createWebViewWith:for:windowFeatures:)`.
   The wrong label produced only a *warning*, not an error — so the method
   would never have been called, and external links would have silently
   rendered inside the ledger window.

The verifier also caught one of its own problems during development: the
entitlements file documented the forbidden `network.client` key by writing the
literal key/`<true/>` pair in a comment, which tripped the
"entitlement must be absent" assertion. The comment now describes the key in
prose.

## Known limitations, stated plainly

- **The offline service worker does not register in the macOS app.**
  `v9/sw.js` registers only for `https:` or a `localhost` hostname; the app
  serves `http://127.0.0.1:<port>`. This is intentional — the shell is already
  fully local, and skipping the service worker removes any chance of a stale
  cached engine. The file still ships so the PWA sidecars stay identical.
- **CI's unsigned build does not enforce the sandbox.** Entitlements are only
  applied when the bundle is signed, so the CI gate proves compilation and
  packaging, not sandbox behaviour. Section 9 of `docs/GUIDE-MACOS.md` covers
  the signed-build checks.
- **Loopback listening under App Sandbox is unverified.** The design relies on
  `com.apple.security.network.server` permitting a `bind()` to `127.0.0.1`.
  This is the documented behaviour of that entitlement, but it has not been
  exercised on real hardware in this session.
- **No outbound network by design.** The optional Gemini metadata extraction
  will not work in the shipped configuration. Enabling it means adding the
  client entitlement and revisiting the App Store privacy answers.

## Next steps

1. Run the acceptance checklist in section 9 of `docs/GUIDE-MACOS.md` on real
   hardware, at least once on Apple Silicon and once on Intel.
2. Confirm the storage mode reported in the Schema & Settings tab is **not**
   `localStorage fallback` — that would mean IndexedDB is unavailable and the
   loopback origin is not doing its job.
3. Sign with a Developer ID identity and notarize (`npm run macos:sign`) using
   credentials supplied outside the repository.
4. Decide whether the Mac App Store path is wanted, and if so resolve the
   bundle-ID collision question with the existing iOS app before submission.

## Commit

Session 8 changes are committed on the required Arena branch
`arena/07fe4a90-index-engine-v6-2`.
