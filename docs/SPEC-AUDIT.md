# SPEC AUDIT — EFNAI V9.1.0.1 Master vs. V6.2

**Document ID:** `IDX-AUDIT-v9.1.0.1-001`<br>
**Target repo:** `8ry8/Index-Engine-V6.2`<br>
**Branch:** `arena/01a0fc76-index-engine-v6-2`<br>
**Audit date:** 2026-10-02 · **Revision 3 — corrected to the user-supplied master text**

> **Source authority:** The user-supplied Version 9.1.0.1 text is the normative master and supersedes V6.2, the repository README, and earlier audit reconstructions wherever they conflict. The pasted material is readable in the conversation. The body of section 13 (the Addendum) was not pasted or accessed, and the PDF binary is not in the workspace; this audit does **not** claim review of either unseen item or all thirteen section bodies.
>
> This revision corrects the earlier provisional interpretation that slots 9–11 were `E1/E2/E3` (Bates/Venue/Subpoena). Those names and use cases came from the older V6.2 README and are **not** the V9.1.0.1 master slot identities.

## 1. Normative nomenclature contract

### 1.1 Twelve semantic parts, fourteen period-delimited fields

The canonical semantic order is:

`DATE, CASE, TYPE, TYPE2, TITLE, VER, PRIV, PRIV2, ORIGIN, ORIGIN2, AUTHOR, ID`

The serial form is:

```text
[YYYY.MM.DD].[CASE].[TYPE].[TYPE2].[TITLE].[VER].[PRIV].[PRIV2].[ORIGIN].[ORIGIN2].[AUTHOR].[ID][.extension]
```

`DATE` contains two periods, so twelve semantic parts occupy fourteen period-delimited fields. A file extension such as `.pdf`, `.docx`, or `.tar.gz` follows the ID and is file metadata, not a thirteenth nomenclature part.

| # | Part | Conformance notes |
|---:|---|---|
| 1 | `DATE` | `YYYY.MM.DD`; use the document/reference date, not file modification time. |
| 2 | `CASE` | Mixed-case examples are normative evidence; do not force the entire name to uppercase. |
| 3 | `TYPE` | Primary controlled-taxonomy code. |
| 4 | `TYPE2` | Secondary subtype or `NA`. |
| 5 | `TITLE` | Human-readable mixed-case title. More than 35 characters routes to Smart Review Queue; never silently truncate. |
| 6 | `VER` | Includes `v01`-style labels and the full values `FINAL`, `DRAFT`, `REV`, and `EXE`; do not abbreviate these to `FIN` or `DRAF`. |
| 7 | `PRIV` | Primary controlled-taxonomy code. |
| 8 | `PRIV2` | Secondary sensitivity marker or `NA`. |
| 9 | `ORIGIN` | Primary source-family code. |
| 10 | `ORIGIN2` | Specific source or `NA`. |
| 11 | `AUTHOR` | Mixed-case examples are valid; do not uppercase the complete value. |
| 12 | `ID` | Terminal immutable archive identifier. Newly allocated IDs use eight numeric digits, e.g. `FILE00000001`; imported legacy IDs are preserved verbatim rather than renumbered. |

**`NA` rule:** `NA` is permitted only in `TYPE2`, `PRIV2`, and `ORIGIN2`. It is not a general missing-value marker for primary fields.

**Case and examples:** the master examples include mixed-case `CASE`, `TITLE`, and `AUTHOR`, eight-digit `FILE` IDs, and full version values. Historical V6.2 uppercase normalization, abbreviated versions, and its dynamic extension placement do not override those examples.

### 1.2 Operator confirmations that remain in force

| Decision | Normative treatment |
|---|---|
| Duplicate title suffix | `Part2`, `Part3`, … with **no hyphen**; re-test each candidate. |
| `TITLE > 35` | Included in the Smart Review Queue workflow by operator confirmation; retain the full title and require human action. |
| Policy shape | Twelve semantic parts, in the exact order above. |
| Section 13 | Its body was not accessible; do not infer its content from the attachment manifest. |

The Smart Review Queue is present in the pasted Version 9.1.0.1 material. That fact is distinct from whether a particular pasted subsection itself spells out the numeric `TITLE > 35` trigger; the trigger is additionally confirmed by the operator.

### 1.3 Serialization invariants

