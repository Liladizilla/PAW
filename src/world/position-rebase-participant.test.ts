import test from 'node:test'
import assert from 'node:assert/strict'
import { createPositionRebaseParticipant, type PositionOwner } from './position-rebase-participant'

const owner = (x: number, y: number, z: number): PositionOwner => ({ position: { x, y, z } })

test('position adapter stages without mutation and shifts render positions by origin delta', () => {
  const a = owner(20, 2, -10), b = owner(-5, 0, 30)
  const participant = createPositionRebaseParticipant('meshes', () => [a, b])
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 16, y: 0, z: -32 })
  assert.deepEqual(a.position, { x: 20, y: 2, z: -10 })
  stage.commit()
  assert.deepEqual(a.position, { x: 4, y: 2, z: 22 })
  assert.deepEqual(b.position, { x: -21, y: 0, z: 62 })
})

test('position adapter rollback restores exact pre-rebase coordinates', () => {
  const a = owner(12.25, 3, -7.5)
  const participant = createPositionRebaseParticipant('imported-assets', () => [a])
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 64 })
  stage.commit()
  stage.rollback()
  assert.deepEqual(a.position, { x: 12.25, y: 3, z: -7.5 })
})

test('position adapter rejects invalid owners before any commit', () => {
  const a = owner(Number.NaN, 0, 0)
  const participant = createPositionRebaseParticipant('invalid', () => [a])
  assert.throws(() => participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 64, y: 0, z: 0 }), /non-finite/)
  assert.throws(() => createPositionRebaseParticipant('  ', () => []), /requires an ID/)
})

test('position adapter snapshots owners during prepare and does not shift newly added owners', () => {
  const a = owner(1, 2, 3), b = owner(4, 5, 6)
  let owners: PositionOwner[] = [a]
  const participant = createPositionRebaseParticipant('dynamic', () => owners)
  const stage = participant.prepareRebase({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
  owners = [a, b]
  stage.commit()
  assert.deepEqual(a.position, { x: -9, y: 2, z: 3 })
  assert.deepEqual(b.position, { x: 4, y: 5, z: 6 })
})
