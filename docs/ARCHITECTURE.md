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

## Execution foundation (implemented, local and bounded)\n\n- `src/runtime/executor.ts` executes validated DAGs with bounded concurrency, dependency-aware scheduling, typed input/output checks, cooperative abort signalling, and structured lifecycle events.\n- External-effect handlers fail closed unless a policy authorizer is supplied. A policy can require a separate approval callback before the handler runs.\n- Missing handlers, denied actions, unapproved actions, invalid outputs and handler failures stop downstream scheduling and return an explicit failed result. The executor does not itself grant filesystem, shell, browser or network capabilities.\n- `src/runtime/executor.test.ts` covers data flow, ordering, external-effect denial, approval gating, failure propagation, concurrency bounds and cancellation.\n- `src/runtime/graph.ts` rejects undeclared ports, required inputs without connections and ambiguous multiple connections to a single input.\n\nThe deterministic executor is exposed through named Electron IPC handlers and a narrow preload bridge. The workspace sidebar includes a desktop-only smoke-test graph plus pause/resume/cancel controls backed by persisted run records. The first built-in handlers are local string transforms and JSON serialization only. No shell, arbitrary filesystem, browser automation or model-tool loop is registered. External-effect handlers remain fail-closed until an explicit policy authorizer and approval path are supplied. Per-node replay and durable output snapshots remain separate integration tasks.\n\n## IPC security
Context isolation and Node integration are enabled appropriately: context isolation on, Node integration off, sandbox on. The preload bridge is minimal. Do not expose generic shell, filesystem or arbitrary IPC methods to the renderer.

## Implemented foundation (MVP, not a complete runtime)

- `src/runtime/graph.ts` defines schema-versioned graph/node/edge contracts, typed ports, duplicate/reference/type validation, cycle detection and deterministic topological execution planning.
- `electron/persistence.ts` stores workspace snapshots with atomic replacement and per-workspace append-only NDJSON history, with bounded document/history sizes. This is an initial JSON store, not the planned SQLite/event-index implementation.
- `electron/approvals.ts` persists approval records and serializes mutations to avoid lost updates.
- `electron/runs.ts` persists run lifecycle records, transition history and explicit manual recovery decisions. It records run control state but does not execute graph nodes.
- `electron/providers/groq.ts` calls Groq from the Electron main process. API credentials are encrypted with `safeStorage`; configuration fails closed if OS-backed encryption is unavailable. The provider panel is desktop-only.
- `electron/preload.ts` exposes a narrow, named API rather than generic filesystem or IPC access.

Graph planning and local graph execution are implemented as separate layers. The local bounded-concurrency DAG executor validates typed inputs/outputs, propagates failures, enforces configured concurrency, supports cooperative cancellation and pause/resume boundaries, and fails closed for external-effect handlers without an explicit authorizer. The UI's smoke-test graph is connected to this executor. This is not yet an autonomous tool broker: shell, arbitrary filesystem, browser and network tools are not registered, and remote workers are not implemented. Persisted run recovery remains a manual user decision for uncertain work.

## Spatial renderer (implemented baseline)

- `src/App.tsx` uses Babylon.js to render a procedural metropolitan scene, agent objects, city blocks, road and sidewalk geometry, lighting, station cutaway, and runtime diagnostics.
- `src/world/streamed-city.ts` streams city chunks around the camera and disposes distant chunk meshes; `src/world/city-layout.ts` generates deterministic lots and building layouts.
- World-origin coordination/rebasing keeps large-world coordinates separate from render coordinates. Camera focus/reset and GLB model import are wired to desktop controls.
- Scene snapshots save camera/world-origin/entity data locally. Imported asset records and their copied files are persisted with explicit cleanup/rollback handling; rehydration reports missing assets rather than silently inventing them.
- Automated desktop smoke tests deliberately use a minimal scene on CI's software-rendered runner. They verify the Electron/Babylon lifecycle, not visual city correctness. Real packaged-app interaction and restart-persistence checks remain mandatory.
- Agent identities and some inspector fields are still demonstration data. The spatial renderer is not evidence of autonomous agents or a fully implemented graph editor.

## Open engineering work
Define event schemas, idempotency keys, graph port typing, worker authentication, sync conflict resolution, plugin signing, data migration, OS-specific secret storage and performance budgets.


## Groq graph proposals (implemented, review-only)

- The Groq provider stores credentials through Electron `safeStorage` and refuses insecure fallback backends.
- `paw:provider:propose-graph` asks the configured model for one JSON graph, parses the response without evaluating it, validates graph structure and limits node types to `text.constant`, `text.uppercase`, `text.concat`, and `json.stringify`.
- The preload exposes this as `proposeGraphWithGroq`. The result includes validation issues and `requiresReview: true`; invalid proposals return no graph.
- This endpoint does not execute or persist the proposed graph. A user-facing proposal review/acceptance UI and explicit save-to-workspace action are the next step. Model output is untrusted input.
