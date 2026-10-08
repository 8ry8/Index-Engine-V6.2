# Index Engine — macOS shell

Native macOS application for the EFNAI V9.1.0.1 engine.

This is **not** a second implementation of the nomenclature policy. It is a
SwiftUI + WKWebView shell around the canonical single-file SPA at
`v9/index.html`, which is bundled byte-for-byte into the app as a local web
asset. There is exactly one engine in this repository.

Capacitor has no macOS platform (`@capacitor/macos` does not exist and the
Capacitor 8.4.3 CLI ships iOS/Android only), so the macOS shell is a native
Xcode project with **zero package dependencies** — no Node runtime, no bundled
Chromium, no CocoaPods, no SwiftPM packages.

| Item | Value |
|---|---|
| Bundle identifier | `org.efnai.indexengine` |
| Version / build | `9.1.0.1` / `90101` (mirrors the root `package.json`) |
| Deployment target | macOS 13.0 Ventura |
| Architectures | `arm64 x86_64` (universal) |
| Code signing | Hardened runtime + App Sandbox |
| Entitlements | sandbox, `network.server` (loopback only), `files.user-selected.read-write` |

## Layout

```text
mobile/macos/
  IndexEngine.xcodeproj/          Xcode project (no external packages)
  IndexEngine/
    IndexEngineApp.swift          @main SwiftUI app and window
    AppDelegate.swift             lifecycle; stops the local server on quit
    ContentView.swift             shell UI: loading / ready / failure states
    WebBrowserView.swift          NSViewRepresentable hosting the WKWebView
    BrowserController.swift       navigation policy, panels, alerts, downloads
    BrowserModel.swift            published phase shared with SwiftUI
    LocalAssetServer.swift        loopback-only HTTP server for the bundled SPA
    NSAlert+IndexEngine.swift     alert / confirm / prompt bridges
    Info.plist, IndexEngine.entitlements, Assets.xcassets/
    Resources/www/                GENERATED — copy of v9/, never edited here
  scripts/
    sync-web.mjs                  copies v9/ into Resources/www
    verify-project.mjs            static checks runnable on any OS
    build-icons.mjs               optional redraw of the AppIcon set from v9/icon.svg
    package-app.sh                ZIP / DMG packaging
    sign-app.sh                   Developer ID signing, notarization, stapling
```

## Quick start

```sh
npm run macos:check      # sync v9/ and run every static check (any OS)
npm run macos:build      # build the universal Release .app (macOS + Xcode 26+)
npm run macos:package    # ZIP it into mobile/macos/dist/
```

Then read [`docs/GUIDE-MACOS.md`](../../docs/GUIDE-MACOS.md) for running,
signing, notarizing, and Mac App Store submission.
