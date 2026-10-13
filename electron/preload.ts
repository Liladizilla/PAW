import { contextBridge, ipcRenderer } from 'electron'

const paw = Object.freeze({
  platform: process.platform,
  version: '0.1.0',
  runtimeStatus: () => ipcRenderer.invoke('paw:runtime-status'),
  validateGraph: (graph: unknown) => ipcRenderer.invoke('paw:graph:validate', graph),
  executeGraph: (input: { graph: unknown; workspaceId?: string; concurrency?: number }) => ipcRenderer.invoke('paw:graph:execute', input),
  pauseGraph: (id: string) => ipcRenderer.invoke('paw:graph:pause', id),
  resumeGraph: (id: string) => ipcRenderer.invoke('paw:graph:resume', id),
  cancelGraph: (id: string) => ipcRenderer.invoke('paw:graph:cancel', id),
  listRuns: (workspaceId?: string) => ipcRenderer.invoke('paw:runs:list', workspaceId),
  createRun: (input: { graphId: string; workspaceId?: string }) => ipcRenderer.invoke('paw:runs:create', input),
  transitionRun: (input: { id: string; status: 'queued' | 'running' | 'pause_requested' | 'paused' | 'cancel_requested' | 'cancelled' | 'succeeded' | 'failed' | 'needs_recovery'; reason?: string }) => ipcRenderer.invoke('paw:runs:transition', input),
  recoverRun: (input: { id: string; resolution: 'retry' | 'abandon'; note?: string }) => ipcRenderer.invoke('paw:runs:recover', input),
  listApprovals: (status?: 'pending' | 'approved' | 'denied') => ipcRenderer.invoke('paw:approvals:list', status),
  requestApproval: (input: { action: string; summary: string; requestedBy?: string }) => ipcRenderer.invoke('paw:approvals:request', input),
  decideApproval: (input: { id: string; decision: 'approved' | 'denied'; note?: string }) => ipcRenderer.invoke('paw:approvals:decide', input),
  providerStatus: () => ipcRenderer.invoke('paw:provider:status'),
  configureGroq: (key: string) => ipcRenderer.invoke('paw:provider:configure-groq', key),
  clearGroq: () => ipcRenderer.invoke('paw:provider:clear-groq'),
  chatWithGroq: (input: { prompt: string; system?: string; model?: string }) => ipcRenderer.invoke('paw:provider:chat', input),
  loadWorkspace: () => ipcRenderer.invoke('paw:workspace:load'),
  saveWorkspace: (data: Record<string, unknown>) => ipcRenderer.invoke('paw:workspace:save', data),
  appendHistoryEvent: (event: { type: string; payload?: Record<string, unknown> }) =>
    ipcRenderer.invoke('paw:history:append', event),
  listHistory: (limit?: number) => ipcRenderer.invoke('paw:history:list', limit)
})

contextBridge.exposeInMainWorld('paw', paw)
