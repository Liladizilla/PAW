# P.A.W. Security Model

Status: threat model and implementation requirements, not a claim that every control already exists.

## Assets and threats

Assets: provider credentials, workspace files/source code, GitHub access, browser sessions, private prompts/memory, execution history, remote-worker credentials, approvals and release signing material.

Threats: malicious plugins/MCP servers; prompt injection in web pages, repositories or documents; unsafe model-generated arguments; compromised dependencies/build runners; renderer compromise; destructive commands, runaway loops and cost exhaustion; unauthorized local/remote processes; crash during side effects or persistence.

## Secrets

- Use OS credential storage: Secret Service/KWallet on Linux where available, Windows Credential Manager and macOS Keychain.
- Store secret references, not raw values, in settings/database. Renderer APIs never return secrets.
- Redact authorization headers, key-shaped values and sensitive payloads from logs/errors.
- Never pass secrets in command-line args, URL query strings, telemetry or committed env files.
- Environment variable overrides are development-only and explicitly documented.
- Rotation/deletion invalidates cached clients and sessions.

## IPC and local service

Electron context isolation, sandbox and disabled Node integration are mandatory. Preload exposes typed allowlisted commands, never generic IPC, shell or filesystem access. Validate schemas, payload size, window ownership and rate limits. Bind local runtime to loopback only and authenticate local RPC with a random per-launch token or equivalent. Reject non-loopback requests and protect against cross-origin requests, DNS rebinding and unauthorized local processes. Apply restrictive Content Security Policy.

## Tool capabilities

Default deny. Tools declare capabilities and side-effect classes. File tools enforce workspace-root containment and deny traversal/symlink escape unless narrowly granted. Shell tools use command policy or isolation and never interpolate untrusted strings into shell commands. Network tools enforce scheme/host policy, timeouts, response-size limits and configurable private-network restrictions. Destructive or externally visible operations require durable approval unless explicitly pre-authorized by a narrow policy. Bound wall time, tokens/cost, memory, output bytes, retries, concurrency and calls per run.

## Prompt injection and model output

Model output, retrieved content and tool results are untrusted. Planner cannot issue raw commands outside typed graph proposals and registered tools. Retrieved content cannot change grants, policy or approvals. Validate tool arguments and policy-check immediately before execution. Approval UI summarizes exact target, action, scope and side effects. Never claim reversibility without tested rollback support.

## Storage and recovery

Restrict workspace directory permissions, validate artifact paths/checksums, exclude credentials from exports by default and encrypt sync traffic. Remote workers use short-lived scoped credentials. Record uncertain side effects after crashes. Recovery is manual. Replay is non-side-effecting by default.

## Supply chain and release

Lock dependencies, review audit output, scan secrets, run static analysis and produce an SBOM for release candidates. Minimize workflow token permissions and protect signing/publication environments. Separate build from release-write permissions. Never auto-merge or publish unreviewed generated changes.

## Risk severity

- P0: credential exfiltration, arbitrary code outside grants, policy/approval bypass, unauthenticated remote runtime control.
- P1: destructive action without approval, workspace escape, unsafe replay, forged worker result, release credential exposure.
- P2: cost/runaway loops, denial of service, sensitive log leak, cross-workspace memory leak.
- P3: visual spoofing, non-sensitive metadata leak, degraded rendering.

## Required security tests

- Renderer cannot read process environment, filesystem or provider secrets.
- Unauthorized IPC and malformed payloads are rejected.
- Traversal and symlink escape fail closed.
- Plugin cannot call ungranted capabilities or elevate grants.
- Prompt-injected content cannot change policy or bypass approval.
- Secrets are absent from logs, crash reports, preview bundles and exports.
- Pause/cancel/force-stop semantics hold under concurrent execution.
- Recovery exposes uncertain side effects and never silently reruns them.
- Remote workers reject expired, revoked, wrong-workspace and replayed credentials.
