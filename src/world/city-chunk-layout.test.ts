import test from 'node:test'
import assert from 'node:assert/strict'
import { chunksAround } from './world-chunks'
import { planCityChunk } from './city-chunk-layout'

test('chunk layouts are deterministic for the same seed and coordinates', () => {
  const chunk = chunksAround({ x: 420, z: -420 }, 64, 0)[0]
  assert.deepEqual(planCityChunk(chunk), planCityChunk(chunk))
})
test('neighboring chunks share road grid coordinates without gaps', () => {
  const left = chunksAround({ x: 420, z: 0 }, 64, 0)[0]
  const right = chunksAround({ x: 484, z: 0 }, 64, 0)[0]
  const a = planCityChunk(left), b = planCityChunk(right)
  assert.equal(left.maxX, right.minX)
  assert.equal(a.roads[0].z, b.roads[0].z)
  assert.equal(a.roads[0].length, 64)
  assert.equal(b.roads[0].length, 64)
})
test('layout varies building silhouettes but keeps every lot within its chunk bounds', () => {
  const first = planCityChunk(chunksAround({ x: 420, z: 420 }, 64, 0)[0])
  const second = planCityChunk(chunksAround({ x: 484, z: 484 }, 64, 0)[0])
  assert.ok(first.buildings.length > 0)
  assert.notDeepEqual(first.buildings, second.buildings)
  for (const lot of [...first.buildings, ...second.buildings]) {
    assert.ok(Number.isFinite(lot.height) && lot.height >= 5 && lot.height <= 39)
    assert.ok(lot.width >= 7 && lot.width <= 16)
    assert.ok(lot.depth >= 7 && lot.depth <= 16)
  }
})
