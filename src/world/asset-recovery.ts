import type { AssetCatalogSnapshot, AssetRecord } from './asset-catalog'

export type AssetAvailability = { assetId: string; uri: string; available: boolean; reason?: 'missing'|'unreadable' }
export type AssetAvailabilityProbe = (asset: AssetRecord) => Promise<boolean>

/** Checks persisted catalog entries against the actual desktop asset store through an injected probe. */
export async function inspectAssetAvailability(catalog: AssetCatalogSnapshot, probe: AssetAvailabilityProbe): Promise<AssetAvailability[]> {
  const results: AssetAvailability[] = []
  for (const asset of catalog.assets) {
    try {
      const available = await probe(asset)
      results.push({ assetId: asset.id, uri: asset.uri, available, ...(available ? {} : { reason: 'missing' as const }) })
    } catch {
      results.push({ assetId: asset.id, uri: asset.uri, available: false, reason: 'unreadable' })
    }
  }
  return results
}
