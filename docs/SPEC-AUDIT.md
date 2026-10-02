# SPEC AUDIT — v9.1.0.1 (EFNAI Draft) vs. Implementation V6.2

**Document ID:** `IDX-AUDIT-v9.1.0.1-001`
**Target repo:** `8ry8/Index-Engine-V6.2` @ `a8814bb`
**Branch:** `arena/01a0fc76-index-engine-v6-2`
**Audit date:** 2026-10-02
**Status:** ⚠️ **CONDITIONAL — 12 contradictions and 21 undefined properties identified**

---

## 0. Provenance & Source-of-Truth Notice

> **⚠️ BLOCKING PROVENANCE GAP**
>
> The attachment `v9.1.0.1 EFNAI draft.pdf` was supplied **in the request conversation only**. It is **not present** in the repository working tree, any Git blob (`git log --all --diff-filter=A`), any GitHub release, issue, or attachment.
>
> Command of record:
> ```bash
> find /home/user/Index-Engine-V6.2 -iname "*.pdf" -not -path "./.git/*"
> # → (no output)
> git log --all --pretty=format: --name-only --diff-filter=A | sort -u
> # → .github/ISSUE_TEMPLATE/feature_request.md, .github/workflows/blank.yml,
> #   .github/workflows/nuxtjs.yml, Index Engine V6.2  Code, LICENSE, README.md, index.html
> ```

**Consequence:** the v9.1.0.1 normative text could not be parsed by tooling. Every v9.1.0.1 statement below is marked with one of:

| Marker | Meaning | User action required |
|---|---|---|
| `[G]` | **Ground truth** — stated in the request or verifiable in V6.2 source | None |
| `[R]` | **Reconstructed** — inferred from V6.2 behaviour and README, awaiting PDF confirmation | **Confirm or correct** |
| `[?]` | **Unknown** — cannot be inferred; blocks design | **Must supply** |

**Invariant `INV-PROV-01`:** *No segment of the v9.1.0.1 nomenclature shall be treated as normative until the PDF is committed to `docs/spec/` under version control.* All `[R]` rows are provisional.

**Remediation instruction:** commit the PDF (or a plaintext extract) to
`docs/spec/EFNAI-v9.1.0.1-draft.pdf`. The audit and all downstream code regenerate from that artifact.

---

## 1. Canonical Nomenclature — v9.1.0.1

### 1.1 Core string `[G]`

```
[YYYY.MM.DD].[CASE].[TYPE].[TITLE].[VER].[PRIV].[ORIGIN].[AUTHOR].[CUSTOM_1]…[CUSTOM_n].[ID]
 └── base segments (8) ────────────────────────────────────┘└─ extensions ─┘└ ID ┘
```

**Invariant `INV-NOM-01` — Period delimiter:** the field separator is **exactly one U+002E FULL STOP**. No segment may itself contain a period.

**Invariant `INV-NOM-02` — Fixed prefix:** segments 1–8 are **positionally immutable**. Custom segments may only be appended **after `AUTHOR` and before `ID`**.

**Invariant `INV-NOM-03` — Terminal ID:** `ID` is the **last** segment, format `FILE\d{6}` (zero-padded, monotonic, never reused).

**Invariant `INV-NOM-04` — Case sensitivity:** all segments are emitted **UPPERCASE** except `VER`, which is lowercase-`v` prefixed for numeric drafts (`v01`) and uppercase for status words (`FIN`, `EXE`).

### 1.2 Segment contract

| # | Segment | Format | Constraint | Cardinality | V6.2 conformant |
|---|---|---|---|---|---|
| 01 | `DATE` | `YYYY.MM.DD` | ISO 8601 calendar date; **not** the file mtime | 1 | ✅ |
| 02 | `CASE` | `[A-Za-z0-9]+` | Matter / client / dispute; PascalCase | 1 | ✅ |
| 03 | `TYPE` | `[A-Z]{4,6}` | Structural document class | 1 | ✅ |
| 04 | `TITLE` | `[A-Za-z0-9]+` | Human-readable subject; **max 35 chars** | 1 | ❌ **unenforced** |
| 05 | `VER` | `v\d{2}` \| `[A-Z]{3,4}` | Draft index or finality token | 1 | ✅ |
| 06 | `PRIV` | `[A-Z]{4}` | Privilege shield tag | 1 | ✅ |
| 07 | `ORIGIN` | `[A-Z]{4}` | Provenance / source alignment | 1 | ✅ |
| 08 | `AUTHOR` | `[A-Z]+` | First initial + last name | 1 | ⚠️ **unbounded** |
| 09 | `CUSTOM_n` | `[A-Za-z0-9]+` | Zero-or-more extensions | 0..n | ✅ |
| 10 | `ID` | `FILE\d{6}` | Ledger key | 1 | ⚠️ **see C-07** |

