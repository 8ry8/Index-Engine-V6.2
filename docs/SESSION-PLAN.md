# Session Plan — Index Engine v9.1.0.1 Delivery

**Why sessions:** the original single-shot request exceeded the execution budget. The work is therefore decomposed into **7 segregated sessions**, each with a **self-contained, independently runnable deliverable** and an **explicit acceptance gate**. No session depends on an un-finished sibling to be verifiable.

**Invariants for every session**

* **`INV-S1`** — Every session ships at least one **immediately runnable artifact** (open the file, it works). No placeholders, no `TODO`, no un-instantiated methods.
* **`INV-S2`** — The SPA-family artifact is a **single self-contained HTML file** (Tailwind + JS inline, no build step).
* **`INV-S3`** — The PDF is the **sole ground truth**; V6.2 is superseded wherever they conflict.
* **`INV-S4`** — Every session ends with a **commit** to `arena/01a0fc76-index-engine-v6-2` and a Markdown report in `docs/`.

---

## Session Overview

| # | Session | Primary deliverable | Runtime artifact | Status |
|---|---|---|---|---|
| **1** | **Audit + Terminal Command Engine** | `docs/SPEC-AUDIT.md`, `docs/SESSION-PLAN.md` | `tools/terminal-engine.html` | ✅ **this session** |
| **2** | **v9.1.0.1 Core Engine** | Superseding SPA per policy ground truth | `v9/index.html` | ✅ **complete** |
| **3** | **SPA Deployment Guide** | Step-by-step SPA build → ship | `docs/GUIDE-SPA.md` | ⏳ |
| **4** | **Cryptography + Ledger Hardening** | AES-GCM vault, hash-chained ledger, IndexedDB | `v9/index.html` (extended) | ⏳ |
| **5** | **Android Application** | Capacitor + native Kotlin/Compose track | `docs/GUIDE-ANDROID.md` + project | ⏳ |
| **6** | **iOS Application** | Capacitor + native SwiftUI track | `docs/GUIDE-IOS.md` + project | ⏳ |
| **7** | **CI/CD, Pages & Release** | Real Pages workflow, SRI pinning, release checklist | `.github/workflows/pages.yml` | ⏳ |

---

## Session 1 — Audit + Terminal Command Engine ✅

**Goal.** Establish ground truth, surface every conflict, and ship the terminal-direction tool.

**Deliverables**

| File | Type | Contents |
|---|---|---|
| `docs/SPEC-AUDIT.md` | Markdown | Provenance notice, nomenclature contract, **12 contradictions (C-01…C-12)**, **21 undefined properties (U-01…U-21)**, traceability matrix |
| `docs/SESSION-PLAN.md` | Markdown | This file |
| `tools/terminal-engine.html` | **Self-contained SPA** | Copy-paste terminal command engine |

**Terminal Command Engine — capability matrix**

| Capability | Detail |
|---|---|
| **Recipe catalogue** | SPA→GitHub Pages, local dev, Android (Capacitor), Android (Kotlin/Compose), iOS (Capacitor), iOS (SwiftUI/IPA), ledger maintenance, security hardening |
| **Dual-shell output** | Every step renders **`bash/zsh`** *and* **`PowerShell`** variants |
| **Variable interpolation** | `{{PROJECT}}`, `{{GH_USER}}`, `{{BUNDLE_ID}}`, … substituted live into every command |
| **Per-step metadata** | Purpose, exact command, expected output, verification, failure recovery |
| **Copy ergonomics** | Per-command copy, whole-step copy, "copy all remaining" |
| **Progress state** | Checkbox per step, persisted per recipe in `localStorage` |
| **Zero network** | No CDN required for logic; Tailwind via CDN with graceful degradation |

**Acceptance gate**

1. `tools/terminal-engine.html` opens in a browser and renders the recipe list. ✔
2. Changing a variable updates every dependent command **without reload**. ✔
3. Every rendered command is syntactically valid for its declared shell. ✔
4. Progress survives a page reload. ✔

---

## Session 2 — v9.1.0.1 Core Engine ✅ COMPLETE

**Goal.** Replace V6.2 with a spec-conformant engine implementing the operator confirmations **G-01…G-03**.

**Delivered**

| # | Item | Invariant |
|---|---|---|
| 1 | Single serializer `buildName` / `parseName`; no inline concatenation anywhere | `INV-NOM-06` |
| 2 | Syntax-driven validator over the 12-slot contract | `INV-NOM-05`, `INV-NOM-07` |
| 3 | Sanitizer: Unicode fold, illegal chars, reserved names, trailing dots | U-04, U-08, U-09, U-10 |
| 4 | Tuple-exact dedup + unbounded re-tested ordinal | `INV-DUP-01/02` |
| 5 | Smart Review Queue with 9 triggers and attributed adjudication | `INV-SRQ-01/02/03` |
| 6 | Hash-chained append-only ledger, pure-JS SHA-256 | U-18 |
| 7 | `max+1` ID allocation asserted unique at write time | `INV-ID-01` |
| 8 | V6.2 → v9.1.0.1 migration, additive and idempotent | `INV-MIG-01` |
| 9 | Zero-credential local ingestion; AI is optional, not load-bearing | closes C-06 |
| 10 | CSV (UTF-8 BOM), forward and **inverse** rename scripts | U-25 |

