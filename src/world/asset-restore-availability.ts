import type { AssetAvailabilityResult } from './asset-availability-results'

export type AssetRestoreCandidate = { entityId: string; uri: string }

/** Groups unavailable file reports by URI so shared assets produce one actionable warning. */
export function describeUnavailableAssets(
  availability: readonly AssetAvailabilityResult[],
  candidates: readonly AssetRestoreCandidate[]
): string[] {
  const entityIdsByUri = new Map<string, string[]>()
  for (const candidate of candidates) {
    if (!candidate.entityId.trim() || !candidate.uri.trim()) continue
    const ids = entityIdsByUri.get(candidate.uri) ?? []
    if (!ids.includes(candidate.entityId)) ids.push(candidate.entityId)
    entityIdsByUri.set(candidate.uri, ids)
  }
  const seen = new Set<string>()
  const messages: string[] = []
  for (const result of availability) {
    if (result.available || seen.has(result.uri)) continue
    seen.add(result.uri)
    const entityIds = entityIdsByUri.get(result.uri)
    if (!entityIds?.length) continue
    messages.push(entityIds.join(', ') + ' → ' + result.uri + ' (' + (result.reason ?? 'missing') + ')')
  }
  return messages
}