---

## 2. Contradiction Register

Ordered by severity. **`BLOCKER`** = produces corrupt or unrecoverable output.

### C-01 — Duplicate suffix: README says `-Part2`, code emits `Part2` `BLOCKER`

| Source | Statement |
|---|---|
| `README.md` | "automatically appended with sequential version control (**`-Part2`**)" |
| `index.html:577` | `docTitle += 'Part2';` |

A literal hyphen is illegal in the stated `TITLE` charset `[A-Za-z0-9]+`. Either the README or the character class is wrong — **they cannot both be true**. Also note `toCamelCase()` strips `-` on the next keystroke, so the emitted string is not round-trippable.

**Resolution required:** pick one and codify in §1.2. Provisional: remove the hyphen, **and** extend to a full ordinal (`Part2`, `Part3`, …) per C-10.

---

### C-02 — `TITLE` max length is specified but never enforced `BLOCKER`

| Source | Statement |
|---|---|
| `README.md` | "Title: Human-readable subject matter (Strictly CamelCase, **max 35 characters**)" |
| `index.html:557` | `let docTitle = toCamelCase(...) \|\| "NOTITLE";` — no length check |
| `index.html:744` | `res.title += 'Part2'` — grows without bound |

**Invariant `INV-NOM-05`:** *`len(TITLE) ≤ 35`, measured after PascalCase folding and **before** any collision suffix.*

V6.2 violates this on every long title, on AI-extracted titles, and again on collision append. Violation propagates into Windows `MAX_PATH` and OS filename limits.

---

### C-03 — "CamelCase" is not CamelCase `MAJOR`

`toCamelCase()` (`index.html:543`) uppercases the first letter of every word:

```js
(str||"").replace(/(?:^\w|[A-Z]|\b\w)/g, w => w.toUpperCase())…
// "smith v wong" → "SmithVWong"
```

That is **PascalCase / UpperCamelCase**. True camelCase would be `smithVWong`. The README's "Strictly CamelCase" is therefore **misleading and ambiguous** — and `AUTHOR` `RWILLIAMS` is neither.

**Resolution required:** rename the requirement to **"PascalCase, alphanumeric-only"** throughout, or change the implementation. Provisional: keep PascalCase, fix the wording.

---

### C-04 — "Encrypted" cloud backup is plaintext `BLOCKER`

| Source | Statement |
|---|---|
| `README.md` | "silently push **an encrypted backup** of the Master Ledger" |
| `index.html:836-841` | `set(ref(db,'masterArchive'), masterLog)` — **raw JSON, no crypto** |

No `crypto.subtle`, no AES-GCM, no key derivation exists anywhere in the file. The claim is **false as implemented** and is a **legal-compliance liability** given the data class (privileged legal documents).

**Invariant `INV-SEC-01`:** *Any egress of the Master Ledger must be preceded by authenticated encryption (AES-256-GCM, key derived via PBKDF2-SHA256 ≥ 600 000 iterations or Argon2id) with the IV and salt stored alongside the ciphertext.*

---

### C-05 — API key stored in cleartext in `localStorage` `BLOCKER`

| Source | Statement |
|---|---|
| `index.html:246` | `Key encrypts locally to browser storage. Never committed to server.` |
| `index.html:893` | `localStorage.setItem('v6_api_key', keyInput);` — **plaintext, unencrypted, no expiry** |

The UI text asserts encryption that does not occur. Additionally:

* `localStorage` is readable by **any** script on the origin (no CSP is declared anywhere in the document) → persistent XSS = exfiltration of a billable Gemini key.
* The key is **never read back**. See C-06.

