export const WORLD_SCHEMA_VERSION = 1 as const

export type WorldVector3 = { x: number; y: number; z: number }
export type WorldComponent =
  | { kind: 'transform'; position: WorldVector3; rotation?: WorldVector3; scale?: WorldVector3 }
  | { kind: 'renderable'; assetId: string; visible: boolean; lod?: number }
  | { kind: 'collider'; shape: 'box' | 'capsule' | 'cylinder'; dimensions: WorldVector3; static: boolean }
  | { kind: 'destination'; destinationId: string; label: string; access: 'public' | 'restricted' }
  | { kind: 'navigation-agent'; route: WorldVector3[]; waypointIndex: number; status: 'idle' | 'moving' | 'blocked' | 'arrived' }
  | { kind: 'runtime-agent-binding'; runtimeAgentId: string }
  | { kind: 'traffic-participant'; laneId: string; signalGroupId: string; speed: number }

export type WorldEntity = {
  id: string
  name: string
  components: Partial<Record<WorldComponent['kind'], WorldComponent>>
}

export type WorldSnapshot = {
  schemaVersion: typeof WORLD_SCHEMA_VERSION
  worldId: string
  revision: number
  entities: WorldEntity[]
}

export type WorldEvent = {
  schemaVersion: typeof WORLD_SCHEMA_VERSION
  worldId: string
  sequence: number
  eventId: string
  occurredAt: number
  type: 'entity.created' | 'entity.updated' | 'entity.removed'
  entityId: string
  entity?: WorldEntity
}

export type SnapshotValidation = { valid: boolean; issues: string[] }

const finiteVector = (value: unknown): value is WorldVector3 => {
  if (!value || typeof value !== 'object') return false
  const vector = value as Record<string, unknown>
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)
}

export function validateWorldSnapshot(value: unknown): SnapshotValidation {
  const issues: string[] = []
  if (!value || typeof value !== 'object') return { valid: false, issues: ['snapshot must be an object'] }
  const snapshot = value as Partial<WorldSnapshot>
  if (snapshot.schemaVersion !== WORLD_SCHEMA_VERSION) issues.push('unsupported world schema version')
  if (typeof snapshot.worldId !== 'string' || !snapshot.worldId.trim()) issues.push('worldId must be a non-empty string')
  if (!Number.isInteger(snapshot.revision) || (snapshot.revision ?? -1) < 0) issues.push('revision must be a non-negative integer')
  if (!Array.isArray(snapshot.entities)) {
    issues.push('entities must be an array')
    return { valid: false, issues }
  }
  const ids = new Set<string>()
  for (const [index, candidate] of snapshot.entities.entries()) {
    if (!candidate || typeof candidate !== 'object') { issues.push(`entities[${index}] must be an object`); continue }
    const entity = candidate as WorldEntity
    if (typeof entity.id !== 'string' || !entity.id.trim()) issues.push(`entities[${index}].id must be non-empty`)
    else if (ids.has(entity.id)) issues.push(`duplicate entity id: ${entity.id}`)
    else ids.add(entity.id)
    if (typeof entity.name !== 'string' || !entity.name.trim()) issues.push(`entities[${index}].name must be non-empty`)
    if (!entity.components || typeof entity.components !== 'object' || Array.isArray(entity.components)) {
      issues.push(`entities[${index}].components must be an object`)
      continue
    }
    const transform = entity.components.transform
    if (transform && (transform.kind !== 'transform' || !finiteVector(transform.position))) {
      issues.push(`entities[${index}] has an invalid transform component`)
    }
    const navigation = entity.components['navigation-agent']
    if (navigation && (navigation.kind !== 'navigation-agent' || !Array.isArray(navigation.route) || !navigation.route.every(finiteVector))) {
      issues.push(`entities[${index}] has an invalid navigation component`)
    }
    const binding = entity.components['runtime-agent-binding']
    if (binding && (binding.kind !== 'runtime-agent-binding' || typeof binding.runtimeAgentId !== 'string' || !binding.runtimeAgentId.trim())) {
      issues.push(`entities[${index}] has an invalid runtime-agent binding`)
    }
  }
  return { valid: issues.length === 0, issues }
}

/**
 * In-memory world-domain model. It is not the durable agent runtime and must not
 * be used as the source of truth for workflow execution or approvals.
 */
export class WorldModel {
  private revision = 0
  private sequence = 0
  private readonly entities = new Map<string, WorldEntity>()
  private readonly events: WorldEvent[] = []

  constructor(readonly worldId: string) {
    if (!worldId.trim()) throw new Error('worldId must be non-empty')
  }

  upsertEntity(entity: WorldEntity): WorldEvent {
    if (!entity.id.trim() || !entity.name.trim()) throw new Error('entity id and name must be non-empty')
    const previous = this.entities.has(entity.id)
    const next = structuredClone(entity)
    const candidate: WorldSnapshot = {
      schemaVersion: WORLD_SCHEMA_VERSION,
      worldId: this.worldId,
      revision: this.revision + 1,
      entities: [...this.entities.values()].filter(item => item.id !== entity.id).concat(next)
    }
    const validation = validateWorldSnapshot(candidate)
    if (!validation.valid) throw new Error(validation.issues.join('; '))
    this.entities.set(next.id, next)
    this.revision++
    return this.append(previous ? 'entity.updated' : 'entity.created', next.id, next)
  }

  removeEntity(entityId: string): WorldEvent | null {
    if (!this.entities.delete(entityId)) return null
    this.revision++
    return this.append('entity.removed', entityId)
  }

  snapshot(): WorldSnapshot {
    return {
      schemaVersion: WORLD_SCHEMA_VERSION,
      worldId: this.worldId,
      revision: this.revision,
      entities: [...this.entities.values()].map(entity => structuredClone(entity))
    }
  }

  eventsAfter(sequence: number): WorldEvent[] {
    return this.events.filter(event => event.sequence > sequence).map(event => structuredClone(event))
  }

  private append(type: WorldEvent['type'], entityId: string, entity?: WorldEntity): WorldEvent {
    const event: WorldEvent = {
      schemaVersion: WORLD_SCHEMA_VERSION,
      worldId: this.worldId,
      sequence: ++this.sequence,
      eventId: `${this.worldId}:${this.sequence}`,
      occurredAt: Date.now(),
      type,
      entityId,
      ...(entity ? { entity: structuredClone(entity) } : {})
    }
    this.events.push(event)
    return structuredClone(event)
  }
}
