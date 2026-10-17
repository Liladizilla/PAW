import type { GraphExecutionOptions } from "./executor";

export const builtinNodeHandlers: GraphExecutionOptions["handlers"] = {
  "text.constant": ({ config }) => ({ value: typeof config.value === "string" ? config.value : "" }),
  "text.uppercase": ({ inputs }) => ({ text: String(inputs.text ?? "").toUpperCase() }),
  "text.concat": ({ inputs, config }) => ({
    text: String(inputs.left ?? "") + String(config.separator ?? "") + String(inputs.right ?? "")
  }),
  "json.stringify": ({ inputs }) => ({ text: JSON.stringify(inputs.value) ?? "null" })
};
