import type { WorldOrigin } from './world-origin'

export const SCENE_SNAPSHOT_SCHEMA_VERSION = 3 as const
export type SceneEntityRecord = {
  id: string
  name: string
  /** Authoritative world-space transform; never renderer-relative coordinates. */
  transform: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }
  assetId?: string
  visible: boolean
}
export type SceneSnapshot = {
  schemaVersion: typeof SCENE_SNAPSHOT_SCHEMA_VERSION
  worldId: string
  savedAt: string
  /** Renderer origin used for world-to-render projection when this snapshot was written. */
  worldOrigin: WorldOrigin
  camera: { alpha: number; beta: number; radius: number; target: { x: number; y: number; z: number } }
  loadedChunkIds: string[]
  entities: SceneEntityRecord[]
  metadata: Record<string, string | number | boolean>
}
type LegacySnapshot = Omit<SceneSnapshot, 'schemaVersion' | 'worldOrigin'> & { schemaVersion: 1 | 2; worldOrigin?: WorldOrigin; entities?: SceneEntityRecord[] }
const finiteVector = (v: unknown): v is { x: number; y: number; z: number } =>
  !!v && typeof v === 'object' && ['x', 'y', 'z'].every(k => Number.isFinite((v as Record<string, unknown>)[k]))
export function validateSceneSnapshot(value: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  if (!value || typeof value !== 'object') return { valid: false, issues: ['snapshot must be an object'] }
  const s = value as Partial<SceneSnapshot>
  if (s.schemaVersion !== SCENE_SNAPSHOT_SCHEMA_VERSION) issues.push('unsupported scene snapshot schema')
  if (typeof s.worldId !== 'string' || !s.worldId.trim()) issues.push('worldId is required')
  if (typeof s.savedAt !== 'string' || !Number.isFinite(Date.parse(s.savedAt))) issues.push('savedAt must be a valid date')
  if (!finiteVector(s.worldOrigin)) issues.push('worldOrigin must contain finite coordinates')
  if (!s.camera || !['alpha', 'beta', 'radius'].every(k => Number.isFinite(s.camera?.[k as 'alpha' | 'beta' | 'radius'])) ||
      !finiteVector(s.camera.target)) issues.push('camera transform must be finite')
  if (!Array.isArray(s.loadedChunkIds) || !s.loadedChunkIds.every(id => typeof id === 'string' && /^chunk:-?\d+:-?\d+$/.test(id))) issues.push('loadedChunkIds must contain valid chunk IDs')
  if (!Array.isArray(s.entities)) issues.push('entities must be an array')
  else {
    const ids = new Set<string>()
    for (const [i, entity] of s.entities.entries()) {
      if (!entity || typeof entity !== 'object') { issues.push('entities[' + i + '] must be an object'); continue }
      if (typeof entity.id !== 'string' || !entity.id.trim()) issues.push('entities[' + i + '].id is required')
      else if (ids.has(entity.id)) issues.push('duplicate entity ID: ' + entity.id)
      else ids.add(entity.id)
      if (typeof entity.name !== 'string' || !entity.name.trim()) issues.push('entities[' + i + '].name is required')
      if (!entity.transform || !finiteVector(entity.transform.position) || !finiteVector(entity.transform.rotation) || !finiteVector(entity.transform.scale)) issues.push('entities[' + i + '] transform must be finite')
      if (typeof entity.visible !== 'boolean') issues.push('entities[' + i + '].visible must be boolean')
      if (entity.assetId !== undefined && (typeof entity.assetId !== 'string' || !entity.assetId.trim())) issues.push('entities[' + i + '].assetId must be non-empty when provided')
    }
  }
  if (!s.metadata || typeof s.metadata !== 'object' || Array.isArray(s.metadata) ||
      !Object.values(s.metadata).every(v => ['string', 'number', 'boolean'].includes(typeof v) && (typeof v !== 'number' || Number.isFinite(v)))) issues.push('metadata must contain only finite scalar values')
  return { valid: issues.length === 0, issues }
}
/** Serializes world-owned data only, never Babylon object references or executable data. */
export function encodeSceneSnapshot(snapshot: SceneSnapshot): string {
  const result = validateSceneSnapshot(snapshot)
  if (!result.valid) throw new Error('invalid scene snapshot: ' + result.issues.join('; '))
  return JSON.stringify(snapshot)
}
/** Migrate v1 camera-only and v2 world snapshots; both were written before origin metadata existed. */
export function migrateSceneSnapshot(value: unknown): SceneSnapshot {
  if (!value || typeof value !== 'object') throw new Error('scene snapshot must be an object')
  const legacy = value as LegacySnapshot
  if (legacy.schemaVersion === 1 || legacy.schemaVersion === 2) {
    const migrated: SceneSnapshot = {
      ...legacy,
      schemaVersion: SCENE_SNAPSHOT_SCHEMA_VERSION,
      worldOrigin: legacy.worldOrigin && finiteVector(legacy.worldOrigin) ? legacy.worldOrigin : { x: 0, y: 0, z: 0 },
      entities: Array.isArray(legacy.entities) ? legacy.entities : []
    }
    const result = validateSceneSnapshot(migrated)
    if (!result.valid) throw new Error('invalid migrated scene snapshot: ' + result.issues.join('; '))
    return migrated
  }
  const result = validateSceneSnapshot(value)
  if (!result.valid) throw new Error('invalid scene snapshot: ' + result.issues.join('; '))
  return value as SceneSnapshot
}
export function decodeSceneSnapshot(serialized: string): SceneSnapshot {
  let value: unknown
  try { value = JSON.parse(serialized) } catch { throw new Error('scene snapshot is not valid JSON') }
  return migrateSceneSnapshot(value)
}
