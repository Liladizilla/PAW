import { validateGraph, type GraphDefinition, type GraphIssue } from "./graph";

export const ALLOWED_PROPOSAL_NODE_TYPES = [
  "text.constant",
  "text.uppercase",
  "text.concat",
  "json.stringify"
] as const;

export interface GraphProposalResult {
  graph: GraphDefinition | null;
  valid: boolean;
  issues: GraphIssue[];
  requiresReview: true;
}

export function parseGraphProposal(raw: string): GraphProposalResult {
  if (typeof raw !== "string" || raw.length > 128_000) {
    return { graph: null, valid: false, issues: [{ code: "INVALID_SHAPE", path: "$", message: "Model proposal must be text no longer than 128 KB." }], requiresReview: true };
  }
  const candidate = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  let parsed: unknown;
  try { parsed = JSON.parse(candidate); }
  catch {
    return { graph: null, valid: false, issues: [{ code: "INVALID_SHAPE", path: "$", message: "Model response was not a single valid JSON graph. Ask the model to return JSON only." }], requiresReview: true };
  }
  const issues = validateGraph(parsed as GraphDefinition);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { graph: null, valid: false, issues, requiresReview: true };
  }
  const graph = parsed as GraphDefinition;
  if (Array.isArray(graph.nodes)) {
    graph.nodes.forEach((node, index) => {
      if (node && typeof node.type === "string" && !(ALLOWED_PROPOSAL_NODE_TYPES as readonly string[]).includes(node.type)) {
        issues.push({ code: "INVALID_SHAPE", path: `nodes[${index}].type`, message: `Node type "${node.type}" is not available for model proposals.` });
      }
    });
  }
  const unique = new Map(issues.map(issue => [issue.code + "|" + issue.path + "|" + issue.message, issue]));
  const finalIssues = [...unique.values()];
  return { graph: finalIssues.length === 0 ? graph : null, valid: finalIssues.length === 0, issues: finalIssues, requiresReview: true };
}
