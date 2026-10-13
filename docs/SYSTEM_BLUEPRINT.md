# P.A.W. System Blueprint

Status: target architecture and implementation contract. This document does not claim planned services already exist.

## Product boundary

P.A.W. is a local-first, cross-platform agent workspace for Linux, Windows and macOS. It combines a spatial control surface with a durable execution runtime. The 3D scene is a view of the system, never the source of truth.

Principles:
- Useful locally and offline; cloud and remote workers are optional.
- Bring your own model provider, endpoint, or local model.
- Hybrid execution: typed explicit graphs plus bounded goal-driven planning.
- Autonomy is limited by a user-configured policy envelope.
- Human-visible approvals, pause, cancellation, audit history and manual crash recovery.
- Trusted core runtime; third-party tools are permissioned plugins.
- Adaptive visual quality must not affect execution correctness or data durability.

## Logical architecture

    P.A.W. Desktop
      React UI + Babylon.js spatial projection + accessible list/tree view
        -> typed UI commands and event subscriptions
      Electron preload bridge: narrow allowlisted IPC
        -> Electron main: lifecycle, OS integration, secure storage
        -> authenticated local RPC
    Local Runtime
      Workspace/session manager
      Typed graph registry and validator
      Bounded planner -> proposed typed graph -> validator
      Policy engine -> approval manager
      Scheduler -> graph executor -> tool broker
      Provider/model adapters | plugin/MCP host
      Pause/cancel manager | recovery coordinator
      Durable event journal | snapshots | run history
      Optional worker manager and authenticated remote workers
    Local persistence
      SQLite metadata, state, event index
      Workspace filesystem for artifacts
      Optional rebuildable vector index
    External capabilities
      Groq and OpenAI-compatible endpoints, local models
      Files, bounded shell, GitHub, browser, HTTP, schedules

The runtime is a separate logical process. A temporary in-process development adapter is acceptable only if contracts allow moving the runtime to a dedicated local process without renderer changes. Production target is a dedicated runtime process.

## Trust boundaries

1. Renderer: presentation only. No API keys, raw filesystem access, shell, arbitrary IPC, or direct provider calls.
2. Preload bridge: typed allowlist of commands/events; validate every payload.
3. Electron main/local runtime: enforce identity, schemas, limits and policy.
4. Tool runner: constrained execution boundary. Each tool declares capabilities, schemas, timeout and side-effect class.
5. Provider adapter: receives minimum necessary data; retrieves credentials through secret references.
6. Plugin/MCP/remote worker: untrusted by default, with explicit grants, bounded resources, revocation and audit.
7. External network: no implicit trust; enforce endpoint and egress policy.

## Core module ownership

- Workspace service: workspace membership, settings, roots and quotas.
- Graph registry: versioned graph definitions, node/port types and edges.
- Planner: proposes plans within step, time, token, cost and tool-call budgets; never executes tools directly.
- Graph validator: type, reachability, cycle and capability validation.
- Scheduler: ready queue, concurrency limits, fairness and resource locks.
- Executor: node lifecycle, retries and cancellation checkpoints.
- Policy engine: allow, deny or approval decisions.
- Approval manager: durable approval requests and decisions.
- Tool broker: capability checks and invocation boundary.
- Model registry: provider/model metadata and routing, never raw secret persistence.
- Secret vault: OS-backed credential references and lifecycle.
- Event journal: append-only lifecycle/audit events and cursors.
- Persistence: transactions, snapshots, migrations and artifact metadata.
- Worker manager: worker leases, identity, heartbeat and result reconciliation.
- Spatial projection: maps runtime snapshots/events into scene objects; it cannot own execution truth.

Modules communicate through versioned TypeScript contracts. Every runtime boundary validates schemas, including calls between local modules.

## Graph and execution model

A graph revision is immutable and versioned. Node types declare typed input/output ports, configuration schema, required capabilities, resource budget and side-effect classification. Edges connect compatible ports. Reject unknown node types, incompatible ports, missing required inputs, illegal cycles and capability violations. Cycles are allowed only through explicit bounded loop constructs.

A run pins its graph revision and relevant policy, model and tool versions. Goal-driven execution proceeds:
1. User submits a goal and budget/policy profile.
2. Planner proposes a typed graph.
3. Validator checks types, capabilities, graph constraints and budgets.
4. Policy engine allows, denies or requests approval.
5. Scheduler runs eligible nodes; independent nodes may run concurrently, while constrained shared resources are serialized.
6. Results and lifecycle events are durably recorded and projected to the UI.
7. Planner may propose changes only within configured budgets. New privileged actions are validated and policy-checked again.

Planner output is untrusted data, never executable authority.

Node lifecycle:
created -> validated -> blocked or ready -> queued -> running -> succeeded or failed or waiting_approval or cancelling -> cancelled or interrupted.
State transitions are centrally validated. A retry creates a new attempt linked to the previous one; terminal states for an attempt are immutable.

Failure behavior is policy-defined: fail-fast, bounded retry with backoff, skip an optional branch, or route to a failure handler. Retries require an idempotency strategy. Pause stops new scheduling and asks active tools to checkpoint. Graceful cancellation signals active work; force-stop is distinct and records uncertain side effects. Arbitrary external effects cannot be assumed reversible.