- **`INV-NOM-01` — delimiter:** period is the field delimiter; `DATE` is the sole semantic part that embeds it.
- **`INV-NOM-02` — order:** all twelve slots appear in the fixed sequence above.
- **`INV-NOM-03` — immutable terminal ID:** IDs are not reused, removed, or rewritten during migration or restore. New allocations use max+1 with a persistent high-water mark and a write-time uniqueness check.
- **`INV-NOM-04` — case:** preserve valid mixed-case values; do not uppercase `CASE`, `TITLE`, or `AUTHOR` wholesale.
- **`INV-NOM-05` — title:** `TITLE` is at most 35 characters for automatic commit; overflow remains intact in review.
- **`INV-NOM-06` — serializer:** one builder/parser pair owns the filename layout; extension parsing is separate from the twelve parts.
- **`INV-NOM-07` — semantic arity:** exactly twelve parts, represented by fourteen policy fields because `DATE` has width three.
- **`INV-NOM-08` — length:** generated filename budget is 180 characters; reject for review rather than clipping fields.
- **`INV-NOM-09` — supersession:** the V9.1.0.1 master outranks README/V6.2 wording when they conflict.
- **`INV-NOM-10` — parts vs. fields:** arity checks count semantic parts; parser checks count delimited fields.
- **`INV-DUP-01` — collision suffix:** use `Part2`, no hyphen; re-test successive ordinals. If a suffix would violate `TITLE`/filename limits, preserve the title and queue it for review.
- **`INV-DUP-02` — collision equality:** compare the complete non-ID part tuple, never substrings. Whether collision scope should be matter-specific remains U-12.
- **`INV-ID-01` — allocation:** new ID is max(existing numeric suffix, persisted high-water)+1 and is asserted unique immediately before atomic persistence; never wrap or reuse.
- **`INV-MIG-01` — migration:** additive, lossless, and ID-preserving; unclassifiable legacy segments remain review metadata rather than being guessed into secondary taxonomy fields.

## 2. Security and persistence requirements

### 2.1 Hash-chained append-only history

Ledger rows and audit events are chained with SHA-256. A row hash covers the complete row except the self-referential `hash` and `prevHash` fields, with the previous hash included in the digest input. Current broken chains are preserved as evidence and block new audited appends; they are never silently re-hashed into apparent validity. Legacy hashless rows may be upgraded additively, retaining original fields and recording a migration event when the prior audit chain is valid.

- Commit, queue mutation, queue resolution/discard, intake-hash recording, taxonomy changes, migration, and restore use atomic multi-key writes.
- IndexedDB is authoritative. The one-time localStorage import is additive and verified; legacy values are not cleared as part of startup.
- Cross-tab IndexedDB write transactions serialize the read/modify/write operation. Web Locks/BroadcastChannel are used where available; localStorage-only fallback uses a single write lock and replayable journal.
- Queue exits carry `resolvedBy`/`resolvedAt`, and a discard is an attributed audit event. The browser-only build currently records the local actor as `operator`; it is not an identity or RBAC system.

### 2.2 Encrypted backup and credential handling

The browser backup is a local download/restore feature, not cloud sync. It uses AES-256-GCM, PBKDF2-SHA256 with 600,000 iterations, fresh salt and IV per export, and authenticated header metadata. Restore authenticates/decrypts first, verifies the ledger, audit chain, vault metadata, ID uniqueness, and sequence high-water marks, then asks for explicit replacement confirmation. A restore event is appended to the restored audit chain. The persistent ID high-water mark is not reduced by restore.

Backup content includes ledger/queue/taxonomy/sequence/audit and intake metadata. It excludes the Gemini key and document bytes. The API key is held in memory for at most 30 minutes and is never written to localStorage or IndexedDB.

- **`INV-SEC-01` — backup confidentiality/integrity:** require authenticated AES-256-GCM encryption before an exported backup leaves the browser.
- **`INV-SEC-02` — credential lifecycle:** keep the Gemini credential in memory only, expire it, and exclude it from every persistent/backup payload.
- **`INV-AI-01` — call-time credential access:** resolve the key through `getApiKey()` and surface missing/expired-key prompts rather than sending a silent empty-key request.
- **`INV-AI-02` — model stability:** use a configurable GA model identifier by default; do not hard-code a dated preview alias.

### 2.3 Intake integrity boundary

Files are hashed locally at intake. The Integrity Vault stores source SHA-256, filename, size, MIME type, source metadata, timestamp, and a metadata digest; the SPA does not persist or upload document bytes. Verification of the metadata digest does not re-hash a later archived copy because the SPA has no copy of those bytes. A failed hash or missing vault link remains a review exception unless an operator explicitly overrides it.

