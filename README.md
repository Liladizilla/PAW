# P.A.W. — Personal Agent Workspace

P.A.W. is a local-first, cross-platform agent workspace for Linux, Windows and macOS. The target product combines a Babylon.js spatial control surface with a durable execution runtime, typed workflows, bounded autonomous planning, scoped memory, guarded tools and optional remote workers.

**Current state:** early development. P.A.W. is developed and validated as a native Electron desktop application; there is no Vercel deployment requirement or web-hosted runtime dependency. The desktop branch now has typed graph validation/planning, a bounded-concurrency deterministic DAG executor, pause/resume/cancel controls, durable run records and event history, local workspace snapshots, persistent approval records, a narrow preload bridge, a Groq chat adapter that keeps credentials in Electron's encrypted main-process storage when OS secure storage is available, and the first real-world 3D city blockout. The city includes multi-storey buildings with window facades, paved streets, crosswalks, streetlights, selectable human-shaped agent figures, and a visible underground metro station cutaway. The first executable nodes are local text/JSON transforms only. Named AI-agent travel and station activity remain disconnected from real execution events, so the scene never pretends those agents are doing work. Autonomous model planning, external tool adapters, idempotency, remote workers and SQLite migrations are not implemented.

## The living city

P.A.W.'s primary workspace is designed as a navigable, realistic 3D city rather than a 2D agent dashboard. Agents enter through an underground metro hub and will travel to real station buildings for research, engineering, review and other registered capabilities. Movement and station activity must be driven by actual runtime events; visual effects must never claim work that did not happen. The initial city is intentionally compact. Future releases can add districts and infrastructure as the product grows, while instancing, level of detail and adaptive rendering protect performance on modest hardware.

The current branch contains a large procedural metropolitan grid, varied seeded building parcels (towers, slabs, stepped forms, cylindrical buildings and courtyards), a large ground extent, continuous arterial roads, and a central transit plaza. Its 1,008 thin-instanced civilians follow explicit crosswalk-to-sidewalk destination loops, respect pedestrian signal phases, and use local separation; 16 kinematic vehicles obey signal phases and following gaps. Civilians are ambient simulation, not AI agents. The new bounded grid A* utility has tests for routing around building footprints and rejecting blocked destinations. A versioned in-memory world entity model now validates components and emits monotonic scene-domain events; it is intentionally separate from the durable agent-runtime journal. Additional tested engine primitives cover camera-centered world chunk rings, a uniform-grid spatial index, asset metadata/path validation, bounded fixed-step timing and versioned scene-view snapshots. The Babylon host owns renderer/scene/camera lifecycle; streamed outer-city chunks create and dispose real meshes, pedestrian neighbor queries use the spatial index, and crowd/traffic use the shared fixed-step clock. Versioned scene snapshots preserve named marker transforms with v1 migration. The Babylon GLTF/GLB loader and workspace-confined Electron asset resolver are implemented for standalone GLB imports. Asset-backed entities and world-space camera focus are persisted in scene snapshot v3; the live scene uses root-based world-origin rebasing and deterministic outer-city chunk streaming. The remaining persistence gate is a desktop-driven save/close/relaunch test using real imported files and transforms. This is an engine foundation, not a finished general-purpose engine: production navmesh, rigid-body physics, GLTF sidecar import, editor tools, runtime-linked named-agent movement and reference-device profiling remain roadmap work.

## Architecture and engineering plan

- [System blueprint](docs/SYSTEM_BLUEPRINT.md): modules, runtime, graphs, persistence, memory, providers, plugins and spatial UI.
- [Engine architecture](docs/ENGINE_ARCHITECTURE.md): engine-layer boundaries, large-world strategy, world model, navigation and backend infrastructure.
- [Requirements](docs/REQUIREMENTS.md): product scope and user-facing capabilities.
- [Architecture notes](docs/ARCHITECTURE.md): core invariants and security boundaries.
- [Data model](docs/DATA_MODEL.md): durable entities, event envelope and recovery guarantees.
- [Security model](docs/SECURITY_MODEL.md): threat model, secrets, IPC and capability security.
- [Pipeline design](docs/PIPELINES.md): PR CI, security, native packaging and release.
- [Test strategy](docs/TEST_STRATEGY.md): unit through end-to-end, fault injection and release gates.
- [Release checklist](docs/RELEASE_CHECKLIST.md): tag, artifact, manual acceptance and rollback gates.
- [Asset recovery](docs/ASSET_RECOVERY.md): restore imported GLB models and diagnose missing workspace assets.
- [Roadmap](docs/ROADMAP.md): staged implementation and acceptance criteria.

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

- CI runs `npm ci`, typecheck, unit tests, production build and a Linux Electron renderer-startup smoke test on pull requests and pushes to `main` or `architecture/system-blueprint`.
- Security checks run Gitleaks secret scanning and npm audit; the audit report is retained as an artifact. The latest recorded CI, secret scan and dependency-audit workflow runs completed successfully.
- Dependabot proposes weekly npm dependency updates and monthly GitHub Actions updates.
- Pull requests and bug/feature reports use structured templates.
- Version tags trigger Linux, Windows and macOS packaging; GitHub Release publication waits for packaging jobs.

These are an initial operational baseline, not full release certification. See [PIPELINES.md](docs/PIPELINES.md) for gaps still to close.

## Security

Never commit API keys, tokens, private keys or credentials. Provider secrets must stay outside renderer code, logs and serialized workspace data. Groq credentials are sent only through the desktop preload bridge and encrypted by Electron `safeStorage`; if OS encryption is unavailable, saving credentials is refused. See [SECURITY.md](SECURITY.md) and the [security model](docs/SECURITY_MODEL.md).
