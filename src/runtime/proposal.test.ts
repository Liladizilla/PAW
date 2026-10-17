import assert from "node:assert/strict";
import test from "node:test";
import { parseGraphProposal } from "./proposal";

const valid = {
  schemaVersion: 1,
  id: "proposal-demo",
  nodes: [
    { id: "source", type: "text.constant", outputs: { value: { type: "text", required: true } }, config: { value: "hello" } },
    { id: "upper", type: "text.uppercase", inputs: { text: { type: "text", required: true } }, outputs: { text: { type: "text", required: true } } }
  ],
  edges: [{ id: "edge", from: { nodeId: "source", port: "value" }, to: { nodeId: "upper", port: "text" } }]
};

test("accepts a valid graph proposal but marks it as requiring review", () => {
  const result = parseGraphProposal(JSON.stringify(valid));
  assert.equal(result.valid, true);
  assert.deepEqual(result.graph, valid);
  assert.equal(result.requiresReview, true);
});

test("accepts fenced JSON without evaluating code", () => {
  const result = parseGraphProposal("```json\n" + JSON.stringify(valid) + "\n```");
  assert.equal(result.valid, true);
});

test("rejects malformed JSON and unsupported executable node types", () => {
  assert.equal(parseGraphProposal("not json").valid, false);
  const result = parseGraphProposal(JSON.stringify({ ...valid, nodes: [{ id: "run", type: "shell.exec" }], edges: [] }));
  assert.equal(result.valid, false);
  assert.equal(result.graph, null);
  assert.ok(result.issues.some(issue => issue.message.includes("not available for model proposals")));
});

test("rejects cyclic or oversized model proposals", () => {
  const cyclic = { ...valid, edges: [
    ...valid.edges,
    { id: "cycle", from: { nodeId: "upper", port: "text" }, to: { nodeId: "source", port: "missing" } }
  ] };
  assert.equal(parseGraphProposal(JSON.stringify(cyclic)).valid, false);
  assert.equal(parseGraphProposal("x".repeat(128_001)).valid, false);
});
