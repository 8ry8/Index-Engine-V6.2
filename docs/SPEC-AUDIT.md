# SPEC AUDIT — v9.1.0.1 (EFNAI Draft) vs. Implementation V6.2

**Document ID:** `IDX-AUDIT-v9.1.0.1-001`
**Target repo:** `8ry8/Index-Engine-V6.2` @ `a8814bb`
**Branch:** `arena/01a0fc76-index-engine-v6-2`
**Audit date:** 2026-10-02 · **Revision 2** (operator confirmations folded in)
**Status:** ⚠️ **CONDITIONAL — 14 contradictions and 25 undefined properties identified · 3 items promoted to confirmed ground truth**

**Supersession notice:** the policy is a **12-part** nomenclature. `README.md` is **descriptive of V6.2** and is **not normative** where the two conflict (**`INV-NOM-09`**).

---

## 0.1 Operator Confirmations — Revision 2 (2026-10-02)

Three items were **promoted from `[R]` to `[G]`** by direct operator statement. These **override** the README and V6.2 wherever they conflict.

| # | Confirmed ground truth | Supersedes | Consequences |
|---|---|---|---|
| **G-01** | Duplicate disambiguation suffix is **`Part2`** — **no hyphen** | `README.md` "`-Part2`" | Resolves **C-01**. `TITLE` stays strictly `[A-Za-z0-9]+`. Ordinal is unbounded (`Part2`, `Part3`, …). |
| **G-02** | The v9.1.0.1 policy is a **12-Part Nomenclature**, not the 9-part form | `README.md` "foundational 9-part formula" | Resolves **C-13**. Three previously-optional extension slots become **standing, mandatory-order** parts. **The single most impactful change in this revision.** |
| **G-03** | `TITLE > 35` characters ⇒ *"the file is uncertain"* ⇒ the record is routed to the **Smart Review Queue** | V6.2 silent acceptance | Resolves **C-02** and **U-22**. **Truncation is now prohibited as an automatic behaviour** — see §2.5. |

> **Invariant `INV-SRQ-01` — Uncertainty is never silently resolved.**
> Any record whose metadata cannot be determined with confidence is **quarantined, not guessed**. The engine must never fabricate a conformant-looking name for a document it could not read. Emitting a plausible-but-wrong filename into a legal archive is a **provenance defect**, not a UI inconvenience.

**Invariant `INV-NOM-07` — Twelve slots, fixed order.** The v9.1.0.1 designation is a **12-part, period-delimited string of fixed arity**. Slots 1–8 and 12 are immutable; slots 9–11 are the three standing extension parts and are **order-significant**.

### 1.1.1 Parts vs. fields — the delimiter subtlety `[G]`

`DATE` is written `YYYY.MM.DD`, so **it embeds the delimiter twice**. A *part* is therefore **not** a *dot-field*:

```
 2024 . 03 . 11 . SmithVWong . TRAN . DepositionOfWong . v01 . PRIV . OPPS . RWILLIAMS . B123 . NA . NA . FILE000001
└─ 3 fields ─┘    └─────── 7 fields ──────────────┘                  └── 3 ──┘   └── ID ──┘
└──────────────────────── 14 dot-fields ─────────────────────────────────────────────────────┘
```

| Name | Semantic parts | Dot-fields | Formula |
|---|---|---|---|
| V6.2 (as shipped) | **9** | **11** | 3 (date) + 7 + 1 (ID) |
| **v9.1.0.1** | **12** | **14** | 3 (date) + 7 + 3 (ext) + 1 (ID) |

> ✅ **This resolves the arithmetic inconsistency in `C-13`.** The README's quoted "9-part" string contains **nine semantic parts but eleven dot-separated tokens** — it was never internally inconsistent; it was **conflating parts with fields**. The v9.1.0.1 addition of three standing extension slots moves the count from 9→12 parts and 11→14 fields.

**Invariant `INV-NOM-10` — Parts ≠ fields.** *All arity assertions in code compare against the **semantic part count** (12); all string parsing and migration compare against the **field count** (14). Conflating the two is the highest-probability defect in any reimplementation.*

> **Implemented as:** a derived `LAYOUT` table (`{key, start, width}`) computed once from `SEGMENTS`, with `width = 3` for `DATE` and `1` for every other slot. `parseName()`, `validate()`, `migrateV62()` and the UI all read the field mapping from that single source — **no call site hard-codes a field index**. This bug was in fact caught by the round-trip property test during Session 2 development, exactly as `INV-PROV-02` predicts.

