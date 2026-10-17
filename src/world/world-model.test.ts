import test from 'node:test'
import assert from 'node:assert/strict'
import { WORLD_SCHEMA_VERSION, WorldModel, validateWorldSnapshot, type WorldEntity } from './world-model'

const entity: WorldEntity = {
  id: 'civilian-1',
  name: 'City pedestrian',
  components: {
    transform: { kind: 'transform', position: { x: 2, y: 0, z: 3 } },
    'navigation-agent': { kind: 'navigation-agent', route: [{ x: 2, y: 0, z: 3 }, { x: 8, y: 0, z: 3 }], waypointIndex: 0, status: 'moving' }
  }
}

test('world model emits stable, monotonic scene-domain events', () => {
  const world = new WorldModel('metro-city')
  const created = world.upsertEntity(entity)
  const updated = world.upsertEntity({ ...entity, name: 'Pedestrian heading to plaza' })
  const removed = world.removeEntity(entity.id)
  assert.equal(created.type, 'entity.created')
  assert.equal(updated.type, 'entity.updated')
  assert.equal(removed?.type, 'entity.removed')
  assert.deepEqual([created.sequence, updated.sequence, removed?.sequence], [1, 2, 3])
  assert.equal(world.snapshot().revision, 3)
  assert.equal(world.snapshot().entities.length, 0)
})

test('world snapshot validation rejects duplicate IDs and malformed navigation', () => {
  const result = validateWorldSnapshot({
    schemaVersion: WORLD_SCHEMA_VERSION,
    worldId: 'test',
    revision: 0,
    entities: [
      entity,
      { ...entity, components: { 'navigation-agent': { kind: 'navigation-agent', route: [{ x: Number.NaN, y: 0, z: 0 }], waypointIndex: 0, status: 'moving' } } }
    ]
  })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some(issue => issue.includes('duplicate entity id')))
  assert.ok(result.issues.some(issue => issue.includes('invalid navigation component')))
})

test('world model rejects empty IDs and does not expose mutable internal entities', () => {
  const world = new WorldModel('test-world')
  assert.throws(() => world.upsertEntity({ ...entity, id: ' ' }))
  world.upsertEntity(entity)
  const snapshot = world.snapshot()
  snapshot.entities[0].name = 'mutated outside'
  assert.equal(world.snapshot().entities[0].name, entity.name)
})
