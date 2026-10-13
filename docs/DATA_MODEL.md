# P.A.W. Data Model and Event Contract

Status: logical schema baseline. Physical migrations and validators must be implemented and tested before these records are production contracts.

## Identity and tenancy

Records are workspace-scoped unless explicitly global. IDs are opaque stable strings. Timestamps are UTC ISO-8601. Durations are integer milliseconds. Monetary/cost accounting uses decimal-safe representation. Mutable records have a version or updated timestamp for conflict detection.

## Core records

- Workspace: ID, name, creation time, settings version, schema version.
- WorkspaceSettings: execution defaults, resource budgets, graphics profile, retention.
- AgentDefinition and TeamDefinition: versioned role, prompt reference, grants, model profile, autonomy and hierarchy.
- AgentSession: workspace, agent/team, state and context references.
- Graph and GraphRevision: immutable typed nodes/edges, author and validation status.
- GraphNode and GraphEdge: type/version, config, typed ports, source/target port IDs and conditions.
- Run: graph revision or goal, status, policy revision, timestamps, cancellation state and budget use.
- NodeAttempt: run/node, attempt number, status, idempotency key, artifacts and normalized error.
- Event: event ID, workspace sequence, type/version, timestamp, correlation/causation IDs, payload and sensitivity.
- Snapshot and Checkpoint: state sequence/checksum and resumable state references.
- ApprovalRequest and ApprovalDecision: exact requested capability, redacted summary, status, expiry, actor and decision.
- ToolDefinition, CapabilityGrant and ToolInvocation: manifest version, scopes, limits, policy decision, side-effect status and artifacts.
- ProviderProfile and ModelProfile: endpoint, model, capabilities, limits and secret reference only.
- MemoryRecord: scope, owner, provenance, retention and sensitivity.
- Artifact: generated storage key, content hash, media type, size and retention.
- Schedule: trigger, timezone, next/last run and enabled state.
- Worker and WorkerLease: identity, capabilities, heartbeat, lease expiry and revocation.
- AuditRecord and Migration: redacted action record; migration version/checksum/application time.

## Event envelope

Every event contains unique event ID, workspace ID, strictly increasing workspace sequence, event type and schema version, timestamp, correlation ID, optional causation ID, optional run/node/attempt/resource IDs, validated typed payload and sensitivity label.

Representative events: workspace.created, graph.revision.created, graph.validation.completed, run.created, run.queued, node.queued, node.started, node.progress, approval.requested, approval.decided, tool.invocation.started, tool.invocation.completed, node.succeeded, node.failed, run.paused, run.cancellation.requested, run.cancelled, run.interrupted, checkpoint.created, recovery.reviewed, artifact.created and policy.denied.

## Transaction and ordering guarantees

- Commands carry idempotency keys and return the original result when safe to repeat.
- State mutation and its event commit atomically where possible.
- Workspace sequence allocation is serialized within a SQLite transaction.
- Unknown event schema versions fail closed for state-changing handlers.
- Consumers track cursors and tolerate duplicate delivery; do not assume exactly-once delivery.
- Snapshots include highest included sequence and checksum.
- Recovery validates snapshot, replays later events and marks unresolved in-flight side effects uncertain.
- Replay is read-only by default. Side-effecting tools need a newly approved execution.

## SQLite and filesystem constraints

Enable foreign keys, use WAL where supported/tested, configure busy timeout and bounded retry. Migrations are ordered, checksummed and tested against a fresh DB plus prior-version fixtures. Use prepared statements and bounded queries. Artifact paths are generated internally and resolved under the workspace root. Atomic writes use temporary files then rename; checksums detect corruption. Backups exclude credentials by default. Retention cannot remove events needed by active runs/checkpoints.

## Data lifecycle

Workspace export must list included data and exclusions. Delete operations retain audit metadata without retaining deleted sensitive content. Memory/vector indexes are derived and rebuildable. Backup and restore are versioned and tested.
