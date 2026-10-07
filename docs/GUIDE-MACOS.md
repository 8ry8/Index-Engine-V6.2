# macOS Delivery Guide — Index Engine V9.1.0.1

**Session:** 8 · **Route:** native SwiftUI + WKWebView shell · **Project:** `mobile/macos/`

This project turns the canonical V9.1.0.1 single-file SPA into a native macOS
application. It keeps one policy engine instead of creating a second, divergent
implementation: the app bundles `v9/index.html` and its PWA sidecars
byte-for-byte and renders them in a `WKWebView`. Nothing is fetched from a
remote server at runtime.

> **Master and privacy.** V9.1.0.1 is authoritative where editions conflict.
> Only accessible pasted text was reviewed; the body of section 13 and the PDF
> binary were not accessed. The macOS shell is offline: it starts a
> loopback-only HTTP listener to serve its own bundled assets and requests no
> outbound-network entitlement. The optional Gemini metadata extraction is a
> separate, user-initiated network feature that the shipped configuration does
> not enable. Keep an encrypted export outside the machine before migration or
> repair; this app adds no cloud sync and makes no claim about Time Machine or
> system-backup coverage of WebKit storage.

## 1. Why not Capacitor

Capacitor 8.4.3 (the version pinned for Android and iOS in this repository)
ships **iOS and Android platforms only**. There is no `@capacitor/macos`
package in the npm registry and no macOS platform in the Capacitor CLI, so the
Android/iOS workflow does not extend to the Mac.

| Route | What it is | Status |
|---|---|---|
| **A — Native SwiftUI + WKWebView** | A real `.app` bundle; the SPA is a bundled resource served over loopback | **Implemented** in `mobile/macos/` |
| **B — Electron wrapper** | Cross-platform desktop shell with a bundled Chromium | Rejected: ~250 MB and hundreds of npm dependencies, against this repository's minimal-dependency and security-first rules |
| **C — Tauri 2 wrapper** | Small system-webview shell with a Rust core | Rejected: introduces a second toolchain the repository does not otherwise require |

Route A adds **zero package dependencies**: no Node runtime, no CocoaPods, no
SwiftPM packages, no bundled browser engine. It uses the system WebKit, so the
installed app is a few megabytes and inherits Safari's platform behaviour.

## 2. Architecture — how the engine gets a real web origin

The V9.1.0.1 engine stores its ledger in IndexedDB (with a localStorage
fallback), uses `navigator.clipboard` behind a secure-context check, exports
files through `blob:` URLs, and ingests files through `<input type="file">`.
All of that needs a normal, trustworthy origin.

`file://` is not one. WebKit gives `file://` pages no storage at all, so
loading the SPA straight from the bundle would silently disable the ledger. A
custom `WKURLSchemeHandler` scheme leaves IndexedDB behaviour
version-dependent. So the app does what a browser does:

```text
Bundle:  IndexEngine.app/Contents/Resources/www/{index.html, sw.js, …}
                │
                ▼
LocalAssetServer   binds 127.0.0.1, ephemeral kernel-assigned port
                │
                ▼
WKWebView  →  http://127.0.0.1:<port>/index.html
```

`http://127.0.0.1` is a *potentially trustworthy* origin, so IndexedDB,
localStorage, `window.isSecureContext` and the PWA manifest behave exactly as
they do in Safari.

Hardening built into `LocalAssetServer.swift`:

| Property | Implementation |
|---|---|
| Loopback only | `bind()` to `127.0.0.1`; never reachable off-machine |
| No port squatting | port `0` — the kernel assigns an ephemeral port each launch |
| No rebinding | requests whose `Host` header is not the loopback origin get `403` |
| Read-only | only `GET` and `HEAD` are served; everything else is `405` |
| No traversal | any path containing `..` is rejected before a file is opened, and the resolved path must stay inside the root |
| No caching | `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` on every response |

The server is started per launch and stopped in
`applicationWillTerminate(_:)`.

### What the shell bridges to AppKit

| Engine behaviour | Native implementation |
|---|---|
| CSV / JSON / rename-script exports (`<a download>` + `blob:`) | `WKDownloadDelegate` → `NSSavePanel`, then reveal in Finder |
| File ingestion (`<input type="file">`) | `WKUIDelegate.runOpenPanelWith` → `NSOpenPanel` |
| `window.confirm` before a destructive restore | `NSAlert` with Continue/Cancel |
| `window.prompt` for custom codes and legacy JSON import | `NSAlert` with a text field |
| `window.alert` | `NSAlert` |
| Any navigation outside the bundled origin | cancelled and opened in the default browser |

