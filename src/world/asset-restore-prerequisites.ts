export type AssetRestorePrerequisites = {
  savedAssetCount: number
  hasCatalog: boolean
  hasWorkspaceResolver: boolean
}

/** Produces a user-visible status instead of silently dropping persisted asset entities. */
export function assetRestorePrerequisiteStatus(input: AssetRestorePrerequisites): string | undefined {
  if (!Number.isInteger(input.savedAssetCount) || input.savedAssetCount < 0) {
    throw new Error('savedAssetCount must be a non-negative integer')
  }
  if (input.savedAssetCount === 0) return undefined
  if (!input.hasCatalog) {
    return 'Restore warning: ' + input.savedAssetCount + ' saved model(s) reference a missing asset catalog.'
  }
  if (!input.hasWorkspaceResolver) {
    return 'Restore unavailable: saved models can only be restored in the installed P.A.W. desktop app.'
  }
  return undefined
}
