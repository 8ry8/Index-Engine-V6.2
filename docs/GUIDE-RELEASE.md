# Release and Integrity Guide — Index Engine V9.1.0.1

This repository releases the **standalone V9 SPA/source bundle**, not an unsigned Android or iOS store package. The release workflow accepts an annotated `v<version>` Git tag, reruns the source checks, verifies cross-platform version alignment, builds a versioned ZIP with normalized timestamps, computes a SHA-256 checksum, adds GitHub build provenance, and publishes the ZIP plus checksum as a GitHub Release.

## 1. Release contents and limits

The generated `index-engine-v9.1.0.1.zip` contains:

- `v9/` — canonical one-file V9.1.0.1 SPA and PWA sidecars;
- `tools/terminal-engine.html` — the copy-paste terminal command engine;
- `README.md`, `LICENSE`, `docs/GUIDE-SPA.md`, and `docs/SPEC-AUDIT.md`.

It does **not** contain the historical V6.2 page, development dependencies, test fixtures, local ledgers, generated Android/iOS build folders, API keys, signing material, or a signed mobile app. The Android debug APK and unsigned iOS archive are separate, short-retention CI artifacts for build verification; neither is a Play Store/App Store release.

## 2. Pre-release checks

A maintainer should first merge reviewed code to `main` and verify the required checks:

```sh
npm ci
npm run lint
npm run check:build
npm run check:version
npm audit --audit-level=moderate

cd mobile/capacitor
npm ci
npm test
npm audit --audit-level=moderate
```

The `CI and Lint` workflow builds the Android debug APK on a hosted Ubuntu runner and runs the iOS Simulator build plus unsigned Xcode archive on macOS. Review those logs and artifacts separately. Before a tagged release, confirm:

- GitHub Pages deployed the intended `v9/` tree from `main`;
- the checked-in SPA remains one self-contained HTML file and all PWA sidecars are intentional;
- `npm run check:version` reports a single version across the root/mobile package manifests and lockfiles, Android, iOS, and the V9 document title;
- no credentials, user files, client data, local ledgers, backup exports, `.ipa`, `.apk`, `.xcarchive`, or signing files are staged.

### Version bump rule

`package.json` is the version source. Update the root `package-lock.json` and `mobile/capacitor/package.json`/lockfile to the same four-part version, then update Android `versionName`/`versionCode`, iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`, and the V9 title. The Android/iOS build number is derived as:

```text
major × 10000 + minor × 100 + patch × 10 + revision
```

The four parts must be numeric; `minor < 100`, `patch < 10`, and `revision < 10`. Run `npm run check:version` after the bump. Keep all dependency lockfiles in sync; do not hand-edit generated mobile `www/`, `public/`, Gradle build, Xcode DerivedData, or Pods output.

## 3. Create the release tag

From the reviewed `main` commit whose package version is, for example, `9.1.0.1`:

```sh
git checkout main
git pull --ff-only origin main
npm run check:version
git tag -a v9.1.0.1 -m "Index Engine 9.1.0.1"
git push origin v9.1.0.1
```

The tag must point at the reviewed commit and equal `v` plus the root package version. `.github/workflows/release.yml` rejects a version mismatch or a tag that does not resolve to the triggering commit. Protect `v*` tags with a repository ruleset so unauthorized users cannot create or move release tags. A tag push starts a workflow; it does not rebuild `main` or deploy Pages.

## 4. Workflow outputs

On a valid tag, the workflow:

1. checks out the tag and installs only the root lockfile;
2. runs version alignment, HTML validation, headless tests, reproducible build checks, and npm audit;
3. stages the documented release tree and normalizes file times to the tagged commit timestamp;
4. builds `index-engine-v<version>.zip`, writes `SHA256SUMS.txt`, and verifies it in the runner;
5. publishes a GitHub SLSA build-provenance attestation for the ZIP;
6. creates the GitHub Release and attaches the ZIP and checksum file.

The release workflow uses minimal `contents: write`, `attestations: write`, and `id-token: write` permissions only for the tag-triggered job. All workflow actions are pinned to full commit SHAs with version comments. GitHub-hosted logs, release assets, tagged source, checksum, and attestation provide independent verification points.

## 5. Verify a downloaded release

Replace `9.1.0.1` with the tag you intend to verify:

```sh
mkdir -p release-check && cd release-check
gh release download v9.1.0.1 \
  --repo 8ry8/Index-Engine-V6.2 \
  --pattern 'index-engine-v9.1.0.1.zip' \
  --pattern 'SHA256SUMS.txt'
sha256sum -c SHA256SUMS.txt
unzip -t index-engine-v9.1.0.1.zip
gh attestation verify index-engine-v9.1.0.1.zip \
  --repo 8ry8/Index-Engine-V6.2 \
  --signer-workflow 8ry8/Index-Engine-V6.2/.github/workflows/release.yml
```

Use a current GitHub CLI with `attestation` support and an authenticated GitHub connection. The checksum detects accidental corruption or a mismatched asset; the provenance verification checks that GitHub Actions in this repository produced the ZIP. Also confirm the tag and release belong to the expected repository. A checksum by itself is not a digital signature and does not establish publisher identity.

## 6. Repository settings checklist

In GitHub repository settings, enable Pages with **GitHub Actions** as the source and protect `main` with required `CI and Lint` checks and CODEOWNER review. Protect release tags (`v*`) with a ruleset. Review the Pages URL under `Deploy EFNAI V9.1.0.1 to GitHub Pages` after merge; branch-side workflow validation is not proof that the production Pages deployment completed.

Do not upload client records, raw documents, API keys, signing credentials, or legal exports as release assets or workflow artifacts. See [`SECURITY.md`](../SECURITY.md) for private vulnerability reporting and data-handling limits.
