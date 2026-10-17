import test from 'node:test'
import assert from 'node:assert/strict'
import { WorldOriginCoordinator, type PreparedRebase } from './world-origin-coordinator'
import { createCameraTargetRebaseParticipant } from './camera-target-rebase-participant'
import { createWorldRootRebaseParticipant } from './world-root-rebase-participant'

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


test('prepare failure leaves origin and owners untouched', () => {
  const coordinator = new WorldOriginCoordinator(), first = { offset: 10 }
  coordinator.register(participant('first', first))
  coordinator.register({ id: 'prepare-failure', prepareRebase() { throw new Error('prepare failed') } })
  assert.throws(() => coordinator.rebase({ x: 2700, y: 0, z: 0 }, 256, 64), /prepare failed/)
  assert.deepEqual(coordinator.origin, { x: 0, y: 0, z: 0 }); assert.equal(first.offset, 10)
})

test('rollback runs in reverse order after a commit failure', () => {
  const coordinator = new WorldOriginCoordinator(), events: string[] = []
  const make = (id: string, fails = false) => ({ id, prepareRebase() { return {
    commit: () => { events.push('commit:' + id); if (fails) throw new Error('boom') },
    rollback: () => { events.push('rollback:' + id) }
  } } })
  coordinator.register(make('a')); coordinator.register(make('b')); coordinator.register(make('c', true))
  assert.throws(() => coordinator.rebase({ x: 2700, y: 0, z: 0 }, 256, 64), /boom/)
  assert.deepEqual(events, ['commit:a','commit:b','commit:c','rollback:c','rollback:b','rollback:a'])
  assert.deepEqual(coordinator.origin, { x: 0, y: 0, z: 0 })
})


test('world root and camera target move together while world focus remains stable', () => {
  const coordinator = new WorldOriginCoordinator()
  const root = { position: { x: 0, y: 0, z: 0 } }
  const camera = { target: { x: 2700, y: 12, z: -2700 } }
  coordinator.register(createWorldRootRebaseParticipant('world-root', () => root))
  coordinator.register(createCameraTargetRebaseParticipant('camera-target', () => camera))
  const beforeWorldFocus = {
    x: camera.target.x + coordinator.origin.x,
    y: camera.target.y + coordinator.origin.y,
    z: camera.target.z + coordinator.origin.z
  }
  const result = coordinator.rebase(beforeWorldFocus)
  assert.equal(result.changed, true)
  assert.deepEqual(coordinator.origin, { x: 2688, y: 0, z: -2752 })
  assert.equal(root.position.x, -2688)
  assert.ok(Math.abs(root.position.y) < 1e-9)
  assert.equal(root.position.z, 2752)
  assert.deepEqual(camera.target, { x: 12, y: 12, z: 52 })
  assert.deepEqual({
    x: camera.target.x + coordinator.origin.x,
    y: camera.target.y + coordinator.origin.y,
    z: camera.target.z + coordinator.origin.z
  }, beforeWorldFocus)
})
