export type PawRunStatus = 'queued' | 'running' | 'pause_requested' | 'paused' | 'cancel_requested' | 'cancelled' | 'succeeded' | 'failed' | 'needs_recovery';
export interface PawRunEvent { status: PawRunStatus; timestamp: string; reason?: string; }
export interface PawRunRecord {
  id: string;
  workspaceId: string;
  graphId: string;
  status: PawRunStatus;
  createdAt: string;
  updatedAt: string;
  history: PawRunEvent[];
}
export interface PawApprovalRecord {
  id: string;
  workspaceId: string;
  action: string;
  summary: string;
  requestedBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'denied';
  decidedAt?: string;
  decisionNote?: string;
}
export interface PawProviderStatus { provider: 'groq'; configured: boolean; model: string; }
export interface PawGraphValidation { valid: boolean; issues: Array<{ code: string; path: string; message: string }>; }
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
      resolveWorkspaceAsset: (uri: string) => Promise<{ rootUrl: string; fileName: string }>;
      importGlbAsset: () => Promise<{ canceled: true } | { canceled: false; asset: import('../world/asset-catalog').AssetRecord }>;
      discardImportedGlbAsset: (uri: string) => Promise<{ discarded: true }>;
      version: string;
      runtimeStatus: () => Promise<PawRuntimeStatus>;
      validateGraph: (graph: unknown) => Promise<PawGraphValidation>;
      executeGraph: (input: { graph: unknown; workspaceId?: string; concurrency?: number }) => Promise<PawRunRecord>;
      pauseGraph: (id: string) => Promise<{ requested: boolean; id: string }>;
      resumeGraph: (id: string) => Promise<{ requested: boolean; id: string }>;
      cancelGraph: (id: string) => Promise<{ requested: boolean; id: string }>;
      providerStatus: () => Promise<PawProviderStatus>;
      listRuns: (workspaceId?: string) => Promise<PawRunRecord[]>;
      createRun: (input: { graphId: string; workspaceId?: string }) => Promise<PawRunRecord>;
      transitionRun: (input: { id: string; status: PawRunStatus; reason?: string }) => Promise<PawRunRecord>;
      recoverRun: (input: { id: string; resolution: 'retry' | 'abandon'; note?: string }) => Promise<PawRunRecord>;
      listApprovals: (status?: 'pending' | 'approved' | 'denied') => Promise<PawApprovalRecord[]>;
      requestApproval: (input: { action: string; summary: string; requestedBy?: string }) => Promise<PawApprovalRecord>;
      decideApproval: (input: { id: string; decision: 'approved' | 'denied'; note?: string }) => Promise<PawApprovalRecord>;
      configureGroq: (key: string) => Promise<{ configured: boolean }>;
      clearGroq: () => Promise<{ configured: false }>;
      chatWithGroq: (input: { prompt: string; system?: string; model?: string }) => Promise<{ text: string; model: string }>;
      loadWorkspace: () => Promise<PawWorkspaceSnapshot>;
      saveWorkspace: (data: Record<string, unknown>) => Promise<PawWorkspaceSnapshot>;
      appendHistoryEvent: (event: { type: string; payload?: Record<string, unknown> }) => Promise<PawHistoryEvent>;
      listHistory: (limit?: number) => Promise<PawHistoryEvent[]>;
    };
  }
}
