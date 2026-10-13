# Proposed Architecture

Initial architecture direction. Detailed protocols and module contracts must be validated through implementation and tests.

- **Electron main:** lifecycle, windows and narrow privileged operations.
- **Renderer:** React controls and Babylon.js scene. Never authoritative for task state.
- **Runtime service:** scheduler, typed graph executor, bounded planner, teams, cancellation and policy evaluation.
- **Persistence:** SQLite for structured state and event indexes; filesystem for artifacts; optional vector index.
- **Workers:** local worker plus optional authenticated remote workers. Remote workers never write directly to the same SQLite file.
- **Adapters:** model and tool integrations behind validated interfaces.
- **Extensions:** permissioned SDK/MCP tools with explicit capability grants.

## Invariants
1. Runtime state is authoritative; the 3D scene is a projection.
2. Privileged actions always pass policy checks.
3. Durable state is recorded before a mutation is reported committed.
4. Crash recovery restores recorded state for manual user decisions.
5. Replay does not repeat external side effects by default.
6. Pause, graceful cancellation and force-stop have distinct semantics.
7. Remote execution is optional; local operation remains useful offline.
8. Renderer failure must not automatically terminate the runtime.
9. Physics never changes semantic graph dependencies.
10. Rendering degradation must not disable core execution.

## IPC security
Context isolation and Node integration are enabled appropriately: context isolation on, Node integration off, sandbox on. The preload bridge is minimal. Do not expose generic shell, filesystem or arbitrary IPC methods to the renderer.

## Open engineering work
Define event schemas, idempotency keys, graph port typing, worker authentication, sync conflict resolution, plugin signing, data migration, OS-specific secret storage and performance budgets.