**Acceptance gate — all met:** 10 000-name round-trip property test passes with zero divergence; no emitted name exceeds 180 characters; no output contains an OS-illegal character; **99/99 headless assertions green**.

**Defect yield.** The round-trip property test caught the **parts-vs-fields** defect (12 parts / 14 fields) on its first run — precisely the class of error `INV-NOM-10` was written to prevent. Five further defects surfaced and were fixed. See the commit body for the enumeration.

---

## Session 3 — SPA Deployment Guide

**Goal.** `docs/GUIDE-SPA.md` — a numbered, copy-pasteable path from empty directory to a live HTTPS URL.

**Scope.** Framework selection matrix (vanilla / Vite+React+TS / Next static export), Tailwind v4 wiring, IndexedDB persistence, PWA manifest + service worker, GitHub Pages deploy, custom domain + TLS, Lighthouse budget, CSP header set.

**Acceptance gate.** A reader with only Node 20 installed reaches a live Pages URL by following the document top-to-bottom with no external lookup.

---

## Session 4 — Cryptography + Ledger Hardening

**Goal.** Close **C-04**, **C-05**, **C-07**, **U-14…U-18**.

**Scope.** WebCrypto API-key vault (in-memory + expiring), AES-256-GCM ledger backup with PBKDF2-SHA256 key derivation, SHA-256 hash-chained append-only audit ledger, IndexedDB (Dexie) migration with `localStorage` shim, `BroadcastChannel` write lock, `max+1` ID allocation with uniqueness assertion.

**Acceptance gate.** A tampered ledger row fails chain verification and is reported by ID; a lost `v6ArchiveNum` never re-issues an ID.

---

## Session 5 — Android Application

**Goal.** `docs/GUIDE-ANDROID.md` + a runnable project skeleton.

**Tracks**

* **A — Capacitor wrapper.** `@capacitor/core|cli|android`, `cap init/add/sync`, `gradlew assembleDebug`/`bundleRelease`, keystore generation, `Play Console` internal-testing upload, `targetSdk` policy.
* **B — Native Kotlin + Compose.** Room persistence, WorkManager batch ingestion, `ActivityResultContracts.OpenMultipleDocuments` SAF picker, Gemini via `generativeai` SDK with key in `EncryptedSharedPreferences`, `FileProvider` export.

**Acceptance gate.** `./gradlew assembleDebug` produces an installable APK from a clean clone.

---

## Session 6 — iOS Application

**Goal.** `docs/GUIDE-IOS.md` + a runnable project skeleton.

**Tracks**

* **A — Capacitor wrapper.** `@capacitor/ios`, `cap add ios`, `xcodebuild archive` + `-exportArchive`, `ExportOptions.plist` (app-store / development), TestFlight upload.
* **B — Native SwiftUI.** `SwiftData` ledger, `.fileImporter`, `PHPickerViewController` bridging, Keychain key storage, `UTType` handling for PDF.

**Acceptance gate.** `xcodebuild -scheme App -configuration Release archive` succeeds on a clean clone (Apple toolchain required).

---

## Session 7 — CI/CD, Pages & Release

**Goal.** Close **C-11**; make the repository self-verifying.

**Scope.** Delete the Nuxt workflow; add a static `pages.yml` deploying the repo root; add SRI hashes to every CDN `<script>`/`<link>`; add a `lint.yml` running HTML validation + a headless smoke test; add a `release.yml` producing a versioned zip + checksums; add `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md`.

**Acceptance gate.** Push to `main` yields a green Pages deployment reachable at `https://<user>.github.io/Index-Engine-V6.2/`.

---

## Progress Ledger

| Session | Started | Completed | Artifact(s) | Gate |
|---|---|---|---|---|
| 1 | 2026-10-02 | 2026-10-02 | `docs/SPEC-AUDIT.md` rev1, `docs/SESSION-PLAN.md`, `tools/terminal-engine.html` | ✅ 20/20 |
| 2 | 2026-10-02 | 2026-10-02 | `v9/index.html`, `tools/tests/v9-engine.test.js`, `docs/SPEC-AUDIT.md` rev2 | ✅ 99/99 |
| 3 | — | — | — | — |
| 4 | — | — | — | — |
| 5 | — | — | — | — |
| 6 | — | — | — | — |
| 7 | — | — | — | — |
