# Contributing

Thanks for improving Index Engine. Keep changes focused, reviewable, and consistent with the active V9.1.0.1 contract.

## Before opening a pull request

1. Open an issue or discuss the proposed change if it alters policy, stored data, security, release behavior, or native-platform permissions.
2. Never include real client/legal documents, names, API keys, encrypted backups, local ledgers, device identifiers, signing credentials, or provisioning files.
3. Preserve the distinction between accessible source and unavailable materials. Do not claim to have reviewed section 13's inaccessible body or the PDF binary.
4. Keep the canonical SPA as one self-contained HTML file with inline CSS/JavaScript and no runtime build/CDN requirement. Maintenance-time CSS changes should use the checked-in Tailwind build scripts and commit the rebuilt file.
5. Keep Android and iOS wrappers on the same canonical `v9/index.html`; do not fork policy rules into a native shell without golden-case parity tests.
6. For work planned as a delivery session, keep its artifact, report, and commit separate and update `docs/SESSION-PLAN.md`.

## Local checks

Requires Node.js 20.19 or later for root tooling. The native package requires Node.js 22 or later. From the repository root:

```sh
npm ci
npm run lint
npm run check:build
npm audit --audit-level=moderate
```

`npm run lint` checks release-version alignment and full-SHA workflow pins, validates `v9/index.html` and `tools/terminal-engine.html`, and runs the Terminal and V9 headless test suites. The HTML validator intentionally permits inline `style` attributes because the shipped tools are self-contained; all other standard rules remain active.

For Capacitor changes:

```sh
cd mobile/capacitor
npm ci
npm test
npm audit --audit-level=moderate
```

Run `npm run android:debug` with JDK 21 and Android API 36 installed. Run `npm run ios:simulator` and `npm run ios:archive:unsigned` on macOS with Xcode 26 or later. Do not describe a static config check as a native build.

## Pull requests and releases

- Keep PRs narrow; explain behavior, risk, and test evidence. Include screenshots only when they contain no private data.
- All GitHub Actions in `.github/workflows/` must be pinned to full commit SHAs with a version comment. Update pins deliberately and review upstream release notes/permissions.
- Protect `main` with required CI checks and CODEOWNER review in repository settings. Protect `v*` release tags so only authorized maintainers can create or move them.
- Releases are produced by pushing an annotated `v<package-version>` tag. The tag must point to the reviewed source commit and match root/mobile package, Android, and iOS versions. Do not upload manually built or unsigned store packages as if they were production releases.
- Follow [`docs/GUIDE-RELEASE.md`](docs/GUIDE-RELEASE.md) to verify the archive checksum and GitHub build provenance.
