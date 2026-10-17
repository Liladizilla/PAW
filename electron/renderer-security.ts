export type RendererTrustConfig = {
  packaged: boolean
  expectedFileUrl: string
  developmentUrl?: string
}

/**
 * Restricts IPC authority to the renderer entry point owned by this app.
 * In development, only the configured Vite origin and entry path are trusted.
 */
export function isTrustedRendererUrl(candidateUrl: string, config: RendererTrustConfig): boolean {
  try {
    const candidate = new URL(candidateUrl)
    if (config.packaged) {
      const expected = new URL(config.expectedFileUrl)
      return candidate.protocol === 'file:' && candidate.href === expected.href
    }
    if (!config.developmentUrl) return false
    const expected = new URL(config.developmentUrl)
    return (expected.protocol === 'http:' || expected.protocol === 'https:') &&
      candidate.protocol === expected.protocol &&
      candidate.origin === expected.origin &&
      candidate.pathname === expected.pathname &&
      candidate.username === '' &&
      candidate.password === ''
  } catch {
    return false
  }
}
