import { app } from "electron";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertRecoverable, assertRunTransition, recoveryTarget, type RunStatus } from "../src/runtime/run-state";

export interface RunStateEvent {
  status: RunStatus;
  timestamp: string;
  reason?: string;
}
export interface RunRecord {
  id: string;
  workspaceId: string;
  graphId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  history: RunStateEvent[];
}
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const path = () => join(app.getPath("userData"), "paw", "runs.json");
let mutationTail: Promise<void> = Promise.resolve();

async function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const previous = mutationTail;
  mutationTail = previous.then(() => gate, () => gate);
  await previous;
  try { return await operation(); } finally { release(); }
}

async function readRecords(): Promise<RunRecord[]> {
  try {
    const raw = await readFile(path(), "utf8");
    if (Buffer.byteLength(raw, "utf8") > 8_000_000) throw new Error("Run store exceeds the configured size limit.");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 10_000) throw new Error("Run store has an invalid schema.");
    return parsed as RunRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: RunRecord[]): Promise<void> {
  const directory = join(app.getPath("userData"), "paw");
  await mkdir(directory, { recursive: true });
  const target = path();
  const temporary = `${target}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(records);
  if (Buffer.byteLength(serialized, "utf8") > 8_000_000) throw new Error("Run history reached its storage limit. Archive old records first.");
  await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(temporary, target);
}

export async function listRuns(workspaceId = "default"): Promise<RunRecord[]> {
  if (!SAFE_ID.test(workspaceId)) throw new Error("Invalid workspace id.");
  return (await readRecords()).filter(run => run.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRun(input: { graphId: string; workspaceId?: string }): Promise<RunRecord> {
  if (!input || !SAFE_ID.test(input.graphId) ||
      (input.workspaceId !== undefined && !SAFE_ID.test(input.workspaceId))) {
    throw new Error("Run requires valid graph and workspace ids.");
  }
  return serializeMutation(async () => {
    const records = await readRecords();
    if (records.length >= 10_000) throw new Error("Run history limit reached. Archive old records before creating more.");
    const now = new Date().toISOString();
    const run: RunRecord = {
      id: randomUUID(),
      workspaceId: input.workspaceId ?? "default",
      graphId: input.graphId,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      history: [{ status: "queued", timestamp: now, reason: "Run record created; execution is not attached yet." }]
    };
    records.push(run);
    await writeRecords(records);
    return run;
  });
}

export async function transitionRun(
  id: string,
  status: RunStatus,
  reason?: string
): Promise<RunRecord> {
  if (!SAFE_ID.test(id) || (reason !== undefined && (typeof reason !== "string" || reason.length > 1000))) {
    throw new Error("Invalid run transition request.");
  }
  return serializeMutation(async () => {
    const records = await readRecords();
    const index = records.findIndex(run => run.id === id);
    if (index < 0) throw new Error("Run not found.");
    const current = records[index];
    assertRunTransition(current.status, status);
    const now = new Date().toISOString();
    const updated: RunRecord = {
      ...current,
      status,
      updatedAt: now,
      history: [...current.history, { status, timestamp: now, ...(reason?.trim() ? { reason: reason.trim() } : {}) }]
    };
    records[index] = updated;
    await writeRecords(records);
    return updated;
  });
}

export async function resolveRunRecovery(
  id: string,
  resolution: "retry" | "abandon",
  note?: string
): Promise<RunRecord> {
  if (!SAFE_ID.test(id) || (note !== undefined && (typeof note !== "string" || note.length > 1000))) {
    throw new Error("Invalid recovery request.");
  }
  return serializeMutation(async () => {
    const records = await readRecords();
    const index = records.findIndex(run => run.id === id);
    if (index < 0) throw new Error("Run not found.");
    const current = records[index];
    assertRecoverable(current.status);
    const status = recoveryTarget(resolution);
    const now = new Date().toISOString();
    const updated: RunRecord = {
      ...current,
      status,
      updatedAt: now,
      history: [...current.history, {
        status,
        timestamp: now,
        reason: `Manual recovery resolution: ${resolution}.${note?.trim() ? ` ${note.trim()}` : ""}`
      }]
    };
    records[index] = updated;
    await writeRecords(records);
    return updated;
  });
}
