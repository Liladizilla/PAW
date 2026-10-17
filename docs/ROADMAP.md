# Engineering Roadmap

Architecture and acceptance criteria are defined before runtime implementation. Each milestone must have automated tests, visible evidence and an updated status; planned capabilities must not be described as implemented.

## M0 — Architecture and contracts

- [x] Record product requirements and initial architecture decisions.
- [x] Define module ownership, trust boundaries, graph semantics and provider adapter direction.
- [x] Specify logical data model, event contract, security model, test strategy and pipeline contract.
- [x] Add a versioned typed graph contract and runtime validation/planning API.
- [ ] Review remaining contracts against implementation and add durable schema migration rules.
- [ ] Create architecture decision records for any changed decisions.

Acceptance: reviewers can identify each module's authority, API boundary, data ownership, failure semantics and required tests without guessing.

## M1 — Reproducible foundation and CI

- [x] Commit package-lock.json and verify clean `npm ci` in CI; keep dependency updates reviewable rather than allowing CI to rewrite branches.
- [ ] Verify typecheck, renderer build and desktop build from a clean checkout.
- [x] Add a TypeScript unit-test runner, dependency audit and secret scanning.
- [ ] Add lint/format and require a clean lockfile-backed CI run.
- [ ] Validate Electron security settings, preload allowlist and restrictive CSP.
- [x] Add CI artifact retention and useful failure reports.
- [ ] Establish reference-machine startup, memory and renderer performance baselines.

Acceptance: clean install and all required CI gates pass; current preview remains explicitly labelled as simulated.

## M2 — Contracts, persistence and local runtime

- [x] Implement versioned graph contracts and boundary validation for graph inputs.
- [ ] Expand versioned schemas to run events, approvals, tools and provider payloads.
- [x] Add local workspace snapshot persistence and append-only per-workspace event history (JSON/NDJSON MVP).
- [ ] Add SQLite migrations, artifact store, retention/compaction and crash-recovery tests.
- [x] Implement workspace snapshots, durable approval records and manual run recovery (JSON/NDJSON MVP; not yet SQLite).
- [x] Implement typed ports, graph validation, cycle detection and deterministic topological planning.
- [x] Add a bounded-concurrency DAG scheduler, node lifecycle events, cooperative cancellation, pause/resume boundaries and fail-closed policy/approval hooks.
- [ ] Add graph registry, bounded loops, production policy engine, idempotency keys and durable per-node replay.
- [ ] Add deterministic fake provider/tool adapters and crash/fault tests.

Acceptance: deterministic graph runs survive restart; approvals persist; replay does not cause side effects; uncertain operations require manual recovery.

## M3 — Provider and guarded tools

- [x] Implement the first Groq chat adapter behind main-process IPC.
- [x] Add encrypted credential storage through Electron safeStorage and a basic Groq chat test panel.
- [ ] Verify OS keyring behavior on Linux/Windows/macOS and add structured log redaction.
- [ ] Add bounded tool broker and capability manifests.
- [ ] Implement read-only workspace/file tools, then narrowly scoped writes.
- [ ] Add shell, Git/GitHub, browser and HTTP tools only behind per-tool policy.
- [ ] Add planner proposals that must pass graph validation and policy checks.

Acceptance: real model response works without exposing secrets to renderer; denied tools cannot execute; budget exhaustion is enforced.

## M4 — Spatial workspace integration

- [ ] Replace sample data with runtime snapshots/events.
- [ ] Add graph editing, typed ports, connections, selection and multi-select.
- [ ] Add live inspector for status, progress, I/O, dependencies and redacted logs.
- [ ] Implement durable approval UI, pause/cancel and intervention controls.
- [ ] Add accessible list/tree alternative, keyboard navigation and reduced motion.
- [ ] Add adaptive physics/render quality for integrated graphics.

Acceptance: UI state is a projection of the runtime; rendering/physics failure cannot change execution semantics.

## M5 — Teams, memory and automation

- [ ] Add hierarchical teams and role-specific agent definitions.
- [ ] Add run, agent, workspace and opt-in user memory scopes.
- [ ] Add schedules, resource budgets, retry/failure policies and audit history.
- [ ] Add history inspection, read-only replay and export/backup/restore.
- [ ] Add plugin SDK and MCP integration with explicit capability grants.

Acceptance: isolation and permission tests pass across workspaces, teams, memory and plugins.

## M6 — Remote workers and optional sync

- [ ] Add authenticated worker identity, leases, heartbeat, cancellation and revocation.
- [ ] Add scoped task dispatch and artifact exchange through the runtime API.
- [ ] Add worker failure reconciliation and duplicate-result handling.
- [ ] Design encrypted optional sync and explicit conflict resolution.

Acceptance: no worker can access the shared SQLite database directly; revoked or wrong-workspace workers are rejected.

## M7 — Release hardening

- [x] Native Linux AppImage/deb, Windows NSIS and macOS dmg/zip packaging in CI; RPM and clean-machine acceptance are still required.
- [ ] Dependency/license inventory, secret scan, SBOM and checksums.
- [ ] Upgrade, uninstall, data-preservation and migration tests.
- [ ] Verify accessibility, security, performance and recovery acceptance suites.
- [ ] Publish only reviewed version tags after all platform jobs pass.

Acceptance: all release gates in docs/PIPELINES.md and docs/TEST_STRATEGY.md are met.

## Current reality

The streamed city renderer and supporting world modules are now integrated into `main`; CI and all three native package jobs pass on the integration PR. That does not yet prove the city and controls work in a real packaged app. Fedora RPM packaging, version/tag alignment, and manual UI/persistence acceptance remain release blockers.

The repository now includes a typed graph validator/planner, a bounded-concurrency local DAG executor, typed input/output checks, pause/resume/cancel controls, persisted run lifecycle state, recent event history in the desktop UI, local workspace snapshots, append-only event history, durable approval records, manual recovery, guarded IPC and a Groq provider path with encrypted credential storage. The first registered executor nodes are deterministic local text/JSON transforms. External tools, autonomous model-driven planning, idempotency and remote workers remain unimplemented. The browser preview cannot invoke the privileged desktop runtime bridge. The target architecture remains larger than the current implementation.
