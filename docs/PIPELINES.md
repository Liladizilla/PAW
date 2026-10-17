# P.A.W. Delivery Pipelines

Status: GitHub Actions CI/security pipelines are operational. P.A.W. is a native desktop engine/workspace; Vercel and hosted web-preview deployment are not part of its build, runtime, or release path. Native release packaging exists but has not been certified on all three operating systems.

## Pipeline map

| Pipeline | Trigger | Required gates | Output |
|---|---|---|---|
| Pull request validation | PR to `main` or `architecture/system-blueprint` | `npm ci`, TypeScript checks, unit tests, production build, Linux Electron startup smoke | build artifact and check summary |
| Branch validation | push to `main` or `architecture/system-blueprint` | same validation gates | build artifact and commit status |
| Secret/dependency security | PR, main/system-blueprint pushes, weekly schedule | Gitleaks scan, npm dependency audit | secret scan result and audit report |
| Dependency updates | weekly/monthly | Dependabot PRs for npm and GitHub Actions | reviewable dependency updates |
| Desktop packaging | `v*` tag or manual dispatch | validation gates, clean install, Linux Electron startup smoke | Linux AppImage/deb, Windows NSIS, macOS dmg/zip |
| Release publication | after platform jobs succeed | artifact integrity and release notes | GitHub Release |
| End-to-end smoke | manual/scheduled and pre-release | install/start/quit, runtime health, UI load | platform report |
| Migration verification | persistence changes | fresh DB, prior schema fixture, upgrade/recovery | migration report |

## Current workflows

- `.github/workflows/ci.yml`: typecheck, unit tests, production build and Linux Electron startup smoke on PRs and pushes to `main` or `architecture/system-blueprint`, plus manual dispatch.
- `.github/workflows/release.yml`: validates and smoke-tests the desktop app, packages native platforms on version tags or manual dispatch, and publishes GitHub Releases for version tags.
- `.github/workflows/security.yml`: Gitleaks secret scan and npm audit report on PRs, pushes to `main` or `architecture/system-blueprint`, weekly schedule and manual dispatch.
- `.github/dependabot.yml`: weekly npm dependency proposals and monthly GitHub Actions updates.

These workflows are a first operational baseline, not full release certification. There is no Vercel project requirement, web deployment step, or hosted preview dependency for the desktop engine. A legacy Vercel commit status may still appear on historical/current commits from the former project integration; it is not produced by these workflows. If it blocks merging, remove that status from the repository's required checks or disconnect the old GitHub/Vercel integration in repository settings. Do not reintroduce Vercel as a desktop build dependency to satisfy it. The latest recorded CI run completed successfully for typecheck, unit tests and production build; the desktop smoke step is now included in CI for future runs. Dependency changes must update `package.json` and `package-lock.json` together. CI uses `npm ci` and read-only repository permissions, so it cannot silently rewrite dependency resolution on a pull request. The security workflow audits the lockfile and retains its JSON report; critical findings fail the job, while high and moderate findings are reported for triage before release.

## CI contract

1. Keep `package.json` and `package-lock.json` synchronized; use `npm ci` for all validation and packaging steps.
2. Cache npm by lockfile hash after the lockfile exists.
3. Run strict typecheck for renderer and Electron, unit tests, persistence tests, production builds, and the desktop startup smoke.
4. Fail if expected build outputs are missing or Electron exits before renderer readiness.
5. Run dependency audit and secret scanning. Report severity and dependency path; never silently ignore critical findings.
6. Upload build artifacts on success and safe diagnostic reports on failure.
7. Use least-privilege workflow permissions and cancel superseded PR runs.
8. Pin third-party GitHub Actions to reviewed immutable SHAs before production release hardening.

## Desktop release pipeline

1. Verify tag points to a validated commit and matches package version.
2. Install dependencies from the lockfile on clean platform runners.
3. Build and launch-smoke the desktop app on Linux before packaging.
4. Package Linux AppImage/deb, Windows NSIS, and macOS dmg/zip outputs.
5. Generate SHA-256 checksums beside every platform's artifacts.
6. Upload artifacts for inspection; publish them to a GitHub Release only for version tags.
7. Verify install, launch, quit, workspace recovery, and asset restoration on clean machines before calling a release certified.

A successful CI run does not prove cross-platform behavior, performance on low-end hardware, full interactive scene persistence, or secure production readiness. Those require explicit acceptance testing.
