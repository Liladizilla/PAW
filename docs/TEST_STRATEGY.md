# P.A.W. Test Strategy

Status: acceptance contract. Tests become operational alongside implementation; this document is not itself a test result.

## Test layers

1. Static checks: formatting, lint, strict TypeScript, schema/contract checks, dependency and secret scans.
2. Unit tests: graph typing, state transitions, budget accounting, policy decisions, provider normalization, redaction, path containment, scheduler fairness and retry rules.
3. Property tests: monotonic event sequence, valid state transitions, graph type safety, cancellation idempotence, workspace isolation and artifact containment.
4. Integration tests: SQLite transactions/migrations, journal plus snapshots, persistent approvals, mocked provider HTTP, tool broker/policy boundary, runtime IPC and artifacts.
5. Fault injection: crash during commit, duplicate events, timeouts, provider rate limits, corrupted snapshots, locked DB, disk full, expired worker leases and partial external side effects.
6. UI tests: navigation, keyboard access, inspector, graph editing, approval dialog, pause/cancel, reduced motion and accessible list view.
7. End-to-end: create workspace, configure mock provider, create/validate graph, execute deterministic tool, inspect events, pause/cancel, restart, manually recover and replay without side effects.
8. Packaging: install/launch on Linux, Windows and macOS; upgrade, data preservation, clean uninstall and startup.
9. Performance: cold start, idle CPU/RAM, graph sizes, event throughput, database growth, renderer FPS and cancellation latency.

## Non-negotiable invariants

- Renderer never owns authoritative run state.
- Denied policy decision cannot reach tool implementation.
- Every state-changing operation is auditable.
- Pending approvals survive restart.
- Duplicate delivery does not duplicate side effects.
- Replay does not invoke external tools.
- Recovery marks uncertain side effects and waits for user choice.
- Independent nodes run concurrently within limits; constrained resources obey locks.
- Pause stops scheduling; graceful cancel signals active tasks; force-stop reports uncertain work.
- Cross-workspace reads and memory retrieval are denied by default.
- API keys never enter renderer bundles, ordinary settings, logs, exports or test snapshots.
- Rendering/physics failure cannot mutate execution dependencies or permissions.

## Release gates

Block release on any failing test or unreviewed skipped critical test, unaccepted critical/high vulnerability, unverified migration, platform package failure, secret scan finding, broken startup/persistence/approval/recovery path, material performance regression or unsupported feature claim.

## Test data and provider policy

Use deterministic fake model/tool adapters for ordinary CI. Live-provider tests are opt-in and use protected secrets; normal CI must not depend on a paid provider or expose keys to PR code. Live tests use low-risk prompts, bounded tokens/time and redacted logs.

## Current asset-recovery coverage

Automated unit coverage now checks asset availability IPC normalization, grouping multiple saved entities that reference the same missing file, bounded/sanitized restore reports, catalog prerequisites, and snapshot/catalog rehydration planning. The Electron smoke test proves renderer startup only. A real imported-GLB save/close/relaunch test, including transform and visibility checks, remains a manual release acceptance gate on each supported OS.

## Performance budgets

Do not invent baselines. Measure on reference hardware before setting hard limits. Track cold launch/workspace open, idle/active CPU and memory, node/event throughput, cancellation latency, renderer frame-time percentiles, adaptive quality transitions and database/artifact growth. Integrated-graphics, limited-memory hardware is the first reference class; correctness and responsiveness beat decorative physics.