**Invariant `INV-SEC-02`:** *Credential material is held in memory only, or in an encrypted vault with an expiry; it must never be written to `localStorage` as cleartext.*

---

### C-06 — The Vision AI path is completely non-functional `BLOCKER`

This is the headline finding. Three defects compose:

| # | Evidence | Effect |
|---|---|---|
| a | `index.html:336` — `const apiKey = "";` | Request always carries an **empty** key |
| b | `index.html:652` — `…?key=${apiKey}` | Uses the empty constant, **never** `localStorage.v6_api_key` |
| c | `index.html:327` — `onclick="saveApiKey()"` | **`saveApiKey` is never defined** → `ReferenceError` on click |
| d | `index.html:322` — `id="apiModal"` | **Never opened.** No `openApiModal()`, no `.hidden` removal, no trigger anywhere |

**Net:** the modal cannot be opened; its only button throws; the stored key is never consumed by the fetch. The "Multimodal Vision Ingestion" capability advertised in the README **does not execute**.

**Invariant `INV-AI-01`:** *The API key must be resolved at call time from a single authoritative accessor (`getApiKey()`), and a missing key must surface a recoverable, user-visible prompt — never a silent empty-string request.*

---

### C-07 — Archive ID monotonicity is not guaranteed `MAJOR`

`currentArchiveNum` (`index.html:351`) is a single global counter, incremented **only** inside `saveToLog()` (`index.html:601`).

* No import path exists, so a **restored/replayed ledger** (or a second device, or a Firebase pull-back) will re-issue `FILE000001…` over existing records.
* Cache eviction of `v6ArchiveNum` while `v6MasterLog` survives → **counter resets to 1** and **collides with every existing ID**.
* No uniqueness check is performed at write time.

**Invariant `INV-ID-01`:** *`ID` is assigned as `max(existing numeric suffix) + 1`, validated for uniqueness against the ledger immediately before persistence; the persisted counter is a cache, never the authority.*

---

### C-08 — Collision suffix saturates at `Part2` `BLOCKER`

`index.html:742-747`:

```js
if (checkCollision(proposed)) {
    res.title += 'Part2';
    proposed = proposed.replace(res.title.replace('Part2',''), res.title); // "Rough hack"
}
```

* A **third** arrival of the same base string is *still* a collision after appending `Part2` — and the loop does not re-test. `UNIQUE_TITLE` and `UNIQUE_TITLEPart2` both then receive a distinct `ID`, so duplicates survive.
* The `.replace()` on the first occurrence is **positionally unsafe**: if the title substring also appears inside `CASE`, the **wrong segment is mutated**, corrupting the case name.
* `index.html:569` (manual path) performs the same append **without re-testing**.

**Invariant `INV-DUP-01`:** *Disambiguation is `while (exists(candidate)) n++; candidate = base + "Part" + n;` — an **unbounded, re-tested** ordinal.*

---

### C-09 — `checkCollision()` has O(n·m) cost and a substring false-positive `MAJOR`

`index.html:532-538`:

```js
const baseGenerated = parts.slice(0, 8).join('.');
const exists = masterLog.find(log => log.newName.includes(baseGenerated));
```

`String.prototype.includes` is a **substring** test, not a segment-equality test. `…NOCASE.DOCU.Will` matches a stored `…NOCASE.DOCU.Williamsburg`. False positives silently trigger `Part2` on **non-duplicates**.

**Invariant `INV-DUP-02`:** *Duplicate detection compares **segment tuples** (array equality over `split('.')`), never substrings.*

---

### C-10 — `TYPE` extraction is positional-locked `MINOR`

`saveToLog()` derives analytics data via `type: newName.split('.')[2]` (`index.html:600`). `generateManualName()` and the batch path rebuild the string in three separate places (`:559`, `:575`, `:743`) with **divergent logic**. Any future reorder of segments silently mis-attributes every record.

**Invariant `INV-NOM-06`:** *A single `buildName(parts) → string` and `parseName(string) → parts` pair is the sole serializer. No call site concatenates segments inline.*

---

### C-11 — GitHub Pages deployment is guaranteed to fail `MAJOR`

`.github/workflows/nuxtjs.yml` runs `npm ci` / `npm run generate` against a Nuxt project. The repository contains **no `package.json`** and **no Nuxt source**. The "Detect package manager" step:

