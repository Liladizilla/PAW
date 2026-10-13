export type PortType = "text" | "number" | "boolean" | "json" | "any";

export interface GraphPort {
  type: PortType;
  required?: boolean;
}

export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  inputs?: Record<string, GraphPort>;
  outputs?: Record<string, GraphPort>;
  config?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}

export interface GraphDefinition {
  schemaVersion: 1;
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphIssue {
  code: "INVALID_ID" | "DUPLICATE_ID" | "MISSING_NODE" | "MISSING_PORT" | "PORT_TYPE_MISMATCH" | "DUPLICATE_EDGE" | "MULTIPLE_INPUTS" | "REQUIRED_INPUT_UNCONNECTED" | "CYCLE" | "INVALID_SHAPE";
  path: string;
  message: string;
}

export interface ExecutionPlan {
  graphId: string;
  orderedNodeIds: string[];
  dependencies: Record<string, string[]>;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export function validateGraph(graph: GraphDefinition): GraphIssue[] {
  const issues: GraphIssue[] = [];
  if (!graph || graph.schemaVersion !== 1 || !ID_PATTERN.test(graph.id) ||
      !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return [{ code: "INVALID_SHAPE", path: "$", message: "Expected schemaVersion 1, a valid graph id, and node/edge arrays." }];
  }

  const nodes = new Map<string, GraphNode>();
  graph.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!node || typeof node.id !== "string" || !ID_PATTERN.test(node.id) ||
        typeof node.type !== "string" || node.type.trim().length === 0) {
      issues.push({ code: "INVALID_ID", path, message: "Each node needs a valid id and a non-empty type." });
      return;
    }
    if (nodes.has(node.id)) {
      issues.push({ code: "DUPLICATE_ID", path: `${path}.id`, message: `Node id "${node.id}" is duplicated.` });
      return;
    }
    nodes.set(node.id, node);
  });

  const edgeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const targetPorts = new Set<string>();
  graph.edges.forEach((edge, index) => {
    const path = `edges[${index}]`;
    if (!edge || typeof edge.id !== "string" || !ID_PATTERN.test(edge.id) ||
        !edge.from || !edge.to || typeof edge.from.nodeId !== "string" ||
        typeof edge.from.port !== "string" || typeof edge.to.nodeId !== "string" ||
        typeof edge.to.port !== "string") {
      issues.push({ code: "INVALID_SHAPE", path, message: "Each edge needs an id and valid source/target node and port references." });
      return;
    }
    if (edgeIds.has(edge.id)) {
      issues.push({ code: "DUPLICATE_ID", path: `${path}.id`, message: `Edge id "${edge.id}" is duplicated.` });
    }
    edgeIds.add(edge.id);
    const key = `${edge.from.nodeId}:${edge.from.port}->${edge.to.nodeId}:${edge.to.port}`;
    if (edgeKeys.has(key)) issues.push({ code: "DUPLICATE_EDGE", path, message: "The same connection appears more than once." });
    edgeKeys.add(key);
    const targetPortKey = `${edge.to.nodeId}:${edge.to.port}`;
    if (targetPorts.has(targetPortKey)) issues.push({ code: "MULTIPLE_INPUTS", path, message: `Input port "${edge.to.port}" on "${edge.to.nodeId}" has more than one incoming connection.` });
    targetPorts.add(targetPortKey);

    const source = nodes.get(edge.from.nodeId);
    const target = nodes.get(edge.to.nodeId);
    if (!source) issues.push({ code: "MISSING_NODE", path: `${path}.from.nodeId`, message: `Source node "${edge.from.nodeId}" does not exist.` });
    if (!target) issues.push({ code: "MISSING_NODE", path: `${path}.to.nodeId`, message: `Target node "${edge.to.nodeId}" does not exist.` });
    if (source && !source.outputs?.[edge.from.port]) {
      issues.push({ code: "MISSING_PORT", path: `${path}.from.port`, message: `Output port "${edge.from.port}" is not declared on "${source.id}".` });
    }
    if (target && !target.inputs?.[edge.to.port]) {
      issues.push({ code: "MISSING_PORT", path: `${path}.to.port`, message: `Input port "${edge.to.port}" is not declared on "${target.id}".` });
    }
    const output = source?.outputs?.[edge.from.port];
    const input = target?.inputs?.[edge.to.port];
    if (output && input && output.type !== "any" && input.type !== "any" && output.type !== input.type) {
      issues.push({ code: "PORT_TYPE_MISMATCH", path, message: `Cannot connect ${output.type} to ${input.type}.` });
    }
  });

  for (const node of graph.nodes) {
    if (!node || typeof node.id !== "string" || !node.inputs || typeof node.inputs !== "object" || Array.isArray(node.inputs)) continue;
    for (const [portName, port] of Object.entries(node.inputs)) {
      if (port?.required && !targetPorts.has(`${node.id}:${portName}`)) {
        issues.push({ code: "REQUIRED_INPUT_UNCONNECTED", path: `nodes.${node.id}.inputs.${portName}`, message: `Required input "${portName}" on "${node.id}" is not connected.` });
      }
    }
  }

  const cycle = findCycle(graph.nodes, graph.edges);
  if (cycle.length) issues.push({ code: "CYCLE", path: "edges", message: `Directed cycle detected: ${cycle.join(" -> ")}.` });
  return issues;
}

function findCycle(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adjacency = new Map(nodes.map(node => [node.id, [] as string[]]));
  for (const edge of edges) {
    if (adjacency.has(edge.from.nodeId) && adjacency.has(edge.to.nodeId)) {
      adjacency.get(edge.from.nodeId)?.push(edge.to.nodeId);
    }
  }
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] => {
    state.set(id, 1);
    stack.push(id);
    for (const next of adjacency.get(id) ?? []) {
      if (state.get(next) === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (!state.has(next)) {
        const cycle = visit(next);
        if (cycle.length) return cycle;
      }
    }
    stack.pop();
    state.set(id, 2);
    return [];
  };
  for (const node of nodes) {
    if (!state.has(node.id)) {
      const cycle = visit(node.id);
      if (cycle.length) return cycle;
    }
  }
  return [];
}

export class GraphValidationError extends Error {
  constructor(public readonly issues: GraphIssue[]) {
    super(`Graph validation failed with ${issues.length} issue(s).`);
    this.name = "GraphValidationError";
  }
}

export function buildExecutionPlan(graph: GraphDefinition): ExecutionPlan {
  const issues = validateGraph(graph);
  if (issues.length) throw new GraphValidationError(issues);

  const orderIndex = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const indegree = new Map(graph.nodes.map(node => [node.id, 0]));
  const dependencies: Record<string, string[]> = Object.fromEntries(graph.nodes.map(node => [node.id, []]));
  const outgoing = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  for (const edge of graph.edges) {
    indegree.set(edge.to.nodeId, (indegree.get(edge.to.nodeId) ?? 0) + 1);
    dependencies[edge.to.nodeId].push(edge.from.nodeId);
    outgoing.get(edge.from.nodeId)?.push(edge.to.nodeId);
  }
  const ready = graph.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
  ready.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
  const orderedNodeIds: string[] = [];
  while (ready.length) {
    const id = ready.shift();
    if (!id) continue;
    orderedNodeIds.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) {
        ready.push(next);
        ready.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
      }
    }
  }
  if (orderedNodeIds.length !== graph.nodes.length) {
    throw new GraphValidationError([{ code: "CYCLE", path: "edges", message: "Execution cannot be planned because the graph contains a cycle." }]);
  }
  return { graphId: graph.id, orderedNodeIds, dependencies };
}
