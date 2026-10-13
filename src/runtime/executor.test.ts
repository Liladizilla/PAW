import assert from "node:assert/strict";
import test from "node:test";
import { executeGraph, type ExecutionEvent, type GraphExecutionOptions } from "./executor";
import type { GraphDefinition } from "./graph";

const graph: GraphDefinition = {
  schemaVersion: 1,
  id: "execution-demo",
  nodes: [
    { id: "answer", type: "format", inputs: { value: { type: "text", required: true } }, outputs: { result: { type: "text", required: true } } },
    { id: "source", type: "constant", outputs: { text: { type: "text", required: true } }, config: { text: "hello P.A.W." } },
    { id: "audit", type: "audit", inputs: { value: { type: "text", required: true } }, outputs: { accepted: { type: "boolean", required: true } } }
  ],
  edges: [
    { id: "edge-source-format", from: { nodeId: "source", port: "text" }, to: { nodeId: "answer", port: "value" } },
    { id: "edge-format-audit", from: { nodeId: "answer", port: "result" }, to: { nodeId: "audit", port: "value" } }
  ]
};

const handlers: GraphExecutionOptions["handlers"] = {
  constant: ({ config }) => ({ text: String(config.text ?? "") }),
  format: ({ inputs }) => ({ result: String(inputs.value).toUpperCase() }),
  audit: ({ inputs }) => ({ accepted: inputs.value === "HELLO P.A.W." })
};

test("executes a typed graph in dependency order and forwards outputs", async () => {
  const events: ExecutionEvent[] = [];
  const result = await executeGraph(graph, { handlers, onEvent: event => { events.push(event); } });
  assert.equal(result.status, "succeeded");
  assert.equal(result.outputs.answer.result, "HELLO P.A.W.");
  assert.equal(result.outputs.audit.accepted, true);
  assert.deepEqual(result.completedNodeIds, ["source", "answer", "audit"]);
  assert.equal(events[0].type, "graph.started");
  assert.equal(events.at(-1)?.type, "graph.succeeded");
});

test("denies external effects when no policy authorizer exists", async () => {
  let invoked = false;
  const result = await executeGraph({
    schemaVersion: 1, id: "guarded", nodes: [{ id: "send", type: "send" }], edges: []
  }, {
    handlers: { send: { effect: "external", run: () => { invoked = true; return {}; } } }
  });
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /no policy authorizer/i);
  assert.equal(invoked, false);
});

test("requires an approval callback when policy requests approval", async () => {
  let invoked = false;
  const result = await executeGraph({
    schemaVersion: 1, id: "approval-gate", nodes: [{ id: "write", type: "write" }], edges: []
  }, {
    handlers: { write: { effect: "external", capability: "filesystem.write", run: () => { invoked = true; return {}; } } },
    authorize: () => "approval_required",
    awaitApproval: async () => false
  });
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /approval was not granted/i);
  assert.equal(invoked, false);
});

test("does not run downstream nodes after a handler failure", async () => {
  let downstreamInvoked = false;
  const result = await executeGraph({
    schemaVersion: 1, id: "failure", nodes: [
      { id: "bad", type: "bad", outputs: { value: { type: "text" } } },
      { id: "later", type: "later", inputs: { value: { type: "text", required: true } } }
    ], edges: [{ id: "e", from: { nodeId: "bad", port: "value" }, to: { nodeId: "later", port: "value" } }]
  }, {
    handlers: {
      bad: () => { throw new Error("controlled failure"); },
      later: () => { downstreamInvoked = true; return {}; }
    }
  });
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /controlled failure/);
  assert.equal(downstreamInvoked, false);
});

test("rejects invalid concurrency before invoking handlers", async () => {
  let invoked = false;
  const result = await executeGraph({ schemaVersion: 1, id: "limit", nodes: [{ id: "n", type: "n" }], edges: [] }, {
    concurrency: 0, handlers: { n: () => { invoked = true; return {}; } }
  });
  assert.equal(result.status, "failed");
  assert.equal(invoked, false);
});

test("cancellation prevents queued nodes from starting", async () => {
  const controller = new AbortController();
  controller.abort();
  let invoked = false;
  const result = await executeGraph({ schemaVersion: 1, id: "cancel", nodes: [{ id: "n", type: "n" }], edges: [] }, {
    signal: controller.signal, handlers: { n: () => { invoked = true; return {}; } }
  });
  assert.equal(result.status, "cancelled");
  assert.equal(invoked, false);
});
