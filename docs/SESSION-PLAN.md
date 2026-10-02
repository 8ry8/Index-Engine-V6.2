# Session Plan — Index Engine v9.1.0.1 Delivery

**Why sessions:** the original single-shot request exceeded the execution budget. The work is therefore decomposed into **7 segregated sessions**, each with a **self-contained, independently runnable deliverable** and an **explicit acceptance gate**. No session depends on an un-finished sibling to be verifiable.

**Checkout-history reconciliation (2026-10-02).** The initial sandbox snapshot exposed only baseline `a8814bb`. Fetching the fixed Arena branch restored its existing Session 1–3 history through `070c422`; work continues on that same branch and does not rewrite those commits.

**Invariants for every session**

* **`INV-S1`** — Every session ships at least one **immediately runnable artifact** (open the file, it works). No placeholders, no `TODO`, no un-instantiated methods.
* **`INV-S2`** — The SPA-family artifact is a **single self-contained HTML file** (Tailwind + JS inline, no build step).
* **`INV-S3`** — The user-supplied V9.1.0.1 text is normative wherever editions conflict. Only accessible pasted text may be claimed as reviewed; the body of section 13 and the PDF binary were not accessed.
* **`INV-S4`** — Every session ends with a **commit** to `arena/01a0fc76-index-engine-v6-2` and a Markdown report in `docs/`. If a checkout is missing a previously reported commit, disclose the discrepancy and do not pretend it exists.

---

## Session Overview

| # | Session | Primary deliverable | Runtime artifact | Status |
|---|---|---|---|---|
| **1** | **Audit + Terminal Command Engine** | `docs/SPEC-AUDIT.md`, `docs/SESSION-PLAN.md`, report | `tools/terminal-engine.html` | ✅ **delivered; history recovery noted below** |
| **2** | **v9.1.0.1 Core Engine** | Superseding SPA aligned to accessible master text, report | `v9/index.html` | ✅ **delivered; history recovery noted below** |
| **3** | **SPA Deployment Guide** | Step-by-step SPA build → ship, report | `docs/GUIDE-SPA.md`, Pages workflow, PWA shell | ✅ **delivered; history recovery noted below** |
| **4** | **Cryptography + Ledger Hardening** | AES-GCM backup, hash-chained ledger, IndexedDB, report | `v9/index.html` (extended) | ✅ **complete** |
| **5** | **Android Application** | Capacitor wrapper (Kotlin/Compose alternative documented) | `docs/GUIDE-ANDROID.md`, `mobile/capacitor/android/` | ✅ artifact delivered; native build gate queued for Session 7 CI |
| **6** | **iOS Application** | Capacitor SPM wrapper (SwiftUI alternative documented) | `docs/GUIDE-IOS.md`, `mobile/capacitor/ios/` | ⏳ pending |
| **7** | **CI/CD, Pages & Release** | SHA-pinned CI/Pages/mobile builds, checksum + provenance release, governance | `.github/workflows/lint.yml`, `pages.yml`, `release.yml` | ⏳ pending |

---

## Session 1 — Audit + Terminal Command Engine ✅

**Goal.** Establish ground truth, surface every conflict, and ship the terminal-direction tool.

**Deliverables**

| File | Type | Contents |
|---|---|---|
| `docs/SPEC-AUDIT.md` | Markdown | Accessible-source scope, corrected 12-part contract, historical V6.2 conflicts, unresolved-property register, and Session 4 traceability |
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
| **Self-contained delivery** | Inline JavaScript and generated Tailwind CSS; no external runtime assets or build step to open the HTML |

**Acceptance gate**

1. `tools/terminal-engine.html` opens in a browser and renders the recipe list. ✔
2. Changing a variable updates every dependent command **without reload**. ✔
3. Every rendered command is syntactically valid for its declared shell. ✔
4. Progress survives a page reload. ✔

---

## Session 2 — v9.1.0.1 Core Engine ✅ COMPLETE

**Goal.** Replace V6.2 behavior with a V9.1.0.1 engine aligned to the accessible master text and the operator-confirmed `Part2`/title-overflow rules.

**Delivered**

| # | Item | Invariant |
|---|---|---|
| 1 | Single serializer `buildName` / `parseName`; no inline concatenation anywhere | `INV-NOM-06` |
| 2 | Syntax-driven validator over the 12-slot contract | `INV-NOM-05`, `INV-NOM-07` |
| 3 | Sanitizer: Unicode fold, illegal chars, reserved names, trailing dots | U-04, U-08, U-09, U-10 |
| 4 | Tuple-exact dedup + re-tested `Part2` ordinal; review when title would overflow | `INV-DUP-01/02` |
| 5 | Smart Review Queue with 9 triggers and attributed adjudication | `INV-SRQ-01/02/03` |
| 6 | Hash-chained append-only ledger, pure-JS SHA-256 | U-18 |
| 7 | `max+1` ID allocation asserted unique at write time | `INV-ID-01` |
| 8 | V6.2 → v9.1.0.1 migration, additive and idempotent | `INV-MIG-01` |
| 9 | Local extraction remains available without an API key; optional AI resolves an expiring memory-only key at call time | `INV-AI-01/02`, `INV-SEC-02` |
| 10 | CSV (UTF-8 BOM), forward and **inverse** rename scripts | U-25 |

**Acceptance gate — all met:** 10 000-name round-trip property test passes with zero divergence; no emitted name exceeds 180 characters; no output contains an OS-illegal character; **99/99 headless assertions green**.

