import { contextBridge, ipcRenderer } from 'electron'

const paw = Object.freeze({
  platform: process.platform,
  version: '0.1.0',
  runtimeStatus: () => ipcRenderer.invoke('paw:runtime-status'),
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
