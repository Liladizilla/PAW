import assert from "node:assert/strict";
import test from "node:test";
import { buildExecutionPlan, validateGraph, type GraphDefinition } from "./graph";

const validGraph: GraphDefinition = {
  schemaVersion: 1,
  id: "demo",
  nodes: [
    { id: "finish", type: "output", inputs: { value: { type: "text" } } },
    { id: "start", type: "prompt", outputs: { text: { type: "text" } } },
    { id: "middle", type: "transform", inputs: { source: { type: "text" } }, outputs: { result: { type: "text" } } }
  ],
  edges: [
    { id: "e2", from: { nodeId: "middle", port: "result" }, to: { nodeId: "finish", port: "value" } },
    { id: "e1", from: { nodeId: "start", port: "text" }, to: { nodeId: "middle", port: "source" } }
  ]
};

test("plans dependencies before consumers regardless of canvas order", () => {
  const plan = buildExecutionPlan(validGraph);
  assert.deepEqual(plan.orderedNodeIds, ["start", "middle", "finish"]);
  assert.deepEqual(plan.dependencies.finish, ["middle"]);
});

test("rejects incompatible typed ports", () => {
  const graph = structuredClone(validGraph);
  graph.nodes[1].outputs = { text: { type: "number" } };
  assert.ok(validateGraph(graph).some(issue => issue.code === "PORT_TYPE_MISMATCH"));
});

test("rejects missing node references", () => {
  const graph = structuredClone(validGraph);
  graph.edges[0].from.nodeId = "ghost";
  assert.ok(validateGraph(graph).some(issue => issue.code === "MISSING_NODE"));
});

test("rejects cycles before planning", () => {
  const graph = structuredClone(validGraph);
  graph.edges.push({ id: "e3", from: { nodeId: "finish", port: "value" }, to: { nodeId: "start", port: "text" } });
  assert.ok(validateGraph(graph).some(issue => issue.code === "CYCLE"));
  assert.throws(() => buildExecutionPlan(graph), /Graph validation failed/);
});

test("rejects duplicate node ids", () => {
  const graph = structuredClone(validGraph);
  graph.nodes.push({ id: "start", type: "duplicate" });
  assert.ok(validateGraph(graph).some(issue => issue.code === "DUPLICATE_ID"));
});

test("accepts an empty graph with a valid id", () => {
  assert.deepEqual(validateGraph({ schemaVersion: 1, id: "empty", nodes: [], edges: [] }), []);
});
