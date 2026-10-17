import test from 'node:test'
import assert from 'node:assert/strict'
import { pedestrianStateToRender, pedestrianStateToWorld } from './pedestrian-coordinates'

test('pedestrian position and route survive conversion through a shifted origin', () => {
  const world = { position: { x: 4097.25, y: 0, z: -2050.5 }, route: [
    { x: 4100, y: 0, z: -2048 }, { x: 4128, y: 0, z: -2016 }
  ] }
  const origin = { x: 4096, y: 0, z: -2048 }
  const render = pedestrianStateToRender(world, origin)
  assert.deepEqual(render.position, { x: 1.25, y: 0, z: -2.5 })
  assert.deepEqual(pedestrianStateToWorld(render, origin), world)
})

test('world route semantics are invariant under a different render origin', () => {
  const world = { position: { x: 3200, y: 0, z: 1792 }, route: [
    { x: 3264, y: 0, z: 1792 }, { x: 3328, y: 0, z: 1856 }
  ] }
  const zero = { x: 0, y: 0, z: 0 }, shifted = { x: 3200, y: 0, z: 1792 }
  assert.deepEqual(pedestrianStateToWorld(pedestrianStateToRender(world, zero), zero),
    pedestrianStateToWorld(pedestrianStateToRender(world, shifted), shifted))
})
