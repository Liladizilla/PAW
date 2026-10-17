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

  // Prefer canonical state, but fall back to a valid legacy backup if canonical data
  // is corrupt. Never remove the legacy copy until the recovered state is persisted.
  let snapshot: SceneSnapshot
  if (canonical !== null) {
    try {
      snapshot = decodeSceneSnapshot(canonical)
    } catch (error) {
      if (legacy === null) throw error
      snapshot = decodeSceneSnapshot(legacy)
    }
  } else {
    snapshot = decodeSceneSnapshot(legacy as string)
  }
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