### Deliberate difference from the browser

`v9/sw.js` registers only when `location.protocol === 'https:'` or
`location.hostname === 'localhost'`. The desktop app serves from
`http://127.0.0.1:<port>`, so **the offline service worker does not register
in the macOS app**. That is intentional, not a defect: the shell is already
100% local, and skipping the service worker removes any chance of a stale
cached copy of the engine being served over a fresh bundle. The file is still
shipped so the PWA sidecars stay identical to `v9/`.

## 3. Prerequisites

- A Mac running macOS 13.0 or later to *run* the app.
- **Xcode 26.0 or later** and its Command Line Tools to *build* it.
- Node.js 20.19 or newer **only** to run the asset-sync and verification
  scripts. The app itself has no runtime dependency on Node.
- An Apple Developer Program membership for any signed distribution path.
  Ad-hoc/unsigned builds need no membership.

```sh
xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

## 4. Sync, verify, and open

From the repository root:

```sh
npm run macos:sync     # copy v9/ → mobile/macos/IndexEngine/Resources/www
npm run macos:verify   # static checks (runs on any OS, including Linux CI)
npm run macos:check    # both of the above
open mobile/macos/IndexEngine.xcodeproj
```

`npm run macos:check` is part of `npm run lint`, so it runs in CI on every
push. It asserts:

- the bundled `www/index.html` is **byte-identical** to `v9/index.html`;
- bundle id `org.efnai.indexengine`, macOS 13.0+ target, `ARCHS = arm64 x86_64`;
- version `9.1.0.1` / build `90101` matching the root `package.json`;
- hardened runtime enabled and the checked-in `Info.plist` in use;
- App Sandbox on, `network.server` on, **`network.client` absent**;
- every macOS AppIcon slot present at the correct pixel size;
- all eight Swift sources referenced by the project exist on disk.

In Xcode, select the **IndexEngine** scheme and **My Mac**, then press **Run**.

## 5. Build from the command line

```sh
npm run macos:install            # build, verify, and install into /Applications
npm run macos:build              # universal Release .app (unsigned)
npm run macos:archive:unsigned   # unsigned Release .xcarchive
npm run macos:package            # ZIP into mobile/macos/dist/
```

**Prefer `npm run macos:install`.** It rebuilds, refuses to install a bundle
that is missing the engine, quits a running instance, *replaces* rather than
merges the bundle in `/Applications`, clears the quarantine attribute, and then
verifies the installed copy. Manual `cp -R` is the one step in this workflow
that fails silently — see the troubleshooting table.

Products:

```text
mobile/macos/DerivedData/Build/Products/Release/IndexEngine.app
mobile/macos/build/Index-Engine.xcarchive
mobile/macos/dist/IndexEngine-9.1.0.1-macos-universal.zip
```

`macos:build` passes `CODE_SIGNING_ALLOWED=NO`. A successful build proves the
project compiles and links; it is **not** a notarized distribution artifact.
Confirm the binary is universal after any build:

```sh
lipo -archs mobile/macos/DerivedData/Build/Products/Release/IndexEngine.app/Contents/MacOS/IndexEngine
# expected: arm64 x86_64
```

## 6. Distribution path 1 — ad-hoc / unsigned (personal use)

This is the path CI verifies end to end. No Apple Developer account is needed.

```sh
npm run macos:build
npm run macos:package
open mobile/macos/dist
```

Drag `IndexEngine.app` to `/Applications`. Because it is unsigned, Gatekeeper
refuses a plain double-click the first time:

1. Right-click (or Control-click) the app and choose **Open**.
2. Confirm the dialog once. Subsequent launches work normally.

Alternatively, ad-hoc sign it yourself — this does not satisfy Gatekeeper on
other people's Macs, but it lets the bundle carry its entitlements, which is
what actually enables the App Sandbox:

```sh
codesign --force --deep --sign - \
  --entitlements mobile/macos/IndexEngine/IndexEngine.entitlements \
  mobile/macos/DerivedData/Build/Products/Release/IndexEngine.app