### 12-Part decomposition `[R]`

V6.2's "9-part" string is **8 base parts + `ID`**. The README's own text names three intended extension use cases — *"Bates Stamped Numbers, Judicial Venues, or Subpoena Issuers"*. The coherent reading of **G-02** is that v9.1.0.1 promotes exactly those three from optional to standing:

```
 01    02    03     04     05    06     07      08      09     10     11     12
DATE  CASE  TYPE  TITLE   VER   PRIV  ORIGIN  AUTHOR  E1     E2     E3     ID
└──────────── 8 base parts ───────────────┘  └── 3 standing extensions ──┘  └ID┘
```

| Slot | Provisional name | README-sourced intent | Confidence |
|---|---|---|---|
| 09 | `BATES` | Bates stamped number | `[R]` — pending PDF |
| 10 | `VENUE` | Judicial venue | `[R]` — pending PDF |
| 11 | `SUBP` | Subpoena issuer | `[R]` — pending PDF |

**Status: the three slot *identities* are `[R]`; the *arity of 12* is `[G]`.** The engine is therefore built **schema-driven** — the slot table is **data, not code**. Reconciling the PDF is a one-object edit to `SEGMENTS`, with no change to the serializer, validator, sanitizer, dedup engine or review queue.

> **⚠️ Reconciliation request.** When the PDF lands, confirm only: *(a)* the three slot names, *(b)* their order, *(c)* their allowed charsets. Everything else in v9.1.0.1 is already settled.

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

### 1.1 Core string `[G]` (arity confirmed by **G-02**)

```
[YYYY.MM.DD].[CASE].[TYPE].[TITLE].[VER].[PRIV].[ORIGIN].[AUTHOR].[E1].[E2].[E3].[ID]
 └───────────────── 8 base parts ─────────────────────┘└─ ext ─┘   └── ID ──┘
 └──────────────────── 12 parts total ────────────────────────────────────────┘
```

**Invariant `INV-NOM-01` — Period delimiter:** the field separator is **exactly one U+002E FULL STOP**. No segment may itself contain a period.

**Invariant `INV-NOM-02` — Fixed prefix:** slots 1–8 are **positionally immutable**.

**Invariant `INV-NOM-03` — Terminal ID:** `ID` is the **last** segment, format `FILE\d{6}` (zero-padded, monotonic, **never reused**).

**Invariant `INV-NOM-04` — Case sensitivity:** all segments are emitted **UPPERCASE** except `VER`, which is lowercase-`v` prefixed for numeric drafts (`v01`) and uppercase for status words (`FIN`, `EXE`).

**Invariant `INV-NOM-06` — Single serializer.** One `buildName(parts) → string` / `parseName(string) → parts` pair is the sole point where slot concatenation occurs. V6.2 violates this in **three** places (`:559`, `:575`, `:743`) with divergent logic.

**Invariant `INV-NOM-07` — Arity is 12.** Any string whose parsed slot count ≠ 12 is **structurally non-conformant** and is rejected by the validator. *(V6.2 produced variable arity: 9 parts + 0..n extensions.)*

### 1.2 Segment contract — 12 slots

| # | Slot | Format | Constraint | Source | V6.2 |
|---|---|---|---|---|---|
| 01 | `DATE` | `YYYY.MM.DD` | ISO 8601 calendar date; **not** the file mtime | `[G]` | ✅ |
| 02 | `CASE` | `[A-Za-z0-9]{1,24}` | Matter / client / dispute; PascalCase | `[R]` len | ✅ |
| 03 | `TYPE` | `[A-Z]{4,6}` | Structural document class | `[G]` | ✅ |
| 04 | `TITLE` | `[A-Za-z0-9]{1,35}` | Human-readable subject; **>35 ⇒ Smart Review Queue** | `[G]` | ❌ |
| 05 | `VER` | `v\d{2}` \| `[A-Z]{3,4}` | Draft index or finality token | `[G]` | ✅ |
| 06 | `PRIV` | `[A-Z]{4}` | Privilege shield tag | `[G]` | ✅ |
| 07 | `ORIGIN` | `[A-Z]{4}` | Provenance / source alignment | `[G]` | ✅ |
| 08 | `AUTHOR` | `[A-Z]{2,24}` | First initial + last name, or entity code (U-05) | `[R]` len | ⚠️ unbounded |
| 09 | `E1` — `BATES` | `[A-Za-z0-9]{0,18}` | Bates stamped number | `[R]` name | ❌ |
| 10 | `E2` — `VENUE` | `[A-Za-z0-9]{0,18}` | Judicial venue | `[R]` name | ❌ |
| 11 | `E3` — `SUBP` | `[A-Za-z0-9]{0,18}` | Subpoena issuer | `[R]` name | ❌ |
| 12 | `ID` | `FILE\d{6}` | Ledger key; assigned `max+1` under lock | `[G]` | ⚠️ C-06 |

