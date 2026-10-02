# Session 3 Report — SPA Deployment Guide

**Date:** 2026-10-02  
**Branch:** `arena/01a0fc76-index-engine-v6-2`  
**Master input:** user-pasted EFNAI V9.1.0.1 documentation. Older editions are treated as superseded wherever they conflict.

## Delivered

| Artifact | Result |
|---|---|
| `docs/GUIDE-SPA.md` | Beginner build, persistence, PWA, Pages, HTTPS/custom-domain, CSP, performance, and troubleshooting guide |
| `v9/index.html` | Tailwind v4 output inlined; removed runtime Tailwind CDN request |
| `v9/manifest.webmanifest`, `v9/sw.js`, `v9/icon.svg` | Optional installable PWA shell; service worker is limited to static same-origin app assets |
| `.github/workflows/pages.yml` | Build-free GitHub Pages deploy from `v9/` |
| `.github/workflows/nuxtjs.yml` | Removed: it ran `npm ci`/Nuxt generate despite there being no Nuxt application and deployed the wrong directory |
| `tools/static-server.mjs` | Node-only local preview server bound to `0.0.0.0`, with path traversal guard |
| `tools/tailwind.css`, `tools/inline-tailwind.mjs` | Maintenance-time Tailwind v4 compile-and-inline pipeline; the released HTML itself needs no build |

## Checks

- `npm run build:spa` — **passed**; Tailwind output was embedded in the HTML.
- `npm test` — **122/122 passed** (20 terminal-engine assertions, 102 v9 assertions).
- `node --check tools/static-server.mjs` — **passed**.
- `node --check v9/sw.js` — **passed**.
- Static HTML test asserts no Tailwind CDN or script `src` dependency and checks the local manifest link.

## Decisions and conflicts

- Core app code, CSS, and markup stay in one runnable HTML file. PWA installability requires a manifest and a service worker, so these are explicitly optional same-origin sidecars; the service worker never caches files, ledger exports, or API responses.
- GitHub Pages now publishes only `v9/`. The old Nuxt workflow was not a viable static-site build and is replaced by the Pages artifact workflow.
- The pasted V9.1.0.1 docs identify Smart Review Queue and its uncertainty role. The numeric `TITLE > 35` threshold remains a separate operator-confirmed rule from the preceding conversation.
- The attachment manifest names a 13th Addendum, but its body and the PDF binary were not accessible in the workspace. This report does not claim to have audited unseen text.

## Acceptance gate

**Passed for Session 3.** A reader with Node 20 can run the test suite and local preview without installing a SPA framework; the Pages workflow is build-free and uploads the static V9 app directory. The core HTML is immediately runnable, independent of the optional PWA sidecars.
