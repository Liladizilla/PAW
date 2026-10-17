export type AssetRestoreFailure = { entityId: string; reason: string }

const MAX_DETAIL_LENGTH = 160
const MAX_REPORT_LENGTH = 480

function cleanDetail(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DETAIL_LENGTH)
}

function boundReport(value: string): string {
  if (value.length <= MAX_REPORT_LENGTH) return value
  return value.slice(0, MAX_REPORT_LENGTH - 1).trimEnd() + '…'
}

/** Creates a concise, bounded UI report from untrusted loader errors and persisted labels. */
export function formatAssetRestoreReport(input: {
  restoredEntityIds: readonly string[]
  missingCatalog: readonly string[]
  missingFiles: readonly string[]
  failures: readonly AssetRestoreFailure[]
}): string | undefined {
  const restored = input.restoredEntityIds.length
  const issues = [
    ...input.missingCatalog.map(value => 'missing catalog record: ' + cleanDetail(value)),
    ...input.missingFiles.map(value => 'missing file: ' + cleanDetail(value)),
    ...input.failures.map(value => cleanDetail(value.entityId) + ': ' + cleanDetail(value.reason))
  ]
  if (issues.length) {
    const prefix = restored ? 'Restored ' + restored + ' model(s); warnings: ' : 'Restore warning: '
    const suffix = issues.length > 3 ? '… (' + issues.length + ' issues total)' : ''
    return boundReport(prefix + issues.slice(0, 3).join('; ') + suffix)
  }
  if (restored) return 'Restored ' + restored + ' saved model(s).'
  return undefined
}