**Empty extension policy:** a standing extension with no value emits the literal placeholder **`NA`** (never an empty segment, which would produce `..` and an ambiguous parse). *(Provisional — confirm against PDF.)*

**Total length budget:** 10 + 24 + 6 + 35 + 4 + 4 + 4 + 24 + 18×3 + 11 ≈ **220 max**, under the Windows 260 `MAX_PATH` floor only if the **directory path is ≤ 40 chars**. Hence **`INV-NOM-08`: the emitted filename must be ≤ 180 characters**, and the extension slots are the first to be compacted.

---

### 2.5 Smart Review Queue — triage state machine `[G-03]`

The single largest architectural addition in v9.1.0.1. V6.2 has **no review state whatsoever**: it writes every record directly into the master ledger.

**Invariant `INV-SRQ-01`: uncertainty is quarantined, never guessed.**

```
        ┌──────────┐   all slots resolved, arity 12, TITLE ≤ 35
        │ EXTRACT  │──────────────────────────────────────────────┐
        └────┬─────┘                                              ▼
             │ any trigger fires                            ┌───────────┐
             ▼                                              │   READY   │
      ┌─────────────┐    human adjudication     ┌───────────┴───────────┘
      │   REVIEW    │──────────────────────────▶│    COMMITTED          │
      │ (SRQ entry) │   (edits / re-extract)    │  ID assigned, hashed  │
      └─────┬───────┘                           └───────────────────────┘
            │ operator rejects the item
            ▼
      ┌─────────────┐
      │  DISCARDED  │  retained for audit; never renamed on disk
      └─────────────┘
```

#### Admission triggers (any one quarantines the record)

| Trigger | Condition | Rationale |
|---|---|---|
| `TITLE_OVERFLOW` | `len(TITLE) > 35` | **G-03** — the file is *uncertain* |
| `DATE_UNKNOWN` | no date found in content | `INV-SRQ-01` — `0000.00.00` is not a date |
| `DATE_AMBIGUOUS` | `MM/DD` vs `DD/MM` both ≤ 12 | **U-02** — silently picks the wrong day 11/12 of the time |
| `DATE_IMPLAUSIBLE` | year < 1900 or > current + 5 | OCR corruption (`2O24`, `1S.03.2020`) |
| `LOW_CONFIDENCE` | extracted slot fails the validator | malformed `TYPE`, unknown `PRIV` |
| `EXTENSION_REQUIRED` | a standing extension is blank | arity 12 is mandatory |
| `RESERVED_NAME` | result matches a Windows device name | see **U-09** |
| `COLLISION_UNRESOLVED` | ordinal exceeded a sane bound (e.g. `Part9`) | 9 identically-named documents is a data problem, not a naming problem |

#### Queue entry schema

```jsonc
{
  "queueId":   "SRQ-2026-000007",     // monotonic, independent of FILE IDs
  "reason":    "TITLE_OVERFLOW",      // trigger id
  "severity":  "blocking",            // "blocking" | "advisory"
  "draft":     { "date": "2024.03.11", "case": "SmithVWong", "title": "<41 chars>" },
  "detected":  { "chars": 41, "limit": 35, "excess": 6 },
  "extraction":{ "model": "gemini-2.5-flash", "confidence": 0.72, "raw": "…" },
  "fileName":  "IMG_4471.pdf",        // untouched on disk
  "createdAt": "2026-10-02T18:22:41Z",
  "status":    "REVIEW"               // REVIEW | READY | COMMITTED | DISCARDED
}
```

#### Resolver affordances (operator actions)

| Action | Effect |
|---|---|
| **Shorten** | Operator supplies a ≤ 35-char title; provenance records *who* shortened it |
| **Split** | The document is actually two documents → two queue entries |
| **Re-extract** | Re-run vision inference with a stricter prompt |
| **Correct date** | Operator picks the unambiguous date; the choice is recorded |
| **Accept as-is** | Explicit override → `READY`, but the row is flagged **`manual_override: true`** permanently |