## 3. Historical V6.2 conflicts and resolution

| Topic | Older V6.2/README behavior or wording | V9.1.0.1 treatment |
|---|---|---|
| Part count | Older 9-part formula plus dynamically inserted extension values | Fixed 12-part order with `TYPE2`, `PRIV2`, and `ORIGIN2` standing in positions 4, 8, and 10. |
| Secondary slots | No equivalent fixed secondary fields | `TYPE2`, `PRIV2`, and `ORIGIN2`; `NA` only in these fields. Do not relabel them Bates/Venue/Subpoena. |
| Title overflow | Accept or silently clip long titles | Preserve full title and route `TITLE > 35` to human review. |
| Duplicate naming | Prior descriptions used a hyphen and/or stopped at `Part2` | `Part2`, no hyphen; continue with a re-tested ordinal. |
| Version labels | Shortened legacy values such as `FIN`/`DRAF` | Preserve master examples `FINAL`, `DRAFT`, `REV`, `EXE` and `v01` forms. |
| Field case | Older paths uppercased values | Mixed-case `CASE`, `TITLE`, and `AUTHOR` examples remain valid. |
| ID width | Some old examples use six digits | New IDs use eight digits; migration preserves each existing ID verbatim. Never wrap or reuse. |
| File extension | Could be conflated with dynamic segments | Extension follows ID and is not one of the twelve parts. |
| Persistence/security | Plain browser storage and plaintext key/backup risks | IndexedDB primary, additive localStorage migration, append-only chains, local encrypted backup, memory-only expiring AI key. |
| Deployment | Nuxt workflow did not match the static SPA | GitHub Pages publishes the self-contained `v9/` SPA without a runtime/build dependency. |

These are conflicts between editions/implementations, not evidence that the inaccessible Addendum says something different. Undefined rules remain surfaced below rather than being filled in by inference.

## 4. Smart Review Queue contract

Uncertainty is quarantined, not guessed. A queued record does not receive a committed archive ID until it is resolved, except for a legacy ID explicitly reserved during an additive V6.2 import. A record cannot leave the queue without a recorded human decision and timestamp.

Current review triggers include title overflow, unknown/ambiguous/implausible date, low confidence, taxonomy failure, missing source hash, reserved filename, legacy arity overflow, filename-length overflow, disambiguation overflow, and exhausted ID space. A trigger name or threshold not established by accessible master text is an implementation rule, not a claim about section 13.

Queue and ledger IDs are separate namespaces: queue IDs use `SRQ-` plus a monotonic sequence; archive IDs use `FILE` plus the numeric high-water mark. Queue removal, resolution, and discard are transactional with their audit events.

- **`INV-SRQ-01` — uncertainty:** never guess a missing or ambiguous policy value into a committed record.
- **`INV-SRQ-02` — title overflow:** keep the complete `TITLE`; require human review for values over 35 characters and for suffix overflow.
- **`INV-SRQ-03` — queue exit:** a queued row leaves only through an attributed human resolution or discard event with actor and timestamp.

## 5. Undefined or deployment-dependent properties

The following items are not silently treated as settled by this implementation. Some have safe local defaults; others require policy-owner input before an organizational or multi-user deployment.

