import test from 'node:test'
import assert from 'node:assert/strict'
import { clearStoredSceneSnapshots, loadStoredSceneSnapshot, saveStoredSceneSnapshot, type SnapshotStorage } from './scene-snapshot-store'
import type { SceneSnapshot } from './scene-snapshot'

class MemoryStorage implements SnapshotStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
const snapshot: SceneSnapshot = {
  schemaVersion: 3, worldId: 'paw-main-world', savedAt: '2026-10-17T00:00:00.000Z',
  worldOrigin: { x: 4096, y: 0, z: -8192 },
  camera: { alpha: 1.1, beta: 1.2, radius: 80, target: { x: 4120, y: 12, z: -8170 } },
  loadedChunkIds: ['chunk:64:-128'],
  entities: [{ id: 'asset:station', name: 'Station', assetId: 'station', visible: false,
    transform: { position: { x: 4110, y: 2, z: -8160 }, rotation: { x: 0, y: .5, z: 0 }, scale: { x: 2, y: 2, z: 2 } } }],
  metadata: { engine: 'babylonjs' }
}
test('stored snapshot survives application restart with origin, camera and entity visibility intact', () => {
  const firstProcess = new MemoryStorage()
  saveStoredSceneSnapshot(firstProcess, snapshot)
  const secondProcess = new MemoryStorage()
  secondProcess.values = new Map(firstProcess.values)
  assert.deepEqual(loadStoredSceneSnapshot(secondProcess), snapshot)
})
test('stored snapshot migrates legacy key to canonical key before removing legacy data', () => {
  const storage = new MemoryStorage()
  const legacy = { ...snapshot, schemaVersion: 2, worldOrigin: undefined }
  storage.setItem('paw.scene.snapshot.v1', JSON.stringify(legacy))
  const loaded = loadStoredSceneSnapshot(storage)
  assert.equal(loaded?.schemaVersion, 3)
  assert.deepEqual(loaded?.worldOrigin, { x: 0, y: 0, z: 0 })
  assert.equal(storage.getItem('paw.scene.snapshot.v1'), null)
  assert.ok(storage.getItem('paw.scene.snapshot.v2'))
})
test('malformed snapshots fail closed and explicit cleanup removes both keys', () => {
  const storage = new MemoryStorage()
  storage.setItem('paw.scene.snapshot.v2', '{broken')
  assert.throws(() => loadStoredSceneSnapshot(storage), /valid JSON/)
  clearStoredSceneSnapshots(storage)
  assert.equal(storage.getItem('paw.scene.snapshot.v1'), null)
  assert.equal(storage.getItem('paw.scene.snapshot.v2'), null)
})
