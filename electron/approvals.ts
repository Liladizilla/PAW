import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export type ApprovalDecision = "approved" | "denied";
export interface ApprovalRecord {
  id: string;
  workspaceId: string;
  action: string;
  summary: string;
  requestedBy: string;
  createdAt: string;
  status: "pending" | ApprovalDecision;
  decidedAt?: string;
  decisionNote?: string;
}
const workspaceId = "default";
const storePath = () => join(app.getPath("userData"), "paw", "approvals.json");
let mutationTail: Promise<void> = Promise.resolve();
async function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const previous = mutationTail;
  mutationTail = previous.then(() => gate, () => gate);
  await previous;
  try { return await operation(); } finally { release(); }
}
const validText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

async function readRecords(): Promise<ApprovalRecord[]> {
  try {
    const raw = await readFile(storePath(), "utf8");
    if (Buffer.byteLength(raw, "utf8") > 2_000_000) throw new Error("Approval store exceeds the size limit.");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 5000) throw new Error("Approval store has an invalid schema.");
    return parsed as ApprovalRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: ApprovalRecord[]): Promise<void> {
  const directory = join(app.getPath("userData"), "paw");
  await mkdir(directory, { recursive: true });
  const target = storePath();
  const temporary = `${target}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(records);
  if (Buffer.byteLength(serialized, "utf8") > 2_000_000) throw new Error("Approval history reached its storage limit. Archive old records first.");
  await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(temporary, target);
}

export async function listApprovals(status?: "pending" | ApprovalDecision): Promise<ApprovalRecord[]> {
  const records = await readRecords();
  return records.filter(record => record.workspaceId === workspaceId && (!status || record.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function requestApproval(input: { action: string; summary: string; requestedBy?: string }): Promise<ApprovalRecord> {
  if (!input || !validText(input.action, 120) || !validText(input.summary, 4000) ||
      (input.requestedBy !== undefined && !validText(input.requestedBy, 120))) {
    throw new Error("Approval action, summary and requester must be valid bounded text.");
  }
  return serializeMutation(async () => {
  const records = await readRecords();
  if (records.length >= 5000) throw new Error("Approval history limit reached. Export or archive old records first.");
  const record: ApprovalRecord = {
    id: randomUUID(),
    workspaceId,
    action: input.action.trim(),
    summary: input.summary.trim(),
    requestedBy: input.requestedBy?.trim() || "local-user",
    createdAt: new Date().toISOString(),
    status: "pending"
  };
  records.push(record);
  await writeRecords(records);
  return record;
  });
}

export async function decideApproval(id: string, decision: ApprovalDecision, note?: string): Promise<ApprovalRecord> {
  if (!validText(id, 80) || (decision !== "approved" && decision !== "denied") ||
      (note !== undefined && (typeof note !== "string" || note.length > 1000))) {
    throw new Error("Invalid approval decision.");
  }
  return serializeMutation(async () => {
  const records = await readRecords();
  const index = records.findIndex(record => record.id === id && record.workspaceId === workspaceId);
  if (index < 0) throw new Error("Approval request not found.");
  if (records[index].status !== "pending") throw new Error("Approval request has already been decided.");
  const updated: ApprovalRecord = {
    ...records[index],
    status: decision,
    decidedAt: new Date().toISOString(),
    ...(note?.trim() ? { decisionNote: note.trim() } : {})
  };
  records[index] = updated;
  await writeRecords(records);
  return updated;
  });
}