| ID | Undefined property | Current safe treatment / status |
|---|---|---|
| U-01 | Unknown or illegible document date | Keep unknown; route to review. Never substitute file mtime. |
| U-02 | Ambiguous `MM/DD` vs `DD/MM` date | Route for human adjudication; do not guess. |
| U-03 | Local vs UTC “today” | Use local calendar date for prefill. |
| U-04 | Unicode/diacritic folding | Fold to ASCII through the sanitizer; verify source text before final use. |
| U-05 | Institutional/non-person `AUTHOR` values | Alphanumeric mixed-case is supported; exact authority/registry rules remain undefined. |
| U-06 | Controlled matter/case registry and aliases | Not implemented; matter-name governance remains open. |
| U-07 | Per-segment maximums beyond explicit title/name budget | Current UI/parser bounds are implementation limits; review policy-owner requirements before enforcing organizational limits. |
| U-08 | Illegal filesystem characters | Sanitizer removes them; generated scripts use safe quoting and reject unsafe batch filenames. |
| U-09 | Reserved Windows device names | Guarded by suffixing `_`; verify platform-specific edge cases before large batch rename. |
| U-10 | Trailing dot/space | Stripped by the sanitizer. |
| U-11 | Total ordering between `vNN`, `DRAFT`, `FINAL`, `REV`, `EXE` | Values are supported; no total precedence is inferred. Define before any “latest version” automation. |
| U-12 | Deduplication scope | Current engine compares the complete non-ID tuple across the local ledger; policy may require matter-specific scope. |
| U-13 | Delete, void, supersede lifecycle | IDs are never reused; no destructive ledger wipe is exposed. Formal retention/void rules remain open. |
| U-14 | Cross-tab and crash consistency | IndexedDB transactions plus Web Locks/BroadcastChannel when available; localStorage fallback journals writes. Verify on target browsers. |
| U-15 | Browser quota and private-mode behavior | IndexedDB primary with compatibility mirror; failures are surfaced. Backups remain essential. |
| U-16 | Intake batch size | Current limits: 25 files, 20 MiB each, 200 MiB total per batch; tune only with memory testing. |
| U-17 | PII in filenames and taxonomy policy | Current taxonomy supports sensitivity labels; exact redaction/classification requirements need a policy owner. |
| U-18 | WORM/legal-hold guarantees | Hash chains detect edits; browser storage is not WORM or a trusted timestamp authority. Use external access controls/immutable storage for legal hold. |
| U-19 | Backup passphrase rotation/re-encryption workflow | KDF/cipher metadata is versioned; a dedicated re-key workflow is not implemented. |
| U-20 | Identity, RBAC, and multi-user attribution | Out of scope for the local SPA; `operator` is not authenticated identity. Define before shared organizational use. |
| U-21 | Cloud residency/sync and backup ownership | No cloud sync is implemented. Define provider, region, access, retention, and recovery ownership separately. |
| U-22 | Additional parts beyond the fixed twelve | Not supported; accessible master order is exactly twelve parts. Revisit only if the policy owner supplies a superseding edition. |
| U-23 | Review SLA/escalation | Queue depth and age are visible; no automatic discard or escalation is implemented. |
| U-24 | Secondary-slot ordering/meaning | Fixed, order-significant positions: TYPE2, PRIV2, ORIGIN2. |
| U-25 | Queued records in rename scripts | Excluded. Only committed ledger records are scripted. |
| U-26 | Section 13 Addendum body | Not supplied/accessed. Do not infer its contents or claim a thirteen-section audit. |
| U-27 | Filename-extension suffix rules | Current code accepts up to three suffix components within a 32-character extension; confirm policy-owner needs if broader support is required. |

## 6. Session 4 implementation traceability

| Requirement | Implementation location | Verification |
|---|---|---|
| Canonical twelve-part order, secondary slots, title overflow, versions, extensions | `v9/index.html` | 10,000-name round-trip and policy tests |
| AES-GCM/PBKDF2 encrypted backup and verified restore | `encryptBackup`, `decryptBackup`, `restoreEncryptedBackup` | Round trip, wrong passphrase, altered ciphertext, restore audit/high-water tests |
| Memory-only 30-minute AI credential | Settings UI and `getApiKey` | Tests confirm memory-only set/clear; key absent from persistent payload |
| IndexedDB and localStorage compatibility migration | `Store.init`, `hydrateStore` | fake-indexeddb migration and localStorage-journal tests |
| Atomic cross-tab ledger/queue/audit writes | `Store.transact`, `commitRecord`, `enqueue`, queue exit paths | Concurrent two-context IndexedDB append test; chain and ID uniqueness verified |
| Complete-record ledger/audit chains | `rowHash`, `makeAuditEntry`, `verifyChain` | Tampered ledger/audit row tests |
| Intake file SHA-256 and metadata-only Integrity Vault | `runExtraction`, `makeVaultRecord`, `verifyVault` | Real byte-buffer hashing test; bytes absent from durable metadata |
| Monotonic ID allocation | `nextId`, `idHighWater` state, restore/migration | Concurrent append and restore high-water tests |
| Session 4 test suite | `tools/tests/v9-engine.test.js` | Run with `npm test`; see `docs/SESSION-4-REPORT.md` |

## 7. Acceptance and source-access limits

Session 4 acceptance checks tamper detection, altered-backup rejection, non-reused IDs, concurrent IndexedDB append uniqueness/chain integrity, and additive migration preserving existing IDs. Verification results are recorded in `docs/SESSION-4-REPORT.md`.

Only accessible user-supplied text and repository artifacts were considered. The body of section 13 and the PDF binary were not accessed; this audit does not represent unseen content as reviewed.
