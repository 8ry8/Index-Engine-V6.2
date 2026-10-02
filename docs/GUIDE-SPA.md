# EFNAI V9.1.0.1 — Beginner SPA Build and Deployment Guide

**Status:** Session 3 deliverable · revision 1<br>
**Master specification:** the user-supplied V9.1.0.1 text in this conversation. Older V6/V7/V8 examples are historical only where they conflict.<br>
**Runtime artifact:** [`v9/index.html`](../v9/index.html) — one immediately runnable HTML file with inline Tailwind CSS and vanilla JavaScript.

> **Source-access note.** The V9.1.0.1 text pasted in the conversation is readable and is used as the current master. The attachment manifest named an Addendum (section 13), but its body and a PDF binary were not available in the workspace. This guide therefore marks properties absent from the accessible text as provisional instead of inventing rules.

## 1. What you are building

EFNAI is a browser Single Page Application (SPA) for intake, classification, review, naming, and ledger operations. It is designed for a beginner, but it must not guess when a legal or archival value is uncertain.

The SPA provides these user-facing areas:

| Screen | Minimum behavior |
|---|---|
| Dashboard | Counts for ready, queued, committed, and failed records; recent activity and policy warnings |
| Intake | Drag/drop and picker; original filename, extension, MIME type, size, source, and hash metadata |
| 12-part constructor | One field for every policy slot; visible help, live validation, copyable preview |
| Taxonomy browser | Search and explain TYPE, TYPE2, PRIV, PRIV2, ORIGIN, ORIGIN2, and VER codes |
| Smart Review Queue | Show uncertainty, evidence, and attributed resolution; never silently convert a guess into a commit |
| Ledger | Find records; verify the chain; export a CSV or encrypted backup |
| Search | Filename segments and ledger metadata; OCR search only where extracted text is actually available |
| Case Package Builder | Select and order records; export a manifest and chronology; protect original IDs and hashes |

### Master filename order

```text
[YYYY.MM.DD].[CASE].[TYPE].[TYPE2].[TITLE].[VER].[PRIV].[PRIV2].[ORIGIN].[ORIGIN2].[AUTHOR].[ID]
```

There are **12 semantic parts and 14 period-delimited fields** because the DATE part itself contains two periods. An optional file extension (for example `.pdf`) is file metadata after the ID; it is **not** a thirteenth nomenclature part.

| Part | Master rule |
|---|---|
| DATE | `YYYY.MM.DD` |
| CASE | Stable matter/project label, e.g. `SanchezHousing` |
| TYPE | Primary category from the V9.1.0.1 TYPE taxonomy |
| TYPE2 | Secondary subtype or `NA` |
| TITLE | Human-readable summary; no embedded period. The separate operator-confirmed `>35` rule routes uncertainty to SRQ; never silently truncate. |
| VER | Examples include `v01`, `DRAFT`, `FINAL`, `REV`, and `EXE` |
| PRIV | Primary confidentiality category |
| PRIV2 | Secondary sensitivity marker or `NA` |
| ORIGIN | Primary source family |
| ORIGIN2 | Specific source marker or `NA` |
| AUTHOR | Stable author tag; the master examples use forms such as `BKing` and `JSmith` |
| ID | Immutable archive identifier; master examples use eight digits after `FILE` |

`NA` is allowed **only** in TYPE2, PRIV2, and ORIGIN2. Do not use V6.2's provisional Bates/venue/subpoena extensions as if they were V9.1.0.1 policy: the master names the three permanent secondary fields explicitly.

## 2. Choose an implementation shape

| Option | Good fit | Trade-off | EFNAI recommendation |
|---|---|---|---|
| **Vanilla JS, one HTML file** | Small, portable, offline-capable naming tools | You must keep the UI organized without a component framework | **Canonical deliverable.** Keep HTML, inline CSS/Tailwind output, and JavaScript in `v9/index.html`. |
| Vite + React + TypeScript | Larger team, shared components, extensive UI tests | Adds a build pipeline and multiple source files | Optional future refactor only. If chosen, ship a generated, self-contained HTML artifact as the release output. |
| Next.js static export | A larger static site with many content routes | Server features do not run on GitHub Pages; export paths and asset prefixes need care | Not needed for this SPA. Do not deploy a server-only feature to a static host. |

