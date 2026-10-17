import test from 'node:test'
import assert from 'node:assert/strict'
import { createThinInstanceRebaseParticipant } from './thin-instance-rebase-participant'

function matrix(x: number, y: number, z: number): Float32Array {
  const values = new Float32Array(16)
  values[0] = values[5] = values[10] = values[15] = 1
  values[12] = x; values[13] = y; values[14] = z
  return values
}

test('thin-instance adapter shifts translation only and stages without mutation', () => {
  const buffer = matrix(2100, 4, -1300)
  buffer[0] = 2
  const participant = createThinInstanceRebaseParticipant('crowd-matrices', () => [buffer])
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 2048, y: 0, z: -1344 })
  assert.equal(buffer[12], 2100)
  stage.commit()
  assert.deepEqual([buffer[12], buffer[13], buffer[14]], [52, 4, 44])
  assert.equal(buffer[0], 2)
})

test('thin-instance adapter restores every matrix exactly after rollback', () => {
  const buffer = new Float32Array([...matrix(10, 2, -4), ...matrix(20, 3, 8)])
  const before = buffer.slice()
  const participant = createThinInstanceRebaseParticipant('crowd-matrices', () => [buffer])
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 64 })
  stage.commit()
  stage.rollback()
  assert.deepEqual(buffer, before)
})

test('thin-instance adapter rejects malformed buffers and non-finite translations', () => {
  assert.throws(() => createThinInstanceRebaseParticipant('bad', () => [new Float32Array(15)]).prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 }), /16-float/)
  const buffer = matrix(0, 0, 0); buffer[14] = Number.NaN
  assert.throws(() => createThinInstanceRebaseParticipant('bad', () => [buffer]).prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 }), /non-finite/)
})


test('thin-instance adapter notifies renderer after commit and rollback', () => {
  const buffer = matrix(80, 2, 96)
  let updates = 0
  const participant = createThinInstanceRebaseParticipant('crowd-matrices', () => [buffer], () => { updates++ })
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 64 })
  assert.equal(updates, 0)
  stage.commit(); assert.equal(updates, 1)
  stage.rollback(); assert.equal(updates, 2)
  assert.deepEqual([buffer[12], buffer[13], buffer[14]], [80, 2, 96])
})
