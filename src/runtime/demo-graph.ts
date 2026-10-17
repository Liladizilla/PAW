import type { GraphDefinition } from "./graph";

export const demoGraph: GraphDefinition = {
  schemaVersion: 1,
  id: "local-smoke-test",
  nodes: [
    { id: "source", type: "text.constant", outputs: { value: { type: "text", required: true } }, config: { value: "P.A.W. local runtime" } },
    { id: "uppercase", type: "text.uppercase", inputs: { text: { type: "text", required: true } }, outputs: { text: { type: "text", required: true } } },
    { id: "guard", type: "text.constant", outputs: { value: { type: "text", required: true } }, config: { value: "GUARDED" } },
    { id: "result", type: "text.concat", inputs: { left: { type: "text", required: true }, right: { type: "text", required: true } }, outputs: { text: { type: "text", required: true } }, config: { separator: " / " } }
  ],
  edges: [
    { id: "source-to-uppercase", from: { nodeId: "source", port: "value" }, to: { nodeId: "uppercase", port: "text" } },
    { id: "uppercase-to-result", from: { nodeId: "uppercase", port: "text" }, to: { nodeId: "result", port: "left" } },
    { id: "guard-to-result", from: { nodeId: "guard", port: "value" }, to: { nodeId: "result", port: "right" } }
  ]
};
