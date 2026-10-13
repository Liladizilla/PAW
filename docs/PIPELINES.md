# P.A.W. Delivery Pipelines

Status: target pipeline contract. A documented stage is not operational until its workflow exists and a successful run is linked.

## Pipeline map

| Pipeline | Trigger | Required gates | Output |
|---|---|---|---|
| Pull request validation | PR to main | locked install, format/lint, typecheck, unit/integration tests, renderer/desktop builds, security checks | reports and build artifact |
| Main validation | push to main | same required validation gates | immutable artifact and commit status |
| Preview deployment | PR or main | web-safe build, secret scan, browser smoke tests | preview URL and test result |
| Desktop packaging | v* tag or manual dispatch | all gates, tag/version check, clean install | Linux AppImage/deb, Windows NSIS, macOS dmg/zip |
| Release publication | after platform jobs succeed | artifact integrity and release notes | GitHub Release |
| Dependency review | weekly and dependency changes | audit, dependency diff, secret scan, static analysis | security report |
| End-to-end smoke | manual/scheduled and pre-release | install/start/quit, runtime health, UI load | platform report |
| Migration verification | persistence changes | fresh DB, prior schema fixture, upgrade/recovery | migration report |

## CI contract

1. Start with Node.js 20 LTS and pin toolchain versions consistently.
2. Commit a supported package lockfile and use npm ci everywhere. Avoid npm install in CI because it may resolve a different tree.
3. Cache npm by lockfile hash.
4. Run format/lint, strict typecheck for renderer and Electron, unit tests, runtime contracts, persistence tests and production builds.
5. Fail if expected build outputs are missing.
6. Run dependency audit and secret scanning. Report severity and dependency path; never silently ignore critical findings.
7. Upload test reports and build artifacts on success; upload safe diagnostic reports on failure.
8. Use least-privilege workflow permissions and cancel superseded PR runs.
9. Pin third-party GitHub Actions to reviewed immutable SHAs before production release hardening.

## Preview pipeline

Browser preview is a UI demonstration, not the authoritative desktop app or an execution environment. It must never receive provider secrets.

- Create a web-safe renderer build only if Electron APIs are isolated behind a typed bridge and mock adapter.
- Label mock nodes and simulated activity.
- Fail preview checks if secret-like values are bundled.
- Deploy immutable PR previews and a stable main preview.
- Smoke-test HTTP status, static assets, renderer boot and key navigation.
- A green Vercel deployment proves deployment health only, not runtime functionality.

## Desktop release pipeline

1. Verify tag points to a validated commit and matches package version.
2. Install with the committed lockfile.
3. Run validation gates on each OS.
4. Package Linux AppImage/deb, Windows NSIS and macOS dmg/zip on native runners.
5. Generate SHA-256 checksums and SBOM/provenance when feasible.
6. Upload artifacts with explicit platform and architecture names.
7. Publish only after all platform jobs succeed.
8. Test upgrade, uninstall, data preservation and clean-machine startup before stable status.
9. Signing/notarization credentials are protected environment secrets, never repository files. Missing signing is labelled unsigned.

## Security pipeline

- Secret scanning for committed tokens and credentials.
- Dependency audit with a documented, expiring exception process.
- Static analysis and strict TypeScript.
- Dependency license inventory for commercial distribution.
- SBOM generation for release candidates.
- Permission manifest validation for tools/plugins.
- Threat-focused tests for traversal, IPC abuse, policy bypass, prompt injection and secret redaction.
- Release workflow grants write permissions only to publication; build jobs are read-only.

## Branch and release policy

Use feature branches and pull requests. Required checks should include CI, tests, security scan and build. Do not auto-merge or release merely because an agent claims tests passed. Tags are created intentionally after acceptance. Workflow changes are security-sensitive.

## Completion checklist

- [ ] Lockfile committed and npm ci verified.
- [ ] PR/main CI, security scan and dependency review operational.
- [ ] Preview deployment and browser smoke test linked to commits.
- [ ] Unit/integration/E2E reports published.
- [ ] Native Linux, Windows and macOS packages succeed.
- [ ] Checksums and release notes attached.
- [ ] Secret scanning, permissions and branch protection verified.
- [ ] Release candidate installed and exercised on supported OSes.

The repository currently has basic build and release workflows, not every pipeline listed here.