```

> Ad-hoc signing exercises the sandbox, including the loopback server. If you
> later see the app fail to load with an empty window, re-run without the
> sandbox before assuming the engine is at fault — an entitlement gap is the
> more likely cause.

## 7. Distribution path 2 — Developer ID, notarized DMG

This is the correct path for distributing outside the Mac App Store. It needs
credentials this repository cannot hold.

**Once, on your Mac:**

```sh
security find-identity -v -p codesigning          # pick your Developer ID Application identity
xcrun notarytool store-credentials "index-engine" \
  --apple-id you@example.com \
  --team-id TEAMID12345 \
  --password <app-specific-password>
```

The Team ID is ten characters, shown under Membership on
<https://developer.apple.com/account>. The password is an **app-specific
password**, never your Apple ID password. The keychain profile stores it in
Keychain; nothing is written to the repository.

**Then:**

```sh
export SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID12345)"
export NOTARY_PROFILE="index-engine"
npm run macos:sign
```

`scripts/sign-app.sh` rebuilds with `ENABLE_HARDENED_RUNTIME=YES`, signs with
the entitlements file, verifies with `codesign --verify --deep --strict`,
submits the bundle to Apple's notary service, staples the ticket, then packages
a DMG and notarizes and staples that too. It fails loudly if any credential is
missing rather than producing something that merely looks signed.

Use `--sign-only` to stop after `codesign`. In CI, supply the same variables as
**encrypted secrets** and never echo them:

```yaml
env:
  SIGN_IDENTITY: ${{ secrets.MACOS_SIGN_IDENTITY }}
  NOTARY_APPLE_ID: ${{ secrets.MACOS_NOTARY_APPLE_ID }}
  NOTARY_TEAM_ID: ${{ secrets.MACOS_NOTARY_TEAM_ID }}
  NOTARY_PASSWORD: ${{ secrets.MACOS_NOTARY_PASSWORD }}
```

Verify a finished build the way a recipient's Mac will:

```sh
spctl --assess --type execute --verbose=4 /Applications/Index\ Engine.app
xcrun stapler validate /Applications/Index\ Engine.app
```

## 8. Distribution path 3 — Mac App Store

The project is already configured for it: App Sandbox is enabled,
`ITSAppUsesNonExemptEncryption` is `false`, hardened runtime is on, and the
bundle id matches the iOS app.

1. Register `org.efnai.indexengine` in App Store Connect. It is the same id as
   the iOS app, which is allowed as long as the two are distinct apps with
   distinct bundle ids at the platform level — Apple treats the iOS and macOS
   bundle id namespaces separately, but confirm the id is free before
   submitting.
2. Archive in Xcode with **Product > Archive** using the
   **Apple Distribution** certificate and a Mac App Store provisioning profile.
3. In Organizer, **Distribute App > App Store Connect**, upload, and complete
   App Store Connect's privacy, age-rating, export-compliance, screenshot and
   review-note questions.
4. Describe the optional AI feature and its data flow accurately. Do not infer
   the privacy label from the fact that the default store is local — the label
   has to match what the shipped binary can actually do.

Two macOS-specific review items to expect:

- **Sandbox and the local server.** The app listens on loopback. Apple grants
  `com.apple.security.network.server` for this, but review may ask why a local
  server is needed; the answer is that WebKit gives `file://` origins no
  storage, so the ledger would not persist.
- **Outbound network.** The shipped entitlement set deliberately omits
  `com.apple.security.network.client`. If you add it to enable the optional AI
  extraction, the App Store privacy disclosure must reflect that.

## 9. Acceptance checklist

Run these on real hardware, at least once on Apple Silicon and once on Intel:

- [ ] Clean launch with Wi-Fi off. The engine opens and the header shows
      `v9.1.0.1`; no external request is attempted.
- [ ] Build a name through all twelve slots; confirm the Smart Review Queue
      routing and the `Part2` duplicate disambiguation behave as documented.
- [ ] Ingest files: choose two, then **cancel** a third selection. Cancellation
      must not create a record.
- [ ] Export CSV, the encrypted `.efnai-vault.json`, and both rename scripts.
      Each opens a save panel; the file lands where chosen and is revealed in
      Finder.
- [ ] Restore the vault with the correct passphrase; confirm a wrong
      passphrase and a tampered file are both rejected.
- [ ] Quit and relaunch. The ledger, review queue, taxonomy, and audit chain
      must all survive — this is the check that would fail if the app ever
      fell back to a `file://` origin.
