import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeSceneSnapshot, encodeSceneSnapshot, validateSceneSnapshot, type SceneSnapshot } from './scene-snapshot'

const valid: SceneSnapshot = {
  schemaVersion: 1, worldId: 'paw-main-world', savedAt: '2026-10-17T00:00:00.000Z',
  camera: { alpha: 1, beta: 1.2, radius: 185, target: { x: 0, y: 0, z: 0 } },
  loadedChunkIds: ['chunk:6:-2'], metadata: { engine: 'babylonjs', revision: 3 }
}
test('scene snapshot round-trips only validated scalar state', () => {
  assert.deepEqual(decodeSceneSnapshot(encodeSceneSnapshot(valid)), valid)
})
test('scene snapshot rejects invalid camera and non-chunk identifiers', () => {
  const invalid = { ...valid, camera: { ...valid.camera, target: { x: Number.NaN, y: 0, z: 0 } }, loadedChunkIds: ['../../secret'] }
  assert.equal(validateSceneSnapshot(invalid).valid, false)
})
test('scene snapshot rejects malformed JSON and unsupported schema', () => {
  assert.throws(() => decodeSceneSnapshot('{broken'))
  assert.equal(validateSceneSnapshot({ ...valid, schemaVersion: 9 }).valid, false)
})
