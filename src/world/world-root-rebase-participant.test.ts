import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorldRootRebaseParticipant } from './world-root-rebase-participant'

test('world root projects world-space children relative to the next origin', () => {
  const root = { position: { x: 0, y: 0, z: 0 } }
  const participant = createWorldRootRebaseParticipant('world-root', () => root)
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 2048, y: 64, z: -1024 })
  assert.deepEqual(root.position, { x: 0, y: 0, z: 0 })
  stage.commit()
  assert.deepEqual(root.position, { x: -2048, y: -64, z: 1024 })
  stage.rollback()
  assert.deepEqual(root.position, { x: 0, y: 0, z: 0 })
})

test('world root participant rejects invalid state before mutation', () => {
  const root = { position: { x: 3, y: 0, z: 4 } }
  const participant = createWorldRootRebaseParticipant('world-root', () => root)
  assert.throws(() => participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: Number.NaN, y: 0, z: 0 }), /finite origins/)
  assert.deepEqual(root.position, { x: 3, y: 0, z: 4 })
})
