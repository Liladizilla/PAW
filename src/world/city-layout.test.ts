import test from 'node:test'
import assert from 'node:assert/strict'
import { findWalkablePath, generateCityLots, lotObstacle, pointInsideObstacle } from './city-layout'

test('procedural city layout is deterministic and architecturally varied', () => {
  const first = generateCityLots(192, 7)
  const second = generateCityLots(192, 7)
  assert.deepEqual(first, second)
  assert.ok(first.length > 80)
  assert.ok(new Set(first.map(lot => lot.shape)).size >= 4)
  assert.ok(new Set(first.map(lot => Math.round(lot.height))).size > 30)
  assert.ok(first.every(lot => lot.width <= 19 && lot.depth <= 19))
  assert.ok(first.every(lot => !(Math.abs(lot.x) < 48 && Math.abs(lot.z) < 48)))
})

test('civilian pathfinding routes around building footprints', () => {
  const wall = lotObstacle({ x: 0, z: 0, width: 8, depth: 20 }, 0.5)
  const path = findWalkablePath({ x: -12, z: 0 }, { x: 12, z: 0 }, [wall], 32, 1)
  assert.ok(path.length > 20)
  assert.deepEqual(path[0], { x: -12, z: 0 })
  assert.deepEqual(path[path.length - 1], { x: 12, z: 0 })
  assert.ok(path.every(point => !pointInsideObstacle(point, wall)))
})

test('civilian pathfinding fails closed for blocked destinations', () => {
  const wall = lotObstacle({ x: 0, z: 0, width: 10, depth: 10 })
  assert.deepEqual(findWalkablePath({ x: -12, z: 0 }, { x: 0, z: 0 }, [wall], 32, 1), [])
})