```bash
else
  echo "Unable to determine package manager"
  exit 1
fi
```

exits **1** on every push to `main`. The `pages` job therefore never deploys. `.github/workflows/blank.yml` is an inert `echo Hello, world!` placeholder.

---

### C-12 — Model identifier is not a stable release `MINOR`

`index.html:652` requests
`gemini-2.5-flash-preview-09-2025`. The `-preview-YYYY-MM-DD` alias is a **moving/retiring** identifier, not a pinned GA model. Preview aliases are deprecated without notice and would silently break ingestion.

**Invariant `INV-AI-02`:** *The model id is a configurable constant resolved from Settings; the default is a GA model (`gemini-2.5-flash`) and the retry ladder never hard-codes a dated preview alias.*

---

## 3. Undefined Property Register

Each row states the **gap**, the **risk if left open**, and the **provisional resolution** adopted by this build.

| ID | Gap | Risk | Provisional resolution | Status |
|---|---|---|---|---|
| U-01 | No policy for **unknown / illegible document date** | Fabricated dates corrupt chronology | Emit `0000.00.00` + set `needs_review=true`; **never** substitute mtime | **RESOLVED** |
| U-02 | `MM/DD` vs `DD/MM` ambiguity in AI extraction | 11 of 12 days misplaced | Require ISO in the extraction schema; if ambiguous and both ≤12, flag for human review | **RESOLVED** |
| U-03 | **Timezone** of "today" | Off-by-one across UTC boundaries | Use **local calendar date** via `Intl.DateTimeFormat`, never `toISOString()` | **RESOLVED** |
| U-04 | **Unicode / diacritic** folding (`José`, `Müller`) | Silent data loss or illegal bytes | NFD-normalise → strip combining marks → ASCII fold | **RESOLVED** |
| U-05 | `AUTHOR` for **corporate / institutional** documents | Free-text garbage in filename | Permit 4-letter **entity code** from `ORIGIN` taxonomy when no natural person exists | **RESOLVED** |
| U-06 | `CASE` is **free text** — no matter registry | `SmithVWong` / `Smithvwong` / `Smith_V_Wong` fragment one matter | Controlled matter registry with alias resolution | **OPEN — needs user** |
| U-07 | Max length for `CASE`, `AUTHOR`, custom segments | Windows `MAX_PATH` (260) overflow | 24 / 24 / 24 chars; total filename ≤ 180 | **RESOLVED** |
| U-08 | **Illegal OS characters** `< > : " / \ \| ? *` and control codes | Silent `ren`/`mv` failure; NTFS rejection | Strip at build time via `sanitize()` | **RESOLVED** |
| U-09 | **Reserved Windows device names** (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) | File becomes unreadable on Windows | Append `_` when a segment matches | **RESOLVED** |
| U-10 | Trailing **dot / space** rejection on NTFS | Silent write failure | Strip trailing `.` and ` ` | **RESOLVED** |
| U-11 | **`VER` monotonicity** — is `FIN > v03`? | Non-deterministic "latest" resolution | Define total order: `v01<…<v99<TEMP<DRAF<REDA<AMND<SUPP<FIN<EXE<VOID` | **RESOLVED** |
| U-12 | **Collision scope** — global or per-matter? | `Part2` spawned for unrelated matters | Scope = **(CASE, TYPE, TITLE, VER)** tuple, global ledger | **OPEN — needs user** |
| U-13 | `ID` lifecycle on **delete / void / supersede** | Reuse breaks provenance chain | IDs are **never reused**; `VOID` is a status, not a deletion | **RESOLVED** |
| U-14 | **Concurrency** — two tabs, same ledger | Lost update, duplicate IDs | `storage` event + optimistic-merge + advisory `BroadcastChannel` lock | **RESOLVED** |
| U-15 | `localStorage` **quota** (~5 MiB) exhaustion | Silent `QuotaExceededError`, data loss | Migrate to **IndexedDB** (Dexie) with a `localStorage` shim | **RESOLVED** |
| U-16 | **Batch limits** — file count / byte size | Browser OOM on 4 GB of scanned PDFs | ≤ 25 files, ≤ 20 MiB each, ≤ 200 MiB total per batch | **RESOLVED** |
| U-17 | **PII in the filename itself** | Filenames leak through OS indexers, mail attachments, sync clients | `PII`/`HIPA` tags **must** accompany a redaction or be flagged `SECR` | **OPEN — needs user** |
| U-18 | **Audit-log immutability** (legal hold / WORM) | Ledger edit destroys provenance | Append-only ledger; edits recorded as new events with `prevHash` (SHA-256 chain) | **RESOLVED** |
| U-19 | **Key rotation** for the cloud vault | Compromise is unrecoverable | Vault header stores `keyId` + `iterations`; re-key command available | **RESOLVED** |
| U-20 | **RBAC / multi-user** | No separation of privilege | Out of scope for a client-side SPA; documented as a **deployment constraint** | **OPEN — needs user** |
| U-21 | **Data residency / cloud region** | GDPR / privilege-waiver exposure | Firebase RTDB region must be pinned; default is **local-only**, sync opt-in | **OPEN — needs user** |

