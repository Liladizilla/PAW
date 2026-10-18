# P.A.W. — Personal Agent Workspace

P.A.W. is a local-first, cross-platform agent workspace for Linux, Windows and macOS. The target product combines a Babylon.js spatial control surface with a durable execution runtime, typed workflows, bounded autonomous planning, scoped memory, guarded tools and optional remote workers.

**Current state:** early development. The deployed browser preview remains a UI demonstration and cannot invoke privileged desktop IPC. The desktop branch now has typed graph validation/planning, a bounded-concurrency deterministic DAG executor, pause/resume/cancel controls, durable run records and event history, local workspace snapshots, persistent approval records, a narrow preload bridge, and a Groq chat adapter that keeps credentials in Electron's encrypted main-process storage when OS secure storage is available. The first executable nodes are local text/JSON transforms only. Autonomous model planning, external tool adapters, idempotency, remote workers and SQLite migrations are not implemented. Never enter credentials into the browser preview.


## Screenshots

The screenshots below are maintained from real packaged desktop builds, not generated mockups. Capture the current Electron app at 16:9 and add the PNG files to `docs/screenshots/` before publishing a release. Until those captures are committed, this section intentionally does not embed placeholder images.

- **Spatial workspace:** `docs/screenshots/spatial-workspace.png`
- **Runtime and provider settings:** `docs/screenshots/runtime-provider.png`
- **Run history and approvals:** `docs/screenshots/run-history-approvals.png`

## Fedora Software metadata

The RPM package is intended for Fedora and other RPM-based distributions. AppStream metadata lives in `packaging/appdata/dev.paw.workspace.metainfo.xml`; it describes the current early-development state and does not claim that planned agent capabilities are already available.

## Architecture and engineering plan

- [System blueprint](docs/SYSTEM_BLUEPRINT.md): modules, runtime, graphs, persistence, memory, providers, plugins and spatial UI.
- [Requirements](docs/REQUIREMENTS.md): product scope and user-facing capabilities.
- [Architecture notes](docs/ARCHITECTURE.md): core invariants and security boundaries.
- [Data model](docs/DATA_MODEL.md): durable entities, event envelope and recovery guarantees.
- [Security model](docs/SECURITY_MODEL.md): threat model, secrets, IPC and capability security.
- [Pipeline design](docs/PIPELINES.md): PR CI, preview, security, packaging and release.
- [Test strategy](docs/TEST_STRATEGY.md): unit through end-to-end, fault injection and release gates.
- [Release checklist](docs/RELEASE_CHECKLIST.md): tag, artifact, manual acceptance and rollback gates.
- [Roadmap](docs/ROADMAP.md): staged implementation and acceptance criteria.

## Downloading desktop builds

Published GitHub Releases contain platform-specific desktop packages. For Fedora and other RPM-based distributions, use the `.rpm` package when available; Fedora Software does not install Debian `.deb` packages. The AppImage is the portable Linux fallback and may require FUSE support. Windows uses the `.exe` installer, while macOS uses the `.dmg` or `.zip` build. Verify downloads against `SHA256SUMS.txt` before installing.

**Release status:** builds are not considered certified until the streamed city scene, controls, import errors, and workspace restoration have been manually checked in a packaged desktop app. Do not treat a successful packaging workflow as proof of working UI.

## Development

Requires Node.js 22.12+ for the current Electron toolchain.

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

Dependency changes must update `package.json` and `package-lock.json` together. CI uses read-only permissions and enforces `npm ci` without mutating the branch. The current runtime executor has unit coverage for typed data flow, policy/approval denial, failure propagation, bounded concurrency, pause/resume and cooperative cancellation.

## GitHub automation

- CI runs typecheck, graph runtime unit tests and a production build on pull requests and main pushes.
- Security checks run Gitleaks secret scanning and npm audit; the audit report is retained as an artifact.
- Dependabot proposes weekly npm dependency updates and monthly GitHub Actions updates.
- Pull requests and bug/feature reports use structured templates.
- Version tags trigger Linux, Windows and macOS packaging; GitHub Release publication waits for packaging jobs.

These are an initial operational baseline, not full release certification. See [PIPELINES.md](docs/PIPELINES.md) for gaps still to close.

## Security

Never commit API keys, tokens, private keys or credentials. Provider secrets must stay outside renderer code and browser previews. Groq credentials are sent only through the desktop preload bridge and encrypted by Electron `safeStorage`; if OS encryption is unavailable, saving credentials is refused. See [SECURITY.md](SECURITY.md) and the [security model](docs/SECURITY_MODEL.md).