**Defect yield.** The round-trip property test caught the **parts-vs-fields** defect (12 semantic parts / 14 delimited fields) on its first run — precisely the class of error `INV-NOM-10` prevents. Additional defects surfaced and were fixed during implementation. See `docs/SESSION-2-REPORT.md` and the tests; no absent historical commit is assumed.

---

## Session 3 — SPA Deployment Guide ✅ COMPLETE

**Goal.** Deliver `docs/GUIDE-SPA.md`, a beginner-facing route from checkout to a live HTTPS Pages deployment.

**Delivered.** Canonical one-file vanilla SPA guidance; framework matrix; inline Tailwind v4 maintenance pipeline; IndexedDB/security guidance; optional PWA sidecars; `v9/` Pages workflow; HTTPS/custom-domain steps; CSP and Lighthouse budgets. Added a Node-only static server and removed the broken Nuxt workflow.

**Acceptance gate.** `npm run build:spa`, `npm test`, and syntax checks pass. The HTML has no runtime Tailwind CDN/script dependency. See `docs/SESSION-3-REPORT.md`.

---

## Session 4 — Cryptography + Ledger Hardening ✅ COMPLETE

**Goal.** Close the Session 4 security/storage gaps and reconcile the engine and audit with the accessible user-supplied V9.1.0.1 master text. Do not claim review of the inaccessible section 13 body or PDF binary.

**Delivered.** AES-256-GCM backup/restore using PBKDF2-SHA256 at 600,000 iterations with fresh salt/IV and authenticated metadata; memory-only 30-minute API key; IndexedDB primary storage with additive localStorage migration and journaled fallback; cross-tab serialization; complete-record ledger/audit chains; file SHA-256/metadata-only Integrity Vault; collision-safe max+1 IDs; escaped queue integrity/migration metadata; safely quoted forward/undo rename scripts; CSS inlined in the standalone SPA; corrected spec audit and plan.

**Acceptance gate — passed.** Tampered ledger/audit rows are detected without auto-repair; altered backups and wrong passphrases are rejected; local counters and restores never reduce the ID high-water mark; concurrent IndexedDB append transactions preserve unique IDs and a valid chain; migration is additive and preserves existing IDs. Combined tests: 21/21 Terminal + 24/24 V9; inline-script syntax check plus `npm run build:spa` and `npm run build:terminal` passed. See `docs/SESSION-4-REPORT.md` for exact scope and limits.

---

## Session 5 — Android Application ✅ ARTIFACT DELIVERED · BUILD GATE PENDING CI

**Goal.** Ship a native Android shell around the canonical V9 SPA, an exact beginner guide, and a clean-clone build path.

**Tracks.** Track A (Capacitor) is implemented in `mobile/capacitor/`. Track B (native Kotlin + Compose) is documented as an alternative architecture rather than a second divergent policy engine; it describes Room transactions, WorkManager, SAF URIs, and native exports.

**Delivered.** Locked Capacitor 8.4.3 dependencies, generated Android project/Gradle wrapper, V9 asset sync, debug/release scripts, API 24/36 config, least-permission manifest, disabled backup rules, branded adaptive icon, project verifier, and `docs/GUIDE-ANDROID.md`. The 8.4.3 pin has zero npm audit advisories; 8.5.2 produced moderate CLI dependency advisories at implementation time.

**Acceptance gate.** `npm ci && npm run android:debug` from `mobile/capacitor` must produce `android/app/build/outputs/apk/debug/app-debug.apk`. Project/config/security checks pass locally; this Linux workspace lacks JDK 21 and Android SDK, so the actual APK build is delegated to the Session 7 hosted Android CI job. See `docs/SESSION-5-REPORT.md`.

---

## Session 6 — iOS Application

**Goal.** Ship `docs/GUIDE-IOS.md` and a clean-clone Capacitor/SWIFT project around the canonical V9 SPA; document SwiftUI as an alternative.

**Acceptance gate.** Xcode archive must succeed on macOS.

---

## Session 7 — CI/CD, Pages & Release

**Goal.** Harden Pages and CI, add release/checksum workflows, governance files, and a verifiable release process.

**Acceptance gate.** A push to `main` yields a green Pages deployment reachable at `https://<user>.github.io/Index-Engine-V6.2/`.

---

## Progress Ledger

| Session | Started | Completed | Artifact(s) | Gate |
|---|---|---|---|---|
| 1 | 2026-10-02 | 2026-10-02 | `docs/SPEC-AUDIT.md`, `docs/SESSION-1-REPORT.md`, `docs/SESSION-PLAN.md`, `tools/terminal-engine.html` | ✅ 21/21 terminal tests |
| 2 | 2026-10-02 | 2026-10-02 | `v9/index.html`, `tools/tests/v9-engine.test.js`, `docs/SESSION-2-REPORT.md` | ✅ current V9 suite included in 24/24 |
| 3 | 2026-10-02 | 2026-10-02 | `docs/GUIDE-SPA.md`, inline CSS/PWA sidecars, Pages workflow, `docs/SESSION-3-REPORT.md` | ✅ historical run recorded; current suite re-run in Session 4 |
| 4 | 2026-10-02 | 2026-10-02 | `v9/index.html`, corrected audit/plan, `docs/SESSION-4-REPORT.md` | ✅ 21/21 Terminal + 24/24 V9; both builds and syntax checks passed |
| 5 | 2026-10-02 | 2026-10-02 | `mobile/capacitor/`, `docs/GUIDE-ANDROID.md`, `docs/SESSION-5-REPORT.md` | ✅ config/audit tests; native APK build pending Session 7 CI |
| 6 | — | — | — | — |
| 7 | — | — | — | — |
