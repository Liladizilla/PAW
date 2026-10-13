import assert from "node:assert/strict";
import test from "node:test";
import { executeGraph } from "./executor";
import { builtinNodeHandlers } from "./builtins";
import { demoGraph } from "./demo-graph";

test("shared smoke-test graph runs through registered local handlers end to end", async () => {
  const result = await executeGraph(demoGraph, { handlers: builtinNodeHandlers, concurrency: 3 });
  assert.equal(result.status, "succeeded");
  assert.equal(result.outputs.result.text, "P.A.W. LOCAL RUNTIME / GUARDED");
  assert.equal(result.completedNodeIds.length, 4);
});

test("the local handler registry exposes only deterministic built-in node types", () => {
  assert.deepEqual(Object.keys(builtinNodeHandlers).sort(), [
    "json.stringify", "text.concat", "text.constant", "text.uppercase"
  ]);
});