### A real requirement conflict: PWA versus one-file delivery

A browser can open the core SPA as one HTML file. An installable PWA additionally requires a **web app manifest** and a **service worker**, and service workers only run on HTTPS or `localhost`—not `file://`. Therefore the core app remains one self-contained file, while optional installability uses the two small sidecars `manifest.webmanifest` and `sw.js` (plus an icon). The service worker below caches only the static app shell; it must never cache user documents, ledger exports, or API responses.

## 3. Prerequisites and local checkout

Use Node.js 20.19 or newer for root development tooling; Node.js 22 is recommended. Git and a GitHub account are needed only for clone and deployment. Confirm the toolchain:

```sh
node --version
npm --version
git --version
```

Clone the repository, install the test/build tools, and verify the baseline before editing:

```sh
git clone https://github.com/8ry8/Index-Engine-V6.2.git
cd Index-Engine-V6.2
npm install
npm test
```

The deployable SPA is `v9/index.html`. Open it directly for a quick local preview, or use the local server so IndexedDB, service workers, and browser APIs behave as they do on HTTPS:

```sh
npm run serve
```

Open the URL printed by the server (normally `http://localhost:8080/v9/`). If the browser's storage is empty, the app initializes a fresh local profile. **Do not test real confidential files in a shared or public browser profile.**

## 4. Keep Tailwind in the single-file artifact

Tailwind utility classes are used in the HTML and JavaScript templates. Runtime CDN loading would make an allegedly self-contained page depend on the network and would fail in offline preview. This repository compiles Tailwind v4 during maintenance and inlines the generated CSS into the HTML; **running the SPA does not require a build step**.

After changing a class in `v9/index.html`, rebuild the inline CSS and run the suite:

```sh
npm run build:spa
npm test
```

The build helper scans `v9/index.html`, replaces the inline CSS block, and removes its temporary CSS file. Do not add a runtime Tailwind `<script src="https://…">` tag. No remote font or icon is required; system font stacks and the local SVG icon keep the shell self-contained.

## 5. Implement the policy before automation

Build in this order:

1. **Taxonomy data.** Keep the V9.1.0.1 dictionaries centralized. Primary and secondary categories must be validated from the same data the dropdowns display.
2. **Manual constructor.** Display all 12 slots in the policy order. Treat the extension (`pdf`, `docx`, and so on) as separate file metadata.
3. **Serializer/parser.** Use one serializer and one parser. The parser reassembles DATE from its three dot-fields, reads 12 semantic parts, and can recognize the optional file extension after the immutable ID.
4. **Validator.** Validate dictionary membership, DATE, reserved OS names, illegal characters, filename length, the title ceiling, and ID uniqueness. Show a specific correction, not only “invalid.”
5. **Smart Review Queue.** Low confidence, missing or ambiguous metadata, title overflow, collision risk, or a policy conflict must be quarantined. Every exit records `resolvedBy` and `resolvedAt`.
6. **Ledger.** Hash the original bytes before a move/rename; append the decision, filename, timestamp, source, file size, and integrity hash. Never reuse an ID.
7. **Archive/search/package tools.** Add these after the naming and audit contracts are stable.
8. **AI suggestions and folder/cloud automation.** Add only as optional proposal sources; they cannot bypass validation or human review.

### Beginner UI checklist

- Keep explanations visible; hover-only help is insufficient for touch users.
- Show a live filename preview and a separate extension field.
- Explain why `NA` was selected; never silently invent a secondary classification.
- If TITLE is too long, **do not truncate it**. Mark it uncertain and route it to the Smart Review Queue.
- The queue is not a rename list. Queued rows never appear in generated rename scripts until they are resolved and committed.
- Use conservative confidentiality classification. A filename can expose information through file pickers, mail clients, and sync services even if the document contents are encrypted.

## 6. Persistence and browser security

