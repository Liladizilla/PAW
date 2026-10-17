# P.A.W. Release Checklist

A release is a reviewed artifact, not merely a successful build job. Do not label a release stable until every applicable item is verified.

## Before tagging

- [ ] Version in package metadata matches the intended tag.
- [ ] PRs reviewed and merged; no unreviewed generated changes.
- [ ] CI typecheck, unit tests, production build and Linux Electron renderer-startup smoke all pass on the exact release commit.
- [ ] Secret scan passes.
- [ ] Dependency audit reviewed; current baseline is 8 moderate Electron-builder-chain findings, with zero high/critical. Review advisories and record an explicit acceptance/upgrade plan before stable release.
- [ ] Schema migrations tested from a fresh database and supported previous version.
- [ ] Provider keys and signing credentials are not in source, renderer bundles, artifacts or logs.
- [ ] Release notes distinguish implemented capabilities from planned capabilities.
- [ ] Known limitations and unsigned-platform status are stated honestly.

## Build and artifact verification

- [ ] Linux AppImage and deb produced on native runner.
- [ ] Installation guide matches the exact artifacts, signing/notarization state and data location for this release.
- [ ] Windows NSIS installer produced on native runner.
- [ ] macOS DMG and ZIP produced on native runner.
- [ ] Artifact filenames include version and platform/architecture.
- [ ] SHA-256 checksums generated and checked.
- [ ] SBOM/provenance attached when configured.
- [ ] GitHub Release is published only after validation and every required native package job succeed.
- [ ] SHA-256 checksum files are attached and independently verified.

## Manual acceptance

- [ ] Clean-machine launch, quit, upgrade and uninstall behavior verified on each supported OS; the Linux CI smoke is not a substitute for Windows/macOS validation.
- [ ] Follow the published [installation guide](INSTALLATION.md) on a clean Fedora/Linux test profile and verify SHA-256 instructions against the actual release manifest.
- [ ] Verify release is distributed through GitHub Releases; no hosted web deployment is required.
- [ ] Create/open workspace; close the app fully, relaunch it, and verify persisted state.
- [ ] Import a real self-contained GLB, save the workspace, close/relaunch Electron, and verify the file, transform, visibility and restore status. Record OS and result.
- [ ] Provider configuration does not expose secret values to renderer/logs.
- [ ] Denied tool action cannot execute; pending approval survives restart.
- [ ] Pause/cancel and interrupted-work recovery behave as documented.
- [ ] Replay does not invoke side effects.
- [ ] Accessible list/tree view works without 3D rendering.
- [ ] Upgrade preserves workspace data; uninstall behavior is documented.

## Rollback and incident handling

- [ ] Previous supported installer and release notes remain available.
- [ ] Data migrations have a documented backup and recovery strategy.
- [ ] Critical credential leak: revoke/rotate immediately, remove exposure, inspect logs/history, and publish an incident note if needed.
- [ ] Critical runtime defect: pause new releases, identify affected versions, publish mitigation and replacement build.
- [ ] Never promise automatic rollback of external side effects unless the tool supports a verified compensating action.
