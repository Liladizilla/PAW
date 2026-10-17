import { isDisposableImportedGlbUri } from './asset-path-security'

/** Tracks only assets copied by the current main-process import flow until they are committed. */
export function createImportedAssetLeaseRegistry() {
  const pending = new Set<string>()
  return {
    register(uri: unknown): void {
      if (!isDisposableImportedGlbUri(uri)) throw new Error('Only UUID-named imported GLB assets can receive a temporary lease.')
      if (pending.has(uri)) throw new Error('Imported asset already has an active temporary lease.')
      pending.add(uri)
    },
    canDiscard(uri: unknown): uri is string {
      return isDisposableImportedGlbUri(uri) && pending.has(uri)
    },
    discard(uri: unknown): void {
      if (!this.canDiscard(uri)) throw new Error('Asset is not an active, disposable import.')
      pending.delete(uri)
    },
    commit(uri: unknown): void {
      if (!this.canDiscard(uri)) throw new Error('Asset is not an active import and cannot be committed.')
      pending.delete(uri)
    },
    get pendingCount(): number { return pending.size }
  }
}
