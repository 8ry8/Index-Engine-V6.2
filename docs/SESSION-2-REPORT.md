# Session 2 Report — V9.1.0.1 Core Engine

**Report date:** 2026-10-02<br>
**Branch:** `arena/01a0fc76-index-engine-v6-2`<br>
**Normative source:** accessible user-supplied Version 9.1.0.1 text, with operator-confirmed duplicate and title-overflow rules.

## Recovery notice

This report was added while reconciling the current checkout. `git log --all` showed only baseline `a8814bb`; no earlier Session 2 commit was available to inspect. The V9 artifact present today also includes Session 4 hardening. This report documents current verifiable behavior, not an asserted reconstruction of every historical intermediate revision. See `docs/SESSION-PLAN.md`.

## Delivered

| Capability | Result |
|---|---|
| Canonical naming | Twelve semantic parts in `DATE, CASE, TYPE, TYPE2, TITLE, VER, PRIV, PRIV2, ORIGIN, ORIGIN2, AUTHOR, ID` order; fourteen delimited fields because DATE has three fields |
| Taxonomy and validation | Controlled primary/secondary fields; `NA` only in `TYPE2`, `PRIV2`, `ORIGIN2`; mixed-case examples preserved |
| Title overflow | `TITLE > 35` is preserved and routed to Smart Review Queue; no silent truncation |
| Duplicate handling | `Part2`, no hyphen, re-tested for further collisions |
| IDs | New IDs use eight digits and persistent max+1 high-water; legacy IDs are preserved during migration |
| Review queue | Uncertainty is visible, attributed, transactional, and excluded from rename scripts until committed |
| Single-file runtime | `v9/index.html` contains inline CSS and JavaScript and opens without a build step or runtime CDN |
| Migration | Legacy V6.2 names are mapped conservatively; unclassifiable legacy fields remain queued instead of being guessed |

## Verification in the current checkout

- `npm run test:v9` — **24/24 passed**.
- Includes 10,000-name round-trips, canonical slot and `NA` checks, title overflow, `Part2`, eight-digit IDs, file extensions, queue behavior, and migration preserving IDs.
- Session 4 report adds the cryptography, persistence, integrity, cross-tab, and restore verification details.

## Limits / unresolved policy

The accessible master text governs; this report does not infer the body of section 13 or claim review of the PDF binary. Version precedence among `vNN`, `DRAFT`, `FINAL`, `REV`, and `EXE`, organization-wide AUTHOR/case registries, user identity/RBAC, cloud sync, retention, and legal-hold requirements remain open in `docs/SPEC-AUDIT.md`.
