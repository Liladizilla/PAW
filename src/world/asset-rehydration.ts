import type { TransformNode } from '@babylonjs/core'
import type { AssetCatalogSnapshot, AssetRecord } from './asset-catalog'
import type { SceneEntityRecord } from './scene-snapshot'

export type AssetRehydrationPlan = {
  ready: Array<{ entity: SceneEntityRecord; asset: AssetRecord }>
  missing: Array<{ entityId: string; assetId: string }>
}

/** Resolves persisted user entities without allowing them to impersonate app-owned agents. */
export function planAssetRehydration(
  entities: readonly SceneEntityRecord[],
  catalog: AssetCatalogSnapshot,
  reservedEntityIds: readonly string[] = []
): AssetRehydrationPlan {
  const reserved = new Set(reservedEntityIds)
  const assets = new Map(catalog.assets.map(asset => [asset.id, asset]))
  const ready: AssetRehydrationPlan['ready'] = []
  const missing: AssetRehydrationPlan['missing'] = []
  for (const entity of entities) {
    if (!entity.assetId || reserved.has(entity.id)) continue
    const asset = assets.get(entity.assetId)
    if (!asset) {
      missing.push({ entityId: entity.id, assetId: entity.assetId })
      continue
    }
    ready.push({ entity, asset })
  }
  return { ready, missing }
}

/** Applies persisted world-space transform and visibility to a loaded asset root. */
export function applySavedEntityRecord(root: TransformNode, entity: SceneEntityRecord, worldRoot: TransformNode): void {
  const { position, rotation, scale } = entity.transform
  root.position.set(position.x, position.y, position.z)
  root.rotation.set(rotation.x, rotation.y, rotation.z)
  root.scaling.set(scale.x, scale.y, scale.z)
  root.parent = worldRoot
  root.setEnabled(entity.visible)
  root.name = entity.name
  root.metadata = { ...(root.metadata ?? {}), entityId: entity.id, assetId: entity.assetId }
}
