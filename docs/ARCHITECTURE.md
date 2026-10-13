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

## Execution foundation (implemented, local and bounded)\n\n- `src/runtime/executor.ts` executes validated DAGs with bounded concurrency, dependency-aware scheduling, typed input/output checks, cooperative abort signalling, and structured lifecycle events.\n- External-effect handlers fail closed unless a policy authorizer is supplied. A policy can require a separate approval callback before the handler runs.\n- Missing handlers, denied actions, unapproved actions, invalid outputs and handler failures stop downstream scheduling and return an explicit failed result. The executor does not itself grant filesystem, shell, browser or network capabilities.\n- `src/runtime/executor.test.ts` covers data flow, ordering, external-effect denial, approval gating, failure propagation, concurrency bounds and cancellation.\n- `src/runtime/graph.ts` rejects undeclared ports, required inputs without connections and ambiguous multiple connections to a single input.\n\nThis is a deterministic execution core, not yet connected to the UI or Electron IPC. Built-in tool adapters, persistent approval waiting, run-state integration and durable per-node replay remain separate integration tasks.\n\n## IPC security
Context isolation and Node integration are enabled appropriately: context isolation on, Node integration off, sandbox on. The preload bridge is minimal. Do not expose generic shell, filesystem or arbitrary IPC methods to the renderer.

## Implemented foundation (MVP, not a complete runtime)

- `src/runtime/graph.ts` defines schema-versioned graph/node/edge contracts, typed ports, duplicate/reference/type validation, cycle detection and deterministic topological execution planning.
- `electron/persistence.ts` stores workspace snapshots with atomic replacement and per-workspace append-only NDJSON history, with bounded document/history sizes. This is an initial JSON store, not the planned SQLite/event-index implementation.
- `electron/approvals.ts` persists approval records and serializes mutations to avoid lost updates.
- `electron/runs.ts` persists run lifecycle records, transition history and explicit manual recovery decisions. It records run control state but does not execute graph nodes.
- `electron/providers/groq.ts` calls Groq from the Electron main process. API credentials are encrypted with `safeStorage`; configuration fails closed if OS-backed encryption is unavailable. The provider panel is desktop-only.
- `electron/preload.ts` exposes a narrow, named API rather than generic filesystem or IPC access.

Graph planning is not graph execution. There is no autonomous tool broker, policy engine, graph scheduler/executor, cooperative worker cancellation, or remote worker implementation yet. Pause/cancel/recovery currently exist as persisted lifecycle contracts, not as controls connected to a running executor.

## Open engineering work
Define event schemas, idempotency keys, graph port typing, worker authentication, sync conflict resolution, plugin signing, data migration, OS-specific secret storage and performance budgets.
