export type AssetAvailabilityResult = { uri: string; available: boolean; reason?: string }

/**
 * Treats the preload response as untrusted IPC data. Only known requested URIs
 * are accepted, and omitted entries remain eligible for a real load attempt.
 */
export function normalizeAssetAvailabilityResults(value: unknown, requestedUris: readonly string[]): AssetAvailabilityResult[] {
  if (!Array.isArray(value)) return []
  const requested = new Set(requestedUris)
  const seen = new Set<string>()
  const results: AssetAvailabilityResult[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (typeof record.uri !== 'string' || !requested.has(record.uri) || seen.has(record.uri)) continue
    if (typeof record.available !== 'boolean') continue
    seen.add(record.uri)
    results.push({
      uri: record.uri,
      available: record.available,
      ...(typeof record.reason === 'string' ? { reason: record.reason.slice(0, 160) } : {})
    })
  }
  return results
}
