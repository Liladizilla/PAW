import { app } from "electron";
import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface WorkspaceSnapshot {
  schemaVersion: 1;
  workspaceId: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface RuntimeEvent {
  id: string;
  workspaceId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const MAX_DOCUMENT_BYTES = 1_000_000;
const MAX_EVENT_BYTES = 64_000;
const MAX_HISTORY_LINES = 10_000;
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SAFE_EVENT_TYPE = /^[a-z][a-z0-9._:-]{0,79}$/;

function dataDirectory(): string {
  return join(app.getPath("userData"), "paw");
}

function workspacePath(workspaceId: string): string {
  if (!SAFE_ID.test(workspaceId)) throw new Error("Invalid workspace id.");
  return join(dataDirectory(), "workspaces", `${workspaceId}.json`);
}

function historyPath(workspaceId: string): string {
  if (!SAFE_ID.test(workspaceId)) throw new Error("Invalid workspace id.");
  return join(dataDirectory(), "history", `${workspaceId}.ndjson`);
}

function encodeJson(value: unknown, maxBytes: number): string {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) throw new Error("Payload exceeds the configured size limit.");
  return serialized;
}

export async function loadWorkspace(workspaceId: string): Promise<WorkspaceSnapshot> {
  const path = workspacePath(workspaceId);
  try {
    const raw = await readFile(path, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_DOCUMENT_BYTES) throw new Error("Workspace document exceeds the configured size limit.");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Workspace document is invalid.");
    const snapshot = parsed as WorkspaceSnapshot;
    if (snapshot.schemaVersion !== 1 || snapshot.workspaceId !== workspaceId ||
        typeof snapshot.updatedAt !== "string" || !snapshot.data || typeof snapshot.data !== "object" ||
        Array.isArray(snapshot.data)) throw new Error("Workspace document has an unsupported schema.");
    return snapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, workspaceId, updatedAt: new Date(0).toISOString(), data: {} };
    }
    throw error;
  }
}

export async function saveWorkspace(workspaceId: string, data: Record<string, unknown>): Promise<WorkspaceSnapshot> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Workspace data must be a JSON object.");
  const snapshot: WorkspaceSnapshot = { schemaVersion: 1, workspaceId, updatedAt: new Date().toISOString(), data };
  const serialized = encodeJson(snapshot, MAX_DOCUMENT_BYTES);
  const target = workspacePath(workspaceId);
  await mkdir(join(dataDirectory(), "workspaces"), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(temporary, target);
  return snapshot;
}

export async function appendHistoryEvent(
  workspaceId: string,
  input: { type: string; payload?: Record<string, unknown> }
): Promise<RuntimeEvent> {
  if (!input || typeof input.type !== "string" || !SAFE_EVENT_TYPE.test(input.type)) {
    throw new Error("Invalid event type.");
  }
  const payload = input.payload ?? {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Event payload must be a JSON object.");
  const event: RuntimeEvent = {
    id: randomUUID(),
    workspaceId,
    type: input.type,
    timestamp: new Date().toISOString(),
    payload
  };
  const line = encodeJson(event, MAX_EVENT_BYTES);
  const path = historyPath(workspaceId);
  await mkdir(join(dataDirectory(), "history"), { recursive: true });
  let currentBytes = 0;
  try { currentBytes = (await stat(path)).size; } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (currentBytes + Buffer.byteLength(line, "utf8") + 1 > 32_000_000) {
    throw new Error("Workspace history reached its storage limit. Export or archive history before appending.");
  }
  await appendFile(path, line + "\n", { encoding: "utf8", mode: 0o600 });
  return event;
}

export async function readHistory(workspaceId: string, limit = 200): Promise<RuntimeEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("History limit must be between 1 and 1000.");
  try {
    const raw = await readFile(historyPath(workspaceId), "utf8");
    const lines = raw.split("\n").filter(Boolean).slice(-MAX_HISTORY_LINES).slice(-limit);
    return lines.map(line => {
      const value: unknown = JSON.parse(line);
      if (!value || typeof value !== "object" || (value as RuntimeEvent).workspaceId !== workspaceId) {
        throw new Error("History contains an invalid event.");
      }
      return value as RuntimeEvent;
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
