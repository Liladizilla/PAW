import test from 'node:test'
import assert from 'node:assert/strict'
import { createCameraTargetRebaseParticipant } from './camera-target-rebase-participant'

test('camera target stages without mutation and shifts focus into the new render origin', () => {
  const camera = { target: { x: 2100.5, y: 8, z: -1300 } }
  const participant = createCameraTargetRebaseParticipant('camera-focus', () => camera)
  const stage = participant.prepareRebase(
    { x: 0, y: 0, z: 0 },
    { x: 2048, y: 0, z: -1344 }
  )
  assert.deepEqual(camera.target, { x: 2100.5, y: 8, z: -1300 })
  stage.commit()
  assert.deepEqual(camera.target, { x: 52.5, y: 8, z: 44 })
})

test('camera target rollback restores exact focus after a committed shift', () => {
  const camera = { target: { x: 12.25, y: 3, z: -7.5 } }
  const participant = createCameraTargetRebaseParticipant('camera-focus', () => camera)
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 64 })
  stage.commit()
  stage.rollback()
  assert.deepEqual(camera.target, { x: 12.25, y: 3, z: -7.5 })
})

test('camera target adapter rejects invalid IDs and non-finite focus or origins', () => {
  assert.throws(() => createCameraTargetRebaseParticipant(' ', () => ({ target: { x: 0, y: 0, z: 0 } })), /requires an ID/)
  const participant = createCameraTargetRebaseParticipant('camera-focus', () => ({ target: { x: Number.NaN, y: 0, z: 0 } }))
  assert.throws(() => participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 }), /finite coordinates/)
})
