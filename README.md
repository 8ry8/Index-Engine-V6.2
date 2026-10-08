# Index Engine — EFNAI V9.1.0.1

A browser-based legal-document nomenclature and local ledger tool. The current runnable application is the self-contained SPA at [`v9/index.html`](v9/index.html). The older root-level V6.2 page and `Index Engine V6.2 Code` are retained as historical artifacts; they are not the V9 policy or implementation.

## Normative specification

The user-supplied Version 9.1.0.1 text is the master and supersedes older repository editions wherever they conflict. The accessible pasted text was reviewed; the body of section 13 (Addendum) and the PDF binary were not available in this checkout. No claim is made that those unseen materials were reviewed. See [`docs/SPEC-AUDIT.md`](docs/SPEC-AUDIT.md) for source limits, the current contract, conflicts, and unresolved policy questions.

The canonical order is:

```text
DATE, CASE, TYPE, TYPE2, TITLE, VER, PRIV, PRIV2, ORIGIN, ORIGIN2, AUTHOR, ID
```

The filename representation has fourteen period-delimited fields because `DATE` is `YYYY.MM.DD`. `NA` is permitted only in `TYPE2`, `PRIV2`, and `ORIGIN2`. File extensions follow the archive ID and are not a nomenclature part. Mixed-case `CASE`, `TITLE`, and `AUTHOR` examples, eight-digit new `FILE` IDs, and version labels such as `FINAL`, `DRAFT`, `REV`, and `EXE` are supported. A title longer than 35 characters is preserved and sent to Smart Review Queue rather than silently truncated; duplicate disambiguation uses `Part2`, no hyphen.

## Run the SPA

No package install or build is required to use the app:

1. Open `v9/index.html` in a current browser, or
2. From the repository root, run `npm run serve` and open the printed local address.

The app's CSS and JavaScript are inline. It does not require a runtime Tailwind CDN, cloud database, or external service. IndexedDB is primary storage; a one-time additive migration and compatibility fallback support legacy localStorage. The optional Gemini key exists in memory for up to 30 minutes; it is not persisted. Local encrypted backup/restore is supported; cloud sync is not implemented.

## Terminal command engine

[`tools/terminal-engine.html`](tools/terminal-engine.html) is a separate self-contained HTML tool that generates exact copy-paste commands for bash/zsh and PowerShell. It has inline CSS/JavaScript and no runtime external assets or build requirement.

## Development and verification

Requires Node.js 20.19 or newer for root development tooling (Node 22 is recommended); the Capacitor package requires Node.js 22 or newer. Install locked root dev dependencies and run the checks:

```sh
npm ci
npm run lint
npm run check:build
```

Optional maintenance-time CSS rebuilds (the released HTML remains runnable without these steps):

```sh
npm run build:spa
npm run build:terminal
```

`npm run lint` checks cross-platform version alignment and full-SHA workflow pins, validates both shipped HTML artifacts, and runs the Terminal Engine and V9 headless suites. `npm run check:build` rebuilds both self-contained HTML files and fails if the committed artifacts are stale. The tests use jsdom and fake IndexedDB; they are not substitutes for manual verification on each supported browser or device.

## Deployment and project plan

- [`docs/GUIDE-SPA.md`](docs/GUIDE-SPA.md): static SPA deployment, Pages, HTTPS, security, and troubleshooting.
- [`docs/GUIDE-ANDROID.md`](docs/GUIDE-ANDROID.md) and [`docs/GUIDE-IOS.md`](docs/GUIDE-IOS.md): Capacitor setup/build paths and documented Kotlin/Compose and SwiftUI alternatives.
- [`docs/GUIDE-MACOS.md`](docs/GUIDE-MACOS.md): native macOS app — build, ad-hoc/Developer ID/notarized, and Mac App Store paths.
- [`docs/GUIDE-RELEASE.md`](docs/GUIDE-RELEASE.md): versioned release, checksum, and provenance verification.
- [`.github/workflows/pages.yml`](.github/workflows/pages.yml) and [`.github/workflows/lint.yml`](.github/workflows/lint.yml): pinned, validated Pages deployment and cross-platform CI.
- [`docs/SESSION-PLAN.md`](docs/SESSION-PLAN.md): segregated delivery sessions and acceptance gates.
- Session reports: [`docs/SESSION-4-REPORT.md`](docs/SESSION-4-REPORT.md), [`docs/SESSION-5-REPORT.md`](docs/SESSION-5-REPORT.md), [`docs/SESSION-6-REPORT.md`](docs/SESSION-6-REPORT.md), and [`docs/SESSION-7-REPORT.md`](docs/SESSION-7-REPORT.md).

Sessions 5 and 6 deliver the Android/iOS project skeletons; their native build gates run in CI. Session 7 supplies the validated workflows and release process. Session 8 delivers the macOS application in `mobile/macos/`; Capacitor has no macOS platform, so it is a native SwiftUI + WKWebView Xcode project with zero package dependencies. This repository is not an authenticated multi-user system, WORM archive, legal hold service, or cloud-sync product; define identity, access controls, retention, residency, and backup ownership before organizational production use.
