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
- [Roadmap](docs/ROADMAP.md): staged implementation and acceptance criteria.

## Development

Requires Node.js 20+.

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

A committed lockfile and clean `npm ci` verification are required before calling the build pipeline reproducible.

## CI/CD

GitHub Actions currently provides basic typecheck/build validation and cross-platform packaging workflows. The full pipeline contract is documented in [PIPELINES.md](docs/PIPELINES.md); security scans, test suites, preview smoke tests and release hardening are not considered complete until implemented and verified in CI.

## Security

Never commit API keys, tokens, private keys or credentials. Provider secrets must stay outside renderer code and browser previews. See [SECURITY.md](SECURITY.md) and the [security model](docs/SECURITY_MODEL.md).
