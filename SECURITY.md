# Security Policy

## Supported release

The current maintained application is V9.1.0.1 (`v9/index.html`) and its bundled Capacitor shell. The root V6.2 files are retained as historical artifacts, not as the active V9 policy engine.

## Report a vulnerability privately

Please do **not** open a public issue for a suspected security vulnerability. Use GitHub's **Report a vulnerability** flow for this repository (Security tab → Advisories → Report a vulnerability) so the maintainers can coordinate a private fix and disclosure. If private reporting is unavailable, contact the repository owner through the verified GitHub profile; do not include confidential legal documents, client data, credentials, API keys, encrypted backups, or raw production records in the report.

Include only the affected version/commit, a concise reproduction, expected and actual behavior, and sanitized logs. Allow time for triage and a coordinated release before publishing technical details.

## Data and secret handling

- This is a local-first document metadata tool, not a hosted multi-user service or a WORM/legal-hold system.
- Never put API keys, signing material, keystores, provisioning profiles, private documents, or real client records in source control, CI logs, public issues, screenshots, or release archives.
- Optional AI requests are a separate user-initiated network feature; review the actual request payload and provider terms before use with sensitive records.
- The browser API key is transient in memory. It is not a substitute for managed organizational secret storage.
- Do not assume that a local encrypted export, device backup, or release checksum alone provides identity, authorization, retention, or legal admissibility.

## CI and release integrity

Workflow actions are pinned to full commit SHAs. Tagged source releases are tested, packaged, checksummed, and attested with GitHub build provenance. Verify both the release checksum and the provenance against this repository before relying on an archive.
