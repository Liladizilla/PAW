# P.A.W. Delivery Pipelines

Status: initial CI/security pipelines are operational. Preview deployment is supplied by Vercel Git integration. Native release packaging exists but has not been certified on all three operating systems.

## Pipeline map

| Pipeline | Trigger | Required gates | Output |
|---|---|---|---|
| Pull request validation | PR to main | `npm ci`, TypeScript checks, runtime unit tests, production build | build artifact and check summary |
| Main validation | push to main | same validation gates | build artifact and commit status |
| Secret/dependency security | PR, main, weekly schedule | Gitleaks scan, npm dependency audit | secret scan result and audit report |
| Dependency updates | weekly/monthly | Dependabot PRs for npm and GitHub Actions | reviewable dependency updates |
| Preview deployment | PR or main | web-safe build, secret scan, browser smoke tests | preview URL and test result |
| Desktop packaging | v* tag or manual dispatch | validation gates, tag/version check, clean install | Linux AppImage/deb, Windows NSIS, macOS dmg/zip |
| Release publication | after platform jobs succeed | artifact integrity and release notes | GitHub Release |
| End-to-end smoke | manual/scheduled and pre-release | install/start/quit, runtime health, UI load | platform report |
| Migration verification | persistence changes | fresh DB, prior schema fixture, upgrade/recovery | migration report |

## Current workflows

- `.github/workflows/ci.yml`: typecheck and production build on PRs to main, pushes to main and manual dispatch.
- `.github/workflows/release.yml`: native platform packaging on version tags or manual dispatch; publishes GitHub Releases for version tags.
- `.github/workflows/security.yml`: Gitleaks secret scan and npm audit report on PRs, main pushes, weekly schedule and manual dispatch.
- `.github/dependabot.yml`: weekly npm dependency proposals and monthly GitHub Actions updates.

These workflows are a first operational baseline, not full release certification. `package-lock.json` is committed and CI has completed a clean `npm ci`, typecheck, runtime unit-test and production-build run successfully. The CI bootstrap still refreshes the lockfile when `package.json` changes, then enforces `npm ci`. The security workflow audits the lockfile and retains its JSON report; critical findings fail the job, while high and moderate findings are reported for triage before release.

## CI contract

1. Keep `package.json` and `package-lock.json` synchronized; use `npm ci` for all validation and packaging steps.
2. Cache npm by lockfile hash after the lockfile exists.
3. Run format/lint, strict typecheck for renderer and Electron, unit tests, runtime contracts, persistence tests and production builds.
4. Fail if expected build outputs are missing.
5. Run dependency audit and secret scanning. Report severity and dependency path; never silently ignore critical findings.
6. Upload test reports and build artifacts on success; upload safe diagnostic reports on failure.
7. Use least-privilege workflow permissions and cancel superseded PR runs.
8. Pin third-party GitHub Actions to reviewed immutable SHAs before production release hardening.

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
- [x] Initial PR/main CI, secret scan, dependency audit and Dependabot configuration added.
- [ ] CI includes automated tests, lint/format and clean locked install.
- [ ] Preview deployment and browser smoke test linked to commits.
- [ ] Unit/integration/E2E reports published.
- [ ] Native Linux, Windows and macOS packages succeed.
- [ ] Checksums and release notes attached.
- [ ] Secret scanning, permissions and branch protection verified.
- [ ] Release candidate installed and exercised on supported OSes.
