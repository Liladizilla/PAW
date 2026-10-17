import assert from "node:assert/strict";
import test from "node:test";
import { assertRecoverable, assertRunTransition, canTransitionRun, recoveryTarget, type RunStatus } from "./run-state";

test("permits normal execution lifecycle", () => {
  const sequence: RunStatus[] = ["queued", "running", "succeeded"];
  assertRunTransition(sequence[0], sequence[1]);
  assertRunTransition(sequence[1], sequence[2]);
});

test("pause requires cooperative acknowledgement and can resume", () => {
  assert.ok(canTransitionRun("running", "pause_requested"));
  assert.ok(canTransitionRun("pause_requested", "paused"));
  assert.ok(canTransitionRun("paused", "running"));
  assert.ok(!canTransitionRun("running", "paused"));
});

test("cancellation is explicit and terminal", () => {
  assertRunTransition("running", "cancel_requested");
  assertRunTransition("cancel_requested", "cancelled");
  assert.ok(!canTransitionRun("cancelled", "running"));
});

test("terminal states cannot be restarted by ordinary transitions", () => {
  for (const status of ["cancelled", "succeeded", "failed"] as const) {
    assert.ok(!canTransitionRun(status, "running"));
  }
});

test("uncertain crash state requires a manual resolution", () => {
  assertRecoverable("needs_recovery");
  assert.equal(recoveryTarget("retry"), "queued");
  assert.equal(recoveryTarget("abandon"), "cancelled");
  assert.throws(() => assertRecoverable("running"), /Manual recovery/);
  assert.throws(() => assertRunTransition("needs_recovery", "queued"), /Illegal run transition/);
});
