export type RunStatus =
  | "queued"
  | "running"
  | "pause_requested"
  | "paused"
  | "cancel_requested"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "needs_recovery";

const transitions: Record<RunStatus, readonly RunStatus[]> = {
  queued: ["running", "cancelled", "needs_recovery"],
  running: ["pause_requested", "cancel_requested", "succeeded", "failed", "needs_recovery"],
  pause_requested: ["paused", "cancel_requested", "failed", "needs_recovery"],
  paused: ["running", "cancel_requested", "cancelled", "needs_recovery"],
  cancel_requested: ["cancelled", "failed", "needs_recovery"],
  cancelled: [],
  succeeded: [],
  failed: [],
  needs_recovery: ["cancelled", "failed"]
};

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  return transitions[from].includes(to);
}

export function assertRunTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransitionRun(from, to)) {
    throw new Error(`Illegal run transition: ${from} -> ${to}.`);
  }
}

export function recoveryTarget(resolution: "retry" | "abandon"): RunStatus {
  return resolution === "retry" ? "queued" : "cancelled";
}

export function assertRecoverable(status: RunStatus): void {
  if (status !== "needs_recovery") {
    throw new Error(`Manual recovery is only available for needs_recovery runs, not ${status}.`);
  }
}
