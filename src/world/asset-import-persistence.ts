export interface AssetImportPersistenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AssetImportPersistenceOptions {
  catalogKey: string
  catalogValue: string
  snapshotKey: string
  persistSnapshot: () => void
}

/**
 * Commits the catalog and scene snapshot as one best-effort storage transaction.
 * Web Storage has no multi-key transaction, so previous values are restored if
 * either write fails. The caller must roll back the in-memory imported entity too.
 */
export function commitAssetImportPersistence(
  storage: AssetImportPersistenceStorage,
  options: AssetImportPersistenceOptions
): void {
  if (!options.catalogKey || !options.snapshotKey || options.catalogKey === options.snapshotKey) {
    throw new Error('Asset import persistence requires two distinct storage keys.')
  }

  const keys = [options.catalogKey, options.snapshotKey]
  const previous = new Map(keys.map(key => [key, storage.getItem(key)]))

  try {
    storage.setItem(options.catalogKey, options.catalogValue)
    options.persistSnapshot()
  } catch (error) {
    const rollbackErrors: string[] = []
    for (const key of [...keys].reverse()) {
      try {
        const value = previous.get(key) ?? null
        if (value === null) storage.removeItem(key)
        else storage.setItem(key, value)
      } catch (rollbackError) {
        rollbackErrors.push(key + ': ' + (rollbackError instanceof Error ? rollbackError.message : 'unknown rollback error'))
      }
    }
    if (rollbackErrors.length) {
      const cause = error instanceof Error ? error.message : 'unknown storage error'
      throw new Error('Asset import persistence failed (' + cause + '); rollback was incomplete: ' + rollbackErrors.join('; '))
    }
    throw error
  }
}
