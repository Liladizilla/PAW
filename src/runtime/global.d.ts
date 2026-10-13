export interface PawRuntimeStatus {
  connected: boolean;
  mode: string;
  executionEnabled: boolean;
  providerConfigured: boolean;
  workspaceId: string;
}
export interface PawWorkspaceSnapshot {
  schemaVersion: 1;
  workspaceId: string;
  updatedAt: string;
  data: Record<string, unknown>;
}
export interface PawHistoryEvent {
  id: string;
  workspaceId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
declare global {
  interface Window {
    paw: {
      platform: string;
      version: string;
      runtimeStatus: () => Promise<PawRuntimeStatus>;
      loadWorkspace: () => Promise<PawWorkspaceSnapshot>;
      saveWorkspace: (data: Record<string, unknown>) => Promise<PawWorkspaceSnapshot>;
      appendHistoryEvent: (event: { type: string; payload?: Record<string, unknown> }) => Promise<PawHistoryEvent>;
      listHistory: (limit?: number) => Promise<PawHistoryEvent[]>;
    };
  }
}
