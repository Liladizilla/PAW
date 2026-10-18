import assert from "node:assert/strict";
import test from "node:test";
import { getDesktopSmokeReady } from "./desktop-bridge";

test("browser preview safely has no Electron smoke hook", () => {
  assert.equal(getDesktopSmokeReady(undefined), undefined);
  assert.equal(getDesktopSmokeReady(null), undefined);
  assert.equal(getDesktopSmokeReady({}), undefined);
  assert.equal(getDesktopSmokeReady({ desktopSmokeReady: "not a function" }), undefined);
});

test("Electron smoke hook is returned when the preload bridge exposes it", async () => {
  const expected = { ready: true };
  const hook = async () => expected;
  assert.equal(getDesktopSmokeReady({ desktopSmokeReady: hook }), hook);
  assert.deepEqual(await getDesktopSmokeReady({ desktopSmokeReady: hook })?.(), expected);
});
