export const SCENE_SNAPSHOT_SCHEMA_VERSION = 1 as const
export type SceneSnapshot = {
  schemaVersion: typeof SCENE_SNAPSHOT_SCHEMA_VERSION
  worldId: string
  savedAt: string
  camera: { alpha: number; beta: number; radius: number; target: { x: number; y: number; z: number } }
  loadedChunkIds: string[]
  metadata: Record<string, string | number | boolean>
}
export function validateSceneSnapshot(value: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  if (!value || typeof value !== 'object') return { valid: false, issues: ['snapshot must be an object'] }
  const s = value as Partial<SceneSnapshot>
  if (s.schemaVersion !== 1) issues.push('unsupported scene snapshot schema')
  if (typeof s.worldId !== 'string' || !s.worldId.trim()) issues.push('worldId is required')
  if (typeof s.savedAt !== 'string' || !Number.isFinite(Date.parse(s.savedAt))) issues.push('savedAt must be a valid date')
  if (!s.camera || !['alpha', 'beta', 'radius'].every(k => Number.isFinite(s.camera?.[k as 'alpha' | 'beta' | 'radius'])) ||
      !s.camera.target || !['x', 'y', 'z'].every(k => Number.isFinite(s.camera?.target[k as 'x' | 'y' | 'z']))) issues.push('camera transform must be finite')
  if (!Array.isArray(s.loadedChunkIds) || !s.loadedChunkIds.every(id => typeof id === 'string' && id.startsWith('chunk:'))) issues.push('loadedChunkIds must contain chunk IDs')
  if (!s.metadata || typeof s.metadata !== 'object' || Array.isArray(s.metadata) ||
      !Object.values(s.metadata).every(v => ['string', 'number', 'boolean'].includes(typeof v) && (typeof v !== 'number' || Number.isFinite(v)))) issues.push('metadata must contain only finite scalar values')
  return { valid: issues.length === 0, issues }
}
/** Serializes only durable world state, never Babylon object references or executable data. */
export function encodeSceneSnapshot(snapshot: SceneSnapshot): string {
  const result = validateSceneSnapshot(snapshot)
  if (!result.valid) throw new Error('invalid scene snapshot: ' + result.issues.join('; '))
  return JSON.stringify(snapshot)
}
export function decodeSceneSnapshot(serialized: string): SceneSnapshot {
  let value: unknown
  try { value = JSON.parse(serialized) } catch { throw new Error('scene snapshot is not valid JSON') }
  const result = validateSceneSnapshot(value)
  if (!result.valid) throw new Error('invalid scene snapshot: ' + result.issues.join('; '))
  return value as SceneSnapshot
}
