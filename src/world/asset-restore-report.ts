export type AssetRestoreFailure = { entityId: string; reason: string }

export function formatAssetRestoreReport(input: {
  restoredEntityIds: readonly string[]
  missingCatalog: readonly string[]
  missingFiles: readonly string[]
  failures: readonly AssetRestoreFailure[]
}): string | undefined {
  const restored = input.restoredEntityIds.length
  const issues = [
    ...input.missingCatalog.map(value => 'missing catalog record: ' + value),
    ...input.missingFiles.map(value => 'missing file: ' + value),
    ...input.failures.map(value => value.entityId + ': ' + value.reason)
  ]
  if (issues.length) {
    const prefix = restored ? 'Restored ' + restored + ' model(s); warnings: ' : 'Restore warning: '
    return prefix + issues.slice(0, 3).join('; ') + (issues.length > 3 ? '… (' + issues.length + ' issues total)' : '')
  }
  if (restored) return 'Restored ' + restored + ' saved model(s).'
  return undefined
}
