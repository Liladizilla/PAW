import test from 'node:test'
import assert from 'node:assert/strict'
import { NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core'
import { createCityChunkStreamer } from './streamed-city'

test('streamer loads nearby chunks and evicts distant chunk resources after camera travel', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const streamer = createCityChunkStreamer(scene, 64, 1)
  try {
    streamer.update(new Vector3(512, 0, 512))
    const first = streamer.loadedIds()
    assert.equal(first.length, 9)
    assert.ok(first.every(id => id.startsWith('chunk:')))
    const firstMeshes = scene.meshes.length
    const firstStats = streamer.stats()
    assert.equal(firstStats.loadedChunks, 9)
    assert.equal(firstStats.meshes, firstMeshes)
    assert.equal(firstStats.materials, scene.materials.length)
    assert.ok(firstMeshes > 0)

    streamer.update(new Vector3(1024, 0, 1024))
    const second = streamer.loadedIds()
    assert.equal(second.length, 9)
    assert.notDeepEqual(second, first)
    assert.ok(scene.meshes.length > 0)
    assert.ok(scene.meshes.length <= firstMeshes + 100)
  } finally {
    streamer.dispose()
    assert.deepEqual(streamer.loadedIds(), [])
    assert.equal(scene.meshes.length, 0)
    assert.equal(scene.materials.length, 0)
    scene.dispose()
    engine.dispose()
  }
})

test('streamer update is idempotent when focus remains inside the same chunk ring', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const streamer = createCityChunkStreamer(scene, 64, 1)
  try {
    streamer.update(new Vector3(512, 0, 512))
    const ids = streamer.loadedIds()
    const meshCount = scene.meshes.length
    streamer.update(new Vector3(513, 0, 513))
    assert.deepEqual(streamer.loadedIds(), ids)
    assert.equal(scene.meshes.length, meshCount)
  } finally {
    streamer.dispose()
    scene.dispose()
    engine.dispose()
  }
})


test('streamer preserves world chunk IDs when render origin shifts', () => {
  const engine = new NullEngine(), scene = new Scene(engine), streamer = createCityChunkStreamer(scene, 64, 1)
  try {
    streamer.update(new Vector3(1024, 0, 1024))
    const ids = streamer.loadedIds()
    const root = scene.meshes[0]?.parent as TransformNode | null
    assert.ok(root); assert.ok(Math.abs(root.position.x) < 1e-9)
    streamer.update(Vector3.Zero(), { x: 1024, y: 0, z: 1024 })
    assert.deepEqual(streamer.loadedIds(), ids)
    assert.equal(root.position.x, -1024); assert.equal(root.position.z, -1024)
  } finally {
    streamer.dispose(); assert.equal(scene.meshes.length, 0); assert.equal(scene.materials.length, 0)
    scene.dispose(); engine.dispose()
  }
})
