import type { PawApprovalRecord, PawHistoryEvent, PawProviderStatus, PawRuntimeStatus, PawWorkspaceSnapshot } from './global'

const unavailable = () => Promise.reject(new Error('This action requires the installed P.A.W. Electron desktop app. The browser preview cannot access local files, OS credential storage, or the local executor.'))

/**
 * Keep the shared renderer visible when served as a browser preview.
 * This is intentionally read-only and never simulates privileged execution.
 */
export function installBrowserPreviewBridge(target: Window): void {
  if (typeof target.paw !== 'undefined') return

  const now = new Date().toISOString()
  const preview: Record<string, unknown> = {
    platform: 'browser-preview',
    version: 'browser-preview',
    runtimeStatus: async (): Promise<PawRuntimeStatus> => ({
      connected: false,
      mode: 'isolated-browser-preview',
      executionEnabled: false,
      providerConfigured: false,
      workspaceId: 'preview'
    }),
    providerStatus: async (): Promise<PawProviderStatus> => ({
      provider: 'groq',
      configured: false,
      model: 'not-connected'
    }),
    listApprovals: async (): Promise<PawApprovalRecord[]> => [],
    listHistory: async (): Promise<PawHistoryEvent[]> => [],
    listRuns: async (): Promise<never[]> => [],
    loadWorkspace: async (): Promise<PawWorkspaceSnapshot> => ({
      schemaVersion: 1,
      workspaceId: 'preview',
      updatedAt: now,
      data: {}
    }),
    saveWorkspace: unavailable,
    desktopSmokeReady: undefined
  }

  target.paw = new Proxy(preview, {
    get(object, property, receiver) {
      if (typeof property !== 'string') return Reflect.get(object, property, receiver)
      if (Reflect.has(object, property)) return Reflect.get(object, property, receiver)
      if (property === 'desktopSmokeReady') return undefined
      return unavailable
    }
  }) as unknown as Window['paw']
}