---

## 4. Requirements Traceability Matrix

| `[G]`/`[R]` Requirement | Source | V6.2 status | v9.1.0.1 target | Session |
|---|---|---|---|---|
| 9-part period-delimited nomenclature | README | ✅ implemented | ✅ keep | 2 |
| Infinite custom segments before `ID` | README | ✅ implemented | ✅ keep, validated | 2 |
| `TITLE` ≤ 35 chars | README | ❌ absent | ✅ enforce | 2 |
| PascalCase (né "CamelCase") | README | ⚠️ ambiguous | ✅ rename + enforce | 2 |
| `-Part2` dedup suffix | README | ❌ emits `Part2` | ✅ ordinal loop | 2 |
| Sequential `FILE######` ledger ID | README | ⚠️ resettable | ✅ `max+1` | 2 |
| Multimodal Vision ingestion | README | ❌ **dead** (C-06) | ✅ functional | 2 |
| Persistent local ledger | README | ⚠️ 5 MiB cap | ✅ IndexedDB | 2 |
| Encrypted cloud sync | README | ❌ plaintext | ✅ AES-256-GCM | 4 |
| CSV export w/ UTF-8 BOM | README | ✅ implemented | ✅ keep | 2 |
| `.bat` + `.sh` rename scripts | README | ✅ implemented | ⚠️ harden quoting | 2 |
| Duplicate detection | README | ⚠️ substring, saturating | ✅ tuple-exact | 2 |
| Zero-server / data sovereignty | README | ⚠️ telemetry-free but key leaky | ✅ harden | 4 |
| Run with **no build step** | README | ⚠️ 4 CDN deps | ✅ pin + SRI, or bundle | 3 |
| SPA deployment guide | request | ❌ absent | 📄 `docs/GUIDE-SPA.md` | 3 |
| Android application | request | ❌ absent | 📄 `docs/GUIDE-ANDROID.md` + Capacitor project | 5 |
| iOS application | request | ❌ absent | 📄 `docs/GUIDE-IOS.md` + Capacitor project | 6 |
| Terminal command engine | request | ❌ absent | 🛠 `tools/terminal-engine.html` | 1 ✅ |
| GitHub Pages CI | `.github` | ❌ always fails (C-11) | ✅ correct workflow | 7 |

---

## 5. Immediate Actions (in priority order)

| # | Action | Owner | Blocking |
|---|---|---|---|
| 1 | **Commit the v9.1.0.1 PDF** to `docs/spec/` | **User** | Audit finalisation, Sessions 2–7 |
| 2 | Resolve **C-01** (`Part2` vs `-Part2`) | **User** | Segment builder |
| 3 | Resolve **C-03** (CamelCase vs PascalCase) | **User** | Serializer |
| 4 | Confirm **U-06** matter registry, **U-12** collision scope, **U-17** PII policy, **U-20/21** multi-user & residency | **User** | Cloud sync design |
| 5 | Land Session 2 (v9.1.0.1 engine) against provisional resolutions | Agent | — |
| 6 | Replace `nuxtjs.yml` with a static Pages workflow | Agent | — |

**Invariant `INV-GOV-01`:** *No `[R]`-marked constraint may be promoted to `[G]` without a citation to the committed PDF.*
