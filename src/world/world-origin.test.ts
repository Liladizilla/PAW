import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseWorldOrigin, renderToWorld, worldToRender } from './world-origin'

test('world/render transforms round-trip without losing authoritative coordinates', () => {
  const world = { x: 1_000_012.5, y: 8, z: -2_000_006.25 }
  const origin = { x: 1_000_000, y: 0, z: -2_000_000 }
  assert.deepEqual(renderToWorld(worldToRender(world, origin), origin), world)
  assert.deepEqual(worldToRender(world, origin), { x: 12.5, y: 8, z: -6.25 })
})
test('origin remains stable inside threshold and snaps to chunk grid outside it', () => {
  const origin = { x: 0, y: 0, z: 0 }
  assert.deepEqual(chooseWorldOrigin({ x: 100, y: 0, z: 120 }, origin, 64, 256), origin)
  assert.deepEqual(chooseWorldOrigin({ x: 2700, y: 10, z: -2150 }, origin, 64, 256), { x: 2688, y: 0, z: -2176 })
})
test('origin helpers reject non-finite coordinates and invalid thresholds', () => {
  assert.throws(() => worldToRender({ x: Infinity, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }))
  assert.throws(() => chooseWorldOrigin({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0, 10))
})
