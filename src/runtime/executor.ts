import { buildExecutionPlan, validateGraph, type GraphDefinition, type GraphNode, type GraphIssue } from "./graph";

export type PolicyDecision = "allow" | "deny" | "approval_required";
export type NodeEffect = "pure" | "external";

export interface NodeExecutionRequest {
  node: GraphNode;
  inputs: Record<string, unknown>;
  config: Record<string, unknown>;
  signal: AbortSignal;
}

export interface RegisteredNodeHandler {
  run: (request: NodeExecutionRequest) => Promise<Record<string, unknown>> | Record<string, unknown>;
  effect?: NodeEffect;
  capability?: string;
}

export interface PolicyRequest {
  graphId: string;
  nodeId: string;
  nodeType: string;
  effect: NodeEffect;
  capability: string;
}

export interface ExecutionEvent {
  type: "graph.started" | "node.started" | "node.succeeded" | "node.failed" | "node.blocked" | "graph.succeeded" | "graph.failed" | "graph.cancelled";
  graphId: string;
  timestamp: string;
  nodeId?: string;
  message?: string;
}

export type NodeHandler = RegisteredNodeHandler["run"];

export interface GraphExecutionOptions {
  handlers: Readonly<Record<string, RegisteredNodeHandler | NodeHandler>>;
  concurrency?: number;
  signal?: AbortSignal;
  authorize?: (request: PolicyRequest) => Promise<PolicyDecision> | PolicyDecision;
  awaitApproval?: (request: PolicyRequest) => Promise<boolean>;
  onEvent?: (event: ExecutionEvent) => Promise<void> | void;
}

export interface GraphExecutionResult {
  graphId: string;
  status: "succeeded" | "failed" | "cancelled";
  outputs: Record<string, Record<string, unknown>>;
  completedNodeIds: string[];
  error?: string;
}

export class NodeExecutionError extends Error {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly code: "HANDLER_MISSING" | "POLICY_DENIED" | "APPROVAL_REQUIRED" | "INVALID_INPUT" | "INVALID_OUTPUT" | "ABORTED" | "HANDLER_FAILED"
  ) {
    super(message);
    this.name = "NodeExecutionError";
  }
}

function isJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 64) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => isJsonValue(item, depth + 1));
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Object.values(value as Record<string, unknown>).every(item => isJsonValue(item, depth + 1));
  }
  return false;
}

