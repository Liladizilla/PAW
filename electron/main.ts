import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { appendHistoryEvent, loadWorkspace, readHistory, saveWorkspace } from './persistence'
import { clearGroqApiKey, configureGroqApiKey, groqChat, groqProviderStatus } from './providers/groq'
import { decideApproval, listApprovals, requestApproval } from './approvals'

const WORKSPACE_ID = 'default'

function registerRuntimeIpc() {
  ipcMain.handle('paw:approvals:list', (_event, status: unknown) => {
    if (status !== undefined && status !== 'pending' && status !== 'approved' && status !== 'denied') throw new Error('Invalid approval status filter.')
    return listApprovals(status as 'pending' | 'approved' | 'denied' | undefined)
  })
  ipcMain.handle('paw:approvals:request', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Approval request must be an object.')
    const value = input as { action?: unknown; summary?: unknown; requestedBy?: unknown }
    if (typeof value.action !== 'string' || typeof value.summary !== 'string' ||
        (value.requestedBy !== undefined && typeof value.requestedBy !== 'string')) throw new Error('Invalid approval request.')
    return requestApproval({ action: value.action, summary: value.summary, requestedBy: value.requestedBy as string | undefined })
  })
  ipcMain.handle('paw:approvals:decide', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Approval decision must be an object.')
    const value = input as { id?: unknown; decision?: unknown; note?: unknown }
    if (typeof value.id !== 'string' || (value.decision !== 'approved' && value.decision !== 'denied') ||
        (value.note !== undefined && typeof value.note !== 'string')) throw new Error('Invalid approval decision.')
    return decideApproval(value.id, value.decision, value.note as string | undefined)
  })
  ipcMain.handle('paw:provider:status', () => groqProviderStatus())
  ipcMain.handle('paw:provider:configure-groq', (_event, key: unknown) => {
    if (typeof key !== 'string') throw new Error('API key must be text.')
    return configureGroqApiKey(key)
  })
  ipcMain.handle('paw:provider:clear-groq', () => clearGroqApiKey())
  ipcMain.handle('paw:provider:chat', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Chat input must be an object.')
    const value = input as { prompt?: unknown; system?: unknown; model?: unknown }
    if (typeof value.prompt !== 'string' ||
        (value.system !== undefined && typeof value.system !== 'string') ||
        (value.model !== undefined && typeof value.model !== 'string')) throw new Error('Invalid chat input.')
    return groqChat({ prompt: value.prompt, system: value.system as string | undefined, model: value.model as string | undefined })
  })
  ipcMain.handle('paw:runtime-status', () => ({
    connected: true,
    mode: 'local-persistence-only',
    executionEnabled: false,
    providerConfigured: false,
    workspaceId: WORKSPACE_ID
  }))
  ipcMain.handle('paw:workspace:load', () => loadWorkspace(WORKSPACE_ID))
  ipcMain.handle('paw:workspace:save', (_event, data: unknown) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Workspace data must be a JSON object.')
    return saveWorkspace(WORKSPACE_ID, data as Record<string, unknown>)
  })
  ipcMain.handle('paw:history:append', (_event, input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('History event must be an object.')
    const event = input as { type?: unknown; payload?: unknown }
    if (typeof event.type !== 'string') throw new Error('History event type is required.')
    if (event.payload !== undefined && (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload))) {
      throw new Error('History event payload must be an object.')
    }
    return appendHistoryEvent(WORKSPACE_ID, { type: event.type, payload: event.payload as Record<string, unknown> | undefined })
  })
  ipcMain.handle('paw:history:list', (_event, limit: unknown) => readHistory(WORKSPACE_ID, limit === undefined ? 200 : Number(limit)))
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1080, minHeight: 700,
    backgroundColor: '#090b0f', title: 'P.A.W. — Personal Agent Workspace',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}
app.whenReady().then(() => {
  registerRuntimeIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