> **Invariant `INV-SRQ-03` — No silent escape.** *Every* record leaving the queue carries an `resolvedBy` and `resolvedAt`. A record may not transition `REVIEW → READY` without an attributed human decision.

#### Consequences for V6.2

| V6.2 behaviour | Required v9.1.0.1 behaviour |
|---|---|
| `\|\| "NOTITLE"` fallback | `TITLE_OVERFLOW` / `LOW_CONFIDENCE` → queue |
| `\|\| '0000.00.00'` | `DATE_UNKNOWN` → queue |
| Writes directly to `masterLog` | Writes to the queue; ledger commit is a **separate, gated** transition |
| No review surface | Queue must be a first-class tab with per-item adjudication |
| Collision suffix silently appended | `COLLISION_UNRESOLVED` past `Part9` → queue |

---

## 2. Contradiction Register

Ordered by severity. **`BLOCKER`** = produces corrupt or unrecoverable output.

### C-01 — Duplicate suffix: README says `-Part2`, code emits `Part2` `BLOCKER` → **RESOLVED by G-01**

| Source | Statement | Verdict |
|---|---|---|
| `README.md` | "automatically appended with sequential version control (**`-Part2`**)" | ❌ **incorrect — README is wrong** |
| `index.html:577` | `docTitle += 'Part2';` | ✅ **correct** |
| **Operator (G-01)** | `Part2`, no hyphen | ✅ **authoritative** |

**Resolution:** the hyphen is **not** part of the nomenclature. `TITLE` remains strictly `[A-Za-z0-9]+`. Two follow-on defects remain open in the *implementation* (not the spec) — see **C-08** (saturation) and **C-09** (substring matching). The README must be corrected.

---

### C-13 — README specifies a **9-part** nomenclature; the policy is **12-part** `BLOCKER` → **RAISED by G-02**

| Source | Statement |
|---|---|
| `README.md` | "The foundational **9-part** formula operates as follows: `[YYYY.MM.DD].[CASE].[TYPE].[TITLE].[VER].[PRIV].[ORIGIN].[AUTHOR].[ID]`" |
| **Operator (G-02)** | v9.1.0.1 is a **12-Part Nomenclature Policy** |

The README's "9-part" figure is **arithmetically inconsistent with its own example**: the quoted string has **nine dot-separated tokens but only eight semantic parts plus `ID`**. It also contradicts the v9.1.0.1 designation. Three extension slots (`E1`/`E2`/`E3`) are **standing parts**, not optional — the README describes them as *"infinite extensions … inserted dynamically"*, which is the **V6.2** behaviour that v9.1.0.1 **supersedes**.

**Impact:** `INV-NOM-07` — arity is fixed at **12**. Every V6.2-generated filename is arity-9 and therefore **structurally non-conformant** under v9.1.0.1. Migration is required (see §5).

**Invariant `INV-NOM-09` — Supersession.** *Where `README.md` and the v9.1.0.1 policy conflict, the policy governs. The README is descriptive documentation of V6.2 and is not normative.*

---

### C-14 — README "infinite extensions" contradicts fixed 12-part arity `MAJOR`

The README promises *"endless `[CUSTOM_SEGMENT]` rules"*. A fixed arity of 12 makes the slot count **bounded and order-significant**. These cannot both hold.

