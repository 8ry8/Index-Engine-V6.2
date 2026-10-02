## Change summary

<!-- What changed and why? -->

## Scope and policy

- [ ] V9.1.0.1 master contract is preserved, or policy impact/conflicts are explicitly identified.
- [ ] No claim is made to have inspected inaccessible section 13 content or the PDF binary.
- [ ] The canonical SPA remains a self-contained HTML file with no runtime CDN/build dependency.
- [ ] Android/iOS wrappers still sync from `v9/index.html`; no divergent policy implementation was introduced.

## Verification

- [ ] `npm run lint`
- [ ] `npm run check:build`
- [ ] `npm audit --audit-level=moderate`
- [ ] Mobile checks/builds, if affected (list commands and host/toolchain)

## Security and privacy

- [ ] No credentials, private documents, client records, local ledger, or signing material are included.
- [ ] Any new network request, permission, dependency, workflow token permission, or data retention is documented.

## Evidence

<!-- Add sanitized screenshots/log snippets if useful. -->