## Persistence and recovery

SQLite is authoritative for local metadata and event indexes. Artifact bytes live under a workspace-owned filesystem root. Remote workers submit results through the runtime API and never open the same SQLite database directly.

Core entities: Workspace, WorkspaceSettings, AgentDefinition, TeamDefinition, AgentSession, Graph, GraphRevision, GraphNode, GraphEdge, Run, NodeAttempt, Event, Snapshot, Checkpoint, ApprovalRequest, ApprovalDecision, ToolDefinition, CapabilityGrant, ToolInvocation, ProviderProfile, ModelProfile, MemoryRecord, Artifact, Schedule, Worker, WorkerLease, AuditRecord and Migration.

Durability rules:
- Commit state changes and corresponding events atomically where possible.
- Report success only after durable commit.
- Use unique event IDs and monotonic per-workspace sequence numbers.
- Use idempotency keys for commands and external invocations.
- Snapshots accelerate recovery; event history remains subject to safe retention.
- Artifacts use generated IDs and checksums; never trust traversal-prone user paths.
- Pending approvals survive restart.
- Crash recovery is manual: show last durable state, interrupted work, uncertain side effects and explicit recovery options.
- Replay reconstructs or simulates state; it does not repeat external side effects unless a new execution is explicitly authorized.

## Memory model

Memory scopes are run, agent, workspace and opt-in user memory. An optional retrieval index is derived and rebuildable. Each record has owner/scope, provenance, timestamps, retention class and sensitivity label. Scope authorization occurs before ranking/retrieval. Prompts include only relevant minimum context. Deletion removes the source and schedules derived-index cleanup.

## Model/provider architecture

A provider adapter has a common contract for capabilities, model metadata, request validation, streaming, usage reporting, cancellation where supported and normalized errors. Configuration includes endpoint, model ID and limits.

First provider target: Groq via its OpenAI-compatible API. Later adapters may support custom OpenAI-compatible endpoints, native APIs and local inference. Store credentials in OS credential storage where available; any fallback must be encrypted and documented. Plaintext secrets in renderer state, localStorage, logs, telemetry, ordinary settings or repository files are forbidden. Connection tests use a minimal bounded request and redacted diagnostics. Normalize auth, rate-limit, timeout, network, invalid-request and provider errors. Model tool calls must pass through the tool broker.

## Tool and plugin architecture

A tool manifest declares stable ID/version, description, input/output schemas, capabilities, side-effect class, network/filesystem scope, timeout, resource limits and cancellation support. Core tools and plugins use the same broker.

Initial tool families: workspace files, bounded shell, Git/GitHub, browser automation, HTTP, schedules and model inference. Delete, publish, push/merge, credential changes, unrestricted shell/network and other high-risk actions require explicit approval or are denied. Plugins cannot grant themselves capabilities. MCP imports are untrusted and require per-tool grants.

## Remote workers and sync

Remote execution is optional. Workers authenticate with revocable, short-lived, workspace-scoped credentials. Leases have heartbeat, timeout, cancellation and reconciliation. Workers receive only assigned inputs and narrow artifact access. They never access shared SQLite directly. Optional sync is encrypted in transit and conflict resolution is explicit; execution state and approvals never silently use last-write-wins.

## Spatial UI

The renderer subscribes to versioned snapshots/events and derives Babylon.js nodes, edges, tubes, labels and zones. Stable runtime IDs map to scene objects. Commands such as connect, layout, inspect, pause, cancel and approve pass through the typed bridge and are validated by the runtime.

Physics affects layout and visual effects only, never graph dependencies, scheduling or permissions. Adaptive quality controls shadows, particles, tube tessellation, physics frequency and post-processing. Provide an accessible non-3D list/tree view and keyboard-operable controls.

## Observability

Structured events/logs include timestamp, workspace/run/node IDs, correlation ID, severity, duration, attempt, provider/tool ID and normalized error category. Never log credentials or unredacted sensitive data. Exportable diagnostics are redacted. Track queue depth, run/node duration, provider latency, retries, cancellations, approvals, storage and frame rate.

## Architecture decision records

- ADR-001 local-first desktop; optional cloud and workers.
- ADR-002 renderer is projection; runtime is authoritative.
- ADR-003 typed explicit graphs plus bounded goal planning.
- ADR-004 SQLite and filesystem artifacts; optional derived vector index.
- ADR-005 durable event journal and snapshots; manual crash recovery.
- ADR-006 policy gate for every privileged capability; durable approvals.
- ADR-007 core/plugin split with explicit capabilities.
- ADR-008 OS-backed secrets; no frontend-held provider keys.
- ADR-009 remote workers use authenticated APIs, never shared SQLite.
- ADR-010 adaptive rendering is independent from execution correctness.

## Architecture completion criteria

Implementation contracts, event schemas, state transitions, migrations, permission model, failure semantics, API versioning, test strategy and CI gates must be documented and reviewed. This blueprint is the baseline; verified design changes must update it.