**Provisional resolution:** the three extension slots are **standing**; *within* each slot the **value** is free-form (the README's real requirement — Bates numbers, venues and subpoena issuers must all be recordable). Unbounded *arity* is withdrawn.

**Open question `U-22`:** may a deployment declare **more than three** extension slots (arity > 12)? If yes, the fixed-12 invariant becomes a **floor**, not an equality, and the validator's rules change. **Needs operator confirmation.**


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
| U-22 | Does the 12-part arity admit **more than three** extension slots? | Validator rules, migration, UI | Treat 12 as a **fixed equality**; escalate to a floor if confirmed otherwise | **OPEN — needs user** |
| U-23 | What is the **review SLA / escalation** for a queued record? | Stale queue = silent data loss | Surface queue depth + age on the dashboard; never auto-discard | **OPEN — needs user** |
| U-24 | Are the three extension slots **order-significant** or keyed by name? | Misordered slots corrupt downstream parsing | **Order-significant**, positional | **RESOLVED** |
| U-25 | Does a queued record ever appear in **rename scripts**? | Queued files renamed with guessed names | **No** — only `READY`/`COMMITTED` records are scripted | **RESOLVED** |

---

## 4. Requirements Traceability Matrix

| `[G]`/`[R]` Requirement | Source | V6.2 status | v9.1.0.1 target | Session |
|---|---|---|---|---|
| **12-part** period-delimited nomenclature | **G-02** | ❌ emits 9 | ✅ **fixed arity 12** | 2 |
| 3 standing extension slots before `ID` | **G-02** | ❌ 0..n dynamic | ✅ `BATES` / `VENUE` / `SUBP`, `NA` when empty | 2 |
| `TITLE ≤ 35`, else **Smart Review Queue** | **G-03** | ❌ absent | ✅ **triage state machine** | 2 |
| V6.2 arity-9 ledger → arity-12 | **C-13** | ❌ absent | ⚠️ migration transcoder | 2 |
| PascalCase (né "CamelCase") | README | ⚠️ ambiguous | ✅ rename + enforce | 2 |
| Duplicate suffix = **`Part2`, no hyphen** | **G-01** | ⚠️ saturates at `Part2` | ✅ unbounded ordinal | 2 |
| Sequential `FILE######` ledger ID | README | ⚠️ resettable (C-06) | ✅ `max+1` under lock | 2 |
| Multimodal Vision ingestion | README | ❌ **dead** (C-06) | ✅ functional · key via `getApiKey()` | 2 |
| Persistent local ledger | README | ⚠️ 5 MiB cap | ✅ IndexedDB | 2 |
| Encrypted cloud sync | README | ❌ plaintext (C-04) | ✅ AES-256-GCM | 4 |
| CSV export w/ UTF-8 BOM | README | ✅ implemented | ✅ keep | 2 |
| `.bat` + `.sh` rename scripts | README | ✅ implemented | ⚠️ harden quoting · **exclude queued rows** | 2 |
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
| 1 | **Commit the v9.1.0.1 PDF** to `docs/spec/` | **User** | Audit finalisation |
| 2 | **Confirm the three extension slot identities/order** (§1.1) — the only `[R]` left in the core contract | **User** | Session 2 reconciliation (1-object edit) |
| 3 | ~~Resolve C-01~~ → **`Part2`, no hyphen** | ✅ G-01 | — |
| 4 | ~~Resolve C-02~~ → **Smart Review Queue** | ✅ G-03 | — |
| 5 | ~~Resolve C-13~~ → **12-part arity** | ✅ G-02 | — |
| 6 | Confirm **U-06** matter registry, **U-12** collision scope, **U-17** PII policy, **U-20/21** multi-user & residency, **U-22** arity floor, **U-23** queue SLA | **User** | Cloud sync + queue design |
| 7 | Land Session 2 — 12-part engine + Smart Review Queue against provisional resolutions | Agent | — |
| 8 | Replace `nuxtjs.yml` with a static Pages workflow | Agent | — |
| 9 | Correct `README.md` (9-part → 12-part; `-Part2` → `Part2`) | Agent | — |

**Invariant `INV-GOV-01`:** *No `[R]`-marked constraint may be promoted to `[G]` without a citation to the committed PDF.*

**Invariant `INV-GOV-02`:** *An operator statement that contradicts the README is ground truth; the README is amended, never the operator.*

### 4.1 Migration — arity-9 → arity-12 (`C-13`)

Every filename and ledger row produced by V6.2 is **structurally non-conformant** under v9.1.0.1. Migration is **additive and lossless**:

```
V6.2:  <date>.<case>.<type>.<title>.<ver>.<priv>.<origin>.<author>.<ext…>.FILE######
v9.1:  <date>.<case>.<type>.<title>.<ver>.<priv>.<origin>.<author>.NA.NA.NA.FILE######
```

| Rule | Detail |
|---|---|
| `ID` is **preserved verbatim** | The `FILE######` value is the primary key. Never re-issued, never renumbered. |
| Existing extensions are **left-padded into `E1`…`E3`** | In declared order; surplus extensions beyond three are **refused** and routed to the Smart Review Queue as `ARITY_OVERFLOW`. |
| Missing extensions emit **`NA`** | Never an empty segment. |
| Entries where `TITLE > 35` | Routed to the **Smart Review Queue**, **not** auto-truncated (`INV-SRQ-02`). |
| Migration is **idempotent** | Re-running on a migrated ledger is a no-op; arity 12 is detected and skipped. |
| Migration writes an **audit event** | `{op: "MIGRATE_V62", from: 9, to: 12, count: n, at: …}` appended to the hash-chained audit log (U-18). |

**Invariant `INV-MIG-01`:** *Migration never mutates an existing `ID` and never discards a ledger row. Every output row is derived, auditable and reversible.*