- [ ] Confirm persistence actually came from IndexedDB and not the localStorage
      fallback: check that the Schema & Settings tab does not report
      `localStorage fallback` as the storage mode.
- [ ] Trigger `window.confirm` (restore) and `window.prompt` (custom code,
      legacy JSON import) and confirm each appears as a native sheet, not a
      no-op.
- [ ] Try to open an external link, if any is added later, and confirm it
      leaves the app instead of rendering inside it.
- [ ] Run the app from a **signed, sandboxed** build at least once. CI's
      unsigned build does not enforce the sandbox.
- [ ] Check `Activity Monitor` while idle: one process, no runaway CPU.
- [ ] Verify the app appears with the correct icon in Finder, Dock, and
      `About This Mac`-style About panel.

## 10. Update the bundled SPA

After editing `v9/index.html`:

```sh
npm ci
npm run build:spa      # if Tailwind classes changed
npm run macos:sync     # re-copy the bundle
npm run macos:check    # re-verify, including the byte-identical check
npm run macos:build
```

Never edit `mobile/macos/IndexEngine/Resources/www/` — it is regenerated and
git-ignored. There is one engine; the copy is not a fork.

To redraw the app icon after changing `v9/icon.svg`:

```sh
npm install --no-save @resvg/resvg-js
node mobile/macos/scripts/build-icons.mjs
```

The rendered PNGs are committed, so a clean clone never needs the rasterizer.

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Empty window with “The local engine could not start” | A **stale** `.app` is still in `/Applications` — an old bundle that predates the asset sync, even though the freshly built one is fine | Run `npm run macos:install`, which replaces the bundle instead of merging into it. Confirm with `ls "/Applications/Index Engine.app/Contents/Resources/www"` |
| `ls: .../Contents/Resources/www: No such file or directory` | Same stale-bundle cause | `npm run macos:install` |
| `cp -R` produced `/Applications/Index Engine.app/IndexEngine.app` | `cp -R` copies *inside* an existing bundle rather than replacing it | `rm -rf` the destination first, or just use `npm run macos:install` |
| Empty window after a confirmed-good build | `www` was never synced | `npm run macos:sync`, then `npm run macos:build` |
| `xcrun: error: unable to find utility "xcodebuild"` | Command Line Tools not selected | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` |
| Build fails on `www in Resources` | Missing generated bundle | Run `npm run macos:sync` before `xcodebuild` |
| `lipo -archs` prints only `arm64` | `ONLY_ACTIVE_ARCH` overrode `ARCHS` | Build the **Release** configuration (`ONLY_ACTIVE_ARCH = NO`) |
| Ledger is empty after every quit | The page is not on a persistent origin | Confirm the app loads `http://127.0.0.1:<port>/index.html`; a `file://` load has no storage |
| Exports silently do nothing | Download delegate not reached | Confirm the export path still uses a `blob:` URL and `<a download>`; see `BrowserController` |
| Save or open panel never appears | Sandbox denied the panel, or the delegate was deallocated | Check `Console.app` for sandbox denials; verify `files.user-selected.read-write` |
| Gatekeeper says the app is damaged | Unsigned or unstapled build | Use Distribution path 1's right-click Open, or sign and notarize per path 2 |
| `no identity found` during signing | Developer ID certificate not in the login keychain | Install the certificate, then re-run `security find-identity -v -p codesigning` |
| Notarization rejected the bundle | Missing hardened runtime or a disallowed entitlement | Sign via `scripts/sign-app.sh`, which sets `ENABLE_HARDENED_RUNTIME=YES`; review added entitlements |

## 12. Verification status

Verified in this Linux workspace: `npm run macos:check` (byte-identical bundle,
identity, target, architecture, version, entitlements, icon sizes, sources) and
`tools/check-version.mjs` alignment across Android, iOS, macOS, and the SPA.

Verified in hosted CI on a `macos-26` runner: universal Release build, unsigned
archive, `lipo` architecture check, Info.plist identity and minimum-system
check, in-bundle SPA equality with `v9/index.html`, and ZIP packaging.

**Not verified anywhere yet:** launching the app on a physical Mac, the
acceptance checklist in section 9, signed/notarized distribution, and Mac App
Store submission. Those need a Mac and, for signed paths, your Apple
credentials. See `docs/SESSION-8-REPORT.md`.
