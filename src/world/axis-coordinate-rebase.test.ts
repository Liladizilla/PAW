import test from 'node:test'
import assert from 'node:assert/strict'
import { createAxisCoordinateRebase } from './axis-coordinate-rebase'

test('axis coordinate rebase shifts X and Z state by their matching origin deltas', () => {
  const owners = [{ axis: 'x' as const, coordinate: 100 }, { axis: 'z' as const, coordinate: -50 }]
  const stage = createAxisCoordinateRebase('traffic-state', () => owners).prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: -128 })
  stage.commit()
  assert.deepEqual(owners.map(owner => owner.coordinate), [36, 78])
})

test('axis coordinate rebase restores state on rollback and rejects invalid coordinates', () => {
  const owner = { axis: 'x' as const, coordinate: 12.5 }
  const stage = createAxisCoordinateRebase('traffic-state', () => [owner]).prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 })
  stage.commit(); stage.rollback()
  assert.equal(owner.coordinate, 12.5)
  assert.throws(() => createAxisCoordinateRebase('bad', () => [{ axis: 'x', coordinate: Number.NaN }]).prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 }), /invalid axis coordinate/)
})
