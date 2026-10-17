import test from 'node:test'
import assert from 'node:assert/strict'
import { WorldOriginCoordinator, type PreparedRebase } from './world-origin-coordinator'

function participant(id: string, state: { offset: number }, failCommit = false) {
  return {
    id,
    prepareRebase(previous: { x: number; y: number; z: number }, next: { x: number; y: number; z: number }): PreparedRebase {
      const before = state.offset
      const after = next.x - previous.x
      return {
        commit: () => { if (failCommit) throw new Error('commit failed: ' + id); state.offset = before - after },
        rollback: () => { state.offset = before }
      }
    }
  }
}

test('coordinator commits all participants and changes origin only after successful commit', () => {
  const coordinator = new WorldOriginCoordinator()
  const camera = { offset: 0 }, crowd = { offset: 0 }, traffic = { offset: 0 }
  coordinator.register(participant('camera', camera))
  coordinator.register(participant('crowd', crowd))
  coordinator.register(participant('traffic', traffic))
  const result = coordinator.rebase({ x: 2700, y: 0, z: 0 }, 256, 64)
  assert.equal(result.changed, true)
  assert.equal(coordinator.origin.x, 2560)
  assert.deepEqual([camera.offset, crowd.offset, traffic.offset], [-2560, -2560, -2560])
})

test('failed participant commit rolls every prepared participant back in reverse-safe state', () => {
  const coordinator = new WorldOriginCoordinator()
  const camera = { offset: 0 }, crowd = { offset: 0 }, traffic = { offset: 0 }
  coordinator.register(participant('camera', camera))
  coordinator.register(participant('crowd', crowd))
  coordinator.register(participant('traffic', traffic, true))
  assert.throws(() => coordinator.rebase({ x: 2700, y: 0, z: 0 }, 256, 64), /commit failed/)
  assert.deepEqual(coordinator.origin, { x: 0, y: 0, z: 0 })
  assert.deepEqual([camera.offset, crowd.offset, traffic.offset], [0, 0, 0])
})

test('rebase inside threshold is a no-op and participant registration is guarded', () => {
  const coordinator = new WorldOriginCoordinator()
  const state = { offset: 0 }, p = participant('camera', state)
  const unregister = coordinator.register(p)
  assert.throws(() => coordinator.register(p), /duplicate/)
  assert.equal(coordinator.rebase({ x: 100, y: 0, z: 0 }).changed, false)
  unregister()
  assert.equal(coordinator.rebase({ x: 100, y: 0, z: 0 }).changed, false)
  assert.equal(state.offset, 0)
})
