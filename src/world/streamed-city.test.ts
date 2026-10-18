import test from 'node:test'
import assert from 'node:assert/strict'
import { NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core'
import { createCityChunkStreamer } from './streamed-city'
import { chunksAround } from './world-chunks'

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


test('streamed chunks inherit world-root rebasing without a second local offset', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const worldRoot = new TransformNode('world-root', scene)
  const streamer = createCityChunkStreamer(scene, 64, 1, worldRoot)
  try {
    streamer.update(new Vector3(1024, 0, 1024))
    const ids = streamer.loadedIds()
    const chunkRoot = scene.transformNodes.find(node => node.name.endsWith('-origin-root'))
    assert.ok(chunkRoot)
    assert.equal(chunkRoot.parent, worldRoot)
    assert.equal(chunkRoot.position.x, 0)
    worldRoot.position.set(-1024, 0, -1024)
    streamer.update(Vector3.Zero(), { x: 1024, y: 0, z: 1024 })
    assert.deepEqual(streamer.loadedIds(), ids)
    assert.equal(chunkRoot.position.x, 0)
    assert.equal(chunkRoot.position.z, 0)
    assert.equal(worldRoot.position.x, -1024)
  } finally {
    streamer.dispose()
    worldRoot.dispose(false, false)
    scene.dispose()
    engine.dispose()
  }
})

test('long-distance streaming keeps world chunk identity and resource counts bounded', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const root = new TransformNode('world-root', scene)
  const streamer = createCityChunkStreamer(scene, 64, 1, root)
  const travel = [
    { x: 4096, z: 4096 }, { x: -4096, z: -4096 },
    { x: 12288, z: -8192 }, { x: -16384, z: 16384 },
    { x: 32768, z: -32768 }, { x: -49152, z: 49152 },
    { x: 65536, z: 65536 }, { x: -65536, z: -65536 }
  ]
  try {
    for (const worldFocus of travel) {
      const origin = {
        x: Math.floor(worldFocus.x / 64) * 64,
        y: 0,
        z: Math.floor(worldFocus.z / 64) * 64
      }
      const renderFocus = { x: worldFocus.x - origin.x, y: 0, z: worldFocus.z - origin.z }
      root.position.set(-origin.x, -origin.y, -origin.z)
      streamer.update(new Vector3(renderFocus.x, renderFocus.y, renderFocus.z), origin)

      assert.deepEqual(streamer.loadedIds(), chunksAround(worldFocus, 64, 1).map(chunk => chunk.id).sort())
      const stats = streamer.stats()
      assert.equal(stats.loadedChunks, 9)
      assert.ok(stats.meshes > 0 && stats.meshes <= 9 * 30)
      assert.equal(stats.meshes, scene.meshes.length)
      assert.equal(stats.materials, scene.materials.length)
    }
  } finally {
    streamer.dispose()
    assert.deepEqual(streamer.loadedIds(), [])
    assert.equal(scene.meshes.length, 0)
    assert.equal(scene.materials.length, 0)
    root.dispose(false, false)
    scene.dispose()
    engine.dispose()
  }
})


test('sustained bidirectional travel keeps streamed resources bounded and returns to zero after disposal', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const root = new TransformNode('stress-world-root', scene)
  const streamer = createCityChunkStreamer(scene, 64, 2, root)
  const maxMeshes = 25 * 30
  try {
    for (let step = 0; step < 120; step++) {
      const worldX = (step % 2 === 0 ? 1 : -1) * (4096 + step * 1024)
      const worldZ = (step % 3 === 0 ? -1 : 1) * (2048 + step * 512)
      const origin = { x: Math.floor(worldX / 64) * 64, y: 0, z: Math.floor(worldZ / 64) * 64 }
      const renderX = worldX - origin.x, renderZ = worldZ - origin.z
      root.position.set(-origin.x, 0, -origin.z)
      streamer.update(new Vector3(renderX, 0, renderZ), origin)
      const stats = streamer.stats()
      assert.equal(stats.loadedChunks, 25)
      assert.ok(stats.meshes > 0 && stats.meshes <= maxMeshes)
      assert.ok(stats.materials > 0 && stats.materials <= stats.meshes)
      assert.equal(stats.meshes, scene.meshes.length)
      assert.equal(stats.materials, scene.materials.length)
      assert.equal(new Set(streamer.loadedIds()).size, 25)
    }
  } finally {
    streamer.dispose()
    assert.deepEqual(streamer.stats(), { loadedChunks: 0, meshes: 0, materials: 0 })
    assert.equal(scene.meshes.length, 0)
    assert.equal(scene.materials.length, 0)
    root.dispose(false, false)
    scene.dispose()
    engine.dispose()
  }
})

test('streamer populates adjacent city blocks at the initial camera position', () => {
  const engine = new NullEngine(), scene = new Scene(engine)
  const streamer = createCityChunkStreamer(scene, 64, 2)
  try {
    streamer.update(Vector3.Zero())
    const ids = streamer.loadedIds()
    // The four chunks overlapping the hand-authored central district stay empty;
    // the other 21 chunks in the initial 5x5 ring must be generated immediately.
    assert.equal(ids.length, 21)
    assert.ok(ids.some(id => id === 'chunk:-1:-2' || id === 'chunk:1:0' || id === 'chunk:0:1'))
    assert.ok(streamer.stats().meshes > 0)
    assert.ok(streamer.stats().materials > 0)
  } finally {
    streamer.dispose()
    assert.deepEqual(streamer.stats(), { loadedChunks: 0, meshes: 0, materials: 0 })
    scene.dispose(); engine.dispose()
  }
})