The V9.1.0.1 security guide calls for least access, append-only audit history, immutable IDs, and hash-before-move checks. Use IndexedDB for the browser ledger and review queue. Keep a one-time, additive migration from the older `localStorage` keys; do not clear legacy data until it has been imported and verified.

| Data | Browser handling |
|---|---|
| Ledger and queue | IndexedDB; explicit export; integrity verification before restore |
| Taxonomy and preferences | IndexedDB; validate imported values |
| AI API key | Memory only with a visible expiry. Never write it to cleartext `localStorage`, IndexedDB, or an export. |
| Uploaded documents | Do not persist document bytes or cache them in a service worker unless a separate approved retention policy explicitly allows it. |
| Encrypted backup | AES-256-GCM; PBKDF2-SHA256 with at least 600,000 iterations; random salt and IV; include KDF/cipher versions and `keyId` in the header. |

Browser storage is **not** an access-control system. A shared workstation, browser profile, or device account still requires operating-system access controls. For production organizations, define identity/RBAC, backup ownership, retention, and region requirements before enabling cloud sync. Those deployment properties are not fully determined by the accessible V9.1.0.1 text.

## 7. Optional PWA installation

The static shell in `v9/sw.js` is deliberately narrow. Test it on `localhost` first:

1. Run `npm run serve`.
2. Open the SPA in a current Chromium-based browser.
3. Open Developer Tools → **Application** → **Manifest** and verify the app name, scope, and local SVG icon.
4. Open **Service Workers** and confirm the worker scope is only the `/v9/` app directory.
5. Use **Offline** mode and reload. The shell may load; a document, ledger export, or Gemini response must not be present in Cache Storage.
6. Restore network access and reload. The worker should replace the static shell with the newest version.

A PWA is an optional shell, not a substitute for the native Android and iOS work in their own sessions. **Never cache uploaded legal documents merely to make offline mode look complete.**

## 8. Deploy to GitHub Pages

This repository includes `.github/workflows/pages.yml`. It uploads only `v9/`, so the published root contains the SPA and its optional PWA sidecars—not the legacy V6.2 page or development tests.

### One-time GitHub setting

1. Push the project to GitHub.
2. Open **Settings → Pages** for the repository.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Ensure Actions are permitted to request the Pages deployment token.

### Publish from the default branch

Merge the tested changes to `main`, or use the workflow's manual dispatch from a selected branch:

```sh
git status --short
git add v9 docs .github/workflows/pages.yml package.json tools
npm test
git commit -m "release: publish EFNAI v9 SPA"
git push origin main
```

The Pages workflow runs on a push to `main`. Watch **Actions → Deploy EFNAI v9 SPA** until the `deploy` job succeeds. The project site URL is normally:

```text
https://<github-owner>.github.io/<repository-name>/
```

The deployed app's relative URLs (`./manifest.webmanifest`, `./sw.js`) work under a repository subpath. This repository's working branch in the current Arena session is fixed to `arena/01a0fc76-index-engine-v6-2`; do not rename that branch. Merge it through a pull request to the default branch before expecting the normal `main` deployment trigger.

### Custom domain and HTTPS

1. Enter the custom domain under **Settings → Pages → Custom domain**.
2. Create DNS records at the domain registrar exactly as GitHub Pages displays. For an apex domain, use GitHub's current A/AAAA records; for a subdomain, use a CNAME pointing to `<owner>.github.io`.
3. Wait for DNS verification, then enable **Enforce HTTPS**.
4. Test the root URL, `/manifest.webmanifest`, and `/sw.js` on the custom hostname.
5. Keep the generated `CNAME` associated with the deployed `v9/` artifact if Pages requires it for your repository configuration.

Do not guess DNS addresses from an old tutorial; GitHub may update its published records. The Pages settings screen is the source for the current values.

## 9. Content Security Policy

The HTML meta CSP is a fallback for static hosting. GitHub Pages does not let a repository set arbitrary HTTP response headers, so a meta policy cannot replace server headers in all contexts. If a reverse proxy or managed host supports response headers, set the same policy there and test it in the browser console.

