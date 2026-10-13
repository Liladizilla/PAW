# P.A.W. — Personal Agent Workspace

P.A.W. is a local-first, cross-platform agent workspace for Linux, Windows and macOS. The target product combines a Babylon.js spatial control surface with a durable execution runtime, typed workflows, bounded autonomous planning, scoped memory, guarded tools and optional remote workers.

**Current state:** early development. The deployed preview is a UI demonstration. Sample nodes are not real agents; real execution, persistence, provider integration and distributed workers are not yet implemented. Never enter production credentials into the browser preview.

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

Requires Node.js 20+.

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

The repository does not yet contain a committed package-lock.json. Until one is added and clean npm ci is verified, dependency installation is not fully reproducible.

## GitHub automation

- CI runs typecheck and a production build on pull requests and main pushes.
- Security checks run Gitleaks secret scanning and npm audit; the audit report is retained as an artifact.
- Dependabot proposes weekly npm dependency updates and monthly GitHub Actions updates.
- Pull requests and bug/feature reports use structured templates.
- Version tags trigger Linux, Windows and macOS packaging; GitHub Release publication waits for packaging jobs.

These are an initial operational baseline, not full release certification. See [PIPELINES.md](docs/PIPELINES.md) for gaps still to close.

## Security

Never commit API keys, tokens, private keys or credentials. Provider secrets must stay outside renderer code and browser previews. See [SECURITY.md](SECURITY.md) and the [security model](docs/SECURITY_MODEL.md).
