import { validateAssetCatalog, type AssetRecord } from './asset-catalog'

export type ResolvedWorkspaceAsset = { rootUrl: string; fileName: string }
export type ImportedAsset<T> = { assetId: string; value: T; dispose: () => void }
export type AssetResolver = (workspaceRelativeUri: string) => Promise<ResolvedWorkspaceAsset>
export type AssetLoader<T> = (location: ResolvedWorkspaceAsset, asset: AssetRecord) => Promise<{ value: T; dispose: () => void }>

/** Validated boundary for format-specific drivers. Resolver must be desktop-approved and workspace-relative. */
export async function importWorkspaceAsset<T>(asset: AssetRecord, resolve: AssetResolver, load: AssetLoader<T>): Promise<ImportedAsset<T>> {
  const catalog = validateAssetCatalog({ schemaVersion: 1, revision: 0, assets: [asset] })
  if (!catalog.valid) throw new Error('asset rejected: ' + catalog.issues.join('; '))
  if (!['glb', 'gltf'].includes(asset.format.toLowerCase()) || !['mesh', 'prefab'].includes(asset.kind)) throw new Error('asset importer supports only mesh/prefab GLTF or GLB records')
  const location = await resolve(asset.uri)
  if (!location || typeof location.rootUrl !== 'string' || !location.rootUrl.startsWith('paw-workspace://') || location.rootUrl.split(/[\\/]/).includes('..') || typeof location.fileName !== 'string' || !location.fileName.trim() || /^(https?:|file:|javascript:)/i.test(location.fileName) || location.fileName.split(/[\\/]/).includes('..')) throw new Error('workspace resolver returned an unsafe asset location')
  const loaded: unknown = await load(location, asset)
  if (!loaded || typeof loaded !== 'object' || !('value' in loaded) || !('dispose' in loaded) || typeof (loaded as { dispose?: unknown }).dispose !== 'function') {
    throw new Error('asset loader returned an invalid driver result')
  }
  const result = loaded as { value: T; dispose: () => void }
  let disposed = false
  return {
    assetId: asset.id,
    value: result.value,
    dispose: () => {
      if (disposed) return
      disposed = true
      result.dispose()
    }
  }
}