The no-CDN default is intentionally restrictive:

```text
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'none'
```

`'unsafe-inline'` is required by the single-file artifact's inline script and styles. A later hardening pass can replace it with a generated script hash and style hash; do not weaken CSP with `https:` or `*`. Remove the Gemini host from `connect-src` if AI refinement is disabled. External connectors should use an authenticated backend rather than exposing cloud-service credentials in the browser.

## 10. Performance and release checks

Run Lighthouse against the HTTPS Pages URL in a clean profile. Initial targets for the shell are:

| Metric / control | Target |
|---|---|
| Lighthouse Performance | ≥ 90 on a representative mobile profile |
| Accessibility | ≥ 95; keyboard navigation and visible focus are mandatory |
| Best Practices | ≥ 95; no mixed content or insecure secret storage |
| SEO | ≥ 90 for the public landing shell; legal records themselves are not indexed |
| Static shell transfer | ≤ 500 KB compressed, excluding user-selected documents |
| Network requests on initial load | Same-origin only; no Tailwind CDN or remote fonts |
| Service-worker cache | Static app shell only; zero user documents/API responses |
| Filename policy | 12 semantic parts, 14 dot-fields before optional extension; all secondary slots present |

Before deployment, run:

```sh
npm run build:spa
npm test
```

Then inspect the browser console, test 320 px and 1280 px viewports, exercise keyboard-only navigation, and verify that an intentionally ambiguous or over-length record reaches SRQ rather than being auto-corrected.

## 11. Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank CSS or unstyled page while offline | Someone restored a runtime Tailwind CDN dependency | Run `npm run build:spa`; remove remote CSS/script tags |
| PWA install prompt absent on `file://` | Service workers require HTTPS or `localhost` | Use localhost or deployed HTTPS |
| Pages serves V6.2 instead of V9 | Wrong artifact path | Confirm workflow uploads `v9`, not repository root |
| `manifest.webmanifest` returns 404 | The site was copied without the PWA sidecars or the URL has the wrong base path | Deploy the complete `v9/` directory |
| IndexedDB appears empty after upgrade | Browser profile changed, origin changed, or migration did not complete | Restore from a verified encrypted backup; do not clear the old profile until verified |
| Browser blocks Gemini call | CSP, network, key expiry, quota, or API restrictions | Inspect the specific recoverable error; re-enter a session key or disable AI and continue locally |
| A file title is rejected | It exceeds the operator-confirmed 35-character threshold or violates a character rule | Review or create a concise title; do not rely on automatic truncation |

## 12. Acceptance checklist

- [ ] Open `v9/index.html` without a bundler; the core UI and validation render.
- [ ] The CSS and JavaScript required by the core app are inline; no runtime Tailwind/CDN dependency exists.
- [ ] Every one of the 12 master slots appears in canonical order.
- [ ] DATE's three dot-fields are parsed as one semantic part; the optional extension is not counted as a part.
- [ ] Invalid and uncertain records are visible and explain how to resolve them.
- [ ] Queued records are absent from generated rename scripts.
- [ ] The API key expires from memory and never appears in browser storage or encrypted ledger exports.
- [ ] A verified Pages workflow publishes only the `v9/` static asset directory.
- [ ] PWA cache contains the app shell only; user-selected files and API responses are never cached.
- [ ] A second operator can follow this guide without installing a framework or looking up undocumented commands.

---

## Annotation notes

1. The beginner-facing purpose and feature list come from the pasted V9.1.0.1 Master README and SPA Implementation Guide.
2. The nomenclature, `NA` scope, source codes, version examples, and immutable ID rule come from the pasted 12-Part Policy and Expanded Taxonomy.
3. The 35-character overflow-to-SRQ behavior was separately confirmed by the operator before this source paste; the accessible pasted pages do not restate its numeric threshold.
4. IndexedDB, AES-GCM, PBKDF2 iteration floor, and cross-tab serialization are implementation hardening, not a claim that the browser itself enforces organizational access control.
5. A PWA's manifest and service worker are separate browser-required resources; the core SPA remains one HTML file.
