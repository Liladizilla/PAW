import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { appendHistoryEvent, loadWorkspace, readHistory, saveWorkspace } from './persistence'

const WORKSPACE_ID = 'default'

function registerRuntimeIpc() {
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
