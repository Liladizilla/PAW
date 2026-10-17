import { decodeSceneSnapshot, encodeSceneSnapshot, type SceneSnapshot } from './scene-snapshot'

export const SCENE_SNAPSHOT_STORAGE_KEY = 'paw.scene.snapshot.v2'
export const LEGACY_SCENE_SNAPSHOT_STORAGE_KEY = 'paw.scene.snapshot.v1'

export interface SnapshotStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Loads and migrates local scene state, writing the canonical v3 form before returning. */
export function loadStoredSceneSnapshot(storage: SnapshotStorage): SceneSnapshot | undefined {
  const canonical = storage.getItem(SCENE_SNAPSHOT_STORAGE_KEY)
  const legacy = storage.getItem(LEGACY_SCENE_SNAPSHOT_STORAGE_KEY)
  if (canonical === null && legacy === null) return undefined

  // Prefer canonical state when present, but do not discard a recoverable legacy copy
  // until the canonical representation has been validated and persisted successfully.
  const source = canonical ?? legacy
  const snapshot = decodeSceneSnapshot(source as string)
  storage.setItem(SCENE_SNAPSHOT_STORAGE_KEY, encodeSceneSnapshot(snapshot))
  if (legacy !== null) storage.removeItem(LEGACY_SCENE_SNAPSHOT_STORAGE_KEY)
  return snapshot
}

export function saveStoredSceneSnapshot(storage: SnapshotStorage, snapshot: SceneSnapshot): void {
  storage.setItem(SCENE_SNAPSHOT_STORAGE_KEY, encodeSceneSnapshot(snapshot))
}

export function clearStoredSceneSnapshots(storage: SnapshotStorage): void {
  storage.removeItem(LEGACY_SCENE_SNAPSHOT_STORAGE_KEY)
  storage.removeItem(SCENE_SNAPSHOT_STORAGE_KEY)
}
