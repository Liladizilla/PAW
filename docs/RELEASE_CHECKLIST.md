# P.A.W. Release Checklist

A release is a reviewed artifact, not merely a successful build job. Do not label a release stable until every applicable item is verified.

## Before tagging

- [ ] Version in package metadata matches the intended tag.
- [ ] PRs reviewed and merged; no unreviewed generated changes.
- [ ] CI typecheck/build and all automated tests pass.
- [ ] Secret scan passes.
- [ ] Dependency audit reviewed; current baseline is 8 moderate Electron-builder-chain findings, with zero high/critical. Review advisories and record an explicit acceptance/upgrade plan before stable release.
- [ ] Schema migrations tested from a fresh database and supported previous version.
- [ ] Provider keys and signing credentials are not in source, renderer bundles, artifacts or logs.
- [ ] Release notes distinguish implemented capabilities from preview/planned capabilities.
- [ ] Known limitations and unsigned-platform status are stated honestly.

## Build and artifact verification

- [ ] Linux AppImage, deb and RPM produced on native runner; verify RPM installation on Fedora.
- [ ] Windows NSIS installer produced on native runner.
- [ ] macOS DMG and ZIP produced on native runner.
- [ ] Artifact filenames include version and platform/architecture.
- [ ] SHA-256 checksums generated and checked.
- [ ] SBOM/provenance attached when configured.
- [ ] GitHub Release is published only after every required package job succeeds.

## Manual acceptance

- [ ] Clean-machine install, launch and quit on each supported OS; Fedora test uses RPM or AppImage.
- [ ] Streamed city geometry is visible in the packaged app, not only in the browser preview.
- [ ] Camera navigation, agent selection/focus, and every visible primary control perform the advertised action.
- [ ] Asset/model import succeeds for a valid file and surfaces a real error for an invalid file.
- [ ] Save a scene, restart the app, and verify the scene and workspace state are restored.
- [ ] Create/open workspace; restart and verify persisted state.
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
