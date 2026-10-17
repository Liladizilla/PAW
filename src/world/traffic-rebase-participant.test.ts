import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrafficRebaseParticipant } from './traffic-rebase-participant'

test('traffic participant shifts scalar coordinate and both meshes together and rolls back', () => {
  const vehicle = { axis: 'x' as const, coordinate: 2100,
    body: { position: { x: 2100, y: .38, z: -.82 } },
    cabin: { position: { x: 2100, y: .75, z: -.82 } } }
  let updates = 0
  const participant = createTrafficRebaseParticipant('traffic', () => [vehicle], () => { updates++ })
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 2048, y: 0, z: 0 })
  stage.commit()
  assert.equal(vehicle.coordinate, 52)
  assert.deepEqual(vehicle.body.position, { x: 52, y: .38, z: -.82 })
  assert.deepEqual(vehicle.cabin.position, { x: 52, y: .75, z: -.82 })
  assert.equal(updates, 1)
  stage.rollback()
  assert.equal(vehicle.coordinate, 2100)
  assert.deepEqual(vehicle.body.position, { x: 2100, y: .38, z: -.82 })
  assert.deepEqual(vehicle.cabin.position, { x: 2100, y: .75, z: -.82 })
  assert.equal(updates, 2)
})

test('traffic participant rejects invalid state before any mutation', () => {
  const valid = { axis: 'z' as const, coordinate: 4,
    body: { position: { x: 1, y: 0, z: 4 } }, cabin: { position: { x: 1, y: .3, z: 4 } } }
  const invalid = { ...valid, coordinate: Number.NaN }
  const participant = createTrafficRebaseParticipant('traffic', () => [valid, invalid])
  assert.throws(() => participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 64 }), /invalid axis coordinate/)
  assert.equal(valid.coordinate, 4); assert.equal(valid.body.position.x, 1)
})
