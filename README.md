# P.A.W. — Personal Agent Workspace

P.A.W. is a local-first, cross-platform agent workspace for Linux, Windows and macOS. The target product combines a Babylon.js spatial control surface with a durable execution runtime, typed workflows, bounded autonomous planning, scoped memory, guarded tools and optional remote workers.

**Current state:** early development. The deployed browser preview remains a UI demonstration. The desktop branch now has typed graph validation/planning, local workspace snapshots, append-only history, a narrow preload bridge, and a Groq chat adapter that keeps credentials in Electron's encrypted main-process storage when OS secure storage is available. This is not yet an autonomous agent executor: graph nodes do not run tools, there is no scheduler/approval engine, and remote workers are not implemented. Never enter credentials into the browser preview.

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

## Development

Requires Node.js 22.12+ for the current Electron toolchain.

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

The CI workflow bootstraps and commits `package-lock.json` once, then enforces `npm ci`. Treat the lockfile migration as complete only after the resulting workflow run passes.

## GitHub automation

- CI runs typecheck, graph runtime unit tests and a production build on pull requests and main pushes.
- Security checks run Gitleaks secret scanning and npm audit; the audit report is retained as an artifact.
- Dependabot proposes weekly npm dependency updates and monthly GitHub Actions updates.
- Pull requests and bug/feature reports use structured templates.
- Version tags trigger Linux, Windows and macOS packaging; GitHub Release publication waits for packaging jobs.

These are an initial operational baseline, not full release certification. See [PIPELINES.md](docs/PIPELINES.md) for gaps still to close.

## Security

Never commit API keys, tokens, private keys or credentials. Provider secrets must stay outside renderer code and browser previews. Groq credentials are sent only through the desktop preload bridge and encrypted by Electron `safeStorage`; if OS encryption is unavailable, saving credentials is refused. See [SECURITY.md](SECURITY.md) and the [security model](docs/SECURITY_MODEL.md).