function matchesPortType(value: unknown, type: string): boolean {
  switch (type) {
    case "text": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "boolean": return typeof value === "boolean";
    case "json": return isJsonValue(value);
    case "any": return true;
    default: return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Node handler failed with an unknown error.";
}

export async function executeGraph(
  graph: GraphDefinition,
  options: GraphExecutionOptions
): Promise<GraphExecutionResult> {
  const issues: GraphIssue[] = validateGraph(graph);
  if (issues.length) {
    return { graphId: graph?.id ?? "invalid", status: "failed", outputs: {}, completedNodeIds: [], error: issues.map(issue => issue.message).join(" ") };
  }

  const concurrency = options.concurrency ?? 3;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    return { graphId: graph.id, status: "failed", outputs: {}, completedNodeIds: [], error: "Concurrency must be an integer between 1 and 16." };
  }

  const controller = options.signal ? null : new AbortController();
  const signal = options.signal ?? controller!.signal;
  const plan = buildExecutionPlan(graph);
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const edgesByTarget = new Map<string, typeof graph.edges>();
  for (const edge of graph.edges) {
    const existing = edgesByTarget.get(edge.to.nodeId) ?? [];
    existing.push(edge);
    edgesByTarget.set(edge.to.nodeId, existing);
  }

  const outputs: Record<string, Record<string, unknown>> = Object.create(null) as Record<string, Record<string, unknown>>;
  const completedNodeIds: string[] = [];
  const pending = new Set(plan.orderedNodeIds);
  const running = new Map<string, Promise<void>>();
  let failure: { nodeId: string; message: string } | null = null;

  const emit = async (event: Omit<ExecutionEvent, "graphId" | "timestamp">) => {
    await options.onEvent?.({ ...event, graphId: graph.id, timestamp: new Date().toISOString() });
  };

  const runNode = async (node: GraphNode): Promise<Record<string, unknown>> => {
    if (signal.aborted) throw new NodeExecutionError("Execution was cancelled.", node.id, "ABORTED");
    const registration = options.handlers[node.type];
    if (!registration || (typeof registration !== "function" && typeof registration.run !== "function")) {
      throw new NodeExecutionError(`No handler is registered for node type "${node.type}".`, node.id, "HANDLER_MISSING");
    }

    const registered: RegisteredNodeHandler = typeof registration === "function" ? { run: registration } : registration;
    const effect = registered.effect ?? "pure";
    const capability = registered.capability ?? (effect === "external" ? node.type : "compute");
    const request: PolicyRequest = { graphId: graph.id, nodeId: node.id, nodeType: node.type, effect, capability };
    if (effect === "external") {
      if (!options.authorize) throw new NodeExecutionError("External action denied because no policy authorizer is configured.", node.id, "POLICY_DENIED");
      const decision = await options.authorize(request);
      if (decision === "deny") throw new NodeExecutionError("Policy denied this external action.", node.id, "POLICY_DENIED");
      if (decision === "approval_required") {
        if (!options.awaitApproval || !(await options.awaitApproval(request))) {
          throw new NodeExecutionError("Required approval was not granted.", node.id, "APPROVAL_REQUIRED");
        }
      }
    }

    const inputs: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [name, port] of Object.entries(node.inputs ?? {})) {
      const edge = (edgesByTarget.get(node.id) ?? []).find(candidate => candidate.to.port === name);
      if (!edge) {
        if (port.required) throw new NodeExecutionError(`Required input "${name}" is not connected.`, node.id, "INVALID_INPUT");
        continue;
      }
      const source = outputs[edge.from.nodeId];
      if (!source || !Object.prototype.hasOwnProperty.call(source, edge.from.port)) {
        throw new NodeExecutionError(`Input "${name}" has no value from upstream output.`, node.id, "INVALID_INPUT");
      }
      const value = source[edge.from.port];
      if (!matchesPortType(value, port.type)) {
        throw new NodeExecutionError(`Input "${name}" expected type "${port.type}".`, node.id, "INVALID_INPUT");
      }
      inputs[name] = value;
    }

    await emit({ type: "node.started", nodeId: node.id });
    const value = await registered.run({ node, inputs, config: node.config ?? {}, signal });
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new NodeExecutionError("Node handlers must return an output object.", node.id, "INVALID_OUTPUT");
    }
    const declared = node.outputs ?? {};
    for (const [name, output] of Object.entries(value)) {
      if (!Object.prototype.hasOwnProperty.call(declared, name)) {
        throw new NodeExecutionError(`Handler returned undeclared output "${name}".`, node.id, "INVALID_OUTPUT");
      }
      if (!matchesPortType(output, declared[name].type)) {
        throw new NodeExecutionError(`Output "${name}" does not match declared type "${declared[name].type}".`, node.id, "INVALID_OUTPUT");
      }
    }
    for (const [name, port] of Object.entries(declared)) {
      if (port.required && !Object.prototype.hasOwnProperty.call(value, name)) {
        throw new NodeExecutionError(`Required output "${name}" was not produced.`, node.id, "INVALID_OUTPUT");
      }
    }
    await emit({ type: "node.succeeded", nodeId: node.id });
    return value;
  };

  try {
    await emit({ type: "graph.started" });
    while (pending.size > 0 || running.size > 0) {
      if (signal.aborted) {
        await Promise.allSettled(running.values());
        await emit({ type: "graph.cancelled", message: "Execution was cancelled." });
        return { graphId: graph.id, status: "cancelled", outputs, completedNodeIds };
      }
      if (failure) {
        await Promise.allSettled(running.values());
        await emit({ type: "graph.failed", nodeId: failure.nodeId, message: failure.message });
        return { graphId: graph.id, status: "failed", outputs, completedNodeIds, error: failure.message };
      }

      let scheduled = false;
      for (const id of plan.orderedNodeIds) {
        if (running.size >= concurrency) break;
        if (!pending.has(id)) continue;
        const dependencies = plan.dependencies[id] ?? [];
        if (!dependencies.every(dependency => Object.prototype.hasOwnProperty.call(outputs, dependency))) continue;
        pending.delete(id);
        scheduled = true;
        const node = nodes.get(id)!;
        const task = runNode(node).then(async value => {
          outputs[id] = value;
          completedNodeIds.push(id);
        }).catch(async error => {
          const message = errorMessage(error);
          if (!failure) failure = { nodeId: id, message };
          try { await emit({ type: error instanceof NodeExecutionError && error.code === "POLICY_DENIED" ? "node.blocked" : "node.failed", nodeId: id, message }); } catch { /* preserve the original execution failure */ }
        }).finally(() => {
          running.delete(id);
        });
        running.set(id, task);
      }

      if (running.size > 0) {
        await Promise.race(running.values());
      } else if (pending.size > 0 && !scheduled) {
        failure = { nodeId: "graph", message: "No runnable node remains; the graph dependencies could not be satisfied." };
      }
    }

    await emit({ type: "graph.succeeded" });
    return { graphId: graph.id, status: "succeeded", outputs, completedNodeIds };
  } catch (error) {
    const message = errorMessage(error);
    await emit({ type: "graph.failed", message });
    return { graphId: graph.id, status: "failed", outputs, completedNodeIds, error: message };
  }
}
