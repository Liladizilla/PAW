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

test("rejects required inputs that are not connected", () => {
  const graph: GraphDefinition = { schemaVersion: 1, id: "required-input", nodes: [
    { id: "source", type: "source", outputs: { value: { type: "text" } } },
    { id: "sink", type: "sink", inputs: { value: { type: "text", required: true } } }
  ], edges: [] };
  assert.ok(validateGraph(graph).some(issue => issue.code === "REQUIRED_INPUT_UNCONNECTED"));
});

test("rejects two edges targeting the same input port", () => {
  const graph: GraphDefinition = { schemaVersion: 1, id: "ambiguous-input", nodes: [
    { id: "a", type: "source", outputs: { value: { type: "text" } } },
    { id: "b", type: "source", outputs: { value: { type: "text" } } },
    { id: "sink", type: "sink", inputs: { value: { type: "text" } } }
  ], edges: [
    { id: "first", from: { nodeId: "a", port: "value" }, to: { nodeId: "sink", port: "value" } },
    { id: "second", from: { nodeId: "b", port: "value" }, to: { nodeId: "sink", port: "value" } }
  ] };
  assert.ok(validateGraph(graph).some(issue => issue.code === "MULTIPLE_INPUTS"));
});

test("returns validation issues for malformed nested edges instead of throwing", () => {
  const malformed = { schemaVersion: 1, id: "malformed", nodes: [{ id: "n", type: "source" }], edges: [{ id: "e" }] };
  assert.ok(validateGraph(malformed as unknown as GraphDefinition).some(issue => issue.code === "INVALID_SHAPE"));
});

test("accepts an empty graph with a valid id", () => {
  assert.deepEqual(validateGraph({ schemaVersion: 1, id: "empty", nodes: [], edges: [] }), []);
});

test("rejects a non-string graph id and unsupported port types", () => {
  const wrongId = { schemaVersion: 1, id: 42, nodes: [], edges: [] };
  assert.ok(validateGraph(wrongId as unknown as GraphDefinition).some(issue => issue.code === "INVALID_SHAPE"));
  const wrongPort = { schemaVersion: 1, id: "bad-port", nodes: [
    { id: "n", type: "source", outputs: { value: { type: "executable" } } }
  ], edges: [] };
  assert.ok(validateGraph(wrongPort as unknown as GraphDefinition).some(issue => issue.code === "INVALID_SHAPE"));
});

test("rejects malformed node port maps and config before planning", () => {
  const malformed = { schemaVersion: 1, id: "bad-node-shape", nodes: [
    { id: "n", type: "source", inputs: "not-a-map", config: [] }
  ], edges: [] };
  assert.ok(validateGraph(malformed as unknown as GraphDefinition).filter(issue => issue.code === "INVALID_SHAPE").length >= 2);
});
