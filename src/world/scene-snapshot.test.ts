import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeSceneSnapshot, encodeSceneSnapshot, validateSceneSnapshot, type SceneSnapshot } from './scene-snapshot'

const valid: SceneSnapshot = {
  schemaVersion: 3, worldId: 'paw-main-world', savedAt: '2026-10-17T00:00:00.000Z',
  worldOrigin: { x: 0, y: 0, z: 0 },
  camera: { alpha: 1, beta: 1.2, radius: 185, target: { x: 0, y: 0, z: 0 } },
  loadedChunkIds: ['chunk:6:-2'],
  entities: [{ id: 'agent:builder', name: 'BUILD ENGINE', transform: { position: { x: 4, y: .8, z: -2 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }, visible: true }],
  metadata: { engine: 'babylonjs', revision: 3 }
}
test('scene snapshot round-trips camera, origin, chunk and editable entity data', () => {
  assert.deepEqual(decodeSceneSnapshot(encodeSceneSnapshot(valid)), valid)
})
test('scene snapshot rejects invalid transforms, duplicate IDs, malformed chunk IDs and invalid origin', () => {
  const invalid = { ...valid, entities: [valid.entities[0], valid.entities[0]], camera: { ...valid.camera, target: { x: Number.NaN, y: 0, z: 0 } }, loadedChunkIds: ['../../secret'], worldOrigin: { x: Infinity, y: 0, z: 0 } }
  assert.equal(validateSceneSnapshot(invalid).valid, false)
})
test('scene snapshot rejects malformed JSON and unsupported schema', () => {
  assert.throws(() => decodeSceneSnapshot('{broken'))
  assert.equal(validateSceneSnapshot({ ...valid, schemaVersion: 9 }).valid, false)
})
test('legacy v1 camera-only snapshots migrate without losing camera state', () => {
  const legacy = { ...valid, schemaVersion: 1 }
  delete (legacy as Partial<SceneSnapshot>).entities
  delete (legacy as Partial<SceneSnapshot>).worldOrigin
  const migrated = decodeSceneSnapshot(JSON.stringify(legacy))
  assert.equal(migrated.schemaVersion, 3)
  assert.deepEqual(migrated.worldOrigin, { x: 0, y: 0, z: 0 })
  assert.deepEqual(migrated.camera, valid.camera)
  assert.deepEqual(migrated.entities, [])
})
test('v2 snapshots migrate with unchanged world-space transforms and zero origin', () => {
  const legacy = { ...valid, schemaVersion: 2, worldOrigin: undefined }
  const migrated = decodeSceneSnapshot(JSON.stringify(legacy))
  assert.equal(migrated.schemaVersion, 3)
  assert.deepEqual(migrated.worldOrigin, { x: 0, y: 0, z: 0 })
  assert.deepEqual(migrated.entities, valid.entities)
})

test('nonzero-origin snapshot round-trips imported entity world transforms unchanged', () => {
  const worldSnapshot: SceneSnapshot = {
    ...valid,
    worldOrigin: { x: 2688, y: 0, z: -2752 },
    camera: { ...valid.camera, target: { x: 2700, y: 12, z: -2700 } },
    entities: [{
      id: 'asset:landmark-01',
      name: 'IMPORTED LANDMARK',
      assetId: 'asset-catalog-uuid-01',
      transform: {
        position: { x: 2712.5, y: 3, z: -2680.25 },
        rotation: { x: 0, y: 1.25, z: 0 },
        scale: { x: 2, y: 2, z: 2 }
      },
      visible: true
    }]
  }

  const restored = decodeSceneSnapshot(encodeSceneSnapshot(worldSnapshot))
  assert.deepEqual(restored.worldOrigin, worldSnapshot.worldOrigin)
  assert.deepEqual(restored.camera.target, worldSnapshot.camera.target)
  assert.deepEqual(restored.entities, worldSnapshot.entities)
  assert.equal(restored.entities[0].assetId, 'asset-catalog-uuid-01')
})
